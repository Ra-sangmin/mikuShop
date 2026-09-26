'use client';

// 🔎 AI 검색 결과를 눌렀을 때 뜨는 상세 정보 패널
//
// 몰 페이지와 같은 GlobalProductDetail(라쿠텐·야후 쇼핑·메루카리 = 쇼핑형, 야후 옥션 = 경매형)을
// 화면 위에 띄웁니다. 상세 정보를 얻는 방법도 몰 페이지와 같습니다.
//   - 라쿠텐·야후 쇼핑 : 검색 결과에 사진·설명이 들어 있어 바로 표시 (+ 인기 상품 집계용 trackView)
//   - 메루카리·야후 옥션 : /api/{mall}/productDetail 로 상세를 긁어 와 표시 (실패하면 기본 정보로 표시)

import { useEffect, useState } from 'react';
import GlobalProductDetail, { type GlobalProduct } from '@/app/main_shop/components/GlobalProductDetail';
import { toGlobalProduct } from './AiResultGrid';
import type { AiProduct } from '@/lib/ai-search/types';

/** 한 번 긁어 온 메루카리·옥션 상세는 이 화면에 있는 동안 다시 부르지 않습니다. */
const detailCache = new Map<string, GlobalProduct>();

async function loadDetail(p: AiProduct, signal: AbortSignal): Promise<GlobalProduct> {
  const base = toGlobalProduct(p);

  if (p.mall === 'rakuten' || p.mall === 'yahoo_shopping') {
    // 몰 페이지와 같은 "실시간 인기 상품" 집계 (실패해도 상세는 그대로)
    fetch(`/api/${p.mall}/trackView`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: p.itemId, name: p.nameJa, price: p.priceJpy, thumbnail: p.thumbnail, url: p.url, shopName: p.shopName }),
    }).catch(() => {});
    return base;
  }

  const key = `${p.mall}:${p.itemId}`;
  const cached = detailCache.get(key);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/${p.mall}/productDetail?itemId=${encodeURIComponent(p.itemId)}`, { signal });
    const result = await res.json();
    if (!result?.success) throw new Error(result?.error || 'detail failed');
    const detail: GlobalProduct = { ...base, ...result.data, platform: p.mall };
    detailCache.set(key, detail);
    return detail;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    // 몰 페이지(야후 옥션)와 같이, 못 가져오면 목록에 있던 정보로라도 보여 줍니다.
    return { ...base, description: '상세 정보를 불러오지 못했습니다. 원문 페이지에서 확인해 주세요.' };
  }
}

export default function AiProductDetailModal({ product, onClose }: { product: AiProduct | null; onClose: () => void }) {
  // 어떤 상품의 상세인지 같이 기억해 두고, 지금 열린 상품과 같을 때만 씁니다.
  // (상품이 바뀌면 이전 상세는 자동으로 무시되어 "불러오는 중" 이 됩니다 — effect 안에서 상태를 비울 필요 없음)
  const [loaded, setLoaded] = useState<{ product: AiProduct; detail: GlobalProduct } | null>(null);
  const detail = product && loaded?.product === product ? loaded.detail : null;
  const loading = Boolean(product) && !detail;

  useEffect(() => {
    if (!product) return;
    const controller = new AbortController();
    loadDetail(product, controller.signal)
      .then(d => setLoaded({ product, detail: d }))
      .catch(() => {});
    return () => controller.abort();
  }, [product]);

  // 열려 있는 동안 뒤 페이지 스크롤 잠금 + Esc 로 닫기
  useEffect(() => {
    if (!product) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [product, onClose]);

  if (!product) return null;

  // ⚠️ body 로 portal 하지 않고 페이지 안에 그립니다. body 에 바로 붙인 요소는 구글 웹 번역이
  //    번역하지 않아(일본어 상품명·설명이 그대로 남음) 몰 페이지와 같이 페이지 안쪽에 둡니다.
  //    .ais-page 에는 transform 이 없어 position: fixed 가 화면 기준으로 잡힙니다.
  return (
    <div className="ais-root ais-detail-overlay" onClick={onClose}>
      <div className="ais-detail-panel" role="dialog" aria-label="상품 상세 정보" onClick={e => e.stopPropagation()}>
        {loading || !detail ? (
          <div className="ais-detail-loading notranslate" translate="no">
            <span className="ais-typing" aria-hidden><i /><i /><i /></span>
            <p>상세 정보를 불러오는 중이에요…</p>
            <button type="button" className="ais-link-btn" onClick={onClose}>닫기</button>
          </div>
        ) : (
          // key: 다른 상품을 열 때 이전 상품의 요약·옵션 상태가 남지 않도록 새로 마운트합니다 (몰 페이지와 동일)
          <GlobalProductDetail key={`${detail.platform}:${detail.id}`} product={detail} onClose={onClose} />
        )}
      </div>
    </div>
  );
}
