"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ExchangeRateContextType {
  exchangeRate: number;
  loading: boolean;
  error: string | null;
}

const ExchangeRateContext = createContext<ExchangeRateContextType | undefined>(undefined);

export const ExchangeRateProvider = ({ children }: { children: React.ReactNode }) => {
  const [exchangeRate, setExchangeRate] = useState<number>(9.5); // 기본값
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 🌟 예전엔 open.er-api.com(외부 무료 환율 API)을 직접 불러 썼는데, 그 값이
    // app/test-estimate 페이지 및 app/api/estimate가 실제로 쓰는 네이버 금융
    // 스크래핑 값(더 정확하다고 확인됨)과 달랐습니다. 사이트 전체가 같은 환율을
    // 보도록 /api/estimate를 그대로 재사용합니다(계산용 라우트지만 salePrice/
    // quantityCount를 0으로 보내면 순수 환율(data.exchangeRate)만 받아올 수 있음).
    async function fetchExchangeRate() {
      try {
        setLoading(true);
        const res = await fetch('/api/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ salePrice: 0, quantityCount: 0 }),
        });
        const data = await res.json();

        if (data && data.success && typeof data.data?.exchangeRate === 'number') {
          const rate = data.data.exchangeRate;
          setExchangeRate(rate);
          console.log("🔥 [Global Context] Exchange Rate Sync Success! 1 JPY =", rate, "KRW");
        } else {
          throw new Error('invalid response');
        }
      } catch (err) {
        console.error("환율을 가져오는 데 실패했습니다.", err);
        setError("환율 정보를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchExchangeRate();
    // 1시간마다 주기적 갱신
    const interval = setInterval(fetchExchangeRate, 3600000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ExchangeRateContext.Provider value={{ exchangeRate, loading, error }}>
      {children}
    </ExchangeRateContext.Provider>
  );
};

export const useExchangeRate = () => {
  const context = useContext(ExchangeRateContext);
  if (context === undefined) {
    throw new Error('useExchangeRate must be used within an ExchangeRateProvider');
  }
  return context;
};
