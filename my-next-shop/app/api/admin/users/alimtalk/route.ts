// app/api/admin/users/alimtalk/route.ts
// 관리자용: 회원 한 명에게 "안내 및 확인 요청" 알림톡을 직접 보냅니다.
//   admin/users 의 회원 관리 팝업(MemberDrawer)이 씁니다.
//
// 주문 상태 알림톡(orderStatusAlimtalk)과 달리 사람이 판단해서 누르는 발송이라,
// 자동 발송 규칙을 타지 않고 이 라우트에서 곧바로 한 통을 보냅니다.
//
// 💸 건당 비용이 드는 기능입니다. 실수로 여러 번 나가지 않도록 화면에서 한 번 더 확인받고,
//    여기서도 보낼 수 있는 번호가 아니면 보내지 않고 이유를 돌려줍니다.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';
import { sendAlimtalk, CONSULT_TEMPLATE, maskPhone } from '@/lib/notifications/alimtalk';
import { pickPhone } from '@/lib/notifications/orderStatusAlimtalk';

/** 이력(notification_logs)에 남길 때 쓰는 구분값. 주문 상태가 아니라 수동 발송이라는 표시입니다. */
const LOG_STATUS = 'CONSULT_REQUEST';

export async function POST(request: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const { userId } = await request.json();
    const id = Number(userId);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ success: false, error: '회원 ID가 올바르지 않습니다.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        addresses: { select: { phone: true, isDefault: true } },
      },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: '회원을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 회원 전화번호 → 기본 배송지 → 아무 배송지 순으로 찾습니다. (상태 알림톡과 같은 규칙)
    const phone = pickPhone(user);
    if (!phone) {
      return NextResponse.json({
        success: false,
        error: '보낼 수 있는 휴대폰 번호가 없습니다. 회원 정보나 배송지에 번호를 먼저 등록해주세요.',
      }, { status: 400 });
    }

    const result = await sendAlimtalk({
      to: phone,
      template: CONSULT_TEMPLATE,
      // 대행사에는 #{변수} 형태의 키로 넘깁니다.
      variables: { '#{고객명}': user.name || '고객' },
      // 버튼이 '메시지 전달(MD)' 라 주소가 없습니다. buttonUrl 을 넘기지 않습니다.
      customFields: {
        // 관리자 알림톡 관리 화면에서 누가 무엇을 보냈는지 찾을 수 있게 남깁니다.
        kind: 'consult',
        userId: String(user.id),
        sentBy: adminAuth.admin.adminId,
      },
    });

    // 건너뛴 건(설정 없음 등)은 이력을 남기지 않습니다. 설정이 생기면 다시 보낼 수 있어야 합니다.
    if (!result.skipped) {
      await prisma.notificationLog.create({
        data: {
          userId: user.id,
          status: LOG_STATUS,
          channel: 'ALIMTALK',
          success: result.success,
          error: result.error ?? null,
        },
      });
    }

    console.log('[알림톡] 상담 요청 수동 발송',
      { 회원: user.id, 번호: maskPhone(phone), 보낸관리자: adminAuth.admin.adminId, 결과: result });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || '발송에 실패했습니다.',
        skipped: !!result.skipped,
      }, { status: 502 });
    }

    return NextResponse.json({ success: true, phone: maskPhone(phone) });
  } catch (error) {
    console.error('Admin Consult Alimtalk Error:', error);
    return NextResponse.json({ success: false, error: '발송 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
