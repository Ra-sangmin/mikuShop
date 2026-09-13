// 🌟 구매대행(장바구니) 결제 예상 금액에 쓰이는 결제수수료·대행수수료 계산식입니다.
// purchase/quote(PurchaseFormContainer, 견적 미리보기)와 mypage/status(장바구니·낙찰성공
// 탭, 실제 청구액)가 각자 다른 공식을 들고 있어서 견적에서 본 금액과 실제 청구액이
// 어긋나는 문제가 있었습니다. 두 화면 모두 이 함수를 그대로 가져다 씁니다.

/** 상품 1건(가격 합계 기준) 결제수수료: 3만엔 미만이면 220엔, 3만엔 이상이면 330엔 */
export function calculateTieredPaymentFee(productPriceTotal: number): number {
  if (productPriceTotal <= 0) return 0;
  return productPriceTotal < 30000 ? 220 : 330;
}

/** 상품 1건의 수량 기준 대행수수료: 4개 미만이면 정액 300엔, 4개 이상이면 수량당 100엔 */
export function calculateTieredAgencyFee(quantity: number): number {
  if (quantity <= 0) return 0;
  return quantity < 4 ? 300 : quantity * 100;
}
