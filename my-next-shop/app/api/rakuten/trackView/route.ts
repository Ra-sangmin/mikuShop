import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

// 🌟 상품 상세 정보를 열람할 때마다 호출되는 "조회수 누적" 엔드포인트입니다.
// 프론트에서 fire-and-forget으로 호출하므로, 실패해도 상세보기 자체를 막지 않습니다.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemId, name, price, thumbnail, url, shopName } = body;

    if (!itemId || !name) {
      return NextResponse.json({ success: false, error: 'itemId/name 필요' }, { status: 400 });
    }

    await prisma.productPopularity.upsert({
      where: { platform_itemId: { platform: 'rakuten', itemId: String(itemId) } },
      create: {
        platform: 'rakuten',
        itemId: String(itemId),
        name: String(name).slice(0, 500),
        price: Number(price) || 0,
        thumbnail: thumbnail || null,
        url: url || '',
        shopName: shopName || null,
        viewCount: 1,
      },
      update: {
        viewCount: { increment: 1 },
        // 🌟 조회할 때마다 최신 가격/썸네일로 캐시를 갱신해, 랜딩 섹션에 오래된 정보가 남지 않게 합니다.
        name: String(name).slice(0, 500),
        price: Number(price) || 0,
        thumbnail: thumbnail || null,
        url: url || '',
        shopName: shopName || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('trackView error:', error);
    // 🌟 이 API는 부가 기능이라, 실패해도 500으로 프론트를 방해하지 않고 success:false만 반환합니다.
    return NextResponse.json({ success: false, error: error.message });
  }
}
