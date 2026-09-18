// 📱 휴대폰 번호 정리 (users.phone 에 저장할 때는 항상 이 함수를 거칩니다)
//
// 입력이 들어오는 곳마다 형태가 제각각입니다.
//   - 일반 회원가입 폼: "010-1234-5678" 또는 "01012345678"
//   - 네이버 프로필:    "010-1234-5678" (mobile) / "+821012345678" (mobile_e164)
//   - 카카오 프로필:    "+82 10-1234-5678"
// 저장 값은 마이페이지·주문서와 같은 모양(010-1234-5678)으로 통일합니다.

/** 숫자만 남기고 국제 표기(+82)를 국내 표기로 되돌립니다. 국내 휴대폰이 아니면 null. */
export function normalizeKoreanMobile(raw: string | null | undefined): string | null {
  const digits = String(raw ?? '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  // 821012345678 → 01012345678
  const local = digits.startsWith('82') && digits.length >= 11 ? `0${digits.slice(2)}` : digits;
  return /^01[016789][0-9]{7,8}$/.test(local) ? local : null;
}

/** 저장용 형태(010-1234-5678)로 바꿔 줍니다. 국내 휴대폰이 아니면 null. */
export function formatKoreanMobile(raw: string | null | undefined): string | null {
  const digits = normalizeKoreanMobile(raw);
  if (!digits) return null;
  return digits.length === 11
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
