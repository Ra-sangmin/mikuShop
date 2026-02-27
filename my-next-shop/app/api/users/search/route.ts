import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const password = searchParams.get('password');

  if (!email) {
    return NextResponse.json({ success: false, error: "이메일이 없습니다." });
  }

  try {
    // 1. 이메일로 유저 찾기
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "회원을 찾을 수 없습니다." });
    }

    // 2. 만약 비밀번호까지 들어왔다면 비밀번호 체크 로직 실행
    if (password) {
      if (user.password === password) {
        return NextResponse.json({ success: true, user });
      } else {
        return NextResponse.json({ success: false, message: "비밀번호 불일치" });
      }
    }

    // 3. 이메일만 확인하는 단계라면 성공 응답
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ success: false, error: "서버 오류" });
  }
}