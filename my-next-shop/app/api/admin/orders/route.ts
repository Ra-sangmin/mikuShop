import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';
import { notifyOrderStatusChanged, shouldNotify } from '@/lib/notifications/orderStatusMail';
import { notifyOrderStatusByAlimtalk, shouldSendAlimtalk } from '@/lib/notifications/orderStatusAlimtalk';
import { ORDER_STATUS, FAILED_STATUSES } from '@/src/types/order';
// 🔨 낙찰되면 미쿠짱머니에서 바로 결제합니다. (금액 계산은 마이페이지와 같은 식)
import { calcBidCharge } from '@/lib/bidSettlement';
import { moneyLogText } from '@/lib/moneyLogText';
import { triggerAdminOrderAlert } from '@/lib/notifications/adminOrderAlertRunner';

// 🌟 1. GET: DB에서 주문 목록과 유저 정보를 함께 가져옵니다.
export async function GET() {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        userId: true,
        type: true,
        bundleId: true,
        orderId: true,
        productId: true,
        trackingNo: true,
        shippingCarrierId: true,
        productImageUrl: true,
        productPrice: true,
        productName: true,
        productUrl: true,
        productOption: true,
        productRequest: true,
        registeredAt: true,
        receivedAt: true,
        shippedAt: true,
        statusChangedAt: true,
        serviceRequest: true,
        status: true,
        deliveryStatus: true,
        // ⚠️ 구매 요청 단계의 일본내 배송료(¥) 입니다.
        //    배송비 결제 대기 단계의 현지 배송비는 아래 shippingFee 쪽입니다.
        domesticShippingFee: true, 
        addressId: true,
        bidStatus: true,
        // 🔨 경매 주문의 값들. 주문 관리 표('입찰 신청 가격')와 상세 보기가 씁니다.
        //    ⚠️ 여기에 없으면 화면은 조용히 '-' 만 보여 줍니다. 값이 없는 게 아니라 안 보낸 것입니다.
        myBidPrice: true,
        depositAmount: true,
        depositKrw: true,
        depositRefundedKrw: true,
        // 💴 배송비 청구 내역. 추가 결제가 있을 수 있어 한 주문에 여러 회차가 붙습니다.
        shippingFees: {
          select: {
            id: true, round: true,
            intlFeeJpy: true, intlFeeKrw: true,
            domesticFeeJpy: true, domesticFeeKrw: true,
            extraFeeKrw: true, appliedExchangeRate: true,
            memo: true, paidAt: true,
          },
          orderBy: { round: 'asc' },
        },
        user: {
          omit: { password: true }, // 🔒 비밀번호 해시는 내려보내지 않음
          include: {
            addresses: true 
          }
        },
      },
      orderBy: {
        registeredAt: 'desc', 
      }
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error("GET Orders Error:", error);
    return NextResponse.json({ error: '데이터를 불러오는데 실패했습니다.' }, { status: 500 });
  }
}

// 🌟 2. PUT: 변경된 주문 상태 저장 및 💸 머니 결제/이용내역 기록
export async function PUT(request: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const body = await request.json();
    // 프론트에서 보낸 paymentTitle(이용내역 제목)도 함께 받습니다.
    // skipAlimtalk: 관리자가 "이번 저장은 알림톡 보내지 않기"를 체크한 경우.
    //   입고 일괄 처리처럼 한 회원에게 여러 건이 몰릴 때 쓰라고 만든 스위치입니다.
    //   메일은 회원당 한 통으로 묶여 나가므로 이 스위치의 영향을 받지 않습니다.
    const { updates, type, userId, deductAmount, paymentTitle, skipAlimtalk } = body; 

    // 🔔 알림 대상 판별용: 변경 '전' 상태를 미리 읽어둡니다.
    //    (이미 같은 상태였다면 실제 변경이 아니므로 알림을 보내지 않습니다)
    const orderIds: string[] = Array.isArray(updates) ? updates.map((o: any) => o.id).filter(Boolean) : [];
    const previousStatuses = new Map<string, string>();
    // 🔨 낙찰 자동 결제용 — 주문의 금액 정보
    const previousOrders = new Map<string, any>();
    // 🔨 낙찰과 동시에 결제까지 끝난 주문. 안내 문구가 "결제해 주세요"로 나가면 안 되므로
    //    아래 알림 단계에서 상태를 '상품 결제 완료'로 바꿔 전달합니다.
    const autoPaidOrderIds = new Set<string>();
    // 💴 order_shipping_fees 행을 새로 만들 때 user_id 가 필요해서 같이 읽어 둡니다.
    const orderUserIds = new Map<string, number>();
    if (orderIds.length > 0) {
      const before = await prisma.order.findMany({
        where: { orderId: { in: orderIds } },
        // 🔨 낙찰 자동 결제에 필요한 값(낙찰가·수량·일본내 배송료·보증금)도 함께 읽습니다.
        select: {
          orderId: true, status: true, userId: true,
          productName: true, productPrice: true, productCount: true,
          domesticShippingFee: true, depositAmount: true, depositKrw: true, depositRefundedKrw: true,
        },
      });
      before.forEach(o => {
        previousStatuses.set(o.orderId, o.status);
        orderUserIds.set(o.orderId, o.userId);
        previousOrders.set(o.orderId, o);
      });
    }

    // ✅ 인터랙티브 트랜잭션 시작 (순차적 실행 및 롤백 보장)
    await prisma.$transaction(async (tx) => {
      
      // 💰 [머니 결제 로직] 사이버머니 차감 및 로그 생성
      if (userId && deductAmount && deductAmount > 0) {
        const uid = parseInt(userId);
        const amount = Number(deductAmount);

        // 1. 유저 정보 조회 및 잔액 검증
        const user = await tx.user.findUnique({ where: { id: uid } });
        if (!user || user.cyberMoney < amount) {
          throw new Error('보유한 미쿠짱머니가 부족합니다.');
        }

        // 2. 머니 차감 실행
        const updatedUser = await tx.user.update({
          where: { id: uid },
          data: {
            cyberMoney: {
              decrement: amount
            }
          }
        });

        // 3. ✨ [핵심] 이용 내역(MoneyLog) 생성
        // 차감 후의 잔액(updatedUser.cyberMoney)을 기록합니다.
        await tx.moneyLog.create({
          data: {
            userId: uid,
            type: 'USE', // 이용내역 페이지 필터용
            content: moneyLogText.orderPayment(paymentTitle),
            amount: -Math.abs(amount), // 차감액은 마이너스 표시
            balanceAfter: updatedUser.cyberMoney // 차감 후 잔액
          }
        });
      }

      // 📦 [주문 업데이트 로직] 상태 및 부가 정보 변경
      for (const order of updates) {
        const updateData: any = {};
        
        if (type === 'delivery') {
          updateData.deliveryStatus = order.status;
        } else {

          console.log("업데이트할 주문 ID:", order.id, "새 상태:", order.status, "새 입찰 상태:", order.bidStatus);

          updateData.status = order.status;

          // 🐛 예전엔 상태를 한글 라벨('입고완료'·'국제배송')과 비교했는데, 화면이 보내는 값은
          //    Prisma enum('ARRIVED'·'SHIPPING')이라 조건이 한 번도 참이 되지 않았습니다.
          //    그래서 입고·발송 시각이 전혀 기록되지 않았고, 정산 화면은 발송일 대신 주문일을 쓰고 있었습니다.
          //    같은 상태로 다시 저장할 때 시각이 덮어써지지 않도록, 상태가 실제로 바뀐 경우에만 찍습니다.
          // 🔨 낙찰 처리에서 관리자가 확인한 **실제 낙찰가**를 함께 저장합니다.
          //    경매 요청 때 긁어온 현재가는 실제 낙찰가와 다릅니다. 이 값으로 정산합니다.
          //    (아래 자동 결제가 바로 이 값을 씁니다 — 저장 전에 먼저 반영해 둡니다)
          if (order.productPrice !== undefined) {
            const won = Number(order.productPrice);
            if (Number.isFinite(won) && won > 0) {
              updateData.productPrice = Math.round(won);
              const prevRow = previousOrders.get(order.id);
              if (prevRow) prevRow.productPrice = Math.round(won);
            }
          }

          const statusChanged = previousStatuses.get(order.id) !== order.status;

          // 💸 [낙찰 실패] 경매가 성사되지 않으면 받아 둔 보증금을 돌려줍니다.
          //    관리자가 팝업에서 '환불하고 처리'를 고른 경우에만 refundDeposit 이 실려 옵니다.
          //    ⚠️ 한 번만 돌려주도록 depositKrw 를 0 으로 내립니다. 같은 주문을 다시 실패 처리해도
          //       또 빠져나가지 않습니다. (돌려준 뒤에는 낙찰 정산에서 뺄 보증금도 없습니다)
          if (statusChanged && FAILED_STATUSES.includes(order.status) && order.refundDeposit === true) {
            const prev = previousOrders.get(order.id);
            const uid = orderUserIds.get(order.id);
            const deposit = Number(prev?.depositKrw) || 0;
            if (uid && deposit > 0) {
              const refunded = await tx.user.update({
                where: { id: uid },
                data: { cyberMoney: { increment: deposit } },
              });
              await tx.moneyLog.create({
                data: {
                  userId: uid,
                  type: 'REFUND',
                  content: moneyLogText.bidDepositRefund(prev?.productName ?? ''),
                  amount: deposit,
                  balanceAfter: refunded.cyberMoney,
                },
              });
              updateData.depositKrw = 0;
              updateData.depositRefundedKrw = deposit; // 💸 얼마를 돌려줬는지 남깁니다 (상세 화면 표시용)
              console.log('[낙찰 실패] 보증금 환불', { 주문: order.id, 금액: deposit, 잔액: refunded.cyberMoney });
            }
          }
          // 🕒 상태가 실제로 바뀐 경우에만 변경 시각을 남깁니다. ('처리 중 전체' 탭을 최근 변경순으로 정렬)
          if (statusChanged) updateData.statusChangedAt = new Date();

          // 🔨 [낙찰 자동 결제] 낙찰로 바뀌는 순간 미쿠짱머니에서 바로 결제합니다.
          //
          //   왜 기다리지 않나: 낙찰 뒤 결제를 기다리는 동안 일본 경매 사이트에서
          //   낙찰이 취소될 수 있습니다. 회원이 이미 넣어 둔 돈으로 바로 결제해 그 위험을 없앱니다.
          //
          //   ⚠️ 잔액이 모자라면 **건드리지 않고** 지금까지처럼 '낙찰 성공'에 두어 결제를 요청합니다.
          //      억지로 빼면 마이너스 잔액이 생기고, 그건 회원에게서 회수할 방법이 없습니다.
          //   ⚠️ 같은 저장을 두 번 눌러도 한 번만 빠집니다. (이미 낙찰 상태였으면 statusChanged 가 false)
          if (statusChanged && order.status === ORDER_STATUS.BID_SUCCESS) {
            const prev = previousOrders.get(order.id);
            const uid = orderUserIds.get(order.id);
            if (prev && uid) {
              const charge = await calcBidCharge(prev);
              const buyer = await tx.user.findUnique({ where: { id: uid }, select: { cyberMoney: true } });
              const balance = buyer?.cyberMoney ?? 0;

              // 💰 이미 낸 보증금이 총액을 덮는 경우(낙찰가가 아주 작을 때) 더 받을 게 없습니다.
              //    ⚠️ 이때 그냥 넘어가면 결제가 끝났는데도 '낙찰 성공'에 머물러,
              //       회원에게는 결제하라고 하고 관리자는 왜 안 넘어가는지 알 수 없었습니다.
              if (charge.amountWon <= 0) {
                updateData.status = ORDER_STATUS.BID_PAID;
                autoPaidOrderIds.add(order.id);

                // 💰 남은 보증금은 바로 미쿠짱머니로 돌려줍니다.
                //    최소 보증금이 ¥2,000 이라, 그보다 싸게 낙찰되면 낸 돈이 남습니다.
                //    돌려주지 않으면 회원 돈이 이유 없이 묶입니다.
                const excess = charge.depositWon - charge.totalWon;
                if (excess > 0) {
                  const refunded = await tx.user.update({
                    where: { id: uid },
                    data: { cyberMoney: { increment: excess } },
                  });
                  await tx.moneyLog.create({
                    data: {
                      userId: uid,
                      type: 'REFUND',
                      content: moneyLogText.bidDepositRefund(prev.productName ?? '', charge.totalWon),
                      amount: excess,
                      balanceAfter: refunded.cyberMoney,
                    },
                  });
                  // 보증금 기록도 실제로 쓴 만큼만 남깁니다. (돌려준 돈까지 낸 것으로 두면 장부가 어긋납니다)
                  updateData.depositKrw = charge.totalWon;
                }

                console.log('[낙찰 자동 결제] 보증금으로 충당 · 남은 보증금 반환',
                  { 주문: order.id, 총액: charge.totalWon, 보증금: charge.depositWon, 반환: Math.max(0, excess) });
              } else if (balance >= charge.amountWon) {
                const paid = await tx.user.update({
                  where: { id: uid },
                  data: { cyberMoney: { decrement: charge.amountWon } },
                });
                await tx.moneyLog.create({
                  data: {
                    userId: uid,
                    type: 'USE',
                    content: moneyLogText.bidSettlement(charge.totalWon, charge.depositWon, prev.productName ?? ''),
                    amount: -charge.amountWon,
                    balanceAfter: paid.cyberMoney,
                  },
                });
                // 결제까지 끝났으므로 '낙찰 성공'에 머무르지 않고 '경매 결제 완료'로 보냅니다.
                //    (구매대행의 '상품 결제 완료'와 같은 단계지만, 경매는 따로 보이게 둡니다)
                updateData.status = ORDER_STATUS.BID_PAID;
                autoPaidOrderIds.add(order.id);
                console.log('[낙찰 자동 결제]', {
                  주문: order.id, 청구: charge.amountWon, 보증금차감: charge.depositWon, 잔액: paid.cyberMoney,
                });
              } else {
                // 잔액 부족 → 지금까지의 흐름(회원이 직접 결제)으로 둡니다.
                console.log('[낙찰 자동 결제] 잔액이 모자라 결제를 요청합니다.', {
                  주문: order.id, 필요: charge.amountWon, 잔액: balance,
                });
              }
            }
          }
          if (statusChanged && order.status === ORDER_STATUS.ARRIVED) {
            updateData.receivedAt = new Date();
          }
          if (statusChanged && order.status === ORDER_STATUS.SHIPPING) {
            updateData.shippedAt = new Date();
          }
        }

        if (order.bundleId !== undefined) {
          updateData.bundleId = order.bundleId;
        }
        if (order.trackingNo !== undefined) {
          updateData.trackingNo = order.trackingNo;
        }
        // 🚚 국제배송으로 넘길 때 고른 배송 업체 (빈 값이면 연결 해제)
        if (order.shippingCarrierId !== undefined) {
          const carrierId = Number(order.shippingCarrierId);
          updateData.shippingCarrierId = Number.isInteger(carrierId) && carrierId > 0 ? carrierId : null;
        }
        if (order.address_id !== undefined) {
          updateData.addressId = order.address_id ? parseInt(order.address_id) : null;
        }

        // 🌟 [핵심 추가] 프론트엔드에서 보낸 bidStatus 값이 있다면 업데이트 데이터에 포함!
        if (order.bidStatus !== undefined) updateData.bidStatus = order.bidStatus;


        await tx.order.update({
          where: { orderId: order.id },
          data: updateData
        });

        // 💴 배송비 결제 대기 단계의 금액은 별도 테이블에 주문당 한 행으로 썽니다.
        //    화면이 금액을 하나도 보내지 않았으면(상태만 바꾸는 저장) 건드리지 않습니다.
        //    화면이 금액을 보냈으면 해당 회차를 쓰거나 새로 만듭니다. (상태만 바꾸는 저장은 건드리지 않음)
        if (order.shippingFee) {
          const f = order.shippingFee;
          const round = Number(f.round) || 1;
          const feeData = {
            intlFeeJpy: Number(f.intlFeeJpy) || 0,
            intlFeeKrw: Number(f.intlFeeKrw) || 0,
            domesticFeeJpy: Number(f.domesticFeeJpy) || 0,
            domesticFeeKrw: Number(f.domesticFeeKrw) || 0,
            extraFeeKrw: Number(f.extraFeeKrw) || 0,
            appliedExchangeRate: Number(f.appliedExchangeRate) || 0,
            memo: typeof f.memo === 'string' && f.memo.trim() ? f.memo.trim() : null,
          };
          // ⚠️ 이미 결제된 회차는 고치지 않습니다. 고객이 낸 금액이 나중에 바뀌면 정산이 맞지 않습니다.
          const existing = await tx.orderShippingFee.findUnique({ where: { orderId_round: { orderId: order.id, round } } });
          if (existing?.paidAt) {
            console.warn(`[배송비] ${order.id} ${round}차는 이미 결제돼 수정하지 않습니다.`);
          } else {
            await tx.orderShippingFee.upsert({
              where: { orderId_round: { orderId: order.id, round } },
              create: { orderId: order.id, userId: orderUserIds.get(order.id) ?? 0, round, ...feeData },
              update: feeData,
            });
          }
        }

        // 🗑️ 관리자가 잘못 넣은 추가 청구 취소. 결제 전(미납)인 회차만 지워집니다.
        if (order.deleteShippingFeeRound !== undefined) {
          await tx.orderShippingFee.deleteMany({
            where: { orderId: order.id, round: Number(order.deleteShippingFeeRound), paidAt: null },
          });
        }

        // 💰 배송비 결제 완료로 넘어오는 순간, 미납 회차를 납부 처리합니다.
        //    (추가 청구로 배송비 결제 대기으로 되돌아갈 땐 건드리지 않으므로 이미 난 회차는 그대로 남습니다)
        if (type !== 'delivery' && order.status === ORDER_STATUS.PAYMENT_DONE
            && previousStatuses.get(order.id) !== ORDER_STATUS.PAYMENT_DONE) {
          await tx.orderShippingFee.updateMany({
            where: { orderId: order.id, paidAt: null },
            data: { paidAt: new Date() },
          });
        }
      }
    });

    // 🔔 주문 저장이 끝난 뒤(트랜잭션 밖에서) 상태 변경 알림을 보냅니다.
    //    발송 실패가 주문 저장을 롤백시키면 안 되므로 트랜잭션 안에 넣지 않습니다.
    //    메일과 알림톡은 각자 자기 화이트리스트로 다시 거르므로 여기서는 둘 중 하나라도 해당하면 넘깁니다.
    if (type !== 'delivery' && Array.isArray(updates)) {
      const requested = updates as any[];
      const changes = requested
        .filter(o => o?.id && o?.status)
        .filter(o => previousStatuses.get(o.id) !== o.status) // 실제로 바뀐 것만
        // 🔨 낙찰과 동시에 결제까지 된 주문은 실제 저장된 상태(상품 결제 완료)로 알립니다.
        //    요청값(낙찰 성공)으로 보내면 이미 돈이 빠진 회원에게 "결제해 주세요"가 갑니다.
        .map(o => ({
          orderId: o.id as string,
          status: (autoPaidOrderIds.has(o.id) ? ORDER_STATUS.BID_PAID : o.status) as string,
        }))
        .filter(o => shouldNotify(o.status) || shouldSendAlimtalk(o.status));
      if (changes.length > 0) {
        const mailResult = await notifyOrderStatusChanged(changes);
        console.log('[알림] 주문 상태 메일:', mailResult);

        // 💬 낙찰 성공 등 검수를 통과한 상태만 알림톡이 나갑니다. (lib/notifications/orderStatusAlimtalk.ts)
        if (skipAlimtalk) {
          console.log(`[알림] 알림톡 건너뜀 ${changes.length}건 — 관리자가 '알림톡 보내지 않기'를 선택했습니다.`);
        } else {
          const talkResult = await notifyOrderStatusByAlimtalk(changes);
          console.log('[알림] 주문 상태 알림톡:', talkResult);
        }
      } else {
        // 📋 이미 같은 상태였던 주문을 다시 저장하면 알림이 나가지 않습니다.
        //    "바꿨는데 안 왔다"의 상당수가 이 경우라, 이유를 남겨 둡니다.
        console.log('[알림] 보낼 상태 변경이 없어 알림을 건너뜁니다.',
          requested.map(o => `${o?.id}: ${previousStatuses.get(o?.id) ?? '(이전값없음)'} → ${o?.status}`).join(', '));
      }
    }

    // 🔔 관리자 처리 필요 알림을 바로 보냅니다 (응답 뒤에 실행 — 기다리지 않음)
    triggerAdminOrderAlert();
    return NextResponse.json({ success: true, message: '성공적으로 처리되었습니다.' });
  } catch (error: any) {
    console.error("저장/결제 에러:", error);
    return NextResponse.json({ error: error.message || '업데이트 실패' }, { status: 500 });
  }
}

// 🌟 3. DELETE: 주문 삭제
//    바로 지우지 않고, 지우기 직전 모습을 삭제 보관함(deleted_orders)에 복사한 뒤 지웁니다.
//    복사와 삭제를 한 트랜잭션으로 묶어, 복사에 실패하면 주문도 지워지지 않습니다.
export async function DELETE(request: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('id');
    // (선택) 삭제 사유
    const reason = searchParams.get('reason')?.trim().slice(0, 1000) || null;

    if (!orderId) {
      return NextResponse.json({ error: '주문 ID(id)가 필요합니다.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { orderId },
        include: { shippingFees: true },
      });
      if (!order) return null;

      await tx.deletedOrder.create({
        data: {
          orderDbId: order.id,
          orderId: order.orderId,
          userId: order.userId,
          orderType: String(order.type),
          status: String(order.status),
          bundleId: order.bundleId,
          productName: order.productName,
          productPrice: order.productPrice,
          productCount: order.productCount,
          productUrl: order.productUrl,
          depositKrw: order.depositKrw,
          registeredAt: order.registeredAt,
          // 날짜 등을 JSON 으로 바꿔 통째로 남깁니다. (배송비 청구 내역 포함)
          orderData: JSON.parse(JSON.stringify(order)),
          deletedByAdminId: adminAuth.admin.adminId,
          deletedByName: adminAuth.admin.name,
          reason,
        },
      });
      // 배송비 청구 내역(order_shipping_fees)은 onDelete: Cascade 로 함께 지워집니다. (위 JSON 에 남아 있음)
      await tx.order.delete({ where: { orderId } });
      return order;
    });

    if (!result) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
    }
    console.log(`[주문 삭제] ${orderId} (상태 ${result.status}) → deleted_orders 보관 · 관리자 ${adminAuth.admin.adminId}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Delete Order Error:", error);
    return NextResponse.json({ error: '주문 삭제에 실패했습니다.' }, { status: 500 });
  }
}
