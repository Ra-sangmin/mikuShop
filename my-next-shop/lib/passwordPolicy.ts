// 🔒 비밀번호 최소 요건. 회원가입과 비밀번호 변경이 같은 기준을 쓰도록 한 곳에 모읍니다.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt는 72바이트를 넘는 부분을 무시합니다.

/**
 * @returns 문제가 없으면 null, 있으면 사용자에게 보여줄 메시지
 */
export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length === 0) {
    return '비밀번호를 입력해주세요.';
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`;
  }
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_LENGTH) {
    return `비밀번호가 너무 깁니다. (${PASSWORD_MAX_LENGTH}바이트 이하)`;
  }
  // 영문/숫자/기호 중 최소 2종류 이상 섞이도록 요구합니다.
  const kinds = [/[a-zA-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(re => re.test(password)).length;
  if (kinds < 2) {
    return '비밀번호는 영문, 숫자, 특수문자 중 두 가지 이상을 포함해야 합니다.';
  }
  return null;
}
