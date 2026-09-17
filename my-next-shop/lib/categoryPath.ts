// 🧭 카테고리 경로(빵부스러기) — 각 플랫폼 카테고리 테이블에서 parentId 를 따라 루트까지 올라갑니다.
// 직접 URL 로 들어온 경우에도 "HOME > 대분류 > 중분류" 경로를 그릴 수 있게 API 응답에 parents 로 실어 보냅니다.
//
// 🌟 이름은 Translation(translationId → ko)에서 읽습니다. 카테고리 테이블에는 이름 컬럼이 없습니다.
//    한국어가 없으면 원문(jp), 참조 자체가 없으면 ID 로 표시합니다.
import prisma from '@/lib/prisma';

export type CategoryPathModel = 'rakutenCategory' | 'mercariCategory' | 'yahooShoppingCategory' | 'yahooAuctionCategory';
export interface CategoryCrumb { genreId: number; genreName: string; }

/** 카테고리 행에서 화면에 보여줄 이름을 고릅니다 (플랫폼 공용) */
export function categoryDisplayName(row: { genreId: number; translation: { ko: string; jp: string } | null }): string {
  return row.translation?.ko || row.translation?.jp || `#${row.genreId}`;
}

/** 이름을 읽을 때 쓰는 공용 select 조각 */
export const CATEGORY_NAME_SELECT = { genreId: true, translation: { select: { ko: true, jp: true } } } as const;

/**
 * @param rootIds 루트를 뜻하는 parentId 값들 (대부분 0, 야후쇼핑은 1)
 */
export async function getCategoryPath(model: CategoryPathModel, genreId: number, rootIds: number[] = [0]): Promise<CategoryCrumb[]> {
  const table = (prisma as any)[model];
  const path: CategoryCrumb[] = [];
  let cursor = genreId;
  for (let guard = 0; cursor && !rootIds.includes(cursor) && guard < 8; guard++) {
    const row: { genreId: number; parentId: number; translation: { ko: string; jp: string } | null } | null = await table.findUnique({
      where: { genreId: cursor },
      select: { parentId: true, ...CATEGORY_NAME_SELECT },
    });
    if (!row) break;
    path.unshift({ genreId: row.genreId, genreName: categoryDisplayName(row) });
    cursor = row.parentId;
  }
  return path;
}
