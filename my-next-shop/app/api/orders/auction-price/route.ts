// 🔨 회원이 마이페이지에서 경매 주문을 펼쳤을 때, 지금 경매가를 읽어 보여 줍니다.
//
// 주문에 저장된 금액은 '신청하던 때의 입찰 희망가'라, 지금 이 물건이 얼마까지 올랐는지는
// 경매 페이지를 봐야 알 수 있습니다. 추가 입찰 여부를 판단하는 데 쓰는 값입니다.
//
// 🔒 본인 주문만 조회합니다. orderId 를 그대로 믿으면 남의 주문 정보가 새어 나갑니다.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { fetchLiveAuctionPrice } from '@/lib/auctionPrice';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const orderId = new URL(request.url).searchParams.get('orderId')?.trim();
  if (!orderId) return NextResponse.json({ success: false, error: '주문번호가 필요합니다.' }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { orderId },
    select: { userId: true, productId: true, productUrl: true },
  });
  if (!order || order.userId !== auth.userId) {
    return NextResponse.json({ success: false, error: '본인 주문만 조회할 수 있습니다.' }, { status: 403 });
  }

  // 회원 화면은 오래 기다리지 않습니다. 못 읽으면 그 줄을 감추면 그만입니다.
  const live = await fetchLiveAuctionPrice(order.productId, order.productUrl, 15000);
  if (!live.ok) return NextResponse.json({ success: false, error: live.error });

  return NextResponse.json({
    success: true,
    price: live.price,
    bidCount: live.bidCount,
    timeLeft: live.timeLeft,
    fetchedAt: new Date().toISOString(),
  });
}
