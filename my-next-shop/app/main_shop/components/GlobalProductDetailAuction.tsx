"use client";

import { useState, useEffect, useMemo } from "react";
import { useMikuAlert } from '@/app/context/MikuAlertContext'; 
import { FEE_POLICY } from "@/src/constants/feePolicy"; 
import GlobalProductDetailBase from "./GlobalProductDetailBase";
import { GlobalProduct } from "./GlobalProductDetail";

interface Props {
  product: GlobalProduct;
  onClose?: () => void;
}

export default function GlobalProductDetailAuction({ product, onClose }: Props) {
  const { showAlert } = useMikuAlert(); 
  const exchangeRate = FEE_POLICY.EXCHANGE_RATE || 9.5;
  
  const [livePrice, setLivePrice] = useState(product.price);
  const [liveBidCount, setLiveBidCount] = useState(product.bidCount || 0);
  const [liveTimeLeft, setLiveTimeLeft] = useState(product.timeLeft || '');

  // 🌟 1시간 미만 카운트다운을 위한 로컬 초침 상태
  const [localSeconds, setLocalSeconds] = useState<number | null>(null);

  // 1. 서버 실시간 폴링 (🌟 10초 주기로 변경됨)
  useEffect(() => {
    if (!product.id) return;
    const fetchLiveStatus = async () => {
      try {
        const res = await fetch(`/api/yahoo_auction/productDetail?itemId=${product.id}`);
        if (!res.ok) return;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const result = await res.json();
          if (result.success && result.data) {
            setLivePrice(result.data.price);
            setLiveBidCount(result.data.bidCount);
            setLiveTimeLeft(result.data.timeLeft);
          }
        }
      } catch (error) { console.error("실시간 업데이트 실패:", error); }
    };

    // 🚀 20000(20초) -> 10000(10초)로 변경!
    const intervalId = setInterval(fetchLiveStatus, 10000);
    return () => clearInterval(intervalId);
  }, [product.id]);

  // 2. 서버에서 받은 남은 시간(문자열)을 분석하여 로컬 초침 세팅
  useEffect(() => {
    if (!liveTimeLeft) {
      setLocalSeconds(null);
      return;
    }

    // "日(일)", "時間(시간)"이 포함되어 있다면 1시간 이상이므로 초침 작동안함
    if (liveTimeLeft.includes('日') || liveTimeLeft.includes('時間') || liveTimeLeft.includes('일') || liveTimeLeft.includes('시간')) {
      setLocalSeconds(null);
    } else {
      // 1시간 미만("分(분)", "秒(초)")일 경우 초(seconds)로 변환
      let mins = 0;
      let secs = 0;
      const minMatch = liveTimeLeft.match(/(\d+)\s*(?:分|분)/);
      const secMatch = liveTimeLeft.match(/(\d+)\s*(?:秒|초)/);
      
      if (minMatch) mins = parseInt(minMatch[1], 10);
      if (secMatch) secs = parseInt(secMatch[1], 10);

      if (mins > 0 || secs > 0) {
        setLocalSeconds(mins * 60 + secs); // 총 남은 초 계산
      } else {
        setLocalSeconds(null);
      }
    }
  }, [liveTimeLeft]);

  // 3. 로컬 1초 카운트다운 실행
  useEffect(() => {
    // 1시간 이상 남았거나 이미 종료되었으면 실행하지 않음
    if (localSeconds === null) return;

    const timer = setInterval(() => {
      setLocalSeconds(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1; // 1초씩 감소
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [localSeconds !== null]); // null 여부가 바뀔 때만 타이머 재등록

  // 4. 화면에 보여줄 텍스트 포맷팅
  const displayTimeLeft = useMemo(() => {
    // 1시간 미만이라 로컬 카운트다운이 동작 중인 경우
    if (localSeconds !== null) {
      if (localSeconds === 0) return '경매 종료';
      const m = Math.floor(localSeconds / 60);
      const s = localSeconds % 60;
      if (m > 0) return `${m}분 ${s}초`;
      return `${s}초`;
    }
    
    // 1시간 이상일 경우 원본 텍스트를 한국어로 번역하여 표시
    if (liveTimeLeft) {
      return liveTimeLeft
        .replace('日', '일 ')
        .replace('時間', '시간 ')
        .replace('分', '분 ')
        .replace('秒', '초')
        .trim();
    }

    return '경매 종료';
  }, [localSeconds, liveTimeLeft]);

  const handleBidRequest = () => {
    const userId = localStorage.getItem('id');
    if (!userId) { showAlert("로그인이 필요한 서비스입니다. 🌸"); return; }
    showAlert("입찰 신청 시스템을 준비 중입니다. 🔨");
  };

  return (
    <GlobalProductDetailBase 
      product={product} 
      currentPrice={livePrice} 
      quantity={1} 
      onAction={handleBidRequest} 
      actionText="입찰 대행 신청하기 🔨" 
      isAuction={true}
      onClose={onClose}
    >
      {({ styles }) => (
        <>
          <style>{`
            @keyframes pulseAlert { 0% { opacity: 1; } 50% { opacity: 0.5; color: #ff0033; } 100% { opacity: 1; } }
            /* 1시간 미만일 때만 맥박 애니메이션 적용 */
            .time-pulse { animation: pulseAlert 1.5s infinite; color: #ef4444 !important; }
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
                {/* 🌟 1시간 미만일 때만 time-pulse 클래스 부여 */}
                <p 
                  className={`notranslate ${localSeconds !== null ? 'time-pulse' : ''}`} 
                  style={{ ...styles.statValue, color: localSeconds !== null ? '#ef4444' : 'white' }}
                >
                  {displayTimeLeft}
                </p>
              </div>
            </div>
            {product.endSchedule && <div style={styles.endSchedule}>{product.endSchedule}</div>}
          </div>
        </>
      )}
    </GlobalProductDetailBase>
  );
}