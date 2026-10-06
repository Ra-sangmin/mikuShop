"use client";

// 💳 마이페이지 상단 카드의 "결제" 칸 — 예전 미쿠짱머니 잔액 자리입니다.
//
// 잔액이 없어진 대신, 회원이 지금 결제해야 할 주문이 몇 건인지 보여 주고 바로 결제로 보냅니다.
// 결제는 주문마다 카드로 하므로, 여기서 할 일은 "결제할 게 있는지" 와 "지난 결제 내역" 두 가지뿐입니다.
// 마이페이지 · 진행 현황 · 관심 상품 · 회원 정보 화면이 같은 카드를 씁니다. (스타일: mypage-premium.css 의 mp-hero-money)
import Link from 'next/link';
import { ORDER_STATUS } from '@/src/types/order';

/** 회원이 카드 결제를 해야 다음 단계로 넘어가는 상태 (lib/payments/quote.ts 의 SOURCE_STATUS 와 같은 목록) */
const PAYABLE_STATUSES: string[] = [
  ORDER_STATUS.CART,
  ORDER_STATUS.BID_PENDING,
  ORDER_STATUS.BID_SUCCESS,
  ORDER_STATUS.PAYMENT_REQ,
];

export default function PaymentHeroCard({ orders }: { orders: { status?: string | null }[] | null | undefined }) {
  const list = orders || [];
  const pending = list.filter(o => PAYABLE_STATUSES.includes(String(o.status))).length;
  // 결제할 주문이 있는 첫 단계로 보냅니다. (장바구니 → 경매 보증금 → 낙찰 → 배송비 순)
  const firstTab = PAYABLE_STATUSES.find(s => list.some(o => o.status === s));

  return (
    <div className="mp-hero-money">
      <span className="mp-hero-money-label"><i className="fa fa-credit-card"></i> 결제 대기</span>
      <strong className="mp-hero-money-value" translate="no">{pending.toLocaleString()}<small>건</small></strong>
      <div className="mp-hero-money-actions">
        {pending > 0 && firstTab ? (
          <>
            <Link href={`/mypage/status?tab=${firstTab}`} className="is-primary"><i className="fa fa-credit-card"></i> 결제하기</Link>
            <Link href="/mypage/payments"><i className="fa fa-receipt"></i> 결제 내역</Link>
          </>
        ) : (
          <>
            <Link href="/mypage/payments" className="is-primary"><i className="fa fa-receipt"></i> 결제 내역</Link>
            <Link href="/guide/refund"><i className="fa fa-rotate-left"></i> 환불 안내</Link>
          </>
        )}
      </div>
    </div>
  );
}
