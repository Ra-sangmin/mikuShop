"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useMikuAlert } from '@/app/context/MikuAlertContext';

export const dynamic = "force-dynamic";

// 1. 배너 데이터 구조 정의
interface Banner {
  title: React.ReactNode;
  subTitle: string;
  image: string;
  bgColor: string;
}

export default function HomePage() {
  const banners: Banner[] = [
    { title: <>안전포장 빠른배송<br />평일 매일 국제발송</>, subTitle: "합리적이고 저렴한 배송비", bgColor: "#E2F0D9", image: "/images/hero.png" },
    { title: <>일본 쇼핑의 시작<br />미쿠짱과 함께하세요</>, subTitle: "최저가 구매대행 서비스", bgColor: "#FFF4CC", image: "/images/hero.png" },
    { title: <>메루카리·야후옥션<br />실시간 입찰 및 구매</>, subTitle: "간편한 일본 직구 솔루션", bgColor: "#E1F5FE", image: "/images/hero.png" },
    { title: <>다양한 혜택과 이벤트<br />회원 등급별 포인트 적립</>, subTitle: "신규 가입 시 적립금 증정", bgColor: "#FFEBEE", image: "/images/hero.png" }
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
  useEffect(() => { if (isPaused) return; const timer = setInterval(nextSlide, 5000); return () => clearInterval(timer); }, [isTransitioning, isPaused]); 

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => { setDragStartX('touches' in e ? e.touches[0].clientX : e.clientX); setIsPaused(true); };
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => { if (dragStartX === null) return; setDragOffset(('touches' in e ? e.touches[0].clientX : e.clientX) - dragStartX); };
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
        onMouseDown={handleDragStart} onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}
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
            <div key={index} style={{
                width: `${100 / extendedBanners.length}%`, 
                height: '100%', 
                background: `radial-gradient(circle at 75% 50%, ${banner.bgColor} 0%, #ffffff 65%)`,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                position: 'relative', 
                overflow: 'hidden'
            }}>
              <div className="bg-blur-circle" style={{ backgroundColor: banner.bgColor }}></div>
                <div className="align-container banner-inner">
                    <div className="text-area">
                      <div className="premium-badge">
                        <span className="badge-dot" style={{ backgroundColor: '#d27377' }}></span>
                        {banner.subTitle}
                      </div>
                      <h1 className="premium-hero-title">{banner.title}</h1>
                    </div>

                    <div className="premium-image-area">
                      <div className="image-aura" style={{ backgroundColor: banner.bgColor }}></div>
                      <img src={banner.image} alt="Miku" className="premium-floating-img" draggable="false" />
                    </div>
                  </div>
              </div>
          ))}
        </div>

        {/* 하이엔드 리퀴드 슬라이딩 바 인디케이터 */}
        <div className="premium-indicator-container">
          <div className="indicator-track">
            {banners.map((_, i) => (
              <div key={i} className="track-segment"></div>
            ))}
            
            <div 
              className="sliding-active-bar"
              style={{
                width: `${100 / banners.length}%`,
                left: `${(currentBanner === 0 ? banners.length - 1 : currentBanner === banners.length + 1 ? 0 : currentBanner - 1) * (100 / banners.length)}%`
              }}
            ></div>
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
            <QuickIcon href="/contact" label="카톡문의" />
        </div>
      </section>

      {/* 3. Frequently Visited Sites */}
      <section className="frequent-sites-section anim-item delay-2" style={{ borderTop: '1px solid #f1f5f9', padding: '80px 0 100px 0', backgroundColor: '#fff' }}>
        <div className="align-container" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 className="home-section-title">자주 방문하는 사이트</h2>
          <div className="site-card-wrap">
              <SiteCard shopId="mercari" logoSrc="merukari_logo" name="메루카리" desc="일본 최대 중고거래 사이트" />
              <SiteCard shopId="rakuten" logoSrc="rakuten_logo" name="라쿠텐" desc="일본 대표 종합 쇼핑몰" />
              <SiteCard shopId="yahoo_shopping" logoSrc="yahoo_shopping_logo" name="야후 쇼핑" desc="다양한 혜택의 야후 쇼핑"/>
              {/* <SiteCard shopId="amazon" logoSrc="amazon_logo" name="아마존" desc="빠른 배송의 아마존 재팬" onClick={handleComingSoon}/> */}
              <SiteCard shopId="yahoo_auction" logoSrc="yahoo_auction_logo" name="야후 옥션" desc="실시간 일본 옥션 입찰"/>
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
          
          <button className="scroll-arrow-btn left" onClick={() => handleManualScroll('left')}>
            <i className="fa fa-chevron-left"></i>
          </button>
          <button className="scroll-arrow-btn right" onClick={() => handleManualScroll('right')}>
            <i className="fa fa-chevron-right"></i>
          </button>

        </div>
      </section>

      {/* 5. Bottom Info Section */}
      <section className="bottom-info-section anim-item delay-4" style={{ borderTop: '1px solid #f1f5f9', padding: '80px 0', backgroundColor: '#fff' }}>
        <div className="align-container bottom-info-grid">
            <div className="bottom-info-box" style={styles.infoBox}>
                <div style={styles.infoHeaderWrap}><span className="cs-icon-badge"><i className="fa fa-headset" style={{ fontSize: '15px' }}></i></span><span style={styles.infoTitle}>CUSTOMER CENTER</span></div>
                <h3 style={styles.csHeading}>1:1문의 <span style={styles.csHeadingAccent}>카카오톡</span></h3>
                <div style={styles.csMetaRow}>
                    <span style={styles.csTimeBadge}><i className="fa fa-clock" style={{ fontSize: '11px' }}></i> 10:00 ~ 24:00</span>
                    <span style={styles.csDayBadge}>365일 연중무휴</span>
                </div>
                <p style={styles.csDesc}>실시간 대응으로 빠르게 도와드립니다</p>
                <div style={styles.csBtnWrap}>
                    <button
                      className="cs-kakao-btn"
                      style={styles.csKakaoBtn}
                      onClick={() => window.location.href = '/contact'}
                    >
                      <img src="/images/kakao_icon/kakaotalk_sharing_btn_small_notBG.png" alt="" />
                      카카오톡
                    </button>
                </div>
            </div>
            <div className="bottom-info-box" style={styles.infoBox}>
                <div style={styles.infoHeaderWrap}><span className="info-icon-badge badge-notice"><i className="fa fa-bullhorn" style={{ fontSize: '15px' }}></i></span><span style={styles.infoTitle}>NOTICE</span></div>
                <div style={styles.noticeListWrap}>
                    <NoticeItem title="미쿠짱 2026년 3월 국제 발송일정 안내" date="03.01" />
                    <NoticeItem title="미쿠짱 2026년 2월 국제 발송일정 안내" date="02.06" />
                    <NoticeItem title="아마존재팬 일본내 배송비 무료 혜택" date="10.15" />
                    <NoticeItem title="일본 구매대행 [미쿠짱] 이용 가이드" date="09.19" />
                </div>
                <Link href="#" style={styles.noticeMoreLink}>전체보기 <i className="fa fa-arrow-right" style={styles.noticeMoreIcon}></i></Link>
            </div>
            <div className="bottom-info-box" style={styles.infoBox}>
                <div style={styles.infoHeaderWrap}><span className="info-icon-badge badge-bank"><i className="fa fa-university" style={{ fontSize: '15px' }}></i></span><span style={styles.infoTitle}>BANK INFO</span></div>
                <div style={styles.bankWrap}>
                    <div style={styles.bankNameRow}>
                        <img src="/images/sinhan_bank.png" alt="신한은행" style={styles.bankLogoDot} />
                        <span style={styles.bankName}>신한은행</span>
                    </div>
                    <div style={styles.bankAccountRow}>
                        <span style={styles.bankAccount}>110-629-593784</span>
                        <button
                          type="button"
                          className="bank-copy-btn"
                          onClick={() => { navigator.clipboard.writeText('110-629-593784'); showAlert('계좌번호가 복사되었습니다.', 'success'); }}
                        >
                          <i className="fa fa-copy" style={{ fontSize: '11px' }}></i> 복사
                        </button>
                    </div>
                    <div style={styles.bankOwner}>예금주 · 미쿠짱</div>
                </div>
                <div style={styles.bankFooterWrap}><div style={styles.bankFooterText}><i className="fa fa-shield-halved" style={{ fontSize: '12px', marginRight: '6px' }}></i>입금 확인은 실시간으로 처리됩니다.</div></div>
            </div>
        </div>
      </section>
    </div>
  );
}

// --- 하위 컴포넌트 ---
function QuickIcon({ href, label }: any) {
    const getImageSrc = () => {
        const basePath = '/images/main_icon';
        const iconMap: Record<string, string> = { '견적문의': 'icon_0.png', '구매대행신청': 'icon_1.png', '배송대행신청': 'icon_2.png', '수수료 안내': 'icon_3.png', '국제배송요금': 'icon_4.png', '카톡문의': 'icon_5.png' };
        return `${basePath}/${iconMap[label] || 'icon_0.png'}`;
    };
    return (
        <Link href={href} className="quick-link" style={styles.quickLink} onDragStart={(e) => e.preventDefault()}>
            <div className="quick-icon-wrap">
                <div className="quick-icon-box quick-box"><img src={getImageSrc()} alt={label} style={styles.quickImg} draggable="false" /></div>
                <span className="quick-label">{label}</span>
            </div>
        </Link>
    );
}

function SiteCard({ shopId, logoSrc, name, desc, onClick }: any) {
    return (
        <Link 
            href={`/main_shop/${shopId}`} 
            className="site-card-link" 
            style={styles.siteCardLink} 
            onDragStart={(e) => e.preventDefault()}
            onClick={onClick} 
        >
            <div className="site-card-box">
                <div className="site-logo-wrap">
                    <img src={`/images/${logoSrc}.png`} alt={name} style={styles.siteImg} draggable="false" />
                </div>
                <h3 style={styles.siteName}>{name}</h3>
                <p style={styles.siteDesc}>{desc}</p>
            </div>
        </Link>
    );
}

function SocialIcon({ url, src, brandColor, desc, isDragging }: any) {
    const [isHover, setIsHover] = useState(false);
    return (
        <Link 
            href={`https://${url}`} target="_blank" className="social-link" style={styles.socialLink} title={""} 
            onClick={(e) => isDragging && e.preventDefault()} onDragStart={(e) => e.preventDefault()}
        >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }} onMouseEnter={() => setIsHover(true)} onMouseLeave={() => setIsHover(false)}>
                <div className="social-circle" style={{ border: `3px solid ${isHover ? brandColor : brandColor + '33'}`, boxShadow: isHover ? `0 20px 40px -10px ${brandColor + '44'}` : '0 10px 20px -5px rgba(0,0,0,0.05)', transform: isHover ? 'translateY(-10px)' : 'none', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    <img src={`/images/${src}.png`} alt={desc} style={styles.socialImg} draggable="false" /> 
                </div>
                <span style={{ fontSize: '18px', fontWeight: '800', color: isHover ? brandColor : '#1e293b', transition: 'color 0.3s ease', letterSpacing: '-0.5px' }}>{desc}</span>
            </div>
        </Link>
    );
}

function NoticeItem({ title, date }: any) {
    const [isHovered, setIsHovered] = useState(false);
    return (
        <div className="notice-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 10px', borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'all 0.2s ease', backgroundColor: isHovered ? '#f8fafc' : 'transparent', borderRadius: '8px' }} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, marginRight: '15px' }}>
                <span className="notice-dot"></span>
                <span style={{ color: isHovered ? '#0f172a' : '#334155', fontSize: '15px', fontWeight: isHovered ? '700' : '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color 0.2s' }}>{title}</span>
            </span>
            <span style={{ color: isHovered ? '#ea580c' : '#94a3b8', backgroundColor: isHovered ? '#fff7ed' : '#f8fafc', fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', flexShrink: 0, transition: 'all 0.2s' }}>{date}</span>
        </div>
    );
}

// ==========================================
// 🌟 스타일 객체
// ==========================================
const styles: Record<string, React.CSSProperties> = {
  infoBox: { backgroundColor: '#fff', padding: '40px 30px', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' },
  infoHeaderWrap: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px', color: '#1e293b' },
  infoTitle: { fontSize: '18px', fontWeight: 'bold', letterSpacing: '-0.5px' },
  csHeading: { fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '14px', letterSpacing: '-0.3px' },
  csHeadingAccent: { backgroundImage: 'linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' },
  csMetaRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' },
  csTimeBadge: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#475569', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '6px 14px' },
  csDayBadge: { display: 'inline-flex', alignItems: 'center', fontSize: '13px', fontWeight: '700', color: '#4f46e5', backgroundColor: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.16)', borderRadius: '20px', padding: '6px 14px' },
  csDesc: { fontSize: '15px', color: '#64748b', lineHeight: '1.6', marginBottom: '30px' },
  csBtnWrap: { display: 'flex', gap: '12px', marginTop: 'auto' },
  csKakaoBtn: { flex: 1, padding: '14px', color: '#3c1e1e', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' },
  csReviewBtn: { flex: 1, padding: '14px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s' },
  noticeListWrap: { display: 'flex', flexDirection: 'column' },
  noticeMoreLink: { display: 'inline-block', marginTop: 'auto', paddingTop: '20px', fontSize: '14px', color: '#94a3b8', textDecoration: 'none', fontWeight: '600', transition: 'color 0.2s' },
  noticeMoreIcon: { fontSize: '10px' },
  bankWrap: { marginBottom: '20px' },
  bankNameRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' },
  bankLogoDot: { width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 },
  bankName: { fontSize: '15px', color: '#64748b', fontWeight: 'bold' },
  bankAccountRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' },
  bankAccount: { fontSize: '26px', fontWeight: '900', letterSpacing: '0.5px', color: '#0f172a' },
  bankOwner: { fontSize: '14px', color: '#94a3b8', fontWeight: '600', letterSpacing: '0.2px' },
  bankFooterWrap: { marginTop: 'auto', paddingTop: '30px' },
  bankFooterText: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', backgroundColor: '#ecfdf5', borderRadius: '12px', textAlign: 'center', fontSize: '13px', color: '#059669', fontWeight: '600' },
  quickLink: { textDecoration: 'none' },
  quickImg: { width: '65%', height: '65%', objectFit: 'contain' },
  siteCardLink: { textDecoration: 'none' },
  siteImg: { maxWidth: '90%', maxHeight: '100%', objectFit: 'contain' },
  siteName: { fontWeight: '900', color: '#0f172a', fontSize: '17px', marginBottom: '8px' },
  siteDesc: { color: '#64748b', lineHeight: '1.4', fontWeight: '500', fontSize: '13px' },
  socialLink: { textDecoration: 'none' },
  socialImg: { width: '65%', height: '65%', objectFit: 'contain' },
  pageWrapper: { backgroundColor: '#fff', minHeight: '100vh', paddingBottom: '50px' },
  heroSection: { position: 'relative', overflow: 'hidden', cursor: 'grab', userSelect: 'none', backgroundColor: '#eee' },
  popularSection: { backgroundColor: '#fff', padding: '40px 0 60px 0', borderTop: '1px solid #f1f5f9' },
};