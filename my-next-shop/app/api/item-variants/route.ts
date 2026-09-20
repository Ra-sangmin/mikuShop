// 🛒 상품의 옵션(SKU)별 가격 — 라쿠텐 · 야후쇼핑
//
// 상세 화면이 열린 뒤 따로 부릅니다. 상품 페이지를 읽어야 해서 검색 API 보다 느린데,
// 함께 기다리면 상세가 늦게 뜹니다. 그래서 가격 범위(검색 API)를 먼저 보여 주고
// 옵션은 이 응답이 오면 채웁니다.
//
// 옵션이 없는 상품이거나 파싱이 깨지면 hasVariants: false 를 돌려줍니다.
// 화면은 그때 옵션 영역을 아예 지웁니다. (오류로 처리하지 않습니다)
import { NextResponse } from 'next/server';
import { getItemVariants, VARIANT_CACHE_HOURS } from '@/lib/itemVariants';
import { isAllowedItemHost, normalizeItemUrl, type ItemPlatform } from '@/lib/itemUrl';

const PLATFORMS: ItemPlatform[] = ['rakuten', 'yahoo_shopping'];

/** 옵션도 관련 상품도 없을 때의 응답. 화면이 옵션 영역을 지우는 신호입니다. */
const EMPTY = { success: true, hasVariants: false, relatedItems: [] as unknown[] };

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const itemUrl = params.get('url');
  const platform = params.get('platform') as ItemPlatform | null;

  if (!itemUrl) {
    return NextResponse.json({ error: '상품 URL(url)이 필요합니다.' }, { status: 400 });
  }
  if (!platform || !PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: '지원하지 않는 판매처입니다.' }, { status: 400 });
  }

  // 🔒 해당 판매처의 상품 페이지만 읽습니다. 아무 주소나 받으면 서버가 남의 사이트를
  //    대신 긁는 통로가 됩니다(SSRF).
  //    검사는 **정규화한 주소**로 합니다. 라쿠텐 검색 API 가 제휴 링크
  //    (hb.afl.rakuten.co.jp/…?pc=…)를 내려주는데, 겉 주소만 보면
  //    pc 파라미터 안에 아무 사이트나 넣어 통과시킬 수 있습니다.
  if (!isAllowedItemHost(platform, normalizeItemUrl(itemUrl))) {
    return NextResponse.json({ error: '해당 판매처의 상품 주소가 아닙니다.' }, { status: 400 });
  }

  try {
    const set = await getItemVariants(platform, itemUrl);
    if (!set || (set.variants.length === 0 && set.relatedItems.length === 0)) {
      return NextResponse.json(EMPTY);
    }

    return NextResponse.json({
      success: true,
      // 옵션은 없고 "기타 변형"만 있는 상품도 있습니다. (야후) 그때는 관련 상품만 보여 줍니다.
      hasVariants: set.variants.length > 0,
      axes: set.axes,
      axisValues: set.axisValues,
      variants: set.variants,
      relatedItems: set.relatedItems,
      minPrice: set.minPrice,
      maxPrice: set.maxPrice,
      fetchedAt: set.fetchedAt,
      cacheHours: VARIANT_CACHE_HOURS,
    });
  } catch (error) {
    // 옵션을 못 읽는 것이 상세 페이지를 막을 이유는 없습니다. 화면은 옵션 영역만 지웁니다.
    console.error('[상품옵션] 조회 실패:', error);
    return NextResponse.json(EMPTY);
  }
}
