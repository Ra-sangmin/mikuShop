'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ORDER_STATUS } from '@/src/types/order';

interface PaymentSummaryProps {
  activeTab: string;
  totals: {
    product: number;
    transfer: number;
    delivery: number; // 🌟 부모가 준 123원이 담긴 곳
    agency: number;
    deposit?: number; // 🌟 경매 보증금
  };
  totalPriceWon: number;
  exchangeRate: number;
  selectedItems: any[];
  handleUpdateStatus: (status: string) => void;
}

// =================================================================
// 1. 비즈니스 로직 영역 (Business Logic Layer)
// DB 수수료 로드, 금액 계산, 상태별 동적 텍스트 반환 등 순수 기능 전담
// =================================================================
function usePaymentSummaryLogic(props: PaymentSummaryProps) {
  const { activeTab, totals, selectedItems, totalPriceWon } = props;

  const isPaymentRequest = activeTab === ORDER_STATUS.PAYMENT_REQ;
  const isBidPending = activeTab === ORDER_STATUS.BID_PENDING;
  const isSingleHighlightMode = isPaymentRequest || isBidPending;

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
      const itemCount = selectedItems.length;
      
      const deliveryTotal = selectedItems.reduce((sum: number, item: any) => 
        sum + (Number(item.domesticShippingFee) || 0), 0
      );

      return {
        product: totals.product,
        delivery: deliveryTotal, // DB 참조값 적용
        transfer: itemCount * feeSettings.TRANSFER,
        agency: itemCount * feeSettings.AGENCY
      };
    }
    return totals;
  }, [selectedItems, totals, isSingleHighlightMode, feeSettings]);

  const getHighlightTitle = () => {
    if (isPaymentRequest) return '청구된 총 배송비';
    if (isBidPending) return '청구된 총 보증금';
    return '';
  };

  const getButtonText = () => {
    if (isPaymentRequest) return `총 ${totalPriceWon.toLocaleString()}원 배송비 결제하기`;
    if (isBidPending) return `총 ${totalPriceWon.toLocaleString()}원 보증금 결제하기`;
    return `선택상품(${selectedItems.length}건) 결제 하기`;
  };

  const getTargetStatus = () => {
    if (isPaymentRequest) return ORDER_STATUS.PAYMENT_DONE;
    if (isBidPending) return ORDER_STATUS.BIDDING;
    return ORDER_STATUS.PAID;
  };

  return {
    isSingleHighlightMode,
    calculatedTotals,
    getHighlightTitle,
    getButtonText,
    getTargetStatus
  };
}

// =================================================================
// 2. 화면 컴포넌트 영역 (View Layer)
// 불필요한 인라인 스타일 제거 및 직관적인 클래스명 배치
// =================================================================
export default function PaymentSummary(props: PaymentSummaryProps) {
  const { totalPriceWon, exchangeRate, selectedItems, handleUpdateStatus } = props;
  const { 
    isSingleHighlightMode, calculatedTotals, getHighlightTitle, getButtonText, getTargetStatus 
  } = usePaymentSummaryLogic(props);

  const hasItems = selectedItems.length > 0;

  return (
    <div className="miku-payment-wrapper anim-slide-up">
      <div className="miku-payment-content-flex">
        
        {isSingleHighlightMode ? (
          /* 🌟 배송비 요청 / 경매 요청 (단일 강조 박스) */
          <div className="single-highlight-box">
            <span className="highlight-title">{getHighlightTitle()}</span>
            <span className="highlight-value">₩ {totalPriceWon.toLocaleString()}</span>
          </div>
        ) : (
          /* 🌟 장바구니 등 다중 요약 정보 그리드 */
          <>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="item-label">상품 가격</span>
                <span className="item-val">¥ {calculatedTotals.product.toLocaleString()}</span>
              </div>
              <div className="detail-item">
                <span className="item-label">일본내 배송료</span>
                <span className="item-val">¥ {calculatedTotals.delivery.toLocaleString()}</span>
              </div>
              <div className="detail-item">
                <span className="item-label">송금 수수료</span>
                <span className="item-val">¥ {calculatedTotals.transfer.toLocaleString()}</span>
              </div>
              <div className="detail-item">
                <span className="item-label">대행 수수료</span>
                <span className="item-val">¥ {calculatedTotals.agency.toLocaleString()}</span>
              </div>
            </div>

            <div className="total-box">
              <span className="total-label">최종 결제예상액 (원화)</span>
              <span className="total-value">₩ {totalPriceWon.toLocaleString()}</span>
              <span className="exchange-rate">환율 {exchangeRate} 적용</span>
            </div>
          </>
        )}
      </div>

      <div className="payment-action-wrap">
        <button 
          className={`btn-payment ${hasItems ? 'active' : 'disabled'} ${isSingleHighlightMode ? 'full-width' : ''}`}
          onClick={() => handleUpdateStatus(getTargetStatus())}
          disabled={!hasItems}
        >
          {getButtonText()}
        </button>
      </div>

      {/* ================================================================= */}
      {/* 3. 디자인 영역 (CSS Layer) */}
      {/* 글로벌 오염 방지를 위해 .miku-payment- 네임스페이스 사용 */}
      {/* ================================================================= */}
      <style jsx global>{`
        .miku-payment-wrapper {
          margin-top: 40px;
          background-color: #ffffff;
          border-radius: 24px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          padding: 32px 40px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
          font-family: 'Pretendard', "Noto Sans KR", sans-serif;
          box-sizing: border-box;
        }

        .miku-payment-content-flex {
          display: flex;
          align-items: stretch;
          gap: 24px;
          margin-bottom: 32px;
        }

        /* 🌟 상세 그리드 (항목별 비용 내역) */
        .detail-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: #f8fafc;
          border-radius: 20px;
          border: 1px solid #f1f5f9;
          padding: 24px;
          box-sizing: border-box;
        }
        
        .detail-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-right: 1px dashed #cbd5e1;
        }
        .detail-item:last-child { border-right: none; }
        
        .item-label { font-size: 14px; font-weight: 800; color: #64748b; }
        .item-val { font-size: 20px; font-weight: 900; color: #0f172a; }

        /* 🌟 최종 결제액 강조 박스 */
        .total-box {
          width: 320px;
          flex-shrink: 0;
          background: #fff8f6;
          border-radius: 20px;
          border: 1px solid #ffedd5;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }
        
        .total-label { font-size: 15px; font-weight: 800; color: #ea580c; margin-bottom: 6px; }
        .total-value { font-size: 32px; font-weight: 900; color: #ff4b2b; line-height: 1.2; }
        .exchange-rate {
          font-size: 12px; font-weight: 800; color: #f97316;
          background: #ffedd5; padding: 4px 12px; border-radius: 100px; margin-top: 8px;
        }

        /* 🌟 단일 강조 박스 (배송비, 보증금 전용) */
        .single-highlight-box {
          width: 100%;
          background: #fff8f6;
          border-radius: 20px;
          border: 1px solid #ffedd5;
          padding: 40px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 12px;
        }
        .highlight-title { font-size: 18px; font-weight: 800; color: #ea580c; }
        .highlight-value { font-size: 48px; font-weight: 900; color: #ff4b2b; line-height: 1; }

        /* 🌟 액션 버튼 */
        .payment-action-wrap {
          display: flex;
          justify-content: flex-end;
        }
        .btn-payment {
          padding: 18px 48px;
          font-size: 18px;
          font-weight: 900;
          border-radius: 16px;
          border: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-payment.disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }
        .btn-payment.active {
          background: linear-gradient(135deg, #ff4b2b 0%, #e63e1f 100%);
          color: #ffffff;
          cursor: pointer;
          box-shadow: 0 8px 20px -4px rgba(255, 75, 43, 0.3);
        }
        .btn-payment.active:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -6px rgba(255, 75, 43, 0.4);
        }
        .btn-payment.full-width { width: 100%; text-align: center; }

        /* 애니메이션 */
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .anim-slide-up { opacity: 0; animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        /* =============================================================
           📱 모바일 반응형 처리
           ============================================================= */
        @media (max-width: 768px) {
          .miku-payment-wrapper { padding: 24px 20px; border-radius: 20px; }
          .miku-payment-content-flex { flex-direction: column; gap: 16px; }
          
          .detail-grid { grid-template-columns: repeat(2, 1fr); padding: 20px; gap: 20px 0; }
          .detail-item { border-right: none; padding: 12px 0; border-bottom: 1px dashed #cbd5e1; }
          .detail-item:nth-last-child(-n+2) { border-bottom: none; padding-bottom: 0; }
          .item-label { font-size: 13px; }
          .item-val { font-size: 18px; }
          
          .total-box { width: 100%; padding: 24px 20px; }
          .total-label { font-size: 14px; }
          .total-value { font-size: 28px; }
          
          .highlight-value { font-size: 36px; }
          
          .btn-payment { width: 100%; text-align: center; padding: 16px; font-size: 16px; }
        }
      `}</style>
    </div>
  );
}