"use client";
import React from 'react';

export default function PaymentSummary({ activeTab, totals, totalPriceWon, exchangeRate, selectedItems, handleUpdateStatus }: any) {
  return (
    <div className="payment-summary-wrap">
      {/* 🌟 결제 요약 영역 전용 반응형 CSS */}
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

        /* 최종 결제액 박스 */
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
        }
        
        .action-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(255, 75, 43, 0.25) !important;
          background-color: #e63e1c !important;
        }

        /* -------------------------------------------
           📱 모바일 레이아웃 최적화 (768px 이하) 
           ------------------------------------------- */
        @media (max-width: 768px) {
          .payment-summary-wrap {
            padding: 20px;
          }
          
          /* 세로로 정렬되도록 변경 */
          .summary-flex {
            flex-direction: column;
            align-items: stretch;
            gap: 20px;
          }
          
          /* 모바일에서는 세부 항목을 2개씩 2줄(2x2 그리드)로 변경 */
          .sub-items-grid {
            grid-template-columns: repeat(2, 1fr); 
            gap: 20px 10px;
            padding-bottom: 20px;
            border-bottom: 1px dashed #e2e8f0;
          }
          
          .sub-label {
            font-size: 13px;
          }
          .sub-value {
            font-size: 16px;
          }
          
          /* 최종 결제 박스를 화면에 꽉 차게 변경 */
          .total-box {
            width: 100%; 
            min-width: 0;
            padding: 20px;
          }
          .total-value {
            font-size: 24px;
          }
          
          /* 결제 버튼도 화면에 꽉 차게 변경 */
          .action-btn-wrap {
            justify-content: center;
          }
          .action-btn {
            width: 100%;
            padding: 16px 20px;
            font-size: 16px;
          }
        }
      `}</style>

      <div className="summary-flex">
        {/* 세부 항목 금액들 */}
        <div className="sub-items-grid">
          <div className="sub-item">
            <span className="sub-label">상품 가격</span>
            <span className="sub-value">¥ {totals.product.toLocaleString()}</span>
          </div>
          <div className="sub-item">
            <span className="sub-label">송금 수수료</span>
            <span className="sub-value">¥ {totals.transfer.toLocaleString()}</span>
          </div>
          <div className="sub-item">
            <span className="sub-label">현지 배송료</span>
            <span className="sub-value">¥ {totals.delivery.toLocaleString()}</span>
          </div>
          <div className="sub-item">
            <span className="sub-label">대행 수수료</span>
            <span className="sub-value">¥ {totals.agency.toLocaleString()}</span>
          </div>
        </div>

        {/* 🌟 최종 결제 예상액 박스 */}
        <div className="total-box">
          <span className="total-label">최종 결제예상액 (원화)</span>
          <span className="total-value">₩ {totalPriceWon.toLocaleString()}</span>
          {activeTab !== '배송비 요청' && (
            <span className="exchange-rate">환율 {exchangeRate} 적용</span>
          )}
        </div>
      </div>

      <div className="action-btn-wrap">
        <button 
          className="action-btn"
          onClick={() => handleUpdateStatus(activeTab === '장바구니' ? '상품 결제 완료' : '배송비 결제 완료')} 
          disabled={selectedItems.length === 0} 
          style={{ 
            backgroundColor: selectedItems.length > 0 ? '#ff4b2b' : '#cbd5e1', 
            color: '#fff', 
            cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed',
            boxShadow: selectedItems.length > 0 ? '0 4px 12px rgba(255, 75, 43, 0.2)' : 'none'
          }}
        >
          {activeTab === '장바구니' ? '선택상품 결제 하기' : '선택상품 배송비 결제하기'}
        </button>
      </div>
    </div>
  );
}