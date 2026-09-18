// 🔐 로그인 후 원래 보려던 주소로 돌아가기 위한 공용 헬퍼 (브라우저에서만 씁니다)
//
// 로그인이 필요한 화면은 `router.push(loginUrlWithReturn())` 로 보냅니다.
// 그러면 /auth/login?callbackUrl=<원래 주소> 로 이동하고, 로그인 페이지가 그 주소로 돌려보냅니다.

export const LOGIN_PATH = '/auth/login';
export const CALLBACK_PARAM = 'callbackUrl';

/**
 * 돌아갈 주소로 써도 되는 값인지 확인합니다.
 * 같은 사이트 안의 경로(`/mypage/status?...`)만 허용하고, 그 밖의 값은 홈(`/`)으로 되돌립니다.
 * (`//evil.com` 이나 `https://evil.com` 같은 값을 그대로 쓰면 외부로 튕겨 보내는 통로가 됩니다)
 */
export function safeReturnPath(raw: string | null | undefined): string {
  // 🐛 브라우저는 주소에서 탭·줄바꿈을 지우고 해석합니다. 그래서 "/<탭>/evil.com" 은 "//evil.com" 이 되어
  //    외부로 나가는 통로가 됩니다. 검사 전에 먼저 지워서 브라우저가 볼 값과 같게 맞춥니다.
  const value = (raw ?? '').replace(/[\t\n\r]/g, '').trim();
  if (!value) return '/';
  if (!value.startsWith('/')) return '/';       // 절대 URL·상대 경로 모두 거부
  if (value.startsWith('//') || value.startsWith('/\\')) return '/'; // 프로토콜 생략형 외부 주소
  if (value.startsWith(LOGIN_PATH)) return '/'; // 로그인 페이지로 되돌아오는 고리 방지
  return value;
}

/** 지금 보고 있는 주소(쿼리 포함). 서버 렌더링 중이면 빈 값. */
function currentPath(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.pathname}${window.location.search}`;
}

/**
 * 로그인 페이지 주소를 만듭니다. 돌아갈 주소를 함께 담습니다.
 * @param returnTo 생략하면 지금 보고 있는 주소를 씁니다.
 */
export function loginUrlWithReturn(returnTo?: string): string {
  const target = safeReturnPath(returnTo ?? currentPath());
  if (target === '/') return LOGIN_PATH; // 홈으로 갈 거면 굳이 파라미터를 붙이지 않습니다
  return `${LOGIN_PATH}?${CALLBACK_PARAM}=${encodeURIComponent(target)}`;
}

/** 로그인 페이지가 "로그인 뒤 갈 곳"을 읽습니다. 값이 없거나 수상하면 홈. */
export function readReturnPath(): string {
  if (typeof window === 'undefined') return '/';
  try {
    return safeReturnPath(new URLSearchParams(window.location.search).get(CALLBACK_PARAM));
  } catch {
    return '/';
  }
}
