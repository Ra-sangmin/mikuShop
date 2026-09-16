export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { createSearchStream, createCachedSearchStream, parseKnownIds } from '@/lib/crawler/searchStream';
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

  // 🌟 프론트가 이미 갖고 있는(중단돼 일부만 캐시된) 상품 id. 이 상품들은 빼고 나머지만 보냅니다.
  const knownIds = parseKnownIds(searchParams);
  if (knownIds.size > 0) console.log(`↩️ [이어받기] 이미 받은 ${knownIds.size}개는 건너뜁니다`);

  const cached = searchCache.get(targetUrl);
  if (cached) {
    console.log(`\n⚡ [CACHE HIT] ${targetUrl} (${cached.length}개, 스크래핑 생략)`);
    return new Response(createCachedSearchStream(cached.filter(item => !knownIds.has(item.id))), {
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
    knownIds,
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

// 🐛 메루카리가 CSS 클래스 이름을 해시(jdmOYL 같은 무작위 문자열)로 바꾸면서 가격 요소를 찾던
//    `[class*="number"]` 선택자가 아무것도 못 찾게 됐습니다. 그러면 price 가 0 으로 파싱되고,
//    searchStream 의 isValidItem(price > 0) 에서 전부 걸러져 "상품 0개" 가 됐습니다.
//    → 클래스 이름 대신 "셀 안에서 숫자로만 된 텍스트(¥ 표기 허용)" 를 가격으로 찾습니다.
//    아이템 추출과 "끝 페이지 감지" 는 한 번의 page.evaluate 로 합쳐 왕복을 줄입니다.
async function extractCells(page: any, limit: number, checkEnd: boolean): Promise<{ items: MercariItem[]; isEndOfPage: boolean }> {
  // ⚠️ 이 콜백은 브라우저 안에서 실행됩니다. 안에 "이름 있는 함수"를 두면 일부 번들러(esbuild 등)가
  //    __name 같은 헬퍼 호출을 끼워 넣어 브라우저에서 ReferenceError 로 터지므로, 로직을 인라인으로 둡니다.
  return await page.evaluate(({ limit, checkEnd }: { limit: number; checkEnd: boolean }) => {
    const cells = Array.from(document.querySelectorAll('[data-testid="item-cell"]')).slice(0, limit);
    const items = cells.map(el => {
      const anchor = el.querySelector('a[href*="/item/"]') || el.querySelector('a');
      const link = anchor?.getAttribute('href') || '';
      const imgEl = el.querySelector('img');
      const idMatch = link.match(/item\/(m\d+)/);
      const id = idMatch ? idMatch[1] : link.split('/').pop() || '';

      // 가격: 1) 가격 전용 aria-label / data-testid → 2) 자식 없는 텍스트 노드 중 "¥1,234" / "1234" 형태
      let price = 0;
      const labelled = el.querySelector('[aria-label*="円"], [aria-label*="¥"], [data-testid*="price"]');
      const fromLabel = (labelled?.getAttribute('aria-label') || labelled?.textContent || '').replace(/[^0-9]/g, '');
      if (fromLabel) {
        price = parseInt(fromLabel, 10);
      } else {
        const leaves = Array.from(el.querySelectorAll('span, div, p')).filter(n => n.childElementCount === 0);
        for (const n of leaves) {
          const t = (n.textContent || '').trim();
          if (/^[¥￥]?\s*[0-9][0-9,]*$/.test(t)) {
            const v = parseInt(t.replace(/[^0-9]/g, ''), 10);
            if (v > 0) { price = v; break; }
          }
        }
      }

      // 🐛 메루카리 목록의 <img> 는 loading="lazy" 이고 src 가 처음엔 비어 있습니다(뷰포트에 들어온 뒤
      //    JS 가 채우는데, 크롤러는 이미지 로드를 꺼두므로 끝까지 비어 있음). 그래서 목록이 전부
      //    "이미지 준비 중" 이었습니다. → 상품 id 로 메루카리 CDN 썸네일 주소를 직접 만듭니다.
      //    (static.mercdn.net 은 폭 240 만 허용하고, 외부 사이트에서의 직접 참조도 허용됩니다)
      const domThumb = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';
      const thumbnail = domThumb || (/^m\d+$/.test(id) ? `https://static.mercdn.net/c!/w=240/thumb/photos/${id}_1.jpg` : '');

      return {
        id,
        name: (imgEl?.getAttribute('alt') || '').replace(/のサムネイル$/, '') || '상품명 없음',
        thumbnail,
        price,
        status: el.innerHTML.includes('売り切れ') ? 'sold_out' : 'on_sale',
        url: `https://jp.mercari.com${link}`
      };
    }).filter(item => item.id);

    if (!checkEnd) return { items, isEndOfPage: false };

    // 🐛 "次へ"(다음 페이지) 버튼은 페이지 맨 아래에 처음부터 존재합니다. 예전엔 "존재 여부"만 봐서,
    //    셀이 아직 채워지기 전(메루카리는 뷰포트에 들어온 셀만 나중에 채웁니다) 첫 스크롤 회차에 새
    //    상품이 없으면 곧바로 "끝 페이지"로 오판하고 0개로 끝났습니다.
    //    → 버튼이 실제로 화면(뷰포트) 안에 들어왔을 때만 끝으로 봅니다.
    const bodyText = document.body.innerText;
    const hasRelatedAds = bodyText.includes('他のサイトの関連広告') || bodyText.includes('다른 사이트의 관련 광고');
    const nextButton = Array.from(document.querySelectorAll('a, button')).find(el =>
      el.textContent?.includes('次へ') || el.textContent?.includes('다음')
    );
    const nextButtonVisible = !!nextButton && nextButton.getBoundingClientRect().top < window.innerHeight + 200;
    return { items, isEndOfPage: hasRelatedAds || nextButtonVisible };
  }, { limit, checkEnd }).catch((e: any) => {
    // 🐛 예전엔 여기서 에러를 조용히 삼켜, 추출 코드가 깨져도 "상품 0개" 로만 보였습니다.
    console.error('❌ [mercari] 상품 추출 실패:', e?.message || e);
    return { items: [], isEndOfPage: false };
  });
}

async function extractItems(page: any, limit: number = 150): Promise<MercariItem[]> {
  return (await extractCells(page, limit, false)).items;
}

async function extractItemsAndCheckEnd(page: any, limit: number = 150): Promise<{ items: MercariItem[]; isEndOfPage: boolean }> {
  return extractCells(page, limit, true);
}
