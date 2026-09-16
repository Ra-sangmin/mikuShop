import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/adminSession';

export async function POST() {
  const response = NextResponse.json({ success: true });
  // 관리자 세션 쿠키 삭제
  response.cookies.set(ADMIN_SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
