// 📨 주문별 알림 발송 이력 조회 (관리자 CS 용)
//
// 왜 필요한가
//   알림톡은 같은 회원·같은 상태를 한 통으로 묶어 보냅니다. (lib/notifications/orderStatusAlimtalk.ts)
//   본문에는 대표 주문번호 하나만 들어가고 나머지는 "외 N건" 으로만 표시되므로,
//   고객이 그 번호로 문의하면 CS 가 함께 묶였던 주문을 찾을 방법이 없었습니다.
//   발송 기록은 묶인 주문 전부에 남으므로, 같은 회원·상태·채널·시각을 모아 한 통을 복원합니다.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';

/** 한 번의 발송으로 묶어 볼 시간 폭. createMany 는 같은 시각이 찍히지만 여유를 둡니다. */
const GROUP_WINDOW_MS = 5000;

export async function GET(request: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');
  if (!orderId) {
    return NextResponse.json({ error: '주문번호(orderId)가 필요합니다.' }, { status: 400 });
  }

  try {
    const logs = await prisma.notificationLog.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    // 발송 한 건마다 "같이 나간 주문"을 찾아 붙입니다.
    const enriched = await Promise.all(
      logs.map(async (log) => {
        const siblings = await prisma.notificationLog.findMany({
          where: {
            userId: log.userId,
            status: log.status,
            channel: log.channel,
            createdAt: {
              gte: new Date(log.createdAt.getTime() - GROUP_WINDOW_MS),
              lte: new Date(log.createdAt.getTime() + GROUP_WINDOW_MS),
            },
          },
          select: { orderId: true },
          orderBy: { orderId: 'asc' },
        });

        // 대표 주문번호는 오름차순 첫 번째입니다. 고객이 받은 본문의 번호와 같습니다.
        const groupOrderIds = [...new Set(siblings.map(s => s.orderId).filter((v): v is string => !!v))];

        return {
          id: log.id,
          channel: log.channel,
          status: log.status,
          success: log.success,
          error: log.error,
          createdAt: log.createdAt,
          groupOrderIds,
          leadOrderId: groupOrderIds[0] ?? log.orderId,
        };
      }),
    );

    return NextResponse.json({ success: true, logs: enriched });
  } catch (error) {
    console.error('알림 발송 이력 조회 오류:', error);
    return NextResponse.json({ error: '발송 이력 조회에 실패했습니다.' }, { status: 500 });
  }
}
