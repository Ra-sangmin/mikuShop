// 💬 주문 상태 변경 알림 (카카오 알림톡)
//
// 이메일(orderStatusMail.ts)과 같은 규칙을 씁니다.
//  1) 보낼 상태를 화이트리스트로 고정합니다. 지금은 낙찰 성공(BID_SUCCESS) 하나뿐입니다.
//     알림톡은 건당 비용이 들고 템플릿마다 카카오 검수를 받아야 해서, 검수를 통과한 것만 켭니다.
//  2) 같은 주문의 같은 상태로는 한 번만 보냅니다. (NotificationLog 로 중복 차단)
//  3) 이메일과 달리 주문마다 한 통씩 보냅니다. 템플릿에 주문번호·상품명·금액이 들어가 묶을 수 없습니다.
//  4) 실패해도 예외를 던지지 않습니다. 알림 때문에 주문 처리가 막히면 안 됩니다.

import prisma from '@/lib/prisma';
import { ORDER_STATUS } from '@/src/types/order';
import {
  ALIMTALK_TEMPLATES,
  fillTemplate,
  normalizePhone,
  sendAlimtalk,
  isAlimtalkConfigured,
  missingSolapiEnv,
  maskPhone,
} from './alimtalk';

/**
 * 알림톡을 보내는 상태. 검수를 통과해 ALIMTALK_TEMPLATES 에 등록한 템플릿이 곧 화이트리스트입니다.
 * (예전엔 목록을 따로 들고 있어서, 템플릿을 추가하고도 여기에 안 적어 발송이 안 되는 일이 생겼습니다)
 */
const ALIMTALK_STATUSES: string[] = Object.keys(ALIMTALK_TEMPLATES);

export interface AlimtalkNotifyResult {
  sent: number;
  skipped: number;
  failed: number;
}

/** 알림톡을 보내는 상태인지 */
export function shouldSendAlimtalk(status: string): boolean {
  return ALIMTALK_STATUSES.includes(status);
}

function siteUrl(): string {
  return (process.env.NEXTAUTH_URL || 'https://mikushop.co.kr').replace(/\/+$/, '');
}

/** 알림톡 버튼이 열 주소. 주문번호를 넣으면 마이페이지가 그 주문을 골라 보여 줍니다. */
function orderDetailUrl(orderId: string): string {
  return `${siteUrl()}/mypage/status?orderId=${encodeURIComponent(orderId)}`;
}

const won = (value: number | null | undefined) => `${Number(value ?? 0).toLocaleString('ko-KR')}원`;
/** 알림톡 본문은 길이 제한이 있어 상품명이 길면 줄입니다. */
const shorten = (text: string, max = 40) => (text.length > max ? `${text.slice(0, max)}...` : text);

/**
 * 주문 상태가 바뀐 뒤 호출합니다. (이메일 발송과 나란히 부릅니다)
 * 보낼 번호는 회원 전화번호를 먼저 보고, 없으면 기본 배송지의 전화번호를 씁니다.
 */
export async function notifyOrderStatusByAlimtalk(
  changes: { orderId: string; status: string }[],
): Promise<AlimtalkNotifyResult> {
  const result: AlimtalkNotifyResult = { sent: 0, skipped: 0, failed: 0 };

  try {
    const targets = changes.filter(c => c.orderId && shouldSendAlimtalk(c.status));
    // 📋 안 왔을 때 "어느 단계에서 빠졌는지" 바로 보이도록 단계마다 이유를 남깁니다.
    console.log(`[알림톡] 상태 변경 ${changes.length}건 접수 → 발송 대상 ${targets.length}건`,
      changes.map(c => `${c.orderId}:${c.status}`).join(', ') || '(없음)');
    if (targets.length === 0) {
      console.log(`[알림톡] 알림톡을 보내는 상태가 아니라 종료합니다. (보내는 상태: ${ALIMTALK_STATUSES.join(', ')})`);
      return result;
    }

    if (!isAlimtalkConfigured()) {
      // 설정이 없으면 조용히 넘어갑니다. 이메일은 그대로 나가므로 고객이 못 받는 일은 없습니다.
      console.warn(`[알림톡] 건너뜀 ${targets.length}건 — SOLAPI 환경변수가 없습니다. 빠진 값: ${missingSolapiEnv().join(', ')}`);
      result.skipped += targets.length;
      return result;
    }

    const orders = await prisma.order.findMany({
      where: { orderId: { in: targets.map(t => t.orderId) } },
      select: {
        orderId: true,
        userId: true,
        productName: true,
        productPrice: true,
        myBidPrice: true,
        secondPaymentAmount: true,
        trackingNo: true,
        shippingCarrier: { select: { name: true } },
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            defaultAddressId: true,
            addresses: { select: { id: true, phone: true, isDefault: true } },
          },
        },
      },
    });
    const orderMap = new Map(orders.map(o => [o.orderId, o]));

    // 이미 알림톡으로 같은 상태를 보낸 주문은 제외합니다. (채널까지 봐야 메일과 따로 셉니다)
    const alreadySent = await prisma.notificationLog.findMany({
      where: {
        orderId: { in: targets.map(t => t.orderId) },
        status: { in: [...new Set(targets.map(t => t.status))] },
        channel: 'ALIMTALK',
        success: true,
      },
      select: { orderId: true, status: true },
    });
    const sentKeys = new Set(alreadySent.map(r => `${r.orderId}:${r.status}`));

    for (const target of targets) {
      const order = orderMap.get(target.orderId);
      if (!order) {
        console.warn(`[알림톡] 건너뜀 (${target.orderId}) — 주문을 찾지 못했습니다.`);
        result.skipped++; continue;
      }
      if (!order.user) {
        console.warn(`[알림톡] 건너뜀 (${target.orderId}) — 주문에 연결된 회원이 없습니다. (userId: ${order.userId})`);
        result.skipped++; continue;
      }
      if (sentKeys.has(`${target.orderId}:${target.status}`)) {
        console.log(`[알림톡] 건너뜀 (${target.orderId}) — 같은 상태로 이미 보낸 기록이 있습니다. (중복 발송 방지)`);
        result.skipped++; continue;
      }

      const phone = pickPhone(order.user);
      if (!phone) {
        // 회원 번호·배송지 번호가 모두 국내 휴대폰이 아니면 여기서 걸립니다.
        console.warn(`[알림톡] 건너뜀 (${target.orderId}) — 보낼 번호가 없습니다.`, {
          회원번호: maskPhone(order.user.phone),
          배송지수: order.user.addresses.length,
        });
        result.skipped++; continue;
      }

      const template = ALIMTALK_TEMPLATES[target.status];
      if (!template) {
        console.warn(`[알림톡] 건너뜀 (${target.orderId}) — ${target.status} 상태에 등록된 템플릿이 없습니다.`);
        result.skipped++; continue;
      }

      const variables = buildVariables(target.status, order);

      const sendResult = await sendAlimtalk({
        to: phone,
        template,
        // 대행사에는 #{변수} 형태의 키로 넘깁니다.
        variables: Object.fromEntries(Object.entries(variables).map(([k, v]) => [`#{${k}}`, v])),
        buttonUrl: orderDetailUrl(order.orderId),
      });

      if (sendResult.success) result.sent++;
      else if (sendResult.skipped) result.skipped++;
      else result.failed++;

      console.log(`[알림톡] 발송 결과 (${target.status}, ${order.orderId}) →`,
        sendResult.success ? '성공' : sendResult.skipped ? `건너뜀: ${sendResult.error}` : `실패: ${sendResult.error}`);

      // 건너뛴 건은 이력을 남기지 않습니다. 설정이 생기면 다시 보낼 수 있어야 하기 때문입니다.
      if (!sendResult.skipped) {
        await prisma.notificationLog.create({
          data: {
            userId: order.userId,
            orderId: order.orderId,
            status: target.status,
            channel: 'ALIMTALK',
            success: sendResult.success,
            error: sendResult.error ?? null,
          },
        });
      }

      if (!sendResult.success && !sendResult.skipped) {
        console.error(`[알림톡] 발송 실패 (${target.status}, ${order.orderId}):`, sendResult.error);
      }
    }
  } catch (e) {
    console.error('[알림톡] 주문 상태 알림 처리 중 오류:', e);
  }

  return result;
}

/** buildVariables 가 쓰는 주문 정보. 위 findMany 의 select 와 짝을 이룹니다. */
export type OrderForAlimtalk = {
  orderId: string;
  productName: string;
  productPrice: number;
  myBidPrice: number | null;
  secondPaymentAmount: number | null;
  trackingNo: string | null;
  shippingCarrier: { name: string } | null;
  user: { name: string } | null;
};

/**
 * 템플릿에 채워 넣을 변수. 상태마다 템플릿이 달라 필요한 값도 다릅니다.
 *
 * ⚠️ 여기 키는 카카오에 등록한 템플릿의 #{변수} 이름과 **정확히** 같아야 합니다.
 *    하나라도 다르면 솔라피가 발송을 거절하고, 사유가 [알림톡] 솔라피 응답 로그에 찍힙니다.
 *    템플릿을 고쳤다면 이 함수도 같이 고쳐야 합니다.
 */
export function buildVariables(status: string, order: OrderForAlimtalk): Record<string, string> {
  // 네 템플릿이 공통으로 쓰는 값
  const base: Record<string, string> = {
    고객명: order.user?.name || '고객',
    주문번호: order.orderId,
    상품명: shorten(order.productName || ''),
  };

  switch (status) {
    case ORDER_STATUS.BID_SUCCESS:
      return { ...base, 낙찰금액: won(order.myBidPrice || order.productPrice) };

    case ORDER_STATUS.ARRIVED: // 일본 물류센터 입고 안내
      return base;

    case ORDER_STATUS.PAYMENT_REQ: // 국제 배송 진행 안내 (배송비 승인 요청)
      return {
        ...base,
        // ⚠️ 템플릿 본문이 '#{결제금액}원' 이라 숫자만 넣습니다. won() 을 쓰면 "원" 이 두 번 붙습니다.
        //    금액은 관리자가 배송비를 요청할 때 입력하는 secondPaymentAmount 입니다.
        결제금액: Number(order.secondPaymentAmount ?? 0).toLocaleString('ko-KR'),
      };

    case ORDER_STATUS.SHIPPING: // 국제 배송 시작 안내
      return {
        ...base,
        // 송장번호·배송업체는 관리자가 국제배송으로 넘길 때 입력합니다.
        // 아직 없으면 빈칸 대신 '-' 를 넣습니다. 변수를 통째로 빼면 카카오가 자리를 못 채워 거절합니다.
        배송업체: order.shippingCarrier?.name || '-',
        송장번호: order.trackingNo?.trim() || '-',
      };

    default:
      return base;
  }
}

/** 회원 전화번호 → 기본 배송지 → 아무 배송지 순으로 찾습니다. */
function pickPhone(user: {
  phone: string | null;
  defaultAddressId: number | null;
  addresses: { id: number; phone: string; isDefault: boolean }[];
}): string | null {
  const own = normalizePhone(user.phone);
  if (own) return own;

  const preferred =
    user.addresses.find(a => a.id === user.defaultAddressId) ??
    user.addresses.find(a => a.isDefault) ??
    user.addresses[0];
  return normalizePhone(preferred?.phone);
}

/** 미리보기 — 실제로 보내지 않고 본문만 만들어 봅니다. (검수 대조·테스트용) */
export function previewAlimtalk(status: string, variables: Record<string, string>): string | null {
  const template = ALIMTALK_TEMPLATES[status];
  if (!template) return null;
  return fillTemplate(template.content, variables);
}
