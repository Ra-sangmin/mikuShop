'use client';

// 🛍️ AI 검색 결과 목록 — 몰 페이지(main_shop/rakuten 등)의 카테고리 상품 목록과 같은 카드를 씁니다.
//    GlobalProductCard + .shop-list-grid 를 그대로 가져와, 관심상품·옥션 남은 시간 표시까지 똑같이 동작합니다.

import { useMemo, useState } from 'react';
import GlobalProductCard from '@/app/main_shop/components/GlobalProductCard';
import type { GlobalProduct } from '@/app/main_shop/components/GlobalProductDetail';
import { MALLS, MALL_LABEL, type AiProduct } from '@/lib/ai-search/types';
import '@/app/main_shop/components/global-shop-common.css';

/**
 * AiProduct → 몰 페이지가 쓰는 GlobalProduct 모양.
 *
 * 이름은 두 가지로 씁니다.
 *  - 카드(nameForCard): DeepL 로 번역해 둔 한국어 이름. 카드 영역은 구글 웹 번역을 끄므로 그대로 보입니다.
 *  - 상세 패널: 몰 페이지와 똑같이 일본어 원문 이름·설명을 넘기고 구글 웹 번역이 한국어로 바꿉니다.
 *    (상세 패널의 "AI 간단 요약"·장바구니 담기가 원문 기준으로 동작하도록 만들어져 있습니다)
 */
export function toGlobalProduct(p: AiProduct, nameForCard = false): GlobalProduct {
  const images = p.images?.length ? p.images : p.thumbnail ? [p.thumbnail] : [];
  return {
    id: p.itemId,
    platform: p.mall,
    name: nameForCard ? p.nameKo || p.nameJa : p.nameJa || p.nameKo,
    price: p.priceJpy,
    thumbnail: p.thumbnail,
    images,
    description: p.description || '상세 설명은 판매처 페이지에서 확인해 주세요.',
    url: p.url,
    shopUrl: p.url,
    status: p.status ?? 'on_sale',
    condition: '',
    size: '',
    categories: [],
    shopName: p.shopName ?? undefined,
    bidCount: p.bidCount,
    timeLeft: p.timeLeft,
  };
}

import { MALL_BRAND, MallLogo } from './mallBrand';
export { MALL_BRAND, MallLogo };

function PickStar({ size = 12 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M12 2 L14.6 9.4 L22 12 L14.6 14.6 L12 22 L9.4 14.6 L2 12 L9.4 9.4 Z" fill="currentColor" />
    </svg>
  );
}

export default function AiResultGrid({
  items,
  onSelect,
  showMall = true,
}: {
  items: AiProduct[];
  onSelect: (p: AiProduct) => void;
  /** 통합 검색이면 몰 필터 탭 + 카드 위 몰 로고 배지를 보여 줍니다 (몰 페이지 카드엔 없는 정보) */
  showMall?: boolean;
}) {
  // 몰 필터: 'all' 이면 전체. 답변(말풍선)마다 따로 기억합니다.
  const [filter, setFilter] = useState<'all' | 'pick' | AiProduct['mall']>('all');
  // 모바일(마우스 없음)에서는 배지를 눌러 이유를 열고 닫습니다
  const [openReason, setOpenReason] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = new Map<AiProduct['mall'], number>();
    for (const p of items) c.set(p.mall, (c.get(p.mall) ?? 0) + 1);
    return c;
  }, [items]);

  if (items.length === 0) return null;

  const pickCount = items.filter(p => p.aiPick).length;
  const visible =
    filter === 'all' ? items : filter === 'pick' ? items.filter(p => p.aiPick) : items.filter(p => p.mall === filter);
  // 결과가 있는 몰만, 늘 같은 순서로
  const mallsWithItems = MALLS.filter(m => counts.get(m));
  const showMallTabs = showMall && mallsWithItems.length > 1;

  return (
    <div>
      {(showMallTabs || pickCount > 0) && (
        <div className="ais-result-filter notranslate" translate="no" role="tablist" aria-label="쇼핑몰별로 보기">
          <button type="button" role="tab" aria-selected={filter === 'all'} className="ais-filter-tab" onClick={() => setFilter('all')}>
            전체 <b>{items.length}</b>
          </button>
          {pickCount > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'pick'}
              className="ais-filter-tab is-pick"
              onClick={() => setFilter('pick')}
            >
              <PickStar size={13} />
              AI 추천 <b>{pickCount}</b>
            </button>
          )}
          {showMallTabs && mallsWithItems.map(m => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={filter === m}
              className="ais-filter-tab"
              style={{ ['--mall-color' as string]: MALL_BRAND[m].color }}
              onClick={() => setFilter(m)}
            >
              <MallLogo mall={m} size={18} />
              {MALL_LABEL[m]} <b>{counts.get(m)}</b>
            </button>
          ))}
        </div>
      )}

      {/* 카드 이름은 DeepL 로 번역한 한국어를 넣습니다. 번역이 실패해 일본어로 남은 이름은
          구글 웹 번역이 한국어로 바꾸도록 카드 영역은 번역을 막지 않습니다 (몰 배지·AI 추천 배지는 notranslate). */}
      <div className="shop-list-grid ais-shop-grid">
        {visible.map(p => (
          <div key={`${p.mall}:${p.itemId}`} className="ais-card-wrap">
            <GlobalProductCard item={toGlobalProduct(p, true) as any} onClick={() => onSelect(p)} />
            {p.aiPick && (
              // 마우스를 올리거나(데스크톱) 누르면(모바일) 추천 이유가 뜹니다. 카드 클릭(상세 열기)과는 분리합니다.
              <span
                translate="no"
                className={`notranslate ais-card-pick${openReason === `${p.mall}:${p.itemId}` ? ' is-open' : ''}`}
                role="button"
                tabIndex={0}
                aria-label="AI 추천 이유 보기"
                onClick={e => {
                  e.stopPropagation();
                  const key = `${p.mall}:${p.itemId}`;
                  setOpenReason(prev => (prev === key ? null : key));
                }}
                onMouseLeave={() => setOpenReason(null)}
              >
                <PickStar size={12} />
                AI 추천
                {!!p.aiReasons?.length && (
                  <span className="ais-pick-tip" role="tooltip">
                    <span className="ais-pick-tip-title"><PickStar size={12} /> 이런 점이 맞아서 추천했어요</span>
                    <ul>
                      {p.aiReasons.map(r => <li key={r}>{r}</li>)}
                    </ul>
                  </span>
                )}
              </span>
            )}
            {showMall && (
              <span className="ais-card-mall notranslate" translate="no" style={{ color: MALL_BRAND[p.mall].color }}>
                <MallLogo mall={p.mall} size={16} />
                {MALL_LABEL[p.mall]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
