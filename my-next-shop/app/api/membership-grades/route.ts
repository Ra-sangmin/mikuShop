import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 🌟 guide/membership 안내 페이지에서 등급명/국제 배송비 할인율을 조회하는 공개 API입니다.
// (admin/membership-grades의 관리자 전용 API와 달리 인증 없이 조회만 가능합니다.)
export async function GET() {
  try {
    const grades = await prisma.membershipGrade.findMany({
      orderBy: { id: 'asc' }
    });
    return NextResponse.json({ success: true, grades });
  } catch (error) {
    console.error('MembershipGrade GET Error:', error);
    return NextResponse.json({ error: '등급 목록 조회 실패' }, { status: 500 });
  }
}
