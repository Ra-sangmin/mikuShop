'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

// =================================================================
// 1. 비즈니스 로직 영역 (Business Logic Layer)
// 불필요한 디자인 상태(isMobile, isHovered)를 지우고 순수 기능만 남겼습니다.
// =================================================================
function useGuideLayoutLogic(type?: string) {
  const pathname = usePathname();
  const scrollMenuRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarPlaceholderRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const mypageMenu = [
    { label: '내 정보', href: '/mypage' },
    { label: '구매대행 상황', href: '/mypage/status' },
    { label: '나의 배송지 정보 수정', href: '/mypage/profile' },
    { label: '관심목록', href: '/wishlist' },
    { label: '비밀번호 수정', href: '/auth/change-password' },
  ];

  const guideMenu = [
    { label: '구매대행 신청방법', href: '/guide/purchase-method' },
    { label: '배송대행 신청방법', href: '/guide/delivery-method' },
    { label: '자주하는 질문', href: '/guide/faq' },
    { label: '이용약관', href: '/guide/terms' }, 
    { label: '개인정보처리방침', href: '/guide/privacy' },
  ];

  const feeMenu = [
    { label: '회원 등급 및 혜택', href: '/guide/membership' },
    { label: '수수료 안내', href: '/guide/fee-guide' },
    { label: '국제 배송 요금표', href: '/guide/shipping-fee' },
    { label: '예상 관부과세 안내', href: '/guide/customs' },
  ];

  const moneyMenu = [
    { label: '머니 충전', href: '/mypage/money/charge' },
    { label: '머니 이용내역', href: '/mypage/money/history' },
    { label: '환불신청', href: '/mypage/money/refund' },
  ];

  const currentMenu = 
    type === 'mypage' ? mypageMenu : 
    type === 'guide' ? guideMenu : 
    type === 'fee' ? feeMenu : 
    type === 'money' ? moneyMenu : [];

  const headerTitle = 
    type === 'mypage' ? '마이페이지' : 
    type === 'fee' ? '수수료/배송비' : 
    type === 'money' ? '미쿠짱머니' : '이용가이드';

  // 메뉴 활성화 시 중앙으로 자동 스크롤
  useEffect(() => {
    if (scrollMenuRef.current) {
      const activeElement = scrollMenuRef.current.querySelector('.active');
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [pathname]);

  // 🌟 모바일 고정(sticky) 바 위치 계산: 하드코딩 대신 실제 렌더링된 높이를 측정해서
  // 헤더 높이(--sticky-header-h)와 이 메뉴 높이(--sticky-menu-h)를 CSS 변수로 노출.
  // 하위 페이지(예: 국제배송 요금표 탭)가 이 변수를 이어받아 정확히 붙게 만든다.
  useEffect(() => {
    const menuEl = scrollMenuRef.current;

    const updateStickyOffsets = () => {
      const headerEl = document.querySelector('.miku-header-wrapper') as HTMLElement | null;
      const headerH = headerEl ? headerEl.getBoundingClientRect().height : 89;
      const menuH = menuEl ? menuEl.getBoundingClientRect().height : 64;
      document.documentElement.style.setProperty('--sticky-header-h', `${headerH}px`);
      document.documentElement.style.setProperty('--sticky-menu-h', `${menuH}px`);
    };

    updateStickyOffsets();

    const ro = new ResizeObserver(updateStickyOffsets);
    if (menuEl) ro.observe(menuEl);
    const headerEl = document.querySelector('.miku-header-wrapper');
    if (headerEl) ro.observe(headerEl);

    window.addEventListener('resize', updateStickyOffsets);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateStickyOffsets);
    };
  }, [pathname]);

  // 🌟 PC 사이드바(수수료/배송비 메뉴 등)의 실제 렌더링된 높이를 CSS 변수로 노출.
  // 하위 페이지가 이 값을 이어받아 자기 패널의 높이를 사이드바와 맞출 수 있게 한다.
  useEffect(() => {
    const sidebarEl = sidebarRef.current;

    const updateSidebarHeight = () => {
      const h = sidebarEl ? sidebarEl.getBoundingClientRect().height : 340;
      document.documentElement.style.setProperty('--sidebar-desktop-h', `${h}px`);
    };

    updateSidebarHeight();

    const ro = new ResizeObserver(updateSidebarHeight);
    if (sidebarEl) ro.observe(sidebarEl);

    window.addEventListener('resize', updateSidebarHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSidebarHeight);
    };
  }, [pathname]);

  // 🌟 사이드바를 position:sticky 대신 JS로 계산하는 fixed/absolute로 고정합니다.
  // sticky의 "고정 범위"는 .guide-layout-container의 높이(사이드바와 본문 중 더 큰 쪽)로
  // 제한되는데, 본문이 짧은 페이지(예: 배송지가 한두 개뿐인 /mypage/profile)에서는 그
  // 범위가 사이드바 자신의 높이와 별 차이가 없어 스크롤을 조금만 해도 sticky가 풀려
  // 사이드바가 화면 위로 사라져버렸습니다(본문이 아주 긴 /guide/terms, /mypage/status
  // 같은 페이지에서는 우연히 범위가 넉넉해 문제가 드러나지 않았을 뿐입니다).
  // main_shop의 GlobalShoppingView 사이드바를 고칠 때 썼던 것과 동일한 패턴으로,
  // 뷰포트 기준 fixed로 항상 고정하고 Footer 근처에서만 absolute로 전환합니다.
  const SIDEBAR_TOP = 100;
  const FOOTER_MARGIN = 24;
  const [sidebarLeft, setSidebarLeft] = useState<number | null>(null);
  const [sidebarPin, setSidebarPin] = useState<{ mode: 'fixed' | 'absolute'; top: number }>({ mode: 'fixed', top: SIDEBAR_TOP });

  useEffect(() => {
    if (isMobile) return;

    let ticking = false;
    const recompute = () => {
      ticking = false;
      if (sidebarPlaceholderRef.current) {
        setSidebarLeft(sidebarPlaceholderRef.current.getBoundingClientRect().left);
      }

      const sidebarEl = sidebarRef.current;
      const footerEl = document.querySelector('footer.footer-wrapper') as HTMLElement | null;
      if (!sidebarEl || !footerEl) {
        setSidebarPin({ mode: 'fixed', top: SIDEBAR_TOP });
        return;
      }

      const footerTop = footerEl.getBoundingClientRect().top;
      const sidebarHeight = sidebarEl.offsetHeight;

      if (SIDEBAR_TOP + sidebarHeight + FOOTER_MARGIN > footerTop) {
        const absoluteTop = window.scrollY + footerTop - sidebarHeight - FOOTER_MARGIN;
        setSidebarPin({ mode: 'absolute', top: absoluteTop });
      } else {
        setSidebarPin({ mode: 'fixed', top: SIDEBAR_TOP });
      }
    };

    const onScrollOrResize = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(recompute);
      }
    };

    recompute();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);

    // 본문이 비동기로 로드되어 높이가 바뀌는 경우(예: 배송지 목록 fetch 완료)에도 재계산
    const contentEl = document.querySelector('.guide-content-area');
    const ro = new ResizeObserver(onScrollOrResize);
    if (contentEl) ro.observe(contentEl);
    if (sidebarRef.current) ro.observe(sidebarRef.current);

    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      ro.disconnect();
    };
  }, [isMobile, pathname]);

  const handleLogout = async () => {
    if (window.confirm("로그아웃 하시겠습니까?")) {
      await signOut({ redirect: false });
      localStorage.removeItem('user_id');
      alert('로그아웃 되었습니다.');
      window.location.href = '/';
    }
  };

  return {
    pathname, scrollMenuRef, sidebarRef, sidebarPlaceholderRef, currentMenu, headerTitle, handleLogout,
    isMobile, sidebarLeft, sidebarPin,
  };
}


// =================================================================
// 2. 화면 및 디자인 영역 (View & Design Layer)
// 인라인 스타일과 복잡한 자바스크립트를 빼고 깔끔한 HTML과 클래스명만 남겼습니다.
// =================================================================
interface GuideLayoutProps {
  children: React.ReactNode;
  title: string;
  type?: string;
  hideSidebar?: boolean; 
}

export default function GuideLayout({ children, title, type, hideSidebar = false }: GuideLayoutProps) {
  const {
    pathname, scrollMenuRef, sidebarRef, sidebarPlaceholderRef, currentMenu, headerTitle, handleLogout,
    isMobile, sidebarLeft, sidebarPin,
  } = useGuideLayoutLogic(type);

  const sidebarInner = (
    <>
      <div className="guide-sidebar-header">
        <span className="sidebar-icon">❖</span>
        {headerTitle}
      </div>

      <div className="sidebar-menu-list" ref={scrollMenuRef}>
        {currentMenu.map((item, idx) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={idx}
              href={item.href || '#'}
              className={`menu-item ${isActive ? 'active' : ''}`}
            >
              <span>{item.label}</span>
              {isActive && (
                <svg className="active-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              )}
            </Link>
          );
        })}

        {type === 'mypage' && (
          <>
            <div className="menu-divider"></div>
            <button onClick={handleLogout} className="menu-item logout-btn">
              <span>로그아웃</span>
              <svg className="logout-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </>
        )}
      </div>
    </>
  );

  return (
    <div className="guide-layout-wrapper">
      <div className="guide-layout-container">

        {/* 사이드바 영역 */}
        {!hideSidebar && (
          isMobile ? (
            <aside className="guide-sidebar" ref={sidebarRef}>
              {sidebarInner}
            </aside>
          ) : (
            <>
              {/* 레이아웃 상 자리만 차지하는 자리표시자 — 실제 사이드바는 fixed/absolute로 별도 렌더링 */}
              <div ref={sidebarPlaceholderRef} style={{ width: '260px', flexShrink: 0 }} />
              <aside
                className="guide-sidebar"
                ref={sidebarRef}
                style={{
                  position: sidebarPin.mode,
                  top: `${sidebarPin.top}px`,
                  left: sidebarLeft ?? 0,
                  visibility: sidebarLeft === null ? 'hidden' : 'visible',
                }}
              >
                {sidebarInner}
              </aside>
            </>
          )
        )}

        {/* 메인 콘텐츠 영역 */}
        <main className={`guide-content-area ${hideSidebar ? 'full-width' : ''}`}>
          {children}
        </main>
      </div>

      {/* 🌟 CSS 디자인 영역 (모바일 감지 및 Hover 효과를 모두 CSS로 처리) */}
      <style jsx global>{`
        /* 공통 레이아웃 배경 */
        .guide-layout-wrapper {
          background: radial-gradient(circle at 50% 0%, #f8fafc 0%, #eef2f6 100%);
          min-height: 100vh;
          /* 🌟 헤더와의 간격 제거 (기존 상단 60px -> 0) */
          padding: 0 20px 60px 20px;
          font-family: 'Pretendard', sans-serif;
          box-sizing: border-box;
        }

        .guide-layout-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: flex-start;
          gap: 40px;
          width: 100%;
          box-sizing: border-box;
        }

        /* PC 사이드바 (글래스모피즘) */
        .guide-sidebar {
          width: 260px;
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 24px;
          /* 🌟 위쪽 여백은 축소하고(좌우, 중간 메뉴 항목 크기는 유지), 아래쪽은 마지막
             메뉴(예: 환불신청)가 카드 하단에 바짝 붙어 답답해 보이지 않도록 여유를 둠 */
          padding: 2px 15px 16px 15px;
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.03), inset 0 0 0 1px rgba(255,255,255,0.5);
          /* 🌟 position/top/left는 더 이상 여기서 sticky로 고정하지 않고, GuideLayout.tsx가
             스크롤/리사이즈에 반응해 계산한 fixed(또는 Footer 근처에서 absolute)를 인라인
             style로 직접 적용합니다. sticky는 .guide-layout-container의 높이(사이드바와
             본문 중 더 큰 쪽)로 "고정 범위"가 제한되는데, 본문이 짧은 페이지(예: 배송지가
             한두 개뿐인 /mypage/profile)에서는 스크롤을 조금만 해도 그 범위가 바닥나
             사이드바가 화면 위로 사라져버리는 문제가 있었습니다. */
          box-sizing: border-box;
        }

        /* 🌟 제목 영역(위쪽) 크기 축소.
           (참고: 이전에는 클래스명이 Header.tsx의 모바일 드로어 헤더와 똑같이 .sidebar-header였는데,
           둘 다 스코프 없는 <style jsx global>을 쓰다 보니 그쪽 padding:24px 20px가 새어 들어와
           의도한 것보다 훨씬 두꺼워 보였습니다. 클래스명을 guide-sidebar-header로 분리해 충돌을
           없애고, 폰트 크기는 그대로 둔 채 세로 padding만 다시 얹어 적정 높이로 맞췄습니다.) */
        .guide-sidebar-header {
          display: flex;
          justify-content: flex-start; /* 왼쪽 정렬 */
          align-items: flex-start;    /* 상단 정렬 */
          gap: 15px;
          font-size: 20px;
          font-weight: 800;
          color: #94a3b8;
          /* 🌟 왼쪽 padding을 .menu-item의 좌측 padding과 정확히 동일한 16px로 맞춰서,
             ❖ 아이콘 박스가 아래 메뉴 버튼 텍스트와 같은 세로선에서 시작하게 함 */
          padding: 20px 0 10px 10px;
          margin-bottom: 6px;
          letter-spacing: -0.3px;
        }

        .sidebar-icon { 
          color: #cbd5e1; 
          font-size: 16px; 
          transform: translateY(3px); 
        }

        .sidebar-menu-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        /* 🌟 메뉴 아이템 디자인 & Hover 효과 (중간 항목 크기는 원래대로 유지) */
        .menu-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 14px 16px;
          font-size: 15px;
          font-weight: 600;
          color: #475569;
          text-decoration: none;
          background-color: transparent;
          border: none;
          border-radius: 14px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          box-sizing: border-box;
        }

        .menu-item:hover {
          background-color: rgba(241, 245, 249, 0.8);
          color: #0f172a;
          transform: translateX(4px);
        }

        .menu-item.active {
          background: linear-gradient(135deg, #ff4b2b 0%, #e63e1f 100%);
          color: #ffffff;
          font-weight: 800;
          box-shadow: 0 8px 16px -4px rgba(255, 75, 43, 0.3);
          transform: translateX(4px);
        }

        .active-icon { opacity: 0.8; }
        .menu-divider { height: 1px; background-color: #f1f5f9; margin: 4px 0; }

        /* 로그아웃 버튼 포인트 컬러 */
        .logout-btn { color: #94a3b8; }
        .logout-btn:hover {
          background-color: #fff1f2;
          color: #e11d48;
          transform: translateX(0);
        }

        /* 메인 콘텐츠 */
        .guide-content-area {
          flex: 1;
          min-width: 0;
          background-color: transparent;
          border-radius: 24px;
          box-sizing: border-box;
          /* 🌟 왼쪽 사이드바와 동일한 헤더 간격(100px)을 그대로 씁니다. 진짜 여분 간격의
             원인은 이 레벨이 아니라 각 money 페이지 컨테이너 자체의 padding-top(48px 등)
             이었고 그건 각 페이지에서 이미 제거했으므로, 여기서 별도로 마진을 상쇄할
             필요가 없습니다(상쇄하면 오히려 사이드바보다 더 위로 올라가 버림). */
        }
        .guide-content-area.full-width { width: 100%; }

        /* =============================================================
           📱 모바일 반응형 처리 (@media 쿼리로 전부 제어)
           ============================================================= */
        @media (max-width: 768px) {
          .guide-layout-wrapper { padding: 0 0 40px 0; overflow-x: hidden; }
          /* 🌟 currentMenu가 고정(fixed)되어 더 이상 흐름 공간을 차지하지 않으므로 gap 제거 */
          .guide-layout-container { flex-direction: column; gap: 0; align-items: stretch; }
          
          /* 사이드바 투명화 및 수평 구조 변경 */
          .guide-sidebar {
            width: 100%;
            position: relative;
            top: 0;
            border: none;
            box-shadow: none;
            background: transparent;
            backdrop-filter: none;
            padding: 0;
            border-radius: 0;
          }

          .guide-sidebar-header, .menu-divider, .active-icon, .logout-icon { display: none; }

          /* 🌟 가로 스와이프 스크롤 영역 + 드래그(스크롤)와 무관하게 완전 고정.
             헤더 바로 아래(top: 헤더 높이)에 틈 없이 딱 붙이고, 4px 여백은
             바깥 여백이 아니라 이 바 자체의 불투명 padding-top으로 만든다.
             (틈을 바깥 margin/top으로 만들면 그 사이로 스크롤되는 콘텐츠가 비쳐 보임) */
          .sidebar-menu-list {
            flex-direction: row;
            overflow-x: auto;
            white-space: nowrap;
            padding: 9px 20px 15px 20px;
            gap: 10px;
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE, Edge */
            -webkit-overflow-scrolling: touch;

            position: fixed;
            left: 0;
            right: 0;
            top: var(--sticky-header-h, 89px);
            z-index: 70;
            background: rgba(248, 250, 252, 0.92);
            backdrop-filter: blur(10px);
          }
          .sidebar-menu-list::-webkit-scrollbar { display: none; }
          .sidebar-menu-list::after { content: ''; padding-right: 15px; }

          /* 모바일 알약 형태 버튼 디자인 */
          .menu-item {
            display: inline-flex;
            justify-content: center;
            gap: 6px;
            width: auto;
            padding: 10px 20px;
            background-color: #ffffff;
            border: 1px solid rgba(226, 232, 240, 0.8);
            border-radius: 20px;
            font-size: 14px;
            flex-shrink: 0;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
            transform: translateY(0);
          }

          /* 모바일에서는 X축 대신 Y축으로 움직이도록 Hover 덮어쓰기 */
          .menu-item:hover { transform: translateY(-2px); background-color: #f8fafc; }
          .menu-item.active { transform: translateY(-2px); border-color: transparent; }
          .logout-btn:hover { transform: translateY(-2px); }

          /* currentMenu(고정 바)가 흐름에서 빠졌으므로, 그 실제 높이(내부 16px 여백 포함)만큼 콘텐츠를 밀어냄 */
          .guide-content-area {
            padding: 0 20px;
            padding-top: var(--sticky-menu-h, 64px);
          }
        }
      `}</style>
    </div>
  );
}