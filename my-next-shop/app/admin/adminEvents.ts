// 🔔 관리자 화면끼리 주고받는 브라우저 이벤트 이름
//   주문 상태를 바꾸면 왼쪽 메뉴(AdminSidebar)의 '주문 관리' 옆 숫자를 바로 다시 세게 합니다.
//   (숫자는 1분마다도 스스로 갱신하지만, 처리 직후에는 기다리지 않고 바로 반영되도록 합니다)
export const ADMIN_ORDERS_CHANGED_EVENT = 'miku:admin-orders-changed';

/** 주문을 저장·처리한 뒤 호출합니다. (브라우저에서만 동작) */
export const notifyAdminOrdersChanged = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ADMIN_ORDERS_CHANGED_EVENT));
};
