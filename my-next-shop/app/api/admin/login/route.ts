import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { timingSafeEqual } from 'crypto';
import prisma from '@/lib/prisma';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSessionToken,
} from '@/lib/adminSession';
import { getAdminSession } from '@/lib/apiAuth';
import { rateLimit, resetRateLimit, clientIp } from '@/lib/rateLimit';

const isBcryptHash = (value: string) => /^\$2[aby]\$\d{2}\$/.test(value);

function plainEquals(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request) {
  try {
    // 🔒 무차별 대입 방지: 같은 IP에서 10분에 10회까지만 시도할 수 있습니다.
    // (로그인에 성공하면 아래에서 카운터를 초기화합니다.)
    const rateKey = `admin-login:${clientIp(request)}`;
    const limited = rateLimit(rateKey, 10, 10 * 60 * 1000);
    if (!limited.allowed) {
      return NextResponse.json(
        { error: `로그인 시도가 너무 많습니다. ${limited.retryAfterSeconds}초 후 다시 시도해주세요.` },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
      );
    }

    // 🔒 보안: 요청 본문(아이디·비밀번호)은 로그에 남기지 않습니다.
    const body = await request.json();
    const adminId = typeof body?.admin_id === 'string' ? body.admin_id : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!adminId || !password) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 });
    }

    const admin = await prisma.admin.findUnique({ where: { adminId } });
    if (!admin) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 });
    }

    // 🔒 비밀번호 확인: bcrypt 해시면 해시 비교, 예전 평문 저장값이면 평문 비교 후 즉시 해시로 교체합니다.
    let isMatch = false;
    if (isBcryptHash(admin.password)) {
      isMatch = await bcrypt.compare(password, admin.password);
    } else {
      isMatch = plainEquals(password, admin.password);
      if (isMatch) {
        await prisma.admin.update({
          where: { id: admin.id },
          data: { password: await bcrypt.hash(password, 10) },
        });
      }
    }

    if (!isMatch) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 });
    }

    // 로그인에 성공했으므로 실패 누적을 초기화합니다. (정상 사용자가 막히지 않도록)
    resetRateLimit(rateKey);

    // 🔒 서버에서 서명한 세션 토큰을 httpOnly 쿠키로 발급합니다. (브라우저 JS에서 읽기/위조 불가)
    const token = await createAdminSessionToken({ id: admin.id, adminId: admin.adminId, name: admin.name });
    const response = NextResponse.json({ success: true, name: admin.name });
    response.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_SESSION_MAX_AGE,
    });
    return response;
  } catch (error: any) {
    console.error('❌ 관리자 로그인 API 에러:', error?.message);
    return NextResponse.json({ error: '로그인 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 현재 관리자 세션이 유효한지 확인합니다.
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, adminId: admin.adminId, name: admin.name });
}
