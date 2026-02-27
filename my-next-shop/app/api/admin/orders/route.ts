import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 🌟 1. GET: DB에서 주문 목록과 유저 정보를 함께 가져옵니다.
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: true, // 💡 핵심: Order 테이블과 연결된 User 테이블의 정보(이름 등)를 함께 가져옵니다!
      },
      orderBy: {
        registeredAt: 'desc', // 최신 등록일 순 정렬
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

    // 🌟 사이버머니 차감이 필요한 경우 처리
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

    // DB 구조가 바뀌었으므로, 고유 문자열인 orderId를 기준으로 상태를 업데이트합니다.
    const orderUpdates = updates.map((order: any) => {
      const updateData: any = {};
      
      if (type === 'delivery') {
        updateData.deliveryStatus = order.status;
      } else {
        updateData.status = order.status;
        // 🌟 입고완료 상태로 변경 시 입고완료일(receivedAt)을 현재 시간으로 설정
        if (order.status === '입고완료') {
          updateData.receivedAt = new Date();
        }
        // 🌟 국제배송 상태로 변경 시 국제배송일(shippedAt)을 현재 시간으로 설정
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
