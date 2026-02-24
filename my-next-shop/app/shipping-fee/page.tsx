import React from 'react';
import GuideLayout from '../components/GuideLayout';

export default function ShippingFeePage() {
  return (
    <GuideLayout title="국제배송 요금표">
      <div style={{ lineHeight: '1.8', color: '#444' }}>
        <p>무게별, 배송수단별 국제배송 요금을 안내해 드립니다.</p>
        {/* 배송비 표 등 내용 추가 가능 */}
      </div>
    </GuideLayout>
  );
}
