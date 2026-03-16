'use client';

import { useEffect } from 'react';
import Script from 'next/script';

export default function MercariLayout({ children }: { children: React.ReactNode }) {
  
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
      {/* 🚀 구글 번역 라이브러리 로드 (함수가 준비된 후 로드되도록 설정) */}
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />

      <style>{`
        /* 번역기 배너 및 툴팁 강제 숨기기 */
        .goog-te-banner-frame.skiptranslate { display: none !important; }
        body { top: 0px !important; }
        .goog-tooltip { display: none !important; }
        .goog-tooltip:hover { display: none !important; }
        .goog-text-highlight { background-color: transparent !important; box-shadow: none !important; }
      `}</style>

      <div id="mercariCategories" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <header style={{
          position: 'sticky', top: 0, zIndex: 100,
          backgroundColor: '#f8f9fa', borderBottom: '1px solid #f3f4f6',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px'
        }}>
          <h2 style={{ margin: 0, fontWeight: 900 }}>메루카리</h2>
          
          {/* 🚀 번역기가 그려질 공간 */}
          <div id="google_translate_element" style={{ minWidth: '160px', minHeight: '40px' }}></div>
        </header>

        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </>
  );
}