import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

// 🌟 조회수(viewCount) 내림차순으로 라쿠텐 인기 상품을 반환합니다.
// 랜딩 페이지(카테고리 그리드 아래)의 "실시간 인기 상품" 섹션에서 사용합니다.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 100);

    const items = await prisma.productPopularity.findMany({
      where: { platform: 'rakuten' },
      orderBy: { viewCount: 'desc' },
      take: limit,
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    console.error('popular items error:', error);
    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
  }
}
