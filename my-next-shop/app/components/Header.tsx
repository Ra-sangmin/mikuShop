'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import {
  ClipboardText, ChatCircleDots, ShoppingCartSimple, MapPin, AirplaneTilt,
  Wallet, Coins, Money, Crown, Info, Scales, BookOpen, PaperPlaneTilt,
  Question, Headset, SignOut, User, FilePlus, CaretDown,
  Notepad, ShieldCheck, Calculator, House, Heart, LockKey, X, ArrowUpRight
} from "@phosphor-icons/react";
import { PURCHASE_MENU, DELIVERY_MENU, menuPath } from './serviceMenus';
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
  textStack: { flexDirection: 'column', justifyContent: 'center', gap: '2px' },
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

  // 🌟 드로어가 열려 있는 동안 뒤쪽 본문이 같이 스크롤되지 않도록 잠급니다.
  useEffect(() => {
    if (!isSidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isSidebarOpen]);

  // 🌟 스크롤을 내리면 헤더를 더 불투명하게 + 그림자를 깊게(데스크탑은 높이도 축약).
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 🌟 헤더의 실제 높이를 CSS 변수(--miku-header-h)로 노출합니다.
  // 모바일에서는 화면 폭(≤480px 등)에 따라 헤더 높이가 72px·89px 로 달라지는데, 본문(main)의
  // padding-top 이 89px 로 고정돼 있어 좁은 화면에서 헤더와 메인 배너 사이에 빈 띠가 생겼습니다.
  // (모바일 헤더는 스크롤해도 높이가 바뀌지 않으므로 이 값으로 본문을 밀어도 덜컹거리지 않습니다)
  useEffect(() => {
    const el = document.querySelector('.miku-header-wrapper') as HTMLElement | null;
    if (!el) return;
    const update = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) document.documentElement.style.setProperty('--miku-header-h', `${h}px`);
    };
    update();
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(update).catch(() => {});
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const menuData = [
    // 🌟 구매대행/배송대행 메뉴는 GuideLayout 사이드바와 공유합니다 (serviceMenus.ts)
    { label: "구매대행", desc: "일본 쇼핑몰 상품, 대신 구매해 드려요", items: PURCHASE_MENU },
    { label: "배송대행", desc: "일본 주소로 받아 한국까지 안전하게", items: DELIVERY_MENU },
    { label: "미쿠짱머니", desc: "예치금 충전 · 이용 내역 · 환불", items: [{ label: '충전 신청', desc: '예치금 충전하기', href: '/mypage/money/charge' }, { label: '이용 내역', desc: '충전·사용 내역 확인', href: '/mypage/money/history' }, { label: '환불 신청', desc: '잔액 환불 요청', href: '/mypage/money/refund' }] },
    { label: "수수료/배송비", desc: "등급 혜택과 요금 기준을 한눈에", items: [{ label: '회원 등급 및 혜택', desc: '등급별 수수료 혜택', href: '/guide/membership' }, { label: '수수료 안내', desc: '대행 수수료 기준', href: '/guide/fee-guide' }, { label: '국제 배송 요금표', desc: '무게·부피별 요금', href: '/guide/shipping-fee' }, { label: '예상 관부과세 안내', desc: '통관 세금 계산 기준', href: '/guide/customs' }] },
    { label: "이용가이드", desc: "처음이라면 여기부터 확인하세요", items: [{ label: '구매대행 방법', desc: '신청부터 수령까지', href: '/guide/purchase-method' }, { label: '배송대행 방법', desc: '신청부터 수령까지', href: '/guide/delivery-method' }, { label: '이용약관', desc: '서비스 이용 규정', href: '/guide/terms' }, { label: '개인정보처리방침', desc: '개인정보 수집·이용', href: '/guide/privacy' }] },
    { label: "고객문의", desc: "궁금한 점은 언제든 물어보세요", items: [{ label: '자주하는 질문', desc: '자주 묻는 내용 모음', href: '/inquiry/faq' }, { label: '카카오톡 문의', desc: '실시간 상담 연결', href: '/inquiry/kakaotalk' }] }
  ];

  // 🌟 현재 보고 있는 페이지가 속한 대분류를 네비게이션에 표시
  // 🌟 via(다른 섹션으로 이동하는 바로가기) 항목은 제외 — 예: /mypage/status에서는
  //    구매대행/배송대행이 아니라 마이페이지만 강조됩니다.
  const isCategoryActive = (items: { href?: string; via?: string }[]) =>
    items.some(it => it.href && !it.via && pathname === menuPath(it.href));

  return {
    isLoggedIn, isSidebarOpen, setIsSidebarOpen, openSection, setOpenSection,
    handleLogoutClick, menuData, isScrolled, isCategoryActive
  };
}

// =================================================================
// 2. 화면 컴포넌트 영역 (View Layer)
// 인라인 스타일 제거, 순수 CSS 클래스 기반으로 마크업 구조화
// =================================================================

// 🌟 메뉴 항목 라벨 → 아이콘 매핑 (데스크탑 드롭다운 / 모바일 사이드바 공용)
function getIconByLabel(itemLabel: string, size: number = 20) {
  const iconProps = { size, weight: "duotone" as const, color: "#d27377" };
  if (itemLabel === '로그아웃') return <SignOut {...iconProps} />;
  switch (itemLabel) {
    case '전체내역': return <ClipboardText {...iconProps} />;
    case '구매 내역': return <ClipboardText {...iconProps} />;
    case '배송 내역': return <ClipboardText {...iconProps} />;
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
}

// 🌟 사이드바 아코디언 대분류 라벨 → 아이콘 매핑
function getCategoryIcon(label: string) {
  const iconProps = { size: 20, weight: "duotone" as const, color: "#d27377" };
  switch (label) {
    case '구매대행': return <ShoppingCartSimple {...iconProps} />;
    case '배송대행': return <AirplaneTilt {...iconProps} />;
    case '미쿠짱머니': return <Wallet {...iconProps} />;
    case '수수료/배송비': return <Scales {...iconProps} />;
    case '이용가이드': return <BookOpen {...iconProps} />;
    case '고객문의': return <Headset {...iconProps} />;
    default: return <ClipboardText {...iconProps} />;
  }
}

// 🌟 데스크탑 네비게이션 아이템 컴포넌트
function NavItem({ label, desc, items, active }: { label: string, desc?: string, items?: any[], active?: boolean }) {
  return (
    <li className={`miku-nav-item ${active ? 'active' : ''}`}>
      <div className="nav-label">
        {label}
        <span className="arrow-icon"><CaretDown size={12} weight="bold" /></span>
      </div>

      {items && (
        <ul className="miku-dropdown-ul">
          <div className="dropdown-pointer"></div>
          <div className="dropdown-inner">
            {desc && (
              <div className="dropdown-head">
                <span className="dropdown-head-label">{label}</span>
                <span className="dropdown-head-desc">{desc}</span>
              </div>
            )}
            {items.map((item: any, index: number) => (
              <li key={index} className="dropdown-li">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="dropdown-link"
                    onClick={(e) => { handleHashLinkClick(item.href)(); item.onClick?.(e); }}
                  >
                    <div className="icon-box">{getIconByLabel(item.label, 21)}</div>
                    <span className="item-copy">
                      <span className="item-text">
                        {item.label}
                        {item.via && (
                          <span className="item-via">{item.via}<ArrowUpRight size={10} weight="bold" /></span>
                        )}
                      </span>
                      {item.desc && <span className="item-desc">{item.desc}</span>}
                    </span>
                  </Link>
                ) : (
                  <div className="dropdown-link" onClick={item.onClick}>
                    <div className="icon-box">{getIconByLabel(item.label, 21)}</div>
                    <span className="item-copy">
                      <span className="item-text">{item.label}</span>
                      {item.desc && <span className="item-desc">{item.desc}</span>}
                    </span>
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
    handleLogoutClick, menuData, isScrolled, isCategoryActive
  } = useHeaderLogic();

  const mypageItems = [
    { label: '내 정보', desc: '회원 정보 확인·수정', href: '/mypage' },
    { label: '전체 구매 내역', desc: '주문 진행 상황 확인', href: '/mypage/status' },
    { label: '나의 배송지 정보', desc: '국내·일본 주소 관리', href: '/mypage/profile' },
    { label: '관심 상품 목록', desc: '찜한 상품 모아보기', href: '/mypage/wishlist' },
  ];

  return (
    <>
      <header className={`miku-header-wrapper ${isScrolled ? 'scrolled' : ''}`}>
        <div className="miku-header-container">
          <Link
            href="/"
            style={{ textDecoration: 'none' }}
            onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })}
          >
            <div style={styles.logoContainer}>
              <img src="/images/logo.png" alt="Miku Logo" style={styles.logoImgRefined} className="header-logo-img" />
              <div style={styles.textStack} className="logo-text-stack">
                <div style={styles.mainTitle} className="header-main-title">미쿠짱</div>
                <div style={styles.subTitle} className="header-sub-title">
                  <ShieldCheck size={13} weight="fill" color="#e0574c" className="header-sub-title-icon" />
                  <span className="header-sub-title-full">구매대행 <strong style={{ color: '#e0574c', fontWeight: 800 }}>14년</strong> 노하우로 믿을 수 있는</span>
                  <span className="header-sub-title-short"><strong style={{ color: '#e0574c', fontWeight: 800 }}>14년</strong> 노하우</span>
                </div>
              </div>
            </div>
          </Link>

          {/* 데스크탑 네비게이션 */}
          <nav className="miku-desktop-nav">
            <ul className="nav-capsule">
              {menuData.map((menu, idx) => (
                <NavItem key={idx} label={menu.label} desc={menu.desc} items={menu.items} active={isCategoryActive(menu.items)} />
              ))}
            </ul>

            <div className="auth-separator"></div>

            {!isLoggedIn ? (
              <div className="nav-actions">
                <Link href="/auth/register" className="nav-join-link">회원가입</Link>
                <Link href="/auth/login" className="nav-login-btn">
                  <User size={15} weight="bold" />
                  로그인
                </Link>
              </div>
            ) : (
              <ul className="nav-capsule nav-capsule-user">
                <NavItem
                  label="마이페이지"
                  desc="내 정보와 주문을 한곳에서 관리"
                  active={isCategoryActive(mypageItems)}
                  items={[...mypageItems, { label: '로그아웃', onClick: handleLogoutClick }]}
                />
              </ul>
            )}
          </nav>
          
          {/* 모바일 햄버거 버튼 */}
          <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)} aria-label="메뉴 열기">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3.5" y1="7" x2="20.5" y2="7"></line>
              <line x1="3.5" y1="12" x2="16" y2="12"></line>
              <line x1="3.5" y1="17" x2="20.5" y2="17"></line>
            </svg>
          </button>
        </div>
      </header>

      {/* 🌟 모바일 사이드바 영역 */}
      <div className={`miku-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/images/logo.png" alt="로고" />
            <div className="sidebar-logo-textstack">
              <div className="sidebar-logo-row">
                <span className="sidebar-logo-title">미쿠짱</span>
                <div className="sidebar-trust-badge">
                  <ShieldCheck size={10} weight="fill" color="#ffd7d3" />
                  <span><strong>14년</strong> 노하우</span>
                </div>
              </div>
              <span className="sidebar-header-eyebrow">JAPAN SHOPPING PARTNER</span>
            </div>
          </div>
          <button className="close-btn" onClick={() => setIsSidebarOpen(false)} aria-label="메뉴 닫기">
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="sidebar-auth-group">
          {!isLoggedIn ? (
            <>
              <Link href="/auth/login" className="auth-btn btn-outline" onClick={() => setIsSidebarOpen(false)}>로그인</Link>
              <Link href="/auth/register" className="auth-btn btn-fill" onClick={() => setIsSidebarOpen(false)}>회원가입</Link>
            </>
          ) : (
            <>
              <Link href="/mypage" className="auth-btn btn-outline" onClick={() => setIsSidebarOpen(false)}>
                <User size={16} weight="bold" /> 마이페이지
              </Link>
              <button className="auth-btn btn-danger" onClick={handleLogoutClick}>
                <SignOut size={16} weight="bold" /> 로그아웃
              </button>
            </>
          )}
        </div>

        <div className="sidebar-accordion-wrapper">
          <div className="sidebar-section-label">
            <span className="sidebar-section-label-text">전체 메뉴</span>
          </div>

          {menuData.map((section, idx) => {
            const isOpen = openSection === idx;
            return (
              <div key={idx} className={`accordion-item ${isOpen ? 'active' : ''}`}>
                <button className={`accordion-header ${isOpen ? 'active' : ''}`} onClick={() => setOpenSection(isOpen ? null : idx)}>
                  <span className="accordion-header-left">
                    <span className="accordion-icon-box">{getCategoryIcon(section.label)}</span>
                    <span className="accordion-label">{section.label}</span>
                  </span>
                  <div className="accordion-arrow"><CaretDown size={14} weight="bold" /></div>
                </button>

                <div className={`accordion-body ${isOpen ? 'open' : ''}`}>
                  <div className="accordion-body-clip">
                    <div className="accordion-body-inner">
                      {section.items.map((item, itemIdx) => (
                        <Link
                          key={itemIdx} href={item.href || '#'}
                          className="accordion-link"
                          onClick={() => { handleHashLinkClick(item.href || '')(); setIsSidebarOpen(false); }}
                        >
                          <span className="accordion-link-icon">{getIconByLabel(item.label, 16)}</span>
                          <span className="accordion-link-text">{item.label}</span>
                          {'via' in item && item.via && (
                            <span className="item-via accordion-via">{item.via}<ArrowUpRight size={10} weight="bold" /></span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sidebar-footer">
          <ShieldCheck size={13} weight="fill" color="#d27377" />
          <span>일본 구매·배송대행, 미쿠짱과 함께 14년</span>
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
          background:
            radial-gradient(70% 160% at 0% 0%, rgba(255, 226, 222, 0.55) 0%, rgba(255, 255, 255, 0) 60%),
            radial-gradient(40% 160% at 100% 0%, rgba(255, 236, 233, 0.45) 0%, rgba(255, 255, 255, 0) 60%),
            linear-gradient(180deg, rgba(255, 248, 247, 0.92) 0%, rgba(255, 255, 255, 0.9) 100%);
          backdrop-filter: blur(14px) saturate(120%);
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
          transition: background 0.35s ease, box-shadow 0.35s ease, backdrop-filter 0.35s ease;
        }
        /* 🌟 Footer 상단 액센트 라인과 짝을 이루는 브랜드 컬러 라인 (헤더 최상단) */
        .miku-header-wrapper::before {
          content: ''; position: absolute; left: 0; right: 0; top: 0; height: 2px; pointer-events: none; z-index: 2;
          background: linear-gradient(90deg, #e3868a 0%, #d27377 40%, #c0606a 70%, #e3868a 100%);
        }
        /* 🌟 딱딱한 1px 회색 실선 대신 양끝이 흐려지는 웜톤 헤어라인 */
        .miku-header-wrapper::after {
          content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 1px; pointer-events: none;
          background: linear-gradient(90deg, rgba(240, 180, 176, 0) 0%, rgba(240, 180, 176, 0.7) 18%, rgba(240, 180, 176, 0.7) 82%, rgba(240, 180, 176, 0) 100%);
        }
        /* 🌟 스크롤을 내리면 불투명도·블러·그림자를 키워 본문 위에 떠 있는 느낌을 줍니다 */
        .miku-header-wrapper.scrolled {
          background:
            radial-gradient(70% 160% at 0% 0%, rgba(255, 232, 229, 0.5) 0%, rgba(255, 255, 255, 0) 60%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(255, 252, 251, 0.95) 100%);
          backdrop-filter: blur(20px) saturate(140%);
          box-shadow: 0 14px 34px -22px rgba(140, 70, 70, 0.55);
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
          transition: padding 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* 🌟 데스크탑 한정 축약 — 모바일에서 헤더 높이가 바뀌면 그 아래 고정 탭 바
           (--sticky-header-h 기준)가 스크롤 중에 따라 움직여 덜컹거리므로 제외합니다. */
        @media (min-width: 1081px) {
          .miku-header-wrapper.scrolled .miku-header-container { padding: 3px 32px; }
          .miku-header-wrapper.scrolled .header-logo-img { height: 54px !important; }
          .miku-header-wrapper.scrolled .header-main-title { font-size: 28px !important; }
        }

        /* 🌟 로고 디자인 (텍스트 섀도우 개선) */
        .logo-link { text-decoration: none; display: block; flex-shrink: 0; }
        .logo-group { display: flex; align-items: center; gap: 12px; }
        
        .logo-text-stack {
          display: flex; flex-direction: column; justify-content: center;
          max-width: 200px; /* 최대 너비를 살짝 여유 있게 조정 */
        }
        /* 🌟 스크롤 축약 시 로고/타이틀이 부드럽게 줄어들도록 */
        .header-logo-img, .header-main-title { transition: height 0.35s cubic-bezier(0.4, 0, 0.2, 1), font-size 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
        .logo-img { height: 56px; width: auto; object-fit: contain; mix-blend-mode: multiply; }
        .header-sub-title-short { display: none; }
        /* 🌟 워드마크: 단색 대신 로즈 그라데이션 텍스트 (인라인 color는 text-fill-color로 덮음) */
        .header-main-title {
          background: linear-gradient(135deg, #e08a8c 0%, #cf7478 45%, #b95d63 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: none !important;
          filter: drop-shadow(0 2px 0 rgba(255, 255, 255, 0.9));
        }
        .header-sub-title {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, #fff3f1 100%) !important;
          box-shadow: 0 4px 12px -7px rgba(210, 115, 119, 0.45), inset 0 1px 0 #ffffff;
        }
        .header-sub-title strong { font-family: 'Pretendard', "Noto Sans KR", sans-serif; }
        
        
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

        /* 🌟 메뉴를 감싸는 유리 캡슐 — 항목이 낱개로 떠다니지 않고 하나의 세그먼트로 묶입니다 */
        .nav-capsule {
          display: flex; align-items: center; gap: 2px;
          list-style: none; margin: 0; padding: 4px;
          border-radius: 100px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 250, 249, 0.6) 100%);
          border: 1px solid rgba(243, 214, 211, 0.95);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 8px 22px -14px rgba(150, 70, 70, 0.4);
          transition: box-shadow 0.35s ease, background 0.35s ease;
        }
        .miku-header-wrapper.scrolled .nav-capsule {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 250, 249, 0.85) 100%);
        }
        .nav-capsule-user { padding: 3px; }

        .auth-separator {
          width: 1px;
          height: 22px;
          background: linear-gradient(to bottom, transparent 0%, #edd5d3 50%, transparent 100%);
          margin: 0 14px;
        }
        .nav-actions { display: flex; align-items: center; gap: 4px; }
        .nav-join-link {
          font-size: 14px; font-weight: 700; letter-spacing: -0.2px; color: #7c6a6e;
          text-decoration: none; padding: 9px 12px; border-radius: 100px;
          transition: color 0.2s ease, background 0.2s ease;
          white-space: nowrap;
        }
        .nav-join-link:hover { color: #b5615f; background: rgba(255, 240, 238, 0.9); }

        .nav-login-btn {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 14.5px;
          font-weight: 700;
          letter-spacing: -0.1px;
          color: #ffffff;
          text-decoration: none;
          padding: 10px 22px 10px 18px;
          border-radius: 100px;
          white-space: nowrap;
          /* 🌟 상단 하이라이트를 배경 레이어로 겹쳐 입체감을 줍니다 */
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0) 55%),
            linear-gradient(135deg, #e89296 0%, #d27377 100%);
          box-shadow: 0 10px 22px -8px rgba(210, 115, 119, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.18);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 28px -8px rgba(210, 115, 119, 0.7), inset 0 0 0 1px rgba(255, 255, 255, 0.24);
          filter: brightness(1.04);
        }

        /* 🌟 네비게이션 아이템 (Hover 시 그라데이션 필 하이라이트) */
        .miku-nav-item { position: relative; padding: 0; cursor: pointer; }
        .nav-label {
          font-family: 'Pretendard', "Noto Sans KR", sans-serif;
          font-size: 15.5px;
          font-weight: 700;
          color: #3a3136;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 9px 15px;
          border-radius: 100px;
          transition: color 0.28s cubic-bezier(0.4, 0, 0.2, 1), background 0.28s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1), transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
          letter-spacing: -0.3px;
          white-space: nowrap;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        /* 🌟 캐럿은 평소엔 거의 드러나지 않게 두고(6개가 나란히 있으면 소음이 됨),
           해당 항목에 올렸을 때만 브랜드 색으로 반전시킵니다 */
        .arrow-icon { display: flex; color: #dcd0d1; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.3s ease; }

        .miku-nav-item:hover .nav-label {
          color: #b5615f;
          background: linear-gradient(135deg, rgba(255, 246, 245, 0.98) 0%, rgba(255, 232, 228, 0.98) 100%);
          box-shadow: 0 10px 22px -12px rgba(210, 115, 119, 0.65), inset 0 0 0 1px rgba(250, 212, 207, 0.9);
        }
        .miku-nav-item:hover .arrow-icon { transform: rotate(180deg); color: #d27377; }

        /* 🌟 현재 보고 있는 페이지가 속한 대분류 — 캡슐 안에서 "선택된 세그먼트"(흰 알약)로 표시 */
        .miku-nav-item.active .nav-label {
          color: #b5615f; font-weight: 800;
          background: #ffffff;
          box-shadow: 0 6px 16px -10px rgba(150, 70, 70, 0.45), inset 0 0 0 1px rgba(245, 214, 211, 0.9);
        }
        .miku-nav-item.active .arrow-icon { color: #e0aead; }
        .miku-nav-item.active .nav-label::before {
          content: ''; width: 6px; height: 6px; border-radius: 50%; margin-right: 3px;
          background: linear-gradient(135deg, #e3868a 0%, #d27377 100%);
          box-shadow: 0 0 0 3px rgba(227, 134, 138, 0.18);
        }

        /* 🌟 드롭다운 메뉴 (순수 CSS 호버 렌더링으로 변경) */
        /* 🌟 호버 판정 영역(ul)은 절대 움직이지 않습니다.
           예전에는 등장 애니메이션(translateY 12px + scale)을 이 ul에 걸었는데, ul이 곧 마우스가
           머물러야 하는 영역이라 전환이 진행되는 0.3초 동안 라벨 아래에 최대 12px의 빈틈이
           생겼습니다. 메뉴가 열리자마자 마우스를 아래로 내리면 그 틈에 빠져 :hover가 끊기고
           메뉴가 닫히거나 옆 항목으로 넘어가 버렸습니다.
           → 세로 이동/확대는 아래의 .dropdown-inner(눈에 보이는 카드)에만 적용하고,
             여기서는 가로 중앙 정렬(translateX)만 정적으로 둡니다. */
        .miku-dropdown-ul {
          position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
          visibility: hidden; opacity: 0;
          /* 위쪽 padding은 라벨과 드롭다운 사이의 투명한 호버 다리(마우스가 지나가도 닫히지 않음) */
          list-style: none; padding: 26px 0 0; margin: 0; z-index: 1000;
          /* 🌟 자기 항목에 마우스가 올라와 있을 때만 마우스를 받습니다.
             드롭다운들은 라벨보다 훨씬 넓어서 가로 범위가 서로 겹치는데(구매대행 445~757,
             배송대행 542~854), 페이드아웃 중인 옆 메뉴가 여전히 보이는 상태라 커서를
             가로채갔습니다. 그래서 "구매대행 → 배송대행 → 구매대행"처럼 빠르게 오간 직후
             아래로 내리면 사라지던 배송대행 메뉴가 커서를 잡아 다시 열렸습니다.
             pointer-events는 전환 대상이 아니라 호버가 풀리는 즉시 반영됩니다. */
          pointer-events: none;
          /* 숨길 때: 0.3초 동안 페이드아웃한 뒤 마지막에 visibility를 끕니다 */
          transition: opacity 0.3s cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear 0.3s;
        }
        .miku-nav-item:hover .miku-dropdown-ul {
          visibility: visible; opacity: 1;
          pointer-events: auto;
          /* 페이드아웃 중인 옆 메뉴보다 항상 위에 그려지도록 */
          z-index: 1001;
          /* 🌟 보일 때는 visibility를 '지연 0'으로 즉시 켭니다.
             visibility에 전환 시간이 걸려 있으면 메뉴가 열린 직후 한두 프레임 동안
             여전히 hidden이라 마우스를 받지 못하고, 그 순간 아래로 내리면 :hover가
             끊겨 메뉴가 닫히거나 옆 항목으로 넘어갔습니다. */
          transition: opacity 0.3s cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear 0s;
        }

        /* 등장 슬라이드는 '보이는 카드'에만 겁니다 (호버 영역과 분리) */
        .dropdown-inner,
        .dropdown-pointer {
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .dropdown-inner { transform: translateY(12px) scale(0.985); }
        .miku-nav-item:hover .dropdown-inner { transform: translateY(0) scale(1); }

        .dropdown-inner {
          background: rgba(255, 255, 255, 0.97);
          backdrop-filter: blur(12px) saturate(130%);
          border: 1px solid rgba(250, 226, 223, 0.9);
          border-radius: 20px;
          padding: 10px 8px;
          min-width: 312px;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
          box-shadow: 0 34px 64px -26px rgba(120, 60, 60, 0.42), 0 4px 14px -8px rgba(15, 23, 42, 0.12);
          position: relative;
          overflow: hidden;
        }
        /* 🌟 상단 액센트는 양끝을 투명하게 흐려, 둥근 모서리와 부딪히는 두꺼운 슬래브 대신
           헤더 하단 헤어라인과 같은 결로 맞춥니다 */
        .dropdown-inner::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, rgba(210, 115, 119, 0) 0%, #d27377 26%, #d27377 74%, rgba(210, 115, 119, 0) 100%);
        }

        .dropdown-pointer {
          position: absolute; top: 20px; left: 50%;
          /* 카드와 같은 타이밍으로 함께 내려오도록 translateY를 맞춥니다 */
          transform: translateX(-50%) translateY(12px) rotate(45deg);
          width: 14px; height: 14px; background-color: #fff;
          border-top: 1px solid rgba(250, 226, 223, 0.95); border-left: 1px solid rgba(250, 226, 223, 0.95);
          z-index: -1;
        }
        .miku-nav-item:hover .dropdown-pointer { transform: translateX(-50%) translateY(0) rotate(45deg); }

        /* 🌟 드롭다운 머리글: 대분류 이름 + 한 줄 설명 */
        .dropdown-head {
          position: relative;
          display: flex; flex-direction: column; gap: 3px;
          padding: 8px 12px 12px; margin: 0 3px 6px;
        }
        .dropdown-head::after {
          content: ''; position: absolute; left: 12px; right: 12px; bottom: 0; height: 1px;
          background: linear-gradient(90deg, #f6dedb 0%, rgba(246, 222, 219, 0) 100%);
        }
        .dropdown-head-label {
          font-size: 10.5px; font-weight: 800; letter-spacing: 0.14em; color: #d27377;
        }
        .dropdown-head-desc { font-size: 13.5px; font-weight: 700; color: #33292f; letter-spacing: -0.4px; word-break: keep-all; }
        .dropdown-li { padding: 1px 3px; }
        .dropdown-link {
          position: relative;
          display: flex; align-items: center; gap: 12px; padding: 9px 26px 9px 12px;
          border-radius: 14px; text-decoration: none; cursor: pointer;
          transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
        }
        /* 🌟 항목 오른쪽 빈 공간에, 호버 시에만 미끄러져 들어오는 얇은 화살표 */
        .dropdown-link::after {
          content: '';
          position: absolute; right: 14px; top: 50%;
          width: 6px; height: 6px;
          border-right: 2px solid #e3b7b5; border-top: 2px solid #e3b7b5;
          transform: translate(-5px, -50%) rotate(45deg);
          opacity: 0;
          transition: opacity 0.22s ease, transform 0.22s ease;
        }
        .dropdown-link:hover::after { opacity: 1; transform: translate(0, -50%) rotate(45deg); }

        /* 🌟 열릴 때 항목이 순차적으로 나타나는 연출 (fill-mode는 backwards만 —
           forwards면 애니메이션 최종 transform이 hover transform을 덮어씁니다) */
        @keyframes miku-dd-in {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .miku-nav-item:hover .dropdown-li { animation: miku-dd-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .miku-nav-item:hover .dropdown-li:nth-child(1) { animation-delay: 0.03s; }
        .miku-nav-item:hover .dropdown-li:nth-child(2) { animation-delay: 0.07s; }
        .miku-nav-item:hover .dropdown-li:nth-child(3) { animation-delay: 0.11s; }
        .miku-nav-item:hover .dropdown-li:nth-child(4) { animation-delay: 0.15s; }
        .miku-nav-item:hover .dropdown-li:nth-child(5) { animation-delay: 0.19s; }
        
        .icon-box {
          width: 40px; height: 40px; border-radius: 13px;
          background: linear-gradient(135deg, #fef7f6 0%, #fbe3e0 100%);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid #f8dcd8;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.95);
        }
        /* 🌟 아이콘이 연한 핑크 칩 위에 연한 핑크로 그려져 거의 보이지 않았습니다.
           (Phosphor가 svg에 fill 속성을 직접 넣기 때문에 CSS로 덮어씁니다) */
        .icon-box svg { fill: #b5555b; transition: fill 0.3s ease; }
        /* 🌟 항목을 "제목 + 한 줄 설명" 2단으로 구성 — 오른쪽이 휑하게 비지 않고
           각 메뉴가 무엇인지 들어가기 전에 알 수 있습니다 */
        .item-copy { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .item-text { font-weight: 700; font-size: 15px; color: #33292f; letter-spacing: -0.4px; transition: color 0.2s; }
        /* 🌟 다른 섹션(마이페이지/이용가이드)으로 이동하는 항목 표시 */
        .item-via {
          display: inline-flex; align-items: center; gap: 2px;
          margin-left: 6px; padding: 2px 6px 2px 7px; border-radius: 6px;
          font-size: 10.5px; font-weight: 700; letter-spacing: -0.2px; line-height: 1.3;
          color: #a0747a; background: #fbf1f0; border: 1px solid #f3dedb;
          vertical-align: 2px; white-space: nowrap;
        }
        .item-via svg { fill: currentColor; }
        .dropdown-link:hover .item-via { color: #b5555b; background: #ffffff; }
        .accordion-via { margin-left: auto; }
        .item-desc {
          font-size: 12.5px; font-weight: 500; color: #9b8b91; letter-spacing: -0.35px; line-height: 1.35;
          word-break: keep-all; transition: color 0.2s;
        }

        .dropdown-link:hover { background-color: #fff8f6; transform: translateX(4px); }
        .dropdown-link:hover .item-text { color: #d27377; }
        .dropdown-link:hover .item-desc { color: #c4938f; }
        .dropdown-link:hover .icon-box {
          background: linear-gradient(135deg, #e3868a 0%, #d27377 100%);
          border-color: transparent;
          box-shadow: 0 6px 16px -4px rgba(210, 115, 119, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.3);
          transform: scale(1.08) rotate(-4deg);
        }
        .dropdown-link:hover .icon-box svg { fill: #ffffff !important; }

        /* 🌟 모바일 햄버거 버튼 */
        .mobile-menu-btn {
          display: none; cursor: pointer; color: #b5615f;
          align-items: center; justify-content: center;
          width: 44px; height: 44px; flex-shrink: 0;
          border-radius: 14px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 60%),
            linear-gradient(135deg, #fff6f5 0%, #ffe6e2 100%);
          border: 1px solid #fbdad6;
          box-shadow: 0 6px 16px -8px rgba(210, 115, 119, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.9);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .mobile-menu-btn svg { width: 24px; height: 24px; transition: transform 0.25s ease; }
        .mobile-menu-btn:hover {
          color: #ffffff;
          background: linear-gradient(135deg, #e3868a 0%, #d27377 100%);
          border-color: transparent;
          box-shadow: 0 8px 18px -6px rgba(210, 115, 119, 0.55);
          transform: translateY(-1px);
        }
        .mobile-menu-btn:active { transform: translateY(0) scale(0.94); }
        .mobile-menu-btn:active svg { transform: scale(0.9); }

        /* 🌟 모바일 사이드바 */
        .miku-sidebar {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: min(86vw, 330px);
          background:
            radial-gradient(130% 55% at 0% 0%, rgba(255, 233, 229, 0.85) 0%, rgba(255, 250, 249, 0) 60%),
            linear-gradient(180deg, #fffaf9 0%, #ffffff 260px);
          z-index: 2001;
          transform: translateX(-102%);
          transition: transform 0.46s cubic-bezier(0.22, 1, 0.36, 1);
          display: flex; flex-direction: column; overflow: hidden;
          border-radius: 0 26px 26px 0;
          box-shadow: 24px 0 60px -14px rgba(150, 70, 70, 0.26), inset -1px 0 0 rgba(255, 255, 255, 0.6);
        }
        .miku-sidebar.open { transform: translateX(0); }
        .miku-sidebar::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; z-index: 3;
          background: linear-gradient(90deg, #e3868a 0%, #d27377 50%, #e3868a 100%);
        }
        /* 🌟 우상단 은은한 글로우 (배경 깊이감) */
        .miku-sidebar::after {
          content: ''; position: absolute; top: -80px; right: -70px;
          width: 220px; height: 220px; border-radius: 50%; pointer-events: none;
          background: radial-gradient(circle, rgba(227, 134, 138, 0.16) 0%, rgba(227, 134, 138, 0) 70%);
        }

        /* 🌟 드로어 머리글: 사이트 곳곳의 히어로 카드와 같은 네이비 그라데이션 + 로즈 글로우 */
        .sidebar-header {
          position: relative; overflow: hidden;
          display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;
          padding: calc(20px + env(safe-area-inset-top)) 18px 34px;
          background:
            radial-gradient(90% 120% at 100% 0%, rgba(227, 134, 138, 0.32) 0%, rgba(227, 134, 138, 0) 60%),
            linear-gradient(135deg, #232a3b 0%, #171c28 60%, #1b1a24 100%);
        }
        .sidebar-header::after {
          content: ''; position: absolute; left: -40px; bottom: -70px; width: 180px; height: 120px; border-radius: 50%;
          background: radial-gradient(circle, rgba(227, 134, 138, 0.22) 0%, rgba(227, 134, 138, 0) 70%);
          pointer-events: none;
        }
        .sidebar-logo { display: flex; align-items: center; gap: 10px; min-width: 0; position: relative; z-index: 1; }
        .sidebar-logo img {
          height: 42px; flex-shrink: 0; border-radius: 12px;
          filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.35));
        }
        .sidebar-logo-textstack { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
        .sidebar-logo-row { display: flex; flex-direction: row; align-items: center; gap: 8px; min-width: 0; }
        .sidebar-header-eyebrow {
          font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; color: #f3b7bc;
          font-family: 'Pretendard', "Noto Sans KR", sans-serif; white-space: nowrap;
        }
        /* 🌟 상단 Header의 타이틀(styles.mainTitle)과 동일한 굵기/자간/그림자로 맞춥니다 */
        .sidebar-logo-title {
          /* 따옴표를 겹쳐 쓰면(font-family: '"Jua", sans-serif') 전체가 하나의 잘못된
             글꼴 이름으로 해석돼 Jua가 적용되지 않습니다. 상단 Header 타이틀은 인라인
             스타일이라 정상 적용되고 있어 둘의 글꼴이 서로 달랐습니다. */
          font-family: "Jua", sans-serif; font-size: 22px; font-weight: bold; color: #ffffff; line-height: 1;
          letter-spacing: 1px; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.35); flex-shrink: 0;
        }
        .sidebar-trust-badge {
          display: flex; align-items: center; gap: 3px; flex-shrink: 0;
          font-size: 10px; font-weight: 700; color: #ffe4e1; white-space: nowrap;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 20px; padding: 2.5px 7px 2.5px 5px; width: fit-content;
          backdrop-filter: blur(6px);
        }
        .sidebar-trust-badge span, .sidebar-trust-badge strong { font-size: inherit; font-family: 'Pretendard', "Noto Sans KR", sans-serif; }
        .sidebar-trust-badge strong { color: #ffffff; font-weight: 800; }

        .close-btn {
          position: relative; z-index: 1;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(255, 255, 255, 0.2); width: 36px; height: 36px; border-radius: 50%;
          color: #ffffff; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .close-btn:hover {
          background: linear-gradient(135deg, #e3868a 0%, #d27377 100%);
          border-color: transparent; color: #ffffff; transform: rotate(90deg);
          box-shadow: 0 6px 14px -4px rgba(210, 115, 119, 0.5);
        }

        /* 🌟 사이드바 인증 버튼 그룹 */
        /* 🌟 네이비 머리글 위로 살짝 겹쳐 올라오는 버튼 카드 */
        .sidebar-auth-group { display: flex; gap: 10px; padding: 0 16px 6px; margin-top: -20px; position: relative; z-index: 2; }
        .auth-btn {
          position: relative; overflow: hidden;
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
          text-align: center; padding: 13px; border-radius: 16px;
          font-weight: 800; font-size: 14.5px; letter-spacing: -0.3px;
          text-decoration: none; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); border: none; cursor: pointer;
        }
        .btn-outline {
          background: #ffffff; color: #5b5257; border: 1px solid #f0dedc;
          box-shadow: 0 12px 26px -14px rgba(15, 23, 42, 0.45);
        }
        .btn-outline:hover { border-color: #e9b7b4; color: #d27377; box-shadow: 0 8px 18px -10px rgba(210, 115, 119, 0.5); }
        /* 🌟 상단 하이라이트를 배경 레이어로 겹쳐 평평한 단색 느낌을 없앱니다.
           (형태를 가진 가상요소로 얹으면 그 경계가 이음새로 보여 오히려 지저분해집니다) */
        .btn-fill {
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0) 55%),
            linear-gradient(135deg, #e89296 0%, #d27377 100%);
          color: #fff;
          box-shadow: 0 12px 24px -12px rgba(210, 115, 119, 0.9);
        }
        .btn-fill:hover { transform: translateY(-1px); box-shadow: 0 16px 28px -12px rgba(210, 115, 119, 0.95); }
        .btn-danger { background: #ffffff; color: #d24a45; border: 1px solid #ffdcd9; box-shadow: 0 12px 26px -14px rgba(15, 23, 42, 0.45); }
        .btn-danger:hover { background: #ffe9e7; }
        .auth-btn:active { transform: scale(0.97); }

        /* 🌟 메뉴 목록 섹션 라벨 */
        .sidebar-section-label { display: flex; align-items: center; gap: 10px; padding: 6px 4px 12px; }
        .sidebar-section-label-text {
          font-size: 11.5px; font-weight: 800; letter-spacing: -0.2px; color: #c29894; flex-shrink: 0;
        }
        .sidebar-section-label::after {
          content: ''; flex: 1; height: 1px;
          background: linear-gradient(90deg, #f3ddda 0%, rgba(243, 221, 218, 0) 100%);
        }

        /* 🌟 모바일 아코디언 메뉴 */
        .sidebar-accordion-wrapper { flex: 1; overflow-y: auto; padding: 14px 16px 28px; scrollbar-width: thin; scrollbar-color: #f3d3d0 transparent; }
        .sidebar-accordion-wrapper::-webkit-scrollbar { width: 5px; }
        .sidebar-accordion-wrapper::-webkit-scrollbar-thumb { background: #f3d3d0; border-radius: 10px; }

        .accordion-item {
          border-radius: 16px; margin-bottom: 4px;
        }

        /* 🌟 "열려있는 대분류"임을 나타내는 색은 헤더 행에만 주고, 하위 메뉴 카드는
           중립 톤으로 분리해 하위 메뉴들이 전부 핑크로 뭉개져 보이지 않도록 합니다 */
        .accordion-header {
          position: relative;
          width: 100%; display: flex; justify-content: space-between; align-items: center;
          background: none; border: none; padding: 12px 12px; color: #0f172a; cursor: pointer; border-radius: 16px;
          transition: background 0.25s ease, box-shadow 0.25s ease;
        }
        .accordion-header:hover { background: rgba(210, 115, 119, 0.05); }
        .accordion-header.active {
          background: linear-gradient(135deg, #fff6f5 0%, #ffeae7 100%);
          box-shadow: inset 0 0 0 1px rgba(251, 218, 214, 0.9), 0 8px 20px -14px rgba(210, 115, 119, 0.75);
        }
        .accordion-header-left { display: flex; align-items: center; gap: 12px; }
        .accordion-icon-box {
          width: 34px; height: 34px; border-radius: 11px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #fdf2f1 0%, #fce8e6 100%); border: 1px solid #fbe2df;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .accordion-header.active .accordion-icon-box {
          background: linear-gradient(135deg, #e3868a 0%, #d27377 100%); border-color: transparent;
          box-shadow: 0 8px 16px -6px rgba(210, 115, 119, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.35);
        }
        .accordion-header.active .accordion-icon-box svg { fill: #ffffff !important; }
        .accordion-label { font-size: 15.5px; font-weight: 800; letter-spacing: -0.4px; transition: color 0.2s; }
        .accordion-header.active .accordion-label { color: #b5615f; }

        .accordion-arrow { color: #cbd5e1; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; }
        .accordion-header.active .accordion-arrow { transform: rotate(-180deg); color: #d27377; }

        /* 🌟 max-height 대신 grid 0fr→1fr로 여닫아, 내용 높이를 임의값으로 추정하지 않고
           정확히 맞춥니다(기존 max-height:500px는 내용이 짧으면 닫힘이 늦게 시작됨). */
        .accordion-body {
          display: grid; grid-template-rows: 0fr;
          transition: grid-template-rows 0.38s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .accordion-body.open { grid-template-rows: 1fr; }
        .accordion-body-clip { overflow: hidden; min-height: 0; }

        .accordion-body-inner {
          position: relative;
          background: #ffffff; border: 1px solid #eef2f6; border-radius: 16px;
          margin: 6px 4px 10px; padding: 8px 8px 8px 10px;
          display: flex; flex-direction: column; gap: 2px;
          box-shadow: 0 12px 26px -20px rgba(15, 23, 42, 0.5);
        }
        /* 🌟 아이콘 칩들을 잇는 세로 레일 — 하위 항목이 한 갈래로 묶여 보이게 함 */
        .accordion-body-inner::before {
          content: ''; position: absolute; left: 33px; top: 18px; bottom: 18px; width: 2px;
          border-radius: 2px;
          background: linear-gradient(180deg, #e8edf3 0%, rgba(232, 237, 243, 0) 100%);
        }

        .accordion-link {
          position: relative;
          display: flex; align-items: center; gap: 10px; font-size: 14px; color: #475569;
          padding: 10px 10px; text-decoration: none; font-weight: 700; border-radius: 12px;
          transition: all 0.2s ease;
        }
        .accordion-link-text { letter-spacing: -0.3px; }
        .accordion-link:active, .accordion-link:hover { background: #fffaf9; color: #d27377; transform: translateX(3px); box-shadow: 0 6px 14px -8px rgba(210, 115, 119, 0.5); }

        .accordion-link-icon {
          width: 28px; height: 28px; border-radius: 9px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #f4f7fa 0%, #e9eef4 100%);
          border: 1px solid #e9eef4;
          transition: all 0.2s ease;
        }
        .accordion-link:hover .accordion-link-icon {
          background: linear-gradient(135deg, #fce8e6 0%, #f9d9d6 100%); border-color: #f7cfcb;
          box-shadow: 0 6px 12px -6px rgba(210, 115, 119, 0.5);
        }

        /* 🌟 열릴 때 하위 항목이 순차적으로 나타나도록(fill-mode는 backwards만 사용 —
           forwards를 쓰면 애니메이션 최종 transform이 hover transform을 덮어씁니다) */
        @keyframes miku-sub-in {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .accordion-body.open .accordion-link {
          animation: miku-sub-in 0.34s cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }
        .accordion-body.open .accordion-link:nth-child(1) { animation-delay: 0.03s; }
        .accordion-body.open .accordion-link:nth-child(2) { animation-delay: 0.07s; }
        .accordion-body.open .accordion-link:nth-child(3) { animation-delay: 0.11s; }
        .accordion-body.open .accordion-link:nth-child(4) { animation-delay: 0.15s; }
        .accordion-body.open .accordion-link:nth-child(5) { animation-delay: 0.19s; }

        /* 🌟 드로어가 열릴 때 상단 요소부터 차례로 올라오는 진입 연출 */
        @keyframes miku-drawer-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .miku-sidebar.open .sidebar-auth-group,
        .miku-sidebar.open .sidebar-section-label,
        .miku-sidebar.open .accordion-item {
          animation: miku-drawer-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }
        .miku-sidebar.open .sidebar-auth-group { animation-delay: 0.08s; }
        .miku-sidebar.open .sidebar-section-label { animation-delay: 0.12s; }
        .miku-sidebar.open .accordion-item:nth-child(2) { animation-delay: 0.16s; }
        .miku-sidebar.open .accordion-item:nth-child(3) { animation-delay: 0.2s; }
        .miku-sidebar.open .accordion-item:nth-child(4) { animation-delay: 0.24s; }
        .miku-sidebar.open .accordion-item:nth-child(5) { animation-delay: 0.28s; }
        .miku-sidebar.open .accordion-item:nth-child(6) { animation-delay: 0.32s; }
        .miku-sidebar.open .accordion-item:nth-child(7) { animation-delay: 0.36s; }

        .sidebar-footer {
          position: relative;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 14px 16px calc(14px + env(safe-area-inset-bottom));
          background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, #fffaf9 100%);
          font-size: 11.5px; font-weight: 700; color: #b98a86; letter-spacing: -0.2px;
        }
        .sidebar-footer::before {
          content: ''; position: absolute; left: 18px; right: 18px; top: 0; height: 1px;
          background: linear-gradient(90deg, rgba(248, 233, 231, 0) 0%, #f6dedb 50%, rgba(248, 233, 231, 0) 100%);
        }

        /* 🌟 오버레이 */
        .miku-sidebar-overlay {
          position: fixed; inset: 0;
          background: linear-gradient(90deg, rgba(74, 32, 32, 0.5) 0%, rgba(15, 23, 42, 0.42) 100%);
          backdrop-filter: blur(6px) saturate(115%);
          z-index: 2000; opacity: 0; visibility: hidden; transition: all 0.4s ease;
        }
        .miku-sidebar-overlay.open { opacity: 1; visibility: visible; }

        /* 🌟 반응형 브레이크포인트 강화 (해상도가 좁아질수록 두 줄로 줄바꿈되지 않도록
           단계적으로 폰트 크기/간격을 줄여갑니다) */
        @media (max-width: 1500px) {
          .miku-header-container { gap: 20px; }
          .miku-desktop-nav { gap: 0; }
          .nav-label { font-size: 15px; padding: 9px 12px; }
        }

        @media (max-width: 1350px) {
          .miku-header-container { padding: 8px 20px; gap: 14px; }
          .miku-desktop-nav { gap: 0; }
          .nav-label { font-size: 14px; padding: 8px 9px; letter-spacing: -0.3px; }
          .nav-login-btn { padding: 9px 16px 9px 13px; font-size: 13.5px; }
          .nav-join-link { display: none; }
          .auth-separator { margin: 0 8px; }
          .logo-text-stack { max-width: 140px; } /* 좁아지면 문구 영역 더 축소 */
        }

        @media (max-width: 1080px) {
          .miku-desktop-nav { display: none; }
          .mobile-menu-btn { display: flex; }
          .miku-header-container { padding: 12px 20px; gap: 10px; }
          .main-title { font-size: 32px; }
          /* 🌟 모바일에서는 "미쿠짱"과 "14년 노하우" 뱃지를 한 줄에 나란히 배치합니다 */
          .logo-text-stack { flex-direction: row !important; align-items: center; gap: 16px; max-width: none; }
          .header-logo-img { height: 54px !important; }
          .header-main-title { font-size: 30px !important; }
          .header-sub-title { font-size: 13.5px !important; padding: 4px 11px 4px 8px !important; gap: 5px !important; }
          .header-sub-title-icon { width: 14px !important; height: 14px !important; }
          .header-sub-title-full { display: none; }
          .header-sub-title-short { display: inline; }
          .miku-header-wrapper ~ main {
            width: 100vw;
            max-width: 100vw;
            /* 🌟 헤더 실제 높이만큼만 밀어 헤더와 첫 콘텐츠(메인 배너) 사이에 빈 띠가 생기지 않게 합니다 */
            padding-top: var(--miku-header-h, 89px);
            box-sizing: border-box;
          }
          /* 🌟 데스크탑과 동일하게 120px로 맞춰야 GuideLayout.tsx의 SIDEBAR_TOP(120)과
             일치합니다 — 예전 105px 값이 남아있어 폭이 좁아지면 사이드바와 본문 콘텐츠의
             상단 위치가 서로 어긋나 보이는 버그가 있었습니다. */
          .miku-header-wrapper ~ main.main-extra-gap { padding-top: 120px; }
        }

        @media (max-width: 480px) {
          .miku-header-container { padding: 10px 16px; gap: 8px; }
          .logo-text-stack { gap: 12px; }
          .header-logo-img { height: 42px !important; }
          .header-main-title { font-size: 24px !important; letter-spacing: 0.5px !important; }
          .header-sub-title { font-size: 11.5px !important; padding: 3.5px 9px 3.5px 7px !important; gap: 4px !important; }
          .header-sub-title-icon { width: 12px !important; height: 12px !important; }
          .mobile-menu-btn { width: 40px; height: 40px; border-radius: 12px; }
          .mobile-menu-btn svg { width: 21px; height: 21px; }
        }
        .main-title { font-size: 32px; }
        
      `}</style>
    </>
  );
}