import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    // 1. 현재 로그인한 세션 확인
    const session = await getServerSession();
    
    // 세션이 없거나 로그인 정보가 없는 경우 차단
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." }, 
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await req.json();

    // 2. DB에서 현재 유저 정보 조회
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "사용자 정보를 찾을 수 없습니다." }, 
        { status: 404 }
      );
    }

    // 3. 현재 비밀번호 일치 여부 확인
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "현재 비밀번호가 일치하지 않습니다." }, 
        { status: 400 }
      );
    }

    // 4. 새로운 비밀번호 해싱 및 DB 업데이트
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json(
      { success: true, message: "비밀번호가 성공적으로 변경되었습니다." }, 
      { status: 200 }
    );

  } catch (error) {
    console.error("비밀번호 변경 API 에러:", error);
    return NextResponse.json(
      { success: false, message: "서버 오류가 발생했습니다." }, 
      { status: 500 }
    );
  }
}