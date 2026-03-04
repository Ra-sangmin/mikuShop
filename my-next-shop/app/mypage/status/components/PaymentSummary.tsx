"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { ORDER_STATUS } from '@/src/types/order';

// Props 타입을 명확히 정의 (디버깅 편의성)
interface PaymentSummaryProps {
  activeTab: string;
  totals: {
    product: number;
    transfer: number;
    delivery: number; // 🌟 부모가 준 123원이 담긴 곳
    agency: number;
  };
  totalPriceWon: number;
  exchangeRate: number;
  selectedItems: any[];
  handleUpdateStatus: (status: string) => void;
}

export default function PaymentSummary({ 
  activeTab, 
  totals, 
  totalPriceWon, 
  exchangeRate, 
  selectedItems, 
  handleUpdateStatus 
}: PaymentSummaryProps) {
  // 배송비 요청 모드인지 확인
  const isPaymentRequest = activeTab === ORDER_STATUS.PAYMENT_REQ;

  // 🌟 1. DB 수수료 설정을 저장할 상태 (기본값 설정)
  const [feeSettings, setFeeSettings] = useState({
    TRANSFER: 450,
    AGENCY: 100
  });

  // 🌟 2. DB에서 수수료 설정 불러오기
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

  // 🌟 3. 선택된 상품의 실제 DB 필드(domesticShippingFee)를 참조하여 계산
  const calculatedTotals = useMemo(() => {
    if (!isPaymentRequest && selectedItems.length > 0) {
      const itemCount = selectedItems.length;
      
      // 💡 DB의 domesticShippingFee 값을 각각 더함
      const deliveryTotal = selectedItems.reduce((sum: number, item: any) => 
        sum + (Number(item.domesticShippingFee) || 0), 0
      );

      // DB 설정값 기반 수수료 계산
      const transferTotal = itemCount * feeSettings.TRANSFER;
      const agencyTotal = itemCount * feeSettings.AGENCY;
      
      return {
        product: totals.product,
        delivery: deliveryTotal, // 🌟 DB 참조값으로 교체
        transfer: transferTotal,
        agency: agencyTotal
      };
    }
    return totals;
  }, [selectedItems, totals, isPaymentRequest, feeSettings]);

  return (
    <div className="payment-summary-wrap">
      <style jsx>{`
        .payment-summary-wrap {
          margin-top: 40px;
          background-color: #fff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 30px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
        }

        .summary-flex {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
        }

        .sub-items-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          text-align: center;
        }

        /* 🌟 배송비 단일 강조 박스 */
        .single-delivery-box {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px 0;
        }

        .sub-item {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sub-label {
          color: #64748b;
          font-weight: 800;
          font-size: 15px;
        }

        .sub-value {
          color: #1e293b;
          font-weight: 700;
          font-size: 20px;
        }

        .total-box {
          width: 30%;
          min-width: 250px;
          background-color: #fff8f6;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .total-label {
          color: #0f172a;
          font-weight: 900;
          font-size: 16px;
        }

        .total-value {
          color: #ff4b2b;
          font-weight: 900;
          font-size: 28px;
        }

        .exchange-rate {
          color: #94a3b8;
          font-size: 13px;
          font-weight: 700;
        }

        .action-btn-wrap {
          display: flex;
          justify-content: flex-end;
        }

        .action-btn {
          border: none;
          padding: 18px 40px;
          font-size: 18px;
          font-weight: 900;
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: ${isPaymentRequest ? '100%' : 'auto'};
        }
        
        .action-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(255, 75, 43, 0.25) !important;
          background-color: #e63e1c !important;
        }

        @media (max-width: 768px) {
          .summary-flex { flex-direction: column; align-items: stretch; }
          .sub-items-grid { grid-template-columns: repeat(2, 1fr); border-bottom: 1px dashed #e2e8f0; padding-bottom: 20px; }
          .total-box { width: 100%; min-width: 0; }
          .action-btn { width: 100%; }
        }
      `}</style>

      <div className="summary-flex">
        {isPaymentRequest ? (
          <div className="single-delivery-box">
            <span className="sub-label" style={{ color: '#ea580c', fontSize: '18px', marginBottom: '8px' }}>청구된 총 배송비</span>
            <span className="total-value" style={{ fontSize: '40px' }}>
              ₩ {totalPriceWon.toLocaleString()}
            </span>
          </div>
        ) : (
          <>
            <div className="sub-items-grid">
              <div className="sub-item">
                <span className="sub-label">상품 가격</span>
                {/* 🌟 계산된 값(calculatedTotals) 사용 */}
                <span className="sub-value">¥ {calculatedTotals.product.toLocaleString()}</span>
              </div>
              {/* 🌟 핵심 포인트: 부모(page.tsx)에서 계산된 totals.delivery를 직접 출력 */}
              <div className="sub-item">
                <span className="sub-label">일본내 배송료</span>
                <span className="sub-value" >
                   ¥ {totals.delivery.toLocaleString()}
                </span>
              </div>
              <div className="sub-item">
                <span className="sub-label">송금 수수료</span>
                <span className="sub-value">¥ {calculatedTotals.transfer.toLocaleString()}</span>
              </div>
              <div className="sub-item">
                <span className="sub-label">대행 수수료</span>
                <span className="sub-value">¥ {calculatedTotals.agency.toLocaleString()}</span>
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

      <div className="action-btn-wrap">
        <button 
          className="action-btn"
          onClick={() => handleUpdateStatus(
            activeTab === ORDER_STATUS.CART ? ORDER_STATUS.PAID : ORDER_STATUS.PAYMENT_DONE
          )} 
          disabled={selectedItems.length === 0} 
          style={{ 
            backgroundColor: selectedItems.length > 0 ? (isPaymentRequest ? '#ea580c' : '#ff4b2b') : '#cbd5e1', 
            color: '#fff', 
            cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed',
            boxShadow: selectedItems.length > 0 ? '0 4px 12px rgba(255, 75, 43, 0.2)' : 'none'
          }}
        >
          {activeTab === ORDER_STATUS.CART 
            ? `선택상품(${selectedItems.length}건) 결제 하기` 
            : `총 ${totalPriceWon.toLocaleString()}원 배송비 결제하기`}
        </button>
      </div>
    </div>
  );
}