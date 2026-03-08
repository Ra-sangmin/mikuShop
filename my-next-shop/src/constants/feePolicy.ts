// src/constants/feePolicy.ts

export const FEE_POLICY = {
  TRANSFER: 120, // 송금 수수료 (DB 대신 여기서 일괄 관리)
  AGENCY: 100,   // 대행 수수료
  DOMESTIC_SHIPPING: 0, // 일본 내 기본 배송료
  EXCHANGE_RATE: 9.5,   // 기본 적용 환율
};

// 필요한 경우 계산 로직도 공용 함수로 뺄 수 있습니다.
export const calculateTotalJpy = (productPrice: number) => {
  return productPrice + FEE_POLICY.TRANSFER + FEE_POLICY.AGENCY + FEE_POLICY.DOMESTIC_SHIPPING;
};