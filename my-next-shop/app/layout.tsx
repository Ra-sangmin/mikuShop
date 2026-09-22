"use client";
import { usePathname } from 'next/navigation';
import './globals.css';
import Header from './components/Header';
import Footer from './components/Footer';
import { ExchangeRateProvider } from './context/ExchangeRateContext';
import { CartProvider } from './context/CartContext';
import { Providers } from './Providers';
import { useEffect, useRef } from "react";

const FORCE_TOP_KEY = 'miku:force-scroll-top';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');
  const isShopPage = pathname?.startsWith('/main_shop'); 
  const prevPathname = useRef(pathname);

  // 쇼핑 페이지(구글 번역 적용)에서 빠져나올 때만 새로고침한다.
  // 이때 브라우저가 직전 스크롤 위치를 복원해 Footer가 먼저 보이는 문제가 있어
  // 복원을 끄고(manual) 최상단으로 내린 뒤 새로고침한다.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isComingFromShop = prevPathname.current?.startsWith('/main_shop');
    const isGoingToNonShop = !pathname?.startsWith('/main_shop');

    prevPathname.current = pathname;

    if (isComingFromShop && isGoingToNonShop) {
      try { sessionStorage.setItem(FORCE_TOP_KEY, '1'); } catch { /* 시크릿 모드 등 */ }
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
      window.location.reload();
    }
  }, [pathname]);

  // 위 새로고침으로 로드된 문서는 콘텐츠 높이가 확정될 때까지 최상단을 유지시킨다.
  useEffect(() => {
    if (typeof window === "undefined") return;

    let flagged = false;
    try {
      flagged = sessionStorage.getItem(FORCE_TOP_KEY) === '1';
      if (flagged) sessionStorage.removeItem(FORCE_TOP_KEY);
    } catch { /* 시크릿 모드 등 */ }

    // 🌟 메인 화면(/)을 F5 로 새로고침하면 브라우저가 직전 스크롤 위치(예: Footer)를 복원해
    // Footer 부터 보이는 문제가 있어, 새로고침으로 열린 메인 화면은 항상 최상단부터 보이게 합니다.
    // (뒤로가기/앞으로가기 복원에는 영향을 주지 않도록 navigation type 이 'reload' 일 때만)
    if (!flagged && window.location.pathname === '/') {
      try {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        if (nav?.type === 'reload') flagged = true;
      } catch { /* 지원하지 않는 브라우저 */ }
    }

    if (!flagged) return;

    window.scrollTo(0, 0);

    // 이미지·폰트 로드로 문서 높이가 변하는 동안 스크롤이 밀리지 않도록 잠시 고정한다.
    const deadline = Date.now() + 1000;
    let raf = 0;
    const restoreAuto = () => {
      if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
    };
    const pin = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      if (Date.now() < deadline) raf = requestAnimationFrame(pin);
      else restoreAuto();
    };
    raf = requestAnimationFrame(pin);

    // 사용자가 직접 스크롤하면 즉시 고정을 푼다.
    const release = () => {
      cancelAnimationFrame(raf);
      restoreAuto();
    };
    window.addEventListener('wheel', release, { passive: true, once: true });
    window.addEventListener('touchstart', release, { passive: true, once: true });
    window.addEventListener('keydown', release, { once: true });

    return () => {
      cancelAnimationFrame(raf);
      restoreAuto();
      window.removeEventListener('wheel', release);
      window.removeEventListener('touchstart', release);
      window.removeEventListener('keydown', release);
    };
  }, []);

  return (
    <html 
      lang={isShopPage ? "ja" : "ko"} 
      translate={!isShopPage ? "no" : "yes"}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        /> 
        {/* 🌟 배달의민족 주아체 로드 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Jua&display=swap" rel="stylesheet" />
      </head>
      <body 
        suppressHydrationWarning
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: '100vh',
          margin: '0',
          position: 'relative',
          top: '0',
          /* 🌟 [추가] 사이트 전체 기본 폰트를 나눔스퀘어라운드로 설정 */
          fontFamily: '"NanumSquareRound", sans-serif',
        }}
      >
        <Providers>
          <ExchangeRateProvider>
            <CartProvider>
              {!isAdminPage && <Header />}
              <main className={pathname !== '/' ? 'main-extra-gap' : undefined} style={{ flex: '1 0 auto' }}>
                {children}
              </main>
              {!isAdminPage && <Footer />}
            </CartProvider>
          </ExchangeRateProvider>
        </Providers>
      </body>
    </html>
  );
}