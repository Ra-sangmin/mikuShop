"use client";

import React, { useState } from 'react';

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
  // 호버 상태 관리 (애니메이션 효과용)
  const [isHovered, setIsHovered] = useState(false);

  // --- 인라인 스타일 객체 정의 ---
  const styles = {
    card: {
      backgroundColor: 'white',
      border: '1px solid #f3f4f6',
      borderRadius: '20px',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
      boxShadow: isHovered 
        ? '0 25px 50px -12px rgba(0, 0, 0, 0.15)' 
        : '0 1px 3px rgba(0, 0, 0, 0.05)',
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
      transition: 'transform 0.5s ease',
      transform: isHovered ? 'scale(1.1)' : 'scale(1)',
    },
    badge: {
      position: 'absolute' as const,
      top: '12px',
      left: '12px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(8px)',
      color: 'white',
      fontSize: '10px',
      padding: '4px 8px',
      borderRadius: '6px',
      fontWeight: 'bold',
    },
    infoArea: {
      padding: '16px',
    },
    title: {
      fontSize: '13px',
      color: isHovered ? '#ff007f' : '#4b5563',
      lineHeight: '1.25',
      height: '40px',
      marginBottom: '12px',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden',
      transition: 'color 0.3s ease',
      fontWeight: 500,
      margin: '0 0 12px 0',
    },
    priceRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    price: {
      fontSize: '18px',
      fontWeight: 900,
      color: '#111827',
    },
    currency: {
      fontSize: '12px',
      marginRight: '2px',
      fontWeight: 400,
    },
    wishButton: {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#9ca3af',
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      padding: '6px 12px',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
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
        <img 
          src={item.thumbnail} 
          alt={item.name}
          style={styles.image}
        />
        <div style={styles.badge}>
          {item.status === 'on_sale' ? '판매중' : '품절'}
        </div>
      </div>

      {/* 📝 상품 정보 영역 */}
      <div style={styles.infoArea}>
        <p style={styles.title}>
          {item.name}
        </p>
        <div style={styles.priceRow}>
          <span style={styles.price}>
            <span style={styles.currency}>¥</span>
            {item.price.toLocaleString()}
          </span>
          
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              alert("관심상품에 등록되었습니다."); 
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#ff007f';
              e.currentTarget.style.borderColor = '#ffc0cb';
              e.currentTarget.style.backgroundColor = '#fff1f2';
            }}
            onMouseOut={(e) => {
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