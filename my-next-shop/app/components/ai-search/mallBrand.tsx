// 🏷️ 쇼핑몰 로고·브랜드 색 — AI 검색 결과·메인 배너 등에서 같이 씁니다.
import type { AiProduct } from '@/lib/ai-search/types';

/**
 * 몰 구분 표시. 라쿠텐·메루카리·야후 쇼핑이 모두 빨간색이라 색만으로는 구분이 안 돼서
 * 몰 페이지 헤더에 쓰는 실제 로고 + 몰 이름(몰별 글자색)을 흰 배지로 보여 줍니다.
 */
export const MALL_BRAND: Record<AiProduct['mall'], { logo: string; color: string }> = {
  rakuten: { logo: '/images/rakuten_logo.png', color: '#bf0000' },
  mercari: { logo: '/images/merukari_logo.png', color: '#e8313b' },
  yahoo_shopping: { logo: '/images/yahoo_shopping_logo.png', color: '#e8590c' },
  yahoo_auction: { logo: '/images/yahoo_auction_logo.png', color: '#c2410c' },
};

export function MallLogo({ mall, size = 18 }: { mall: AiProduct['mall']; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    // 라쿠텐 로고는 가로로 긴 글자형이라 정사각형에 넣으면 너무 작아져서 가로를 넓힙니다.
    <img className="ais-mall-logo" src={MALL_BRAND[mall].logo} alt="" width={mall === 'rakuten' ? Math.round(size * 1.85) : size} height={size} />
  );
}

