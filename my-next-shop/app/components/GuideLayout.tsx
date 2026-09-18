'use client';

import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useMikuAlert } from '@/app/context/MikuAlertContext';
import {
  User, ClipboardText, House, Heart, ShoppingCartSimple, PaperPlaneTilt, Question,
  Notepad, ShieldCheck, Crown, Info, Scales, Calculator, Wallet, Coins, Money,
  BookOpen, UserCircle, CaretRight, SignOut,
  ChatCircleDots, MapPin, AirplaneTilt, ArrowUpRight, Headset, Megaphone,
} from '@phosphor-icons/react';
import { PURCHASE_MENU, DELIVERY_MENU, menuPath, type MenuVia } from './serviceMenus';

// 🌟 PC 사이드바 메뉴 아이콘 (라벨 → 아이콘)
const MENU_ICONS: Record<string, React.ElementType> = {
  '구매 내역': ClipboardText,
  '배송 내역': ClipboardText,
  '구매대행 방법': BookOpen,
  '배송대행 방법': PaperPlaneTilt,
  '견적문의': ChatCircleDots,
  '구매대행 신청': ShoppingCartSimple,
  '일본 배송주소 확인': MapPin,
  '배송대행 신청': AirplaneTilt,
  '내 정보': User,
  '전체 구매 내역': ClipboardText,
  '나의 배송지 정보': House,
  '관심 상품 목록': Heart,
  '구매대행 신청방법': ShoppingCartSimple,
  '배송대행 신청방법': PaperPlaneTilt,
  '자주하는 질문': Question,
  '카카오톡 문의': Headset,
  '공지사항': Megaphone,
  '이용약관': Notepad,
  '개인정보처리방침': ShieldCheck,
  '회원 등급 및 혜택': Crown,
  '수수료 안내': Info,
  '국제 배송 요금표': Scales,
  '예상 관부과세 안내': Calculator,
  '충전 신청': Wallet,
  '이용 내역': Coins,
  '환불 신청': Money,
};

// 🌟 PC 사이드바 제목 영역 (섹션별 아이콘 + 영문 보조 라벨)
const SECTION_META: Record<string, { icon: React.ElementType; eyebrow: string }> = {
  mypage: { icon: UserCircle, eyebrow: 'MY PAGE' },
  guide: { icon: BookOpen, eyebrow: 'USER GUIDE' },
  fee: { icon: Scales, eyebrow: 'FEES & SHIPPING' },
  money: { icon: Wallet, eyebrow: 'MIKU MONEY' },
  contact: { icon: Headset, eyebrow: 'CUSTOMER SUPPORT' },
  purchase: { icon: ShoppingCartSimple, eyebrow: 'BUYING SERVICE' },
  delivery: { icon: AirplaneTilt, eyebrow: 'SHIPPING SERVICE' },
};

// =================================================================
// 1. 비즈니스 로직 영역 (Business Logic Layer)
// 🌟 모바일 가로 탭 바의 마지막 가로 스크롤 위치 (페이지 이동으로 레이아웃이 다시 마운트돼도 유지)
let lastMenuScrollLeft = 0;

// 불필요한 디자인 상태(isMobile, isHovered)를 지우고 순수 기능만 남겼습니다.
// =================================================================
function useGuideLayoutLogic(rawType?: string) {
  // 🌟 ORDER_TYPE(PURCHASE/DELIVERY)처럼 대문자로 넘어오는 경우도 같은 메뉴를 쓰도록 소문자로 통일
  const type = rawType?.toLowerCase();
  const pathname = usePathname();
  const { status } = useSession();
  const { showAlert, showConfirm } = useMikuAlert();
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
    { label: '전체 구매 내역', href: '/mypage/status' },
    { label: '나의 배송지 정보', href: '/mypage/profile' },
    { label: '관심 상품 목록', href: '/mypage/wishlist' },
  ];

  // 🌟 Header.tsx의 상단 메뉴와 같은 정의(serviceMenus.ts)를 사용합니다.
  const purchaseMenu = PURCHASE_MENU;
  const deliveryMenu = DELIVERY_MENU;

  const guideMenu = [
    { label: '구매대행 신청방법', href: '/guide/purchase-method' },
    { label: '배송대행 신청방법', href: '/guide/delivery-method' },
    { label: '공지사항', href: '/guide/notice' },
    { label: '이용약관', href: '/guide/terms' },
    { label: '개인정보처리방침', href: '/guide/privacy' },
  ];

  // 🌟 고객문의 섹션 (app/inquiry 하위 페이지들)
  const contactMenu = [
    { label: '자주하는 질문', href: '/inquiry/faq' },
    { label: '카카오톡 문의', href: '/inquiry/kakaotalk' },
  ];

  const feeMenu = [
    { label: '회원 등급 및 혜택', href: '/guide/membership' },
    { label: '수수료 안내', href: '/guide/fee-guide' },
    { label: '국제 배송 요금표', href: '/guide/shipping-fee' },
    { label: '예상 관부과세 안내', href: '/guide/customs' },
  ];

  const moneyMenu = [
    { label: '충전 신청', href: '/mypage/money/charge' },
    { label: '이용 내역', href: '/mypage/money/history' },
    { label: '환불 신청', href: '/mypage/money/refund' },
  ];

  const currentMenu: { label: string; href: string; via?: MenuVia }[] =
    type === 'mypage' ? mypageMenu : 
    type === 'guide' ? guideMenu : 
    type === 'fee' ? feeMenu : 
    type === 'money' ? moneyMenu :
    type === 'purchase' ? purchaseMenu :
    type === 'delivery' ? deliveryMenu :
    type === 'contact' ? contactMenu : [];

  const headerTitle =
    type === 'mypage' ? '마이페이지' :
    type === 'fee' ? '수수료/배송비' :
    type === 'money' ? '미쿠짱머니' :
    type === 'purchase' ? '구매대행' :
    type === 'delivery' ? '배송대행' :
    type === 'contact' ? '고객문의' : '이용가이드';

  // 🌟 모바일 가로 탭 바에서 현재 메뉴가 항상 보이도록 가운데로 자동 스크롤.
  // - 첫 렌더는 isMobile=false(데스크탑 트리)로 시작했다가 곧바로 모바일 트리로 바뀌는데, 예전엔
  //   pathname 만 보고 있어서 모바일 탭 바가 새로 마운트된 뒤(scrollLeft 0)에는 다시 실행되지 않았습니다.
  //   → 헤더 메뉴에서 "관심 상품 목록"처럼 오른쪽에 있는 메뉴로 들어오면 탭 바가 맨 왼쪽에 머물러
  //     현재 메뉴가 화면 밖에 있었음. isMobile 도 의존성에 넣고, 마운트 직후 한 프레임 뒤에 계산합니다.
  // - scrollIntoView 는 페이지 세로 스크롤까지 건드릴 수 있어 컨테이너의 scrollLeft 만 직접 옮깁니다.
  // - 페이지를 옮기면 GuideLayout 이 새로 마운트되어 탭 바가 scrollLeft 0 에서 다시 그려지므로
  //   (맨 왼쪽으로 "깜빡" 튀었다가 다시 스크롤됨), 직전 페이지의 가로 스크롤 위치를 모듈 변수에 기억해
  //   두었다가 마운트 직후 애니메이션 없이 그대로 복원한 뒤 새 메뉴 위치로 부드럽게 이동합니다.
  useLayoutEffect(() => {
    if (!isMobile) return;
    const list = scrollMenuRef.current;
    if (list && lastMenuScrollLeft > 0) list.scrollLeft = lastMenuScrollLeft;
  }, [isMobile, pathname]);

  useEffect(() => {
    if (!isMobile) return;
    const list = scrollMenuRef.current;
    let raf = 0;
    // (언마운트 후 cleanup 에서 읽으면 DOM 에서 떨어진 요소라 0 이 나오므로, 붙어 있을 때만 기억)
    const remember = () => { if (list && list.isConnected) lastMenuScrollLeft = list.scrollLeft; };
    list?.addEventListener('scroll', remember, { passive: true });
    const centerActive = () => {
      const list = scrollMenuRef.current;
      const active = list?.querySelector<HTMLElement>('.active');
      if (!list || !active) return;
      const target = active.offsetLeft + active.offsetWidth / 2 - list.clientWidth / 2;
      list.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    };
    raf = requestAnimationFrame(centerActive);
    // 웹폰트 적용으로 탭 폭이 바뀌면 위치가 어긋나므로 폰트 로딩 후 한 번 더 맞춥니다.
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(centerActive).catch(() => {});
    }
    return () => {
      cancelAnimationFrame(raf);
      remember();
      list?.removeEventListener('scroll', remember);
    };
  }, [pathname, isMobile]);

  // 🌟 모바일 고정(sticky) 바 위치 계산: 하드코딩 대신 실제 렌더링된 높이를 측정해서
  // 헤더 높이(--sticky-header-h)와 이 메뉴 높이(--sticky-menu-h)를 CSS 변수로 노출.
  // 하위 페이지(예: 국제배송 요금표 탭)가 이 변수를 이어받아 정확히 붙게 만든다.
  useEffect(() => {
    const menuEl = scrollMenuRef.current;

    const updateStickyOffsets = () => {
      const headerEl = document.querySelector('.miku-header-wrapper') as HTMLElement | null;
      const headerH = headerEl ? headerEl.getBoundingClientRect().height : 89;
      const menuH = menuEl ? menuEl.getBoundingClientRect().height : 64;
      // 🌟 측정 타이밍에 따라 0이 잡히는 경우가 있어(레이아웃이 아직 자리잡기 전), 그 값을
      // 그대로 쓰면 콘텐츠가 고정 바 뒤에 가려버린다. 0은 무시하고 CSS의 기본값(fallback)이나
      // 이전에 측정된 정상 값을 유지한 채, 다음 ResizeObserver 콜백에서 다시 갱신되게 둔다.
      if (headerH > 0) document.documentElement.style.setProperty('--sticky-header-h', `${headerH}px`);
      if (menuH > 0) document.documentElement.style.setProperty('--sticky-menu-h', `${menuH}px`);
    };

    updateStickyOffsets();
    // 🌟 웹폰트가 늦게 적용되면 탭 바 높이가 바뀌는데(예: 48px → 67px) 그 사이 값이 굳어 버려
    // 페이지마다 콘텐츠 시작 위치가 달라지는 문제가 있어, 폰트 로딩 후 한 번 더 측정합니다.
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(updateStickyOffsets).catch(() => {});
    }

    const ro = new ResizeObserver(updateStickyOffsets);
    if (menuEl) ro.observe(menuEl);
    const headerEl = document.querySelector('.miku-header-wrapper');
    if (headerEl) ro.observe(headerEl);

    window.addEventListener('resize', updateStickyOffsets);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateStickyOffsets);
    };
    // 🌟 isMobile 이 바뀌면 탭 바가 다시 그려져 ref 가 새 요소를 가리키므로 관찰 대상을 다시 잡습니다.
  }, [pathname, isMobile]);

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
  // 🌟 Header.tsx의 `.miku-header-wrapper ~ main.main-extra-gap` padding-top과
  // 반드시 같은 값이어야 합니다. 이 값이 다르면 사이드바(fixed, top으로 직접 고정)와
  // 본문 콘텐츠(main의 padding-top으로 밀려남)의 상단 위치가 서로 어긋나 보입니다.
  const SIDEBAR_TOP = 120;
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

  // 🌟 Header.tsx의 handleLogoutClick과 동일한 동작 — 브라우저 기본 confirm/alert 대신
  // 미쿠짱 공통 팝업을 씁니다 (헤더/사이드바 어디서 로그아웃하든 같은 UI가 나오도록).
  const handleLogout = async () => {
    const isConfirmed = await showConfirm('로그아웃 하시겠습니까?');
    if (isConfirmed) {
      if (status === 'authenticated') await signOut({ redirect: false });
      localStorage.clear();
      showAlert('로그아웃 되었습니다.', 'success');
      setTimeout(() => { window.location.href = '/'; }, 1500);
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

  const sectionMeta = SECTION_META[type?.toLowerCase() ?? ''] ?? SECTION_META.guide;
  const SectionIcon = sectionMeta.icon;

  const sidebarInner = (
    <>
      <div className="guide-sidebar-header">
        <span className="sidebar-badge" aria-hidden="true">
          <SectionIcon size={22} weight="duotone" />
        </span>
        <span className="sidebar-title-group">
          <span className="sidebar-eyebrow">{sectionMeta.eyebrow}</span>
          <span className="sidebar-title">{headerTitle}</span>
        </span>
      </div>

      <div className="sidebar-menu-list" ref={scrollMenuRef}>
        {currentMenu.map((item, idx) => {
          const isActive = !item.via && pathname === menuPath(item.href);
          const ItemIcon = MENU_ICONS[item.label] ?? ClipboardText;
          return (
            <Link
              key={idx}
              href={item.href || '#'}
              className={`menu-item ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="menu-icon" aria-hidden="true">
                <ItemIcon size={18} weight={isActive ? 'fill' : 'regular'} />
              </span>
              {item.via ? (
                <span className="menu-label menu-label-stack">
                  <span>{item.label}</span>
                  <span className="menu-via">{item.via}에서 보기</span>
                </span>
              ) : (
                <span className="menu-label">{item.label}</span>
              )}
              {item.via ? (
                <ArrowUpRight className="menu-via-icon" size={13} weight="bold" aria-hidden="true" />
              ) : (
                <CaretRight className="active-icon" size={14} weight="bold" aria-hidden="true" />
              )}
            </Link>
          );
        })}

        {type === 'mypage' && (
          <>
            <div className="menu-divider"></div>
            <button onClick={handleLogout} className="menu-item logout-btn">
              <span className="menu-icon" aria-hidden="true">
                <SignOut size={18} />
              </span>
              <span className="menu-label">로그아웃</span>
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
        /* 견적문의 / 구매대행 신청 / 배송대행 신청 페이지 본문 래퍼 */
        .order-form-page { width: 100%; min-width: 0; }

        /* =============================================================
           💎 PC 사이드바 디자인 (769px 이상에서만 적용 — 모바일 탭 바는 위/아래 규칙 그대로)
           브랜드 로즈 톤(#d27377 / #b5615f)을 Header.tsx와 맞춤
           ============================================================= */
        @media (min-width: 769px) {
          .guide-sidebar {
            background: linear-gradient(180deg, #ffffff 0%, #fffcfb 100%);
            backdrop-filter: none;
            border: 1px solid rgba(210, 115, 119, 0.14);
            border-radius: 24px;
            padding: 22px 14px 14px;
            box-shadow:
              0 1px 2px rgba(15, 23, 42, 0.04),
              0 12px 24px -12px rgba(15, 23, 42, 0.08),
              0 32px 56px -28px rgba(181, 97, 95, 0.22);
            overflow: hidden;
          }
          /* 카드 상단의 얇은 브랜드 라인 */
          .guide-sidebar::before {
            content: '';
            position: absolute;
            top: 0; left: 24px; right: 24px;
            height: 2px;
            border-radius: 0 0 2px 2px;
            background: linear-gradient(90deg, rgba(227,134,138,0) 0%, #e3868a 30%, #d27377 70%, rgba(210,115,119,0) 100%);
            opacity: 0.85;
          }

          /* 제목 영역: 아이콘 배지 + 영문 보조 라벨 + 제목 */
          .guide-sidebar-header {
            align-items: center;
            gap: 12px;
            padding: 0 8px 18px;
            margin: 0 0 10px;
            border-bottom: 1px solid #f3e7e6;
            color: inherit;
            font-size: inherit;
          }
          .sidebar-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px; height: 44px;
            flex-shrink: 0;
            border-radius: 14px;
            color: #ffffff;
            background: linear-gradient(145deg, #eba0a3 0%, #d27377 55%, #b5615f 100%);
            box-shadow: 0 8px 16px -6px rgba(181, 97, 95, 0.55), inset 0 1px 0 rgba(255,255,255,0.35);
          }
          .sidebar-title-group { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
          .sidebar-eyebrow {
            font-size: 10.5px;
            font-weight: 700;
            letter-spacing: 0.14em;
            color: #d27377;
            line-height: 1;
          }
          .sidebar-title {
            font-size: 19px;
            font-weight: 800;
            color: #1e293b;
            letter-spacing: -0.4px;
            line-height: 1.2;
          }

          .sidebar-menu-list { gap: 2px; }

          /* 메뉴 항목 */
          .menu-item {
            position: relative;
            justify-content: flex-start;
            gap: 12px;
            padding: 9px 12px 9px 10px;
            min-height: 48px;
            font-size: 14.5px;
            font-weight: 600;
            color: #475569;
            border-radius: 14px;
            transition: background-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease;
            transform: none;
          }
          .menu-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px; height: 32px;
            flex-shrink: 0;
            border-radius: 10px;
            color: #94a3b8;
            background: #f8fafc;
            border: 1px solid #eef2f6;
            transition: all 0.25s ease;
          }
          .menu-label { flex: 1; min-width: 0; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .active-icon {
            flex-shrink: 0;
            color: #d27377;
            opacity: 0;
            transform: translateX(-4px);
            transition: opacity 0.25s ease, transform 0.25s ease;
          }

          .menu-item:hover {
            background-color: #fff8f7;
            color: #1e293b;
            transform: none;
          }
          .menu-item:hover .menu-icon {
            color: #d27377;
            background: #ffffff;
            border-color: #f7d9d7;
          }
          .menu-item:hover .active-icon { opacity: 0.5; transform: translateX(0); }

          /* 선택된 메뉴: 은은한 로즈 배경 + 왼쪽 인디케이터 + 채워진 아이콘 배지 */
          .menu-item.active {
            background: linear-gradient(90deg, #fff1ef 0%, #fff8f7 100%);
            color: #b5615f;
            font-weight: 700;
            box-shadow: inset 0 0 0 1px rgba(210, 115, 119, 0.16);
            transform: none;
          }
          .menu-item.active::before {
            content: '';
            position: absolute;
            left: -13px; top: 12px; bottom: 12px;
            width: 3px;
            border-radius: 0 3px 3px 0;
            background: linear-gradient(180deg, #e3868a 0%, #b5615f 100%);
          }
          .menu-item.active .menu-icon {
            color: #ffffff;
            border-color: transparent;
            background: linear-gradient(145deg, #e3868a 0%, #c9686c 100%);
            box-shadow: 0 6px 12px -4px rgba(181, 97, 95, 0.5);
          }
          .menu-item.active .active-icon { opacity: 1; transform: translateX(0); }

          /* 다른 섹션(마이페이지/이용가이드)으로 이동하는 항목 표시 */
          .menu-label-stack { display: flex; flex-direction: column; gap: 1px; line-height: 1.3; }
          .menu-via { font-size: 11px; font-weight: 600; color: #b39a9d; letter-spacing: -0.2px; }
          .menu-via-icon { flex-shrink: 0; color: #d4b3b5; transition: color 0.25s ease, transform 0.25s ease; }
          .menu-item:hover .menu-via { color: #c4838a; }
          .menu-item:hover .menu-via-icon { color: #d27377; transform: translate(1px, -1px); }

          .menu-divider {
            height: 1px;
            margin: 10px 8px;
            background: linear-gradient(90deg, transparent 0%, #efe3e2 20%, #efe3e2 80%, transparent 100%);
          }

          /* 로그아웃: 차분한 톤, hover 시에만 경고색 */
          .logout-btn { color: #94a3b8; font-weight: 500; }
          .logout-btn .menu-icon { background: transparent; border-color: transparent; }
          .logout-btn:hover { background-color: #fff1f2; color: #e11d48; }
          .logout-btn:hover .menu-icon { background: #ffffff; border-color: #fecdd3; color: #e11d48; }

          .menu-item:focus-visible {
            outline: 2px solid #e3868a;
            outline-offset: 2px;
          }
        }

        /* =============================================================
           📱 모바일 반응형 처리 (@media 쿼리로 전부 제어)
           ============================================================= */
        @media (max-width: 768px) {
          /* 🌟 overflow-x: hidden만 주면 스펙상 overflow-y가 암묵적으로 auto로 계산되어,
             음수 margin으로 타이틀을 위로 당길 때 글자 위쪽 획이 이 컨테이너 경계에서
             잘려 한글이 깨진 것처럼 보이는 버그가 있었다(브라우저 렌더링 한계가 아니었음).
             overflow-x: clip은 같은 가로 스크롤 방지 효과를 내면서 overflow-y를 auto로
             바꾸지 않아 세로 클리핑이 발생하지 않는다. */
          .guide-layout-wrapper { padding: 0 0 40px 0; overflow-x: clip; }
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

          .guide-sidebar-header, .menu-divider, .active-icon, .logout-icon, .menu-icon, .menu-via, .menu-via-icon { display: none; }

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

          /* currentMenu(고정 바)가 흐름에서 빠졌으므로 콘텐츠를 아래로 밀어냅니다.
             🌟 main.main-extra-gap 이 이미 120px 을 확보하고 있으므로 고정 바(헤더 + 탭 바) 아래
             끝(바 자체의 아래 여백 15px 포함)에서 6px 만 더 띄웁니다 → 탭 버튼과 첫 카드 사이 약 20px. (이전엔 탭 바 높이만큼 통째로 더해 탭 바와 첫 카드 사이가
             약 48px 로 지나치게 벌어져 있었음) */
          .guide-content-area {
            padding: 0 20px;
            padding-top: max(6px, calc(var(--sticky-header-h, 89px) + var(--sticky-menu-h, 64px) + 6px - 120px));
          }
          /* 🌟 hideSidebar=true인 페이지(예: purchase/quote)는 고정 카테고리 탭 바 자체가
             렌더링되지 않는데도 위 규칙이 존재하지 않는 탭 바를 위한 여백(fallback 64px)을
             그대로 남겨 헤더와 타이틀 사이가 불필요하게 벌어졌습니다. 탭 바가 없을 때는
             그 예약 공간을 없애고 최소한의 여백만 둡니다.
             🌟 또한 main.main-extra-gap의 padding-top(120px)은 데스크탑 사이드바를
             SIDEBAR_TOP(120)에 맞추기 위한 값이라 모바일에는 과도하게 큽니다(모바일은
             사이드바가 position:relative라 이 값이 전혀 필요 없음). 사이드바가 없는 이
             페이지에서만 그 초과분을 음수 margin으로 상쇄합니다.
             (margin-top: -55px → 헤더~타이틀 약 12px 간격. 위 .guide-layout-wrapper의
             overflow-x: clip 수정 전에는 이 값을 이만큼 키우면 타이틀 글자 위쪽이 잘려
             보이는 버그가 있었다.) */
          .guide-content-area.full-width {
            margin-top: -55px;
            padding-top: 20px;
          }
        }
      `}</style>
    </div>
  );
}