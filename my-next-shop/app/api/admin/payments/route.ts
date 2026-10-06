// 💳 관리자 — 주문의 카드 결제 내역 조회 · 결제 취소(환불)
//
// GET  ?orderId=<주문번호>   그 주문이 들어간 결제들과, 그 안에서 이 주문의 몫·취소 내역
// POST { paymentItemId, amount, reason }   그 주문 몫 안에서 (부분) 취소
//
// 돌려줄 돈(구매 실패 · 패찰 보증금 · 남는 보증금 · 차액)은 모두 여기서 관리자가 직접 취소합니다.
// 토스 정책상 환불은 결제했던 수단(카드 취소)으로만 합니다.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';
import { tossCancel } from '@/lib/payments/toss';
import { PURPOSE_LABEL, type PaymentPurpose } from '@/lib/payments/quote';

export async function GET(request: Request) {
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  const orderId = new URL(request.url).searchParams.get('orderId');
  if (!orderId) return NextResponse.json({ success: false, message: '주문번호가 필요합니다.' }, { status: 400 });

  const items = await prisma.paymentItem.findMany({
    where: { orderId, payment: { status: { not: 'READY' } } },
    orderBy: { id: 'asc' },
    select: {
      id: true, amount: true, canceledAmount: true,
      payment: {
        select: {
          tossOrderId: true, purpose: true, orderName: true, amount: true, canceledAmount: true,
          status: true, method: true, approvedAt: true, _count: { select: { items: true } },
        },
      },
      cancels: { select: { amount: true, reason: true, canceledBy: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
    },
  });

  return NextResponse.json({
    success: true,
    items: items.map(i => ({
      id: i.id,
      amount: i.amount,
      canceledAmount: i.canceledAmount,
      cancelable: (i.payment.status === 'DONE' || i.payment.status === 'PARTIAL_CANCELED') ? i.amount - i.canceledAmount : 0,
      cancels: i.cancels,
      payment: {
        tossOrderId: i.payment.tossOrderId,
        purpose: i.payment.purpose,
        purposeLabel: PURPOSE_LABEL[i.payment.purpose as PaymentPurpose],
        orderName: i.payment.orderName,
        amount: i.payment.amount,
        canceledAmount: i.payment.canceledAmount,
        status: i.payment.status,
        method: i.payment.method,
        approvedAt: i.payment.approvedAt,
        orderCount: i.payment._count.items,
      },
    })),
  });
}

export async function POST(request: Request) {
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const itemId = Number(body?.paymentItemId);
    const amount = Number(body?.amount);
    const reason = String(body?.reason ?? '').trim().slice(0, 200);
    if (!Number.isInteger(itemId) || itemId <= 0 || !Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ success: false, message: '취소할 금액을 확인해 주세요.' }, { status: 400 });
    }
    if (!reason) return NextResponse.json({ success: false, message: '취소 사유를 적어 주세요.' }, { status: 400 });

    const item = await prisma.paymentItem.findUnique({ where: { id: itemId }, include: { payment: true } });
    if (!item) return NextResponse.json({ success: false, message: '결제 내역을 찾을 수 없습니다.' }, { status: 404 });
    const { payment } = item;
    if (!payment.paymentKey || (payment.status !== 'DONE' && payment.status !== 'PARTIAL_CANCELED')) {
      return NextResponse.json({ success: false, message: '취소할 수 없는 결제입니다.' }, { status: 400 });
    }
    const remaining = item.amount - item.canceledAmount;
    if (amount > remaining) {
      return NextResponse.json({ success: false, message: `이 주문에서 취소할 수 있는 금액은 ${remaining.toLocaleString()}원입니다.` }, { status: 400 });
    }

    // 같은 상태에서 같은 금액으로 다시 누르면(응답이 끊겨 재시도 등) 토스가 처음 결과를 돌려줘 두 번 취소되지 않습니다.
    const idempotencyKey = `cancel-${item.id}-${item.canceledAmount}-${amount}`;
    const toss = await tossCancel(payment.paymentKey, reason, amount, idempotencyKey);
    if (!toss.ok) {
      console.error('[결제 취소] 토스 거절', { item: item.id, code: toss.code, message: toss.message });
      return NextResponse.json({ success: false, message: toss.message }, { status: 400 });
    }
    const cancels: any[] = Array.isArray(toss.data?.cancels) ? toss.data.cancels : [];
    const transactionKey: string | null = cancels.length ? cancels[cancels.length - 1]?.transactionKey ?? null : null;

    await prisma.$transaction(async (tx) => {
      // increment 로 더해서, 같은 순간 다른 관리자가 취소해도 금액이 덮어써지지 않습니다.
      await tx.paymentItem.update({ where: { id: item.id }, data: { canceledAmount: { increment: amount } } });
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: { canceledAmount: { increment: amount } },
        select: { amount: true, canceledAmount: true },
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: updated.canceledAmount >= updated.amount ? 'CANCELED' : 'PARTIAL_CANCELED' },
      });
      await tx.paymentCancel.create({
        data: { paymentId: payment.id, paymentItemId: item.id, amount, reason, transactionKey, canceledBy: adminAuth.admin.adminId },
      });
      // 💰 보증금을 돌려줬으면 주문의 '낸 보증금'도 줄입니다. 낙찰 정산이 이 값을 빼 주기 때문입니다.
      //    (주문이 이미 지워졌을 수 있어 updateMany 를 씁니다)
      if (payment.purpose === 'DEPOSIT') {
        const order = await tx.order.findUnique({ where: { orderId: item.orderId }, select: { depositKrw: true } });
        if (order) {
          const back = Math.min(amount, order.depositKrw);
          await tx.order.updateMany({
            where: { orderId: item.orderId },
            data: { depositKrw: { decrement: back }, depositRefundedKrw: { increment: back } },
          });
        }
      }
    });

    console.log('[결제 취소]', { 주문: item.orderId, 결제: payment.tossOrderId, 금액: amount, 사유: reason, 관리자: adminAuth.admin.adminId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[결제 취소] 서버 오류', error);
    return NextResponse.json({ success: false, message: '서버 오류로 취소 결과를 저장하지 못했습니다. 토스 관리자 화면에서 취소 여부를 확인해 주세요.' }, { status: 500 });
  }
}
