import React from 'react';
import GuideLayout from '../../components/GuideLayout';

export default function DeliveryRequestPage() {
  return (
    <GuideLayout title="배송신청" type="delivery" hideSidebar={true}>
      <div style={{ lineHeight: '1.8', color: '#444' }}>
        <p>일본 쇼핑몰에서 직접 구매하신 상품의 배송대행을 신청합니다.</p>
        <div style={{ marginTop: '30px', padding: '40px', border: '1px dashed #ddd', borderRadius: '8px', textAlign: 'center', color: '#888' }}>
          현재 배송 신청 서비스 준비 중입니다.
        </div>
      </div>
    </GuideLayout>
  );
}
