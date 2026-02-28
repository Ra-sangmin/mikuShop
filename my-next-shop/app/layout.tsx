"use client";
import { usePathname } from 'next/navigation';
import './globals.css';
import Header from './components/Header';
import Footer from './components/Footer';
import { ExchangeRateProvider } from './context/ExchangeRateContext';
import { CartProvider } from './context/CartContext';
import { Providers } from './Providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');

  return (
    <html lang="ko">
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
