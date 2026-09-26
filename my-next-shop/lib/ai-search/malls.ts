// 🛍️ 쇼핑몰 실시간 검색 — 4개 몰의 결과를 AiProduct 한 가지 모양으로 맞춥니다.
//
//  - 라쿠텐     : 기존 lib/rakuten.ts 의 rakutenBaseAPIOn (1초 1회 큐를 그대로 탑니다)
//  - 야후 쇼핑  : 공식 V3 itemSearch API 직접 호출
//  - 메루카리 / 야후 옥션 : 공식 API 가 없어 기존 크롤러 라우트(/api/.../search, NDJSON 스트림)를
//                           서버 내부에서 불러 첫 N건만 받고 끊습니다. 크롤러는 느리므로 시간 제한을 둡니다.
//
// 이 파일은 번역을 하지 않습니다(nameKo = nameJa). 번역은 pipeline 에서 한 번에 모아서 합니다.

import { rakutenBaseAPIOn } from '@/lib/rakuten';
import type { AiProduct, Mall } from './types';

// ── 외부 응답 모양 (쓰는 필드만) ──────────────────────────────
interface RakutenItem {
  itemCode?: string;
  itemName?: string;
  itemPrice?: number | string;
  mediumImageUrls?: (string | { imageUrl?: string })[];
  itemImageUrl?: string;
  itemCaption?: string;
  availability?: number;
  itemUrl?: string;
  shopName?: string;
}
interface YahooHit {
  code?: string;
  name?: string;
  price?: number | string;
  image?: { medium?: string };
  description?: string;
  url?: string;
  seller?: { name?: string };
  brand?: { name?: string };
}
/** 메루카리·야후 옥션 크롤러 NDJSON 의 상품 한 건 */
interface CrawlerItem {
  id?: string;
  name?: string;
  price?: number | string;
  thumbnail?: string | null;
  status?: string;
  url?: string;
  bidCount?: number | string;
  timeLeft?: string | null;
}

export interface MallQuery {
  keywordJa: string;
  minPriceJpy?: number | null;
  maxPriceJpy?: number | null;
  excludeJa?: string[];
  limit: number;
  /** 크롤러 라우트를 부를 때 쓰는 이 서버 주소 (예: http://127.0.0.1:3000) */
  internalBaseUrl: string;
  /** 손님이 페이지를 닫으면 켜지는 신호 → 진행 중인 크롤링을 멈춥니다 */
  signal?: AbortSignal;
}

const CRAWLER_TIMEOUT_MS = Number(process.env.AI_SEARCH_CRAWLER_TIMEOUT_MS) || 15_000;

function inPrice(price: number, q: MallQuery): boolean {
  if (q.minPriceJpy != null && price < q.minPriceJpy) return false;
  if (q.maxPriceJpy != null && price > q.maxPriceJpy) return false;
  return price > 0;
}

// ── 라쿠텐 ──────────────────────────────────────────────────
async function searchRakuten(q: MallQuery): Promise<AiProduct[]> {
  // 라쿠텐은 한 페이지에 30건입니다. 더 필요하면 다음 페이지까지 같이 받습니다(최대 2페이지).
  const pages = Math.min(2, Math.max(1, Math.ceil(q.limit / 30)));
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      rakutenBaseAPIOn(
        'ichibams/api/IchibaItem/Search/20260701',
        '0',
        String(i + 1),
        'standard',
        q.keywordJa,
        q.excludeJa?.length ? q.excludeJa.join(' ') : null,
        q.minPriceJpy ? String(q.minPriceJpy) : null,
        q.maxPriceJpy ? String(q.maxPriceJpy) : null,
      ).catch(e => {
        if (i === 0) throw e; // 첫 페이지 실패만 오류로 봅니다
        return null;
      }),
    ),
  );
  const raw: (RakutenItem & { Item?: RakutenItem })[] = results.flatMap(data => (Array.isArray(data?.Items) ? data.Items : []));
  return raw
    .map(e => e?.Item ?? e)
    .filter((i): i is RakutenItem & { itemCode: string } => Boolean(i?.itemCode))
    .slice(0, q.limit)
    .map(i => ({
      mall: 'rakuten' as const,
      itemId: String(i.itemCode),
      nameJa: String(i.itemName ?? ''),
      nameKo: String(i.itemName ?? ''),
      priceJpy: Number(i.itemPrice) || 0,
      // 라쿠텐 기본 썸네일은 128px 라 흐릿합니다. 몰 페이지(rakuten/page.tsx)와 같이 512px 로 키웁니다.
      thumbnail: rakutenImg(imgUrl(i.mediumImageUrls?.[0]) || i.itemImageUrl),
      images: (Array.isArray(i.mediumImageUrls) && i.mediumImageUrls.length
        ? i.mediumImageUrls.map(img => rakutenImg(imgUrl(img)))
        : [rakutenImg(i.itemImageUrl)]).filter(Boolean),
      description: String(i.itemCaption || '').slice(0, 3000),
      status: i.availability === 0 ? ('sold_out' as const) : ('on_sale' as const),
      url: String(i.itemUrl ?? ''),
      shopName: i.shopName ?? null,
      source: 'live' as const,
    }));
}

const imgUrl = (img?: string | { imageUrl?: string }) => (typeof img === 'string' ? img : img?.imageUrl ?? '');
const rakutenImg = (url?: string | null) => (url ? String(url).replace('_ex=128x128', '_ex=512x512') : '');

/** 야후 쇼핑 이미지의 화질 폴더(/i/c/, /i/g/)를 고해상도(/i/n/)로 (yahoo_shopping/page.tsx 와 같은 규칙) */
const yahooHighRes = (url?: string | null) => (url ? String(url).replace(/\/i\/[a-z]\//, '/i/n/') : '');

// ── 야후 쇼핑 ───────────────────────────────────────────────
async function searchYahooShopping(q: MallQuery): Promise<AiProduct[]> {
  const appId = process.env.YAHOO_CLIENT_ID;
  if (!appId) throw new Error('YAHOO_CLIENT_ID 없음');

  const url = new URL('https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch');
  const query = [q.keywordJa, ...(q.excludeJa ?? []).map(w => `-${w}`)].join(' ');
  url.searchParams.set('appid', appId);
  url.searchParams.set('query', query);
  url.searchParams.set('results', String(Math.min(q.limit, 50)));
  url.searchParams.set('sort', '-score');
  if (q.minPriceJpy) url.searchParams.set('price_from', String(q.minPriceJpy));
  if (q.maxPriceJpy) url.searchParams.set('price_to', String(q.maxPriceJpy));

  // 429 한 번은 1초 쉬고 다시 시도
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000), cache: 'no-store' });
    if (res.status === 429 && attempt === 0) { await new Promise(r => setTimeout(r, 1000)); continue; }
    if (!res.ok) throw new Error(`Yahoo Shopping ${res.status}`);
    const data = await res.json();
    const hits: YahooHit[] = data?.hits ?? [];
    return hits.filter(h => h?.code).map(h => ({
      mall: 'yahoo_shopping' as const,
      itemId: String(h.code),
      nameJa: String(h.name ?? ''),
      nameKo: String(h.name ?? ''),
      priceJpy: Number(h.price) || 0,
      thumbnail: yahooHighRes(h.image?.medium),
      images: [yahooHighRes(h.image?.medium)].filter(Boolean),
      description: String(h.description || '').slice(0, 3000),
      status: 'on_sale' as const,
      url: String(h.url ?? ''),
      shopName: h.seller?.name ?? h.brand?.name ?? null,
      source: 'live' as const,
    }));
  }
  return [];
}

// ── 메루카리 / 야후 옥션 (기존 크롤러 라우트 재사용) ───────────

/** NDJSON 스트림에서 {success, data:[...]} 줄을 읽어 limit 건이 모이면(또는 시간이 다 되면) 끊습니다. */
async function readCrawlerStream(url: string, limit: number, outer?: AbortSignal): Promise<CrawlerItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CRAWLER_TIMEOUT_MS);
  // 손님이 창을 닫으면 크롤러(Puppeteer)도 바로 멈추게 합니다 — 크롤러 라우트가 req.signal 을 봅니다.
  const onOuterAbort = () => controller.abort();
  if (outer?.aborted) controller.abort();
  else outer?.addEventListener('abort', onOuterAbort, { once: true });
  const items: CrawlerItem[] = [];
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok || !res.body) throw new Error(`crawler ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (items.length < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          if (msg?.success && Array.isArray(msg.data)) items.push(...msg.data);
          if (msg?.done) return items.slice(0, limit);
        } catch { /* 공백 패딩 줄 등은 무시 */ }
      }
    }
    return items.slice(0, limit);
  } catch (e) {
    // 시간 초과여도 그때까지 모인 상품은 돌려줍니다.
    if ((e as Error).name === 'AbortError' && items.length) return items.slice(0, limit);
    throw e;
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener('abort', onOuterAbort);
    controller.abort(); // 다 받았으면 크롤러도 멈추게 합니다 (라우트가 req.signal 을 봅니다)
  }
}

async function searchMercari(q: MallQuery): Promise<AiProduct[]> {
  const p = new URLSearchParams({ keyword: q.keywordJa, status: 'on_sale' });
  if (q.minPriceJpy) p.set('price_min', String(q.minPriceJpy));
  if (q.maxPriceJpy) p.set('price_max', String(q.maxPriceJpy));
  if (q.excludeJa?.length) p.set('exclude_keyword', q.excludeJa.join(' '));
  const raw = await readCrawlerStream(`${q.internalBaseUrl}/api/mercari/search?${p}`, q.limit, q.signal);
  return raw.filter(i => i?.id && i.status !== 'sold_out').map(i => ({
    mall: 'mercari' as const,
    itemId: String(i.id),
    nameJa: String(i.name ?? ''),
    nameKo: String(i.name ?? ''),
    priceJpy: Number(i.price) || 0,
    thumbnail: mercariThumb(String(i.id), i.thumbnail),
    status: 'on_sale' as const,
    url: String(i.url ?? ''),
    shopName: null,
    source: 'live' as const,
  }));
}

/**
 * 🐛 메루카리 크롤러가 API 응답에서 먼저 받은 상품은 thumbnails 가 비어 있는 경우가 있어
 *    카드가 "이미지 준비 중" 으로 떴습니다. 상품 ID(m로 시작)로 메루카리 CDN 썸네일 주소를 만듭니다.
 */
export function mercariThumb(id: string, thumb?: string | null): string {
  if (thumb) return String(thumb);
  return /^m\d+$/.test(id) ? `https://static.mercdn.net/c!/w=240/thumb/photos/${id}_1.jpg` : '';
}

async function searchYahooAuction(q: MallQuery): Promise<AiProduct[]> {
  const p = new URLSearchParams({ keyword: q.keywordJa, category_id: '0' });
  const raw = await readCrawlerStream(`${q.internalBaseUrl}/api/yahoo_auction/search?${p}`, q.limit * 2, q.signal);
  // 옥션 크롤러는 가격 필터를 받지 않으므로 여기서 거릅니다.
  return raw
    .filter(i => i?.id)
    .map(i => ({
      mall: 'yahoo_auction' as const,
      itemId: String(i.id),
      nameJa: String(i.name ?? ''),
      nameKo: String(i.name ?? ''),
      priceJpy: Number(i.price) || 0,
      thumbnail: String(i.thumbnail ?? ''),
      status: 'on_sale' as const,
      bidCount: Number(i.bidCount) || 0,
      timeLeft: i.timeLeft ? String(i.timeLeft) : undefined,
      url: String(i.url ?? ''),
      shopName: null,
      source: 'live' as const,
    }))
    .filter(i => inPrice(i.priceJpy, q) && !(q.excludeJa ?? []).some(w => i.nameJa.includes(w)))
    .slice(0, q.limit);
}

const SEARCHERS: Record<Mall, (q: MallQuery) => Promise<AiProduct[]>> = {
  rakuten: searchRakuten,
  mercari: searchMercari,
  yahoo_shopping: searchYahooShopping,
  yahoo_auction: searchYahooAuction,
};

export interface MallResult { mall: Mall; items: AiProduct[]; error?: string }

/**
 * 여러 몰을 병렬로 검색합니다. 한 몰이 실패해도 나머지 결과는 살립니다 (Promise.allSettled).
 */
export async function searchMallsLive(malls: Mall[], q: MallQuery): Promise<MallResult[]> {
  const settled = await Promise.allSettled(malls.map(m => SEARCHERS[m](q)));
  return settled.map((r, i) => {
    if (r.status === 'fulfilled') return { mall: malls[i], items: r.value.filter(p => inPrice(p.priceJpy, q)) };
    console.error(`❌ [AI 검색] ${malls[i]} 실시간 조회 실패:`, (r.reason as Error)?.message ?? r.reason);
    return { mall: malls[i], items: [], error: '조회 실패' };
  });
}
