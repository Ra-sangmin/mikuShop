"use client";

import GlobalProductDetailShop from "./GlobalProductDetailShop";
import GlobalProductDetailAuction from "./GlobalProductDetailAuction";
import { getDetailStyles, DetailTheme } from "./GlobalProductDetail.styles";

export interface GlobalProduct {
  id: string;
  platform: 'mercari' | 'rakuten' | 'amazon' | 'yahoo_auction';
  name: string;
  price: number;
  thumbnail: string;
  url: string;
  status: 'on_sale' | 'sold_out';

  images: string[];
  description: string;
  
  // 🌟 [추가] AI 간단 요약 (선택적 속성)
  aiSummary?: string;
  
  condition?: string;
  size?: string;
  categories: string[];
  
  // 🚚 배송 및 브랜드 정보 (통합)
  brand?: string;            // 브랜드명
  brandUrl?: string;
  shippingPayer?: string;    // 배송료 부담자 (출품자/낙찰자)
  shippingFeeInfo?: string;  // 현지 배송료 상세 정보 (예: 도쿄 1,440엔)

  shopName?: string;
  shopUrl?: string;
  bidCount?: number;
  timeLeft?: string;

  // 🚀 [야후 옥션] 상세 정보 속성
  earlyFinish?: boolean;      // 조기종료 여부
  autoExtension?: boolean;    // 자동연장 여부
  returnPolicy?: string;      // 반품 가능 여부
  bidRestriction?: string;    // 입찰 제한
  location?: string;          // 출품 지역
  startPrice?: number;        // 경매 시작가
  quantity?: number;          // 수량
  endSchedule?: string;       // 종료 예정 시간

  // 👤 [판매자] 정보 및 링크
  seller?: string;            // 출품자 ID/닉네임
  sellerUrl?: string;         // 출품자 페이지 링크
  sellerRating?: number;      // 출품자 평가 점수
  sellerRatingUrl?: string;   // 출품자 평가 페이지 링크
}

interface GlobalProductDetailProps {
  product: GlobalProduct;
  onClose?: () => void;
}

export default function GlobalProductDetail({ product, onClose }: GlobalProductDetailProps) {
  // 플랫폼이 야후 옥션이면 경매 전용 컴포넌트를, 그 외에는 일반 쇼핑 컴포넌트를 반환합니다.
  if (product.platform === 'yahoo_auction') {
    return <GlobalProductDetailAuction product={product} onClose={onClose} />;
  }
  
  return <GlobalProductDetailShop product={product} onClose={onClose} />;
}