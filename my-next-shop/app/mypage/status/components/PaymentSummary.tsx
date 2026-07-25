'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ORDER_STATUS } from '@/src/types/order';

interface PaymentSummaryProps {
  activeTab: string;
  totals: {
    product: number;
    transfer: number;
    delivery: number;
    agency: number;
    deposit?: number;
  };
  totalPriceWon: number;
  exchangeRate: number;
  selectedItems: any[];
  handleUpdateStatus: (status: string) => void;
}

// =================================================================
// 1. 비즈니스 로직 영역 (Business Logic Layer)
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
        delivery: deliveryTotal,
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
    if (isPaymentRequest) return `선택한 ${selectedItems.length}건 배송비 결제하기`;
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
  const { totalPriceWon, exchangeRate, selectedItems, handleUpdateStatus } = props;
  const { 
    isSingleHighlightMode, calculatedTotals, getHighlightTitle, getButtonText, getTargetStatus 
  } = usePaymentSummaryLogic(props);

  const hasItems = selectedItems.length > 0;

  return (
    <div className="miku-premium-payment-wrapper anim-slide-up">
      <div className="miku-payment-content-flex">
        
        {isSingleHighlightMode ? (
          /* 🌟 단일 강조 박스 (고급형) */
          <div className="single-highlight-box premium-dark-box">
            <span className="highlight-title">{getHighlightTitle()}</span>
            <span className="highlight-value">₩ {totalPriceWon.toLocaleString()}</span>
          </div>
        ) : (
          /* 🌟 장바구니 요약 정보 그리드 (고급형) */
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

            <div className="total-box premium-dark-box">
              <div className="total-text-group">
                <span className="total-label">최종 결제예상액 (원화)</span>
              </div>
              <span className="total-value">₩ {totalPriceWon.toLocaleString()}</span>
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
          background-color: #ffffff;
          border-radius: 24px;
          border: 1px solid #f1f5f9;
          padding: 32px 40px;
          box-shadow: 0 12px 40px rgba(15, 23, 42, 0.06);
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
          box-shadow: 0 8px 24px rgba(24, 24, 27, 0.15);
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
  );
}