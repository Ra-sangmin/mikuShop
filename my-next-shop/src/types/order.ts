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
  /** 경매 상황 */
  BIDDING: "BIDDING",
  /** 경매 낙찰 성공 */
  BID_SUCCESS: "BID_SUCCESS",
  /** 장바구니 */
  CART: "CART",
  /** 구매실패 */
  FAILED: "FAILED",
  /** 상품 결제 완료 */
  PAID: "PAID",
  /** 입고 대기중 — 배송대행 신청 후 일본 창고에 도착(입고 완료)하기 전까지 */
  WAITING: "WAITING",
  /** 입고완료 */
  ARRIVED: "ARRIVED",
  /** 배송 준비중 */
  PREPARING: "PREPARING",
  /** 배송비 요청 */
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
  [ORDER_STATUS.BIDDING]: "경매 상황",
  [ORDER_STATUS.BID_SUCCESS]: "경매 낙찰 성공",
  [ORDER_STATUS.CART]: "구매 요청",
  [ORDER_STATUS.FAILED]: "경매/구매 실패",
  [ORDER_STATUS.PAID]: "상품 결제 완료",
  [ORDER_STATUS.WAITING]: "입고 대기중",
  [ORDER_STATUS.ARRIVED]: "입고 완료",
  [ORDER_STATUS.PREPARING]: "배송 준비중",
  [ORDER_STATUS.PAYMENT_REQ]: "배송비 요청",
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