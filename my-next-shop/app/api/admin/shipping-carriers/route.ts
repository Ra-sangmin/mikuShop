// app/api/admin/shipping-carriers/route.ts
// 관리자용: 국제 배송 업체 목록 조회 / 추가 / 수정 / 삭제 (admin/shipping-carriers 화면이 씁니다)
// 입력값 검사는 lib/shippingCarriers.ts 에 있습니다.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';
import { parseCarrierInput } from '@/lib/shippingCarriers';

export async function GET() {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const carriers = await prisma.shippingCarrier.findMany({ orderBy: { id: 'asc' } });
    return NextResponse.json({ success: true, carriers });
  } catch (error) {
    console.error('Admin ShippingCarriers GET Error:', error);
    return NextResponse.json({ error: '배송 업체 조회 실패' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const parsed = parseCarrierInput(await req.json());
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const carrier = await prisma.shippingCarrier.create({ data: parsed });
    return NextResponse.json({ success: true, carrier });
  } catch (error) {
    console.error('Admin ShippingCarriers POST Error:', error);
    return NextResponse.json({ error: '배송 업체 추가 실패' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const body = await req.json();
    const id = Number(body?.id);
    if (!id) return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });

    const parsed = parseCarrierInput(body);
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const exists = await prisma.shippingCarrier.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: '없는 배송 업체입니다.' }, { status: 404 });

    const carrier = await prisma.shippingCarrier.update({ where: { id }, data: parsed });
    return NextResponse.json({ success: true, carrier });
  } catch (error) {
    console.error('Admin ShippingCarriers PATCH Error:', error);
    return NextResponse.json({ error: '배송 업체 수정 실패' }, { status: 500 });
  }
}

/**
 * 배송 업체 삭제.
 *
 * ⚠️ **이 업체로 발송한 주문이 하나라도 있으면 지우지 않습니다.**
 *    orders.shipping_carrier_id 의 외래키가 ON DELETE SET NULL 이라, 그냥 지우면
 *    그 주문들의 배송 업체가 조용히 비워집니다. 관리자 주문 화면의 송장 추적 링크가
 *    끊기고, 어디로 보냈는지도 알 수 없게 됩니다. 되돌릴 방법이 없어 아예 막습니다.
 *    쓰지 않게 된 업체는 이름을 바꿔 두거나, 주문이 정리된 뒤에 지우면 됩니다.
 */
export async function DELETE(req: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const id = Number(new URL(req.url).searchParams.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
    }

    const carrier = await prisma.shippingCarrier.findUnique({
      where: { id },
      select: { id: true, name: true, _count: { select: { orders: true } } },
    });
    if (!carrier) return NextResponse.json({ error: '없는 배송 업체입니다.' }, { status: 404 });

    if (carrier._count.orders > 0) {
      return NextResponse.json({
        error: `이 업체로 발송한 주문이 ${carrier._count.orders}건 있어 삭제할 수 없습니다. `
             + '지우면 해당 주문의 송장 추적 링크가 끊깁니다.',
        inUse: carrier._count.orders,
      }, { status: 409 });
    }

    await prisma.shippingCarrier.delete({ where: { id } });
    console.log(`[배송업체] 삭제 — #${id} ${carrier.name} (by ${adminAuth.admin.adminId})`);
    return NextResponse.json({ success: true, name: carrier.name });
  } catch (error) {
    console.error('Admin ShippingCarriers DELETE Error:', error);
    return NextResponse.json({ error: '배송 업체 삭제 실패' }, { status: 500 });
  }
}
