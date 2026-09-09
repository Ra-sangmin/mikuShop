"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AdminSidebar from '@/app/admin/components/AdminSidebar';
import { ADMIN_MENU } from '@/app/admin/adminMenu';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminName, setAdminName] = useState('관리자');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // 🌟 모바일(768px 이하)에서는 사이드바가 기본적으로 숨겨져 있다가, 햄버거 버튼을 눌러야 열립니다.
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // 🌟 사이트 전역 환율(가산액 포함)이 아니라, /api/estimate의 baseExchangeRate
  // (fetchNaverExchangeRate가 반환하는 순수 네이버 금융 환율)를 직접 조회합니다.
  const [exchangeRate, setExchangeRate] = useState(0);
  // 🌟 "환율을 몇 엔 기준으로 다시 계산해서 보여줄지"의 기준값 (api/estimate의 getExchangeRateBasisUnit)
  const [rateBasisUnit, setRateBasisUnit] = useState(100);
  // 🌟 추가 증가액 (api/estimate의 getAdditionalRate * getExchangeRateBasisUnit)
  const [additionalRate, setAdditionalRate] = useState(0);

  useEffect(() => {
    const fetchExchangeInfo = () => {
      fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salePrice: 0, quantityCount: 0 })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setExchangeRate(data.data.baseExchangeRate);
            setRateBasisUnit(data.data.exchangeRateBasisUnit);
            setAdditionalRate(data.data.additionalRate * data.data.exchangeRateBasisUnit);
          }
        });
    };

    fetchExchangeInfo();

    // 🌟 admin/estimate의 "전역 적용" 버튼이 추가 증가액을 DB에 저장하면 이 이벤트를 쏘는데,
    // 그때 헤더의 "추가 증가액" 표시도 다시 불러와 즉시 반영합니다.
    window.addEventListener('exchangeRateConfigUpdated', fetchExchangeInfo);
    return () => window.removeEventListener('exchangeRateConfigUpdated', fetchExchangeInfo);
  }, []);

  // 현재 경로에 맞는 타이틀 찾기 (없으면 기본값 설정). AdminSidebar.tsx와 공유하는
  // app/admin/adminMenu.ts의 ADMIN_MENU에서 그대로 조회합니다.
  const currentTitle = ADMIN_MENU.find(item => item.path === pathname)?.name || '관리자 시스템';

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const storedId = localStorage.getItem('admin_id');
    const storedName = localStorage.getItem('admin_name');
    
    if (!storedId) {
      router.push('/admin/login');
    } else if (storedName) {
      setAdminName(storedName);
    }
  }, [router]);

  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    setIsLoggingOut(true);
    try {
      const res = await fetch('/api/admin/logout', { method: 'POST' });
      if (res.ok) {
        localStorage.removeItem('admin_id');
        localStorage.removeItem('admin_name');
        router.push('/admin/login');
      }
    } catch (error) {
      alert('로그아웃 중 오류가 발생했습니다.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div style={s.container}>
      {/* 1. 사이드바 */}
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main style={s.main}>
        {/* 2. 헤더 */}
        <header style={s.header} className="admin-header">
          {/* 🌟 모바일에서만 보이는 사이드바 토글 버튼 */}
          <button
            className="admin-hamburger-btn"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="메뉴 열기"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <h1 style={s.title} className="admin-title">{currentTitle}</h1>

          <div style={s.headerRight} className="admin-header-right">
            {/* 최종 표시 환율 */}
            <div style={s.finalRateCard} className="final-rate-card">
              <span style={s.exchangeLabel} className="final-rate-label">최종 표시 환율</span>
              <span style={s.exchangeValue}>
                {rateBasisUnit}엔 = <strong style={s.finalRateValue}>{(exchangeRate * rateBasisUnit + additionalRate).toFixed(2)}원</strong>
                <span style={s.finalRateFormula} className="final-rate-formula">
                  (<span title="현재 환율" style={s.formulaCurrentRate}>{(exchangeRate * rateBasisUnit).toFixed(2)}</span>
                  {' + '}
                  <span title="추가 증가액" style={s.formulaAdditionalRate}>{additionalRate}</span>)
                </span>
              </span>
            </div>

            {/* 사용자 프로필 및 로그아웃 */}
            <div style={s.profileCard}>
              <div style={s.avatar}>
                {adminName.charAt(0).toUpperCase()}
              </div>
              <span style={s.profileName} className="admin-profile-name">{adminName}</span>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                style={s.logoutBtn}
              >
                {isLoggingOut ? '...' : '로그아웃'}
              </button>
            </div>
          </div>
        </header>

        {/* 3. 실제 페이지 내용 */}
        <div style={s.content}>
          {children}
        </div>
      </main>

      {/* 🌟 모바일 브레이크포인트는 globals.css 주석에 명시된 사이트 기준값(768px)을 따릅니다. */}
      <style jsx>{`
        .admin-hamburger-btn {
          display: none;
          border: none;
          background: transparent;
          color: #334155;
          cursor: pointer;
          padding: 4px;
          margin-right: 12px;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .admin-hamburger-btn {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .admin-header {
            padding: 0 16px !important;
          }

          .admin-title {
            font-size: 18px !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .admin-header-right {
            gap: 8px !important;
          }

          .final-rate-card {
            padding: 6px 10px !important;
          }
        }

        @media (max-width: 640px) {
          .final-rate-formula {
            display: none;
          }

          .final-rate-label {
            display: none;
          }
        }

        @media (max-width: 420px) {
          .admin-profile-name {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

// 🌟 스타일 정의 객체 (컴포넌트 하단이나 별도 파일로 분리 가능)
const s: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    fontFamily: "'Inter', 'Noto Sans KR', sans-serif",
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  header: {
    height: '70px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 30px',
    flexShrink: 0,
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  exchangeLabel: {
    color: '#64748b',
    marginRight: '8px',
  },
  exchangeValue: {
    color: '#0f172a',
  },
  finalRateCard: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
  },
  finalRateValue: {
    color: '#ef4444',
  },
  finalRateFormula: {
    marginLeft: '8px',
    color: '#475569',
    fontWeight: '500',
    fontSize: '12px',
  },
  formulaCurrentRate: {
    color: '#2563eb',
    fontWeight: '700',
  },
  formulaAdditionalRate: {
    color: '#7c3aed',
    fontWeight: '700',
  },
  profileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '4px 12px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  avatar: {
    width: '32px',
    height: '32px',
    backgroundColor: '#3b82f6',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    color: '#fff',
    fontSize: '14px',
  },
  profileName: {
    fontWeight: '600',
    color: '#334155',
    fontSize: '14px',
  },
  logoutBtn: {
    border: 'none',
    backgroundColor: 'transparent',
    color: '#ef4444',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '4px 8px',
    whiteSpace: 'nowrap',
  },
  content: {
    padding: '30px',
    overflowY: 'auto',
    flex: 1,
  },
};