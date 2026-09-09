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
  // 🌟 사이트 전역 환율(가산액 포함)이 아니라, /api/estimate의 baseExchangeRate
  // (fetchNaverExchangeRate가 반환하는 순수 네이버 금융 환율)를 직접 조회합니다.
  const [exchangeRate, setExchangeRate] = useState(0);
  // 🌟 "환율을 몇 엔 기준으로 다시 계산해서 보여줄지"의 기준값 (api/estimate의 getExchangeRateBasisUnit)
  const [rateBasisUnit, setRateBasisUnit] = useState(100);

  useEffect(() => {
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
        }
      });
  }, []);

  // 현재 경로에 맞는 타이틀 찾기 (없으면 기본값 설정). AdminSidebar.tsx와 공유하는
  // app/admin/adminMenu.ts의 ADMIN_MENU에서 그대로 조회합니다.
  const currentTitle = ADMIN_MENU.find(item => item.path === pathname)?.name || '관리자 시스템';

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
      <AdminSidebar />

      <main style={s.main}>
        {/* 2. 헤더 */}
        <header style={s.header}>
          <h1 style={s.title}>{currentTitle}</h1>
          
          <div style={s.headerRight}>
            {/* 환율 정보 */}
            <div style={s.exchangeCard}>
              <span style={s.exchangeLabel}>현재 환율</span>
              <span style={s.exchangeValue}>
                {rateBasisUnit}엔 = <strong style={s.exchangeRed}>{(exchangeRate * rateBasisUnit).toFixed(2)}원</strong>
              </span>
            </div>
            
            {/* 사용자 프로필 및 로그아웃 */}
            <div style={s.profileCard}>
              <div style={s.avatar}>
                {adminName.charAt(0).toUpperCase()}
              </div>
              <span style={s.profileName}>{adminName}</span>
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
    </div>
  );
}

// 🌟 스타일 정의 객체 (컴포넌트 하단이나 별도 파일로 분리 가능)
const s: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
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
  exchangeCard: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
  },
  exchangeLabel: {
    color: '#64748b',
    marginRight: '8px',
  },
  exchangeValue: {
    color: '#0f172a',
  },
  exchangeRed: {
    color: '#ef4444',
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
  },
  content: {
    padding: '30px',
    overflowY: 'auto',
    flex: 1,
  },
};