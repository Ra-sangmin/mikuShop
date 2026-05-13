"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { FEE_POLICY } from "@/src/constants/feePolicy"; 
import { feeManager } from "@/src/models/FeeManager"; 
import { getDetailStyles, DetailTheme } from "./GlobalProductDetail.styles";
import { GlobalProduct } from "./GlobalProductDetail"; // 타입 임포트

interface BaseProps {
  product: GlobalProduct;
  currentPrice: number;
  quantity: number;
  isAuction?: boolean;
  onClose?: () => void;
  onAction?: () => void; // 🌟 '?' 추가
  actionText?: string;   // 🌟 '?' 추가
  children: (props: any) => React.ReactNode;
  middleContent?: (props: { 
    styles: Record<string, any>; 
    isMobile: boolean; 
    theme: any; 
  }) => React.ReactNode;
}

export default function GlobalProductDetailBase(props: BaseProps) {

  const { 
    product, onClose, currentPrice, quantity, onAction, 
    actionText, isAuction, children, middleContent 
  } = props;

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

  // 🌟 [추가/수정] 상세 설명 영역을 메모이제이션합니다.
  // product.description이 바뀔 때만(최초 로딩 시) 실행되고, 1초마다 변하는 타이머에는 반응하지 않습니다.
  const renderedDescription = useMemo(() => {
    if (!product.description) return null;

    return (
      <div style={styles.descBox}>
        <h4 style={styles.descTitle}>상품 상세 설명</h4>
        {isAuction ? (
          <div 
            style={styles.descText} 
            dangerouslySetInnerHTML={{ __html: product.description }} 
          />
        ) : (
          <p style={styles.descText}>{product.description}</p>
        )}
      </div>
    );
  }, [product.description, isAuction, styles.descBox, styles.descTitle, styles.descText]);

  const handleOpenOriginal = () => {
    if (!product.url) return;
    window.open(product.url, '_blank', 'noopener,noreferrer');
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
          
          {/* 🌟 3. [이동 완료] 제목 바로 아래에 원문 보기 링크 배치 */}
          <a 
            href={product.url} 
            target="_blank" 
            rel="noopener noreferrer"
            style={styles.originalLink}
            className="notranslate"
            onMouseOver={(e) => {
              e.currentTarget.style.color = theme.main; // 마우스 올리면 플랫폼 테마색(야후 레드 등)으로 변경
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = '#6b7280';
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            일본 원문 페이지 확인하기
          </a>
          
          {/* 플랫폼별 컨텐츠 (Auction의 경우 Dashboard + 버튼 + 상세정보가 여기 다 들어옴) */}
          {children({ styles, isMobile, theme })}

          {/* 🌟 수정 포인트: onAction과 actionText가 모두 있을 때만 기본 버튼 렌더링 */}
          {onAction && actionText && (
            <button onClick={onAction} style={styles.buyBtn} disabled={product.status === 'sold_out'}>
              <span className="notranslate">{product.platform.toUpperCase()}</span> {actionText}
            </button>
          )}
        </div>
      </div>

      {/* 🌟 [핵심 추가] 파란색 선으로 표시하신 위치! (전체 너비 사용) */}
      {middleContent && (
        <div style={{ width: '100%', padding: isMobile ? '0 15px' : '0 30px' }}>
          {middleContent({ styles, isMobile, theme })}
        </div>
      )}

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

        {/* 🌟 [수정] 아래처럼 메모이제이션된 변수를 렌더링하도록 바꿉니다. */}
        <div style={styles.descBox}>
          <div style={styles.cautionBox}>
            <div style={styles.cautionTitle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg> 
              {isAuction ? '경매 주의사항' : '주의사항'}
            </div>
            <div style={styles.cautionMainText}>
              {isAuction ? '입찰 후 취소는 절대 불가하며, 판매자 사정에 의해 조기 종료되거나 입찰이 취소될 수 있습니다.' : '번역 서비스 특성상 오번역에 대한 책임은 지지 않습니다.'}
            </div>
          </div>
          
          {/* 🌟 기존 설명 코드를 싹 지우고 아래 한 줄로 대체! */}
          {renderedDescription}
        </div>
      </div>
    </div>
  );
}