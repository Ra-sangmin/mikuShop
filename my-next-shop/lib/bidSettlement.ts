// 🔨 낙찰 정산 — 낙찰됐을 때 회원이 실제로 내야 하는 금액(원)을 서버에서 계산합니다.
//
// 왜 서버에서 다시 계산하나
//   지금까지 이 금액은 마이페이지 화면이 계산해서 결제 요청에 실어 보냈습니다.
//   낙찰 즉시 자동 결제를 하려면 회원 화면이 열려 있지 않아도 금액이 나와야 해서,
//   같은 계산식을 서버에도 둡니다. 계산 자체는 화면과 같은 함수(src/utils/feeCalculator)를 씁니다.
//   — 규칙이 바뀌어도 한쪽만 달라지지 않게 하기 위해서입니다.
//
// 계산식 (마이페이지 '낙찰 성공' 탭과 같음)
//   (낙찰가 + 결제 수수료 + 일본내 배송료 + 대행 수수료) × 환율 → 100원 단위 올림
//   여기서 **이미 받은 보증금**을 뺍니다.
import prisma from '@/lib/prisma';
import { loadExchangeRateConfig } from '@/lib/exchangeRate';
import { calcDepositKrw } from '@/src/utils/auctionDeposit';
import {
  calculateTieredPaymentFee,
  calculateTieredAgencyFee,
  toChargeableWon,
  DEFAULT_PAYMENT_FEE_RULE,
  DEFAULT_AGENCY_FEE_RULE,
} from '@/src/utils/feeCalculator';

/** 사이트 전역이 쓰는 '최종 표시 환율' (저장된 환율 + 가산액) */
export async function currentExchangeRate(): Promise<number> {
  const { additionalRate, currentExchangeRate: saved } = await loadExchangeRateConfig();
  return (Number(saved) || 0) + (Number(additionalRate) || 0);
}

/**
 * 💰 입찰가(엔)에 필요한 **보증금(원)** 을 구합니다.
 *
 * ⚠️ 계산은 **반드시 서버에서** 합니다. 화면이 보낸 금액을 그대로 믿으면
 *    보증금을 1원으로 깎아 보내는 요청도 통과합니다.
 * 규칙(입찰가의 10% · 최소 20,000원)은 src/utils/auctionDeposit.ts 한 곳에 있습니다.
 */
export async function depositForBid(bidJpy: number): Promise<{ krw: number; exchangeRate: number }> {
  const rate = await currentExchangeRate();
  return { krw: calcDepositKrw(bidJpy, rate), exchangeRate: rate };
}

export type BidChargeInput = {
  /** 낙찰가 (엔) — orders.product_price 는 그 주문 줄의 합계입니다 */
  productPrice: number;
  productCount: number;
  /** 구매 폼에서 받은 일본내 배송료 (엔) */
  domesticShippingFee: number;
  /** 이미 받은 보증금 중 **실제로 차감한 원화** (orders.deposit_krw) */
  depositKrw: number;
};

export type BidCharge = {
  /** 실제로 차감할 금액 (원). 보증금이 더 크면 0 입니다. */
  amountWon: number;
  /** 보증금을 빼기 전 금액 (원) */
  totalWon: number;
  depositWon: number;
  exchangeRate: number;
};

/**
 * 낙찰 결제 금액을 구합니다.
 *
 * 💰 보증금은 **실제로 빠져나간 원화**(orders.deposit_krw)를 뺍니다.
 *    엔 금액(deposit_amount)에 지금 환율을 다시 적용하면, 입찰할 때와 환율이 달라졌을 때
 *    회원이 낸 적 없는 금액을 돌려주거나 덜 돌려주게 됩니다.
 */
export async function calcBidCharge(input: BidChargeInput): Promise<BidCharge> {
  const [{ additionalRate, currentExchangeRate }, paymentRule, agencyRule] = await Promise.all([
    loadExchangeRateConfig(),
    prisma.orderFeeRule.findUnique({ where: { feeType: 'PAYMENT' } }),
    prisma.orderFeeRule.findUnique({ where: { feeType: 'AGENCY' } }),
  ]);
  // 사이트 전역이 쓰는 '최종 표시 환율'과 같은 값입니다. (저장된 환율 + 가산액)
  const exchangeRate = (Number(currentExchangeRate) || 0) + (Number(additionalRate) || 0);

  const productJpy = Number(input.productPrice) || 0;
  const quantity = Number(input.productCount) || 1;
  const domesticJpy = Number(input.domesticShippingFee) || 0;

  const totalJpy =
    productJpy +
    calculateTieredPaymentFee(productJpy, paymentRule ?? DEFAULT_PAYMENT_FEE_RULE) +
    domesticJpy +
    calculateTieredAgencyFee(quantity, agencyRule ?? DEFAULT_AGENCY_FEE_RULE);

  const totalWon = toChargeableWon(totalJpy, exchangeRate);
  const depositWon = Math.max(0, Math.round(Number(input.depositKrw) || 0));

  return {
    totalWon,
    depositWon,
    exchangeRate,
    amountWon: Math.max(0, totalWon - depositWon),
  };
}
