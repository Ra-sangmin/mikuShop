"use client";

import GlobalProductDetailShop from "./GlobalProductDetailShop";
import GlobalProductDetailAuction from "./GlobalProductDetailAuction";

export interface GlobalProduct {
  id: string;
  platform: 'mercari' | 'rakuten' | 'amazon' | 'yahoo_auction';
  name: string;
  price: number;
  description: string;
  images: string[];
  thumbnail: string;
  condition?: string;
  size?: string;
  categories: string[];
  shippingPayer?: string;
  url: string;
  status: 'on_sale' | 'sold_out';
  shopName?: string;
  shopUrl?: string;
  bidCount?: number;
  timeLeft?: string;
  endSchedule?: string;
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