// 💴 배송비 청구 내역(order_shipping_fees)을 다루는 공용 규칙.
//
// 한 주문에 청구가 여러 번 붙을 수 있습니다.
//   round 1 : 배송 준비중 → 배송비 요청 으로 넘길 때 관리자가 넣는 국제 + 현지 + 추가
//   round 2~: 배송비 결제 완료 뒤에 비용이 더 생겼을 때 관리자가 넣는 추가 결제 금액
//
// ⭐ 청구액은 언제나 "아직 결제되지 않은(paidAt === null) 회차들의 합" 입니다.
//    이미 낸 회차가 다시 청구되지 않는 근거가 이 한 줄이라, 화면마다 따로 계산하지 않고
//    관리자·마이페이지·알림이 모두 여기를 통해서만 금액을 구합니다.

export type ShippingFeeRow = {
  id?: number;
  round: number;
  intlFeeJpy: number;
  intlFeeKrw: number;
  domesticFeeJpy: number;
  domesticFeeKrw: number;
  extraFeeKrw: number;
  appliedExchangeRate: number;
  memo?: string | null;
  paidAt?: Date | string | null;
};

/** 아직 결제되지 않은 회차들. 보통 0개 또는 1개입니다. */
export const unpaidRows = <T extends { paidAt?: Date | string | null }>(fees: T[] | null | undefined): T[] =>
  (fees ?? []).filter(f => !f.paidAt);

/** 지금 고객에게 청구 중인 회차. 없으면 null. (한 번에 한 회차만 청구합니다) */
export const currentUnpaid = <T extends { paidAt?: Date | string | null; round: number }>(
  fees: T[] | null | undefined,
): T | null => {
  const rows = unpaidRows(fees);
  if (rows.length === 0) return null;
  // 혹시 여러 개가 있으면 가장 이른 회차를 씁니다.
  return rows.reduce((a, b) => (a.round <= b.round ? a : b));
};

/** 금액 계산에 꼭 필요한 부분만. (호출하는 쪽마다 select 범위가 달라서 좀게 잡습니다) */
export type BillableRow = Pick<ShippingFeeRow, 'intlFeeKrw' | 'domesticFeeKrw' | 'extraFeeKrw'> & {
  paidAt?: Date | string | null;
};

/** 한 회차의 청구액 = 국제 + 현지 + 추가 (전부 원화) */
export const rowTotal = (f: Pick<ShippingFeeRow, 'intlFeeKrw' | 'domesticFeeKrw' | 'extraFeeKrw'>) =>
  (f.intlFeeKrw || 0) + (f.domesticFeeKrw || 0) + (f.extraFeeKrw || 0);

/** 지금 내야 할 금액 = 미납 회차들의 합 */
export const unpaidTotal = (fees: BillableRow[] | null | undefined) =>
  unpaidRows(fees).reduce((sum, f) => sum + rowTotal(f), 0);

/** 이미 낸 금액의 합 (이력 표시용) */
export const paidTotal = (fees: BillableRow[] | null | undefined) =>
  (fees ?? []).filter(f => f.paidAt).reduce((sum, f) => sum + rowTotal(f), 0);

/** 다음 청구 회차 번호 */
export const nextRound = (fees: { round: number }[] | null | undefined) =>
  (fees ?? []).reduce((max, f) => Math.max(max, f.round), 0) + 1;

/** 관리자 화면·API 가 주고받는 회차 필드 이름 (upsert 대상 판별에 씁니다) */
export const FEE_FIELDS = [
  'intlFeeJpy', 'intlFeeKrw', 'domesticFeeJpy', 'domesticFeeKrw',
  'extraFeeKrw', 'appliedExchangeRate', 'memo',
] as const;
