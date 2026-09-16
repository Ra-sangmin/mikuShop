"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import DOMPurify from "isomorphic-dompurify";
import { useExchangeRate } from "@/app/context/ExchangeRateContext";
import { getDetailStyles, getDetailTheme, DetailTheme, PLATFORM_LABEL } from "./GlobalProductDetail.styles";
import { GlobalProduct } from "./GlobalProductDetail"; // 타입 임포트
import { splitDescriptionForDisplay } from "./aiSummaryUtils";

// 🔒 외부 쇼핑몰에서 스크래핑한 상품 설명 HTML 정제기.
// 야후옥션 출품자가 자유롭게 작성한 내용이라 신뢰할 수 없습니다. 정제 없이 넣으면
// 우리 도메인에서 임의 스크립트가 실행됩니다(XSS → 로그인 세션으로 API 호출 가능).
// 서식 태그만 허용하고 script/이벤트 핸들러/javascript: URL 등은 모두 제거합니다.
function sanitizeDescription(html: string) {
  return DOMPurify.sanitize(html ?? '', {
    ALLOWED_TAGS: [
      'p', 'br', 'div', 'span', 'b', 'strong', 'i', 'em', 'u', 's',
      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'small', 'font',
    ],
    ALLOWED_ATTR: ['colspan', 'rowspan', 'align'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'link', 'base'],
    FORBID_ATTR: ['style', 'srcset', 'formaction'],
  });
}

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

  // 🌟 쇼핑몰 원색(#bf0000 등) 대신 목록 화면과 같은 부드러운 팔레트를 씁니다.
  const theme: DetailTheme = useMemo(() => getDetailTheme(product.platform), [product.platform]);

  const styles = useMemo(() => getDetailStyles(isMobile, theme), [isMobile, theme]);

  const isSoldOut = product.status === 'sold_out';
  const platformLabel = PLATFORM_LABEL[product.platform] || product.platform;
  const imageList = product.images && product.images.length > 0 ? product.images : [product.thumbnail];
  const currentImgIndex = Math.max(0, imageList.indexOf(currentImg));

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
    // 쓰거나 실제 개행 대신 리터럴 "<br>" 텍스트를 그대로 남기는 경우도 있음).
    // 🐛 예전에는 이 기호들 앞에서만 줄을 나눠서, 기호 없이 "。"로만 이어지거나 라벨과 값이
    //    붙어 있는 설명(라쿠텐 표본의 18%)은 한 줄로 쭉 이어져 읽기 어려웠습니다.
    //    → 문장 부호·항목 라벨까지 함께 보는 공용 분할기를 씁니다. (aiSummaryUtils)
    const descriptionBlocks = !isAuction ? splitDescriptionForDisplay(product.description) : [];

    return (
      <div style={styles.descBox}>
        <div style={styles.descHead}>
          <span style={styles.sectionEyebrow}>Details</span>
          <h4 style={styles.descTitle}><span style={styles.descTitleBar} />상품 상세 설명</h4>
        </div>
        {isAuction ? (
          <div
            style={styles.descText}
            dangerouslySetInnerHTML={{ __html: sanitizeDescription(product.description) }}
          />
        ) : descriptionBlocks.length > 0 ? (
          <div style={styles.descList}>
            {/* 【표제】·■※● 기호나 "個装サイズ" 같은 항목 라벨은 강조색으로 앞에 세웁니다. */}
            {descriptionBlocks.map((block, idx) => (
              <p key={idx} style={styles.descListItem}>
                {block.marker && <span style={styles.descBullet}>{block.marker}</span>}
                {block.text}
              </p>
            ))}
          </div>
        ) : (
          <p style={styles.descText}>{product.description}</p>
        )}
      </div>
    );
  }, [product.description, isAuction, styles]);

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

  // 🌟 100엔당 원화 (예: 9.52 → 952원)
  const ratePer100 = Math.round(exchangeRate * 100 * 100) / 100;

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
        }

        /* 🌟 합계 카드가 좁은 데스크톱 폭(사이드바 포함)에서 넘치지 않도록 세로로 쌓습니다 */
        @media (min-width: 769px) and (max-width: 1280px) {
          #global-detail-view .gpd-calc-grid { flex-direction: column !important; }
          #global-detail-view .gpd-total-box { flex: none !important; width: 100% !important; flex-direction: row !important; align-items: center !important; justify-content: space-between !important; flex-wrap: wrap; gap: 8px 16px; }
          #global-detail-view .gpd-total-box .gpd-total-label { flex-basis: 100%; text-align: left; }
          #global-detail-view .gpd-total-box .gpd-total-jpy { margin: 0 !important; }
        }

        #global-detail-view input:focus,
        #global-detail-view textarea:focus {
          border-color: ${theme.main} !important;
          box-shadow: 0 0 0 3px ${theme.main}1a;
          background: #ffffff;
        }
        #global-detail-view .gpd-stepper:focus-within {
          border-color: ${theme.main};
          box-shadow: 0 0 0 3px ${theme.main}1a;
        }
        #global-detail-view .gpd-stepper input:focus { box-shadow: none; }
        #global-detail-view input[type=number]::-webkit-inner-spin-button,
        #global-detail-view input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        #global-detail-view .gpd-stepper input[type=number] { -moz-appearance: textfield; }
        #global-detail-view .gpd-step-btn:hover:not(:disabled) { background: ${theme.light}; color: ${theme.main}; }
        #global-detail-view .gpd-step-btn:disabled { color: #c4c8d0; cursor: not-allowed; }

        #global-detail-view .gpd-close:hover { background: #111827; border-color: #111827; color: #ffffff; }
        #global-detail-view .gpd-origin-link:hover,
        #global-detail-view .gpd-shop-link:hover { color: ${theme.main}; border-color: ${theme.main}55; background: ${theme.light}; }
        #global-detail-view .gpd-origin-link:hover .gpd-origin-arrow { transform: translate(2px, -2px); }
        #global-detail-view .gpd-origin-arrow { transition: transform 0.2s ease; }
        #global-detail-view .gpd-thumb:hover { opacity: 1 !important; }
        #global-detail-view .gpd-buy-btn:not(:disabled):hover { transform: translateY(-2px); filter: brightness(1.04); }
        #global-detail-view .gpd-buy-btn:not(:disabled):active { transform: translateY(0); }
        #global-detail-view .gpd-buy-btn:focus-visible,
        #global-detail-view .gpd-close:focus-visible { outline: 3px solid ${theme.main}55; outline-offset: 2px; }

        #global-detail-view .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        #global-detail-view .custom-scrollbar::-webkit-scrollbar-thumb { background: #dfe2e8; border-radius: 999px; }
        #global-detail-view .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }

        /* 🌟 예상 결제 금액 항목 구분선 */
        #global-detail-view .calc-item {
          position: relative;
        }
        #global-detail-view .calc-item:not(:last-child)::after {
          content: '';
          position: absolute;
          right: 0;
          top: 12%;
          height: 76%;
          width: 1px;
          background: linear-gradient(to bottom, rgba(209, 213, 219, 0) 0%, rgba(156, 163, 175, 0.55) 50%, rgba(209, 213, 219, 0) 100%);
        }
        /* 🌟 항목 사이 "+" 연산 기호 (구분선 위에 원형 배지) */
        #global-detail-view .calc-item:not(:last-child)::before {
          content: '+';
          position: absolute; right: -10px; top: 50%; z-index: 1;
          width: 20px; height: 20px; margin-top: -10px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: #ffffff; border: 1px solid #e3e7ee; color: #94a3b8;
          font-size: 13px; font-weight: 900; line-height: 1;
          box-shadow: 0 4px 10px -6px rgba(15, 23, 42, 0.3);
        }
        /* 🌟 예상 결제 금액 카드 상단 테마 라인 */
        #global-detail-view .gpd-calc-card::before {
          content: ''; position: absolute; inset: 0 0 auto; height: 3px;
          background: linear-gradient(90deg, transparent 0%, ${theme.from || theme.main} 30%, ${theme.to || theme.main} 70%, transparent 100%);
          opacity: 0.85;
        }
        /* 🌟 합계 카드: 은은한 도트 패턴 + 우상단 링 */
        #global-detail-view .gpd-total-box::before {
          content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none;
          background-image: radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px);
          background-size: 16px 16px;
          -webkit-mask-image: radial-gradient(80% 80% at 100% 0%, #000 0%, transparent 100%);
          mask-image: radial-gradient(80% 80% at 100% 0%, #000 0%, transparent 100%);
        }
        #global-detail-view .gpd-total-box::after {
          content: ''; position: absolute; left: -70px; bottom: -90px; width: 200px; height: 200px; z-index: -1;
          border-radius: 50%; border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 0 0 22px rgba(255,255,255,0.025);
        }
        #global-detail-view .gpd-total-box { transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease; }
        #global-detail-view .gpd-total-box:hover { transform: translateY(-2px); }
        @media (max-width: 768px) {
          #global-detail-view .calc-item:not(:last-child)::before { right: -9px; width: 18px; height: 18px; margin-top: -9px; font-size: 12px; }
        }
      `}</style>
      {onClose && (
        <button type="button" className="notranslate gpd-close" onClick={onClose} style={styles.CloseBtn} aria-label="상세 정보 닫기">
          <svg width={isMobile ? "14" : "15"} height={isMobile ? "14" : "15"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          {!isMobile && <span style={styles.CloseText}>닫기</span>}
        </button>
      )}

      <div className="topSection" style={styles.topSection}>
        {/* 이미지 영역 */}
        <div style={styles.imageWrapper}>
          <div style={styles.mainImgBox}>
            <img src={currentImg} alt={product.name} style={styles.mainImg(isHovered)} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} />
            {imageList.length > 1 && !isSoldOut && (
              <span className="notranslate" style={styles.imgCounter}>{currentImgIndex + 1} / {imageList.length}</span>
            )}
            {isSoldOut && (
              <div style={styles.soldOutOverlay}>
                <span style={styles.soldOutText}>{isAuction ? '경매 종료' : 'SOLD OUT'}</span>
              </div>
            )}
          </div>
          {imageList.length > 1 && (
            <div className="custom-scrollbar" ref={scrollRef} onMouseDown={handleDrag.start} onMouseMove={handleDrag.move} onMouseUp={handleDrag.end} onMouseLeave={handleDrag.end} style={styles.thumbScroll}>
              {imageList.map((img, idx) => (
                <img key={idx} className="gpd-thumb" src={img} onClick={() => setCurrentImg(img)} style={styles.thumbImg(currentImg === img)} alt={`썸네일 ${idx + 1}`} />
              ))}
            </div>
          )}
        </div>

        {/* 정보 영역 */}
        <div style={styles.infoWrapper}>
          <div style={styles.eyebrowRow}>
            <span className="notranslate" translate="no" style={styles.platformChip}>
              <span style={styles.platformDot}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </span>
              {platformLabel}
            </span>
            <span style={{ ...styles.statusChip, ...(isSoldOut ? styles.statusChipSold : null) }}>
              <span style={styles.statusDot} />
              {isSoldOut ? (isAuction ? '경매 종료' : '품절') : (isAuction ? '경매 진행중' : '판매중')}
            </span>
            {product.condition && <span style={styles.conditionBadge}>{product.condition}</span>}
          </div>

          {/* 🌟 data-product-title: 구매대행 신청 시 "화면에 번역되어 보이는" 상품명을 읽어오기 위한 표식 */}
          <h2 style={styles.title} lang="ja" data-product-title="">{product.name}</h2>

          {/* 🌟 제목 바로 아래 원문 보기 링크 */}
          {product.url && (
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.originalLink}
              className="notranslate gpd-origin-link"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              일본 원문 페이지 확인하기
              <svg className="gpd-origin-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17 17 7" /><path d="M8 7h9v9" />
              </svg>
            </a>
          )}

          {/* 플랫폼별 컨텐츠 (Auction의 경우 Dashboard + 버튼 + 상세정보가 여기 다 들어옴) */}
          {children({ styles, isMobile, theme })}

          {/* 🌟 onAction과 actionText가 모두 있을 때만 기본 버튼 렌더링 */}
          {onAction && actionText && (
            <>
              <button
                type="button"
                className="gpd-buy-btn"
                onClick={onAction}
                style={{ ...styles.buyBtn, ...(isSoldOut ? styles.buyBtnDisabled : null) }}
                disabled={isSoldOut}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                <span>{isSoldOut ? '품절된 상품입니다' : actionText}</span>
                {!isSoldOut && (
                  <span style={styles.buyBtnArrow}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                    </svg>
                  </span>
                )}
              </button>
              {!isSoldOut && (
                <p style={styles.buyHint}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" />
                  </svg>
                  신청 후 마이페이지 장바구니에서 확인 · 결제할 수 있어요
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* 🌟 옥션 등 전체 너비를 쓰는 중간 영역 (container 패딩만으로 다른 섹션과 같은 폭) */}
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
        <div className="notranslate gpd-calc-card" translate="no" style={styles.calcBox}>
          <div style={styles.sectionHead}>
            <div style={styles.sectionHeadMain}>
              <span style={styles.sectionIcon} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 2v20l3-2 3 2 2-2 2 2 3-2 3 2V2l-3 2-3-2-2 2-2-2-3 2-3-2Z" /><path d="M8 8h8" /><path d="M8 12h8" /><path d="M8 16h5" />
                </svg>
              </span>
              <div>
                <span style={styles.sectionEyebrow}>Estimate</span>
                <h4 style={styles.sectionTitle}>예상 결제 금액</h4>
              </div>
            </div>
            {exchangeRate > 0 && (
              <span style={styles.rateChip}>
                <span style={styles.rateChipIcon} aria-hidden="true">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                </span>
                적용 환율 ¥100 = {ratePer100.toLocaleString()}원
              </span>
            )}
          </div>
          <div className="gpd-calc-grid" style={styles.calcGrid}>
            <div className="calc-items-box" style={styles.calcItemsBox}>
              <div className="calc-item" style={styles.calcItem}>
                <span style={styles.calcItemIcon} aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z" /><circle cx="7.5" cy="7.5" r="1.5" />
                  </svg>
                </span>
                <span style={styles.calcItemLabel}>{isAuction ? '희망 입찰금액' : `상품가${quantity > 1 ? ` ×${quantity}` : ''}`}</span>
                <p style={styles.calcItemVal}><span style={styles.yen}>¥</span>{(currentPrice * quantity).toLocaleString()}</p>
              </div>
              <div className="calc-item" style={styles.calcItem}>
                <span style={styles.calcItemIcon} aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" /><path d="M6 15h4" />
                  </svg>
                </span>
                <span style={styles.calcItemLabel}>결제 수수료</span>
                <p style={styles.calcItemVal}><span style={styles.yen}>¥</span>{paymentFee.toLocaleString()}</p>
              </div>
              <div className="calc-item" style={styles.calcItem}>
                <span style={styles.calcItemIcon} aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect x="2" y="6" width="20" height="14" rx="2.5" />
                  </svg>
                </span>
                <span style={styles.calcItemLabel}>대행 수수료</span>
                <p style={styles.calcItemVal}><span style={styles.yen}>¥</span>{agencyFee.toLocaleString()}</p>
              </div>
            </div>
            <div className="gpd-total-box" style={styles.totalSumBox}>
              <span style={styles.totalAccent} />
              <span className="gpd-total-label" style={styles.totalLabel}><span style={styles.totalEq} aria-hidden="true">=</span>최종 합계</span>
              <p className="gpd-total-jpy" style={styles.totalJpy}><span style={styles.totalYen}>¥</span>{totalPriceJpy.toLocaleString()}</p>
              <p style={styles.totalKrw}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 7l4 10 3-8 2 6 2-6 3 8 4-10" /><path d="M2 11h20" />
                </svg>
                약 {totalPriceKrw.toLocaleString()}원
              </p>
            </div>
          </div>
          <p style={styles.calcFooterNotice}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
            </svg>
            <span>{isAuction ? '최종 낙찰가에 따라 금액이 변동되며, ' : ''}국제 배송비는 상품 무게 측정 후 2차 결제 시 청구됩니다.</span>
          </p>
        </div>

        <div style={styles.descSectionWrapper}>
          <div style={styles.translationNotice} role="note">
            <span style={styles.translationNoticeBar} aria-hidden="true" />
            <span style={styles.translationNoticeIcon} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
              </svg>
            </span>
            <span style={styles.translationNoticeBody}>
              <span style={styles.translationNoticeEyebrow}>{isAuction ? 'AUCTION NOTICE' : 'TRANSLATION NOTICE'}</span>
              <span style={styles.translationNoticeText}>
                {isAuction
                  ? '경매 주의사항: 입찰 후 취소는 절대 불가하며, 판매자 사정에 의해 조기 종료되거나 입찰이 취소될 수 있습니다.'
                  : '번역 서비스 특성상 오번역에 대한 책임은 지지 않습니다.'}
              </span>
            </span>
          </div>

          {renderedDescription}
        </div>
      </div>
    </div>
  );
}
