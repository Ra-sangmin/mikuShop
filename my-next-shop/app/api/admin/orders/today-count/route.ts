import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';
import { ORDER_STATUS, ADMIN_ATTENTION_STATUSES } from '@/src/types/order';

// 🔔 관리자 사이드바 메뉴 옆 숫자 — 관리자가 처리해야 하는 주문 건수
//    주문 관리 화면의 '관리자 처리 필요' 묶음(ADMIN_TABS)과 같은 상태·같은 셈법입니다.
//
// 📦 이 단계들은 이제 두 화면이 나눠 맡습니다. (주문 관리 / 입고 완료 · 배송 준비)
//    그래서 합계만 주면 어느 메뉴에 몇 건인지 알 수 없어, 상태별 건수(byStatus)도 함께 돌려줍니다.
//    어느 상태가 어느 메뉴에 속하는지는 app/admin/orders/ordersScope.ts 한 곳에서 정합니다.
//    · 상태: 경매 중 · 경매 실패 · 구매 실패 · 상품 결제 완료 · 입고 대기중 · 배송 준비중 · 배송비 결제 완료
//    · 합포장(bundleId)으로 묶이는 단계는 묶음을 1건으로 셉니다. (주문 관리 탭 숫자와 맞추기 위함)
const ADMIN_STATUSES = ADMIN_ATTENTION_STATUSES;
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
    const byStatusUnits: Record<string, Set<string>> = {};
    rows.forEach((o) => {
      const unit = o.bundleId && GROUPABLE_STATUSES.includes(o.status)
        ? `${o.status}|B:${o.bundleId}`
        : `${o.status}|O:${o.id}`;
      units.add(unit);
      (byStatusUnits[o.status] ||= new Set()).add(unit);
    });

    const byStatus: Record<string, number> = {};
    Object.entries(byStatusUnits).forEach(([status, set]) => { byStatus[status] = set.size; });

    return NextResponse.json({ success: true, count: units.size, byStatus });
  } catch (error) {
    console.error('Admin Orders TodayCount GET Error:', error);
    return NextResponse.json({ error: '관리자 처리 필요 건수 조회 실패' }, { status: 500 });
  }
}
