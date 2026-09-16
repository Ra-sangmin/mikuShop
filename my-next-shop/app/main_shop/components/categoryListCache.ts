// 🌟 카테고리 상품 목록 클라이언트 캐시 (rakuten / mercari / yahoo_shopping / yahoo_auction 공용)
//
// 카테고리를 골라 상품이 로드되면 그 목록을 브라우저에 하루 동안 보관하고, 같은 카테고리·같은
// 페이지를 다시 열면 API(라쿠텐 1초 1회 제한, 메루카리·야후옥션 크롤링)를 부르지 않고 바로 보여줍니다.
//
// 규칙
// - 키는 "플랫폼 : 카테고리 : 페이지" — 같은 카테고리라도 페이지마다 따로 저장합니다.
// - "순수 카테고리 조회"만 캐시합니다. 요청 쿼리에 카테고리·페이지·(기본값인) 정렬 외의 키가
//   하나라도 있으면(검색어·제외어·가격대·비기본 정렬 …) 상세검색/통합검색으로 보고 캐시하지 않습니다.
// - TTL 1일. 지나면 버리고 다시 API 를 호출합니다.
// - 받는 도중 다른 카테고리로 옮겨 가 중단된 목록은 받은 만큼만 `complete: false` 로 저장하고,
//   다시 돌아오면 그만큼 먼저 보여준 뒤 나머지만 이어서 받습니다 (메루카리·야후옥션 스트리밍).
// - localStorage 를 쓰므로 탭을 닫았다 열어도 유지됩니다. 용량을 넘거나 항목이 MAX_ENTRIES 를 넘으면
//   오래된 것부터 지웁니다. 저장소를 못 쓰는 환경(시크릿 모드 등)에서는 조용히 API 호출로 돌아갑니다.

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 40;
const PREFIX = 'miku:catlist:';
const INDEX_KEY = 'miku:catlist:index';

export type PageInfo = { page: number; pageCount: number };
export type CategoryListEntry<T> = {
  at: number;
  items: T[];
  pageInfo?: PageInfo;
  /** false = 받는 도중 중단돼 일부만 저장된 목록 (기본값 true) */
  complete?: boolean;
};

/** 플랫폼별로 "어떤 쿼리 키까지가 순수 카테고리 조회인지" 를 정의합니다. */
export type CategoryCacheRule = {
  /** 카테고리 id 가 실리는 쿼리 키 (rakuten: genreId, mercari: category_id …) */
  categoryKey: string;
  /** 페이지가 실리는 쿼리 키들 (page 또는 page_token). 없으면 1페이지로 봅니다 */
  pageKeys: string[];
  /** 정렬 키와 그 기본값. 기본값이 아닌 정렬은 상세검색으로 취급합니다 */
  sortKey?: string;
  defaultSort?: string;
};

type IndexRow = { key: string; at: number };
const memory = new Map<string, CategoryListEntry<unknown>>();

/** 이 요청이 "카테고리만 고른" 순수 조회인지 (검색어·가격·비기본 정렬이 섞이면 false) */
export function isPureCategoryQuery(params: URLSearchParams, rule: CategoryCacheRule): boolean {
  const category = params.get(rule.categoryKey);
  if (!category || category === '0') return false; // 0 = 전체(홈/통합검색) 은 카테고리 조회가 아닙니다

  const allowed = new Set([rule.categoryKey, ...rule.pageKeys, ...(rule.sortKey ? [rule.sortKey] : [])]);
  for (const [key, value] of params.entries()) {
    if (!allowed.has(key)) return false;
    if (rule.sortKey && key === rule.sortKey && value !== rule.defaultSort) return false;
  }
  return true;
}

/** 캐시 키: 플랫폼 : 카테고리 : 페이지 (페이지 키가 없으면 1페이지) */
export function categoryCacheKey(platform: string, params: URLSearchParams, rule: CategoryCacheRule): string {
  const category = params.get(rule.categoryKey) ?? '';
  const page = rule.pageKeys.map(k => params.get(k)).find(v => v) ?? '1';
  return `${platform}:c${category}:p${page}`;
}

function readIndex(): IndexRow[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    const rows = raw ? (JSON.parse(raw) as IndexRow[]) : [];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function writeIndex(rows: IndexRow[]) {
  try { localStorage.setItem(INDEX_KEY, JSON.stringify(rows)); } catch { /* 무시 */ }
}

function removeEntry(key: string) {
  memory.delete(key);
  try { localStorage.removeItem(PREFIX + key); } catch { /* 무시 */ }
}

/** 오래된 순으로 count 개를 지웁니다 (인덱스도 함께 정리) */
function evictOldest(count: number) {
  const rows = readIndex().sort((a, b) => a.at - b.at);
  rows.slice(0, count).forEach(r => removeEntry(r.key));
  writeIndex(rows.slice(count));
}

export function readCategoryListCache<T>(key: string): CategoryListEntry<T> | null {
  const now = Date.now();

  const inMemory = memory.get(key) as CategoryListEntry<T> | undefined;
  if (inMemory && now - inMemory.at < TTL_MS) return inMemory;

  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CategoryListEntry<T>;
    if (!entry || !Array.isArray(entry.items) || entry.items.length === 0) return null;
    if (now - entry.at >= TTL_MS) {
      // 하루가 지났으면 버리고 다시 API 를 호출하게 합니다
      removeEntry(key);
      writeIndex(readIndex().filter(r => r.key !== key));
      return null;
    }
    memory.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

export function writeCategoryListCache<T>(
  key: string,
  items: T[],
  pageInfo?: PageInfo,
  opts?: { complete?: boolean },
): void {
  if (!items || items.length === 0) return; // 빈 결과(일시적 실패)를 하루 동안 굳히지 않습니다
  const complete = opts?.complete ?? true;
  // 이미 완성본이 있는데 미완성본으로 덮어쓰지는 않습니다
  if (!complete) {
    const existing = readCategoryListCache<T>(key);
    if (existing && existing.complete !== false) return;
  }
  const entry: CategoryListEntry<T> = {
    at: Date.now(),
    items,
    ...(pageInfo ? { pageInfo } : {}),
    ...(complete ? {} : { complete: false }),
  };
  memory.set(key, entry);

  try {
    // 항목 수 상한 유지
    const rows = readIndex().filter(r => r.key !== key);
    if (rows.length >= MAX_ENTRIES) evictOldest(rows.length - MAX_ENTRIES + 1);

    const serialized = JSON.stringify(entry);
    try {
      localStorage.setItem(PREFIX + key, serialized);
    } catch {
      // 용량 초과 → 오래된 절반을 비우고 한 번 더 시도
      evictOldest(Math.ceil(readIndex().length / 2));
      localStorage.setItem(PREFIX + key, serialized);
    }
    writeIndex([...readIndex().filter(r => r.key !== key), { key, at: entry.at }]);
  } catch {
    // 저장소를 못 쓰는 환경 — 메모리 캐시만으로도 같은 세션 안에서는 동작합니다
  }
}
