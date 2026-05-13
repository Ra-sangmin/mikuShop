"use client";

import { useState , useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMikuAlert } from '@/app/context/MikuAlertContext'; 
import { FEE_POLICY } from "@/src/constants/feePolicy"; 
import GlobalProductDetailBase from "./GlobalProductDetailBase";
import { GlobalProduct } from "./GlobalProductDetail";
import { getDetailStyles, DetailTheme } from "./GlobalProductDetail.styles";

interface Props {
  product: GlobalProduct;
  onClose?: () => void;
}

export default function GlobalProductDetailShop({ product, onClose }: Props) {
  const router = useRouter();
  const { showAlert, showConfirm } = useMikuAlert(); 
  const exchangeRate = FEE_POLICY.EXCHANGE_RATE || 9.5;
  
  const [quantity, setQuantity] = useState(1);
  const [optionMemo, setOptionMemo] = useState("");

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
    const displayedName = product.name.length > 50 ? product.name.substring(0, 50) + "..." : product.name;

    return (
      <div style={styles.aiBox}>
        <div className="notranslate" translate="no" style={styles.aiHeader}>
          ✨ 미쿠짱 AI 간단 요약
        </div>

        <div style={{ fontSize: isMobile ? '15px' : '17px', color: '#4b5563', lineHeight: '1.8' }}>
          {product.platform === 'rakuten' ? (
            /* --- 1. 라쿠텐 전용 요약 --- */
            <>
              해당 상품은 <span style={{ fontWeight: '800', color: '#111827' }}>{product.shopName || 'Rakuten'}</span> 상점에서 판매되는<br/>
              <span style={{ 
                fontWeight: '800', 
                color: theme.main, 
                textDecoration: 'underline', 
                textUnderlineOffset: '4px',
                textDecorationColor: `${theme.main}44` 
              }}>{displayedName}</span> 입니다.
            </>
          ) : (
            /* --- 2. 메루카리 및 타 플랫폼 요약 --- */
            <>
              <div style={{ display: 'block', width: '100%', marginBottom: '4px' }}>
                해당 상품은 <span style={{ fontWeight: 'bold' }}>{product.condition || '중고'}</span> 
                <span className="notranslate" translate="no"> 상태의</span>
              </div>
              <div style={{ display: 'block', width: '100%', marginBottom: '4px' }}>
                <span style={{ 
                  color: '#1f2937', 
                  fontWeight: '800', 
                  fontSize: isMobile ? '17px' : '19px', 
                  textDecoration: 'underline', 
                  textUnderlineOffset: '4px',
                  textDecorationColor: `${theme.main}44`
                }}>{displayedName}</span>입니다.
              </div>
              <div style={{ display: 'block', width: '100%' }}>
                <span style={{ fontWeight: 'bold' }}>{product.size || 'FREE'}</span>
                <span className="notranslate" translate="no" style={{ marginLeft: '4px' }}>사이즈이며,</span>
              </div>
            </>
          )}

          {/* 공통 가격 표시 부분 */}
          <div style={{ display: 'block', marginTop: '10px', borderTop: `1px dashed ${theme.main}33`, paddingTop: '8px' }}>
            <span translate="no" className="notranslate" style={{ color: theme.main, fontWeight: '900', fontSize: isMobile ? '18px' : '20px' }}>
              ¥{(product.price * quantity).toLocaleString()}
            </span>
            <span className="notranslate" translate="no" style={{ marginLeft: '4px', fontWeight: 'bold' }}>
              가격으로 등록되었습니다.
            </span>
          </div>
        </div>
      </div>
    );
  }, [product, quantity, isMobile, theme, styles]);

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
            <span className="notranslate" style={styles.priceTag}>¥{(product.price * quantity).toLocaleString()}</span>
            <span className="notranslate" style={styles.priceKrw}>약 {(product.price * quantity * exchangeRate).toLocaleString()}원</span>
          </div>

          {product.platform === 'mercari' ? (
            <div style={styles.mercariAttrContainer}>
              <div style={styles.attrRow}><span style={styles.attrLabel}>사이즈</span><span style={styles.attrValue}>{product.size || 'FREE'}</span></div>
              <div style={styles.attrRow}><span style={styles.attrLabel}>배송비 부담</span><span style={styles.attrValue}>{product.shippingPayer}</span></div>
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