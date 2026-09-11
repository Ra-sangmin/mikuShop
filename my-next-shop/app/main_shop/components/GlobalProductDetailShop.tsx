"use client";

import { useState , useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMikuAlert } from '@/app/context/MikuAlertContext';
import { useExchangeRate } from '@/app/context/ExchangeRateContext';
import GlobalProductDetailBase from "./GlobalProductDetailBase";
import { GlobalProduct } from "./GlobalProductDetail";
import { getDetailStyles, DetailTheme } from "./GlobalProductDetail.styles";
import { getDisplayedName, extractProductFeatures } from "./aiSummaryUtils";

interface Props {
  product: GlobalProduct;
  onClose?: () => void;
}

// 🌟 rakuten처럼 "상점명"이 뚜렷한 플랫폼도 있고, 메루카리처럼 개인 판매자라 shopName이
// 비어있기 쉬운 플랫폼도 있어, shopName이 없을 때 보여줄 플랫폼별 대체 이름입니다.
const PLATFORM_FALLBACK_NAME: Record<string, string> = {
  rakuten: 'Rakuten',
  mercari: '메루카리',
  yahoo_shopping: '야후 쇼핑',
  amazon: 'Amazon',
};

export default function GlobalProductDetailShop({ product, onClose }: Props) {
  const router = useRouter();
  const { showAlert, showConfirm } = useMikuAlert();
  // 🌟 고정값(FEE_POLICY.EXCHANGE_RATE=9.5) 대신 /api/estimate의 실제 환율을 참조합니다.
  const { exchangeRate } = useExchangeRate();
  
  const [quantity, setQuantity] = useState(1);
  const [optionMemo, setOptionMemo] = useState("");
  // 🌟 "이 상품의 특징" 아코디언 펼침 상태 (상세정보를 열었을 때는 기본값으로 접혀 있습니다)
  const [isFeatureOpen, setIsFeatureOpen] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const theme = useMemo(() => {
    switch(product.platform) {
      case 'mercari': return { main: '#ff007f', light: '#fff5f6' };
      case 'rakuten': return { main: '#bf0000', light: '#fdf2f2' };
      case 'amazon':  return { main: '#ff9900', light: '#fff9f0' };
      default:        return { main: '#ff007f', light: '#fff5f6' };
    }
  }, [product.platform]);

  const styles = useMemo(() => getDetailStyles(isMobile, theme), [isMobile, theme]);

  const handleAddToCart = async () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) { showAlert("로그인이 필요한 서비스입니다. 🌸"); return; }
    
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, platform: product.platform, productName: product.name,
          productPrice: product.price, productCount: quantity,
          productImageUrl: product.thumbnail, productUrl: product.url,
          productOption: optionMemo, status: "장바구니",
        }),
      });
      const data = await response.json();
      if (data.success) {
        const isConfirmed = await showConfirm("🛒 장바구니에 담겼습니다!\n페이지로 이동하시겠습니까?");
        if (isConfirmed) router.push('/mypage/status?tab=장바구니');
      }
    } catch (error) { showAlert("서버 통신 오류"); }
  };

  // 🌟 [추가] 깜빡임 방지 및 디자인 복구된 AI 요약 로직
  const renderedAiSummary = useMemo(() => {
    const displayedName = getDisplayedName(product.name);
    const productFeatures = extractProductFeatures(product.description);

    return (
      <div style={styles.aiBox}>
        <div style={styles.aiHeaderRow}>
          <div className="notranslate" translate="no" style={styles.aiHeaderLeft}>
            <span style={styles.aiIconChip}>
              <svg width={isMobile ? "16" : "18"} height={isMobile ? "16" : "18"} viewBox="0 0 24 24" fill="white">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z" />
              </svg>
            </span>
            <span style={styles.aiHeaderTitle}>미쿠짱 AI 간단 요약</span>
          </div>
          <span style={styles.aiBadge}>AI</span>
        </div>

        <div style={{ fontSize: isMobile ? '15px' : '17px', color: '#475569', lineHeight: '1.85' }}>
          {/* 🌟 rakuten과 동일한 한 문장 요약 형식을 모든 플랫폼(메루카리/야후쇼핑/아마존 등)에 통일 적용합니다. */}
          <span style={{ fontWeight: '800', color: '#111827' }}>
            {product.shopName || PLATFORM_FALLBACK_NAME[product.platform] || product.platform}
          </span>에서{' '}
          <span className="notranslate" translate="no" style={{ fontWeight: '800', color: theme.main }}>
            ¥{(product.price * quantity).toLocaleString()}
          </span>{' '}에 판매되는{' '}
          <span style={{
            fontWeight: '800',
            color: theme.main,
            textDecoration: 'underline',
            textUnderlineOffset: '4px',
            textDecorationColor: `${theme.main}44`
          }}>{displayedName}</span>{' '}입니다.

          {/* 🌟 상품 상세 설명에서 뽑아낸 이 상품만의 특징들 (접었다 펼 수 있음, 기본값은 접힘) */}
          {productFeatures.length > 0 && (
            <div style={styles.aiFeatureBlock}>
              <button
                type="button"
                onClick={() => setIsFeatureOpen(prev => !prev)}
                style={styles.aiFeatureToggle}
                aria-expanded={isFeatureOpen}
              >
                <span style={styles.aiFeatureLabel}>이 상품의 특징</span>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke={theme.main} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: isFeatureOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', flexShrink: 0 }}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {isFeatureOpen && (
                <ul style={styles.aiFeatureList}>
                  {productFeatures.map((feature, idx) => (
                    <li key={idx} style={styles.aiFeatureText}>
                      <span style={styles.aiFeatureBullet}>•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }, [product, quantity, isMobile, theme, styles, isFeatureOpen]);

  return (
    <GlobalProductDetailBase 
      product={product} 
      currentPrice={product.price} 
      quantity={quantity} 
      onAction={handleAddToCart} 
      actionText="구매대행 신청하기" 
      onClose={onClose}
    >
      {({ styles, isMobile, theme }) => (
        <>
          <div style={styles.priceContainer}>
            <span style={styles.priceLabel}>판매 가격</span>
            <span className="notranslate" style={styles.priceTag}>¥{(product.price * quantity).toLocaleString()}</span>
            <span className="notranslate" style={styles.priceKrw}>약 {(Math.round(product.price * quantity * exchangeRate / 100) * 100).toLocaleString()}원</span>
          </div>

          {product.platform === 'mercari' ? (
            <div style={styles.mercariAttrContainer}>
              <div style={styles.attrRow}><span style={styles.attrLabel}>사이즈</span><span style={styles.attrValue}>{product.size || 'FREE'}</span></div>
              <div style={{ ...styles.attrRow, borderBottom: 'none' }}><span style={styles.attrLabel}>배송비 부담</span><span style={styles.attrValue}>{product.shippingPayer}</span></div>
            </div>
          ) : (
            <div style={styles.rakutenTable}>
              <div style={styles.tableRow}>
                <div style={styles.tableLabel}>상점명</div>
                <div style={styles.tableValue}><b>{product.shopName || 'Rakuten Fashion'}</b>{product.shopUrl && <button style={styles.smallBtn} onClick={() => window.open(product.shopUrl, '_blank')}>상점보기</button>}</div>
              </div>
              <div style={styles.tableRow}>
                <div style={styles.tableLabel}>수량</div>
                <div style={styles.tableValue}><input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} style={styles.numberInput} /></div>
              </div>
              <div style={{ ...styles.tableRow, borderBottom: 'none' }}>
                <div style={styles.tableLabel}>옵션 메모</div>
                <div style={styles.tableValue}><textarea placeholder="옵션 정보 입력..." value={optionMemo} onChange={(e) => setOptionMemo(e.target.value)} style={styles.memoArea} /></div>
              </div>
            </div>
          )}
          {renderedAiSummary}
        </>
      )}
    </GlobalProductDetailBase>
  );
}