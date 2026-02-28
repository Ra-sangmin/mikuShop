"use client";
import React from 'react';
import GuideLayout from '../../components/GuideLayout';
import PurchaseFormContainer from '../../components/PurchaseFormContainer';

export default function QuotePage() {
  return (
    // hideSidebar={true}를 유지하여 넓은 화면을 활용합니다.
    <GuideLayout title="견적문의" type="purchase" hideSidebar={true}>
      <div className="quote-container">
        
        {/* 🌟 견적문의 페이지 모바일 최적화 CSS */}
        <style jsx global>{`
          .quote-container {
            max-width: 1000px; /* 폼 요소가 많으므로 약간 넉넉하게 설정 */
            margin: 0 auto;
            width: 100%;
          }

          /* 📱 모바일 대응 (768px 이하) */
          @media (max-width: 768px) {
            .quote-container {
              padding: 0 5px; /* 모바일에서 양끝 여백을 줄여 입력 공간 확보 */
            }
            
            /* 내부 폼 요소들의 폰트나 간격이 PurchaseFormContainer 내부에 정의되어 있다면 
               상위에서 폰트 크기 보정 */
            .quote-container input, 
            .quote-container select, 
            .quote-container textarea {
              font-size: 16px !important; /* iOS 자동 줌 방지 및 가독성 확보 */
            }
          }
        `}</style>

        <PurchaseFormContainer />
      </div>
    </GuideLayout>
  );
}