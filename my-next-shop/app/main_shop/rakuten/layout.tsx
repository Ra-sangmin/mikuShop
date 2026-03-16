'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export default function RakutenLayout({ children }: { children: React.ReactNode }) {
  
  useEffect(() => {
    // 🚀 1. 강제 번역 쿠키 설정 (일본어 -> 한국어)
    const setTranslateCookie = () => {
      const cookieValue = "/ja/ko";
      document.cookie = `googtrans=${cookieValue}; path=/;`;
      document.cookie = `googtrans=${cookieValue}; path=/; domain=${window.location.hostname};`;
    };

    // 🚀 2. 초기화 함수를 window에 등록
    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement({
        pageLanguage: 'ja',
        includedLanguages: 'ko',
        layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: true,
      }, 'google_translate_element');
    };

    setTranslateCookie();
  }, []);

  return (
    <>
      {/* 구글 번역 라이브러리 로드 */}
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />

      <style>{`
        /* 번역기 UI 최적화 스타일 */
        .goog-te-banner-frame.skiptranslate { display: none !important; }
        body { top: 0px !important; }
        .goog-tooltip { display: none !important; }
        .goog-text-highlight { background-color: transparent !important; box-shadow: none !important; }
        
        .rakuten-header {
          position: sticky; top: 0; z-index: 100;
          backgroundColor: '#f8f9fa'; borderBottom: '1px solid #f3f4f6';
          display: flex; justifyContent: space-between; alignItems: center;
          padding: 20px 24px;
        }
      `}</style>

      <div id="rakutenCategories" className="category-box" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        
        {/* 상단 헤더 섹션 */}
        <header className="rakuten-header" style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px'
        }}>
          <h2 style={{ margin: 0, fontWeight: 900, color: '#bf0000' }}>
            라쿠텐 <span style={{ fontSize: '14px', color: '#9ca3af', fontWeight: 'normal' }}>RAKUTEN</span>
          </h2>
          
          {/* 🚀 번역기가 그려질 공간 (꼭 필요!) */}
          <div id="google_translate_element" style={{ minWidth: '160px', minHeight: '40px' }}></div>
        </header>

        <main style={{ flex: 1, padding: '20px' }}>
          {children}
        </main>
      </div>
    </>
  );
}