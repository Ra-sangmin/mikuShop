import { NextResponse } from 'next/server';
import { sendAlimtalk, CHARGE_DONE_TEMPLATE, moneyHistoryUrl, maskPhone } from '@/lib/notifications/alimtalk';
import { normalizeKoreanMobile } from '@/lib/phone';
import prisma from '@/lib/prisma'; // 🌟 Prisma 클라이언트 임포트 필수
import { requireUser } from '@/lib/apiAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paymentKey, orderId, amount, userId: requestedUserId } = body;

    // 🔒 충전 대상은 로그인 회원 본인입니다. (body의 userId는 세션과 같을 때만 허용)
    const auth = await requireUser(requestedUserId);
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    const amountNum = parseInt(amount);
    if (!paymentKey || !orderId || !Number.isInteger(amountNum) || amountNum <= 0) {
      return NextResponse.json({ success: false, message: '잘못된 결제 요청입니다.' }, { status: 400 });
    }

    // 🌟 1. 토스페이먼츠 결제위젯 시크릿 키
    // 🔒 코드에 직접 두지 않고 환경변수(TOSS_SECRET_KEY)에서 읽습니다.
    //    개발 환경에서만 토스 문서용 공개 테스트 키로 대체합니다.
    const widgetSecretKey =
      process.env.TOSS_SECRET_KEY ||
      (process.env.NODE_ENV !== 'production' ? "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6" : '');
    if (!widgetSecretKey) {
      console.error('TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.');
      return NextResponse.json({ success: false, message: '결제 설정 오류입니다.' }, { status: 500 });
    }
    
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
        amount: amountNum, // 토스 API는 amount를 숫자로 받습니다.
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
    // 🛡️ 트랜잭션: 잔액 변경 + 로그 생성을 하나의 묶음으로 처리
    const dbResult = await prisma.$transaction(async (tx) => {
      
      // 1. 유저 잔액 업데이트 (increment 사용으로 동시성 문제 예방)
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          cyberMoney: {
            increment: amountNum // 결제된 금액만큼 충전(+)
          }
        },
        omit: { password: true }, // 🔒 응답으로 나가므로 비밀번호 해시는 제외
      });

      // 2. 이용 내역(MoneyLog) 기록 생성
      const newLog = await tx.moneyLog.create({
        data: {
          userId: userId,
          type: 'CHARGE', // 토스페이먼츠 결제는 충전이므로 'CHARGE'
          content: `[토스페이먼츠 결제] 주문번호: ${orderId}`,
          amount: amountNum,
          balanceAfter: updatedUser.cyberMoney // 거래 후 잔액 스냅샷 저장
        }
      });

      return { user: updatedUser, log: newLog };
    });

    console.log(`[결제성공] 유저 ID: ${userId} 에게 ${amountNum}원 충전이 완료되었습니다.`);

    // 💰 충전이 끝나면 회원에게 알림톡으로 알려 줍니다.
    //
    // ⚠️ 트랜잭션이 끝난 **뒤**에 보냅니다. 안에서 외부 API 를 부르면 DB 커넥션을 오래 잡고,
    //    발송이 실패하면 이미 받은 결제까지 롤백됩니다.
    // ⚠️ 알림톡 실패가 결제 응답을 막으면 안 됩니다. 전부 삼키고 로그만 남깁니다.
    //    (돈은 이미 빠져나갔고 충전도 끝난 상태입니다)
    //
    // ℹ️ 관리자 화면의 '알림톡 보내지 않기' 스위치는 여기에 영향을 주지 않습니다.
    //    그 스위치는 관리자가 직접 승인할 때(무통장 충전·환불) 쓰는 것이고,
    //    카드 결제는 회원이 스스로 한 것이라 끌 사람이 없습니다.
    try {
      const phone = normalizeKoreanMobile(dbResult.user.phone);
      if (!phone) {
        console.warn(`[알림톡] 충전 완료 안내를 건너뜁니다 — 보낼 수 있는 번호가 없습니다. (회원 ${userId})`);
      } else {
        const sendResult = await sendAlimtalk({
          to: phone,
          template: CHARGE_DONE_TEMPLATE,
          variables: {
            '#{고객명}': dbResult.user.name || '고객',
            // ⚠️ 본문에 '원' 이 이미 붙어 있어 값에는 숫자와 쉼표만 넣습니다.
            '#{충전금액}': amountNum.toLocaleString('ko-KR'),
            '#{현재잔액}': dbResult.user.cyberMoney.toLocaleString('ko-KR'),
          },
          buttonUrl: moneyHistoryUrl(),
          customFields: { kind: 'charge', source: 'card', userId: String(userId) },
        });
        console.log('[알림톡] 충전 완료 안내',
          { 회원: userId, 번호: maskPhone(phone), 결과: sendResult });
      }
    } catch (error) {
      console.error('[알림톡] 충전 완료 안내 발송 중 오류 (충전은 이미 처리됨):', error);
    }

    // 🔒 프론트엔드에 필요한 값만 내려보냅니다.
    // (토스 응답 원문과 유저 레코드 전체를 그대로 넘기면 불필요한 개인정보까지 노출됩니다.)
    return NextResponse.json({
      success: true,
      data: { orderId: data?.orderId, approvedAt: data?.approvedAt, totalAmount: data?.totalAmount, method: data?.method },
      dbResult: {
        chargedAmount: amountNum,
        balance: dbResult.user.cyberMoney,
      },
    });

  } catch (error: any) {
    console.error("결제 승인 서버 에러:", error);
    return NextResponse.json(
      { success: false, message: '서버 내부 에러가 발생했습니다.' }, 
      { status: 500 }
    );
  }
}