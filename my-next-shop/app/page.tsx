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

  // 🌟 스크롤 감지 상태(isVisible) 관련 로직은 모두 제거했습니다.

  const nextSlide = () => {
    if (!isTransitioning) return;
    setCurrentBanner((prev) => prev + 1);
  };

  const prevSlide = () => {
    if (!isTransitioning) return;
    setCurrentBanner((prev) => prev - 1);
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
      
      {/* 🌟 전역 애니메이션 키프레임 */}
      <style jsx global>{`
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseSoft {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }

        /* 처음부터 나타나도록 하는 기본 애니메이션 클래스 */
        .anim-item {
          opacity: 0;
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* 순차적 등장을 위한 딜레이 유틸리티 */
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.4s; }

        /* 배너 텍스트 등장 애니메이션 */
        .banner-text-anim {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* 퀵 아이콘 호버 애니메이션 */
        .quick-icon-wrap {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .quick-icon-wrap:hover {
          transform: translateY(-10px);
        }
        .quick-icon-wrap:hover .icon-box {
          box-shadow: 0 15px 30px rgba(0,0,0,0.12) !important;
          border-color: #ff4b2b !important;
        }
        .quick-icon-wrap:hover .icon-box i {
          color: #ff4b2b !important;
          animation: pulseSoft 1s infinite;
        }
      `}</style>

      {/* 1. Hero Banner Section */}
      <section 
        className="anim-item"
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        style={{ height: '300px', position: 'relative', overflow: 'hidden', cursor: 'grab', userSelect: 'none', backgroundColor: '#eee' }}
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
                  <h1 style={{ fontSize: '36px', fontWeight: '900', lineHeight: '1.1', marginBottom: '15px' }}>
                    {banner.title}
                  </h1>
                  <div style={{ backgroundColor: '#000', color: banner.bgColor, display: 'inline-block', padding: '8px 20px', borderRadius: '30px', fontSize: '18px', fontWeight: 'bold' }}>
                    {banner.subTitle}
                  </div>
                </div>
                <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
                  <img src={banner.image} alt="Miku Raccoon" draggable="false" style={{ height: '200px', objectFit: 'contain', pointerEvents: 'none' }} />
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

      {/* 2. Quick Service Icons (초기 로딩 시 바로 등장) */}
      <section className="anim-item delay-1" style={{ maxWidth: '1400px', margin: '60px auto', display: 'flex', justifyContent: 'center', gap: '50px', padding: '20px', flexWrap: 'wrap' }}>
          <Link href="/purchase/quote" style={{ textDecoration: 'none' }}>
            <QuickIcon icon="fa-desktop" label="견적문의" color="#333" />
          </Link>
          <Link href="/purchase/request" style={{ textDecoration: 'none' }}>
            <QuickIcon icon="fa-wallet" label="구매대행신청" color="#333" />
          </Link>
          <Link href="/purchase/request" style={{ textDecoration: 'none' }}>
            <QuickIcon icon="fa-wallet" label="배송대행신청" color="#333" />
          </Link>
          <Link href="/fee-guide" style={{ textDecoration: 'none' }}>
            <QuickIcon icon="fa-file-invoice-dollar" label="수수료 안내" color="#333" />
          </Link>
          <Link href="/shipping-fee" style={{ textDecoration: 'none' }}>
            <QuickIcon icon="fa-plane" label="국제배송요금" color="#333" />
          </Link>
          <Link href="/contact" style={{ textDecoration: 'none' }}>
            <QuickIcon icon="fa-headset" label="카톡문의" color="#333" />
          </Link>
      </section>

      {/* 3. Frequently Visited Sites */}
      <section className="container anim-item delay-2" style={{ maxWidth: '2200px', margin: '100px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ fontSize: '40px', fontWeight: 'bold', marginBottom: '40px', letterSpacing: '-1px', color: '#111', textAlign: 'center' }}>
            자주 방문하는 사이트
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', width: '100%' }}>
            <Link href="/main_shop/rakuten" style={{ textDecoration: 'none' }}>
                <SiteCard logoSrc="/images/rakuten_logo.png" name="라쿠텐" desc="일본 대표 종합 쇼핑몰" />
            </Link>
            <Link href="/main_shop/yahoo_shopping" style={{ textDecoration: 'none' }}>
                <SiteCard logoSrc="/images/yahoo_shopping_logo.png" name="야후 쇼핑" desc="다양한 혜택의 야후 쇼핑" />
            </Link>
            <Link href="/main_shop/amazon" style={{ textDecoration: 'none' }}>
                <SiteCard logoSrc="/images/amazon_logo.png" name="아마존" desc="빠른 배송의 아마존 재팬" />
            </Link>
            <Link href="/main_shop/merukari" style={{ textDecoration: 'none' }}>
                <SiteCard logoSrc="/images/merukari_logo.png" name="메루카리" desc="일본 최대 중고거래 사이트" />
            </Link>
            <Link href="/main_shop/yahoo_auction" style={{ textDecoration: 'none' }}>
                <SiteCard logoSrc="/images/yahoo_auction_logo.png" name="야후 옥션" desc="실시간 일본 옥션 입찰" />
            </Link>
        </div>
      </section>

      {/* 4. Popular Sites */}
      <section className="anim-item delay-3" style={{ backgroundColor: '#fff', padding: '60px 0', borderTop: '1px solid #f1f5f9' }}>
        <h2 style={{ fontSize: '40px', fontWeight: 'bold', marginBottom: '40px', letterSpacing: '-1px', color: '#111', textAlign: 'center' }}>일본 전문 쇼핑몰</h2>
        <div className="container" style={{ maxWidth: '1700px', margin: '0 auto', padding: '0 50px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '40px' }}>
                <div style={{ height: '1px', backgroundColor: '#e2e8f0', flex: 1 }}></div>
                <div style={{ height: '1px', backgroundColor: '#e2e8f0', flex: 1 }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '50px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Link href="https://www.amiami.jp/" target="_blank" style={{ textDecoration: 'none' }}><SocialIcon src="/images/amiami_logo.png" brandColor="#BF0000" desc="아미아미" /></Link>
                <Link href="https://zozo.jp/" target="_blank" style={{ textDecoration: 'none' }}><SocialIcon src="/images/zozotown_logo.png" brandColor="#FF0033" desc="조조타운" /></Link>
                <Link href="https://www.beams.co.jp/en/" target="_blank" style={{ textDecoration: 'none' }}><SocialIcon src="/images/beams_logo.png" brandColor="#FF9900" desc="빔스" /></Link>
                <Link href="https://www.suruga-ya.jp/" target="_blank" style={{ textDecoration: 'none' }}><SocialIcon src="/images/surugaya_logo.png" brandColor="#E60012" desc="스루가야" /></Link>
                <Link href="https://toy.bandai.co.jp/" target="_blank" style={{ textDecoration: 'none' }}><SocialIcon src="/images/bandai_logo.PNG" brandColor="#FFB300" desc="반다이" /></Link>
                <Link href="https://www.animate-onlineshop.jp/" target="_blank" style={{ textDecoration: 'none' }}><SocialIcon src="/images/animate_logo.png" brandColor="#FF0033" desc="애니메이트" /></Link>
                <Link href="https://www.toranoana.jp/" target="_blank" style={{ textDecoration: 'none' }}><SocialIcon src="/images/toranoana_logo.png" brandColor="#FF0033" desc="토라노아나" /></Link>
            </div>
        </div>
      </section>

      {/* 5. Bottom Info Section */}
      <section className="container anim-item delay-4" style={{ maxWidth: '1200px', margin: '80px auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', padding: '0 20px', alignItems: 'stretch' }}>
          
          {/* 고객센터 */}
          <div style={{ backgroundColor: '#fff', padding: '40px 30px', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}>
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
                  <button style={{ flex: 1, padding: '14px', backgroundColor: '#fee500', color: '#3c1e1e', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 10px rgba(254, 229, 0, 0.2)' }} onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>카카오톡</button>
                  <button style={{ flex: 1, padding: '14px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s' }} onMouseOver={e=>{e.currentTarget.style.backgroundColor='#f1f5f9'; e.currentTarget.style.borderColor='#cbd5e1';}} onMouseOut={e=>{e.currentTarget.style.backgroundColor='#f8fafc'; e.currentTarget.style.borderColor='#e2e8f0';}}>이용후기</button>
              </div>
          </div>

          {/* 공지사항 */}
          <div style={{ backgroundColor: '#fff', padding: '40px 30px', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}>
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
              <Link href="#" style={{ display: 'inline-block', marginTop: 'auto', paddingTop: '20px', fontSize: '14px', color: '#94a3b8', textDecoration: 'none', fontWeight: '600', transition: 'color 0.2s' }} onMouseOver={e=>e.currentTarget.style.color='#0f172a'} onMouseOut={e=>e.currentTarget.style.color='#94a3b8'}>
                전체보기 <i className="fa fa-arrow-right" style={{ fontSize: '10px' }}></i>
              </Link>
          </div>

          {/* 입금계좌안내 */}
          <div style={{ backgroundColor: '#fff', padding: '40px 30px', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}>
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

// 🌟 퀵 아이콘 컴포넌트: 내부의 스크롤 딜레이는 제거하고 공통 호버 클래스만 사용
function QuickIcon({ icon, label, color }: any) {
    return (
        <div className="quick-icon-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', cursor: 'pointer' }}>
            <div className="icon-box" style={{ 
                width: '180px', height: '180px', borderRadius: '40px', 
                backgroundColor: '#fff', border: '1px solid #eee', boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease'
            }}>
                <i className={`fa ${icon}`} style={{ fontSize: '80px', color: color, transition: 'all 0.3s ease' }}></i>
            </div>
            <span style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>{label}</span>
        </div>
    );
}

// 🌟 사이트 카드 컴포넌트
function SiteCard({ logoSrc, name, desc }: any) {
    return (
        <div style={{ 
            backgroundColor: '#fff', padding: '50px 20px', borderRadius: '24px', border: '1px solid #f1f5f9', 
            textAlign: 'center', cursor: 'pointer', width: '280px', height: '360px',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
            boxShadow: '0 10px 20px rgba(0,0,0,0.02)'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-12px)';
            e.currentTarget.style.boxShadow = '0 25px 40px rgba(0, 0, 0, 0.08)';
            e.currentTarget.style.borderColor = '#cbd5e1';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor = '#f1f5f9';
        }}
        >
            <div style={{ width: '100%', height: '160px', marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img 
                    src={logoSrc} 
                    alt={name} 
                    style={{ maxWidth: '90%', maxHeight: '100%', objectFit: 'contain' }}
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) parent.innerHTML = `<div style="font-size: 48px; font-weight: 900; color: #cbd5e1">${name[0]}</div>`;
                    }}
                />
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', marginBottom: '10px' }}>{name}</h3>
            <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.4', fontWeight: '500' }}>{desc}</p>
        </div>
    );
}

// 소셜 아이콘 로직은 그대로 유지
function SocialIcon({ src, brandColor, desc }: any) {
    const [isHover, setIsHover] = useState(false);

    return (
        <div 
            style={{ position: 'relative', display: 'inline-flex', justifyContent: 'center' }}
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
        >
            <div style={{ 
                width: '180px', height: '180px', borderRadius: '48px', 
                backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                cursor: 'pointer', border: `3px solid ${isHover ? brandColor : brandColor + '33'}`,
                boxShadow: isHover ? `0 20px 40px -10px ${brandColor + '44'}` : '0 10px 20px -5px rgba(0,0,0,0.05)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', transform: isHover ? 'translateY(-15px)' : 'none',
                overflow: 'hidden', padding: '35px'
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
            <div style={{
                position: 'absolute', bottom: '-45px', backgroundColor: '#111', color: '#fff', padding: '8px 14px',
                borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', whiteSpace: 'nowrap',
                opacity: isHover ? 1 : 0, visibility: isHover ? 'visible' : 'hidden',
                transform: isHover ? 'translateY(0)' : 'translateY(-10px)', transition: 'all 0.3s ease',
                pointerEvents: 'none', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                {desc}
                <div style={{ position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '10px', height: '10px', backgroundColor: '#111' }}></div>
            </div>
        </div>
    );
}

// 🌟 공지사항 리스트 호버 애니메이션 추가
function NoticeItem({ title, date }: any) {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <div 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 10px', borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'all 0.2s ease', backgroundColor: isHovered ? '#f8fafc' : 'transparent', borderRadius: '8px' }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
            <span style={{ color: isHovered ? '#0f172a' : '#334155', fontSize: '15px', fontWeight: isHovered ? '700' : '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '15px', transition: 'color 0.2s' }}>
                {title}
            </span>
            <span style={{ color: isHovered ? '#f97316' : '#cbd5e1', fontSize: '13px', fontWeight: '600', flexShrink: 0, transition: 'color 0.2s' }}>{date}</span>
        </div>
    );
}