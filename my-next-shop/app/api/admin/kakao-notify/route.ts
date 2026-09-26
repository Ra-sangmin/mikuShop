// 🔔 관리자 카카오 알림 연결 상태 조회 · 켜고 끄기 · 연결 해제
//    실제 발송은 lib/notifications/kakaoMemo.ts, 발송 시점은 app/api/cron/admin-order-alert 입니다.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';
import { clearAccessTokenCache, getConnection, isKakaoMemoConfigured, kakaoRedirectUri } from '@/lib/notifications/kakaoMemo';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const conn = await getConnection();
  return NextResponse.json({
    success: true,
    configured: isKakaoMemoConfigured(),
    // 🔒 리프레시 토큰은 내려보내지 않습니다. 화면에 필요한 값만 줍니다.
    connection: conn && {
      enabled: conn.enabled,
      kakaoUserId: conn.kakaoUserId,
      connectedAt: conn.connectedAt,
      lastSentAt: conn.lastSentAt,
      lastError: conn.lastError,
      notifiedUntil: conn.notifiedUntil,
    },
    redirectUri: kakaoRedirectUri(),
  });
}

/** 잠시 끄기 / 다시 켜기 */
export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { enabled } = await request.json().catch(() => ({}));
  if (typeof enabled !== 'boolean') {
    return NextResponse.json({ success: false, error: 'enabled 값이 필요합니다.' }, { status: 400 });
  }

  const conn = await getConnection();
  if (!conn) return NextResponse.json({ success: false, error: '연결된 카카오 계정이 없습니다.' }, { status: 404 });

  await prisma.adminKakaoNotify.update({ where: { id: conn.id }, data: { enabled } });
  return NextResponse.json({ success: true, enabled });
}

/** 연결 해제 */
export async function DELETE() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  await prisma.adminKakaoNotify.deleteMany({});
  clearAccessTokenCache();
  return NextResponse.json({ success: true });
}
