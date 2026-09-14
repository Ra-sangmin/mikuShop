import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 🌟 src/utils/feeCalculator.ts의 calculateTieredPaymentFee/calculateTieredAgencyFee가
// 참조하는 구간 변수(order_fee_rules 테이블)를 조회하는 공개 API입니다.
export async function GET() {
  try {
    const rules = await prisma.orderFeeRule.findMany();
    return NextResponse.json({ success: true, rules });
  } catch (error) {
    console.error('OrderFeeRules GET Error:', error);
    return NextResponse.json({ error: '수수료 규칙 조회 실패' }, { status: 500 });
  }
}
