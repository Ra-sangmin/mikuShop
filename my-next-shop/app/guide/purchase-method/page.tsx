"use client";
import React from 'react';
import GuideLayout from '../../components/GuideLayout';

export default function PurchaseMethodPage() {
  return (
    <GuideLayout title="구매대행 신청방법" type="guide">
      <style jsx>{`
        .guide-container {
          color: #334155;
        }

        .guide-title {
          font-size: 24px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 12px;
        }

        .guide-desc {
          font-size: 16px;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 40px;
          word-break: keep-all;
        }

        /* 🌟 스텝 리스트 디자인 */
        .step-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 0;
          margin: 0;
          list-style: none;
        }

        .step-item {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          background-color: #f8fafc;
          padding: 24px 30px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .step-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.03);
          border-color: #cbd5e1;
          background-color: #fff;
        }

        /* 번호 뱃지 */
        .step-number {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background-color: #ff4b2b;
          color: #fff;
          font-weight: 900;
          border-radius: 50%;
          flex-shrink: 0;
          font-size: 18px;
          box-shadow: 0 4px 10px rgba(255, 75, 43, 0.2);
        }

        .step-content {
          padding-top: 6px;
          font-size: 18px;
          font-weight: 800;
          color: #1e293b;
        }

        /* -------------------------------------------
           📱 모바일 레이아웃 조정 (768px 이하 스마트폰) 
           ------------------------------------------- */
        @media (max-width: 768px) {
          .guide-title {
            font-size: 20px;
          }
          
          .guide-desc {
            font-size: 14px;
            margin-bottom: 30px;
          }

          .step-list {
            gap: 12px;
          }

          .step-item {
            padding: 18px 20px;
            gap: 16px;
            border-radius: 12px;
          }

          .step-number {
            width: 30px;
            height: 30px;
            font-size: 15px;
          }

          .step-content {
            padding-top: 3px;
            font-size: 15px;
          }
        }
      `}</style>

      <div className="guide-container">
        <h2 className="guide-title">구매대행 이용 프로세스</h2>
        <p className="guide-desc">미쿠짱의 쉽고 빠른 구매대행 서비스 이용 절차를 상세히 안내해 드립니다.</p>
        
        <ul className="step-list">
          <li className="step-item">
            <div className="step-number">1</div>
            <div className="step-content">상품 검색 및 견적 문의</div>
          </li>
          <li className="step-item">
            <div className="step-number">2</div>
            <div className="step-content">구매 신청 및 1차 결제</div>
          </li>
          <li className="step-item">
            <div className="step-number">3</div>
            <div className="step-content">현지 구매 및 현지 배송</div>
          </li>
          <li className="step-item">
            <div className="step-number">4</div>
            <div className="step-content">현지 센터 도착 및 검수</div>
          </li>
          <li className="step-item">
            <div className="step-number">5</div>
            <div className="step-content">국제 배송비 2차 결제</div>
          </li>
          <li className="step-item">
            <div className="step-number">6</div>
            <div className="step-content">국제 배송 및 수령</div>
          </li>
        </ul>
      </div>
    </GuideLayout>
  );
}