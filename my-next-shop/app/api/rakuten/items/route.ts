import { NextResponse } from 'next/server';
import { rakutenBaseAPIOn } from '@/lib/rakuten';
import { isGenreNotFoundError, markGenreStale } from '@/lib/rakutenGenres';

export async function GET(request: Request) {
  try {

      const { searchParams } = new URL(request.url);
      
      // 1. URL 파라미터 상태 추출
      const genreId = searchParams.get('genreId') || '0';
      const page = searchParams.get('page') || '1';
      const sort = searchParams.get('sort') || 'standard';
      
      const keyword = searchParams.get('keyword') || undefined;      //검색어
      const NGKeyword = searchParams.get('NGKeyword') || undefined;  //제외할 단어
      const minPrice = searchParams.get('minPrice') || undefined;    //최소 가격
      const maxPrice = searchParams.get('maxPrice')|| undefined;    //최대 가격

      const tailUrl = "ichibams/api/IchibaItem/Search/20260701";

      const itemData = await rakutenBaseAPIOn(tailUrl, genreId, page, sort,keyword,NGKeyword,minPrice,maxPrice);
      const rawItems = Array.isArray(itemData?.Items) ? itemData.Items : [];
      const items = rawItems
        .map((entry: any) => entry?.Item ?? entry)
        .filter((item: any) => item?.itemCode);

      return NextResponse.json({
        items,
        page: itemData?.page || page, 
        pageCount: itemData?.pageCount || 0, 
      });

  } catch (error) {
    // 🌟 라쿠텐에서 사라진 장르로 검색한 경우: 화면에 이유를 알려주고, 그 장르는 숨긴 뒤 부모 목록을 뒤에서 갱신합니다.
    if (isGenreNotFoundError(error)) {
      const staleId = Number(new URL(request.url).searchParams.get('genreId')) || 0;
      if (staleId) void markGenreStale(staleId);
      return NextResponse.json(
        { error: '이 카테고리는 더 이상 라쿠텐에 존재하지 않습니다. 상위 카테고리에서 다시 선택해 주세요.', staleGenre: true },
        { status: 404 },
      );
    }
    console.error('❌ [DEBUG ERROR] Rakuten Item API Error:', error);
    return NextResponse.json(
      { error: '상품 정보를 불러오는데 실패했습니다.' }, 
      { status: 500 }
    );
  }
}