// 🗂️ 야후옥션 카테고리 트리 — DB 우선, 비어 있으면 그 자리에서 한 번, 오래되면 응답 후 백그라운드 갱신
//
// 왜 이렇게 하나 (lib/rakutenGenres.ts · lib/yahooShoppingCategories.ts 와 같은 구조)
//  - 예전 사용자 라우트는 DB 만 읽어서, YahooAuctionCategory 가 비어 있으면 관리자가 "자동 수집"을 돌리기 전까지
//    카테고리가 영원히 빈 화면이었습니다.
//  - 예전 수집은 중개 사이트(bidbuy)를 긁었는데, 지금은 AWS WAF 챌린지에 막혀 빈 페이지가 오고 그러면 모든 카테고리가
//    잘못 리프로 닫혔습니다. 야후옥션 자체 페이지(auctions.yahoo.co.jp/category/list/{id}/)는 브라우저 없이 받을 수 있고
//    조상 경로(CategoryTree)와 자식 목록(왼쪽 카테고리 필터)이 같이 오므로 출처를 여기로 바꿉니다.
//  - 최상위 목록은 야후옥션 첫 페이지의 카테고리 메뉴(li#elCate{id})에서 읽습니다.
//  - 이름은 일본어로 옵니다. Translation 테이블(jp→ko)에만 두고 translationId 로 참조합니다
//    (이 테이블에는 이름 컬럼이 없습니다). 번역을 못 받아도 ko=jp 행을 만들어 참조를 보장합니다.
//  - "자식이 0개"가 리프인지 아직 안 받아온 것인지 구분하려고 childrenSyncedAt 을 둡니다.
//    루트(genreId 0)는 DB 행이 없어 갱신 시각을 메모리로 기억합니다.

import * as cheerio from 'cheerio';
import prisma from '@/lib/prisma';
import { resolveCategoryNames } from '@/lib/categoryTranslation';
import { getCategoryPath, categoryDisplayName, CATEGORY_NAME_SELECT, type CategoryCrumb } from '@/lib/categoryPath';

export const YAHOO_AUCTION_ROOT_ID = 0;

/** 자식 목록을 이 시간보다 오래전에 받아왔으면 "오래됨"으로 보고 백그라운드로 다시 받습니다. */
const STALE_MS = 30 * 24 * 60 * 60 * 1000;
const TOP_URL = 'https://auctions.yahoo.co.jp/';
const LIST_URL = (id: number) => `https://auctions.yahoo.co.jp/category/list/${id}/`;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

export interface CategoryRow {
  genreId: number;
  genreName: string;
  genreLevel: number;
  parentId: number;
  isLeaf: boolean;
  updatedAt: Date;
}
export interface CategoryChildrenResult { children: CategoryRow[]; isLeaf: boolean; fromCache: boolean; }

type ApiNode = { genreId: number; nameJa: string; level: number };

export class YahooAuctionCategoryNotFoundError extends Error {
  constructor(public readonly genreId: number) {
    super(`야후옥션에 없는 카테고리입니다: ${genreId}`);
    this.name = 'YahooAuctionCategoryNotFoundError';
  }
}
export function isCategoryNotFoundError(e: unknown): e is YahooAuctionCategoryNotFoundError {
  return e instanceof YahooAuctionCategoryNotFoundError;
}

/** 지금 백그라운드 갱신 중인 카테고리 (같은 카테고리를 여러 번 줄 세우지 않기 위해) */
const refreshing = new Set<number>();
/** 루트는 DB 행이 없어 갱신 시각을 메모리로 기억합니다. 재시작하면 한 번 더 갱신될 뿐입니다. */
let rootSyncedAt = 0;

// ---------------------------------------------------------------- 야후옥션 페이지

const idOf = (href: string | undefined) => Number((href ?? '').match(/\/category\/list\/(\d+)/)?.[1] || 0);
/** "「ファッション」の商品一覧" 같은 꾸밈말과 "(1,979,953)" 같은 건수를 떼어냅니다 */
const cleanName = (s: string) => s.replace(/\s+/g, ' ').replace(/^「(.+)」の商品一覧$/, '$1').replace(/\([\d,]+\)\s*$/, '').trim();

async function fetchHtml(url: string): Promise<{ status: number; html: string }> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html', 'Accept-Language': 'ja,en;q=0.8' },
    cache: 'no-store',
    redirect: 'follow',
  });
  return { status: res.status, html: await res.text() };
}

/** 최상위 카테고리 목록 (첫 페이지의 카테고리 메뉴) */
async function fetchRootChildren(): Promise<ApiNode[]> {
  const { status, html } = await fetchHtml(TOP_URL);
  if (status !== 200) throw new Error(`야후옥션 첫 페이지 응답 오류: HTTP ${status}`);
  const $ = cheerio.load(html);
  const out: ApiNode[] = [];
  $('li[id^="elCate"]').each((_, el) => {
    const genreId = Number(($(el).attr('id') ?? '').replace('elCate', '')) || 0;
    const nameJa = cleanName($(el).text());
    if (genreId && nameJa) out.push({ genreId, nameJa, level: 1 });
  });
  if (out.length === 0) throw new Error('야후옥션 첫 페이지에서 카테고리 메뉴를 찾지 못했습니다. (페이지 구조가 바뀌었을 수 있습니다)');
  return out;
}

/**
 * 한 카테고리 페이지에서 조상 경로(현재 포함)와 자식 목록을 읽습니다.
 * - 경로: div.CategoryTree 의 링크들 (루트 "すべてのカテゴリ" 는 링크가 없어 자연히 빠집니다)
 * - 자식: 왼쪽 카테고리 필터에서 "링크가 없는 항목(=현재 카테고리)" 바로 아래의 링크들. 리프면 그 아래가 없습니다.
 */
async function fetchCategory(genreId: number): Promise<{ lineage: ApiNode[]; children: ApiNode[] }> {
  const { status, html } = await fetchHtml(LIST_URL(genreId));
  // 없는 ID 에는 404 또는 500 이 옵니다. 진짜 장애와 구분할 길이 없어 ID 오류로 취급합니다 (어느 쪽이든 DB 에는 아무것도 쓰지 않습니다).
  if (status === 404 || status === 500) throw new YahooAuctionCategoryNotFoundError(genreId);
  if (status !== 200) throw new Error(`야후옥션 카테고리 페이지 응답 오류: HTTP ${status}`);
  const $ = cheerio.load(html);

  const lineage: ApiNode[] = [];
  $('div.CategoryTree li.CategoryTree__item').each((_, li) => {
    const a = $(li).find('a[href*="/category/list/"]').first();
    const id = idOf(a.attr('href'));
    const nameJa = cleanName(a.text());
    if (id && nameJa && !lineage.some(l => l.genreId === id)) lineage.push({ genreId: id, nameJa, level: lineage.length + 1 });
  });
  if (!lineage.some(l => l.genreId === genreId)) {
    // 경로에 자기 자신이 없으면 카테고리 페이지가 아닙니다 (없는 ID 는 보통 여기로 옵니다)
    throw new YahooAuctionCategoryNotFoundError(genreId);
  }
  const currentLevel = lineage[lineage.length - 1].level;

  // 카테고리 필터 블록: 카테고리 링크를 품은 첫 번째 div.Filter
  const block = $('div.Filter').filter((_, b) => $(b).find('a[href*="/category/list/"]').length > 0).first();
  // 현재 카테고리 = 링크 없는 항목 (자식들은 그 안의 ul 에 있습니다)
  const current = block.find('li.Filter__item').filter((_, li) => $(li).children('a').length === 0).first();
  if (block.length === 0 || current.length === 0) {
    throw new Error(`야후옥션 카테고리 필터에서 현재 항목을 찾지 못했습니다: ${genreId} (페이지 구조가 바뀌었을 수 있습니다)`);
  }
  const children: ApiNode[] = [];
  current.children('ul').find('> li > a[href*="/category/list/"]').each((_, a) => {
    const id = idOf($(a).attr('href'));
    const nameJa = cleanName($(a).text());
    if (id && nameJa && id !== genreId && !children.some(c => c.genreId === id)) children.push({ genreId: id, nameJa, level: currentLevel + 1 });
  });
  return { lineage, children };
}

// ---------------------------------------------------------------- DB 조회

const ROW_SELECT = { genreLevel: true, parentId: true, isLeaf: true, updatedAt: true, ...CATEGORY_NAME_SELECT } as const;
type DbRow = { genreId: number; translation: { ko: string; jp: string } | null; genreLevel: number | null; parentId: number; isLeaf: boolean; updatedAt: Date };

function toRow(r: DbRow): CategoryRow {
  return { genreId: r.genreId, genreName: categoryDisplayName(r), genreLevel: r.genreLevel ?? 1, parentId: r.parentId, isLeaf: r.isLeaf, updatedAt: r.updatedAt };
}

async function childrenOf(genreId: number): Promise<CategoryRow[]> {
  const rows = await prisma.yahooAuctionCategory.findMany({ where: { parentId: genreId }, orderBy: { id: 'asc' }, select: ROW_SELECT });
  return rows.map(toRow);
}

/** 루트부터 이 카테고리까지의 경로 (자기 자신 포함). DB 만 봅니다. */
export function getCategoryPathOf(genreId: number): Promise<CategoryCrumb[]> {
  if (genreId === YAHOO_AUCTION_ROOT_ID) return Promise.resolve([]);
  return getCategoryPath('yahooAuctionCategory', genreId, [YAHOO_AUCTION_ROOT_ID]);
}

// ---------------------------------------------------------------- 동기화

/**
 * 야후옥션에서 이 카테고리의 자식 목록을 받아 DB 에 반영합니다.
 * - 새 카테고리는 번역해서 추가, 이름이 바뀐 카테고리는 재번역
 * - 조상·현재 카테고리 행도 함께 보장하고, 현재 카테고리에 childrenSyncedAt / isLeaf 를 기록합니다.
 */
export async function syncCategoryChildren(
  genreId: number,
): Promise<{ children: CategoryRow[]; parents: CategoryCrumb[]; isLeaf: boolean }> {
  const { lineage, children: apiChildren } = genreId === YAHOO_AUCTION_ROOT_ID
    ? { lineage: [] as ApiNode[], children: await fetchRootChildren() }
    : await fetchCategory(genreId);
  const now = new Date();

  // 이름 풀이: Translation 에 있으면 재사용, 없으면 DeepL 로 번역해 추가.
  // 이름은 Translation 에만 있으므로 번역을 못 받아도 ko=jp 행을 만들어(ensureRow) translationId 를 보장합니다.
  const all = [...apiChildren, ...lineage];
  const names = await resolveCategoryNames(all.map(n => n.nameJa), undefined, { ensureRow: true });
  const translationIdOf = (nameJa: string) => {
    const id = names.get(nameJa)?.translationId ?? null;
    if (id === null) console.error('[yahooAuctionCategories] Translation 행을 만들지 못했습니다: ' + nameJa + ' (이름 없이 저장됩니다)');
    return id;
  };

  // 🐛 카테고리 페이지의 자식 목록에는 "○○関連カテゴリ" 처럼 다른 대분류로 가는 바로가기가 섞여 있습니다.
  //    (예: 가전 > "コンピュータ、周辺機器関連カテゴリ" 는 사실 최상위 카테고리인 コンピュータ 입니다)
  //    부모는 하나뿐이라 두 자리에 동시에 둘 수 없는데, 그대로 옮기면 그 대분류가 최상위 목록에서 사라집니다.
  //    최상위 목록이 깨지는 쪽이 훨씬 눈에 띄므로, 이미 최상위에 있는 카테고리는 옮기지 않습니다.
  const topLevelIds = genreId === YAHOO_AUCTION_ROOT_ID
    ? new Set<number>()
    : new Set((await prisma.yahooAuctionCategory.findMany({
        where: { parentId: YAHOO_AUCTION_ROOT_ID },
        select: { genreId: true },
      })).map(r => r.genreId));

  // 1) 자식 반영 — isLeaf 는 건드리지 않습니다 (자식 자신을 동기화했을 때 정해지는 값)
  for (const c of apiChildren) {
    if (topLevelIds.has(c.genreId)) continue;
    const data = { translationId: translationIdOf(c.nameJa), genreLevel: c.level, parentId: genreId };
    await prisma.yahooAuctionCategory.upsert({ where: { genreId: c.genreId }, create: { genreId: c.genreId, ...data }, update: data });
  }

  // 2) 조상·현재 카테고리 행 보장 (현재 카테고리엔 동기화 시각과 리프 여부 기록)
  for (let i = 0; i < lineage.length; i++) {
    const node = lineage[i];
    const parentId = i === 0 ? YAHOO_AUCTION_ROOT_ID : lineage[i - 1].genreId;
    const mark = node.genreId === genreId ? { childrenSyncedAt: now, isLeaf: apiChildren.length === 0 } : {};
    const data = { translationId: translationIdOf(node.nameJa), genreLevel: node.level, parentId, ...mark };
    await prisma.yahooAuctionCategory.upsert({ where: { genreId: node.genreId }, create: { genreId: node.genreId, ...data }, update: data });
  }
  if (genreId === YAHOO_AUCTION_ROOT_ID) rootSyncedAt = Date.now();

  const [children, parents] = await Promise.all([childrenOf(genreId), getCategoryPathOf(genreId)]);
  return { children, parents, isLeaf: apiChildren.length === 0 };
}

/** 응답을 먼저 보내고 뒤에서 조용히 갱신합니다. 같은 카테고리는 한 번에 하나만. */
export function scheduleRefresh(genreId: number): void {
  if (refreshing.has(genreId)) return;
  refreshing.add(genreId);
  syncCategoryChildren(genreId)
    .then(r => console.log(`[yahooAuctionCategories] 백그라운드 갱신 완료 genre=${genreId} children=${r.children.length}`))
    .catch(e => console.error(`[yahooAuctionCategories] 백그라운드 갱신 실패 genre=${genreId}:`, (e as Error).message))
    .finally(() => refreshing.delete(genreId));
}

/**
 * 사용자 요청용 자식 목록.
 * - DB 에 있으면 즉시 (오래됐으면 백그라운드 갱신 예약)
 * - 그 카테고리를 처음 방문한 경우에만 야후옥션을 기다립니다 (이 카테고리에 한해 단 한 번)
 */
export async function getCategoryChildren(genreId: number): Promise<CategoryChildrenResult> {
  if (genreId === YAHOO_AUCTION_ROOT_ID) {
    const rows = await childrenOf(genreId);
    // 🐛 DB 에 대분류가 몇 개 있어도, 이 프로세스가 루트를 직접 받아온 적이 없으면 그 목록은 일부일 수 있습니다.
    //    (깊은 카테고리로 바로 들어오면 그 조상만 만들어지므로 대분류가 1개만 있는 것처럼 보입니다)
    //    루트는 행이 없어 동기화 시각을 DB 에 남길 수 없으므로, 재시작 후 첫 요청에서 한 번 받아옵니다.
    if (rows.length === 0 || !rootSyncedAt) {
      try {
        const r = await syncCategoryChildren(genreId);
        return { children: r.children, isLeaf: false, fromCache: false };
      } catch (e) {
        // 외부가 잠깐 죽어도 DB 에 있는 만큼은 보여 줍니다 (아무것도 없으면 그대로 오류)
        if (rows.length === 0) throw e;
        console.error('[yahooAuctionCategories] 루트 갱신 실패, DB 목록을 그대로 씁니다:', (e as Error).message);
        return { children: rows, isLeaf: false, fromCache: true };
      }
    }
    if (Date.now() - rootSyncedAt > STALE_MS) scheduleRefresh(genreId);
    return { children: rows, isLeaf: false, fromCache: true };
  }

  const [current, rows] = await Promise.all([
    prisma.yahooAuctionCategory.findUnique({ where: { genreId }, select: { isLeaf: true, childrenSyncedAt: true } }),
    childrenOf(genreId),
  ]);

  // 🐛 자식 행이 있다고 그게 "전부"는 아닙니다. 자손을 먼저 방문하면 그 조상들이 함께 만들어지므로,
  //    이 카테고리를 직접 동기화한 적이 없으면(childrenSyncedAt=null) 자식이 1~2개만 있는 것처럼 보입니다.
  //    그래서 DB 목록은 이 카테고리를 직접 받아온 적이 있을 때만 믿습니다.
  const syncedAt = current?.childrenSyncedAt?.getTime() ?? 0;
  if (syncedAt) {
    if (Date.now() - syncedAt > STALE_MS) scheduleRefresh(genreId);
    return { children: rows, isLeaf: rows.length === 0, fromCache: true };
  }
  // 자식이 0개인 채로 동기화가 끝났던 카테고리 = 리프
  if (current?.isLeaf) {
    return { children: [], isLeaf: true, fromCache: true };
  }
  // 처음 방문 — 사용자를 기다리게 하는 유일한 경우
  const r = await syncCategoryChildren(genreId);
  return { children: r.children, isLeaf: r.isLeaf, fromCache: false };
}
