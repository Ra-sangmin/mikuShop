"use client";

import { useState , useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMikuAlert } from '@/app/context/MikuAlertContext';
import { useExchangeRate } from '@/app/context/ExchangeRateContext';
import GlobalProductDetailBase from "./GlobalProductDetailBase";
import { GlobalProduct } from "./GlobalProductDetail";
import { getDetailStyles, getDetailTheme } from "./GlobalProductDetail.styles";
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
  // 🌟 목록 화면과 같은 부드러운 쇼핑몰 팔레트 (원색 #bf0000 등 대신)
  const theme = useMemo(() => getDetailTheme(product.platform), [product.platform]);

  const styles = useMemo(() => getDetailStyles(isMobile, theme), [isMobile, theme]);

  // 🐛 장바구니에 담기는 상품명이 일본어 원문(product.name)이었습니다. 상세 화면에서는 구글 웹 번역이
  //    제목을 한국어로 바꿔 보여주므로, "화면에 보이는 그 한국어 제목"을 읽어 저장합니다.
  //    (번역이 아직 안 됐거나 꺼져 있어 일본어 그대로면 원문을 그대로 씁니다)
  // 🌟 라쿠텐 판매자들은 검색 노출을 위해 상품명에 같은 단어를 여러 번 넣습니다
  //    (예: "山ねこ 720ml 山ねこ720 山ねこ720ml ねこ ねこ720 …"). 번역해도 그대로 반복되므로,
  //    장바구니에는 같은 단어의 두 번째 이후 등장을 지운 이름을 저장합니다. (첫 등장 순서는 유지)
  //    공백뿐 아니라 "소주/선물/선물" 처럼 슬래시·가운뎃점으로 이어진 반복도 지우되, 구분자는 그대로 둡니다.
  //    단, "가로 30cm × 세로 30cm" 처럼 숫자 토큰은 정당하게 두 번 나올 수 있어, 숫자로 시작하는 토큰은
  //    바로 앞 단어와 붙어 반복되거나(같은 구절의 반복) 직전 단어가 지워진 흐름 속에 있을 때만 지웁니다.
  const dedupeRepeatedWords = (name: string): string => {
    const seenWord = new Set<string>();
    const seenPair = new Set<string>();
    let out = '';
    let pendingSep = '';
    let prevKey = '';          // 직전 원문 단어
    let prevRemoved = false;   // 직전 원문 단어가 지워졌는지
    // 단어와 구분자를 번갈아 얻습니다. (구분자: 공백, / ／ | ｜ ・ ･)
    for (const part of name.split(/(\s+|[\/／|｜・･]+)/)) {
      if (!part) continue;
      if (/^(\s+|[\/／|｜・･]+)$/.test(part)) { pendingSep = part; continue; }

      const key = part.toLowerCase();
      const pair = `${prevKey} ${key}`;
      const isNumeric = /^\d/.test(key);
      const remove: boolean = seenWord.has(key) && (!isNumeric || prevRemoved || key === prevKey || seenPair.has(pair));

      seenWord.add(key);
      seenPair.add(pair);
      prevKey = key;
      prevRemoved = remove;
      if (remove) continue; // 반복 단어는 앞 구분자와 함께 버립니다

      out += (out ? pendingSep : '') + part;
      pendingSep = '';
    }
    return out.trim();
  };

  const getKoreanProductName = (): string => {
    const shown = (document.querySelector('[data-product-title]')?.textContent || '').replace(/\s+/g, ' ').trim();
    const hasKorean = /[가-힣]/.test(shown);
    const hasKana = /[぀-ゟ゠-ヿ]/.test(shown);
    return dedupeRepeatedWords(shown && hasKorean && !hasKana ? shown : product.name);
  };

  const handleAddToCart = async () => {
    const userId = localStorage.getItem('user_id');
    if (!userId) { showAlert("로그인이 필요한 서비스입니다. 🌸"); return; }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, platform: product.platform, productName: getKoreanProductName(),
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
            <span style={styles.priceLabel}>Price · 판매 가격</span>
            <div style={styles.priceRow}>
              <span className="notranslate" translate="no" style={styles.priceTag}>¥{(product.price * quantity).toLocaleString()}</span>
              <span className="notranslate" translate="no" style={styles.priceKrw}>약 {(Math.round(product.price * quantity * exchangeRate / 100) * 100).toLocaleString()}원</span>
            </div>
            {quantity > 1 && (
              <p className="notranslate" translate="no" style={styles.priceNote}>개당 ¥{product.price.toLocaleString()} × {quantity}개</p>
            )}
          </div>

          {product.platform === 'mercari' ? (
            <div style={styles.mercariAttrContainer}>
              <div style={styles.attrRow}><span style={styles.attrLabel}>사이즈</span><span style={styles.attrValue}>{product.size || 'FREE'}</span></div>
              <div style={{ ...styles.attrRow, borderBottom: 'none' }}><span style={styles.attrLabel}>배송비 부담</span><span style={styles.attrValue}>{product.shippingPayer}</span></div>
            </div>
          ) : (
            <div style={styles.rakutenTable}>
              <div style={styles.tableRow}>
                <div style={styles.tableLabel}>
                  <span style={styles.tableLabelIcon}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9 4.5 4h15L21 9" /><path d="M4 9v11h16V9" /><path d="M9 20v-6h6v6" /><path d="M3 9h18" />
                    </svg>
                  </span>
                  상점명
                </div>
                <div style={styles.tableValue}>
                  <span style={styles.shopNameText}>{product.shopName || PLATFORM_FALLBACK_NAME[product.platform] || 'Rakuten Fashion'}</span>
                  {product.shopUrl && (
                    <button type="button" className="gpd-shop-link" style={styles.smallBtn} onClick={() => window.open(product.shopUrl, '_blank', 'noopener,noreferrer')}>
                      상점보기
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7" /><path d="M8 7h9v9" /></svg>
                    </button>
                  )}
                </div>
              </div>
              <div style={styles.tableRow}>
                <div style={styles.tableLabel}>
                  <span style={styles.tableLabelIcon}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
                    </svg>
                  </span>
                  수량
                </div>
                <div style={styles.tableValue}>
                  <div className="gpd-stepper" style={styles.stepper}>
                    <button type="button" className="gpd-step-btn" aria-label="수량 줄이기" style={styles.stepBtn} disabled={quantity <= 1} onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M5 12h14" /></svg>
                    </button>
                    <input type="number" min={1} aria-label="수량" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} style={styles.numberInput} />
                    <button type="button" className="gpd-step-btn" aria-label="수량 늘리기" style={styles.stepBtn} onClick={() => setQuantity(q => q + 1)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                    </button>
                  </div>
                  <span style={styles.stepHint}>4개 이상은 대행 수수료가 개당 ¥100</span>
                </div>
              </div>
              <div style={{ ...styles.tableRow, ...styles.tableRowTop, borderBottom: 'none' }}>
                <div style={{ ...styles.tableLabel, paddingTop: '11px' }}>
                  <span style={styles.tableLabelIcon}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </span>
                  옵션 메모
                </div>
                <div style={styles.tableValue}><textarea placeholder="색상 · 사이즈 등 원하시는 옵션을 적어주세요" value={optionMemo} onChange={(e) => setOptionMemo(e.target.value)} style={styles.memoArea} /></div>
              </div>
            </div>
          )}
          {renderedAiSummary}
        </>
      )}
    </GlobalProductDetailBase>
  );
}
