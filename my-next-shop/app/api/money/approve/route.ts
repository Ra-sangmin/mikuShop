import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const { requestId, status, adminId, adminNote } = await request.json();

    // 1. 최소한의 관리자 식별 검증
    if (!adminId) {
      return NextResponse.json({ error: '처리 권한이 없습니다.' }, { status: 403 });
    }

    // 2. 신청 내역 조회
    const targetRequest = await prisma.moneyRequest.findUnique({
      where: { id: requestId }
    });

    if (!targetRequest || targetRequest.status !== 'PENDING') {
      return NextResponse.json({ error: '이미 처리되었거나 존재하지 않는 신청건입니다.' }, { status: 400 });
    }

    // 🔴 [반려 처리] - 잔액 변동 없이 상태만 변경
    if (status === 'REJECTED') {
      await prisma.moneyRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED', adminNote, processedAt: new Date() }
      });
      return NextResponse.json({ success: true, message: '반려 처리가 완료되었습니다.' });
    }

    // 🟢 [승인 처리] - 트랜잭션으로 안전하게 묶어서 처리
    if (status === 'APPROVED') {
      const result = await prisma.$transaction(async (tx) => {
        // [중요 방어 로직] 환불 승인 전, 유저가 그새 돈을 썼을 수 있으므로 잔액 재확인
        if (targetRequest.type === 'REFUND') {
          const user = await tx.user.findUnique({ where: { id: targetRequest.userId } });
          if (!user || user.cyberMoney < targetRequest.amount) {
            throw new Error('유저의 현재 잔액이 부족하여 환불을 승인할 수 없습니다.');
          }
        }

        // 1. 유저 잔액 업데이트 (충전은 +, 환불은 -)
        const updatedUser = await tx.user.update({
          where: { id: targetRequest.userId },
          data: {
            cyberMoney: {
              increment: targetRequest.type === 'CHARGE' ? targetRequest.amount : -targetRequest.amount
            }
          }
        });

        // 2. 이용 내역(MoneyLog)에 최종 기록 남기기 (이용내역 페이지에 노출됨)
        await tx.moneyLog.create({
          data: {
            userId: targetRequest.userId,
            type: targetRequest.type as any,
            content: targetRequest.type === 'CHARGE' ? `[충전] ${targetRequest.content || '관리자 승인'}` : `[환불] 관리자 승인 완료`,
            amount: targetRequest.type === 'CHARGE' ? targetRequest.amount : -targetRequest.amount,
            balanceAfter: updatedUser.cyberMoney
          }
        });

        // 3. 신청 상태를 승인 완료(APPROVED)로 변경
        return await tx.moneyRequest.update({
          where: { id: requestId },
          data: { status: 'APPROVED', processedAt: new Date(), adminNote }
        });
      });

      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ error: '잘못된 상태 요청입니다.' }, { status: 400 });

  } catch (error: any) {
    console.error('Approve Process Error:', error);
    // 트랜잭션 내부에서 던진 에러 메시지(잔액 부족 등)를 클라이언트에게 전달
    return NextResponse.json({ error: error.message || '처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}