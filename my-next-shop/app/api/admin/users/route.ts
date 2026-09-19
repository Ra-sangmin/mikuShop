// app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';

/**
 * GET /api/admin/users          → 회원 목록
 * GET /api/admin/users?id=123   → 회원 상세 (배송지, 최근 주문, 최근 머니 내역, 주문 상태별 건수)
 */
export async function GET(req: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  const idParam = new URL(req.url).searchParams.get('id');

  try {
    // ── 상세 ──────────────────────────────────────────
    if (idParam) {
      const id = Number(idParam);
      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json({ success: false, error: '잘못된 회원 ID입니다.' }, { status: 400 });
      }

      const [user, recentOrders, recentMoneyLogs, statusGroups] = await Promise.all([
        prisma.user.findUnique({
          where: { id },
          omit: { password: true }, // 🔒 비밀번호 해시는 내려보내지 않음
          include: {
            grade: true,
            _count: { select: { orders: true } },
            addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] },
          },
        }),
        prisma.order.findMany({
          where: { userId: id },
          orderBy: { registeredAt: 'desc' },
          take: 6,
          select: {
            id: true, orderId: true, type: true, status: true,
            productName: true, productImageUrl: true, productPrice: true, registeredAt: true,
          },
        }),
        prisma.moneyLog.findMany({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
        prisma.order.groupBy({
          by: ['status'],
          where: { userId: id },
          _count: { _all: true },
        }),
      ]);

      if (!user) {
        return NextResponse.json({ success: false, error: '회원을 찾을 수 없습니다.' }, { status: 404 });
      }

      const statusCounts = Object.fromEntries(statusGroups.map(g => [g.status, g._count._all]));
      return NextResponse.json({ success: true, user, recentOrders, recentMoneyLogs, statusCounts });
    }

    // ── 목록 ──────────────────────────────────────────
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

/**
 * PATCH /api/admin/users
 * body: { userId, membershipGrade?, cyberMoneyDelta?, cyberMoney?, reason? }
 *  - cyberMoneyDelta : 현재 잔액에 더하거나 뺄 금액 (권장 — 화면이 들고 있던 잔액과 무관하게 안전)
 *  - cyberMoney      : 잔액을 이 값으로 덮어쓰기 (하위 호환용)
 *  - reason          : 머니 조정 사유 (money_logs 내용에 함께 남깁니다)
 */
export async function PATCH(req: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const { userId, membershipGrade, cyberMoney, cyberMoneyDelta, reason } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    // 🐛 예전에는 등급만 바꿔도 화면이 들고 있던 낡은 cyberMoney를 항상 함께 덮어써서,
    //    그 사이 회원이 쓴 금액이 되살아나는 갱신 손실(lost update)이 있었습니다.
    //    → 요청에 실제로 담겨 온 항목만 수정합니다.
    const wantsGradeChange = membershipGrade !== undefined && membershipGrade !== null;
    const wantsDelta = cyberMoneyDelta !== undefined && cyberMoneyDelta !== null && Number(cyberMoneyDelta) !== 0;
    const wantsMoneySet = !wantsDelta && cyberMoney !== undefined && cyberMoney !== null;

    if (!wantsGradeChange && !wantsDelta && !wantsMoneySet) {
      return NextResponse.json({ error: '변경할 항목이 없습니다.' }, { status: 400 });
    }

    const delta = wantsDelta ? Math.trunc(Number(cyberMoneyDelta)) : 0;
    if (wantsDelta && !Number.isFinite(delta)) {
      return NextResponse.json({ error: '조정 금액이 올바르지 않습니다.' }, { status: 400 });
    }
    const reasonText = typeof reason === 'string' ? reason.trim().slice(0, 100) : '';

    const updatedUser = await prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({ where: { id: userId } });
      if (!before) throw new Error('USER_NOT_FOUND');

      const data: { membershipGrade?: number; cyberMoney?: number | { increment: number } } = {};
      if (wantsGradeChange) data.membershipGrade = parseInt(membershipGrade) || 0;

      if (wantsDelta) {
        if (before.cyberMoney + delta < 0) throw new Error('NEGATIVE_BALANCE');
        // 🔒 increment 로 원자적으로 반영 → 조회 시점 이후의 사용 내역을 덮어쓰지 않습니다.
        data.cyberMoney = { increment: delta };
      } else if (wantsMoneySet) {
        const next = parseInt(cyberMoney) || 0;
        if (next < 0) throw new Error('NEGATIVE_BALANCE');
        data.cyberMoney = next;
      }

      const user = await tx.user.update({
        where: { id: userId },
        data,
        include: { grade: true },
        omit: { password: true },
      });

      // 🌟 관리자가 잔액을 직접 조정한 경우 근거를 남깁니다.
      const actual = user.cyberMoney - before.cyberMoney;
      if ((wantsDelta || wantsMoneySet) && actual !== 0) {
        await tx.moneyLog.create({
          data: {
            userId,
            type: actual > 0 ? 'CHARGE' : 'USE',
            content: `[관리자 조정] ${before.cyberMoney.toLocaleString()}원 → ${user.cyberMoney.toLocaleString()}원`
              + (reasonText ? ` · 사유: ${reasonText}` : '')
              + ` · 처리: ${adminAuth.admin.name || adminAuth.admin.adminId}`,
            amount: actual,
            balanceAfter: user.cyberMoney,
          },
        });
      }

      return user;
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    if (error?.message === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: '회원을 찾을 수 없습니다.' }, { status: 404 });
    }
    if (error?.message === 'NEGATIVE_BALANCE') {
      return NextResponse.json({ error: '잔액이 0원보다 적어질 수 없습니다.' }, { status: 400 });
    }
    console.error("Admin User PATCH Error:", error);
    return NextResponse.json({ error: '사용자 정보 수정 실패' }, { status: 500 });
  }
}
