// 🔔 관리자 처리가 필요한 주문 알림 — 30초 크론 (안전망)
//    실제 발송 로직은 lib/notifications/adminOrderAlertRunner.ts 에 있습니다.
//    주문 상태를 바꾸는 API 들이 저장 직후 같은 로직을 바로 돌리므로(실시간), 이 크론은
//    그 호출을 빠뜨린 경로나 실패한 발송을 늦어도 30초 안에 다시 잡는 역할입니다.
//    둘이 동시에 돌아도 구간을 먼저 차지한 쪽만 보내 중복 알림은 나가지 않습니다.
//
// 왜 크론인가
//   주문이 "관리자 처리 필요" 상태로 넘어오는 길은 여러 곳입니다. 관리자가 직접 바꾸기도 하고,
//   고객이 결제하거나 배송대행을 신청해서 넘어오기도 합니다. 각 지점에 발송을 심으면 한 곳만
//   빠뜨려도 조용히 안 오고, 고객이 장바구니에 5개를 담으면 5통이 갑니다.
//   여기서는 orders.status_changed_at 을 기준으로 "지난번 알린 뒤에 바뀐 것"만 모아
//   한 통으로 보냅니다. 새 경로가 생겨도 자동으로 잡힙니다.
//
// 인증은 환율·AI 검색 정리 크론과 같은 CRON_SECRET 을 씁니다.
//
// 호출 주기는 **30초**입니다. cron 은 1분이 최소 단위라 두 줄로 나눠 씁니다.
//   * * * * * ~/bin/admin-order-alert.sh
//   * * * * * sleep 30; ~/bin/admin-order-alert.sh
// 스크립트는 .env 에서 비밀값을 읽고 flock 으로 겹쳐 도는 것을 막습니다.
//
// ⚠️ 주기를 바꿔도 코드는 고칠 게 없습니다. "지난번 알린 뒤 ~ 지금"으로 자르기 때문에
//    주기가 짧아지면 한 통에 담기는 건수가 줄 뿐, 빠지거나 겹치지 않습니다.
import { NextResponse } from 'next/server';
import { runAdminOrderAlert } from '@/lib/notifications/adminOrderAlertRunner';

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
    const result = await runAdminOrderAlert('cron');
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[관리자 알림크론] 실패:', error);
    return NextResponse.json({ success: false, error: (error as Error)?.message || '알 수 없는 오류' }, { status: 500 });
  }
}
