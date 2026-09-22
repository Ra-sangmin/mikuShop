"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMikuAlert } from '@/app/context/MikuAlertContext';
import { useExchangeRate } from '@/app/context/ExchangeRateContext';
import GlobalProductDetailBase from "./GlobalProductDetailBase";
import { GlobalProduct } from "./GlobalProductDetail";
import { getDetailStyles, getDetailTheme } from "./GlobalProductDetail.styles";
import { getDisplayedName, extractProductFeatures } from "./aiSummaryUtils";
import { normalizeItemUrl } from "@/lib/itemUrl";
// 판매처 옵션 · 다른 구성(vr-*) 스타일. 페이지마다 따로 불러오다 보니 야후 쇼핑에서 빠져 있었습니다.
import '@/app/main_shop/platform-pages-common.css';

interface Props {
  product: GlobalProduct;
  onClose?: () => void;
}

/**
 * /api/item-variants 응답
 *
 * 옵션 문구는 일본어(ja)와 한국어(ko)를 함께 받습니다.
 * 화면에는 한국어를 보여 주고, 주문에는 일본어를 저장합니다 —
 * 직원이 판매처에서 실제로 주문할 때 보는 선택지가 일본어라 대조할 수 있어야 합니다.
 */
type Localized = { ja: string; ko: string };

/** 같은 상품처럼 보이지만 실제로는 별개인 상품. (야후의 "기타 변형" — 가격이 다릅니다) */
type RelatedItem = {
  name: Localized;
  fullName: string;
  url: string;
  price: number | null;
  imageUrl: string | null;
  soldOut: boolean;
};

type VariantSet = {
  hasVariants: boolean;
  axes: Localized[];
  axisValues: Localized[][];
  variants: { variantId: string; options: Localized[]; price: number; soldOut?: boolean }[];
  minPrice: number;
  maxPrice: number;
};

/** 옵션을 읽어올 수 있는 판매처. 나머지는 요청 자체를 보내지 않습니다. */
const VARIANT_PLATFORMS = ['rakuten', 'yahoo_shopping'];

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

  // 🔗 "기타 변형" — 같은 상품처럼 보이지만 실제로는 **별개 상품**입니다. (야후)
  //    예: 탑스만 7,700엔 / 바지만 7,700엔 / 상하 세트 15,400엔.
  //    옵션(SKU)과 섞으면 손님이 고른 가격과 실제 가격이 달라지므로 따로 보여 줍니다.
  const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);
  // 손님이 다른 구성을 고르면 상세 화면 전체가 그 상품으로 바뀝니다. (제목·사진·가격·주문 링크)
  const [switched, setSwitched] = useState<RelatedItem | null>(null);

  /** 지금 보고 있는 상품. 다른 구성을 고르기 전에는 원래 상품 그대로입니다. */
  const activeProduct = useMemo(() => (switched ? {
    ...product,
    // id 가 바뀌어야 상세 컴포넌트가 큰 사진을 새 상품 것으로 되돌립니다.
    id: switched.url,
    name: switched.fullName,
    url: switched.url,
    price: switched.price ?? product.price,
    thumbnail: switched.imageUrl ?? product.thumbnail,
    images: switched.imageUrl ? [switched.imageUrl] : product.images,
  } : product), [product, switched]);

  // 🛒 판매처 옵션별 가격 (라쿠텐 · 야후쇼핑)
  //    상세가 열린 뒤 따로 받아옵니다. 상품 페이지를 읽어야 해서 느린데, 같이 기다리면
  //    상세 전체가 늦게 뜹니다. 그동안 가격은 검색 API 가 준 값(최저가)을 보여 줍니다.
  //    옵션을 읽을 수 없는 판매처면 빈 문자열이라 요청 자체를 보내지 않습니다.
  const variantUrl = VARIANT_PLATFORMS.includes(product.platform) ? activeProduct.url : '';

  // 응답에 어느 주소의 결과인지 함께 담습니다.
  // 다른 구성으로 바꾸면 주소가 달라지므로, 그것만으로 "아직 안 온 상태"를 알 수 있어
  // 로딩 여부를 따로 state 로 들고 다니지 않아도 됩니다.
  const [loaded, setLoaded] = useState<{ url: string; set: VariantSet | null } | null>(null);

  useEffect(() => {
    if (!variantUrl) return;

    let alive = true;
    const settle = (set: VariantSet | null) => { if (alive) setLoaded({ url: variantUrl, set }); };

    fetch(`/api/item-variants?platform=${product.platform}&url=${encodeURIComponent(variantUrl)}`)
      .then(res => res.json())
      .then((data) => {
        if (!alive) return;
        // 다른 구성 목록은 새로 받은 쪽이 있을 때만 갈아 끼웁니다.
        // 바꿔 고른 상품에서 읽기에 실패해도 목록이 사라지지 않아, 되돌아올 길이 남습니다.
        if (data?.relatedItems?.length) setRelatedItems(data.relatedItems);
        settle(data?.hasVariants ? data : null);
      })
      .catch(() => settle(null));

    return () => { alive = false; };
  }, [product.platform, variantUrl]);

  // 지금 보고 있는 주소의 결과만 씁니다. (바꿔 고른 직후에는 이전 상품의 옵션이 남지 않습니다)
  const current = loaded?.url === variantUrl ? loaded : null;
  const variantSet = current?.set ?? null;
  const variantState: 'loading' | 'none' | 'ready' =
    !variantUrl ? 'none' : !current ? 'loading' : variantSet ? 'ready' : 'none';

  // 고른 옵션도 주소별로 기억합니다. 다른 구성으로 갔다가 돌아오면 고르던 것이 그대로 남습니다.
  const [pickedByUrl, setPickedByUrl] = useState<Record<string, string[]>>({});
  const picked = useMemo(() => pickedByUrl[variantUrl] ?? [], [pickedByUrl, variantUrl]);

  /** 축 하나의 값을 고르거나(같은 값을 다시 누르면) 해제합니다. */
  const pick = (axisIndex: number, valueJa: string) => {
    const axisCount = variantSet?.axes.length ?? 0;
    // 빈 칸을 남기지 않고 축 수만큼 채웁니다. 구멍이 있으면 every/some 이 그 칸을 건너뛰어
    // "다 골랐다"고 잘못 판단합니다.
    const next = Array.from({ length: axisCount }, (_, i) => picked[i] ?? '');
    next[axisIndex] = next[axisIndex] === valueJa ? '' : valueJa;
    setPickedByUrl(prev => ({ ...prev, [variantUrl]: next }));
  };

  /** 지금 보고 있는 상품인지. (목록을 갈아 끼우지 못했을 때도 표시가 맞도록 주소로 봅니다) */
  const isCurrentItem = (item: RelatedItem) =>
    normalizeItemUrl(item.url) === normalizeItemUrl(activeProduct.url);

  // 고른 조합에 해당하는 SKU. 아직 다 안 골랐으면 null 입니다.
  const selectedVariant = useMemo(() => {
    if (!variantSet || variantSet.axes.some((_, i) => !picked[i])) return null;
    return variantSet.variants.find(v => v.options.every((o, i) => o.ja === picked[i])) ?? null;
  }, [variantSet, picked]);

  // 🌟 화면에 쓰는 단가. 옵션을 다 고르면 그 가격으로 바뀝니다.
  const unitPrice = selectedVariant?.price ?? activeProduct.price;

  // 옵션이 있는데 아직 안 골랐으면 "¥2,700 ~ ¥3,300" 처럼 범위를 보여 줍니다.
  const priceRangeLabel = variantSet && !selectedVariant && variantSet.minPrice !== variantSet.maxPrice
    ? `¥${variantSet.minPrice.toLocaleString()} ~ ¥${variantSet.maxPrice.toLocaleString()}`
    : null;

  /** 그 옵션 값을 고를 수 있는지 (이미 고른 다른 축과 맞는, 품절이 아닌 SKU 가 있는지) */
  const isPickable = (axisIndex: number, valueJa: string) => {
    if (!variantSet) return false;
    return variantSet.variants.some(v =>
      !v.soldOut &&
      v.options[axisIndex]?.ja === valueJa &&
      v.options.every((o, i) => i === axisIndex || !picked[i] || o.ja === picked[i]));
  };

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

    // 🛒 옵션이 있는 상품은 다 고른 뒤에 담아야 합니다.
    //    안 고르면 어느 가격으로 사야 할지 관리자가 알 수 없습니다.
    if (variantSet && !selectedVariant) {
      showAlert(`${variantSet.axes.map(a => a.ko).join(' · ')}을(를) 모두 선택해 주세요.`);
      return;
    }
    // 품절인 조합은 담아도 구매할 수 없습니다.
    if (selectedVariant?.soldOut) {
      showAlert("선택하신 옵션은 품절입니다. 다른 옵션을 골라주세요. 🌸");
      return;
    }

    // 고른 옵션은 관리자가 실제로 구매할 때 그대로 보고 고릅니다.
    // variantId 도 함께 남겨, 같은 이름의 옵션이 여러 개여도 헷갈리지 않게 합니다.
    const optionText = selectedVariant
      ? [
          // ⚠️ 저장은 일본어 원문으로 합니다. 직원이 판매처에서 이 문구 그대로 찾습니다.
          variantSet!.axes.map((axis, i) => `${axis.ja}: ${selectedVariant.options[i]?.ja}`).join(' / '),
          `[${selectedVariant.variantId}]`,
          optionMemo.trim() ? `요청: ${optionMemo.trim()}` : '',
        ].filter(Boolean).join(' · ')
      : optionMemo;

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, platform: product.platform, productName: getKoreanProductName(),
          // ⚠️ productPrice 는 그 주문 줄의 합계(단가 × 수량)로 저장합니다.
          //    구매대행 신청 폼(PurchaseFormContainer)과 같은 규칙이어야 정산·마이페이지 금액이 맞습니다.
          productPrice: unitPrice * quantity, productCount: quantity,
          // 다른 구성을 골랐다면 그 상품의 사진·주소로 주문합니다. (원래 상품이 아닙니다)
          productImageUrl: activeProduct.thumbnail, productUrl: activeProduct.url,
          productOption: optionText, status: "장바구니",
        }),
      });
      const data = await response.json();
      if (data.success) {
        const isConfirmed = await showConfirm("🛒 장바구니에 담겼습니다!\n페이지로 이동하시겠습니까?");
        // 🛒 장바구니 카드(구매 요청 + 경매 요청)를 펼친 채로 열고, 방금 담은 상품을 선택해 줍니다.
        if (isConfirmed) {
          const newId = data.order?.orderId;
          router.push(`/mypage/status?phase=request${newId ? `&orderId=${encodeURIComponent(newId)}` : ''}`);
        }
      }
    } catch (error) { showAlert("서버 통신 오류"); }
  };

  // 🌟 [추가] 깜빡임 방지 및 디자인 복구된 AI 요약 로직
  const renderedAiSummary = useMemo(() => {
    const displayedName = getDisplayedName(activeProduct.name);
    const productFeatures = extractProductFeatures(activeProduct.description);

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
            {activeProduct.shopName || PLATFORM_FALLBACK_NAME[activeProduct.platform] || activeProduct.platform}
          </span>에서{' '}
          <span className="notranslate" translate="no" style={{ fontWeight: '800', color: theme.main }}>
            ¥{(unitPrice * quantity).toLocaleString()}
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
  }, [activeProduct, unitPrice, quantity, isMobile, theme, styles, isFeatureOpen]);

  return (
    <GlobalProductDetailBase 
      product={activeProduct} 
      currentPrice={unitPrice} 
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
              <span className="notranslate" translate="no" style={styles.priceTag}>
                {priceRangeLabel ?? `¥${(unitPrice * quantity).toLocaleString()}`}
              </span>
              <span className="notranslate" translate="no" style={styles.priceKrw}>약 {(Math.round(unitPrice * quantity * exchangeRate / 100) * 100).toLocaleString()}원{priceRangeLabel ? ' ~' : ''}</span>
            </div>
            {quantity > 1 && (
              <p className="notranslate" translate="no" style={styles.priceNote}>개당 ¥{unitPrice.toLocaleString()} × {quantity}개</p>
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
              {/* 🔗 기타 변형 — 같은 상품처럼 보이지만 **별개 상품**입니다. (야후)
                  옵션(아래 줄)과 나란히 두면 손님이 고른 가격과 실제 가격이 달라져, 줄을 나눠 둡니다.
                  고르면 상세 화면이 통째로 그 상품으로 바뀝니다. */}
              {relatedItems.length > 1 && (
                <div style={{ ...styles.tableRow, ...styles.tableRowTop }}>
                  <div style={{ ...styles.tableLabel, paddingTop: '11px' }}>다른 구성</div>
                  <div style={styles.tableValue}>
                    <div className="vr-stack">
                    <div className="vr-related">
                      {relatedItems.map(item => {
                        const on = isCurrentItem(item);
                        return (
                          <button
                            key={item.url}
                            type="button"
                            className={`vr-related-card ${on ? 'is-on' : ''}`}
                            disabled={item.soldOut && !on}
                            title={item.soldOut ? '품절된 구성입니다' : item.name.ja}
                            // 원래 상품으로 돌아갈 때는 상태를 비웁니다. 사진 여러 장 등 원본 정보가 그대로 살아납니다.
                            onClick={() => setSwitched(
                              normalizeItemUrl(item.url) === normalizeItemUrl(product.url) ? null : item)}
                          >
                            {item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" />}
                            <span className="vr-related-name">{item.name.ko}</span>
                            <span className="vr-related-price">
                              {item.soldOut ? '품절' : item.price ? `¥${item.price.toLocaleString()}` : '-'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="vr-hint">구성마다 가격이 다릅니다. 고르시면 아래 금액이 바뀝니다.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 🛒 판매처 옵션 — 로딩 중에는 자리를 잡아 두고, 옵션이 없으면 이 줄 자체가 사라집니다.
                  자리를 미리 비워두지 않으면 옵션이 늦게 도착할 때 화면이 아래로 밀립니다. */}
              {variantState === 'loading' && (
                <div style={{ ...styles.tableRow, ...styles.tableRowTop }}>
                  <div style={{ ...styles.tableLabel, paddingTop: '11px' }}>판매처 옵션</div>
                  <div style={styles.tableValue}>
                    <div className="vr-skeleton">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}

              {variantState === 'ready' && variantSet && (
                <div style={{ ...styles.tableRow, ...styles.tableRowTop }}>
                  <div style={{ ...styles.tableLabel, paddingTop: '11px' }}>판매처 옵션</div>
                  <div style={styles.tableValue}>
                    {/* 손님에게는 한국어(ko)를 보여 주고, 고른 값은 일본어 원문(ja)으로 기억합니다.
                        서로 다른 원문이 같은 한국어로 번역될 수 있어, 원문이 식별 기준입니다. */}
                    {/* 값 칸이 가로(flex-row)라서, 옵션 줄과 가격 안내가 옆으로 붙지 않도록 세로 묶음으로 감쌉니다. */}
                    <div className="vr-stack">
                    {variantSet.axes.map((axis, axisIndex) => (
                      <div key={axis.ja} className="vr-axis">
                        <span className="vr-axis-name">{axis.ko}</span>
                        <div className="vr-values">
                          {variantSet.axisValues[axisIndex]?.map(value => {
                            const on = picked[axisIndex] === value.ja;
                            const can = isPickable(axisIndex, value.ja);
                            return (
                              <button
                                key={value.ja}
                                type="button"
                                className={`vr-chip ${on ? 'is-on' : ''}`}
                                disabled={!can && !on}
                                title={can || on ? value.ja : '이 조합은 판매하지 않습니다'}
                                onClick={() => pick(axisIndex, value.ja)}
                              >
                                {value.ko}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <p className="vr-hint">
                      {selectedVariant
                        ? `선택한 옵션 가격 ¥${selectedVariant.price.toLocaleString()}`
                        : '옵션을 모두 고르면 정확한 가격이 표시됩니다.'}
                    </p>
                    </div>
                  </div>
                </div>
              )}

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
