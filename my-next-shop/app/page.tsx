"use client";
// 🌟 useRef가 추가된 올바른 import 선언 (빌드 에러 해결)
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const banners = [
    { title: <>안전포장 빠른배송<br />평일 매일 국제발송</>, subTitle: "합리적이고 저렴한 배송비", bgColor: "#B1C9A7", image: "/images/hero.png" },
    { title: <>일본 쇼핑의 시작<br />미쿠짱과 함께하세요</>, subTitle: "최저가 구매대행 서비스", bgColor: "#fcd34d", image: "/images/hero.png" },
    { title: <>메루카리·야후옥션<br />실시간 입찰 및 구매</>, subTitle: "간편한 일본 직구 솔루션", bgColor: "#93c5fd", image: "/images/hero.png" },
    { title: <>다양한 혜택과 이벤트<br />회원 등급별 포인트 적립</>, subTitle: "신규 가입 시 적립금 증정", bgColor: "#fda4af", image: "/images/hero.png" }
  ];

  const extendedBanners = [banners[banners.length - 1], ...banners, banners[0]];

  const [currentBanner, setCurrentBanner] = useState(1);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // 🌟 가로 스크롤 드래그를 위한 Ref 및 State (이전 코드 복원)
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrollDrag, setIsScrollDrag] = useState(false);
  const [scrollStartX, setScrollStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);

  // --- 배너 드래그 로직 ---
  const nextSlide = () => { if (!isTransitioning) return; setCurrentBanner((prev) => (prev >= banners.length + 1 ? prev : prev + 1)); };
  const prevSlide = () => { if (!isTransitioning) return; setCurrentBanner((prev) => (prev <= 0 ? prev : prev - 1)); };

  const handleTransitionEnd = () => {
    if (currentBanner === 0) { setIsTransitioning(false); setCurrentBanner(banners.length); } 
    else if (currentBanner === banners.length + 1) { setIsTransitioning(false); setCurrentBanner(1); }
  };
  // 🌟 스크롤 위치에 따라 마스크 클래스를 변경하는 함수
  const updateMask = () => {
    const el = scrollRef.current;
    if (!el) return;

    const isAtStart = el.scrollLeft <= 5; // 맨 왼쪽 (약간의 여유값 5px)
    const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 5; // 맨 오른쪽

    // 클래스를 직접 조작하여 성능을 최적화합니다.
    if (isAtStart) el.classList.add('is-start'); else el.classList.remove('is-start');
    if (isAtEnd) el.classList.add('is-end'); else el.classList.remove('is-end');
  };

  // useEffect에 초기 실행 및 이벤트 등록
  useEffect(() => {
    updateMask(); // 초기 실행
  }, []);

  useEffect(() => {
    if (!isTransitioning) { const timer = setTimeout(() => setIsTransitioning(true), 50); return () => clearTimeout(timer); }
  }, [isTransitioning]);

  useEffect(() => {
    if (isPaused) return; 
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [isTransitioning, isPaused]); 

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => { setDragStartX('touches' in e ? e.touches[0].clientX : e.clientX); setIsPaused(true); };
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => { if (dragStartX === null) return; setDragOffset(('touches' in e ? e.touches[0].clientX : e.clientX) - dragStartX); };
  const handleDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (dragStartX === null) return;
    setIsPaused(false); 
    if (Math.abs(dragOffset) > 100) { dragOffset > 0 ? prevSlide() : nextSlide(); }
    setDragStartX(null); setDragOffset(0);
  };

  // 🌟 --- 쇼핑몰 스크롤 드래그 로직 (드래그 안 됨 문제 해결을 위한 로직 복원) ---
  const onScrollDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); 
    setIsScrollDrag(true);
    setHasDragged(false); // 🌟 마우스를 누를 때 드래그 상태 초기화 (클릭과 구분)
    const clientX = 'touches' in e ? e.touches[0].clientX : e.pageX;
    if (scrollRef.current) {
      setScrollStartX(clientX - scrollRef.current.offsetLeft);
      setScrollLeftPos(scrollRef.current.scrollLeft);
    }
  };
  const onScrollDragEnd = () => { setIsScrollDrag(false); }; // MouseUp 시 drag 상태만 종료
  const onScrollDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isScrollDrag || !scrollRef.current) return;
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.pageX;
    const x = clientX - scrollRef.current.offsetLeft;
    const walk = (x - scrollStartX); 
    
    if (Math.abs(walk) > 5) setHasDragged(true); // 🌟 5px 이상 움직이면 '드래그 한 것'으로 판정!

    scrollRef.current.scrollLeft = scrollLeftPos - walk;
  };

  return (
    <div style={styles.pageWrapper}>
      {/* 🌟 전역 스타일 함수 호출 */}
      <HomeGlobalStyles />

      {/* 1. Hero Banner Section */}
      <section 
        className="anim-item hero-banner-wrap"
        onMouseDown={handleDragStart} onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}
        style={styles.heroSection}
      >
        <div 
          onTransitionEnd={handleTransitionEnd}
          style={{
            display: 'flex', height: '100%', width: `${extendedBanners.length * 100}%`,
            transform: `translateX(calc(-${currentBanner * (100 / extendedBanners.length)}% + ${dragOffset}px))`,
            transition: (dragStartX === null && isTransitioning) ? 'transform 0.5s ease-in-out' : 'none'
        }}>
          {extendedBanners.map((banner, index) => (
            <div key={index} style={{
                width: `${100 / extendedBanners.length}%`, height: '100%', backgroundColor: banner.bgColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.5s ease'
            }}>
              <div className="align-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ color: '#000', zIndex: 2 }} className={currentBanner === index ? "banner-text-anim" : ""}>
                  <h1 className="hero-title" style={{ fontWeight: '900', lineHeight: '1.1', marginBottom: '15px' }}>{banner.title}</h1>
                  <div className="hero-sub" style={{ backgroundColor: '#000', color: banner.bgColor, display: 'inline-block', padding: '8px 20px', borderRadius: '30px', fontWeight: 'bold' }}>{banner.subTitle}</div>
                </div>
                <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
                  <img src={banner.image} alt="Miku Raccoon" draggable="false" className="hero-img" style={{ objectFit: 'contain', pointerEvents: 'none' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px' }}>
            {banners.map((_, i) => {
                const activeIndex = currentBanner === 0 ? banners.length - 1 : (currentBanner === banners.length + 1 ? 0 : currentBanner - 1);
                return (
                    <div 
                        key={i} onClick={() => setCurrentBanner(i + 1)}
                        style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: i === activeIndex ? '#ff4b2b' : '#fff', opacity: i === activeIndex ? 1 : 0.5, cursor: 'pointer', transition: 'all 0.3s ease' }}
                    ></div>
                );
            })}
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
      <section 
        className="anim-item delay-2" 
        style={{ 
          borderTop: '1px solid #f1f5f9', 
          padding: '80px 0 100px 0',
          backgroundColor: '#fff' 
        }}
      >
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

      {/* 4. Popular Sites (🌟 align-container 적용, 드래그 안 됨 문제 해결을 위해 Ref 및 이벤트 연결) */}
      <section className="anim-item delay-3" style={styles.popularSection}>
        <h2 className="section-title">일본 전문 쇼핑몰</h2>
        <div className="align-container">
            <div 
              className="social-wrap is-start" // 기본적으로 시작 상태 클래스 부여
              ref={scrollRef}
              onScroll={updateMask} // 🌟 스크롤 할 때마다 마스크 업데이트
              onMouseDown={onScrollDragStart} 
              onMouseLeave={onScrollDragEnd} 
              onMouseUp={onScrollDragEnd} 
              onMouseMove={onScrollDragMove}
              onTouchStart={onScrollDragStart} 
              onTouchEnd={onScrollDragEnd} 
              onTouchMove={onScrollDragMove}
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
        </div>
      </section>

      {/* 5. Bottom Info Section */}
      <section 
        className="anim-item delay-4" 
        style={{ 
          borderTop: '1px solid #f1f5f9', 
          padding: '80px 0', 
          backgroundColor: '#fff' 
        }}
      >
        <div className="align-container bottom-info-grid">
            {/* 고객센터 */}
            <div className="bottom-info-box" style={styles.infoBox}>
                <div style={styles.infoHeaderWrap}><i className="fa fa-headset" style={styles.infoIconCS}></i><span style={styles.infoTitle}>CUSTOMER CENTER</span></div>
                <h3 style={styles.csHeading}>1:1문의 - 카카오톡</h3>
                <p style={styles.csDesc}>상담시간 ⏰ 10:00 ~ 24:00<br/><span style={styles.csHighlight}>365일 연중무휴</span> 실시간 대응</p>
                <div style={styles.csBtnWrap}><button style={styles.csKakaoBtn}>카카오톡</button><button style={styles.csReviewBtn}>이용후기</button></div>
            </div>
            {/* 공지사항 */}
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
            {/* 입금계좌안내 */}
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


{/* 🌟 전역 스타일 함수 모음 */}

// 🌟 QuickIcon
function QuickIcon({ href, label }: any) {
    const getImageSrc = () => {
        const basePath = '/images/main_icon';
        const iconMap: Record<string, string> = { '견적문의': 'icon_0.png', '구매대행신청': 'icon_1.png', '배송대행신청': 'icon_2.png', '수수료 안내': 'icon_3.png', '국제배송요금': 'icon_4.png', '카톡문의': 'icon_5.png' };
        return `${basePath}/${iconMap[label] || 'icon_0.png'}`;
    };
    return (
        <Link href={href} className="quick-link" style={styles.quickLink}>
            <div className="quick-icon-wrap">
                <div className="icon-box quick-box"><img src={getImageSrc()} alt={label} style={styles.quickImg} /></div>
                <span className="quick-label">{label}</span>
            </div>
        </Link>
    );
}

// 🌟 SiteCard 
function SiteCard({ shopId, logoSrc, name, desc }: any) {
    return (
        <Link href={`/main_shop/${shopId}`} className="site-card-link" style={styles.siteCardLink}>
            <div className="site-card-box">
                <div className="site-logo-wrap">
                    <img 
                        src={`/images/${logoSrc}.png`} alt={name} style={styles.siteImg}
                        onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none'; if(t.parentElement) t.parentElement.innerHTML = `<div style="font-size: 48px; font-weight: 900; color: #cbd5e1">${name[0]}</div>`; }}
                    />
                </div>
                <h3 style={styles.siteName}>{name}</h3><p style={styles.siteDesc}>{desc}</p>
            </div>
        </Link>
    );
}

// 🌟 SocialIcon (드래그 시 클릭 방지 기능 내장, 브라우저 기본 툴팁 억제)
function SocialIcon({ url, src, brandColor, desc, isDragging }: any) {
    const [isHover, setIsHover] = useState(false);
    return (
        <Link 
            href={`https://${url}`} 
            target="_blank" 
            className="social-link" 
            style={styles.socialLink} 
            title={""} 
            onClick={(e) => { 
                if (isDragging) e.preventDefault(); 
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }} onMouseEnter={() => setIsHover(true)} onMouseLeave={() => setIsHover(false)}>
                <div className="social-circle" style={{ border: `3px solid ${isHover ? brandColor : brandColor + '33'}`, boxShadow: isHover ? `0 20px 40px -10px ${brandColor + '44'}` : '0 10px 20px -5px rgba(0,0,0,0.05)', transform: isHover ? 'translateY(-10px)' : 'none', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    {/* 🌟 src 뒤에 .png 를 붙여줍니다 */}
                    <img src={`/images/${src}.png`} alt={desc} style={styles.socialImg} draggable="false" onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none'; if(t.parentElement) t.parentElement.innerHTML = `<div style="font-size: 64px; font-weight: 900; color: ${brandColor}">${desc[0]}</div>`; }} /> 
                </div>
                <span style={{ fontSize: '18px', fontWeight: '800', color: isHover ? brandColor : '#1e293b', transition: 'color 0.3s ease', letterSpacing: '-0.5px' }}>{desc}</span>
            </div>
        </Link>
    );
}

// 🌟 NoticeItem
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
// 🌟 전역 스타일 전용 컴포넌트 (함수화)
// ==========================================
function HomeGlobalStyles() {
  return (
    <style jsx global>{`
      /* 애니메이션 키프레임 */
      @keyframes fadeInUp { 
        0% { opacity: 0; transform: translateY(40px); } 
        100% { opacity: 1; transform: translateY(0); } 
      }
      @keyframes pulseSoft { 
        0%, 100% { transform: scale(1); } 
        50% { transform: scale(1.03); } 
      }

      /* 공통 애니메이션 클래스 */
      .anim-item { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .delay-1 { animation-delay: 0.1s; } 
      .delay-2 { animation-delay: 0.2s; } 
      .delay-3 { animation-delay: 0.3s; } 
      .delay-4 { animation-delay: 0.4s; }
      .banner-text-anim { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

      /* 섹션 공통 스타일 */
      .section-title { font-size: 40px; font-weight: bold; margin-bottom: 40px; letter-spacing: -1px; color: #111; text-align: center; }
      .align-container { max-width: 1280px; width: 100%; margin-left: auto; margin-right: auto; padding-left: 20px; padding-right: 20px; }

      /* 히어로 배너 */
      .hero-banner-wrap { height: 300px; } 
      .hero-title { font-size: 36px; } 
      .hero-img { height: 200px; }

      /* 퀵 아이콘 섹션 */
      .quick-section { display: flex; justify-content: space-between; flex-wrap: wrap; margin-top: 60px; margin-bottom: 60px; }
      .quick-link { display: block; text-decoration: none; width: 180px; }
      .quick-icon-wrap { display: flex; flex-direction: column; align-items: center; gap: 20px; cursor: pointer; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      .quick-box { width: 180px; height: 180px; border-radius: 40px; background-color: #fff; border: 1px solid #f1f5f9; box-shadow: 0 10px 25px rgba(0,0,0,0.03); display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; overflow: hidden; padding: 15px; }
      .quick-label { font-size: 20px; font-weight: 900; color: #1e293b; letter-spacing: -0.5px; }

      @media (hover: hover) {
        .quick-icon-wrap:hover { transform: translateY(-10px); }
        .quick-icon-wrap:hover .icon-box { box-shadow: 0 15px 30px rgba(0,0,0,0.12) !important; border-color: #ff4b2b !important; }
        .quick-icon-wrap:hover .icon-box i { color: #ff4b2b !important; animation: pulseSoft 1s infinite; }
      }

      /* 사이트 카드 섹션 */
      .site-card-wrap { display: flex; justify-content: space-between; flex-wrap: wrap; width: 100%; }
      .site-card-link { display: block; text-decoration: none; width: 240px; }
      .site-card-box { width: 100%; height: 100%; padding: 40px 20px; background-color: #fff; border-radius: 20px; border: 1px solid #f1f5f9; text-align: center; cursor: pointer; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; align-items: center; justify-content: flex-start; box-shadow: 0 10px 20px rgba(0,0,0,0.02); }
      .site-logo-wrap { width: 100%; height: 128px; margin-bottom: 24px; display: flex; align-items: center; justify-content: center; }

      @media (hover: hover) { .site-card-box:hover { transform: translateY(-12px); box-shadow: 0 25px 40px rgba(0, 0, 0, 0.08); border-color: #cbd5e1; } }

      /* 🌟 인기 쇼핑몰 (지능형 마스크 포함) */
      .social-wrap {
        display: flex;
        gap: 50px;
        overflow-x: auto;
        width: 100%;
        scrollbar-width: none;
        transition: mask-image 0.3s ease;
        
        /* 🌟 핵심: 상단 패딩을 40px로 늘려 아이콘이 올라갈 공간을 확보합니다 */
        padding: 40px 0 40px 0; 
        
        /* 기존 마스크 효과 유지 */
        mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
      }

      .social-wrap.is-start {
        mask-image: linear-gradient(to right, black 90%, transparent);
        -webkit-mask-image: linear-gradient(to right, black 90%, transparent);
      }

      .social-wrap.is-end {
        mask-image: linear-gradient(to right, transparent, black 10%);
        -webkit-mask-image: linear-gradient(to right, transparent, black 10%);
      }

      .social-wrap.is-start.is-end {
        mask-image: none;
        -webkit-mask-image: none;
      }

      .social-wrap::-webkit-scrollbar { display: none; }
      .social-link { display: block; text-decoration: none; flex-shrink: 0; }
      .social-circle { width: 180px; height: 180px; border-radius: 40px; background-color: #fff; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 15px; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }

      /* 하단 3단 정보 섹션 */
      .bottom-info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; align-items: stretch; margin-top: 80px; margin-bottom: 80px; width: 100%; }

      /* 📱 모바일 레이아웃 조정 */
      @media (max-width: 768px) {
        .section-title { font-size: 24px; margin-bottom: 25px; }
        .hero-banner-wrap { height: 220px; } 
        .hero-title { font-size: 20px; margin-bottom: 10px; } 
        .hero-sub { font-size: 13px; padding: 6px 14px; } 
        .hero-img { height: 120px; }
        
        .quick-section { justify-content: center; gap: 15px; margin: 30px auto; } 
        .quick-link { width: calc(33.333% - 15px); } 
        .quick-icon-wrap { width: 100%; gap: 10px; } 
        .quick-box { width: 100%; height: 90px; border-radius: 20px; padding: 10px; } 
        .quick-label { font-size: 13px; text-align: center; display: block; margin-top: 8px; }
        
        .site-card-wrap { justify-content: center; gap: 15px; } 
        .site-card-link { width: calc(50% - 10px); } 
        .site-card-box { padding: 25px 15px; border-radius: 16px; } 
        .site-logo-wrap { height: 80px; margin-bottom: 15px; }
        
        .social-wrap { gap: 15px; padding: 10px 0 30px 0; } 
        .social-link { width: auto; display: block; } 
        .social-circle { width: 110px !important; height: 90px !important; border-radius: 20px !important; padding: 10px !important; }
        
        .bottom-info-grid { grid-template-columns: 1fr; gap: 20px; margin: 40px auto; } 
        .bottom-info-box { padding: 30px 20px !important; }
      }
    `}</style>
  );
}

// ==========================================
// 🌟 스타일 객체 (인라인 스타일 분리)
// ==========================================
const styles: Record<string, React.CSSProperties> = {
  // 공통 및 하단 정보 섹션 (Bottom Info)
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