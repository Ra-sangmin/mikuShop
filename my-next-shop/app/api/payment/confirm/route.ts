import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // 🌟 Prisma 클라이언트 임포트 필수

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paymentKey, orderId, amount, userId } = body;

    // 🌟 1. 토스페이먼츠 결제위젯 시크릿 키
    // 개발자 센터 '결제위젯 연동 키' 영역에 있는 시크릿 키를 입력하세요.
    const widgetSecretKey = "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6"; 
    
    // 토스 API 스펙에 맞게 키를 Base64로 인코딩 (끝에 콜론 ':' 을 반드시 붙여야 합니다)
    const encryptedSecretKey = Buffer.from(`${widgetSecretKey}:`).toString('base64');

    // 🌟 2. 토스페이먼츠 서버로 최종 승인 요청 보내기
    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${encryptedSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: parseInt(amount), // 토스 API는 amount를 숫자로 받습니다.
      }),
    });

    const data = await response.json();

    // 🌟 3. 토스 승인 실패 시 처리
    if (!response.ok) {
      console.error("토스 결제 승인 실패:", data);
      return NextResponse.json(
        { success: false, message: data.message || '결제 승인이 거절되었습니다.' }, 
        { status: 400 }
      );
    }

    // ==========================================
    // 🌟 4. [매우 중요] 미쿠짱 DB 업데이트 로직
    // ==========================================
    // 토스 서버에서도 승인이 완료되었습니다! 진짜 돈이 빠져나갔습니다.
    const amountNum = parseInt(amount);

    // 🛡️ 트랜잭션: 잔액 변경 + 로그 생성을 하나의 묶음으로 처리
    const dbResult = await prisma.$transaction(async (tx) => {
      
      // 1. 유저 잔액 업데이트 (increment 사용으로 동시성 문제 예방)
      const updatedUser = await tx.user.update({
        where: { id: parseInt(userId) },
        data: {
          cyberMoney: {
            increment: amountNum // 결제된 금액만큼 충전(+)
          }
        }
      });

      // 2. 이용 내역(MoneyLog) 기록 생성
      const newLog = await tx.moneyLog.create({
        data: {
          userId: parseInt(userId),
          type: 'CHARGE', // 토스페이먼츠 결제는 충전이므로 'CHARGE'
          content: `[토스페이먼츠 결제] 주문번호: ${orderId}`,
          amount: amountNum,
          balanceAfter: updatedUser.cyberMoney // 거래 후 잔액 스냅샷 저장
        }
      });

      return { user: updatedUser, log: newLog };
    });

    console.log(`[결제성공] 유저 ID: ${userId} 에게 ${amountNum}원 충전이 완료되었습니다.`);
    console.log("DB 업데이트 결과:", dbResult);

    // 프론트엔드로 성공 메시지 전달 (토스 데이터와 DB 결과 함께 반환)
    return NextResponse.json({ success: true, data: data, dbResult: dbResult });

  } catch (error: any) {
    console.error("결제 승인 서버 에러:", error);
    return NextResponse.json(
      { success: false, message: '서버 내부 에러가 발생했습니다.' }, 
      { status: 500 }
    );
  }
}