import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DEFAULT_SHIPPING_RATES, SHIPPING_RATE_METHODS, type RatePair, type ShippingRateMethod } from '@/lib/shippingRates';

// ✈️ guide/shipping-fee 가 읽는 공개 API — 미쿠짱 특송 / EMS 무게별 요금표
//    DB(shipping_rates)가 비어 있거나 아직 만들어지지 않았으면 기본 요금표(lib/shippingRates.ts)를 돌려줍니다.
//    ⚠️ `prisma db push` 전에도 페이지가 깨지지 않도록 모델을 any 로 접근합니다.
export async function GET() {
  const rates: Record<ShippingRateMethod, RatePair[]> = { MIKU: DEFAULT_SHIPPING_RATES.MIKU, EMS: DEFAULT_SHIPPING_RATES.EMS };
  let source: 'db' | 'default' = 'default';
  try {
    const rows: { method: string; weightKg: number; fee: number }[] =
      await (prisma as any).shippingRate.findMany({ orderBy: { weightKg: 'asc' } });
    SHIPPING_RATE_METHODS.forEach((m) => {
      const list = rows.filter(r => r.method === m).map(r => [r.weightKg, r.fee] as RatePair);
      if (list.length > 0) { rates[m] = list; source = 'db'; }
    });
  } catch (error) {
    console.error('ShippingRates GET Error (기본 요금표로 대신 보여 줍니다):', error);
  }
  return NextResponse.json({ success: true, rates, source });
}
