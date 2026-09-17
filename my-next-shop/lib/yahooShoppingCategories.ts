// 🗂️ 야후쇼핑 카테고리 트리 — DB 우선, 비어 있으면 그 자리에서 한 번, 오래되면 응답 후 백그라운드 갱신
//
// 왜 이렇게 하나 (lib/rakutenGenres.ts 와 같은 구조)
//  - 예전 사용자 라우트는 DB 만 읽었습니다. 그래서 YahooShoppingCategory 가 비어 있으면(새 서버, DB 초기화)
//    관리자가 "자동 수집"을 돌리기 전까지 카테고리가 영원히 빈 화면이었습니다.
//  - 야후쇼핑 categorySearch API 는 한 호출로 자식 목록 + 조상 경로(Path)를 주고, 크롤링이 아니라 가볍습니다.
//    그래서 "그 카테고리를 처음 방문할 때 딱 한 번" 사용자 요청 중에 동기로 받아 DB 에 넣고,
//    그 뒤로는 DB 만 씁니다. 30일이 지난 목록은 응답을 먼저 보내고 뒤에서 조용히 다시 받습니다.
//  - "자식이 0개"가 리프인지 아직 안 받아온 것인지 구분하려고 childrenSyncedAt 을 둡니다.
//    루트(genreId 1, 야후의 "Shopping")는 DB 행이 없어 갱신 시각을 메모리로 기억합니다.
//  - 이름은 일본어(Title.Short)로 옵니다. Translation 테이블(jp→ko)에만 두고 translationId 로 참조합니다
//    (이 테이블에는 이름 컬럼이 없습니다). 번역을 못 받아도 ko=jp 행을 만들어 참조를 보장합니다.
//
// 깊이 규칙: 야후 Path 의 depth 는 "Shopping" 루트가 1 이므로, DB 의 genreLevel 은 depth-1 입니다
//   (대분류 = depth 2 = level 1). 기존 데이터도 이 규칙으로 저장돼 있습니다.

import prisma from '@/lib/prisma';
import { resolveCategoryNames } from '@/lib/categoryTranslation';
import { getCategoryPath, categoryDisplayName, CATEGORY_NAME_SELECT, type CategoryCrumb } from '@/lib/categoryPath';

/** 야후쇼핑 루트 카테고리 ID (0 이 아니라 1) */
export const YAHOO_SHOPPING_ROOT_ID = 1;
/** parentId 가 이 값이면 루트로 봅니다 (옛 데이터는 0 으로 저장된 경우가 있어 둘 다) */
export const YAHOO_SHOPPING_ROOT_IDS = [0, YAHOO_SHOPPING_ROOT_ID];

/** 자식 목록을 이 시간보다 오래전에 받아왔으면 "오래됨"으로 보고 백그라운드로 다시 받습니다. */
const STALE_MS = 30 * 24 * 60 * 60 * 1000;
const API_URL = 'https://shopping.yahooapis.jp/ShoppingWebService/V1/json/categorySearch';

export interface CategoryRow {
  genreId: number;
  genreName: string;
  genreLevel: number;
  parentId: number;
  isLeaf: boolean;
  updatedAt: Date;
}
export interface CategoryChildrenResult { children: CategoryRow[]; isLeaf: boolean; fromCache: boolean; }

/** 야후 응답에서 뽑아낸 한 노드 */
type ApiNode = { genreId: number; nameJa: string; level: number };

/** 야후가 카테고리 ID 를 모른다고 한 경우 ({"Error":{"Message":"Service Unavailable"}} 로 옵니다) */
export class YahooShoppingCategoryNotFoundError extends Error {
  constructor(public readonly genreId: number) {
    super(`야후쇼핑에 없는 카테고리입니다: ${genreId}`);
    this.name = 'YahooShoppingCategoryNotFoundError';
  }
}
export function isCategoryNotFoundError(e: unknown): e is YahooShoppingCategoryNotFoundError {
  return e instanceof YahooShoppingCategoryNotFoundError;
}

/** 지금 백그라운드 갱신 중인 카테고리 (같은 카테고리를 여러 번 줄 세우지 않기 위해) */
const refreshing = new Set<number>();
/** 루트는 DB 행이 없어 갱신 시각을 메모리로 기억합니다. 재시작하면 한 번 더 갱신될 뿐입니다. */
let rootSyncedAt = 0;

const isRoot = (genreId: number) => YAHOO_SHOPPING_ROOT_IDS.includes(genreId);
const normalizeId = (genreId: number) => (genreId === 0 ? YAHOO_SHOPPING_ROOT_ID : genreId);

// ---------------------------------------------------------------- 야후 API

/**
 * 야후쇼핑 categorySearch 호출. 조상 경로(루트 제외, 현재 포함)와 자식 목록을 돌려줍니다.
 * appid 는 있으면 붙이지만, 이 엔드포인트는 키 없이도 응답하므로 없다고 막지는 않습니다.
 */
async function fetchCategory(genreId: number): Promise<{ lineage: ApiNode[]; children: ApiNode[] }> {
  const url = new URL(API_URL);
  if (process.env.YAHOO_CLIENT_ID) url.searchParams.set('appid', process.env.YAHOO_CLIENT_ID);
  url.searchParams.set('category_id', String(genreId));

  const res = await fetch(url.toString(), { cache: 'no-store' });
  const json: any = await res.json().catch(() => null);

  if (json?.Error) {
    // 없는 ID 에는 HTTP 503 + {"Error":{"Message":"Service Unavailable"}} 가 옵니다.
    // 진짜 장애와 구분할 길이 없어 ID 오류로 취급합니다 (어느 쪽이든 DB 에는 아무것도 쓰지 않습니다).
    throw new YahooShoppingCategoryNotFoundError(genreId);
  }
  if (!res.ok) throw new Error(`야후쇼핑 카테고리 API 응답 오류: HTTP ${res.status}`);
  const cats = json?.ResultSet?.['0']?.Result?.Categories;
  if (!cats?.Current) throw new Error('야후쇼핑 카테고리 API 응답에 Categories 가 없습니다.');

  // Path: { "0": {Id, Title:{Name}, _attributes:{depth}}, "1": ..., "_container": "Category" }
  const lineage: ApiNode[] = Object.values(cats.Current.Path ?? {})
    .filter((p: any) => p && p.Id && typeof p?._attributes?.depth === 'number')
    .map((p: any) => ({
      genreId: Number(p.Id),
      nameJa: String(p.Title?.Name ?? '').trim(),
      level: Number(p._attributes.depth) - 1,
    }))
    .filter(p => p.genreId && !isRoot(p.genreId))
    .sort((a, b) => a.level - b.level);

  // 현재 카테고리의 level (루트면 0). 자식은 +1.
  const currentLevel = isRoot(genreId) ? 0 : (lineage[lineage.length - 1]?.level ?? 0);

  // Children: 리프면 [] , 아니면 { "0": {Id, Title:{Short}}, ..., "_container": "Category" }
  const rawChildren = cats.Children ? (Array.isArray(cats.Children) ? cats.Children : Object.values(cats.Children)) : [];
  const children: ApiNode[] = rawChildren
    .filter((c: any) => c && c.Id && c.Title)
    .map((c: any) => ({
      genreId: Number(c.Id),
      nameJa: String(c.Title?.Short ?? c.Title?.Long ?? '').trim(),
      level: currentLevel + 1,
    }))
    .filter((c: ApiNode) => c.genreId && c.nameJa && c.genreId !== genreId);

  return { lineage, children };
}

// ---------------------------------------------------------------- DB 조회

const ROW_SELECT = { genreLevel: true, parentId: true, isLeaf: true, updatedAt: true, ...CATEGORY_NAME_SELECT } as const;
type DbRow = { genreId: number; translation: { ko: string; jp: string } | null; genreLevel: number | null; parentId: number; isLeaf: boolean; updatedAt: Date };

function toRow(r: DbRow): CategoryRow {
  return { genreId: r.genreId, genreName: categoryDisplayName(r), genreLevel: r.genreLevel ?? 1, parentId: r.parentId, isLeaf: r.isLeaf, updatedAt: r.updatedAt };
}

async function childrenOf(genreId: number): Promise<CategoryRow[]> {
  const rows = await prisma.yahooShoppingCategory.findMany({
    where: { parentId: isRoot(genreId) ? { in: YAHOO_SHOPPING_ROOT_IDS } : genreId },
    orderBy: { id: 'asc' },
    select: ROW_SELECT,
  });
  return rows.map(toRow);
}

/** 루트부터 이 카테고리까지의 경로 (자기 자신 포함, 루트 제외). DB 만 봅니다. */
export function getCategoryPathOf(genreId: number): Promise<CategoryCrumb[]> {
  if (isRoot(genreId)) return Promise.resolve([]);
  return getCategoryPath('yahooShoppingCategory', genreId, YAHOO_SHOPPING_ROOT_IDS);
}

// ---------------------------------------------------------------- 동기화

/**
 * 야후에서 이 카테고리의 자식 목록을 받아 DB 에 반영합니다.
 * - 새 카테고리는 번역해서 추가, 이름이 바뀐 카테고리는 재번역
 * - 조상·현재 카테고리 행도 함께 보장하고, 현재 카테고리에 childrenSyncedAt / isLeaf 를 기록합니다.
 *   (직접 URL 로 깊은 카테고리에 들어와도 빵부스러기가 그려지도록)
 */
export async function syncCategoryChildren(
  genreIdInput: number,
): Promise<{ children: CategoryRow[]; parents: CategoryCrumb[]; isLeaf: boolean }> {
  const genreId = normalizeId(genreIdInput);
  const { lineage, children: apiChildren } = await fetchCategory(genreId);
  const now = new Date();

  // 이름 풀이: Translation 에 있으면 재사용, 없으면 DeepL 로 번역해 추가.
  // 이름은 Translation 에만 있으므로 번역을 못 받아도 ko=jp 행을 만들어(ensureRow) translationId 를 보장합니다.
  const names = await resolveCategoryNames(
    [...apiChildren.map(c => c.nameJa), ...lineage.map(l => l.nameJa)],
    undefined,
    { ensureRow: true },
  );
  const translationIdOf = (nameJa: string) => {
    const id = names.get(nameJa)?.translationId ?? null;
    if (id === null) console.error(`[yahooShoppingCategories] Translation 행을 만들지 못했습니다: "${nameJa}" (이름 없이 저장됩니다)`);
    return id;
  };

  // 1) 자식 반영 — isLeaf 는 건드리지 않습니다 (자식 자신을 동기화했을 때 정해지는 값)
  for (const c of apiChildren) {
    const translationId = translationIdOf(c.nameJa);
    await prisma.yahooShoppingCategory.upsert({
      where: { genreId: c.genreId },
      create: { genreId: c.genreId, translationId, genreLevel: c.level, parentId: genreId },
      update: { translationId, genreLevel: c.level, parentId: genreId },
    });
  }

  // 2) 조상·현재 카테고리 행 보장 (현재 카테고리엔 동기화 시각과 리프 여부 기록)
  for (let i = 0; i < lineage.length; i++) {
    const node = lineage[i];
    const parentId = i === 0 ? YAHOO_SHOPPING_ROOT_ID : lineage[i - 1].genreId;
    const translationId = translationIdOf(node.nameJa);
    const mark = node.genreId === genreId ? { childrenSyncedAt: now, isLeaf: apiChildren.length === 0 } : {};
    await prisma.yahooShoppingCategory.upsert({
      where: { genreId: node.genreId },
      create: { genreId: node.genreId, translationId, genreLevel: node.level, parentId, ...mark },
      update: { translationId, genreLevel: node.level, parentId, ...mark },
    });
  }
  if (isRoot(genreId)) rootSyncedAt = Date.now();

  const [children, parents] = await Promise.all([childrenOf(genreId), getCategoryPathOf(genreId)]);
  return { children, parents, isLeaf: apiChildren.length === 0 };
}

/** 응답을 먼저 보내고 뒤에서 조용히 갱신합니다. 같은 카테고리는 한 번에 하나만. */
export function scheduleRefresh(genreIdInput: number): void {
  const genreId = normalizeId(genreIdInput);
  if (refreshing.has(genreId)) return;
  refreshing.add(genreId);
  syncCategoryChildren(genreId)
    .then(r => console.log(`[yahooShoppingCategories] 백그라운드 갱신 완료 genre=${genreId} children=${r.children.length}`))
    .catch(e => console.error(`[yahooShoppingCategories] 백그라운드 갱신 실패 genre=${genreId}:`, (e as Error).message))
    .finally(() => refreshing.delete(genreId));
}

/**
 * 사용자 요청용 자식 목록.
 * - DB 에 있으면 즉시 (오래됐으면 백그라운드 갱신 예약)
 * - 그 카테고리를 처음 방문한 경우에만 야후를 기다립니다 (이 카테고리에 한해 단 한 번)
 */
export async function getCategoryChildren(genreIdInput: number): Promise<CategoryChildrenResult> {
  const genreId = normalizeId(genreIdInput);

  if (isRoot(genreId)) {
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
        console.error('[yahooShoppingCategories] 루트 갱신 실패, DB 목록을 그대로 씁니다:', (e as Error).message);
        return { children: rows, isLeaf: false, fromCache: true };
      }
    }
    if (Date.now() - rootSyncedAt > STALE_MS) scheduleRefresh(genreId);
    return { children: rows, isLeaf: false, fromCache: true };
  }

  const [current, rows] = await Promise.all([
    prisma.yahooShoppingCategory.findUnique({ where: { genreId }, select: { isLeaf: true, childrenSyncedAt: true } }),
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
