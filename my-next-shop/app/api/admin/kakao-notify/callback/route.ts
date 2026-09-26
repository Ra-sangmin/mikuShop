// 🔗 카카오 동의 화면에서 돌아오는 곳. 받은 code 를 토큰으로 바꿔 저장합니다.
//    ⚠️ 이 주소를 카카오 개발자 콘솔의 Redirect URI 에 그대로 등록해야 합니다.
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';
import { clearAccessTokenCache, exchangeCodeForToken, fetchKakaoUserId } from '@/lib/notifications/kakaoMemo';
import { KAKAO_STATE_COOKIE } from '../connect/route';

export const dynamic = 'force-dynamic';

/** 결과를 알림톡 관리 화면에 알려 주며 돌아갑니다. */
function back(message: string, ok: boolean) {
  const url = new URL('/admin/alimtalk', process.env.NEXTAUTH_URL || 'http://localhost:3000');
  url.searchParams.set(ok ? 'kakaoConnected' : 'kakaoError', message);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  // 🔒 관리자 세션이 있어야 합니다. (카카오에서 돌아오는 최상위 이동이라 쿠키가 함께 옵니다)
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // 동의 화면에서 취소를 누른 경우
  if (error) return back(searchParams.get('error_description') || error, false);
  if (!code) return back('카카오에서 인증 코드를 받지 못했습니다.', false);

  const store = await cookies();
  const expected = store.get(KAKAO_STATE_COOKIE)?.value;
  store.delete(KAKAO_STATE_COOKIE);
  if (!expected || expected !== state) {
    return back('요청이 올바르지 않습니다. 연결을 다시 시도해 주세요.', false);
  }

  try {
    const token = await exchangeCodeForToken(code);
    if (!token.refresh_token) {
      // 리프레시 토큰이 없으면 12시간 뒤 끊깁니다. 그대로 저장하면 조용히 죽습니다.
      return back('카카오가 갱신용 토큰을 주지 않았습니다. 동의항목 설정을 확인해 주세요.', false);
    }
    const kakaoUserId = await fetchKakaoUserId(token.access_token);

    // 연결은 한 줄만 둡니다. 다시 연결하면 이전 것을 대체합니다.
    await prisma.$transaction(async (tx) => {
      await tx.adminKakaoNotify.deleteMany({});
      await tx.adminKakaoNotify.create({
        data: {
          kakaoUserId,
          refreshToken: token.refresh_token!,
          enabled: true,
          // 🌟 연결한 순간부터 알립니다. 이전에 쌓여 있던 건까지 한꺼번에 오면 놀라니까요.
          notifiedUntil: new Date(),
        },
      });
    });
    clearAccessTokenCache();

    return back('카카오 알림이 연결되었습니다.', true);
  } catch (e: any) {
    console.error('[카카오 알림] 연결 실패:', e);
    return back(e?.message || '카카오 연결에 실패했습니다.', false);
  }
}
