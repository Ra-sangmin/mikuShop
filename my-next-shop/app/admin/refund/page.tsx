"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import '../admin-common.css';
import { useFitTable, FitColGroup, FitTh } from '../components/useFitTable';
import {
  AdminHero, HeroButton, KpiCard, SearchField, SegFilter, Badge, EmptyRow, SkeletonRows,
  useToasts, ToastStack, fmtDateTime,
} from '../components/AdminPremiumKit';
import {
  ArrowClockwise, HourglassMedium, ArrowCircleDown, ArrowCircleUp, CheckCircle,
  Check, X, Bank, Sparkle, Wallet,
} from '@phosphor-icons/react';

/* ============================================================
   💸 머니 신청 관리 — 충전(무통장 입금) / 환불 신청 승인·반려
   ============================================================ */

type ReqType = 'CHARGE' | 'REFUND';
type ReqStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type MoneyRequest = {
  id: number;
  type: ReqType;
  status: ReqStatus;
  amount: number;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
  content?: string | null;
  adminNote?: string | null;
  createdAt: string;
  processedAt?: string | null;
  user?: { name?: string | null; email?: string | null } | null;
};

const TYPE_META: Record<ReqType, { label: string; rgb: string }> = {
  CHARGE: { label: '충전', rgb: '37, 99, 235' },
  REFUND: { label: '환불', rgb: '225, 29, 72' },
};
const STATUS_META: Record<ReqStatus, { label: string; rgb: string }> = {
  PENDING: { label: '대기중', rgb: '217, 119, 6' },
  APPROVED: { label: '승인완료', rgb: '22, 163, 74' },
  REJECTED: { label: '반려됨', rgb: '100, 116, 139' },
};

const COLUMNS = ['createdAt', 'type', 'user', 'amount', 'detail', 'status', 'manage'] as const;
const DEFAULT_WIDTHS = {
  createdAt: 170,
  type: 90,
  user: 230,
  amount: 140,
  detail: 330,
  status: 120,
  manage: 220,
};

type TypeFilter = 'all' | ReqType;
type StatusFilter = 'all' | ReqStatus;

export default function MoneyRequestManagement() {
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');

  // 승인/반려 확인 단계
  const [confirming, setConfirming] = useState<{ id: number; action: 'APPROVED' | 'REJECTED' } | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const { toasts, pushToast } = useToasts();

  // 🌟 공통 표 (가로 꽉 채움 · 연쇄 열 조절 · 관리 열 오른쪽 고정)
  const table = useFitTable({
    storageKey: 'admin_refund_column_widths_v2',
    columns: COLUMNS,
    defaultWidths: DEFAULT_WIDTHS,
    pinned: { key: 'manage', minWidth: 170 },
  });

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      // 🔒 관리자 여부는 서버가 서명된 세션 쿠키로 판단합니다. (예전의 adminId 쿼리는 쓰지 않음)
      const res = await fetch('/api/money/request');
      const data = await res.json();
      if (data.success) setRequests(data.requests);
      else pushToast('error', data.error || '신청 내역을 불러오지 못했습니다.');
    } catch (error) {
      console.error("데이터 가져오기 실패:", error);
      pushToast('error', '신청 내역을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleProcess = async (req: MoneyRequest, status: 'APPROVED' | 'REJECTED') => {
    const actionText = status === 'APPROVED' ? '승인' : '반려';
    setProcessingId(req.id);
    try {
      const res = await fetch('/api/money/approve', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: req.id,
          status,
          ...(status === 'REJECTED' && rejectNote.trim() ? { adminNote: rejectNote.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        pushToast('success', `${req.user?.name || '회원'}님의 ${TYPE_META[req.type].label} ${req.amount.toLocaleString()}원을 ${actionText}했습니다.`);
        setConfirming(null);
        setRejectNote('');
        fetchRequests();
      } else {
        pushToast('error', data.error ? `${actionText} 실패: ${data.error}` : `${actionText} 처리에 실패했습니다.`);
      }
    } catch {
      pushToast('error', '서버 통신 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  /* ---------- 집계 ---------- */
  const stats = useMemo(() => {
    const pending = requests.filter(r => r.status === 'PENDING');
    const sumOf = (list: MoneyRequest[]) => list.reduce((s, r) => s + (r.amount || 0), 0);
    const today = new Date().toDateString();
    return {
      pendingCount: pending.length,
      pendingCharge: pending.filter(r => r.type === 'CHARGE'),
      pendingRefund: pending.filter(r => r.type === 'REFUND'),
      processedCount: requests.filter(r => r.status !== 'PENDING').length,
      processedToday: requests.filter(r => r.status !== 'PENDING' && r.processedAt && new Date(r.processedAt).toDateString() === today).length,
      oldestPending: pending.reduce<string | null>((min, r) => (!min || r.createdAt < min ? r.createdAt : min), null),
      sumOf,
    };
  }, [requests]);

  const statusCounts = useMemo(() => ({
    all: requests.length,
    PENDING: requests.filter(r => r.status === 'PENDING').length,
    APPROVED: requests.filter(r => r.status === 'APPROVED').length,
    REJECTED: requests.filter(r => r.status === 'REJECTED').length,
  }), [requests]);

  /* ---------- 필터 ---------- */
  const rendered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return requests
      .filter(r => {
        if (typeFilter !== 'all' && r.type !== typeFilter) return false;
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (!q) return true;
        return (
          r.user?.name?.toLowerCase().includes(q) ||
          r.user?.email?.toLowerCase().includes(q) ||
          r.content?.toLowerCase().includes(q) ||
          r.accountHolder?.toLowerCase().includes(q) ||
          String(r.amount).includes(q.replace(/\D/g, '') || '∅')
        );
      })
      // 대기 중인 신청을 항상 위로
      .sort((a, b) => (a.status === 'PENDING' ? 0 : 1) - (b.status === 'PENDING' ? 0 : 1) || +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [requests, typeFilter, statusFilter, searchTerm]);

  const waitingHours = stats.oldestPending ? Math.floor((Date.now() - new Date(stats.oldestPending).getTime()) / 3600000) : 0;

  return (
    <div className="ap-page">
      <AdminHero
        eyebrow="MONEY REQUESTS" icon={<Sparkle size={11} weight="fill" />}
        title="머니 신청 관리"
        description="회원의 미쿠짱머니 충전(무통장 입금)과 환불 신청을 확인하고 승인·반려합니다."
        accentRgb="245, 158, 11"
        actions={
          <HeroButton onClick={fetchRequests} disabled={isLoading}>
            <ArrowClockwise size={15} weight="bold" className={isLoading ? 'ap-spin' : ''} /> 새로고침
          </HeroButton>
        }
      >
        <div className="ap-kpis">
          <KpiCard icon={<HourglassMedium size={18} weight="duotone" />} label="처리 대기" toneRgb="252, 211, 77" loading={isLoading}
            value={<>{stats.pendingCount.toLocaleString()}<small>건</small></>}
            foot={stats.pendingCount > 0
              ? <span className={waitingHours >= 24 ? 'is-warn' : ''}>가장 오래된 신청 {waitingHours < 1 ? '1시간 이내' : `${waitingHours.toLocaleString()}시간 전`}</span>
              : '대기 중인 신청이 없습니다'}
            active={statusFilter === 'PENDING' && typeFilter === 'all'}
            onClick={() => { setStatusFilter('PENDING'); setTypeFilter('all'); }} />
          <KpiCard icon={<ArrowCircleDown size={18} weight="duotone" />} label="대기 중 충전 금액" toneRgb="147, 197, 253" loading={isLoading}
            value={<><span className="ap-cur">₩</span>{stats.sumOf(stats.pendingCharge).toLocaleString()}</>}
            foot={`${stats.pendingCharge.length.toLocaleString()}건 · 입금 확인 후 승인`}
            active={statusFilter === 'PENDING' && typeFilter === 'CHARGE'}
            onClick={() => { setStatusFilter('PENDING'); setTypeFilter('CHARGE'); }} />
          <KpiCard icon={<ArrowCircleUp size={18} weight="duotone" />} label="대기 중 환불 금액" toneRgb="253, 164, 175" loading={isLoading}
            value={<><span className="ap-cur">₩</span>{stats.sumOf(stats.pendingRefund).toLocaleString()}</>}
            foot={`${stats.pendingRefund.length.toLocaleString()}건 · 송금 후 승인`}
            active={statusFilter === 'PENDING' && typeFilter === 'REFUND'}
            onClick={() => { setStatusFilter('PENDING'); setTypeFilter('REFUND'); }} />
          <KpiCard icon={<CheckCircle size={18} weight="duotone" />} label="처리 완료" toneRgb="110, 231, 183" loading={isLoading}
            value={<>{stats.processedCount.toLocaleString()}<small>건</small></>}
            foot={`오늘 처리 ${stats.processedToday.toLocaleString()}건`}
            active={statusFilter === 'all' && typeFilter === 'all'}
            onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }} />
        </div>
      </AdminHero>

      <section className="ap-panel">
        <div className="ap-toolbar">
          <div className="ap-toolbar-left">
            <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="신청자, 이메일, 입금자·예금주, 금액 검색" />
            <SegFilter<StatusFilter>
              ariaLabel="처리 상태"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'PENDING', label: '대기중', count: statusCounts.PENDING, dotRgb: STATUS_META.PENDING.rgb },
                { value: 'APPROVED', label: '승인완료', count: statusCounts.APPROVED, dotRgb: STATUS_META.APPROVED.rgb },
                { value: 'REJECTED', label: '반려됨', count: statusCounts.REJECTED, dotRgb: STATUS_META.REJECTED.rgb },
                { value: 'all', label: '전체', count: statusCounts.all },
              ]}
            />
            <SegFilter<TypeFilter>
              ariaLabel="구분"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'all', label: '충전·환불' },
                { value: 'CHARGE', label: '충전', dotRgb: TYPE_META.CHARGE.rgb },
                { value: 'REFUND', label: '환불', dotRgb: TYPE_META.REFUND.rgb },
              ]}
            />
          </div>
          <div className="ap-toolbar-right">
            <span className="ap-count">표시 <b>{rendered.length.toLocaleString()}</b>건</span>
          </div>
        </div>

        <div className="ap-table-wrap" ref={table.wrapRef}>
          <table className={`admin-table-resizable ${table.tableClassName}`} style={table.tableStyle}>
            <FitColGroup table={table} />
            <thead>
              <tr className="admin-table-head-row">
                <FitTh table={table} columnKey="createdAt">신청 일시</FitTh>
                <FitTh table={table} columnKey="type">구분</FitTh>
                <FitTh table={table} columnKey="user">신청자</FitTh>
                <FitTh table={table} columnKey="amount">금액</FitTh>
                <FitTh table={table} columnKey="detail">상세 정보 (입금자 / 환불 계좌)</FitTh>
                <FitTh table={table} columnKey="status">상태</FitTh>
                <FitTh table={table} columnKey="manage">관리</FitTh>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={COLUMNS} pinnedKey="manage" />
              ) : rendered.length === 0 ? (
                <EmptyRow colSpan={COLUMNS.length} icon={<Wallet size={24} weight="duotone" />}
                  title={statusFilter === 'PENDING' && !searchTerm ? '대기 중인 신청이 없습니다' : '조건에 맞는 신청이 없습니다'}
                  description={statusFilter === 'PENDING' && !searchTerm ? '새 충전·환불 신청이 들어오면 이곳에 표시됩니다.' : '검색어나 필터를 바꿔 보세요.'} />
              ) : rendered.map(req => {
                const type = TYPE_META[req.type];
                const status = STATUS_META[req.status];
                const isConfirming = confirming?.id === req.id;
                const busy = processingId === req.id;
                return (
                  <tr key={req.id} className={`admin-table-body-row aft-row ${req.status !== 'PENDING' ? 'is-muted' : ''}`}>
                    <td className="ap-td">
                      <span className="ap-strong ap-tabnum">{fmtDateTime(req.createdAt)}</span>
                      {req.processedAt && <span className="ap-sub">처리 {fmtDateTime(req.processedAt)}</span>}
                    </td>
                    <td className="ap-td"><Badge rgb={type.rgb}>{type.label}</Badge></td>
                    <td className="ap-td is-left">
                      <span className="ap-person">
                        <span className="ap-avatar" aria-hidden="true">{(req.user?.name?.trim()?.[0] || '?').toUpperCase()}</span>
                        <span className="ap-person-text">
                          <span className="ap-strong">{req.user?.name || '알 수 없음'}</span>
                          <span className="ap-sub" style={{ marginTop: 0 }}>{req.user?.email && !req.user.email.endsWith('.local') ? req.user.email : '이메일 없음'}</span>
                        </span>
                      </span>
                    </td>
                    <td className="ap-td is-right">
                      <span className="ap-money" style={{ color: req.type === 'REFUND' ? 'var(--ap-down)' : undefined }}>
                        <i>₩</i>{req.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="ap-td is-left">
                      {req.type === 'CHARGE' ? (
                        <span className="ap-strong" title={req.content || ''}>입금자 · {req.content || <span className="ap-empty-mark">미입력</span>}</span>
                      ) : (
                        <span className="ap-person" title={`${req.bankName || ''} ${req.accountNumber || ''} (${req.accountHolder || ''})`}>
                          <Bank size={15} weight="duotone" style={{ color: '#94a3b8', flexShrink: 0 }} />
                          <span className="ap-person-text">
                            <span className="ap-strong">{req.bankName || '은행 미입력'} <span className="ap-mono">{req.accountNumber}</span></span>
                            <span className="ap-sub" style={{ marginTop: 0 }}>예금주 {req.accountHolder || '-'}</span>
                          </span>
                        </span>
                      )}
                      {req.status === 'REJECTED' && req.adminNote && <span className="ap-sub">반려 사유 · {req.adminNote}</span>}
                    </td>
                    <td className="ap-td"><Badge rgb={status.rgb} dot>{status.label}</Badge></td>
                    <td className={table.pinnedCellClass('manage', 'ap-td')}>
                      {req.status !== 'PENDING' ? (
                        <span className="ap-empty-mark">처리됨</span>
                      ) : isConfirming && confirming.action === 'APPROVED' ? (
                        <span className="ap-confirm">
                          <button type="button" className="ap-btn is-ghost" onClick={() => setConfirming(null)} disabled={busy}>취소</button>
                          <button type="button" className="ap-btn is-success" onClick={() => handleProcess(req, 'APPROVED')} disabled={busy}>
                            <Check size={13} weight="bold" /> {busy ? '처리 중…' : '승인 확정'}
                          </button>
                        </span>
                      ) : isConfirming && confirming.action === 'REJECTED' ? (
                        <span className="ap-confirm">
                          <input className="ap-confirm-input" placeholder="반려 사유 (선택)" maxLength={100} autoFocus
                            value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleProcess(req, 'REJECTED'); if (e.key === 'Escape') setConfirming(null); }} />
                          <button type="button" className="ap-btn is-ghost" onClick={() => setConfirming(null)} disabled={busy} aria-label="취소"><X size={12} weight="bold" /></button>
                          <button type="button" className="ap-btn is-danger" onClick={() => handleProcess(req, 'REJECTED')} disabled={busy}>
                            {busy ? '처리 중…' : '반려'}
                          </button>
                        </span>
                      ) : (
                        <span className="ap-actions">
                          <button type="button" className="ap-btn is-success" onClick={() => { setConfirming({ id: req.id, action: 'APPROVED' }); setRejectNote(''); }}>
                            <Check size={13} weight="bold" /> 승인
                          </button>
                          <button type="button" className="ap-btn is-ghost" onClick={() => { setConfirming({ id: req.id, action: 'REJECTED' }); setRejectNote(''); }}>
                            <X size={12} weight="bold" /> 반려
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <ToastStack toasts={toasts} />
    </div>
  );
}
