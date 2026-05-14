import { NextResponse } from 'next/server';

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
    // 여기서 userId를 이용해 DB의 사이버 머니를 amount 만큼 올려주세요.
    
    console.log(`[결제성공] 유저 ID: ${userId} 에게 ${amount}원 충전이 완료되었습니다.`);
    console.log("토스 응답 데이터:", data);

    // 예시: await prisma.user.update({ where: { id: userId }, data: { cyberMoney: { increment: parseInt(amount) } } })

    // 프론트엔드로 성공 메시지 전달
    return NextResponse.json({ success: true, data: data });

  } catch (error: any) {
    console.error("결제 승인 서버 에러:", error);
    return NextResponse.json(
      { success: false, message: '서버 내부 에러가 발생했습니다.' }, 
      { status: 500 }
    );
  }
}