"use client";

import React, { useState, useEffect, useMemo } from 'react';

export interface GlobalItem {
  id: string;
  platform: 'mercari' | 'rakuten' | 'amazon' | 'yahoo';
  name: string;
  price: number;
  thumbnail: string;
  status: 'on_sale' | 'sold_out';
  url: string;
}

interface GlobalProductCardProps {
  item: GlobalItem;
  onClick: (id: string) => void;
}

export default function GlobalProductCard({ item, onClick }: GlobalProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const themeColor = useMemo(() => {
    switch(item.platform) {
      case 'mercari': return '#ff007f';
      case 'rakuten': return '#bf0000';
      case 'amazon':  return '#ff9900';
      case 'yahoo':   return '#ff0033';
      default: return '#ff007f';
    }
  }, [item.platform]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const styles = {
    card: {
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
    /* 🗑️ platformBadge 스타일 삭제됨 */
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
    }
  };

  return (
    <div 
      onClick={() => onClick(item.id)} 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={styles.card}
    >
      <div style={styles.imageContainer}>
        {/* ✨ 🗑️ 플랫폼 구분 배지 노출 부분 삭제됨 */}

        {item.thumbnail ? (
          <img 
            src={item.thumbnail} 
            alt={item.name}
            style={styles.image}
            loading="lazy"
          />
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
        
        <div className="notranslate" translate="no"  style={styles.priceRow}>
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
  );
}