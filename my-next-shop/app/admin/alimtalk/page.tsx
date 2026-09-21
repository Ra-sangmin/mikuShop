"use client";

// 💬 카카오톡 알림톡 관리
// 솔라피 API 로 계정 현황을 한 화면에 보여 줍니다.
//   - 상단 KPI : 오늘 발송 · 합산 잔액 · 일일 한도 · 성공률(7일)
//   - 최근 발송 그룹 : 상태 + 성공/실패/처리중 건수 (발송 누락·오류를 먼저 발견)
//   - 발송 추세(7일/30일) · 채널 구성 (알림톡 vs 대체 문자 비율)
//   - 알림톡 템플릿 검수 상태 (승인/검수중/반려 + 검수 의견)
//   데이터: /api/admin/alimtalk/summary (lib/notifications/solapiAccount.ts)
//   스타일: ./alimtalk-premium.css (접두사 atk-)

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import '../admin-common.css';
import './alimtalk-premium.css';
import { TrendChart, ChannelBreakdown } from './AlimtalkCharts';
// 🌟 회원 · 주문을 누르면 사용자 관리 / 주문 관리와 같은 팝업을 띄웁니다 (공용 컴포넌트)
import MemberDrawer from '../components/MemberDrawer';
import OrderDetailModal, { toOrderDetailView } from '../components/OrderDetailModal';
import { AdminHero, HeroButton, KpiCard, Badge, SegFilter, fmtDateTime, useToasts, ToastStack } from '../components/AdminPremiumKit';
import {
  ChatCircleDots, Info, ArrowClockwise, ArrowSquareOut, PaperPlaneTilt, Wallet, Gauge, WarningCircle,
  Pulse, ClipboardText, Bank, Copy, Check,
} from '@phosphor-icons/react';

const SOLAPI_DASHBOARD_URL = 'https://console.solapi.com/dashboard';
/** 솔라피 충전 전용 계좌 (솔라피에서 발급받은 계좌 — 이 계좌로 입금하면 잔액이 충전됩니다) */
const SOLAPI_DEPOSIT_ACCOUNT = { bank: '신한은행', holder: '솔라피(주)', number: '562135-07-996205' };

/** 클립보드 복사 (http 개발 환경 등 navigator.clipboard 가 없을 때를 대비한 예비 방법 포함) */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* 아래 예비 방법으로 */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
/** 7일 성공률이 이 값보다 낮으면 경고를 띄웁니다 */
const SUCCESS_RATE_ALERT = 90;

type Section<T> = { ok: true; data: T } | { ok: false; error: string };
interface DailyPoint { date: string; success: number; failed: number; total: number }
interface ChannelShare { type: string; label: string; count: number }
interface RecipientMember { userId: number; name: string; loginId: string; profileImage: string | null; isNew: boolean }
interface GroupMessage {
  messageId: string; member: RecipientMember | null; orderIds: string[]; to: string; type: string; templateId: string | null; templateName: string | null;
  status: string; statusCode: string; reason: string; replacement: boolean; date: string | null;
}
interface RecentGroup {
  groupId: string; status: string; channels: string[]; dateCreated: string;
  total: number; success: number; failed: number; pending: number;
  templates: string[]; messages: GroupMessage[]; members: RecipientMember[]; recipientCount: number;
  orderIds: string[];
}
interface TemplateRow {
  templateId: string; name: string; status: string; lastComment: string | null;
  dateUpdated: string | null; usedBySite: string | null;
}
interface Summary {
  configured: boolean;
  today: Section<{ total: number; success: number; failed: number; pending: number }>;
  balance: Section<{ balance: number; deposit: number; point: number; total: number; autoRecharge: boolean; monthUsed: number | null }>;
  quota: Section<{ quota: number; used: number; remaining: number; autoAdjustment: boolean }>;
  stats: Section<{
    daily: DailyPoint[]; successRate7: number | null; successRatePrev7: number | null;
    channels7: ChannelShare[]; channels30: ChannelShare[];
  }>;
  groups: Section<RecentGroup[]>;
  templates: Section<TemplateRow[]>;
  fetchedAt: string;
}

const n = (v: number) => v.toLocaleString('ko-KR');

// ---------------------------------------------------------------- 상태 표시

const GROUP_STATUS: Record<string, { label: string; rgb: string }> = {
  COMPLETE: { label: '완료', rgb: '5, 150, 105' },
  PENDING: { label: '대기', rgb: '100, 116, 139' },
  SENDING: { label: '발송중', rgb: '37, 99, 235' },
  PROCESSING: { label: '처리중', rgb: '37, 99, 235' },
  SCHEDULED: { label: '예약', rgb: '124, 58, 237' },
  FAILED: { label: '실패', rgb: '225, 29, 72' },
  'SYSTEM-ERROR': { label: '시스템 오류', rgb: '225, 29, 72' },
  DELETED: { label: '삭제', rgb: '100, 116, 139' },
};
const TEMPLATE_STATUS: Record<string, { label: string; rgb: string }> = {
  APPROVED: { label: '승인', rgb: '5, 150, 105' },
  INSPECTING: { label: '검수중', rgb: '37, 99, 235' },
  PENDING: { label: '검수 요청 전', rgb: '217, 119, 6' },
  REJECTED: { label: '반려', rgb: '225, 29, 72' },
};
/** 사이트 주문 상태 키 → 화면 이름 (lib/notifications/alimtalk.ts 의 ALIMTALK_TEMPLATES 키) */
const SITE_STATUS_LABEL: Record<string, string> = {
  BID_SUCCESS: '낙찰 성공',
  ARRIVED: '일본 창고 입고',
  PAYMENT_REQ: '국제배송비 결제 요청',
  SHIPPING: '국제배송 시작',
};

// ---------------------------------------------------------------- 화면

export default function AlimtalkManagement() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [range, setRange] = useState<'7' | '30'>('7');
  const [copied, setCopied] = useState(false);
  const { toasts, pushToast } = useToasts();

  // 👤 회원 상세 드로어 / 📋 주문 상세 팝업
  const [drawerUserId, setDrawerUserId] = useState<number | null>(null);
  const [detailOrder, setDetailOrder] = useState<any | null>(null);
  const [openingOrderId, setOpeningOrderId] = useState<string | null>(null);
  const closeDrawer = useCallback(() => setDrawerUserId(null), []);
  const closeOrder = useCallback(() => setDetailOrder(null), []);
  const openOrder = useCallback(async (orderId: string) => {
    setOpeningOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/detail?orderId=${encodeURIComponent(orderId)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || '주문 정보를 불러오지 못했습니다.');
      setDetailOrder(toOrderDetailView(data.order));
    } catch (e: any) {
      pushToast('error', e?.message || '주문 정보를 불러오지 못했습니다.');
    } finally {
      setOpeningOrderId(null);
    }
  }, [pushToast]);

  const copyAccount = async () => {
    // 복사할 때는 숫자만 (은행 앱에 붙여넣기 편하도록)
    const ok = await copyText(SOLAPI_DEPOSIT_ACCOUNT.number.replace(/[^0-9]/g, ''));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      pushToast('success', `계좌번호를 복사했습니다. (${SOLAPI_DEPOSIT_ACCOUNT.bank} ${SOLAPI_DEPOSIT_ACCOUNT.number})`);
    } else {
      pushToast('error', '복사하지 못했습니다. 계좌번호를 직접 선택해 복사해 주세요.');
    }
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/alimtalk/summary', { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || '솔라피 현황을 불러오지 못했습니다.');
      setSummary(json.summary);
    } catch (e: any) {
      setLoadError(e?.message || '솔라피 현황을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { today, balance, quota, stats, groups, templates } = summary ?? ({} as Partial<Summary>);

  // 섹션별 오류 문구 (같은 문구는 한 번만)
  const errors = [today, balance, quota, stats, groups, templates]
    .filter((s): s is { ok: false; error: string } => !!s && !s.ok)
    .map(s => s.error)
    .filter((msg, i, arr) => arr.indexOf(msg) === i);
  if (loadError) errors.unshift(loadError);

  const failFoot = (msg: string) => <span title={msg}>조회 실패 · {msg}</span>;
  const usedPct = quota?.ok && quota.data.quota > 0 ? Math.min(100, Math.round((quota.data.used / quota.data.quota) * 100)) : 0;

  const rate7 = stats?.ok ? stats.data.successRate7 : null;
  const rateAlert = rate7 !== null && rate7 < SUCCESS_RATE_ALERT;

  const rejectedCount = templates?.ok ? templates.data.filter(t => t.status === 'REJECTED').length : 0;

  return (
    <div className="ap-page atk-page">
      <AdminHero
        eyebrow="KAKAO ALIMTALK"
        icon={<ChatCircleDots size={14} weight="bold" />}
        title="카카오톡 알림톡 관리"
        description="솔라피 계정의 발송 현황, 잔액, 발송 한도, 템플릿 검수 상태를 확인합니다."
        accentRgb="254, 229, 0"
        actions={
          <>
            <HeroButton onClick={load} disabled={isLoading}>
              <ArrowClockwise size={15} weight="bold" /> 새로고침
            </HeroButton>
            <a className="ap-hero-btn is-primary" href={SOLAPI_DASHBOARD_URL} target="_blank" rel="noopener noreferrer">
              솔라피 대시보드 바로가기 <ArrowSquareOut size={15} weight="bold" />
            </a>
          </>
        }
      >
        <div className="ap-kpis">
          <KpiCard
            icon={<PaperPlaneTilt size={18} weight="duotone" />}
            label="오늘 발송"
            toneRgb="165, 180, 252"
            loading={isLoading}
            value={today?.ok ? <>{n(today.data.total)}<small>건</small></> : '—'}
            foot={today?.ok
              ? <>성공 {n(today.data.success)} · 실패 {n(today.data.failed)} · 처리중 {n(today.data.pending)}</>
              : today && failFoot(today.error)}
          />
          <KpiCard
            icon={<Wallet size={18} weight="duotone" />}
            label="합산 잔액"
            toneRgb="253, 224, 71"
            loading={isLoading}
            value={balance?.ok ? <><span className="ap-cur">₩</span>{n(balance.data.total)}</> : '—'}
            foot={balance?.ok
              ? (
                <span title={`잔액 ₩${n(balance.data.balance)} · 예치금 ₩${n(balance.data.deposit)} · 포인트 ${n(balance.data.point)}P`}>
                  자동충전 {balance.data.autoRecharge ? 'ON' : 'OFF'}
                  {balance.data.monthUsed !== null && <> · 이번달 ₩{n(balance.data.monthUsed)} 사용</>}
                  {balance.data.deposit > 0 && <> · 예치금 ₩{n(balance.data.deposit)} 포함</>}
                </span>
              )
              : balance && failFoot(balance.error)}
          />
          <KpiCard
            icon={<Gauge size={18} weight="duotone" />}
            label="일일 한도"
            toneRgb="110, 231, 183"
            loading={isLoading}
            value={quota?.ok ? <>{n(quota.data.used)}<small>건 / {n(quota.data.quota)}건</small></> : '—'}
            foot={quota?.ok
              ? <>{n(quota.data.remaining)}건 남음 · {usedPct}% 사용</>
              : quota && failFoot(quota.error)}
          />
          {/* 솔라피 충전 전용 계좌 (이 계좌로 입금하면 솔라피 잔액이 충전됩니다) */}
          <div className="ap-kpi atk-account-kpi" style={{ ['--k-rgb' as string]: '253, 224, 71' } as CSSProperties}>
            <span className="ap-kpi-top">
              <span className="ap-kpi-icon" aria-hidden="true"><Bank size={18} weight="duotone" /></span>
              <span className="ap-kpi-label">충전 전용 계좌</span>
            </span>
            <span className="atk-account-row">
              <strong className="atk-account-number" translate="no">{SOLAPI_DEPOSIT_ACCOUNT.number}</strong>
              <button type="button" className={`atk-copy-btn ${copied ? 'is-done' : ''}`} onClick={copyAccount} aria-label="계좌번호 복사">
                {copied ? <><Check size={13} weight="bold" /> 복사됨</> : <><Copy size={13} weight="bold" /> 복사</>}
              </button>
            </span>
            <span className="ap-kpi-foot">{SOLAPI_DEPOSIT_ACCOUNT.bank} · 예금주 {SOLAPI_DEPOSIT_ACCOUNT.holder}</span>
          </div>
        </div>
      </AdminHero>

      {/* ===== 경고 ===== */}
      {(errors.length > 0 || rateAlert || rejectedCount > 0) && (
        <section className="ap-panel atk-alerts">
          {errors.length > 0 && (
            <div className="ap-help atk-help-warn">
              <WarningCircle size={15} weight="bold" />
              <span>
                솔라피 조회 중 오류가 있습니다: <strong>{errors.join(' / ')}</strong>
                {errors.some(e => e.includes('IP')) && (
                  <> — 솔라피 콘솔의 API 키 설정에서 허용 IP 에 이 서버의 IP 를 추가해야 조회됩니다. (운영 서버에서는 정상일 수 있습니다)</>
                )}
              </span>
            </div>
          )}
          {rateAlert && (
            <div className="ap-help atk-help-warn">
              <WarningCircle size={15} weight="bold" />
              <span>최근 7일 성공률이 <strong>{rate7!.toFixed(1)}%</strong> 로 {SUCCESS_RATE_ALERT}% 보다 낮습니다. 아래 발송 그룹의 실패 건과 수신번호를 확인해 주세요.</span>
            </div>
          )}
          {rejectedCount > 0 && (
            <div className="ap-help atk-help-warn">
              <WarningCircle size={15} weight="bold" />
              <span>반려된 알림톡 템플릿이 <strong>{rejectedCount}개</strong> 있습니다. 아래 템플릿 목록에서 검수 의견을 확인해 주세요.</span>
            </div>
          )}
        </section>
      )}

      {/* ===== 최근 발송 그룹 ===== */}
      <section className="ap-panel">
        <div className="ap-sec-head">
          <span className="ap-section-title"><Pulse size={16} weight="bold" /> 최근 발송 그룹</span>
          <span className="ap-section-hint">최근 30일 · 최신 10건</span>
        </div>
        <GroupTable section={groups} loading={isLoading} onOpenMember={setDrawerUserId} onOpenOrder={openOrder} openingOrderId={openingOrderId} />
      </section>

      {/* ===== 발송 추세 + 채널 구성 (솔라피 콘솔 대시보드와 비슷한 모양 — ./AlimtalkCharts.tsx) ===== */}
      <div className="atk-grid">
        <section className="ap-panel atk-chart-panel">
          <div className="ap-sec-head">
            <span className="atk-chart-title">
              발송 추세
              <span className="atk-info" title="그룹 발송 시각(KST) 기준으로 일별 성공·실패 건수를 셉니다. 삭제·발송요청 전·예약 그룹은 제외합니다."><Info size={15} /></span>
            </span>
            <SegFilter
              ariaLabel="기간"
              value={range}
              onChange={setRange}
              options={[{ value: '7', label: '7일' }, { value: '30', label: '30일' }]}
            />
          </div>
          {isLoading || !stats?.ok
            ? <SectionState loading={isLoading} section={stats} rows={5} />
            : <TrendChart data={stats.data.daily.slice(-Number(range))} footnote="그룹 발송 시각(KST) 기준 · 이통사 결과가 나오기 전 건은 처리중으로 남아 반영이 늦을 수 있어요" />}
        </section>

        <section className="ap-panel atk-chart-panel">
          <div className="ap-sec-head">
            <span className="atk-chart-title">
              채널 구성
              <span className="atk-info" title="실제로 과금된 메시지 종류 기준입니다. 알림톡 실패 후 문자로 대체 발송된 건은 SMS/LMS 로 셉니다."><Info size={15} /></span>
            </span>
            <span className="ap-section-hint">최근 {range}일</span>
          </div>
          {isLoading || !stats?.ok
            ? <SectionState loading={isLoading} section={stats} rows={4} />
            : <ChannelBreakdown channels={range === '7' ? stats.data.channels7 : stats.data.channels30} />}
        </section>
      </div>

      {/* ===== 템플릿 검수 상태 ===== */}
      <section className="ap-panel">
        <div className="ap-sec-head">
          <span className="ap-section-title"><ClipboardText size={16} weight="bold" /> 알림톡 템플릿 검수 상태</span>
          <span className="ap-section-hint">사이트에서 쓰는 템플릿은 표시가 붙습니다</span>
        </div>
        <TemplateTable section={templates} loading={isLoading} />
      </section>

      <div className="ap-help" style={{ margin: 0 }}>
        <Info size={15} weight="bold" />
        <span>
          오늘 발송과 한도 사용량은 <strong>오늘 0시(KST)</strong>부터 집계합니다. 솔라피의 하루 한도는 매일 오전 9시 무렵 초기화되므로 콘솔 수치와 조금 다를 수 있습니다.
          성공률은 이통사 결과가 나온 건(성공 + 실패)만으로 계산합니다.
          {summary?.fetchedAt && <> · 마지막 조회 {fmtDateTime(summary.fetchedAt)}</>}
        </span>
      </div>

      {drawerUserId !== null && (
        <MemberDrawer key={drawerUserId} userId={drawerUserId} onClose={closeDrawer} pushToast={pushToast} />
      )}
      {detailOrder && <OrderDetailModal order={detailOrder} onClose={closeOrder} pushToast={pushToast} />}

      <ToastStack toasts={toasts} />
    </div>
  );
}

// ---------------------------------------------------------------- 공통 조각

function SectionState({ loading, section, emptyText, rows = 3 }: {
  loading: boolean; section?: Section<unknown>; emptyText?: string; rows?: number;
}) {
  if (loading) {
    return <div className="atk-skel-list">{Array.from({ length: rows }).map((_, i) => <span key={i} className="ap-skel" />)}</div>;
  }
  if (section && !section.ok) return <div className="atk-empty is-error">조회 실패 · {section.error}</div>;
  return <div className="atk-empty">{emptyText}</div>;
}

// ---------------------------------------------------------------- 최근 발송 그룹

/** 사용자 관리와 같은 모양의 회원 표시: 프로필 이미지(없으면 이름 첫 글자) + 이름 + NEW + 아이디 */
function MemberBadge({ member, size = 32, sub }: { member: RecipientMember; size?: number; sub?: string }) {
  const [broken, setBroken] = useState(false);
  // 카카오 프로필 URL 이 http 로 오는 경우가 있어 https 로 맞춥니다 (사용자 관리와 같은 처리)
  const src = !broken && member.profileImage ? member.profileImage.replace(/^http:\/\//, 'https://') : null;
  return (
    <span className="atk-member">
      <span className="atk-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }} aria-hidden="true">
        {src ? <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} /> : (member.name || '?').slice(0, 1)}
      </span>
      <span className="atk-member-text">
        <span className="atk-member-name">
          <span className="atk-ellipsis">{member.name}</span>
          {member.isNew && <em className="atk-new">NEW</em>}
        </span>
        <span className="atk-member-id">{sub ?? member.loginId}</span>
      </span>
    </span>
  );
}

/** 그룹의 받는 사람: 회원 1명 → 이름·프로필 / 여러 명 → 첫 회원 + 외 N명 / 회원이 아니면 가린 번호 */
function RecipientCell({ group, onOpenMember }: { group: RecentGroup; onOpenMember: (userId: number) => void }) {
  const first = group.members[0];
  const others = Math.max(0, group.recipientCount - 1);
  if (first) {
    return (
      <span className="atk-recipient">
        <button type="button" className="atk-link-btn" onClick={() => onOpenMember(first.userId)} title="회원 상세 보기">
          <MemberBadge member={first} />
        </button>
        {others > 0 && <span className="atk-more" title={group.members.map(m => m.name).join(', ')}>외 {others}명</span>}
      </span>
    );
  }
  const phone = group.messages[0]?.to;
  if (phone) {
    return <span className="atk-nonmember">비회원<em>{phone}{others > 0 && ` 외 ${others}명`}</em></span>;
  }
  return <span className="atk-muted">-</span>;
}

function GroupTable({ section, loading, onOpenMember, onOpenOrder, openingOrderId }: {
  section?: Section<RecentGroup[]>;
  loading: boolean;
  onOpenMember: (userId: number) => void;
  onOpenOrder: (orderId: string) => void;
  openingOrderId: string | null;
}) {
  // 묶음 발송(주문 여러 개)은 "외 N건" 을 누르면 나머지 주문번호를 펼칩니다
  const [expanded, setExpanded] = useState<string | null>(null);
  if (loading || !section?.ok || section.data.length === 0) {
    return <SectionState loading={loading} section={section} emptyText="최근 30일 동안 발송한 그룹이 없어요" rows={5} />;
  }
  return (
    <div className="atk-table-wrap">
      <table className="atk-table">
        <thead>
          <tr>
            <th>회원</th>
            <th>주문번호</th>
            <th>보낸 템플릿</th>
            <th>채널</th>
            <th>발송 시각</th>
            <th>상태</th>
            <th className="is-num">전체</th>
            <th className="is-num">성공</th>
            <th className="is-num">실패</th>
            <th className="is-num">처리중</th>
          </tr>
        </thead>
        <tbody>
          {section.data.map(g => {
            const st = GROUP_STATUS[g.status] ?? { label: g.status || '-', rgb: '100, 116, 139' };
            return (
              <tr key={g.groupId} className={g.failed > 0 ? 'has-fail' : undefined}>
                  <td title={`그룹 ${g.groupId}`}>
                    <RecipientCell group={g} onOpenMember={onOpenMember} />
                  </td>
                  <td className="atk-order-cell">
                    {g.orderIds.length === 0
                      ? <span className="atk-muted">-</span>
                      : (
                        <span className="atk-order-ids">
                          {(expanded === g.groupId ? g.orderIds : g.orderIds.slice(0, 1)).map(id => (
                            <button key={id} type="button" className="atk-order-btn" onClick={() => onOpenOrder(id)}
                              disabled={openingOrderId === id} title="주문 상세 보기">
                              <code className="atk-id" translate="no">{id}</code>
                            </button>
                          ))}
                          {g.orderIds.length > 1 && (
                            <button type="button" className="atk-more atk-more-btn"
                              onClick={() => setExpanded(expanded === g.groupId ? null : g.groupId)}
                              title={g.orderIds.join(', ')}>
                              {expanded === g.groupId ? '접기' : `외 ${g.orderIds.length - 1}건`}
                            </button>
                          )}
                        </span>
                      )}
                  </td>
                  <td className="atk-tpl-cell">
                    {g.templates.length === 0
                      ? <span className="atk-muted">-</span>
                      : <>
                          <strong>{g.templates[0]}</strong>
                          {g.templates.length > 1 && <span className="atk-more" title={g.templates.join(', ')}>외 {g.templates.length - 1}개</span>}
                        </>}
                  </td>
                  <td className="atk-nowrap">{g.channels.length ? g.channels.join(' · ') : '-'}</td>
                  <td className="atk-muted">{g.dateCreated ? fmtDateTime(g.dateCreated) : '-'}</td>
                  <td><Badge rgb={st.rgb} dot>{st.label}</Badge></td>
                  <td className="is-num">{n(g.total)}</td>
                  <td className="is-num">{n(g.success)}</td>
                  <td className={`is-num ${g.failed > 0 ? 'atk-fail' : ''}`}>{n(g.failed)}</td>
                  <td className={`is-num ${g.pending > 0 ? 'atk-pending' : ''}`}>{n(g.pending)}</td>
                </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------- 템플릿 검수 상태

function TemplateTable({ section, loading }: { section?: Section<TemplateRow[]>; loading: boolean }) {
  if (loading || !section?.ok || section.data.length === 0) {
    return <SectionState loading={loading} section={section} emptyText="등록된 알림톡 템플릿이 없어요" rows={4} />;
  }
  return (
    <div className="atk-table-wrap">
      <table className="atk-table">
        <thead>
          <tr>
            <th>템플릿</th>
            <th>상태</th>
            <th>최근 검수 의견</th>
            <th>수정일</th>
          </tr>
        </thead>
        <tbody>
          {section.data.map(t => {
            const st = TEMPLATE_STATUS[t.status] ?? { label: t.status || '-', rgb: '100, 116, 139' };
            return (
              <tr key={t.templateId} className={t.status === 'REJECTED' ? 'has-fail' : undefined}>
                <td>
                  <div className="atk-tpl-name">
                    <strong>{t.name}</strong>
                    {t.usedBySite && <span className="atk-site-tag">사이트 사용 · {SITE_STATUS_LABEL[t.usedBySite] ?? t.usedBySite}</span>}
                  </div>
                  <code className="atk-id">{t.templateId}</code>
                </td>
                <td><Badge rgb={st.rgb} dot>{st.label}</Badge></td>
                <td className="atk-comment">{t.lastComment ?? <span className="atk-muted">-</span>}</td>
                <td className="atk-muted">{t.dateUpdated ? fmtDateTime(t.dateUpdated) : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
