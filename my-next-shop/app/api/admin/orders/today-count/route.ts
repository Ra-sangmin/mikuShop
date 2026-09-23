import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';
import { ORDER_STATUS } from '@/src/types/order';

// 🔔 관리자 사이드바 '주문 관리' 옆 숫자 — 관리자가 처리해야 하는 주문 건수
//    주문 관리 화면의 '관리자 처리 필요' 묶음(ADMIN_TABS)과 같은 상태·같은 셈법입니다.
//    · 상태: 경매 상황 · 경매/구매 실패 · 상품 결제 완료 · 입고 대기중 · 배송 준비중 · 배송비 결제 완료
//    · 합포장(bundleId)으로 묶이는 단계는 묶음을 1건으로 셉니다. (주문 관리 탭 숫자와 맞추기 위함)
const ADMIN_STATUSES = [
  ORDER_STATUS.BIDDING, ORDER_STATUS.FAILED, ORDER_STATUS.PAID,
  ORDER_STATUS.WAITING, ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_DONE,
];
const GROUPABLE_STATUSES: string[] = [
  ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING,
];

export async function GET() {
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const rows = await prisma.order.findMany({
      where: { status: { in: ADMIN_STATUSES as any } },
      select: { id: true, status: true, bundleId: true },
    });

    const units = new Set<string>();
    rows.forEach((o) => {
      const unit = o.bundleId && GROUPABLE_STATUSES.includes(o.status)
        ? `${o.status}|B:${o.bundleId}`
        : `${o.status}|O:${o.id}`;
      units.add(unit);
    });

    return NextResponse.json({ success: true, count: units.size });
  } catch (error) {
    console.error('Admin Orders TodayCount GET Error:', error);
    return NextResponse.json({ error: '관리자 처리 필요 건수 조회 실패' }, { status: 500 });
  }
}
