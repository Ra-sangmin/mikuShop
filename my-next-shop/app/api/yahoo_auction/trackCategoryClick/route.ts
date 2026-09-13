import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

// 🌟 사용자가 카테고리를 클릭할 때마다 호출되는 "클릭수 누적" 엔드포인트입니다.
// main_shop/rakuten이 상품 상세를 열람할 때 ProductPopularity에 조회수를 쌓는 것과 같은
// 방식으로, 야후 옥션은 홈 화면에 보여줄 실제 상품이 없는 대신 "사용자들이 실제로 많이
// 클릭한 카테고리"를 CategoryPopularity에 쌓아서 popular API가 참고하게 합니다.
// 프론트에서 fire-and-forget으로 호출하므로, 실패해도 카테고리 이동 자체를 막지 않습니다.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { genreId, genreName } = body;

    if (!genreId) {
      return NextResponse.json({ success: false, error: 'genreId 필요' }, { status: 400 });
    }

    await prisma.categoryPopularity.upsert({
      where: { platform_genreId: { platform: 'yahoo_auction', genreId: Number(genreId) } },
      create: {
        platform: 'yahoo_auction',
        genreId: Number(genreId),
        genreName: genreName || null,
        clickCount: 1,
      },
      update: {
        clickCount: { increment: 1 },
        genreName: genreName || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('trackCategoryClick error:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
