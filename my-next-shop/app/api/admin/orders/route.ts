import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';
import { notifyOrderStatusChanged, shouldNotify } from '@/lib/notifications/orderStatusMail';
import { notifyOrderStatusByAlimtalk, shouldSendAlimtalk } from '@/lib/notifications/orderStatusAlimtalk';
import { ORDER_STATUS } from '@/src/types/order';

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
        serviceRequest: true,
        status: true,
        deliveryStatus: true,
        purchaseFee: true,
        domesticShippingFee: true, 
        addressId: true,
        secondPaymentAmount: true,
        bidStatus: true,
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
    if (type !== 'delivery' && orderIds.length > 0) {
      const before = await prisma.order.findMany({
        where: { orderId: { in: orderIds } },
        select: { orderId: true, status: true },
      });
      before.forEach(o => previousStatuses.set(o.orderId, o.status));
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
            content: paymentTitle || '주문/배송비 결제', 
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
          const statusChanged = previousStatuses.get(order.id) !== order.status;
          if (statusChanged && order.status === ORDER_STATUS.ARRIVED) {
            updateData.receivedAt = new Date();
          }
          if (statusChanged && order.status === ORDER_STATUS.SHIPPING) {
            updateData.shippedAt = new Date();
          }
        }

        if (order.secondPaymentAmount !== undefined) {
          updateData.secondPaymentAmount = order.secondPaymentAmount;
        }
        if (order.domesticShippingFee !== undefined) {
          updateData.domesticShippingFee = order.domesticShippingFee;
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
      }
    });

    // 🔔 주문 저장이 끝난 뒤(트랜잭션 밖에서) 상태 변경 알림을 보냅니다.
    //    발송 실패가 주문 저장을 롤백시키면 안 되므로 트랜잭션 안에 넣지 않습니다.
    //    메일과 알림톡은 각자 자기 화이트리스트로 다시 거르므로 여기서는 둘 중 하나라도 해당하면 넘깁니다.
    if (type !== 'delivery' && Array.isArray(updates)) {
      const requested = updates as any[];
      const changes = requested
        .filter(o => o?.id && o?.status && (shouldNotify(o.status) || shouldSendAlimtalk(o.status)))
        .filter(o => previousStatuses.get(o.id) !== o.status) // 실제로 바뀐 것만
        .map(o => ({ orderId: o.id as string, status: o.status as string }));
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

    return NextResponse.json({ success: true, message: '성공적으로 처리되었습니다.' });
  } catch (error: any) {
    console.error("저장/결제 에러:", error);
    return NextResponse.json({ error: error.message || '업데이트 실패' }, { status: 500 });
  }
}

// 🌟 3. DELETE: 주문 삭제
export async function DELETE(request: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('id'); 

    if (!orderId) {
      return NextResponse.json({ error: '주문 ID(id)가 필요합니다.' }, { status: 400 });
    }

    await prisma.order.delete({
      where: {
        orderId: orderId 
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Delete Order Error:", error);
    return NextResponse.json({ error: '주문 삭제에 실패했습니다.' }, { status: 500 });
  }
}