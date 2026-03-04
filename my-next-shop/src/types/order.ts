export const ORDER_TYPE = {
  DELIVERY: "DELIVERY",
  PURCHASE: "PURCHASE",
} as const;

// 상수의 값들만 뽑아서 타입으로 정의 ( "DELIVERY" | "PURCHASE" )
export type OrderType = typeof ORDER_TYPE[keyof typeof ORDER_TYPE];

export const ORDER_STATUS = {
  /** 전체 내역 */
  ALL: "ALL",
  /** 장바구니 */
  CART: "CART",
  /** 구매실패 */
  FAILED: "FAILED",
  /** 상품 결제 완료 */
  PAID: "PAID",
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
  [ORDER_STATUS.CART]: "장바구니",
  [ORDER_STATUS.FAILED]: "구매실패",
  [ORDER_STATUS.PAID]: "상품 결제 완료",
  [ORDER_STATUS.ARRIVED]: "입고완료",
  [ORDER_STATUS.PREPARING]: "배송 준비중",
  [ORDER_STATUS.PAYMENT_REQ]: "배송비 요청",
  [ORDER_STATUS.PAYMENT_DONE]: "배송비 결제 완료",
  [ORDER_STATUS.SHIPPING]: "국제배송",
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