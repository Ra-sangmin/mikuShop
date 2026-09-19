"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import '../admin-common.css';
import './users-premium.css';
import { useFitTable, FitColGroup, FitTh } from '../components/useFitTable';
// 🌟 기본 정보 패널은 주문 관리의 주문자 팝업과 같은 내용을 보여줘야 해서 공용 키트에 있습니다.
import { UserBasicInfo } from '../components/AdminPremiumKit';
import { ORDER_STATUS_LABEL } from '@/src/types/order';
import {
  MagnifyingGlass, X, Users, UserPlus, Receipt, Wallet, UserCircle, PencilSimple,
  ArrowClockwise, DownloadSimple, CaretLeft, CaretRight, EnvelopeSimple, Phone,
  IdentificationCard, MapPin, Package, ClockCounterClockwise, Plus, Minus, Crown,
  CheckCircle, WarningCircle, Copy, ArrowRight, Sparkle,
} from '@phosphor-icons/react';

/* ============================================================
   🎨 표시용 도우미
   ============================================================ */

// 등급 이름 → 색. (등급이 추가돼도 기본색으로 안전하게 표시됩니다)
const GRADE_TONE: { match: RegExp; text: string; rgb: string; from: string; to: string }[] = [
  { match: /diamond|다이아/i, text: '#0e7490', rgb: '6, 182, 212', from: '#67e8f9', to: '#0891b2' },
  { match: /platinum|플래티/i, text: '#4338ca', rgb: '79, 70, 229', from: '#a5b4fc', to: '#4f46e5' },
  { match: /gold|골드/i, text: '#b45309', rgb: '245, 158, 11', from: '#fcd34d', to: '#d97706' },
  { match: /silver|실버/i, text: '#475569', rgb: '100, 116, 139', from: '#cbd5e1', to: '#64748b' },
  { match: /bronze|브론즈/i, text: '#c2410c', rgb: '234, 88, 12', from: '#fdba74', to: '#ea580c' },
];
const DEFAULT_GRADE_TONE = { text: '#1d4ed8', rgb: '59, 130, 246', from: '#93c5fd', to: '#2563eb' };
type Tone = typeof DEFAULT_GRADE_TONE;
const gradeTone = (name?: string): Tone =>
  GRADE_TONE.find(tone => name && tone.match.test(name)) || DEFAULT_GRADE_TONE;

const toneVars = (tone: Tone) => ({
  ['--g-text' as any]: tone.text, ['--g-rgb' as any]: tone.rgb,
  ['--g-from' as any]: tone.from, ['--g-to' as any]: tone.to,
});

/** 이름의 첫 글자 (아바타용) */
const initialOf = (name?: string) => (name?.trim()?.[0] || '?').toUpperCase();

/** 가입 경로 — SNS 회원은 loginId 가 `kakao_...` / `naver_...` 로 저장됩니다. (lib/authOptions.ts) */
type Provider = 'kakao' | 'naver' | 'local';
const providerOf = (loginId?: string): Provider =>
  loginId?.startsWith('kakao_') ? 'kakao' : loginId?.startsWith('naver_') ? 'naver' : 'local';
const PROVIDER_LABEL: Record<Provider, string> = { kakao: '카카오', naver: '네이버', local: '일반' };

/** SNS 회원의 임시 이메일(kakao_xxx@mikuchan.local)은 표시하지 않습니다. */
const realEmail = (email?: string | null) => (email && !email.endsWith('.local') ? email : null);

const fmtDate = (d: string | Date) => {
  const x = new Date(d);
  return `${x.getFullYear()}.${String(x.getMonth() + 1).padStart(2, '0')}.${String(x.getDate()).padStart(2, '0')}`;
};
const fmtDateTime = (d: string | Date) => {
  const x = new Date(d);
  return `${fmtDate(x)} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
};
const won = (n: number) => `₩${(n || 0).toLocaleString()}`;
const daysSince = (d: string | Date) => Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000));


const STATUS_TONE: Record<string, string> = {
  BID_PENDING: '245, 158, 11', BIDDING: '245, 158, 11', BID_SUCCESS: '16, 185, 129',
  CART: '100, 116, 139', FAILED: '239, 68, 68', PAID: '59, 130, 246', ARRIVED: '99, 102, 241',
  PREPARING: '14, 165, 233', PAYMENT_REQ: '234, 88, 12', PAYMENT_DONE: '16, 185, 129', SHIPPING: '37, 99, 235',
};
const statusLabel = (s: string) => (ORDER_STATUS_LABEL as Record<string, string>)[s] || s;

/* ============================================================
   📋 표 설정
   ============================================================ */
const USER_COLUMNS = ['member', 'provider', 'contact', 'grade', 'orderCount', 'cyberMoney', 'createdAt', 'manage'] as const;
// 🌟 표 동작(가로 꽉 채움 · 연쇄 열 조절 · 관리 열 오른쪽 고정)은 공통 훅 useFitTable 이 담당합니다.
const MANAGE_MIN = 100; // 관리 버튼이 잘리지 않는 최소 폭
const USER_DEFAULT_WIDTHS = {
  member: 270,
  provider: 110,
  contact: 316,
  grade: 150,
  orderCount: 110,
  cyberMoney: 170,
  createdAt: 160,
  manage: 150,
};

type SortKey = 'recent' | 'oldest' | 'orders' | 'money' | 'name';
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: '최근 가입순' },
  { key: 'oldest', label: '오래된 가입순' },
  { key: 'orders', label: '주문 많은순' },
  { key: 'money', label: '머니 많은순' },
  { key: 'name', label: '이름순' },
];
const PAGE_SIZE = 20;

type Grade = { id: number; name: string; sortOrder?: number };
type Toast = { id: number; type: 'success' | 'error'; message: string };
type PushToast = (type: Toast['type'], message: string) => void;

/* ============================================================
   👤 회원 관리
   ============================================================ */
export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState<number | 'all'>('all');
  const [providerFilter, setProviderFilter] = useState<Provider | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [page, setPage] = useState(1);

  const [drawerUserId, setDrawerUserId] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 🌟 공통 표 훅 (app/admin/components/useFitTable.tsx)
  const table = useFitTable({
    storageKey: 'admin_users_column_widths_v3',
    columns: USER_COLUMNS,
    defaultWidths: USER_DEFAULT_WIDTHS,
    pinned: { key: 'manage', minWidth: MANAGE_MIN },
  });

  const pushToast = useCallback<PushToast>((type, message) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) setUsers(data.users);
      else pushToast('error', data.error || '회원 목록을 불러오지 못했습니다.');
    } catch (error) {
      console.error("사용자 목록 가져오기 실패:", error);
      pushToast('error', '회원 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    fetchUsers();
    fetch('/api/membership-grades')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setGrades([...data.grades].sort((a: Grade, b: Grade) => (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id)));
        }
      })
      .catch(error => console.error("등급 목록 가져오기 실패:", error));
  }, [fetchUsers]);

  // 필터가 바뀌면 첫 페이지로
  useEffect(() => { setPage(1); }, [searchTerm, gradeFilter, providerFilter, sortKey]);

  /* ---------- 집계 ---------- */
  const stats = useMemo(() => {
    const now = Date.now();
    const DAY = 86400000;
    const ageOf = (u: any) => now - new Date(u.createdAt).getTime();
    const newIn30 = users.filter(u => ageOf(u) <= 30 * DAY).length;
    const newPrev30 = users.filter(u => ageOf(u) > 30 * DAY && ageOf(u) <= 60 * DAY).length;
    const totalOrders = users.reduce((sum, u) => sum + (u._count?.orders || 0), 0);
    const activeUsers = users.filter(u => (u._count?.orders || 0) > 0).length;
    const totalMoney = users.reduce((sum, u) => sum + (u.cyberMoney || 0), 0);
    const moneyHolders = users.filter(u => (u.cyberMoney || 0) > 0).length;

    const byGrade = new Map<number, number>();
    const byProvider: Record<Provider, number> = { kakao: 0, naver: 0, local: 0 };
    users.forEach(u => {
      byGrade.set(u.membershipGrade, (byGrade.get(u.membershipGrade) || 0) + 1);
      byProvider[providerOf(u.loginId)]++;
    });
    return { newIn30, newPrev30, totalOrders, activeUsers, totalMoney, moneyHolders, byGrade, byProvider };
  }, [users]);

  /* ---------- 필터 · 정렬 · 페이지 ---------- */
  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    const list = users.filter(u => {
      if (gradeFilter !== 'all' && u.membershipGrade !== gradeFilter) return false;
      if (providerFilter !== 'all' && providerOf(u.loginId) !== providerFilter) return false;
      if (!q) return true;
      return (
        u.name?.toLowerCase().includes(q) ||
        u.loginId?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        (qDigits.length >= 3 && u.phone?.replace(/\D/g, '').includes(qDigits))
      );
    });
    const sorted = [...list];
    switch (sortKey) {
      case 'oldest': sorted.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)); break;
      case 'orders': sorted.sort((a, b) => (b._count?.orders || 0) - (a._count?.orders || 0)); break;
      case 'money': sorted.sort((a, b) => (b.cyberMoney || 0) - (a.cyberMoney || 0)); break;
      case 'name': sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko')); break;
      default: sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }
    return sorted;
  }, [users, searchTerm, gradeFilter, providerFilter, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasFilter = !!searchTerm || gradeFilter !== 'all' || providerFilter !== 'all';

  const resetFilters = () => { setSearchTerm(''); setGradeFilter('all'); setProviderFilter('all'); };

  /* ---------- CSV 내보내기 (현재 필터 결과) ---------- */
  const exportCsv = () => {
    const header = ['가입일', '아이디', '이름', '가입경로', '이메일', '휴대폰', '등급', '주문수', '미쿠짱머니'];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = filteredUsers.map(u => [
      fmtDate(u.createdAt), u.loginId, u.name, PROVIDER_LABEL[providerOf(u.loginId)],
      realEmail(u.email) || '', u.phone || '', u.grade?.name || '', u._count?.orders || 0, u.cyberMoney || 0,
    ].map(esc).join(','));
    const blob = new Blob(['﻿' + [header.map(esc).join(','), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mikushop_members_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('success', `${filteredUsers.length.toLocaleString()}명의 회원 정보를 내보냈습니다.`);
  };

  const closeDrawer = useCallback(() => setDrawerUserId(null), []);
  const onSaved = useCallback((updated: any) => {
    setUsers(prev => prev.map(u => (u.id === updated.id ? { ...u, ...updated, _count: u._count } : u)));
  }, []);

  const newDelta = stats.newIn30 - stats.newPrev30;
  const maxGradeCount = Math.max(1, ...Array.from(stats.byGrade.values()));

  return (
    <div className="usr-page">

      {/* ═════════ 히어로 ═════════ */}
      <section className="usr-hero">
        <div className="usr-hero-glow" aria-hidden="true" />
        <div className="usr-hero-head">
          <div>
            <span className="usr-eyebrow"><Sparkle size={11} weight="fill" /> MEMBERS</span>
            <h1 className="usr-hero-title">회원 관리</h1>
            <p className="usr-hero-sub">미쿠짱 회원의 등급과 미쿠짱머니, 주문 현황을 한곳에서 관리합니다.</p>
          </div>
          <div className="usr-hero-actions">
            <button type="button" className="usr-hero-btn" onClick={fetchUsers} disabled={isLoading}>
              <ArrowClockwise size={15} weight="bold" className={isLoading ? 'usr-spin' : ''} /> 새로고침
            </button>
            <button type="button" className="usr-hero-btn is-primary" onClick={exportCsv} disabled={isLoading || !filteredUsers.length}>
              <DownloadSimple size={15} weight="bold" /> CSV 내보내기
            </button>
          </div>
        </div>

        {/* KPI */}
        <div className="usr-kpis">
          <Kpi icon={<Users size={18} weight="duotone" />} label="전체 회원" loading={isLoading}
            value={<>{users.length.toLocaleString()}<small>명</small></>}
            foot={<>SNS {(stats.byProvider.kakao + stats.byProvider.naver).toLocaleString()} · 일반 {stats.byProvider.local.toLocaleString()}</>} />
          <Kpi icon={<UserPlus size={18} weight="duotone" />} label="최근 30일 신규" loading={isLoading}
            value={<>{stats.newIn30.toLocaleString()}<small>명</small></>}
            foot={<span className={newDelta > 0 ? 'is-up' : newDelta < 0 ? 'is-down' : ''}>
              직전 30일 대비 {newDelta > 0 ? '+' : ''}{newDelta.toLocaleString()}명
            </span>} />
          <Kpi icon={<Receipt size={18} weight="duotone" />} label="누적 주문" loading={isLoading}
            value={<>{stats.totalOrders.toLocaleString()}<small>건</small></>}
            foot={<>주문 회원 {stats.activeUsers.toLocaleString()}명
              {users.length > 0 && <> · {Math.round((stats.activeUsers / users.length) * 100)}%</>}</>} />
          <Kpi icon={<Wallet size={18} weight="duotone" />} label="보유 머니 합계" loading={isLoading}
            value={<><span className="usr-won">₩</span>{stats.totalMoney.toLocaleString()}</>}
            foot={<>잔액 보유 {stats.moneyHolders.toLocaleString()}명</>} />
        </div>
      </section>

      {/* ═════════ 등급 분포 ═════════ */}
      {grades.length > 0 && (
        <section className="usr-grades" aria-label="등급별 회원 분포">
          <div className="usr-sec-head">
            <span className="usr-section-title"><Crown size={15} weight="duotone" /> 등급 분포</span>
            <span className="usr-section-hint">카드를 누르면 해당 등급만 봅니다</span>
          </div>
          <div className="usr-grade-cards">
            {grades.map(g => {
              const count = stats.byGrade.get(g.id) || 0;
              const active = gradeFilter === g.id;
              return (
                <button key={g.id} type="button"
                  className={`usr-grade-card ${active ? 'is-active' : ''}`}
                  style={toneVars(gradeTone(g.name))}
                  onClick={() => setGradeFilter(active ? 'all' : g.id)}
                  aria-pressed={active}>
                  <span className="usr-grade-card-top">
                    <span className="usr-grade-gem" aria-hidden="true"><Crown size={12} weight="fill" /></span>
                    <span className="usr-grade-card-name">{g.name}</span>
                    <span className="usr-grade-card-pct">
                      {users.length ? `${((count / users.length) * 100).toFixed(1)}%` : '0%'}
                    </span>
                  </span>
                  <span className="usr-grade-card-count" translate="no">
                    {isLoading ? '–' : count.toLocaleString()}<small>명</small>
                  </span>
                  <span className="usr-grade-bar"><i style={{ width: `${(count / maxGradeCount) * 100}%` }} /></span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ═════════ 목록 ═════════ */}
      <section className="usr-panel">
        <div className="usr-toolbar">
          <div className="usr-toolbar-left">
            <span className="usr-field">
              <span className="usr-field-icon"><MagnifyingGlass size={15} weight="bold" /></span>
              <input
                type="text"
                placeholder="이름, 아이디, 이메일, 휴대폰 번호 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button type="button" className="usr-field-clear" onClick={() => setSearchTerm('')} aria-label="검색어 지우기">
                  <X size={11} weight="bold" />
                </button>
              )}
            </span>

            <div className="usr-seg" role="group" aria-label="가입 경로">
              {(['all', 'local', 'kakao', 'naver'] as const).map(p => (
                <button key={p} type="button"
                  className={`usr-seg-btn ${providerFilter === p ? 'is-active' : ''}`}
                  onClick={() => setProviderFilter(p)}>
                  {p !== 'all' && <i className={`usr-dot is-${p}`} />}
                  {p === 'all' ? '전체' : PROVIDER_LABEL[p]}
                  <em>{(p === 'all' ? users.length : stats.byProvider[p]).toLocaleString()}</em>
                </button>
              ))}
            </div>
          </div>

          <div className="usr-toolbar-right">
            <select className="usr-sort" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} aria-label="정렬">
              {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            <span className="usr-count">
              {hasFilter ? <>검색 결과 <b>{filteredUsers.length.toLocaleString()}</b>명</> : <>전체 <b>{users.length.toLocaleString()}</b>명</>}
            </span>
          </div>
        </div>

        {hasFilter && (
          <div className="usr-active-filters">
            {gradeFilter !== 'all' && (
              <span className="usr-chip">등급 · {grades.find(g => g.id === gradeFilter)?.name}
                <button type="button" onClick={() => setGradeFilter('all')} aria-label="등급 필터 해제"><X size={10} weight="bold" /></button></span>
            )}
            {providerFilter !== 'all' && (
              <span className="usr-chip">가입경로 · {PROVIDER_LABEL[providerFilter]}
                <button type="button" onClick={() => setProviderFilter('all')} aria-label="가입경로 필터 해제"><X size={10} weight="bold" /></button></span>
            )}
            {searchTerm && (
              <span className="usr-chip">“{searchTerm}”
                <button type="button" onClick={() => setSearchTerm('')} aria-label="검색어 지우기"><X size={10} weight="bold" /></button></span>
            )}
            <button type="button" className="usr-chip-reset" onClick={resetFilters}>모두 지우기</button>
          </div>
        )}

        <div className="usr-table-wrap" ref={table.wrapRef}>
          <table className={`admin-table-resizable ${table.tableClassName}`} style={table.tableStyle}>
            <FitColGroup table={table} />
            <thead>
              <tr className="admin-table-head-row">
                <FitTh table={table} columnKey="member">회원</FitTh>
                <FitTh table={table} columnKey="provider">가입경로</FitTh>
                <FitTh table={table} columnKey="contact">연락처</FitTh>
                <FitTh table={table} columnKey="grade">등급</FitTh>
                <FitTh table={table} columnKey="orderCount">주문수</FitTh>
                <FitTh table={table} columnKey="cyberMoney">미쿠짱머니</FitTh>
                <FitTh table={table} columnKey="createdAt">가입일</FitTh>
                <FitTh table={table} columnKey="manage">관리</FitTh>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="admin-table-body-row">
                    {USER_COLUMNS.map((c, j) => [
                      <td key={c} className={table.pinnedCellClass(c, 'usr-td')}>
                        {j === 0
                          ? <span className="usr-member"><span className="usr-skel is-avatar" /><span className="usr-skel" style={{ width: '60%' }} /></span>
                          : <span className="usr-skel" style={{ width: j === 2 ? '80%' : '60%' }} />}
                      </td>,
                    ])}
                  </tr>
                ))
              ) : pagedUsers.length > 0 ? pagedUsers.map((user) => {
                const tone = gradeTone(user.grade?.name);
                const provider = providerOf(user.loginId);
                const email = realEmail(user.email);
                const isNew = daysSince(user.createdAt) <= 7;
                return (
                  <tr key={user.id}
                    className={`admin-table-body-row usr-row aft-row ${drawerUserId === user.id ? 'is-open' : ''}`}
                    onClick={() => setDrawerUserId(user.id)}>
                    <td className="usr-td is-left">
                      <span className="usr-member">
                        <Avatar user={user} tone={tone} size={34} />
                        <span className="usr-member-text">
                          <span className="usr-member-name">
                            <span className="usr-ellipsis">{user.name}</span>
                            {isNew && <em className="usr-new">NEW</em>}
                          </span>
                          <span className="usr-member-id">{user.loginId}</span>
                        </span>
                      </span>
                    </td>
                    <td className="usr-td"><ProviderBadge provider={provider} /></td>
                    <td className="usr-td is-left">
                      <span className="usr-contact">
                        <span className={email ? '' : 'is-empty'}><EnvelopeSimple size={12} weight="bold" /><span className="usr-ellipsis">{email || '이메일 없음'}</span></span>
                        <span className={user.phone ? '' : 'is-empty'}><Phone size={12} weight="bold" /><span className="usr-ellipsis">{user.phone || '휴대폰 없음'}</span></span>
                      </span>
                    </td>
                    <td className="usr-td"><GradeBadge name={user.grade?.name} /></td>
                    <td className="usr-td is-right">
                      <span className={`usr-num ${!user._count?.orders ? 'is-zero' : ''}`} translate="no">
                        {(user._count?.orders || 0).toLocaleString()}<small>건</small>
                      </span>
                    </td>
                    <td className="usr-td is-right">
                      <span className={`usr-money ${!user.cyberMoney ? 'is-zero' : ''}`} translate="no">
                        <i>₩</i>{(user.cyberMoney || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="usr-td is-left">
                      <span className="usr-date">{fmtDate(user.createdAt)}</span>
                      <span className="usr-date-sub">{daysSince(user.createdAt).toLocaleString()}일째</span>
                    </td>
                    <td className={table.pinnedCellClass('manage', 'usr-td is-center')}>
                      <button type="button" className="usr-btn is-ghost"
                        onClick={(e) => { e.stopPropagation(); setDrawerUserId(user.id); }}>
                        <PencilSimple size={13} weight="bold" /> 관리
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={USER_COLUMNS.length}>
                    <div className="usr-empty">
                      <span className="usr-empty-icon"><UserCircle size={24} weight="duotone" /></span>
                      <strong>{hasFilter ? '조건에 맞는 회원이 없습니다' : '등록된 회원이 없습니다'}</strong>
                      <span>{hasFilter ? '검색어나 필터를 바꿔 보세요.' : '회원이 가입하면 이곳에 표시됩니다.'}</span>
                      {hasFilter && <button type="button" className="usr-btn is-ghost" onClick={resetFilters}>필터 초기화</button>}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {!isLoading && filteredUsers.length > PAGE_SIZE && (
          <div className="usr-pager">
            <span className="usr-pager-info">
              {((safePage - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(safePage * PAGE_SIZE, filteredUsers.length).toLocaleString()}
              <span> / {filteredUsers.length.toLocaleString()}명</span>
            </span>
            <div className="usr-pager-btns">
              <button type="button" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage <= 1} aria-label="이전 페이지">
                <CaretLeft size={13} weight="bold" />
              </button>
              {pageNumbers(safePage, pageCount).map((n, i) =>
                n === '…'
                  ? <span key={`gap-${i}`} className="usr-pager-gap">…</span>
                  : <button key={n} type="button" className={n === safePage ? 'is-active' : ''} onClick={() => setPage(n)}>{n}</button>
              )}
              <button type="button" onClick={() => setPage(Math.min(pageCount, safePage + 1))} disabled={safePage >= pageCount} aria-label="다음 페이지">
                <CaretRight size={13} weight="bold" />
              </button>
            </div>
          </div>
        )}
      </section>

      {drawerUserId !== null && (
        <MemberDrawer
          key={drawerUserId}
          userId={drawerUserId}
          grades={grades}
          onClose={closeDrawer}
          onSaved={onSaved}
          pushToast={pushToast}
        />
      )}

      {/* 토스트 */}
      <div className="usr-toasts" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`usr-toast is-${t.type}`}>
            {t.type === 'success' ? <CheckCircle size={17} weight="fill" /> : <WarningCircle size={17} weight="fill" />}
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   🧩 작은 컴포넌트
   ============================================================ */
function Kpi({ icon, label, value, foot, loading }: { icon: React.ReactNode; label: string; value: React.ReactNode; foot: React.ReactNode; loading: boolean }) {
  return (
    <div className="usr-kpi">
      <span className="usr-kpi-top">
        <span className="usr-kpi-icon" aria-hidden="true">{icon}</span>
        <span className="usr-kpi-label">{label}</span>
      </span>
      <strong className="usr-kpi-value" translate="no">{loading ? <span className="usr-skel is-dark" /> : value}</strong>
      <span className="usr-kpi-foot">{loading ? ' ' : foot}</span>
    </div>
  );
}

function Avatar({ user, tone, size }: { user: any; tone: Tone; size: number }) {
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

function ProviderBadge({ provider }: { provider: Provider }) {
  return <span className={`usr-provider is-${provider}`}><i className={`usr-dot is-${provider}`} />{PROVIDER_LABEL[provider]}</span>;
}

function GradeBadge({ name }: { name?: string }) {
  return (
    <span className="usr-grade" style={toneVars(gradeTone(name))}>
      <Crown size={11} weight="fill" />
      {name || '등급 없음'}
    </span>
  );
}

function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const sorted = [...new Set([1, total, current - 1, current, current + 1])]
    .filter(n => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('…');
    out.push(n);
  });
  return out;
}

/* ============================================================
   🗂️ 회원 상세 드로어
   ============================================================ */
function MemberDrawer({ userId, grades, onClose, onSaved, pushToast }: {
  userId: number;
  grades: Grade[];
  onClose: () => void;
  onSaved: (user: any) => void;
  pushToast: PushToast;
}) {
  const [detail, setDetail] = useState<any | null>(null);

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
      onSaved(updated);
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
      onSaved(updated);
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
