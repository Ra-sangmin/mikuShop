"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMikuAlert } from '@/app/context/MikuAlertContext'; 
import { FEE_POLICY } from "@/src/constants/feePolicy"; 
import { feeManager } from "@/src/models/FeeManager"; 

export interface GlobalProduct {
  id: string;
  platform: 'mercari' | 'rakuten' | 'amazon' | 'yahoo';
  name: string;
  price: number;
  count?: 1;
  description: string;
  images: string[];
  thumbnail: string;
  condition?: string;
  size?: string;
  categories: string[];
  shippingPayer?: string;
  url: string;
  status: 'on_sale' | 'sold_out';
  shopName?: string;  // 상점명 (라쿠텐 전용)
  shopUrl?: string; // ✨ 상점 이동을 위한 URL 추가
}

interface GlobalProductDetailProps {
  product: GlobalProduct;
  onClose?: () => void;
}

export default function GlobalProductDetail({ product, onClose }: GlobalProductDetailProps) {
  const router = useRouter();
  const { showAlert, showConfirm } = useMikuAlert(); 
  const [currentImg, setCurrentImg] = useState(product.thumbnail);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [fees, setFees] = useState(feeManager.getFees());

  // 드래그 제어를 위한 Ref 및 상태
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDrag, setIsDrag] = useState(false);
  const [startX, setStartX] = useState(0);

  const exchangeRate = FEE_POLICY.EXCHANGE_RATE || 9.5;

  // ✨ 라쿠텐 전용 상태 추가
  const [quantity, setQuantity] = useState(1);
  const [optionMemo, setOptionMemo] = useState("");

  const displayedName = useMemo(() => {
    if (product.name.length > 50) {
      return product.name.substring(0, 50) + "...";
    }
    return product.name;
  }, [product.name]);

  // 플랫폼별 테마 컬러 설정
  const theme = useMemo(() => {
    switch(product.platform) {
      case 'mercari': return { main: '#ff007f', light: '#fff5f6' };
      case 'rakuten': return { main: '#bf0000', light: '#fdf2f2' };
      case 'amazon':  return { main: '#ff9900', light: '#fff9f0' };
      default:        return { main: '#ff007f', light: '#fff5f6' };
    }
  }, [product.platform]);

  // 드래그 핸들러
  const onDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDrag(true);
    if (scrollRef.current) {
      setStartX(e.pageX + scrollRef.current.scrollLeft);
    }
  };

  const onDragEnd = () => setIsDrag(false);

  const onDragMove = (e: React.MouseEvent) => {
    if (!isDrag || !scrollRef.current) return;
    const x = e.pageX;
    scrollRef.current.scrollLeft = startX - x;
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (feeManager.getIsLoaded()) {
      setFees(feeManager.getFees());
    } else {
      feeManager.loadFees().then(setFees);
    }
  }, []);

  useEffect(() => {
    setCurrentImg(product.thumbnail); // 이미지 초기화
    setQuantity(1);                   // 수량 초기화
    setOptionMemo("");                // 옵션 메모 초기화
    
    // 썸네일 스크롤 위치도 초기화
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0; 
    }
  }, [product.id, product.thumbnail]);
  
  // ✨ 수량(quantity)을 반영하여 최종 합계 계산
  const { totalPriceJpy, totalPriceKrw } = useMemo(() => {
    // (상품 단가 * 수량) + 송금 수수료 + 대행 수수료
    const jpySum = (product.price * quantity) + (fees.TRANSFER || 0) + (fees.AGENCY || 0);
    
    return {
      totalPriceJpy: jpySum,
      totalPriceKrw: Math.floor(jpySum * exchangeRate)
    };
  }, [product.price, quantity, fees, exchangeRate]); // 👈 여기에 quantity를 추가해야 수량 변경 시 재계산됩니다.

  const handleAddToCart = async () => {
    const userId = localStorage.getItem('id');
    if (!userId) {
      showAlert("로그인이 필요한 서비스입니다. 🌸");
      return;
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          platform: product.platform,
          productName: product.name,
          productPrice: product.price,
          productCount: product.platform === 'rakuten' ? quantity : 1,
          productImageUrl: product.thumbnail,
          productUrl: product.url,
          productOption: optionMemo,
          status: "장바구니",
        }),
      });

      const data = await response.json();
      if (data.success) {
        const isConfirmed = await showConfirm("🛒 장바구니에 담겼습니다!\n페이지로 이동하시겠습니까?");
        if (isConfirmed) router.push('/mypage/status?tab=장바구니');
      } else {
        showAlert(`오류: ${data.error}`);
      }
    } catch (error) {
      showAlert("서버와 통신 중 문제가 발생했습니다.");
    }
  };


  const styles = useMemo(() => getDetailStyles(isMobile, theme), [isMobile, theme]);

  return (
    <div id="global-detail-view" style={styles.container} translate="yes">
      {onClose && (
        <button 
          className="notranslate" 
          translate="no" 
          onClick={onClose} 
          onMouseEnter={(e) => { if(!isMobile) e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={(e) => { if(!isMobile) e.currentTarget.style.transform = 'scale(1)'; }}
          style={styles.CloseBtn}
        >
          {/* ✨ 세련된 씬(Thin) 라인 SVG 아이콘 */}
          <svg 
            width={isMobile ? "14" : "18"} 
            height={isMobile ? "14" : "18"} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#6b7280" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>

          {/* ✨ PC에서만 은은하게 나타나는 텍스트 (선택 사항) */}
          {!isMobile && (
            <span style={{ 
              position: 'absolute', 
              right: '48px', 
              fontSize: '13px', 
              fontWeight: 600, 
              color: '#9ca3af',
              letterSpacing: '0.05em'
            }}>
              CLOSE
            </span>
          )}
        </button>
      )}

      <style>{`
          .custom-scrollbar::-webkit-scrollbar { height: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: ${theme.main}; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #f3f4f6; }
      `}</style>

      <div style={styles.topSection}>
        <div style={styles.imageWrapper}>
          <div style={styles.mainImgBox}>
            <img 
              src={currentImg} 
              alt="product" 
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'contain', transition: '0.5s', transform: isHovered && !isMobile ? 'scale(1.05)' : 'scale(1)' }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            />
            {product.status === 'sold_out' && (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontWeight: 900, fontSize: '24px', border: '4px solid white', padding: '8px 24px', transform: 'rotate(-10deg)' }}>SOLD OUT</span>
              </div>
            )}
          </div>

          <div 
            className="custom-scrollbar"
            ref={scrollRef}
            onMouseDown={onDragStart}
            onMouseMove={onDragMove}
            onMouseUp={onDragEnd}
            onMouseLeave={onDragEnd}
            style={{ 
              display: 'flex', 
              gap: '8px',
              overflowX: 'auto',
              overflowY: 'hidden',
              width: '100%',
              paddingBottom: '10px', 
              marginTop: '10px',
              alignItems: 'center',
              cursor: isDrag ? 'grabbing' : 'grab',
              userSelect: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {product.images.map((img, idx) => (
              <img 
                key={idx} 
                src={img} 
                draggable={false}
                onClick={() => {
                  if (scrollRef.current) {
                    const scrollDiff = Math.abs(startX - (scrollRef.current.scrollLeft + (startX - scrollRef.current.scrollLeft))); 
                    // 단순화를 위해 클릭 판정은 startX와 현재 스크롤 위치의 차이로 계산 가능
                    setCurrentImg(img);
                  }
                }}
                style={{ 
                  width: isMobile ? '65px' : '72px', 
                  height: isMobile ? '65px' : '72px',
                  borderRadius: '12px', 
                  cursor: 'pointer', 
                  border: `2px solid ${currentImg === img ? theme.main : 'transparent'}`, 
                  flexShrink: 0,
                  objectFit: 'cover',
                }} 
                alt={`thumbnail-${idx}`}
              />
            ))}
          </div>
        </div>

        <div style={styles.infoWrapper}>
          {/* product.condition이 있을 때만 렌더링 */}
          {product.condition && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ 
                backgroundColor: `${theme.main}15`, 
                color: theme.main, 
                fontSize: '11px', 
                fontWeight: 'bold', 
                padding: '4px 12px', 
                borderRadius: '999px' 
              }}>
                {product.condition}
              </span>
            </div>
          )}
          
          <h2 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 800, marginBottom: '16px', color: '#111827', lineHeight: 1.4 }} translate="yes" lang="ja">{product.name}</h2>
          
          <div style={{ marginBottom: isMobile ? '20px' : '30px' }}>
            {/* 1. 엔화 가격 (이미 잘 변하고 있다면 이 설정을 따르고 있을 것입니다) */}
            <span className="notranslate" translate="no" style={styles.priceTag}>
              ¥{(product.price * quantity).toLocaleString()}
            </span>
            
            {/* 2. 원화 가격 (여기에 반드시 notranslate를 추가하세요) */}
            <span 
              className="notranslate" 
              translate="no" 
              style={{ color: '#9ca3af', marginLeft: '10px', fontSize: isMobile ? '14px' : '16px' }}
            >
              약 {(product.price * quantity * exchangeRate).toLocaleString()}원
            </span>
          </div>

          {/* 2. 플랫폼별 조건부 정보 표시 */}
          {product.platform === 'mercari' ? (
            /* --- 메루카리 전용: 사이즈, 배송비, 카테고리 --- */
            <>
              {/* 메루카리 상세 속성 (사이즈, 배송비, 카테고리) */}
              <div style={{ borderTop: '1px solid #f3f4f6', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="notranslate" translate="no" style={{ color: '#9ca3af', fontSize: isMobile ? '16px' : '20px' }}>사이즈</span>
                  <span style={{ fontWeight: 'bold', fontSize: isMobile ? '16px' : '18px' }}>{product.size || 'FREE'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="notranslate" translate="no" style={{ color: '#9ca3af', fontSize: isMobile ? '16px' : '20px' }}>배송비 부담</span>
                  <span style={{ fontWeight: 'bold', fontSize: isMobile ? '16px' : '18px' }}>{product.shippingPayer}</span>
                </div>
                <div style={{ marginTop: '5px' }}>
                  <span className="notranslate" translate="no" style={{ color: '#9ca3af', fontSize: isMobile ? '16px' : '20px', display: 'block', marginBottom: '4px' }}>카테고리</span>
                  <p style={{ color: '#6b7280', fontSize: isMobile ? '14px' : '16px', margin: 0, lineHeight: '1.4' }}>
                    {product.categories.join(' > ')}
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* --- 라쿠텐 전용: 상점명, 수량, 옵션 --- */
           
              <div style={styles.rakutenTable}>
              <div style={styles.tableRow}>
                <div translate="yes" style={styles.tableLabel}>상점명</div>
                <div style={styles.tableValue}><span style={{ fontWeight: 600 }}>{product.shopName || 'Rakuten Fashion'}</span>
                  <button 
                      style={styles.smallBtn}
                      onClick={() => {
                        if (product.shopUrl) {
                          // ✨ 새 창으로 상점 페이지 열기
                          window.open(product.shopUrl, '_blank', 'noopener,noreferrer');
                        } else {
                          showAlert("상점 주소 정보를 찾을 수 없습니다. 🌸");
                        }
                      }}
                    >상점보기
                  </button>
                </div>
              </div>
              <div style={styles.tableRow}>
                <div style={styles.tableLabel}>단가</div>
                <div style={styles.tableValue}><span style={{ fontWeight: 800, fontSize: '20px' }}>¥{product.price.toLocaleString()}</span></div>
              </div>
              <div style={styles.tableRow}>
                <div style={styles.tableLabel}>수량</div>
                <div style={styles.tableValue}><input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} style={styles.numberInput} /></div>
              </div>
              <div style={{ ...styles.tableRow, borderBottom: 'none' }}>
                <div style={styles.tableLabel}>옵션 메모</div>
                <div style={{ ...styles.tableValue, paddingTop: '10px' }}><textarea placeholder="사이즈, 색상 등 옵션을 입력하세요." value={optionMemo} onChange={(e) => setOptionMemo(e.target.value)} style={styles.memoArea} /></div>
              </div>
            </div>
            
          )}
          
          {/* AI 요약 */}
          <div style={styles.aiBox}>
            <div className="notranslate" translate="no" style={styles.aiHeader}>✨ 미쿠짱 AI 간단 요약</div>
            <div style={{ margin: 0, fontSize: isMobile ? '15px' : '17px', color: '#4b5563', lineHeight: '1.9' }}>


            <div style={{ fontSize: isMobile ? '15px' : '17px', color: '#4b5563', lineHeight: '1.8' }}>
                {product.platform === 'rakuten' ? (
                  <>
                    해당 상품은 <span style={{ fontWeight: '800', color: '#111827' }}>{product.shopName || 'Rakuten'}</span> 상점에서 판매되는<br/>
                    <span translate="yes" style={{ fontWeight: '800', color: theme.main }}>{displayedName}</span> 입니다.<br/>
                  </>
                ) : (
                  /* 메루카리 등 타 플랫폼 기본 요약 */
                  <>
                    <div style={{ display: 'block', width: '100%', marginBottom: '4px' }}>
                      해당 상품은 <span style={{ fontWeight: 'bold' }}>{product.condition}</span> 
                      <span className="notranslate" translate="no"> 상태의</span> 
                    </div>
                    <div style={{ display: 'block', width: '100%', marginBottom: '4px' }}>
                      <span style={{ color: '#1f2937', fontWeight: '800', fontSize: isMobile ? '17px' : '19px', textDecoration: 'underline', textUnderlineOffset: '4px' }}>{displayedName}</span>입니다.
                    </div>
                    <div style={{ display: 'block', width: '100%' }}>
                        <div style={{ display: 'block', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 'bold' }}>{product.size || 'FREE'}</span>
                          <span className="notranslate" translate="no" style={{ marginLeft: '4px' }}>사이즈이며,</span>
                        </div>
                    </div>
                  </>
                )}
              </div>
              
              


              <div style={{ display: 'block' }}>
                <span translate="no" className="notranslate" style={{ color: theme.main, fontWeight: '900', fontSize: isMobile ? '18px' : '20px' }}>¥{product.price.toLocaleString()}</span>
                <span className="notranslate" translate="no" style={{ marginLeft: '4px' }}>가격으로 등록되었습니다.</span>
              </div>
            </div>
          </div>

          <button 
              onClick={handleAddToCart} 
              style={styles.buyBtn}
              onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
            >
              <span className="notranslate" translate="no">{product.platform.toUpperCase()}</span> 구매대행 신청하기
          </button>
        </div>
      </div>

      <div style={styles.bottomSection}>
        <div style={styles.calcBox}>
          <h4 className="notranslate" translate="no" style={{ margin: '0 0 20px 0', color: theme.main, fontWeight: 900, textAlign: 'center', fontSize: isMobile ? '18px' : '26px' }}>
            💰 실시간 예상 결제 금액
          </h4>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: isMobile ? '12px' : '20px' }}>
            <div style={{ textAlign: 'center', flex: isMobile ? '1 1 30%' : 'none' }}>
              <span className="notranslate" style={{ color: '#6b7280', fontSize: isMobile ? '14px' : '18px' }}>상품 가격</span>
              <p className="notranslate" style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 'bold', margin: '4px 0 0 0' }}>¥{(product.price * quantity).toLocaleString()}</p>
            </div>
            <span style={{ color: '#cbd5e1', fontSize: '20px' }}>+</span>
            <div style={{ textAlign: 'center', flex: isMobile ? '1 1 30%' : 'none' }}>
              <span className="notranslate" style={{ color: '#6b7280', fontSize: isMobile ? '14px' : '18px' }}>송금 수수료</span>
              <p className="notranslate" style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 'bold', margin: '4px 0 0 0' }}>¥{fees.TRANSFER.toLocaleString()}</p>
            </div>
            <span style={{ color: '#cbd5e1', fontSize: '20px' }}>+</span>
            <div style={{ textAlign: 'center', flex: isMobile ? '1 1 30%' : 'none' }}>
              <span className="notranslate" style={{ color: '#6b7280', fontSize: isMobile ? '14px' : '18px' }}>대행 수수료</span>
              <p className="notranslate" style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 'bold', margin: '4px 0 0 0' }}>¥{fees.AGENCY.toLocaleString()}</p>
            </div>
            
            <span style={{ fontSize: '24px', color: '#adb5bd', margin: isMobile ? '10px 100%' : '0 10px', textAlign: 'center' }}>{isMobile ? '' : '='}</span>
            
            <div style={{ padding: isMobile ? '15px' : '20px 30px', background: '#fff', borderRadius: '20px', boxShadow: '0 8px 20px rgba(0,0,0,0.05)', border: `2px solid ${theme.main}`, textAlign: 'center', width: isMobile ? '100%' : 'auto' }}>
              <span className="notranslate" style={{ color: theme.main, fontSize: '20px', fontWeight: '800' }}>최종 합계</span>
              <p className="notranslate" style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: 900, color: '#111827', margin: '2px 0' }}>¥{totalPriceJpy.toLocaleString()}</p>
              <p className="notranslate" style={{ color: '#ef4444', fontWeight: '800', fontSize: isMobile ? '18px' : '22px', margin: 0 }}>약 {totalPriceKrw.toLocaleString()}원</p>
            </div>
          </div>
          <p className="notranslate" style={{ fontSize: isMobile ? '12px' : '15px', color: '#9ca3af', textAlign: 'center', marginTop: '20px' }}>
            * 국제 배송비는 상품 무게 측정 후 2차 결제 시 청구됩니다.
          </p>
        </div>

        <div style={styles.descBox}>
          <h4 style={styles.descTitle}>상품 상세 설명</h4>

          <div style={styles.cautionBox}>
          {/* 🚨 경고 아이콘과 제목 */}
          <div style={styles.cautionTitle}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            주의사항
          </div>
          
          <div className="notranslate" style={styles.cautionMainText}>
            번역은 서비스로 제공해드리는 기능으로 <span style={{ color: '#e11d48', textDecoration: 'underline' }}>오번역으로 인한 피해는 책임지지 않으니</span> 주의하시기 바랍니다.
          </div>
          
        </div>

          <p style={styles.descText} lang="ja">{product.description}</p>
        </div>
        
      </div>
    </div>
  );
}

// --- 🎨 스타일 최적화 (Mercari & Rakuten 공용) ---
const getDetailStyles = (isMobile: boolean, theme: any): Record<string, React.CSSProperties> => ({
  container: { marginTop: isMobile ? '10px' : '30px', padding: isMobile ? '16px' : '40px', backgroundColor: 'white', borderRadius: isMobile ? '24px' : '40px', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', position: 'relative', width: '100%', boxSizing: 'border-box' },
  topSection: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '40px', marginBottom: '30px' },
  imageWrapper: { flex: isMobile ? 'none' : '1.1', display: 'flex', flexDirection: 'column', gap: '12px' },
  mainImgBox: { aspectRatio: isMobile ? '4/3' : '1/1', backgroundColor: '#f9fafb', borderRadius: '20px', overflow: 'hidden', border: '1px solid #f3f4f6' },
  thumbScroll: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' },
  thumbImg: { width: '64px', height: '64px', borderRadius: '12px', cursor: 'pointer', objectFit: 'cover' as const, flexShrink: 0 },
  infoWrapper: { flex: 1, display: 'flex', flexDirection: 'column' },
  conditionBadge: { backgroundColor: theme.light, color: theme.main, fontSize: '11px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '999px', alignSelf: 'flex-start', marginBottom: '8px' },
  title: { fontSize: isMobile ? '20px' : '26px', fontWeight: 800, color: '#111827', marginBottom: '15px', lineHeight: 1.4 },
  priceTag: { fontSize: isMobile ? '28px' : '36px', fontWeight: 900, color: theme.main },
  mercariInfoList: { borderTop: '1px solid #f3f4f6', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '12px' },
  attrRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  attrLabel: { color: '#9ca3af', fontSize: '15px' },
  attrValue: { fontWeight: 'bold', fontSize: '16px' },
  rakutenTable: { display: 'flex', flexDirection: 'column', borderTop: '1px solid #eee', marginBottom: '20px' },
  tableRow: { display: 'flex', borderBottom: '1px solid #eee', padding: '12px 0', alignItems: 'center' },
  tableLabel: { width: isMobile ? '80px' : '100px', fontSize: '14px', color: '#888' },
  tableValue: { flex: 1, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' },
  numberInput: { width: '60px', padding: '8px', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' },
  memoArea: { width: '100%', minHeight: '80px', padding: '12px', border: '1px solid #eee', borderRadius: '12px', fontSize: '13px', resize: 'none', backgroundColor: '#fafafa' },
  aiBox: { padding: '20px', backgroundColor: theme.light, borderRadius: '20px', border: `1.5px dashed ${theme.main}`, marginBottom: '20px' },
  aiHeader: { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '6px', fontSize: '14px', color: theme.main },
  buyBtn: { backgroundColor: theme.main, color: 'white', fontWeight: 900, padding: '18px', borderRadius: '24px', border: 'none', cursor: 'pointer', fontSize: isMobile ? '16px' : '20px', boxShadow: `0 8px 20px ${theme.main}44` },
  CloseBtn: { position: 'absolute', top: isMobile ? '12px' : '12px', right: isMobile ? '12px' : '24px', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', borderRadius: '50%', border: 'none', cursor: 'pointer' },
  bottomSection: { marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '30px' },
  calcBox: { padding: isMobile ? '24px' : '40px', backgroundColor: theme.light, borderRadius: '32px', border: `1px dashed ${theme.main}` },
  descBox: { padding: '30px', backgroundColor: '#f9fafb', borderRadius: '24px', border: '1px solid #f3f4f6' },
  descTitle: { margin: '0 0 16px 0', fontSize: '20px', fontWeight: 'bold' },
  descText: { lineHeight: '1.8', whiteSpace: 'pre-wrap', color: '#4b5563', fontSize: '15px' },
  smallBtn: {  padding: '4px 10px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#666', transition: 'all 0.2s', marginLeft: '4px', display: 'inline-flex', alignItems: 'center'},

  // 🚨 주의사항 박스 스타일 추가
  cautionBox: {
    backgroundColor: '#fff5f5', // 아주 연한 붉은색 배경으로 구획 구분
    border: '2px solid #e11d48',
    padding: isMobile ? '24px 16px' : '30px 24px',
    marginBottom: '30px',
    borderRadius: '16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: '0 4px 15px rgba(225, 29, 72, 0.12)', // 붉은색 계열의 은은한 그림자
    position: 'relative',
    overflow: 'hidden',
  },
  cautionTitle: {
    color: '#e11d48',
    fontWeight: '900',
    fontSize: isMobile ? '18px' : '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px', // 아이콘과 텍스트 사이 간격
  },
  cautionMainText: {
    fontSize: isMobile ? '15px' : '16px',
    color: '#1f2937',
    fontWeight: '600',
    lineHeight: '1.6',
    wordBreak: 'keep-all',
  },
  cautionSubText: {
    fontSize: isMobile ? '13px' : '14px',
    color: '#4b5563',
    lineHeight: '1.4',
    marginTop: '4px',
  }

});