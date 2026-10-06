// app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';
import { PURPOSE_LABEL, type PaymentPurpose } from '@/lib/payments/quote';

/**
 * GET /api/admin/users          → 회원 목록
 * GET /api/admin/users?id=123   → 회원 상세 (배송지, 최근 주문, 최근 카드 결제, 주문 상태별 건수)
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

      const [user, recentOrders, payments, paidSum, statusGroups] = await Promise.all([
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
        // 💳 결제창만 열고 그만둔 건(READY)은 돈이 오가지 않았으므로 빼고 봅니다.
        prisma.payment.findMany({
          where: { userId: id, status: { not: 'READY' } },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            id: true, purpose: true, orderName: true, amount: true, canceledAmount: true,
            status: true, method: true, approvedAt: true, createdAt: true,
          },
        }),
        // 💳 드로어 상단의 "결제" 숫자 — 취소된 금액은 빼고 실제로 남은 결제액입니다.
        prisma.payment.aggregate({
          where: { userId: id, status: { not: 'READY' } },
          _sum: { amount: true, canceledAmount: true },
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
      const recentPayments = payments.map(p => ({ ...p, purposeLabel: PURPOSE_LABEL[p.purpose as PaymentPurpose] ?? p.purpose }));
      const paidTotal = (paidSum._sum.amount ?? 0) - (paidSum._sum.canceledAmount ?? 0);
      return NextResponse.json({ success: true, user, recentOrders, recentPayments, paidTotal, statusCounts });
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
 * body: { userId, membershipGrade }
 *  - 💳 미쿠짱머니(잔액)가 없어져 관리자가 고칠 수 있는 항목은 등급뿐입니다.
 *    돈을 돌려줄 일은 결제 취소(/api/admin/payments)로 처리합니다.
 */
export async function PATCH(req: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const { userId, membershipGrade } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }
    if (membershipGrade === undefined || membershipGrade === null) {
      return NextResponse.json({ error: '변경할 항목이 없습니다.' }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!exists) {
      return NextResponse.json({ error: '회원을 찾을 수 없습니다.' }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { membershipGrade: parseInt(membershipGrade) || 0 },
      include: { grade: true },
      omit: { password: true },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Admin User PATCH Error:", error);
    return NextResponse.json({ error: '사용자 정보 수정 실패' }, { status: 500 });
  }
}
