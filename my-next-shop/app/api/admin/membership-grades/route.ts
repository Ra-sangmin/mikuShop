import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';

export async function GET() {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const grades = await prisma.membershipGrade.findMany({
      orderBy: { id: 'asc' }
    });
    return NextResponse.json({ success: true, grades });
  } catch (error) {
    console.error('Admin MembershipGrade GET Error:', error);
    return NextResponse.json({ error: '등급 목록 조회 실패' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const { id, name, discountRate, requiredOrders, sortOrder, description } = await req.json();

    if (id === undefined || id === null) {
      return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
    }

    const updated = await prisma.membershipGrade.update({
      where: { id },
      data: {
        name,
        discountRate: parseFloat(discountRate) || 0,
        requiredOrders: parseInt(requiredOrders) || 0,
        sortOrder: parseInt(sortOrder) || 0,
        description,
      }
    });

    return NextResponse.json({ success: true, grade: updated });
  } catch (error) {
    console.error('Admin MembershipGrade PATCH Error:', error);
    return NextResponse.json({ error: '등급 정보 수정 실패' }, { status: 500 });
  }
}
