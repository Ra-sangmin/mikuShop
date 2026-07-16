import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: "이메일이 입력되지 않았습니다." },
        { status: 400 }
      );
    }

    // 1. DB에서 해당 이메일을 가진 유저 조회
    const user = await prisma.user.findFirst({
      where: { email: email },
    });

    // 2. 유저가 없거나 아이디(loginId)가 없는 경우
    if (!user || !user.loginId) {
      return NextResponse.json(
        { success: false, message: "입력하신 이메일로 가입된 계정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 🌟 3. 아이디 마스킹 처리 (원본 전체 글자수 유지 + 별 최대 3개)
    const rawId = user.loginId;
    let maskedId = "";
    
    if (rawId.length <= 3) {
      // 3글자 이하: 첫 글자만 노출 + 나머지 별 (ex: abc -> a**)
      maskedId = rawId.slice(0, 1) + '*'.repeat(rawId.length - 1);
    } else if (rawId.length === 4) {
      // 4글자: 앞 2글자 + 별 1개 + 뒤 1글자 (ex: abcd -> ab*d)
      maskedId = rawId.slice(0, 2) + '*' + rawId.slice(-1);
    } else {
      // 5글자 이상: 전체 길이를 보존하면서 가운데만 *** 치환
      // tossTester(10글자) -> 앞 4글자(toss) + *** + 뒤 3글자(ter) = toss***ter
      const starCount = 3;
      const visibleCount = rawId.length - starCount;
      const frontCount = Math.ceil(visibleCount / 2); // 앞부분에 보여줄 글자 수
      
      maskedId = 
        rawId.slice(0, frontCount) + 
        '***' + 
        rawId.slice(frontCount + 3);
    }

    // 4. 성공 응답 (마스킹된 아이디 반환)
    return NextResponse.json(
      { success: true, maskedId: maskedId },
      { status: 200 }
    );

  } catch (error) {
    console.error("아이디 찾기 API 에러:", error);
    return NextResponse.json(
      { success: false, message: "서버 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}