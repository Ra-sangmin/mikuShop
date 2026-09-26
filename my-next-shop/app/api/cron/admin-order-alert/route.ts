// 🔔 관리자 처리가 필요한 주문이 새로 생기면 카카오톡 "나에게 보내기"로 알립니다.
//
// 왜 크론인가
//   주문이 "관리자 처리 필요" 상태로 넘어오는 길은 여러 곳입니다. 관리자가 직접 바꾸기도 하고,
//   고객이 결제하거나 배송대행을 신청해서 넘어오기도 합니다. 각 지점에 발송을 심으면 한 곳만
//   빠뜨려도 조용히 안 오고, 고객이 장바구니에 5개를 담으면 5통이 갑니다.
//   여기서는 orders.status_changed_at 을 기준으로 "지난번 알린 뒤에 바뀐 것"만 모아
//   한 통으로 보냅니다. 새 경로가 생겨도 자동으로 잡힙니다.
//
// 인증은 환율·AI 검색 정리 크론과 같은 CRON_SECRET 을 씁니다.
// 호출 (서버 crontab, 5분마다)
//   */5 * * * * curl -fsS -H "x-cron-secret: <CRON_SECRET>" https://mikushop.co.kr/api/cron/admin-order-alert
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ADMIN_ATTENTION_STATUSES } from '@/src/types/order';
import { getConnection, sendKakaoMemo } from '@/lib/notifications/kakaoMemo';
import { ADMIN_ORDERS_URL, buildAdminOrderAlert } from '@/lib/notifications/adminOrderAlert';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[관리자 알림크론] CRON_SECRET 이 설정되지 않아 거절합니다.');
    return NextResponse.json({ error: 'CRON_SECRET 미설정' }, { status: 503 });
  }
  const provided = request.headers.get('x-cron-secret') ?? new URL(request.url).searchParams.get('secret');
  if (provided !== secret) {
    console.warn('[관리자 알림크론] 비밀값이 맞지 않아 거절했습니다.');
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });
  }

  try {
    const conn = await getConnection();
    if (!conn) return NextResponse.json({ success: true, skipped: '카카오 알림이 연결되지 않았습니다.' });
    if (!conn.enabled) return NextResponse.json({ success: true, skipped: '알림이 꺼져 있습니다.' });

    // 🌟 "지난번 알린 뒤 ~ 지금" 사이에 관리자 처리 상태로 바뀐 주문만 봅니다.
    //    now 를 먼저 고정해 두어야, 조회하는 동안 바뀐 주문이 다음 회차에서 빠지지 않습니다.
    const now = new Date();
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ADMIN_ATTENTION_STATUSES as any },
        statusChangedAt: { gt: conn.notifiedUntil, lte: now },
      },
      select: {
        orderId: true,
        status: true,
        productName: true,
        statusChangedAt: true,
        user: { select: { name: true } },
      },
      orderBy: { statusChangedAt: 'asc' },
    });

    if (orders.length === 0) {
      // 알릴 게 없어도 기준 시각은 옮깁니다. (다음 회차가 같은 구간을 다시 훑지 않도록)
      await prisma.adminKakaoNotify.update({ where: { id: conn.id }, data: { notifiedUntil: now } });
      return NextResponse.json({ success: true, count: 0 });
    }

    const text = buildAdminOrderAlert(orders);

    const result = await sendKakaoMemo(text, { url: ADMIN_ORDERS_URL, buttonTitle: '주문 관리 열기' });

    // ⚠️ 보내지 못했으면 기준 시각을 옮기지 않습니다. 옮기면 그 건들은 영영 안 알립니다.
    //    (연결이 끊긴 동안 쌓였다가, 다시 연결하면 그때부터 알립니다)
    if (result.sent) {
      await prisma.adminKakaoNotify.update({ where: { id: conn.id }, data: { notifiedUntil: now } });
    }

    console.log('[관리자 알림크론]', { 건수: orders.length, 발송: result.sent, 사유: result.error || result.skipped });
    return NextResponse.json({ success: true, count: orders.length, sent: result.sent, error: result.error, skipped: result.skipped });
  } catch (error: any) {
    console.error('[관리자 알림크론] 실패:', error);
    return NextResponse.json({ success: false, error: error?.message || '알 수 없는 오류' }, { status: 500 });
  }
}
