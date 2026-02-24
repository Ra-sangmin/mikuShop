import React from 'react';
import GuideLayout from '../../components/GuideLayout';

export default function FAQPage() {
  return (
    <GuideLayout title="자주하는 질문" type="guide">
      <div style={{ lineHeight: '1.8', color: '#444' }}>
        <p>자주 묻는 질문들에 대한 답변을 정리해 드립니다.</p>
        <div style={{ marginTop: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Q. 배송기간은 얼마나 걸리나요?</h3>
            <p>A. 평균적으로 현지 배송 2~3일, 국제 배송 3~5일 정도 소요됩니다.</p>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Q. 배송비는 어떻게 계산되나요?</h3>
            <p>A. 상품의 무게와 부피 중 큰 것을 기준으로 배송비가 책정됩니다.</p>
          </div>
        </div>
      </div>
    </GuideLayout>
  );
}
