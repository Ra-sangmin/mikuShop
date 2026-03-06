"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMikuAlert } from '@/app/context/MikuAlertContext'; 

export interface DetailedProduct {
  id: string;
  name: string;
  price: number;
  description: string;
  images: string[];
  thumbnail: string;
  condition: string;
  size: string;
  categories: string[];
  shippingPayer: string;
  url: string;
  status: 'on_sale' | 'sold_out';
}

interface MercariProductDetailProps {
  product: DetailedProduct;
  onClose?: () => void;
}

export default function MercariProductDetail({ product, onClose }: MercariProductDetailProps) {
  const router = useRouter();
  const { showAlert, showConfirm } = useMikuAlert(); 
  const [currentImg, setCurrentImg] = useState(product.thumbnail);
  const [isHovered, setIsHovered] = useState(false);

  const handleAddToCart = async () => {
    const userId = localStorage.getItem('id');
    if (!userId) {
      showAlert("로그인이 필요한 서비스입니다. 로그인 후 이용해 주세요! 🌸");
      return;
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          productName: product.name,
          productPrice: product.price,
          productImageUrl: product.thumbnail,
          productUrl: product.url,
          productOption: "", 
          status: "장바구니"
        }),
      });

      const data = await response.json();
      if (data.success) {
        const isConfirmed = await showConfirm("🛒 장바구니에 상품을 성공적으로 담았습니다!\n장바구니 페이지로 이동하시겠습니까?");
        if (isConfirmed) router.push('/mypage/status?tab=장바구니');
      } else {
        showAlert(`오류 발생: ${data.error}`);
      }
    } catch (error) {
      showAlert("서버와 통신하는 중 문제가 발생했습니다.");
    }
  };

  // --- 인라인 스타일 객체 ---
  const styles = {
    container: {
      marginTop: '40px',
      backgroundColor: 'white',
      border: '1px solid #f3f4f6',
      borderRadius: '40px',
      padding: '40px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
      animation: 'fadeInUp 0.5s ease-out'
    },
    flexLayout: {
      display: 'flex',
      flexDirection: 'row' as const,
      gap: '40px',
      flexWrap: 'wrap' as const
    },
    imageSection: {
      flex: 1,
      minWidth: '300px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px'
    },
    mainImageWrapper: {
      position: 'relative' as const,
      aspectRatio: '1/1',
      borderRadius: '24px',
      overflow: 'hidden',
      backgroundColor: '#f9fafb',
      border: '1px solid #f3f4f6',
      boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
    },
    mainImage: {
      width: '100%',
      height: '100%',
      objectFit: 'contain' as const,
      transition: 'transform 0.5s ease',
      transform: isHovered ? 'scale(1.05)' : 'scale(1)'
    },
    soldOutOverlay: {
      position: 'absolute' as const,
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10
    },
    soldOutBadge: {
      color: 'white',
      fontWeight: 900,
      fontSize: '24px',
      border: '4px solid white',
      padding: '8px 24px',
      transform: 'rotate(-10deg)'
    },
    thumbnailList: {
      display: 'flex',
      gap: '8px',
      overflowX: 'auto' as const,
      paddingBottom: '8px',
    },
    infoSection: {
      flex: 1,
      minWidth: '300px',
      display: 'flex',
      flexDirection: 'column' as const
    },
    headerRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '8px'
    },
    conditionBadge: {
      backgroundColor: '#fff1f2',
      color: '#ff007f',
      fontSize: '11px',
      fontWeight: 'bold',
      padding: '4px 12px',
      borderRadius: '999px'
    },
    priceMain: {
      fontSize: '36px',
      fontWeight: 900,
      color: '#ff007f'
    },
    priceSub: {
      fontSize: '14px',
      color: '#9ca3af',
      marginLeft: '8px'
    },
    specGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
      padding: '24px 0',
      borderTop: '1px solid #f9fafb',
      borderBottom: '1px solid #f9fafb',
      marginBottom: '24px',
      fontSize: '13px'
    },
    descriptionBox: {
      backgroundColor: '#f9fafb',
      borderRadius: '24px',
      padding: '20px',
      marginBottom: '32px',
      maxHeight: '200px',
      overflowY: 'auto' as const,
      border: '1px solid #f3f4f6'
    },
    buyButton: {
      flex: 1,
      backgroundColor: '#ff007f',
      color: 'white',
      fontWeight: 900,
      padding: '16px 0',
      borderRadius: '24px',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 10px 15px -3px rgba(255, 0, 127, 0.2)',
      transition: 'all 0.2s'
    }
  };

  return (
    <div id="detail-view" style={styles.container}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .custom-scrollbar::-webkit-scrollbar { height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ff007f; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f3f4f6; }
      `}</style>

      <div style={styles.flexLayout}>
        {/* 🖼️ 왼쪽: 이미지 섹션 */}
        <div style={styles.imageSection}>
          <div 
            style={styles.mainImageWrapper} 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <img src={currentImg} alt={product.name} style={styles.mainImage} />
            {product.status === 'sold_out' && (
              <div style={styles.soldOutOverlay}>
                <span style={styles.soldOutBadge}>SOLD OUT</span>
              </div>
            )}
          </div>
          <div className="custom-scrollbar" style={styles.thumbnailList}>
            {product.images.map((img, idx) => (
              <img 
                key={idx} src={img} 
                onClick={() => setCurrentImg(img)}
                style={{
                  width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover',
                  border: `2px solid ${currentImg === img ? '#ff007f' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 0.2s'
                }} 
              />
            ))}
          </div>
        </div>

        {/* 📝 오른쪽: 정보 섹션 */}
        <div style={styles.infoSection}>
          <div style={{ marginBottom: '24px' }}>
            <div style={styles.headerRow}>
              <span style={styles.conditionBadge}>{product.condition}</span>
              {onClose && (
                <button 
                  onClick={onClose} 
                  style={{ border: 'none', background: 'none', color: '#d1d5db', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ✕ 닫기
                </button>
              )}
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1f2937', margin: '12px 0' }}>{product.name}</h2>
            <div>
              <span style={styles.priceMain}>¥{product.price.toLocaleString()}</span>
              <span style={styles.priceSub}>약 {(product.price * 9.5).toLocaleString()}원</span>
            </div>
          </div>

          <div style={styles.specGrid}>
            <div><span style={{ color: '#9ca3af', display: 'block' }}>사이즈</span><p style={{ fontWeight: 'bold', margin: '4px 0' }}>{product.size || 'FREE'}</p></div>
            <div><span style={{ color: '#9ca3af', display: 'block' }}>배송비</span><p style={{ fontWeight: 'bold', margin: '4px 0' }}>{product.shippingPayer}</p></div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: '#9ca3af', display: 'block' }}>카테고리</span>
              <p style={{ color: '#6b7280', margin: '4px 0' }}>{product.categories.join(' > ')}</p>
            </div>
          </div>

          <div className="custom-scrollbar" style={styles.descriptionBox}>
            <h4 style={{ fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 8px 0' }}>Description</h4>
            <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.6', whiteSpace: 'pre-wrap', margin: 0 }}>{product.description}</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
            <button 
              onClick={handleAddToCart} 
              style={styles.buyButton}
              onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
            >
              구매대행 신청하기
            </button>
            <button style={{ padding: '0 24px', border: '1px solid #e5e7eb', borderRadius: '24px', backgroundColor: 'white', color: '#d1d5db', cursor: 'pointer' }}>★</button>
          </div>
        </div>
      </div>
    </div>
  );
}