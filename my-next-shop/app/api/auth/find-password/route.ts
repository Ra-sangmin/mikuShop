import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import { randomInt } from "crypto";
import { rateLimit, clientIp } from "@/lib/rateLimit";

// 🔒 예측 불가능한 임시 비밀번호를 만듭니다.
// (Math.random()은 암호학적으로 안전하지 않아 예측될 수 있으므로 crypto를 씁니다.)
const TEMP_PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
function generateTempPassword(length = 12) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_ALPHABET[randomInt(TEMP_PASSWORD_ALPHABET.length)];
  }
  return out;
}

export async function POST(req: Request) {
  try {
    // 🔒 남용 방지: 같은 IP에서 10분에 5회까지만 허용합니다.
    // (제한이 없으면 아이디·이메일만 아는 사람이 남의 비밀번호를 무한정 초기화해
    //  계정을 잠글 수 있습니다.)
    const limited = rateLimit(`find-password:${clientIp(req)}`, 5, 10 * 60 * 1000);
    if (!limited.allowed) {
      return NextResponse.json(
        { success: false, message: `요청이 너무 많습니다. ${limited.retryAfterSeconds}초 후 다시 시도해주세요.` },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
      );
    }

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

    // 2. 임시 비밀번호 생성
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 3. Nodemailer 설정
    const transporter = nodemailer.createTransport({
        host: 'smtp.naver.com', // 네이버 SMTP 서버 주소
        port: 465,              // SSL 사용 포트
        secure: true,           // 465 포트 사용 시 true
        auth: {
            user: process.env.EMAIL_USER, // 네이버 아이디
            pass: process.env.EMAIL_PASS, // 네이버 비밀번호 (또는 2단계 인증 시 생성한 앱 비밀번호)
        },
    });

    // 🔒 4. 메일 발송을 먼저 하고, 성공했을 때만 DB 비밀번호를 바꿉니다.
    //    (반대 순서면 메일 발송이 실패했을 때 사용자는 새 비밀번호를 받지 못한 채
    //     기존 비밀번호로도 로그인할 수 없는 상태가 됩니다.)
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

    // 5. 메일이 나간 뒤 DB에 임시 비밀번호 저장
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
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
