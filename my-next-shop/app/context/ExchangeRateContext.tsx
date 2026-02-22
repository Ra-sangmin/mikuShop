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
    async function fetchExchangeRate() {
      try {
        setLoading(true);
        const res = await fetch('https://open.er-api.com/v6/latest/JPY');
        const data = await res.json();
        
        if (data && data.rates && data.rates.KRW) {
          const rate = data.rates.KRW;
          setExchangeRate(rate);
          console.log("🔥 [Global Context] Exchange Rate Sync Success! 1 JPY =", rate, "KRW");
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
