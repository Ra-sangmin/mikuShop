import { NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId } = body;
    const amount = Number(body.amount);
    const deposit = Number(body.deposit ?? 0);

    // 🔒 로그인 회원 확인
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    // 🔒 음수/비정상 금액 차단 (음수 보증금으로 잔액이 늘어나는 것 방지)
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(deposit) || deposit < 0) {
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

    // 1. 해당 주문 찾기 및 유저 정보 확인
    const order = await prisma.order.findUnique({
      where: { orderId: orderId },
      include: { user: { omit: { password: true } } }
    });

    // 🔒 본인 주문만 추가 입찰 가능
    if (!order || order.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: "주문을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // // 2. 유저의 잔액 확인 (보증금을 차감할 수 있는지)
    // if (order.user.cyberMoney < deposit) {
    //   return NextResponse.json(
    //     { success: false, error: "잔액이 부족합니다. 충전 후 이용해주세요." },
    //     { status: 400 }
    //   );
    // }

    // 3. 트랜잭션 처리 (입찰가 업데이트 + 유저 잔액 차감 + 보증금 기록)
    const result = await prisma.$transaction(async (tx) => {
      // (1) 주문 정보 업데이트 (내 입찰가 증가 및 보증금 누적)
      const updatedOrder = await tx.order.update({
        where: { orderId: orderId },
        data: {
          myBidPrice: { increment: amount }, // 기존 입찰가에 더함
          depositAmount: { increment: deposit }, // 기존 보증금에 더함
          bidStatus: 'ADDITIONAL',
          status: "BIDDING", // 상태를 진행중으로 변경
          // 🕒 상태가 실제로 바뀔 때만 변경 시각을 남깁니다.
          ...(order.status !== "BIDDING" ? { statusChangedAt: new Date() } : {}),
        }
      });

      // (2) 유저 사이버머니 차감
      await tx.user.update({
        where: { id: order.userId },
        data: {
          cyberMoney: { decrement: deposit }
        }
      });

      return updatedOrder;
    });

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