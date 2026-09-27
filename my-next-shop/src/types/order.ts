export const ORDER_TYPE = {
  DELIVERY: "DELIVERY",
  PURCHASE: "PURCHASE",
} as const;

// 상수의 값들만 뽑아서 타입으로 정의 ( "DELIVERY" | "PURCHASE" )
export type OrderType = typeof ORDER_TYPE[keyof typeof ORDER_TYPE];

export const ORDER_STATUS = {
  /** 전체 내역 */
  ALL: "ALL",
  /** 경매 요청 */
  BID_PENDING: "BID_PENDING",
  /** 경매 중 */
  BIDDING: "BIDDING",
  /** 경매 낙찰 성공 */
  BID_SUCCESS: "BID_SUCCESS",
  /** 경매 결제 완료 — 낙찰 뒤 결제까지 끝난 상태. 구매대행의 '상품 결제 완료'에 해당합니다. */
  BID_PAID: "BID_PAID",
  /**
   * 경매 실패 — 낙찰되지 못하고 끝난 경매.
   * 구매 실패(FAILED)와 나눠 둔 이유: 경매 실패는 **보증금 환불**이 따라붙고,
   * 회원에게 보내는 안내도 달라야 합니다. 한 상태로 묶어 두면 둘을 구분할 방법이 없습니다.
   */
  BID_FAILED: "BID_FAILED",
  /** 장바구니 */
  CART: "CART",
  /** 구매 실패 — 구매대행 상품을 살 수 없게 된 경우. (경매는 BID_FAILED) */
  FAILED: "FAILED",
  /** 상품 결제 완료 */
  PAID: "PAID",
  /** 입고 대기중 — 배송대행 신청 후 일본 창고에 도착(입고 완료)하기 전까지 */
  WAITING: "WAITING",
  /** 입고완료 */
  ARRIVED: "ARRIVED",
  /** 배송 준비중 */
  PREPARING: "PREPARING",
  /** 배송비 결제 대기 */
  PAYMENT_REQ: "PAYMENT_REQ",
  /** 배송비 결제 완료 */
  PAYMENT_DONE: "PAYMENT_DONE",
  /** 국제배송 */
  SHIPPING: "SHIPPING",
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

// 3. 한글 매핑 객체 (한글 -> 영문, 영문 -> 한글 모두 대응 가능)
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  [ORDER_STATUS.ALL]: "전체내역",
  [ORDER_STATUS.BID_PENDING]: "경매 요청",
  [ORDER_STATUS.BIDDING]: "경매 중",
  [ORDER_STATUS.BID_SUCCESS]: "경매 낙찰 성공",
  [ORDER_STATUS.BID_PAID]: "경매 결제 완료",
  [ORDER_STATUS.BID_FAILED]: "경매 실패",
  [ORDER_STATUS.CART]: "구매 요청",
  [ORDER_STATUS.FAILED]: "구매 실패",
  [ORDER_STATUS.PAID]: "상품 결제 완료",
  [ORDER_STATUS.WAITING]: "입고 대기중",
  [ORDER_STATUS.ARRIVED]: "입고 완료",
  [ORDER_STATUS.PREPARING]: "배송 준비중",
  [ORDER_STATUS.PAYMENT_REQ]: "배송비 결제 대기",
  [ORDER_STATUS.PAYMENT_DONE]: "배송비 결제 완료",
  [ORDER_STATUS.SHIPPING]: "국제 배송",
};

/**
 * 🌟 주문 종류까지 고려한 상태 이름.
 *    배송대행(DELIVERY)은 고객이 직접 산 상품을 창고로 보내는 서비스라,
 *    "상품 결제 완료(PAID)" 단계가 실제로는 창고 도착을 기다리는 중이므로 "입고 대기중" 으로 보여 줍니다.
 *    (지금은 배송대행 신청 시 입고 대기중(WAITING) 상태로 바로 저장합니다. 예전 주문이 남아 있을 때를 위한 처리입니다)
 */
export function orderStatusLabel(status: string, type?: string | null): string {
  if (type === 'DELIVERY' && status === ORDER_STATUS.PAID) return '입고 대기중';
  return ORDER_STATUS_LABEL[status as OrderStatus] || status;
}

export const BID_STATUS_LABEL: Record<string, string> = {
  PENDING: "입찰 대기중",
  COMPLETED: "입찰 완료",
  ADDITIONAL: "추가 입찰 완료", // 👈 여기 수정됨
};

/** 배송 물류 상태 Enum */
export const DELIVERY_STATUS = {
  /** 배송전 */
  PREPARING: "PREPARING",
  /** 배송시작 */
  SHIPPED: "SHIPPED",
  /** 국내통관중 */
  CUSTOMS: "CUSTOMS",
  /** 국내배송중 */
  LOCAL_DELIVERY: "LOCAL_DELIVERY",
  /** 배송완료 */
  COMPLETED: "COMPLETED",
} as const;

export type DeliveryStatus = typeof DELIVERY_STATUS[keyof typeof DELIVERY_STATUS];

/** 배송 상태 한글 매핑 */
export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  [DELIVERY_STATUS.PREPARING]: "배송전",
  [DELIVERY_STATUS.SHIPPED]: "배송시작",
  [DELIVERY_STATUS.CUSTOMS]: "국내통관중",
  [DELIVERY_STATUS.LOCAL_DELIVERY]: "국내배송중",
  [DELIVERY_STATUS.COMPLETED]: "배송완료",
};
/**
 * 🔧 "관리자 처리 필요" 상태 — 관리자가 확인해야 다음 단계로 넘어가는 주문입니다.
 *
 * 세 곳이 같은 목록을 봐야 어긋나지 않습니다.
 *   · 주문 관리 화면의 '관리자 처리 필요' 묶음 (app/admin/orders/OrdersView.tsx)
 *   · 왼쪽 메뉴의 건수 뱃지 (app/api/admin/orders/today-count)
 *   · 카카오 "나에게 보내기" 알림 (app/api/cron/admin-order-alert)
 * 예전에는 각자 배열을 들고 있어, 한 곳만 고치면 숫자와 알림이 달라졌습니다.
 */
export const ADMIN_ATTENTION_STATUSES: OrderStatus[] = [
  ORDER_STATUS.BIDDING,      // 경매 중
  ORDER_STATUS.BID_FAILED,   // 경매 실패
  ORDER_STATUS.FAILED,       // 구매 실패
  ORDER_STATUS.PAID,         // 상품 결제 완료
  ORDER_STATUS.BID_PAID,     // 경매 결제 완료 (낙찰 자동 결제 포함)
  ORDER_STATUS.WAITING,      // 입고 대기중
  ORDER_STATUS.PREPARING,    // 배송 준비중
  ORDER_STATUS.PAYMENT_DONE, // 배송비 결제 완료
];

/**
 * 🚫 끝난(실패) 상태.
 *
 * 경매 실패와 구매 실패는 회원에게 다르게 안내해야 해서 따로 두지만,
 * "진행 중이 아니다" 를 판단할 때는 늘 함께 다뤄야 합니다.
 * 한쪽만 빼먹으면 끝난 주문이 처리 중 목록에 계속 남습니다.
 */
export const FAILED_STATUSES: OrderStatus[] = [ORDER_STATUS.BID_FAILED, ORDER_STATUS.FAILED];

/**
 * 🔨 경매 대행 주문인지.
 *
 * 주문 종류(OrderType)에는 경매가 없습니다. 경매도 DB 에서는 구매대행(PURCHASE)으로 저장되고,
 * 입찰 정보로만 구분됩니다. 그래서 화면에서 "경매" 로 묶어 보여 주려면 이 판별이 필요합니다.
 *
 * 판별 기준(하나라도 해당하면 경매):
 *   · 내 입찰가 · 보증금 · 경매 마감일 — 경매 요청할 때 채워지고, 낙찰 뒤에도 남습니다.
 *   · 지금 상태가 경매 단계 — 관리자가 상태만 경매로 바꾼 주문까지 잡습니다.
 *
 * 낙찰 뒤에는 상태가 구매대행과 같아지므로(결제 완료 → 입고 → 배송) 위쪽 세 값이 유일한 표식입니다.
 */
export function isAuctionOrder(order: {
  status?: string | null;
  myBidPrice?: number | null;
  depositAmount?: number | null;
  auctionEndDate?: string | Date | null;
}): boolean {
  if (order?.myBidPrice != null) return true;
  if (Number(order?.depositAmount) > 0) return true;
  if (order?.auctionEndDate) return true;
  const s = order?.status ?? '';
  return s === ORDER_STATUS.BID_PENDING || s === ORDER_STATUS.BIDDING
    || s === ORDER_STATUS.BID_SUCCESS || s === ORDER_STATUS.BID_PAID;
}
