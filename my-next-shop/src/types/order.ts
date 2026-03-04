export const ORDER_TYPE = {
  DELIVERY: "DELIVERY",
  PURCHASE: "PURCHASE",
} as const;

// 상수의 값들만 뽑아서 타입으로 정의 ( "DELIVERY" | "PURCHASE" )
export type OrderType = typeof ORDER_TYPE[keyof typeof ORDER_TYPE];