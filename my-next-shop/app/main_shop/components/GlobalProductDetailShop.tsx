"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMikuAlert } from '@/app/context/MikuAlertContext'; 
import { FEE_POLICY } from "@/src/constants/feePolicy"; 
import GlobalProductDetailBase from "./GlobalProductDetailBase";
import { GlobalProduct } from "./GlobalProductDetail";

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

  const handleAddToCart = async () => {
    const userId = localStorage.getItem('id');
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
        </>
      )}
    </GlobalProductDetailBase>
  );
}