import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST() {
  try {
    // 1. 배송이 진행 중이고, 운송장 번호가 있는 주문들만 DB에서 찾습니다.
    const activeOrders = await prisma.order.findMany({
      where: {
        status: { in: ['국제배송'] },
        NOT: {
          OR: [
            { trackingNo: null },
            { trackingNo: "" }
          ]
        }
      }
    });

    if (activeOrders.length === 0) {
      return NextResponse.json({ success: true, message: '동기화할 배송 건이 없습니다.', updatedCount: 0 });
    }

    let updatedCount = 0;

    // 2. 각 운송장 번호를 택배사 API에 조회하여 최신 상태를 받아옵니다.
    for (const order of activeOrders) {
      
      // ====================================================================
      // 💡 [실제 실무 로직 들어갈 곳]
      // const trackingData = await fetch(`https://api.sweettracker.co.kr/tracking?t_key=내API키&t_invoice=${order.trackingNo}`);
      // const result = await trackingData.json();
      // let newStatus = result.status; // (예: '배송완료')
      // ====================================================================

      // 지금은 API가 없으니, 테스트를 위해 상태를 강제로 한 단계씩 올리는 가짜(Mock) 로직을 넣습니다.
      // 🌟 deliveryStatus 필드를 업데이트하도록 변경
      let currentDeliveryStatus = order.deliveryStatus || '배송전';
      let mockNewStatus = currentDeliveryStatus;
      
      if (currentDeliveryStatus === '배송전') mockNewStatus = '국내통관중';
      else if (currentDeliveryStatus === '국내통관중') mockNewStatus = '국내배송중';
      else if (currentDeliveryStatus === '국내배송중') mockNewStatus = '배송완료';

      // 상태가 변했다면 DB를 업데이트합니다.
      if (mockNewStatus !== currentDeliveryStatus) {
        await prisma.order.update({
          where: { orderId: order.orderId },
          data: { deliveryStatus: mockNewStatus }
        });
        updatedCount++;
      }
    }

    return NextResponse.json({ success: true, message: `${updatedCount}건의 배송 상태가 자동 업데이트되었습니다.`, updatedCount });
  } catch (error) {
    console.error("Tracking Sync Error:", error);
    return NextResponse.json({ error: '자동 동기화 중 오류가 발생했습니다.' }, { status: 500 });
  }
}