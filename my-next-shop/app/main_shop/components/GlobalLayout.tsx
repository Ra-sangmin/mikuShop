'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';

// ==========================================
// 🌟 Props 타입 정의 (구조 변경)
// ==========================================
interface GlobalLayoutProps {
  children: React.ReactNode;
  platformName: string;      // 플랫폼 한글 이름 (메인 제목, 예: 메루카리, 라쿠텐)
  platformDesc: string;      // 플랫폼 한글 설명 (서브 제목, 예: 일본 최대 중고거래 사이트)
  brandColor?: string;       // 포인트 컬러 (기본값: 미쿠짱 레드)
}

// ==========================================
// 🌟 스타일 객체 (함수화하여 동적 컬러 지원)
// ==========================================
const getStyles = (brandColor: string): Record<string, React.CSSProperties> => ({
  container: { display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  header: {
    position: 'sticky',
    top: '71px', 
    zIndex: 90, 
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)'
  },
  headerInner: {
    maxWidth: '2000px', // 🌟 이전 요청대로 2000px 고정
    width: '100%',
    margin: '0 auto',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxSizing: 'border-box'
  },
  logoWrapper: { display: 'flex', alignItems: 'center', gap: '12px' },
  redBar: { width: '6px', height: '24px', backgroundColor: brandColor, borderRadius: '10px' },
  title: { 
    margin: 0, fontWeight: 900, fontSize: '22px', color: '#1a1a1a', // 🌟 한글 이름을 메인으로
    letterSpacing: '-1px', display: 'flex', alignItems: 'center', gap: '8px' 
  },
  subtitle: { fontSize: '14px', fontWeight: 500, color: '#999', letterSpacing: '0' },
  translateBox: { 
    minWidth: '160px', minHeight: '36px', backgroundColor: '#fff',
    borderRadius: '8px', border: '1px solid #eee', padding: '2px 8px',
    display: 'flex', alignItems: 'center', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
  },
  main: { flex: 1, width: '100%' }
});

export default function GlobalLayout({ 
  children, 
  platformName, 
  platformDesc, // 🌟 platformEngName 대신 platformDesc로 변경
  brandColor = '#ff0021'
}: GlobalLayoutProps) {
  
  const styles = getStyles(brandColor);

  useEffect(() => {
    // 🚀 구글 번역 설정 (공통)
    const setTranslateCookie = () => {
      const cookieValue = "/ja/ko";
      document.cookie = `googtrans=${cookieValue}; path=/;`;
      document.cookie = `googtrans=${cookieValue}; path=/; domain=${window.location.hostname};`;
    };

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
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />

      <style>{`
        .goog-te-banner-frame.skiptranslate { display: none !important; }
        body { top: 0px !important; }
        .goog-tooltip, .goog-tooltip:hover { display: none !important; }
        .goog-text-highlight { background-color: transparent !important; box-shadow: none !important; }
      `}</style>

      <div id="globalShoppingLayout" style={styles.container}>
        
        <header style={styles.header}>
          <div style={styles.headerInner}>
            
            {/* 동적 로고 영역 (수정됨) */}
            <div style={styles.logoWrapper}>
              <div style={styles.redBar}></div>
              <h2 style={styles.title}>
                {/* 🌟 이제 한글 이름(MERCARI 대신 메루카리)이 메인 제목이 됩니다. */}
                {platformName} 
                {/* 🌟 이제 플랫폼 설명(공식 수집 대신 일본 최대 중고거래 사이트)이 서브 제목이 됩니다. */}
                <span style={styles.subtitle}>| {platformDesc}</span>
              </h2>
            </div>
            
            {/* 번역기 영역 */}
            <div id="google_translate_element" style={styles.translateBox}></div>

          </div>
        </header>

        <main style={styles.main}>
          {children}
        </main>
      </div>
    </>
  );
}