"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { 
  ClipboardText, ChatCircleDots, ShoppingCartSimple, MapPin, AirplaneTilt, 
  Wallet, Coins, Money, Crown, Info, Scales, BookOpen, PaperPlaneTilt, 
  Question, Headset, SignOut, User, FilePlus, CaretDown 
} from "@phosphor-icons/react";

// ==========================================
// 1. 메인 컴포넌트 (Logic)
// ==========================================
export default function Header() {
  const { data: session, status } = useSession();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // 🌟 모바일 아코디언 메뉴 상태 (기본으로 첫 번째 메뉴 열어두기: 0)
  const [openSection, setOpenSection] = useState<number | null>(0);
  
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
          {/* 🌟 로고 영역 */}
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={styles.logoContainer}>
              <img src="/images/logo.png" alt="Miku Logo" style={styles.logoImgRefined} />
              <div style={styles.textStack}>
                <div style={styles.mainTitle}>미쿠짱</div>
                <div style={styles.subTitle}>구매대행 14년 노하우로 믿을수 있는</div>
              </div>
            </div>
          </Link>

          {/* 🌟 데스크탑 네비게이션 */}
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

      {/* ==========================================
          2. 모바일 사이드바 영역
      ========================================== */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        {/* 상단 닫기 및 로고 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
          <img src="/images/logo.png" alt="로고" style={{ height: '35px' }} />
          <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#999', cursor: 'pointer' }}>✕</button>
        </div>

        {/* 로그인/회원가입 버튼 */}
        <div style={{ display: 'flex', gap: '10px', margin: '24px 0' }}>
          {!isLoggedIn ? (
            <>
              <Link href="/login" style={{ flex: 1, textAlign: 'center', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#475569', textDecoration: 'none', fontWeight: '800', fontSize: '15px', border: '1px solid #e2e8f0' }}>로그인</Link>
              <Link href="/register" style={{ flex: 1, textAlign: 'center', padding: '14px', background: 'linear-gradient(135deg, #e3868a 0%, #d27377 100%)', borderRadius: '12px', color: '#fff', textDecoration: 'none', fontWeight: '800', fontSize: '15px', boxShadow: '0 4px 12px rgba(210,115,119,0.2)' }}>회원가입</Link>
            </>
          ) : (
            <>
              <Link href="/mypage" style={{ flex: 1, textAlign: 'center', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#475569', textDecoration: 'none', fontWeight: '800', fontSize: '15px', border: '1px solid #e2e8f0' }}>마이페이지</Link>
              <button onClick={handleLogout} style={{ flex: 1, textAlign: 'center', padding: '14px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#ef4444', fontWeight: '800', fontSize: '15px', cursor: 'pointer' }}>로그아웃</button>
            </>
          )}
        </div>

        {/* 🌟 프리미엄 아코디언 메뉴 리스트 */}
        <div className="sidebar-accordion-wrapper">
          {menuData.map((section, idx) => {
            const isOpen = openSection === idx;
            return (
              <div key={idx} className="sidebar-accordion-group">
                <button 
                  className={`sidebar-section-btn ${isOpen ? 'active' : ''}`}
                  onClick={() => setOpenSection(isOpen ? null : idx)}
                >
                  <span>{section.label}</span>
                  <div className="sidebar-arrow">
                    <CaretDown size={14} weight="bold" />
                  </div>
                </button>
                
                <div className={`sidebar-content ${isOpen ? 'open' : ''}`}>
                  <div className="sidebar-content-inner">
                    {section.items.map((item, itemIdx) => (
                      <Link 
                        key={itemIdx} 
                        href={item.href} 
                        className="sidebar-link"
                        onClick={() => setIsSidebarOpen(false)} 
                      >
                        <span className="sidebar-bullet"></span>
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

      {/* 3. 어두운 배경 오버레이 */}
      <div className={`overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
    </>
  );
}

// ==========================================
// 3. 데스크탑 NavItem 컴포넌트
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
        {/* 🌟 텍스트 화살표를 고급스러운 CaretDown 아이콘으로 교체 */}
        <span style={styles.arrowIcon(isHovered)}>
          <CaretDown size={14} weight="bold" />
        </span>
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
// 4. 인라인 스타일 (Styles)
// ==========================================
const styles: Record<string, any> = {
  logoContainer: {
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', padding: '5px 0', minWidth: '280px', flexShrink: 0,
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
    fontFamily: '"Jua", sans-serif', fontSize: '14px', color: '#cc8f76', fontWeight: 'normal', letterSpacing: '-0.2px', whiteSpace: 'nowrap', marginTop: '0px',
  },
  navItemLi: { position: 'relative', cursor: 'pointer', padding: '15px 0' },
  navItemLabel: {
    fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center',
    gap: '5px', transition: '0.2s', letterSpacing: '-0.5px', whiteSpace: 'nowrap', flexShrink: 0,
  },
  // 🌟 화살표 애니메이션 및 색상 동기화 업데이트
  arrowIcon: (isHovered: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: isHovered ? '#d27377' : '#cbd5e1', 
    transform: isHovered ? 'rotate(180deg)' : 'rotate(0deg)', 
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
    flexShrink: 0,
    marginLeft: '2px',
  }),
  dropdownUl: {
    position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#fff', border: '1px solid #f0eada', listStyle: 'none', padding: '8px 0', margin: '0', minWidth: '220px', boxShadow: '0 10px 25px rgba(0,0,0,0.06)', zIndex: 1000, borderRadius: '12px'
  },
  dropdownPointer: { position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '12px', height: '12px', backgroundColor: '#fff', borderTop: '1px solid #f0eada', borderLeft: '1px solid #f0eada' },
  iconBox: {
    width: '36px', height: '36px', borderRadius: '11px', background: 'linear-gradient(135deg, #fdf5f5 0%, #f7e6e6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.3s ease'
  },
  itemText: { fontWeight: '700', fontSize: '15px', color: '#4a4a4a', letterSpacing: '-0.3px' }
};

// ==========================================
// 5. 전역 스타일 (CSS)
// ==========================================
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
        padding: 10px 30px; 
        max-width: 1440px; margin: 0 auto;
        gap: 40px; 
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

      /* ==========================================
         🌟 프리미엄 아코디언 메뉴 스타일
      ========================================== */
      .sidebar-accordion-wrapper {
        flex: 1;
        overflow-y: auto;
        padding-bottom: 30px;
      }
      
      .sidebar-accordion-group {
        border-bottom: 1px solid #f1f5f9;
      }
      .sidebar-accordion-group:last-child {
        border-bottom: none;
      }

      .sidebar-section-btn {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: none;
        border: none;
        padding: 20px 10px;
        color: #334155;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      .sidebar-section-btn span {
        font-size: 16px;
        font-weight: 800;
        letter-spacing: -0.5px;
      }
      .sidebar-section-btn.active {
        color: #d27377;
      }

      /* 🌟 모바일 화살표 애니메이션에 SVG 컨테이너 설정 추가 */
      .sidebar-arrow {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #cbd5e1;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .sidebar-section-btn.active .sidebar-arrow {
        transform: rotate(-180deg);
        color: #d27377;
      }

      .sidebar-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .sidebar-content.open {
        max-height: 400px;
      }

      .sidebar-content-inner {
        background-color: #f8fafc;
        border-radius: 16px;
        padding: 12px 10px;
        margin: 0 10px 20px 10px;
        border: 1px solid #f1f5f9;
      }

      .sidebar-link {
        display: flex;
        align-items: center;
        font-size: 15px;
        color: #475569;
        padding: 12px 16px;
        text-decoration: none;
        font-weight: 600;
        border-radius: 12px;
        transition: all 0.2s ease;
      }
      
      .sidebar-link:hover, .sidebar-link:active {
        background-color: #fff;
        color: #d27377;
        box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        transform: translateX(4px);
      }

      .sidebar-bullet {
        width: 5px;
        height: 5px;
        background-color: #cbd5e1;
        border-radius: 50%;
        margin-right: 12px;
        transition: all 0.2s ease;
      }
      .sidebar-link:hover .sidebar-bullet, .sidebar-link:active .sidebar-bullet {
        background-color: #d27377;
        transform: scale(1.5);
      }

      /* 오버레이 */
      .overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0,0,0,0.5); z-index: 1000; opacity: 0; visibility: hidden; transition: 0.3s; }
      .overlay.open { opacity: 1; visibility: visible; }

      /* 반응형 */
      @media (max-width: 1350px) {
        .header-container { padding: 10px 20px; gap: 20px; }
        .desktop-nav { gap: 12px; }
      }
      @media (max-width: 1080px) { 
        .desktop-nav { display: none; }
        .mobile-menu-btn { display: block; }
      }
    `}</style>
  );
}