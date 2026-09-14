// 🌟 구매대행(장바구니) 결제 예상 금액에 쓰이는 결제수수료·대행수수료 계산식입니다.
// purchase/quote(PurchaseFormContainer, 견적 미리보기)와 mypage/status(장바구니·낙찰성공
// 탭, 실제 청구액)가 각자 다른 공식을 들고 있어서 견적에서 본 금액과 실제 청구액이
// 어긋나는 문제가 있었습니다. 두 화면 모두 이 함수를 그대로 가져다 씁니다.
//
// 🌟 구간 기준값(30000/220/330, 4/300/100)은 DB(order_fee_rules 테이블)에서 관리합니다.
// 이 파일은 "use client" 컴포넌트에서 그대로 가져다 쓰고 있어 Prisma를 직접 쓸 수 없으므로,
// 각 화면이 /api/order-fee-rules로 값을 받아와 rule 인자로 넘겨줍니다. rule을 생략하면
// DB 시드값과 동일한 기본값(DEFAULT_PAYMENT_FEE_RULE/DEFAULT_AGENCY_FEE_RULE)을 씁니다.
export type OrderFeeRule = {
  thresholdValue: number;
  belowThresholdFee: number;
  atOrAboveThresholdAmount: number;
};

export const DEFAULT_PAYMENT_FEE_RULE: OrderFeeRule = { thresholdValue: 30000, belowThresholdFee: 220, atOrAboveThresholdAmount: 330 };
export const DEFAULT_AGENCY_FEE_RULE: OrderFeeRule = { thresholdValue: 4, belowThresholdFee: 300, atOrAboveThresholdAmount: 100 };

/** 상품 1건(가격 합계 기준) 결제수수료: 기준 미만이면 belowThresholdFee, 이상이면 atOrAboveThresholdAmount(고정 금액) */
export function calculateTieredPaymentFee(productPriceTotal: number, rule: OrderFeeRule = DEFAULT_PAYMENT_FEE_RULE): number {
  if (productPriceTotal <= 0) return 0;
  return productPriceTotal < rule.thresholdValue ? rule.belowThresholdFee : rule.atOrAboveThresholdAmount;
}

/** 상품 1건의 수량 기준 대행수수료: 기준 미만이면 belowThresholdFee(고정), 이상이면 수량 × atOrAboveThresholdAmount(수량당 단가) */
export function calculateTieredAgencyFee(quantity: number, rule: OrderFeeRule = DEFAULT_AGENCY_FEE_RULE): number {
  if (quantity <= 0) return 0;
  return quantity < rule.thresholdValue ? rule.belowThresholdFee : quantity * rule.atOrAboveThresholdAmount;
}
