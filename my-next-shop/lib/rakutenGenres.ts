// 🗂️ 라쿠텐 장르(카테고리) 트리 — DB 우선, 오래되면 응답 후 백그라운드 갱신
//
// 왜 이렇게 하나
//  - 라쿠텐 API 는 앱당 1초에 1건입니다. 카테고리를 누를 때마다 라쿠텐에 물어보면 그 1초가
//    그대로 상품 로딩 지연이 됩니다. 그래서 자식 목록은 DB 에 두고, 라쿠텐엔 "그 장르를 처음
//    방문할 때 딱 한 번" + "30일이 지났을 때 백그라운드로" 만 물어봅니다.
//  - 장르 ID 자체는 라쿠텐에서 안정적으로 유지됩니다. 바뀌는 건 트리 구성(추가·삭제·이름)이고
//    그마저 드뭅니다. 사라진 장르는 지우지 않고 isActive=false 로 숨깁니다(주문·인기 집계가 참조).
//  - 새 API(20260701) 는 한 호출로 ancestors(빵부스러기)까지 주므로, 직접 URL 로 들어온 경우의
//    경로 표시도 여기서 해결됩니다.
//  - 이름은 일본어(nameJa)로 옵니다. Translation 테이블(jp→ko)에 이미 있으면 그 번역을 쓰고 id 를
//    translationId 로 참조합니다. 없으면 DeepL 로 번역해 Translation 에 추가한 뒤 참조합니다.
//    이름은 Translation 에만 둡니다 (RakutenCategory 에는 이름 컬럼이 없습니다). 화면·경로에 내보내는 이름은
//    translationId 로 Translation.ko 를 읽고, Translation 에서 번역을 고치면 바로 반영됩니다.
//    번역을 못 받은 경우에도 ko=jp 인 행을 만들어 참조를 보장하고(ensureRow), 그런 행은
//    retranslateUntranslated() 로 나중에 채웁니다.

import prisma from '@/lib/prisma';
import { blockedCategoryIds } from '@/lib/blockedCategories';
import { resolveCategoryNames } from '@/lib/categoryTranslation';
import { rakutenGenreAPI, RakutenApiError, type RakutenPriority } from '@/lib/rakuten';

/** 자식 목록을 이 시간보다 오래전에 받아왔으면 "오래됨"으로 보고 백그라운드로 다시 받습니다. */
const STALE_MS = 30 * 24 * 60 * 60 * 1000;

export interface GenreRow {
  genreId: number;
  genreName: string;
  genreLevel: number;
  parentId: number;
  isLeaf: boolean;
}
export interface GenreCrumb { genreId: number; genreName: string; }
export interface GenreChildrenResult { children: GenreRow[]; isLeaf: boolean; fromCache: boolean; }

type ApiGenre = { genreId: number; nameJa: string; level: number };
type ApiGenreResponse = { ancestors?: ApiGenre[]; genre?: ApiGenre; siblings?: ApiGenre[]; children?: ApiGenre[] };

/** 지금 백그라운드 갱신 중인 장르 (같은 장르를 여러 번 줄 세우지 않기 위해) */
const refreshing = new Set<number>();
/** 루트(genreId 0)는 DB 행이 없어 갱신 시각을 메모리로 기억합니다. 재시작하면 한 번 더 갱신될 뿐입니다. */
let rootSyncedAt = 0;

// ---------------------------------------------------------------- 번역
// 번역·Translation 연동은 플랫폼 공용 모듈(lib/categoryTranslation.ts)을 씁니다.
export const resolveGenreNames = resolveCategoryNames;

// ---------------------------------------------------------------- DB 조회

/**
 * 🌟 이름은 Translation(translationId → ko)에만 있습니다. 한국어가 없으면 원문(jp), 참조 자체가 없으면 ID 로 표시합니다.
 *    (참조가 없는 행은 정상적으로는 생기지 않습니다 — 동기화가 ensureRow 로 항상 행을 만듭니다)
 */
const NAME_SELECT = { genreId: true, translation: { select: { ko: true, jp: true } } } as const;
type NamedRow = { genreId: number; translation: { ko: string; jp: string } | null };
const displayName = (r: NamedRow) => r.translation?.ko || r.translation?.jp || `#${r.genreId}`;

function toRow(r: NamedRow & { genreLevel: number | null; parentId: number; isLeaf: boolean }): GenreRow {
  return { genreId: r.genreId, genreName: displayName(r), genreLevel: r.genreLevel ?? 1, parentId: r.parentId, isLeaf: r.isLeaf };
}

async function activeChildren(genreId: number): Promise<GenreRow[]> {
  const rows = await prisma.rakutenCategory.findMany({
    // 🚫 들여올 수 없는 물건의 카테고리는 목록에서 지웁니다. (lib/blockedCategories.ts)
    where: { parentId: genreId, isActive: true, genreId: { notIn: [...blockedCategoryIds('rakuten')] } },
    orderBy: { id: 'asc' },
    select: { genreLevel: true, parentId: true, isLeaf: true, ...NAME_SELECT },
  });
  return rows.map(toRow);
}

/** 루트부터 이 장르까지의 경로 (자기 자신 포함). DB 만 봅니다. */
export async function getGenrePath(genreId: number): Promise<GenreCrumb[]> {
  const path: GenreCrumb[] = [];
  let cursor = genreId;
  for (let guard = 0; cursor && guard < 8; guard++) {
    const row = await prisma.rakutenCategory.findUnique({
      where: { genreId: cursor },
      select: { parentId: true, ...NAME_SELECT },
    });
    if (!row) break;
    path.unshift({ genreId: row.genreId, genreName: displayName(row) });
    cursor = row.parentId;
  }
  return path;
}

// ---------------------------------------------------------------- 동기화

/**
 * 라쿠텐에서 이 장르의 자식 목록을 받아 DB 에 반영합니다.
 * - 새 장르는 번역해서 추가, 이름이 바뀐 장르는 재번역, 사라진 장르는 isActive=false
 * - 조상·현재 장르 행도 함께 보장하고, 현재 장르에 childrenSyncedAt / isLeaf 를 기록합니다.
 */
export async function syncGenreChildren(
  genreId: number,
  priority: RakutenPriority = 'high',
): Promise<{ children: GenreRow[]; parents: GenreCrumb[]; isLeaf: boolean }> {
  const res = (await rakutenGenreAPI(genreId, priority)) as ApiGenreResponse;
  const apiChildren = res.children ?? [];
  const ancestors = res.ancestors ?? [];
  const now = new Date();

  // 조상 + 현재 장르 (직접 URL 로 들어온 경우 DB 에 없을 수 있어 같이 보장합니다)
  const lineage: { node: ApiGenre; parentId: number }[] = ancestors.map((a, i) => ({
    node: a,
    parentId: i === 0 ? 0 : ancestors[i - 1].genreId,
  }));
  if (genreId !== 0 && res.genre) {
    lineage.push({ node: res.genre, parentId: ancestors.length ? ancestors[ancestors.length - 1].genreId : 0 });
  }

  const existing = await prisma.rakutenCategory.findMany({ where: { parentId: genreId }, select: { genreId: true, isActive: true } });

  // 이름 풀이: Translation 에 있으면 재사용, 없으면 번역해 추가. 이름은 Translation 에만 있으므로 번역을 못 받아도
  // ko=jp 행을 만들어(ensureRow) translationId 를 보장합니다.
  const names = await resolveCategoryNames(
    [...apiChildren.map(c => c.nameJa), ...lineage.map(l => l.node.nameJa)],
    undefined,
    { ensureRow: true },
  );
  const translationIdOf = (nameJa: string) => {
    const id = names.get(nameJa)?.translationId ?? null;
    if (id === null) console.error(`[rakutenGenres] Translation 행을 만들지 못했습니다: "${nameJa}" (이름 없이 저장됩니다)`);
    return id;
  };

  // 1) 자식 반영
  const blocked = blockedCategoryIds('rakuten');
  for (const c of apiChildren) {
    // 🚫 차단 카테고리는 되살리지 않습니다. 여기서 걸러내지 않으면 동기화가 매번
    //    isActive=true 로 덮어써서, 숨겨둔 것이 조용히 다시 나타납니다.
    if (blocked.has(c.genreId)) continue;
    const translationId = translationIdOf(c.nameJa);
    await prisma.rakutenCategory.upsert({
      where: { genreId: c.genreId },
      create: { genreId: c.genreId, translationId, genreLevel: c.level, parentId: genreId, isActive: true },
      update: { translationId, genreLevel: c.level, parentId: genreId, isActive: true },
    });
  }

  // 2) 라쿠텐에서 사라진 자식은 숨김
  const seen = new Set(apiChildren.map(c => c.genreId));
  const gone = existing.filter(r => r.isActive && !seen.has(r.genreId)).map(r => r.genreId);
  if (gone.length) {
    await prisma.rakutenCategory.updateMany({ where: { genreId: { in: gone } }, data: { isActive: false } });
  }

  // 3) 조상·현재 장르 행 보장 (현재 장르엔 동기화 시각과 리프 여부 기록)
  for (const { node, parentId } of lineage) {
    const translationId = translationIdOf(node.nameJa);
    const isCurrent = node.genreId === genreId;
    const mark = isCurrent ? { childrenSyncedAt: now, isLeaf: apiChildren.length === 0 } : {};
    await prisma.rakutenCategory.upsert({
      where: { genreId: node.genreId },
      create: { genreId: node.genreId, translationId, genreLevel: node.level, parentId, isActive: true, ...mark },
      update: { translationId, genreLevel: node.level, parentId, isActive: true, ...mark },
    });
  }
  if (genreId === 0) rootSyncedAt = Date.now();

  const [children, parents] = await Promise.all([activeChildren(genreId), getGenrePath(genreId)]);
  return { children, parents, isLeaf: apiChildren.length === 0 };
}

/** 응답을 먼저 보내고 뒤에서 조용히 갱신합니다. 같은 장르는 한 번에 하나만. */
export function scheduleRefresh(genreId: number): void {
  if (refreshing.has(genreId)) return;
  refreshing.add(genreId);
  syncGenreChildren(genreId, 'low')
    .then(r => console.log(`[rakutenGenres] 백그라운드 갱신 완료 genre=${genreId} children=${r.children.length}`))
    .catch(e => console.error(`[rakutenGenres] 백그라운드 갱신 실패 genre=${genreId}:`, (e as Error).message))
    .finally(() => refreshing.delete(genreId));
}

/**
 * 사용자 요청용 자식 목록.
 * - DB 에 있으면 즉시 (오래됐으면 백그라운드 갱신 예약)
 * - 그 장르를 처음 방문한 경우에만 라쿠텐을 기다립니다 (이 장르에 한해 단 한 번)
 */
export async function getGenreChildren(genreId: number): Promise<GenreChildrenResult> {
  if (genreId === 0) {
    const rows = await activeChildren(0);
    // 🐛 DB 에 대분류가 몇 개 있어도, 이 프로세스가 루트를 직접 받아온 적이 없으면 그 목록은 일부일 수 있습니다.
    //    (깊은 장르로 바로 들어오면 그 조상만 만들어지므로 대분류가 1개만 있는 것처럼 보입니다)
    //    루트는 행이 없어 동기화 시각을 DB 에 남길 수 없으므로, 재시작 후 첫 요청에서 한 번 받아옵니다.
    if (rows.length === 0 || !rootSyncedAt) {
      try {
        const r = await syncGenreChildren(0, 'high');
        return { children: r.children, isLeaf: false, fromCache: false };
      } catch (e) {
        // 라쿠텐이 잠깐 죽어도 DB 에 있는 만큼은 보여 줍니다 (아무것도 없으면 그대로 오류)
        if (rows.length === 0) throw e;
        console.error('[rakutenGenres] 루트 갱신 실패, DB 목록을 그대로 씁니다:', (e as Error).message);
        return { children: rows, isLeaf: false, fromCache: true };
      }
    }
    if (Date.now() - rootSyncedAt > STALE_MS) scheduleRefresh(0);
    return { children: rows, isLeaf: false, fromCache: true };
  }

  const [parent, rows] = await Promise.all([
    prisma.rakutenCategory.findUnique({ where: { genreId }, select: { isLeaf: true, childrenSyncedAt: true } }),
    activeChildren(genreId),
  ]);

  // 🐛 자식 행이 있다고 그게 "전부"는 아닙니다. 자손을 먼저 방문하면 그 조상들이 함께 만들어지므로,
  //    이 카테고리를 직접 동기화한 적이 없으면(childrenSyncedAt=null) 자식이 1~2개만 있는 것처럼 보입니다.
  //    그래서 DB 목록은 이 카테고리를 직접 받아온 적이 있을 때만 믿습니다.
  const syncedAt = parent?.childrenSyncedAt?.getTime() ?? 0;
  if (syncedAt) {
    if (Date.now() - syncedAt > STALE_MS) scheduleRefresh(genreId);
    return { children: rows, isLeaf: rows.length === 0, fromCache: true };
  }
  // 자식이 0개인 채로 동기화가 끝났던 장르 = 리프
  if (parent?.isLeaf) {
    return { children: [], isLeaf: true, fromCache: true };
  }
  // 처음 방문 — 사용자를 기다리게 하는 유일한 경우
  const r = await syncGenreChildren(genreId, 'high');
  return { children: r.children, isLeaf: r.isLeaf, fromCache: false };
}

/** 상품 검색에서 "없는 장르"로 판명된 경우: 숨기고 부모를 백그라운드로 갱신합니다. */
export async function markGenreStale(genreId: number): Promise<void> {
  const row = await prisma.rakutenCategory.findUnique({ where: { genreId }, select: { parentId: true } });
  if (!row) return;
  await prisma.rakutenCategory.update({ where: { genreId }, data: { isActive: false } });
  scheduleRefresh(row.parentId);
}

/** 라쿠텐이 genreId 를 거부한 오류인지 (사라진 장르·잘못된 값) */
export function isGenreNotFoundError(e: unknown): e is RakutenApiError {
  return e instanceof RakutenApiError
    && e.status === 400
    && e.code === 'wrong_parameter'
    && /genreId/i.test(e.description ?? '');
}
