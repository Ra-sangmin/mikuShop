// app/api/mercari/auto-crawl/route.ts
// 관리자용: 아직 자식을 받아오지 않은 메루카리 카테고리를 하나 골라 줍니다.
// (관리자 개발자 페이지는 플랫폼 공용 admin/categories/auto-crawl 을 쓰므로 현재 호출처는 없습니다)
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';

export async function GET() {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    // 💡 '아직 자식 목록을 직접 받아온 적이 없는 카테고리'를 찾습니다 (childrenSyncedAt IS NULL).
    //    자식 행이 있는지로 판단하면, 깊은 카테고리를 먼저 방문해 조상만 만들어진 경우를 놓칩니다.
    //    표시 이름은 Translation(translationId → ko, 없으면 jp)에서 읽습니다. (이름 컬럼은 없습니다)
    const nextTarget: { genreId: number; genreName: string }[] = await prisma.$queryRaw`
      SELECT c.genreId, COALESCE(t.ko, t.jp, CAST(c.genreId AS CHAR)) AS genreName
      FROM MercariCategory c
      LEFT JOIN Translation t ON t.id = c.translationId
      WHERE c.isLeaf = false AND c.childrenSyncedAt IS NULL
      ORDER BY c.genreLevel ASC, c.updatedAt ASC
      LIMIT 1
    `;

    if (nextTarget.length === 0) {
      return NextResponse.json({ success: true, nextId: null });
    }

    return NextResponse.json({
      success: true,
      nextId: nextTarget[0].genreId,
      nextName: nextTarget[0].genreName,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
