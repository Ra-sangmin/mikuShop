// 💳 결제 준비 · 조회 (회원)
//
// POST  결제창을 열기 전에 부릅니다. 서버가 금액을 계산해 결제 건(READY)을 만들고,
//       토스에 보낼 주문번호와 금액을 돌려줍니다. 화면은 이 값으로만 결제창을 엽니다.
// GET   ?id=<토스 주문번호>  결제 화면(/payment/checkout)이 보여 줄 내용
//       ?list=1             마이페이지 결제 내역
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { buildQuote, purposeFromStatus, QuoteError, PURPOSE_LABEL, type PaymentPurpose } from '@/lib/payments/quote';

/** 토스 주문번호 규칙: 영문·숫자·-·_ 6~64자. 우리 주문번호와 헷갈리지 않게 PAY- 로 시작합니다. */
function newTossOrderId() {
  const d = new Date();
  const ymd = `${d.getFullYear() % 100}`.padStart(2, '0')
    + `${d.getMonth() + 1}`.padStart(2, '0') + `${d.getDate()}`.padStart(2, '0');
  return `PAY-${ymd}-${randomBytes(6).toString('hex').toUpperCase()}`;
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const orderIds: string[] = Array.isArray(body?.orderIds) ? body.orderIds.map(String) : [];
    // 화면은 지금 보고 있는 탭(주문 상태)을 보냅니다. 결제 종류는 서버가 정합니다.
    const purpose = purposeFromStatus(String(body?.fromStatus ?? ''));
    if (!purpose) return NextResponse.json({ success: false, message: '결제할 수 없는 단계입니다.' }, { status: 400 });

    const quote = await buildQuote(auth.userId, purpose, orderIds);

    const payment = await prisma.payment.create({
      data: {
        tossOrderId: newTossOrderId(),
        userId: auth.userId,
        purpose,
        orderName: quote.orderName,
        amount: quote.amount,
        items: { create: quote.items.map(i => ({ orderId: i.orderId, amount: i.amount })) },
      },
      select: { tossOrderId: true },
    });

    return NextResponse.json({ success: true, id: payment.tossOrderId });
  } catch (error) {
    if (error instanceof QuoteError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 409 });
    }
    console.error('[결제 준비] 오류', error);
    return NextResponse.json({ success: false, message: '결제를 준비하지 못했습니다.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  // 📜 결제 내역 (최근 순)
  if (!id) {
    const payments = await prisma.payment.findMany({
      where: { userId: auth.userId, status: { not: 'READY' } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        tossOrderId: true, purpose: true, orderName: true, amount: true, canceledAmount: true,
        status: true, method: true, approvedAt: true, createdAt: true,
        cancels: { select: { amount: true, reason: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    return NextResponse.json({
      success: true,
      payments: payments.map(p => ({ ...p, purposeLabel: PURPOSE_LABEL[p.purpose as PaymentPurpose] })),
    });
  }

  const payment = await prisma.payment.findUnique({
    where: { tossOrderId: id },
    select: {
      tossOrderId: true, userId: true, purpose: true, orderName: true, amount: true, status: true,
      user: { select: { name: true, email: true } },
      items: { select: { orderId: true, amount: true } },
    },
  });
  if (!payment || payment.userId !== auth.userId) {
    return NextResponse.json({ success: false, message: '결제 정보를 찾을 수 없습니다.' }, { status: 404 });
  }
  const orders = await prisma.order.findMany({
    where: { orderId: { in: payment.items.map(i => i.orderId) } },
    select: { orderId: true, productName: true, productImageUrl: true },
  });
  const orderById = new Map(orders.map(o => [o.orderId, o]));

  return NextResponse.json({
    success: true,
    payment: {
      id: payment.tossOrderId,
      purpose: payment.purpose,
      purposeLabel: PURPOSE_LABEL[payment.purpose as PaymentPurpose],
      orderName: payment.orderName,
      amount: payment.amount,
      status: payment.status,
      // 토스 customerKey 규칙(영문·숫자·-_=.@ 2~50자)에 맞춘 회원 식별값
      customerKey: `MIKU-USER-${auth.userId}`,
      customerName: payment.user.name,
      customerEmail: payment.user.email,
      items: payment.items.map(i => ({
        orderId: i.orderId,
        productName: orderById.get(i.orderId)?.productName ?? '(삭제된 주문)',
        productImageUrl: orderById.get(i.orderId)?.productImageUrl ?? null,
        amount: i.amount,
      })),
    },
  });
}
