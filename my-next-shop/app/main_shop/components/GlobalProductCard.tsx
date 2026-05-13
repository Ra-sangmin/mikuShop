"use client";

import React, { useState, useEffect, useMemo } from 'react';

export interface GlobalItem {
  id: string;
  platform: 'mercari' | 'rakuten' | 'amazon' | 'yahoo_auction';
  name: string;
  price: number;
  thumbnail: string;
  status: 'on_sale' | 'sold_out';
  url: string;

  // 🌟 야후 옥션 전용 데이터
  bidCount?: number;
  timeLeft?: string;
}

interface GlobalProductCardProps {
  item: GlobalItem;
  onClick: (id: string) => void;
}

export default function GlobalProductCard({ item, onClick }: GlobalProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 1시간 미만 카운트다운을 위한 로컬 초침 상태
  const [localSeconds, setLocalSeconds] = useState<number | null>(null);

  const themeColor = useMemo(() => {
    switch(item.platform) {
      case 'mercari': return '#ff007f';
      case 'rakuten': return '#bf0000';
      case 'amazon':  return '#ff9900';
      case 'yahoo_auction': return '#ff0033'; 
      default: return '#ff007f';
    }
  }, [item.platform]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 서버에서 받은 남은 시간을 분석하여 로컬 초침 세팅
  useEffect(() => {
    if (item.platform !== 'yahoo_auction' || !item.timeLeft) {
      setLocalSeconds(null);
      return;
    }

    const tl = item.timeLeft;
    if (tl.includes('日') || tl.includes('時間') || tl.includes('일') || tl.includes('시간')) {
      setLocalSeconds(null);
    } else {
      let mins = 0;
      let secs = 0;
      const minMatch = tl.match(/(\d+)\s*(?:分|분)/);
      const secMatch = tl.match(/(\d+)\s*(?:秒|초)/);
      
      if (minMatch) mins = parseInt(minMatch[1], 10);
      if (secMatch) secs = parseInt(secMatch[1], 10);

      if (mins > 0 || secs > 0) {
        setLocalSeconds(mins * 60 + secs);
      } else {
        setLocalSeconds(null);
      }
    }
  }, [item.timeLeft, item.platform]);

  // 1초마다 카운트다운 실행
  useEffect(() => {
    if (localSeconds === null) return;

    const timer = setInterval(() => {
      setLocalSeconds(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [localSeconds !== null]);

  // 시간에 따른 5단계 상태 정의
  const timeStatus = useMemo(() => {
    if (item.status === 'sold_out' || localSeconds === 0 || item.timeLeft === '종료' || item.timeLeft === '終了') {
      return 'ENDED'; 
    }
    if (localSeconds !== null) {
      if (localSeconds < 15 * 60) return 'URGENT'; // 14분 59초 ~ 1초
      return 'SOON'; // 59분 59초 ~ 15분
    }
    if (item.timeLeft?.includes('時間') || item.timeLeft?.includes('시간')) return 'HOURS'; // 24시간 ~ 1시간
    if (item.timeLeft?.includes('日') || item.timeLeft?.includes('일')) return 'DAYS'; // 1일 이상

    return 'ENDED';
  }, [localSeconds, item.timeLeft, item.status]);

  // 🌟 [핵심 변경] 1시간 미만일 때 텍스트 색상을 무조건 흰색(White)으로 고정하여 가독성 확보!
  const timeStyles = useMemo(() => {
    // 1. 종료 및 1시간 이상 상태들 (고정 색상)
    if (timeStatus === 'ENDED') {
      return { leftBg: '#9ca3af', rightBg: '#e5e7eb', gaugeBg: '#d1d5db', textColor: '#ffffff', showDot: false };
    }
    if (timeStatus === 'DAYS') {
      return { leftBg: '#475569', rightBg: '#334155', gaugeBg: '#3b82f6', textColor: '#ffffff', showDot: false };
    }
    if (timeStatus === 'HOURS') {
      return { leftBg: '#4a3b32', rightBg: '#eed9c4', gaugeBg: '#eed9c4', textColor: '#4a3b32', showDot: false };
    }
    
    // 2. 🌟 1시간 미만 (SOON, URGENT) 상태일 때: 실시간 색상 혼합 (Interpolation)
    if (localSeconds !== null) {
      // t 값: 60분(3600초)일 때 0, 1분(60초)일 때 1이 되는 비율 값 (0 ~ 1 사이)
      const t = Math.max(0, Math.min(1, (3600 - localSeconds) / 3540));
      
      // [A] 게이지 색상: 샌드 베이지 -> 강력한 레드로 초마다 변환
      const gR = Math.round(238 + (220 - 238) * t);
      const gG = Math.round(217 + (38 - 217) * t);
      const gB = Math.round(196 + (38 - 196) * t);

      // [B] 좌측 입찰수 배경: 모카 -> 부드러운 다크 그레이로 자연스럽게 변환
      const lR = Math.round(74 + (82 - 74) * t);
      const lG = Math.round(59 + (82 - 59) * t);
      const lB = Math.round(50 + (91 - 50) * t);

      return { 
        leftBg: `rgb(${lR}, ${lG}, ${lB})`,   
        rightBg: '#3f3f46', 
        gaugeBg: `rgb(${gR}, ${gG}, ${gB})`,  
        // 🌟 [수정] 어중간한 회색을 버리고, 1시간 미만일 땐 무조건 깔끔한 흰색으로 통일!
        textColor: '#ffffff', 
        showDot: localSeconds < 15 * 60
      };
    }
    
    // Fallback
    return { leftBg: '#9ca3af', rightBg: '#e5e7eb', gaugeBg: '#d1d5db', textColor: '#ffffff', showDot: false };
  }, [timeStatus, localSeconds]);

  // 60분(3600초) 기준 슬라이더 퍼센트 계산
  const sliderPercentage = useMemo(() => {
    if (timeStatus === 'ENDED') return 0;
    if (localSeconds === null) return 100;
    return Math.max(0, Math.min(100, (localSeconds / 3600) * 100));
  }, [localSeconds, timeStatus]);

  // 화면에 보여줄 텍스트 포맷팅
  const displayTimeLeft = useMemo(() => {
    if (timeStatus === 'ENDED') return '종료';
    
    if (localSeconds !== null) {
      const m = Math.floor(localSeconds / 60);
      const s = localSeconds % 60;
      if (m > 0) return `${m}분 ${s}초`;
      return `${s}초`;
    }
    
    if (item.timeLeft) {
      return item.timeLeft.replace('日', '일 ').replace('時間', '시간 ').replace('分', '분 ').replace('秒', '초').trim();
    }
    return '-';
  }, [localSeconds, item.timeLeft, timeStatus]);

  const styles = {
    card: {
      position: 'relative' as const, 
      backgroundColor: 'white',
      border: '1px solid #f3f4f6',
      borderRadius: isMobile ? '16px' : '20px',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isHovered && !isMobile ? 'translateY(-8px)' : 'translateY(0)',
      boxShadow: isHovered && !isMobile
        ? `0 20px 40px -12px ${themeColor}20` 
        : '0 1px 3px rgba(0, 0, 0, 0.05)',
      display: 'flex',
      flexDirection: 'column' as const,
      height: '100%',
      // 야후 옥션일 경우 하단 40px 바 높이만큼 여백 확보
      paddingBottom: item.platform === 'yahoo_auction' ? '40px' : '0', 
    },
    imageContainer: {
      position: 'relative' as const,
      aspectRatio: '1/1',
      overflow: 'hidden',
      backgroundColor: '#f9fafb',
    },
    image: {
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
      transition: 'transform 0.5s ease, filter 0.3s',
      transform: isHovered && !isMobile ? 'scale(1.1)' : 'scale(1)',
      filter: item.status === 'sold_out' ? 'grayscale(100%)' : 'none',
    },
    soldOutOverlay: {
      position: 'absolute' as const,
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    soldOutText: {
      color: 'white',
      fontSize: isMobile ? '16px' : '22px',
      fontWeight: 900,
      border: isMobile ? '1.5px solid white' : '2px solid white',
      padding: isMobile ? '6px 12px' : '8px 16px',
      borderRadius: '8px',
      transform: 'rotate(-10deg)', 
    },
    infoArea: {
      padding: isMobile ? '12px 10px' : '16px',
      display: 'flex',
      flexDirection: 'column' as const,
      flex: 1,
      gap: isMobile ? '8px' : '12px',
      opacity: item.status === 'sold_out' ? 0.6 : 1, 
    },
    title: {
      fontSize: isMobile ? '12px' : '13px',
      color: isHovered && !isMobile ? themeColor : '#374151',
      lineHeight: '1.4',
      margin: '0',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      height: isMobile ? '34px' : '36px',
      transition: 'color 0.3s ease',
      fontWeight: 500,
    },
    priceRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: 'auto',
    },
    price: {
      fontSize: isMobile ? '15px' : '18px',
      fontWeight: 900,
      color: item.status === 'sold_out' ? '#9ca3af' : '#111827',
      textDecoration: item.status === 'sold_out' ? 'line-through' : 'none',
    },
    currency: {
      fontSize: isMobile ? '11px' : '12px',
      marginRight: '1px',
      fontWeight: 400,
    },
    wishButton: {
      fontSize: isMobile ? '9px' : '10px',
      fontWeight: 'bold',
      color: '#9ca3af',
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      padding: isMobile ? '5px 8px' : '6px 12px',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      opacity: item.status === 'sold_out' ? 0 : 1,
      whiteSpace: 'nowrap' as const,
    }
  };

  return (
    <div 
      onClick={() => onClick(item.id)} 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={styles.card}
    >
      <style>{`
        @keyframes pulseDot { 
          0% { transform: scale(0.8); opacity: 0.5; } 
          50% { transform: scale(1.2); opacity: 1; } 
          100% { transform: scale(0.8); opacity: 0.5; } 
        }
        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: currentColor; /* 텍스트 색상과 자동으로 맞춤 */
          animation: pulseDot 1.5s infinite ease-in-out;
        }
      `}</style>

      <div style={styles.imageContainer}>
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.name} style={styles.image} loading="lazy" />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db', fontSize: '12px' }}>
            No Image
          </div>
        )}

        {item.status === 'sold_out' && (
          <div style={styles.soldOutOverlay}>
            <span style={styles.soldOutText}>SOLD OUT</span>
          </div>
        )}
      </div>

      <div className="product-info" style={styles.infoArea}>
        <h3 style={styles.title} translate="yes" lang="ja">
          {item.name || 'No Title'}
        </h3>
        
        <div className="notranslate" translate="no" style={styles.priceRow}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '8px' }}>
            <span className="notranslate" translate="no" style={styles.price}>
              <span className="notranslate" translate="no" style={styles.currency}>¥</span>
              {item.price ? item.price.toLocaleString() : '0'}
            </span>
            
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                alert("관심상품에 등록되었습니다. ✨"); 
              }}
              onMouseOver={(e) => {
                if (isMobile) return;
                e.currentTarget.style.color = themeColor;
                e.currentTarget.style.borderColor = themeColor + '80';
                e.currentTarget.style.backgroundColor = themeColor + '05';
              }}
              onMouseOut={(e) => {
                if (isMobile) return;
                e.currentTarget.style.color = '#9ca3af';
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.backgroundColor = 'white';
              }}
              style={styles.wishButton}
            >
              ★ 관심등록
            </button>
          </div>
          
        </div>
      </div>

      {/* 🌟 [디자인 개편] 알약(Pill)을 제거하고, 배경색과 톤온톤 게이지로 고급스럽게 마감한 플랫 UI */}
      {item.platform === 'yahoo_auction' && (
        <div style={{ 
          position: 'absolute', bottom: 0, left: 0, 
          width: '100%', 
          height: '40px', 
          display: 'flex', 
          overflow: 'hidden', 
          borderBottomLeftRadius: isMobile ? '16px' : '20px',
          borderBottomRightRadius: isMobile ? '16px' : '20px',
        }}>
          
          {/* 1. 좌측: 입찰수 영역 (짙고 묵직한 배경색) */}
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', 
            width: '70px', 
            backgroundColor: timeStyles.leftBg, 
            color: '#ffffff', // 좌측은 항상 어두운 톤이므로 흰색 텍스트 고정
            fontSize: '13px', fontWeight: 800,
            zIndex: 10
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.9 }}>
              <path d="M3.586 12.07a2 2 0 0 0 0 2.83l3.534 3.535a2 2 0 0 0 2.828 0l8.484-8.485a2 2 0 0 0 0-2.829l-3.535-3.535a2 2 0 0 0-2.828 0L3.586 12.07Zm11.665 1.062-2.121 2.121 5.746 5.748 2.121-2.122-5.746-5.747Z" />
            </svg>
            <span>{item.bidCount || 0}</span>
          </div>

          {/* 2. 우측: 슬라이더 바 + 플랫(Flat) 텍스트 */}
          <div style={{
            flex: 1, 
            position: 'relative',
            backgroundColor: timeStyles.rightBg // 빈 슬라이더 트랙의 부드러운 배경색
          }}>
            {/* 차오르는 톤온톤 게이지 바 */}
            <div style={{
              width: `${sliderPercentage}%`,
              height: '100%',
              backgroundColor: timeStyles.gaugeBg, // 이질감 없이 스며드는 게이지 색상
              transition: 'width 1s linear',
              position: 'absolute',
              left: 0, top: 0
            }} />

            {/* 🌟 캡슐 없이 슬라이더 중앙에 직접 스며든 텍스트 */}
            <div style={{
              position: 'absolute', inset: 0, 
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
              color: timeStyles.textColor, // 배경 대비에 맞춘 텍스트 색상
              zIndex: 10
            }}>
              {/* 긴급할 때 깜빡이는 라이브 닷(Dot) */}
              {timeStyles.showDot && <div className="live-dot" />}
              
              {/* 여유 있을 때 표시되는 시계 아이콘 */}
              {!timeStyles.showDot && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.85 }}>
                  <path d="M2 12C2 6.48 6.47 2 11.99 2 17.52 2 22 6.48 22 12s-4.48 10-10.01 10C6.47 22 2 17.52 2 12Zm2 0c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8-8 3.58-8 8Zm7-5h1.5v5.25l4.5 2.67-.75 1.23L11 13V7Z" />
                </svg>
              )}
              <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '-0.3px' }}>
                {displayTimeLeft}
              </span>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}