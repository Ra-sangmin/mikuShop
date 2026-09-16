import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/adminSession';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
