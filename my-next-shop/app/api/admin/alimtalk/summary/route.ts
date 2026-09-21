// app/api/admin/alimtalk/summary/route.ts
// 관리자용: 솔라피 계정 현황 (오늘 발송 · 합산 잔액 · 일일 한도) — admin/alimtalk 화면이 씁니다.
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getSolapiSummary } from '@/lib/notifications/solapiAccount';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const summary = await getSolapiSummary();
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('Admin Alimtalk Summary Error:', error);
    return NextResponse.json({ error: '솔라피 현황 조회 실패' }, { status: 500 });
  }
}
