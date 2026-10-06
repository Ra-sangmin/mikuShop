// 💳 결제 금액 — 서버가 주문으로부터 직접 계산합니다.
//
// ⚠️ 화면이 보낸 금액은 쓰지 않습니다. 예전 미쿠짱머니 결제는 화면이 계산한 금액(deductAmount)을
//    그대로 빼서, 0 을 보내면 돈을 내지 않고 결제 완료가 됐습니다.
//
// 계산식은 마이페이지 결제 카드(app/mypage/status/page.tsx 의 totals)와 같습니다.
// 둘이 어긋나면 회원이 본 금액과 결제창 금액이 달라지므로, 식을 바꿀 때는 두 곳을 같이 고칩니다.
//   PRODUCT    (상품가 + 결제 수수료 + 일본내 배송료 + 대행 수수료) 합계 × 환율 → 100원 올림
//   BID_SETTLE 위와 같은 합계에서 이미 낸 보증금(depositKrw)을 뺀 금액
//   DEPOSIT    주문마다 (입찰가 기준 보증금 − 이미 낸 보증금)
//   SHIPPING   주문마다 미납 배송비 회차의 합 (이미 원화)
import prisma from '@/lib/prisma';
import { ORDER_STATUS } from '@/src/types/order';
import { currentExchangeRate } from '@/lib/bidSettlement';
import { calcDepositKrw } from '@/src/utils/auctionDeposit';
import { unpaidTotal } from '@/lib/shippingFees';
import {
  calculateTieredPaymentFee,
  calculateTieredAgencyFee,
  toChargeableWon,
  DEFAULT_PAYMENT_FEE_RULE,
  DEFAULT_AGENCY_FEE_RULE,
} from '@/src/utils/feeCalculator';

export type PaymentPurpose = 'PRODUCT' | 'BID_SETTLE' | 'DEPOSIT' | 'SHIPPING';

/** 결제 전 주문이 있어야 하는 상태 */
export const SOURCE_STATUS: Record<PaymentPurpose, string> = {
  PRODUCT: ORDER_STATUS.CART,
  BID_SETTLE: ORDER_STATUS.BID_SUCCESS,
  DEPOSIT: ORDER_STATUS.BID_PENDING,
  SHIPPING: ORDER_STATUS.PAYMENT_REQ,
};

/** 승인되면 주문이 넘어갈 상태 */
export const TARGET_STATUS: Record<PaymentPurpose, string> = {
  PRODUCT: ORDER_STATUS.PAID,
  BID_SETTLE: ORDER_STATUS.BID_PAID,
  DEPOSIT: ORDER_STATUS.BIDDING,
  SHIPPING: ORDER_STATUS.PAYMENT_DONE,
};

export const PURPOSE_LABEL: Record<PaymentPurpose, string> = {
  PRODUCT: '상품 결제',
  BID_SETTLE: '낙찰 결제',
  DEPOSIT: '경매 보증금',
  SHIPPING: '배송비 결제',
};

/** 주문 상태로 결제 종류를 고릅니다. 결제할 수 없는 상태면 null */
export function purposeFromStatus(status: string): PaymentPurpose | null {
  const hit = (Object.keys(SOURCE_STATUS) as PaymentPurpose[]).find(p => SOURCE_STATUS[p] === status);
  return hit ?? null;
}

/** 토스 최소 결제 금액 */
const MIN_AMOUNT = 100;
const MAX_ORDERS = 50;

export class QuoteError extends Error {}

export type Quote = {
  purpose: PaymentPurpose;
  amount: number;
  orderName: string;
  items: { orderId: string; amount: number }[];
};

/**
 * 합계를 주문별 몫으로 나눕니다. (관리자가 주문 하나만 취소할 때 그 주문 몫을 넘지 않게 하려고)
 * 비율대로 내림하고, 남는 원 단위는 가장 큰 몫에 붙입니다. 몫의 합은 언제나 total 과 같습니다.
 */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (weights.length === 0) return [];
  if (sum <= 0) return weights.map((_, i) => (i === 0 ? total : 0));
  const shares = weights.map(w => Math.floor((total * Math.max(0, w)) / sum));
  const rest = total - shares.reduce((a, b) => a + b, 0);
  const largest = weights.reduce((best, w, i) => (w > weights[best] ? i : best), 0);
  shares[largest] += rest;
  return shares;
}

function buildOrderName(purpose: PaymentPurpose, names: string[]): string {
  const first = (names[0] || '주문 상품').replace(/\s+/g, ' ').trim();
  const head = first.length > 40 ? `${first.slice(0, 40)}…` : first;
  const more = names.length > 1 ? ` 외 ${names.length - 1}건` : '';
  // 토스 orderName 은 100자까지입니다.
  return `[${PURPOSE_LABEL[purpose]}] ${head}${more}`.slice(0, 100);
}

/**
 * 회원 본인의 주문들로 결제 금액을 계산합니다.
 * 주문이 남의 것이거나, 결제할 상태가 아니면 QuoteError 를 던집니다.
 */
export async function buildQuote(userId: number, purpose: PaymentPurpose, rawOrderIds: string[]): Promise<Quote> {
  const orderIds = Array.from(new Set(rawOrderIds.map(String).filter(Boolean)));
  if (orderIds.length === 0) throw new QuoteError('결제할 상품을 선택해 주세요.');
  if (orderIds.length > MAX_ORDERS) throw new QuoteError(`한 번에 ${MAX_ORDERS}건까지 결제할 수 있습니다.`);

  const orders = await prisma.order.findMany({
    where: { orderId: { in: orderIds } },
    select: {
      orderId: true, userId: true, status: true, productName: true,
      productPrice: true, productCount: true, domesticShippingFee: true,
      myBidPrice: true, depositKrw: true,
      shippingFees: { select: { intlFeeKrw: true, domesticFeeKrw: true, extraFeeKrw: true, paidAt: true } },
    },
  });
  if (orders.length !== orderIds.length || orders.some(o => o.userId !== userId)) {
    throw new QuoteError('주문을 찾을 수 없습니다.');
  }
  const source = SOURCE_STATUS[purpose];
  if (orders.some(o => o.status !== source)) {
    throw new QuoteError('결제할 수 없는 상태의 주문이 있습니다. 화면을 새로고침해 주세요.');
  }
  // 화면에서 고른 순서대로 둡니다 (주문명이 첫 상품 이름을 씁니다)
  orders.sort((a, b) => orderIds.indexOf(a.orderId) - orderIds.indexOf(b.orderId));

  let total = 0;
  let shares: number[] = [];

  if (purpose === 'SHIPPING') {
    shares = orders.map(o => unpaidTotal(o.shippingFees));
    total = shares.reduce((a, b) => a + b, 0);
  } else {
    const rate = await currentExchangeRate();
    if (!(rate > 0)) throw new QuoteError('환율 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');

    if (purpose === 'DEPOSIT') {
      shares = orders.map(o => Math.max(0, calcDepositKrw(Number(o.myBidPrice) || 0, rate) - (o.depositKrw || 0)));
      total = shares.reduce((a, b) => a + b, 0);
    } else {
      const [paymentRule, agencyRule] = await Promise.all([
        prisma.orderFeeRule.findUnique({ where: { feeType: 'PAYMENT' } }),
        prisma.orderFeeRule.findUnique({ where: { feeType: 'AGENCY' } }),
      ]);
      const jpy = orders.map(o => {
        const price = Number(o.productPrice) || 0;
        return price
          + calculateTieredPaymentFee(price, paymentRule ?? DEFAULT_PAYMENT_FEE_RULE)
          + (Number(o.domesticShippingFee) || 0)
          + calculateTieredAgencyFee(Number(o.productCount) || 1, agencyRule ?? DEFAULT_AGENCY_FEE_RULE);
      });
      const gross = toChargeableWon(jpy.reduce((a, b) => a + b, 0), rate);
      if (purpose === 'PRODUCT') {
        total = gross;
        shares = allocate(total, jpy);
      } else {
        // 💰 낙찰 결제 — 실제로 낸 보증금(원)을 뺍니다. (lib/bidSettlement.ts 의 calcBidCharge 와 같은 기준)
        const deposits = orders.map(o => o.depositKrw || 0);
        total = Math.max(0, gross - deposits.reduce((a, b) => a + b, 0));
        // 주문별 몫 = 그 주문 금액에서 그 주문 보증금을 뺀 만큼의 비율
        const own = jpy.map((j, i) => Math.max(0, Math.round(j * rate) - deposits[i]));
        shares = allocate(total, own);
      }
    }
  }

  if (total < MIN_AMOUNT) throw new QuoteError('결제할 금액이 없습니다.');

  return {
    purpose,
    amount: total,
    orderName: buildOrderName(purpose, orders.map(o => o.productName)),
    items: orders.map((o, i) => ({ orderId: o.orderId, amount: shares[i] })),
  };
}
