// 🔔 관리자 처리 필요 주문 알림 — 실제 발송 로직 (실시간 + 크론 공용)
//
// 언제 도나
//   · 실시간: 주문 상태를 바꾸는 API(관리자 주문 저장, 회원 주문 생성·변경, 추가 입찰)가
//             응답을 보낸 직후 triggerAdminOrderAlert() 로 바로 돌립니다. → 1~2초 안에 알림
//   · 안전망: 30초 크론(app/api/cron/admin-order-alert)도 그대로 둡니다.
//             새로 생긴 경로에서 trigger 를 빠뜨려도 늦어도 30초 안에는 알립니다.
//
// 무엇을 보내나
//   "지난번 알린 뒤 ~ 지금" 사이에 관리자 처리 상태(ADMIN_ATTENTION_STATUSES)로 바뀐 주문을
//   한 통으로 묶어 웹 푸시(휴대폰·PC)와 카카오 "나에게 보내기"(연결했을 때만)로 보냅니다.
//
// 중복 방지
//   실시간 호출과 크론이 동시에 돌 수 있어, 구간을 "먼저 차지한 쪽"만 보냅니다.
//   admin_notify_state.notified_until 을 조건부로 옮기고(이전 값과 같을 때만), 옮기는 데 성공한 쪽만
//   그 구간을 알립니다. 보내기에 모두 실패하면 기준 시각을 되돌려 다음 회차가 다시 시도합니다.
import { after } from 'next/server';
import prisma from '@/lib/prisma';
import { ADMIN_ATTENTION_STATUSES } from '@/src/types/order';
import { getConnection, sendKakaoMemo, type MemoResult } from '@/lib/notifications/kakaoMemo';
import { isWebPushConfigured, sendAdminPush, type PushResult } from '@/lib/notifications/webPush';
import { ADMIN_ORDERS_URL, buildAdminOrderAlert } from '@/lib/notifications/adminOrderAlert';

export type AdminAlertRun = {
  count?: number;
  sent?: boolean;
  skipped?: string;
  push?: PushResult;
  kakao?: MemoResult;
};

/** 같은 서버 프로세스 안에서는 한 번에 하나씩만 돌립니다. (연달아 저장해도 순서대로) */
let chain: Promise<unknown> = Promise.resolve();

export function runAdminOrderAlert(source: 'realtime' | 'cron'): Promise<AdminAlertRun> {
  const run = chain.then(() => runOnce(source));
  chain = run.catch(() => {});
  return run;
}

async function runOnce(source: 'realtime' | 'cron'): Promise<AdminAlertRun> {
  const conn = await getConnection();
  const kakaoOn = Boolean(conn?.enabled);
  const pushOn = isWebPushConfigured() && (await prisma.adminPushSubscription.count()) > 0;

  // 🌟 "여기까지 알림" 기준 시각. 처음 한 번은 카카오 연결 줄의 값(없으면 지금)으로 시작합니다.
  //    now 를 먼저 고정해 두어야, 조회하는 동안 바뀐 주문이 다음 회차에서 빠지지 않습니다.
  const now = new Date();
  const state = await prisma.adminNotifyState.upsert({
    where: { id: 1 },
    create: { id: 1, notifiedUntil: conn?.notifiedUntil ?? now },
    update: {},
  });
  const from = state.notifiedUntil;
  if (from >= now) return { count: 0 };

  // 🔒 구간 차지: 이전 값 그대로일 때만 now 로 옮깁니다. 다른 실행이 먼저 옮겼으면 그쪽이 보냅니다.
  const claimed = await prisma.adminNotifyState.updateMany({
    where: { id: 1, notifiedUntil: from },
    data: { notifiedUntil: now },
  });
  if (claimed.count === 0) return { skipped: '다른 실행이 이미 처리 중' };

  // 카카오 패널의 "여기까지 알림" 표시도 같이 맞춥니다.
  const syncKakaoPanel = () =>
    conn ? prisma.adminKakaoNotify.update({ where: { id: conn.id }, data: { notifiedUntil: now } }).catch(() => {}) : null;

  // 받을 곳이 하나도 없으면 기준만 옮기고 끝냅니다. (나중에 연결했을 때 옛 주문이 한꺼번에 쏟아지지 않게)
  if (!kakaoOn && !pushOn) {
    await syncKakaoPanel();
    return { skipped: '알림을 받을 곳(웹 푸시 기기·카카오)이 없습니다.' };
  }

  const orders = await prisma.order.findMany({
    where: {
      // 앱 상수(문자열)와 Prisma enum 타입이 달라 타입만 맞춰 줍니다. 값은 같습니다.
      status: { in: ADMIN_ATTENTION_STATUSES as never },
      OR: [
        { statusChangedAt: { gt: from, lte: now } },
        // 🕒 이 기능이 생기기 전에 만들어진 주문은 statusChangedAt 이 비어 있습니다. 그런 건은 등록 시각으로 판단합니다.
        { AND: [{ statusChangedAt: null }, { registeredAt: { gt: from, lte: now } }] },
      ],
    },
    select: {
      orderId: true,
      status: true,
      productName: true,
      statusChangedAt: true,
      registeredAt: true,
      user: { select: { name: true } },
    },
    orderBy: [{ statusChangedAt: 'asc' }, { registeredAt: 'asc' }],
  });

  if (orders.length === 0) {
    await syncKakaoPanel();
    return { count: 0 };
  }

  const text = buildAdminOrderAlert(orders);
  // 웹 푸시는 첫 줄을 제목, 나머지를 본문으로 씁니다.
  const [title, ...rest] = text.split('\n');

  const [kakao, push] = await Promise.all([
    kakaoOn
      ? sendKakaoMemo(text, { url: ADMIN_ORDERS_URL, buttonTitle: '주문 관리 열기' })
      : Promise.resolve<MemoResult>({ sent: false, skipped: '카카오 미연결/꺼짐' }),
    pushOn
      ? sendAdminPush({ title, body: rest.filter(Boolean).join('\n'), url: '/admin/orders', tag: 'admin-order-alert' })
      : Promise.resolve<PushResult>({ sent: false, sentCount: 0, failed: 0, removed: 0, skipped: '웹 푸시 기기 없음' }),
  ]);

  const sent = kakao.sent || push.sent;
  if (sent) {
    await syncKakaoPanel();
  } else {
    // ⚠️ 어느 쪽으로도 못 보냈으면 기준 시각을 되돌립니다. (그 사이 다른 실행이 옮기지 않았을 때만)
    //    되돌리지 않으면 이 주문들은 영영 알리지 못합니다.
    await prisma.adminNotifyState.updateMany({ where: { id: 1, notifiedUntil: now }, data: { notifiedUntil: from } });
  }

  console.log(`[관리자 알림:${source === 'realtime' ? '실시간' : '크론'}]`, {
    건수: orders.length,
    웹푸시: push.sent ? `${push.sentCount}대` : push.skipped || `실패 ${push.failed}대`,
    카카오: kakao.sent ? '발송' : kakao.error || kakao.skipped,
  });
  return { count: orders.length, sent, push, kakao };
}

/**
 * 주문 상태를 바꾼 API 에서 호출합니다. 응답을 먼저 보내고(손님·관리자는 기다리지 않음) 바로 알림을 돌립니다.
 * 실패해도 조용히 로그만 남깁니다 — 30초 크론이 다시 잡습니다.
 */
export function triggerAdminOrderAlert(): void {
  const job = () =>
    runAdminOrderAlert('realtime').catch(e => console.error('[관리자 알림:실시간] 실패:', (e as Error).message));
  try {
    after(job);
  } catch {
    // 요청 밖(스크립트 등)에서 불리면 after 를 쓸 수 없어 바로 돌립니다.
    void job();
  }
}
