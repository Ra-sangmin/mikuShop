// app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        _count: {
          select: { orders: true }
        }
      }
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Admin Users GET Error:", error);
    return NextResponse.json({ error: 'DB 조회 실패' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId, level, cyberMoney } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        level,
        cyberMoney: parseInt(cyberMoney) || 0,
      }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Admin User PATCH Error:", error);
    return NextResponse.json({ error: '사용자 정보 수정 실패' }, { status: 500 });
  }
}
