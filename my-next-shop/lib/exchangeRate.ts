// 💱 환율 조회·저장 (견적 API 와 자동 수집 크론이 함께 씁니다)
//
// 예전에는 이 로직이 app/api/estimate/route.ts 안에만 있어서, 자동 수집을 붙이려면
// 견적 계산 API 를 통째로 호출해야 했습니다. 조회·저장만 따로 쓸 수 있게 분리합니다.

import prisma from '@/lib/prisma';

/** 네이버 조회에 실패했을 때 쓰는 임시값. 진짜 환율이 아니라서 화면에 경고를 띄웁니다. */
export const FALLBACK_EXCHANGE_RATE = 9.05;

// 🌟 네이버가 finance.naver.com 의 구(舊) HTML 페이지(.nhn)를 stock.naver.com 으로
//    리다이렉트하면서 <option value="..."> 형식의 옛 마크업이 사라져, 예전 정규식 파싱이
//    항상 실패하고 조용히 폴백값만 반환하던 문제가 있었습니다.
//    stock.naver.com 이 실제로 호출하는 공개 JSON API 를 직접 씁니다.
const NAVER_ENDPOINT =
  'https://stock.naver.com/api/stockSecurity/exchange-rates/v2/market-index/FX_JPYKRW/latest';

/**
 * 1엔 기준 매매기준율을 네이버에서 받아옵니다. 실패하면 예외를 던집니다.
 * @param noCache true 면 Next.js 캐시를 무시하고 항상 새로 받아옵니다.
 */
export async function fetchNaverExchangeRate(noCache: boolean): Promise<number> {
  const fetchOptions: RequestInit = noCache
    ? { cache: 'no-store' }
    : { next: { revalidate: 300 } };

  const response = await fetch(NAVER_ENDPOINT, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    ...fetchOptions,
  });

  if (!response.ok) throw new Error(`네이버 환율 API 응답 오류: ${response.status}`);

  const data = await response.json();
  const basis = parseFloat(data.currencyBasis) || 100;
  const rate = parseFloat(data.saleBaseRate);

  if (!rate || isNaN(rate)) throw new Error('환율 값을 찾을 수 없습니다.');

  // 🌟 API 는 "100엔 기준" 매매기준율을 주므로, 이 프로젝트 전체가 쓰는 "1엔 기준"으로 환산합니다.
  return rate / basis;
}

/** 견적 계산에 필요한 환율 설정을 읽습니다. */
export async function loadExchangeRateConfig(): Promise<{
  additionalRate: number;
  rateBasisUnit: number;
  currentExchangeRate: number;
  updatedAt: Date | null;
}> {
  // 🌟 관리자가 DB 값을 언제든 바꿀 수 있고, 전역 변수 캐시는 그 변경을 놓치는 위험이 있어
  //    캐시 없이 매 요청마다 DB 를 직접 조회합니다.
  const config = await prisma.exchangeRateConfig.findFirst();
  return {
    additionalRate: config?.additionalRate ?? 0,
    rateBasisUnit: config?.rateBasisUnit ?? 100,
    currentExchangeRate: config?.currentExchangeRate ?? 0,
    updatedAt: config?.updatedAt ?? null,
  };
}

/**
 * 추가 증가액 / 현재 환율이 실제로 바뀌는 곳은 이 함수 하나로 모읍니다.
 * 환율을 새로 받아 저장할 때는 마지막 수집 시각(updatedAt)도 함께 남깁니다.
 * (updatedAt 은 @updatedAt 이 아니라 직접 넣어야 하는 컬럼입니다)
 */
export async function updateExchangeRateConfig(data: {
  additionalRate?: number;
  currentExchangeRate?: number;
}): Promise<void> {
  const touched =
    data.currentExchangeRate !== undefined ? { updatedAt: new Date() } : {};
  const config = await prisma.exchangeRateConfig.findFirst();

  if (config) {
    await prisma.exchangeRateConfig.update({
      where: { id: config.id },
      data: { ...data, ...touched },
    });
  } else {
    await prisma.exchangeRateConfig.create({
      data: {
        additionalRate: data.additionalRate ?? 0,
        currentExchangeRate: data.currentExchangeRate ?? 0,
        ...touched,
      },
    });
  }
}

/**
 * 네이버에서 받아 DB 에 저장까지 합니다.
 * 자동 수집(크론)과 관리자 화면의 "환율 새로고침"이 같은 경로를 쓰도록 여기로 모읍니다.
 */
export async function refreshExchangeRate(): Promise<number> {
  const rate = await fetchNaverExchangeRate(true);
  await updateExchangeRateConfig({ currentExchangeRate: rate });
  return rate;
}

/**
 * 실패해도 던지지 않는 형태. 임시값으로 대체하되 실패 여부를 함께 돌려줘서,
 * 호출부가 "이건 진짜 환율이 아니라 임시값"이라고 표시할 수 있게 합니다.
 */
export async function getBaseExchangeRate(
  forceRefresh = false,
): Promise<{ rate: number; failed: boolean }> {
  try {
    const rate = forceRefresh
      ? await refreshExchangeRate()
      : await fetchNaverExchangeRate(false);
    return { rate, failed: false };
  } catch (error) {
    console.error('환율 조회 에러:', error);
    return { rate: FALLBACK_EXCHANGE_RATE, failed: true };
  }
}
