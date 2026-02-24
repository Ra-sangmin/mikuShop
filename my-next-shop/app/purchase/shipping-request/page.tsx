import React from 'react';
import GuideLayout from '../../components/GuideLayout';

export default function ShippingRequestPage() {
  return (
    <GuideLayout title="국제배송 신청" type="purchase">
      <div style={{ lineHeight: '1.8', color: '#444' }}>
        <p>현지 센터에 도착한 상품의 국제배송을 신청할 수 있습니다.</p>
        <div style={{ marginTop: '30px', padding: '40px', border: '1px dashed #ddd', borderRadius: '8px', textAlign: 'center', color: '#888' }}>
          배송 신청 가능한 상품이 없습니다.
        </div>
      </div>
    </GuideLayout>
  );
}
