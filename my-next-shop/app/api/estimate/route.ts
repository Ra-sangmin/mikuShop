import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 🌟 관리자가 DB 값을 언제든 바꿀 수 있고, 전역 변수 캐시는 그 변경을 놓치는 위험이 있어
// 캐시 없이 매 요청마다 DB를 직접 조회합니다.
async function loadExchangeRateConfig(): Promise<{ additionalRate: number; rateBasisUnit: number; currentExchangeRate: number }> {
  const config = await prisma.exchangeRateConfig.findFirst();
  return {
    additionalRate: config?.additionalRate ?? 0,
    rateBasisUnit: config?.rateBasisUnit ?? 100,
    currentExchangeRate: config?.currentExchangeRate ?? 0,
  };
}

// 🌟 추가 증가액 / 현재 환율 값이 실제로 바뀌는 곳은 여기 한 곳으로 모읍니다.
async function updateExchangeRateConfig(data: { additionalRate?: number; currentExchangeRate?: number }) {
  const config = await prisma.exchangeRateConfig.findFirst();

  if (config) {
    await prisma.exchangeRateConfig.update({
      where: { id: config.id },
      data,
    });
  } else {
    await prisma.exchangeRateConfig.create({
      data: {
        additionalRate: data.additionalRate ?? 0,
        currentExchangeRate: data.currentExchangeRate ?? 0,
      },
    });
  }
}

// 🌟 네이버가 finance.naver.com의 구(舊) HTML 페이지(.nhn)를 stock.naver.com으로
// 리다이렉트하면서 <option value="..."> 형식의 옛 마크업이 사라져, 예전 정규식 파싱이
// 항상 실패하고 조용히 9.05(=가짜 905원) 폴백값만 반환하던 문제가 있었습니다.
// stock.naver.com이 실제로 호출하는 공개 JSON API를 직접 사용하도록 교체합니다.
async function fetchNaverExchangeRate(forceRefresh: boolean): Promise<number> {
  const fetchOptions: RequestInit = forceRefresh
    ? { cache: 'no-store' }
    : { next: { revalidate: 300 } };

  const response = await fetch('https://stock.naver.com/api/stockSecurity/exchange-rates/v2/market-index/FX_JPYKRW/latest', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    ...fetchOptions
  });

  if (!response.ok) throw new Error(`네이버 환율 API 응답 오류: ${response.status}`);

  const data = await response.json();
  const basis = parseFloat(data.currencyBasis) || 100;
  const rate = parseFloat(data.saleBaseRate);

  if (!rate || isNaN(rate)) throw new Error("환율 값을 찾을 수 없습니다.");

  // 🌟 API는 "100엔 기준" 매매기준율을 주므로, 이 프로젝트 전체가 쓰는 "1엔 기준" 단위로 환산합니다.
  const baseRate = rate / basis;

  // 🌟 forceRefresh로 즉시 새로고침한 경우에만 DB의 현재 환율(currentExchangeRate)도 갱신합니다.
  if (forceRefresh) {
    await updateExchangeRateConfig({ currentExchangeRate: baseRate });
  }

  return baseRate;
}

// 🌟 fetchNaverExchangeRate 실패 시 9.05로 대체하되, 실패 여부를 함께 반환해
// 호출부(프론트엔드)가 "이건 진짜 환율이 아니라 임시값"이라고 표시할 수 있게 합니다.
async function getBaseExchangeRate(forceRefresh = false): Promise<{ rate: number; failed: boolean }> {
  try {
    const rate = await fetchNaverExchangeRate(forceRefresh);
    return { rate, failed: false };
  } catch (error) {
    console.error("환율 크롤링 에러:", error);
    return { rate: 9.05, failed: true };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      salePrice = 0, 
      quantityCount = 1, 
      addRate = 0, 
      dailyTax = 0,
      forceRefresh = false // 🌟 새로고침 강제 여부 파라미터 추가
    } = body;

    const { additionalRate, rateBasisUnit: exchangeRateBasisUnit, currentExchangeRate } = await loadExchangeRateConfig();

    // 🌟 forceRefresh일 때만 네이버에서 실시간으로 새로 받아옵니다(그 값은 fetchNaverExchangeRate가 DB에 저장).
    // forceRefresh가 아니면 매번 네이버를 다시 조회하지 않고, 마지막으로 새로고침해서 DB에 저장해둔
    // currentExchangeRate를 그대로 씁니다. (DB에 아직 저장된 값이 없으면 최초 1회만 네이버에서 가져옵니다.)
    let baseExchangeRate: number;
    let exchangeRateFetchFailed = false;
    if (!forceRefresh && currentExchangeRate) {
      baseExchangeRate = currentExchangeRate;
    } else {
      const result = await getBaseExchangeRate(forceRefresh);
      baseExchangeRate = result.rate;
      exchangeRateFetchFailed = result.failed;
    }
    const exchangeRate = baseExchangeRate + additionalRate;

    let paymentFee = 0;
    if (salePrice > 0) {
      paymentFee = salePrice < 30000 ? 220 : 330;
    }

    let agencyFee = 0;
    if (quantityCount > 0) {
      agencyFee = quantityCount < 4 ? 300 : quantityCount * 100;
    }

    const addRateValue = addRate * 0.01;
    const appliedRate = exchangeRate + addRateValue;

    const totalJpy = salePrice + paymentFee + dailyTax + agencyFee;

    let resultWon = appliedRate * totalJpy;
    resultWon = Math.ceil(resultWon * 0.1) * 10;

    return NextResponse.json({
      success: true,
      data: {
        baseExchangeRate: baseExchangeRate,
        exchangeRateFetchFailed: exchangeRateFetchFailed,
        additionalRate: additionalRate,
        exchangeRateBasisUnit: exchangeRateBasisUnit,
        exchangeRate: exchangeRate,
        appliedRate: appliedRate,
        totalJpy,
        fees: {
          paymentFee,
          agencyFee,
          dailyTax
        },
        finalPriceWon: resultWon
      }
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, message: "견적 계산 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 🌟 admin/estimate의 "전역 적용" 버튼 - 추가 증가액(원 단위)을 DB(ExchangeRateConfig)에 저장합니다.
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { additionalRate } = body;

    await updateExchangeRateConfig({ additionalRate });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, message: "추가 증가액 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 🌟 유니티 등에서 상품 계산 없이 현재 환율 정보만 빠르게 조회할 수 있는 GET 엔드포인트
export async function GET() {
  try {
    const { additionalRate, rateBasisUnit } = await loadExchangeRateConfig();

    // 🌟 1. forceRefresh를 true로 주어 Next.js 캐시를 무시하고 네이버 실시간 값을 강제로 가져옵니다.
    const result = await getBaseExchangeRate(true);
    const baseExchangeRate = result.rate;
    const exchangeRateFetchFailed = result.failed;

    // 1엔 기준 환율에 rateBasisUnit(예: 100엔)을 곱해 기준 단위 환율로 환산
    const finalDisplayRate = (baseExchangeRate + additionalRate) * rateBasisUnit;

    return NextResponse.json({
      success: true,
      data: {
        baseExchangeRate: baseExchangeRate,          // 1엔 기준 기본 환율
        additionalRate: additionalRate,              // 추가 증가액
        rateBasisUnit: rateBasisUnit,                // 기준 단위 (예: 100엔)
        finalDisplayRate: Number(finalDisplayRate.toFixed(2)), // 최종 표시 환율 (원)
        exchangeRateFetchFailed: exchangeRateFetchFailed
      }
    }, {
      // 🌟 2. 브라우저나 CDN, Next.js 자체 라우트 캐시가 남지 않도록 응답 헤더에 캐시 방지 설정 추가
      headers: {
        'Cache-Control': 'no-store, no-cache, must-validate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (error) {
    console.error("API GET Error:", error);
    return NextResponse.json(
      { success: false, message: "환율 정보를 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}