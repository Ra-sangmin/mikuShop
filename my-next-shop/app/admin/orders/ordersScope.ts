// 🗂 주문 목록 화면의 '범위' — 같은 화면을 어떤 단계만 보여 주도록 잘라 쓰는 설정입니다.
//
// 왜 화면을 복사하지 않았나
//   주문 목록은 표·빠른 처리 버튼·배송비 계산·합포장 묶기까지 한 덩어리로 얽혀 있습니다.
//   창고 화면을 따로 만들면 두 벌을 나란히 고쳐야 하고, 한쪽만 고치는 실수가 반드시 납니다.
//   그래서 화면은 하나(OrdersView)만 두고, 어떤 상태를 보여 줄지만 여기서 정합니다.
//
// ⚠️ 두 화면은 **겹치지 않게** 나눠 가집니다. 창고 단계는 주문 관리에서 감춥니다(hiddenStatuses).
//    같은 주문이 두 화면에 다 보이면 어느 쪽에서 처리했는지 헷갈리고, 사이드바 숫자도 어긋납니다.
//
// 새 범위를 추가하려면
//   ① 아래에 항목을 하나 더 만들고
//   ② app/admin/<경로>/page.tsx 에서 <OrdersView scope={ORDERS_SCOPES.내범위} /> 를 그리고
//   ③ app/admin/adminMenu.ts 에 메뉴를, AdminSidebar.tsx 의 MENU_ICON 에 아이콘을 넣습니다.
import { ORDER_STATUS, OrderStatus, ADMIN_ATTENTION_STATUSES } from '@/src/types/order';

/**
 * 📦 일본 창고에 들어온 뒤 ~ 국제 발송 직전까지.
 * 한 곳에 적어 두고 창고 화면(보여 줄 목록)과 주문 관리(감출 목록)가 같이 씁니다.
 * 따로 적으면 한쪽만 고쳤을 때 어느 화면에도 안 보이는 주문이 생깁니다.
 */
const WAREHOUSE_STATUSES: OrderStatus[] = [
  ORDER_STATUS.ARRIVED,      // 입고 완료
  ORDER_STATUS.PREPARING,    // 배송 준비중
  ORDER_STATUS.PAYMENT_REQ,  // 배송비 결제 대기
  ORDER_STATUS.PAYMENT_DONE, // 배송비 결제 완료
];

export type OrdersScope = {
  key: string;
  /** 이 범위를 그리는 주소 — 사이드바가 메뉴별 숫자를 찾을 때 씁니다. */
  path: string;
  /** 히어로 제목 — 사이드바 메뉴 이름과 같게 둡니다. */
  title: string;
  eyebrow: string;
  description: string;
  /**
   * 이 화면에서 다룰 상태. `null` 이면 제한 없음.
   * 순서가 곧 탭 순서이므로 **일이 진행되는 차례대로** 적습니다.
   */
  statuses: OrderStatus[] | null;
  /** 여기서는 감출 상태. 다른 화면이 맡은 단계입니다. */
  hiddenStatuses: OrderStatus[];
  /** '전체' 탭에 붙일 이름 */
  allLabel: string;
  /** '전체' 탭에 마우스를 올렸을 때 나오는 설명 */
  allHint: string;
  /** 열 너비를 범위마다 따로 기억합니다. (탭 구성이 달라 같이 쓰면 어색해집니다) */
  widthKey: string;
};

export const ORDERS_SCOPES: Record<string, OrdersScope> = {
  all: {
    key: 'all',
    path: '/admin/orders',
    title: '주문 관리',
    eyebrow: 'ORDERS',
    description: '신청부터 일본 창고 입고까지의 주문을 확인하고 변경합니다. 입고 완료부터는 ‘입고 완료 · 배송 준비’에서 이어서 처리합니다.',
    statuses: null,
    hiddenStatuses: WAREHOUSE_STATUSES,
    allLabel: '처리 중 전체',
    allHint: '아래 탭을 한 표에 모아 봅니다. 장바구니 · 실패 · 입고 완료 이후는 빠집니다.',
    widthKey: 'admin_orders_column_widths',
  },
  // 📦 주문 관리에서 이 네 단계만 떼어 봅니다. (주문 관리에서는 감춰집니다)
  warehouse: {
    key: 'warehouse',
    path: '/admin/warehouse',
    title: '입고 완료 · 배송 준비',
    eyebrow: 'WAREHOUSE',
    description: '일본 창고에 들어온 뒤 국제 발송 전까지의 주문입니다. 배송비를 청구하고 결제를 확인하는 단계입니다.',
    statuses: WAREHOUSE_STATUSES,
    hiddenStatuses: [],
    allLabel: '이 단계 전체',
    allHint: '입고 완료부터 배송비 결제 완료까지 네 단계를 한 표에 모아 봅니다.',
    widthKey: 'admin_orders_column_widths_warehouse',
  },
};

/** 이 화면이 다루는 상태인지 */
export function scopeIncludes(scope: OrdersScope, status: string): boolean {
  if (scope.hiddenStatuses.includes(status as OrderStatus)) return false;
  return !scope.statuses || scope.statuses.includes(status as OrderStatus);
}

/**
 * 🔔 이 화면에서 '관리자 처리 필요'로 셀 상태.
 * 사이드바 메뉴 옆 숫자와 화면 안의 탭 숫자가 어긋나지 않도록 한 곳에서 정합니다.
 */
export function attentionStatusesOf(scope: OrdersScope): OrderStatus[] {
  return ADMIN_ATTENTION_STATUSES.filter(st => scopeIncludes(scope, st));
}
