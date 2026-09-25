'use client';

// 🛍️ AI 검색 결과 카드 목록 (통합 페이지·몰별 검색창 공용)

import { MALL_LABEL, type AiProduct } from '@/lib/ai-search/types';

const MALL_COLOR: Record<AiProduct['mall'], string> = {
  rakuten: '#bf0000',
  mercari: '#ff333f',
  yahoo_shopping: '#ff0033',
  yahoo_auction: '#f08200',
};

export default function AiProductGrid({ items, showMall = true }: { items: AiProduct[]; showMall?: boolean }) {
  if (items.length === 0) return null;
  return (
    <ul className="ais-grid">
      {items.map(p => (
        <li key={`${p.mall}:${p.itemId}`} className="ais-card">
          <a href={p.url} target="_blank" rel="noopener noreferrer" title={p.nameJa}>
            <div className="ais-thumb">
              <span className="ais-thumb-empty">이미지 준비 중</span>
              {p.thumbnail && (
                // 🐛 이미지가 깨지면 alt(긴 상품명)가 카드 위로 넘쳐 보였습니다.
                //    alt 는 비우고(이름은 아래에 이미 표시), 실패하면 이미지를 숨겨 뒤의 "이미지 준비 중" 이 보이게 합니다.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.thumbnail}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                />
              )}
              {showMall && (
                <span className="ais-mall-badge" style={{ background: MALL_COLOR[p.mall] }}>
                  {MALL_LABEL[p.mall]}
                </span>
              )}
              {p.aiPick && <span className="ais-match-badge">AI 추천</span>}
            </div>
            <div className="ais-card-body">
              <p className="ais-name">{p.nameKo || p.nameJa}</p>
              <p className="ais-price">¥{p.priceJpy.toLocaleString()}</p>
              {p.shopName && <p className="ais-shop">{p.shopName}</p>}
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
