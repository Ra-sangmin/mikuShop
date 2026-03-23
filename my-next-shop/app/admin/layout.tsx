"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AdminSidebar from '@/app/admin/components/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminName, setAdminName] = useState('관리자');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 🌟 경로와 타이틀 매칭 객체
  const menuTitles: Record<string, string> = {
    '/admin/dashboard': '대시보드',
    '/admin/users': '사용자 관리',
    '/admin/orders': '주문 관리',
    '/admin/delivery': '배송 현황',
    '/admin/settlement': '정산 관리',
    '/admin/refund': '환불 정보',
    '/admin/cs': '고객 센터',
    '/admin/developer': '개발자 전용',
  };

  // 현재 경로에 맞는 타이틀 찾기 (없으면 기본값 설정)
  const currentTitle = menuTitles[pathname] || '관리자 시스템';

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
                100엔 = <strong style={s.exchangeRed}>905.42원</strong>
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