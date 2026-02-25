// src/app/layout.tsx
import './globals.css'; // 기존 style.css 내용을 여기에 통합
import Script from 'next/script'; // Next.js 전용 스크립트 컴포넌트 사용

export const metadata = {
  title: '미쿠짱 구매대행',
  description: '일본 직구 및 외주 서비스',
};

export default function RakutenLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* 1. 구글 번역 실행 스크립트 (dangerouslySetInnerHTML 사용) */}
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

      <div id="rakutenCategories" className="category-box" style={{ flex: 1 }}>
        <div className="page-title-container">
          <h2>라쿠텐</h2>
        </div>
        {children}
      </div>
    </>
  );
}
