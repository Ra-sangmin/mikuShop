export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma';
import { createPage } from '@/lib/crawler/browserPool';
import { createTtlCache } from '@/lib/crawler/ttlCache';
import { createCachedSearchStream } from '@/lib/crawler/searchStream';

// 🌟 야후 옥션 홈 화면(auctions.yahoo.co.jp)의 "こちらもおすすめ" 섹션은 로그인한 사용자에게만
// 개인화되어 노출되는 영역이라, 우리 크롤러(비로그인 세션)로는 볼 수 없습니다. 로그인 세션을
// 서버에 유지하는 건 계정 보안/유지보수 부담이 커서 보류하고, 대신 비로그인 상태에서도 항상
// 볼 수 있는 실제 진행중인 경매 중 "입찰수 많은순"으로 몇 개 카테고리를 골라 보여줍니다.
// (검색 라우트와 동일한 DOM 추출/유효성 로직을 재사용합니다.)
const CACHE_KEY = 'yahoo_auction_popular';
const MAX_ITEMS = 100;
const PER_CATEGORY_LIMIT = 20;
// 🌟 DB에 쌓인 카테고리는 최소 1개 ~ 최대 10개까지만 가져옵니다.
const MAX_SOURCE_CATEGORIES = 10;

// 🌟 사용자가 실제로 카테고리를 클릭할 때마다 CategoryPopularity에 쌓이는 클릭수 데이터가
// 아예 없을 때(콜드 스타트)만 쓰는 기본값입니다 (장난감·게임 / 취미·문화 / 골동품·컬렉션 / 스포츠·레저).
const DEFAULT_SOURCE_CATEGORIES = [25464, 24242, 20000, 24698];

// 🌟 하드코딩 대신, main_shop/yahoo_auction에서 사용자들이 실제로 많이 클릭한 카테고리
// (CategoryPopularity, updateNavigation에서 trackCategoryClick으로 적재) 순으로 가져옵니다.
// DB에 기록이 하나도 없으면 기본 카테고리를 쓰고, 있으면 있는 만큼(1~10개)만 그대로 씁니다.
async function getSourceCategories(): Promise<number[]> {
  try {
    const top = await prisma.categoryPopularity.findMany({
      where: { platform: 'yahoo_auction' },
      orderBy: { clickCount: 'desc' },
      take: MAX_SOURCE_CATEGORIES,
    });

    console.log(
      `📊 [인기 카테고리] DB에서 조회된 상위 ${MAX_SOURCE_CATEGORIES}개:`,
      top.map((c: { genreId: number; genreName: string | null; clickCount: number }) =>
        `${c.genreName || '(이름없음)'}(genreId=${c.genreId}, 클릭수=${c.clickCount})`
      )
    );

    if (top.length === 0) {
      console.log('📊 [인기 카테고리] DB에 클릭 기록이 없어 기본 카테고리 사용:', DEFAULT_SOURCE_CATEGORIES);
      return DEFAULT_SOURCE_CATEGORIES;
    }

    const genreIds = top.map((c: { genreId: number }) => c.genreId);
    console.log(`📊 [인기 카테고리] 최종 SOURCE_CATEGORIES (${genreIds.length}개):`, genreIds);

    return genreIds;
  } catch (e) {
    console.error('카테고리 인기순 조회 실패, 기본 카테고리로 대체:', e);
    return DEFAULT_SOURCE_CATEGORIES;
  }
}

interface PopularItem {
  id: string;
  name: string;
  thumbnail: string;
  price: number;
  status: 'on_sale' | 'sold_out';
  url: string;
  bidCount?: number;
  timeLeft?: string;
}

function isAuctionClosed(item: Partial<PopularItem>) {
  const value = `${item.status || ''} ${item.timeLeft || ''} ${item.name || ''}`;
  return /終了|落札|売り切れ|SOLD|sold|closed|終了しました|取引終了/i.test(value);
}

function hasRecognizableTimeLeft(timeLeft?: string): boolean {
  const value = (timeLeft || '').trim();
  if (!value) return false;
  if (/\d+\s*(?:分|분|秒|초)/.test(value)) return true;
  if (value.includes('時間') || value.includes('시간')) return true;
  if (value.includes('日') || value.includes('일')) return true;
  return false;
}

// 🌟 [데이터 정합성] 실제 입찰이 불가능한 "이미지 확인용/주문 접수용" 참고 게시물은 가격이
// 9999999999 같은 의미 없는 값으로 채워져 있어, 정상 매물과 구분해 걸러냅니다.
const MAX_REASONABLE_PRICE = 10_000_000; // 1,000만엔 이상은 사실상 비정상 값으로 간주
function isReferenceOnlyListing(item: Partial<PopularItem>): boolean {
  if ((item.price || 0) > MAX_REASONABLE_PRICE) return true;
  return /ご入札・ご購入はできません|画像を確認して頂く|カラーオーダー用|ご注文受付/.test(item.name || '');
}

// 🚀 5분 TTL: 모든 방문자가 공유하는 스냅샷이라 자주 다시 긁을 필요가 없습니다.
const popularCache = createTtlCache<PopularItem[]>(5 * 60_000, 5);

const CHUNK_SIZE = 5;
// 🌟 카테고리를 순서대로 하나씩 크롤링하면 카테고리 수만큼 대기 시간이 그대로 누적돼(최대
// 10개 × 페이지당 수 초) 체감 속도가 매우 느렸습니다. 동시에 몇 개씩 병렬로 열어 전체 대기
// 시간을 줄이고, 각 카테고리가 끝나는 대로 결과를 청크로 바로바로 흘려보냅니다.
const CATEGORY_CONCURRENCY = 3;

export async function GET() {
  const cached = popularCache.get(CACHE_KEY);
  if (cached) {
    return new Response(createCachedSearchStream(cached, CHUNK_SIZE), {
      headers: { 'Content-Type': 'application/x-ndjson' },
    });
  }

  const encoder = new TextEncoder();

  // 🌟 [버그 수정] 개발 모드의 React StrictMode는 useEffect를 두 번 실행합니다. 첫 번째
  // 인스턴스는 곧바로 정리(cleanup)되며 fetch를 abort하는데, 이 스트림이 그 신호를 무시하고
  // 계속 실행되면 "버려진 크롤링"과 "실제 크롤링"이 동시에 카테고리 페이지에 접속하게 됩니다.
  // isClosed/openPages를 start()와 cancel()이 공유하도록 바깥으로 빼서, 클라이언트가 연결을
  // 끊으면 즉시 모든 크롤링(열려있는 모든 카테고리 페이지)을 중단합니다.
  let isClosed = false;
  const openPages = new Set<any>();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const seenIds = new Set<string>();
      const collected: PopularItem[] = [];

      const sendChunk = (items: PopularItem[]) => {
        if (isClosed || items.length === 0) return;
        for (let i = 0; i < items.length; i += CHUNK_SIZE) {
          const dataChunk = items.slice(i, i + CHUNK_SIZE);
          controller.enqueue(encoder.encode(JSON.stringify({ success: true, data: dataChunk }) + '\n'));
        }
      };

      const fetchCategory = async (categoryId: number) => {
        if (isClosed || collected.length >= MAX_ITEMS) return;

        let page: any = null;
        try {
          page = await createPage({ viewport: { width: 1280, height: 1080 } });
          if (isClosed) return;
          openPages.add(page);

          const targetUrl = `https://auctions.yahoo.co.jp/category/list/${categoryId}/?auccat=${categoryId}&s1=new&o1=d`;
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
          await page.waitForSelector('.Products--grid .Product', { timeout: 5000 }).catch(() => {});
          if (isClosed) return;

          const items = await extractItems(page, PER_CATEGORY_LIMIT);
          const valid: PopularItem[] = [];
          for (const item of items) {
            if (collected.length + valid.length >= MAX_ITEMS) break;
            if (seenIds.has(item.id)) continue;
            if (!item.id || item.price <= 0) continue;
            if (isReferenceOnlyListing(item)) continue;
            if (isAuctionClosed(item) || !hasRecognizableTimeLeft(item.timeLeft)) continue;
            seenIds.add(item.id);
            valid.push(item);
          }
          collected.push(...valid);
          sendChunk(valid);
        } catch (e) {
          console.error(`yahoo_auction popular category ${categoryId} error:`, e);
        } finally {
          if (page) {
            openPages.delete(page);
            await page.close().catch(() => {});
          }
        }
      };

      try {
        const sourceCategories = await getSourceCategories();

        for (let i = 0; i < sourceCategories.length && !isClosed; i += CATEGORY_CONCURRENCY) {
          if (collected.length >= MAX_ITEMS) break;
          const batch = sourceCategories.slice(i, i + CATEGORY_CONCURRENCY);
          await Promise.all(batch.map(fetchCategory));
        }
      } catch (error) {
        console.error('yahoo_auction popular stream error:', error);
      } finally {
        // 🌟 [버그 수정] 이번 실행이 하필 0건이었던 "일시적 실패"까지 5분 TTL로 캐싱해버리면,
        // 그 뒤로 5분 동안 모든 방문자가 빈 결과만 보게 됩니다. 결과가 있을 때만 캐시합니다.
        if (collected.length > 0) {
          popularCache.set(CACHE_KEY, collected.slice(0, MAX_ITEMS));
        }
        if (!isClosed) {
          isClosed = true;
          controller.close();
        }
      }
    },
    cancel() {
      // 🌟 클라이언트가 연결을 끊으면(StrictMode의 첫 번째 abort 포함) 열려있는 모든
      // 카테고리 페이지를 즉시 닫아 크롤링을 중단합니다.
      isClosed = true;
      for (const page of openPages) {
        page.close().catch(() => {});
      }
      openPages.clear();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

async function extractItems(page: any, limit: number): Promise<PopularItem[]> {
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
        url,
        status: timeLeft.includes('終了') || hasClosedMarker ? 'sold_out' : 'on_sale',
      };
    }).filter(item => item !== null && item.id !== '');
  }, limit).catch(() => []);
}
