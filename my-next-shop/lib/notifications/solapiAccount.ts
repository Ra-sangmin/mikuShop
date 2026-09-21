// 📊 솔라피 계정 현황 조회 (관리자 > 카카오톡 알림톡 관리 화면용)
//
//  - 오늘 발송   : GET messages/v4/statistics  (오늘 0시(KST) ~ 지금)
//  - 합산 잔액   : GET cash/v1/balance          (잔액 + 포인트)
//  - 이번달 사용 : GET messages/v4/statistics  (이번달 1일 0시(KST) ~ 지금) 의 balance + point
//  - 일일 한도   : GET quota/v1/me              (quota = 하루 발송 한도)
//
// ⚠️ 솔라피 API 키에 "허용 IP" 가 걸려 있으면 등록된 서버(운영 EC2)에서만 조회됩니다.
//    로컬 PC 에서는 403 "허용되지 않은 IP" 가 나며, 화면에 그 문구를 그대로 보여 줍니다.
// ⚠️ 키/시크릿은 서버에서만 쓰고 응답에 절대 넣지 않습니다.

import { authHeader } from '@/lib/notifications/alimtalk';

const SOLAPI_API = 'https://api.solapi.com';

type Section<T> = { ok: true; data: T } | { ok: false; error: string };

export interface SolapiSummary {
  configured: boolean;
  today: Section<{ total: number; success: number; failed: number; pending: number }>;
  balance: Section<{ balance: number; point: number; total: number; autoRecharge: boolean; monthUsed: number | null }>;
  quota: Section<{ quota: number; used: number; remaining: number; autoAdjustment: boolean }>;
  fetchedAt: string;
}

class SolapiError extends Error {}

async function solapiGet(path: string): Promise<any> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  if (!apiKey || !apiSecret) throw new SolapiError('SOLAPI_API_KEY / SOLAPI_API_SECRET 이 설정되지 않았습니다.');

  const res = await fetch(`${SOLAPI_API}/${path}`, {
    headers: { Authorization: authHeader(apiKey, apiSecret) },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok) {
    throw new SolapiError(json?.errorMessage || json?.message || `솔라피 응답 오류 (HTTP ${res.status})`);
  }
  return json;
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** KST 기준 오늘 0시 / 이번달 1일 0시 (UTC ISO 문자열) */
function kstStarts(now = new Date()) {
  const KST = 9 * 60 * 60 * 1000;
  const k = new Date(now.getTime() + KST);
  const today = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - KST);
  const month = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), 1) - KST);
  return { today: today.toISOString(), month: month.toISOString(), now: now.toISOString() };
}

function statsQuery(startDate: string, endDate: string) {
  return `messages/v4/statistics?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
}

function toSection<T>(r: PromiseSettledResult<T>): Section<T> {
  if (r.status === 'fulfilled') return { ok: true, data: r.value };
  const e = r.reason;
  return { ok: false, error: e instanceof SolapiError ? e.message : '솔라피에 연결하지 못했습니다.' };
}

export async function getSolapiSummary(): Promise<SolapiSummary> {
  const configured = Boolean(process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET);
  const { today, month, now } = kstStarts();

  const [todayStats, balance, monthStats, quota] = await Promise.allSettled([
    solapiGet(statsQuery(today, now)),
    solapiGet('cash/v1/balance'),
    solapiGet(statsQuery(month, now)),
    solapiGet('quota/v1/me'),
  ]);

  const todaySec = toSection(todayStats.status === 'fulfilled'
    ? { status: 'fulfilled' as const, value: (() => {
        const s = todayStats.value;
        const total = num(s?.total?.total);
        const success = num(s?.successed?.total);
        const failed = num(s?.failed?.total);
        return { total, success, failed, pending: Math.max(0, total - success - failed) };
      })() }
    : todayStats);

  const balanceSec = toSection(balance.status === 'fulfilled'
    ? { status: 'fulfilled' as const, value: (() => {
        const b = balance.value;
        const bal = num(b?.balance);
        const point = num(b?.point);
        const monthUsed = monthStats.status === 'fulfilled'
          ? num(monthStats.value?.balance) + num(monthStats.value?.point)
          : null;
        return { balance: bal, point, total: bal + point, autoRecharge: Boolean(b?.autoRecharge), monthUsed };
      })() }
    : balance);

  const quotaSec = toSection(quota.status === 'fulfilled'
    ? { status: 'fulfilled' as const, value: (() => {
        const q = num(quota.value?.quota);
        // 한도 사용량은 오늘 발송 건수로 계산합니다. (솔라피 한도는 매일 오전 9시 무렵 초기화)
        const used = todaySec.ok ? todaySec.data.total : 0;
        return { quota: q, used, remaining: Math.max(0, q - used), autoAdjustment: Boolean(quota.value?.autoAdjustment) };
      })() }
    : quota);

  return { configured, today: todaySec, balance: balanceSec, quota: quotaSec, fetchedAt: now };
}
