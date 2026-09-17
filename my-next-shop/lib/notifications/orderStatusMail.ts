// 🔔 주문 상태 변경 알림 (이메일)
//
// 설계 의도
//  1) 보낼 상태를 화이트리스트(NOTIFY_STATUSES)로 고정합니다.
//     특히 BIDDING(경매 상황)은 입찰 경쟁 중 수시로 바뀌기 때문에 알림 대상에서 뺐습니다.
//     이걸 보내기 시작하면 경매 한 건에 수십 통이 나가고, 정작 중요한 "배송비 결제 요청"이 묻힙니다.
//  2) 같은 주문의 같은 상태로는 평생 한 번만 보냅니다. (NotificationLog 로 중복 차단)
//     관리자가 상태를 되돌렸다가 다시 바꾸는 일이 실제로 잦습니다.
//  3) 관리자가 여러 주문을 한 번에 같은 상태로 바꾸면 회원당 한 통으로 묶어 보냅니다.
//     (입고 일괄 처리 시 고객 한 명에게 10통이 가는 것을 막습니다)
//
// 나중에 알림톡을 붙일 때는 이 파일의 sendMail 호출 부분에 채널 분기만 추가하면 됩니다.
// 호출하는 쪽(주문 상태 변경 API)은 notifyOrderStatusChanged 만 알면 됩니다.

import prisma from '@/lib/prisma';
import { sendMail, isDeliverableEmail } from '@/lib/mailer';
import { ORDER_STATUS } from '@/src/types/order';

/** 같은 회원·같은 상태로 이 시간 안에 이미 보냈으면 건너뜁니다. 0이면 사용하지 않습니다.
 *  이메일은 발송 비용이 없어 기본값을 0(비활성)으로 둡니다. 쿨다운을 켜면 폭탄은 막히지만
 *  그 사이에 바뀐 다른 주문의 알림이 유실되기 때문입니다. 중복 차단 + 묶음 발송으로 충분합니다.
 *  건당 비용이 붙는 알림톡을 붙일 때 값을 올려 쓰면 됩니다. */
const COOLDOWN_MS = 0;

type StatusTemplate = {
  /** 메일 제목 (여러 건이면 뒤에 "외 N건"이 붙습니다) */
  subject: string;
  /** 본문 상단 큰 제목 */
  heading: string;
  /** 본문 안내 문구 */
  message: string;
  /** 버튼 문구 */
  ctaLabel: string;
  /** 고객이 바로 행동해야 하는 알림인지 (제목에 강조가 붙습니다) */
  urgent?: boolean;
};

// 🌟 알림을 보낼 상태 목록. 여기에 없는 상태는 메일이 나가지 않습니다.
//    제외: BIDDING(경매 상황 - 수시 변동), PREPARING(배송 준비중 - 내부 진행 상태)
const NOTIFY_STATUSES: Partial<Record<string, StatusTemplate>> = {
  [ORDER_STATUS.CART]: {
    subject: '구매대행 신청이 접수되었습니다',
    heading: '구매대행 신청이 접수되었습니다',
    message: '신청해 주신 상품의 구매를 준비하고 있습니다. 진행 상황은 마이페이지에서 확인하실 수 있습니다.',
    ctaLabel: '주문 내역 확인하기',
  },
  [ORDER_STATUS.BID_PENDING]: {
    subject: '경매 대행 신청이 접수되었습니다',
    heading: '경매 대행 신청이 접수되었습니다',
    message: '입찰을 준비하고 있습니다. 경매 진행 상황은 마이페이지에서 실시간으로 확인하실 수 있습니다.',
    ctaLabel: '경매 상황 보기',
  },
  [ORDER_STATUS.BID_SUCCESS]: {
    subject: '낙찰되었습니다',
    heading: '축하합니다, 낙찰되었습니다!',
    message: '입찰하신 상품이 낙찰되었습니다. 결제를 진행해 주시면 상품 구매를 시작합니다.',
    ctaLabel: '결제 진행하기',
    urgent: true,
  },
  [ORDER_STATUS.FAILED]: {
    subject: '낙찰·구매가 성사되지 않았습니다',
    heading: '아쉽게도 성사되지 않았습니다',
    message: '입찰 또는 구매가 완료되지 못했습니다. 결제하신 금액이 있다면 미쿠짱머니로 환급됩니다. 다른 상품으로 다시 시도해 보세요.',
    ctaLabel: '주문 내역 확인하기',
  },
  [ORDER_STATUS.PAID]: {
    subject: '상품 결제가 완료되었습니다',
    heading: '상품 결제가 완료되었습니다',
    message: '일본 현지에서 상품 구매를 진행합니다. 상품이 일본 창고에 도착하면 다시 안내드리겠습니다.',
    ctaLabel: '주문 내역 확인하기',
  },
  [ORDER_STATUS.ARRIVED]: {
    subject: '상품이 일본 창고에 입고되었습니다',
    heading: '상품이 일본 창고에 도착했습니다',
    message: '여러 상품을 함께 보내시면 국제배송비를 아낄 수 있습니다. 묶음배송을 원하시면 배송 요청 전에 마이페이지에서 설정해 주세요.',
    ctaLabel: '입고 상품 확인하기',
  },
  [ORDER_STATUS.PAYMENT_REQ]: {
    subject: '국제배송비 결제를 요청드립니다',
    heading: '국제배송비 결제가 필요합니다',
    message: '결제가 확인되면 한국으로 발송을 시작합니다. 결제 전까지는 일본 창고에 보관됩니다.',
    ctaLabel: '배송비 결제하기',
    urgent: true,
  },
  [ORDER_STATUS.PAYMENT_DONE]: {
    subject: '배송비 결제가 완료되었습니다',
    heading: '배송비 결제가 완료되었습니다',
    message: '곧 한국으로 발송됩니다. 발송이 시작되면 송장번호와 함께 다시 안내드리겠습니다.',
    ctaLabel: '주문 내역 확인하기',
  },
  [ORDER_STATUS.SHIPPING]: {
    subject: '국제배송이 시작되었습니다',
    heading: '한국으로 발송되었습니다',
    message: '통관 절차를 거쳐 등록하신 주소로 배송됩니다. 통관 상황에 따라 수령까지 며칠이 더 걸릴 수 있습니다.',
    ctaLabel: '배송 조회하기',
  },
};

/** 알림을 보내는 상태인지 (다른 모듈에서도 판단할 수 있게 열어둡니다) */
export function shouldNotify(status: string): boolean {
  return Boolean(NOTIFY_STATUSES[status]);
}

export interface OrderStatusChange {
  /** orders.order_id (주문번호 문자열) */
  orderId: string;
  /** 변경된 주문 상태 */
  status: string;
}

export interface NotifyResult {
  sent: number;
  skipped: number;
  failed: number;
}

/**
 * 주문 상태가 바뀐 뒤 호출합니다.
 * 🌟 실패해도 예외를 던지지 않습니다. 알림 때문에 주문 처리가 실패하면 안 되기 때문입니다.
 */
export async function notifyOrderStatusChanged(changes: OrderStatusChange[]): Promise<NotifyResult> {
  const result: NotifyResult = { sent: 0, skipped: 0, failed: 0 };

  try {
    // 1) 알림 대상 상태만 남깁니다
    const targets = changes.filter(c => c.orderId && shouldNotify(c.status));
    if (targets.length === 0) return result;

    // 2) 주문과 회원 정보를 한 번에 읽어옵니다
    const orders = await prisma.order.findMany({
      where: { orderId: { in: targets.map(t => t.orderId) } },
      select: {
        orderId: true,
        userId: true,
        productName: true,
        trackingNo: true,
        secondPaymentAmount: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    const orderMap = new Map(orders.map(o => [o.orderId, o]));

    // 3) 이미 같은 상태로 보낸 주문은 제외합니다 (관리자가 상태를 되돌렸다 다시 바꾼 경우)
    const alreadySent = await prisma.notificationLog.findMany({
      where: {
        orderId: { in: targets.map(t => t.orderId) },
        status: { in: [...new Set(targets.map(t => t.status))] },
        success: true,
      },
      select: { orderId: true, status: true },
    });
    const sentKeys = new Set(alreadySent.map(r => `${r.orderId}:${r.status}`));

    // 4) 회원 + 상태 단위로 묶습니다 (일괄 처리 시 한 통으로)
    type Group = { userId: number; status: string; email: string; name: string; orders: typeof orders };
    const groups = new Map<string, Group>();

    for (const target of targets) {
      const order = orderMap.get(target.orderId);
      if (!order || !order.user) { result.skipped++; continue; }
      if (sentKeys.has(`${target.orderId}:${target.status}`)) { result.skipped++; continue; }

      // 이메일 동의를 하지 않은 SNS 회원(@mikuchan.local)은 보낼 곳이 없습니다
      if (!isDeliverableEmail(order.user.email)) { result.skipped++; continue; }

      const key = `${order.userId}:${target.status}`;
      const group = groups.get(key) ?? {
        userId: order.userId,
        status: target.status,
        email: order.user.email as string,
        name: order.user.name || '고객',
        orders: [] as typeof orders,
      };
      group.orders.push(order);
      groups.set(key, group);
    }

    // 5) 묶음별로 한 통씩 발송
    for (const group of groups.values()) {
      if (COOLDOWN_MS > 0) {
        const recent = await prisma.notificationLog.findFirst({
          where: {
            userId: group.userId,
            status: group.status,
            success: true,
            createdAt: { gte: new Date(Date.now() - COOLDOWN_MS) },
          },
          select: { id: true },
        });
        if (recent) { result.skipped += group.orders.length; continue; }
      }

      const { subject, html } = buildOrderStatusEmail({
        status: group.status,
        name: group.name,
        orders: group.orders,
      })!;

      const sendResult = await sendMail({ to: group.email, subject, html });

      if (sendResult.success) result.sent++;
      else result.failed++;

      // 6) 발송 이력 기록 — 주문 단위로 남겨야 중복 차단이 정확해집니다
      await prisma.notificationLog.createMany({
        data: group.orders.map(o => ({
          userId: group.userId,
          orderId: o.orderId,
          status: group.status,
          channel: 'EMAIL',
          success: sendResult.success,
          error: sendResult.error ?? null,
        })),
      });

      if (!sendResult.success) {
        console.error(`[알림] 메일 발송 실패 (${group.status}):`, sendResult.error);
      }
    }
  } catch (e) {
    // 알림 실패가 주문 처리를 막지 않도록 여기서 삼킵니다
    console.error('[알림] 주문 상태 알림 처리 중 오류:', e);
  }

  return result;
}

// ---------------------------------------------------------------- 메일 본문

function siteUrl(): string {
  return (process.env.NEXTAUTH_URL || 'https://mikushop.co.kr').replace(/\/+$/, '');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface OrderSummaryForMail {
  orderId: string;
  productName: string;
  trackingNo: string | null;
  secondPaymentAmount: number | null;
}

/**
 * 상태별 메일 제목·본문을 만듭니다.
 * 발송 로직과 분리해 두어, 관리자 미리보기나 테스트에서 그대로 재사용할 수 있습니다.
 * 알림 대상이 아닌 상태면 null 을 돌려줍니다.
 */
export function buildOrderStatusEmail({
  status, name, orders,
}: {
  status: string;
  name: string;
  orders: OrderSummaryForMail[];
}): { subject: string; html: string } | null {
  const template = NOTIFY_STATUSES[status];
  if (!template) return null;

  const count = orders.length;
  const subject = count > 1
    ? `[미쿠짱] ${template.subject} (외 ${count - 1}건)`
    : `[미쿠짱] ${template.subject}`;

  return { subject, html: buildHtml({ template, name, status, orders }) };
}

function buildHtml({
  template, name, status, orders,
}: {
  template: StatusTemplate;
  name: string;
  status: string;
  orders: { orderId: string; productName: string; trackingNo: string | null; secondPaymentAmount: number | null }[];
}): string {
  const link = `${siteUrl()}/mypage/status?tab=${encodeURIComponent(status)}`;

  const rows = orders.map(o => {
    const extras: string[] = [];
    if (status === ORDER_STATUS.SHIPPING && o.trackingNo) {
      extras.push(`송장번호 ${escapeHtml(o.trackingNo)}`);
    }
    if (status === ORDER_STATUS.PAYMENT_REQ && o.secondPaymentAmount) {
      extras.push(`결제 요청 금액 ${o.secondPaymentAmount.toLocaleString()}원`);
    }
    return `
      <tr>
        <td style="padding:12px 14px;border-bottom:1px solid #eef0f4;">
          <div style="font-size:14px;font-weight:700;color:#1f2937;">${escapeHtml(o.productName || '상품')}</div>
          <div style="margin-top:4px;font-size:12px;color:#8b93a4;">주문번호 ${escapeHtml(o.orderId)}${
            extras.length ? ' · ' + extras.map(escapeHtml).join(' · ') : ''
          }</div>
        </td>
      </tr>`;
  }).join('');

  return `<!doctype html>
<html lang="ko">
<body style="margin:0;padding:24px 12px;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic','맑은 고딕',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
    <tr>
      <td style="padding:24px 24px 18px;background:#1b1d24;">
        <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;color:#f0b2b7;">MIKUCHAN</div>
        <div style="margin-top:6px;font-size:20px;font-weight:900;color:#ffffff;">${escapeHtml(template.heading)}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:22px 24px 6px;">
        <p style="margin:0 0 14px;font-size:15px;color:#1f2937;"><b>${escapeHtml(name)}</b>님, 안녕하세요.</p>
        <p style="margin:0;font-size:14px;line-height:1.7;color:#4b5563;">${escapeHtml(template.message)}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:18px 24px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef0f4;border-radius:12px;">
          ${rows}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:22px 24px 26px;" align="center">
        <a href="${link}" style="display:inline-block;padding:13px 26px;border-radius:999px;background:${
          template.urgent ? '#d8515f' : '#1b1d24'
        };color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;">${escapeHtml(template.ctaLabel)}</a>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px 22px;background:#fafbfc;font-size:11.5px;line-height:1.7;color:#9aa1b1;">
        본 메일은 회원님의 주문 진행 상황을 안내하기 위해 발송된 정보성 메일입니다.<br />
        문의는 <a href="${siteUrl()}/inquiry/kakaotalk" style="color:#8b93a4;">카카오톡 상담</a>을 이용해 주세요.
      </td>
    </tr>
  </table>
</body>
</html>`;
}
