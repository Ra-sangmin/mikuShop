"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BANK_ACCOUNT } from '@/lib/bankAccount';
import { useRouter } from 'next/navigation';
import { useMikuAlert } from '@/app/context/MikuAlertContext';
import {
  ChatCircleDots, ShoppingCartSimple, AirplaneTilt, Receipt, Scales, Headset, ArrowRight,
  ArrowUpRight, CaretLeft, CaretRight,
  Megaphone, Bank, Clock, CalendarCheck, Copy, ShieldCheck, Medal, Sparkle,
  Package, Gavel, MagnifyingGlass, Gift, Crown, Coins, LinkSimple,
} from '@phosphor-icons/react';

const HERO_AUTOPLAY_MS = 5000;

export const dynamic = "force-dynamic";

/* 🎁 배너 주제 소품 ---------------------------------------------------------
   캐릭터 그림이 모든 배너에서 같아 보이는 것을 덜어 주려고, 배너마다 다른 소품을
   캐릭터 주변에 띄웁니다. 색은 배너 포인트색(--hero-accent)을 따라갑니다.
   나중에 배너별 캐릭터 그림을 넣으면 <HeroProps /> 한 줄만 지우면 됩니다. */
const HERO_PROPS: Record<HeroPropKind, React.ReactNode[]> = {
  // 배송대행 — 택배 상자 · 비행기 경로 · 방울 포장재
  delivery: [
    <svg key="box" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M16 4 28 9v14l-12 5-12-5V9z" /><path d="M4 9l12 5 12-5" /><path d="M16 14v14" />
      <path d="M10 6.5 22 11.5" strokeDasharray="2 2" />
    </svg>,
    <svg key="air" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 26c6-2 10-6 13-11" strokeDasharray="3 3" />
      <path d="M27 5 17 13l-6-1-2 2 5 3 2 5 2-2-1-6z" />
    </svg>,
    <svg key="wrap" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="7" width="22" height="18" rx="4" />
      <circle cx="11" cy="13" r="2" /><circle cx="17" cy="13" r="2" /><circle cx="23" cy="13" r="2" />
      <circle cx="11" cy="19" r="2" /><circle cx="17" cy="19" r="2" /><circle cx="23" cy="19" r="2" />
    </svg>,
  ],
  // 구매대행 — 쇼핑백 · 가격표 · 카드
  purchase: [
    <svg key="bag" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M7 11h18l-2 16H9z" /><path d="M12 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>,
    <svg key="tag" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M16 4h11v11L15 27 4 16z" /><circle cx="22" cy="10" r="2" fill="currentColor" stroke="none" />
    </svg>,
    <svg key="card" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <rect x="4" y="8" width="24" height="16" rx="3" /><path d="M4 14h24" /><path d="M9 19h5" strokeLinecap="round" />
    </svg>,
  ],
  // 경매 — 입찰 망치 · 시세 그래프 · 스마트폰 입찰
  auction: [
    <svg key="gavel" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="14" y="4" width="11" height="7" rx="2" transform="rotate(45 19.5 7.5)" />
      <path d="M13 13 6 20l3 3 7-7" /><path d="M5 28h12" />
    </svg>,
    <svg key="chart" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 22l6-6 4 3 8-9" /><path d="M27 6v6h-6" /><path d="M5 27h22" />
    </svg>,
    <svg key="phone" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <rect x="9" y="3" width="14" height="26" rx="3" /><path d="M14 25h4" strokeLinecap="round" />
      <path d="M13 17l3-4 3 4" strokeLinecap="round" /><path d="M16 13v7" strokeLinecap="round" />
    </svg>,
  ],
  // 혜택 — 쿠폰 · 선물 상자 · 등급 왕관
  benefit: [
    <svg key="coupon" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M4 9h24v5a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6z" /><path d="M12 12v10" strokeDasharray="3 3" />
    </svg>,
    <svg key="gift" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <rect x="4" y="12" width="24" height="15" rx="2" /><path d="M4 17h24" /><path d="M16 12v15" />
      <path d="M16 12c-4 0-6-1-6-3.5S12 5 16 12zM16 12c4 0 6-1 6-3.5S20 5 16 12z" />
    </svg>,
    <svg key="crown" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M5 23 4 9l7 5 5-8 5 8 7-5-1 14z" /><path d="M5 27h22" strokeLinecap="round" />
    </svg>,
  ],
};

/** 배너 캐릭터 그림 — 파일이 아직 없으면 기본 그림(/images/hero.png)으로 대신 보여 줍니다. */
function HeroImage({ src }: { src: string }) {
  const [current, setCurrent] = useState(src);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => { setCurrent(src); }, [src]);
  useEffect(() => {
    // 서버에서 그려진 뒤(=이벤트를 듣기 전에) 이미 실패한 경우도 잡아 줍니다.
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setCurrent(HERO_FALLBACK_IMAGE);
  }, [current]);
  return (
    <img
      ref={imgRef}
      src={current}
      alt="Miku"
      className="premium-floating-img"
      draggable="false"
      onError={() => setCurrent(HERO_FALLBACK_IMAGE)}
    />
  );
}

function HeroProps({ kind }: { kind: HeroPropKind }) {
  return (
    <>
      {HERO_PROPS[kind].map((icon, i) => (
        <span key={i} className={`hero-prop pp${i + 1}`} aria-hidden="true">{icon}</span>
      ))}
    </>
  );
}

// 🖼 배너마다 다른 캐릭터 그림을 씁니다. (public/images/miku_icon/ 아래)
//    아직 파일을 넣지 않은 배너는 예전 그림(/images/miku_icon/default.png)으로 자동으로 대신 보여 줍니다.
const HERO_FALLBACK_IMAGE = '/images/miku_icon/default.png';

// 1. 배너 데이터 구조 정의
type HeroPropKind = 'delivery' | 'purchase' | 'auction' | 'benefit';

interface Banner {
  title: React.ReactNode;
  subTitle: string;
  desc: string;
  image: string;
  /** 배너 주제에 맞는 주변 소품 (캐릭터 그림이 같아도 배너마다 다르게 보이도록) */
  props: HeroPropKind;
  /** 캐릭터 주변 유리 칩 문구 3개 */
  chips: { icon: React.ReactNode; label: string }[];
  bgColor: string;   // 배경 파스텔 색
  accent: string;    // 배지 점·장식 링에 쓰는 진한 색
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
}

// 🌟 "#d27377" → "210, 115, 119"
const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

export default function HomePage() {
  const banners: Banner[] = [
    // 1. 구매대행 (위로 올림)
    {
      title: <>일본 쇼핑의 시작<br />미쿠짱과 함께하세요</>, subTitle: "최저가 구매대행 서비스",
      desc: "상품 링크만 알려주시면 구매부터 배송까지 대신해 드려요.",
      bgColor: "#FFF4CC", accent: "#c99612", image: "/images/miku_icon/purchase.png",
      props: 'purchase',
      chips: [
        { icon: <Medal weight="fill" />, label: '14년 노하우' },
        { icon: <LinkSimple weight="bold" />, label: '링크만 보내면 끝' },
        { icon: <Receipt weight="fill" />, label: '수수료 ¥100부터' },
      ],
      primary: { label: '구매대행 신청', href: '/purchase/request' },
      secondary: { label: '견적 문의', href: '/purchase/quote' },
    },
    // 2. 배송대행 (아래로 내림)
    {
      title: <>안전포장 빠른배송<br />평일 매일 국제발송</>, subTitle: "합리적이고 저렴한 배송비",
      desc: "도착한 상품을 꼼꼼히 포장해 한국까지 보내드려요.",
      bgColor: "#E2F0D9", accent: "#5c9a6f", image: "/images/miku_icon/delivery.png",
      props: 'delivery',
      chips: [
        { icon: <Package weight="fill" />, label: '안전 포장' },
        { icon: <AirplaneTilt weight="fill" />, label: '항공 · EMS' },
        { icon: <ShieldCheck weight="fill" />, label: '기본 검수 무료' },
      ],
      primary: { label: '배송대행 신청', href: '/delivery/request' },
      secondary: { label: '배송 요금표', href: '/guide/shipping-fee' },
    },
    // 3. 메루카리·야후옥션 (유지)
    {
      title: <>메루카리·야후옥션<br />실시간 입찰 및 구매</>, subTitle: "간편한 일본 직구 솔루션",
      desc: "원하는 상품을 찾아 입찰과 구매를 한 번에 신청하세요.",
      bgColor: "#E1F5FE", accent: "#2f8fc4", image: "/images/miku_icon/auction.png",
      props: 'auction',
      chips: [
        { icon: <Gavel weight="fill" />, label: '실시간 입찰' },
        { icon: <MagnifyingGlass weight="bold" />, label: '메루카리 · 야후 옥션' },
        { icon: <Clock weight="fill" />, label: '마감 시간 관리' },
      ],
      primary: { label: '메루카리 둘러보기', href: '/main_shop/mercari' },
      secondary: { label: '야후옥션', href: '/main_shop/yahoo_auction' },
    },
    // 4. 회원 혜택 (유지)
    {
      title: <>다양한 혜택과 이벤트<br />회원 등급별 포인트 적립</>, subTitle: "신규 가입 시 적립금 증정",
      desc: "등급이 오를수록 국제 배송비 할인 혜택이 커져요.",
      bgColor: "#FFEBEE", accent: "#d27377", image: "/images/miku_icon/benefit.png",
      props: 'benefit',
      chips: [
        { icon: <Gift weight="fill" />, label: '신규 적립금' },
        { icon: <Crown weight="fill" />, label: '등급별 할인' },
        { icon: <Coins weight="fill" />, label: '미쿠짱머니 적립' },
      ],
      primary: { label: '등급별 혜택 보기', href: '/guide/membership' },
      secondary: { label: '회원가입', href: '/auth/register' },
    },
  ];

  const { showAlert } = useMikuAlert();
  const handleComingSoon = (e: React.MouseEvent) => {
    e.preventDefault(); // 페이지 이동 방지
    showAlert('이 서비스는 현재 준비중입니다.', 'warning');
  };

  const extendedBanners = [banners[banners.length - 1], ...banners, banners[0]];

  const [currentBanner, setCurrentBanner] = useState(1);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrollDrag, setIsScrollDrag] = useState(false);
  const [scrollStartX, setScrollStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);

  // --- 배너 드래그 로직 ---
  const nextSlide = () => {
    if (!isTransitioning) return; 
    setCurrentBanner((prev) => prev >= banners.length + 1 ? prev : prev + 1);
  };
  
  const prevSlide = () => { 
    if (!isTransitioning) return; 
    setCurrentBanner((prev) => prev <= 0 ? prev : prev - 1);
  };

  const handleTransitionEnd = () => {
    if (currentBanner <= 0) { 
      setIsTransitioning(false); 
      setCurrentBanner(banners.length); 
    } else if (currentBanner >= banners.length + 1) { 
      setIsTransitioning(false); 
      setCurrentBanner(1); 
    }
  };

  const updateMask = () => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const isAtStart = scrollLeft <= 5;
    const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 5;

    if (isAtStart) el.classList.add('is-start'); 
    else el.classList.remove('is-start');

    if (isAtEnd) el.classList.add('is-end'); 
    else el.classList.remove('is-end');

    if (!isAtStart) el.classList.add('mask-on-left');
    else el.classList.remove('mask-on-left');

    if (!isAtEnd) el.classList.add('mask-on-right');
    else el.classList.remove('mask-on-right');
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPaused(true); 
      } else {
        setIsPaused(false); 
        if (currentBanner >= banners.length + 1) {
          setIsTransitioning(false);
          setCurrentBanner(1);
        } else if (currentBanner <= 0) {
          setIsTransitioning(false);
          setCurrentBanner(banners.length);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentBanner, banners.length]);
  
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', updateMask);
      updateMask(); 
    }
    return () => el?.removeEventListener('scroll', updateMask);
  }, []);

  useEffect(() => { if (!isTransitioning) { const timer = setTimeout(() => setIsTransitioning(true), 50); return () => clearTimeout(timer); } }, [isTransitioning]);
  // 🌟 화면에 보이는 배너 번호(0부터). 복제 슬라이드(0, 마지막)는 실제 번호로 환산합니다.
  const activeBannerIndex =
    currentBanner === 0 ? banners.length - 1 : currentBanner === banners.length + 1 ? 0 : currentBanner - 1;
  // 🌟 PC에서 배너 위에 마우스를 올리면 자동 넘김을 잠시 멈춥니다.
  const [isHeroHovered, setIsHeroHovered] = useState(false);

  // 📢 공지사항 — 관리자 > 고객 센터에서 등록한 글을 최근 4건까지 보여줍니다.
  const [notices, setNotices] = useState<{ id: number; title: string; content: string; createdAt: string }[]>([]);
  const [isNoticeLoading, setIsNoticeLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/notices?limit=4')
      .then(res => res.json())
      .then(data => { if (!cancelled && data.success) setNotices(data.notices); })
      .catch(err => console.error('공지사항 조회 실패:', err))
      .finally(() => { if (!cancelled) setIsNoticeLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const isAutoplayPaused = isPaused || isHeroHovered;
  // 슬라이드가 바뀔 때마다 타이머를 새로 시작해 진행 막대와 시간이 맞도록 setTimeout을 씁니다.
  useEffect(() => {
    if (isAutoplayPaused) return;
    const timer = setTimeout(nextSlide, HERO_AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [activeBannerIndex, isAutoplayPaused]);

  // 🌟 배너를 드래그해서 넘긴 경우엔 버튼 클릭(링크 이동)으로 처리하지 않습니다.
  const heroDraggedRef = useRef(false);
  const handleHeroLinkClick = (e: React.MouseEvent) => { if (heroDraggedRef.current) e.preventDefault(); };
  const goToBanner = (index: number) => { if (isTransitioning) setCurrentBanner(index + 1); };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => { heroDraggedRef.current = false; setDragStartX('touches' in e ? e.touches[0].clientX : e.clientX); setIsPaused(true); };
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (dragStartX === null) return;
    const offset = ('touches' in e ? e.touches[0].clientX : e.clientX) - dragStartX;
    if (Math.abs(offset) > 6) heroDraggedRef.current = true;
    setDragOffset(offset);
  };
  const handleDragEnd = () => { if (dragStartX === null) return; setIsPaused(false); if (Math.abs(dragOffset) > 100) { dragOffset > 0 ? prevSlide() : nextSlide(); } setDragStartX(null); setDragOffset(0); };

  const onScrollDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!('touches' in e)) e.preventDefault(); 
    setIsScrollDrag(true);
    setHasDragged(false);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).pageX;
    if (scrollRef.current) {
      setScrollStartX(clientX - scrollRef.current.offsetLeft);
      setScrollLeftPos(scrollRef.current.scrollLeft);
    }
  };
  const onScrollDragEnd = () => { setIsScrollDrag(false); };
  const onScrollDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isScrollDrag || !scrollRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).pageX;
    const x = clientX - scrollRef.current.offsetLeft;
    const walk = (x - scrollStartX); 
    if (Math.abs(walk) > 5) setHasDragged(true);
    scrollRef.current.scrollLeft = scrollLeftPos - walk;
  };

  const handleManualScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400; 
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="home-page-wrapper" style={styles.pageWrapper}>

      {/* 1. 프리미엄 Hero Banner Section */}
      <section 
        className="hero-banner-wrap"
        aria-roledescription="carousel"
        aria-label="미쿠짱 주요 안내"
        onMouseDown={handleDragStart} onMouseMove={handleDragMove} onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        // 🌟 hover 일시정지는 마우스에서만 (터치 기기에서는 탭 후 mouseleave가 오지 않아 멈춘 채로 남음)
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') setIsHeroHovered(true); }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') setIsHeroHovered(false); }}
        onTouchStart={handleDragStart} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}
        style={styles.heroSection}
      >
        <div 
          onTransitionEnd={handleTransitionEnd}
          style={{
            display: 'flex', 
            height: '100%', 
            width: `${extendedBanners.length * 100}%`,
            transform: `translateX(calc(-${currentBanner * (100 / extendedBanners.length)}% + ${dragOffset}px))`,
            transition: (dragStartX === null && isTransitioning) ? 'transform 0.8s cubic-bezier(0.25, 1, 0.3, 1)' : 'none'
          }}
        >
          {extendedBanners.map((banner, index) => (
            <div
              key={index}
              className="hero-slide"
              aria-hidden={index !== currentBanner}
              style={{
                width: `${100 / extendedBanners.length}%`,
                ['--hero-bg' as any]: banner.bgColor,
                ['--hero-accent' as any]: banner.accent,
                // 🌟 color-mix() 대신 rgba(var(--hero-accent-rgb), a) 로 투명도를 주기 위한 RGB 값
                ['--hero-accent-rgb' as any]: hexToRgb(banner.accent),
              }}
            >
              <div className="hero-slide-pattern" aria-hidden="true"></div>
              <div className="bg-blur-circle" style={{ backgroundColor: banner.bgColor }}></div>
                <div className="align-container banner-inner">
                    <div className="text-area">
                      <div className="premium-badge">
                        <span className="badge-dot"></span>
                        {banner.subTitle}
                      </div>
                      <h1 className="premium-hero-title">{banner.title}</h1>
                      <p className="hero-desc">{banner.desc}</p>
                      <div className="hero-cta-row">
                        <Link
                          href={banner.primary.href}
                          className="hero-cta hero-cta-primary"
                          onClick={handleHeroLinkClick}
                          onDragStart={(e) => e.preventDefault()}
                          tabIndex={index === currentBanner ? 0 : -1}
                        >
                          {banner.primary.label} <ArrowRight weight="bold" />
                        </Link>
                        <Link
                          href={banner.secondary.href}
                          className="hero-cta hero-cta-secondary"
                          onClick={handleHeroLinkClick}
                          onDragStart={(e) => e.preventDefault()}
                          tabIndex={index === currentBanner ? 0 : -1}
                        >
                          {banner.secondary.label}
                        </Link>
                      </div>
                    </div>

                    {/* 🌟 캐릭터 스테이지: 회전 궤도 링 + 유리 원판 + 받침대 그림자 + 반짝임 + 서비스 칩 */}
                    <div className="premium-image-area">
                      <div className="hero-ring hero-ring-outer" aria-hidden="true"></div>
                      <div className="hero-ring hero-orbit" aria-hidden="true"><span className="hero-orbit-dot"></span></div>
                      <div className="hero-ring hero-ring-inner" aria-hidden="true"></div>
                      <div className="image-aura" style={{ backgroundColor: banner.bgColor }}></div>
                      <div className="hero-stage" aria-hidden="true"></div>
                      <span className="hero-sparkle s1" aria-hidden="true"><Sparkle weight="fill" /></span>
                      <span className="hero-sparkle s2" aria-hidden="true"><Sparkle weight="fill" /></span>
                      <span className="hero-sparkle s3" aria-hidden="true"><Sparkle weight="fill" /></span>
                      <HeroImage src={banner.image} />
                      {banner.chips.map((chip, ci) => (
                        <span key={chip.label} className={`hero-chip c${ci + 1}`} aria-hidden="true"><i>{chip.icon}</i>{chip.label}</span>
                      ))}
                      {/* 🎁 배너 주제에 맞는 소품 (캐릭터 그림이 준비되면 HERO_PROPS 를 지우면 됩니다) */}
                      <HeroProps kind={banner.props} />
                    </div>
                  </div>
              </div>
          ))}
        </div>

        {/* 좌우 이동 버튼 (PC) */}
        <button type="button" className="hero-nav-btn prev" aria-label="이전 배너"
          onMouseDown={(e) => e.stopPropagation()} onClick={prevSlide}>
          <CaretLeft weight="bold" />
        </button>
        <button type="button" className="hero-nav-btn next" aria-label="다음 배너"
          onMouseDown={(e) => e.stopPropagation()} onClick={nextSlide}>
          <CaretRight weight="bold" />
        </button>

        {/* 🌟 진행 표시: 번호 + 자동 넘김 진행 막대 (막대를 누르면 해당 배너로 이동) */}
        <div className="hero-progress" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
          <span className="hero-progress-count">
            <strong>{String(activeBannerIndex + 1).padStart(2, '0')}</strong>
            <span> / {String(banners.length).padStart(2, '0')}</span>
          </span>
          <div className="hero-progress-track">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`hero-progress-seg ${i === activeBannerIndex ? 'active' : ''} ${i < activeBannerIndex ? 'done' : ''}`}
                aria-label={`${i + 1}번째 배너 보기`}
                aria-current={i === activeBannerIndex}
                onClick={() => goToBanner(i)}
              >
                {i === activeBannerIndex && (
                  <span
                    key={`${activeBannerIndex}-${isAutoplayPaused}`}
                    className={`hero-progress-fill ${isAutoplayPaused ? 'paused' : ''}`}
                    style={{ animationDuration: `${HERO_AUTOPLAY_MS}ms` }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Quick Service Icons */}
      <section className="quick-service-section anim-item delay-1 align-container" style={{ marginTop: '80px', marginBottom: '80px' }}>
        <h2 className="home-section-title">자주 사용하는 기능</h2>
        <div className="quick-section">
            <QuickIcon href="/purchase/quote" label="견적문의" />
            <QuickIcon href="/purchase/request" label="구매대행신청" />
            <QuickIcon href="/delivery/request" label="배송대행신청" />
            <QuickIcon href="/guide/fee-guide" label="수수료 안내" />
            <QuickIcon href="/guide/shipping-fee" label="국제배송요금" />
            <QuickIcon href="/inquiry/kakaotalk" label="카톡문의" />
        </div>
      </section>

      {/* 3. Frequently Visited Sites */}
      <section className="frequent-sites-section anim-item delay-2" style={{ borderTop: '1px solid #f1f5f9', padding: '80px 0 100px 0', backgroundColor: '#fff' }}>
        <div className="align-container" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 className="home-section-title">자주 방문하는 사이트</h2>
          <div className="site-card-wrap">
              <SiteCard shopId="mercari" logoSrc="merukari_logo" name="메루카리" desc="일본 최대 중고거래 사이트" tag="중고거래" brandRgb="255 51 63" />
              <SiteCard shopId="rakuten" logoSrc="rakuten_logo" name="라쿠텐" desc="일본 대표 종합 쇼핑몰" tag="종합몰" brandRgb="191 0 0" />
              <SiteCard shopId="yahoo_shopping" logoSrc="yahoo_shopping_logo" name="야후 쇼핑" desc="다양한 혜택의 야후 쇼핑" tag="종합몰" brandRgb="255 0 51" />
              {/* 🛒 아마존은 아직 내보내지 않습니다. 운영 서버(EC2)에서 아마존의 카테고리·검색
                  페이지가 캡차로 막혀 있어 둘러보기를 만들 수 없고(상품 상세만 열립니다),
                  카테고리까지 제공하려면 유료 API 가 필요해 도입 여부를 검토 중입니다.
                  상품 주소를 붙여넣는 주문(/purchase/request)은 이미 동작합니다.

                  ⚠️ 아래 줄을 살릴 때는 SiteCard 에 href·cta 인자를 함께 되살려야 합니다.
                     지금 SiteCard 는 무조건 /main_shop/{shopId} 로 가는데 그 주소는 없습니다.
              <SiteCard shopId="amazon" logoSrc="amazon_logo" name="아마존" desc="상품 주소로 주문하는 아마존 재팬" tag="종합몰" brandRgb="255 153 0" href="/purchase/request" cta="주소로 주문" /> */}
              <SiteCard shopId="yahoo_auction" logoSrc="yahoo_auction_logo" name="야후 옥션" desc="실시간 일본 옥션 입찰" tag="경매" brandRgb="240 130 0" />
          </div>
        </div>
      </section>

      {/* 4. Popular Sites */}
      <section className="popular-sites-section anim-item delay-3" style={styles.popularSection}>
        <h2 className="home-section-title">일본 인기 쇼핑몰</h2>
        
        <div className="align-container" style={{ position: 'relative' }}> 
          
          <div 
            className="social-wrap is-start" 
            ref={scrollRef}
            onScroll={updateMask}
            onMouseDown={onScrollDragStart} onMouseLeave={onScrollDragEnd} onMouseUp={onScrollDragEnd} onMouseMove={onScrollDragMove}
            onTouchStart={onScrollDragStart} onTouchEnd={onScrollDragEnd} onTouchMove={onScrollDragMove}
            style={{ cursor: isScrollDrag ? 'grabbing' : 'grab' }}
          >
              <SocialIcon url="www.amiami.jp/" src="amiami_logo" brandColor="#BF0000" desc="아미아미" isDragging={hasDragged} />
              <SocialIcon url="zozo.jp/" src="zozotown_logo" brandColor="#000000" desc="조조타운" isDragging={hasDragged} />
              <SocialIcon url="www.beams.co.jp/" src="beams_logo" brandColor="#FF9900" desc="빔스" isDragging={hasDragged} />
              <SocialIcon url="www.suruga-ya.jp/" src="surugaya_logo" brandColor="#E60012" desc="스루가야" isDragging={hasDragged} />
              <SocialIcon url="toy.bandai.co.jp/" src="bandai_logo" brandColor="#FFB300" desc="반다이" isDragging={hasDragged} />
              <SocialIcon url="www.animate-onlineshop.jp/" src="animate_logo" brandColor="#004EA2" desc="애니메이트" isDragging={hasDragged} />
              <SocialIcon url="www.toranoana.jp/" src="toranoana_logo" brandColor="#F39800" desc="토라노아나" isDragging={hasDragged} />
          </div>
          
          <button className="scroll-arrow-btn left" aria-label="이전 쇼핑몰" onClick={() => handleManualScroll('left')}>
            <CaretLeft weight="bold" />
          </button>
          <button className="scroll-arrow-btn right" aria-label="다음 쇼핑몰" onClick={() => handleManualScroll('right')}>
            <CaretRight weight="bold" />
          </button>

        </div>
      </section>

      {/* 5. Bottom Info Section */}
      <section className="bottom-info-section anim-item delay-4">
        <div className="align-container bottom-info-grid">

            {/* 고객센터 */}
            <div className="bottom-info-box info-card tone-indigo">
                <div className="info-card-head">
                    <span className="info-card-badge"><Headset weight="duotone" /></span>
                    <span className="info-card-titles">
                        <span className="info-card-eyebrow">CUSTOMER CENTER</span>
                        <span className="info-card-title">고객센터</span>
                    </span>
                </div>

                <h3 className="cs-heading">1:1 문의는 <span className="cs-heading-accent">카카오톡</span>으로</h3>
                <p className="cs-desc">실시간 대응으로 빠르게 도와드립니다.</p>

                <dl className="cs-meta">
                    <div className="cs-meta-row">
                        <dt><Clock weight="bold" /> 운영시간</dt>
                        <dd>10:00 ~ 19:00</dd>
                    </div>
                    <div className="cs-meta-row">
                        <dt><CalendarCheck weight="bold" /> 운영일</dt>
                        <dd>평일 (토·일·공휴일 휴무)</dd>
                    </div>
                </dl>

                <button
                  type="button"
                  className="cs-kakao-btn"
                  onClick={() => window.location.href = '/inquiry/kakaotalk'}
                >
                  <img src="/images/kakao_icon/kakaotalk_sharing_btn_small_notBG.png" alt="" />
                  카카오톡 상담하기
                </button>
            </div>

            {/* 공지사항 */}
            <div className="bottom-info-box info-card tone-amber">
                <div className="info-card-head">
                    <span className="info-card-badge"><Megaphone weight="duotone" /></span>
                    <span className="info-card-titles">
                        <span className="info-card-eyebrow">NOTICE</span>
                        <span className="info-card-title">공지사항</span>
                    </span>
                    <Link href="/guide/notice" className="info-card-more">전체보기 <CaretRight weight="bold" /></Link>
                </div>
                <ul className="notice-list">
                    {isNoticeLoading ? (
                        <li className="notice-row"><span className="notice-title">불러오는 중...</span></li>
                    ) : notices.length > 0 ? (
                        notices.map(notice => (
                            <NoticeItem
                                key={notice.id}
                                id={notice.id}
                                title={notice.title}
                                date={formatNoticeDate(notice.createdAt)}
                                content={notice.content}
                            />
                        ))
                    ) : (
                        <li className="notice-row"><span className="notice-title">등록된 공지사항이 없습니다.</span></li>
                    )}
                </ul>
            </div>

            {/* 입금 계좌 */}
            <div className="bottom-info-box info-card tone-emerald">
                <div className="info-card-head">
                    <span className="info-card-badge"><Bank weight="duotone" /></span>
                    <span className="info-card-titles">
                        <span className="info-card-eyebrow">BANK INFO</span>
                        <span className="info-card-title">입금 계좌</span>
                    </span>
                </div>

                <div className="bank-panel">
                    <div className="bank-panel-top">
                        <span className="bank-panel-name">
                            <span className="bank-panel-logo"><img src={BANK_ACCOUNT.icon} alt="" /></span>
                            {BANK_ACCOUNT.bank}
                        </span>
                        <span className="bank-panel-chip" aria-hidden="true"></span>
                    </div>
                    <div className="bank-panel-account" translate="no">{BANK_ACCOUNT.number}</div>
                    <div className="bank-panel-bottom">
                        <span className="bank-panel-owner"><span>예금주</span> {BANK_ACCOUNT.owner}</span>
                        <button
                          type="button"
                          className="bank-copy-btn"
                          onClick={() => { navigator.clipboard.writeText(BANK_ACCOUNT.number); showAlert('계좌번호가 복사되었습니다.', 'success'); }}
                        >
                          <Copy weight="bold" /> 복사
                        </button>
                    </div>
                </div>

                <div className="bank-footer">
                    <ShieldCheck weight="fill" />
                    입금 확인은 실시간으로 처리됩니다.
                </div>
            </div>
        </div>
      </section>
    </div>
  );
}

// --- 하위 컴포넌트 ---
// 🌟 모바일(터치)에서도 마우스 호버 애니메이션을 보여 주기 위한 훅
//   - 손가락이 닿으면 is-touch-active 클래스를 붙여 호버와 같은 효과를 냅니다.
//   - 스크롤/드래그로 손가락이 움직이면(또는 브라우저가 스크롤로 판단해 취소하면) 효과를 끕니다.
//   - 탭으로 끝나면 애니메이션이 보이도록 navDelay(ms) 만큼 기다렸다가 이동합니다.
//   - 마우스·펜 입력은 건드리지 않습니다 (기존 :hover 그대로).
function useTouchHover(navDelay: number) {
    const router = useRouter();
    const [active, setActive] = useState(false);
    const startRef = useRef<{ x: number; y: number } | null>(null);
    const pointerTypeRef = useRef<string>('mouse');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // 뒤로 가기로 돌아왔을 때(bfcache) 눌린 상태가 남지 않도록
        const reset = () => { setActive(false); startRef.current = null; };
        window.addEventListener('pageshow', reset);
        return () => {
            window.removeEventListener('pageshow', reset);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const onPointerDown = (e: React.PointerEvent) => {
        pointerTypeRef.current = e.pointerType;
        if (e.pointerType !== 'touch') return;
        startRef.current = { x: e.clientX, y: e.clientY };
        setActive(true);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (e.pointerType !== 'touch' || !startRef.current) return;
        if (Math.hypot(e.clientX - startRef.current.x, e.clientY - startRef.current.y) > 10) {
            startRef.current = null;
            setActive(false);
        }
    };
    const onPointerCancel = () => { startRef.current = null; setActive(false); };

    /** 터치 탭이면 true 를 돌려주고, 잠시 뒤 href 로 이동합니다. */
    const handleTap = (e: React.MouseEvent, href: string) => {
        if (pointerTypeRef.current !== 'touch' || e.detail === 0) return false; // 마우스·펜·키보드(Enter)는 바로 이동
        e.preventDefault();
        if (!startRef.current && !active) return true; // 스크롤로 취소된 터치
        setActive(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => router.push(href), navDelay);
        return true;
    };

    return { active, handleTap, handlers: { onPointerDown, onPointerMove, onPointerCancel } };
}

// 🌟 자주 사용하는 기능 아이콘
// 일러스트 PNG 대신 벡터 아이콘 + 항목별 그라데이션 배지로 구성합니다.
// from/to: 배지 그라데이션, rgb: 카드 아우라·호버 그림자 색 (rgb(var(--qi-rgb) / 0.2) 형태로 사용)
const QUICK_ICONS: Record<string, { icon: React.ElementType; desc: string; from: string; to: string; rgb: string }> = {
    '견적문의':     { icon: ChatCircleDots,     desc: '상품 금액 미리 확인', from: '#9aa8f6', to: '#5b6ee1', rgb: '107 125 230' },
    '구매대행신청': { icon: ShoppingCartSimple, desc: '일본 상품 대신 구매', from: '#f7bd72', to: '#e08a2e', rgb: '230 150 60' },
    '배송대행신청': { icon: AirplaneTilt,       desc: '도착 상품 국제 발송', from: '#f3a898', to: '#d9654f', rgb: '222 115 92' },
    '수수료 안내':  { icon: Receipt,            desc: '대행 수수료 기준',   from: '#f0adc0', to: '#d27391', rgb: '215 125 155' },
    '국제배송요금': { icon: Scales,             desc: '무게별 배송 요금',   from: '#88d6b1', to: '#3fa77a', rgb: '75 175 130' },
    '카톡문의':     { icon: Headset,            desc: '실시간 상담 연결',   from: '#c3a9e8', to: '#8a68c9', rgb: '145 110 205' },
};

function QuickIcon({ href, label }: any) {
    const meta = QUICK_ICONS[label] ?? QUICK_ICONS['견적문의'];
    const Icon = meta.icon;
    const touch = useTouchHover(420);
    return (
        <Link
            href={href}
            className="quick-link"
            style={{
                ...styles.quickLink,
                ['--qi-rgb' as any]: meta.rgb,
                ['--qi-from' as any]: meta.from,
                ['--qi-to' as any]: meta.to,
            }}
            onDragStart={(e) => e.preventDefault()}
            {...touch.handlers}
            onClick={(e) => { touch.handleTap(e, href); }}
        >
            <div className={`quick-icon-wrap${touch.active ? ' is-touch-active' : ''}`}>
                <div className="quick-icon-box quick-box">
                    <span className="quick-medallion" aria-hidden="true">
                        <Icon className="quick-medallion-icon" weight="duotone" />
                    </span>
                    <span className="quick-go" aria-hidden="true"><ArrowRight weight="bold" /></span>
                </div>
                <span className="quick-copy">
                    <span className="quick-label">{label}</span>
                    <span className="quick-desc">{meta.desc}</span>
                </span>
            </div>
        </Link>
    );
}

// 🌟 자주 방문하는 사이트 카드 (brandRgb: 로고 뒤 은은한 배경·호버 테두리에 쓰는 브랜드 색)
function SiteCard({ shopId, logoSrc, name, desc, tag, brandRgb = '148 163 184', onClick }: any) {
    const href = `/main_shop/${shopId}`;
    const touch = useTouchHover(560);
    return (
        <Link
            href={href}
            className="site-card-link"
            style={{ ...styles.siteCardLink, ['--brand-rgb' as any]: brandRgb }}
            onDragStart={(e) => e.preventDefault()}
            {...touch.handlers}
            onClick={(e) => { onClick?.(e); if (!e.defaultPrevented) touch.handleTap(e, href); }}
        >
            <div className={`site-card-box${touch.active ? ' is-touch-active' : ''}`}>
                {tag && <span className="site-card-tag">{tag}</span>}
                <div className="site-logo-wrap">
                    {/* 🍮 원본 로고는 그대로, 받침만 말랑한 젤리 느낌 (광택 · 볼록한 안쪽 그림자 · 호버 시 출렁) */}
                    <div className="site-jelly">
                        <img src={`/images/${logoSrc}.png`} alt={name} draggable="false" />
                    </div>
                </div>
                <div className="site-card-body">
                    <h3 className="site-card-name">{name}</h3>
                    <p className="site-card-desc">{desc}</p>
                </div>
                <span className="site-card-cta">
                    둘러보기 <ArrowRight weight="bold" />
                </span>
            </div>
        </Link>
    );
}

// 🌟 일본 인기 쇼핑몰 (외부 공식몰 링크) — 호버 색은 CSS 변수(--brand)로 처리
function SocialIcon({ url, src, brandColor, desc, isDragging }: any) {
    return (
        <Link
            href={`https://${url}`} target="_blank" rel="noopener noreferrer"
            className="social-link" style={{ ...styles.socialLink, ['--brand' as any]: brandColor }}
            onClick={(e) => isDragging && e.preventDefault()} onDragStart={(e) => e.preventDefault()}
        >
            <div className="social-item">
                <div className="social-circle">
                    <img src={`/images/${src}.png`} alt={desc} draggable="false" />
                    <span className="social-ext" aria-hidden="true"><ArrowUpRight weight="bold" /></span>
                </div>
                <span className="social-name">{desc}</span>
                <span className="social-sub">공식몰 바로가기</span>
            </div>
        </Link>
    );
}

// 🌟 공지 등록일은 카드가 좁아 "03.01" 처럼 월.일만 보여줍니다.
function formatNoticeDate(value: string) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function NoticeItem({ id, title, date, content }: any) {
    return (
        // 🌟 목록에는 제목만 들어가므로, 본문은 마우스를 올렸을 때 보이도록 title 속성에 넣습니다.
        //    클릭하면 공지사항 목록 페이지에서 해당 글이 펼쳐진 채로 열립니다.
        <li className="notice-row" title={content || undefined}>
            <Link href={`/guide/notice?id=${id}`} className="notice-link">
                <span className="notice-dot" aria-hidden="true"></span>
                <span className="notice-title">{title}</span>
                <span className="notice-date">{date}</span>
            </Link>
        </li>
    );
}

// ==========================================
// 🌟 스타일 객체
// ==========================================
const styles: Record<string, React.CSSProperties> = {
  quickLink: { textDecoration: 'none' },
  siteCardLink: { textDecoration: 'none' },
  socialLink: { textDecoration: 'none' },
  // 🌟 하단 정보 섹션(입금 계좌 등)과 Footer 사이가 빈 띠처럼 벌어져 보여 아래 여백을 없앴습니다
  //    (Footer 위 여백도 globals.css 에서 홈 페이지에 한해 0 으로 둡니다)
  pageWrapper: { backgroundColor: '#fff', minHeight: '100vh', paddingBottom: 0 },
  heroSection: { position: 'relative', overflow: 'hidden', cursor: 'grab', userSelect: 'none', backgroundColor: '#ffffff' },
  popularSection: { backgroundColor: '#fff', padding: '40px 0 60px 0', borderTop: '1px solid #f1f5f9' },
};