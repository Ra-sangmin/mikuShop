import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { userId, amount, type, content } = await request.json();
    const amountNum = parseInt(amount);

    if (!userId || isNaN(amountNum)) {
      return NextResponse.json({ error: '유효하지 않은 요청 데이터입니다.' }, { status: 400 });
    }

    // 🛡️ 트랜잭션: 잔액 변경 + 로그 생성을 하나의 묶음으로 처리
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. 유저 잔액 업데이트 (increment 사용으로 동시성 문제 예방)
      const updatedUser = await tx.user.update({
        where: { id: parseInt(userId) },
        data: {
          cyberMoney: {
            increment: amountNum // 충전(+), 사용/환불(-) 모두 수치대로 계산
          }
        }
      });

      // 2. 이용 내역(MoneyLog) 기록
      const newLog = await tx.moneyLog.create({
        data: {
          userId: parseInt(userId),
          type: type, // 'CHARGE' | 'USE' | 'REFUND'
          content: content,
          amount: amountNum,
          balanceAfter: updatedUser.cyberMoney // 거래 후 잔액 스냅샷
        }
      });

      return { user: updatedUser, log: newLog };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Money API Error:", error);
    return NextResponse.json({ error: error.message || '처리 중 오류 발생' }, { status: 500 });
  }
}