'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import GuideLayout from '@/app/components/GuideLayout';
import { useRouter } from 'next/navigation'; // 🌟 라우터 임포트
import { useMikuAlert } from '@/app/context/MikuAlertContext'; // 🌟 Context 임포트

// ==========================================
// 🎨 1. 스타일 시스템 및 보조 함수
// ==========================================
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

const s = {
  // 공통 및 레이아웃
  container: { maxWidth: '600px', margin: '0 auto', padding: '40px 16px', backgroundColor: '#fdfdfd', minHeight: '100vh' },
  
  // 현재 머니 카드
  balanceCard: { background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', borderRadius: '28px', padding: '32px', color: '#fff', marginBottom: '32px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  balanceLabel: { fontSize: '14px', opacity: 0.8, marginBottom: '6px', fontWeight: '500' },
  balanceAmount: { fontSize: '32px', fontWeight: '900', letterSpacing: '-0.5px' },
  
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
        router.push('/login');
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
    currentLogs, totalPages, pageNumbers
  };
}

// ==========================================
// 🖥️ 3. 메인 컴포넌트 (UI 마크업 전용)
// ==========================================
export default function MoneyHistoryPage() {
  const {
    isAuthChecking, // 🌟 상태 받아오기
    loading, currentMoney, period, setPeriod, filterType, setFilterType,
    customDates, setCustomDates, currentPage, setCurrentPage,
    showPicker, setShowPicker, viewDate, setViewDate, pickerWrapperRef,
    currentLogs, totalPages, pageNumbers
  } = useMoneyHistoryLogic();

  // 🌟 로그인 여부 확인 중일 때는 빈 화면을 렌더링해 깜빡임 방지
  if (isAuthChecking) {
    return <div style={{ height: '100vh', backgroundColor: '#fdfdfd' }} />;
  }

  const renderCalendar = (target: 'start' | 'end') => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const days = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];

    const handleTodayClick = () => {
      const today = new Date();
      const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      setCustomDates(prev => ({ ...prev, [target]: formatted }));
      setViewDate(today);
      setShowPicker(null);
    };

    return (
      <div style={s.calendarModal} onClick={(e) => e.stopPropagation()}>
        <div style={s.calHeader}>
          <span style={s.calTitle}>{year}년 {month + 1}월</span>
          <div style={s.calNavGroup}>
            <button onClick={() => setViewDate(new Date(year, month - 1))} style={s.calNavBtn}>▲</button>
            <button onClick={() => setViewDate(new Date(year, month + 1))} style={s.calNavBtn}>▼</button>
          </div>
        </div>
        <div style={s.grid}>
          {dayLabels.map(l => <div key={l} style={s.calDayLabel}>{l}</div>)}
        </div>
        <div style={s.grid}>
          {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: days }, (_, i) => i + 1).map(d => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            return (
              <div key={d} style={s.dayCell(customDates[target] === dateStr, new Date().toISOString().split('T')[0] === dateStr, true)} onClick={() => {
                setCustomDates(prev => ({ ...prev, [target]: dateStr }));
                setShowPicker(null);
              }}>{d}</div>
            );
          })}
        </div>
        <div style={s.calFooter}>
          <button style={s.calClearBtn} onClick={() => { setCustomDates(prev => ({ ...prev, [target]: '' })); setShowPicker(null); }}>삭제</button>
          <button style={s.calTodayBtn} onClick={handleTodayClick}>오늘</button>
        </div>
      </div>
    );
  };

  return (
    <GuideLayout title="이용내역" type="money">
      <div style={s.container}>
        
        {/* 현재 머니 카드 */}
        <div style={s.balanceCard}>
          <p style={s.balanceLabel}>현재 보유 머니</p>
          <h2 style={s.balanceAmount}>{currentMoney.toLocaleString()}원</h2>
        </div>

        {/* 타입 필터 탭 */}
        <div style={s.tabContainer}>
          {['ALL', 'CHARGE', 'USE', 'REFUND'].map((t) => (
            <div key={t} style={s.tabItem(filterType === t)} onClick={() => setFilterType(t)}>
              {t === 'ALL' ? '전체' : t === 'CHARGE' ? '충전' : t === 'USE' ? '사용' : '환불'}
            </div>
          ))}
        </div>

        {/* 기간 필터 버튼 */}
        <div style={s.periodWrapper}>
          {['all', '1week', '1month', 'custom'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={s.periodBtn(period === p)}>
              {p === 'all' ? '전체' : p === '1week' ? '1주' : p === '1month' ? '1개월' : '🗓️ 직접 선택'}
            </button>
          ))}
        </div>

        {/* 직접 선택 달력 피커 */}
        {period === 'custom' && (
          <div ref={pickerWrapperRef} style={s.datePickerWrapper}>
            <div style={s.dateInputCol}>
              <div onClick={() => setShowPicker('start')} style={s.dateInputBox}>{customDates.start || '시작일'}</div>
              {showPicker === 'start' && renderCalendar('start')}
            </div>
            <div style={s.dateArrow}>→</div>
            <div style={s.dateInputCol}>
              <div onClick={() => setShowPicker('end')} style={s.dateInputBox}>{customDates.end || '종료일'}</div>
              {showPicker === 'end' && renderCalendar('end')}
            </div>
          </div>
        )}

        {/* 이용내역 리스트 */}
        <div style={s.listWrapper}>
          {loading ? <div style={s.loadingText}>데이터를 불러오는 중입니다...</div> :
            currentLogs.length > 0 ? currentLogs.map((log) => {
              
              const style = getTypeStyle(log.type);

              return (
                <div key={log.id} style={s.logCard(style)}>
                  <div style={s.logLeft}>
                    <div style={s.logBadge(style)}>
                      {log.type === 'CHARGE' ? '충전' : log.type === 'REFUND' ? '환불' : '사용'}
                    </div>
                    <div>
                      <p style={s.logTitle(style.titleColor)}>{log.content}</p>
                      <p style={s.logDate}>
                        {new Date(log.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div style={s.logRight}>
                    <p style={s.logAmount(style.amountColor)}>
                      {log.amount > 0 ? `+${log.amount.toLocaleString()}` : log.amount.toLocaleString()}원
                    </p>
                    <p style={s.logBalance}>
                      잔액 {log.balanceAfter.toLocaleString()}원
                    </p>
                  </div>
                </div>
              );
            }) : <div style={s.emptyText}>내역이 없습니다.</div>}
        </div>

        {/* 페이지네이션 영역 */}
        {!loading && totalPages > 1 && (
          <div style={s.paginationWrapper}>
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={s.pageBtn(false, currentPage === 1)}
            >
              &lt;
            </button>
            
            {pageNumbers.map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={s.pageBtn(currentPage === page, false)}
              >
                {page}
              </button>
            ))}

            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={s.pageBtn(false, currentPage === totalPages)}
            >
              &gt;
            </button>
          </div>
        )}

      </div>
    </GuideLayout>
  );
}