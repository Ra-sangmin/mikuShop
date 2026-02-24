// src/app/layout.tsx
import './globals.css'; // 기존 style.css 내용을 여기에 통합
import Header from './components/Header';
import Footer from './components/Footer';
import { ExchangeRateProvider } from './context/ExchangeRateContext';

export const metadata = {
  title: '미쿠짱 구매대행',
  description: '일본 직구 및 외주 서비스',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* Font Awesome 등 외부 라이브러리 로드 */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        /> 
      </head>
      <body style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh', // 1. 화면 전체 높이를 최소값으로 설정
        margin: '0 !important' as any,
        position: 'relative',
        top: '0 !important' as any
      }}>
        <ExchangeRateProvider>
          <Header />
            <main style={{ 
            flex: '1 0 auto' // 2. 빈 공간을 main이 다 차지하여 Footer를 바닥으로 밀어냄
          }}>
            {children}
          </main>
          <Footer />
        </ExchangeRateProvider>
      </body>
    </html>
  );
}
