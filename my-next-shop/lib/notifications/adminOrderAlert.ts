// 🔔 "관리자 처리 필요" 알림 문구를 만듭니다.
//    라우트에서 떼어 둔 이유는 문구만 따로 확인할 수 있게 하기 위해서입니다.
//    (카카오로 실제 보내 보지 않고도 제목·건수·줄바꿈을 눈으로 볼 수 있습니다)
import { ORDER_STATUS_LABEL } from '@/src/types/order';

export const ADMIN_ORDERS_URL = 'https://mikushop.co.kr/admin/orders';

/** 제목에 쓰는 상품명 길이. 카카오 본문이 200자까지라 제목이 다 먹으면 안 됩니다. */
const TITLE_MAX = 24;

/** 상품명이 길면 줄입니다. */
export const shortenName = (value: string | null | undefined, max = TITLE_MAX) => {
  const text = (value || '').trim().replace(/\s+/g, ' ');
  if (!text) return '상품';
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

export type AlertOrder = {
  status: string;
  productName: string | null;
  user?: { name: string | null } | null;
};

/**
 * 여러 건이 한꺼번에 들어와도 **한 통**으로 묶습니다.
 * 제목은 "첫 상품명 외 N건" 입니다. (한 건이면 상품명만)
 */
export function buildAdminOrderAlert(orders: AlertOrder[]): string {
  const first = orders[0];
  const headline = orders.length > 1
    ? `${shortenName(first?.productName)} 외 ${orders.length - 1}건`
    : shortenName(first?.productName, 40);

  // 상태별 건수 — 어느 탭을 열어야 하는지 바로 알 수 있게 합니다.
  const byStatus = new Map<string, number>();
  orders.forEach(o => byStatus.set(o.status, (byStatus.get(o.status) || 0) + 1));
  const statusLines = [...byStatus.entries()]
    .map(([status, n]) => `· ${(ORDER_STATUS_LABEL as any)[status] || status} ${n}건`)
    .join('\n');

  const who = first?.user?.name ? `${first.user.name}님` : '회원';

  return [
    `🔧 관리자 처리 필요 ${orders.length}건`,
    '',
    `${who} · ${headline}`,
    '',
    statusLines,
  ].join('\n');
}
