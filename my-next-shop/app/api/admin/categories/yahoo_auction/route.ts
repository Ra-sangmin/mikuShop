// app/api/admin/categories/yahoo_auction/route.ts
// 관리자용: 야후옥션 카테고리 페이지에서 한 카테고리의 자식 목록을 받아 DB 에 반영합니다.
// 관리자 개발자 페이지의 "자동 수집"이 이 라우트를 카테고리마다 반복 호출해 트리를 채웁니다.
// 동기화 로직은 lib/yahooAuctionCategories.ts 에 있고, 사용자용 라우트(첫 방문 시 자동 수집)와 같은 코드를 씁니다.
//
// 🐛 예전엔 중개 사이트(bidbuy)를 긁었는데 지금은 WAF 챌린지에 막혀 빈 페이지가 오고, 그러면 카테고리를
//    잘못 리프로 닫았습니다. 출처를 야후옥션 자체 페이지로 바꾸면서 "무한루프 감지" 큐도 필요 없어졌습니다.
import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { syncCategoryChildren, isCategoryNotFoundError, YAHOO_AUCTION_ROOT_ID } from '@/lib/yahooAuctionCategories';

export async function GET(request: NextRequest) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  const searchParams = request.nextUrl.searchParams;
  const genreId = Number(searchParams.get('genreId') || searchParams.get('category')) || YAHOO_AUCTION_ROOT_ID;

  try {
    const { children, parents, isLeaf } = await syncCategoryChildren(genreId);
    if (isLeaf) console.log(`[야후옥션 카테고리] ${genreId} 는 최하위 카테고리 (isLeaf=true)`);

    return NextResponse.json({ success: true, data: children, parents, isLeaf });
  } catch (error) {
    if (isCategoryNotFoundError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }
    console.error('🔥 야후옥션 카테고리 수집 에러:', error);
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || '카테고리 정보를 불러오는데 실패했습니다.' },
      { status: 500 },
    );
  }
}
