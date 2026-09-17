// app/api/admin/shipping-carriers/route.ts
// 관리자용: 국제 배송 업체 목록 조회 / 추가 / 수정 (admin/shipping-carriers 화면이 씁니다)
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
