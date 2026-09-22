import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';
import {
  sendAlimtalk, REFUND_DONE_TEMPLATE, CHARGE_DONE_TEMPLATE, moneyHistoryUrl,
  formatRefundAccount, maskPhone,
} from '@/lib/notifications/alimtalk';
import { normalizeKoreanMobile } from '@/lib/phone';

export async function PUT(request: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    // 🔒 관리자 확인은 위의 requireAdmin(서명된 세션 쿠키)으로 처리합니다. (body의 adminId는 신뢰하지 않음)
    // 💬 skipAlimtalk: 관리자가 "알림톡 보내지 않기" 를 켠 경우. 주문 관리와 같은 스위치입니다.
    const { requestId, status, adminNote, skipAlimtalk } = await request.json();

    // 2. 신청 내역 조회
    //    💸 환불 승인 뒤 알림톡을 보내려면 회원 이름·휴대폰이 필요해서 함께 읽습니다.
    const targetRequest = await prisma.moneyRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { id: true, name: true, phone: true } } },
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
      const txResult = await prisma.$transaction(async (tx) => {
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
        const updatedRequest = await tx.moneyRequest.update({
          where: { id: requestId },
          data: { status: 'APPROVED', processedAt: new Date(), adminNote }
        });
        // 충전 알림톡의 #{현재잔액} 에 쓸 값도 함께 돌려줍니다.
        return { request: updatedRequest, balanceAfter: updatedUser.cyberMoney };
      });
      const { request: result, balanceAfter } = txResult;

      // 💬 승인이 끝나면 회원에게 알림톡으로 알려 줍니다. (충전 완료 · 환불 완료)
      //
      // ⚠️ 반드시 트랜잭션이 끝난 **뒤**에 보냅니다. 트랜잭션 안에서 외부 API 를 부르면
      //    DB 커넥션을 그동안 잡고 있고, 발송이 실패하면 승인까지 롤백됩니다.
      // ⚠️ 알림톡 실패가 승인 처리를 막으면 안 됩니다. 아래는 전부 삼키고 로그만 남깁니다.
      //    (sendAlimtalk 자체도 예외를 던지지 않지만, 변수 조립 단계까지 함께 감쌉니다)
      const isRefund = targetRequest.type === 'REFUND';
      const kindLabel = isRefund ? '환불' : '충전';

      if (skipAlimtalk) {
        console.log(`[알림톡] ${kindLabel} 완료 안내를 건너뜁니다 — 관리자가 '알림톡 보내지 않기'를 켰습니다. (신청 ${requestId})`);
      } else {
        try {
          const phone = normalizeKoreanMobile(targetRequest.user?.phone);
          if (!phone) {
            // 번호가 없으면 보낼 수 없습니다. 승인 자체는 이미 끝났으므로 기록만 남깁니다.
            console.warn(`[알림톡] ${kindLabel} 완료 안내를 건너뜁니다 — 보낼 수 있는 번호가 없습니다. (회원 ${targetRequest.userId})`);
          } else {
            // ⚠️ 두 본문 모두 '원' 이 이미 붙어 있어 값에는 숫자와 쉼표만 넣습니다.
            const amount = targetRequest.amount.toLocaleString('ko-KR');
            const sendResult = await sendAlimtalk({
              to: phone,
              template: isRefund ? REFUND_DONE_TEMPLATE : CHARGE_DONE_TEMPLATE,
              variables: isRefund
                ? {
                    '#{고객명}': targetRequest.user?.name || '고객',
                    '#{환불금액}': amount,
                    '#{환불수단}': formatRefundAccount(targetRequest),
                  }
                : {
                    '#{고객명}': targetRequest.user?.name || '고객',
                    '#{충전금액}': amount,
                    // 충전 뒤 잔액은 트랜잭션이 돌려준 값을 씁니다. (다시 조회하면 그새 바뀔 수 있습니다)
                    '#{현재잔액}': balanceAfter.toLocaleString('ko-KR'),
                  },
              buttonUrl: moneyHistoryUrl(),
              // 관리자 알림톡 관리 화면에서 어떤 신청 건인지 찾을 수 있게 남깁니다.
              customFields: {
                kind: isRefund ? 'refund' : 'charge',
                requestId: String(requestId),
                userId: String(targetRequest.userId),
              },
            });
            console.log(`[알림톡] ${kindLabel} 완료 안내`,
              { 신청: requestId, 회원: targetRequest.userId, 번호: maskPhone(phone), 결과: sendResult });
          }
        } catch (error) {
          console.error(`[알림톡] ${kindLabel} 완료 안내 발송 중 오류 (승인은 이미 처리됨):`, error);
        }
      }

      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ error: '잘못된 상태 요청입니다.' }, { status: 400 });

  } catch (error: any) {
    console.error('Approve Process Error:', error);
    // 트랜잭션 내부에서 던진 에러 메시지(잔액 부족 등)를 클라이언트에게 전달
    return NextResponse.json({ error: error.message || '처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}