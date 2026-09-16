import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createTtlCache } from '@/lib/crawler/ttlCache';

// 🌟 조회수(viewCount) 내림차순으로 야후 쇼핑 인기 상품을 반환합니다.
// 랜딩 페이지(카테고리 그리드 아래)의 "실시간 인기 상품" 섹션에서 사용합니다.
//
// 🐛 서비스 초기에는 회원이 클릭한 상품이 몇 개 없어 이 섹션이 텅 비어 보였습니다.
//    → DB 에 쌓인 상품이 limit(기본 100)보다 적으면, 야후 쇼핑 API 에서 "리뷰 많은 순" 상품을
//      가져와 뒤에 채웁니다(isFiller: true). 회원 클릭 상품이 늘어날수록 자동으로 자리를 내줍니다.
//    채움 목록은 10분간 서버 메모리에 캐시해 홈 진입마다 API 를 부르지 않습니다.

const MAX_ITEMS = 100;
const FILLER_TTL_MS = 10 * 60 * 1000;
// 루트 카테고리 몇 개에서 각 몇 개씩 가져올지. 4×30=120 → 중복을 빼도 100개는 채웁니다.
// (한 카테고리에서 100개를 한 번에 받으면 같은 상점의 비슷한 상품이 줄줄이 나와 지루합니다)
const FILLER_SOURCE_GENRES = 4;
const FILLER_PER_GENRE = 30;
// 야후 API 호출 간격 (yahoo_shopping/items 라우트와 같은 0.5초. 두 라우트가 따로 세지만
// 이 라우트는 10분에 한 번만 호출하므로 겹칠 일이 거의 없습니다)
const CALL_INTERVAL_MS = 500;

type PopularRow = {
  platform: 'yahoo_shopping';
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
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// 야후 썸네일의 /i/g/ 같은 화질 폴더를 /i/n/(고해상도)으로 바꿉니다 (yahoo_shopping/page.tsx 와 동일)
const highRes = (url?: string) => (url ? url.replace(/\/i\/[a-z]\//, '/i/n/') : '');

function pickRotating<T>(list: T[], count: number, windowMs: number): T[] {
  if (list.length <= count) return list;
  const start = Math.floor(Date.now() / windowMs) % list.length;
  return Array.from({ length: count }, (_, i) => list[(start + i) % list.length]);
}

function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const longest = Math.max(0, ...lists.map(l => l.length));
  for (let i = 0; i < longest; i++) {
    for (const l of lists) if (l[i]) out.push(l[i]);
  }
  return out;
}

async function fetchGenreTop(appId: string, genreId: number): Promise<PopularRow[]> {
  const url = new URL('https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch');
  url.searchParams.set('appid', appId);
  url.searchParams.set('genre_category_id', String(genreId));
  url.searchParams.set('results', String(FILLER_PER_GENRE));
  url.searchParams.set('sort', '-review_count');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data?.Error) throw new Error(data.Error.Message || 'Yahoo API Error');

  return (data?.hits || [])
    .filter((h: any) => h?.name && (h?.code || h?.index !== undefined))
    .map((h: any): PopularRow => ({
      platform: 'yahoo_shopping',
      // 🌟 상품 고유 코드(code)를 id 로 씁니다. 페이지의 trackView 도 같은 값을 보내므로
      //    회원이 클릭한 상품과 여기서 채운 상품이 같은 id 로 맞물려 중복이 걸러집니다.
      itemId: String(h.code || h.index),
      name: String(h.name).slice(0, 500),
      price: Number(h.price) || 0,
      thumbnail: highRes(h.image?.medium || h.exImage?.url) || null,
      url: h.url || '',
      shopName: h.seller?.name || h.brand?.name || null,
      viewCount: 0,
      isFiller: true,
    }));
}

async function fetchFillerRows(): Promise<PopularRow[]> {
  const cached = fillerCache.get('yahoo_shopping');
  if (cached) return cached;

  const appId = process.env.YAHOO_CLIENT_ID;
  if (!appId) {
    console.error('[yahoo_shopping/popular] YAHOO_CLIENT_ID 가 없어 채움 상품을 건너뜁니다.');
    return [];
  }

  // 야후 쇼핑의 최상위 장르 id 는 0 이 아니라 1 입니다. 대분류(패션·식품…)는 parentId=1 로 저장돼
  // 있고, yahoo_shopping/categories 라우트도 genreId=0 요청을 1 로 바꿔 처리합니다.
  const YAHOO_ROOT_GENRE_ID = 1;
  const roots = await prisma.yahooShoppingCategory.findMany({
    where: { parentId: YAHOO_ROOT_GENRE_ID },
    orderBy: { genreId: 'asc' },
    select: { genreId: true },
  });
  if (roots.length === 0) return [];

  const genres = pickRotating(roots.map(r => r.genreId), FILLER_SOURCE_GENRES, FILLER_TTL_MS);

  const perGenre: PopularRow[][] = [];
  for (let i = 0; i < genres.length; i++) {
    if (i > 0) await delay(CALL_INTERVAL_MS);
    try {
      perGenre.push(await fetchGenreTop(appId, genres[i]));
    } catch (e) {
      // 한 카테고리가 실패해도 나머지로 채웁니다
      console.error(`[yahoo_shopping/popular] 채움 상품 조회 실패 (genreId=${genres[i]}):`, e);
    }
  }

  const seen = new Set<string>();
  const rows = interleave(perGenre).filter(r => !seen.has(r.itemId) && seen.add(r.itemId));
  if (rows.length > 0) fillerCache.set('yahoo_shopping', rows);
  return rows;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit')) || MAX_ITEMS, MAX_ITEMS);

    const clicked = await prisma.productPopularity.findMany({
      where: { platform: 'yahoo_shopping' },
      orderBy: { viewCount: 'desc' },
      take: limit,
    });
    const rows: PopularRow[] = clicked.map(r => ({
      platform: 'yahoo_shopping',
      itemId: r.itemId,
      name: r.name,
      price: r.price,
      thumbnail: r.thumbnail,
      url: r.url,
      shopName: r.shopName,
      viewCount: r.viewCount,
      isFiller: false,
    }));

    // 회원 클릭 상품만으로 limit 이 안 차면 야후 쇼핑 인기 상품으로 뒤를 채웁니다.
    if (rows.length < limit) {
      try {
        const clickedIds = new Set(rows.map(r => r.itemId));
        const fillers = (await fetchFillerRows()).filter(r => !clickedIds.has(r.itemId));
        rows.push(...fillers.slice(0, limit - rows.length));
      } catch (e) {
        // 채우기에 실패해도 클릭 상품은 그대로 보여줍니다
        console.error('[yahoo_shopping/popular] 채움 실패:', e);
      }
    }

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('popular items error:', error);
    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
  }
}
