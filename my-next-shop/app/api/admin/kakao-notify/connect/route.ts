// 🔗 관리자를 카카오 동의 화면으로 보냅니다. 돌아오는 곳은 ../callback 입니다.
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/apiAuth';
import { isKakaoMemoConfigured, kakaoAuthorizeUrl } from '@/lib/notifications/kakaoMemo';

export const dynamic = 'force-dynamic';

/** 돌아온 요청이 우리가 보낸 것인지 확인하는 값 (CSRF 방지) */
export const KAKAO_STATE_COOKIE = 'kakao_notify_state';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (!isKakaoMemoConfigured()) {
    return NextResponse.json({ success: false, error: 'KAKAO_CLIENT_ID 가 설정되지 않았습니다.' }, { status: 503 });
  }

  const state = randomBytes(16).toString('hex');
  const store = await cookies();
  store.set(KAKAO_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // 카카오에서 돌아오는 것은 최상위 GET 이동이라 lax 로도 쿠키가 함께 옵니다.
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  return NextResponse.redirect(kakaoAuthorizeUrl(state));
}
