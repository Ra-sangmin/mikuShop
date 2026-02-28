"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { data: session, status } = useSession();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // 🌟 모바일 사이드바 상태
  const pathname = usePathname();

  // 🌟 NextAuth 세션 정보를 기존 localStorage 기반 로그인 시스템과 동기화
  useEffect(() => {
    const syncAuth = async () => {
      if (status === "authenticated" && session?.user) {
        const dbUserId = (session.user as any).id;
        if (dbUserId) {
          localStorage.setItem('user_id', dbUserId.toString());
          localStorage.setItem('email', session.user.email || '');
          localStorage.setItem('name', session.user.name || '');
          setIsLoggedIn(true);

          // 🌟 기본 배송지 등록 여부 체크 후 미등록 시 리다이렉트
          try {
            const res = await fetch(`/api/users?id=${dbUserId}`);
            const data = await res.json();
            if (data.success && !data.user.defaultAddressId) {
              // 현재 페이지가 이미 프로필 페이지가 아닐 때만 이동
              if (window.location.pathname !== '/mypage/profile') {
                window.location.href = '/mypage/profile?newAddress=true';
              }
            }
          } catch (error) {
            console.error("기본 배송지 체크 실패:", error);
          }
        }
      } else if (status === "unauthenticated") {
        // NextAuth 세션이 없고 localStorage에도 정보가 없다면 로그아웃 상태
        const userId = localStorage.getItem('user_id');
        if (userId) {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      }
    };

    syncAuth();
  }, [session, status]);

  const handleLogout = async () => {
    if (window.confirm("로그아웃 하시겠습니까?")) {
      // 1. NextAuth 로그아웃 (소셜 로그인인 경우)
      if (status === "authenticated") {
        await signOut({ redirect: false });
      }

      // 2. 로컬 스토리지 정보 삭제
      localStorage.removeItem('id');
      localStorage.removeItem('name');
      localStorage.removeItem('email');
      localStorage.removeItem('user_id');

      setIsLoggedIn(false);
      setIsSidebarOpen(false); // 로그아웃 시 사이드바 닫기
      alert('로그아웃 되었습니다.');
      window.location.href = '/';
    }
  };

  // 🌟 페이지 이동 시 사이드바 자동 닫기
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // 🌟 사이드바 열렸을 때 배경 스크롤 방지
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isSidebarOpen]);

  // 🌟 모바일 사이드바를 위한 메뉴 데이터 구조화
  const menuData = [
    {
      label: "구매대행",
      items: [
        { label: '전체내역', href: '/mypage/status?tab=전체내역' },
        { label: '견적문의', href: '/purchase/quote' },
        { label: '구매대행 신청', href: '/purchase/request' },
      ]
    },
    {
      label: "배송대행",
      items: [
        { label: '전체내역', href: '/mypage/status?tab=전체내역' },
        { label: '일본 배송주소 확인', href: '/delivery/address' },
        { label: '배송신청', href: '/delivery/request' },
      ]
    },
    {
      label: "미쿠짱머니",
      items: [
        { label: '충전하기', href: '/mypage/money/charge' },
        { label: '이용내역', href: '/mypage/money/history' },
        { label: '환불신청', href: '/mypage/money/refund' },
      ]
    },
    {
      label: "수수료/배송비",
      items: [
        { label: '회원 등급 및 혜택', href: '/guide/membership' },
        { label: '수수료 안내', href: '/guide/fee-guide' },
        { label: '국제 배송 요금표', href: '/guide/shipping-fee' },
        { label: '예상 관부과세 안내', href: '/guide/customs' },
      ]
    },
    {
      label: "이용가이드",
      items: [
        { label: '구매대행 신청방법', href: '/guide/purchase-method' },
        { label: '배송대행 신청방법', href: '/guide/delivery-method' },
        { label: '자주하는 질문', href: '/guide/faq' },
      ]
    },
    {
      label: "고객문의",
      items: [
        { label: '카카오톡 문의', href: '/contact' },
      ]
    }
  ];

  return (
    <>
      <style jsx>{`
        .header-wrapper {
          width: 100%;
          background-color: #fff;
          border-bottom: 1px solid #eee;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
          max-width: 1350px;
          margin: 0 auto;
        }

        .desktop-nav {
          display: flex;
          gap: 30px;
          list-style: none;
          margin: 0;
          padding: 0;
          align-items: center;
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          font-size: 28px;
          color: #333;
          cursor: pointer;
        }

        /* 🌟 사이드바 CSS */
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: 280px;
          height: 100vh;
          background-color: #fff;
          z-index: 1000;
          padding: 20px;
          box-shadow: 2px 0 15px rgba(0,0,0,0.1);
          transform: translateX(-100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }
        .sidebar.open {
          transform: translateX(0);
        }

        /* 아코디언 메뉴 스타일 */
        .sidebar-section-title {
          font-size: 16px;
          font-weight: 900;
          color: #111;
          padding: 15px 0 10px 0;
          border-bottom: 2px solid #f1f5f9;
          margin-top: 10px;
        }
        .sidebar-link {
          display: block;
          font-size: 14px;
          color: #4b5563;
          padding: 10px 10px;
          text-decoration: none;
          transition: background-color 0.2s;
          border-radius: 8px;
        }
        .sidebar-link:hover {
          background-color: #f8fafc;
          color: #ff4b2b;
          font-weight: bold;
        }

        .overlay {
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background-color: rgba(0,0,0,0.5);
          z-index: 999;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }
        .overlay.open {
          opacity: 1;
          visibility: visible;
        }

        /* -------------------------------------------
           📱 모바일 레이아웃 조정 (768px 이하 스마트폰) 
           ------------------------------------------- */
        @media (max-width: 768px) {
          .desktop-nav {
            display: none; /* 모바일에서는 PC 메뉴 숨김 */
          }
          .mobile-menu-btn {
            display: block; /* 모바일에서는 햄버거 버튼 보임 */
          }
        }
      `}</style>

      {/* 1. 상단 헤더 (PC / Mobile 공통) */}
      <header className="header-wrapper">
        <div className="header-container">
          {/* 로고 영역 (왼쪽) */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="/images/logo.png" alt="Miku Shop" style={{ height: '50px', width: 'auto', display: 'block', objectFit: 'contain' }} />
          </Link>

          {/* PC용 내비게이션 (가운데~오른쪽) */}
          <nav className="desktop-nav">
            {menuData.map((menu, idx) => (
              <NavItem key={idx} label={menu.label} activeColor="#ff4b2b" items={menu.items} />
            ))}

            {/* 로그인 상태에 따른 PC 우측 메뉴 */}
            {!isLoggedIn ? (
              <li style={{ padding: '15px 0' }}>
                <Link href="/login" style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#ff4b2b'} onMouseLeave={(e) => e.currentTarget.style.color = '#333'}>
                  로그인
                </Link>
              </li>
            ) : (
              <NavItem 
                label="마이페이지" 
                activeColor="#ff4b2b"
                items={[
                    { label: '내 정보', href: '/mypage' },
                    { label: '구매대행 상황', href: '/mypage/status?tab=전체내역' },
                    { label: '나의 배송지 정보 수정', href: '/mypage/profile' },
                    { label: '관심목록', href: '/wishlist' },
                    { label: '로그아웃', onClick: handleLogout },
                ]} 
              />
            )}
          </nav>

          {/* 모바일 햄버거 버튼 (오른쪽) */}
          <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
            ☰
          </button>
        </div>
      </header>

      {/* 2. 모바일 사이드바 영역 */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        {/* 상단 닫기 및 로고 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
          <img src="/images/logo.png" alt="로고" style={{ height: '35px' }} />
          <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#999', cursor: 'pointer' }}>✕</button>
        </div>

        {/* 로그인/회원가입 (사이드바 상단 배치) */}
        <div style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
          {!isLoggedIn ? (
            <>
              <Link href="/login" style={{ flex: 1, textAlign: 'center', padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '8px', color: '#333', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>로그인</Link>
              <Link href="/register" style={{ flex: 1, textAlign: 'center', padding: '12px', backgroundColor: '#ff4b2b', borderRadius: '8px', color: '#fff', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>회원가입</Link>
            </>
          ) : (
            <>
              <Link href="/mypage" style={{ flex: 1, textAlign: 'center', padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '8px', color: '#333', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>마이페이지</Link>
              <button onClick={handleLogout} style={{ flex: 1, textAlign: 'center', padding: '12px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>로그아웃</button>
            </>
          )}
        </div>

        {/* 모바일 메뉴 리스트 (아코디언 형태 느낌으로 전개) */}
        <div style={{ flex: 1 }}>
          {menuData.map((section, idx) => (
            <div key={idx} style={{ marginBottom: '15px' }}>
              <div className="sidebar-section-title">{section.label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '5px' }}>
                {section.items.map((item, itemIdx) => (
                  <Link key={itemIdx} href={item.href} className="sidebar-link">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 어두운 배경 오버레이 */}
      <div className={`overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
    </>
  );
}

// 🌟 기존 PC용 호버 메뉴 컴포넌트 완벽 보존
function NavItem({ label, items, activeColor }: { label: string, items?: { label: string, href?: string, onClick?: () => void }[], activeColor?: string }) {
  const [isHovered, setIsHovered] = useState(false);

  const renderLink = (item: { label: string, href?: string, onClick?: () => void }, index: number) => {
    const content = (
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: '12px',
          padding: '10px 15px', 
          fontSize: '15px', 
          color: '#4b5563', 
          textDecoration: 'none',
          borderRadius: '8px',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f8f9fa';
            e.currentTarget.style.color = '#ff4b2b';
            e.currentTarget.style.transform = 'translateX(5px)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#4b5563';
            e.currentTarget.style.transform = 'translateX(0)';
        }}
        onClick={item.onClick}
      >
        <div style={{ 
            width: '32px', height: '32px', borderRadius: '8px', 
            backgroundColor: '#fff5f5', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', fontSize: '16px' 
        }}>
            {index === 0 && '📋'}
            {index === 1 && '✈️'}
            {index === 2 && '⚙️'}
            {index === 3 && '🛒'}
            {index === 4 && '🚪'}
        </div>
        <span style={{ fontWeight: '500', whiteSpace: 'nowrap' }}>{item.label}</span>
      </div>
    );

    if (item.href) {
      return <Link href={item.href} style={{ textDecoration: 'none' }}>{content}</Link>;
    }
    return content;
  };

  return (
    <li 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ position: 'relative', cursor: 'pointer', padding: '15px 0' }}
    >
      <Link href="#" style={{ 
        fontSize: '18px', 
        fontWeight: 'bold', 
        color: isHovered && activeColor ? activeColor : '#333', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        transition: 'color 0.2s'
      }}>
        {label}
        <span style={{ fontSize: '10px', color: isHovered && activeColor ? activeColor : '#999', transition: 'color 0.2s' }}>▼</span>
      </Link>

      {items && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: `translateX(-50%) translateY(${isHovered ? '0' : '10px'})`,
          backgroundColor: '#fff',
          border: '1px solid #eee',
          listStyle: 'none',
          padding: '8px 0',
          margin: '0',
          minWidth: '220px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
          zIndex: 1000,
          borderRadius: '12px',
          opacity: isHovered ? 1 : 0,
          visibility: isHovered ? 'visible' : 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: isHovered ? 'auto' : 'none'
        }}>
          <div style={{
            position: 'absolute',
            top: '-6px',
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: '12px',
            height: '12px',
            backgroundColor: '#fff',
            borderTop: '1px solid #eee',
            borderLeft: '1px solid #eee'
          }}></div>

          {items.map((item, index) => (
            <li key={index} style={{ padding: '2px 8px' }}>
              {renderLink(item, index)}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}