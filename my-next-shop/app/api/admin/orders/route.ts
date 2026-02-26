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
    const { updates, type } = await request.json(); 

    // DB 구조가 바뀌었으므로, 고유 문자열인 orderId를 기준으로 상태를 업데이트합니다.
    const transaction = updates.map((order: any) => {
      const updateData: any = {};
      
      if (type === 'delivery') {
        updateData.deliveryStatus = order.status;
      } else {
        updateData.status = order.status;
      }

      return prisma.order.update({
        where: { orderId: order.id },
        data: updateData
      });
    });

    await prisma.$transaction(transaction);

    return NextResponse.json({ success: true, message: '성공적으로 저장되었습니다.' });
  } catch (error: any) {
    console.error("저장 에러:", error);
    return NextResponse.json({ error: 'DB 업데이트 실패' }, { status: 500 });
  }
}