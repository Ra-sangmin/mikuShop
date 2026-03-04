import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      userId, 
      type,
      productName, // 클라이언트에서 넘어온 상품명
      productPrice, 
      productImageUrl, 
      productUrl, 
      productOption,
      serviceRequest,
      productRequest,
      status = "장바구니"
    } = body;

    let finalTitle = productName;

    // 🌟 1. 상품명이 없거나 비어있다면
    if (!finalTitle) {
      finalTitle = "구매대행 요청 (상품명 추출 불가)";
    }

    // 🌟 2. 필수 데이터 검증
    if (!userId || !productUrl || !productPrice) {
      return NextResponse.json({ error: '필수 정보(유저ID, URL, 가격)가 누락되었습니다.' }, { status: 400 });
    }

    // 🌟 3. DB 저장을 위한 주문 번호 생성
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 🌟 4. Prisma를 통해 DB에 저장
    const newOrder = await prisma.order.create({
      data: {
        userId: parseInt(userId),
        orderId: orderId,
        type: type,
        productName: finalTitle,
        productPrice: Math.round(productPrice),
        productImageUrl: productImageUrl || "",
        productUrl: productUrl,
        productOption: productOption || "",
        serviceRequest: serviceRequest || "",
        productRequest: productRequest || "",
        status: status
      }
    });

    // 5. 성공 응답 (생성된 주문 정보와 최종 상품명 반환)
    return NextResponse.json({ 
      success: true, 
      order: newOrder,
      productName: finalTitle 
    });

  } catch (error) {
    console.error("❌ API Route Fatal Error (POST):", error);
    return NextResponse.json({ 
      success: false, 
      error: "주문 생성 또는 처리 중 서버 에러가 발생했습니다." 
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: '주문 ID가 필요합니다.' }, { status: 400 });
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