import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("메일 발송 환경변수가 설정되지 않았습니다.");
        return NextResponse.json({ success: false, message: "서버 설정 오류" }, { status: 500 });
    }

    const { userId, email } = await req.json();

    // 1. 유저 확인
    const user = await prisma.user.findFirst({
      where: { loginId: userId, email: email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "아이디 또는 이메일 정보가 일치하지 않습니다." },
        { status: 404 }
      );
    }

    // 2. 임시 비밀번호 생성 (8자리 랜덤)
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 3. DB에 임시 비밀번호 저장
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // 4. Nodemailer 설정 (예: 구글 SMTP 사용 시)
    const transporter = nodemailer.createTransport({
        host: 'smtp.naver.com', // 네이버 SMTP 서버 주소
        port: 465,              // SSL 사용 포트
        secure: true,           // 465 포트 사용 시 true
        auth: {
            user: process.env.EMAIL_USER, // 네이버 아이디
            pass: process.env.EMAIL_PASS, // 네이버 비밀번호 (또는 2단계 인증 시 생성한 앱 비밀번호)
        },
    });

    // 5. 메일 발송
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "[미쿠짱] 임시 비밀번호 안내",
      text: `안녕하세요, 미쿠짱입니다.\n요청하신 임시 비밀번호는 [${tempPassword}] 입니다.\n로그인 후 반드시 비밀번호를 변경해주세요.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>안녕하세요, 미쿠짱입니다.</h2>
          <p>요청하신 임시 비밀번호가 생성되었습니다.</p>
          <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 18px; font-weight: bold;">
            ${tempPassword}
          </div>
          <p>로그인 후 반드시 마이페이지에서 비밀번호를 변경해주세요.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("비밀번호 찾기 API 에러:", error);
    return NextResponse.json(
      { success: false, message: "메일 발송에 실패했습니다." },
      { status: 500 }
    );
  }
}