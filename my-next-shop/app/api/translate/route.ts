// 🛍️ 붙여넣은 상품 주소에서 이름·가격·사진 가져오기
//
// 구매대행 신청 화면(/purchase/request · /purchase/quote · /delivery/request)에서 씁니다.
// 손님이 주소만 넣으면 나머지 칸을 대신 채워 줍니다.
//
// 못 채워도 오류가 아닙니다. 손님이 직접 적으면 되므로 항상 200 으로 답하고,
// 찾지 못한 항목만 비워서 돌려줍니다. 화면을 막지 않는 것이 더 중요합니다.
import { NextResponse } from 'next/server';
import { fetchProduct } from '@/lib/productFromUrl';
import { translateToKorean } from '@/lib/translate';
import { rateLimit, clientIp } from '@/lib/rateLimit';

/** 입력 칸을 벗어날 때마다 부르는 곳이라 넉넉하게 두되, 대량 호출은 막습니다. */
const LIMIT = 60;
const WINDOW_MS = 10 * 60 * 1000;

/** 못 읽었을 때의 응답. 화면은 이걸 받으면 칸을 비워 둡니다. */
const EMPTY = { success: false as const, productName: '', price: null, imageUrl: null };

export async function POST(req: Request) {
  try {
    const { productUrl, characterLimit = 100 } = await req.json();

    if (!productUrl || typeof productUrl !== 'string') {
      return NextResponse.json({ ...EMPTY, error: '상품 주소가 필요합니다.' });
    }

    // 🔒 서버가 대신 주소를 열어 주는 창구라, 한 사람이 계속 두드리지 못하게 막습니다.
    const limited = rateLimit(`product-url:${clientIp(req)}`, LIMIT, WINDOW_MS);
    if (!limited.allowed) {
      return NextResponse.json({ ...EMPTY, error: '잠시 후 다시 시도해주세요.' });
    }

    // 🔒 내부망 주소 차단은 lib/safeFetch.ts 가 합니다.
    //    쇼핑몰을 도메인으로 추려낼 수 없는 기능이라(손님이 어느 쇼핑몰이든 가져옵니다)
    //    "바깥은 열고 안쪽만 막는" 방식입니다.
    const product = await fetchProduct(productUrl);
    if (!product || !product.name) return NextResponse.json(EMPTY);

    return NextResponse.json({
      success: true,
      productName: await translateToKorean(product.name, characterLimit),
      price: product.price,
      imageUrl: product.imageUrl,
    });
  } catch (error) {
    console.error('[상품정보] 조회 실패:', error);
    return NextResponse.json(EMPTY);
  }
}
