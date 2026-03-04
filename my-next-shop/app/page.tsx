"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const banners = [
    {
      title: <>안전포장 빠른배송<br />평일 매일 국제발송</>,
      subTitle: "합리적이고 저렴한 배송비",
      bgColor: "#B1C9A7",
      image: "/images/hero.png"
    },
    {
      title: <>일본 쇼핑의 시작<br />미쿠짱과 함께하세요</>,
      subTitle: "최저가 구매대행 서비스",
      bgColor: "#fcd34d",
      image: "/images/hero.png"
    },
    {
      title: <>메루카리·야후옥션<br />실시간 입찰 및 구매</>,
      subTitle: "간편한 일본 직구 솔루션",
      bgColor: "#93c5fd",
      image: "/images/hero.png"
    },
    {
      title: <>다양한 혜택과 이벤트<br />회원 등급별 포인트 적립</>,
      subTitle: "신규 가입 시 적립금 증정",
      bgColor: "#fda4af",
      image: "/images/hero.png"
    }
  ];

  const extendedBanners = [banners[banners.length - 1], ...banners, banners[0]];

  const [currentBanner, setCurrentBanner] = useState(1);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = () => {
    if (!isTransitioning) return;
    setCurrentBanner((prev) => (prev >= banners.length + 1 ? prev : prev + 1));
  };

  const prevSlide = () => {
    if (!isTransitioning) return;
    setCurrentBanner((prev) => (prev <= 0 ? prev : prev - 1));
  };

  const handleTransitionEnd = () => {
    if (currentBanner === 0) {
      setIsTransitioning(false);
      setCurrentBanner(banners.length);
    } else if (currentBanner === banners.length + 1) {
      setIsTransitioning(false);
      setCurrentBanner(1);
    }
  };

  useEffect(() => {
    if (!isTransitioning) {
        const timer = setTimeout(() => setIsTransitioning(true), 50);
        return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  useEffect(() => {
    if (isPaused) return; 
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [isTransitioning, isPaused]); 

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setDragStartX(clientX);
    setIsPaused(true); 
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (dragStartX === null) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setDragOffset(clientX - dragStartX);
  };

  const handleDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (dragStartX === null) return;
    setIsPaused(false); 
    
    if (Math.abs(dragOffset) > 100) {
      if (dragOffset > 0) {
        prevSlide();
      } else {
        nextSlide();
      }
    }
    setDragStartX(null);
    setDragOffset(0);
  };

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', paddingBottom: '50px' }}>
      
      {/* 🌟 반응형을 위한 전역 CSS */}
      <style jsx global>{`
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseSoft {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }

        .anim-item { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.4s; }

        .banner-text-anim { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        /* -------------------------------------------
           🌟 반응형 레이아웃 클래스 (PC 기준) 
           ------------------------------------------- */
        .section-title { font-size: 40px; font-weight: bold; margin-bottom: 40px; letter-spacing: -1px; color: #111; text-align: center; }
        
        /* 히어로 배너 */
        .hero-banner-wrap { height: 300px; }
        .hero-title { font-size: 36px; }
        .hero-img { height: 200px; }

        /* 퀵 아이콘 섹션 */
        .quick-section { max-width: 1400px; margin: 60px auto; display: flex; justify-content: center; gap: 50px; padding: 20px; flex-wrap: wrap; }
        .quick-link { display: block; text-decoration: none; }
        .quick-icon-wrap { display: flex; flex-direction: column; align-items: center; gap: 20px; cursor: pointer; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .quick-box { width: 180px; height: 180px; border-radius: 40px; background-color: #fff; border: 1px solid #f1f5f9; box-shadow: 0 10px 25px rgba(0,0,0,0.03); display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; overflow: hidden; padding: 15px; }
        .quick-label { font-size: 20px; font-weight: 900; color: #1e293b; letter-spacing: -0.5px; }
        @media (hover: hover) {
          .quick-icon-wrap:hover { transform: translateY(-10px); }
          .quick-icon-wrap:hover .icon-box { box-shadow: 0 15px 30px rgba(0,0,0,0.12) !important; border-color: #ff4b2b !important; }
          .quick-icon-wrap:hover .icon-box i { color: #ff4b2b !important; animation: pulseSoft 1s infinite; }
        }

        /* 사이트 카드 섹션 */
        .site-card-wrap { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; width: 100%; }
        /* 🌟 핵심: Link 태그 자체에 너비를 부여하여 찌그러짐 방지 */
        .site-card-link { display: block; text-decoration: none; width: 280px; } 
        .site-card-box { width: 100%; height: 360px; padding: 50px 20px; background-color: #fff; border-radius: 24px; border: 1px solid #f1f5f9; text-align: center; cursor: pointer; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; align-items: center; justify-content: flex-start; box-shadow: 0 10px 20px rgba(0,0,0,0.02); }
        .site-logo-wrap { width: 100%; height: 160px; margin-bottom: 30px; display: flex; align-items: center; justify-content: center; }
        @media (hover: hover) {
          .site-card-box:hover { transform: translateY(-12px); box-shadow: 0 25px 40px rgba(0, 0, 0, 0.08); border-color: #cbd5e1; }
        }

        /* 인기 쇼핑몰 원형 아이콘 */
        .social-wrap { display: flex; justify-content: center; gap: 50px; align-items: center; flex-wrap: wrap; }
        .social-link { display: block; text-decoration: none; }
        .social-circle { width: 180px; height: 180px; border-radius: 48px; background-color: #fff; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 35px; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }

        /* 하단 3단 정보 섹션 */
        .bottom-info-grid { max-width: 1200px; margin: 80px auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; padding: 0 20px; align-items: stretch; }

        /* -------------------------------------------
           📱 모바일 레이아웃 조정 (768px 이하 스마트폰) 
           ------------------------------------------- */
        @media (max-width: 768px) {
          .section-title { font-size: 24px; margin-bottom: 25px; }
          
          /* 배너 조절 */
          .hero-banner-wrap { height: 220px; }
          .hero-title { font-size: 20px; margin-bottom: 10px; }
          .hero-sub { font-size: 13px; padding: 6px 14px; }
          .hero-img { height: 120px; }

          /* 퀵 아이콘 3개씩 2줄 배치 */
          .quick-section { gap: 15px; margin: 30px auto; padding: 10px; }
          .quick-link { width: calc(33.333% - 15px); } /* Link 너비 강제 조정 */
          .quick-icon-wrap { width: 100%; gap: 10px; }
          .quick-box { width: 100%; height: 90px; border-radius: 20px; padding: 10px; }
          .quick-label { font-size: 13px; text-align: center; display: block; margin-top: 8px; }

          /* 🌟 사이트 카드 2개씩 배치 (찌그러짐 해결) */
          .site-card-wrap { gap: 15px; }
          .site-card-link { width: calc(50% - 10px); } /* Link 너비 50% 강제 할당 */
          .site-card-box { width: 100%; height: 100%; padding: 25px 15px; border-radius: 16px; }
          .site-logo-wrap { height: 80px; margin-bottom: 15px; }
          .site-card-box h3 { font-size: 16px; margin-bottom: 5px; }
          .site-card-box p { font-size: 12px; }

          /* 인기 쇼핑몰 3개씩 배치 */
          .social-wrap { gap: 15px; }
          .social-link { width: calc(33.333% - 15px); display: flex; justify-content: center; }
          .social-circle { width: 80px !important; height: 80px !important; border-radius: 24px !important; padding: 15px !important; }

          /* 하단 3단 섹션 1줄로 변경 */
          .bottom-info-grid { grid-template-columns: 1fr; gap: 20px; margin: 40px auto; }
          .bottom-info-box { padding: 30px 20px !important; }
        }
      `}</style>

      {/* 1. Hero Banner Section */}
      <section 
        className="anim-item hero-banner-wrap"
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        style={{ position: 'relative', overflow: 'hidden', cursor: 'grab', userSelect: 'none', backgroundColor: '#eee' }}
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
              <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '1200px', padding: '0 20px' }}>
                <div style={{ color: '#000', zIndex: 2 }} className={currentBanner === index ? "banner-text-anim" : ""}>
                  <h1 className="hero-title" style={{ fontWeight: '900', lineHeight: '1.1', marginBottom: '15px' }}>
                    {banner.title}
                  </h1>
                  <div className="hero-sub" style={{ backgroundColor: '#000', color: banner.bgColor, display: 'inline-block', padding: '8px 20px', borderRadius: '30px', fontWeight: 'bold' }}>
                    {banner.subTitle}
                  </div>
                </div>
                <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
                  <img src={banner.image} alt="Miku Raccoon" draggable="false" className="hero-img" style={{ objectFit: 'contain', pointerEvents: 'none' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Carousel Dots */}
        <div style={{ position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px' }}>
            {banners.map((_, i) => {
                const activeIndex = currentBanner === 0 ? banners.length - 1 : (currentBanner === banners.length + 1 ? 0 : currentBanner - 1);
                return (
                    <div 
                        key={i} 
                        onClick={() => setCurrentBanner(i + 1)}
                        style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: i === activeIndex ? '#ff4b2b' : '#fff', opacity: i === activeIndex ? 1 : 0.5, cursor: 'pointer', transition: 'all 0.3s ease' }}
                    ></div>
                );
            })}
        </div>
      </section>

      {/* 2. Quick Service Icons */}
      <section className="anim-item delay-1 quick-section">
          {/* 🌟 a 태그 역할을 하는 Link에 클래스를 부여합니다 */}
          <Link href="/purchase/quote" className="quick-link"><QuickIcon type="견적문의" label="견적문의" /></Link>
          <Link href="/purchase/request" className="quick-link"><QuickIcon type="구매대행신청" label="구매대행신청" /></Link>
          <Link href="/delivery/request" className="quick-link"><QuickIcon type="배송대행신청" label="배송대행신청" /></Link>
          <Link href="/guide/fee-guide" className="quick-link"><QuickIcon type="수수료 안내" label="수수료 안내" /></Link>
          <Link href="/guide/shipping-fee" className="quick-link"><QuickIcon type="국제배송요금" label="국제배송요금" /></Link>
          <Link href="/contact" className="quick-link"><QuickIcon type="카톡문의" label="카톡문의" /></Link>
      </section>

      {/* 3. Frequently Visited Sites */}
      <section className="container anim-item delay-2" style={{ maxWidth: '2200px', margin: '0 auto 100px', padding: '0 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 className="section-title">자주 방문하는 사이트</h2>
        <div className="site-card-wrap">
            {/* 🌟 찌그러짐을 방지하기 위해 Link에 'site-card-link' 클래스 부여 */}
            <Link href="/main_shop/rakuten" className="site-card-link"><SiteCard logoSrc="/images/rakuten_logo.png" name="라쿠텐" desc="일본 대표 종합 쇼핑몰" /></Link>
            <Link href="/main_shop/yahoo_shopping" className="site-card-link"><SiteCard logoSrc="/images/yahoo_shopping_logo.png" name="야후 쇼핑" desc="다양한 혜택의 야후 쇼핑" /></Link>
            <Link href="/main_shop/amazon" className="site-card-link"><SiteCard logoSrc="/images/amazon_logo.png" name="아마존" desc="빠른 배송의 아마존 재팬" /></Link>
            <Link href="/main_shop/mercari" className="site-card-link"><SiteCard logoSrc="/images/merukari_logo.png" name="메루카리" desc="일본 최대 중고거래 사이트" /></Link>
            <Link href="/main_shop/yahoo_auction" className="site-card-link"><SiteCard logoSrc="/images/yahoo_auction_logo.png" name="야후 옥션" desc="실시간 일본 옥션 입찰" /></Link>
        </div>
      </section>

      {/* 4. Popular Sites */}
      <section className="anim-item delay-3" style={{ backgroundColor: '#fff', padding: '60px 0', borderTop: '1px solid #f1f5f9' }}>
        <h2 className="section-title">일본 전문 쇼핑몰</h2>
        <div className="container" style={{ maxWidth: '1700px', margin: '0 auto', padding: '0 50px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '40px' }}>
                <div style={{ height: '1px', backgroundColor: '#e2e8f0', flex: 1 }}></div>
                <div style={{ height: '1px', backgroundColor: '#e2e8f0', flex: 1 }}></div>
            </div>
            <div className="social-wrap">
                {/* 🌟 Link에 'social-link' 클래스 부여 */}
                <Link href="https://www.amiami.jp/" target="_blank" className="social-link"><SocialIcon src="/images/amiami_logo.png" brandColor="#BF0000" desc="아미아미" /></Link>
                <Link href="https://zozo.jp/" target="_blank" className="social-link"><SocialIcon src="/images/zozotown_logo.png" brandColor="#FF0033" desc="조조타운" /></Link>
                <Link href="https://www.beams.co.jp/en/" target="_blank" className="social-link"><SocialIcon src="/images/beams_logo.png" brandColor="#FF9900" desc="빔스" /></Link>
                <Link href="https://www.suruga-ya.jp/" target="_blank" className="social-link"><SocialIcon src="/images/surugaya_logo.png" brandColor="#E60012" desc="스루가야" /></Link>
                <Link href="https://toy.bandai.co.jp/" target="_blank" className="social-link"><SocialIcon src="/images/bandai_logo.PNG" brandColor="#FFB300" desc="반다이" /></Link>
                <Link href="https://www.animate-onlineshop.jp/" target="_blank" className="social-link"><SocialIcon src="/images/animate_logo.png" brandColor="#FF0033" desc="애니메이트" /></Link>
                <Link href="https://www.toranoana.jp/" target="_blank" className="social-link"><SocialIcon src="/images/toranoana_logo.png" brandColor="#FF0033" desc="토라노아나" /></Link>
            </div>
        </div>
      </section>

      {/* 5. Bottom Info Section */}
      <section className="anim-item delay-4 bottom-info-grid">
          
          {/* 고객센터 */}
          <div className="bottom-info-box" style={{ backgroundColor: '#fff', padding: '40px 30px', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px', color: '#1e293b' }}>
                  <i className="fa fa-headset" style={{ fontSize: '20px', color: '#6366f1' }}></i>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>CUSTOMER CENTER</span>
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>1:1문의 - 카카오톡</h3>
              <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.6', marginBottom: '30px' }}>
                상담시간 ⏰ 10:00 ~ 24:00<br/>
                <span style={{ color: '#6366f1', fontWeight: '600' }}>365일 연중무휴</span> 실시간 대응
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                  <button style={{ flex: 1, padding: '14px', backgroundColor: '#fee500', color: '#3c1e1e', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 10px rgba(254, 229, 0, 0.2)' }}>카카오톡</button>
                  <button style={{ flex: 1, padding: '14px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s' }}>이용후기</button>
              </div>
          </div>

          {/* 공지사항 */}
          <div className="bottom-info-box" style={{ backgroundColor: '#fff', padding: '40px 30px', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px', color: '#1e293b' }}>
                  <i className="fa fa-bullhorn" style={{ fontSize: '20px', color: '#f59e0b' }}></i>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>NOTICE</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <NoticeItem title="미쿠짱 2026년 2월 국제 발송일정 안내" date="02.06" />
                  <NoticeItem title="미쿠짱 2026년 1월 국제 발송일정 안내" date="01.03" />
                  <NoticeItem title="아마존재팬 일본내 배송비 무료 혜택" date="10.15" />
                  <NoticeItem title="일본 구매대행 [미쿠짱] 이용 가이드" date="09.19" />
              </div>
              <Link href="#" style={{ display: 'inline-block', marginTop: 'auto', paddingTop: '20px', fontSize: '14px', color: '#94a3b8', textDecoration: 'none', fontWeight: '600', transition: 'color 0.2s' }}>
                전체보기 <i className="fa fa-arrow-right" style={{ fontSize: '10px' }}></i>
              </Link>
          </div>

          {/* 입금계좌안내 */}
          <div className="bottom-info-box" style={{ backgroundColor: '#fff', padding: '40px 30px', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px', color: '#1e293b' }}>
                  <i className="fa fa-university" style={{ fontSize: '20px', color: '#10b981' }}></i>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>BANK INFO</span>
              </div>
              <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '16px', color: '#64748b', marginBottom: '8px', fontWeight: 'bold' }}>🏦 KB 국민은행</div>
                  <div style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '1px', marginBottom: '8px', color: '#0f172a' }}>896701-00-094205</div>
                  <div style={{ fontSize: '15px', color: '#334155', fontWeight: '500' }}>예금주: 김수현(키오넥스)</div>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '30px' }}>
                <div style={{ padding: '12px', backgroundColor: '#ecfdf5', borderRadius: '12px', textAlign: 'center', fontSize: '13px', color: '#059669', fontWeight: '600' }}>
                    입금 확인은 실시간으로 처리됩니다.
                </div>
              </div>
          </div>
      </section>

    </div>
  );
}

// 🌟 클래스네임(className)으로 변경된 아이콘 컴포넌트
function QuickIcon({ type, label }: any) {
    const getImageSrc = () => {
        switch (type) {
            case '견적문의': return '/images/main_icon/icon_0.png';
            case '구매대행신청': return '/images/main_icon/icon_1.png';
            case '배송대행신청': return '/images/main_icon/icon_2.png';
            case '수수료 안내': return '/images/main_icon/icon_3.png';
            case '국제배송요금': return '/images/main_icon/icon_4.png';
            case '카톡문의': return '/images/main_icon/icon_5.png';
            default: return '/images/main_icon/icon_0.png';
        }
    };

    return (
       <div className="quick-icon-wrap">
            <div className="icon-box quick-box">
                <img src={getImageSrc()} alt={label} style={{ width: '65%', height: '65%', objectFit: 'contain' }} />
            </div>
            <span className="quick-label">{label}</span>
        </div>
    );
}

// 🌟 불필요한 인라인 스타일 제거, 클래스(CSS)에 위임하여 찌그러짐 원천 차단
function SiteCard({ logoSrc, name, desc }: any) {
    return (
        <div className="site-card-box">
            <div className="site-logo-wrap">
                <img 
                    src={logoSrc} alt={name} style={{ maxWidth: '90%', maxHeight: '100%', objectFit: 'contain' }}
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) parent.innerHTML = `<div style="font-size: 48px; font-weight: 900; color: #cbd5e1">${name[0]}</div>`;
                    }}
                />
            </div>
            <h3 style={{ fontWeight: '900', color: '#0f172a' }}>{name}</h3>
            <p style={{ color: '#64748b', lineHeight: '1.4', fontWeight: '500' }}>{desc}</p>
        </div>
    );
}

// 🌟 소셜 아이콘 컴포넌트 정리
function SocialIcon({ src, brandColor, desc }: any) {
    const [isHover, setIsHover] = useState(false);

    return (
        <div style={{ position: 'relative', display: 'inline-flex', justifyContent: 'center' }} onMouseEnter={() => setIsHover(true)} onMouseLeave={() => setIsHover(false)}>
            <div className="social-circle" style={{ 
                border: `3px solid ${isHover ? brandColor : brandColor + '33'}`,
                boxShadow: isHover ? `0 20px 40px -10px ${brandColor + '44'}` : '0 10px 20px -5px rgba(0,0,0,0.05)',
                transform: isHover ? 'translateY(-15px)' : 'none'
            }}>
                <img src={src} alt={desc} style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'all 0.4s' }}
                     onError={(e) => {
                         const target = e.target as HTMLImageElement;
                         target.style.display = 'none';
                         const parent = target.parentElement;
                         if (parent) parent.innerHTML = `<div style="font-size: 48px; font-weight: 900; color: ${brandColor}">${desc[0]}</div>`;
                     }}
                />
            </div>
        </div>
    );
}

function NoticeItem({ title, date }: any) {
    const [isHovered, setIsHovered] = useState(false);
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 10px', borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'all 0.2s ease', backgroundColor: isHovered ? '#f8fafc' : 'transparent', borderRadius: '8px' }} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <span style={{ color: isHovered ? '#0f172a' : '#334155', fontSize: '15px', fontWeight: isHovered ? '700' : '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '15px', transition: 'color 0.2s' }}>
                {title}
            </span>
            <span style={{ color: isHovered ? '#f97316' : '#cbd5e1', fontSize: '13px', fontWeight: '600', flexShrink: 0, transition: 'color 0.2s' }}>{date}</span>
        </div>
    );
}