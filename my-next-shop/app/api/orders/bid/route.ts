import { NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { triggerAdminOrderAlert } from '@/lib/notifications/adminOrderAlertRunner';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId } = body;
    const amount = Number(body.amount);
    // 💰 추가 입찰에서는 **보증금을 더 받지 않습니다.** 처음 낸 보증금 그대로 진행합니다.
    //    (보증금은 '보증금 결제'(BID_PENDING → BIDDING, app/api/orders PUT)에서 한 번만 받습니다)

    // 🔒 로그인 회원 확인
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    // 🔒 음수/비정상 금액 차단 (입찰가가 줄어드는 것 방지)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "금액 값이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    if (!orderId || !amount) {
      return NextResponse.json(
        { success: false, error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 1. 해당 주문 찾기
    const order = await prisma.order.findUnique({
      where: { orderId: orderId },
      select: { userId: true, status: true },
    });

    // 🔒 본인 주문만 추가 입찰 가능
    if (!order || order.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: "주문을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 🔒 보증금을 낸 '경매 중' 주문만 추가 입찰할 수 있습니다.
    //    추가 입찰은 보증금을 받지 않으므로, 이 검사가 없으면 '경매 요청(BID_PENDING)' 상태에서
    //    이 경로로 바로 BIDDING 이 되어 보증금 없이 입찰이 시작됩니다.
    if (order.status !== "BIDDING") {
      return NextResponse.json(
        { success: false, error: "경매 중인 상품만 추가 입찰할 수 있습니다." },
        { status: 400 }
      );
    }

    // 2. 입찰가만 올립니다. 보증금(depositKrw)과 미쿠짱머니는 건드리지 않습니다.
    //    ⚠️ 예전에는 '지금 입찰가 기준 보증금'과의 차액을 그때마다 더 받았습니다.
    //       소액 추가 결제가 자주 생겨 없앴고, 낙찰 정산은 실제로 낸 보증금(depositKrw)만 빼 줍니다.
    const result = await prisma.order.update({
      where: { orderId: orderId },
      data: {
        myBidPrice: { increment: amount }, // 기존 입찰가에 더함
        bidStatus: 'ADDITIONAL',
      }
    });

    // 🔔 추가 입찰을 관리자에게 바로 알립니다 (응답 뒤에 실행)
    triggerAdminOrderAlert();

    return NextResponse.json({
      success: true,
      message: "입찰이 성공적으로 완료되었습니다.",
      data: result
    });

  } catch (error) {
    console.error("❌ 입찰 API 에러:", error);
    return NextResponse.json(
      { success: false, error: "서버 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}