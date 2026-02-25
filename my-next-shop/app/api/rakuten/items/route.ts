// app/api/rakuten/items/route.ts
import { NextResponse } from 'next/server';
import { rakutenBaseAPIOn } from '@/lib/rakuten'; // 경로가 다르면 수정해주세요

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // URL에서 파라미터 추출 (Next.js 방식)
    const genreId = searchParams.get('genreId');
    const sort = searchParams.get('sort');
    const pageParam = searchParams.get('page');

    // 기본값 세팅 (기존 로직 동일)
    const setGenreId = genreId || '0';
    const setSort = sort || '0';
    const setPage = pageParam ? Number(pageParam) : 0;

    const cacheKey = `rakuten_ItemAPI_${setGenreId}_${setPage}_${setSort}`;
    const tailUrl = "ichibams/api/IchibaItem/Search/20220601";

    // lib 폴더로 빼둔 공통 서비스 함수 호출
    const itemData = await rakutenBaseAPIOn(
      cacheKey,
      tailUrl,
      setGenreId,
      setPage,
      setSort
    );

    // 결과 반환
    return NextResponse.json({
      items: itemData?.Items || [], 
      page: itemData?.page || setPage, 
      pageCount: itemData?.pageCount || 0, 
    });

  } catch (error) {
    console.error('Rakuten Item API Error:', error);
    return NextResponse.json(
      { error: '상품 정보를 불러오는데 실패했습니다.' }, 
      { status: 500 }
    );
  }
}