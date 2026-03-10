import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

// 🟢 [GET] 1. 주문 목록 및 유저 정보 조회
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

// 🔵 [POST] 2. 상품 주문(장바구니) 생성
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      userId, 
      productName, 
      productPrice, 
      productCount, 
      domesticShippingFee,
      productImageUrl, 
      productUrl, 
      productOption,
      serviceRequest,
      productRequest,
      status = "CART",
      type,
    } = body;

    let finalTitle = productName;
    if (!finalTitle) finalTitle = "구매대행 요청 (상품명 추출 불가)";

    if (!userId || !productUrl || !productPrice) {
      return NextResponse.json({ error: '필수 정보(유저ID, URL, 가격)가 누락되었습니다.' }, { status: 400 });
    }

    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newOrder = await prisma.order.create({
      data: {
        userId: parseInt(userId),
        orderId: orderId,
        type: type || "PURCHASE",
        productName: finalTitle,
        productPrice: Math.round(productPrice),
        productCount: Number(productCount) || 0,
        domesticShippingFee: Number(domesticShippingFee) || 0,
        productImageUrl: productImageUrl || "",
        productUrl: productUrl,
        productOption: productOption || "",
        serviceRequest: serviceRequest || "",
        productRequest: productRequest || "",
        status: status === "장바구니" ? "CART" : (status || "CART"),
      }
    });

    return NextResponse.json({ success: true, order: newOrder, productName: finalTitle });
  } catch (error) {
    console.error("❌ API Route Fatal Error (POST):", error);
    return NextResponse.json({ success: false, error: "주문 생성 중 서버 에러가 발생했습니다." }, { status: 500 });
  }
}

// 🟡 [PUT] 3. 주문 상태 저장 및 💸 머니 결제/이용내역 기록
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { updates, type, userId, deductAmount, paymentTitle } = body; 

    // ✅ 안전한 인터랙티브 트랜잭션 (모두 성공하거나 자동 롤백)
    await prisma.$transaction(async (tx) => {
      
      // 💰 [머니 결제 로직] 사이버머니 차감 및 로그 생성
      if (userId && deductAmount && deductAmount > 0) {
        const uid = parseInt(userId);
        const amount = Number(deductAmount);

        // 잔액 검증
        const user = await tx.user.findUnique({ where: { id: uid } });
        if (!user || user.cyberMoney < amount) {
          throw new Error('보유한 미쿠짱머니가 부족합니다.');
        }

        // 잔액 차감
        const updatedUser = await tx.user.update({
          where: { id: uid },
          data: { cyberMoney: { decrement: amount } }
        });

        // ✨ 핵심: 결제 완료 후 이용 내역(MoneyLog) 기록 남기기
        await tx.moneyLog.create({
          data: {
            userId: uid,
            type: 'USE', // 이용내역 페이지 필터용
            content: paymentTitle || '주문/배송비 결제', 
            amount: -Math.abs(amount), // 마이너스 표시
            balanceAfter: updatedUser.cyberMoney // 차감 후 잔액
          }
        });
      }

      // 📦 [주문 업데이트 로직] 디테일한 상태 및 부가 정보 변경
      for (const order of updates) {
        const updateData: any = {};
        
        // 배송 상태 업데이트인지, 일반 주문 상태 업데이트인지 분기 처리
        if (type === 'delivery') {
          updateData.deliveryStatus = order.status;
        } else {
          updateData.status = order.status;
          
          if (order.status === '입고완료') updateData.receivedAt = new Date();
          if (order.status === '국제배송') updateData.shippedAt = new Date();
        }

        if (order.secondPaymentAmount !== undefined) updateData.secondPaymentAmount = order.secondPaymentAmount;
        if (order.bundleId !== undefined) updateData.bundleId = order.bundleId;
        if (order.trackingNo !== undefined) updateData.trackingNo = order.trackingNo;
        if (order.address_id !== undefined) updateData.addressId = order.address_id ? parseInt(order.address_id) : null;

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

// 🔴 [DELETE] 4. 주문 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('id'); 

    if (!orderId) {
      return NextResponse.json({ error: '주문 ID(id)가 필요합니다.' }, { status: 400 });
    }

    await prisma.order.delete({
      where: { orderId: orderId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Delete Order Error:", error);
    return NextResponse.json({ error: '주문 삭제에 실패했습니다.' }, { status: 500 });
  }
}