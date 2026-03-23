import { NextResponse, NextRequest } from 'next/server';
import * as cheerio from 'cheerio';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const genreIdParam = searchParams.get('genre') || searchParams.get('category');
  const genreId = Number(genreIdParam) || 0;

  try {
    // 1️⃣ 최상위 루트 예외 처리
    if (genreId === 0) {
      const root = await prisma.yahooAuctionCategory.findMany({
        where: { parentId: 0 },
        orderBy: { id: 'asc' }
      });
      return NextResponse.json({ success: true, data: root, isLeaf: false, fromCache: true });
    }

    const existing = await prisma.yahooAuctionCategory.findMany({ 
      where: { parentId: Number(genreId) }, // 앞선 에러 방지를 위해 숫자 변환 포함
      orderBy: {
        updatedAt: 'asc' // 최신 데이터가 배열의 0번째로 오도록 정렬
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: existing, 
      isLeaf: false,
      fromCache: true // 💡 이 데이터를 추가하여 프론트엔드에 알립니다.
    });

  } catch (error: any) {
    console.error("🔥 에러:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}