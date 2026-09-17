// app/api/yahoo_auction/categories/route.ts
// 사용자용 야후옥션 카테고리 조회.
// DB 를 먼저 쓰고, 그 카테고리를 처음 방문했을 때만(테이블이 비어 있을 때 포함) 야후옥션을 기다립니다.
// 오래된 목록은 응답 후 백그라운드로 갱신됩니다. (lib/yahooAuctionCategories.ts 참고)
import { NextResponse, NextRequest } from 'next/server';
import {
  getCategoryChildren,
  getCategoryPathOf,
  isCategoryNotFoundError,
  YAHOO_AUCTION_ROOT_ID,
} from '@/lib/yahooAuctionCategories';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  // 화면은 genre 로, 예전 호출은 category / genreId 로 보냅니다. 모두 받습니다.
  const genreIdParam = searchParams.get('genre') || searchParams.get('category') || searchParams.get('genreId');
  const genreId = Number(genreIdParam) || YAHOO_AUCTION_ROOT_ID;

  try {
    // 자식 목록을 먼저 (처음 방문이면 여기서 조상 행도 함께 만들어지므로) 경로는 그 뒤에 읽습니다.
    const { children, isLeaf, fromCache } = await getCategoryChildren(genreId);
    const parents = await getCategoryPathOf(genreId);

    return NextResponse.json({
      success: true,
      data: children,
      isLeaf,
      // 🌟 루트→현재 카테고리 순서의 빵부스러기. 직접 URL 로 들어와도 경로가 보이게 합니다.
      parents,
      fromCache,
    });
  } catch (error) {
    if (isCategoryNotFoundError(error)) {
      return NextResponse.json(
        { success: false, error: '존재하지 않는 카테고리입니다.', staleGenre: true },
        { status: 404 },
      );
    }
    console.error('🔥 야후옥션 카테고리 조회 에러:', error);
    return NextResponse.json(
      { success: false, error: '카테고리 정보를 불러오는데 실패했습니다.' },
      { status: 500 },
    );
  }
}
