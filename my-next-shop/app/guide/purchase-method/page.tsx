"use client";
import React from 'react';
import GuideLayout from '../../components/GuideLayout';
import '../guide-common.css';

export default function PurchaseMethodPage() {
  return (
    <GuideLayout title="구매대행 신청방법" type="guide">
      <div className="guide-page-container">
        <h2 className="guide-title">구매대행 이용 프로세스 <span className="guide-title-icon"><i className="fa fa-cart-shopping"></i></span></h2>

        <div className="guide-panel">
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
      </div>
    </GuideLayout>
  );
}
