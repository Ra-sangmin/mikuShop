// 🔔 관리자에게 보내는 카카오톡 "나에게 보내기" 알림
//
// 관리자 본인 카카오 계정의 "나와의 채팅"으로 메시지를 보냅니다.
// 주문이 "관리자 처리 필요" 상태로 넘어왔을 때 바로 알기 위한 **내부용** 알림입니다.
//
// 알림톡(솔라피)과 다른 점
//  · 무료입니다. 템플릿 검수도 없어 문구를 자유롭게 씁니다.
//  · 대신 연동한 본인에게만 갑니다. 고객 안내에는 쓸 수 없습니다.
//
// ⚠️ 리프레시 토큰은 약 2개월입니다. 그 사이 한 번이라도 갱신되면 계속 이어지지만,
//    두 달 내내 알림이 한 건도 없으면 끊깁니다. 그때는 관리자 화면에서 다시 연결하면 됩니다.
//    (끊긴 것을 모르고 지나치지 않도록 lastError 를 남기고 화면에 보여 줍니다)
import prisma from '@/lib/prisma';

const KAUTH = 'https://kauth.kakao.com';
const KAPI = 'https://kapi.kakao.com';

/** 나에게 보내기에 필요한 동의항목. 카카오 개발자 콘솔에서 켜 두어야 합니다. */
export const KAKAO_MEMO_SCOPE = 'talk_message';

/** 카카오 텍스트 메시지 본문 제한. 넘기면 발송이 거절됩니다. */
const TEXT_LIMIT = 200;

export function isKakaoMemoConfigured(): boolean {
  return Boolean(process.env.KAKAO_CLIENT_ID);
}

/** 콘솔에 등록해야 하는 Redirect URI. 한 글자라도 다르면 카카오가 거절합니다. */
export function kakaoRedirectUri(): string {
  const base = (process.env.KAKAO_NOTIFY_ORIGIN || 'https://mikushop.co.kr').replace(/\/+$/, '');
  return `${base}/api/admin/kakao-notify/callback`;
}

/** 관리자가 눌러서 카카오 동의 화면으로 가는 주소 */
export function kakaoAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.KAKAO_CLIENT_ID || '',
    redirect_uri: kakaoRedirectUri(),
    response_type: 'code',
    scope: KAKAO_MEMO_SCOPE,
    state,
  });
  return `${KAUTH}/oauth/authorize?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${KAUTH}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams({
      client_id: process.env.KAKAO_CLIENT_ID || '',
      // 콘솔에서 "client_secret 사용"을 켠 앱이라 함께 보냅니다. (로그인도 같은 앱을 씁니다)
      ...(process.env.KAKAO_CLIENT_SECRET ? { client_secret: process.env.KAKAO_CLIENT_SECRET } : {}),
      ...body,
    }).toString(),
    signal: AbortSignal.timeout(10000),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok || !json?.access_token) {
    throw new Error(json?.error_description || json?.msg || `카카오 토큰 요청 실패 (HTTP ${res.status})`);
  }
  return json;
}

/** 처음 연결할 때: 동의 화면에서 받은 code 를 토큰으로 바꿉니다. */
export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  return tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: kakaoRedirectUri() });
}

/** 토큰의 주인(카카오 회원번호). 프로필 동의 없이도 확인할 수 있습니다. */
export async function fetchKakaoUserId(accessToken: string): Promise<string> {
  const res = await fetch(`${KAPI}/v1/user/access_token_info`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok || !json?.id) throw new Error(json?.msg || '카카오 사용자 정보를 확인하지 못했습니다.');
  return String(json.id);
}

/* ------------------------------------------------------------------ 연결 정보 */

/** 연결은 한 줄만 둡니다. (관리자 한 명이 받는 알림이라 여러 줄일 이유가 없습니다) */
export async function getConnection() {
  return prisma.adminKakaoNotify.findFirst({ orderBy: { id: 'asc' } });
}

/** 액세스 토큰은 12시간짜리라 매번 새로 받지 않고 프로세스 안에 들고 있습니다. */
let cachedAccess: { token: string; expiresAt: number } | null = null;

async function getAccessToken(refreshToken: string, connectionId: number): Promise<string> {
  if (cachedAccess && cachedAccess.expiresAt > Date.now() + 60_000) return cachedAccess.token;

  const token = await tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken });
  cachedAccess = { token: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 };

  // 🌟 리프레시 토큰은 남은 기간이 1개월 미만일 때만 새로 내려옵니다. 왔을 때 갈아 끼워야
  //    두 달이 지나도 연결이 유지됩니다. (안 바꾸면 조용히 만료됩니다)
  if (token.refresh_token) {
    await prisma.adminKakaoNotify.update({
      where: { id: connectionId },
      data: { refreshToken: token.refresh_token },
    });
  }
  return cachedAccess.token;
}

/** 연결을 끊었을 때 캐시도 비웁니다. (다음 연결에서 옛 토큰을 쓰지 않도록) */
export function clearAccessTokenCache() {
  cachedAccess = null;
}

/* ------------------------------------------------------------------ 발송 */

export type MemoResult = { sent: boolean; skipped?: string; error?: string };

/**
 * "나와의 채팅"으로 메시지를 보냅니다.
 *
 * 실패해도 예외를 던지지 않습니다 — 이 알림 때문에 주문 처리나 크론이 멈추면 안 됩니다.
 * 대신 마지막 오류를 DB 에 남겨 관리자 화면에서 볼 수 있게 합니다.
 */
export async function sendKakaoMemo(text: string, link?: { url: string; buttonTitle?: string }): Promise<MemoResult> {
  if (!isKakaoMemoConfigured()) return { sent: false, skipped: 'KAKAO_CLIENT_ID 없음' };

  const conn = await getConnection();
  if (!conn) return { sent: false, skipped: '카카오 알림이 연결되지 않았습니다.' };
  if (!conn.enabled) return { sent: false, skipped: '관리자가 알림을 꺼 두었습니다.' };

  try {
    const accessToken = await getAccessToken(conn.refreshToken, conn.id);

    // ⚠️ 본문은 200자까지입니다. 넘으면 카카오가 통째로 거절하므로 여기서 줄입니다.
    const body = text.length > TEXT_LIMIT ? `${text.slice(0, TEXT_LIMIT - 1)}…` : text;
    const template: Record<string, unknown> = {
      object_type: 'text',
      text: body,
      // link 는 필수 항목이라, 열 주소가 없어도 관리자 주문 목록을 기본으로 넣습니다.
      link: link ? { web_url: link.url, mobile_web_url: link.url } : {},
    };
    if (link?.buttonTitle) template.button_title = link.buttonTitle;

    const res = await fetch(`${KAPI}/v2/api/talk/memo/default/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: new URLSearchParams({ template_object: JSON.stringify(template) }).toString(),
      signal: AbortSignal.timeout(10000),
    });
    const json: any = await res.json().catch(() => null);
    if (!res.ok || json?.result_code !== 0) {
      throw new Error(json?.msg || `카카오 메시지 발송 실패 (HTTP ${res.status})`);
    }

    await prisma.adminKakaoNotify.update({
      where: { id: conn.id },
      data: { lastSentAt: new Date(), lastError: null },
    });
    return { sent: true };
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error('[카카오 알림] 발송 실패:', message);
    // 연결이 끊긴 것을 화면에서 알 수 있도록 남깁니다. 발송 자체는 조용히 넘어갑니다.
    await prisma.adminKakaoNotify
      .update({ where: { id: conn.id }, data: { lastError: message } })
      .catch(() => {});
    return { sent: false, error: message };
  }
}
