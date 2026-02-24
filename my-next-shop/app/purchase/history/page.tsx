import React from 'react';
import GuideLayout from '../../components/GuideLayout';

export default function PurchaseHistoryPage() {
  return (
    <GuideLayout title="전체내역" type="purchase">
      <div style={{ lineHeight: '1.8', color: '#444' }}>
        <p>고객님의 구매대행 전체 내역을 확인할 수 있습니다.</p>
        <div style={{ marginTop: '30px', padding: '40px', border: '1px dashed #ddd', borderRadius: '8px', textAlign: 'center', color: '#888' }}>
          주문 내역이 없습니다.
        </div>
      </div>
    </GuideLayout>
  );
}
