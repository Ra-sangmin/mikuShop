'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

// 🌟 헤더의 통합 검색창(GlobalLayout)과 각 플랫폼 페이지(GlobalShoppingView를 감싸는
// page.tsx)는 layout → page 관계라 props를 직접 주고받을 수 없습니다. 그래서 헤더의
// 검색 제출을 컨텍스트에 담아두면, 각 페이지가 이를 구독해 "카테고리 상관없이 전체 검색"을
// 스스로 실행합니다. token은 같은 키워드를 다시 검색해도(Enter 두 번) 매번 새로운 요청으로
// 인식시키기 위한 값입니다.
/** 🤖 헤더 AI 검색이 문장을 분석해 함께 넘기는 조건. 각 페이지가 사이드바 필터 값으로 그대로 씁니다. */
export interface GlobalSearchExtra {
  minPrice?: string;
  maxPrice?: string;
  excludeKeyword?: string;
  /** 사이드바 칸에 보여 줄 한국어 값 (검색 자체는 위의 일본어 값으로 합니다) */
  display?: { keyword: string; excludeKeyword: string };
}

interface GlobalSearchRequest {
  keyword: string;
  token: number;
  /** 있으면 가격·제외어를 이 값으로 바꿔 검색합니다 (없으면 예전처럼 검색어만) */
  extra?: GlobalSearchExtra;
}

interface GlobalSearchContextValue {
  searchRequest: GlobalSearchRequest | null;
  requestGlobalSearch: (keyword: string, extra?: GlobalSearchExtra) => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

export function GlobalSearchProvider({ children }: { children: React.ReactNode }) {
  const [searchRequest, setSearchRequest] = useState<GlobalSearchRequest | null>(null);

  const requestGlobalSearch = useCallback((keyword: string, extra?: GlobalSearchExtra) => {
    setSearchRequest(prev => ({ keyword, extra, token: (prev?.token || 0) + 1 }));
  }, []);

  return (
    <GlobalSearchContext.Provider value={{ searchRequest, requestGlobalSearch }}>
      {children}
    </GlobalSearchContext.Provider>
  );
}

/** Provider 밖에서도 안전하게 쓰는 버전 (없으면 null). 사이드바처럼 여러 곳에 재사용되는 컴포넌트용. */
export function useOptionalGlobalSearch(): GlobalSearchContextValue | null {
  return useContext(GlobalSearchContext);
}

export function useGlobalSearch(): GlobalSearchContextValue {
  const ctx = useContext(GlobalSearchContext);
  if (!ctx) throw new Error('useGlobalSearch은 GlobalSearchProvider 내부에서만 사용할 수 있습니다.');
  return ctx;
}
