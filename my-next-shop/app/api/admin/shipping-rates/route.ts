import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';
import { DEFAULT_SHIPPING_RATES, SHIPPING_RATE_METHODS, type ShippingRateMethod } from '@/lib/shippingRates';

// ✈️ 관리자 > 회원 등급 관리 — 국제 배송 요금표(미쿠짱 특송 / EMS) 조회 · 수정
//   GET    : 표가 비어 있으면 기본 요금표(lib/shippingRates.ts)로 채운 뒤 돌려줍니다.
//   PATCH  : { id, fee, weightKg? }    요금(무게) 수정
//   POST   : { method, weightKg, fee } 구간 추가
//   DELETE : ?id=                       구간 삭제
//   PUT    : { method }                 그 배송 방법을 기본 요금표로 되돌리기
//   ⚠️ shipping_rates 테이블은 `npx prisma db push` 로 만들어야 합니다. (그 전에는 오류 안내를 돌려줍니다)
const db = () => (prisma as any).shippingRate;
const isMethod = (m: any): m is ShippingRateMethod => SHIPPING_RATE_METHODS.includes(m);
const NOT_READY = 'shipping_rates 테이블이 아직 없습니다. 프로젝트 폴더에서 `npx prisma db push` 를 실행한 뒤 서버를 다시 켜 주세요.';

const seedMethod = (method: ShippingRateMethod) =>
  db().createMany({
    data: DEFAULT_SHIPPING_RATES[method].map(([weightKg, fee]) => ({ method, weightKg, fee })),
    skipDuplicates: true,
  });

export async function GET() {
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;
  try {
    if (!db()) return NextResponse.json({ error: NOT_READY }, { status: 500 });
    for (const m of SHIPPING_RATE_METHODS) {
      const count = await db().count({ where: { method: m } });
      if (count === 0) await seedMethod(m);
    }
    const rates = await db().findMany({ orderBy: [{ method: 'asc' }, { weightKg: 'asc' }] });
    return NextResponse.json({ success: true, rates });
  } catch (error) {
    console.error('Admin ShippingRates GET Error:', error);
    return NextResponse.json({ error: `요금표 조회 실패 — ${NOT_READY}` }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;
  try {
    const { id, fee, weightKg } = await req.json();
    const feeNum = parseInt(fee);
    if (!id || !Number.isFinite(feeNum) || feeNum < 0) {
      return NextResponse.json({ error: '요금을 올바르게 입력해 주세요.' }, { status: 400 });
    }
    const data: any = { fee: feeNum };
    if (weightKg !== undefined && weightKg !== '') {
      const w = parseFloat(weightKg);
      if (!(w > 0)) return NextResponse.json({ error: '무게를 올바르게 입력해 주세요.' }, { status: 400 });
      data.weightKg = w;
    }
    const rate = await db().update({ where: { id: Number(id) }, data });
    return NextResponse.json({ success: true, rate });
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: '같은 무게 구간이 이미 있습니다.' }, { status: 400 });
    console.error('Admin ShippingRates PATCH Error:', error);
    return NextResponse.json({ error: '요금 수정 실패' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;
  try {
    const { method, weightKg, fee } = await req.json();
    const w = parseFloat(weightKg);
    const f = parseInt(fee);
    if (!isMethod(method) || !(w > 0) || !Number.isFinite(f) || f < 0) {
      return NextResponse.json({ error: '무게와 요금을 올바르게 입력해 주세요.' }, { status: 400 });
    }
    const rate = await db().create({ data: { method, weightKg: w, fee: f } });
    return NextResponse.json({ success: true, rate });
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: '같은 무게 구간이 이미 있습니다.' }, { status: 400 });
    console.error('Admin ShippingRates POST Error:', error);
    return NextResponse.json({ error: '구간 추가 실패' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;
  try {
    const id = Number(new URL(req.url).searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
    await db().delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin ShippingRates DELETE Error:', error);
    return NextResponse.json({ error: '구간 삭제 실패' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;
  try {
    const { method } = await req.json();
    if (!isMethod(method)) return NextResponse.json({ error: '배송 방법이 올바르지 않습니다.' }, { status: 400 });
    await db().deleteMany({ where: { method } });
    await seedMethod(method);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin ShippingRates PUT Error:', error);
    return NextResponse.json({ error: '기본 요금표로 되돌리기 실패' }, { status: 500 });
  }
}
