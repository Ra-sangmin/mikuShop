"use client";

// 🗂️ 회원 상세 드로어 (기본 정보 · 등급 변경 · 머니 조정 · 최근 주문 · 머니 내역 · 배송지)
//   관리자 > 사용자 관리의 "관리" 버튼과 관리자 > 카카오톡 알림톡 관리의 회원 클릭이 같은 드로어를 씁니다.
//   스타일: app/admin/users/users-premium.css 의 usr-drawer* (드로어가 쓰는 색 변수는 .usr-drawer-root 에도 있습니다)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserBasicInfo, gradeTone, toneVars, type GradeToneValue } from './AdminPremiumKit';
import { ORDER_STATUS_LABEL } from '@/src/types/order';
import {
  X, Wallet, IdentificationCard, MapPin, Package, ClockCounterClockwise, Plus, Minus, Crown, Copy, ArrowRight,
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
  CART: '100, 116, 139', FAILED: '239, 68, 68', PAID: '59, 130, 246', ARRIVED: '99, 102, 241',
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
              <DrawerSection icon={<IdentificationCard size={15} weight="duotone" />} title="기본 정보">
                <UserBasicInfo user={user} onCopy={(_, label) => pushToast('success', `${label}을(를) 복사했습니다.`)} />
              </DrawerSection>

              {/* 등급 변경 */}
              <DrawerSection icon={<Crown size={15} weight="duotone" />} title="등급 변경">
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
              <DrawerSection icon={<Wallet size={15} weight="duotone" />} title="미쿠짱머니 조정">
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
              <DrawerSection icon={<Package size={15} weight="duotone" />} title="최근 주문"
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
              <DrawerSection icon={<ClockCounterClockwise size={15} weight="duotone" />} title="최근 머니 내역">
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

function DrawerSection({ icon, title, aside, children }: { icon: React.ReactNode; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
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
