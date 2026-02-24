import React from 'react';
import GuideLayout from '../../components/GuideLayout';

export default function PurchaseMethodPage() {
  return (
    <GuideLayout title="구매대행 신청방법" type="guide">
      <div style={{ lineHeight: '1.8', color: '#444' }}>
        <p>구매대행 서비스 이용 절차를 상세히 안내해 드립니다.</p>
        <ol style={{ paddingLeft: '20px', marginTop: '20px' }}>
          <li>상품 검색 및 견적 문의</li>
          <li>구매 신청 및 1차 결제</li>
          <li>현지 구매 및 현지 배송</li>
          <li>현지 센터 도착 및 검수</li>
          <li>국제 배송비 2차 결제</li>
          <li>국제 배송 및 수령</li>
        </ol>
      </div>
    </GuideLayout>
  );
}
