'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useMikuAlert } from '@/app/context/MikuAlertContext';
import { useRouter } from 'next/navigation';
// 🔨 입찰 요청·잔액 부족 안내는 전체 진행 현황과 같은 것을 씁니다.
import { requestBid, InsufficientBalanceNotice, MONEY_CHARGE_PATH } from './bidRequest';
import { calcDepositKrw, DEPOSIT_RULE_TEXT } from '@/src/utils/auctionDeposit';
import { minNextBid, bidIncrement, BID_LIMIT_NOTICE, BID_HIDDEN_LIMIT_HINT } from '@/src/utils/auctionBid';
import {
  calculateTieredPaymentFee, calculateTieredAgencyFee, toChargeableWon,
  DEFAULT_PAYMENT_FEE_RULE, DEFAULT_AGENCY_FEE_RULE, OrderFeeRule,
} from '@/src/utils/feeCalculator';
import { ORDER_STATUS, orderStatusLabel, isAuctionOrder, FAILED_STATUSES } from '@/src/types/order';

// 🌟 상태 우선순위 정의 (요청 -> 진행중 -> 창고 -> 배송 순)
const STATUS_PRIORITY: Record<string, number> = {
  [ORDER_STATUS.CART]: 1,
  [ORDER_STATUS.BID_PENDING]: 2,
  [ORDER_STATUS.BIDDING]: 3,
  [ORDER_STATUS.BID_SUCCESS]: 4,
  [ORDER_STATUS.BID_PAID]: 4.5,
  [ORDER_STATUS.PAID]: 5,
  [ORDER_STATUS.WAITING]: 5.5,
  [ORDER_STATUS.BID_FAILED]: 5.8,
  [ORDER_STATUS.FAILED]: 6,
  [ORDER_STATUS.ARRIVED]: 7,
  [ORDER_STATUS.PREPARING]: 8,
  [ORDER_STATUS.PAYMENT_REQ]: 9,
  [ORDER_STATUS.PAYMENT_DONE]: 10,
  [ORDER_STATUS.SHIPPING]: 11,
};

// 🌟 도로명 주소에서 "OO로/OO길"로 시작하는 부분부터 끝까지(도로명 + 번지수)만 추출 (confirmMsgs와 동일 로직)
// 🌟 상품명이 너무 길면 50자까지만 보여주고 나머지는 ...으로 축약합니다.
function truncateText(text: string, maxLength: number) {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function getLastRoadAddressPart(address?: string) {
  const tokens = address?.trim().split(/\s+/) || [];
  let roadTokenIndex = -1;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (/(로|길)$/.test(tokens[i])) { roadTokenIndex = i; break; }
  }
  return roadTokenIndex >= 0 ? tokens.slice(roadTokenIndex).join(' ') : (tokens[tokens.length - 1] || '');
}

// =================================================================
// 1. 비즈니스 로직 영역 (Business Logic Layer)
// =================================================================
function useOrderTableLogic({ activeTab, fetchOrders }: any) {
  const { showConfirm, showAlert } = useMikuAlert();
  const [isMobile, setIsMobile] = useState(false);
  const [now, setNow] = useState(new Date());

  // 📱 모바일 감지 및 🌟 실시간 1초 타이머
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);

    const timer = setInterval(() => setNow(new Date()), 1000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(timer);
    };
  }, []);

  // 🚀 남은 시간 계산 로직
  const getAuctionTimeData = useCallback((dateString: string | Date) => {
    if (!dateString) return { text: "-", isUrgent: false, isEnded: false };
    
    const diff = new Date(dateString).getTime() - now.getTime();

    if (diff <= 0) return { text: "경매 종료", isUrgent: false, isEnded: true };

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    if (d > 0) return { text: `${d}일 ${h}시간`, isUrgent: false, isEnded: false };
    if (h > 0) return { text: `${h}시간 ${m}분`, isUrgent: false, isEnded: false };
    return { text: `${m}분 ${s}초`, isUrgent: true, isEnded: false };
  }, [now]);

  // 🚀 동적 테이블 컬럼 수 계산
  const getColSpanCount = useCallback(() => {
    let count = activeTab === ORDER_STATUS.PAYMENT_REQ ? 1 : 2; // 기본: 상품명(+가격, 배송비 결제 대기 탭은 가격 컬럼 없음)
    if (activeTab === 'ALL') count += 1; // 상태 (전체내역 전용)
    if ([ORDER_STATUS.CART, ORDER_STATUS.ARRIVED, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.BID_PENDING, ORDER_STATUS.BID_SUCCESS, 'BIDDING'].includes(activeTab)) count += 1; // 체크박스
    if ([ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING].includes(activeTab)) count += 1; // 수취인
    if (activeTab === 'BID_PENDING' || activeTab === 'BIDDING') count += 2; // 남은시간, 내 입찰금액
    if (activeTab === ORDER_STATUS.SHIPPING) count += 1; // 운송장
    if (activeTab === ORDER_STATUS.PAYMENT_REQ) count += 1; // 총 결제 금액
    if ([ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING].includes(activeTab)) count += 1; // 삭제버튼(휴지통)
    if (activeTab === 'BIDDING') count += 1; // 경매 상태
    return count;
  }, [activeTab]);

  return {
    isMobile, now, showConfirm, showAlert,
    getAuctionTimeData, getColSpanCount
  };
}

// =================================================================
// 2. 화면 컴포넌트 영역 (View Layer)
// =================================================================

// 🌟 입찰 금액 입력 프리미엄 모달 콘텐츠
// 🔨 전체 진행 현황(page.tsx)에서도 같은 팝업을 씁니다. 복사본을 두면 한쪽만 고쳐져 어긋납니다.
export const BidInputContent = ({ item, myMoney, exchangeRate, onChange }: { item: any, myMoney: number, exchangeRate: number, onChange: (val: string) => void }) => {
  const { setConfirmDisabled } = useMikuAlert();
  const [amount, setAmount] = useState("");
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAmount(val);
    onChange(val);
  };

  const originalBid = item.myBidPrice || 0;
  const parsedAmount = parseInt(amount) || 0;

  // 💰 지금 경매가를 읽어 옵니다. 주문에 저장된 금액은 '내가 적어 낸 한도'라
  //    현재가와 다릅니다. 최소 입찰가는 **지금 경매가** 기준으로 정해집니다.
  const [livePrice, setLivePrice] = useState<{ loading: boolean; price?: number }>({ loading: true });
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/orders/auction-price?orderId=${encodeURIComponent(item.orderId)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (!cancelled) setLivePrice({ loading: false, price: d?.success ? Number(d.price) : undefined }); })
      .catch(() => { if (!cancelled) setLivePrice({ loading: false }); });
    return () => { cancelled = true; };
  }, [item.orderId]);

  // 🔨 야후는 금액대별 최소 인상폭이 있습니다. 그보다 적게 걸면 입찰 자체가 거부됩니다.
  //    현재가를 못 읽었으면 막지 않습니다 — 모르는 값으로 회원을 막을 수는 없습니다.
  const basePrice = livePrice.price ?? 0;
  const minBid = basePrice > 0 ? minNextBid(basePrice) : 0;
  const tooLow = minBid > 0 && parsedAmount > 0 && parsedAmount < minBid;
  // 💰 지금 이 순간 빠져나가는 돈은 **입찰 금액이 아니라 보증금 차액**입니다.
  //    보증금은 원화이고 '지금 입찰가 기준'이라, 이미 낸 만큼은 빼고 모자란 만큼만 받습니다.
  //    (서버도 같은 식으로 계산합니다 — app/api/orders/bid, src/utils/auctionDeposit.ts)
  //    예전에는 여기에 "희망 입찰 금액 (원화 환산)" 을 보여 줬는데, 그 금액은 지금 빠지지 않습니다.
  const targetDepositWon = calcDepositKrw(parsedAmount, exchangeRate);
  const paidDepositWon = Number(item.depositKrw) || 0;
  const addDepositWon = Math.max(0, targetDepositWon - paidDepositWon);
  const isInsufficient = parsedAmount > 0 && addDepositWon > myMoney;

  // 🌟 지금 낼 보증금이 보유 미쿠짱 머니보다 많으면 "확인" 버튼을 눌러도 진행되지 않게 막습니다.
  //    (예전에는 입찰 금액 전액을 갖고 있어야 입찰할 수 있었습니다 — 보증금만 내면 되는데도요)
  useEffect(() => {
    setConfirmDisabled(isInsufficient || tooLow);
  }, [isInsufficient, tooLow, setConfirmDisabled]);

  return (
    <div className="miku-bid-modal notranslate" translate="no">
      <p className="prod-name-title">{item.productName}</p>

      <div className="info-row">
        <span className="label">지금 경매가</span>
        <span className="val highlight">
          {livePrice.loading ? '불러오는 중…' : livePrice.price ? `¥ ${livePrice.price.toLocaleString()}` : '확인 불가'}
        </span>
      </div>
      {/* 🔨 화면의 경매가는 '이기는 금액'이 아닙니다. 숨은 한도가 더 높을 수 있습니다. */}
      {livePrice.price ? (
        <p style={{ margin: '-4px 0 10px', fontSize: 11.5, color: '#94a3b8', textAlign: 'right' }}>
          {BID_HIDDEN_LIMIT_HINT} · 최소 {minBid.toLocaleString()}엔부터 (인상폭 {bidIncrement(basePrice).toLocaleString()}엔)
        </p>
      ) : null}

      <div className="info-row my-bid-row">
        <span className="label">내 입찰 금액</span>
        <div className="bid-calc">
          {parsedAmount > 0 ? (
            <>
              <span className="old-bid">¥ {originalBid.toLocaleString()}</span>
              <span className="arrow">→</span>
              <span className="new-bid">¥ {parsedAmount.toLocaleString()}</span>
            </>
          ) : (
            <span className="new-bid">¥ {originalBid.toLocaleString()}</span>
          )}
        </div>
      </div>

      <div className="input-container">
        <label>희망 입찰 금액(최종) (¥)</label>
        <input
          type="number" placeholder="희망 입찰 금액(최종) 입력"
          value={amount} onChange={handleInputChange}
          className={`premium-input ${isInsufficient ? 'insufficient' : ''}`}
        />
        <div className="bid-my-money-info">
          내 미쿠짱 머니 ₩ {myMoney.toLocaleString()}
        </div>
        {tooLow && (
          <div className="bid-insufficient-warning">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            최소 {minBid.toLocaleString()}엔 이상 입력해 주세요
          </div>
        )}
        {parsedAmount > 0 && (
          <div className="bid-krw-info">
            {addDepositWon > 0 ? (
              <>
                지금 결제할 보증금 ₩ {addDepositWon.toLocaleString()}
                <span style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                  보증금 {targetDepositWon.toLocaleString()}원 ({DEPOSIT_RULE_TEXT})
                  {paidDepositWon > 0 && ` · 이미 낸 ${paidDepositWon.toLocaleString()}원 제외`}
                </span>
              </>
            ) : (
              <>
                지금 결제할 보증금 없음
                <span style={{ display: 'block', fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                  이미 낸 보증금 {paidDepositWon.toLocaleString()}원으로 충분합니다
                </span>
              </>
            )}
          </div>
        )}
        <p style={{ marginTop: 10, fontSize: 11.5, lineHeight: 1.6, color: '#94a3b8', wordBreak: 'keep-all' }}>
          {BID_LIMIT_NOTICE}
        </p>
        {isInsufficient && (
          <div className="bid-insufficient-warning">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            보증금을 내기에 미쿠짱 머니가 부족합니다
          </div>
        )}
      </div>
    </div>
  );
};

// 🔽 상품을 누르면 그 아래에 펼쳐지는 상세 (장바구니 · 신청 내역 보기 · 입고 완료 보기)
//    예전엔 아래 '상세 정보 확인' 패널이 따로 열렸습니다. 이제 누른 자리에서 바로 봅니다.
//    상태마다 필요한 정보(경매 남은 시간 · 배송비 청구 내역 · 수취인 · 합포장 상품 등)를 함께 보여 줍니다.
const DELETABLE_STATUSES: string[] = [ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING];

// ✋ / ⏳ 펼치기 보기에서 상품명 아래에 붙는 한 줄 안내 — 손님이 할 일인지, 미쿠짱이 진행 중인지 바로 알 수 있게
// 🔨 입찰 상태 이름 (손님용). PENDING 은 미쿠짱이 아직 입찰을 넣기 전이라 '준비 중'으로 부릅니다.
function bidStatusLabel(bidStatus?: string | null): string {
  if (bidStatus === 'PENDING') return '입찰 준비 중';
  if (bidStatus === 'ADDITIONAL') return '추가 입찰 반영됨';
  if (bidStatus === 'COMPLETED') return '입찰 완료';
  return '상태 확인중';
}

// ⏰ 마감 24시간 이내면 '마감 임박'
function isEndingSoon(end?: string | Date | null): boolean {
  if (!end) return false;
  const diff = new Date(end).getTime() - Date.now();
  return diff > 0 && diff <= 24 * 60 * 60 * 1000;
}

/**
 * 💴 금액 칸이 무슨 금액인지.
 *
 * 경매 주문은 '상품 금액' 자리에 **입찰 희망가**가 들어 있습니다.
 * (경매 요청을 만들 때 productPrice 에 입찰가를 넣습니다 — app/api/orders POST)
 * 낙찰 처리 때 관리자가 확인한 실제 낙찰가로 바뀌므로, 그 뒤에는 '낙찰가'가 됩니다.
 * 라벨 없이 숫자만 두면 구매 요청의 상품 금액과 같은 뜻으로 읽힙니다.
 */
function amountLabel(status: string): string | null {
  if (status === ORDER_STATUS.BID_PENDING || status === ORDER_STATUS.BIDDING) return '입찰 희망가';
  if (status === ORDER_STATUS.BID_SUCCESS || status === ORDER_STATUS.BID_PAID) return '낙찰가';
  return null;
}

function statusHint(status: string, type?: string | null): string {
  switch (status) {
    // 손님이 할 일
    case ORDER_STATUS.CART: return '결제하시면 바로 구매를 시작해요';
    case ORDER_STATUS.BID_PENDING: return '보증금을 결제하시면 입찰을 시작해요';
    case ORDER_STATUS.BID_SUCCESS: return '낙찰됐어요! 상품 금액을 결제해 주세요';
    case ORDER_STATUS.BID_PAID: return '결제가 끝났어요 · 판매자에게 구매를 진행하고 있어요';
    case ORDER_STATUS.ARRIVED: return '창고에 도착했어요 · 포장 방법과 배송지를 선택해 주세요';
    case ORDER_STATUS.PAYMENT_REQ: return '배송비를 결제하시면 국제 배송이 시작돼요';
    // 미쿠짱이 진행 중
    case ORDER_STATUS.BIDDING: return '입찰 중이에요 · 경매 결과를 기다리고 있어요';
    case ORDER_STATUS.PAID: return type === 'DELIVERY' ? '일본 창고 도착을 기다리고 있어요' : '판매자에게 구매를 진행하고 있어요';
    case ORDER_STATUS.WAITING: return '일본 창고 도착을 기다리고 있어요';
    case ORDER_STATUS.BID_FAILED: return '아쉽게도 낙찰되지 않았어요. 보증금은 돌려드립니다';
    case ORDER_STATUS.FAILED: return '상품을 구매하지 못했어요';
    case ORDER_STATUS.PREPARING: return '미쿠짱 창고에서 포장하고 있어요 · 배송비 안내를 곧 드려요';
    case ORDER_STATUS.PAYMENT_DONE: return '결제 완료 · 곧 국제 배송이 시작돼요';
    default: return '';
  }
}

function ItemDetail({ item, onDelete, auctionTime, exchangeRate = 0, paymentFeeRule, agencyFeeRule }: {
  item: any;
  onDelete: () => void;
  auctionTime?: { text: string; isUrgent: boolean; isEnded: boolean };
  /** 💰 낙찰 결제 내역을 원화로 보여 주는 데 씁니다. */
  exchangeRate?: number;
  paymentFeeRule?: OrderFeeRule;
  agencyFeeRule?: OrderFeeRule;
}) {
  const fmt = (d?: string | Date) => {
    if (!d) return '-';
    const t = new Date(d);
    return Number.isNaN(t.getTime()) ? '-' : t.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  const has = (v: any) => v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '-';

  // 💰 경매가 진행 중이면 **지금 경매가**를 읽어 옵니다.
  //    주문에 저장된 금액은 신청하던 때의 입찰 희망가라, 지금 얼마까지 올랐는지는 알 수 없습니다.
  //    (추가 입찰을 할지 판단하는 데 쓰는 값이라 펼칠 때마다 새로 읽습니다.
  //     서버가 5분 캐시를 두고 있어 연달아 펼쳐도 무겁지 않습니다)
  const isLiveAuction = [ORDER_STATUS.BID_PENDING, ORDER_STATUS.BIDDING].includes(item.status);
  const [live, setLive] = useState<{ loading: boolean; price?: number; bidCount?: number | null; error?: string }>({ loading: false });
  useEffect(() => {
    if (!isLiveAuction || !item.orderId) return;
    let cancelled = false;
    setLive({ loading: true });
    fetch(`/api/orders/auction-price?orderId=${encodeURIComponent(item.orderId)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (!cancelled) setLive(d?.success ? { loading: false, price: Number(d.price), bidCount: d.bidCount } : { loading: false, error: d?.error || '불러오지 못했어요' }); })
      .catch(() => { if (!cancelled) setLive({ loading: false, error: '불러오지 못했어요' }); });
    return () => { cancelled = true; };
  }, [isLiveAuction, item.orderId]);
  const won = (v: number) => `₩ ${(v || 0).toLocaleString()}`;
  const st = item.status;
  // 🏷️ 상태는 상품 줄의 배지로 이미 보여서 상세에는 넣지 않습니다.
  // 🔨 경매 상품은 수량이 늘 1개라 수량도 뺍니다. (낙찰 뒤 입고 · 배송 단계의 경매 상품도 포함)
  const isAuction = isAuctionOrder(item);
  const rows: [string, React.ReactNode][] = [];

  rows.push([
    item.isGroup ? '상품 합계' : (amountLabel(st) ?? '상품 금액'),
    `¥ ${(item.productPrice || 0).toLocaleString()}`,
  ]);
  if (!item.isGroup && !isAuction) rows.push(['수량', `${Number(item.productCount) || 1}개`]);
  if (Number(item.domesticShippingFee) > 0 && [ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING, ORDER_STATUS.BID_SUCCESS, ORDER_STATUS.BID_PAID].includes(st)) {
    rows.push(['일본 내 배송료', `¥ ${Number(item.domesticShippingFee).toLocaleString()}`]);
  }

  // 💰 낙찰 뒤에는 "이 금액이 어떻게 나왔는지"를 그 자리에서 보여 줍니다.
  //    이용 내역에는 돈이 움직인 기록만 남아, 수수료가 얼마였는지 알 방법이 없었습니다.
  if ([ORDER_STATUS.BID_SUCCESS, ORDER_STATUS.BID_PAID].includes(st) && !item.isGroup) {
    const productJpy = Number(item.productPrice) || 0;
    const qty = Number(item.productCount) || 1;
    const domesticJpy = Number(item.domesticShippingFee) || 0;
    const payFee = calculateTieredPaymentFee(productJpy, paymentFeeRule ?? DEFAULT_PAYMENT_FEE_RULE);
    const agencyFee = calculateTieredAgencyFee(qty, agencyFeeRule ?? DEFAULT_AGENCY_FEE_RULE);
    const totalJpy = productJpy + payFee + domesticJpy + agencyFee;
    const totalWon = toChargeableWon(totalJpy, exchangeRate);
    const paidDeposit = Number(item.depositKrw) || 0;
    const remain = Math.max(0, totalWon - paidDeposit);

    rows.push(['결제 수수료', `¥ ${payFee.toLocaleString()}`]);
    rows.push(['대행 수수료', `¥ ${agencyFee.toLocaleString()}`]);
    if (totalWon > 0) rows.push(['합계', <b key="sum">{won(totalWon)}</b>]);
    if (paidDeposit > 0) rows.push(['낸 보증금', `- ${paidDeposit.toLocaleString()}원`]);
    rows.push([
      st === ORDER_STATUS.BID_PAID ? '추가 결제' : '결제하실 금액',
      <b key="remain" style={{ color: remain > 0 ? '#e11d48' : '#059669' }}>{won(remain)}</b>,
    ]);
  }

  // 💰 지금 경매가 (실시간). 못 읽으면 줄을 감추지 않고 이유를 적어 둡니다 —
  //    금액이 안 보이는 것과 "지금은 못 읽었다"는 것은 다릅니다.
  if (isLiveAuction) {
    rows.push(['지금 경매가', live.loading
      ? <span key="live" style={{ color: '#94a3b8' }}>불러오는 중…</span>
      : live.price
        ? <span key="live"><b style={{ color: '#e11d48' }}>¥ {live.price.toLocaleString()}</b>
            {live.bidCount != null && <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 6 }}>입찰 {live.bidCount}건</span>}
          </span>
        : <span key="live" style={{ color: '#94a3b8', fontSize: 12.5 }}>{live.error || '-'}</span>]);
    if (live.price) rows.push(['', <span key="hint" style={{ fontSize: 11.5, color: '#94a3b8' }}>{BID_HIDDEN_LIMIT_HINT}</span>]);
  }

  // 🔨 경매
  if ([ORDER_STATUS.BID_PENDING, ORDER_STATUS.BIDDING].includes(st)) {
    if (item.auctionEndDate) {
      rows.push(['남은 시간', auctionTime
        ? <span className={`time-text ${auctionTime.isEnded ? 'ended' : ''} ${auctionTime.isUrgent ? 'urgent' : ''}`}>{auctionTime.text}</span>
        : fmt(item.auctionEndDate)]);
    }
  }

  // 📦 입고 · 포장 · 배송비
  if (item.receivedAt && [ORDER_STATUS.ARRIVED, ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE].includes(st)) {
    rows.push(['창고 입고', fmt(item.receivedAt)]);
  }
  if ([ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE].includes(st)) {
    rows.push(['수취인', item.address
      ? `${item.address.recipientName || '-'}${item.address.address ? ` · ${item.address.address} ${item.address.detailAddress || ''}` : ''}`
      : '배송지 미지정']);
  }
  if (st === ORDER_STATUS.PAYMENT_REQ) {
    const intl = item.intlFeeKrw || 0, dom = item.domesticFeeKrw || 0, extra = item.extraFeeKrw || 0;
    rows.push(['국제 배송비', won(intl)]);
    if (dom > 0) rows.push(['현지 배송비', won(dom)]);
    if (extra > 0) rows.push(['추가 비용', won(extra)]);
    rows.push(['결제할 금액', <strong key="sum" className="detail-sum">{won(intl + dom + extra)}{item.feeRound > 1 ? ' (추가 결제)' : ''}</strong>]);
    if (has(item.feeMemo)) rows.push(['청구 사유', item.feeMemo]);
  }

  if (!item.isGroup) {
    if (has(item.productOption)) rows.push(['옵션', item.productOption]);
    if (has(item.serviceRequest)) rows.push(['부가 서비스', item.serviceRequest]);
    if (has(item.productRequest)) rows.push(['요청사항', item.productRequest]);
  }
  rows.push(['신청일', fmt(item.registeredAt)]);

  return (
    <div className="cart-detail" onClick={(e) => e.stopPropagation()}>
      {item.productImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="cart-detail-thumb" src={item.productImageUrl} alt="" referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      )}
      <div className="cart-detail-body">
        <dl className="cart-detail-list">
          {rows.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        {/* 📦 합포장: 묶인 상품 목록 */}
        {item.isGroup && (
          <ul className="cart-detail-bundle">
            {item.bundleItems.map((sub: any) => (
              <li key={sub.orderId}>
                <span title={sub.productName}>{truncateText(sub.productName, 60)}</span>
                <b>¥ {(sub.productPrice || 0).toLocaleString()}</b>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="cart-detail-actions">
        {/* 🔨 추가 입찰은 상품 줄의 [추가 입찰] 버튼으로 합니다. (상세에 같은 버튼이 겹쳐 있어 뺐습니다) */}
        {!item.isGroup && item.productUrl && (
          <a className="cart-detail-btn" href={item.productUrl} target="_blank" rel="noopener noreferrer">원본 상품 보기 ↗</a>
        )}
        {DELETABLE_STATUSES.includes(st) && (
          <button type="button" className="cart-detail-btn is-danger" onClick={onDelete}>삭제</button>
        )}
      </div>
    </div>
  );
}

// 🌟 메인 테이블 컴포넌트
export default function OrderTable({ items, activeTab, selectedItems, setSelectedItems, fetchOrders, selectedAddress, onIndividualPacking, onDelete, onStatusClick, inlineMode = false, myMoney = 0, exchangeRate = 0, paymentFeeRule, agencyFeeRule }: any) {
  const {
    isMobile, showConfirm, showAlert,
    getAuctionTimeData, getColSpanCount
  } = useOrderTableLogic({ activeTab, fetchOrders });
  // 💰 입찰 보증금이 모자랄 때 충전 화면으로 보내 줍니다.
  const router = useRouter();

  const isAuctionTab = activeTab === 'BID_PENDING' || activeTab === 'BIDDING';
  const showBundleAndRecipientTabs = [ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING];
  // 🌟 합포장(bundleId) 묶음을 한 행으로 합쳐서 보여주는 탭들 (배송비 결제 대기/배송비 결제 완료/국제 배송)
  const bundleGroupTabs = [ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING];
  const hasCheckbox = [ORDER_STATUS.CART, ORDER_STATUS.ARRIVED, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.BID_PENDING, ORDER_STATUS.BID_SUCCESS, 'BIDDING'].includes(activeTab as any);
  // 🌟 전체내역 탭에서는 행을 클릭하면 해당 상품의 상태 탭으로 이동합니다.
  const isAllTab = activeTab === 'ALL';
  // 🔽 펼치기 보기(inlineMode — 장바구니 · 신청 내역 보기 · 입고 완료 보기):
  //    탭은 '전체'지만 결제 · 포장 요청이 필요한 상품은 체크박스로 바로 고르고, 상품을 누르면 그 아래에 상세가 펼쳐집니다.
  //    (예전엔 상품을 눌러야 아래 '상세 정보 확인' 패널이 열리고 거기서 다시 골라 결제했습니다)
  const cartMode = inlineMode;
  // 펼치기 보기에서 고를 수 있는 상태: 결제(구매 요청 · 경매 요청 · 낙찰 · 배송비 결제 대기)와 포장 요청(입고 완료)
  const INLINE_SELECTABLE: string[] = [ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING, ORDER_STATUS.BID_SUCCESS, ORDER_STATUS.ARRIVED, ORDER_STATUS.PAYMENT_REQ];
  const canSelect = (item: any) => (cartMode ? INLINE_SELECTABLE.includes(item.status) : hasCheckbox);
  const selectable = hasCheckbox || cartMode;
  const showDeleteCol = [ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING].includes(activeTab) || cartMode;
  const colSpan = getColSpanCount() + (cartMode ? 2 : 0); // 펼치기 보기: 체크박스 · 삭제 칸

  // 상태값에 따른 테마 색상 반환 함수
  const getBadgeTheme = (status: string, type?: string) => {
    // 🌟 입고 대기중(배송대행)은 상품 결제 완료(보라)와 구분되도록 청록색으로 보여 줍니다. (예전 배송대행 PAID 주문도 같음)
    if (status === ORDER_STATUS.WAITING || (status === ORDER_STATUS.PAID && type === 'DELIVERY')) return 'theme-cyan';
    if (status === ORDER_STATUS.CART) return 'theme-blue';
    // 🌟 경매 요청은 구매 요청(파랑)과 구분되도록 호박색으로 보여 줍니다
    if (status === ORDER_STATUS.BID_PENDING) return 'theme-amber';
    if (FAILED_STATUSES.includes(status as any)) return 'theme-red';
    // 🎨 '신청 내역 보기' 카드는 경매 중·낙찰 성공·상품 결제 완료·입고 대기중·실패를
    //    한 표에 모아 보여 줍니다. 세이 모두 보라였어서 눈으로 가를 수 없었습니다.
    //    경매 중 = 남보라, 낙찰 성공 = 분홍, 상품 결제 완료 = 보라 로 갈라 둡니다.
    if (status === ORDER_STATUS.BIDDING) return 'theme-indigo';
    if (status === ORDER_STATUS.BID_SUCCESS) return 'theme-pink';
    // 🔨 경매 결제 완료 — 낙찰 성공(분홍)·상품 결제 완료(보라)와 갈리도록 청록으로 둡니다.
    if (status === ORDER_STATUS.BID_PAID) return 'theme-cyan';
    if (status === ORDER_STATUS.PAID) return 'theme-purple';
    if ([ORDER_STATUS.ARRIVED, ORDER_STATUS.PREPARING].includes(status as any)) return 'theme-green';
    if ([ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING].includes(status as any)) return 'theme-orange';
    return 'theme-default';
  };
  
  // 입찰 처리 로직
  const handleBidClick = async (item: any) => {
    let finalAmount = "";
    const isConfirmed = await showConfirm(<BidInputContent item={item} myMoney={myMoney} exchangeRate={exchangeRate} onChange={(val) => { finalAmount = val; }} />);

    if (isConfirmed) {
      // 🌟 입력값은 이제 "추가할 금액"이 아니라 "희망 입찰 금액(최종)"입니다.
      const finalBidAmount = parseInt(finalAmount);
      const currentHighest = item.productPrice || 0;
      if (!finalBidAmount || finalBidAmount <= currentHighest) {
        return showAlert("현재 최고가보다 높은 금액을 입력해주세요.", "error");
      }

      // 🌟 확인 버튼은 비활성화로 막혀있지만, 만약을 대비해 제출 시점에도 한 번 더 검증합니다.
      const finalBidAmountWon = Math.ceil(Math.round(finalBidAmount * exchangeRate) / 100) * 100;
      if (finalBidAmountWon > myMoney) {
        return showAlert("미쿠짱 머니가 부족합니다.", "error");
      }

      // 서버는 myBidPrice에 더해지는(increment) 값을 받으므로, 기존 입찰가와의 차액을 계산해서 보냅니다.
      const originalBid = item.myBidPrice || 0;
      const amount = finalBidAmount - originalBid;



      const outcome = await requestBid(item.orderId, amount);
      if (outcome.ok) {
        showAlert(`¥${finalBidAmount.toLocaleString()} 입찰 완료!`, 'success');
        fetchOrders();
      } else if (outcome.insufficient) {
        // 💰 부족하면 오류만 띄우지 않고 충전으로 이어 줍니다.
        const goCharge = await showConfirm(<InsufficientBalanceNotice {...outcome.insufficient} />);
        if (goCharge) router.push(MONEY_CHARGE_PATH);
      } else {
        showAlert(outcome.message, 'error');
      }
    }
  };

  // 🌟 합포장 묶음에서 어떤 상품들이 포함됐는지 펼쳐보기 위한 상태
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const toggleExpand = (bundleId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(bundleId)) next.delete(bundleId); else next.add(bundleId);
      return next;
    });
  };

  // 🌟 합포장(bundleId 공유) 묶음은 orderIds 배열로 한 번에 선택/해제합니다.
  const toggleCheck = (orderIdOrIds: string | string[]) => {
    const ids = Array.isArray(orderIdOrIds) ? orderIdOrIds : [orderIdOrIds];
    const allSelected = ids.every((id: string) => selectedItems.includes(id));
    if (allSelected) { setSelectedItems(selectedItems.filter((id: string) => !ids.includes(id))); return; }
    // 🔽 펼치기 보기: 상태마다 결제 · 요청 방식이 달라(구매 요청 · 경매 요청 · 낙찰 · 배송비 결제 대기 · 입고 완료) 한 번에 처리할 수 없습니다.
    //    다른 상태의 상품을 고르면 그 상품부터 새로 고릅니다.
    if (cartMode && selectedItems.length > 0) {
      const statusOf = (id: string) => items.find((i: any) => String(i.orderId) === String(id))?.status;
      if (statusOf(ids[0]) !== statusOf(selectedItems[0])) { setSelectedItems([...ids]); return; }
    }
    setSelectedItems([...selectedItems.filter((id: string) => !ids.includes(id)), ...ids]);
  };

  // 🛒 장바구니 보기: 상품을 누르면 그 바로 아래에 상세(옵션 · 요청사항 · 수량 등)를 펼칩니다
  const [openDetails, setOpenDetails] = useState<Set<string>>(new Set());
  const toggleDetail = (orderId: string) => {
    setOpenDetails(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId); else next.add(orderId);
      return next;
    });
  };

  // 🌟 배송비 결제 대기/배송비 결제 완료/국제 배송 탭 + 전체내역(ALL, 진행중 목록 포함) 탭에서는
  // 같은 bundleId(합포장)로 묶인 주문들을 한 행으로 합쳐서 보여줍니다.
  const displayItems = React.useMemo(() => {
    const shouldGroup = bundleGroupTabs.includes(activeTab) || activeTab === ORDER_STATUS.ALL;
    if (!shouldGroup) return items;

    const groupsByBundleId: Record<string, any[]> = {};
    items.forEach((item: any) => {
      if (item.bundleId) (groupsByBundleId[item.bundleId] ||= []).push(item);
    });

    // 🌟 원래 정렬 순서(우선순위/최신순)를 유지하기 위해, 각 항목을 순서대로 훑으며
    // 묶음은 처음 등장하는 위치에서 한 번만 합쳐서 내보냅니다.
    const seenBundles = new Set<string>();
    const result: any[] = [];
    items.forEach((item: any) => {
      if (item.bundleId) {
        if (seenBundles.has(item.bundleId)) return;
        seenBundles.add(item.bundleId);
        const group = groupsByBundleId[item.bundleId];
        const first = group[0];
        result.push({
          ...first,
          orderId: item.bundleId,
          orderIds: group.map((g: any) => g.orderId),
          productName: group.length > 1 ? `${first.productName} 외 ${group.length - 1}건` : first.productName,
          productPrice: group.reduce((sum: number, g: any) => sum + (g.productPrice || 0), 0),
          domesticShippingFee: group.reduce((sum: number, g: any) => sum + (g.domesticShippingFee || 0), 0),
          // 💴 지금 청구 중인 회차의 금액만 합칩니다. (이미 낸 회차는 제외)
          intlFeeKrw: group.reduce((sum: number, g: any) => sum + (g.intlFeeKrw || 0), 0),
          domesticFeeKrw: group.reduce((sum: number, g: any) => sum + (g.domesticFeeKrw || 0), 0),
          extraFeeKrw: group.reduce((sum: number, g: any) => sum + (g.extraFeeKrw || 0), 0),
          feeRound: group.find((g: any) => g.feeRound)?.feeRound || 0,
          feeMemo: group.find((g: any) => g.feeMemo)?.feeMemo || '',
          isGroup: group.length > 1,
          bundleItems: group,
        });
      } else {
        result.push(item);
      }
    });

    return result;
  }, [items, activeTab]);

  // ✋ / ⏳ 펼치기 보기(신청 내역 보기 · 입고 완료)는 손님이 할 일과 미쿠짱이 진행 중인 상품이 섞여 있어,
  //    [내가 처리할 일] 을 위에, [미쿠짱이 진행 중] 을 아래에 나눠 보여 줍니다. (관리자 화면의 '관리자 처리 필요 / 회원 처리 대기' 와 같은 방식)
  //    모두 할 일인 목록(장바구니)은 나누지 않습니다.
  const rowsWithGroups = React.useMemo(() => {
    if (!cartMode) return displayItems;
    const todo = displayItems.filter((it: any) => canSelect(it));
    const wait = displayItems.filter((it: any) => !canSelect(it));
    if (wait.length === 0) return displayItems;
    return [
      { __groupHead: 'todo', __count: todo.length, orderId: '__todo' },
      ...todo,
      { __groupHead: 'wait', __count: wait.length, orderId: '__wait', __hasBidding: wait.some((w: any) => w.status === ORDER_STATUS.BIDDING) },
      ...wait,
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayItems, cartMode]);

  return (
    <div className={`miku-ordertable-wrapper ${cartMode ? 'is-cart-mode' : ''}`}>
      
      {isMobile && !cartMode ? (
        <div className="mobile-fallback">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <p>상세 내역은 PC 환경에 최적화되어 있습니다.<br/>화면을 옆으로 스크롤하여 확인해주세요.</p>
        </div>
      ) : null}

      <div className="table-container anim-slide-up">
        <table className="premium-table">
          <thead>
            <tr>
              {/* 체크박스 헤더 */}
              {selectable && (
                <th className="th-cell th-check"><div className="header-spacer"></div></th>
              )}
              {activeTab === 'ALL' && <th className="th-cell th-status">상태</th>}
              <th className="th-cell th-product">상품명</th>
              
              {isAuctionTab && <th className="th-cell th-time">남은 시간</th>}
              {activeTab !== ORDER_STATUS.PAYMENT_REQ && <th className="th-cell th-price">{isAuctionTab ? '현재 최고가' : '상품 금액'}</th>}
              {isAuctionTab && <th className="th-cell th-mybid">내 입찰금액</th>}
              
              {activeTab === 'BIDDING' && <th className="th-cell th-auction-status">경매 상태</th>}
              {showBundleAndRecipientTabs.includes(activeTab) && <th className="th-cell th-recipient">수취인</th>}
              {/* 💸 현지 · 국제 배송비를 따로 보여주는 대신, 추가 결제 비용까지 합친 한 금액만 보여줍니다. */}
              {activeTab === ORDER_STATUS.PAYMENT_REQ && <th className="th-cell th-total-fee">총 결제 금액(₩)</th>}
              {activeTab === ORDER_STATUS.SHIPPING && <th className="th-cell th-tracking">운송장 번호</th>}
              
              {/* 삭제 버튼용 빈 헤더를 맨 끝으로 배치 */}
              {showDeleteCol && (
                <th className="th-cell th-delete-col"></th>
              )}
            </tr>
          </thead>

          <tbody>
            {rowsWithGroups.length === 0 ? (
              <tr><td colSpan={colSpan} className="empty-row">해당하는 상품이 없습니다.</td></tr>
            ) : (
              rowsWithGroups.map((item: any) => {
                // ✋ / ⏳ 묶음 머리 줄
                if (item.__groupHead) {
                  const isTodo = item.__groupHead === 'todo';
                  return (
                    <tr key={`group-${item.__groupHead}`} className={`tr-group-head ${isTodo ? 'is-todo' : 'is-wait'}`}>
                      <td colSpan={colSpan}>
                        <div className="group-head">
                          <span className="group-head-icon">{isTodo ? '✋' : '⏳'}</span>
                          <strong>{isTodo ? '내가 처리할 일' : '미쿠짱이 진행 중'}</strong>
                          <span className="group-head-count">{item.__count}</span>
                          <span className="group-head-desc">
                            {isTodo
                              ? (item.__count > 0 ? '체크해서 결제 · 요청을 진행해 주세요' : '지금 하실 일은 없어요')
                              : (item.__hasBidding
                                ? '따로 하실 일은 없어요 · 경매는 원하시면 추가 입찰할 수 있어요'
                                : '따로 하실 일은 없어요 · 진행되면 알려 드릴게요')}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                }
                const ids: string[] = item.orderIds || [item.orderId];
                const isChecked = ids.every((id: string) => selectedItems.includes(id));
                const timeData = getAuctionTimeData(item.auctionEndDate);

                return (
                  <React.Fragment key={item.orderId}>
                    {/* 🌟 행 전체에 onClick 이벤트 및 커서 클래스 적용 */}
                    <tr
                      /* 🔗 /mypage/status?orderId=... 로 들어왔을 때 이 행을 찾아 스크롤하기 위한 표시.
                         합포장 묶음은 한 행이 여러 주문을 담으므로 공백으로 이어 붙입니다. */
                      data-order-ids={ids.join(' ')}
                      className={`tr-row ${isChecked ? 'selected' : ''} ${selectable || isAllTab ? 'clickable' : ''} ${cartMode && openDetails.has(item.orderId) ? 'is-detail-open' : ''}`}
                      onClick={() => {
                        if (cartMode) { toggleDetail(item.orderId); return; } // 🔽 펼치기 보기: 그 자리에서 상세 펼치기
                        if (isAllTab) { onStatusClick?.(item.status, ids); return; } // 🔎 두 번째 값: 누른 행의 주문번호들 (입고 완료는 상세 정보 확인 패널에서 엽니다)
                        if (hasCheckbox) toggleCheck(ids);
                      }}
                    >
                      {/* 체크박스 */}
                      {selectable && (
                        <td
                          className={`td-cell td-check ${canSelect(item) ? 'can-check' : ''}`}
                          /* 👆 체크박스 칸 전체를 누를 수 있게 (작은 네모만 누르기 어려워서).
                             e.stopPropagation()으로 행 클릭(상세 펼치기)과 겹치지 않게 합니다. */
                          onClick={canSelect(item) ? (e) => { e.stopPropagation(); toggleCheck(ids); } : undefined}
                        >
                          {/* 펼치기 보기에서 고를 필요가 없는 상태(진행 중 등)는 빈 칸 */}
                          {canSelect(item) && (
                          <div className={`custom-checkbox ${isChecked ? 'checked' : ''}`} role="checkbox" aria-checked={isChecked}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                          )}
                        </td>
                      )}

                      {/* 상태 뱃지 */}
                      {activeTab === 'ALL' && (
                        <td className="td-cell td-status">
                          <span className={`badge-status ${getBadgeTheme(item.status, item.type)}`}>
                            {orderStatusLabel(item.status, item.type)}
                          </span>
                        </td>
                      )}
                      
                      <td className={`td-cell td-product ${selectable ? 'with-checkbox' : ''}`}>
                        <div className="prod-name-box" title={item.productName}>
                          {item.isGroup && (
                            <span className="bundle-group-badge">📦 합포장 {item.bundleItems.length}건</span>
                          )}
                          <span className="prod-name-text">{item.productName}</span>
                          {cartMode && (
                            <span className={`detail-caret ${openDetails.has(item.orderId) ? 'open' : ''}`} aria-hidden="true">
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </span>
                          )}
                          {item.isGroup && !cartMode && (
                            <button
                              className={`btn-bundle-toggle ${expandedGroups.has(item.orderId) ? 'open' : ''}`}
                              onClick={(e) => { e.stopPropagation(); toggleExpand(item.orderId); }}
                              title={expandedGroups.has(item.orderId) ? '접기' : '포함된 상품 보기'}
                            >
                              <span className="btn-bundle-toggle-label">{expandedGroups.has(item.orderId) ? '접기' : '모든 상품 보기'}</span>
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                          )}
                        </div>
                        {/* 🔨 경매 중: 펼치지 않아도 입찰 상태 · 내 입찰가 · 남은 시간이 보이게 */}
                        {cartMode && item.status === ORDER_STATUS.BIDDING ? (
                          <div className="row-hint row-hint-bid">
                            <span className={`bid-chip ${item.bidStatus === 'PENDING' ? 'pending' : item.bidStatus === 'ADDITIONAL' ? 'additional' : item.bidStatus === 'COMPLETED' ? 'completed' : 'default'}`}>
                              {bidStatusLabel(item.bidStatus)}
                            </span>
                            {Number(item.myBidPrice) > 0 && (
                              <span className="bid-meta">내 입찰가 ¥{Number(item.myBidPrice).toLocaleString()}</span>
                            )}
                            {item.auctionEndDate && (
                              timeData.isEnded
                                ? <span className="bid-meta">경매 종료 · 결과 확인 중</span>
                                : <span className={`bid-meta bid-time ${isEndingSoon(item.auctionEndDate) ? 'is-soon' : ''}`}>
                                    {isEndingSoon(item.auctionEndDate) && '⏰ 마감 임박 · '}{timeData.text} 남음
                                  </span>
                            )}
                          </div>
                        ) : cartMode && statusHint(item.status, item.type) && (
                          <div className={`row-hint ${canSelect(item) ? 'is-todo' : ''}`}>{statusHint(item.status, item.type)}</div>
                        )}
                      </td>

                      {isAuctionTab && (
                        <td className="td-cell">
                          <span className={`time-text ${timeData.isEnded ? 'ended' : ''} ${timeData.isUrgent ? 'time-pulse urgent' : ''}`}>
                            {timeData.text}
                          </span>
                        </td>
                      )}

                      {activeTab !== ORDER_STATUS.PAYMENT_REQ && (
                        <td className="td-cell">
                          <div className="price-val">¥ {(item.productPrice || 0).toLocaleString()}</div>
                          {/* 🔨 경매는 이 숫자가 상품 금액이 아닙니다. 무슨 금액인지 밝혀 둡니다. */}
                          {!item.isGroup && amountLabel(item.status) && (
                            <div className="price-kind">{amountLabel(item.status)}</div>
                          )}
                          {/* 🔨 경매 중: 상세를 펼치지 않고 바로 추가 입찰 (마감 전에만) */}
                          {cartMode && item.status === ORDER_STATUS.BIDDING && !timeData.isEnded && (
                            <button type="button" className="btn-row-bid" onClick={(e) => { e.stopPropagation(); handleBidClick(item); }}>
                              🔨 추가 입찰
                            </button>
                          )}
                        </td>
                      )}

                      {isAuctionTab && (
                        <td className="td-cell"><div className="mybid-val">¥ {(item.myBidPrice || 0).toLocaleString()}</div></td>
                      )}

                      {/* 경매 상태 렌더링 */}
                      {activeTab === 'BIDDING' && (
                        <td className="td-cell">
                          <span className={`badge-bid ${item.bidStatus === 'PENDING' ? 'pending' : item.bidStatus === 'ADDITIONAL' ? 'additional' : item.bidStatus === 'COMPLETED' ? 'completed' : 'default'}`}>
                            {bidStatusLabel(item.bidStatus)}
                          </span>
                        </td>
                      )}

                      {showBundleAndRecipientTabs.includes(activeTab) && (
                        <td className="td-cell">
                          {item.address?.recipientName || '미지정'}
                          {item.address?.address && (
                            <span className="recipient-address">({getLastRoadAddressPart(item.address.address)})</span>
                          )}
                        </td>
                      )}
                      {activeTab === ORDER_STATUS.PAYMENT_REQ && (
                        <td className="td-cell font-bold">
                          ₩ {((item.domesticFeeKrw || 0) + (item.intlFeeKrw || 0) + (item.extraFeeKrw || 0)).toLocaleString()}
                          {/* 💴 2차 이후는 추가 결제입니다. 청구 사유는 길어서 이 칸에 넣으면 넘치므로
                              아래 결제 요약 박스에서 보여줍니다. (PaymentSummary) */}
                          {item.feeRound > 1 && <span className="fee-round-note">추가 결제</span>}
                        </td>
                      )}
                      {activeTab === ORDER_STATUS.SHIPPING && <td className="td-cell">{item.trackingNo || '준비중'}</td>}

                      {/* 🛒 장바구니/보증금 대기 상태일 때만 휴지통(삭제) 아이콘 노출 */}
                      {showDeleteCol && (!cartMode || DELETABLE_STATUSES.includes(item.status)) && (
                        <td className="td-cell td-delete-col">
                          {/* e.stopPropagation()으로 삭제 시 행 선택 방지 */}
                          <button className="btn-del-icon" onClick={(e) => { e.stopPropagation(); onDelete(item.orderId); }} title="삭제">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </td>
                      )}
                      {/* 펼치기 보기에서 지울 수 없는 상태는 칸만 비워 줄을 맞춥니다 */}
                      {showDeleteCol && cartMode && !DELETABLE_STATUSES.includes(item.status) && <td className="td-cell td-delete-col" />}
                    </tr>

                    {/* 🔽 펼치기 보기: 누른 상품 바로 아래에 상세 */}
                    {cartMode && openDetails.has(item.orderId) && (
                      <tr className="tr-item-detail">
                        <td className="td-cell td-item-detail" colSpan={colSpan}>
                          <ItemDetail item={item} onDelete={() => onDelete(item.orderId)}
                            auctionTime={item.auctionEndDate ? timeData : undefined}
                            exchangeRate={exchangeRate}
                            paymentFeeRule={paymentFeeRule} agencyFeeRule={agencyFeeRule} />
                        </td>
                      </tr>
                    )}
                    {/* 🌟 합포장 묶음 펼치기: 포함된 상품명/상품가격 표시 */}
                    {item.isGroup && expandedGroups.has(item.orderId) && (
                      <tr className="tr-bundle-detail">
                        <td className="td-cell td-bundle-detail" colSpan={colSpan}>
                          <div className="bundle-detail-list">
                            <div className="bundle-detail-header">
                              <span className="bundle-detail-header-name">상품명</span>
                              <span className="bundle-detail-header-price">상품 금액</span>
                            </div>
                            {item.bundleItems.map((sub: any) => (
                              <div className="bundle-detail-row" key={sub.orderId}>
                                <span className="bundle-detail-name" title={sub.productName}>{truncateText(sub.productName, 50)}</span>
                                <span className="bundle-detail-price">¥ {(sub.productPrice || 0).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* 🌟 경매 중 탭일 때 테이블 하단에 노출되는 추가 입찰 버튼 */}
      {activeTab === 'BIDDING' && (
        <div className="anim-slide-up delay-3" style={{ marginTop: '24px' }}>
          <div className="package-action-group">
            <button 
              className={`btn-package btn-combine ${selectedItems.length === 1 ? 'active' : 'disabled'}`}
              onClick={() => {
                const targetItem = items.find((i: any) => i.orderId === selectedItems[0]);
                if (targetItem) handleBidClick(targetItem);
              }} 
              disabled={selectedItems.length !== 1}
            >
              🔨 선택한 상품 추가 입찰하기
            </button>
          </div>
          {selectedItems.length !== 1 && <p className="bundle-helper" style={{ textAlign: 'right', color: '#ef4444', fontSize: '13px', fontWeight: 600, marginTop: '8px' }}>* 추가 입찰할 상품을 1개만 선택해주세요.</p>}
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. 디자인 영역 (CSS Layer) */}
      {/* ================================================================= */}
      <OrderTableStyles />
    </div>
  );
}

/**
 * 🎨 주문 표 공통 스타일 (.table-container · .premium-table · .th-cell · .td-cell · 뱃지 등)
 *    OrderTable 밖에서 같은 표 모양을 쓰는 곳(예: mypage/status 의 '국제 배송중' 표)도 이 컴포넌트를 함께 렌더링합니다.
 *    예전엔 OrderTable 안에만 있어서, OrderTable 이 화면에 없으면 그 표의 모양이 모두 사라졌습니다.
 */
export function OrderTableStyles() {
  return (
    <style jsx global>{`
        .miku-ordertable-wrapper {
          width: 100%;
          font-family: 'Pretendard', "Noto Sans KR", sans-serif;
        }

        /* 📱 모바일 폴백 메시지 */
        .mobile-fallback {
          display: none;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 10px;
          padding: 10px 16px;
          color: #64748b;
          margin-bottom: 16px;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .mobile-fallback svg { width: 20px; height: 20px; color: #94a3b8; flex-shrink: 0; }
        .mobile-fallback p { font-size: 12px; line-height: 1.4; margin: 0; text-align: left; }

        @media (max-width: 768px) { .mobile-fallback { display: flex; } }

        /* 🌟 테이블 컨테이너 */
        .table-container {
          background: #ffffff;
          border-radius: 22px;
          border: 1px solid rgba(226, 232, 240, 0.75);
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 16px 36px -16px rgba(15, 23, 42, 0.10);
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .premium-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 800px;
        }

        .th-cell {
          padding: 18px 12px;
          background: linear-gradient(180deg, #fafbfc 0%, #f4f6f9 100%);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.2px;
          color: #475569;
          text-align: center;
          border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
        }
        .th-cell:first-child { border-top-left-radius: 22px; }
        .th-cell:last-child { border-top-right-radius: 22px; }

        .td-cell {
          padding: 16px 12px;
          font-size: 14px;
          color: #334155;
          text-align: center;
          vertical-align: middle;
          border-bottom: 1px solid #f1f5f9;
        }
        /* 💴 추가 결제 회차임을 금액 아래에 작게 알려 줍니다. */
        .fee-round-note {
          display: block; margin-top: 3px;
          font-size: 11px; font-weight: 700; color: #c2410c;
        }
        .tr-row { transition: all 0.2s ease; }
        .tr-row.clickable { cursor: pointer; }
        .tr-row:hover { background: #f8fafc; }
        .tr-row.selected { background: linear-gradient(90deg, #fdf4f4 0%, #fffafa 100%); box-shadow: inset 3px 0 0 #c0606a; }

        .empty-row { padding: 60px; text-align: center; color: #94a3b8; font-weight: 600; }

        /* 🌟 상태 컬럼 너비 확보 (글자 겹침 방지) */
        .th-status, .td-status {
          width: 130px !important;
          min-width: 130px !important;
        }

        .th-check, .td-check { width: 55px; min-width: 55px; padding-left: 18px !important; padding-right: 15px !important; }
        .td-check .custom-checkbox { margin: 0; }
        .td-check.can-check { cursor: pointer; }
        .td-check.can-check:hover .custom-checkbox { border-color: #fb7185; }
        .td-product { text-align: left; max-width: 250px; padding-left: 18px; }
        .td-product.with-checkbox { padding-left: 0; }
        .prod-name-box {
          display: flex; align-items: center; min-width: 0;
          font-weight: 700; color: #0f172a;
          padding: 0;
        }
        .prod-name-text {
          flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* 🌟 커스텀 체크박스 */
        .custom-checkbox {
          width: 22px; height: 22px; margin: 0 auto;
          border-radius: 6px; border: 2px solid #cbd5e1;
          background: #ffffff; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .custom-checkbox svg { width: 12px; height: 12px; color: white; opacity: 0; transform: scale(0.5); transition: all 0.2s; }
        .custom-checkbox.checked { border-color: transparent; background: linear-gradient(135deg, #c0606a 0%, #a94a53 100%); box-shadow: 0 2px 6px rgba(169, 74, 83, 0.3); }
        .custom-checkbox.checked svg { opacity: 1; transform: scale(1); }

        /* 🌟 전체내역 상태 뱃지 (고정 크기 적용) */
        .badge-status { 
          display: inline-block;
          width: 105px;
          text-align: center;
          padding: 6px 0; 
          border-radius: 8px; 
          font-size: 12px; 
          font-weight: 800; 
          white-space: nowrap; 
          box-sizing: border-box;
        }
        .badge-status.theme-blue { background: #dbeafe; color: var(--color-blue); box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.15); }
        .badge-status.theme-purple { background: #f3e8ff; color: var(--color-purple); box-shadow: inset 0 0 0 1px rgba(139, 92, 246, 0.15); }
        .badge-status.theme-amber { background: #fef3c7; color: #b45309; box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.25); }
        .badge-status.theme-cyan { background: #cffafe; color: #0e7490; box-shadow: inset 0 0 0 1px rgba(6, 182, 212, 0.22); }
        .badge-status.theme-green { background: #d1fae5; color: var(--color-green); box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.15); }
        .badge-status.theme-orange { background: #ffedd5; color: var(--color-orange); box-shadow: inset 0 0 0 1px rgba(249, 115, 22, 0.15); }
        .badge-status.theme-red { background: #fee2e2; color: var(--color-red); box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.15); }
        .badge-status.theme-indigo { background: #e0e7ff; color: #4338ca; box-shadow: inset 0 0 0 1px rgba(79, 70, 229, 0.2); }
        .badge-status.theme-pink { background: #fce7f3; color: #be185d; box-shadow: inset 0 0 0 1px rgba(219, 39, 119, 0.2); }
        .badge-status.theme-default { background: #f1f5f9; color: #64748b; }

        .badge-bid { padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 800; white-space: nowrap; }
        .badge-bid.pending { background: #fef3c7; color: #d97706; }
        .badge-bid.completed { background: #d1fae5; color: #10b981; }
        .badge-bid.additional { background: #dbeafe; color: #2563eb; }
        .badge-bid.default { background: #f1f5f9; color: #64748b; }

        .price-val { font-weight: 900; color: #0f172a; font-size: 15px; letter-spacing: -0.3px; }
        /* 🔨 이 금액이 무슨 금액인지 (경매: 입찰 희망가 · 낙찰가) */
        .price-kind { margin-top: 2px; font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: -0.2px; }
        .recipient-address { display: block; margin-top: 2px; font-size: 12px; color: #94a3b8; }

        .bundle-group-badge {
          display: inline-flex; align-items: center; gap: 6px;
          height: 24px; padding: 0 12px; margin-right: 8px; flex-shrink: 0;
          border-radius: 999px; background: #a94a53; color: #fff;
          font-size: 12px; font-weight: 800; white-space: nowrap;
        }
        .btn-bundle-toggle {
          display: inline-flex; align-items: center; gap: 4px;
          height: 24px; padding: 0 8px; margin-left: 8px; flex-shrink: 0;
          border: 1px solid #cbd5e1; background: #f1f5f9; border-radius: 6px; cursor: pointer;
          color: #475569; font-size: 11px; font-weight: 700; white-space: nowrap;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }
        .btn-bundle-toggle svg { transition: transform 0.15s ease; }
        .btn-bundle-toggle:hover { background: #e2e8f0; }
        .btn-bundle-toggle.open { background: #fee2e2; border-color: #fda4af; color: #e11d48; }
        .btn-bundle-toggle.open svg { transform: rotate(90deg); }

        .tr-bundle-detail { background: #f8fafc; }
        .td-bundle-detail { padding: 10px 20px !important; }
        .bundle-detail-list { display: flex; flex-direction: column; gap: 6px; }
        .bundle-detail-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 14px; font-size: 14px; font-weight: 700; color: #64748b;
        }
        .bundle-detail-header-name { text-align: left; }
        .bundle-detail-header-price { flex-shrink: 0; margin-left: 12px; }
        .bundle-detail-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
        }
        .bundle-detail-name {
          font-size: 13px; color: #334155; flex: 1; min-width: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          text-align: left;
        }
        .bundle-detail-price { font-size: 13px; font-weight: 800; color: #0f172a; flex-shrink: 0; margin-left: 12px; }
        .mybid-val { font-weight: 900; color: #3b82f6; font-size: 15px; }
        .font-bold { font-weight: 800; }

        /* 🌟 타이머 및 애니메이션 */
        .time-text { font-weight: 700; color: #475569; }
        .time-text.ended { color: #94a3b8; }
        .urgent { color: #ef4444; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .time-pulse { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

        /* 🌟 우측 휴지통(삭제) 버튼 스타일 */
        .th-delete-col { 
          width: 40px; 
          min-width: 40px; 
          padding: 0; 
        }
        .td-delete-col { 
          width: 40px; 
          padding: 0 16px 0 0 !important; 
          text-align: right; 
        }

        .btn-del-icon {
          background: transparent;
          border: none;
          color: #cbd5e1; 
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .btn-del-icon:hover {
          background: #fee2e2;
          color: #ef4444; 
        }

        /* 🌟 입찰 모달 콘텐츠 (.miku-bid-modal) */
        .miku-bid-modal { width: 100%; text-align: left; font-family: 'Pretendard', sans-serif; }
        .prod-name-title { font-size: 14px; color: #64748b; margin: 0 0 24px 0; text-align: center; line-height: 1.5; word-break: keep-all; font-weight: 600; }
        
        .info-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 0 8px; }
        .info-row .label { font-size: 14px; color: #475569; font-weight: 700; }
        .info-row .val { font-size: 16px; font-weight: 800; color: #0f172a; }
        .info-row .val.highlight { font-size: 18px; color: #ef4444; }
        
        .my-bid-row { margin-bottom: 24px; }
        .bid-calc { display: flex; align-items: center; gap: 8px; }
        .old-bid { color: #94a3b8; text-decoration: line-through; font-size: 14px; font-weight: 600; }
        .arrow { color: #cbd5e1; font-weight: 900; }
        .new-bid { color: #3b82f6; font-size: 18px; font-weight: 900; }

        .input-container {
          background: linear-gradient(145deg, #f8faff 0%, #f0f4f8 100%);
          padding: 24px; border-radius: 20px; border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: inset 0 2px 4px rgba(255,255,255,1);
        }
        .input-container label { display: block; font-size: 13px; font-weight: 800; color: #475569; margin-bottom: 12px; }
        .premium-input {
          width: 100%; padding: 16px; border-radius: 14px; border: 1px solid #cbd5e1;
          font-size: 18px; font-weight: 800; color: #0f172a; outline: none; box-sizing: border-box;
          transition: all 0.2s; background: #ffffff;
        }
        .premium-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
        .bid-my-money-info { margin-top: 10px; font-size: 12px; font-weight: 700; color: #64748b; text-align: right; }
        .bid-krw-info { margin-top: 4px; font-size: 12px; font-weight: 700; color: #3b82f6; text-align: right; }
        .premium-input.insufficient { color: #ef4444; }
        .bid-insufficient-warning {
          margin-top: 12px; padding: 10px 12px; border-radius: 10px;
          background: #fef2f2; border: 1.5px solid #fecaca;
          color: #b91c1c; font-size: 13px; font-weight: 800; text-align: center;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }

        /* 애니메이션 */
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        /* ⚠️ .anim-slide-up 은 페이지(status/page.tsx) 것을 씁니다. (global 이라 두 곳에서 정의하면
           이 스타일이 붙거나 떨어질 때 화면 전체 애니메이션이 다시 재생됩니다) */
        /* =====================================================
           🛒 장바구니 보기(cartMode) — 누른 상품 아래 상세 · 모바일 카드
           ===================================================== */
        .detail-caret {
          flex-shrink: 0; margin-left: 8px;
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; border-radius: 7px;
          color: #94a3b8; background: #f1f5f9;
          transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
        }
        .detail-caret.open { transform: rotate(180deg); color: #c0606a; background: #fdf2f2; }
        .tr-row.is-detail-open > td { border-bottom-color: transparent; }
        .tr-item-detail > td { padding: 0 16px 16px !important; background: #fcfcfd; }
        .cart-detail {
          display: flex; gap: 16px; align-items: flex-start;
          padding: 14px 16px; border-radius: 14px;
          background: #ffffff; border: 1px solid #eef1f6;
          box-shadow: 0 8px 20px -18px rgba(15, 23, 42, 0.5);
          text-align: left; cursor: default;
          animation: cartDetailIn 0.22s ease both;
        }
        @keyframes cartDetailIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
        .cart-detail-thumb { width: 72px; height: 72px; border-radius: 12px; object-fit: cover; flex-shrink: 0; border: 1px solid #eef1f6; }
        .cart-detail-list { min-width: 0; margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 20px; }
        .cart-detail-list > div { display: flex; gap: 10px; min-width: 0; font-size: 13px; line-height: 1.5; }
        .cart-detail-list dt { flex-shrink: 0; width: 84px; font-weight: 700; color: #94a3b8; }
        .cart-detail-list dd { margin: 0; min-width: 0; font-weight: 700; color: #334155; word-break: break-all; white-space: pre-line; }
        .cart-detail-actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
        .cart-detail-btn {
          display: inline-flex; align-items: center; justify-content: center;
          height: 34px; padding: 0 14px; border-radius: 10px;
          border: 1px solid #e2e8f0; background: #ffffff; color: #475569;
          font-size: 12.5px; font-weight: 800; text-decoration: none; cursor: pointer; white-space: nowrap;
        }
        .cart-detail-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
        .cart-detail-list .detail-sum { color: #e11d48; font-weight: 900; }
        .cart-detail-list .time-text.urgent { color: #e11d48; }
        .cart-detail-list .time-text.ended { color: #94a3b8; }
        .cart-detail-bundle { list-style: none; margin: 0; padding: 8px 10px; border-radius: 10px; background: #fff7ed; border: 1px solid #fed7aa; display: flex; flex-direction: column; gap: 4px; }
        .cart-detail-bundle li { display: flex; justify-content: space-between; gap: 12px; font-size: 12.5px; color: #475569; }
        .cart-detail-bundle li span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cart-detail-bundle li b { flex-shrink: 0; color: #0f172a; }
        .cart-detail-btn.is-primary { color: #ffffff; border-color: transparent; background: linear-gradient(135deg, #818cf8 0%, #4f46e5 100%); }
        .cart-detail-btn.is-primary:hover { background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%); }
        /* ✋ / ⏳ 펼치기 보기 — 할 일 / 진행 중 묶음 머리 + 상품명 아래 한 줄 안내 */
        .tr-group-head > td { padding: 0 !important; border: 0 !important; }
        .group-head {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          padding: 12px 18px; text-align: left;
          font-size: 13px;
        }
        .tr-group-head.is-todo .group-head { background: linear-gradient(90deg, #fff1f2 0%, #ffffff 80%); border-bottom: 1px solid #ffe4e6; }
        .tr-group-head.is-wait .group-head { background: #f8fafc; border-top: 8px solid #f1f5f9; border-bottom: 1px solid #eef2f7; }
        .group-head-icon { font-size: 14px; }
        .group-head strong { font-size: 14px; font-weight: 900; color: #0f172a; }
        .tr-group-head.is-todo .group-head strong { color: #be123c; }
        .tr-group-head.is-wait .group-head strong { color: #64748b; }
        .group-head-count {
          min-width: 22px; height: 20px; padding: 0 7px; border-radius: 99px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 11.5px; font-weight: 900;
        }
        .tr-group-head.is-todo .group-head-count { color: #ffffff; background: linear-gradient(135deg, #fb7185 0%, #e11d48 100%); }
        .tr-group-head.is-wait .group-head-count { color: #475569; background: #e2e8f0; }
        .group-head-desc { font-size: 12px; font-weight: 600; color: #94a3b8; }
        .row-hint { margin-top: 4px; font-size: 12px; font-weight: 600; color: #94a3b8; text-align: left; }
        .row-hint.is-todo { color: #e11d48; font-weight: 700; }
        /* 🔨 경매 중 줄: [입찰 상태] 내 입찰가 · 남은 시간 */
        .row-hint-bid { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
        .bid-chip { padding: 2px 7px; border-radius: 6px; font-size: 11px; font-weight: 800; white-space: nowrap; }
        .bid-chip.pending { background: #fef3c7; color: #b45309; }
        .bid-chip.completed { background: #d1fae5; color: #047857; }
        .bid-chip.additional { background: #dbeafe; color: #1d4ed8; }
        .bid-chip.default { background: #f1f5f9; color: #64748b; }
        .bid-meta { color: #64748b; font-weight: 700; white-space: nowrap; }
        .bid-meta + .bid-meta::before { content: '·'; margin-right: 8px; color: #cbd5e1; }
        .bid-time.is-soon { color: #e11d48; font-weight: 800; }
        .btn-row-bid {
          display: inline-flex; align-items: center; justify-content: center; gap: 4px;
          margin-top: 6px; padding: 5px 10px; border-radius: 8px; border: 0; cursor: pointer;
          background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%); color: #fff;
          font-size: 11.5px; font-weight: 800; white-space: nowrap;
          box-shadow: 0 4px 10px -4px rgba(99, 102, 241, 0.6);
        }
        .btn-row-bid:hover { filter: brightness(1.05); transform: translateY(-1px); }
        @media (max-width: 768px) {
          .is-cart-mode .tr-group-head { display: block; }
          .is-cart-mode .tr-group-head > td { display: block; }
          .group-head { padding: 10px 12px; }
          .group-head-desc { flex-basis: 100%; }
          .is-cart-mode .row-hint { font-size: 11.5px; }
        }
        .cart-detail-actions:empty { display: none; }
        .cart-detail-btn:hover { background: #f8fafc; }
        .cart-detail-btn.is-danger { color: #e11d48; border-color: #fecdd3; }
        .cart-detail-btn.is-danger:hover { background: #fff1f2; }

        @media (max-width: 768px) {
          /* 장바구니 보기는 모바일에서 가로 스크롤 없이 한 상품 = 두 줄 카드로
               [☑] 상품명 (2줄까지)                 [🗑]
               [☑] [구매 요청]            ¥ 12,345  [🗑]   */
          .is-cart-mode .table-container { overflow: visible; border-radius: 18px; }
          .is-cart-mode .premium-table { min-width: 0; display: block; }
          .is-cart-mode .premium-table thead { display: none; }
          .is-cart-mode .premium-table tbody { display: block; }
          .is-cart-mode .tr-row {
            display: grid; align-items: center;
            grid-template-columns: 40px auto minmax(0, 1fr) 40px;
            grid-template-areas:
              "check name   name  del"
              "check status price del";
            row-gap: 6px; padding: 12px 4px; border-bottom: 1px solid #f1f5f9;
          }
          .is-cart-mode .tr-row > td { display: block; padding: 0 !important; border: 0 !important; width: auto !important; min-width: 0 !important; max-width: none !important; }
          /* 👆 모바일: 왼쪽 칸 전체(위아래 여백 포함)를 체크 영역으로 */
          .is-cart-mode .tr-row > .td-check {
            grid-area: check; justify-self: stretch; align-self: stretch;
            display: flex !important; align-items: center; justify-content: center;
            margin: -12px 0 -12px -4px; padding: 12px 0 12px 4px !important;
          }
          .is-cart-mode .tr-row > .td-status { grid-area: status; }
          .is-cart-mode .tr-row > .td-product { grid-area: name; }
          .is-cart-mode .tr-row > .td-cell:nth-last-child(2) { grid-area: price; justify-self: end; padding-right: 4px !important; }
          .is-cart-mode .tr-row > .td-delete-col { grid-area: del; justify-self: center; }
          .is-cart-mode .badge-status { width: auto; padding: 4px 10px; font-size: 11.5px; }
          .is-cart-mode .prod-name-box { align-items: flex-start; }
          .is-cart-mode .prod-name-text {
            white-space: normal; font-size: 13.5px; line-height: 1.4;
            display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
          }
          .is-cart-mode .price-val { font-size: 15px; }
          .is-cart-mode .tr-item-detail { display: block; }
          .is-cart-mode .tr-item-detail > td { display: block; padding: 0 8px 12px !important; }
          .cart-detail { flex-direction: column; gap: 12px; padding: 12px; }
          .cart-detail-thumb { width: 56px; height: 56px; }
          .cart-detail-list { grid-template-columns: 1fr; width: 100%; }
          .cart-detail-body { width: 100%; }
          .cart-detail-list dt { width: 76px; }
          .cart-detail-actions { flex-direction: row; width: 100%; }
          .cart-detail-actions .cart-detail-btn { flex: 1; height: 38px; }
        }

      `}</style>
  );
}
