import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: "이메일이 필요합니다." }, { status: 400 });
    }

    // 1. 이메일로 유저 찾기
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "회원을 찾을 수 없습니다." }, { status: 404 });
    }

    // 2. 비밀번호가 제공된 경우: 해시 비교 로직 수행
    if (password) {
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return NextResponse.json({ success: false, message: "비밀번호 불일치" }, { status: 401 });
      }
      
      // 비밀번호 일치 시 유저 정보 반환 (보안을 위해 비밀번호 필드는 제외)
      const { password: _, ...userWithoutPassword } = user;
      return NextResponse.json({ success: true, user: userWithoutPassword });
    }

    // 3. 이메일 확인 단계라면 성공 응답
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ success: false, error: "서버 오류" }, { status: 500 });
  }
}