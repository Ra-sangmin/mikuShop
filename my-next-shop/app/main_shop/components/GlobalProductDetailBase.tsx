"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useExchangeRate } from "@/app/context/ExchangeRateContext";
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDrag, setIsDrag] = useState(false);
  const [startX, setStartX] = useState(0);
  // 🌟 FEE_POLICY.EXCHANGE_RATE(고정값 9.5)는 더 이상 쓰지 않습니다. 사이트 전체가
  // /api/estimate(네이버 금융 스크래핑)의 실제 환율을 참조하는 ExchangeRateContext를
  // 공유하도록 통일했습니다.
  const { exchangeRate } = useExchangeRate();

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

    // 🌟 쇼핑몰마다 스크래핑 원문의 구분 기호가 제각각입니다 (■, ※, ●, 【표제】 등을 구분자로
    // 쓰거나 실제 개행 대신 리터럴 "<br>" 텍스트를 그대로 남기는 경우도 있음). 공통 규칙은
    // "이 기호들이 원래는 새 줄/새 항목의 시작"이라는 점이라, <br>은 개행으로 바꾸고 이 기호들
    // 앞에도 개행을 삽입해 한 덩어리로 붙어있던 텍스트를 항목별로 나눕니다.
    const normalizedDescription = !isAuction
      ? product.description
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/([■※●◆▶►]|【)/g, '\n$1')
      : product.description;

    const descriptionSegments = !isAuction
      ? normalizedDescription.split('\n').map(s => s.trim()).filter(Boolean)
      : [];

    return (
      <div style={styles.descBox}>
        <h4 style={styles.descTitle}><span style={styles.descTitleBar} />상품 상세 설명</h4>
        {isAuction ? (
          <div
            style={styles.descText}
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        ) : descriptionSegments.length > 1 ? (
          <div style={styles.descList}>
            {descriptionSegments.map((segment, idx) => {
              // 【표제】 또는 ■※●◆▶► 같은 선행 기호를 강조색으로 분리해서 보여줍니다.
              const match = segment.match(/^(【[^】]*】|[■※●◆▶►])\s*([\s\S]*)$/);
              return (
                <p key={idx} style={styles.descListItem}>
                  {match ? (
                    <>
                      <span style={styles.descBullet}>{match[1]}</span>
                      {match[2]}
                    </>
                  ) : segment}
                </p>
              );
            })}
          </div>
        ) : (
          <p style={styles.descText}>{normalizedDescription}</p>
        )}
      </div>
    );
  }, [product.description, isAuction, styles.descBox, styles.descTitle, styles.descText, styles.descList, styles.descListItem, styles.descBullet]);

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
    setCurrentImg(product.thumbnail);
    if (scrollRef.current) scrollRef.current.scrollLeft = 0; 
  }, [product.id, product.thumbnail]);

  // 🌟 admin/estimate와 동일한 계산식: 결제 수수료는 상품 총액(30,000엔) 기준,
  // 대행 수수료는 수량(4개) 기준으로 구간별 정액 부과합니다.
  const { paymentFee, agencyFee } = useMemo(() => {
    const itemTotalPrice = currentPrice * quantity;
    const tieredPaymentFee = itemTotalPrice > 0 ? (itemTotalPrice < 30000 ? 220 : 330) : 0;
    const tieredAgencyFee = quantity > 0 ? (quantity < 4 ? 300 : quantity * 100) : 0;
    return { paymentFee: tieredPaymentFee, agencyFee: tieredAgencyFee };
  }, [currentPrice, quantity]);

  const { totalPriceJpy, totalPriceKrw } = useMemo(() => {
    const jpySum = (currentPrice * quantity) + paymentFee + agencyFee;
    return { totalPriceJpy: jpySum, totalPriceKrw: Math.round(jpySum * exchangeRate / 100) * 100 };
  }, [currentPrice, quantity, paymentFee, agencyFee, exchangeRate]);

  return (
    <div id="global-detail-view" style={styles.container}>
      <style>{`
        @media (max-width: 768px) {
          #global-detail-view {
            width: 100% !important;
            max-width: 100vw !important;
            min-width: 0 !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding: 16px !important;
            box-sizing: border-box !important;
            overflow-x: clip !important;
            overscroll-behavior-x: none !important;
            touch-action: pan-y !important;
            user-select: none;
          }

          #global-detail-view .topSection,
          #global-detail-view .bottomSection {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }

          #global-detail-view > div {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          #global-detail-view img,
          #global-detail-view textarea,
          #global-detail-view input,
          #global-detail-view button {
            max-width: 100%;
            box-sizing: border-box;
          }

          #global-detail-view .custom-scrollbar {
            width: 100% !important;
            max-width: 100% !important;
            overflow: hidden !important;
            touch-action: pan-y !important;
          }

          #global-detail-view .calc-item::after {
            display: none;
          }
        }

        #global-detail-view input:focus,
        #global-detail-view textarea:focus {
          border-color: ${theme.main} !important;
          box-shadow: 0 0 0 3px ${theme.main}1a;
        }

        /* 🌟 예상 결제 금액 항목 구분선 (mypage/status 계산식 박스와 동일한 그라데이션 효과) */
        #global-detail-view .calc-item {
          position: relative;
        }
        #global-detail-view .calc-item:not(:last-child)::after {
          content: '';
          position: absolute;
          right: 0;
          top: 15%;
          height: 70%;
          width: 1px;
          background: linear-gradient(to bottom, rgba(229, 231, 235, 0) 0%, rgba(161, 161, 170, 0.4) 50%, rgba(229, 231, 235, 0) 100%);
        }
      `}</style>
      {onClose && (
        <button className="notranslate" onClick={onClose} style={styles.CloseBtn}>
          <svg width={isMobile ? "14" : "18"} height={isMobile ? "14" : "18"} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          {!isMobile && <span style={styles.CloseText}>CLOSE</span>}
        </button>
      )}

      <div className="topSection" style={styles.topSection}>
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

      {/* 🌟 [핵심 추가] 파란색 선으로 표시하신 위치! (전체 너비 사용)
          🌟 아래 bottomSection과 가로 폭을 맞추기 위해 여기서 별도 좌우 패딩을 주지 않습니다
          (container 자체의 패딩만으로 다른 섹션들과 동일한 폭이 됩니다). */}
      {middleContent && (
        <div style={{ width: '100%' }}>
          {middleContent({ styles, isMobile, theme })}
        </div>
      )}

      {/* 하단 계산기 및 설명 영역 */}
      <div className="bottomSection" style={styles.bottomSection}>
        {/* 🌟 브라우저 자동 번역(예: Chrome 번역)이 가격 텍스트 노드를 <font>로 감싸버리면
            React가 이후 리렌더링에서 값을 갱신해도 화면에 반영되지 않는 문제가 있어,
            실시간으로 바뀌는 금액 전체 영역을 notranslate로 감쌉니다. */}
        <div className="notranslate" translate="no" style={styles.calcBox}>
          <div style={styles.calcGrid}>
            <div className="calc-items-box" style={styles.calcItemsBox}>
              <div className="calc-item" style={styles.calcItem}>
                <span style={styles.calcItemLabel}>{isAuction ? '희망 입찰금액' : '상품가'}</span>
                <p style={styles.calcItemVal}>¥{(currentPrice * quantity).toLocaleString()}</p>
              </div>
              <div className="calc-item" style={styles.calcItem}>
                <span style={styles.calcItemLabel}>결제 수수료</span>
                <p style={styles.calcItemVal}>¥{paymentFee.toLocaleString()}</p>
              </div>
              <div className="calc-item" style={styles.calcItem}>
                <span style={styles.calcItemLabel}>대행 수수료</span>
                <p style={styles.calcItemVal}>¥{agencyFee.toLocaleString()}</p>
              </div>
            </div>
            <div style={styles.totalSumBox}>
              <span style={styles.totalLabel}>최종 합계</span>
              <p style={styles.totalJpy}>¥{totalPriceJpy.toLocaleString()}</p>
              <p style={styles.totalKrw}>약 {totalPriceKrw.toLocaleString()}원</p>
            </div>
          </div>
          <p style={styles.calcFooterNotice}>* {isAuction ? '최종 낙찰가에 따라 금액이 변동되며, ' : ''}국제 배송비는 상품 무게 측정 후 2차 결제 시 청구됩니다.</p>
        </div>

        {/* 🌟 [수정] 아래처럼 메모이제이션된 변수를 렌더링하도록 바꿉니다. */}
        <div style={styles.descSectionWrapper}>
          {isAuction ? (
            <p style={styles.translationNotice}>
              <span style={styles.translationNoticeIcon}>⚠️</span>
              <span>경매 주의사항: 입찰 후 취소는 절대 불가하며, 판매자 사정에 의해 조기 종료되거나 입찰이 취소될 수 있습니다.</span>
            </p>
          ) : (
            <p style={styles.translationNotice}>
              <span style={styles.translationNoticeIcon}>⚠️</span>
              <span>번역 서비스 특성상 오번역에 대한 책임은 지지 않습니다.</span>
            </p>
          )}

          {/* 🌟 기존 설명 코드를 싹 지우고 아래 한 줄로 대체! */}
          {renderedDescription}
        </div>
      </div>
    </div>
  );
}