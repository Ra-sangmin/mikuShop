import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { rakutenBaseAPIOn } from '@/lib/rakuten';
import { createTtlCache } from '@/lib/crawler/ttlCache';

// 🌟 조회수(viewCount) 내림차순으로 라쿠텐 인기 상품을 반환합니다.
// 랜딩 페이지(카테고리 그리드 아래)의 "실시간 인기 상품" 섹션에서 사용합니다.
//
// 🐛 서비스 초기에는 회원이 클릭한 상품이 몇 개 없어 이 섹션이 텅 비어 보였습니다.
//    → DB 에 쌓인 상품이 limit(기본 100)보다 적으면, 라쿠텐 API 에서 "리뷰 많은 순" 상품을
//      가져와 뒤에 채웁니다(isFiller: true). 회원 클릭 상품이 늘어날수록 자동으로 자리를 내줍니다.
//    라쿠텐 API 는 1초 1회 제한이라(lib/rakuten.ts 큐) 매 홈 진입마다 호출하지 않도록
//    채움 목록은 10분간 서버 메모리에 캐시합니다.

const MAX_ITEMS = 100;
const FILLER_TTL_MS = 10 * 60 * 1000;
// 루트 카테고리 몇 개에서 각 30개(라쿠텐 1페이지)씩 가져올지. 5×30=150 → 중복을 빼도 100개는 채웁니다.
const FILLER_SOURCE_GENRES = 5;

type PopularRow = {
  platform: 'rakuten';
  itemId: string;
  name: string;
  price: number;
  thumbnail: string | null;
  url: string;
  shopName: string | null;
  viewCount: number;
  isFiller: boolean;
};

const fillerCache = createTtlCache<PopularRow[]>(FILLER_TTL_MS, 2);

// 라쿠텐 썸네일은 128px 로 오므로, 상세 화면과 같은 512px 로 바꿉니다 (rakuten/page.tsx 의 resizeImage 와 동일)
const resizeImage = (url?: string) => (url ? url.replace('_ex=128x128', '_ex=512x512') : '');

// 목록에서 count 개를 "시간 창(TTL)마다 다른 구간"에서 고릅니다.
// 캐시가 살아 있는 동안은 같은 조합이고, 캐시가 만료되면 다음 구간으로 넘어가 상품이 순환됩니다.
function pickRotating<T>(list: T[], count: number, windowMs: number): T[] {
  if (list.length <= count) return list;
  const start = Math.floor(Date.now() / windowMs) % list.length;
  return Array.from({ length: count }, (_, i) => list[(start + i) % list.length]);
}

// 여러 카테고리 결과를 라운드로빈으로 섞어, 상위에 한 카테고리만 몰리지 않게 합니다.
function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const longest = Math.max(0, ...lists.map(l => l.length));
  for (let i = 0; i < longest; i++) {
    for (const l of lists) if (l[i]) out.push(l[i]);
  }
  return out;
}

async function fetchFillerRows(): Promise<PopularRow[]> {
  const cached = fillerCache.get('rakuten');
  if (cached) return cached;

  const roots = await prisma.rakutenCategory.findMany({
    where: { parentId: 0 },
    orderBy: { genreId: 'asc' },
    select: { genreId: true },
  });
  if (roots.length === 0) return [];

  const genres = pickRotating(roots.map(r => r.genreId), FILLER_SOURCE_GENRES, FILLER_TTL_MS);

  // 라쿠텐 호출은 lib/rakuten.ts 가 1초 간격으로 줄 세우므로 순차로 기다립니다 (5개 ≈ 5초, 이후 10분 캐시)
  const perGenre: PopularRow[][] = [];
  for (const genreId of genres) {
    try {
      const data = await rakutenBaseAPIOn('ichibams/api/IchibaItem/Search/20260701', String(genreId), '1', '-reviewCount');
      const items = (Array.isArray(data?.Items) ? data.Items : [])
        .map((entry: any) => entry?.Item ?? entry)
        .filter((item: any) => item?.itemCode && item?.itemName);
      perGenre.push(items.map((item: any): PopularRow => ({
        platform: 'rakuten',
        itemId: String(item.itemCode),
        name: String(item.itemName).slice(0, 500),
        price: Number(item.itemPrice) || 0,
        thumbnail: resizeImage(item.mediumImageUrls?.[0]?.imageUrl || item.mediumImageUrls?.[0] || item.itemImageUrl) || null,
        url: item.itemUrl || '',
        shopName: item.shopName || null,
        viewCount: 0,
        isFiller: true,
      })));
    } catch (e) {
      // 한 카테고리가 실패해도 나머지로 채웁니다
      console.error(`[rakuten/popular] 채움 상품 조회 실패 (genreId=${genreId}):`, e);
    }
  }

  const seen = new Set<string>();
  const rows = interleave(perGenre).filter(r => !seen.has(r.itemId) && seen.add(r.itemId));
  if (rows.length > 0) fillerCache.set('rakuten', rows);
  return rows;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit')) || MAX_ITEMS, MAX_ITEMS);

    const clicked = await prisma.productPopularity.findMany({
      where: { platform: 'rakuten' },
      orderBy: { viewCount: 'desc' },
      take: limit,
    });
    const rows: PopularRow[] = clicked.map(r => ({
      platform: 'rakuten',
      itemId: r.itemId,
      name: r.name,
      price: r.price,
      thumbnail: r.thumbnail,
      url: r.url,
      shopName: r.shopName,
      viewCount: r.viewCount,
      isFiller: false,
    }));

    // 회원 클릭 상품만으로 limit 이 안 차면 라쿠텐 인기 상품으로 뒤를 채웁니다.
    if (rows.length < limit) {
      try {
        const clickedIds = new Set(rows.map(r => r.itemId));
        const fillers = (await fetchFillerRows()).filter(r => !clickedIds.has(r.itemId));
        rows.push(...fillers.slice(0, limit - rows.length));
      } catch (e) {
        // 채우기에 실패해도 클릭 상품은 그대로 보여줍니다
        console.error('[rakuten/popular] 채움 실패:', e);
      }
    }

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('popular items error:', error);
    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
  }
}
