// 📊 솔라피 계정 현황 조회 (관리자 > 카카오톡 알림톡 관리 화면용)
//
//  API (https://solapi.com/developers/api)
//  - 통계        : GET messages/v4/statistics?startDate&endDate
//                  total / successed / failed 는 "메시지 타입별 건수" 객체입니다 (sms, ata … 각각 number).
//                  합계 키가 따로 없어서 값을 모두 더해 씁니다. dayPeriod[] 에 일별 통계가 들어 있습니다.
//  - 잔액        : GET cash/v1/balance          (balanceOnly + deposit + point = 합산 잔액, 솔라피 콘솔과 같은 기준)
//                  ⚠️ balance 는 '잔액 + 예치금(부가세 10% 제외)' 이라 예치금 1만 원이 9천 원으로 잡힙니다. 합산에 쓰지 않습니다.
//  - 일일 한도   : GET quota/v1/me              (quota = 하루 발송 한도)
//  - 발송 그룹   : GET messages/v4/groups       (groupList 는 groupId 를 키로 하는 객체)
//
//  📌 오늘 발송 · 발송 추세 · 채널 구성 · 성공률은 "발송 그룹" 으로 계산합니다.
//     솔라피 콘솔 대시보드도 "그룹 발송 시각(KST) 기준 · 발송요청 전·예약 그룹 제외" 로 집계합니다.
//     통계 API(messages/v4/statistics)의 건수는 이통사 처리 후 집계라 늦게 반영되거나 비어 있을 수 있어
//     (실제로 콘솔에는 6건이 보이는데 통계 API 로는 0건이 나왔습니다) 그룹 조회가 실패할 때만 대신 씁니다.
//  - 알림톡 템플릿: GET kakao/v2/templates      (status: PENDING / INSPECTING / APPROVED / REJECTED)
//  - 메시지 목록  : GET messages/v4/list         (messageList 는 messageId 를 키로 하는 객체)
//                  그룹 정보에는 어떤 템플릿을 보냈는지가 없어서, 메시지의 kakaoOptions.templateId 로
//                  "최근 발송 그룹" 에 템플릿 이름 · 수신번호(가림) · 처리 결과를 붙입니다.
//
// ⚠️ 솔라피 API 키에 "허용 IP" 가 걸려 있으면 등록된 서버(운영 EC2)에서만 조회됩니다.
//    로컬 PC 에서는 403 "허용되지 않은 IP" 가 나며, 화면에 그 문구를 그대로 보여 줍니다.
// ⚠️ 키/시크릿은 서버에서만 쓰고 응답에 절대 넣지 않습니다.

import prisma from '@/lib/prisma';
import { authHeader, ALIMTALK_TEMPLATES, maskPhone } from '@/lib/notifications/alimtalk';
import { normalizeKoreanMobile, formatKoreanMobile } from '@/lib/phone';

const SOLAPI_API = 'https://api.solapi.com';
const KST = 9 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

type Section<T> = { ok: true; data: T } | { ok: false; error: string };

export interface DailyPoint { date: string; success: number; failed: number; total: number }
export interface ChannelShare { type: string; label: string; count: number }
/** 수신번호로 찾은 우리 사이트 회원 (관리자 > 사용자 관리에 보이는 이름 · 프로필) */
export interface RecipientMember {
  userId: number;
  name: string;
  loginId: string;
  profileImage: string | null;
  /** 가입 7일 이내 (사용자 관리의 NEW 표시와 같은 기준) */
  isNew: boolean;
}
export interface GroupMessage {
  messageId: string;
  /** 받은 회원 (주문 → 회원 연락처 → 배송지 연락처 순으로 찾음). 못 찾으면 null */
  member: RecipientMember | null;
  /** 이 메시지를 보낸 주문번호들 (묶음 발송이면 여러 개) */
  orderIds: string[];
  /** 가운데를 가린 수신번호 (010****5678) */
  to: string;
  type: string;
  templateId: string | null;
  templateName: string | null;
  status: string;
  statusCode: string;
  reason: string;
  /** 알림톡 실패 후 문자로 대체 발송됐는지 */
  replacement: boolean;
  date: string | null;
}
export interface RecentGroup {
  groupId: string;
  status: string;
  channels: string[];
  dateCreated: string;
  total: number;
  success: number;
  failed: number;
  pending: number;
  /** 이 그룹에서 보낸 템플릿 이름 (중복 제거). 메시지 목록을 못 가져오면 빈 배열 */
  templates: string[];
  /** 그룹의 메시지 (최대 20건) */
  messages: GroupMessage[];
  /** 받은 회원 (중복 제거). 회원을 못 찾은 수신자는 들어가지 않습니다 */
  members: RecipientMember[];
  /** 전체 수신자 수 (회원이 아닌 번호 포함) */
  recipientCount: number;
  /** 이 그룹이 보낸 주문번호 (중복 제거) */
  orderIds: string[];
}
export interface TemplateRow {
  templateId: string;
  name: string;
  status: string;
  lastComment: string | null;
  dateUpdated: string | null;
  /** 이 사이트(lib/notifications/alimtalk.ts)가 실제로 쓰는 템플릿인지 */
  usedBySite: string | null;
}

export interface SolapiSummary {
  configured: boolean;
  today: Section<{ total: number; success: number; failed: number; pending: number }>;
  balance: Section<{ balance: number; deposit: number; point: number; total: number; autoRecharge: boolean; monthUsed: number | null }>;
  quota: Section<{ quota: number; used: number; remaining: number; autoAdjustment: boolean }>;
  /** 최근 30일 일별 성공/실패 + 성공률(7일, 이전 7일 대비) + 채널 구성(7일/30일) */
  stats: Section<{
    daily: DailyPoint[];
    successRate7: number | null;
    successRatePrev7: number | null;
    channels7: ChannelShare[];
    channels30: ChannelShare[];
  }>;
  groups: Section<RecentGroup[]>;
  templates: Section<TemplateRow[]>;
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

/** { sms: 3, ata: 5, … } → 8 */
const sumCounts = (obj: unknown) =>
  obj && typeof obj === 'object' ? Object.values(obj as Record<string, unknown>).reduce<number>((s, v) => s + num(v), 0) : 0;

/** KST 달력 날짜 문자열 (YYYY-MM-DD) */
const kstDate = (d: Date) => new Date(d.getTime() + KST).toISOString().slice(0, 10);

/** KST 기준 오늘 0시 / N일 전 0시 / 이번달 1일 0시 (UTC ISO 문자열) */
function kstStarts(now = new Date()) {
  const k = new Date(now.getTime() + KST);
  const todayMs = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - KST;
  const month = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), 1) - KST);
  return {
    today: new Date(todayMs).toISOString(),
    daysAgo: (n: number) => new Date(todayMs - n * DAY).toISOString(),
    month: month.toISOString(),
    now: now.toISOString(),
  };
}

const statsQuery = (startDate: string, endDate: string) =>
  `messages/v4/statistics?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;

// ---------------------------------------------------------------- 채널(메시지 타입) 이름

const TYPE_LABEL: Record<string, string> = {
  ata: '알림톡', cta: '친구톡', cti: '친구톡(이미지)',
  sms: 'SMS', lms: 'LMS', mms: 'MMS',
  nsa: '네이버 톡톡', voice: '음성', fax: '팩스',
};
export function typeLabel(type: string): string {
  if (TYPE_LABEL[type]) return TYPE_LABEL[type];
  if (type.startsWith('rcs_')) return 'RCS';
  if (type.startsWith('bms_')) return '브랜드 메시지';
  return type.toUpperCase();
}

/** 타입별 건수 → 라벨별로 합쳐 많은 순 정렬 (0건 제외) */
function toChannels(total: unknown): ChannelShare[] {
  const byLabel = new Map<string, ChannelShare>();
  if (total && typeof total === 'object') {
    for (const [type, v] of Object.entries(total as Record<string, unknown>)) {
      const count = num(v);
      if (count <= 0) continue;
      const label = typeLabel(type);
      const prev = byLabel.get(label);
      if (prev) prev.count += count;
      else byLabel.set(label, { type, label, count });
    }
  }
  return [...byLabel.values()].sort((a, b) => b.count - a.count);
}

function mergeCounts(days: any[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of days) {
    if (!d?.total || typeof d.total !== 'object') continue;
    for (const [k, v] of Object.entries(d.total as Record<string, unknown>)) out[k] = (out[k] || 0) + num(v);
  }
  return out;
}

// ---------------------------------------------------------------- 섹션별 가공

function wrap<T>(r: PromiseSettledResult<any>, build: (v: any) => T): Section<T> {
  if (r.status === 'rejected') {
    const e = r.reason;
    return { ok: false, error: e instanceof SolapiError ? e.message : '솔라피에 연결하지 못했습니다.' };
  }
  try {
    return { ok: true, data: build(r.value) };
  } catch {
    return { ok: false, error: '솔라피 응답 형식을 해석하지 못했습니다.' };
  }
}

function buildStats(s: any, now: Date) {
  const dayPeriod: any[] = Array.isArray(s?.dayPeriod)
    ? s.dayPeriod
    : Array.isArray(s?.monthPeriod) ? s.monthPeriod.flatMap((m: any) => (Array.isArray(m?.dayPeriod) ? m.dayPeriod : [])) : [];

  const byDate = new Map<string, any>();
  for (const d of dayPeriod) {
    const key = String(d?.date || d?._id || '').slice(0, 10);
    if (key) byDate.set(key, d);
  }

  // 최근 30일 (오늘 포함), 빈 날은 0
  const daily: DailyPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const key = kstDate(new Date(now.getTime() - i * DAY));
    const d = byDate.get(key);
    const success = sumCounts(d?.successed);
    const failed = sumCounts(d?.failed);
    daily.push({ date: key, success, failed, total: Math.max(sumCounts(d?.total), success + failed) });
  }

  // 성공률 = 성공 / (성공 + 실패) — 이통사 결과가 나온 건만 계산
  const rate = (days: DailyPoint[]) => {
    const ok = days.reduce((s, d) => s + d.success, 0);
    const done = ok + days.reduce((s, d) => s + d.failed, 0);
    return done > 0 ? (ok / done) * 100 : null;
  };

  // 채널 구성: 최근 7일 / 30일 (dayPeriod 원본의 total 을 합산)
  const keys7 = new Set(daily.slice(-7).map(d => d.date));
  const raw7 = [...byDate.entries()].filter(([k]) => keys7.has(k)).map(([, v]) => v);
  const keys30 = new Set(daily.map(d => d.date));
  const raw30 = [...byDate.entries()].filter(([k]) => keys30.has(k)).map(([, v]) => v);

  return {
    daily,
    successRate7: rate(daily.slice(-7)),
    successRatePrev7: rate(daily.slice(-14, -7)),
    channels7: toChannels(mergeCounts(raw7)),
    channels30: toChannels(mergeCounts(raw30)),
  };
}

/** templateId → 화면에 보일 이름 (솔라피 템플릿 이름 → 없으면 사이트 코드의 상태 이름) */
function templateNameMap(templatesJson: any): Map<string, string> {
  const map = new Map<string, string>();
  for (const [status, t] of Object.entries(ALIMTALK_TEMPLATES)) {
    const firstLine = t.content.split('\n')[0]?.replace(/^\[미쿠짱\]\s*/, '').trim();
    map.set(t.templateId, firstLine || status);
  }
  const list: any[] = Array.isArray(templatesJson?.templateList) ? templatesJson.templateList : [];
  for (const t of list) if (t?.templateId && t?.name) map.set(String(t.templateId), String(t.name));
  return map;
}

/**
 * 메시지에서 주문번호를 찾습니다.
 *  1) customFields.orderIds  — 발송할 때 묶인 주문번호를 모두 남깁니다 (orderStatusAlimtalk.ts, 이번에 추가)
 *  2) kakaoOptions.variables 의 #{주문번호} — 예전에 보낸 메시지 (첫 주문 하나만 들어 있음)
 *  3) 본문의 "주문번호 : XXX" 줄 — 위 둘이 없을 때
 */
function extractOrderIds(m: any): string[] {
  const fromCustom = typeof m?.customFields?.orderIds === 'string' ? m.customFields.orderIds : '';
  if (fromCustom) return [...new Set(fromCustom.split(',').map((v: string) => v.trim()).filter(Boolean))] as string[];
  const vars = m?.kakaoOptions?.variables;
  const fromVar = vars && typeof vars === 'object' ? (vars['#{주문번호}'] ?? vars['주문번호']) : null;
  if (typeof fromVar === 'string' && fromVar.trim()) return [fromVar.trim()];
  const text = typeof m?.text === 'string' ? m.text : '';
  const hit = text.match(/주문번호\s*[:：]\s*([A-Za-z0-9_-]+)/);
  return hit ? [hit[1]] : [];
}

/** 메시지 목록을 groupId 별로 묶습니다 */
function messagesByGroup(listJson: any, names: Map<string, string>): Map<string, GroupMessage[]> {
  const raw = listJson?.messageList;
  const arr: any[] = !raw ? [] : Array.isArray(raw) ? raw : Object.values(raw);
  const out = new Map<string, GroupMessage[]>();
  for (const m of arr) {
    const groupId = String(m?.groupId || '');
    if (!groupId) continue;
    const templateId = m?.kakaoOptions?.templateId ? String(m.kakaoOptions.templateId) : (m?.templateId ? String(m.templateId) : null);
    // 템플릿 이름을 모르면 본문 첫 줄로 대신합니다 ("[미쿠짱] 국제 배송 시작 안내" → "국제 배송 시작 안내")
    const firstLine = typeof m?.text === 'string' ? m.text.split('\n')[0].replace(/^\[미쿠짱\]\s*/, '').trim() : '';
    const msg: GroupMessage & { _phone?: string | null } = {
      messageId: String(m?.messageId || ''),
      member: null,
      orderIds: extractOrderIds(m),
      _phone: normalizeKoreanMobile(m?.to),
      to: maskPhone(m?.to),
      type: typeLabel(String(m?.type || '').toLowerCase()),
      templateId,
      templateName: templateId ? (names.get(templateId) ?? (firstLine || templateId)) : (firstLine || null),
      status: String(m?.status || ''),
      statusCode: String(m?.statusCode || ''),
      reason: String(m?.reason || ''),
      replacement: Boolean(m?.replacement),
      date: m?.dateReceived || m?.dateProcessed || m?.dateCreated || null,
    };
    const bucket = out.get(groupId);
    if (bucket) { if (bucket.length < 20) bucket.push(msg); } else out.set(groupId, [msg]);
  }
  return out;
}

/**
 * 받은 회원을 찾아 붙이고, 원래 번호는 응답에서 지웁니다.
 *  1) 주문번호가 있으면 그 주문의 회원 (가장 정확)
 *  2) 회원 연락처(users.phone)가 수신번호와 같은 회원
 *  3) 배송지 연락처(addresses.phone)가 수신번호와 같은 회원
 *     — 회원 연락처가 비어 있으면 알림톡이 기본 배송지 번호로 가기 때문입니다 (orderStatusAlimtalk.ts 의 pickPhone)
 * 번호는 "010-1234-5678" 과 숫자만 있는 형태를 모두 찾고, 같은 번호의 회원이 여럿이면 최근 가입 회원을 씁니다.
 */
async function attachMembers(groups: RecentGroup[]): Promise<RecentGroup[]> {
  type Msg = GroupMessage & { _phone?: string | null };
  const msgs = groups.flatMap(g => g.messages as Msg[]);
  const digits = [...new Set(msgs.map(m => m._phone).filter((v): v is string => !!v))];
  const orderIds = [...new Set(msgs.flatMap(m => m.orderIds))];

  const weekAgo = Date.now() - 7 * DAY;
  const toMember = (u: { id: number; name: string; loginId: string; profileImage: string | null; createdAt: Date }): RecipientMember => ({
    userId: u.id, name: u.name, loginId: u.loginId, profileImage: u.profileImage, isNew: u.createdAt.getTime() >= weekAgo,
  });
  const userSelect = { id: true, name: true, loginId: true, profileImage: true, createdAt: true } as const;

  const byOrder = new Map<string, RecipientMember>();
  const byPhone = new Map<string, RecipientMember>();
  try {
    if (orderIds.length > 0) {
      const orders = await prisma.order.findMany({
        where: { orderId: { in: orderIds } },
        select: { orderId: true, user: { select: userSelect } },
      });
      for (const o of orders) if (o.user) byOrder.set(o.orderId, toMember(o.user));
    }
    if (digits.length > 0) {
      const candidates = [...new Set(digits.flatMap(d => [d, formatKoreanMobile(d)].filter((v): v is string => !!v)))];
      const [users, addresses] = await Promise.all([
        prisma.user.findMany({
          where: { phone: { in: candidates } },
          select: { ...userSelect, phone: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.address.findMany({
          where: { phone: { in: candidates } },
          select: { phone: true, isDefault: true, user: { select: userSelect } },
          orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
        }),
      ]);
      for (const u of users) {
        const key = normalizeKoreanMobile(u.phone);
        if (key && !byPhone.has(key)) byPhone.set(key, toMember(u));
      }
      for (const a of addresses) {
        const key = normalizeKoreanMobile(a.phone);
        if (key && !byPhone.has(key) && a.user) byPhone.set(key, toMember(a.user));
      }
    }
  } catch (e) {
    console.error('[알림톡 관리] 수신자 회원 조회 실패:', e);
  }

  return groups.map(g => {
    const messages = (g.messages as Msg[]).map(({ _phone, ...m }) => {
      const fromOrder = m.orderIds.map(id => byOrder.get(id)).find(Boolean) ?? null;
      return { ...m, member: fromOrder ?? (_phone ? byPhone.get(_phone) ?? null : null) };
    });
    const seen = new Set<number>();
    const members: RecipientMember[] = [];
    for (const m of messages) {
      if (m.member && !seen.has(m.member.userId)) { seen.add(m.member.userId); members.push(m.member); }
    }
    return { ...g, messages, members };
  });
}

function buildGroups(list: any[], byGroup: Map<string, GroupMessage[]> = new Map()): RecentGroup[] {
  return list
    .map((g: any): RecentGroup => {
      const c = g?.count || {};
      const charge = g?.countForCharge && typeof g.countForCharge === 'object' ? g.countForCharge : {};
      const channels = [...new Set(
        Object.entries(charge)
          .filter(([, v]) => sumCounts(v) > 0)
          .map(([type]) => typeLabel(type)),
      )];
      return {
        groupId: String(g?.groupId || ''),
        status: String(g?.status || ''),
        channels,
        dateCreated: String(g?.dateCreated || ''),
        total: num(c.total),
        success: num(c.sentSuccess),
        failed: num(c.sentFailed),
        pending: num(c.sentPending),
        templates: [],
        messages: [],
        members: [],
        recipientCount: 0,
        orderIds: [],
      };
    })
    .filter(g => g.groupId)
    .sort((a, b) => (a.dateCreated < b.dateCreated ? 1 : -1))
    .slice(0, 10)
    .map(g => {
      const messages = byGroup.get(g.groupId) ?? [];
      const templates = [...new Set(messages.map(m => m.templateName).filter((v): v is string => !!v))];
      const orderIds = [...new Set(messages.flatMap(m => m.orderIds))];
      return { ...g, templates, messages, orderIds, recipientCount: new Set(messages.map(m => m.to)).size };
    });
}

/** 콘솔과 같이 집계에서 빼는 그룹 상태: 삭제 · 발송요청 전 · 예약 */
const EXCLUDED_GROUP_STATUS = new Set(['DELETED', 'PENDING', 'SCHEDULED']);

/** groupList(객체 또는 배열) → 배열 */
function groupArray(json: any): any[] {
  const g = json?.groupList;
  if (!g) return [];
  return Array.isArray(g) ? g : Object.values(g);
}

/** 발송 그룹 목록으로 오늘 발송 · 일별 추세 · 채널 구성 · 성공률을 계산합니다. */
function buildFromGroups(list: any[], now: Date) {
  const todayKey = kstDate(now);
  const days = new Map<string, DailyPoint>();
  for (let i = 29; i >= 0; i--) {
    const key = kstDate(new Date(now.getTime() - i * DAY));
    days.set(key, { date: key, success: 0, failed: 0, total: 0 });
  }
  const today = { total: 0, success: 0, failed: 0, pending: 0 };
  const charge7: Record<string, number> = {};
  const charge30: Record<string, number> = {};
  const keys7 = new Set([...days.keys()].slice(-7));

  for (const g of list) {
    if (EXCLUDED_GROUP_STATUS.has(String(g?.status || ''))) continue;
    const when = g?.dateSent || g?.dateCreated;
    if (!when) continue;
    const key = kstDate(new Date(when));
    const day = days.get(key);
    if (!day) continue; // 30일 밖

    const c = g?.count || {};
    const success = num(c.sentSuccess);
    const failed = num(c.sentFailed);
    const total = Math.max(num(c.total), num(c.sentTotal), success + failed);
    day.success += success;
    day.failed += failed;
    day.total += total;

    if (key === todayKey) {
      today.total += total;
      today.success += success;
      today.failed += failed;
      today.pending += num(c.sentPending);
    }

    // 채널: 실제 과금된 메시지 타입 (알림톡 실패 후 대체 문자로 나간 건은 sms/lms 로 잡힙니다)
    const charge = g?.countForCharge && typeof g.countForCharge === 'object' ? g.countForCharge : {};
    for (const [type, v] of Object.entries(charge)) {
      const cnt = sumCounts(v);
      if (cnt <= 0) continue;
      charge30[type] = (charge30[type] || 0) + cnt;
      if (keys7.has(key)) charge7[type] = (charge7[type] || 0) + cnt;
    }
  }

  const daily = [...days.values()];
  const rate = (arr: DailyPoint[]) => {
    const ok = arr.reduce((a, d) => a + d.success, 0);
    const done = ok + arr.reduce((a, d) => a + d.failed, 0);
    return done > 0 ? (ok / done) * 100 : null;
  };

  return {
    today,
    stats: {
      daily,
      successRate7: rate(daily.slice(-7)),
      successRatePrev7: rate(daily.slice(-14, -7)),
      channels7: toChannels(charge7),
      channels30: toChannels(charge30),
    },
  };
}

/** 최근 30일 발송 그룹을 모두 가져옵니다 (한 번에 최대 500개, 다음 페이지는 최대 3번 더) */
async function fetchRecentGroups(startDate: string, endDate: string): Promise<any[]> {
  const out: any[] = [];
  let startKey: string | null = null;
  for (let page = 0; page < 4; page++) {
    const qs = new URLSearchParams({ limit: '500', dateType: 'CREATED', startDate, endDate });
    if (startKey) qs.set('startKey', startKey);
    const json = await solapiGet(`messages/v4/groups?${qs.toString()}`);
    out.push(...groupArray(json));
    startKey = typeof json?.nextKey === 'string' && json.nextKey ? json.nextKey : null;
    if (!startKey) break;
  }
  return out;
}

function buildTemplates(json: any): TemplateRow[] {
  const list: any[] = Array.isArray(json?.templateList) ? json.templateList : [];

  // 사이트에서 쓰는 템플릿: templateId → 주문 상태 키
  const siteUse = new Map<string, string>();
  for (const [status, t] of Object.entries(ALIMTALK_TEMPLATES)) siteUse.set(t.templateId, status);

  return list
    .filter((t: any) => !t?.isDeleted)
    .map((t: any): TemplateRow => {
      const comments: any[] = Array.isArray(t?.comments) ? t.comments : [];
      const last = comments[comments.length - 1];
      const lastComment = typeof last === 'string' ? last : (last?.content ?? last?.comment ?? null);
      return {
        templateId: String(t?.templateId || ''),
        name: String(t?.name || '(이름 없음)'),
        status: String(t?.status || ''),
        lastComment: lastComment ? String(lastComment) : null,
        dateUpdated: t?.dateUpdated ? String(t.dateUpdated) : null,
        usedBySite: siteUse.get(String(t?.templateId || '')) ?? null,
      };
    })
    .sort((a, b) => ((a.dateUpdated || '') < (b.dateUpdated || '') ? 1 : -1));
}

// ---------------------------------------------------------------- 전체 조회

export async function getSolapiSummary(): Promise<SolapiSummary> {
  const configured = Boolean(process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET);
  const nowDate = new Date();
  const { today, daysAgo, month, now } = kstStarts(nowDate);

  // 솔라피 조회 API 제한: 5초에 20회 — 여기서는 8회(그룹이 500개를 넘으면 최대 11회) 호출합니다.
  const [todayStats, balance, monthStats, quota, stats30, groups, templates, messages] = await Promise.allSettled([
    solapiGet(statsQuery(today, now)),
    solapiGet('cash/v1/balance'),
    solapiGet(statsQuery(month, now)),
    solapiGet('quota/v1/me'),
    solapiGet(statsQuery(daysAgo(29), now)),
    fetchRecentGroups(daysAgo(29), now),
    solapiGet('kakao/v2/templates?limit=100'),
    // 최근 30일 메시지 (그룹별 템플릿 확인용, 최대 500건)
    solapiGet(`messages/v4/list?limit=500&startDate=${encodeURIComponent(daysAgo(29))}&endDate=${encodeURIComponent(now)}`),
  ]);

  // 그룹 기반 집계 (콘솔과 같은 기준). 그룹 조회가 실패하면 통계 API 값으로 대신합니다.
  const fromGroups = groups.status === 'fulfilled' ? buildFromGroups(groups.value, nowDate) : null;

  const todaySec = fromGroups
    ? { ok: true as const, data: fromGroups.today }
    : wrap(todayStats, (s) => {
        const total = sumCounts(s?.total);
        const success = sumCounts(s?.successed);
        const failed = sumCounts(s?.failed);
        return { total, success, failed, pending: Math.max(0, total - success - failed) };
      });

  const balanceSec = wrap(balance, (b) => {
    // balanceOnly = 순수 잔액, deposit = 예치금(입금액 그대로). 솔라피 콘솔의 "합산 잔액" 은 이 둘 + 포인트입니다.
    // (예전 응답처럼 balanceOnly/deposit 이 없으면 balance 를 그대로 씁니다)
    const hasSplit = typeof b?.balanceOnly === 'number' || typeof b?.deposit === 'number';
    const bal = hasSplit ? num(b?.balanceOnly) : num(b?.balance);
    const deposit = hasSplit ? num(b?.deposit) : 0;
    const point = num(b?.point);
    const monthUsed = monthStats.status === 'fulfilled'
      ? num(monthStats.value?.balance) + num(monthStats.value?.point)
      : null;
    return { balance: bal, deposit, point, total: bal + deposit + point, autoRecharge: Boolean(b?.autoRecharge), monthUsed };
  });

  const quotaSec = wrap(quota, (q) => {
    const limit = num(q?.quota);
    // 한도 사용량은 오늘 발송 건수로 계산합니다. (솔라피 한도는 매일 오전 9시 무렵 초기화)
    const used = todaySec.ok ? todaySec.data.total : 0;
    return { quota: limit, used, remaining: Math.max(0, limit - used), autoAdjustment: Boolean(q?.autoAdjustment) };
  });

  const groupsBase = wrap(groups, (list) => buildGroups(
    list,
    messages.status === 'fulfilled'
      ? messagesByGroup(messages.value, templateNameMap(templates.status === 'fulfilled' ? templates.value : null))
      : new Map(),
  ));
  const groupsSec: Section<RecentGroup[]> = groupsBase.ok
    ? { ok: true, data: await attachMembers(groupsBase.data) }
    : groupsBase;

  return {
    configured,
    today: todaySec,
    balance: balanceSec,
    quota: quotaSec,
    stats: fromGroups ? { ok: true, data: fromGroups.stats } : wrap(stats30, (s) => buildStats(s, nowDate)),
    groups: groupsSec,
    templates: wrap(templates, buildTemplates),
    fetchedAt: now,
  };
}
