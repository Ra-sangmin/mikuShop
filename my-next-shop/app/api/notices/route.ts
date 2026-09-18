// app/api/notices/route.ts
// 사용자용 공지사항 조회 — 홈 화면의 "공지사항" 카드와 /guide/notice 목록 페이지가 씁니다.
// 등록·수정·삭제는 관리자 라우트(admin/notices)에서만 합니다.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const DEFAULT_LIMIT = 4;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const requested = Number(searchParams.get('limit'));
  const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, MAX_LIMIT) : DEFAULT_LIMIT;

  // 🌟 목록 페이지용 페이지 번호 (1부터 시작). 없으면 1쪽으로 봅니다.
  const requestedPage = Number(searchParams.get('page'));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  try {
    const [total, notices] = await Promise.all([
      prisma.notice.count(),
      prisma.notice.findMany({
        orderBy: { id: 'desc' }, // 최근에 올린 공지가 위로
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, title: true, content: true, createdAt: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      notices,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error('Notices GET Error:', error);
    return NextResponse.json({ success: false, error: '공지사항을 불러오지 못했습니다.' }, { status: 500 });
  }
}
