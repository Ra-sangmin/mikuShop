"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

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
  const nextSlide = () => { if (!isTransitioning) return; setCurrentBanner((prev) => prev + 1); };
  const prevSlide = () => { if (!isTransitioning) return; setCurrentBanner((prev) => prev - 1); };

  const handleTransitionEnd = () => {
    if (currentBanner === 0) { setIsTransitioning(false); setCurrentBanner(banners.length); } 
    else if (currentBanner === banners.length + 1) { setIsTransitioning(false); setCurrentBanner(1); }
  };

  const updateMask = () => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;

    // 1. 상태 판정 (5px 여유)
    const isAtStart = scrollLeft <= 5;
    const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 5;

    // 2. [화살표 제어] 기존 로직 유지 (시작/끝에 도달하면 클래스 추가)
    if (isAtStart) el.classList.add('is-start'); 
    else el.classList.remove('is-start');

    if (isAtEnd) el.classList.add('is-end'); 
    else el.classList.remove('is-end');

    // 3. [마스크 제어] 화살표가 떠 있는 동안 '계속' 활성화
    // 왼쪽으로 갈 수 있다면(!isAtStart) 왼쪽 마스크 유지
    if (!isAtStart) el.classList.add('mask-on-left');
    else el.classList.remove('mask-on-left');

    // 오른쪽으로 갈 수 있다면(!isAtEnd) 오른쪽 마스크 유지
    if (!isAtEnd) el.classList.add('mask-on-right');
    else el.classList.remove('mask-on-right');
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', updateMask);
      updateMask(); // 초기 실행
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

  // 🌟 화살표 클릭 시 좌우 스크롤 기능
  const handleManualScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400; // 한 번 클릭 시 이동할 거리
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div style={styles.pageWrapper}>
      <HomeGlobalStyles />

      {/* 🌟 1. 프리미엄 Hero Banner Section */}
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
            // 🌟 전체 높이를 80%로 조정 (부모 높이 기준)
            height: '100%', 
            width: `${extendedBanners.length * 100}%`,
            transform: `translateX(calc(-${currentBanner * (100 / extendedBanners.length)}% + ${dragOffset}px))`,
            transition: (dragStartX === null && isTransitioning) ? 'transform 0.8s cubic-bezier(0.25, 1, 0.3, 1)' : 'none'
          }}
        >
          {extendedBanners.map((banner, index) => (
            <div key={index} style={{
                width: `${100 / extendedBanners.length}%`, 
                // 🌟 아이템 높이도 부모(80%)의 100%를 꽉 채우도록 설정
                height: '100%', 
                background: `radial-gradient(circle at 75% 50%, ${banner.bgColor} 0%, #ffffff 65%)`,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                position: 'relative', 
                overflow: 'hidden'
            }}>
              {/* 🌟 배경 장식용 흐릿한 원형 (더 깊이감 있는 공간 연출) */}
              <div className="bg-blur-circle" style={{ backgroundColor: banner.bgColor }}></div>



              <div className="align-container banner-inner">
              {/* 텍스트 영역: 왼쪽 여백(paddingLeft)을 주어 오른쪽으로 밀어냄 */}
              <div 
                className="text-area" 
                style={{ 
                  marginRight: '60px', 
                  paddingLeft: '80px' // 🌟 이 값을 키울수록 글자가 오른쪽으로 이동합니다.
                }}
              >
                <div className="premium-badge">
                  <span className="badge-dot" style={{ backgroundColor: '#d27377' }}></span>
                  {banner.subTitle}
                </div>
                <h1 className="premium-hero-title">{banner.title}</h1>
              </div>

              {/* 이미지 영역: 오른쪽 여백(paddingRight)을 주어 왼쪽으로 밀어냄 */}
              <div 
                className="premium-image-area" 
                style={{ 
                  paddingRight: '80px' // 🌟 이 값을 키울수록 이미지가 왼쪽으로 이동합니다.
                }}
              >
                <div className="image-aura" style={{ backgroundColor: banner.bgColor }}></div>
                <img src={banner.image} alt="Miku" className="premium-floating-img" draggable="false" />
              </div>
            </div>


            </div>
          ))}
        </div>

        {/* 🌟 하이엔드 리퀴드 슬라이딩 바 인디케이터 */}
        <div className="premium-indicator-container">
          <div className="indicator-track">
            {/* 배경에 깔리는 옅은 구분선들 (선택 사항, 더 정교해 보임) */}
            {banners.map((_, i) => (
              <div key={i} className="track-segment"></div>
            ))}
            
            {/* 🌟 실제로 미끄러지듯 움직이는 활성 바 */}
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
      <section className="anim-item delay-1 align-container" style={{ marginTop: '80px', marginBottom: '80px' }}>
        <h2 className="section-title">자주 사용하는 기능</h2>
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
      <section className="anim-item delay-2" style={{ borderTop: '1px solid #f1f5f9', padding: '80px 0 100px 0', backgroundColor: '#fff' }}>
        <div className="align-container" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 className="section-title">자주 방문하는 사이트</h2>
          <div className="site-card-wrap">
              <SiteCard shopId="rakuten" logoSrc="rakuten_logo" name="라쿠텐" desc="일본 대표 종합 쇼핑몰" />
              <SiteCard shopId="yahoo_shopping" logoSrc="yahoo_shopping_logo" name="야후 쇼핑" desc="다양한 혜택의 야후 쇼핑" />
              <SiteCard shopId="amazon" logoSrc="amazon_logo" name="아마존" desc="빠른 배송의 아마존 재팬" />
              <SiteCard shopId="mercari" logoSrc="merukari_logo" name="메루카리" desc="일본 최대 중고거래 사이트" />
              <SiteCard shopId="yahoo_auction" logoSrc="yahoo_auction_logo" name="야후 옥션" desc="실시간 일본 옥션 입찰" />
          </div>
        </div>
      </section>

      {/* 4. Popular Sites */}
      <section className="anim-item delay-3" style={styles.popularSection}>
        <h2 className="section-title">일본 전문 쇼핑몰</h2>
        
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
          
          {/* 왼쪽 화살표 버튼 */}
          <button className="scroll-arrow-btn left" onClick={() => handleManualScroll('left')}>
            <i className="fa fa-chevron-left"></i>
          </button>
          {/* 오른쪽 화살표 버튼 */}
          <button className="scroll-arrow-btn right" onClick={() => handleManualScroll('right')}>
            <i className="fa fa-chevron-right"></i>
          </button>

        </div>
      </section>

      {/* 5. Bottom Info Section */}
      <section className="anim-item delay-4" style={{ borderTop: '1px solid #f1f5f9', padding: '80px 0', backgroundColor: '#fff' }}>
        <div className="align-container bottom-info-grid">
            <div className="bottom-info-box" style={styles.infoBox}>
                <div style={styles.infoHeaderWrap}><i className="fa fa-headset" style={styles.infoIconCS}></i><span style={styles.infoTitle}>CUSTOMER CENTER</span></div>
                <h3 style={styles.csHeading}>1:1문의 - 카카오톡</h3>
                <p style={styles.csDesc}>상담시간 ⏰ 10:00 ~ 24:00<br/><span style={styles.csHighlight}>365일 연중무휴</span> 실시간 대응</p>
                <div style={styles.csBtnWrap}><button style={styles.csKakaoBtn}>카카오톡</button><button style={styles.csReviewBtn}>이용후기</button></div>
            </div>
            <div className="bottom-info-box" style={styles.infoBox}>
                <div style={styles.infoHeaderWrap}><i className="fa fa-bullhorn" style={styles.infoIconNotice}></i><span style={styles.infoTitle}>NOTICE</span></div>
                <div style={styles.noticeListWrap}>
                    <NoticeItem title="미쿠짱 2026년 3월 국제 발송일정 안내" date="03.01" />
                    <NoticeItem title="미쿠짱 2026년 2월 국제 발송일정 안내" date="02.06" />
                    <NoticeItem title="아마존재팬 일본내 배송비 무료 혜택" date="10.15" />
                    <NoticeItem title="일본 구매대행 [미쿠짱] 이용 가이드" date="09.19" />
                </div>
                <Link href="#" style={styles.noticeMoreLink}>전체보기 <i className="fa fa-arrow-right" style={styles.noticeMoreIcon}></i></Link>
            </div>
            <div className="bottom-info-box" style={styles.infoBox}>
                <div style={styles.infoHeaderWrap}><i className="fa fa-university" style={styles.infoIconBank}></i><span style={styles.infoTitle}>BANK INFO</span></div>
                <div style={styles.bankWrap}><div style={styles.bankName}>🏦 KB 국민은행</div><div style={styles.bankAccount}>1234-56-7890</div><div style={styles.bankOwner}>예금주: 홍길동(미쿠짱)</div></div>
                <div style={styles.bankFooterWrap}><div style={styles.bankFooterText}>입금 확인은 실시간으로 처리됩니다.</div></div>
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
                <div className="icon-box quick-box"><img src={getImageSrc()} alt={label} style={styles.quickImg} draggable="false" /></div>
                <span className="quick-label">{label}</span>
            </div>
        </Link>
    );
}

function SiteCard({ shopId, logoSrc, name, desc }: any) {
    return (
        <Link href={`/main_shop/${shopId}`} className="site-card-link" style={styles.siteCardLink} onDragStart={(e) => e.preventDefault()}>
            <div className="site-card-box">
                <div className="site-logo-wrap">
                    <img src={`/images/${logoSrc}.png`} alt={name} style={styles.siteImg} draggable="false" />
                </div>
                <h3 style={styles.siteName}>{name}</h3><p style={styles.siteDesc}>{desc}</p>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 10px', borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'all 0.2s ease', backgroundColor: isHovered ? '#f8fafc' : 'transparent', borderRadius: '8px' }} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <span style={{ color: isHovered ? '#0f172a' : '#334155', fontSize: '15px', fontWeight: isHovered ? '700' : '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '15px', transition: 'color 0.2s' }}>{title}</span>
            <span style={{ color: isHovered ? '#f97316' : '#cbd5e1', fontSize: '13px', fontWeight: '600', flexShrink: 0, transition: 'color 0.2s' }}>{date}</span>
        </div>
    );
}

// ==========================================
// 🌟 전역 스타일 전용 컴포넌트 (프리미엄 전체 통합본)
// ==========================================
function HomeGlobalStyles() {
  return (
    <style jsx global>{`
      /* -------------------------------------
       * 1. 애니메이션 키프레임 
       * ------------------------------------- */
      @keyframes fadeInUp { 0% { opacity: 0; transform: translateY(40px); } 100% { opacity: 1; transform: translateY(0); } }
      @keyframes pulseSoft { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }
      @keyframes floatPremium { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-12px) scale(1.01); } }
      @keyframes pulseAura { 0% { transform: scale(0.9); opacity: 0.4; } 100% { transform: scale(1.1); opacity: 0.7; } }

      /* 공통 애니메이션 클래스 */
      .banner-text-anim { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

      /* -------------------------------------
       * 2. 섹션 공통 스타일 
       * ------------------------------------- */
      .section-title { font-family: 'Jua', sans-serif; font-size: 40px; color: #1e293b; text-align: center; margin-bottom: 40px; letter-spacing: -1px; }
      .align-container { max-width: 1280px; width: 100%; margin: 0 auto; padding: 0 20px; }

      /* -------------------------------------
       * 3. 🌟 최고급 프리미엄 메인 배너 
       * ------------------------------------- */
      .hero-banner-wrap { height: 416px; position: relative; }
      .banner-inner { display: flex; align-items: center; justify-content: space-between; height: 100%; position: relative; z-index: 2; width: 100%; }
      
      .bg-blur-circle { position: absolute; width: 600px; height: 600px; right: -10%; top: -20%; border-radius: 50%; filter: blur(80px); opacity: 0.4; z-index: 0; pointer-events: none; }

      .premium-hero-title { font-family: 'Jua', sans-serif; font-size: 58px; color: #1e293b; line-height: 1.25; margin-top: 25px; margin-bottom: 0; letter-spacing: -1.5px; text-shadow: 0 15px 30px rgba(0,0,0,0.04); }

      .premium-badge { display: inline-flex; align-items: center; gap: 8px; padding: 8px 22px; background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.9); box-shadow: 0 8px 20px rgba(0,0,0,0.03), inset 0 0 0 1px rgba(255,255,255,0.5); border-radius: 50px; font-weight: 800; font-size: 16px; color: #d27377; }
      .badge-dot { width: 6px; height: 6px; border-radius: 50%; box-shadow: 0 0 8px #d27377; }

      .premium-image-area { position: relative; display: flex; align-items: center; justify-content: center; }
      .image-aura { position: absolute; width: 280px; height: 280px; border-radius: 50%; filter: blur(50px); opacity: 0.6; z-index: 1; animation: pulseAura 4s ease-in-out infinite alternate; }
      .premium-floating-img { height: 380px; position: relative; z-index: 2; filter: drop-shadow(0 30px 40px rgba(0,0,0,0.15)); animation: floatPremium 4s ease-in-out infinite; }

      .align-container.banner-inner {
        display: flex;
        justify-content: space-between; /* 혹은 center */
        align-items: center;
        width: 50%;
        
        /* 부모의 좌우 패딩을 왕창 주면 콘텐츠가 가운데로 모입니다 */
        padding: 0 100px; 
        box-sizing: border-box;
      }

      /* 🌟 하이엔드 리퀴드 인디케이터 스타일 */
      .premium-indicator-container {
        position: absolute;
        /* 기존 25px에서 배너가 줄어든 20%만큼 더 위로 올림 */
        bottom: 25px; 
        left: 50%;
        transform: translateX(-50%);
        z-index: 10;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(8px);
        padding: 3px 12px; 
        border-radius: 30px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
      }
      
      .premium-indicator-container:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .indicator-track {
        position: relative;
        width: 210px; /* 1.5배 확장된 가로 길이는 유지 */
        /* 🌟 트랙 높이 4px -> 2px로 축소 */
        height: 2px; 
        display: flex;
        align-items: center;
      }

      .track-segment {
        flex: 1;
        height: 100%;
        border-right: 1px solid rgba(0, 0, 0, 0.03);
      }
      .track-segment:last-child { border-right: none; }

      .sliding-active-bar {
        position: absolute;
        top: -0.5px;
        height: 3px;
        
        /* 🌟 수정: 강한 빨강 대신 반투명한 파스텔 코랄 핑크 적용 */
        background: rgba(210, 115, 119, 0.45); 
        
        border-radius: 10px;
        transition: all 0.7s cubic-bezier(0.65, 0, 0.35, 1);
        
        /* 🌟 수정: 그림자도 훨씬 연하게 처리하여 눈의 피로도를 낮춤 */
        box-shadow: 0 0 8px rgba(210, 115, 119, 0.2);
      }

      .banner-item {
        display: flex;
        justify-content: center; /* 중앙 정렬 */
        align-items: center;
        gap: 40px; /* 글자와 이미지 사이의 간격. 이 값을 조절해 보세요! */
      }
      /* 왼쪽 텍스트 영역 */
      .banner-text-area {
        margin-left: 40px; /* 오른쪽으로 이동 */
      }

      /* 오른쪽 이미지 영역 */
      .banner-image-area {
        margin-right: 40px; /* 왼쪽으로 이동 */
      }

      /* -------------------------------------
       * 4. 퀵 아이콘 섹션 
       * ------------------------------------- */
      .quick-section { display: flex; justify-content: space-between; flex-wrap: wrap; margin-top: 60px; margin-bottom: 60px; }
      .quick-link { display: block; text-decoration: none; width: 180px; }
      .quick-icon-wrap { display: flex; flex-direction: column; align-items: center; gap: 20px; cursor: pointer; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      .quick-box { width: 180px; height: 180px; border-radius: 40px; background-color: #fff; border: 1px solid #f1f5f9; box-shadow: 0 10px 25px rgba(0,0,0,0.03); display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; overflow: hidden; padding: 15px; }
      .quick-label { font-size: 20px; font-weight: 900; color: #1e293b; letter-spacing: -0.5px; }

      @media (hover: hover) {
        .quick-icon-wrap:hover { transform: translateY(-10px); }
        .quick-icon-wrap:hover .icon-box { box-shadow: 0 15px 30px rgba(210, 115, 119, 0.15) !important; border-color: #d27377 !important; }
        .quick-icon-wrap:hover .icon-box img { animation: pulseSoft 1s infinite; }
      }

      /* -------------------------------------
       * 5. 사이트 카드 섹션 
       * ------------------------------------- */
      .site-card-wrap { display: flex; justify-content: space-between; flex-wrap: wrap; width: 100%; }
      .site-card-link { display: block; text-decoration: none; width: 240px; }
      .site-card-box { width: 100%; height: 100%; padding: 40px 20px; background-color: #fff; border-radius: 20px; border: 1px solid #f1f5f9; text-align: center; cursor: pointer; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; align-items: center; justify-content: flex-start; box-shadow: 0 10px 20px rgba(0,0,0,0.02); }
      .site-logo-wrap { width: 100%; height: 128px; margin-bottom: 24px; display: flex; align-items: center; justify-content: center; }

      @media (hover: hover) { .site-card-box:hover { transform: translateY(-12px); box-shadow: 0 25px 40px rgba(0, 0, 0, 0.08); border-color: #cbd5e1; } }

      /* -------------------------------------
       * 6. 인기 쇼핑몰 (소셜 스크롤 마스크 유지) 
       * ------------------------------------- */
      .social-wrap { display: flex; gap: 50px; overflow-x: auto; width: 100%; scrollbar-width: none; transition: mask-image 0.3s ease; padding: 40px 0; user-select: none; touch-action: pan-y; }
      .social-wrap.is-start { mask-image: linear-gradient(to right, black 90%, transparent); -webkit-mask-image: linear-gradient(to right, black 90%, transparent); }
      .social-wrap.is-end { mask-image: linear-gradient(to right, transparent, black 10%); -webkit-mask-image: linear-gradient(to right, transparent, black 10%); }
      .social-wrap::-webkit-scrollbar { display: none; }
      .social-link { display: block; text-decoration: none; flex-shrink: 0; }
      .social-circle { width: 180px; height: 180px; border-radius: 40px; background-color: #fff; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 15px; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }

      /* 🌟 스크롤 화살표 프리미엄 스타일 */
      .scroll-arrow-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 45px;
        height: 45px;
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(210, 115, 119, 0.2);
        border-radius: 50%;
        color: #d27377;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      .scroll-arrow-btn:hover {
        background: #d27377;
        color: #fff;
        transform: translateY(-50%) scale(1.1);
        box-shadow: 0 6px 20px rgba(210, 115, 119, 0.3);
      }

      .scroll-arrow-btn.left { left: -60px; }
      .scroll-arrow-btn.right { right: -60px; }

      /* 🌟 스마트 숨김 로직: 컨테이너의 클래스 상태에 따라 화살표 제어 */
      /* 맨 왼쪽(is-start)일 때 왼쪽 버튼 숨김 */
      .social-wrap.is-start ~ .scroll-arrow-btn.left {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }

      /* 맨 오른쪽(is-end)일 때 오른쪽 버튼 숨김 */
      .social-wrap.is-end ~ .scroll-arrow-btn.right {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }

      /* -------------------------------------
       * 7. 하단 3단 정보 섹션 
       * ------------------------------------- */
      .bottom-info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; align-items: stretch; margin-top: 80px; margin-bottom: 80px; width: 100%; }


      /* 화살표 숨김 로직 (기존 스타일) */
      .is-start .arrow-left { display: none; }
      .is-end .arrow-right { display: none; }

      /* 마스크 로직: 화살표가 있는 동안 계속 유지될 스타일 */
      .scroll-container {
        /* 마스크 애니메이션을 부드럽게 */
        transition: mask-image 0.2s ease;
        -webkit-mask-image: none; /* 기본 상태 */
      }

      /* 왼쪽 화살표가 활성화된 동안 계속 나타날 마스크 */
      .mask-on-left {
        -webkit-mask-image: linear-gradient(to right, transparent 0%, black 10%);
      }

      /* 오른쪽 화살표가 활성화된 동안 계속 나타날 마스크 */
      .mask-on-right {
        -webkit-mask-image: linear-gradient(to left, transparent 0%, black 10%);
      }

      /* 양쪽 다 이동 가능할 때 (가장 많이 보게 될 상태) */
      .mask-on-left.mask-on-right {
        -webkit-mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
      }

      /* 🌟 반응형: 화면이 작아져서 화살표가 화면 밖으로 나갈 경우를 대비 */
      @media (max-width: 1400px) {
        .scroll-arrow-btn.left { left: -20px; }
        .scroll-arrow-btn.right { right: -20px; }
        /* 카드가 살짝 비치도록 화살표 배경 투명도 조절 (선택 사항) */
        .scroll-arrow-btn { background: rgba(255, 255, 255, 0.9); }
      }
        
      /* -------------------------------------
       * 📱 8. 모바일 대응 (반응형 최적화) 
       * ------------------------------------- */
      @media (max-width: 768px) {
        .section-title { font-size: 24px; margin-bottom: 25px; }
        
        /* 배너 반응형 */
        .hero-banner-wrap { height: 360px; } 
        .premium-hero-title { font-size: 32px; margin-top: 15px; } 
        .premium-badge { font-size: 13px; padding: 6px 16px; } 
        .premium-floating-img { height: 220px; }
        .bg-blur-circle { width: 300px; height: 300px; }
        .image-aura { width: 150px; height: 150px; }
        .premium-indicators { bottom: 20px; }
        .line-dot { width: 20px; }
        .premium-indicator-container { 
          bottom: calc(20% + 20px); 
          padding: 2px 8px;
        }
        .indicator-track { 
          width: 135px; 
          height: 1.5px; /* 모바일은 더 얇게 */
        }
        .sliding-active-bar { 
          height: 2.5px; 
          top: -0.5px;
        }

        /* 아이콘 그리드 반응형 */
        .quick-section { justify-content: center; gap: 15px; margin: 30px auto; } 
        .quick-link { width: calc(33.333% - 15px); } 
        .quick-icon-wrap { width: 100%; gap: 10px; } 
        .quick-box { width: 100%; height: 90px; border-radius: 20px; padding: 10px; } 
        .quick-label { font-size: 13px; text-align: center; display: block; margin-top: 8px; }
        
        /* 사이트 카드 반응형 */
        .site-card-wrap { justify-content: center; gap: 15px; } 
        .site-card-link { width: calc(50% - 10px); } 
        .site-card-box { padding: 25px 15px; border-radius: 16px; } 
        .site-logo-wrap { height: 80px; margin-bottom: 15px; }
        
        .scroll-arrow-btn { display: none; }

        /* 스크롤 섹션 반응형 */
        .social-wrap { gap: 15px; padding: 10px 0 30px 0; } 
        .social-link { width: auto; display: block; } 
        .social-circle { width: 110px !important; height: 90px !important; border-radius: 20px !important; padding: 10px !important; }
        
        /* 정보 박스 반응형 */
        .bottom-info-grid { grid-template-columns: 1fr; gap: 20px; margin: 40px auto; } 
        .bottom-info-box { padding: 30px 20px !important; }
      }
    `}</style>
  );
}

// ==========================================
// 🌟 스타일 객체
// ==========================================
const styles: Record<string, React.CSSProperties> = {
  infoBox: { backgroundColor: '#fff', padding: '40px 30px', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' },
  infoHeaderWrap: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px', color: '#1e293b' },
  infoIconCS: { fontSize: '20px', color: '#6366f1' },
  infoIconNotice: { fontSize: '20px', color: '#f59e0b' },
  infoIconBank: { fontSize: '20px', color: '#10b981' },
  infoTitle: { fontSize: '18px', fontWeight: 'bold', letterSpacing: '-0.5px' },
  csHeading: { fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' },
  csDesc: { fontSize: '15px', color: '#64748b', lineHeight: '1.6', marginBottom: '30px' },
  csHighlight: { color: '#6366f1', fontWeight: '600' },
  csBtnWrap: { display: 'flex', gap: '12px', marginTop: 'auto' },
  csKakaoBtn: { flex: 1, padding: '14px', backgroundColor: '#fee500', color: '#3c1e1e', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 10px rgba(254, 229, 0, 0.2)' },
  csReviewBtn: { flex: 1, padding: '14px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s' },
  noticeListWrap: { display: 'flex', flexDirection: 'column' },
  noticeMoreLink: { display: 'inline-block', marginTop: 'auto', paddingTop: '20px', fontSize: '14px', color: '#94a3b8', textDecoration: 'none', fontWeight: '600', transition: 'color 0.2s' },
  noticeMoreIcon: { fontSize: '10px' },
  bankWrap: { marginBottom: '20px' },
  bankName: { fontSize: '16px', color: '#64748b', marginBottom: '8px', fontWeight: 'bold' },
  bankAccount: { fontSize: '28px', fontWeight: '900', letterSpacing: '1px', marginBottom: '8px', color: '#0f172a' },
  bankOwner: { fontSize: '15px', color: '#334155', fontWeight: '500' },
  bankFooterWrap: { marginTop: 'auto', paddingTop: '30px' },
  bankFooterText: { padding: '12px', backgroundColor: '#ecfdf5', borderRadius: '12px', textAlign: 'center', fontSize: '13px', color: '#059669', fontWeight: '600' },
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