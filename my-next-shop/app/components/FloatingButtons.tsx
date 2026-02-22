"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FloatingButtons() {
  const router = useRouter();
  const [cartCount, setCartCount] = useState<number>(0);
  const [wishlistCount, setWishlistCount] = useState<number>(0);

  const updateCounts = () => {
    const savedCart = JSON.parse(localStorage.getItem('rakutenCart') || '[]');
    setCartCount(savedCart.length);
    const savedWishlist = JSON.parse(localStorage.getItem('rakutenWishlist') || '[]');
    setWishlistCount(savedWishlist.length);
  };

  useEffect(() => {
    updateCounts();
    
    // storage 이벤트 리스너 등록 (다른 탭/윈도우에서의 변경 감지)
    window.addEventListener('storage', updateCounts);
    
    // 커스텀 이벤트를 통한 실시간 갱신 (같은 윈도우 내에서의 변경 감지용)
    window.addEventListener('cartUpdate', updateCounts);
    window.addEventListener('wishlistUpdate', updateCounts);

    // 주기적인 체크 (안전장치)
    const interval = setInterval(updateCounts, 2000);

    return () => {
      window.removeEventListener('storage', updateCounts);
      window.removeEventListener('cartUpdate', updateCounts);
      window.removeEventListener('wishlistUpdate', updateCounts);
      clearInterval(interval);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', bottom: '40px', right: '40px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <button 
        onClick={() => router.push('/wishlist')} 
        style={{
          backgroundColor: '#f0ad4e',
          color: '#fff',
          border: 'none',
          borderRadius: '50px',
          padding: '15px 25px',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        ★ 관심상품
        {wishlistCount > 0 && (
          <span style={{ 
            backgroundColor: '#d9534f', 
            color: '#fff', 
            borderRadius: '50%', 
            padding: '2px 8px', 
            fontSize: '14px',
            marginLeft: '5px'
          }}>
            {wishlistCount}
          </span>
        )}
      </button>
      <button 
        onClick={() => router.push('/cart')} 
        style={{
          backgroundColor: '#337ab7',
          color: '#fff',
          border: 'none',
          borderRadius: '50px',
          padding: '15px 25px',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        🛒 장바구니
        {cartCount > 0 && (
          <span style={{ 
            backgroundColor: '#d9534f', 
            color: '#fff', 
            borderRadius: '50%', 
            padding: '2px 8px', 
            fontSize: '14px',
            marginLeft: '5px'
          }}>
            {cartCount}
          </span>
        )}
      </button>
    </div>
  );
}
