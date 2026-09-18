// app/api/faqs/route.ts
// 사용자용 자주하는 질문 조회 — inquiry/faq 화면이 씁니다.
// 등록·수정·삭제는 관리자 라우트(admin/faqs)에서만 합니다.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const faqs = await prisma.faq.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true, question: true, answer: true },
    });
    return NextResponse.json({ success: true, faqs });
  } catch (error) {
    console.error('FAQ GET Error:', error);
    return NextResponse.json({ success: false, error: '자주하는 질문을 불러오지 못했습니다.' }, { status: 500 });
  }
}
