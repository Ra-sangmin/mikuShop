"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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

// 🌟 InfoRow (유지)
const InfoRow = ({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) => (
  <div style={{
    display: 'flex', 
    justifyContent: 'space-between', 
    padding: '12px 0', 
    borderBottom: '1px solid #f1f5f9', 
    fontSize: '19px', 
    alignItems: 'center'
  }}>
    <span className="notranslate" translate="no" style={{ color: '#94a3b8', fontWeight: 500 }}>
      • {label}
    </span>
    <span style={{ color: color || '#334155', fontWeight: 700 }}>{value}</span>
  </div>
);

export default function GlobalProductDetailAuction({ product, onClose }: Props) {
  const router = useRouter();
  const { showAlert, showConfirm } = useMikuAlert(); 
  const exchangeRate = FEE_POLICY.EXCHANGE_RATE || 9.5;
  
  const [livePrice, setLivePrice] = useState(product.price);
  const [liveBidCount, setLiveBidCount] = useState(product.bidCount || 0);
  const [liveTimeLeft, setLiveTimeLeft] = useState(product.timeLeft || '');
  const [localSeconds, setLocalSeconds] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // 사용자가 입력한 희망 입찰 금액
  const [bidAmount, setBidAmount] = useState<string>("");

  // 🌟 입력값이 변경될 때마다 10% 보증금 자동 계산
  const depositAmount = useMemo(() => {
    const numericBid = parseInt(bidAmount, 10);
    
    // 정상적인 숫자가 아니거나 0 이하일 경우 0원
    if (isNaN(numericBid) || numericBid <= 0) return 0;
    
    // 2만엔 이하 2000엔, 그 이상 10%
    return numericBid <= 20000 ? 2000 : Math.floor(numericBid * 0.1);
  }, [bidAmount]);

  const theme = useMemo(() => ({
    main: '#ef4444', 
    light: '#fef2f2'
  }), []);

  const styles = useMemo(() => getDetailStyles(isMobile, theme), [isMobile, theme]);
  
  useEffect(() => {
    if (!product.id) return;
    const fetchLiveStatus = async () => {
      try {
        const res = await fetch(`/api/yahoo_auction/productDetail?itemId=${product.id}`);
        if (!res.ok) return;
        const result = await res.json();
        if (result.success && result.data) {
          setLivePrice(result.data.price);
          setLiveBidCount(result.data.bidCount);
          setLiveTimeLeft(result.data.timeLeft);
        }
      } catch (error) { console.error("실시간 업데이트 실패:", error); }
    };
    const intervalId = setInterval(fetchLiveStatus, 10000);
    return () => clearInterval(intervalId);
  }, [product.id]);

  useEffect(() => {
    if (!liveTimeLeft) { setLocalSeconds(null); return; }
    if (liveTimeLeft.includes('日') || liveTimeLeft.includes('時間') || liveTimeLeft.includes('일') || liveTimeLeft.includes('시간')) {
      setLocalSeconds(null);
    } else {
      let mins = 0; let secs = 0;
      const minMatch = liveTimeLeft.match(/(\d+)\s*(?:分|분)/);
      const secMatch = liveTimeLeft.match(/(\d+)\s*(?:秒|초)/);
      if (minMatch) mins = parseInt(minMatch[1], 10);
      if (secMatch) secs = parseInt(secMatch[1], 10);
      if (mins > 0 || secs > 0) setLocalSeconds(mins * 60 + secs);
      else setLocalSeconds(null);
    }
  }, [liveTimeLeft]);

  useEffect(() => {
    if (localSeconds === null) return;
    const timer = setInterval(() => {
      setLocalSeconds(prev => (prev === null || prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [localSeconds !== null]);

  const displayTimeLeft = useMemo(() => {
    if (localSeconds !== null) {
      if (localSeconds === 0) return '경매 종료';
      const m = Math.floor(localSeconds / 60);
      const s = localSeconds % 60;
      return m > 0 ? `${m}분 ${s}초` : `${s}초`;
    }
    return liveTimeLeft ? liveTimeLeft.replace(/日|時間|分|秒/g, m => ({'日':'일','時間':'시간','分':'분','秒':'초'}[m] || m)).trim() : '경매 종료';
  }, [localSeconds, liveTimeLeft]);

  const handleBidRequest = async () => {
    const userId = localStorage.getItem('user_id');

    if (!userId) { 
      showAlert("로그인이 필요한 서비스입니다. 🌸", "warning"); 
      return; 
    }
    
    // 🌟 입력값 유효성 검사
    const numericBid = parseInt(bidAmount);
    if (!numericBid || numericBid < livePrice) {
      showAlert(`희망 입찰 금액은 현재가(¥${livePrice.toLocaleString()}) 이상이어야 합니다.`, "error");
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
          productImageUrl: product.thumbnail, 
          productUrl: product.url,
          auctionEndDate: product.endSchedule, 
          status: "BID_PENDING",
          myBidPrice: numericBid,
          depositAmount: depositAmount
        }),
      });
      const data = await response.json();
      if (data.success) {
        const isConfirmed = await showConfirm(`¥${numericBid.toLocaleString()} 경매 요청이 완료되었습니다.\n(보증금: ¥${depositAmount.toLocaleString()})\n경매 요청 페이지로 이동하시겠습니까?`);
        if (isConfirmed) router.push('/mypage/status?tab=BID_PENDING');
      } else {
        // 🚨 실패 시 로직 (명확한 errorCode로 구분)
        if (data.errorCode === 'INSUFFICIENT_FUNDS') {
          
          // 백엔드에서 넘어온 정확한 부족 금액(data.shortage)을 바로 사용합니다.
          const isConfirmed = await showConfirm(
            `미쿠짱 머니가 부족합니다.\n¥${data.shortage.toLocaleString()} 이(가) 더 필요합니다.\n\n미쿠짱 머니를 충전하시겠습니까?`
          );
          
          // 사용자가 '확인(Yes)'을 눌렀을 경우 새 창에서 충전 페이지 열기
          if (isConfirmed) {
            window.open('/mypage/money/charge', '_blank'); 
          }
          
        } else {
          // 잔액 부족 외의 다른 에러 발생 시 기존처럼 Alert 띄우기
          showAlert(data.error || "신청 중 오류가 발생했습니다.", "error");
        }

      }
    } catch (error) { 
      showAlert("서버 통신 오류", "error"); 
    }
  };

  const renderedAiSummary = useMemo(() => {
    const displayedName = product.name.length > 50 ? product.name.substring(0, 50) + "..." : product.name;
    return (
      <div style={styles.aiBox}>
        <div className="notranslate" translate="no" style={styles.aiHeader}>
          ✨ 미쿠짱 AI 간단 요약
        </div>
        <div style={{ fontSize: isMobile ? '15px' : '17px', color: '#4b5563', lineHeight: '1.8' }}>
            <div style={{ display: 'block', width: '100%', marginBottom: '4px' }}>
              해당 상품은 <span style={{ fontWeight: 'bold' }}>{product.condition || '중고'}</span> 
              <span className="notranslate" translate="no"> 상태의</span> 
            </div>
            <div style={{ display: 'block', width: '100%', marginBottom: '6px' }}>
              <span style={{ 
                color: '#111827', fontWeight: '800', fontSize: isMobile ? '17px' : '19px', 
                textDecoration: 'underline', textUnderlineOffset: '4px' 
              }}>
                {displayedName}
              </span>
              입니다.
            </div>
          <div style={{ display: 'block', marginTop: '10px' }}>
            <span translate="no" className="notranslate" style={{ color: theme.main, fontWeight: '900', fontSize: isMobile ? '18px' : '22px' }}>
              ¥{livePrice.toLocaleString()}
            </span>
            <span className="notranslate" translate="no" style={{ marginLeft: '4px', fontWeight: 'bold' }}>
              현재가로 입찰이 진행 중입니다.
            </span>
          </div>
          {product.aiSummary && (
            <div style={{ 
              marginTop: '12px', paddingTop: '10px', borderTop: `1px dashed ${theme.main}44`,
              fontSize: '14px', color: '#6b7280', lineHeight: '1.6'
            }}>
              {product.aiSummary}
            </div>
          )}
        </div>
      </div>
    );
  }, [product, livePrice, isMobile, theme, styles]);

  const renderMiddleContent = useCallback(() => {
    const sellerDisplay = (product.sellerUrl && product.seller && product.seller !== "-") ? (
      <a href={product.sellerUrl} target="_blank" rel="noopener noreferrer" className="notranslate" translate="no" style={{ color: '#3b82f6', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
        {product.seller}
      </a>
    ) : (<span className="notranslate" translate="no">{product.seller || "-"}</span>);

    const ratingDisplay = (product.sellerRatingUrl && product.sellerRating) ? (
      <a href={product.sellerRatingUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
        {Number(product.sellerRating).toLocaleString()}
      </a>
    ) : (product.sellerRating ? Number(product.sellerRating).toLocaleString() : "-");

    const brandDisplay = (product.brand && product.brand !== "Generic") ? (
      <a href={product.brandUrl || `https://auctions.yahoo.co.jp/search/search?p=${encodeURIComponent(product.brand)}`} target="_blank" rel="noopener noreferrer" className="notranslate" translate="no" style={{ color: '#3b82f6', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
        {product.brand}
      </a>
    ) : (<span className="notranslate" translate="no">{product.brand || "Generic"}</span>);

    const formattedEndSchedule = product.endSchedule 
      ? product.endSchedule.replace("종료 예정", "").replace("終了予定", "").trim() 
      : "-";

    const renderShippingFee = () => (
      <a href={product.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline', fontSize: '19px', fontWeight: 700 }}>
        [원문] 참조
      </a>
    );
    
    return (
      <div className="auction-detail-section" style={{ padding: '32px', backgroundColor: '#ffffff', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', paddingBottom: '16px', borderBottom: '2px solid #f1f5f9' }}>
          <h4 style={{ fontSize: '24px', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
            <span style={{ width: '6px', height: '24px', backgroundColor: '#3b82f6', borderRadius: '10px' }}></span>
            경매 상세 정보
          </h4>
          <span style={{ fontSize: '16px', color: '#64748b', fontWeight: 500 }}>
            경매 ID : <span className="notranslate" style={{ color: '#334155', fontWeight: 700, marginLeft: '8px' }}>{product.id}</span>
          </span>
        </div>

        <div className="auction-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: '15px', color: '#64748b', fontWeight: 800, marginBottom: '16px' }}>입찰 및 시간</p>
            <InfoRow label="입찰건수" value={`${liveBidCount} 건`} color="#ef4444" />
            <InfoRow label="종료일시" value={formattedEndSchedule} />
            <InfoRow label="자동연장" value={product.autoExtension ? "있음" : "없음"} color={product.autoExtension ? "#10b981" : "#64748b"} />
            <InfoRow label="조기종료" value={product.earlyFinish ? "있음" : "없음"} />
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: '15px', color: '#64748b', fontWeight: 800, marginBottom: '16px' }}>상품 설정</p>
            <InfoRow label="브랜드" value={brandDisplay} />
            <InfoRow label="상품상태" value={product.condition || "-"} />
            <InfoRow label="수량" value={`${product.quantity || 1} 개`} />
            <InfoRow label="시작가격" value={`${(product.startPrice || livePrice).toLocaleString()} 엔`} />
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: '15px', color: '#64748b', fontWeight: 800, marginBottom: '16px' }}>판매자 및 배송</p>
            <InfoRow label="출품자" value={sellerDisplay} />
            <InfoRow label="판매자평가" value={ratingDisplay} />
            <InfoRow label="배송부담" value={product.shippingPayer || "낙찰자 부담"} color={product.shippingPayer?.includes('출품자') ? '#10b981' : '#334155'} />
            <InfoRow label="현지배송료" value={renderShippingFee()} />
          </div>
        </div>
      </div>
    );
  }, [product, liveBidCount, livePrice]);

  return (
    <GlobalProductDetailBase 
      product={product} 
      currentPrice={livePrice} 
      quantity={1} 
      isAuction={true}
      onClose={onClose}
      middleContent={renderMiddleContent} 
    >
      {({ styles }) => (
        <>
          <style>{`
            @keyframes pulseAlert { 0% { opacity: 1; } 50% { opacity: 0.5; color: #ff0033; } 100% { opacity: 1; } }
            .time-pulse { animation: pulseAlert 1.5s infinite; color: #ef4444 !important; }
            
            .auction-detail-section { margin-top: 20px; margin-bottom: 24px; }
            .auction-detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }

            .custom-bid-button {
              width: 100%; padding: 16px; background-color: #ef4444; color: white;
              border: none; border-radius: 12px; font-size: 16px; font-weight: 800;
              cursor: pointer; margin-top: 12px; transition: all 0.2s ease;
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
            }
            .custom-bid-button:hover {
              background-color: #dc2626; transform: translateY(-2px);
              box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3);
            }

            @media (max-width: 1100px) {
              .auction-detail-grid { grid-template-columns: 1fr; gap: 15px; }
            }
          `}</style>
          
          <div style={styles.auctionDashboard}>
            <p style={styles.aucPriceLabel}>현재 입찰가</p>
            <p className="notranslate" style={styles.aucLivePrice}>¥{livePrice.toLocaleString()}</p>
            <p className="notranslate" style={styles.aucPriceKrw}>약 {Math.floor(livePrice * exchangeRate).toLocaleString()}원</p>
            
            <div style={styles.statsRow}>
              <div style={styles.statBox}>
                <p style={styles.statLabel}>입찰수</p>
                <p className="notranslate" style={styles.statValue}>{liveBidCount}건</p>
              </div>
              <div style={styles.statBox}>
                <p style={styles.statLabel}>남은 시간</p>
                <p className={`notranslate ${localSeconds !== null ? 'time-pulse' : ''}`} 
                   style={{ ...styles.statValue, color: localSeconds !== null ? '#ef4444' : 'white', textShadow: localSeconds !== null ? '0 1px 2px rgba(0,0,0,0.3)' : 'none' }}>
                  {displayTimeLeft}
                </p>
              </div>
            </div>
          </div>

          {renderedAiSummary}

          {/* 🌟 추가된 고급스러운 입찰 입력 폼 */}
          <div 
            className="notranslate"
            translate="no"
            style={{ 
            marginTop: '24px',
            background: 'linear-gradient(145deg, #f8faff 0%, #f0f4f8 100%)', 
            padding: '24px', 
            borderRadius: '16px', 
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02), inset 0 2px 0 rgba(255, 255, 255, 1)' 
          }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', marginBottom: '12px', color: '#475569' }}>
              희망 입찰 금액 (¥)
            </label>
            
            {/* 희망 입찰 금액 입력창 */}
            <input 
              type="number" 
              placeholder={`최소 ${livePrice.toLocaleString()}엔 이상 입력`}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)} // 🌟 타이핑할 때마다 상태 업데이트
              style={{ 
                width: '100%', 
                padding: '16px', 
                borderRadius: '12px', 
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '20px',
                fontWeight: '800',
                color: '#1e293b',
                boxSizing: 'border-box',
                marginBottom: '16px',
                outline: 'none',
                boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.02)',
                transition: 'border-color 0.2s ease'
              }}
            />

            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)', marginBottom: '16px' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', color: '#64748b', fontWeight: '700' }}>결제 필요 보증금 (10%)</span>
              {/* 🌟 계산된 10% 보증금 실시간 출력 */}
              <span style={{ fontWeight: '900', color: '#f43f5e', fontSize: '20px', letterSpacing: '-0.5px' }}>
                ¥ {depositAmount.toLocaleString()}
              </span>
            </div>
            
            <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', marginTop: '16px', lineHeight: '1.5' }}>
              * 보증금은 유찰 시 환불이 가능하며 <br />낙찰 후 구매 취소 시는 환불되지 않습니다.
            </p>
          </div>

          <button className="custom-bid-button" onClick={handleBidRequest}>
            YAHOO_AUCTION 입찰 대행 신청하기 🔨
          </button>
        </>
      )}
    </GlobalProductDetailBase>
  );
}