export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { createSearchStream, createCachedSearchStream } from '@/lib/crawler/searchStream';
import { createTtlCache } from '@/lib/crawler/ttlCache';

// 🚀 [설계도] 아이템 형식 정의
interface AuctionItem {
  id: string;
  name: string;
  thumbnail: string;
  price: number;
  status: 'on_sale' | 'sold_out';
  url: string;
  bidCount?: number;
  timeLeft?: string;
  postage?: string;
  platform?: string;
  rawStatus?: string;
}

function isAuctionClosed(item: Partial<AuctionItem>) {
  const value = `${item.status || ''} ${item.rawStatus || ''} ${item.timeLeft || ''} ${item.name || ''}`;
  return /終了|落札|売り切れ|SOLD|sold|closed|終了しました|取引終了/i.test(value);
}

function isEndedTimeLeft(timeLeft?: string) {
  const normalized = (timeLeft || '').trim();
  return normalized === '終了' || normalized === '종료' ||
    normalized.includes('終了') || normalized.includes('종료') ||
    /남은 시간\s*0/.test(normalized);
}

// 🚀 [속도 개선] 같은 검색 결과를 매번 처음부터 다시 스크래핑하지 않도록
// 짧은 TTL(60초)로 서버 메모리에 캐싱합니다.
const searchCache = createTtlCache<AuctionItem[]>(60_000, 50);

export async function GET(req: NextRequest) {
  const { signal } = req;
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('category_id');
  const startTime = performance.now();

  console.log(`categoryId =  ${categoryId}`);

  if (categoryId === '0') {
    return new Response(createCachedSearchStream<AuctionItem>([]), { headers: { 'Content-Type': 'application/x-ndjson' } });
  }

  const targetUrl = generateYahooTargetUrl(searchParams);

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

  const stream = createSearchStream<AuctionItem>({
    targetUrl,
    signal,
    startTime,
    cache: searchCache,
    // 🌟 [버그 수정] 기존에는 메루카리 선택자('[data-testid="item-cell"]')를 그대로 써서
    // 야후 옥션 페이지에서는 절대 매칭되지 않아, 매 검색마다 5초 타임아웃을 그대로 다 쓴 뒤에야
    // 다음 단계로 넘어가던 문제가 있었습니다. 실제 야후 옥션 상품 그리드 선택자로 교체합니다.
    domReadySelector: '.Products--grid .Product',
    extractItems: (page, limit) => extractItems(page, limit),
    extractItemsAndCheckEnd: (page, limit) => extractItemsAndCheckEnd(page, limit),
    isValidItem: item =>
      Boolean(item.id) &&
      item.price > 0 &&
      item.status === 'on_sale' &&
      !isAuctionClosed(item) &&
      !isEndedTimeLeft(item.timeLeft),
    getItemId: item => item.id,
    // 🌟 야후 옥션은 메루카리식 SPA 검색 API가 없어 API 스니핑이 애초에 매칭될 일이 없으므로
    // (실제로 한 번도 매칭되지 않던 죽은 코드였습니다) apiListener는 생략합니다.
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

function generateYahooTargetUrl(searchParams: URLSearchParams): string {
  const categoryId = searchParams.get('category_id') || '0';
  const keyword = searchParams.get('keyword') || '';
  const sort = searchParams.get('sort') || 'endtime'; // 프론트에서 넘어온 정렬 기준
  const page = searchParams.get('page') || '1';

  let s1 = 'end';
  let o1 = 'a';

  // 🌟 [핵심 로직] 프론트엔드의 sort 값을 야후 옥션 전용 파라미터(s1, o1)로 완벽 매핑
  switch (sort) {
    case 'endtime': // 종료 임박순
      s1 = 'end';
      o1 = 'a';
      break;
    case 'cbids': // 입찰수 많은순
      s1 = 'cbids';
      o1 = 'd';
      break;
    case 'bidorbuy': // 즉시구매가 순
      s1 = 'bidorbuy';
      o1 = 'd';
      break;
    case 'a-price': // 현재가 낮은순
      s1 = 'cbids';
      o1 = 'a';
      break;
    case 'd-price': // 현재가 높은순
      s1 = 'cbids';
      o1 = 'd';
      break;
    case 'new': // 신규 등록순
      s1 = 'new';
      o1 = 'd';
      break;
    default:
      s1 = 'end';
      o1 = 'a';
  }

  const params = new URLSearchParams();
  if (keyword) params.set('p', keyword); // 야후는 키워드 파라미터가 'p'입니다.
  params.set('auccat', categoryId);

  // 🌟 매핑된 정렬 기준 적용
  params.set('s1', s1);
  params.set('o1', o1);

  params.set('b', String((parseInt(page) - 1) * 50 + 1)); // 시작 번호 (1, 51, 101...)

  let url = `https://auctions.yahoo.co.jp/category/list/${categoryId}/?${params.toString()}`;

  console.log(`🔍 [URL 생성] ${url}`);

  return url;
}

async function extractItems(page: any, limit: number = 150): Promise<AuctionItem[]> {
  return await page.evaluate((maxCount: number) => {
    const productNodes = Array.from(document.querySelectorAll('.Products--grid .Product'));
    const targets = productNodes.slice(0, maxCount);

    return targets.map(el => {
      const anchor = el.querySelector('a.Product__imageLink');
      if (!anchor) return null;

      const id = anchor.getAttribute('data-auction-id') || '';
      const name = anchor.getAttribute('data-auction-title') || '';
      const thumbnail = anchor.getAttribute('data-auction-img') || '';
      const price = parseInt(anchor.getAttribute('data-auction-price') || '0', 10);
      const url = anchor.getAttribute('href') || '';

      const bidCount = el.querySelector('.Product__bid')?.textContent?.trim() || '0';
      const timeLeft = el.querySelector('.Product__time')?.textContent?.trim() || '';
      const postage = el.querySelector('.Product__postage')?.textContent?.trim() || '';
      const productText = el.textContent?.trim() || '';
      const productMarkup = el.innerHTML || '';
      const hasClosedMarker = /終了|落札|売り切れ|SOLD|sold|closed|終了しました|取引終了/i.test(`${productText} ${productMarkup}`);

      return {
        id,
        name,
        thumbnail,
        price,
        bidCount: parseInt(bidCount, 10),
        timeLeft,
        postage,
        url,
        platform: 'yahoo_auction',
        status: timeLeft.includes('終了') || hasClosedMarker ? 'sold_out' : 'on_sale'
      };
    }).filter(item => item !== null && item.id !== '');
  }, limit).catch(() => []);
}

// 🚀 [속도 개선] 아이템 추출과 "끝 페이지 감지"를 한 번의 page.evaluate 호출로 합쳤습니다.
async function extractItemsAndCheckEnd(page: any, limit: number = 150): Promise<{ items: AuctionItem[]; isEndOfPage: boolean }> {
  return await page.evaluate((maxCount: number) => {
    const productNodes = Array.from(document.querySelectorAll('.Products--grid .Product'));
    const targets = productNodes.slice(0, maxCount);

    const items = targets.map(el => {
      const anchor = el.querySelector('a.Product__imageLink');
      if (!anchor) return null;

      const id = anchor.getAttribute('data-auction-id') || '';
      const name = anchor.getAttribute('data-auction-title') || '';
      const thumbnail = anchor.getAttribute('data-auction-img') || '';
      const price = parseInt(anchor.getAttribute('data-auction-price') || '0', 10);
      const url = anchor.getAttribute('href') || '';

      const bidCount = el.querySelector('.Product__bid')?.textContent?.trim() || '0';
      const timeLeft = el.querySelector('.Product__time')?.textContent?.trim() || '';
      const postage = el.querySelector('.Product__postage')?.textContent?.trim() || '';
      const productText = el.textContent?.trim() || '';
      const productMarkup = el.innerHTML || '';
      const hasClosedMarker = /終了|落札|売り切れ|SOLD|sold|closed|終了しました|取引終了/i.test(`${productText} ${productMarkup}`);

      return {
        id,
        name,
        thumbnail,
        price,
        bidCount: parseInt(bidCount, 10),
        timeLeft,
        postage,
        url,
        platform: 'yahoo_auction',
        status: timeLeft.includes('終了') || hasClosedMarker ? 'sold_out' : 'on_sale'
      };
    }).filter(item => item !== null && item.id !== '');

    const bodyText = document.body.innerText;
    const hasRelatedAds = bodyText.includes('他のサイトの関連広告') || bodyText.includes('다른 사이트의 관련 광고');
    const nextButton = Array.from(document.querySelectorAll('a, button')).find(el =>
      el.textContent?.includes('次へ') || el.textContent?.includes('다음')
    );

    return { items, isEndOfPage: hasRelatedAds || !!nextButton };
  }, limit).catch(() => ({ items: [], isEndOfPage: false }));
}
