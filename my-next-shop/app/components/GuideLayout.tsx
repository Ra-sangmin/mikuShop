'use client';

import React, { useEffect, useRef } from 'react';
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

  const handleLogout = async () => {
    if (window.confirm("로그아웃 하시겠습니까?")) {
      await signOut({ redirect: false });
      localStorage.removeItem('user_id');
      alert('로그아웃 되었습니다.');
      window.location.href = '/';
    }
  };

  return { pathname, scrollMenuRef, currentMenu, headerTitle, handleLogout };
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
  const { pathname, scrollMenuRef, currentMenu, headerTitle, handleLogout } = useGuideLayoutLogic(type);

  return (
    <div className="guide-layout-wrapper">
      <div className="guide-layout-container">
        
        {/* 사이드바 영역 */}
        {!hideSidebar && (
          <aside className="guide-sidebar">
            <div className="sidebar-header">
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
          </aside>
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
          padding: 60px 20px;
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
          padding: 10px 15px;
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.03), inset 0 0 0 1px rgba(255,255,255,0.5);
          position: sticky;
          top: 100px;
          box-sizing: border-box;
        }

        /* 🌟 수정된 부분: gap을 4px로 줄여 아이콘과 텍스트를 밀착시킴 */
        .sidebar-header {
          display: flex;
          justify-content: flex-start; /* 왼쪽 정렬 */
          align-items: flex-start;    /* 상단 정렬 */
          gap: 15px; 
          font-size: 20px;
          font-weight: 800;
          color: #94a3b8;
          margin-bottom: 20px;
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

        /* 🌟 메뉴 아이템 디자인 & Hover 효과 */
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
        .menu-divider { height: 1px; background-color: #f1f5f9; margin: 12px 0; }

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
        }
        .guide-content-area.full-width { width: 100%; }

        /* =============================================================
           📱 모바일 반응형 처리 (@media 쿼리로 전부 제어)
           ============================================================= */
        @media (max-width: 768px) {
          .guide-layout-wrapper { padding: 10px 0 40px 0; overflow-x: hidden; }
          .guide-layout-container { flex-direction: column; gap: 20px; align-items: stretch; }
          
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

          .sidebar-header, .menu-divider, .active-icon, .logout-icon { display: none; }

          /* 가로 스와이프 스크롤 영역 */
          .sidebar-menu-list {
            flex-direction: row;
            overflow-x: auto;
            white-space: nowrap;
            padding: 5px 20px 15px 20px;
            gap: 10px;
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE, Edge */
            -webkit-overflow-scrolling: touch;
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

          .guide-content-area { padding: 0 20px; }
        }
      `}</style>
    </div>
  );
}