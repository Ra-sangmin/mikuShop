// 📦 입고 완료 · 배송 준비 — 일본 창고에 들어온 뒤 국제 발송 전까지만 봅니다.
//
// 주문 관리(/admin/orders)와 **같은 화면**입니다. 보이는 단계만 네 개로 좁혔습니다.
// 여기서 상태를 바꾸면 주문 관리에도 그대로 반영됩니다. (같은 데이터, 다른 창)
"use client";

import OrdersView from '../orders/OrdersView';
import { ORDERS_SCOPES } from '../orders/ordersScope';

export default function WarehousePage() {
  return <OrdersView scope={ORDERS_SCOPES.warehouse} />;
}
