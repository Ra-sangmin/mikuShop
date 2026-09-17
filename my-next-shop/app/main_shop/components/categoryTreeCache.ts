// 🌟 카테고리 목록 클라이언트 캐시 (플랫폼 공용)
//
// 카테고리 트리는 며칠에 한 번 바뀔까 말까 한 데이터라, 한 번 받아온 "이 장르의 자식 목록 + 경로"를
// 브라우저에 하루 동안 보관합니다. 같은 카테고리를 다시 열면 서버 요청 없이 즉시 그립니다.
// (상품 목록 캐시 categoryListCache.ts 와 같은 방식이지만 대상이 카테고리라 분리했습니다)

const TTL_MS = 24 * 60 * 60 * 1000;
const BASE_PREFIX = 'miku:cats:';
// 🌟 저장 형식이나 서버 응답의 의미가 바뀌면 이 번호를 올립니다. 옛 번호로 저장된 항목은 무시하고 지웁니다.
//    v2: 자식 목록이 일부만 담긴 채로 캐시되던 문제를 고치면서 (자손을 먼저 방문하면 조상의 자식이 1개만 보였음)
//    v3: 카테고리 테이블을 모두 비우고 다시 받기로 해서, 그 전에 저장된 목록을 전부 버립니다
const VERSION = 'v3';
const PREFIX = BASE_PREFIX + VERSION + ':';

/** 예전 버전으로 저장된 항목을 한 번 훑어 지웁니다 (localStorage 에 쓸모없는 값이 쌓이지 않도록) */
let sweptLegacy = false;
function sweepLegacy() {
  if (sweptLegacy) return;
  sweptLegacy = true;
  try {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BASE_PREFIX) && !key.startsWith(PREFIX)) stale.push(key);
    }
    stale.forEach(key => localStorage.removeItem(key));
  } catch {
    // 저장소를 못 쓰는 환경 — 무시합니다
  }
}

export interface CategoryTreeEntry<T = unknown> {
  at: number;
  data: T[];
  isLeaf: boolean;
  parents: { genreId: number; genreName: string }[];
}

const memory = new Map<string, CategoryTreeEntry>();

function keyOf(platform: string, genreId: string | number) {
  return `${PREFIX}${platform}:${genreId}`;
}

/**
 * 🐛 "자식 0개인데 리프도 아님"은 서버 DB 가 아직 비어 있었다는 뜻이지 확정된 결과가 아닙니다.
 *    이걸 하루 동안 캐시하면 DB 가 채워진 뒤에도 빈 화면만 보입니다. 캐시로 인정하지 않고 다시 묻습니다.
 */
function isCacheable(entry: { data: unknown[]; isLeaf: boolean }) {
  return entry.data.length > 0 || entry.isLeaf;
}

export function readCategoryTreeCache<T = unknown>(platform: string, genreId: string | number): CategoryTreeEntry<T> | null {
  sweepLegacy();
  const key = keyOf(platform, genreId);
  const now = Date.now();

  const inMemory = memory.get(key) as CategoryTreeEntry<T> | undefined;
  if (inMemory && now - inMemory.at < TTL_MS && isCacheable(inMemory)) return inMemory;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CategoryTreeEntry<T>;
    if (!entry || !Array.isArray(entry.data)) return null;
    if (now - entry.at >= TTL_MS || !isCacheable(entry)) {
      localStorage.removeItem(key);
      memory.delete(key);
      return null;
    }
    memory.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

export function writeCategoryTreeCache<T = unknown>(
  platform: string,
  genreId: string | number,
  value: { data: T[]; isLeaf: boolean; parents?: { genreId: number; genreName: string }[] },
): void {
  const key = keyOf(platform, genreId);
  const entry: CategoryTreeEntry<T> = { at: Date.now(), data: value.data, isLeaf: value.isLeaf, parents: value.parents ?? [] };
  if (!isCacheable(entry)) return; // 빈 목록은 저장하지 않습니다 (위 isCacheable 참고)
  memory.set(key, entry);
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // 저장소를 못 쓰는 환경(시크릿 모드 등) — 메모리 캐시만으로도 같은 세션에서는 동작합니다
  }
}
