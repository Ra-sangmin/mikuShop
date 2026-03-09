import { NextResponse } from 'next/server';
import { rakutenBaseAPIOn } from '@/lib/rakuten';

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

      const tailUrl = "ichibams/api/IchibaItem/Search/20220601";

      const itemData = await rakutenBaseAPIOn(tailUrl, genreId, page, sort,keyword,NGKeyword,minPrice,maxPrice);

      return NextResponse.json({
        items: itemData?.Items || [], 
        page: itemData?.page || page, 
        pageCount: itemData?.pageCount || 0, 
      });

  } catch (error) {
    console.error('❌ [DEBUG ERROR] Rakuten Item API Error:', error);
    return NextResponse.json(
      { error: '상품 정보를 불러오는데 실패했습니다.' }, 
      { status: 500 }
    );
  }
}