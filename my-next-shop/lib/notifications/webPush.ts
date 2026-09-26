// 🔔 관리자 웹 푸시 — 휴대폰·PC 브라우저로 바로 오는 알림
//
// 카카오톡 "나에게 보내기"는 내가 나에게 보낸 메시지라 휴대폰 알림(소리·배너)이 울리지 않았습니다.
// 웹 푸시는 브라우저가 알림을 띄우므로 잠금 화면에도 바로 뜹니다. 무료이고 앱 설치가 필요 없습니다.
//
//   1) 관리자 화면(알림톡 관리)에서 기기마다 "이 기기에서 알림 받기" → 구독 정보가 DB 에 저장
//      (아이폰은 사파리 → 공유 → "홈 화면에 추가" 후, 홈 화면 아이콘으로 열어야 받을 수 있습니다)
//   2) 서버가 브라우저 회사(구글·애플·모질라)의 푸시 서버로 암호화한 메시지를 보냄
//   3) 기기의 서비스 워커(public/miku-admin-sw.js)가 알림을 띄우고, 누르면 관리자 화면을 엶
//
// 외부 라이브러리(web-push) 없이 Node 내장 crypto 로 표준 그대로 구현했습니다.
//   · 메시지 암호화 : RFC 8291 (aes128gcm)
//   · 보내는 서버 인증: RFC 8292 (VAPID, ES256 JWT)
//   (암호화·서명 결과는 별도 구현(파이썬 cryptography)으로 복호화·서명 검증해 확인했습니다)
//
// .env
//   VAPID_PUBLIC_KEY  / VAPID_PRIVATE_KEY : `node scripts/generate-vapid-keys.mjs` 로 한 번 만듭니다.
//   VAPID_SUBJECT (선택): 연락처. 기본값 mailto:admin@mikushop.co.kr
//   ⚠️ 키를 바꾸면 기존 구독이 모두 무효가 됩니다(기기에서 다시 "알림 받기" 필요).

import crypto from 'node:crypto';
import prisma from '@/lib/prisma';

/* ------------------------------------------------------------------ 설정 */

const b64url = (buf: Buffer | Uint8Array) => Buffer.from(buf).toString('base64url');
const fromB64url = (s: string) => Buffer.from(s, 'base64url');

export function isWebPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim());
}

/** 브라우저가 구독할 때 쓰는 공개키 (비밀 아님) */
export function vapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY?.trim() || '';
}

/* ------------------------------------------------------------------ VAPID (RFC 8292) */

let signingKey: crypto.KeyObject | null = null;

function getSigningKey(): crypto.KeyObject {
  if (signingKey) return signingKey;
  const pub = fromB64url(vapidPublicKey()); // 0x04 || x(32) || y(32)
  const d = fromB64url(process.env.VAPID_PRIVATE_KEY!.trim());
  if (pub.length !== 65 || pub[0] !== 4 || d.length !== 32) {
    throw new Error('VAPID 키 형식이 올바르지 않습니다. scripts/generate-vapid-keys.mjs 로 다시 만들어 주세요.');
  }
  signingKey = crypto.createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', d: b64url(d), x: b64url(pub.subarray(1, 33)), y: b64url(pub.subarray(33, 65)) },
    format: 'jwk',
  });
  return signingKey;
}

/** 푸시 서버에 "미쿠짱 서버가 보낸 것" 임을 증명하는 헤더 */
function vapidAuthorization(endpoint: string): string {
  const aud = new URL(endpoint).origin;
  const header = b64url(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64url(Buffer.from(JSON.stringify({
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 최대 24시간
    sub: process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@mikushop.co.kr',
  })));
  const input = `${header}.${claims}`;
  // JWT 의 ES256 서명은 r||s (64바이트) 형식이어야 합니다 → ieee-p1363
  const sig = crypto.sign('sha256', Buffer.from(input), { key: getSigningKey(), dsaEncoding: 'ieee-p1363' });
  return `vapid t=${input}.${b64url(sig)}, k=${vapidPublicKey()}`;
}

/* ------------------------------------------------------------------ 암호화 (RFC 8291, aes128gcm) */

const hmac = (key: Buffer, data: Buffer) => crypto.createHmac('sha256', key).update(data).digest();

/**
 * 구독한 브라우저만 풀 수 있게 메시지를 암호화합니다.
 * (푸시 서버를 거쳐 가지만 구글·애플도 내용을 볼 수 없습니다)
 */
export function encryptPayload(payload: Buffer, p256dh: string, authSecret: string): Buffer {
  const uaPublic = fromB64url(p256dh);   // 브라우저 공개키 65바이트
  const auth = fromB64url(authSecret);   // 16바이트
  if (uaPublic.length !== 65 || auth.length !== 16) throw new Error('구독 키 형식이 올바르지 않습니다.');

  // 보낼 때마다 새 키 쌍(일회용)
  const ecdh = crypto.createECDH('prime256v1');
  const asPublic = ecdh.generateKeys();  // 65바이트 (0x04…)
  const shared = ecdh.computeSecret(uaPublic);

  // IKM = HKDF(auth, shared, "WebPush: info\0" || ua_public || as_public, 32)
  const prkKey = hmac(auth, shared);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic, Buffer.from([1])]);
  const ikm = hmac(prkKey, keyInfo);

  const salt = crypto.randomBytes(16);
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01', 'binary')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01', 'binary')).subarray(0, 12);

  // 레코드 하나로 보냅니다. 끝에 0x02(마지막 레코드 표시)를 붙입니다.
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);

  // 헤더: salt(16) || 레코드 크기(4, BE) || 키 길이(1) || as_public(65)
  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, body]);
}

/* ------------------------------------------------------------------ 발송 */

export type PushMessage = {
  title: string;
  body: string;
  /** 알림을 누르면 열 주소 (관리자 화면 경로) */
  url?: string;
  /** 같은 tag 의 알림은 새 것으로 바뀝니다 (알림이 수십 개 쌓이지 않게) */
  tag?: string;
};

type Subscription = { endpoint: string; p256dh: string; auth: string };

/** 브라우저 푸시 서버로 1건 보냅니다. */
async function deliver(sub: Subscription, message: PushMessage): Promise<void> {
  // 페이로드는 4KB 제한이 있어 본문을 줄입니다.
  const payload = Buffer.from(JSON.stringify({ ...message, body: message.body.slice(0, 1500) }));
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: vapidAuthorization(sub.endpoint),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(60 * 60 * 24), // 폰이 꺼져 있어도 하루 동안은 보관했다가 전달
      Urgency: 'high',
    },
    body: new Uint8Array(encryptPayload(payload, sub.p256dh, sub.auth)),
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`HTTP ${res.status} ${text.slice(0, 150)}`.trim()) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
}

export type PushResult = { sent: boolean; sentCount: number; failed: number; removed: number; skipped?: string };

/**
 * 등록된 관리자 기기로 보냅니다. (onlyEndpoint 를 주면 그 기기에만 — 테스트 알림용)
 *
 * 실패해도 예외를 던지지 않습니다 — 알림 때문에 주문 처리나 크론이 멈추면 안 됩니다.
 * 브라우저가 구독을 없앤 기기(404·410)는 목록에서 지웁니다.
 */
export async function sendAdminPush(message: PushMessage, onlyEndpoint?: string): Promise<PushResult> {
  if (!isWebPushConfigured()) return { sent: false, sentCount: 0, failed: 0, removed: 0, skipped: 'VAPID 키 없음' };

  const subs = await prisma.adminPushSubscription.findMany({
    where: onlyEndpoint ? { endpoint: onlyEndpoint } : undefined,
  });
  if (subs.length === 0) return { sent: false, sentCount: 0, failed: 0, removed: 0, skipped: '알림을 받는 기기가 없습니다.' };

  let sentCount = 0, failed = 0, removed = 0;
  await Promise.all(subs.map(async sub => {
    try {
      await deliver(sub, message);
      sentCount++;
      await prisma.adminPushSubscription.update({
        where: { id: sub.id },
        data: { lastSentAt: new Date(), lastError: null, failCount: 0 },
      }).catch(() => {});
    } catch (e) {
      const status = (e as { status?: number }).status;
      const msg = (e as Error).message || String(e);
      // 404/410: 알림을 끄거나 브라우저 데이터를 지워 구독이 사라진 것 → 정리
      if (status === 404 || status === 410) {
        removed++;
        await prisma.adminPushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        console.warn(`[웹 푸시] 만료된 구독 정리: ${sub.label ?? sub.id}`);
        return;
      }
      failed++;
      console.error(`[웹 푸시] 발송 실패 (${sub.label ?? sub.id}):`, msg);
      await prisma.adminPushSubscription.update({
        where: { id: sub.id },
        data: { lastError: msg.slice(0, 500), failCount: { increment: 1 } },
      }).catch(() => {});
    }
  }));

  return { sent: sentCount > 0, sentCount, failed, removed };
}
