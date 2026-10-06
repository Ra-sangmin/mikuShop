// 💳 결제 승인 — 토스 결제창에서 돌아온 뒤(/payment/success) 부릅니다.
//
// 순서
//   1. 결제 건(READY)을 찾고, 결제창이 돌려준 금액이 준비한 금액과 같은지 봅니다.
//   2. 주문으로 금액을 **다시** 계산합니다. 결제창을 여는 사이 관리자가 배송비를 바꾸거나
//      주문 상태가 바뀌었으면 승인하지 않습니다. (승인하지 않은 결제는 토스가 자동으로 취소합니다)
//   3. 토스에 승인 요청 → 성공하면 결제 건을 DONE 으로, 주문을 다음 상태로 넘깁니다.
//   ⚠️ 토스 승인은 됐는데 DB 반영이 실패하면 바로 전액 취소합니다. 돈만 빠지고 주문은 그대로인 상태를 남기지 않습니다.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { tossConfirm, tossCancel } from '@/lib/payments/toss';
import { buildQuote, QuoteError, TARGET_STATUS, PURPOSE_LABEL, type PaymentPurpose } from '@/lib/payments/quote';
import { triggerAdminOrderAlert } from '@/lib/notifications/adminOrderAlertRunner';

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  try {
    const body = await request.json().catch(() => ({}));
    const paymentKey = String(body?.paymentKey ?? '');
    const tossOrderId = String(body?.orderId ?? '');
    const amount = Number(body?.amount);
    if (!paymentKey || !tossOrderId || !Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ success: false, message: '잘못된 결제 요청입니다.' }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { tossOrderId },
      include: { items: true },
    });
    if (!payment || payment.userId !== userId) {
      return NextResponse.json({ success: false, message: '결제 정보를 찾을 수 없습니다.' }, { status: 404 });
    }
    const purpose = payment.purpose as PaymentPurpose;
    const done = (approvedAt?: Date | null, method?: string | null) => NextResponse.json({
      success: true,
      data: { orderName: payment.orderName, amount: payment.amount, purpose, purposeLabel: PURPOSE_LABEL[purpose], approvedAt, method },
    });

    // 🔁 새로고침 등으로 같은 승인을 다시 요청한 경우 — 이미 끝난 결과를 그대로 돌려줍니다.
    if (payment.status !== 'READY') {
      if (payment.paymentKey === paymentKey) return done(payment.approvedAt, payment.method);
      return NextResponse.json({ success: false, message: '이미 처리된 결제입니다.' }, { status: 409 });
    }
    if (amount !== payment.amount) {
      return NextResponse.json({ success: false, message: '결제 금액이 맞지 않습니다.' }, { status: 400 });
    }

    // 🔒 주문으로 금액을 다시 계산해 그대로인지 확인합니다.
    try {
      const quote = await buildQuote(userId, purpose, payment.items.map(i => i.orderId));
      if (quote.amount !== payment.amount) {
        return NextResponse.json({ success: false, message: '결제 금액이 바뀌었습니다. 마이페이지에서 다시 결제해 주세요.' }, { status: 409 });
      }
    } catch (error) {
      if (error instanceof QuoteError) {
        return NextResponse.json({ success: false, message: error.message }, { status: 409 });
      }
      throw error;
    }

    const toss = await tossConfirm(paymentKey, tossOrderId, amount);
    if (!toss.ok) {
      console.error('[결제 승인] 토스 거절', { tossOrderId, code: toss.code, message: toss.message });
      return NextResponse.json({ success: false, message: toss.message }, { status: 400 });
    }
    const approvedAt = toss.data?.approvedAt ? new Date(toss.data.approvedAt) : new Date();
    const method: string | null = toss.data?.easyPay?.provider
      ? `${toss.data.method} · ${toss.data.easyPay.provider}`
      : toss.data?.method ?? null;

    try {
      const now = new Date();
      const applied = await prisma.$transaction(async (tx) => {
        // 동시에 두 번 들어와도 한 번만 반영되도록 READY 일 때만 바꿉니다.
        const claimed = await tx.payment.updateMany({
          where: { id: payment.id, status: 'READY' },
          data: { status: 'DONE', paymentKey, method, approvedAt },
        });
        if (claimed.count === 0) return false;

        const target = TARGET_STATUS[purpose];
        for (const item of payment.items) {
          await tx.order.update({
            where: { orderId: item.orderId },
            data: {
              status: target as any,
              statusChangedAt: now,
              // 💰 보증금: 실제로 낸 원화를 쌓아 둡니다. 낙찰 정산에서 이 값을 빼 줍니다.
              ...(purpose === 'DEPOSIT' ? { depositKrw: { increment: item.amount }, bidStatus: 'PENDING' as const } : {}),
            },
          });
          // 💴 배송비: 청구 중이던 회차를 납부 처리합니다. 이 표시가 있어야 다음 추가 청구에서 다시 청구되지 않습니다.
          if (purpose === 'SHIPPING') {
            await tx.orderShippingFee.updateMany({ where: { orderId: item.orderId, paidAt: null }, data: { paidAt: now } });
          }
        }
        return true;
      });
      if (!applied) {
        const latest = await prisma.payment.findUnique({ where: { id: payment.id }, select: { approvedAt: true, method: true } });
        return done(latest?.approvedAt, latest?.method);
      }
    } catch (error) {
      console.error('[결제 승인] 주문 반영 실패 — 결제를 취소합니다', { tossOrderId, error });
      const undo = await tossCancel(paymentKey, '주문 반영 실패로 자동 취소', undefined, `undo-${tossOrderId}`);
      if (!undo.ok) console.error('[결제 승인] ⚠️ 자동 취소도 실패 — 관리자 확인 필요', { tossOrderId, paymentKey, undo });
      return NextResponse.json({ success: false, message: '주문 반영 중 오류가 발생해 결제를 취소했습니다. 다시 시도해 주세요.' }, { status: 500 });
    }

    // 🔔 결제가 들어오면 관리자 처리 필요 알림을 바로 보냅니다 (응답 뒤에 실행)
    triggerAdminOrderAlert();
    return done(approvedAt, method);
  } catch (error) {
    console.error('[결제 승인] 서버 오류', error);
    return NextResponse.json({ success: false, message: '서버 내부 에러가 발생했습니다.' }, { status: 500 });
  }
}
