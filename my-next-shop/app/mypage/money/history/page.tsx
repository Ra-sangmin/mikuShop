'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import GuideLayout from '@/app/components/GuideLayout';
import '@/app/guide/guide-common.css';
import { useRouter } from 'next/navigation'; // 🌟 라우터 임포트
import { useMikuAlert } from '@/app/context/MikuAlertContext'; // 🌟 Context 임포트
import { ArrowDownLeft, ShoppingBag, Undo2, CalendarDays, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import MoneyBalanceCard from '../MoneyBalanceCard';
import GuideTitle from '@/app/guide/components/GuideTitle';

// ==========================================
// 🎨 1. 스타일 시스템 및 보조 함수
// ==========================================
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

const s = {
  // 공통 및 레이아웃
  // 🌟 padding-top을 0으로: GuideLayout이 헤더와 콘텐츠 패널 사이 간격을 이미 없앴는데,
  // 이 컨테이너 자체의 위쪽 padding(40px)이 그 위에 또 여백을 만들고 있었음
  // 🌟 가로 폭: 다른 사이드바 페이지(inquiry/faq 등의 .guide-page-container)처럼 본문 영역 전체를 씁니다.
  container: { width: '100%', padding: '0 0 40px 0', boxSizing: 'border-box' as const, minHeight: '100vh' },

  // 🌟 타입 필터 탭부터 목록 끝까지를 감싸는 배경 패널
  contentPanel: { backgroundColor: '#fdfdfd', borderRadius: '24px', padding: '10px 16px 20px 16px' },

  // 탭 (전체, 충전, 사용, 환불)
  tabContainer: { display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '16px', marginBottom: '24px' },
  tabItem: (active: boolean) => ({ flex: 1, padding: '12px 0', textAlign: 'center' as const, fontSize: '14px', fontWeight: '800', cursor: 'pointer', borderRadius: '12px', transition: 'all 0.3s ease', backgroundColor: active ? '#fff' : 'transparent', color: active ? '#0f172a' : '#94a3b8', boxShadow: active ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }),
  
  // 기간 필터 버튼
  periodWrapper: { display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto' as const, paddingBottom: '4px' },
  periodBtn: (isActive: boolean) => ({ padding: '10px 20px', borderRadius: '24px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: isActive ? '#0f172a' : '#f8fafc', color: isActive ? '#fff' : '#64748b', border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0' }),
  
  // 커스텀 기간 선택 (날짜 입력기)
  datePickerWrapper: { display: 'flex', gap: '10px', marginBottom: '24px', position: 'relative' as const },
  dateInputCol: { flex: 1, position: 'relative' as const },
  dateInputBox: { padding: '16px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #cbd5e1', cursor: 'pointer', textAlign: 'center' as const, fontWeight: '800', fontSize: '14px' },
  dateArrow: { alignSelf: 'center', color: '#94a3b8', fontWeight: 'bold' },

  // 달력 모달 UI
  calendarModal: { position: 'absolute' as const, top: '100%', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '300px', backgroundColor: 'rgba(255, 255, 255, 0.98)', backdropFilter: 'blur(20px)', borderRadius: '28px', padding: '24px', marginTop: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)', border: '1px solid #f1f5f9', boxSizing: 'border-box' as const },
  calHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  calTitle: { fontWeight: '900', fontSize: '18px' },
  calNavGroup: { display: 'flex', gap: '12px' },
  calNavBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#475569' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', width: '100%', boxSizing: 'border-box' as const },
  calDayLabel: { fontSize: '12px', fontWeight: '800', color: '#94a3b8', textAlign: 'center' as const, height: '32px' },
  dayCell: (isSelected: boolean, isToday: boolean, isCurrentMonth: boolean) => ({ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', fontWeight: '700', borderRadius: '12px', color: isSelected ? '#fff' : isCurrentMonth ? '#1e293b' : '#cbd5e1', backgroundColor: isSelected ? '#2563eb' : 'transparent' }),
  calFooter: { display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' },
  calClearBtn: { color: '#ef4444', background: 'none', border: 'none', fontWeight: '800', cursor: 'pointer' },
  calTodayBtn: { color: '#2563eb', background: 'none', border: 'none', fontWeight: '800', cursor: 'pointer' },

  // 이용내역 리스트
  listWrapper: { display: 'flex', flexDirection: 'column' as const, gap: '14px' },
  loadingText: { textAlign: 'center' as const, padding: '60px', color: '#94a3b8', fontWeight: '700' },
  emptyText: { textAlign: 'center' as const, padding: '80px 0', color: '#cbd5e1', fontWeight: '700' },
  
  // 개별 이용내역 카드 (동적 스타일)
  logCard: (style: any) => ({ backgroundColor: style.cardBg, border: `1px solid ${style.cardBorder}`, borderRadius: '24px', padding: '22px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }),
  logLeft: { display: 'flex', gap: '16px', alignItems: 'center' },
  logBadge: (style: any) => ({ width: '46px', height: '46px', borderRadius: '14px', backgroundColor: style.badgeBg, color: style.badgeText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '900', letterSpacing: '-0.5px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }),
  logTitle: (color: string) => ({ fontWeight: '800', color: color, fontSize: '15px', letterSpacing: '-0.3px' }),
  logDate: { fontSize: '12px', color: '#94a3b8', marginTop: '4px', fontWeight: '600' },
  logRight: { textAlign: 'right' as const },
  logAmount: (color: string) => ({ fontWeight: '900', fontSize: '18px', color: color, letterSpacing: '-0.5px' }),
  logBalance: { fontSize: '12px', color: '#94a3b8', marginTop: '4px', fontWeight: '600' },

  // 페이지네이션
  paginationWrapper: { display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '40px' },
  pageBtn: (isActive: boolean, disabled: boolean) => ({ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', cursor: disabled ? 'not-allowed' : 'pointer', backgroundColor: isActive ? '#0f172a' : '#fff', color: isActive ? '#fff' : disabled ? '#cbd5e1' : '#475569', border: isActive ? '1px solid #0f172a' : disabled ? '1px solid #f1f5f9' : '1px solid #e2e8f0', transition: 'all 0.2s', boxShadow: isActive ? '0 4px 10px rgba(0,0,0,0.1)' : 'none' })
};

const getTypeStyle = (type: string) => {
  switch (type) {
    case 'CHARGE': 
      return { cardBg: '#f4f9ff', cardBorder: '#dbeafe', badgeBg: '#3b82f6', badgeText: '#ffffff', amountColor: '#2563eb', titleColor: '#1e3a8a' };
    case 'REFUND': 
      return { cardBg: '#fff1f2', cardBorder: '#ffe4e6', badgeBg: '#f43f5e', badgeText: '#ffffff', amountColor: '#e11d48', titleColor: '#881337' };
    case 'USE':    
    default:
      return { cardBg: '#ffffff', cardBorder: '#e2e8f0', badgeBg: '#475569', badgeText: '#ffffff', amountColor: '#0f172a', titleColor: '#0f172a' };
  }
};

// ==========================================
// 🧠 2. 비즈니스 로직 훅
// ==========================================
function useMoneyHistoryLogic() {
  const router = useRouter(); // 🌟 라우터 추가
  const { showAlert } = useMikuAlert(); // 🌟 미쿠짱 전용 Alert 추가
  const hasAlerted = useRef(false); // 🌟 중복 알림 방지용

  const [isAuthChecking, setIsAuthChecking] = useState(true); // 🌟 로그인 체크 상태

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMoney, setCurrentMoney] = useState(0);

  const [period, setPeriod] = useState('all');
  const [filterType, setFilterType] = useState('ALL');
  const [customDates, setCustomDates] = useState({ start: '', end: '' });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const pickerWrapperRef = useRef<HTMLDivElement>(null);

  // 🌟 컴포넌트 마운트 시 로그인 체크 수행
  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      if (!hasAlerted.current) {
        hasAlerted.current = true;
        showAlert('로그인이 필요한 페이지입니다.', 'warning');
        router.push('/auth/login');
      }
      return;
    }
    // 로그인이 확인되면 인증 체크 종료 -> UI 렌더링 시작
    setIsAuthChecking(false);
  }, [router, showAlert]);

  const fetchHistory = useCallback(async () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) return; // 🌟 비로그인 상태일 땐 페치 중단

    setLoading(true);
    try {
      let url = `/api/money/logs?userId=${userId}&type=${filterType}`;
      if (period === 'custom' && customDates.start && customDates.end) {
        url += `&startDate=${customDates.start}&endDate=${customDates.end}`;
      } else { url += `&period=${period}`; }

      const [logRes, userRes] = await Promise.all([fetch(url), fetch(`/api/users?id=${userId}`)]);
      const logData = await logRes.json();
      const userData = await userRes.json();
      
      if (logData.success) {
        setLogs(logData.logs);
        setCurrentPage(1);
      }
      if (userData.success) setCurrentMoney(userData.user.cyberMoney);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [period, filterType, customDates]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerWrapperRef.current && !pickerWrapperRef.current.contains(event.target as Node)) {
        setShowPicker(null);
      }
    };
    if (showPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  useEffect(() => { 
    // 🌟 인증이 완료된 후에만 데이터를 가져오도록 수정
    if (!isAuthChecking) {
      fetchHistory(); 
    }
  }, [fetchHistory, isAuthChecking]);

  const totalPages = Math.ceil(logs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentLogs = logs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const maxPageButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
  let endPage = startPage + maxPageButtons - 1;
  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxPageButtons + 1);
  }
  const pageNumbers = Array.from({ length: Math.max(0, endPage - startPage + 1) }, (_, i) => startPage + i);

  return {
    isAuthChecking, // 🌟 UI에서 깜빡임 방지를 위해 내보냄
    loading, currentMoney, period, setPeriod, filterType, setFilterType,
    customDates, setCustomDates, currentPage, setCurrentPage,
    showPicker, setShowPicker, viewDate, setViewDate, pickerWrapperRef,
    logs, currentLogs, totalPages, pageNumbers
  };
}

// ==========================================
// 🖥️ 3. 메인 컴포넌트 (UI 마크업 전용)
// ==========================================
const TYPE_TABS = [
  { key: 'ALL', label: '전체', dot: '#6b7280' },
  { key: 'CHARGE', label: '충전', dot: '#1d5fbf' },
  { key: 'USE', label: '사용', dot: '#c2541a' },
  { key: 'REFUND', label: '환불', dot: '#b42350' },
];
const PERIODS = [
  { key: 'all', label: '전체 기간' },
  { key: '1week', label: '1주' },
  { key: '1month', label: '1개월' },
  { key: 'custom', label: '직접 선택' },
];
const TYPE_META: Record<string, { tone: string; label: string; icon: React.ElementType }> = {
  CHARGE: { tone: 'tone-charge', label: '충전', icon: ArrowDownLeft },
  USE: { tone: 'tone-use', label: '사용', icon: ShoppingBag },
  REFUND: { tone: 'tone-refund', label: '환불', icon: Undo2 },
};

const formatLogDate = (value: string) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function MoneyHistoryPage() {
  const {
    isAuthChecking, // 🌟 상태 받아오기
    loading, currentMoney, period, setPeriod, filterType, setFilterType,
    customDates, setCustomDates, currentPage, setCurrentPage,
    showPicker, setShowPicker, viewDate, setViewDate, pickerWrapperRef,
    logs, currentLogs, totalPages, pageNumbers
  } = useMoneyHistoryLogic();

  // 🌟 로그인 여부 확인 중일 때는 빈 화면을 렌더링해 깜빡임 방지
  if (isAuthChecking) {
    return <div style={{ height: '100vh', backgroundColor: '#fdfdfd' }} />;
  }

  // 🌟 현재 조회 조건(유형·기간)에 해당하는 내역 전체의 합계
  const totals = logs.reduce(
    (acc: { charge: number; use: number; refund: number }, log: any) => {
      const value = Math.abs(Number(log.amount) || 0);
      if (log.type === 'CHARGE') acc.charge += value;
      else if (log.type === 'REFUND') acc.refund += value;
      else acc.use += value;
      return acc;
    },
    { charge: 0, use: 0, refund: 0 }
  );

  const renderCalendar = (target: 'start' | 'end') => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const days = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const handleTodayClick = () => {
      setCustomDates(prev => ({ ...prev, [target]: todayStr }));
      setViewDate(now);
      setShowPicker(null);
    };

    return (
      <div className="mm-cal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={target === 'start' ? '시작일 선택' : '종료일 선택'}>
        <div className="mm-cal-head">
          <span className="mm-cal-title">{year}년 {month + 1}월</span>
          <div className="mm-cal-nav">
            <button type="button" aria-label="이전 달" onClick={() => setViewDate(new Date(year, month - 1))}><ChevronLeft size={16} strokeWidth={2.4} /></button>
            <button type="button" aria-label="다음 달" onClick={() => setViewDate(new Date(year, month + 1))}><ChevronRight size={16} strokeWidth={2.4} /></button>
          </div>
        </div>
        <div className="mm-cal-grid">
          {dayLabels.map((l, i) => <div key={l} className={`mm-cal-dow ${i === 0 ? 'is-sun' : ''}`}>{l}</div>)}
          {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: days }, (_, i) => i + 1).map(d => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSelected = customDates[target] === dateStr;
            return (
              <button
                type="button"
                key={d}
                className={`mm-cal-day ${isSelected ? 'is-selected' : ''} ${todayStr === dateStr ? 'is-today' : ''}`}
                onClick={() => {
                  setCustomDates(prev => ({ ...prev, [target]: dateStr }));
                  setShowPicker(null);
                }}
              >{d}</button>
            );
          })}
        </div>
        <div className="mm-cal-foot">
          <button type="button" className="is-clear" onClick={() => { setCustomDates(prev => ({ ...prev, [target]: '' })); setShowPicker(null); }}>지우기</button>
          <button type="button" className="is-today" onClick={handleTodayClick}>오늘</button>
        </div>
      </div>
    );
  };

  return (
    <GuideLayout title="이용 내역" type="money">
      <style jsx global>{`
        /* 🌟 모바일: currentMenu(고정 바)와 카드 사이 여백 제거 */
        @media (max-width: 768px) {
          .money-history-container { padding-top: 0 !important; }
        }
      `}</style>
      <div className="money-history-container mm-page" style={{ minHeight: '100vh' }}>

        {/* 🌟 요약 카드 + 제목 — mypage/wishlist 와 같은 구성 (카드가 제목 위) */}
        <MoneyBalanceCard
          current="history"
          balance={currentMoney}
          stats={[
            { label: '조회 내역', value: `${logs.length}건` },
            { label: '충전 합계', value: `${totals.charge > 0 ? '+' : ''}${totals.charge.toLocaleString()}원`, tone: 'plus' },
            { label: '사용 합계', value: `${totals.use > 0 ? '-' : ''}${totals.use.toLocaleString()}원`, tone: 'minus' },
            { label: '환불 합계', value: `${totals.refund.toLocaleString()}원` },
          ]}
        />

        <GuideTitle eyebrow="History" title="이용 내역" icon="fa-coins" />

        <div className="guide-panel mm-anim mm-panel-visible">

          {/* 조회 조건 합계 */}
          <div className="mm-stat-row" translate="no">
            <div className="mm-stat tone-charge">
              <span className="mm-stat-icon"><ArrowDownLeft size={18} strokeWidth={2.3} /></span>
              <span className="mm-stat-text"><span>충전 합계</span><strong>{totals.charge > 0 ? '+' : ''}{totals.charge.toLocaleString()}원</strong></span>
            </div>
            <div className="mm-stat tone-use">
              <span className="mm-stat-icon"><ShoppingBag size={18} strokeWidth={2.3} /></span>
              <span className="mm-stat-text"><span>사용 합계</span><strong>{totals.use > 0 ? '-' : ''}{totals.use.toLocaleString()}원</strong></span>
            </div>
            <div className="mm-stat tone-refund">
              <span className="mm-stat-icon"><Undo2 size={18} strokeWidth={2.3} /></span>
              <span className="mm-stat-text"><span>환불 합계</span><strong>{totals.refund.toLocaleString()}원</strong></span>
            </div>
          </div>

          {/* 필터 */}
          <div className="mm-toolbar">
            <div className="mm-segment" role="tablist" aria-label="내역 유형">
              {TYPE_TABS.map((t) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterType === t.key}
                  key={t.key}
                  className={`mm-segment-btn ${filterType === t.key ? 'is-active' : ''}`}
                  onClick={() => setFilterType(t.key)}
                >
                  <span className="mm-segment-dot" style={{ background: t.dot }} />
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mm-periods" aria-label="조회 기간">
              {PERIODS.map(p => (
                <button type="button" key={p.key} onClick={() => setPeriod(p.key)} className={`mm-period ${period === p.key ? 'is-active' : ''}`}>
                  {p.key === 'custom' && <CalendarDays size={13} strokeWidth={2.3} />}
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 직접 선택 달력 피커 */}
          {period === 'custom' && (
            <div ref={pickerWrapperRef} className="mm-date-range">
              <div className="mm-date-col">
                <button type="button" className={`mm-date-btn ${showPicker === 'start' ? 'is-open' : ''}`} onClick={() => setShowPicker(showPicker === 'start' ? null : 'start')}>
                  <CalendarDays size={16} strokeWidth={2.2} />
                  <span className={customDates.start ? '' : 'is-placeholder'}>{customDates.start || '시작일'}</span>
                </button>
                {showPicker === 'start' && renderCalendar('start')}
              </div>
              <span className="mm-date-sep">~</span>
              <div className="mm-date-col is-end">
                <button type="button" className={`mm-date-btn ${showPicker === 'end' ? 'is-open' : ''}`} onClick={() => setShowPicker(showPicker === 'end' ? null : 'end')}>
                  <CalendarDays size={16} strokeWidth={2.2} />
                  <span className={customDates.end ? '' : 'is-placeholder'}>{customDates.end || '종료일'}</span>
                </button>
                {showPicker === 'end' && renderCalendar('end')}
              </div>
            </div>
          )}

          {/* 이용내역 리스트 */}
          <div className="mm-log-list">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="mm-log" aria-hidden="true">
                  <span className="mm-skeleton is-icon" />
                  <div className="mm-log-main">
                    <span className="mm-skeleton" style={{ width: '55%' }} />
                    <span className="mm-skeleton" style={{ width: '30%', height: '10px' }} />
                  </div>
                  <span className="mm-skeleton" style={{ width: '80px' }} />
                </div>
              ))
            ) : currentLogs.length > 0 ? currentLogs.map((log: any) => {
              const meta = TYPE_META[log.type] || TYPE_META.USE;
              const Icon = meta.icon;
              const isPlus = log.amount > 0;
              return (
                <div key={log.id} className="mm-log">
                  <span className={`mm-log-icon ${meta.tone}`}><Icon size={19} strokeWidth={2.2} /></span>
                  <div className="mm-log-main">
                    <p className="mm-log-title" title={log.content}>{log.content}</p>
                    <p className="mm-log-meta">
                      <span className={`mm-log-type ${meta.tone}`}>{meta.label}</span>
                      <span translate="no">{formatLogDate(log.createdAt)}</span>
                    </p>
                  </div>
                  <div className="mm-log-right" translate="no">
                    <p className={`mm-log-amount ${isPlus ? 'is-plus' : 'is-minus'}`}>
                      {isPlus ? `+${log.amount.toLocaleString()}` : log.amount.toLocaleString()}원
                    </p>
                    <p className="mm-log-balance">잔액 {Number(log.balanceAfter || 0).toLocaleString()}원</p>
                  </div>
                </div>
              );
            }) : (
              <div className="mm-empty">
                <span className="mm-empty-icon"><Inbox size={26} strokeWidth={1.8} /></span>
                <strong>내역이 없습니다</strong>
                <span>조회 기간이나 유형을 바꿔서 다시 확인해 보세요.</span>
              </div>
            )}
          </div>

          {/* 페이지네이션 영역 */}
          {!loading && totalPages > 1 && (
            <nav className="mm-pager" aria-label="페이지 이동">
              <button
                type="button"
                className="mm-page-btn"
                aria-label="이전 페이지"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} strokeWidth={2.4} />
              </button>
              {pageNumbers.map(page => (
                <button
                  type="button"
                  key={page}
                  className={`mm-page-btn ${currentPage === page ? 'is-active' : ''}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                className="mm-page-btn"
                aria-label="다음 페이지"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} strokeWidth={2.4} />
              </button>
            </nav>
          )}

        </div>
      </div>
    </GuideLayout>
  );
}
