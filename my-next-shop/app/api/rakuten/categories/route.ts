// app/api/rakuten/categories/route.ts
import { NextResponse } from 'next/server';
import { rakutenBaseAPIOn } from '@/lib/rakuten';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const genreId = searchParams.get('genreId');
    
    const setGenreId = genreId || '0';
    const cacheKey = `rakuten_categoriAPI_${setGenreId}`;
    const tailUrl = "ichibagt/api/IchibaGenre/Search/20170711";
    
    // 카테고리는 page: 1, sort: "" 고정
    const categoryData = await rakutenBaseAPIOn(cacheKey, tailUrl, setGenreId, 1, "");

    return NextResponse.json({
      genreId: categoryData?.genreId || setGenreId, 
      parents: categoryData?.parents || [], 
      current: categoryData?.current || null, 
      children: categoryData?.children || [], 
    });

  } catch (error) {
    console.error('Rakuten Category API Error:', error);
    return NextResponse.json(
      { error: '카테고리 정보를 불러오는데 실패했습니다.' }, 
      { status: 500 }
    );
  }
}