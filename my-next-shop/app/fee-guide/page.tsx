import React from 'react';
import GuideLayout from '../components/GuideLayout';

export default function FeeGuidePage() {
  return (
    <GuideLayout title="수수료 안내">
      <div style={{ lineHeight: '1.8', color: '#444' }}>
        <p>미쿠짱의 저렴한 수수료 정책을 안내해 드립니다.</p>
        {/* 상세 수수료 표 등 내용 추가 가능 */}
      </div>
    </GuideLayout>
  );
}
