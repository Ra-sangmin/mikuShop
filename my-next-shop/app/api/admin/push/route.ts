// 🔔 관리자 웹 푸시 기기 등록 · 목록 · 해제
//    발송은 lib/notifications/webPush.ts, 발송 시점은 app/api/cron/admin-order-alert 입니다.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';
import { isWebPushConfigured, vapidPublicKey } from '@/lib/notifications/webPush';

export const dynamic = 'force-dynamic';

/** 브라우저 푸시 서버 주소만 받습니다. (아무 주소나 넣어 서버가 대신 요청하게 만드는 것을 막습니다) */
const ALLOWED_PUSH_HOSTS = [
  /(^|\.)googleapis\.com$/,        // 크롬·엣지(안드로이드/PC)
  /(^|\.)push\.apple\.com$/,       // 사파리·아이폰
  /(^|\.)push\.services\.mozilla\.com$/, // 파이어폭스
  /(^|\.)notify\.windows\.com$/,   // 윈도우 엣지 일부
];

type SubscriptionBody = {
  subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  label?: unknown;
  endpoint?: unknown;
};

function validEndpoint(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 700) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    return ALLOWED_PUSH_HOSTS.some(re => re.test(url.hostname)) ? value : null;
  } catch {
    return null;
  }
}

/** 설정 상태 + 공개키 + 등록된 기기 목록 (암호화 키는 내려보내지 않습니다) */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const devices = await prisma.adminPushSubscription.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, endpoint: true, label: true, adminId: true, createdAt: true, lastSentAt: true, lastError: true, failCount: true },
  });
  return NextResponse.json({
    success: true,
    configured: isWebPushConfigured(),
    publicKey: vapidPublicKey(),
    devices,
  });
}

/** 이 기기 등록 (같은 기기면 갱신) */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!isWebPushConfigured()) {
    return NextResponse.json({ success: false, error: '서버에 VAPID 키가 없어 등록할 수 없습니다.' }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as SubscriptionBody | null;
  const endpoint = validEndpoint(body?.subscription?.endpoint);
  const p256dh = body?.subscription?.keys?.p256dh;
  const authKey = body?.subscription?.keys?.auth;
  if (!endpoint || typeof p256dh !== 'string' || typeof authKey !== 'string' || p256dh.length > 255 || authKey.length > 64) {
    return NextResponse.json({ success: false, error: '구독 정보가 올바르지 않습니다.' }, { status: 400 });
  }
  const label = typeof body?.label === 'string' ? body.label.slice(0, 120) : null;

  const device = await prisma.adminPushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh, auth: authKey, label, adminId: auth.admin.adminId },
    update: { p256dh, auth: authKey, label, adminId: auth.admin.adminId, lastError: null, failCount: 0 },
    select: { id: true },
  });
  return NextResponse.json({ success: true, id: device.id });
}

/** 기기 해제: { id } (목록에서 삭제) 또는 { endpoint } (이 기기 알림 끄기) */
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as { id?: unknown; endpoint?: unknown } | null;
  if (typeof body?.id === 'number') {
    await prisma.adminPushSubscription.deleteMany({ where: { id: body.id } });
  } else if (typeof body?.endpoint === 'string') {
    await prisma.adminPushSubscription.deleteMany({ where: { endpoint: body.endpoint } });
  } else {
    return NextResponse.json({ success: false, error: 'id 또는 endpoint 가 필요합니다.' }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
