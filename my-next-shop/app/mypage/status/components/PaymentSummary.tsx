'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ORDER_STATUS } from '@/src/types/order';
import NoticePanel from '@/app/components/NoticePanel';

interface PaymentSummaryProps {
  activeTab: string;
  totals: {
    product: number;
    transfer: number;
    delivery: number;
    agency: number;
    deposit?: number;
    domestic?: number;
  };
  totalPriceWon: number;
  exchangeRate: number;
  selectedItems: any[];
  handleUpdateStatus: (status: string) => void;
  myMoney: number;
  orders?: any[];
}

// =================================================================
// 1. 비즈니스 로직 영역 (Business Logic Layer)
// =================================================================
function usePaymentSummaryLogic(props: PaymentSummaryProps) {
  const { activeTab, totals, selectedItems, totalPriceWon, orders = [] } = props;

  const isPaymentRequest = activeTab === ORDER_STATUS.PAYMENT_REQ;
  const isBidPending = activeTab === ORDER_STATUS.BID_PENDING;
  const isSingleHighlightMode = isPaymentRequest || isBidPending;

  // 🌟 배송비 요청 탭에서는 같은 bundleId(합포장)로 묶인 선택 항목을 1건으로 집계합니다.
  const selectedCount = useMemo(() => {
    if (!isPaymentRequest) return selectedItems.length;
    const seenBundles = new Set<string>();
    let count = 0;
    selectedItems.forEach((id: string) => {
      const order = orders.find((o: any) => o.orderId === id);
      const bundleId = order?.bundleId;
      if (bundleId) {
        if (seenBundles.has(bundleId)) return;
        seenBundles.add(bundleId);
      }
      count++;
    });
    return count;
  }, [selectedItems, orders, isPaymentRequest]);

  const [feeSettings, setFeeSettings] = useState({ TRANSFER: 450, AGENCY: 100 });

  useEffect(() => {
    const fetchFees = async () => {
      try {
        const res = await fetch('/api/fees');
        const data = await res.json();
        if (data.success && data.fees) {
          const settings = data.fees.reduce((acc: any, fee: any) => {
            acc[fee.feeType] = fee.amount;
            return acc;
          }, {});
          setFeeSettings(prev => ({ ...prev, ...settings }));
        }
      } catch (err) {
        console.error("수수료 데이터를 불러오지 못했습니다. 기본값을 사용합니다.");
      }
    };
    fetchFees();
  }, []);

  const calculatedTotals = useMemo(() => {
    if (!isSingleHighlightMode && selectedItems.length > 0) {
      // 🌟 selectedItems는 선택된 주문의 id 문자열 배열이라 item.domesticShippingFee로 직접
      // 읽으면 항상 undefined(→0)가 되는 버그가 있었습니다. 실제 주문 객체를 기준으로 이미
      // 정확히 합산해둔 부모의 totals.delivery를 그대로 사용합니다.

      // 🌟 구매 요청(CART), 경매 낙찰 성공(BID_SUCCESS) 탭은 부모(status/page.tsx)가
      // admin/estimate와 동일한 계산식으로 이미 정확히 합산해둔 totals.transfer/totals.agency를 그대로 사용합니다.
      if (activeTab === ORDER_STATUS.CART || activeTab === ORDER_STATUS.BID_SUCCESS) {
        return {
          product: totals.product,
          delivery: totals.delivery,
          transfer: totals.transfer,
          agency: totals.agency
        };
      }

      const itemCount = selectedItems.length;
      return {
        product: totals.product,
        delivery: totals.delivery,
        transfer: itemCount * feeSettings.TRANSFER,
        agency: itemCount * feeSettings.AGENCY
      };
    }
    return totals;
  }, [selectedItems, totals, isSingleHighlightMode, feeSettings, activeTab]);

  const getHighlightTitle = () => {
    if (isPaymentRequest) return '청구된 총 배송비';
    if (isBidPending) return '청구된 총 보증금';
    return '';
  };

  const getButtonText = () => {
    if (isPaymentRequest) return `선택한 ${selectedCount}건 배송비 결제하기`;
    if (isBidPending) return `선택한 ${selectedItems.length}건 보증금 결제하기`;

    // 일반 구매 장바구니일 경우
    return `선택한 ${selectedItems.length}건 결제하기`;
  };

  const getTargetStatus = () => {
    if (isPaymentRequest) return ORDER_STATUS.PAYMENT_DONE;
    if (isBidPending) return ORDER_STATUS.BIDDING;
    return ORDER_STATUS.PAID;
  };

  return {
    isSingleHighlightMode,
    isPaymentRequest,
    calculatedTotals,
    getHighlightTitle,
    getButtonText,
    getTargetStatus
  };
}

// =================================================================
// 2. 화면 컴포넌트 영역 (View Layer)
// =================================================================
export default function PaymentSummary(props: PaymentSummaryProps) {
  const { activeTab, totalPriceWon, exchangeRate, selectedItems, handleUpdateStatus, myMoney } = props;
  const {
    isSingleHighlightMode, isPaymentRequest, calculatedTotals, getHighlightTitle, getButtonText, getTargetStatus
  } = usePaymentSummaryLogic(props);

  const hasItems = selectedItems.length > 0;
  // 🌟 구매 요청(CART)과 경매 낙찰 성공(BID_SUCCESS) 탭은 계산식/안내 문구를 동일하게 표시합니다.
  const activeTabIsCart = activeTab === ORDER_STATUS.CART || activeTab === ORDER_STATUS.BID_SUCCESS;

  return (
    <>
    {activeTabIsCart && (
      <NoticePanel tone="amber" className="domestic-fee-notice">
        현지 배송료 발생시 <strong>국제 배송비</strong>에 합산됩니다.
      </NoticePanel>
    )}
    <div className="miku-premium-payment-wrapper anim-slide-up">
      <div className="miku-payment-content-flex">
        
        {isSingleHighlightMode ? (
          <>
            {/* 🌟 배송비 요청 탭 전용: 일본 내 배송비 + 국제 배송비 = 청구된 총 배송비 공식 */}
            {isPaymentRequest && (
              <div className="fee-formula-box">
                <div className="fee-formula-item">
                  <span className="item-label">현지 배송비</span>
                  <span className="item-val">₩ {(calculatedTotals.domestic || 0).toLocaleString()}</span>
                </div>
                <div className="fee-formula-item">
                  <span className="item-label">국제 배송비</span>
                  <span className="item-val">₩ {calculatedTotals.product.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* 🌟 단일 강조 박스 (고급형) */}
            <div className={`single-highlight-box premium-dark-box ${isPaymentRequest ? 'paired' : ''}`}>
              <span className="highlight-title">{getHighlightTitle()}</span>
              <span className="highlight-value">₩ {totalPriceWon.toLocaleString()}</span>
              <span className={`my-money-info ${myMoney < totalPriceWon ? 'insufficient' : ''}`}>
                내 미쿠짱 머니 ₩ {myMoney.toLocaleString()}
              </span>
            </div>
          </>
        ) : (
          /* 🌟 장바구니 요약 정보 그리드 (고급형) */
          <>
            <div className={`detail-grid ${activeTabIsCart ? 'three-cols' : ''}`}>
              <div className="detail-item">
                <span className="item-label">상품 가격</span>
                <span className="item-val">¥ {calculatedTotals.product.toLocaleString()}</span>
              </div>
              {!activeTabIsCart && (
                <div className="detail-item">
                  <span className="item-label">일본내 배송료</span>
                  <span className="item-val">¥ {calculatedTotals.delivery.toLocaleString()}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="item-label">결제 수수료</span>
                <span className="item-val">¥ {calculatedTotals.transfer.toLocaleString()}</span>
              </div>
              <div className="detail-item">
                <span className="item-label">대행 수수료</span>
                <span className="item-val">¥ {calculatedTotals.agency.toLocaleString()}</span>
              </div>
            </div>

            <div className="total-box premium-dark-box">
              <div className="total-text-group">
                <span className="total-label">최종 결제예상액 (원화)</span>
              </div>
              <span className="total-value">₩ {totalPriceWon.toLocaleString()}</span>
              <span className={`my-money-info ${myMoney < totalPriceWon ? 'insufficient' : ''}`}>
                내 미쿠짱 머니 ₩ {myMoney.toLocaleString()}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="payment-action-wrap">
        <button 
          className={`btn-payment premium-btn ${hasItems ? 'active' : 'disabled'} ${isSingleHighlightMode ? 'full-width' : ''}`}
          onClick={() => handleUpdateStatus(getTargetStatus())}
          disabled={!hasItems}
        >
          {getButtonText()}
        </button>
      </div>

      {/* ================================================================= */}
      {/* 3. 디자인 영역 (CSS Layer) - 고급화 & 모바일 초압축 */}
      {/* ================================================================= */}
      <style jsx global>{`
        /* 🌟 전체 래퍼 (Premium 쉐도우 및 부드러운 테두리) */
        .miku-premium-payment-wrapper {
          margin-top: 40px;
          background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
          border-radius: 24px;
          border: 1px solid #f1f5f9;
          padding: 32px 40px;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03), 0 16px 44px -12px rgba(15, 23, 42, 0.10);
          font-family: 'Pretendard', "Noto Sans KR", sans-serif;
          box-sizing: border-box;
        }

        .miku-payment-content-flex {
          display: flex;
          align-items: stretch;
          gap: 20px;
          margin-bottom: 32px;
        }

        /* 🌟 상세 그리드 (은은한 실버 톤 배열) */
        .detail-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: #fafafa;
          border-radius: 20px;
          border: 1px solid #f0f0f0;
          padding: 24px;
          box-sizing: border-box;
          box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.8);
        }
        /* 🌟 구매요청 탭: 일본내 배송료 항목이 빠져 3개 항목만 표시됩니다. */
        .detail-grid.three-cols {
          grid-template-columns: repeat(3, 1fr);
        }

        /* 🌟 구매요청 탭 전용 안내 문구 (현지 배송료는 국제 배송비에 합산) */
        .domestic-fee-notice { margin: 24px 0 8px; }
        /* 🌟 카드(.miku-premium-payment-wrapper)의 margin-top:40px와 마진이 겹쳐(collapse)
           문구의 margin-bottom을 줄여도 간격이 그대로였던 문제를 해결합니다. */
        .domestic-fee-notice + .miku-premium-payment-wrapper {
          margin-top: 28px;
        }

        /* 🌟 배송비 요청 탭: 일본 내 배송비 + 국제 배송비 = 청구된 총 배송비 공식 */
        .fee-formula-box {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          align-items: center;
          background: #fafafa;
          border-radius: 20px;
          border: 1px solid #f0f0f0;
          padding: 24px;
          box-sizing: border-box;
        }
        .fee-formula-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: relative; /* 고급형 구분선 배치를 위한 기준점 */
        }
        /* 🌟 detail-item과 동일한 그라데이션 구분선 효과 */
        .fee-formula-item:not(:last-child)::after {
          content: '';
          position: absolute;
          right: 0;
          top: 15%;
          height: 70%;
          width: 1px;
          background: linear-gradient(to bottom, rgba(229, 231, 235, 0) 0%, rgba(161, 161, 170, 0.4) 50%, rgba(229, 231, 235, 0) 100%);
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: relative; /* 고급형 구분선 배치를 위한 기준점 */
          border-right: none; /* 기존 투박한 테두리 제거 */
        }
        
        /* 🌟 고급스러운 그라데이션 구분선 효과 (위아래 페이드아웃) */
        .detail-item:not(:last-child)::after {
          content: '';
          position: absolute;
          right: 0;
          top: 15%;
          height: 70%;
          width: 1px;
          background: linear-gradient(to bottom, rgba(229, 231, 235, 0) 0%, rgba(161, 161, 170, 0.4) 50%, rgba(229, 231, 235, 0) 100%);
        }
        
        .item-label { font-size: 14px; font-weight: 600; color: #71717a; }
        .item-val { font-size: 20px; font-weight: 800; color: #27272a; letter-spacing: -0.5px; }

        /* 🌟 다크 프리미엄 박스 (최종 금액 & 단일 강조) */
        .premium-dark-box {
          background: linear-gradient(145deg, #18181b 0%, #27272a 100%);
          color: #ffffff;
          border-radius: 20px;
          box-shadow: 0 8px 24px rgba(24, 24, 27, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06);
          position: relative;
          overflow: hidden;
        }
        .premium-dark-box::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
        }

        .total-box {
          width: 340px;
          flex-shrink: 0;
          padding: 24px 28px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-end;
          text-align: right;
          box-sizing: border-box;
        }
        
        .total-text-group {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        
        .total-label { font-size: 14px; font-weight: 600; color: #a1a1aa; }
        .exchange-rate {
          font-size: 11px; font-weight: 700; color: #d4d4d8;
          background: rgba(255, 255, 255, 0.15);
          padding: 4px 10px; border-radius: 100px;
          backdrop-filter: blur(4px);
        }
        .total-value { font-size: 34px; font-weight: 900; color: #ffffff; letter-spacing: -1px; line-height: 1.1; }

        /* 🌟 내 미쿠짱 머니 (잔액이 결제예상액보다 부족하면 붉게 강조) */
        .my-money-info {
          margin-top: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #a1a1aa;
        }
        .my-money-info.insufficient {
          color: #fb7185;
        }

        .single-highlight-box {
          width: 100%;
          padding: 36px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-end; /* 가운데 정렬 -> 우측 정렬로 통일 */
          text-align: right;
          gap: 10px;
          box-sizing: border-box;
        }
        /* 🌟 배송비 요청 탭: 왼쪽에 fee-formula-box가 함께 있을 때는 total-box와 동일한 너비/패딩/폰트 크기로 맞춰
           두 박스의 세로 높이가 완전히 일치하도록 합니다. */
        .single-highlight-box.paired {
          width: 340px;
          flex-shrink: 0;
          padding: 24px 28px;
          gap: 0; /* my-money-info의 margin-top:8px와 중복 적용되어 total-box보다 커지는 문제 방지 */
        }
        .single-highlight-box.paired .highlight-title {
          margin-bottom: 8px; /* total-text-group의 margin-bottom과 동일한 간격 */
        }
        .single-highlight-box.paired .highlight-value {
          font-size: 34px;
        }
        .highlight-title { font-size: 15px; font-weight: 600; color: #a1a1aa; } /* total-label과 동일한 톤 */
        .highlight-value { font-size: 40px; font-weight: 900; color: #ffffff; letter-spacing: -1px; line-height: 1; }

        /* 🌟 고급형 액션 버튼 */
        .payment-action-wrap {
          display: flex;
          width: 100%;
        }

        .btn-payment {
          width: 100% !important; /* 탭에 상관없이 항상 꽉 찬 너비로 통일하여 안정감 부여 */
          padding: 20px;
          font-size: 17px;
          font-weight: 800;
          border-radius: 16px;
          border: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          letter-spacing: -0.5px;
          text-align: center;
        }
        
        /* 비활성화 상태도 조금 더 맑고 고급스러운 톤으로 변경 */
        .btn-payment.disabled { 
          background: #f8fafc; 
          color: #94a3b8; 
          cursor: not-allowed; 
          border: 1px solid #f1f5f9; 
        }
        
        .btn-payment.premium-btn.active {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: #ffffff;
          cursor: pointer;
          box-shadow: 0 8px 24px -4px rgba(234, 88, 12, 0.4);
          border: none;
        }
        
        .btn-payment.premium-btn.active:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px -6px rgba(234, 88, 12, 0.5);
          filter: brightness(1.05);
        }
        .btn-payment.full-width { width: 100%; text-align: center; }

        /* 애니메이션 */
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .anim-slide-up { opacity: 0; animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        /* =============================================================
           📱 모바일 반응형 처리 (초압축 & 고급화 유지)
           ============================================================= */
        @media (max-width: 768px) {
          .miku-premium-payment-wrapper {
            padding: 20px 16px;
            margin-top: 16px;
            border-radius: 20px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.06);
          }
          .domestic-fee-notice + .miku-premium-payment-wrapper {
            margin-top: 20px;
          }

          .miku-payment-content-flex { 
            flex-direction: column; 
            gap: 12px; 
            margin-bottom: 16px; 
          }
          /* 🌟 그리드: 투박한 구분선 제거 & 좌측 정렬로 모던하게 변경 */
          .detail-grid { 
            grid-template-columns: repeat(2, 1fr); 
            padding: 20px 16px; 
            gap: 20px 12px; 
            border-radius: 16px; 
            background: #f8fafc;
            border: none;
          }
          .detail-item { 
            border: none !important; 
            padding: 0; 
            gap: 6px; 
            align-items: flex-start;
          }
          .detail-item::after { display: none; } /* 모바일에서는 구분선 숨김 */
          .item-label { font-size: 12px; color: #64748b; font-weight: 600; }

          .fee-formula-box {
            padding: 16px 12px;
            gap: 8px;
            border-radius: 16px;
            background: #f8fafc;
            border: none;
          }
          .fee-formula-item .item-label { font-size: 11px; }
          .fee-formula-item .item-val { font-size: 15px; }
          .fee-formula-item::after { display: none; } /* 모바일에서는 구분선 숨김 */
          .item-val { font-size: 16px; font-weight: 800; color: #0f172a; }
          
          /* 🌟 최종 결제액 박스: 최신 금융앱처럼 좌우 스플릿 배치 */
          .total-box { 
            width: 100%; 
            padding: 24px 20px; 
            border-radius: 16px; 
            flex-direction: row; /* 모바일에서 가로 배치 */
            justify-content: space-between; 
            align-items: center; 
            text-align: right; 
          }
          .total-text-group { 
            flex-direction: column; /* 라벨과 환율뱃지를 묶어서 좌측에 세로로 배치 */
            align-items: flex-start; 
            margin-bottom: 0; 
            gap: 8px; 
          }
          .total-label { font-size: 13px; color: #a1a1aa; }
          .exchange-rate { padding: 4px 8px; font-size: 11px; margin: 0; }
          .total-value { font-size: 26px; }
          
          /* 🌟 단일 강조 박스: 모바일에서도 total-box와 똑같이 가로 스플릿 배치 */
          .single-highlight-box {
            width: 100%;
            padding: 24px 20px;
            border-radius: 16px;
            flex-direction: row; /* 세로 -> 가로 배치로 변경 */
            justify-content: space-between;
            align-items: center;
            text-align: right;
            gap: 0;
          }
          .highlight-title { font-size: 14px; }
          .highlight-value { font-size: 26px; } /* total-value(26px)와 크기 완벽 통일 */
          
          /* 결제 버튼 */
          .btn-payment { 
            width: 100%; 
            padding: 16px; 
            font-size: 16px; 
            border-radius: 16px; 
          }
        }
      `}</style>
    </div>
    </>
  );
}