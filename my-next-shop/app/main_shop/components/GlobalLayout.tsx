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
    position: 'fixed',
    top: '84px',
    left: 0,
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
  // 🌟 예전엔 여기에 흰 배경/테두리/그림자가 있는 박스 스타일이 있었는데, 구글 번역
  // 스크립트가 로드되기 전(또는 실패했을 때)엔 안이 빈 채로 그 테두리만 "네모 이미지"처럼
  // 보였습니다. 번역 위젯 자체(일본어 상품명 → 한국어 번역)는 계속 쓰는 기능이라 컨테이너는
  // 남겨두고, 위젯이 실제로 렌더링되기 전까지는 아무 것도 안 보이도록 박스 모양만 없앴습니다.
  translateBox: { display: 'flex', alignItems: 'center' },
  main: { flex: 1, width: '100%', paddingTop: '61px' }
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

      {/* 🌟 구글 번역 위젯 CSS 4줄은 app/globals.css의 "Google Translate Fix" 섹션과
          완전히 겹쳐서(2줄은 글자 그대로 동일, 2줄은 새로 추가) 그쪽으로 합쳤습니다.
          globals.css는 항상 로드되므로 여기서 따로 다시 선언할 필요가 없습니다. */}
      <style>{`
        @media (max-width: 768px) {
          .global-shop-header { top: 89px !important; }
          .global-shop-main { padding-top: 51px !important; }
          .global-shop-header-inner { padding: 10px 12px !important; gap: 8px; }
          .global-shop-logo { min-width: 0; flex: 1; gap: 8px !important; margin-left: 36px; }
          .global-shop-title { min-width: 0; white-space: nowrap; font-size: 20px !important; letter-spacing: -1.2px !important; gap: 5px !important; }
          .global-shop-subtitle { min-width: 0; white-space: nowrap; font-size: 11px !important; }
          .global-shop-translate { display: none !important; }
        }
      `}</style>

      <div id="globalShoppingLayout" style={styles.container}>
        
        <header className="global-shop-header" style={styles.header}>
          <div className="global-shop-header-inner" style={styles.headerInner}>
            
            {/* 동적 로고 영역 (수정됨) */}
            <div className="global-shop-logo" style={styles.logoWrapper}>
              <div style={styles.redBar}></div>
              <h2 className="global-shop-title" style={styles.title}>
                {/* 🌟 이제 한글 이름(MERCARI 대신 메루카리)이 메인 제목이 됩니다. */}
                {platformName} 
                {/* 🌟 이제 플랫폼 설명(공식 수집 대신 일본 최대 중고거래 사이트)이 서브 제목이 됩니다. */}
                <span className="global-shop-subtitle" style={styles.subtitle}>| {platformDesc}</span>
              </h2>
            </div>
            
            {/* 번역기 영역 */}
            <div id="google_translate_element" className="global-shop-translate" style={styles.translateBox}></div>

          </div>
        </header>

        <main className="global-shop-main" style={styles.main}>
          {children}
        </main>
      </div>
    </>
  );
}