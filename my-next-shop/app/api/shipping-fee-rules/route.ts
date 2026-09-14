import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 🌟 guide/shipping-fee 페이지가 항공/EMS/우체국해운 요금 계산식의 변수(가격/증가액 등)를
// 가져오는 공개 API입니다. 실제 계산 공식 자체는 그대로 두고, 이 값들만 DB에서 받아옵니다.
export async function GET() {
  try {
    const [airRules, emsBreakpoints, extraRates] = await Promise.all([
      prisma.airShippingFeeRule.findMany(),
      prisma.emsShippingFeeBreakpoint.findMany({ orderBy: { weightKg: 'asc' } }),
      prisma.shippingFeeExtraRate.findMany(),
    ]);

    return NextResponse.json({ success: true, airRules, emsBreakpoints, extraRates });
  } catch (error) {
    console.error('ShippingFeeRules GET Error:', error);
    return NextResponse.json({ error: '배송비 규칙 조회 실패' }, { status: 500 });
  }
}
