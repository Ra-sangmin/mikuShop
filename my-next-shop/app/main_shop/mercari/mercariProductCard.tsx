"use client";

import React, { useState, useEffect } from 'react';

interface MercariItem {
  id: string;
  name: string;
  price: number;
  thumbnail: string;
  status: string;
  url: string;
}

interface MercariProductCardProps {
  item: MercariItem;
  onClick: (id: string) => void;
}

export default function MercariProductCard({ item, onClick }: MercariProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 🚀 모바일 화면 크기 감지
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize(); // 초기화
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const styles = {
    card: {
      backgroundColor: 'white',
      border: '1px solid #f3f4f6',
      borderRadius: isMobile ? '16px' : '20px', // 모바일에서 곡률 살짝 축소
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      // 🚀 모바일에서는 호버 시 카드가 떠오르는 효과 방지
      transform: isHovered && !isMobile ? 'translateY(-8px)' : 'translateY(0)',
      boxShadow: isHovered && !isMobile
        ? '0 25px 50px -12px rgba(0, 0, 0, 0.15)' 
        : '0 1px 3px rgba(0, 0, 0, 0.05)',
      display: 'flex',
      flexDirection: 'column' as const,
      height: '100%',
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
      // 🚀 모바일에서는 호버 확대 효과도 방지
      transform: isHovered && !isMobile ? 'scale(1.1)' : 'scale(1)',
      filter: item.status === 'sold_out' ? 'grayscale(100%)' : 'none',
    },
    badge: {
      position: 'absolute' as const,
      top: isMobile ? '8px' : '12px',
      left: isMobile ? '8px' : '12px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(8px)',
      color: 'white',
      fontSize: isMobile ? '9px' : '10px',
      padding: isMobile ? '3px 6px' : '4px 8px',
      borderRadius: '6px',
      fontWeight: 'bold',
      zIndex: 20,
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
      fontSize: isMobile ? '16px' : '22px', // 🚀 좁은 화면을 위해 글자 크기 축소
      fontWeight: 900,
      letterSpacing: '0.1em',
      textShadow: '0 2px 4px rgba(0,0,0,0.5)', 
      border: isMobile ? '1.5px solid white' : '2px solid white',
      padding: isMobile ? '6px 12px' : '8px 16px',
      borderRadius: '8px',
      transform: 'rotate(-10deg)', 
    },
    infoArea: {
      padding: isMobile ? '12px 10px' : '16px', // 🚀 모바일 내부 여백 축소
      display: 'flex',
      flexDirection: 'column' as const,
      flex: 1,
      gap: isMobile ? '8px' : '12px',
      opacity: item.status === 'sold_out' ? 0.6 : 1, 
    },
    title: {
      fontSize: isMobile ? '12px' : '13px',
      color: isHovered && !isMobile ? '#ff007f' : '#374151',
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
      fontSize: isMobile ? '15px' : '18px', // 🚀 가격 폰트 크기 조정
      fontWeight: 900,
      textDecoration: item.status === 'sold_out' ? 'line-through' : 'none',
      color: item.status === 'sold_out' ? '#9ca3af' : '#111827',
    },
    currency: {
      fontSize: isMobile ? '11px' : '12px',
      marginRight: '2px',
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
      pointerEvents: item.status === 'sold_out' ? 'none' : 'auto' as any,
      opacity: item.status === 'sold_out' ? 0 : 1,
    }
  };

  return (
    <div 
      onClick={() => onClick(item.id)} 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={styles.card}
    >
      {/* 🖼️ 상품 이미지 영역 */}
      <div style={styles.imageContainer}>
        {item.thumbnail ? (
          <img 
            src={item.thumbnail} 
            alt={item.name || '상품 이미지'}
            style={styles.image}
            loading="lazy"
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db', fontSize: '12px' }}>
            No Image
          </div>
        )}

        {/* 🚀 품절 상태일 때: 전체 화면 덮는 SOLD OUT 막 띄우기 */}
        {item.status === 'sold_out' ? (
          <div style={styles.soldOutOverlay}>
            <span style={styles.soldOutText}>SOLD OUT</span>
          </div>
        ) : (
          /* 판매 중일 때만 작은 뱃지 노출 */
          <div style={styles.badge}>
            판매중
          </div>
        )}
      </div>

      {/* 📝 상품 정보 영역 */}
      <div className="product-info" style={styles.infoArea}>
        <h3 style={styles.title} translate="yes" lang="ja">
          {item.name || '상품명 정보 없음'}
        </h3>
        
        <div style={styles.priceRow}>
          <span style={styles.price}>
            <span style={styles.currency}>¥</span>
            {item.price ? item.price.toLocaleString() : '0'}
          </span>
          
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              alert("관심상품에 등록되었습니다."); 
            }}
            onMouseOver={(e) => {
              if (isMobile) return; // 모바일 터치 시 스타일 고정 방지
              e.currentTarget.style.color = '#ff007f';
              e.currentTarget.style.borderColor = '#ffc0cb';
              e.currentTarget.style.backgroundColor = '#fff1f2';
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
  );
}