// 🔒 관리자 세션 토큰 (서명된 쿠키)
// - 형식: base64url(JSON payload) + "." + base64url(HMAC-SHA256 서명)
// - Web Crypto API만 사용하므로 middleware(edge)와 API 라우트(node) 양쪽에서 동일하게 동작합니다.
// - 이 파일은 next/headers를 import하지 않습니다(middleware에서도 import하기 때문).

export const ADMIN_SESSION_COOKIE = 'admin_session';
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12; // 12시간(초)

export type AdminSession = {
  id: number;       // admins.id
  adminId: string;  // admins.admin_id
  name: string | null;
  exp: number;      // 만료 시각 (unix seconds)
};

const encoder = new TextEncoder();

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET(또는 NEXTAUTH_SECRET) 환경변수가 설정되지 않았습니다.');
  }
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function createAdminSessionToken(admin: { id: number; adminId: string; name: string | null }): Promise<string> {
  const payload: AdminSession = {
    id: admin.id,
    adminId: admin.adminId,
    name: admin.name,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE,
  };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await getKey(), encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(sig))}`;
}

/** 서명·만료를 검증하고, 유효하면 세션 정보를, 아니면 null을 반환합니다. */
export async function verifyAdminSessionToken(token: string | undefined | null): Promise<AdminSession | null> {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await getKey(),
      fromBase64Url(sig) as BufferSource,
      encoder.encode(body),
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as AdminSession;
    if (typeof payload.id !== 'number' || typeof payload.exp !== 'number') return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
