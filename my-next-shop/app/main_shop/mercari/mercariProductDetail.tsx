"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMikuAlert } from '@/app/context/MikuAlertContext'; 
import { FEE_POLICY, calculateTotalJpy } from "@/src/constants/feePolicy"; 
import { feeManager } from "@/src/models/FeeManager"; 

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

  const [fees, setFees] = useState(feeManager.getFees());
  const exchangeRate = 9.5;

  // 🚀 모바일 대응을 위한 상태 추가
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize(); // 초기화
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (feeManager.getIsLoaded()) {
      setFees(feeManager.getFees());
    } else {
      feeManager.loadFees().then((updatedFees) => {
        setFees(updatedFees);
      });
    }
  }, []);

  const { totalPriceJpy, totalPriceKrw } = useMemo(() => {
    const jpySum = product.price + fees.TRANSFER + fees.AGENCY;
    return {
      totalPriceJpy: jpySum,
      totalPriceKrw: Math.floor(jpySum * exchangeRate)
    };
  }, [product.price, fees, exchangeRate]);

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

  // 🚀 내부로 이동한 스타일 객체 (isMobile 상태 반영)
  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      marginTop: isMobile ? '20px' : '40px',
      backgroundColor: 'white',
      border: '1px solid #f3f4f6',
      borderRadius: isMobile ? '24px' : '40px',
      padding: isMobile ? '20px' : '40px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative',
    },
    topSection: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row', // 모바일 세로 배치
      gap: isMobile ? '24px' : '40px',
      flexWrap: 'wrap',
      marginBottom: isMobile ? '24px' : '40px',
    },
    imageWrapper: {
      flex: isMobile ? 'none' : '1 1 400px',
      width: isMobile ? '100%' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    mainImgBox: {
      position: 'relative',
      aspectRatio: '1/1',
      borderRadius: '24px',
      overflow: 'hidden',
      backgroundColor: '#f9fafb',
      border: '1px solid #f3f4f6',
    },
    infoWrapper: {
      flex: isMobile ? 'none' : '1 1 350px',
      width: isMobile ? '100%' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
    },
    bottomSection: {
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? '16px' : '24px',
    },
    calcBox: { 
      padding: isMobile ? '20px' : '32px', 
      backgroundColor: '#fff5f6', 
      borderRadius: '24px', 
      border: '1px dashed #ff007f',
    },
    descBox: { 
      padding: isMobile ? '20px' : '32px', 
      backgroundColor: '#f9fafb', 
      borderRadius: '24px', 
      border: '1px solid #f3f4f6',
      minHeight: '150px'
    },
    priceTag: { fontSize: isMobile ? '28px' : '36px', fontWeight: 900, color: '#ff007f' },
    buyBtn: {
      backgroundColor: '#ff007f',
      color: 'white',
      fontWeight: 900,
      padding: isMobile ? '16px 0' : '18px 0',
      borderRadius: '24px',
      border: 'none',
      cursor: 'pointer',
      fontSize: isMobile ? '16px' : '18px',
      width: '100%'
    },
  };

  return (
    <div id="detail-view" style={styles.container} translate="yes" lang="ja">

      {/* 닫기 버튼: 부모 기준 오른쪽 상단 끝에 고정 */}
      {onClose && (
      <button 
        onClick={onClose} 
        style={{ 
          position: 'absolute', 
          top: isMobile ? '10px' : '15px',    
          right: isMobile ? '10px' : '24px',  
          zIndex: 10,    
          border: 'none', 
          background: 'none', 
          color: '#9ca3af', 
          cursor: 'pointer', 
          fontWeight: 'bold',
          fontSize: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '8px'
        }}
      >
        ✕ <span className="notranslate" translate="no">닫기</span>
      </button>
    )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .custom-scrollbar::-webkit-scrollbar { height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ff007f; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f3f4f6; }
      `}</style>

      <div style={styles.topSection}>

        {/* 🖼️ 왼쪽: 이미지 섹션 */}
        <div style={styles.imageWrapper}>
          <div style={styles.mainImgBox}>
            <img 
              src={currentImg} 
              alt={product.name} 
              style={{ width: '100%', height: '100%', objectFit: 'contain', transition: '0.5s', transform: isHovered && !isMobile ? 'scale(1.05)' : 'scale(1)' }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            />
            {product.status === 'sold_out' && (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontWeight: 900, fontSize: isMobile ? '20px' : '24px', border: '4px solid white', padding: '8px 24px', transform: 'rotate(-10deg)' }}>SOLD OUT</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }}>
            {product.images.map((img, idx) => (
              <img 
                key={idx} src={img} 
                onClick={() => setCurrentImg(img)}
                style={{ width: isMobile ? '60px' : '70px', height: isMobile ? '60px' : '70px', borderRadius: '12px', cursor: 'pointer', border: `2px solid ${currentImg === img ? '#ff007f' : 'transparent'}`, flexShrink: 0 }} 
                alt={`thumbnail-${idx}`}
              />
            ))}
          </div>
        </div>

        {/* 📝 오른쪽: 상품 기본 정보 및 신청 버튼 */}
        <div style={styles.infoWrapper}>
        {/* 1. 상단 상태 배지 및 닫기 버튼 영역 */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ backgroundColor: '#fff1f2', color: '#ff007f', fontSize: '11px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '999px' }}>
              {product.condition}
            </span>
          </div>
          
          <h2 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 900, margin: isMobile ? '12px 0' : '20px 0', color: '#1f2937' }}>{product.name}</h2>
          
          <div style={{ marginBottom: isMobile ? '20px' : '30px' }}>
            <span style={styles.priceTag}>¥{product.price.toLocaleString()}</span>
            <span style={{ color: '#9ca3af', marginLeft: '10px', fontSize: isMobile ? '14px' : '16px' }}>약 {(product.price * FEE_POLICY.EXCHANGE_RATE).toLocaleString()}원</span>
          </div>
          
          <div style={{ borderTop: '1px solid #f3f4f6', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>사이즈</span>
              <span style={{ fontWeight: 'bold' }}>{product.size || 'FREE'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>배송비 부담</span>
              <span style={{ fontWeight: 'bold' }}>{product.shippingPayer}</span>
            </div>
            {/* ✨ 카테고리 표시 부분 복구 */}
            <div style={{ marginTop: '5px' }}>
              <span style={{ color: '#9ca3af', fontSize: '14px', display: 'block', marginBottom: '4px' }}>카테고리</span>
              <p style={{ color: '#6b7280', fontSize: '13px', margin: 0, lineHeight: '1.4' }}>{product.categories.join(' > ')}</p>
            </div>
          </div>

          {/* 1️⃣ [최상단 배치] 번역기 줄바꿈 무시 방지 최종 버전 */}
          <div className="notranslate-container" style={{
            width: '100%',
            padding: isMobile ? '16px 20px' : '24px 30px',
            backgroundColor: '#fff5f6',
            borderRadius: '24px',
            border: '1.5px dashed #ff007f',
            marginBottom: '32px',
            boxSizing: 'border-box',
          }}>
            <div className="notranslate-container" translate="no" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '20px' }}>✨</span>
              <span style={{ color: '#ff007f', fontWeight: 'bold', fontSize: '16px' }}>미쿠짱 AI 간단 요약</span>
            </div>
            
            <div style={{ 
              margin: 0, 
              fontSize: isMobile ? '15px' : '17px', 
              color: '#4b5563', 
              lineHeight: '1.9',
            }}>
              {/* 첫 번째 줄 */}
              <div style={{ display: 'block', width: '100%', marginBottom: '4px' }}>
                해당 상품은 <span style={{ fontWeight: 'bold' }}>{product.condition}</span> 
                <span className="notranslate-container" translate="no"> 상태의</span> 
              </div>
              
              {/* 두 번째 줄 */}
              <div style={{ display: 'block', width: '100%', marginBottom: '4px' }}>
                <span style={{ 
                  color: '#1f2937', 
                  fontWeight: '800', 
                  fontSize: isMobile ? '17px' : '19px', 
                  textDecoration: 'underline',
                  textUnderlineOffset: '4px'
                }}>
                  {product.name}
                </span>입니다.
              </div>
              
              {/* 세 번째 줄: 사이즈 및 가격 (notranslate 적용) */}
              <div style={{ display: 'block', width: '100%' }}>
                  {/* 사이즈 문구 */}
                  <div style={{ display: 'block', marginBottom: '4px' }}>
                    <span translate="no" className="notranslate" style={{ fontWeight: 'bold' }}>
                      {product.size || 'FREE'}
                    </span>
                    <span className="notranslate-container" translate="no" style={{ marginLeft: '4px' }}>
                      사이즈이며,
                    </span>
                  </div>
              </div>

              {/* 가격 문구 (줄바꿈되어 표시됨) */}
              <div style={{ display: 'block' }}>
                <span translate="no" className="notranslate" style={{ 
                  color: '#ff007f', 
                  fontWeight: '900', 
                  fontSize: isMobile ? '18px' : '20px'
                }}>
                  ¥{product.price.toLocaleString()}
                </span>
                <span className="notranslate-container" translate="no" style={{ marginLeft: '4px' }}>
                  가격으로 등록되었습니다.
                </span>
              </div>

            </div>
          </div>

          {/* ✨ 구매대행 신청하기 버튼 */}
          <button 
            onClick={handleAddToCart} 
            style={styles.buyBtn}
            onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
          >
            구매대행 신청하기
          </button>
        </div>

      </div>

      
      <div style={styles.bottomSection}>

        {/* 아랫부분: 가로를 가로지르는 예상 결제 금액 및 설명 */}
        <div style={styles.calcBox}>
          <h4 className="notranslate" translate="no" style={{ margin: '0 0 20px 0', color: '#ff007f', fontWeight: 900, textAlign: 'center', fontSize: isMobile ? '15px' : '16px' }}>
            💰 실시간 예상 결제 금액
          </h4>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: isMobile ? '8px' : '15px' }}>
            
            <div style={{ textAlign: 'center', flex: isMobile ? '1 1 30%' : 'none' }}>
              <span className="notranslate" translate="no" style={{ color: '#6b7280', fontSize: '12px' }}>상품 가격</span>
              <p style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: 'bold', margin: '4px 0 0 0' }}>¥{product.price.toLocaleString()}</p>
            </div>

            <span style={{ color: '#cbd5e1', fontSize: isMobile ? '14px' : '16px' }}>+</span>

            <div style={{ textAlign: 'center', flex: isMobile ? '1 1 30%' : 'none' }}>
              <span className="notranslate" translate="no" style={{ color: '#6b7280', fontSize: '12px' }}>송금 수수료</span>
              <p style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: 'bold', margin: '4px 0 0 0' }}>¥{fees.TRANSFER.toLocaleString()}</p>
            </div>

            <span style={{ color: '#cbd5e1', fontSize: isMobile ? '14px' : '16px' }}>+</span>

            <div style={{ textAlign: 'center', flex: isMobile ? '1 1 30%' : 'none' }}>
              <span className="notranslate" translate="no" style={{ color: '#6b7280', fontSize: '12px' }}>대행 수수료</span>
              <p style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: 'bold', margin: '4px 0 0 0' }}>¥{fees.AGENCY.toLocaleString()}</p>
            </div>

            <span style={{ fontSize: '20px', color: '#adb5bd', margin: isMobile ? '10px 100%' : '0 10px', height: isMobile ? '0' : 'auto', textAlign: 'center' }}>{isMobile ? '' : '='}</span>

            <div style={{ 
              padding: isMobile ? '12px 20px' : '15px 25px', 
              background: '#fff', 
              borderRadius: '16px', 
              boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
              border: '2px solid #ff007f',
              textAlign: 'center',
              width: isMobile ? '100%' : 'auto',
              marginTop: isMobile ? '10px' : '0'
            }}>
              <span className="notranslate" translate="no" style={{ color: '#ff007f', fontSize: '13px', fontWeight: '800' }}>최종 합계</span>
              <p style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 900, color: '#111827', margin: '2px 0' }}>¥{totalPriceJpy.toLocaleString()}</p>
              <p style={{ color: '#ef4444', fontWeight: '800', fontSize: isMobile ? '14px' : '15px', margin: 0 }}>약 {totalPriceKrw.toLocaleString()}원</p>
            </div>
            
          </div>
          <p className="notranslate" translate="no" style={{ fontSize: '12px', color: '#adb5bd', textAlign: 'center', marginTop: '20px', marginBottom: 0 }}>
            * 국제 배송비는 상품 무게 측정 후 2차 결제 시 청구됩니다.
          </p>
        </div>      

        <div style={styles.descBox}>
          <h4 className="notranslate" translate="no" style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '16px', fontWeight: 'bold' }}>상품 상세 설명</h4>
          <p style={{ lineHeight: '1.8', whiteSpace: 'pre-wrap', color: '#4b5563', fontSize: isMobile ? '14px' : '15px', margin: 0 }}>{product.description}</p>
        </div>
      </div>
    </div>
  );
}