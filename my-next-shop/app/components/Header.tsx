"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { 
  ClipboardText, ChatCircleDots, ShoppingCartSimple, MapPin, AirplaneTilt, 
  Wallet, Coins, Money, Crown, Info, Scales, BookOpen, PaperPlaneTilt, 
  Question, Headset, SignOut, User, FilePlus 
} from "@phosphor-icons/react";

// ==========================================
// 1. 메인 컴포넌트 (Logic)
// ==========================================
export default function Header() {
  const { data: session, status } = useSession();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

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

  const handleLogout = async () => {
    if (window.confirm("로그아웃 하시겠습니까?")) {
      if (status === "authenticated") await signOut({ redirect: false });
      localStorage.clear();
      setIsLoggedIn(false);
      window.location.href = '/';
    }
  };

  useEffect(() => setIsSidebarOpen(false), [pathname]);

  const menuData = [
    { label: "구매대행", items: [{ label: '전체내역', href: '/mypage/status?tab=전체내역' }, { label: '견적문의', href: '/purchase/quote' }, { label: '구매대행 신청', href: '/purchase/request' }] },
    { label: "배송대행", items: [{ label: '전체내역', href: '/mypage/status?tab=전체내역' }, { label: '일본 배송주소 확인', href: '/delivery/address' }, { label: '배송신청', href: '/delivery/request' }] },
    { label: "미쿠짱머니", items: [{ label: '충전하기', href: '/mypage/money/charge' }, { label: '이용내역', href: '/mypage/money/history' }, { label: '환불신청', href: '/mypage/money/refund' }] },
    { label: "수수료/배송비", items: [{ label: '회원 등급 및 혜택', href: '/guide/membership' }, { label: '수수료 안내', href: '/guide/fee-guide' }, { label: '국제 배송 요금표', href: '/guide/shipping-fee' }] },
    { label: "이용가이드", items: [{ label: '구매대행 방법', href: '/guide/purchase-method' }, { label: '배송대행 방법', href: '/guide/delivery-method' }, { label: '자주하는 질문', href: '/guide/faq' }] },
    { label: "고객문의", items: [{ label: '카카오톡 문의', href: '/contact' }] }
  ];

  return (
    <>
      <HeaderCSS />
      <header className="header-wrapper">
        <div className="header-container">
          {/* 로고 영역: 최소 너비 확보로 메뉴 침범 방지 */}
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={styles.logoContainer}>
              <img src="/images/logo.png" alt="Miku Logo" style={styles.logoImgRefined} />
              <div style={styles.textStack}>
                <div style={styles.mainTitle}>미쿠짱</div>
                <div style={styles.subTitle}>구매대행 14년 노하우로 믿을수 있는</div>
              </div>
            </div>
          </Link>

          {/* 데스크탑 네비게이션: 줄바꿈 방지 및 마이페이지 보호 */}
          <nav className="desktop-nav">
            {menuData.map((menu, idx) => (
              <NavItem key={idx} label={menu.label} items={menu.items} />
            ))}
            {!isLoggedIn ? (
              <Link href="/login" style={{ ...styles.navItemLabel, color: '#555', textDecoration: 'none' }}>
                로그인
              </Link>
            ) : (
              <NavItem label="마이페이지" items={[ { label: '내 정보', href: '/mypage' }, { label: '전체내역', href: '/mypage/status' }, { label: '로그아웃', onClick: handleLogout } ]} />
            )}
          </nav>
          
          <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>☰</button>
        </div>
      </header>

      {/* 모바일 사이드바 */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <img src="/images/logo.png" alt="Logo" style={{ height: '30px' }} />
          <button onClick={() => setIsSidebarOpen(false)} style={{ fontSize: '24px', background: 'none', border: 'none' }}>✕</button>
        </div>
      </div>
      <div className={`overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
    </>
  );
}

// ==========================================
// 2. 하위 컴포넌트 (NavItem)
// ==========================================
function NavItem({ label, items }: { label: string, items?: any[] }) {
  const [isHovered, setIsHovered] = useState(false);

  const getIconByLabel = (itemLabel: string) => {
    const iconProps = { size: 20, weight: "duotone" as const, color: "#d27377" };
    if (itemLabel === '로그아웃') return <SignOut {...iconProps} />;
    switch (itemLabel) {
      case '전체내역': return <ClipboardText {...iconProps} />;
      case '견적문의': return <ChatCircleDots {...iconProps} />;
      case '구매대행 신청': return <ShoppingCartSimple {...iconProps} />;
      case '일본 배송주소 확인': return <MapPin {...iconProps} />;
      case '배송신청': return <AirplaneTilt {...iconProps} />;
      case '충전하기': return <Wallet {...iconProps} />;
      case '이용내역': return <Coins {...iconProps} />;
      case '환불신청': return <Money {...iconProps} />;
      case '회원 등급 및 혜택': return <Crown {...iconProps} />;
      case '수수료 안내': return <Info {...iconProps} />;
      case '국제 배송 요금표': return <Scales {...iconProps} />;
      case '구매대행 방법': return <BookOpen {...iconProps} />;
      case '배송대행 방법': return <PaperPlaneTilt {...iconProps} />;
      case '자주하는 질문': return <Question {...iconProps} />;
      case '카카오톡 문의': return <Headset {...iconProps} />;
      case '내 정보': return <User {...iconProps} />;
      default:
        if (itemLabel.includes('내역')) return <ClipboardText {...iconProps} />;
        if (itemLabel.includes('신청')) return <FilePlus {...iconProps} />;
        return <ShoppingCartSimple {...iconProps} />;
    }
  };

  return (
    <li onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} style={styles.navItemLi}>
      <div style={{ ...styles.navItemLabel, color: isHovered ? '#d27377' : '#555' }}>
        {label}
        <span style={styles.arrowIcon(isHovered)}>▼</span>
      </div>

      {items && isHovered && (
        <ul className="dropdown-ul" style={styles.dropdownUl}>
          <div style={styles.dropdownPointer}></div>
          {items.map((item: any, index: number) => (
            <li key={index} style={{ padding: '2px 8px' }}>
              <Link href={item.href || '#'} style={{ textDecoration: 'none' }} onClick={item.onClick}>
                <div className="dropdown-item-link">
                  <div className="icon-box" style={styles.iconBox}>{getIconByLabel(item.label)}</div>
                  <span style={styles.itemText}>{item.label}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// ==========================================
// 3. 스타일 정의 (Styles) - 파일 하단 분리
// ==========================================

const styles: Record<string, any> = {
  logoContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '12px',
    padding: '5px 0',
    minWidth: '280px', // [수정] 빨간 선 유지 및 메뉴 침범 방지
    flexShrink: 0,
  },
  logoImgRefined: {
    height: '60px', width: 'auto', display: 'block', objectFit: 'contain', mixBlendMode: 'multiply',
  },
  textStack: { display: 'flex', flexDirection: 'column', gap: '0px' },
  mainTitle: {
    marginTop: '20px', fontFamily: '"Jua", sans-serif', fontSize: '42px', fontWeight: 'normal',
    letterSpacing: '5px', lineHeight: '1.1', transform: 'scaleX(1.1)', transformOrigin: 'left center',
    display: 'inline-block', color: '#ce8c83',
    textShadow: `0.5px 0.5px 0 #ce8c83, -0.5px -0.5px 0 #ce8c83, 0.5px -0.5px 0 #ce8c83, -0.5px 0.5px 0 #ce8c83, 0.5px 0 0 #ce8c83, -0.5px 0 0 #ce8c83, 0 0.5px 0 #ce8c83, 0 -0.5px 0 #ce8c83`,
  },
  subTitle: {
    fontFamily: '"Jua", sans-serif', fontSize: '14px', color: '#cc8f76', fontWeight: 'normal',
    letterSpacing: '-0.2px', whiteSpace: 'nowrap', marginTop: '0px',
  },
  navItemLi: { position: 'relative', cursor: 'pointer', padding: '15px 0' },
  navItemLabel: {
    fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center',
    gap: '5px', transition: '0.2s', letterSpacing: '-0.5px',
    whiteSpace: 'nowrap', flexShrink: 0, // [수정] 글자 잘림 방지 핵심
  },
  arrowIcon: (isHovered: boolean) => ({
    fontSize: '10px', color: '#ccc', 
    transform: isHovered ? 'rotate(180deg)' : 'none', 
    transition: '0.3s', flexShrink: 0
  }),
  dropdownUl: {
    position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
    backgroundColor: '#fff', border: '1px solid #f0eada', listStyle: 'none', padding: '8px 0',
    margin: '0', minWidth: '220px', boxShadow: '0 10px 25px rgba(0,0,0,0.06)', zIndex: 1000, borderRadius: '12px'
  },
  dropdownPointer: { position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '12px', height: '12px', backgroundColor: '#fff', borderTop: '1px solid #f0eada', borderLeft: '1px solid #f0eada' },
  iconBox: {
    width: '36px', height: '36px', borderRadius: '11px',
    background: 'linear-gradient(135deg, #fdf5f5 0%, #f7e6e6 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.3s ease'
  },
  itemText: { fontWeight: '700', fontSize: '15px', color: '#4a4a4a', letterSpacing: '-0.3px' }
};

function HeaderCSS() {
  return (
    <style jsx global>{`
      .header-wrapper { 
        width: 100%; 
        background-color: #ffffff; 
        border-bottom: 1px solid #f0f0f0; 
        position: sticky; top: 0; z-index: 1000; 
      }
      .header-container { 
        display: flex; align-items: center; justify-content: space-between; 
        padding: 10px 30px; /* [수정] 좌우 여백 확보로 마이페이지 보호 */
        max-width: 1440px; margin: 0 auto;
        gap: 40px; /* [수정] 로고와 메뉴 사이 최소 안전 거리 */
        box-sizing: border-box;
      }
      .desktop-nav { 
        display: flex; gap: 18px; list-style: none; margin: 0; padding: 0; 
        align-items: center; flex-wrap: nowrap; flex-shrink: 0; 
      }
      .dropdown-item-link { 
        display: flex !important; align-items: center !important; 
        gap: 12px; padding: 10px 16px; font-size: 15px; color: #4b5563; 
        border-radius: 10px; transition: all 0.2s ease; cursor: pointer; width: 100%;
      }
      .dropdown-item-link:hover { background-color: #fdf5f5; color: #d27377; transform: translateX(5px); }
      .dropdown-item-link:hover .icon-box {
        transform: scale(1.1);
        background: linear-gradient(135deg, #e3868a 0%, #d27377 100%) !important;
      }
      .dropdown-item-link:hover .icon-box svg { filter: brightness(0) invert(1); }

      .mobile-menu-btn { display: none; background: none; border: none; font-size: 28px; cursor: pointer; color: #555; }
      .sidebar { position: fixed; top: 0; left: 0; width: 280px; height: 100vh; background-color: #fff; z-index: 1001; padding: 20px; transform: translateX(-100%); transition: transform 0.3s ease; display: flex; flex-direction: column; overflow-y: auto; }
      .sidebar.open { transform: translateX(0); }
      .overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0,0,0,0.5); z-index: 1000; opacity: 0; visibility: hidden; transition: 0.3s; }
      .overlay.open { opacity: 1; visibility: visible; }

      /* 반응형 최적화: 해상도가 줄어들면 간격을 좁히다 특정 시점에서 모바일로 전환 */
      @media (max-width: 1350px) {
        .header-container { padding: 10px 20px; gap: 20px; }
        .desktop-nav { gap: 12px; }
      }
      @media (max-width: 1080px) { /* 모바일 전환 시점을 마이페이지가 잘리기 전으로 조정 */
        .desktop-nav { display: none; }
        .mobile-menu-btn { display: block; }
      }
    `}</style>
  );
}