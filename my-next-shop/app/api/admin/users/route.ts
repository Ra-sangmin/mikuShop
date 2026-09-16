// app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';

export async function GET() {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const users = await prisma.user.findMany({
      omit: { password: true }, // 🔒 비밀번호 해시는 내려보내지 않음
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        _count: {
          select: { orders: true }
        },
        grade: true
      }
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Admin Users GET Error:", error);
    return NextResponse.json({ error: 'DB 조회 실패' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const { userId, membershipGrade, cyberMoney } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    // 🐛 예전에는 등급만 바꿔도 화면이 들고 있던 낡은 cyberMoney를 항상 함께 덮어써서,
    //    그 사이 회원이 쓴 금액이 되살아나는 갱신 손실(lost update)이 있었습니다.
    //    → 요청에 실제로 담겨 온 항목만 수정합니다.
    const wantsGradeChange = membershipGrade !== undefined && membershipGrade !== null;
    const wantsMoneyChange = cyberMoney !== undefined && cyberMoney !== null;

    if (!wantsGradeChange && !wantsMoneyChange) {
      return NextResponse.json({ error: '변경할 항목이 없습니다.' }, { status: 400 });
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({ where: { id: userId } });
      if (!before) throw new Error('USER_NOT_FOUND');

      const data: { membershipGrade?: number; cyberMoney?: number } = {};
      if (wantsGradeChange) data.membershipGrade = parseInt(membershipGrade) || 0;

      let newBalance = before.cyberMoney;
      if (wantsMoneyChange) {
        newBalance = parseInt(cyberMoney) || 0;
        data.cyberMoney = newBalance;
      }

      const user = await tx.user.update({
        where: { id: userId },
        data,
        include: { grade: true },
        omit: { password: true },
      });

      // 🌟 관리자가 잔액을 직접 조정한 경우 근거를 남깁니다(기존에는 기록이 전혀 없었습니다).
      const delta = newBalance - before.cyberMoney;
      if (wantsMoneyChange && delta !== 0) {
        await tx.moneyLog.create({
          data: {
            userId,
            type: delta > 0 ? 'CHARGE' : 'USE',
            content: `[관리자 조정] ${before.cyberMoney.toLocaleString()}원 → ${newBalance.toLocaleString()}원`,
            amount: delta,
            balanceAfter: newBalance,
          },
        });
      }

      return user;
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Admin User PATCH Error:", error);
    return NextResponse.json({ error: '사용자 정보 수정 실패' }, { status: 500 });
  }
}
