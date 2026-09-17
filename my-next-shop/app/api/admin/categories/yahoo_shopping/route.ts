// app/api/admin/categories/yahoo_shopping/route.ts
// 관리자용: 야후쇼핑 카테고리 API 로 한 카테고리의 자식 목록을 받아 DB 에 반영합니다.
// 관리자 개발자 페이지의 "자동 수집"이 이 라우트를 카테고리마다 반복 호출해 트리를 채웁니다.
// 동기화 로직은 lib/yahooShoppingCategories.ts 에 있고, 사용자용 라우트(첫 방문 시 자동 수집)와 같은 코드를 씁니다.
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { syncCategoryChildren, isCategoryNotFoundError, YAHOO_SHOPPING_ROOT_ID } from '@/lib/yahooShoppingCategories';

export async function GET(request: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  const { searchParams } = new URL(request.url);
  const genreId = Number(searchParams.get('genreId')) || YAHOO_SHOPPING_ROOT_ID; // 야후쇼핑 루트는 1
  console.log(`[Yahoo API] 카테고리 조회 요청 ID: ${genreId}`);

  try {
    const { children, parents, isLeaf } = await syncCategoryChildren(genreId);
    if (isLeaf) console.log(`[야후쇼핑 카테고리] ${genreId} 는 최하위 카테고리 (isLeaf=true)`);

    return NextResponse.json({ success: true, data: children, parents, isLeaf });
  } catch (error) {
    if (isCategoryNotFoundError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    console.error('Yahoo Category API Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || '카테고리 정보를 불러오는데 실패했습니다.' },
      { status: 500 },
    );
  }
}
