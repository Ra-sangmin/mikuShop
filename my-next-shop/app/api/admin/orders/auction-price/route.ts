// 🔨 낙찰 처리할 때 경매 페이지에서 현재가(=낙찰가)를 읽어 옵니다.
//
// 왜 필요한가
//   주문에 저장된 상품 금액은 **경매를 신청하던 시점의 현재가**입니다.
//   회원이 적어 낸 희망 입찰가와도, 실제 낙찰된 금액과도 다릅니다.
//   그대로 정산하면 엉뚱한 금액이 청구되므로, 낙찰 처리 직전에 실제 금액을 확인합니다.
//
// ⚠️ 이 값을 그대로 청구하지 않습니다. 관리자 화면이 입력란에 채워 주기만 하고,
//    관리자가 눈으로 확인한 뒤 확정합니다. 크롤링은 실패할 수도, 종료된 경매라
//    현재가 대신 낙찰가가 다른 자리에 적혀 있을 수도 있기 때문입니다.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';
// 🔨 조회 로직은 회원 화면과 같은 것을 씁니다. (lib/auctionPrice.ts)
import { fetchLiveAuctionPrice } from '@/lib/auctionPrice';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const orderId = new URL(request.url).searchParams.get('orderId')?.trim();
  if (!orderId) return NextResponse.json({ success: false, error: '주문번호가 필요합니다.' }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { orderId },
    select: { productId: true, productUrl: true, productPrice: true, myBidPrice: true },
  });
  if (!order) return NextResponse.json({ success: false, error: '주문을 찾을 수 없습니다.' }, { status: 404 });

  const live = await fetchLiveAuctionPrice(order.productId, order.productUrl);
  const common = { savedPrice: order.productPrice, myBidPrice: order.myBidPrice };

  if (!live.ok) {
    // 실패해도 관리자는 직접 입력으로 진행할 수 있습니다.
    return NextResponse.json({ success: false, error: `${live.error} 금액을 직접 입력해 주세요.`, itemId: live.itemId, ...common });
  }

  return NextResponse.json({
    success: true,
    itemId: live.itemId,
    price: live.price,
    bidCount: live.bidCount,
    timeLeft: live.timeLeft,
    endSchedule: live.endSchedule,
    fetchedAt: new Date().toISOString(),
    ...common,
  });
}
