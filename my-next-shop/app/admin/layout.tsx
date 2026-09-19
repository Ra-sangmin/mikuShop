"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AdminSidebar from '@/app/admin/components/AdminSidebar';
import AdminRatePanel from '@/app/admin/components/AdminRatePanel';
import { ADMIN_MENU } from '@/app/admin/adminMenu';
import { List, CurrencyJpy, SignOut, House, CaretRight } from '@phosphor-icons/react';
import '@/app/admin/admin-shell.css';

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

    // 🌟 환율 새로고침·추가 증가액 적용(견적 계산기, 모바일 헤더 환율 설정)이 이 이벤트를 보냅니다.
    //    detail 에 최신 값이 있으면 그대로 쓰고(캐시된 예전 환율로 덮어쓰지 않도록), 없으면 다시 불러옵니다.
    const onUpdate = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d) {
        setExchangeRate(d.baseExchangeRate);
        setRateBasisUnit(d.exchangeRateBasisUnit);
        setAdditionalRate(d.additionalRate * d.exchangeRateBasisUnit);
      } else {
        fetchExchangeInfo();
      }
    };
    window.addEventListener('exchangeRateConfigUpdated', onUpdate);
    return () => window.removeEventListener('exchangeRateConfigUpdated', onUpdate);
  }, []);

  // 현재 경로에 맞는 타이틀 찾기 (없으면 기본값 설정). AdminSidebar.tsx와 공유하는
  // app/admin/adminMenu.ts의 ADMIN_MENU에서 그대로 조회합니다.
  const currentTitle = ADMIN_MENU.find(item => item.path === pathname)?.name || '관리자 시스템';

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    // 🌟 /admin/login 자신도 이 레이아웃 아래에 있어서, 로그인 페이지에서까지 이 체크가 돌면
    // "원래 가려던 페이지"가 로그인 페이지 자신으로 덮어써지는 자기 자신 리다이렉트 버그가 생깁니다.
    if (pathname === '/admin/login') return;

    // 🐛 예전에는 localStorage의 admin_id로 로그인 여부를 판단했습니다. 지금은 서버가 서명한
    //    httpOnly 쿠키가 유일한 기준이라 둘이 어긋날 수 있었습니다.
    //      · 쿠키만 만료 → 화면은 그대로 뜨는데 모든 API가 401로 조용히 실패
    //      · localStorage만 지움 → 멀쩡한 세션인데 로그인 화면으로 튕김
    //    → 서버에 실제 세션을 물어봅니다.
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/login', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;

        if (!data.authenticated) {
          localStorage.removeItem('admin_id');
          localStorage.removeItem('admin_name');
          // 🌟 미들웨어와 동일하게, 원래 있던 페이지로 로그인 후 돌아갈 수 있도록 redirect 쿼리를 함께 넘깁니다.
          router.push(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        setAdminName(data.name || '');
        // 화면 표시용 값은 서버가 알려준 최신 정보로 맞춰둡니다.
        if (data.adminId) localStorage.setItem('admin_id', String(data.adminId));
        if (data.name) localStorage.setItem('admin_name', data.name);
      } catch {
        // 네트워크 오류로 세션을 확인하지 못했을 때는 화면을 유지합니다.
        // (여기서 로그인 화면으로 보내면 일시적인 통신 장애에 작업 중인 내용이 날아갑니다)
      }
    })();

    return () => { cancelled = true; };
  }, [router, pathname]);

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

  // 🌟 최종 표시 환율 카드 (데스크톱/모바일 두 곳에서 같은 내용을 씁니다)
  // 🖥 헤더 환율 카드 클릭 → 견적 계산기의 '환율 및 마진 설정' 으로 이동
  const goRateSettings = () => {
    if (pathname === '/admin/estimate') {
      window.dispatchEvent(new Event('admin:focusRateSettings'));
    } else {
      router.push('/admin/estimate#rate-settings');
    }
  };

  const rateCard = (variant: 'desktop' | 'mobile') => (
    <button
      type="button"
      className={`ash-rate is-${variant} is-link`}
      onClick={goRateSettings}
      title="견적 계산기의 환율 및 마진 설정으로 이동"
      aria-label="환율 및 마진 설정으로 이동"
    >
      <span className="ash-rate-icon" aria-hidden="true"><CurrencyJpy size={16} weight="bold" /></span>
      <span className="ash-rate-body">
        <span className="ash-rate-label">최종 표시 환율</span>
        <span className="ash-rate-value" translate="no">
          {rateBasisUnit}엔 = <strong>{(exchangeRate * rateBasisUnit + additionalRate).toFixed(2)}원</strong>
          <span className="ash-rate-formula">
            <span className="is-base" title="현재 환율">{(exchangeRate * rateBasisUnit).toFixed(2)}</span>
            {' + '}
            <span className="is-add" title="추가 증가액">{additionalRate}</span>
          </span>
        </span>
      </span>
      <span className="ash-rate-go" aria-hidden="true"><CaretRight size={12} weight="bold" /></span>
    </button>
  );

  return (
    <div style={s.container}>
      {/* 1. 사이드바 */}
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main style={s.main}>
        {/* 2. 헤더 */}
        <header className="ash-header">
          <div className="ash-header-row">
            <div className="ash-header-left">
              {/* 🌟 모바일에서만 보이는 사이드바 토글 버튼 */}
              <button
                type="button"
                className="ash-burger"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="메뉴 열기"
              >
                <List size={19} weight="bold" />
              </button>

              <span className="ash-titles">
                <span className="ash-crumb">
                  <House size={11} weight="fill" /> MIKU ADMIN CONSOLE
                </span>
                <h1 className="ash-title">{currentTitle}</h1>
              </span>
            </div>

            <div className="ash-header-right">
              {/* 최종 표시 환율 (데스크톱: 프로필 옆) */}
              {rateCard('desktop')}

              {/* 사용자 프로필 및 로그아웃 */}
              <div className="ash-profile">
                <span className="ash-avatar" aria-hidden="true">{adminName.charAt(0).toUpperCase()}</span>
                <span className="ash-profile-body">
                  <span className="ash-profile-role">ADMINISTRATOR</span>
                  <span className="ash-profile-name">{adminName}</span>
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="ash-logout"
                  aria-label="로그아웃"
                  title="로그아웃"
                >
                  <SignOut size={14} weight="bold" />
                  <span className="ash-logout-text">{isLoggingOut ? '...' : '로그아웃'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 🌟 최종 표시 환율 (모바일 전용: 아래 별도 줄).
              헤더 한 줄에 다 같이 넣으면 좁아서 라벨이 안 보이던 문제를 이 줄로 옮겨 해결합니다. */}
          {/* 📱 모바일: 환율 설정 패널 (펼쳐서 새로고침·추가 증가액 적용까지) */}
          <div className="ash-rate-panel">
            <AdminRatePanel />
          </div>
        </header>

        {/* 3. 실제 페이지 내용 */}
        <div className="ash-content">
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
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#f5f7fb',
    fontFamily: "'Inter', 'Noto Sans KR', sans-serif",
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
};