// app/api/admin/notices/route.ts
// 관리자용: 공지사항 목록 조회 / 등록 / 수정 / 삭제 (admin/cs 화면의 "공지사항" 패널이 씁니다)
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';

const TITLE_MAX = 191; // DB 는 VARCHAR(191)

/** 요청 본문에서 제목·내용을 꺼내 검사합니다. 문제가 있으면 화면에 보여줄 문구를 담아 돌려줍니다. */
function parseInput(body: any): { title: string; content: string } | { error: string } {
  const title = String(body?.title ?? '').trim();
  if (!title) return { error: '제목을 입력해주세요.' };
  if (title.length > TITLE_MAX) return { error: `제목은 ${TITLE_MAX}자까지 입력할 수 있습니다.` };

  const content = String(body?.content ?? '').trim();
  if (!content) return { error: '내용을 입력해주세요.' };

  return { title, content };
}

export async function GET() {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    // 최근에 올린 공지가 위로 오도록
    const notices = await prisma.notice.findMany({ orderBy: { id: 'desc' } });
    return NextResponse.json({ success: true, notices });
  } catch (error) {
    console.error('Admin Notices GET Error:', error);
    return NextResponse.json({ error: '공지사항 조회 실패' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const parsed = parseInput(await req.json());
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const notice = await prisma.notice.create({ data: parsed });
    return NextResponse.json({ success: true, notice });
  } catch (error) {
    console.error('Admin Notices POST Error:', error);
    return NextResponse.json({ error: '공지사항 등록 실패' }, { status: 500 });
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

    const parsed = parseInput(body);
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const exists = await prisma.notice.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: '없는 공지사항입니다.' }, { status: 404 });

    const notice = await prisma.notice.update({ where: { id }, data: parsed });
    return NextResponse.json({ success: true, notice });
  } catch (error) {
    console.error('Admin Notices PATCH Error:', error);
    return NextResponse.json({ error: '공지사항 수정 실패' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    // 🌟 id 는 쿼리스트링(?id=1) 또는 본문 어느 쪽으로 보내도 받습니다.
    const { searchParams } = new URL(req.url);
    let id = Number(searchParams.get('id'));
    if (!id) {
      const body = await req.json().catch(() => null);
      id = Number((body as any)?.id);
    }
    if (!id) return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });

    const exists = await prisma.notice.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: '없는 공지사항입니다.' }, { status: 404 });

    await prisma.notice.delete({ where: { id } });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Admin Notices DELETE Error:', error);
    return NextResponse.json({ error: '공지사항 삭제 실패' }, { status: 500 });
  }
}
