// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { validatePassword } from '@/lib/passwordPolicy';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { formatKoreanMobile } from '@/lib/phone';
import { generateMailboxNumber, isValidNameEnglish, normalizeNameEnglish } from '@/lib/japanAddress';
import bcrypt from 'bcrypt';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedId = searchParams.get('id');

  // 🔒 본인(로그인 회원) 또는 관리자만 조회 가능
  const auth = await requireUser(requestedId, { allowAdmin: true });
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  if (!userId) {
    return NextResponse.json({ error: '유저 ID가 필요합니다.' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: {
          // 🚚 마이페이지 "국제 배송 현황"에서 운송장 번호를 누르면 배송 업체 사이트를 새 창으로 엽니다.
          //    주문에는 업체 ID(shippingCarrierId)만 있으므로 여기서 이름·주소를 함께 읽어 내려보냅니다.
          include: {
            shippingCarrier: { select: { id: true, name: true, url: true } },
          },
        },
        addresses: true,
        grade: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: '유저를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 🌟 비밀번호 해시는 클라이언트에 내려보내지 않고, SNS 가입 여부만 별도 플래그로 제공합니다.
    // (SNS 로그인 유저는 회원가입 시 password가 빈 문자열로 저장됨 - [...nextauth]/route.ts 참고)
    const { password, ...safeUser } = user;
    return NextResponse.json({ success: true, user: { ...safeUser, isSnsUser: !password } });
  } catch (error) {
    console.error("User GET Error:", error);
    return NextResponse.json({ error: 'DB 조회 실패' }, { status: 500 });
  }
}

/**
 * 회원이 자기 정보를 고칩니다. 지금은 영문 이름 하나뿐입니다.
 *
 * 예전 PUT 은 users.address_id(쉼표로 이어붙인 배송지 ID)만 건드리던 엔드포인트라 없앴습니다.
 * 배송지는 addresses 테이블이 user_id 로 직접 물고 있어 그 컬럼 자체가 필요 없었습니다.
 * 여기서는 고칠 수 있는 항목을 명시적으로만 받습니다 — 통째로 받으면 등급·머니까지 바뀝니다.
 */
export async function PATCH(request: Request) {
  try {
    const { id, nameEnglish } = await request.json();

    // 🔒 본인만 수정 가능
    const auth = await requireUser(id);
    if (!auth.ok) return auth.response;

    if (typeof nameEnglish !== 'string') {
      return NextResponse.json({ success: false, error: '영문 이름이 필요합니다.' }, { status: 400 });
    }

    // 빈 문자열이면 지웁니다. (등록했다가 취소하는 경우)
    const trimmed = nameEnglish.trim();
    if (trimmed && !isValidNameEnglish(trimmed)) {
      return NextResponse.json({ success: false, error: '영문 이름은 영문·공백·하이픈만 사용할 수 있습니다.' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: auth.userId },
      data: { nameEnglish: trimmed ? normalizeNameEnglish(trimmed) : null },
      omit: { password: true },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('User PATCH Error:', error);
    return NextResponse.json({ error: '회원 정보 수정 실패' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, loginId, phone, nameEnglish } = body;

    if (!email || !password || !name || !loginId || !phone) {
      return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 });
    }

    // 🔤 영문 이름은 선택입니다. 넣었다면 형식만 확인합니다.
    //    (일본 쇼핑몰 주소의 "받는사람"에 쓰는 값이라 영문·공백·하이픈만 받습니다)
    let normalizedNameEnglish: string | null = null;
    if (typeof nameEnglish === 'string' && nameEnglish.trim()) {
      if (!isValidNameEnglish(nameEnglish)) {
        return NextResponse.json({ success: false, error: '영문 이름은 영문·공백·하이픈만 사용할 수 있습니다.' }, { status: 400 });
      }
      normalizedNameEnglish = normalizeNameEnglish(nameEnglish);
    }

    // 📱 휴대폰 번호: 하이픈 유무와 상관없이 받되, 저장은 010-1234-5678 형태로 통일합니다.
    //    (주문 상태 안내 발송에 쓰는 값이라 형식을 맞춰 둡니다 - SNS 가입도 lib/phone.ts를 같이 씁니다)
    const normalizedPhone = formatKoreanMobile(phone);
    if (!normalizedPhone) {
      return NextResponse.json({ success: false, error: '휴대폰 번호 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    // 🔒 비밀번호 최소 요건 확인 (기존에는 1자리도 가입이 가능했습니다)
    const policyError = validatePassword(password);
    if (policyError) {
      return NextResponse.json({ success: false, error: policyError }, { status: 400 });
    }

    // 이메일 중복 체크
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: email }
    });

    if (existingUserByEmail) {
      return NextResponse.json({ success: false, error: '이미 존재하는 이메일입니다.' }, { status: 400 });
    }

    // 로그인 아이디 중복 체크
    const existingUserById = await prisma.user.findUnique({
      where: { loginId: loginId }
    });

    if (existingUserById) {
      return NextResponse.json({ success: false, error: '이미 존재하는 아이디입니다.' }, { status: 400 });
    }

    // 🌟 1. 비밀번호 암호화 (해싱)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 🌟 2. 암호화된 비밀번호를 저장
    // 📦 일본 창고 사서함 번호는 가입 시점에 발급합니다.
    //    배송대행을 신청하기 전에 주소부터 확인하는 게 실제 순서라, 나중에 발급하면
    //    마이페이지에 번호가 비어 있는 상태가 생깁니다.
    const japanMailboxNumber = await generateMailboxNumber(prisma);

    const newUser = await prisma.user.create({
      data: {
        loginId,
        email,
        password: hashedPassword, // 평문이 아닌 해싱된 값을 저장!
        name,
        nameEnglish: normalizedNameEnglish,
        phone: normalizedPhone,
        japanMailboxNumber,
        membershipGrade: 0,
        cyberMoney: 0
      },
      omit: { password: true }, // 🔒 비밀번호 해시는 응답에 포함하지 않음
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error("User POST Error:", error);
    return NextResponse.json({ error: '회원가입 처리 중 오류 발생' }, { status: 500 });
  }
}
