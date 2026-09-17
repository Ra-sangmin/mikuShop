// 🗂️ 메루카리 카테고리 트리 — DB 우선, 비어 있으면 그 자리에서 한 번, 오래되면 응답 후 백그라운드 갱신
//
// 왜 이렇게 하나 (lib/rakutenGenres.ts · lib/yahooShoppingCategories.ts 와 같은 구조)
//  - 예전 사용자 라우트는 DB 만 읽어서, MercariCategory 가 비어 있으면 관리자가 "자동 수집"을 돌리기 전까지
//    카테고리가 영원히 빈 화면이었습니다.
//  - 메루카리 카테고리 페이지는 화면에 보이는 링크를 긁는 대신, 페이지가 내부적으로 받는 "카테고리 전체 트리"
//    (api.mercari.jp/master/v2/datasets/item_categories, 약 8,800개) 응답을 헤드리스 브라우저에서 가로챕니다.
//    이 API 는 브라우저가 만든 인증 토큰이 필요해 직접 호출은 안 되지만, 페이지를 한 번 열면 3~4초에 트리 전체가 옵니다.
//  - 트리는 메모리에 1시간 들고 있으면서 "방문한 카테고리의 자식 + 조상" 만 그때그때 번역해 DB 에 넣습니다.
//    8,800개를 한꺼번에 번역하면 첫 방문자가 몇 분을 기다려야 하기 때문입니다.
//  - "자식이 0개"가 리프인지 아직 안 받아온 것인지 구분하려고 childrenSyncedAt 을 둡니다. 데이터셋의 hasChild 로
//    자식 행의 isLeaf 도 바로 정해지므로, 리프는 다시 긁지 않습니다.
//  - 이름은 일본어로 옵니다. Translation 테이블(jp→ko)에만 두고 translationId 로 참조합니다
//    (이 테이블에는 이름 컬럼이 없습니다). 번역을 못 받아도 ko=jp 행을 만들어 참조를 보장합니다.
//    루트 22개는 코드의 CATEGORY_MAP(손으로 정한 한국어)을 Translation 에 처음 등록할 때 씁니다. 이미 그 원문이
//    Translation 에 있으면(다른 플랫폼이 먼저 넣었으면) 그 번역을 그대로 씁니다 — 같은 일본어는 한 번만 번역합니다.
//
// 깊이 규칙: 데이터셋의 level 은 루트가 없음(undefined), 그 아래가 "1" 부터입니다. DB 의 genreLevel 은 루트가 1 이므로
//   genreLevel = (level ?? 0) + 1 입니다. 기존 데이터도 이 규칙으로 저장돼 있습니다.

import puppeteer from 'puppeteer';
import prisma from '@/lib/prisma';
import { SANDBOX_ARGS } from '@/lib/crawler/sandbox';
import { resolveCategoryNames } from '@/lib/categoryTranslation';
import { getCategoryPath, categoryDisplayName, CATEGORY_NAME_SELECT, type CategoryCrumb } from '@/lib/categoryPath';

export const MERCARI_ROOT_ID = 0;

/** 자식 목록을 이 시간보다 오래전에 받아왔으면 "오래됨"으로 보고 백그라운드로 다시 받습니다. */
const STALE_MS = 30 * 24 * 60 * 60 * 1000;
/** 가로챈 전체 트리를 메모리에 두는 시간. 지나면 다음 동기화 때 브라우저를 다시 엽니다. */
const TREE_TTL_MS = 60 * 60 * 1000;
const CATEGORIES_PAGE = 'https://jp.mercari.com/categories';
const DATASET_URL_PART = 'master/v2/datasets/item_categories';

// 루트 카테고리의 한국어 표기 (그 원문을 Translation 에 처음 넣을 때 쓰는 값)
const CATEGORY_MAP: Record<string, string> = {
  '3088': '패션', '3': '아기 키즈', '1328': '게임 · 장난감 · 상품', '6386': '취미, 악기, 미술',
  '1027': '티켓', '5': '책, 잡지, 만화', '9879': 'CD·DVD·블루 레이', '7': '스마트 폰, 태블릿, PC',
  '3888': 'TV, 오디오, 카메라', '4136': '생활가전 · 공조', '8': '스포츠', '2634': '야외, 낚시, 여행용품',
  '6': '화장품 · 미용', '3134': '다이어트 · 건강', '1844': '식품·음료·술', '113': '주방 · 일용품 · 기타',
  '4': '가구·인테리어', '69': '애완 동물 용품', '5597': 'DIY · 공구', '1206': '꽃 정원',
  '9': '핸드메이드·수예', '1318': '자동차, 오토바이, 자전거',
};

export interface CategoryRow {
  genreId: number;
  genreName: string;
  genreLevel: number;
  parentId: number;
  isLeaf: boolean;
  updatedAt: Date;
}
export interface CategoryChildrenResult { children: CategoryRow[]; isLeaf: boolean; fromCache: boolean; }

/** 데이터셋에서 정리한 한 노드 */
interface TreeNode { genreId: number; nameJa: string; level: number; parentId: number; hasChild: boolean; order: number; }
interface Tree { at: number; byId: Map<number, TreeNode>; childrenOf: Map<number, TreeNode[]>; }

export class MercariCategoryNotFoundError extends Error {
  constructor(public readonly genreId: number) {
    super(`메루카리에 없는 카테고리입니다: ${genreId}`);
    this.name = 'MercariCategoryNotFoundError';
  }
}
export function isCategoryNotFoundError(e: unknown): e is MercariCategoryNotFoundError {
  return e instanceof MercariCategoryNotFoundError;
}

/** 지금 백그라운드 갱신 중인 카테고리 (같은 카테고리를 여러 번 줄 세우지 않기 위해) */
const refreshing = new Set<number>();
/** 루트는 DB 행이 없어 갱신 시각을 메모리로 기억합니다. 재시작하면 한 번 더 갱신될 뿐입니다. */
let rootSyncedAt = 0;

// ---------------------------------------------------------------- 전체 트리 (헤드리스 브라우저)

let tree: Tree | null = null;
/** 동시에 여러 요청이 들어와도 브라우저는 한 번만 엽니다 */
let treeInFlight: Promise<Tree> | null = null;

async function captureDataset(): Promise<string> {
  const browser = await puppeteer.launch({ headless: true, args: [...SANDBOX_ARGS] }); // 🔒 샌드박스 기본 켬
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', r => (['image', 'stylesheet', 'font', 'media'].includes(r.resourceType()) ? r.abort() : r.continue()));

    let resolveBody!: (body: string) => void;
    const body = new Promise<string>(resolve => { resolveBody = resolve; });
    page.on('response', async r => {
      if (!r.url().includes(DATASET_URL_PART) || r.request().method() !== 'GET') return;
      try { resolveBody(await r.text()); } catch (e) { console.error('[mercariCategories] 데이터셋 본문 읽기 실패:', (e as Error).message); }
    });

    await page.goto(CATEGORIES_PAGE, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    return await Promise.race([
      body,
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('메루카리 카테고리 데이터셋 응답을 40초 안에 받지 못했습니다.')), 40_000)),
    ]);
  } finally {
    await browser.close();
  }
}

function parseDataset(raw: string): Tree {
  const json = JSON.parse(raw);
  const items: any[] = Array.isArray(json?.itemCategories) ? json.itemCategories : [];
  if (items.length === 0) throw new Error('메루카리 카테고리 데이터셋이 비어 있습니다.');

  const byId = new Map<number, TreeNode>();
  const childrenOf = new Map<number, TreeNode[]>();
  for (const it of items) {
    const genreId = Number(it.id);
    const nameJa = String(it.name ?? '').trim();
    if (!genreId || !nameJa) continue;
    const node: TreeNode = {
      genreId,
      nameJa,
      level: (Number(it.level) || 0) + 1,
      parentId: Number(it.parentCategoryId) || MERCARI_ROOT_ID,
      hasChild: it.hasChild === true,
      order: Number(it.displayOrder) || 0,
    };
    byId.set(genreId, node);
    const list = childrenOf.get(node.parentId) ?? [];
    list.push(node);
    childrenOf.set(node.parentId, list);
  }
  childrenOf.forEach(list => list.sort((a, b) => a.order - b.order || a.genreId - b.genreId));
  return { at: Date.now(), byId, childrenOf };
}

async function loadTree(): Promise<Tree> {
  if (tree && Date.now() - tree.at < TREE_TTL_MS) return tree;
  if (!treeInFlight) {
    treeInFlight = (async () => {
      const t = Date.now();
      const parsed = parseDataset(await captureDataset());
      console.log(`[mercariCategories] 카테고리 트리 ${parsed.byId.size}개 수신 (${Date.now() - t}ms)`);
      tree = parsed;
      return parsed;
    })().finally(() => { treeInFlight = null; });
  }
  return treeInFlight;
}

// ---------------------------------------------------------------- DB 조회

const ROW_SELECT = { genreLevel: true, parentId: true, isLeaf: true, updatedAt: true, ...CATEGORY_NAME_SELECT } as const;
type DbRow = { genreId: number; translation: { ko: string; jp: string } | null; genreLevel: number | null; parentId: number; isLeaf: boolean; updatedAt: Date };

function toRow(r: DbRow): CategoryRow {
  return { genreId: r.genreId, genreName: categoryDisplayName(r), genreLevel: r.genreLevel ?? 1, parentId: r.parentId, isLeaf: r.isLeaf, updatedAt: r.updatedAt };
}

async function childrenOf(genreId: number): Promise<CategoryRow[]> {
  const rows = await prisma.mercariCategory.findMany({ where: { parentId: genreId }, orderBy: { id: 'asc' }, select: ROW_SELECT });
  return rows.map(toRow);
}

/** 루트부터 이 카테고리까지의 경로 (자기 자신 포함). DB 만 봅니다. */
export function getCategoryPathOf(genreId: number): Promise<CategoryCrumb[]> {
  if (genreId === MERCARI_ROOT_ID) return Promise.resolve([]);
  return getCategoryPath('mercariCategory', genreId, [MERCARI_ROOT_ID]);
}

// ---------------------------------------------------------------- 동기화

/**
 * 메루카리 트리에서 이 카테고리의 자식 목록을 골라 DB 에 반영합니다.
 * - 새 카테고리는 번역해서 추가, 이름이 바뀐 카테고리는 재번역. 자식의 isLeaf 는 데이터셋의 hasChild 로 바로 정합니다.
 * - 조상·현재 카테고리 행도 함께 보장하고, 현재 카테고리에 childrenSyncedAt / isLeaf 를 기록합니다.
 */
export async function syncCategoryChildren(
  genreId: number,
): Promise<{ children: CategoryRow[]; parents: CategoryCrumb[]; isLeaf: boolean }> {
  const t = await loadTree();
  if (genreId !== MERCARI_ROOT_ID && !t.byId.has(genreId)) throw new MercariCategoryNotFoundError(genreId);

  const apiChildren = t.childrenOf.get(genreId) ?? [];
  // 조상 + 현재 (루트 → 현재 순서)
  const lineage: TreeNode[] = [];
  for (let cur = t.byId.get(genreId), guard = 0; cur && guard < 10; cur = t.byId.get(cur.parentId), guard++) lineage.unshift(cur);
  const now = new Date();

  // 이름 풀이: Translation 에 있으면 재사용, 없으면 DeepL 로 번역해 추가 (루트는 CATEGORY_MAP 을 그 값으로).
  // 이름은 Translation 에만 있으므로 번역을 못 받아도 ko=jp 행을 만들어(ensureRow) translationId 를 보장합니다.
  const all = [...apiChildren, ...lineage];
  const preferredKo = new Map<string, string>();
  for (const n of all) {
    const curated = CATEGORY_MAP[String(n.genreId)];
    if (curated) preferredKo.set(n.nameJa, curated);
  }
  const names = await resolveCategoryNames(all.map(n => n.nameJa), preferredKo, { ensureRow: true });
  const translationIdOf = (n: TreeNode) => {
    const id = names.get(n.nameJa)?.translationId ?? null;
    if (id === null) console.error('[mercariCategories] Translation 행을 만들지 못했습니다: ' + n.nameJa + ' (이름 없이 저장됩니다)');
    return id;
  };

  // 1) 자식 반영
  for (const c of apiChildren) {
    const data = { translationId: translationIdOf(c), genreLevel: c.level, parentId: genreId, isLeaf: !c.hasChild };
    await prisma.mercariCategory.upsert({ where: { genreId: c.genreId }, create: { genreId: c.genreId, ...data }, update: data });
  }

  // 2) 조상·현재 카테고리 행 보장 (현재 카테고리엔 동기화 시각과 리프 여부 기록)
  for (const node of lineage) {
    const mark = node.genreId === genreId ? { childrenSyncedAt: now, isLeaf: apiChildren.length === 0 } : {};
    const data = { translationId: translationIdOf(node), genreLevel: node.level, parentId: node.parentId, ...mark };
    await prisma.mercariCategory.upsert({ where: { genreId: node.genreId }, create: { genreId: node.genreId, ...data }, update: data });
  }
  if (genreId === MERCARI_ROOT_ID) rootSyncedAt = Date.now();

  const [children, parents] = await Promise.all([childrenOf(genreId), getCategoryPathOf(genreId)]);
  return { children, parents, isLeaf: apiChildren.length === 0 };
}

/** 응답을 먼저 보내고 뒤에서 조용히 갱신합니다. 같은 카테고리는 한 번에 하나만. */
export function scheduleRefresh(genreId: number): void {
  if (refreshing.has(genreId)) return;
  refreshing.add(genreId);
  syncCategoryChildren(genreId)
    .then(r => console.log(`[mercariCategories] 백그라운드 갱신 완료 genre=${genreId} children=${r.children.length}`))
    .catch(e => console.error(`[mercariCategories] 백그라운드 갱신 실패 genre=${genreId}:`, (e as Error).message))
    .finally(() => refreshing.delete(genreId));
}

/**
 * 사용자 요청용 자식 목록.
 * - DB 에 있으면 즉시 (오래됐으면 백그라운드 갱신 예약)
 * - 그 카테고리를 처음 방문한 경우에만 메루카리를 기다립니다 (트리가 메모리에 있으면 번역 시간만, 없으면 브라우저 3~4초 추가)
 */
export async function getCategoryChildren(genreId: number): Promise<CategoryChildrenResult> {
  if (genreId === MERCARI_ROOT_ID) {
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
        console.error('[mercariCategories] 루트 갱신 실패, DB 목록을 그대로 씁니다:', (e as Error).message);
        return { children: rows, isLeaf: false, fromCache: true };
      }
    }
    if (Date.now() - rootSyncedAt > STALE_MS) scheduleRefresh(genreId);
    return { children: rows, isLeaf: false, fromCache: true };
  }

  const [current, rows] = await Promise.all([
    prisma.mercariCategory.findUnique({ where: { genreId }, select: { isLeaf: true, childrenSyncedAt: true } }),
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
  // 데이터셋의 hasChild 로 이미 리프라고 표시된 카테고리 (다시 받아올 필요가 없습니다)
  if (current?.isLeaf) {
    return { children: [], isLeaf: true, fromCache: true };
  }
  // 처음 방문 — 사용자를 기다리게 하는 유일한 경우
  const r = await syncCategoryChildren(genreId);
  return { children: r.children, isLeaf: r.isLeaf, fromCache: false };
}
