import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const [airRules, emsBreakpoints, extraRates] = await Promise.all([
      prisma.airShippingFeeRule.findMany(),
      prisma.emsShippingFeeBreakpoint.findMany({ orderBy: { weightKg: 'asc' } }),
      prisma.shippingFeeExtraRate.findMany(),
    ]);

    return NextResponse.json({ success: true, airRules, emsBreakpoints, extraRates });
  } catch (error) {
    console.error('Admin ShippingFeeRules GET Error:', error);
    return NextResponse.json({ error: '배송비 규칙 조회 실패' }, { status: 500 });
  }
}

// 🌟 세 테이블(항공/EMS 구간표/EMS·우체국해운 초과 규칙)을 하나의 라우트에서 다루기 위해
// body의 type으로 어느 테이블을 수정할지 구분합니다.
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { type, id } = body;

    if (!type || !id) {
      return NextResponse.json({ error: 'type과 id가 필요합니다.' }, { status: 400 });
    }

    const toNullableInt = (v: any) => (v === null || v === undefined || v === '') ? null : parseInt(v);

    if (type === 'air') {
      const updated = await prisma.airShippingFeeRule.update({
        where: { id },
        data: {
          firstStepFee: toNullableInt(body.firstStepFee),
          baseFeeAtStepTwo: toNullableInt(body.baseFeeAtStepTwo),
          stepIncrement: toNullableInt(body.stepIncrement),
          discountVsGoldLow: toNullableInt(body.discountVsGoldLow),
          discountVsGoldMid: toNullableInt(body.discountVsGoldMid),
          discountVsGoldHigh: toNullableInt(body.discountVsGoldHigh),
        }
      });
      return NextResponse.json({ success: true, rule: updated });
    }

    if (type === 'ems') {
      const updated = await prisma.emsShippingFeeBreakpoint.update({
        where: { id },
        data: { fee: parseInt(body.fee) || 0 }
      });
      return NextResponse.json({ success: true, breakpoint: updated });
    }

    if (type === 'extra') {
      const updated = await prisma.shippingFeeExtraRate.update({
        where: { id },
        data: {
          thresholdWeightKg: parseFloat(body.thresholdWeightKg) || 0,
          baseFeeAtThreshold: parseInt(body.baseFeeAtThreshold) || 0,
          extraPerKg: parseInt(body.extraPerKg) || 0,
        }
      });
      return NextResponse.json({ success: true, rate: updated });
    }

    return NextResponse.json({ error: '알 수 없는 type입니다.' }, { status: 400 });
  } catch (error) {
    console.error('Admin ShippingFeeRules PATCH Error:', error);
    return NextResponse.json({ error: '배송비 규칙 수정 실패' }, { status: 500 });
  }
}
