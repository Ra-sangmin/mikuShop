"use client";
import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

interface GuideLayoutProps {
  children: React.ReactNode;
  title: string;
  type?: string;
  hideSidebar?: boolean; 
}

export default function GuideLayout({ children, title, type, hideSidebar = false }: GuideLayoutProps) {
  const pathname = usePathname();
  const scrollMenuRef = useRef<HTMLDivElement>(null);

  const mypageMenu = [
    { label: '내 정보', href: '/mypage' },
    { label: '구매대행 상황', href: '/mypage/status' },
    { label: '나의 배송지 정보 수정', href: '/mypage/profile' },
    { label: '관심목록', href: '/wishlist' },
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

  useEffect(() => {
    if (scrollMenuRef.current) {
      const activeElement = scrollMenuRef.current.querySelector('.active');
      if (activeElement) {
        activeElement.scrollIntoView({ 
          behavior: 'smooth', 
          inline: 'center', 
          block: 'nearest' 
        });
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

  return (
    <div className="layout-wrapper">
      <style jsx global>{`
        .layout-wrapper { background-color: #f8fafc; min-height: 100vh; padding: 40px 20px; }
        .layout-container { max-width: 1200px; margin: 0 auto; display: flex; align-items: flex-start; gap: 40px; }

        /* PC 사이드바 스타일 */
        .guide-sidebar { 
          width: 240px; 
          flex-shrink: 0; 
          background-color: #fff; 
          border: 1px solid #e2e8f0; 
          border-radius: 12px; 
          overflow: hidden; 
          box-shadow: 0 4px 10px rgba(0,0,0,0.02); 
          position: sticky; 
          top: 100px; 
        }
        .guide-sidebar-header { 
          padding: 20px; 
          font-size: 18px; 
          font-weight: 900; 
          color: #0f172a; 
          background-color: #f8fafc; 
          border-bottom: 1px solid #e2e8f0; 
        }
        .guide-sidebar-menu { display: flex; flex-direction: column; }
        .guide-sidebar-item { 
          display: block; 
          width: 100%; 
          padding: 16px 20px; 
          font-size: 15px; 
          font-weight: 600; 
          color: #475569; 
          text-decoration: none; 
          background-color: #fff; 
          border: none; 
          border-bottom: 1px solid #f1f5f9; 
          transition: all 0.2s; 
          cursor: pointer; 
          text-align: left; 
          white-space: nowrap; 
        }
        .guide-sidebar-item:last-child { border-bottom: none; }
        .guide-sidebar-item:hover { color: #ff4b2b; background-color: #fffaf9; }
        .guide-sidebar-item.active { background-color: #ff4b2b !important; color: #fff !important; font-weight: bold; }

        .content-area { flex: 1; min-width: 0; background-color: #fff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #e2e8f0; }

        /* 📱 모바일 대응 최적화 */
        @media (max-width: 768px) {
          .layout-wrapper { padding: 15px 0; overflow-x: hidden; }
          
          /* 🌟 핵심수정: align-items를 stretch로 변경하고 가로 폭을 100%로 보장 */
          .layout-container { flex-direction: column; gap: 15px; align-items: stretch; width: 100%; }
          
          .guide-sidebar { width: 100%; position: relative; top: 0; border: none; box-shadow: none; background-color: transparent; border-radius: 0; }
          .guide-sidebar-header { display: none; }
          
          .guide-sidebar-menu { 
            flex-direction: row; 
            overflow-x: auto; 
            white-space: nowrap; 
            padding: 5px 15px 10px 15px; 
            gap: 10px; 
            scrollbar-width: none; 
            -webkit-overflow-scrolling: touch; 
          }
          .guide-sidebar-menu::-webkit-scrollbar { display: none; }
          .guide-sidebar-menu::after { content: ''; padding-right: 15px; }

          .guide-sidebar-item { 
            display: inline-flex; 
            align-items: center;
            justify-content: center;
            width: auto; 
            border-bottom: none; 
            padding: 10px 18px; 
            background-color: #fff; 
            border: 1px solid #e2e8f0; 
            border-radius: 20px; 
            font-size: 14px; 
            text-align: center; 
            flex-shrink: 0; 
          }
          
          /* 🌟 핵심수정: 인라인 스타일의 폭(width)을 강제로 덮어쓰고 100% 영역을 확보 */
          .content-area { 
            width: 100% !important; 
            box-sizing: border-box !important;
            padding: 0 20px; 
            border-radius: 0; 
            border: none; 
            box-shadow: none; 
            background-color: transparent; 
          }
        }
      `}</style>

      <div className="layout-container">
        {!hideSidebar && (
          <aside className="guide-sidebar">
            <div className="guide-sidebar-header">
              {type === 'mypage' ? '마이페이지' : 
               type === 'fee' ? '수수료/배송비' : 
               type === 'money' ? '미쿠짱머니' : '이용가이드'}
            </div>
            
            <div className="guide-sidebar-menu" ref={scrollMenuRef}>
              {currentMenu.map((item, idx) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={idx} href={item.href || '#'} className={`guide-sidebar-item ${isActive ? 'active' : ''}`}>
                    {item.label}
                  </Link>
                );
              })}
              
              {type === 'mypage' && (
                <button onClick={handleLogout} className="guide-sidebar-item">로그아웃</button>
              )}
            </div>
          </aside>
        )}

        <main className="content-area" style={{ width: hideSidebar ? '100%' : 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}