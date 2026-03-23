"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { FEE_POLICY } from "@/src/constants/feePolicy"; 
import { feeManager } from "@/src/models/FeeManager"; 
import { getDetailStyles, DetailTheme } from "./GlobalProductDetail.styles";
import { GlobalProduct } from "./GlobalProductDetail"; // 타입 임포트

interface BaseProps {
  product: GlobalProduct;
  onClose?: () => void;
  currentPrice: number; // Shop은 상품가, Auction은 실시간 입찰가
  quantity?: number;    // Shop은 수량, Auction은 무조건 1
  onAction: () => void;
  actionText: string;
  isAuction?: boolean;
  // 부모가 전달한 자식 컴포넌트에게 스타일과 테마 정보를 렌더 프롭스로 전달
  children: (props: { styles: Record<string, React.CSSProperties>; isMobile: boolean; theme: DetailTheme }) => React.ReactNode;
}

export default function GlobalProductDetailBase({
  product, onClose, currentPrice, quantity = 1, onAction, actionText, isAuction = false, children
}: BaseProps) {
  const [currentImg, setCurrentImg] = useState(product.thumbnail);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [fees, setFees] = useState(feeManager.getFees());
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDrag, setIsDrag] = useState(false);
  const [startX, setStartX] = useState(0);
  const exchangeRate = FEE_POLICY.EXCHANGE_RATE || 9.5;

  const theme: DetailTheme = useMemo(() => {
    switch(product.platform) {
      case 'mercari': return { main: '#ff007f', light: '#fff5f6' };
      case 'rakuten': return { main: '#bf0000', light: '#fdf2f2' };
      case 'amazon':  return { main: '#ff9900', light: '#fff9f0' };
      case 'yahoo_auction': return { main: '#ef4444', light: '#fef2f2' };
      default:        return { main: '#ff007f', light: '#fff5f6' };
    }
  }, [product.platform]);

  const styles = useMemo(() => getDetailStyles(isMobile, theme), [isMobile, theme]);

  // 드래그 로직
  const handleDrag = {
    start: (e: React.MouseEvent) => { e.preventDefault(); setIsDrag(true); if (scrollRef.current) setStartX(e.pageX + scrollRef.current.scrollLeft); },
    move: (e: React.MouseEvent) => { if (!isDrag || !scrollRef.current) return; scrollRef.current.scrollLeft = startX - e.pageX; },
    end: () => setIsDrag(false)
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!feeManager.getIsLoaded()) feeManager.loadFees().then(setFees);
    else setFees(feeManager.getFees());
  }, []);

  useEffect(() => {
    setCurrentImg(product.thumbnail);
    if (scrollRef.current) scrollRef.current.scrollLeft = 0; 
  }, [product.id, product.thumbnail]);

  const { totalPriceJpy, totalPriceKrw } = useMemo(() => {
    const jpySum = (currentPrice * quantity) + (fees.TRANSFER || 0) + (fees.AGENCY || 0);
    return { totalPriceJpy: jpySum, totalPriceKrw: Math.floor(jpySum * exchangeRate) };
  }, [currentPrice, quantity, fees, exchangeRate]);

  return (
    <div id="global-detail-view" style={styles.container}>
      {onClose && (
        <button className="notranslate" onClick={onClose} style={styles.CloseBtn}>
          <svg width={isMobile ? "14" : "18"} height={isMobile ? "14" : "18"} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          {!isMobile && <span style={styles.CloseText}>CLOSE</span>}
        </button>
      )}

      <div style={styles.topSection}>
        {/* 이미지 영역 */}
        <div style={styles.imageWrapper}>
          <div style={styles.mainImgBox}>
            <img src={currentImg} alt="main" style={styles.mainImg(isHovered)} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} />
            {product.status === 'sold_out' && (
              <div style={styles.soldOutOverlay}>
                <span style={styles.soldOutText}>{isAuction ? '경매 종료' : 'SOLD OUT'}</span>
              </div>
            )}
          </div>
          <div className="custom-scrollbar" ref={scrollRef} onMouseDown={handleDrag.start} onMouseMove={handleDrag.move} onMouseUp={handleDrag.end} onMouseLeave={handleDrag.end} style={styles.thumbScroll}>
            {product.images.map((img, idx) => (
              <img key={idx} src={img} onClick={() => setCurrentImg(img)} style={styles.thumbImg(currentImg === img)} alt="thumb" />
            ))}
          </div>
        </div>

        {/* 정보 영역 */}
        <div style={styles.infoWrapper}>
          {product.condition && <div style={styles.conditionBadge}>{product.condition}</div>}
          <h2 style={styles.title} lang="ja">{product.name}</h2>
          
          {/* 🌟 플랫폼별 특징적인 컨텐츠가 들어가는 자리 (Shop 또는 Auction) */}
          {children({ styles, isMobile, theme })}

          <button onClick={onAction} style={styles.buyBtn} disabled={product.status === 'sold_out'}>
            <span className="notranslate">{product.platform.toUpperCase()}</span> {actionText}
          </button>
        </div>
      </div>

      {/* 하단 계산기 및 설명 영역 */}
      <div style={styles.bottomSection}>
        <div style={styles.calcBox}>
          <h4 className="notranslate" style={styles.calcHeader}>💰 {isAuction ? '현재가 기준 예상 결제 금액' : '예상 결제 금액'}</h4>
          <div style={styles.calcGrid}>
            <div style={styles.calcItem}><span style={styles.attrLabel}>{isAuction ? '현재 입찰가' : '상품가'}</span><p style={{ fontWeight: 'bold', fontSize: '20px' }}>¥{(currentPrice * quantity).toLocaleString()}</p></div>
            <span style={styles.calcSymbol}>+</span>
            <div style={styles.calcItem}><span style={styles.attrLabel}>수수료</span><p style={{ fontWeight: 'bold', fontSize: '20px' }}>¥{(fees.TRANSFER + fees.AGENCY).toLocaleString()}</p></div>
            <span style={styles.calcEquals}>{isMobile ? '' : '='}</span>
            <div style={styles.totalSumBox}>
              <span style={styles.totalLabel}>최종 합계</span>
              <p style={styles.totalJpy}>¥{totalPriceJpy.toLocaleString()}</p>
              <p style={styles.totalKrw}>약 {totalPriceKrw.toLocaleString()}원</p>
            </div>
          </div>
          <p style={styles.calcFooterNotice}>* {isAuction ? '최종 낙찰가에 따라 금액이 변동되며, ' : ''}국제 배송비는 상품 무게 측정 후 2차 결제 시 청구됩니다.</p>
        </div>

        <div style={styles.descBox}>
          <div style={styles.cautionBox}>
            <div style={styles.cautionTitle}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> {isAuction ? '경매 주의사항' : '주의사항'}</div>
            <div style={styles.cautionMainText}>{isAuction ? '입찰 후 취소는 절대 불가하며, 판매자 사정에 의해 조기 종료되거나 입찰이 취소될 수 있습니다.' : '번역 서비스 특성상 오번역에 대한 책임은 지지 않습니다.'}</div>
          </div>
          <h4 style={styles.descTitle}>상품 상세 설명</h4>
          {isAuction ? (
            <div style={styles.descText} dangerouslySetInnerHTML={{ __html: product.description }} />
          ) : (
            <p style={styles.descText}>{product.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}