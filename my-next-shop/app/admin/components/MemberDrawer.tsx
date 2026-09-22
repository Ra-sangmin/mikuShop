"use client";

// 🗂️ 회원 상세 드로어 (기본 정보 · 등급 변경 · 머니 조정 · 최근 주문 · 머니 내역 · 배송지)
//   관리자 > 사용자 관리의 "관리" 버튼과 관리자 > 카카오톡 알림톡 관리의 회원 클릭이 같은 드로어를 씁니다.
//   스타일: app/admin/users/users-premium.css 의 usr-drawer* (드로어가 쓰는 색 변수는 .usr-drawer-root 에도 있습니다)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserBasicInfo, gradeTone, toneVars, type GradeToneValue } from './AdminPremiumKit';
import { ORDER_STATUS_LABEL } from '@/src/types/order';
import {
  CaretDown, X, Wallet, IdentificationCard, MapPin, Package, ClockCounterClockwise, Plus, Minus, Crown, Copy, ArrowRight,
  ChatCircleDots, PaperPlaneTilt, Warning,
} from '@phosphor-icons/react';
import '../users/users-premium.css';

export type Grade = { id: number; name: string; sortOrder?: number };
export type PushToast = (type: 'success' | 'error', message: string) => void;

/** 이름의 첫 글자 (아바타용) */
export const initialOf = (name?: string) => (name?.trim()?.[0] || '?').toUpperCase();

/** 가입 경로 — SNS 회원은 loginId 가 `kakao_...` / `naver_...` 로 저장됩니다. (lib/authOptions.ts) */
export type Provider = 'kakao' | 'naver' | 'local';
export const providerOf = (loginId?: string): Provider =>
  loginId?.startsWith('kakao_') ? 'kakao' : loginId?.startsWith('naver_') ? 'naver' : 'local';
export const PROVIDER_LABEL: Record<Provider, string> = { kakao: '카카오', naver: '네이버', local: '일반' };

/** SNS 회원의 임시 이메일(kakao_xxx@mikuchan.local)은 표시하지 않습니다. */
export const realEmail = (email?: string | null) => (email && !email.endsWith('.local') ? email : null);

export const fmtDate = (d: string | Date) => {
  const x = new Date(d);
  return `${x.getFullYear()}.${String(x.getMonth() + 1).padStart(2, '0')}.${String(x.getDate()).padStart(2, '0')}`;
};
export const fmtDateTime = (d: string | Date) => {
  const x = new Date(d);
  return `${fmtDate(x)} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
};
export const won = (n: number) => `₩${(n || 0).toLocaleString()}`;
export const daysSince = (d: string | Date) => Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000));


export const STATUS_TONE: Record<string, string> = {
  BID_PENDING: '245, 158, 11', BIDDING: '245, 158, 11', BID_SUCCESS: '16, 185, 129',
  CART: '100, 116, 139', FAILED: '239, 68, 68', PAID: '59, 130, 246', WAITING: '6, 182, 212', ARRIVED: '99, 102, 241',
  PREPARING: '14, 165, 233', PAYMENT_REQ: '234, 88, 12', PAYMENT_DONE: '16, 185, 129', SHIPPING: '37, 99, 235',
};
export const statusLabel = (s: string) => (ORDER_STATUS_LABEL as Record<string, string>)[s] || s;

export function Avatar({ user, tone, size }: { user: any; tone: GradeToneValue; size: number }) {
  const [broken, setBroken] = useState(false);
  // 카카오 프로필 URL 이 http 로 오는 경우가 있어 https 로 맞춥니다(혼합 콘텐츠 차단 방지).
  const src = !broken && user.profileImage ? String(user.profileImage).replace(/^http:\/\//, 'https://') : null;
  return (
    <span className="usr-avatar" style={{ ...toneVars(tone), width: size, height: size, fontSize: Math.round(size * 0.4) }} aria-hidden="true">
      {src
        ? <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
        : initialOf(user.name)}
    </span>
  );
}

export function ProviderBadge({ provider }: { provider: Provider }) {
  return <span className={`usr-provider is-${provider}`}><i className={`usr-dot is-${provider}`} />{PROVIDER_LABEL[provider]}</span>;
}

export function GradeBadge({ name }: { name?: string }) {
  return (
    <span className="usr-grade" style={toneVars(gradeTone(name))}>
      <Crown size={11} weight="fill" />
      {name || '등급 없음'}
    </span>
  );
}

/* ============================================================
   🗂️ 회원 상세 드로어
   ============================================================ */
export default function MemberDrawer({ userId, grades: gradesProp, onClose, onSaved, pushToast }: {
  userId: number;
  /** 등급 목록. 없으면 드로어가 직접 불러옵니다 (다른 화면에서 열 때) */
  grades?: Grade[];
  onClose: () => void;
  onSaved?: (user: any) => void;
  pushToast: PushToast;
}) {
  const [detail, setDetail] = useState<any | null>(null);
  const [loadedGrades, setLoadedGrades] = useState<Grade[]>([]);
  const grades = gradesProp ?? loadedGrades;
  useEffect(() => {
    if (gradesProp) return;
    fetch('/api/membership-grades')
      .then(res => res.json())
      .then(data => {
        if (data.success) setLoadedGrades([...data.grades].sort((a: Grade, b: Grade) => (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id)));
      })
      .catch(error => console.error('등급 목록 가져오기 실패:', error));
  }, [gradesProp]);

  // 등급
  const [gradeDraft, setGradeDraft] = useState<number | null>(null);
  const [savingGrade, setSavingGrade] = useState(false);

  // 💬 상담 요청 알림톡 (건당 비용이 들어 한 번 더 확인받고 보냅니다)
  const [confirmTalk, setConfirmTalk] = useState(false);
  const [sendingTalk, setSendingTalk] = useState(false);

  // 머니 조정
  const [moneyMode, setMoneyMode] = useState<'add' | 'sub'>('add');
  const [moneyAmount, setMoneyAmount] = useState(0);
  const [moneyReason, setMoneyReason] = useState('');
  const [confirmMoney, setConfirmMoney] = useState(false);
  const [savingMoney, setSavingMoney] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`);
      const data = await res.json();
      if (data.success) {
        setDetail(data);
        setGradeDraft(data.user.membershipGrade);
      } else {
        pushToast('error', data.error || '회원 정보를 불러오지 못했습니다.');
        onClose();
      }
    } catch {
      pushToast('error', '회원 정보를 불러오지 못했습니다.');
      onClose();
    }
  }, [userId, pushToast, onClose]);

  useEffect(() => { load(); }, [load]);

  /**
   * 💬 "안내 및 확인 요청" 알림톡을 이 회원에게 한 통 보냅니다.
   *    보낼 번호가 없으면 서버가 보내지 않고 이유를 돌려주므로, 화면에서도 미리 막아 둡니다.
   */
  const sendConsultTalk = async () => {
    setSendingTalk(true);
    try {
      const res = await fetch('/api/admin/users/alimtalk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        pushToast('success', `알림톡을 보냈습니다. (${data.phone})`);
        setConfirmTalk(false);
      } else {
        pushToast('error', data.error || '발송에 실패했습니다.');
      }
    } catch {
      pushToast('error', '발송 중 오류가 발생했습니다.');
    } finally {
      setSendingTalk(false);
    }
  };

  // ESC 로 닫기 + 배경 스크롤 잠금
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const user = detail?.user;
  const tone = gradeTone(user?.grade?.name);
  const delta = moneyMode === 'add' ? moneyAmount : -moneyAmount;
  const nextBalance = (user?.cyberMoney || 0) + delta;
  const moneyInvalid = moneyAmount === 0 || nextBalance < 0;

  const resetMoneyConfirm = () => setConfirmMoney(false);

  const patch = async (body: Record<string, any>) => {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...body }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || '수정에 실패했습니다.');
    return data.user;
  };

  const saveGrade = async () => {
    if (gradeDraft === null || gradeDraft === user.membershipGrade) return;
    setSavingGrade(true);
    try {
      const updated = await patch({ membershipGrade: gradeDraft });
      onSaved?.(updated);
      pushToast('success', `${user.name}님의 등급을 ${updated.grade?.name || ''}(으)로 변경했습니다.`);
      await load();
    } catch (e: any) {
      pushToast('error', e.message);
    } finally {
      setSavingGrade(false);
    }
  };

  const saveMoney = async () => {
    if (moneyInvalid) return;
    setSavingMoney(true);
    try {
      // 🔒 잔액을 통째로 덮어쓰지 않고 증감분(delta)만 보냅니다 → 그사이 회원의 사용 내역을 되돌리지 않습니다.
      const updated = await patch({ cyberMoneyDelta: delta, reason: moneyReason });
      onSaved?.(updated);
      pushToast('success', `${Math.abs(delta).toLocaleString()}원을 ${delta > 0 ? '지급' : '차감'}했습니다. (잔액 ${won(updated.cyberMoney)})`);
      setMoneyAmount(0); setMoneyReason(''); setConfirmMoney(false);
      await load();
    } catch (e: any) {
      pushToast('error', e.message);
    } finally {
      setSavingMoney(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text)
      .then(() => pushToast('success', `${label}을(를) 복사했습니다.`))
      .catch(() => {});
  };

  const statusEntries = Object.entries(detail?.statusCounts || {}) as [string, number][];

  return (
    <div className="usr-drawer-root" role="dialog" aria-modal="true" aria-label="회원 상세">
      <div className="usr-drawer-backdrop" onClick={onClose} />
      <div className="usr-drawer" ref={panelRef} tabIndex={-1}>
        <button type="button" className="usr-drawer-close" onClick={onClose} aria-label="닫기"><X size={16} weight="bold" /></button>

        {!user ? (
          <div className="usr-drawer-loading">
            <span className="usr-skel is-avatar-lg" />
            <span className="usr-skel" style={{ width: 140, height: 16 }} />
            <span className="usr-skel" style={{ width: 200 }} />
            <span className="usr-skel" style={{ width: '100%', height: 90, borderRadius: 14, marginTop: 20 }} />
            <span className="usr-skel" style={{ width: '100%', height: 140, borderRadius: 14 }} />
          </div>
        ) : (
          <>
            {/* 프로필 헤더 */}
            <header className="usr-drawer-hero" style={toneVars(tone)}>
              <Avatar user={user} tone={tone} size={64} />
              <div className="usr-drawer-id">
                <h2>{user.name}</h2>
                <button type="button" className="usr-copyable is-light" onClick={() => copy(user.loginId, '아이디')}>
                  {user.loginId} <Copy size={11} weight="bold" />
                </button>
                <div className="usr-drawer-badges">
                  <GradeBadge name={user.grade?.name} />
                  <ProviderBadge provider={providerOf(user.loginId)} />
                </div>
              </div>
            </header>

            <div className="usr-drawer-stats">
              <div><span>주문</span><strong>{(user._count?.orders || 0).toLocaleString()}<small>건</small></strong></div>
              <div><span>미쿠짱머니</span><strong>{won(user.cyberMoney)}</strong></div>
              <div><span>가입</span><strong>{daysSince(user.createdAt).toLocaleString()}<small>일째</small></strong></div>
            </div>

            <div className="usr-drawer-body">
              {/* 기본 정보 */}
              <DrawerSection icon={<IdentificationCard size={15} weight="duotone" />} title="기본 정보" collapseKey="basic" defaultOpen remember={false}>
                <UserBasicInfo user={user} onCopy={(_, label) => pushToast('success', `${label}을(를) 복사했습니다.`)} />
              </DrawerSection>

              {/* 💬 상담 요청 알림톡 */}
              <DrawerSection icon={<ChatCircleDots size={15} weight="duotone" />} title="상담 요청 알림톡" collapseKey="talk"
                aside={<span className="usr-section-hint">건당 과금 · 수동 발송</span>}>
                {(() => {
                  // 회원 전화번호 → 기본 배송지 → 아무 배송지 순. (서버의 pickPhone 과 같은 규칙)
                  const digits = (v: any) => String(v ?? '').replace(/[^0-9]/g, '');
                  const usable = (v: any) => {
                    const d = digits(v);
                    const local = d.startsWith('82') && d.length >= 11 ? `0${d.slice(2)}` : d;
                    return /^01[016789][0-9]{7,8}$/.test(local) ? local : null;
                  };
                  const addr = (user.addresses || []).find((a: any) => a.isDefault) ?? (user.addresses || [])[0];
                  const ownPhone = usable(user.phone);
                  const phone = ownPhone || usable(addr?.phone);
                  const phoneSource = ownPhone ? '회원 연락처' : '배송지 연락처';

                  if (!phone) {
                    return (
                      <div className="usr-talk-blocked">
                        <Warning size={15} weight="duotone" />
                        <span>
                          보낼 수 있는 휴대폰 번호가 없어 발송할 수 없습니다.
                          <em>회원 정보나 배송지에 번호를 먼저 등록해주세요.</em>
                        </span>
                      </div>
                    );
                  }

                  const masked = `${phone.slice(0, 3)}****${phone.slice(-4)}`;
                  return (
                    <div className={`usr-talk ${confirmTalk ? 'is-confirming' : ''}`}>
                      {/* 헤더: 템플릿 이름 + 받는 번호 */}
                      <div className="usr-talk-head">
                        <span className="usr-talk-logo" aria-hidden="true">
                          <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M12 3.5C6.75 3.5 2.5 6.86 2.5 11c0 2.64 1.75 4.96 4.4 6.3-.19.7-.7 2.56-.8 2.96-.13.5.18.49.38.36.16-.1 2.5-1.7 3.52-2.4.63.09 1.28.14 1.95.14 5.25 0 9.5-3.36 9.5-7.5s-4.19-7.36-9.45-7.36z" />
                          </svg>
                        </span>
                        <span className="usr-talk-titles">
                          <strong>안내 및 확인 요청</strong>
                          <span>카카오 알림톡 · 상담원 연결 버튼</span>
                        </span>
                        <span className="usr-talk-to">
                          <em>{phoneSource}</em>
                          <b translate="no">{masked}</b>
                        </span>
                      </div>

                      {/* 미리보기: 고객 카카오톡에 보이는 모습 */}
                      <div className="usr-talk-preview" aria-label="알림톡 미리보기">
                        <div className="usr-talk-bubble">
                          <span className="usr-talk-bubble-top">알림톡 도착</span>
                          <div className="usr-talk-bubble-body">
                            <strong>[미쿠짱] 안내 및 확인 요청</strong>
                            <p>{user.name || '고객'}님, 주문(또는 배송) 건과 관련하여 확인이 필요한 사항이 있어요. 아래 버튼으로 고객센터에 문의해 주세요.</p>
                            <span className="usr-talk-bubble-btn">상담원 연결 요청</span>
                          </div>
                        </div>
                      </div>

                      {/* 흐름 */}
                      <ol className="usr-talk-flow">
                        <li><i>1</i>알림톡 발송</li>
                        <li><i>2</i>고객이 버튼 누름</li>
                        <li><i>3</i>카카오톡 상담방 연결</li>
                      </ol>

                      {/* 발송 */}
                      {!confirmTalk ? (
                        <button type="button" className="usr-talk-btn" onClick={() => setConfirmTalk(true)}>
                          <PaperPlaneTilt size={15} weight="fill" /> 알림톡 상담 메시지 보내기
                        </button>
                      ) : (
                        <div className="usr-talk-confirm" role="alertdialog" aria-label="발송 확인">
                          <span className="usr-talk-confirm-text">
                            <Warning size={15} weight="fill" />
                            <span><b>{masked}</b> 로 지금 보냅니다.<em>건당 비용이 드니 한 번만 눌러주세요.</em></span>
                          </span>
                          <span className="usr-talk-confirm-actions">
                            <button type="button" className="usr-talk-cancel"
                              onClick={() => setConfirmTalk(false)} disabled={sendingTalk}>취소</button>
                            <button type="button" className="usr-talk-send"
                              onClick={sendConsultTalk} disabled={sendingTalk}>
                              <PaperPlaneTilt size={13} weight="fill" /> {sendingTalk ? '보내는 중…' : '보내기'}
                            </button>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </DrawerSection>

              {/* 등급 변경 */}
              <DrawerSection icon={<Crown size={15} weight="duotone" />} title="등급 변경" collapseKey="grade">
                <div className="usr-grade-picker">
                  {grades.map(g => (
                    <button key={g.id} type="button"
                      className={`usr-grade-option ${gradeDraft === g.id ? 'is-selected' : ''}`}
                      style={toneVars(gradeTone(g.name))}
                      onClick={() => setGradeDraft(g.id)}
                      aria-pressed={gradeDraft === g.id}>
                      <Crown size={13} weight="fill" />
                      {g.name}
                      {user.membershipGrade === g.id && <em>현재</em>}
                    </button>
                  ))}
                </div>
                <div className="usr-form-actions">
                  <button type="button" className="usr-btn is-save"
                    disabled={savingGrade || gradeDraft === user.membershipGrade}
                    onClick={saveGrade}>
                    {savingGrade ? '저장 중…' : '등급 저장'}
                  </button>
                </div>
              </DrawerSection>

              {/* 머니 조정 */}
              <DrawerSection icon={<Wallet size={15} weight="duotone" />} title="미쿠짱머니 조정" collapseKey="money">
                <div className="usr-money-form">
                  <div className="usr-seg is-block" role="group" aria-label="조정 방식">
                    <button type="button" className={`usr-seg-btn ${moneyMode === 'add' ? 'is-active is-add' : ''}`}
                      onClick={() => { setMoneyMode('add'); resetMoneyConfirm(); }}>
                      <Plus size={12} weight="bold" /> 지급
                    </button>
                    <button type="button" className={`usr-seg-btn ${moneyMode === 'sub' ? 'is-active is-sub' : ''}`}
                      onClick={() => { setMoneyMode('sub'); resetMoneyConfirm(); }}>
                      <Minus size={12} weight="bold" /> 차감
                    </button>
                  </div>
                  <label className="usr-money-input">
                    <span>₩</span>
                    <input inputMode="numeric" placeholder="0" aria-label="조정 금액"
                      value={moneyAmount ? moneyAmount.toLocaleString() : ''}
                      onChange={(e) => {
                        const n = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                        setMoneyAmount(Math.min(n, 100_000_000));
                        resetMoneyConfirm();
                      }} />
                  </label>
                  <div className="usr-quick">
                    {[1000, 5000, 10000, 50000].map(v => (
                      <button key={v} type="button" onClick={() => { setMoneyAmount(a => a + v); resetMoneyConfirm(); }}>
                        +{v.toLocaleString()}
                      </button>
                    ))}
                    {moneyAmount > 0 && (
                      <button type="button" className="is-clear" onClick={() => { setMoneyAmount(0); resetMoneyConfirm(); }}>초기화</button>
                    )}
                  </div>
                  <input className="usr-input" placeholder="조정 사유 (예: 배송비 환급, 이벤트 지급)"
                    maxLength={100} value={moneyReason} onChange={(e) => setMoneyReason(e.target.value)} />
                  <p className="usr-form-hint">사유와 처리한 관리자는 회원의 머니 내역에 함께 기록됩니다.</p>

                  <div className={`usr-preview ${nextBalance < 0 ? 'is-error' : ''}`}>
                    <span>{won(user.cyberMoney)}</span>
                    <ArrowRight size={13} weight="bold" />
                    <strong>{nextBalance < 0 ? `-₩${Math.abs(nextBalance).toLocaleString()}` : won(nextBalance)}</strong>
                    {moneyAmount > 0 && <em className={delta > 0 ? 'is-up' : 'is-down'}>{delta > 0 ? '+' : '−'}{moneyAmount.toLocaleString()}</em>}
                  </div>
                  {nextBalance < 0 && <p className="usr-form-error">현재 잔액보다 많이 차감할 수 없습니다.</p>}

                  <div className="usr-form-actions">
                    {confirmMoney ? (
                      <>
                        <span className="usr-confirm-text">{moneyAmount.toLocaleString()}원을 {delta > 0 ? '지급' : '차감'}할까요?</span>
                        <button type="button" className="usr-btn is-ghost" onClick={resetMoneyConfirm}>취소</button>
                        <button type="button" className={`usr-btn ${delta > 0 ? 'is-save' : 'is-danger'}`} disabled={savingMoney} onClick={saveMoney}>
                          {savingMoney ? '처리 중…' : '확인'}
                        </button>
                      </>
                    ) : (
                      <button type="button" className={`usr-btn ${moneyMode === 'add' ? 'is-save' : 'is-danger'}`} disabled={moneyInvalid} onClick={() => setConfirmMoney(true)}>
                        {moneyMode === 'add' ? '지급하기' : '차감하기'}
                      </button>
                    )}
                  </div>
                </div>
              </DrawerSection>

              {/* 최근 주문 */}
              <DrawerSection icon={<Package size={15} weight="duotone" />} title="최근 주문" collapseKey="orders"
                aside={<span className="usr-section-hint">전체 {(user._count?.orders || 0).toLocaleString()}건</span>}>
                {statusEntries.length > 0 && (
                  <div className="usr-status-chips">
                    {statusEntries.map(([s, n]) => (
                      <span key={s} className="usr-status" style={{ ['--s-rgb' as any]: STATUS_TONE[s] || '100, 116, 139' }}>
                        {statusLabel(s)}<b>{n}</b>
                      </span>
                    ))}
                  </div>
                )}
                {detail.recentOrders.length ? (
                  <ul className="usr-orders">
                    {detail.recentOrders.map((o: any) => (
                      <li key={o.id}>
                        <span className="usr-order-thumb">
                          {o.productImageUrl ? <img src={o.productImageUrl} alt="" referrerPolicy="no-referrer" /> : <Package size={16} weight="duotone" />}
                        </span>
                        <span className="usr-order-main">
                          <span className="usr-order-name" title={o.productName}>{o.productName}</span>
                          <span className="usr-order-meta">
                            <code>{o.orderId}</code> · {o.type === 'DELIVERY' ? '배송대행' : '구매대행'} · {fmtDateTime(o.registeredAt)}
                          </span>
                        </span>
                        <span className="usr-status is-sm" style={{ ['--s-rgb' as any]: STATUS_TONE[o.status] || '100, 116, 139' }}>
                          {statusLabel(o.status)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="usr-muted-box">아직 주문이 없습니다.</p>}
              </DrawerSection>

              {/* 머니 내역 */}
              <DrawerSection icon={<ClockCounterClockwise size={15} weight="duotone" />} title="최근 머니 내역" collapseKey="moneyLogs">
                {detail.recentMoneyLogs.length ? (
                  <ul className="usr-ledger">
                    {detail.recentMoneyLogs.map((l: any) => (
                      <li key={l.id}>
                        <span className={`usr-ledger-dot ${l.amount >= 0 ? 'is-up' : 'is-down'}`}>
                          {l.amount >= 0 ? <Plus size={10} weight="bold" /> : <Minus size={10} weight="bold" />}
                        </span>
                        <span className="usr-ledger-main">
                          <span className="usr-ledger-content" title={l.content}>{l.content}</span>
                          <span className="usr-ledger-date">{fmtDateTime(l.createdAt)}</span>
                        </span>
                        <span className="usr-ledger-amt">
                          <strong className={l.amount >= 0 ? 'is-up' : 'is-down'}>{l.amount >= 0 ? '+' : '−'}{Math.abs(l.amount).toLocaleString()}</strong>
                          <small>잔액 {l.balanceAfter.toLocaleString()}</small>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="usr-muted-box">머니 사용 내역이 없습니다.</p>}
              </DrawerSection>

              {/* 배송지 */}
              <DrawerSection icon={<MapPin size={15} weight="duotone" />} title="배송지"
                aside={<span className="usr-section-hint">{user.addresses.length}곳</span>}>
                {user.addresses.length ? (
                  <ul className="usr-addresses">
                    {user.addresses.map((a: any) => (
                      <li key={a.id} className={a.isDefault ? 'is-default' : ''}>
                        <div className="usr-address-head">
                          <strong>{a.recipientName}</strong>
                          {a.recipientEnglishName && <span>{a.recipientEnglishName}</span>}
                          {a.isDefault && <em>기본</em>}
                        </div>
                        <p>({a.zipCode}) {a.address} {a.detailAddress}</p>
                        <span className="usr-address-phone">{a.phone}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="usr-muted-box">등록된 배송지가 없습니다.</p>}
              </DrawerSection>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** 패널 접힘 상태를 기억하는 곳 (이 브라우저에만 저장 — 관리자마다 편한 대로) */
const SECTION_STORE_KEY = 'admin_member_drawer_sections_v1';
function readSectionState(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(SECTION_STORE_KEY) || '{}') || {}; } catch { return {}; }
}
function writeSectionState(key: string, open: boolean) {
  try { localStorage.setItem(SECTION_STORE_KEY, JSON.stringify({ ...readSectionState(), [key]: open })); } catch { /* 저장 불가 환경은 무시 */ }
}

/**
 * 드로어 패널.
 * collapseKey 를 주면 제목을 눌러 펼치고 접을 수 있습니다. (평소엔 기본 정보만 펼쳐 둠)
 * 접어도 내용은 그대로 두고 숨기기만 해서, 입력 중이던 값(머니 금액 등)이 사라지지 않습니다.
 */
function DrawerSection({ icon, title, aside, children, collapseKey, defaultOpen = false, remember = true }: {
  icon: React.ReactNode; title: string; aside?: React.ReactNode; children: React.ReactNode;
  collapseKey?: string; defaultOpen?: boolean;
  /** false 면 접은 상태를 기억하지 않고 팝업을 열 때마다 defaultOpen 으로 시작합니다 (기본 정보는 항상 펼친 채로) */
  remember?: boolean;
}) {
  const [open, setOpen] = useState(() => {
    if (!collapseKey) return true;
    const saved = remember && typeof window !== 'undefined' ? readSectionState()[collapseKey] : undefined;
    return saved ?? defaultOpen;
  });
  const bodyId = `usr-dsec-${collapseKey ?? title}`;

  if (!collapseKey) {
    return (
      <section className="usr-dsec">
        <div className="usr-sec-head">
          <span className="usr-section-title">{icon}{title}</span>
          {aside}
        </div>
        {children}
      </section>
    );
  }

  const toggle = () => setOpen(v => { if (remember) writeSectionState(collapseKey, !v); return !v; });
  return (
    <section className={`usr-dsec is-collapsible ${open ? 'is-open' : 'is-closed'}`}>
      <button type="button" className="usr-sec-head usr-sec-toggle" onClick={toggle} aria-expanded={open} aria-controls={bodyId}>
        <span className="usr-section-title">{icon}{title}</span>
        <span className="usr-sec-toggle-right">
          {aside}
          <span className="usr-sec-caret" aria-hidden="true"><CaretDown size={13} weight="bold" /></span>
        </span>
      </button>
      <div className="usr-dsec-body" id={bodyId} aria-hidden={!open} inert={!open ? true : undefined}>
        <div className="usr-dsec-inner">{children}</div>
      </div>
    </section>
  );
}
