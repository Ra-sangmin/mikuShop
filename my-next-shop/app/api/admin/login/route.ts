import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // 1. 프론트엔드에서 보낸 원본 데이터 추출
    const body = await request.json();
    
    // 2. 터미널(VS Code)에 출력하여 확인
    console.log("======================================");
    console.log("📩 프론트엔드 수신 데이터:", body);
    console.log("🔑 입력된 아이디:", body.admin_id);
    console.log("🔑 입력된 비밀번호:", body.password);
    console.log("🌐 DB URL 확인:", process.env.DATABASE_URL ? "연결 주소 있음" : "❌ URL 없음!");
    console.log("======================================");

    // 3. 실제 DB 조회 로직 (schema.prisma의 @map("admin_id") 설정 확인 필수)
    const admin = await prisma.admin.findUnique({
      where: { adminId: body.admin_id }, 
    });

    if (!admin || admin.password !== body.password) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      name: admin.name // DB의 admins 테이블에 있는 name 컬럼 값
    });

  } catch (error: any) {
    // 에러 발생 시 상세 정보 출력
    console.error("❌ API 에러 발생:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  // Check if session exists
  // In a real app, you might verify a JWT or session token
  return NextResponse.json({ authenticated: false });
}
