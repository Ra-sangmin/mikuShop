import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/adminSession';

/**
 * 🤖 Server Action 을 흉내 낸 스캐너 요청인지 봅니다.
 *
 * 외부 봇이 `POST /` 에 `Next-Action: x` 같은 가짜 헤더와 FormData 가 아닌 본문을
 * 던지고 있습니다. Next 는 이미 404 로 돌려보내지만, 돌려보내기 전에 오류를 두 줄 찍습니다.
 *   Error: The Server Reference ID did not match the expected format. Received "x".
 *   TypeError: Failed to parse body as FormData.
 * 기능 장애는 아니지만 로그가 묻혀 진짜 오류를 놓치게 됩니다.
 *
 * 판별 기준은 **Next 자신이 쓰는 것과 같습니다.** next-server 런타임에 이렇게 들어 있습니다.
 *   function rI(e) { return 42 === e.length }
 * 이 길이면 "Failed to find Server Action"(E974), 아니면 위의 E1442 가 납니다.
 * 실제 빌드 매니페스트의 액션 ID 도 42자였습니다.
 *   4059de6b0c6ac64ca5670621804460752a4706cc76
 *
 * ⚠️ 그래서 길이만 봅니다. 16진수 여부까지 확인하고 싶어지지만, Next 가 나중에 다른 표기를
 *    쓰면 정상 액션을 막게 됩니다. Next 의 기준을 그대로 따라가는 편이 안전합니다.
 *
 * 응답은 Next 가 주던 것과 같은 404 로 맞춥니다. 밖에서 보이는 동작은 달라지지 않고,
 * 로그만 조용해집니다.
 */
function isMalformedServerAction(request: NextRequest): boolean {
  const actionId = request.headers.get('next-action');
  return actionId !== null && actionId.length !== 42;
}

export async function proxy(request: NextRequest) {
  // 형식이 깨진 Server Action 은 Next 가 본문을 열어보기 전에 돌려보냅니다.
  if (isMalformedServerAction(request)) {
    return new NextResponse('Server action not found.', {
      status: 404,
      headers: { 'content-type': 'text/plain' },
    });
  }

  const { pathname } = request.nextUrl;

  // 아래는 관리자 인증입니다. 그 외 경로는 여기서 끝냅니다.
  // (위의 검사를 모든 경로에 걸기 위해 matcher 를 넓혔기 때문에 필요한 분기입니다)
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  // 로그인 화면과 로그인/로그아웃 API는 세션 없이 접근 가능
  if (pathname === '/admin/login' || pathname === '/api/admin/login' || pathname === '/api/admin/logout') {
    return NextResponse.next();
  }

  // 🔒 쿠키가 "있는지"가 아니라, 서버가 서명한 유효한 토큰인지 검증합니다.
  const admin = await verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (admin) return NextResponse.next();

  // 관리자 API는 JSON 401 응답 (각 라우트에서도 한 번 더 확인합니다)
  if (pathname.startsWith('/api/admin')) {
    return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  }

  // 🌟 원래 가려던 경로를 redirect 쿼리로 넘겨서, 로그인 완료 후 그 페이지로 바로 돌아갈 수 있게 합니다.
  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
  const response = NextResponse.redirect(loginUrl);
  // 위조되었거나 만료된 쿠키는 지워둡니다.
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}

export const config = {
  // Server Action 은 페이지 주소로 POST 되므로 관리자 경로만 봐서는 위의 검사를 걸 수 없습니다.
  // 그래서 전체를 보되, 정적 파일과 업로드된 이미지는 제외해 불필요한 실행을 줄입니다.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/|uploads/).*)'],
};
