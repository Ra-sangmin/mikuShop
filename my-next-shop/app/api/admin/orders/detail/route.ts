// app/api/admin/orders/detail/route.ts
// 관리자용: 주문번호 하나로 주문 상세 팝업에 필요한 값을 가져옵니다.
//   (관리자 > 카카오톡 알림톡 관리에서 주문번호를 누르면 주문 관리의 "상세보기" 와 같은 팝업을 띄웁니다)
//   GET /api/admin/orders/detail?orderId=M260920-gpja
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  const orderId = new URL(req.url).searchParams.get('orderId')?.trim();
  if (!orderId) return NextResponse.json({ error: '주문번호가 필요합니다.' }, { status: 400 });

  try {
    const order = await prisma.order.findUnique({
      where: { orderId },
      select: {
        orderId: true,
        userId: true,
        bundleId: true,
        registeredAt: true,
        status: true,
        productName: true,
        productPrice: true,
        productOption: true,
        productRequest: true,
        serviceRequest: true,
        addressId: true,
        user: { select: { id: true, name: true } },
      },
    });
    if (!order) return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });

    // 배송지는 주문에 연결된 주소(addressId) 하나만 보여 줍니다 (주문 관리 화면과 같음)
    const address = order.addressId
      ? await prisma.address.findUnique({ where: { id: order.addressId } })
      : null;

    return NextResponse.json({ success: true, order: { ...order, address } });
  } catch (error) {
    console.error('Admin Order Detail Error:', error);
    return NextResponse.json({ error: '주문 상세 조회 실패' }, { status: 500 });
  }
}
