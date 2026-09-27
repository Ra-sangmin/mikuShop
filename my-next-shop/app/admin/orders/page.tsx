// 📋 주문 관리 — 모든 단계를 봅니다.
// 화면 본체는 OrdersView.tsx 한 곳에 있고, 이 파일은 '어느 범위를 볼지'만 정합니다.
// (입고 완료 · 배송 준비 화면 = app/admin/warehouse/page.tsx 가 같은 본체를 좁혀서 씁니다)
"use client";

import OrdersView from './OrdersView';
import { ORDERS_SCOPES } from './ordersScope';

export default function OrdersPage() {
  return <OrdersView scope={ORDERS_SCOPES.all} />;
}
