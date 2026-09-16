// 🔒 API 라우트 공통 권한 확인 헬퍼
// - requireAdmin: 서명된 관리자 세션 쿠키가 있어야 통과
// - requireUser : NextAuth 로그인 세션의 회원 ID를 사용 (클라이언트가 보낸 userId는 신뢰하지 않음)
//
// 사용 예)
//   const auth = await requireAdmin();
//   if (!auth.ok) return auth.response;
//
//   const auth = await requireUser(body.userId);
//   if (!auth.ok) return auth.response;
//   const userId = auth.userId; // 항상 이 값을 사용
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken, type AdminSession } from '@/lib/adminSession';

type Fail = { ok: false; response: NextResponse };

const unauthorized = (message: string): Fail => ({
  ok: false,
  response: NextResponse.json({ success: false, error: message, message }, { status: 401 }),
});

const forbidden = (message: string): Fail => ({
  ok: false,
  response: NextResponse.json({ success: false, error: message, message }, { status: 403 }),
});

function toId(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** 현재 요청의 관리자 세션 (없거나 위조/만료면 null) */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

/** 현재 요청의 로그인 회원 ID (없으면 null) */
export async function getSessionUserId(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  return toId((session?.user as any)?.id);
}

export async function requireAdmin(): Promise<{ ok: true; admin: AdminSession } | Fail> {
  const admin = await getAdminSession();
  if (!admin) return unauthorized('관리자 로그인이 필요합니다.');
  return { ok: true, admin };
}

/**
 * 로그인 회원을 확인하고, 작업 대상 회원 ID를 돌려줍니다.
 * @param requestedUserId 클라이언트가 보낸 userId (있으면 로그인 회원과 같아야 함)
 * @param options.allowAdmin true면 관리자 세션으로도 통과하며, 이때는 requestedUserId를 대상으로 사용
 */
type UserOk = { ok: true; userId: number; isAdmin: false };
type AdminOk = { ok: true; userId: number | null; isAdmin: true };

export async function requireUser(requestedUserId?: unknown, options?: { allowAdmin?: false }): Promise<UserOk | Fail>;
export async function requireUser(requestedUserId: unknown, options: { allowAdmin: true }): Promise<UserOk | AdminOk | Fail>;
export async function requireUser(
  requestedUserId?: unknown,
  options: { allowAdmin?: boolean } = {},
): Promise<UserOk | AdminOk | Fail> {
  const requested = toId(requestedUserId);

  if (options.allowAdmin) {
    const admin = await getAdminSession();
    if (admin) return { ok: true, userId: requested, isAdmin: true };
  }

  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) return unauthorized('로그인이 필요합니다.');

  if (requestedUserId !== undefined && requestedUserId !== null && requestedUserId !== '' && requested !== sessionUserId) {
    return forbidden('본인 정보만 조회/변경할 수 있습니다.');
  }

  return { ok: true, userId: sessionUserId, isAdmin: false };
}
