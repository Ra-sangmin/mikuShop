"use client";
import React from 'react';
import GuideLayout from '../../components/GuideLayout';
import '../guide-common.css';

export default function DeliveryMethodPage() {
  return (
    <GuideLayout title="배송대행 신청방법" type="guide">
      <div className="guide-page-container">
        <h2 className="guide-title">배송대행 이용 프로세스 <span className="guide-title-icon"><i className="fa fa-truck-fast"></i></span></h2>

        <div className="guide-panel">
        <ul className="step-list">
          <li className="step-item">
            <div className="step-number">1</div>
            <div className="step-content">일본 쇼핑몰에서 상품 구매</div>
          </li>
          <li className="step-item">
            <div className="step-number">2</div>
            <div className="step-content">배송대행 신청서 작성</div>
          </li>
          <li className="step-item">
            <div className="step-number">3</div>
            <div className="step-content">현지 센터 도착 및 검수</div>
          </li>
          <li className="step-item">
            <div className="step-number">4</div>
            <div className="step-content">국제 배송비 결제</div>
          </li>
          <li className="step-item">
            <div className="step-number">5</div>
            <div className="step-content">국제 배송 및 수령</div>
          </li>
        </ul>
        </div>
      </div>
    </GuideLayout>
  );
}
