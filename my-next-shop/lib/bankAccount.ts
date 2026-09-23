// 🏦 미쿠짱 입금 계좌 (무통장 입금 · 미쿠짱머니 충전)
//   홈 화면 "입금 계좌" 카드와 마이페이지 > 미쿠짱머니 충전이 이 값을 함께 씁니다.
//   계좌가 바뀌면 여기 한 곳만 고치면 됩니다.
//   ⚠️ 관리자 > 카카오톡 알림톡 관리의 "충전 전용 계좌"는 솔라피 계좌라 별개입니다 (app/admin/alimtalk/page.tsx).
export const BANK_ACCOUNT = {
  bank: '국민은행',
  number: '598001-01-282084',
  owner: '미쿠짱',
  /** 은행 아이콘 (public 기준 경로) */
  icon: '/images/bankIcon/kookmin_bank.svg',
} as const;

/** 은행 앱에 붙여넣기 편한 숫자만 */
export const BANK_ACCOUNT_DIGITS = BANK_ACCOUNT.number.replace(/[^0-9]/g, '');
