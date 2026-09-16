import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser, getAdminSession } from '@/lib/apiAuth';

// 🟢 [GET] 신청 내역 조회 (관리자용 전체 조회 or 유저 본인 조회)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');   // 일반 유저 식별자

  try {
    let whereCondition = {};

    // 🔒 1. 관리자 세션(서명된 쿠키)이 있으면: 모든 유저의 내역 (adminId 쿼리값은 더 이상 신뢰하지 않음)
    if (await getAdminSession()) {
      whereCondition = {};
    }
    // 🔒 2. 로그인 회원이면: 본인 신청 내역만
    else {
      const auth = await requireUser(userId);
      if (!auth.ok) return auth.response;
      whereCondition = { userId: auth.userId };
    }

    const requests = await prisma.moneyRequest.findMany({
      where: whereCondition,
      include: {
        user: { select: { name: true, email: true } } // 신청자 정보 포함
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error('Request Fetch Error:', error);
    return NextResponse.json({ error: '내역 조회 실패' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId: requestedUserId, amount, type, bankName, accountNumber, accountHolder, depositor } = await request.json();
    const amountNum = parseInt(amount);

    // 🔒 본인 명의로만 신청 가능
    const auth = await requireUser(requestedUserId);
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    if (isNaN(amountNum) || amountNum <= 0 || (type !== 'CHARGE' && type !== 'REFUND')) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    // [환불일 경우만] 현재 잔액보다 많이 신청하는지 검증
    if (type === 'REFUND') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.cyberMoney < amountNum) {
        return NextResponse.json({ error: '환불 가능 금액이 부족합니다.' }, { status: 400 });
      }
    }

    // 📝 MoneyRequest 테이블에 PENDING 상태로 저장
    const newRequest = await prisma.moneyRequest.create({
      data: {
        userId: userId,
        amount: amountNum,
        type: type, // 'CHARGE' | 'REFUND'
        status: 'PENDING',
        // 환불 정보
        bankName,
        accountNumber,
        accountHolder,
        // 충전 정보 (content 필드 활용 또는 전용 필드)
        content: type === 'CHARGE' ? `입금자명: ${depositor}` : `환불 신청`,
      }
    });

    return NextResponse.json({ success: true, data: newRequest });
  } catch (error) {
    console.error("Request Error:", error);
    return NextResponse.json({ error: '신청 처리 중 오류 발생' }, { status: 500 });
  }
}