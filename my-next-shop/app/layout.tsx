"use client";
import { usePathname } from 'next/navigation';
import './globals.css';
import Header from './components/Header';
import Footer from './components/Footer';
import { ExchangeRateProvider } from './context/ExchangeRateContext';
import { CartProvider } from './context/CartContext';
import { Providers } from './Providers';
import { useEffect, useRef } from "react";
import { feeManager } from "@/src/models/FeeManager";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');
  const isShopPage = pathname?.startsWith('/main_shop'); 
  const prevPathname = useRef(pathname);

  useEffect(() => {
    const initializeFees = async () => {
      console.log("[RootLayout] 공용 수수료 모델 초기화 시작...");
      await feeManager.loadFees();
    };
    initializeFees();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isComingFromShop = prevPathname.current?.startsWith('/main_shop');
      const isGoingToNonShop = !pathname?.startsWith('/main_shop');

      if (isComingFromShop && isGoingToNonShop) {
        window.location.reload();
      }
      prevPathname.current = pathname;
    }
  }, [pathname]);

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
              <main style={{ flex: '1 0 auto' }}>
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