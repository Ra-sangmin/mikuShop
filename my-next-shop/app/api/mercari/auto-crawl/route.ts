// app/api/mercari/auto-crawl/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 💡 핵심 로직: 자식 카테고리가 아직 DB에 없는 항목을 먼저 찾습니다.
    // Raw Query를 사용하면 '자식이 0개인 부모'를 정확히 찾을 수 있습니다.
    const nextTarget: any[] = await prisma.$queryRaw`
      SELECT * FROM MercariCategory 
      WHERE isLeaf = false 
      AND genreId NOT IN (SELECT DISTINCT parentId FROM MercariCategory WHERE parentId IS NOT NULL)
      ORDER BY genreLevel ASC, updatedAt ASC
      LIMIT 1
    `;

    if (nextTarget.length === 0) {
      return NextResponse.json({ success: true, nextId: null });
    }

    return NextResponse.json({ 
      success: true, 
      nextId: nextTarget[0].genreId,
      nextName: nextTarget[0].genreName
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}