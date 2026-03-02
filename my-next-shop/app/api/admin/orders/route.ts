import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 🌟 1. GET: DB에서 주문 목록과 유저 정보를 함께 가져옵니다.
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: {
          include: {
            // @ts-ignore
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

// 🌟 2. PUT: 변경된 주문 상태를 DB에 저장합니다.
export async function PUT(request: Request) {
  try {
    const { updates, type, userId, deductAmount } = await request.json(); 

    const operations: any[] = [];

    // 사이버머니 차감이 필요한 경우 처리
    if (userId && deductAmount && deductAmount > 0) {
      operations.push(prisma.user.update({
        where: { id: parseInt(userId) },
        data: {
          cyberMoney: {
            decrement: deductAmount
          }
        }
      }));
    }

    const orderUpdates = updates.map((order: any) => {
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

      if (order.recipient !== undefined) {
        updateData.recipient = order.recipient;
      }

      // 🌟 [핵심 수정 부분] 프론트엔드에서 보낸 'address_id'를 읽어오도록 수정
      if (order.address_id !== undefined) {
        // 주의: Prisma 스키마 모델에 정의된 필드명이 addressId 라면 아래처럼 사용하시고, 
        // 만약 스키마에도 address_id 로 되어있다면 updateData.address_id 로 변경해 주세요.
        updateData.addressId = order.address_id ? parseInt(order.address_id) : null;
      }

      return prisma.order.update({
        where: { orderId: order.id },
        data: updateData
      });
    });

    operations.push(...orderUpdates);

    await prisma.$transaction(operations);

    return NextResponse.json({ success: true, message: '성공적으로 저장되었습니다.' });
  } catch (error: any) {
    console.error("저장 에러:", error);
    return NextResponse.json({ error: 'DB 업데이트 실패' }, { status: 500 });
  }
}