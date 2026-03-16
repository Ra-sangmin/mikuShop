// src/app/layout.tsx
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
  const isShopPage = pathname?.startsWith('/main_shop'); // 🚀 쇼핑 페이지 여부 확인
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
    // 🚀 [핵심 수정 1] 쇼핑 페이지일 때는 lang="ja"로 설정하여 브라우저 번역 기능을 유도합니다.
    // 🚀 [핵심 수정 2] suppressHydrationWarning을 추가하여 구글 번역기로 인한 DOM 변경 에러를 방지합니다.
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
      </head>
      <body 
        suppressHydrationWarning
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: '100vh',
          margin: '0',
          position: 'relative',
          top: '0'
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