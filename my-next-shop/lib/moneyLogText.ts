// 💰 미쿠짱머니 이용 내역(마이페이지 > 미쿠짱머니 > 이용 내역) 문구
//
//   화면에는 이미 [충전 / 사용 / 환불] 뱃지 · 금액 · 변경 후 잔액이 함께 나옵니다.
//   그래서 문구에는 "무엇 때문에" 만 짧게 남기고, 금액·잔액·처리자는 넣지 않습니다.
//   형식: <무슨 일> · <덧붙이는 한 가지>   (덧붙일 게 없으면 앞부분만)

/** 덧붙일 말이 있을 때만 ' · ' 로 잇습니다. */
const join = (main: string, extra?: string | null) => (extra && extra.trim() ? `${main} · ${extra.trim()}` : main);

/** 상품명처럼 긴 값은 뒤를 줄입니다. */
export const shortenTitle = (value: string, max = 20) => {
  const text = (value || '').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

export const moneyLogText = {
  /** 무통장 입금 충전 승인 — "무통장 입금 · 입금자 홍길동" */
  bankCharge: (depositor?: string | null) => join('무통장 입금', depositor ? `입금자 ${depositor}` : ''),
  /** 카드 결제 충전 — "카드 결제 충전" */
  cardCharge: () => '카드 결제 충전',
  /** 계좌 환불 승인 — "계좌 환불 · 국민은행" */
  refund: (bankName?: string | null) => join('계좌 환불', bankName || ''),
  /** 관리자 잔액 조정 — "관리자 조정 · 이벤트 지급" */
  adminAdjust: (reason?: string | null) => join('관리자 조정', reason || ''),
  /** 주문 결제 — "상품 결제 · 3건" 등 (화면에서 만든 제목을 그대로 씁니다) */
  orderPayment: (title?: string | null) => (title && title.trim() ? title.trim() : '주문 결제'),
  /** 경매 보증금 — "경매 보증금 · 상품명…" */
  bidDeposit: (productName?: string | null) =>
    join('경매 보증금', productName ? shortenTitle(productName) : ''),
};
