import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, getAdminSession } from '@/lib/apiAuth';
import {
  loadExchangeRateConfig,
  updateExchangeRateConfig,
  getBaseExchangeRate,
} from '@/lib/exchangeRate';
import {
  calculateTieredPaymentFee,
  calculateTieredAgencyFee,
  DEFAULT_PAYMENT_FEE_RULE,
  DEFAULT_AGENCY_FEE_RULE,
} from '@/src/utils/feeCalculator';

// 🌟 환율 조회·저장 로직은 lib/exchangeRate.ts 로 옮겼습니다.
//    자동 수집 크론(app/api/cron/exchange-rate)이 같은 경로를 써야 하기 때문입니다.
//    동작은 예전과 같습니다 — forceRefresh 일 때만 네이버를 새로 조회하고 DB 에 저장합니다.

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      salePrice = 0, 
      quantityCount = 1, 
      addRate = 0,
      dailyTax = 0,
      paymentFee: requestedPaymentFee,
      agencyFee: requestedAgencyFee,
      forceRefresh: requestedForceRefresh = false // 🌟 새로고침 강제 여부 파라미터 추가
    } = body;

    // 🔒 forceRefresh는 DB의 현재 환율을 갱신하므로 관리자 세션일 때만 허용합니다.
    const forceRefresh = requestedForceRefresh ? !!(await getAdminSession()) : false;

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
    // 사이트 전역이 참조하는 환율(저장된 가산액 포함) — 다른 소비처를 위해 그대로 둡니다.
    const exchangeRate = baseExchangeRate + additionalRate;

    // 🐛 수수료가 30000/220/330, 4/300/100으로 하드코딩되어 있어 order_fee_rules 설정이
    //    무시되고, 관리자 화면에서 입력한 수수료도 반영되지 않았습니다.
    //    → DB 규칙(공용 계산식)을 쓰되, 요청에 값이 실려오면 그 값을 우선합니다.
    const [paymentRule, agencyRule] = await Promise.all([
      prisma.orderFeeRule.findUnique({ where: { feeType: 'PAYMENT' } }),
      prisma.orderFeeRule.findUnique({ where: { feeType: 'AGENCY' } }),
    ]);
    const paymentFee = Number.isFinite(Number(requestedPaymentFee))
      ? Number(requestedPaymentFee)
      : calculateTieredPaymentFee(salePrice, paymentRule ?? DEFAULT_PAYMENT_FEE_RULE);
    const agencyFee = Number.isFinite(Number(requestedAgencyFee))
      ? Number(requestedAgencyFee)
      : calculateTieredAgencyFee(quantityCount, agencyRule ?? DEFAULT_AGENCY_FEE_RULE);

    // 🐛 추가 증가액(addRate)이 두 번 더해지고 있었습니다.
    //    exchangeRate에 이미 저장된 additionalRate가 포함돼 있는데, 관리자 화면은 그 값을
    //    addRate 입력칸의 초깃값으로 읽어 다시 보내기 때문에 base + a + a가 됐습니다.
    //    → addRate가 실려오면 "저장된 가산액을 대체하는 미리보기 값"으로 취급합니다.
    //    (addRate를 보내지 않는 호출부 - ExchangeRateContext 등 - 는 이전과 완전히 동일)
    //    아울러 하드코딩된 0.01 대신 설정값(rateBasisUnit)으로 나눕니다.
    const hasAddRateOverride = addRate !== undefined && addRate !== null && addRate !== 0;
    const effectiveAdditionalRate = hasAddRateOverride
      ? Number(addRate) / exchangeRateBasisUnit
      : additionalRate;
    const appliedRate = baseExchangeRate + effectiveAdditionalRate;

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
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

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