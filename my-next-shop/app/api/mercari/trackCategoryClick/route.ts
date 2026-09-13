import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

// 🌟 사용자가 카테고리를 클릭할 때마다 호출되는 "클릭수 누적" 엔드포인트입니다.
// (yahoo_auction과 동일한 패턴) 메루카리 홈 화면의 "실시간 인기 상품"이 어떤 카테고리를
// 먼저 빠르게 보여줄지 고를 때, 이 실제 클릭 데이터를 참고합니다.
// 프론트에서 fire-and-forget으로 호출하므로, 실패해도 카테고리 이동 자체를 막지 않습니다.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { genreId, genreName } = body;

    if (!genreId) {
      return NextResponse.json({ success: false, error: 'genreId 필요' }, { status: 400 });
    }

    await prisma.categoryPopularity.upsert({
      where: { platform_genreId: { platform: 'mercari', genreId: Number(genreId) } },
      create: {
        platform: 'mercari',
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
