"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { 
  ClipboardText, 
  ChatCircleDots,
  ShoppingCartSimple,
  MapPin,
  AirplaneTilt,
  Wallet,
  Coins,
  Money,
  Crown,
  Info,
  Scales,
  BookOpen,
  PaperPlaneTilt,
  Question,
  Headset,
  SignOut,
  User,
  FilePlus,
  Receipt
} from "@phosphor-icons/react";

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
      <HeaderStyles />
      <header className="header-wrapper">
        <div className="header-container">
          {/* 🌟 수정: 배지 스타일을 없애고 헤더에 자연스럽게 녹아드는 로고 컨테이너 */}
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={styles.logoContainer}>
              <img src="/images/logo.png" alt="Miku Logo" style={styles.logoImgRefined} />
              <div style={styles.textStack}>
                <div style={styles.mainTitle}>미쿠짱</div>
                <div style={styles.subTitle}>구매대행 14년 노하우로 믿을수 있는</div>
              </div>
            </div>
          </Link>

          <nav className="desktop-nav">
            {menuData.map((menu, idx) => (
              <NavItem key={idx} label={menu.label} items={menu.items} />
            ))}
            {!isLoggedIn ? (
              <Link href="/login" style={{ 
                fontSize: '20px', 
                fontWeight: '700', 
                color: '#555', 
                textDecoration: 'none',
                letterSpacing: '-0.5px'
              }}>
                로그인
              </Link>
            ) : (
              <NavItem label="마이페이지" items={[ { label: '내 정보', href: '/mypage' }, { label: '전체내역', href: '/mypage/status' }, { label: '로그아웃', onClick: handleLogout } ]} />
            )}
          </nav>
          <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>☰</button>
        </div>
      </header>

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

function NavItem({ label, items }: { label: string, items?: any[] }) {
  const [isHovered, setIsHovered] = useState(false);

  const getIconByLabel = (itemLabel: string) => {
    // 🌟 톤 다운된 코랄 핑크 색상 적용
    const iconProps = { size: 20, weight: "duotone" as const, color: "#d27377" };

    if (itemLabel === '로그아웃') return <SignOut {...iconProps} />; // ph:sign-out-duotone

    switch (itemLabel) {
      case '전체내역': return <ClipboardText {...iconProps} />; // ph:clipboard-text-duotone
      case '견적문의': return <ChatCircleDots {...iconProps} />; // ph:chat-circle-dots-duotone
      case '구매대행 신청': return <ShoppingCartSimple {...iconProps} />; // ph:shopping-cart-simple-duotone
      case '일본 배송주소 확인': return <MapPin {...iconProps} />; // ph:map-pin-duotone
      case '배송신청': return <AirplaneTilt {...iconProps} />; // ph:airplane-tilt-duotone
      case '충전하기': return <Wallet {...iconProps} />; // ph:wallet-duotone
      case '이용내역': return <Coins {...iconProps} />; // ph:coins-duotone
      case '환불신청': return <Money {...iconProps} />; // ph:money-duotone
      case '회원 등급 및 혜택': return <Crown {...iconProps} />; // ph:crown-duotone
      case '수수료 안내': return <Info {...iconProps} />; // ph:info-duotone
      case '국제 배송 요금표': return <Scales {...iconProps} />; // ph:scales-duotone
      case '구매대행 방법': return <BookOpen {...iconProps} />; // ph:book-open-duotone
      case '배송대행 방법': return <PaperPlaneTilt {...iconProps} />; // ph:paper-plane-tilt-duotone
      case '자주하는 질문': return <Question {...iconProps} />; // ph:question-duotone
      case '카카오톡 문의': return <Headset {...iconProps} />; // ph:headset-duotone
      case '내 정보': return <User {...iconProps} />; // ph:user-duotone
      default:
        if (itemLabel.includes('내역')) return <ClipboardText {...iconProps} />; // ph:clipboard-text-duotone
        if (itemLabel.includes('신청')) return <FilePlus {...iconProps} />; // ph:file-plus-duotone
        return <ShoppingCartSimple {...iconProps} />; // ph:shopping-cart-simple-duotone
    }
  };

  return (
    <li onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} style={styles.navItemLi}>
      {/* 🌟 폰트를 제거하여 기본 폰트로 복구, 크기도 적당하게 조정 */}
      <div style={{ 
        fontSize: '20px', // 고딕 계열에 맞는 깔끔한 크기
        fontWeight: '700', // 메뉴는 약간 두꺼운 게 잘 보여
        color: isHovered ? '#d27377' : '#555', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '5px', 
        transition: '0.2s',
        letterSpacing: '-0.5px' 
      }}>
        {label} 
        <span style={{ fontSize: '10px', color: '#ccc', transform: isHovered ? 'rotate(180deg)' : 'none', transition: '0.3s' }}>▼</span>
      </div>

      {items && isHovered && (
        <ul className="dropdown-ul" style={styles.dropdownUl}>
          <div style={styles.dropdownPointer}></div>
          {items.map((item: any, index: number) => (
            <li key={index} style={{ padding: '2px 8px' }}>
              <Link href={item.href || '#'} style={{ textDecoration: 'none' }} onClick={item.onClick}>
                <div className="dropdown-item-link">
                  <div className="icon-box" style={styles.iconBox}>
                    {getIconByLabel(item.label)}
                  </div>
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
// 1. 전역 스타일 함수 (CSS)
// ==========================================
function HeaderStyles() {
  return (
    <style jsx global>{`
      .header-wrapper { 
        width: 100%; 
        /* 🌟 핵심: 헤더 전체 배경을 따뜻한 크림색으로 설정 */
        background-color: #ffffff; 
        border-bottom: 1px solid #ffffff; /* 부드러운 경계선 */
        position: sticky; 
        top: 0; 
        z-index: 1000; 
      }
      .header-container { display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; max-width: 1280px; margin: 0 auto; }
      .desktop-nav { display: flex; gap: 28px; list-style: none; margin: 0; padding: 0; align-items: center; }

      .dropdown-item-link { 
        display: flex !important; flex-direction: row !important; align-items: center !important; 
        gap: 12px; padding: 10px 16px; font-size: 15px; color: #4b5563; 
        text-decoration: none !important; border-radius: 10px; transition: all 0.2s ease; cursor: pointer; width: 100%; box-sizing: border-box;
      }
      .dropdown-item-link:hover { background-color: #fdf5f5; color: #d27377; transform: translateX(5px); }

      .dropdown-item-link:hover .icon-box {
        transform: scale(1.1);
        background: linear-gradient(135deg, #e3868a 0%, #d27377 100%) !important;
      }
      .dropdown-item-link:hover .icon-box svg {
        filter: brightness(0) invert(1); 
      }

      .mobile-menu-btn { display: none; background: none; border: none; font-size: 28px; cursor: pointer; color: #555; }
      .sidebar { position: fixed; top: 0; left: 0; width: 280px; height: 100vh; background-color: #fff; z-index: 1001; padding: 20px; transform: translateX(-100%); transition: transform 0.3s ease; display: flex; flex-direction: column; overflow-y: auto; }
      .sidebar.open { transform: translateX(0); }
      .overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0,0,0,0.5); z-index: 1000; opacity: 0; visibility: hidden; transition: 0.3s; }
      .overlay.open { opacity: 1; visibility: visible; }

      @media (max-width: 1024px) {
        .desktop-nav { display: none; }
        .mobile-menu-btn { display: block; }
      }
    `}</style>
  );
}

// ==========================================
// 2. 인라인 스타일 객체 (자연스럽게 스며드는 로고)
// ==========================================
const styles: Record<string, React.CSSProperties> = {
  // 🌟 변경: 배경과 그림자가 없는 투명한 컨테이너
  logoContainer: {
    display: 'flex', 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: '12px',
    padding: '5px 0', 
    transition: 'transform 0.2s ease',
  },
  logoImgRefined: {
    height: '60px', 
    width: 'auto', 
    display: 'block', 
    objectFit: 'contain',
    /* 🌟 핵심: 이미지의 흰색 배경을 크림색 헤더와 합성하여 투명하게 만듦 */
    mixBlendMode: 'multiply',
  },
  textStack: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '0px' 
  },
  mainTitle: {
    /* 🌟 위치 잡기 꿀팁: 텍스트 그룹을 위로 20px 이동시켜서 전체 밸런스 조정 */
    marginTop: '20px', 
    
    fontFamily: '"Jua", sans-serif', 
    fontSize: '42px', 
    fontWeight: 'normal', 
    
    /* 🌟 수정 1: 자간을 0px로 넓혀서 아웃라인이 더 깔끔하게 보이도록 함 */
    letterSpacing: '5px', 
    
    /* 🌟 수정 2: 줄 간격을 1.1로 넉넉하게 주어 가독성 확보 */
    lineHeight: '1.1', 
    
    transform: 'scaleX(1.1)', 
    transformOrigin: 'left center',
    display: 'inline-block',

    /* 🌟 핵심 1: 텍스트 색상은 코랄 핑크로 유지 */
    color: '#ce8c83', 
    
    /* 🌟 핵심 2: 깔끔한 2px 아웃라인 추가 (짙은 코랄 핑크 색상) */
    textShadow: `
      0.5px 0.5px 0 #ce8c83,
      -0.5px -0.5px 0 #ce8c83,
      0.5px -0.5px 0 #ce8c83,
      -0.5px 0.5px 0 #ce8c83,
      0.5px 0 0 #ce8c83,
      -0.5px 0 0 #ce8c83,
      0 0.5px 0 #ce8c83,
      0 -0.5px 0 #ce8c83
    `,
  },
  
  subTitle: {
    /* 서브 슬로건도 주아체로 통일하여 귀여운 느낌 극대화 */
    fontFamily: '"Jua", sans-serif',
    fontSize: '14px', /* 본문보다 가독성을 위해 살짝 키움 */
    color: '#cc8f76', 
    fontWeight: 'normal', 
    letterSpacing: '-0.2px', 
    whiteSpace: 'nowrap',
    marginTop: '0px',
  },
  navItemLi: { position: 'relative', cursor: 'pointer', padding: '15px 0' },
  dropdownUl: {
    position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
    backgroundColor: '#fff', border: '1px solid #f0eada', listStyle: 'none', padding: '8px 0',
    margin: '0', minWidth: '220px', boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
    zIndex: 1000, borderRadius: '12px'
  },
  dropdownPointer: { position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '12px', height: '12px', backgroundColor: '#fff', borderTop: '1px solid #f0eada', borderLeft: '1px solid #f0eada' },
  iconBox: { 
    width: '36px', height: '36px', borderRadius: '11px', 
    background: 'linear-gradient(135deg, #fdf5f5 0%, #f7e6e6 100%)', 
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    transition: 'all 0.3s ease'
  },
  itemText: { 
    /* 🌟 주아체 삭제 -> 기본 고딕 폰트로 복구 */
    fontWeight: '700', 
    fontSize: '15px', 
    color: '#4a4a4a', 
    letterSpacing: '-0.3px',
    // marginTop은 폰트마다 높이가 다르니 확인 후 조절해
  }
};