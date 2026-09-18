// app/api/admin/faqs/route.ts
// 관리자용: 자주하는 질문 목록 조회 / 등록 / 수정 / 삭제
// (admin/cs 화면의 "자주하는 질문" 패널이 씁니다)
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/apiAuth';

const QUESTION_MAX = 300; // 질문은 한 줄 제목 성격이라 길이를 제한합니다.

/** 요청 본문에서 질문·답변을 꺼내 검사합니다. 문제가 있으면 화면에 보여줄 문구를 담아 돌려줍니다. */
function parseInput(body: any): { question: string; answer: string } | { error: string } {
  const question = String(body?.question ?? '').trim();
  if (!question) return { error: '질문을 입력해주세요.' };
  if (question.length > QUESTION_MAX) return { error: `질문은 ${QUESTION_MAX}자까지 입력할 수 있습니다.` };

  const answer = String(body?.answer ?? '').trim();
  if (!answer) return { error: '답변을 입력해주세요.' };

  return { question, answer };
}

export async function GET() {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    // 순서값이 같으면 나중에 올린 질문이 아래로 오도록 id 오름차순
    const faqs = await prisma.faq.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
    return NextResponse.json({ success: true, faqs });
  } catch (error) {
    console.error('Admin FAQ GET Error:', error);
    return NextResponse.json({ error: '자주하는 질문 조회 실패' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // 🔒 관리자 전용
  const adminAuth = await requireAdmin();
  if (!adminAuth.ok) return adminAuth.response;

  try {
    const parsed = parseInput(await req.json());
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    // 새 질문은 목록 맨 아래에 붙입니다.
    const last = await prisma.faq.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
    const faq = await prisma.faq.create({ data: { ...parsed, sortOrder: (last?.sortOrder ?? 0) + 1 } });
    return NextResponse.json({ success: true, faq });
  } catch (error) {
    console.error('Admin FAQ POST Error:', error);
    return NextResponse.json({ error: '자주하는 질문 등록 실패' }, { status: 500 });
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

    const exists = await prisma.faq.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: '없는 질문입니다.' }, { status: 404 });

    const faq = await prisma.faq.update({ where: { id }, data: parsed });
    return NextResponse.json({ success: true, faq });
  } catch (error) {
    console.error('Admin FAQ PATCH Error:', error);
    return NextResponse.json({ error: '자주하는 질문 수정 실패' }, { status: 500 });
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

    const exists = await prisma.faq.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: '없는 질문입니다.' }, { status: 404 });

    await prisma.faq.delete({ where: { id } });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Admin FAQ DELETE Error:', error);
    return NextResponse.json({ error: '자주하는 질문 삭제 실패' }, { status: 500 });
  }
}
