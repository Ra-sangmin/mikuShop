import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const rules = await prisma.orderFeeRule.findMany();
    return NextResponse.json({ success: true, rules });
  } catch (error) {
    console.error('Admin OrderFeeRules GET Error:', error);
    return NextResponse.json({ error: '수수료 규칙 조회 실패' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, thresholdValue, belowThresholdFee, atOrAboveThresholdAmount } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
    }

    const updated = await prisma.orderFeeRule.update({
      where: { id },
      data: {
        thresholdValue: parseFloat(thresholdValue) || 0,
        belowThresholdFee: parseInt(belowThresholdFee) || 0,
        atOrAboveThresholdAmount: parseInt(atOrAboveThresholdAmount) || 0,
      }
    });

    return NextResponse.json({ success: true, rule: updated });
  } catch (error) {
    console.error('Admin OrderFeeRules PATCH Error:', error);
    return NextResponse.json({ error: '수수료 규칙 수정 실패' }, { status: 500 });
  }
}
