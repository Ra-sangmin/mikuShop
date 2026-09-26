// 🔔 테스트 알림 — { endpoint } 를 주면 그 기기에만, 없으면 등록된 모든 기기로 보냅니다.
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { sendAdminPush } from '@/lib/notifications/webPush';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : undefined;

  const time = new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' });
  const result = await sendAdminPush(
    {
      title: '🔔 미쿠짱 테스트 알림',
      body: `${time} · 이 알림이 보이면 주문 알림도 이 기기로 옵니다.`,
      url: '/admin/alimtalk',
      tag: 'admin-push-test',
    },
    endpoint,
  );
  return NextResponse.json({ success: true, ...result });
}
