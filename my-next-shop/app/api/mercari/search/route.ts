export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { createSearchStream, createCachedSearchStream } from '@/lib/crawler/searchStream';
import { createTtlCache } from '@/lib/crawler/ttlCache';

// 🚀 [설계도] 아이템 형식 정의
interface MercariItem {
  id: string;
  name: string;
  thumbnail: string;
  price: number;
  status: 'on_sale' | 'sold_out';
  url: string;
}

// 🚀 [속도 개선] 같은 검색 결과를 매번 처음부터 다시 스크래핑하지 않도록
// 짧은 TTL(60초)로 서버 메모리에 캐싱합니다.
const searchCache = createTtlCache<MercariItem[]>(60_000, 50);

export async function GET(req: NextRequest) {
  const { signal } = req;
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('category_id');
  const startTime = performance.now();

  if (categoryId === '0') {
    return new Response(createCachedSearchStream<MercariItem>([]), { headers: { 'Content-Type': 'application/x-ndjson' } });
  }

  const targetUrl = generateMercariTargetUrl(searchParams);

  const cached = searchCache.get(targetUrl);
  if (cached) {
    console.log(`\n⚡ [CACHE HIT] ${targetUrl} (${cached.length}개, 스크래핑 생략)`);
    return new Response(createCachedSearchStream(cached), {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Content-Encoding': 'none',
      },
    });
  }

  console.log(`\n🏎️ [TURBO MODE] 크롤링 시작: ${targetUrl}`);

  const stream = createSearchStream<MercariItem>({
    targetUrl,
    signal,
    startTime,
    cache: searchCache,
    domReadySelector: '[data-testid="item-cell"]',
    extractItems: (page, limit) => extractItems(page, limit),
    extractItemsAndCheckEnd: (page, limit) => extractItemsAndCheckEnd(page, limit),
    isValidItem: item => Boolean(item.id) && item.price > 0,
    getItemId: item => item.id,
    apiListener: {
      matchesUrl: url => url.includes('api/v1/search') || url.includes('search_index'),
      mapResponseItems: json => {
        const rawItems = json.items || [];
        return rawItems.map((item: any): MercariItem => ({
          id: item.id,
          name: item.name,
          thumbnail: item.thumbnails?.[0] || '',
          price: parseInt(item.price, 10),
          status: (item.status === 'on_sale' || item.status === 'trading') ? 'on_sale' : 'sold_out',
          url: `https://jp.mercari.com/item/${item.id}`
        }));
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Content-Encoding': 'none',
    },
  });
}

function generateMercariTargetUrl(searchParams: URLSearchParams): string {
  const params = new URLSearchParams();
  const categoryId = searchParams.get('category_id') ?? '';
  const keyword = searchParams.get('keyword');
  const sort = searchParams.get('sort');
  const order = searchParams.get('order');

  const status = searchParams.get('status');
  const pageToken = searchParams.get('page_token');

  if (categoryId && categoryId !== '0') params.set('category_id', categoryId);
  if (keyword) params.set('keyword', keyword);
  if (pageToken) {
    params.set('page_token', pageToken);
  }

  // 값이 있을 때만 메루카리 타겟 URL 파라미터에 추가
  if (sort) params.set('sort', sort);
  if (order) params.set('order', order);

  if (status) params.set('status', status);

  ['price_min', 'price_max', 'exclude_keyword'].forEach(key => {
    const val = searchParams.get(key);
    if (val) params.set(key, val);
  });

  return `https://jp.mercari.com/search?${params.toString()}`;
}

async function extractItems(page: any, limit: number = 150): Promise<MercariItem[]> {
  return await page.evaluate((limit: number) => {
    const cells = Array.from(document.querySelectorAll('[data-testid="item-cell"]'));
    return cells.map(el => {
      const anchor = el.querySelector('a');
      const link = anchor?.getAttribute('href') || '';
      const imgEl = el.querySelector('img');

      const idMatch = link.match(/item\/(m\d+)/);
      const id = idMatch ? idMatch[1] : link.split('/').pop() || '';

      return {
        id: id,
        name: imgEl?.getAttribute('alt') || '상품명 없음',
        thumbnail: imgEl?.src || '',
        price: parseInt(el.querySelector('[class*="number"]')?.textContent?.replace(/[^0-9]/g, '') || '0', 10),
        status: el.innerHTML.includes('売り切れ') ? 'sold_out' : 'on_sale',
        url: `https://jp.mercari.com${link}`
      };
    }).filter(item => item.id);
  }, limit).catch(() => []);
}

// 🚀 [속도 개선] 아이템 추출과 "끝 페이지 감지"를 한 번의 page.evaluate 호출로 합쳐서,
// 새 아이템이 없는 매 회차마다 별도 왕복(round-trip)이 생기지 않게 했습니다.
async function extractItemsAndCheckEnd(page: any, limit: number = 150): Promise<{ items: MercariItem[]; isEndOfPage: boolean }> {
  return await page.evaluate((limit: number) => {
    const cells = Array.from(document.querySelectorAll('[data-testid="item-cell"]'));
    const items = cells.map(el => {
      const anchor = el.querySelector('a');
      const link = anchor?.getAttribute('href') || '';
      const imgEl = el.querySelector('img');
      const idMatch = link.match(/item\/(m\d+)/);
      const id = idMatch ? idMatch[1] : link.split('/').pop() || '';

      return {
        id: id,
        name: imgEl?.getAttribute('alt') || '상품명 없음',
        thumbnail: imgEl?.src || '',
        price: parseInt(el.querySelector('[class*="number"]')?.textContent?.replace(/[^0-9]/g, '') || '0', 10),
        status: el.innerHTML.includes('売り切れ') ? 'sold_out' : 'on_sale',
        url: `https://jp.mercari.com${link}`
      };
    }).filter(item => item.id);

    const bodyText = document.body.innerText;
    const hasRelatedAds = bodyText.includes('他のサイトの関連広告') || bodyText.includes('다른 사이트의 관련 광고');
    const nextButton = Array.from(document.querySelectorAll('a, button')).find(el =>
      el.textContent?.includes('次へ') || el.textContent?.includes('다음')
    );

    return { items, isEndOfPage: hasRelatedAds || !!nextButton };
  }, limit).catch(() => ({ items: [], isEndOfPage: false }));
}
