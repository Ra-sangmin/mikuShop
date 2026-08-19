import { NextResponse } from 'next/server';

// 🌟 forceRefresh가 true면 캐시를 무시하고 타임스탬프를 붙여 즉시 새로고침
async function getExchangeRate(forceRefresh = false) {
  try {
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
      return parseFloat(match[1]); 
    }
    throw new Error("환율을 찾을 수 없습니다.");
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

    const exchangeRate = await getExchangeRate(forceRefresh);

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