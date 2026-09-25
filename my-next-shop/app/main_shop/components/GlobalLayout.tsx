'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { GlobalSearchProvider, useGlobalSearch } from './GlobalSearchContext';
import { getShopThemeByColor, shopThemeVars } from './shopTheme';
import { AiSparkle } from '@/app/components/ai-search/AiBotMark';
import { formatPriceRange } from '@/lib/ai-search/types';
import type { Mall } from '@/lib/ai-search/types';

// ==========================================
// 🌟 Props 타입 정의 (구조 변경)
// ==========================================
interface GlobalLayoutProps {
  children: React.ReactNode;
  platformName: string;      // 플랫폼 한글 이름 (메인 제목, 예: 메루카리, 라쿠텐)
  platformDesc: string;      // 플랫폼 한글 설명 (서브 제목, 예: 일본 최대 중고거래 사이트)
  brandColor?: string;       // 포인트 컬러 (기본값: 미쿠짱 레드)
  logoSrc?: string;          // 제목 왼쪽 로고 이미지 (/public 기준 경로, 예: /images/rakuten_logo.png)
  mall?: Mall;               // 🤖 이 몰 전용 AI 검색 버튼을 헤더에 띄웁니다 (없으면 숨김)
}

// ==========================================
// 🌟 레이아웃 스타일 (헤더 패널 디자인은 아래 <style>의 .gsh-* 클래스에서 처리)
// ⚠️ 패널은 사이트 헤더(.miku-header-wrapper) 바로 아래에 붙습니다. 사이트 헤더 높이는
//    화면 폭·스크롤 상태에 따라 약 84~101px로 바뀌므로 실제 높이를 측정해 top에 반영합니다.
//    (예전엔 top: 84px 고정이라, 스크롤 전 데스크탑에서 패널 윗부분이 헤더에 가려졌습니다.)
//    패널 높이(약 61px)는 main의 paddingTop(61px)과 맞춰져 있습니다.
// ==========================================
const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  main: { flex: 1, width: '100%', paddingTop: '61px' },
};

export default function GlobalLayout({ 
  children, 
  platformName, 
  platformDesc, // 🌟 platformEngName 대신 platformDesc로 변경
  brandColor = '#ff0021',
  logoSrc,
  mall,
}: GlobalLayoutProps) {
  // 🌟 사이트 헤더의 실제 높이 → 패널 top
  const [siteHeaderHeight, setSiteHeaderHeight] = useState<number | null>(null);
  // 🌟 스크롤 전(맨 위) 상태의 헤더 아래쪽 좌표. 데스크탑 헤더는 스크롤하면 축약되어 위 값이 계속
  // 변하는데, 본문 시작 위치(padding-top)까지 그 값을 따라가면 스크롤 중 콘텐츠가 튀므로 여기엔
  // 맨 위에서 잰 값만 씁니다.
  const [topHeaderBottom, setTopHeaderBottom] = useState<number | null>(null);
  useEffect(() => {
    const headerEl = document.querySelector('.miku-header-wrapper') as HTMLElement | null;
    if (!headerEl) return;
    const update = () => {
      // 헤더의 화면상 아래쪽 좌표(높이 + 위쪽 오프셋)를 그대로 패널 top으로 씁니다.
      const bottom = headerEl.getBoundingClientRect().bottom;
      if (bottom > 0) setSiteHeaderHeight(Math.ceil(bottom));
      if (bottom > 0 && window.scrollY < 8) setTopHeaderBottom(Math.ceil(bottom));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(headerEl);
    window.addEventListener('resize', update);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, []);

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
    <GlobalSearchProvider>
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />

      {/* 🌟 구글 번역 위젯 CSS 4줄은 app/globals.css의 "Google Translate Fix" 섹션과
          완전히 겹쳐서(2줄은 글자 그대로 동일, 2줄은 새로 추가) 그쪽으로 합쳤습니다.
          globals.css는 항상 로드되므로 여기서 따로 다시 선언할 필요가 없습니다. */}
      <style>{`
        /* 🌟 쇼핑몰 상단 패널 (제목 + 통합 검색) */
        .global-shop-header {
          position: fixed; top: var(--gsh-top, 84px); left: 0; z-index: 90;
          width: 100%;
          display: flex; justify-content: center;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(255, 255, 255, 0.86) 100%);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          box-shadow: 0 10px 24px -20px rgba(15, 23, 42, 0.35);
        }
        /* 하단에 은은한 브랜드 컬러 라인 */
        .global-shop-header::after {
          content: '';
          position: absolute; left: 0; right: 0; bottom: -1px; height: 2px;
          background: linear-gradient(90deg, transparent 0%, var(--gsh-brand) 20%, var(--gsh-brand) 45%, transparent 85%);
          opacity: 0.35;
          pointer-events: none;
        }
        .global-shop-header-inner {
          max-width: 2000px; width: 100%; margin: 0 auto;
          padding: 10px 24px;
          display: flex; justify-content: space-between; align-items: center; gap: 16px;
          box-sizing: border-box;
        }

        .global-shop-logo { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .gsh-logo-tile {
          width: 40px; height: 40px; flex-shrink: 0;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.07);
          box-shadow: 0 6px 14px -8px var(--gsh-shadow), inset 0 1px 0 #ffffff;
          display: flex; align-items: center; justify-content: center;
          padding: 6px; box-sizing: border-box;
          overflow: hidden;
        }
        .gsh-logo-tile img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .gsh-logo-bar { width: 5px; height: 30px; border-radius: 6px; background: linear-gradient(180deg, var(--gsh-brand) 0%, rgba(0, 0, 0, 0.15) 160%); flex-shrink: 0; }
        .gsh-title-stack { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .global-shop-title {
          margin: 0;
          display: flex; align-items: center; gap: 8px;
          font-size: 19px; font-weight: 900; color: #0f172a;
          letter-spacing: -0.8px; line-height: 1.15;
          white-space: nowrap;
        }
        .gsh-live {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 2px 8px 2px 7px; border-radius: 999px;
          font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em;
          color: var(--gsh-brand);
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
        }
        .gsh-live::before {
          content: ''; width: 6px; height: 6px; border-radius: 50%;
          background: var(--gsh-to);
          box-shadow: 0 0 0 2px #ffffff, 0 0 6px var(--gsh-shadow);
        }
        .global-shop-subtitle {
          font-size: 12.5px; font-weight: 600; color: #64748b;
          letter-spacing: -0.2px; line-height: 1.2;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .gsh-right { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }

        /* 통합 검색창 */
        .global-shop-search-form {
          position: relative;
          display: flex; align-items: center;
          width: 340px; height: 40px;
          padding: 0 4px 0 14px;
          border-radius: 999px;
          background: #f6f7f9;
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);
          box-sizing: border-box;
          transition: background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .global-shop-search-form:hover { background: #ffffff; border-color: rgba(15, 23, 42, 0.14); }
        .global-shop-search-form:focus-within {
          background: #ffffff;
          border-color: var(--gsh-brand);
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.04), 0 8px 20px -14px var(--gsh-shadow);
        }
        .gsh-search-icon { flex-shrink: 0; color: #7d8797; font-size: 16px; transition: color 0.25s ease; }
        .global-shop-search-form:focus-within .gsh-search-icon { color: var(--gsh-brand); }
        .gsh-search-input {
          flex: 1; min-width: 0; height: 100%;
          padding: 0 8px 0 10px;
          border: none; outline: none; background: transparent;
          font-size: 14px; font-weight: 500; color: #0f172a; letter-spacing: -0.2px;
        }
        .gsh-search-input::placeholder { color: #7d8797; }
        .gsh-clear-btn {
          flex-shrink: 0;
          width: 22px; height: 22px; margin-right: 6px;
          border: none; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; color: #64748b; background: #e8ebf0;
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        .gsh-clear-btn:hover { background: #d9dee6; color: #0f172a; }
        .gsh-search-btn {
          flex-shrink: 0;
          height: 32px; padding: 0 16px;
          border: none; border-radius: 999px;
          display: flex; align-items: center; gap: 5px;
          font-size: 13px; font-weight: 800; letter-spacing: -0.2px;
          color: #ffffff;
          background: linear-gradient(145deg, var(--gsh-from) 0%, var(--gsh-to) 100%);
          box-shadow: 0 6px 14px -8px var(--gsh-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.3);
          cursor: pointer;
          transition: transform 0.2s ease, filter 0.2s ease;
        }
        .gsh-search-btn:hover { filter: brightness(1.06); transform: translateY(-1px); }
        .gsh-search-btn:active { transform: translateY(0); }
        .gsh-search-btn svg { font-size: 14px; }

        .global-shop-translate { display: flex; align-items: center; }

        /* 🤖 AI 검색창 */
        .gsh-ai { position: relative; }
        .gsh-ai-icon { display: grid; place-items: center; flex-shrink: 0; margin-left: 12px; }
        .gsh-ai-btn {
          background: linear-gradient(135deg, #e3868a 0%, #c9686c 50%, #8b5cf6 110%) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.35), 0 6px 14px -6px rgba(139,92,246,.6) !important;
        }
        .gsh-ai-btn:disabled { opacity: .85; cursor: progress; transform: none; }
        .gsh-ai-btn .gsh-ai-btn-icon path { fill: #fff !important; }
        .gsh-ai-btn .ais-sparkle { filter: none; }
        .gsh-ai-spin { width: 13px; height: 13px; border-radius: 50%; border: 2px solid rgba(255,255,255,.45); border-top-color: #fff; animation: gsh-spin .8s linear infinite; }
        @keyframes gsh-spin { to { transform: rotate(360deg); } }
        .gsh-ai-note {
          position: absolute; top: calc(100% + 8px); right: 0; z-index: 5;
          display: flex; align-items: center; gap: 6px; max-width: min(520px, 90vw); white-space: nowrap;
          padding: 8px 10px 8px 12px; border-radius: 12px; font-size: 12.5px; color: #334155;
          background: #fff; box-shadow: 0 0 0 1px rgba(139,92,246,.18), 0 12px 28px -12px rgba(15,23,42,.35);
          animation: gsh-note-in .2s ease-out;
        }
        .gsh-ai-note b { color: #7c3aed; font-weight: 800; }
        .gsh-ai-note-kw { font-weight: 800; color: #9f1239; background: #fff1f2; padding: 2px 8px; border-radius: 7px; overflow: hidden; text-overflow: ellipsis; }
        .gsh-ai-note-pill { background: #f6f7f9; padding: 2px 8px; border-radius: 7px; font-weight: 700; }
        .gsh-ai-note button { border: 0; background: none; color: #94a3b8; cursor: pointer; font-size: 12px; padding: 0 2px; }
        @keyframes gsh-note-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

        @media (max-width: 1024px) {
          .global-shop-search-form { width: 260px; }
          .gsh-live { display: none; }
        }
        @media (max-width: 768px) {
          .global-shop-header { top: var(--gsh-top, 89px); }
          /* 🌟 모바일: 사이트 main(.main-extra-gap)이 이미 120px 을 확보하고 있는데 여기서 패널 높이(51px)를
             통째로 더 더해 패널과 첫 콘텐츠(HOME 경로) 사이가 약 70px 로 벌어졌습니다.
             고정 패널 아래 끝(--gsh-top + 51px)에서 11px 만 띄우도록 계산합니다(경로 nav 의 위 여백 4px 포함 → 약 15px). */
          .global-shop-main { padding-top: max(0px, calc(var(--gsh-top, 89px) + 51px + 11px - 120px)) !important; }
          .global-shop-header-inner { padding: 7px 12px !important; gap: 8px; }
          .global-shop-logo { min-width: 0; flex: 1; gap: 8px !important; margin-left: 36px; }
          .gsh-logo-tile { width: 32px; height: 32px; border-radius: 10px; padding: 5px; }
          .global-shop-title { font-size: 16px; letter-spacing: -0.8px; }
          .global-shop-subtitle { font-size: 10.5px; }
          .global-shop-translate { display: none !important; }
          .global-shop-search-form { width: 150px !important; height: 36px; padding: 0 3px 0 10px; }
          .gsh-search-icon { display: none; }
          .gsh-search-input { padding: 0 4px; font-size: 13px; }
          .gsh-clear-btn { display: none; }
          .gsh-search-btn { width: 30px; height: 30px; padding: 0; justify-content: center; }
          .gsh-search-btn span { display: none; }
        }
      `}</style>

      <div
        id="globalShoppingLayout"
        style={{
          ...styles.container,
          // 🌟 헤더뿐 아니라 main(.global-shop-main)에서도 --gsh-top 을 읽을 수 있도록 공통 부모에 둡니다
          ...(siteHeaderHeight ? { ['--gsh-top' as any]: `${siteHeaderHeight}px` } : {}),
        }}
      >
        
        <header
          className="global-shop-header"
          style={{
            ...(shopThemeVars('gsh', getShopThemeByColor(brandColor)) as React.CSSProperties),
            ...(siteHeaderHeight ? { ['--gsh-top' as any]: `${siteHeaderHeight}px` } : {}),
          }}
        >
          <div className="global-shop-header-inner">
            
            {/* 쇼핑몰 로고 + 이름 + 설명 */}
            <div className="global-shop-logo">
              {logoSrc ? (
                <span className="gsh-logo-tile"><img src={logoSrc} alt="" /></span>
              ) : (
                <span className="gsh-logo-bar" aria-hidden="true"></span>
              )}
              <div className="gsh-title-stack">
                <h2 className="global-shop-title">
                  {platformName}
                  <span className="gsh-live">실시간 검색</span>
                </h2>
                <span className="global-shop-subtitle">{platformDesc}</span>
              </div>
            </div>
            
            {/* 🌟 제목 오른쪽 영역: 통합 검색창 + 번역기 */}
            <div className="gsh-right">
              {/* 🤖 헤더 검색창 = AI 검색. 결과는 일반 검색과 똑같이 카테고리 아래 상품 목록에 나옵니다. */}
              <HeaderSearchBox platformName={platformName} mall={mall} />
              <div id="google_translate_element" className="global-shop-translate"></div>
            </div>

          </div>
        </header>

        <main
          className="global-shop-main"
          style={{
            ...styles.main,
            // 🌟 데스크탑: 본문(HOME 경로) 위치를 왼쪽 상세검색 카드 상단과 같은 높이로 맞춥니다.
            //   사이드바 top = 패널 아래(헤더 아래 + 61px) + 15px  (GlobalShoppingView 의 SIDEBAR_GAP)
            //   본문 첫 줄   = 사이트 main 120px + 이 padding + 컨테이너 padding 20px + 경로 nav 위 여백 5px
            //   → padding = 헤더 아래 + 61 + 15 - 120 - 20 - 5 = 헤더 아래 - 70 (1px 은 경로 버튼 테두리 보정)
            //   (모바일은 아래 <style> 의 !important 규칙이 우선합니다)
            paddingTop: topHeaderBottom !== null ? `${Math.max(0, topHeaderBottom - 70)}px` : styles.main.paddingTop,
          }}
        >
          {children}
        </main>
      </div>
    </GlobalSearchProvider>
  );
}

// 🌟 카테고리 상관없이 사이트 전체를 검색하는 헤더 검색창.
// 위 GlobalLayout이 GlobalSearchProvider로 header+main(children)을 함께 감싸고 있어서,
// 여기서 requestGlobalSearch를 호출하면 children으로 렌더링되는 각 플랫폼 page.tsx가
// useGlobalSearch()로 그 제출을 구독해 검색을 실행합니다.
const AI_EXAMPLES: Record<string, string> = {
  rakuten: '부모님 선물용 과자 세트 5천엔 이하',
  mercari: '상태 좋은 닌텐도 스위치 2만엔 이하',
  yahoo_shopping: '자취생용 작은 전기밥솥',
  yahoo_auction: '80년대 레트로 게임기',
};

function HeaderSearchBox({ platformName, mall }: { platformName: string; mall?: Mall }) {
  const { requestGlobalSearch } = useGlobalSearch();
  const [keyword, setKeyword] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  // 검색 뒤 잠깐 띄우는 "AI 가 이렇게 찾았어요" 안내
  const [note, setNote] = useState<{ keyword: string; price: string; exclude: string; fallback: boolean } | null>(null);

  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(null), 7000);
    return () => window.clearTimeout(t);
  }, [note]);

  /**
   * 🤖 AI 검색: 문장을 /api/ai-search/analyze 로 보내 일본어 검색어·가격·제외어를 받은 뒤,
   * 기존 일반 검색(requestGlobalSearch)에 그대로 넘깁니다. 그래서 결과는 카테고리 아래 상품 목록 +
   * 페이지 이동 + 상세 패널까지 일반 검색과 똑같이 동작합니다.
   * 분석이 실패하면 입력한 그대로 일반 검색합니다(검색이 멈추지 않도록).
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = keyword.trim();
    if (!trimmed || analyzing) return;

    setAnalyzing(true);
    try {
      const res = await fetch('/api/ai-search/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const a = data?.analysis;
      if (!a?.keywordJa) throw new Error('no keyword');

      const extra = {
        minPrice: a.minPriceJpy ? String(a.minPriceJpy) : '',
        maxPrice: a.maxPriceJpy ? String(a.maxPriceJpy) : '',
        excludeKeyword: Array.isArray(a.excludeJa) ? a.excludeJa.join(' ') : '',
        // 미쿠짱 화면에는 한국어로 보여 줍니다 (사이드바 칸·안내 문구)
        display: {
          keyword: a.keywordKo || trimmed,
          excludeKeyword: Array.isArray(a.excludeKo) ? a.excludeKo.join(' ') : '',
        },
      };
      requestGlobalSearch(a.keywordJa, extra);
      setNote({
        keyword: extra.display.keyword,
        price: formatPriceRange(a.minPriceJpy, a.maxPriceJpy),
        exclude: extra.display.excludeKeyword,
        fallback: data.mode === 'fallback',
      });
    } catch {
      requestGlobalSearch(trimmed);
      setNote(null);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <form className="global-shop-search-form gsh-ai notranslate" translate="no" role="search" onSubmit={handleSubmit}>
      <span className="gsh-ai-icon" aria-hidden="true"><AiSparkle size={16} /></span>
      <input
        type="text"
        className="gsh-search-input"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder={mall && AI_EXAMPLES[mall] ? `AI 검색 · 예) ${AI_EXAMPLES[mall]}` : `${platformName} AI 검색`}
        aria-label={`${platformName} AI 검색`}
        maxLength={200}
      />
      {keyword && !analyzing && (
        <button type="button" className="gsh-clear-btn" aria-label="검색어 지우기" onClick={() => setKeyword('')}>
          <X weight="bold" />
        </button>
      )}
      <button type="submit" className="gsh-search-btn gsh-ai-btn" aria-label="AI 검색" disabled={analyzing}>
        {analyzing ? <span className="gsh-ai-spin" aria-hidden="true" /> : <AiSparkle size={14} className="gsh-ai-btn-icon" />}
        <span>{analyzing ? '분석 중' : 'AI 검색'}</span>
      </button>

      {note && (
        <div className="gsh-ai-note" role="status">
          <b>{note.fallback ? '⚡ 일반 검색' : '✦ AI가 이렇게 찾았어요'}</b>
          <span className="gsh-ai-note-kw">{note.keyword}</span>
          {note.price && <span className="gsh-ai-note-pill">{note.price}</span>}
          {note.exclude && <span className="gsh-ai-note-pill">제외 {note.exclude}</span>}
          <button type="button" aria-label="닫기" onClick={() => setNote(null)}>✕</button>
        </div>
      )}
    </form>
  );
}
