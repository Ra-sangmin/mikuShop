// 🔨 경매 입찰 보증금 규칙
//
// 규칙은 한 줄입니다 — **입찰가의 10%, 다만 최소 20,000원.**
//
// 💰 보증금은 **원화로 셉니다.** 회원이 실제로 카드로 내는 돈이 원화입니다.
//    예전에는 엔으로 정해 두고(2,000엔) 그 숫자를 원화에서 빼서, ¥2,000 보증금이
//    2,000원만 빠지는 문제가 있었습니다. 기준 자체를 원화로 옮겨 그 혼선을 없앱니다.
//
// 화면 네 곳(경매 상세·마이페이지 두 곳·관리자)과 서버가 각자 이 식을 들고 있었습니다.
// 한 곳만 고치면 회원에게 보이는 금액과 실제로 빠지는 금액이 달라지므로 여기로 모읍니다.

/** 입찰가 대비 보증금 비율 */
export const DEPOSIT_RATE = 0.1;
/** 보증금 최소 금액 (원) */
export const DEPOSIT_MIN_KRW = 20000;

/** 화면에 그대로 쓰는 규칙 설명. 라벨과 안내 문구가 어긋나지 않게 여기서 가져다 씁니다. */
export const DEPOSIT_RULE_TEXT = `입찰가의 ${DEPOSIT_RATE * 100}% · 최소 ${DEPOSIT_MIN_KRW.toLocaleString()}원`;

/** 다른 결제 금액과 같은 규칙으로 100원 단위 올림 */
const ceil100 = (won: number) => Math.ceil(Math.round(won) / 100) * 100;

/**
 * 입찰가(엔)와 환율로 보증금(원)을 구합니다.
 *
 * 환율이 아직 없으면 0 을 돌려줍니다. (화면이 "환율 확인 중"을 보여 줄 수 있게)
 */
export function calcDepositKrw(bidJpy: number, exchangeRate: number): number {
  const bid = Number(bidJpy) || 0;
  const rate = Number(exchangeRate) || 0;
  if (bid <= 0 || rate <= 0) return 0;
  return Math.max(DEPOSIT_MIN_KRW, ceil100(bid * DEPOSIT_RATE * rate));
}

/**
 * 최소 금액이 적용됐는지. (10% 가 최소액보다 작아서 20,000원이 된 경우)
 * 회원이 "10% 라더니 왜 이 금액이지?" 하고 헷갈리지 않도록 화면에서 표시합니다.
 */
export function isDepositAtMinimum(bidJpy: number, exchangeRate: number): boolean {
  const bid = Number(bidJpy) || 0;
  const rate = Number(exchangeRate) || 0;
  if (bid <= 0 || rate <= 0) return false;
  return ceil100(bid * DEPOSIT_RATE * rate) < DEPOSIT_MIN_KRW;
}
