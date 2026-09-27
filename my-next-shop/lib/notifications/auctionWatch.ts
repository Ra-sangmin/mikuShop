// ⏰ 경매 감시 — 놓치면 돌이킬 수 없는 두 가지를 관리자에게 알립니다.
//
//   ① 마감 임박: 곧 끝나는데 아직 입찰하지 않았거나 더 올릴지 판단해야 하는 건
//   ② 한도 도달: 지금 경매가가 회원이 적어 낸 한도까지 올라온 건 (더는 이길 수 없음)
//
// 왜 자동 입찰이 아니라 알림인가
//   야후는 자동화 접근을 막고 있고, 걸리면 대행에 쓰는 계정이 정지됩니다.
//   그러면 진행 중인 모든 경매가 같이 죽습니다. 그래서 '사람이 누르되 때를 놓치지 않게'
//   돕는 쪽으로 만들었습니다.
//
// 중복 방지
//   같은 주문·같은 사유로는 한 번만 보냅니다. (NotificationLog 에 기록)
//   30초마다 도는 크론이라 기록이 없으면 같은 알림이 계속 쏟아집니다.
import prisma from '@/lib/prisma';
import { ORDER_STATUS } from '@/src/types/order';
import { fetchLiveAuctionPrice } from '@/lib/auctionPrice';
import { isWebPushConfigured, sendAdminPush } from '@/lib/notifications/webPush';

/** 마감 몇 분 전에 알릴지 */
const ENDING_SOON_MINUTES = 10;
/** 한도 도달 확인은 곧 끝나는 건만 봅니다. (경매 페이지를 읽어야 해서 무겁습니다) */
const OUTBID_WATCH_HOURS = 24;
/** 한 번에 확인할 최대 건수. 크롤링이 몰리지 않게 막습니다. */
const OUTBID_MAX_PER_RUN = 10;

/** 알림 사유 — NotificationLog.status 에 넣어 중복을 막습니다. */
const REASON = { ending: 'AUCTION_ENDING', outbid: 'AUCTION_OUTBID' } as const;

const ADMIN_BIDDING_URL = '/admin/orders?tab=BIDDING';

type WatchOrder = {
  orderId: string;
  userId: number;
  productName: string;
  myBidPrice: number | null;
  auctionEndDate: Date | null;
  productId: string | null;
  productUrl: string | null;
};

/** 이미 같은 사유로 알린 주문은 빼고 돌려줍니다. */
async function unnotified(orders: WatchOrder[], reason: string): Promise<WatchOrder[]> {
  if (orders.length === 0) return [];
  const sent = await prisma.notificationLog.findMany({
    where: { orderId: { in: orders.map(o => o.orderId) }, status: reason },
    select: { orderId: true },
  });
  const done = new Set(sent.map(s => s.orderId));
  return orders.filter(o => !done.has(o.orderId));
}

/** 알린 사실을 남깁니다. (다음 회차에 또 보내지 않도록) */
async function markNotified(orders: WatchOrder[], reason: string) {
  if (orders.length === 0) return;
  await prisma.notificationLog.createMany({
    data: orders.map(o => ({ userId: o.userId, orderId: o.orderId, status: reason, channel: 'PUSH', success: true })),
  });
}

const shorten = (v: string | null, max = 18) => {
  const t = (v ?? '').trim().replace(/\s+/g, ' ');
  return t.length > max ? `${t.slice(0, max)}…` : (t || '상품');
};

export type AuctionWatchResult = { ending: number; outbid: number; checked: number; skipped?: string };

export async function runAuctionWatch(): Promise<AuctionWatchResult> {
  // 받을 기기가 없으면 경매 페이지를 읽을 이유도 없습니다.
  const pushOn = isWebPushConfigured() && (await prisma.adminPushSubscription.count()) > 0;
  if (!pushOn) return { ending: 0, outbid: 0, checked: 0, skipped: '웹 푸시 기기 없음' };

  const now = new Date();
  const orders = await prisma.order.findMany({
    where: { status: ORDER_STATUS.BIDDING as never, auctionEndDate: { gt: now } },
    select: {
      orderId: true, userId: true, productName: true, myBidPrice: true,
      auctionEndDate: true, productId: true, productUrl: true,
    },
    orderBy: { auctionEndDate: 'asc' },
  }) as WatchOrder[];

  /* ── ① 마감 임박 — 경매 페이지를 읽지 않아도 됩니다 ── */
  const endingLimit = new Date(now.getTime() + ENDING_SOON_MINUTES * 60_000);
  const ending = await unnotified(
    orders.filter(o => o.auctionEndDate && o.auctionEndDate <= endingLimit),
    REASON.ending,
  );

  if (ending.length > 0) {
    const first = ending[0];
    const minutesLeft = first.auctionEndDate
      ? Math.max(0, Math.round((first.auctionEndDate.getTime() - now.getTime()) / 60_000))
      : ENDING_SOON_MINUTES;
    const title = `⏰ 경매 마감 ${minutesLeft}분 전 · ${ending.length}건`;
    const body = ending
      .slice(0, 3)
      .map(o => `${shorten(o.productName)} · 한도 ¥${Number(o.myBidPrice || 0).toLocaleString()}`)
      .join('\n') + (ending.length > 3 ? `\n외 ${ending.length - 3}건` : '');
    const res = await sendAdminPush({ title, body, url: ADMIN_BIDDING_URL, tag: 'auction-ending' });
    if (res.sent) await markNotified(ending, REASON.ending);
    console.log('[경매 감시] 마감 임박', { 건수: ending.length, 발송: res.sent });
  }

  /* ── ② 한도 도달 — 경매 페이지를 읽어야 해서 곧 끝나는 건만 봅니다 ── */
  const watchLimit = new Date(now.getTime() + OUTBID_WATCH_HOURS * 3600_000);
  const candidates = (await unnotified(
    orders.filter(o => o.myBidPrice && o.auctionEndDate && o.auctionEndDate <= watchLimit),
    REASON.outbid,
  )).slice(0, OUTBID_MAX_PER_RUN);

  const reached: { order: WatchOrder; price: number }[] = [];
  for (const o of candidates) {
    const live = await fetchLiveAuctionPrice(o.productId, o.productUrl, 8000);
    // 못 읽으면 그냥 넘어갑니다. 다음 회차에 다시 봅니다.
    if (live.ok && live.price >= Number(o.myBidPrice)) reached.push({ order: o, price: live.price });
  }

  if (reached.length > 0) {
    const title = `📈 입찰 한도 도달 · ${reached.length}건`;
    const body = reached
      .slice(0, 3)
      .map(r => `${shorten(r.order.productName)} · 지금 ¥${r.price.toLocaleString()} / 한도 ¥${Number(r.order.myBidPrice || 0).toLocaleString()}`)
      .join('\n') + (reached.length > 3 ? `\n외 ${reached.length - 3}건` : '');
    const res = await sendAdminPush({ title, body, url: ADMIN_BIDDING_URL, tag: 'auction-outbid' });
    if (res.sent) await markNotified(reached.map(r => r.order), REASON.outbid);
    console.log('[경매 감시] 한도 도달', { 건수: reached.length, 발송: res.sent });
  }

  return { ending: ending.length, outbid: reached.length, checked: candidates.length };
}
