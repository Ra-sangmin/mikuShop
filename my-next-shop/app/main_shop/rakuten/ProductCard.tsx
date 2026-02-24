"use client";

import React, { useState, useEffect } from 'react';

export default function ProductCard({ item, exchangeRate , onItemClick, onWishlistUpdate }: { item: any, exchangeRate : any , onItemClick: () => void, onWishlistUpdate?: () => void }) {
  // 클라이언트 사이드 마운트 여부 확인용 (Hydration 에러 방지)
  const [mounted, setMounted] = useState(false);
  const [wishlistCount, setWishlistCount] = useState<number>(0);

  useEffect(() => {
    setMounted(true); // 컴포넌트가 브라우저에 마운트된 후 실행
    try {
      const savedWishlist = JSON.parse(localStorage.getItem('rakutenWishlist') || '[]');
      setWishlistCount(savedWishlist.length);
    } catch (e) {
      console.error("Wishlist 로드 실패", e);
    }
  }, []);

  const rawImage = item.mediumImageUrls?.[0] || "";
  const mainImage = rawImage.split('?')[0];

  const priceYen = Number(item.itemPrice || item.priceYen) || 0;
  const priceWon = Math.round(priceYen * exchangeRate / 100) * 100; 

  // 하이드레이션 에러 방지를 위해 클라이언트 마운트 전에는 
  // 로컬스토리지 관련 상태에 의존하는 UI를 최소화합니다.
  if (!item) return null;

  return (
      <div 
        onClick={onItemClick}
        style={{
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          display: 'flex',
          flexDirection: 'column',
          textAlign: 'center',
          fontSize: '12px',
          color: '#333',
          height: '100%',
          minHeight: '400px',
          transition: 'box-shadow 0.2s',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
      >
        {/* 이미지 영역 */}
        <div style={{ padding: '10px', height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {mainImage && (
            <img 
              src={mainImage} 
              alt={item.itemName}
              style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
            />
          )}
        </div>

        {/* 상품명 - suppressHydrationWarning 추가 */}
        <div 
          suppressHydrationWarning
          style={{
            padding: '0 10px',
            height: '36px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: '18px',
            textAlign: 'left',
            marginBottom: '10px'
          }}>
          {item.itemName}
        </div>

        {/* 가격 정보 */}
        <div style={{ marginBottom: '10px' }}>
          <span style={{ color: '#bf0000', fontWeight: 'bold', fontSize: '16px' }}>
            {Number(item.itemPrice).toLocaleString()}엔
          </span>
        </div>

        {/* 관심상품 버튼 */}
        <div style={{ padding: '0 10px 15px' }}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const wishItem = {
                itemId: item.itemCode || item.itemId,
                itemName: item.itemName,
                shopName: item.shopName,
                imageUrl: mainImage,
                priceYen: priceYen,
                addedAt: new Date().toISOString()
              };

              const existingWishlist = JSON.parse(localStorage.getItem('rakutenWishlist') || '[]');
              const isAlreadyInWishlist = existingWishlist.find((w: any) => w.itemId === wishItem.itemId);

              if (isAlreadyInWishlist) {
                alert("이미 관심상품에 등록된 상품입니다!");
                return;
              }

              const updatedWishlist = [...existingWishlist, wishItem];
              localStorage.setItem('rakutenWishlist', JSON.stringify(updatedWishlist));
              setWishlistCount(updatedWishlist.length);
              if (onWishlistUpdate) onWishlistUpdate();
              alert('★ 관심상품 등록!');
            }}
            style={{ 
              width: '100%', padding: '8px 0', backgroundColor: '#f0ad4e', 
              color: '#fff', border: 'none', borderRadius: '4px', 
              cursor: 'pointer', fontWeight: 'bold' 
            }}
          >
            ★ 관심상품등록
          </button>
        </div>

        {/* 하단 상점명 영역 */}
        <div style={{
          backgroundColor: '#eee',
          padding: '8px 5px',
          fontSize: '11px',
          color: '#777',
          borderTop: '1px solid #ddd',
          marginTop: 'auto'
        }}>
          상점명 : {item.shopName}
        </div>
      </div>
  );
}