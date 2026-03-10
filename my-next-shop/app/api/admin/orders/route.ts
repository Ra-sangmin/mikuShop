import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 🌟 1. GET: DB에서 주문 목록과 유저 정보를 함께 가져옵니다.
export async function GET() {
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
        user: {
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
  try {
    const body = await request.json();
    // 프론트에서 보낸 paymentTitle(이용내역 제목)도 함께 받습니다.
    const { updates, type, userId, deductAmount, paymentTitle } = body; 

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
          updateData.status = order.status;
          
          if (order.status === '입고완료') {
            updateData.receivedAt = new Date();
          }
          if (order.status === '국제배송') {
            updateData.shippedAt = new Date();
          }
        }

        if (order.secondPaymentAmount !== undefined) {
          updateData.secondPaymentAmount = order.secondPaymentAmount;
        }
        if (order.bundleId !== undefined) {
          updateData.bundleId = order.bundleId;
        }
        if (order.trackingNo !== undefined) {
          updateData.trackingNo = order.trackingNo;
        }
        if (order.address_id !== undefined) {
          updateData.addressId = order.address_id ? parseInt(order.address_id) : null;
        }

        await tx.order.update({
          where: { orderId: order.id },
          data: updateData
        });
      }
    });

    return NextResponse.json({ success: true, message: '성공적으로 처리되었습니다.' });
  } catch (error: any) {
    console.error("저장/결제 에러:", error);
    return NextResponse.json({ error: error.message || '업데이트 실패' }, { status: 500 });
  }
}

// 🌟 3. DELETE: 주문 삭제
export async function DELETE(request: Request) {
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