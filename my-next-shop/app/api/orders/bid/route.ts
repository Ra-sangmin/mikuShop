import { NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { triggerAdminOrderAlert } from '@/lib/notifications/adminOrderAlertRunner';
// 💰 보증금은 엔으로 계산해 보여 주지만, 실제 차감은 그때 환율로 만든 원화입니다.
import { depositForBid } from '@/lib/bidSettlement';
import { moneyLogText } from '@/lib/moneyLogText';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId } = body;
    const amount = Number(body.amount);
    // 🔒 화면이 보낸 보증금(body.deposit)은 **쓰지 않습니다.**
    //    그대로 믿으면 deposit: 0 으로 보내 보증금 없이 입찰할 수 있었습니다.
    //    서버가 입찰가로 직접 계산합니다. (src/utils/auctionDeposit.ts)

    // 🔒 로그인 회원 확인
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    // 🔒 음수/비정상 금액 차단 (음수 보증금으로 잔액이 늘어나는 것 방지)
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

    // 2. 유저의 잔액 확인 (보증금을 차감할 수 있는지)
    //
    // ⚠️ 이 검사는 한동안 주석 처리돼 있었습니다. 그동안 아래에서 잔액을 그대로 깎았기 때문에
    //    보증금이 잔액보다 크면 **마이너스 잔액**이 만들어졌습니다. 한 번 마이너스가 되면
    //    충전해도 그만큼이 메워지는 데 쓰여, 회원은 영문을 모른 채 잔액이 줄어 보입니다.
    //    화면(마이페이지)에도 검사가 있지만 '추가 입찰' 경로에는 없어서, 서버가 막아야 합니다.
    //
    // 부족할 때는 code 를 함께 내려 화면이 "충전하러 가기"를 안내하게 합니다.
    // 💰 보증금은 **지금 입찰가 기준**입니다. 이미 낸 만큼은 빼고 차액만 더 받습니다.
    //    ⚠️ 예전에는 추가 입찰 때마다 새 보증금을 통째로 더했습니다.
    //       ¥30,000(보증금 ¥3,000) → ¥40,000 으로 올리면 ¥4,000 이 또 빠져 합계 ¥7,000 이 됐습니다.
    //       지금은 차액 ¥1,000 만 받고, 보증금 합계는 ¥4,000 이 됩니다.
    //    ⚠️ 원화 환산도 서버가 합니다. 화면 값을 믿으면 조작됩니다.
    const finalBidJpy = (order.myBidPrice ?? 0) + amount;              // 이번 입찰 뒤의 입찰가
    const { krw: targetDepositKrw, exchangeRate } = await depositForBid(finalBidJpy); // 필요한 보증금(원)
    const paidDepositKrw = order.depositKrw ?? 0;                       // 이미 받은 보증금(원)
    const depositKrw = Math.max(0, targetDepositKrw - paidDepositKrw);  // 이번에 더 받을 금액

    if (depositKrw > 0 && order.user.cyberMoney < depositKrw) {
      return NextResponse.json(
        {
          success: false,
          code: 'INSUFFICIENT_BALANCE',
          error: "미쿠짱머니가 부족합니다. 충전 후 이용해 주세요.",
          need: depositKrw,
          target: targetDepositKrw,
          exchangeRate,
          balance: order.user.cyberMoney,
          shortfall: depositKrw - order.user.cyberMoney,
        },
        { status: 400 }
      );
    }

    // 3. 트랜잭션 처리 (입찰가 업데이트 + 유저 잔액 차감 + 보증금 기록)
    const result = await prisma.$transaction(async (tx) => {
      // (1) 주문 정보 업데이트 (내 입찰가 증가 및 보증금 누적)
      const updatedOrder = await tx.order.update({
        where: { orderId: orderId },
        data: {
          myBidPrice: { increment: amount }, // 기존 입찰가에 더함
          // 💰 보증금은 '지금 입찰가에 필요한 금액'까지만 받습니다. (누적이 아닙니다)
          //    실제로 낸 원화가 쌓이고, 낙찰 정산에서 이 값을 돌려줍니다.
          depositKrw: { increment: depositKrw },
          bidStatus: 'ADDITIONAL',
          status: "BIDDING", // 상태를 진행중으로 변경
          // 🕒 상태가 실제로 바뀔 때만 변경 시각을 남깁니다.
          ...(order.status !== "BIDDING" ? { statusChangedAt: new Date() } : {}),
        }
      });

      // (2) 유저 사이버머니 차감 (원화) + 이용 내역 기록
      //     ⚠️ 예전에는 잔액만 깎고 MoneyLog 를 남기지 않아, 회원이 이용 내역에서
      //        추가 입찰 보증금이 빠진 이유를 찾을 수 없었습니다.
      if (depositKrw > 0) {
        const updatedUser = await tx.user.update({
          where: { id: order.userId },
          data: { cyberMoney: { decrement: depositKrw } },
        });
        await tx.moneyLog.create({
          data: {
            userId: order.userId,
            type: 'USE',
            content: moneyLogText.bidDeposit(order.productName),
            amount: -depositKrw,
            balanceAfter: updatedUser.cyberMoney,
          },
        });
      }

      return updatedOrder;
    });

    // 🔔 경매 중(BIDDING)으로 넘어오면 관리자에게 바로 알립니다 (응답 뒤에 실행)
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