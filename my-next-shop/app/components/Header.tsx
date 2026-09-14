'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import {
  ClipboardText, ChatCircleDots, ShoppingCartSimple, MapPin, AirplaneTilt,
  Wallet, Coins, Money, Crown, Info, Scales, BookOpen, PaperPlaneTilt,
  Question, Headset, SignOut, User, FilePlus, CaretDown,
  Notepad, ShieldCheck, Calculator, House, Heart, LockKey
} from "@phosphor-icons/react";
import { useMikuAlert } from '@/app/context/MikuAlertContext';

// =================================================================
// 1. 스타일 정의 (Styles Object) - 레이아웃 및 디자인 토큰
// =================================================================
const styles: Record<string, any> = {
  logoContainer: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', padding: '5px 0', flexShrink: 0
  },
  logoImgRefined: {
    height: '66px', width: 'auto', objectFit: 'contain',
    filter: 'drop-shadow(0 3px 8px rgba(206, 140, 131, 0.35))'
  },
  textStack: { display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' },
  mainTitle: {
    fontFamily: '"Jua", sans-serif', fontSize: '32px', fontWeight: 'bold',
    color: '#ce8c83', lineHeight: '1', margin: 0,
    letterSpacing: '1.5px', textShadow: '1px 1px 0px rgba(206, 140, 131, 0.25)'
  },
  subTitle: {
    fontFamily: '"Pretendard", "Noto Sans KR", sans-serif', fontSize: '12.5px', fontWeight: 700,
    color: '#9a4a44', margin: 0, whiteSpace: 'nowrap',
    display: 'flex', alignItems: 'center', gap: '5px', letterSpacing: '-0.1px',
    background: 'linear-gradient(135deg, #fff6f5 0%, #ffece9 100%)',
    border: '1px solid #fbdad6', borderRadius: '20px', padding: '4px 11px 4px 8px', width: 'fit-content'
  },
  navItemLi: { position: 'relative', cursor: 'pointer', padding: '20px 0' },
  iconBox: { 
    width: '38px', height: '38px', borderRadius: '12px', background: '#f8fafc', 
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, 
    transition: 'all 0.3s ease', border: '1px solid #f1f5f9' 
  },
  itemText: { fontWeight: '700', fontSize: '15px', color: '#475569', letterSpacing: '-0.3px' },
};

// 🌟 "/mypage/profile#jp-address-section"처럼 해시가 붙은 메뉴 링크를 클릭했을 때,
// 이미 그 경로+해시에 있으면(예: Header 드롭다운으로 같은 섹션을 다시 클릭) URL이
// 전혀 바뀌지 않아 Next.js Link도, 브라우저의 해시 스크롤도 동작하지 않는 문제가
// 있었습니다. 이 경우만 직접 해당 요소로 스크롤시켜 줍니다.
function handleHashLinkClick(href: string) {
  return () => {
    const hashIndex = href.indexOf('#');
    if (hashIndex === -1) return;
    const path = href.slice(0, hashIndex) || '/';
    const hash = href.slice(hashIndex + 1);
    if (window.location.pathname === path && window.location.hash === `#${hash}`) {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
}

// =================================================================
// 1. 비즈니스 로직 영역 (Business Logic Layer)
// 로그인 연동, 메뉴 데이터, 로그아웃 처리 등 순수 기능 전담
// =================================================================
function useHeaderLogic() {
  const { data: session, status } = useSession();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openSection, setOpenSection] = useState<number | null>(0);
  const pathname = usePathname();
  const { showAlert, showConfirm } = useMikuAlert();

  useEffect(() => {
    const syncAuth = async () => {
      if (status === "authenticated" && session?.user) {
        const dbUserId = (session.user as any).id;
        if (dbUserId) {
          localStorage.setItem('user_id', dbUserId.toString());
          setIsLoggedIn(true);
        }
      } else if (status === "unauthenticated") {
        setIsLoggedIn(!!localStorage.getItem('user_id'));
      }
    };
    syncAuth();
  }, [session, status]);

  const handleLogoutClick = async () => {
    setIsSidebarOpen(false);
    const isConfirmed = await showConfirm('로그아웃 하시겠습니까?');
    if (isConfirmed) {
      if (status === "authenticated") await signOut({ redirect: false });
      localStorage.clear();
      setIsLoggedIn(false);
      showAlert('로그아웃 되었습니다.', 'success');
      setTimeout(() => window.location.href = '/', 1500);
    }
  };

  useEffect(() => setIsSidebarOpen(false), [pathname]);

  const menuData = [
    { label: "구매대행", items: [{ label: '전체내역', href: '/mypage/status?tab=전체내역' }, { label: '견적문의', href: '/purchase/quote' }, { label: '구매대행 신청', href: '/purchase/request' }] },
    { label: "배송대행", items: [{ label: '전체내역', href: '/mypage/status?tab=전체내역' }, { label: '일본 배송주소 확인', href: '/mypage/profile#jp-address-section' }, { label: '배송대행 신청', href: '/delivery/request' }] },
    { label: "미쿠짱머니", items: [{ label: '충전 신청', href: '/mypage/money/charge' }, { label: '이용 내역', href: '/mypage/money/history' }, { label: '환불 신청', href: '/mypage/money/refund' }] },
    { label: "수수료/배송비", items: [{ label: '회원 등급 및 혜택', href: '/guide/membership' }, { label: '수수료 안내', href: '/guide/fee-guide' }, { label: '국제 배송 요금표', href: '/guide/shipping-fee' }, { label: '예상 관부과세 안내', href: '/guide/customs' }] },
    { label: "이용가이드", items: [{ label: '구매대행 방법', href: '/guide/purchase-method' }, { label: '배송대행 방법', href: '/guide/delivery-method' }, { label: '자주하는 질문', href: '/guide/faq' }, { label: '이용약관', href: '/guide/terms' }, { label: '개인정보처리방침', href: '/guide/privacy' }] },
    { label: "고객문의", items: [{ label: '카카오톡 문의', href: '/contact' }] }
  ];

  return {
    isLoggedIn, isSidebarOpen, setIsSidebarOpen, openSection, setOpenSection,
    handleLogoutClick, menuData
  };
}

// =================================================================
// 2. 화면 컴포넌트 영역 (View Layer)
// 인라인 스타일 제거, 순수 CSS 클래스 기반으로 마크업 구조화
// =================================================================

// 🌟 데스크탑 네비게이션 아이템 컴포넌트
function NavItem({ label, items }: { label: string, items?: any[] }) {
  const getIconByLabel = (itemLabel: string) => {
    const iconProps = { size: 20, weight: "duotone" as const, color: "#d27377" };
    if (itemLabel === '로그아웃') return <SignOut {...iconProps} />;
    switch (itemLabel) {
      case '전체내역': return <ClipboardText {...iconProps} />;
      case '견적문의': return <ChatCircleDots {...iconProps} />;
      case '구매대행 신청': return <ShoppingCartSimple {...iconProps} />;
      case '일본 배송주소 확인': return <MapPin {...iconProps} />;
      case '배송대행 신청': return <AirplaneTilt {...iconProps} />;
      case '충전 신청': return <Wallet {...iconProps} />;
      case '이용 내역': return <Coins {...iconProps} />;
      case '환불 신청': return <Money {...iconProps} />;
      case '회원 등급 및 혜택': return <Crown {...iconProps} />;
      case '수수료 안내': return <Info {...iconProps} />;
      case '국제 배송 요금표': return <Scales {...iconProps} />;
      case '예상 관부과세 안내': return <Calculator {...iconProps} />;
      case '구매대행 방법': return <BookOpen {...iconProps} />;
      case '배송대행 방법': return <PaperPlaneTilt {...iconProps} />;
      case '자주하는 질문': return <Question {...iconProps} />;
      case '이용약관': return <Notepad {...iconProps} />;
      case '개인정보처리방침': return <ShieldCheck {...iconProps} />;
      case '카카오톡 문의': return <Headset {...iconProps} />;
      case '내 정보': return <User {...iconProps} />;
      case '나의 배송지 정보': return <House {...iconProps} />;
      case '관심 상품 목록': return <Heart {...iconProps} />;
      case '비밀번호 수정': return <LockKey {...iconProps} />;
      default:
        if (itemLabel.includes('내역')) return <ClipboardText {...iconProps} />;
        if (itemLabel.includes('신청')) return <FilePlus {...iconProps} />;
        return <ShoppingCartSimple {...iconProps} />;
    }
  };

  return (
    <li className="miku-nav-item">
      <div className="nav-label">
        {label}
        <span className="arrow-icon"><CaretDown size={14} weight="bold" /></span>
      </div>

      {items && (
        <ul className="miku-dropdown-ul">
          <div className="dropdown-pointer"></div>
          <div className="dropdown-inner">
            {items.map((item: any, index: number) => (
              <li key={index} className="dropdown-li">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="dropdown-link"
                    onClick={(e) => { handleHashLinkClick(item.href)(); item.onClick?.(e); }}
                  >
                    <div className="icon-box">{getIconByLabel(item.label)}</div>
                    <span className="item-text">{item.label}</span>
                  </Link>
                ) : (
                  <div className="dropdown-link" onClick={item.onClick}>
                    <div className="icon-box">{getIconByLabel(item.label)}</div>
                    <span className="item-text">{item.label}</span>
                  </div>
                )}
              </li>
            ))}
          </div>
        </ul>
      )}
    </li>
  );
}

// 🌟 메인 헤더 컴포넌트
export default function Header() {
  const { 
    isLoggedIn, isSidebarOpen, setIsSidebarOpen, openSection, setOpenSection, 
    handleLogoutClick, menuData 
  } = useHeaderLogic();

  return (
    <>
      <header className="miku-header-wrapper">
        <div className="miku-header-container">
          <Link
            href="/"
            style={{ textDecoration: 'none' }}
            onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })}
          >
            <div style={styles.logoContainer}>
              <img src="/images/logo.png" alt="Miku Logo" style={styles.logoImgRefined} />
              <div style={styles.textStack}>
                <div style={styles.mainTitle}>미쿠짱</div>
                <div style={styles.subTitle}>
                  <ShieldCheck size={13} weight="fill" color="#e0574c" />
                  <span>구매대행 <strong style={{ color: '#e0574c', fontWeight: 800 }}>14년</strong> 노하우로 믿을 수 있는</span>
                </div>
              </div>
            </div>
          </Link>

          {/* 데스크탑 네비게이션 */}
          <nav className="miku-desktop-nav">
            {menuData.map((menu, idx) => (
              <NavItem key={idx} label={menu.label} items={menu.items} />
            ))}
            
            <div className="auth-separator"></div>
            
            {!isLoggedIn ? (
              <Link href="/auth/login" className="nav-login-btn">로그인</Link>
            ) : (
              <NavItem
                label="마이페이지"
                items={[
                  { label: '내 정보', href: '/mypage' },
                  { label: '전체 구매 내역', href: '/mypage/status' },
                  { label: '나의 배송지 정보', href: '/mypage/profile' },
                  { label: '관심 상품 목록', href: '/wishlist' },
                  { label: '로그아웃', onClick: handleLogoutClick }
                ]}
              />
            )}
          </nav>
          
          {/* 모바일 햄버거 버튼 */}
          <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      {/* 🌟 모바일 사이드바 영역 */}
      <div className={`miku-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/images/logo.png" alt="로고" />
            <span>미쿠짱</span>
          </div>
          <button className="close-btn" onClick={() => setIsSidebarOpen(false)}>✕</button>
        </div>

        <div className="sidebar-auth-group">
          {!isLoggedIn ? (
            <>
              <Link href="/auth/login" className="auth-btn btn-outline" onClick={() => setIsSidebarOpen(false)}>로그인</Link>
              <Link href="/auth/register" className="auth-btn btn-fill" onClick={() => setIsSidebarOpen(false)}>회원가입</Link>
            </>
          ) : (
            <>
              <Link href="/mypage" className="auth-btn btn-outline" onClick={() => setIsSidebarOpen(false)}>마이페이지</Link>
              <button className="auth-btn btn-danger" onClick={handleLogoutClick}>로그아웃</button>
            </>
          )}
        </div>

        <div className="sidebar-accordion-wrapper">
          {menuData.map((section, idx) => {
            const isOpen = openSection === idx;
            return (
              <div key={idx} className="accordion-item">
                <button className={`accordion-header ${isOpen ? 'active' : ''}`} onClick={() => setOpenSection(isOpen ? null : idx)}>
                  <span>{section.label}</span>
                  <div className="accordion-arrow"><CaretDown size={14} weight="bold" /></div>
                </button>
                
                <div className={`accordion-body ${isOpen ? 'open' : ''}`}>
                  <div className="accordion-body-inner">
                    {section.items.map((item, itemIdx) => (
                      <Link
                        key={itemIdx} href={item.href || '#'}
                        className="accordion-link"
                        onClick={() => { handleHashLinkClick(item.href || '')(); setIsSidebarOpen(false); }}
                      >
                        <span className="link-bullet"></span>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 모바일 사이드바 오버레이 */}
      <div className={`miku-sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

      {/* ================================================================= */}
      {/* 3. 디자인 영역 (CSS Layer) */}
      {/* ================================================================= */}
      <style jsx global>{`
        /* 🌟 헤더 베이스 (글래스모피즘) */
        .miku-header-wrapper { 
          width: 100%; 
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(226, 232, 240, 0.8);
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: auto !important;
          width: 100vw;
          max-width: 100vw;
          transform: translate3d(0, 0, 0);
          will-change: transform;
          isolation: isolate;
          z-index: 1000; 
          transition: all 0.3s ease;
        }

        .miku-header-wrapper ~ main { padding-top: 84px; }
        /* 🌟 이 값(120px)은 실측 헤더 높이(약 100.5px, 데스크탑 기준)보다 커야 헤더에
           가려지지 않습니다. GuideLayout.tsx의 SIDEBAR_TOP 상수와 반드시 같은 값으로
           맞춰주세요 — 다르면 사이드바와 본문 콘텐츠의 상단 여백이 서로 어긋납니다. */
        .miku-header-wrapper ~ main.main-extra-gap { padding-top: 120px; background-color: #f8fafc; }

        .miku-header-container { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          padding: 8px 32px; 
          max-width: 1440px; 
          margin: 0 auto;
          box-sizing: border-box;
          font-family: 'Pretendard', "Noto Sans KR", sans-serif;
        }

        /* 🌟 로고 디자인 (텍스트 섀도우 개선) */
        .logo-link { text-decoration: none; display: block; flex-shrink: 0; }
        .logo-group { display: flex; align-items: center; gap: 12px; }
        
        .logo-text-stack { 
          display: flex; flex-direction: column; justify-content: center; 
          max-width: 200px; /* 최대 너비를 살짝 여유 있게 조정 */
        }
        .logo-img { height: 56px; width: auto; object-fit: contain; mix-blend-mode: multiply; }
        
        
        .main-title {
          font-family: '"Jua", sans-serif'; 
          font-size: 36px; 
          color: #ce8c83;
          letter-spacing: 2px;
          line-height: 1;
          transform: scaleX(1.05); transform-origin: left;
          text-shadow: 1px 1px 0px rgba(206, 140, 131, 0.3);
        }
        .sub-title { 
          font-family: '"Jua", sans-serif'; 
          font-size: 13px; 
          color: #cc8f76; 
          letter-spacing: -0.3px; 
          margin-top: 2px; 
          line-height: 1.3;
          /* 🌟 줄바꿈 허용으로 변경 */
          white-space: normal;
          word-break: keep-all;
        }

        /* 🌟 데스크탑 네비게이션 */
        .miku-desktop-nav {
          display: flex;
          align-items: center;
          gap: 0px;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .auth-separator {
          width: 1px;
          height: 20px;
          background: linear-gradient(to bottom, transparent 0%, #e2e8f0 50%, transparent 100%);
          margin: 0 10px;
        }

        .nav-login-btn {
          font-size: 14.5px;
          font-weight: 700;
          letter-spacing: -0.1px;
          color: #ffffff;
          text-decoration: none;
          padding: 10px 24px;
          border-radius: 100px;
          background: linear-gradient(135deg, #e3868a 0%, #d27377 100%);
          box-shadow: 0 8px 18px -6px rgba(210, 115, 119, 0.5);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -6px rgba(210, 115, 119, 0.6);
          filter: brightness(1.04);
        }

        /* 🌟 네비게이션 아이템 (Hover 시 그라데이션 필 하이라이트) */
        .miku-nav-item { position: relative; padding: 20px 0; cursor: pointer; }
        .nav-label {
          font-family: 'Pretendard', "Noto Sans KR", sans-serif;
          font-size: 17px;
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 12px;
          border-radius: 100px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          letter-spacing: -0.2px;
          white-space: nowrap;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        .arrow-icon { display: flex; color: #cbd5e1; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }

        .miku-nav-item:hover .nav-label {
          color: #b5615f;
          background: linear-gradient(135deg, #fff6f5 0%, #ffece9 100%);
          box-shadow: 0 4px 14px -6px rgba(210, 115, 119, 0.3);
        }
        .miku-nav-item:hover .arrow-icon { transform: rotate(180deg); color: #d27377; }

        /* 🌟 드롭다운 메뉴 (순수 CSS 호버 렌더링으로 변경) */
        .miku-dropdown-ul {
          position: absolute; top: 100%; left: 50%; transform: translate(-50%, 15px);
          visibility: hidden; opacity: 0;
          list-style: none; padding: 0; margin: 0; z-index: 1000;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .miku-nav-item:hover .miku-dropdown-ul {
          visibility: visible; opacity: 1; transform: translate(-50%, 0);
        }

        .dropdown-inner {
          background-color: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.7);
          border-radius: 22px;
          padding: 14px 10px;
          min-width: 248px;
          box-shadow: 0 24px 48px -14px rgba(15, 23, 42, 0.16);
          position: relative;
          overflow: hidden;
        }
        .dropdown-inner::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #e3868a 0%, #d27377 50%, #e3868a 100%);
        }

        .dropdown-pointer { 
          position: absolute; top: -6px; left: 50%; transform: translateX(-50%) rotate(45deg); 
          width: 14px; height: 14px; background-color: #fff; 
          border-top: 1px solid rgba(226, 232, 240, 0.8); border-left: 1px solid rgba(226, 232, 240, 0.8); 
          z-index: -1;
        }
        
        .dropdown-li { padding: 2px 4px; }
        .dropdown-link { 
          display: flex; align-items: center; gap: 12px; padding: 10px 14px; 
          border-radius: 14px; text-decoration: none; cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .icon-box {
          width: 38px; height: 38px; border-radius: 12px;
          background: linear-gradient(135deg, #fdf2f1 0%, #fce8e6 100%);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid #fbe2df;
        }
        .item-text { font-weight: 600; font-size: 14.5px; color: #475569; letter-spacing: -0.15px; transition: color 0.2s; }

        .dropdown-link:hover { background-color: #fff8f6; transform: translateX(4px); }
        .dropdown-link:hover .item-text { color: #d27377; }
        .dropdown-link:hover .icon-box {
          background: linear-gradient(135deg, #e3868a 0%, #d27377 100%);
          border-color: transparent;
          box-shadow: 0 6px 16px -4px rgba(210, 115, 119, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.3);
          transform: scale(1.08) rotate(-4deg);
        }
        .dropdown-link:hover .icon-box svg { fill: #ffffff !important; }

        /* 🌟 모바일 햄버거 버튼 */
        .mobile-menu-btn { 
          display: none; background: none; border: none; 
          width: 44px; height: 44px; cursor: pointer; color: #0f172a; 
          align-items: center; justify-content: center;
        }
        .mobile-menu-btn svg { width: 28px; height: 28px; }

        /* 🌟 모바일 사이드바 */
        .miku-sidebar { 
          position: fixed; top: 0; left: 0; width: 300px; height: 100vh; 
          background-color: #ffffff; z-index: 2001; 
          transform: translateX(-100%); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 10px 0 30px rgba(0,0,0,0.05);
        }
        .miku-sidebar.open { transform: translateX(0); }

        .sidebar-header { 
          display: flex; justify-content: space-between; align-items: center; 
          padding: 24px 20px; border-bottom: 1px solid #f1f5f9; 
        }
        .sidebar-logo { display: flex; align-items: center; gap: 10px; }
        .sidebar-logo img { height: 36px; mix-blend-mode: multiply; }
        .sidebar-logo span { 
          font-family: '"Jua", sans-serif'; font-size: 26px; color: #ce8c83; 
          letter-spacing: 1px; transform: scaleX(1.05); transform-origin: left;
        }
        
        .close-btn { 
          background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%;
          font-size: 16px; color: #64748b; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center;
        }
        .close-btn:hover { background: #e2e8f0; color: #0f172a; transform: rotate(90deg); }

        /* 🌟 사이드바 인증 버튼 그룹 */
        .sidebar-auth-group { display: flex; gap: 12px; padding: 24px 20px 10px; }
        .auth-btn { 
          flex: 1; text-align: center; padding: 14px; border-radius: 14px; 
          font-weight: 800; font-size: 15px; text-decoration: none; transition: all 0.2s; border: none; cursor: pointer;
        }
        .btn-outline { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
        .btn-fill { background: linear-gradient(135deg, #e3868a 0%, #d27377 100%); color: #fff; box-shadow: 0 4px 12px rgba(210,115,119,0.25); }
        .btn-danger { background: #fff1f2; color: #ef4444; border: 1px solid #ffe4e6; }

        /* 🌟 모바일 아코디언 메뉴 */
        .sidebar-accordion-wrapper { flex: 1; overflow-y: auto; padding: 10px 20px 40px; }
        .accordion-item { border-bottom: 1px solid #f1f5f9; }
        .accordion-item:last-child { border-bottom: none; }

        .accordion-header {
          width: 100%; display: flex; justify-content: space-between; align-items: center;
          background: none; border: none; padding: 20px 0; color: #0f172a; cursor: pointer;
        }
        .accordion-header span { font-size: 16px; font-weight: 800; letter-spacing: -0.5px; transition: color 0.2s; }
        .accordion-header.active span { color: #d27377; }
        
        .accordion-arrow { color: #cbd5e1; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; }
        .accordion-header.active .accordion-arrow { transform: rotate(-180deg); color: #d27377; }

        .accordion-body { max-height: 0; overflow: hidden; transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .accordion-body.open { max-height: 500px; }
        
        .accordion-body-inner { 
          background: #f8fafc; border-radius: 16px; padding: 16px 12px; 
          margin-bottom: 20px; border: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 4px;
        }

        .accordion-link {
          display: flex; align-items: center; font-size: 15px; color: #475569;
          padding: 12px 16px; text-decoration: none; font-weight: 700; border-radius: 12px;
          transition: all 0.2s ease;
        }
        .accordion-link:active, .accordion-link:hover { background: #ffffff; color: #d27377; transform: translateX(4px); box-shadow: 0 4px 10px rgba(0,0,0,0.02); }

        .link-bullet { width: 5px; height: 5px; background-color: #cbd5e1; border-radius: 50%; margin-right: 12px; transition: all 0.2s ease; }
        .accordion-link:active .link-bullet, .accordion-link:hover .link-bullet { background-color: #d27377; transform: scale(1.5); }

        /* 🌟 오버레이 */
        .miku-sidebar-overlay { 
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
          background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px);
          z-index: 2000; opacity: 0; visibility: hidden; transition: all 0.4s ease; 
        }
        .miku-sidebar-overlay.open { opacity: 1; visibility: visible; }

        /* 🌟 반응형 브레이크포인트 강화 (해상도가 좁아질수록 두 줄로 줄바꿈되지 않도록
           단계적으로 폰트 크기/간격을 줄여갑니다) */
        @media (max-width: 1500px) {
          .miku-header-container { gap: 20px; }
          .miku-desktop-nav { gap: 0; }
          .nav-label { font-size: 16px; padding: 9px 10px; }
        }

        @media (max-width: 1350px) {
          .miku-header-container { padding: 8px 20px; gap: 14px; }
          .miku-desktop-nav { gap: 0; }
          .nav-label { font-size: 14px; padding: 8px 8px; letter-spacing: -0.3px; }
          .nav-login-btn { padding: 9px 18px; font-size: 13.5px; }
          .logo-text-stack { max-width: 140px; } /* 좁아지면 문구 영역 더 축소 */
        }

        @media (max-width: 1080px) { 
          .miku-desktop-nav { display: none; }
          .mobile-menu-btn { display: flex; }
          .miku-header-container { padding: 12px 20px; }
          .main-title { font-size: 32px; }
          .logo-text-stack { display: none; } /* 아주 좁은 화면에서는 문구 숨김 처리 */
          .miku-header-wrapper ~ main {
            width: 100vw;
            max-width: 100vw;
            padding-top: 89px;
            box-sizing: border-box;
          }
          /* 🌟 데스크탑과 동일하게 120px로 맞춰야 GuideLayout.tsx의 SIDEBAR_TOP(120)과
             일치합니다 — 예전 105px 값이 남아있어 폭이 좁아지면 사이드바와 본문 콘텐츠의
             상단 위치가 서로 어긋나 보이는 버그가 있었습니다. */
          .miku-header-wrapper ~ main.main-extra-gap { padding-top: 120px; }
        }.main-title { font-size: 32px; }
        
      `}</style>
    </>
  );
}