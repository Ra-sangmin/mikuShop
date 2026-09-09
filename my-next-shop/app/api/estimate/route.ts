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

// 🌟 forceRefresh가 true면 캐시를 무시하고 타임스탬프를 붙여 즉시 새로고침하며,
// 네이버 금융에서 엔화 환율 HTML을 가져와 파싱하는 부분만 담당합니다.
async function fetchNaverExchangeRate(forceRefresh: boolean): Promise<number> {
  const timestamp = forceRefresh ? `&t=${Date.now()}` : '';
  const fetchOptions: RequestInit = forceRefresh
    ? { cache: 'no-store' }
    : { next: { revalidate: 300 } };

  const response = await fetch(`https://finance.naver.com/marketindex/exchangeDetail.nhn?marketindexCd=FX_JPYKRW${timestamp}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    ...fetchOptions
  });

  const html = await response.text();
  const match = html.match(/<option\s+value="([\d.]+)"[^>]*>[^<]*JPY\s*<\/option>/i);

  if (match && match[1]) {
    const rate = parseFloat(match[1]);

    // 🌟 forceRefresh로 즉시 새로고침한 경우에만 DB의 현재 환율(currentExchangeRate)도 갱신합니다.
    if (forceRefresh) {
      await updateExchangeRateConfig({ currentExchangeRate: rate });
    }

    return rate;
  }
  throw new Error("환율을 찾을 수 없습니다.");
}

// 🌟 fetchNaverExchangeRate 실패 시 9.05로 대체하는, 순수 환율(가산액 미포함) 조회 함수
async function getBaseExchangeRate(forceRefresh = false): Promise<number> {
  try {
    return await fetchNaverExchangeRate(forceRefresh);
  } catch (error) {
    console.error("환율 크롤링 에러:", error);
    return 9.05;
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
    const baseExchangeRate = (!forceRefresh && currentExchangeRate)
      ? currentExchangeRate
      : await getBaseExchangeRate(forceRefresh);
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