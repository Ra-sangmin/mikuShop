// app/api/notices/route.ts
// 사용자용 공지사항 조회 — 홈 화면의 "공지사항" 카드가 씁니다.
// 등록·수정은 관리자 라우트(admin/notices)에서만 합니다.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const DEFAULT_LIMIT = 4;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = Number(searchParams.get('limit'));
  const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, MAX_LIMIT) : DEFAULT_LIMIT;

  try {
    const notices = await prisma.notice.findMany({
      orderBy: { id: 'desc' }, // 최근에 올린 공지가 위로
      take: limit,
      select: { id: true, title: true, content: true, createdAt: true },
    });
    return NextResponse.json({ success: true, notices });
  } catch (error) {
    console.error('Notices GET Error:', error);
    return NextResponse.json({ success: false, error: '공지사항을 불러오지 못했습니다.' }, { status: 500 });
  }
}
