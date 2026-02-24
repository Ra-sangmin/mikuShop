import React from 'react';
import GuideLayout from '../../components/GuideLayout';

export default function DeliveryMethodPage() {
  return (
    <GuideLayout title="배송대행 신청방법" type="guide">
      <div style={{ lineHeight: '1.8', color: '#444' }}>
        <p>배송대행 서비스 이용 절차를 상세히 안내해 드립니다.</p>
        <ol style={{ paddingLeft: '20px', marginTop: '20px' }}>
          <li>일본 쇼핑몰에서 상품 구매</li>
          <li>배송대행 신청서 작성</li>
          <li>현지 센터 도착 및 검수</li>
          <li>국제 배송비 결제</li>
          <li>국제 배송 및 수령</li>
        </ol>
      </div>
    </GuideLayout>
  );
}
