// app/api/rakuten/categories/route.ts
// 사용자용 라쿠텐 카테고리 조회.
// DB 를 먼저 쓰고, 그 장르를 처음 방문했을 때만 라쿠텐을 기다립니다. 오래된 목록은 응답 후
// 백그라운드로 갱신됩니다. (lib/rakutenGenres.ts 참고)
import { NextResponse } from 'next/server';
import { getGenreChildren, getGenrePath, isGenreNotFoundError } from '@/lib/rakutenGenres';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genreId = Number(searchParams.get('genreId')) || 0;

  try {
    // 자식 목록을 먼저 (처음 방문이면 여기서 조상 행도 함께 만들어지므로) 경로는 그 뒤에 읽습니다.
    const { children, isLeaf, fromCache } = await getGenreChildren(genreId);
    const parents = await getGenrePath(genreId);

    return NextResponse.json({
      success: true,
      data: children,
      isLeaf,
      // 🌟 루트→현재 장르 순서의 빵부스러기. 직접 URL 로 들어와도 경로가 보이게 합니다.
      parents,
      fromCache,
    });
  } catch (error) {
    if (isGenreNotFoundError(error)) {
      return NextResponse.json(
        { success: false, error: '존재하지 않는 카테고리입니다.', staleGenre: true },
        { status: 404 },
      );
    }
    console.error('Rakuten Category API Error:', error);
    return NextResponse.json(
      { success: false, error: '카테고리 정보를 불러오는데 실패했습니다.' },
      { status: 500 },
    );
  }
}
