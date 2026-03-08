"use client";
import { usePathname } from 'next/navigation';
import './globals.css';
import Header from './components/Header';
import Footer from './components/Footer';
import { ExchangeRateProvider } from './context/ExchangeRateContext';
import { CartProvider } from './context/CartContext';
import { Providers } from './Providers';
import { useEffect, useRef } from "react";
import { feeManager } from "@/src/models/FeeManager"; // 🌟 공용 모델 임포트

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');
  const prevPathname = useRef(pathname);

  useEffect(() => {
    // 🚀 앱 실행 시 딱 한 번 DB에서 수수료 정보를 가져와 FeeManager에 저장합니다.
    const initializeFees = async () => {
      console.log("[RootLayout] 공용 수수료 모델 초기화 시작...");
      await feeManager.loadFees();
    };
    
    initializeFees();

  }, []);

  // 💡 메루카리/라쿠텐 등 해외 쇼핑몰 페이지에서 다른 페이지(장바구니, 마이페이지 등)로 이동할 때 
  // 구글 번역기로 인해 DOM이 망가져 발생하는 React 언마운트 버그 및 상태 업데이트 누락 방지용 전체 새로고침
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isComingFromShop = prevPathname.current?.startsWith('/main_shop');
      const isGoingToNonShop = !pathname?.startsWith('/main_shop');

      if (isComingFromShop && isGoingToNonShop) {
        // 해외 쇼핑 페이지에서 빠져나갈 때는 구글 번역기가 생성한 <font> 태그 등으로 인한
        // React 버그를 완전히 씻어내기 위해 페이지를 강제로 리로드합니다.
        window.location.reload();
      }
      prevPathname.current = pathname;
    }
  }, [pathname]);

  return (
    <html lang="ko" translate={!pathname?.startsWith('/main_shop') ? "no" : "yes"}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        /> 
      </head>
      <body style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        margin: '0',
        position: 'relative',
        top: '0'
      }}>
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
