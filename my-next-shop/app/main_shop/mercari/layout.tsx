// src/app/layout.tsx
import Script from 'next/script'; 

export const metadata = {
  title: '미쿠짱 구매대행',
  description: '일본 직구 및 외주 서비스',
};

export default function MercariLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* 1. 구글 번역 실행 스크립트 */}
      <Script id="google-translate-init" strategy="afterInteractive">
        {`
          function googleTranslateElementInit() {
            new google.translate.TranslateElement({
              pageLanguage: 'ja',
              layout: google.translate.TranslateElement.InlineLayout.SIMPLE
            }, 'google_translate_element');
          }
        `}
      </Script>
      {/* 2. 구글 번역 외부 라이브러리 로드 */}
      <Script 
        src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" 
        strategy="afterInteractive" 
      />

      {/* 📱 모바일 반응형을 위한 내부 CSS */}
      <style>{`
        .mercari-header {
          padding: 20px 24px;
        }
        .mercari-title {
          font-size: 24px;
        }
        
        /* 화면 가로폭이 768px 이하(스마트폰/태블릿)일 때 적용되는 스타일 */
        @media (max-width: 768px) {
          .mercari-header {
            padding: 16px 16px; /* 모바일에서는 좌우 여백을 줄여 공간 확보 */
          }
          .mercari-title {
            font-size: 20px !important; /* 모바일에서는 제목 크기를 살짝 축소 */
          }
        }
      `}</style>

      <div id="mercariCategories" className="category-box" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        backgroundColor: '#f8f9fa' 
      }}>
        
        {/* 상단 고정 헤더 */}
        <div className="mercari-header" style={{
          position: 'sticky',
          top: 0,
          zIndex: 10, 
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          // 아이폰 하단 바 등 안전 영역 고려
          paddingTop: 'max(20px, env(safe-area-inset-top))', 
        }}>
          <h2 className="mercari-title" style={{ 
            margin: 0, 
            fontWeight: 900, 
            color: '#1f2937',
            letterSpacing: '-0.02em' 
          }}>
            메루카리
          </h2>
          
          {/* 구글 번역기 버튼이 들어갈 자리 (필요시 활성화) */}
          {/* <div id="google_translate_element"></div> */}
        </div>

        {/* 본문 영역 */}
        <div style={{ flex: 1, paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {children}
        </div>
      </div>
    </>
  );
}