export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma';
import { createPage } from '@/lib/crawler/browserPool';
import { createTtlCache } from '@/lib/crawler/ttlCache';
import { createCachedSearchStream, createSearchStream } from '@/lib/crawler/searchStream';

// 🌟 메루카리는 중고 물품이라 "우리 사이트 방문자의 누적 조회수" 방식(DB 트래킹)으로 인기 상품을
// 뽑으면 이미 팔린 상품이 계속 상단에 남는 문제가 생깁니다. 대신 아래 순서로 번갈아 시도해
// "일단 몇 개라도 빨리" 보여준 다음 나머지를 순차적으로 채웁니다:
//    1) 인기 카테고리 1위를 먼저 빠르게 로딩 (검색 라우트와 동일한 크롤링 엔진)
//    2) 홈 화면의 "おすすめの商品"(추천 상품) 섹션 1차 시도
//    3) 0건이면 → 인기 카테고리 2위 추가 로딩
//    4) 추천 섹션 2차 시도
//    5) 0건이면 → 인기 카테고리 3위 추가 로딩
//    6) 추천 섹션 3차 시도
//    7) 0건이면 → 인기 카테고리 4위 추가 로딩
//    8) 추천 섹션 4차 시도
//    9) 0건이면 → 인기 카테고리 5위 추가 로딩
//   10) 추천 섹션 5차 시도
//   11) 0건이면 → 인기 카테고리 6~10위를 한꺼번에 로딩
// 어느 단계든 상품이 잡히는 즉시 3~5개씩 청크로 흘려보내고, 누적 개수가 MAX_ITEMS(100)에
// 도달하면 그 즉시 남은 단계를 전부 건너뛰고 크롤링을 중단합니다. 1번(카테고리 1위)을 제외한
// 나머지(2~11번, 추천 섹션 + 카테고리 2~10위 전부 합쳐서)는 REST_MAX_ITEMS(20)로 따로 제한합니다.
const HOME_URL = 'https://jp.mercari.com/';
const RECOMMEND_API_MARKER = 'api.mercari.jp/store/get_items';
const CACHE_KEY = 'mercari_home_recommend';
const MAX_ITEMS = 100;
// 🌟 1번(카테고리 1위)을 제외한 2~11번 전체(추천 섹션 5회 시도 + 카테고리 2~10위)가
// 합쳐서 가져올 수 있는 최대 개수.
const REST_MAX_ITEMS = 20;
const CHUNK_SIZE = 4;
// 🌟 카테고리 1개당 "빠르게 몇 개만" 가져오는 게 목적이라 넉넉히 잡지 않습니다.
const CATEGORY_QUICK_LIMIT = 8;
// 🌟 1~5위는 추천 섹션과 번갈아 하나씩, 6~10위는 5차 시도까지 다 실패했을 때 한꺼번에 씁니다.
const SOURCE_CATEGORY_COUNT = 10;
// 🌟 카테고리 클릭 데이터가 아직 없을 때(콜드 스타트)만 쓰는 기본 카테고리 10개
// (패션 / 게임·장난감·상품 / 책,잡지,만화 / 스포츠 / 화장품·미용 / TV,오디오,카메라 /
//  스마트폰,태블릿,PC / 취미,악기,미술 / 애완 동물 용품 / 아기·키즈 — genreId 기준).
const DEFAULT_SOURCE_CATEGORIES = [3088, 1328, 5, 8, 6, 3888, 7, 6386, 69, 3];

interface PopularItem {
  id: string;
  name: string;
  thumbnail: string;
  price: number;
  status: 'on_sale' | 'sold_out';
  url: string;
}

// 🌟 하드코딩 대신, main_shop/mercari에서 사용자들이 실제로 많이 클릭한 카테고리
// (CategoryPopularity, updateNavigation에서 trackCategoryClick으로 적재) 순으로 가져옵니다.
// DB에 기록이 하나도 없으면 기본 카테고리 10개를 쓰고, 있으면 있는 만큼(1~10개)만 그대로 씁니다.
async function getSourceCategories(): Promise<number[]> {
  try {
    const top = await prisma.categoryPopularity.findMany({
      where: { platform: 'mercari' },
      orderBy: { clickCount: 'desc' },
      take: SOURCE_CATEGORY_COUNT,
    });

    if (top.length === 0) {
      console.log('📊 [메루카리 인기 카테고리] 클릭 기록이 없어 기본 카테고리 사용:', DEFAULT_SOURCE_CATEGORIES);
      return DEFAULT_SOURCE_CATEGORIES;
    }

    console.log(
      `📊 [메루카리 인기 카테고리] 상위 ${top.length}개:`,
      top.map((c: { genreId: number; genreName: string | null; clickCount: number }) =>
        `${c.genreName || '(이름없음)'}(genreId=${c.genreId}, 클릭수=${c.clickCount})`
      )
    );
    return top.map((c: { genreId: number }) => c.genreId);
  } catch (e) {
    console.error('메루카리 인기 카테고리 조회 실패, 기본 카테고리로 대체:', e);
    return DEFAULT_SOURCE_CATEGORIES;
  }
}

// 🚀 5분 TTL: 모든 방문자가 공유하는 홈 화면 스냅샷이라 자주 다시 긁을 필요가 없습니다.
const popularCache = createTtlCache<PopularItem[]>(5 * 60_000, 5);
// 🌟 카테고리 크롤링은 createSearchStream의 자체 캐시를 쓰지 않습니다 (바깥 popularCache가
// 이미 전체 결과를 5분간 캐싱하므로 이중 캐싱이 불필요합니다).
const noopCache = { get: (_key: string) => undefined, set: (_key: string, _value: PopularItem[]) => {} };

export async function GET() {
  const cached = popularCache.get(CACHE_KEY);
  if (cached) {
    return new Response(createCachedSearchStream(cached, CHUNK_SIZE), {
      headers: { 'Content-Type': 'application/x-ndjson' },
    });
  }

  const encoder = new TextEncoder();
  const categoryPhaseController = new AbortController();

  // 🌟 [버그 수정] 개발 모드의 React StrictMode는 useEffect를 두 번 실행합니다. 첫 번째
  // 인스턴스는 곧바로 정리(cleanup)되며 fetch를 abort하는데, 이 스트림이 그 신호를 무시하고
  // 계속 실행되면 "버려진 크롤링"과 "실제 크롤링"이 동시에 jp.mercari.com에 접속하게 되어
  // 서로 자원을 다투게 됩니다. recommendPage/isClosed를 start()와 cancel()이 공유하도록
  // 바깥으로 빼서, 클라이언트가 연결을 끊으면 즉시 크롤링을 멈추고 열려있는 페이지를 닫습니다.
  let recommendPage: any = null;
  let isClosed = false;
  const seenIds = new Set<string>();
  const collected: PopularItem[] = [];
  // 🌟 1번(카테고리 1위) 완료 시점의 collected.length 스냅샷. 이후 (collected.length -
  // cat1Count)가 "1번을 제외한 나머지"에서 지금까지 모은 개수가 됩니다.
  let cat1Count = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sendChunk = (items: PopularItem[]) => {
        if (isClosed || items.length === 0) return;
        for (let i = 0; i < items.length; i += CHUNK_SIZE) {
          const dataChunk = items.slice(i, i + CHUNK_SIZE);
          controller.enqueue(encoder.encode(JSON.stringify({ success: true, data: dataChunk }) + '\n'));
        }
      };

      // 🌟 카테고리 1개를 검색 라우트와 동일한 크롤링 엔진(createSearchStream)으로 빠르게
      // 긁어와 스트리밍합니다. 카테고리 페이지를 열자마자 첫 화면에 이미 렌더링된 상품을
      // 바로 긁어오므로 홈 화면 지연로딩보다 훨씬 빠르고 안정적입니다.
      // 🌟 respectRestBudget: 2~11번 단계(카테고리 2~10위)에서만 true로 넘겨, "1번을 제외한
      // 나머지" 전체에 적용되는 REST_MAX_ITEMS 예산을 함께 지킵니다. 매 청크마다 공유된
      // collected/cat1Count를 기준으로 실시간 계산하므로, 6~10위처럼 여러 카테고리를 동시에
      // 병렬로 돌려도(Promise.all) 합계 기준으로 정확히 제한됩니다. 1번(카테고리 1위) 호출
      // 시엔 생략해 MAX_ITEMS(100)로만 제한됩니다.
      const crawlCategoryFast = async (categoryId: number, respectRestBudget = false) => {
        if (isClosed || collected.length >= MAX_ITEMS) return;
        if (respectRestBudget && collected.length - cat1Count >= REST_MAX_ITEMS) return;

        const categoryStream = createSearchStream<PopularItem>({
          targetUrl: `https://jp.mercari.com/search?category_id=${categoryId}`,
          signal: categoryPhaseController.signal,
          startTime: performance.now(),
          cache: noopCache,
          domReadySelector: '[data-testid="item-cell"]',
          extractItems: (p, limit) => extractCategoryItems(p, limit),
          extractItemsAndCheckEnd: (p, limit) => extractCategoryItemsAndCheckEnd(p, limit),
          isValidItem: item => Boolean(item.id) && item.price > 0,
          getItemId: item => item.id,
          apiListener: {
            matchesUrl: url => url.includes('api/v1/search') || url.includes('search_index'),
            mapResponseItems: json => mapCategoryApiItems(json),
          },
          maxItems: CATEGORY_QUICK_LIMIT,
          chunkSize: CHUNK_SIZE,
          // 🌟 [속도 개선] "빠르게 몇 개만" 보여주고 곧바로 다음 단계로 넘어가는 게 목적이라,
          // 스크롤은 아예 하지 않고 페이지를 열자마자 첫 화면에 이미 렌더링된 상품만 긁습니다
          // (0으로 두면 createSearchStream이 스크롤 루프를 한 번도 돌지 않습니다).
          maxAttempts: 0,
        });

        // 🌟 [버그 수정] createSearchStream의 maxItems 옵션은 "스크롤을 계속할지" 판단에만
        // 쓰이고, 첫 화면 추출 자체는 그 자리에 이미 렌더링된 만큼(실측 100개 이상) 전부
        // 그대로 흘려보냅니다. maxAttempts:0이라 스크롤은 안 해도, 카테고리 1개당 "몇 개만
        // 빠르게" 보여준다는 의도가 지켜지도록 여기서 직접 CATEGORY_QUICK_LIMIT만큼 자릅니다.
        let takenFromThisCategory = 0;

        const reader = categoryStream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        // 🌟 카테고리 1개당 한도(CATEGORY_QUICK_LIMIT), 전체 100개 한도(MAX_ITEMS), 그리고
        // (해당하면) "1번 제외 나머지" 20개 한도(REST_MAX_ITEMS) 중 가장 먼저 닿는 쪽에서 멈춥니다.
        while (true) {
          const { done, value } = await reader.read();
          if (
            done || isClosed || takenFromThisCategory >= CATEGORY_QUICK_LIMIT || collected.length >= MAX_ITEMS ||
            (respectRestBudget && collected.length - cat1Count >= REST_MAX_ITEMS)
          ) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim() || isClosed) continue;
            try {
              const result = JSON.parse(line);
              if (result.success && result.data?.length) {
                const remaining = Math.min(
                  CATEGORY_QUICK_LIMIT - takenFromThisCategory,
                  MAX_ITEMS - collected.length,
                  respectRestBudget ? REST_MAX_ITEMS - (collected.length - cat1Count) : Infinity,
                );
                if (remaining <= 0) continue; // 다음 read() 전 위 조건에서 루프가 자연히 끝납니다.

                const fresh: PopularItem[] = result.data
                  .filter((it: PopularItem) => it.id && !seenIds.has(it.id))
                  .slice(0, remaining);
                fresh.forEach(it => seenIds.add(it.id));
                takenFromThisCategory += fresh.length;
                collected.push(...fresh);
                sendChunk(fresh);
              }
            } catch (e) {}
          }
        }
        await reader.cancel().catch(() => {});
      };

      // 🌟 홈 화면의 "おすすめの商品"(추천 상품) 섹션을 한 번 시도하고, 이번 시도에서 실제로
      // 찾은 개수를 반환합니다 (카테고리 단계가 이미 collected를 채워놨을 수 있어, 전체
      // collected.length가 아니라 "이번 시도 자체의 성과"를 따로 세야 다음 단계 진행 여부를
      // 올바르게 판단할 수 있습니다).
      const attemptRecommendOnce = async (): Promise<number> => {
        // 🌟 "1번 제외 나머지" 예산이 이미 다 찼다면 페이지를 열 필요도 없습니다.
        if (collected.length - cat1Count >= REST_MAX_ITEMS) return 0;

        let attemptPage: any = null;
        let foundInThisAttempt = 0;
        try {
          // 🌟 browserPool.createPage()는 기본적으로 stylesheet까지 차단하는데, 이 페이지는
          // 그 상태로 렌더링되면 문서 높이가 정상 대비 크게 줄어들어(실측: 정상 15000px+ vs
          // 차단 시 6140px) "おすすめの商品" 섹션까지 스크롤이 아예 못 내려갑니다. 이 라우트는
          // 스크롤 거리 기반 휴리스틱에 의존하므로 CSS를 켭니다.
          attemptPage = await createPage({ viewport: { width: 1280, height: 1080 }, blockResources: false });
          if (isClosed) return 0;
          recommendPage = attemptPage;

          attemptPage.on('response', async (response: any) => {
            if (isClosed || !response.url().includes(RECOMMEND_API_MARKER)) return;
            try {
              const json = await response.json();
              const newItems: PopularItem[] = [];
              for (const raw of json?.data || []) {
                const id = raw?.id;
                const price = Number(raw?.price) || 0;
                if (!id || seenIds.has(id) || price <= 0) continue;
                // 🌟 추천 섹션은 항상 2~11번 단계에서만 시도되므로, 전체 100개 한도뿐 아니라
                // "1번 제외 나머지" 20개 한도(REST_MAX_ITEMS)도 함께 지킵니다.
                if (collected.length + newItems.length >= MAX_ITEMS) break;
                if ((collected.length - cat1Count) + newItems.length >= REST_MAX_ITEMS) break;

                seenIds.add(id);
                newItems.push({
                  id,
                  name: raw?.name || '상품명 없음',
                  thumbnail: raw?.thumbnails?.[0] || '',
                  price,
                  status: raw?.status === 'on_sale' ? 'on_sale' : 'sold_out',
                  url: `https://jp.mercari.com/item/${id}`,
                });
              }
              collected.push(...newItems);
              foundInThisAttempt += newItems.length;
              sendChunk(newItems);
            } catch (e) {}
          });

          await attemptPage.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
          await new Promise(r => setTimeout(r, 1000));

          for (
            let i = 0;
            i < 12 && !isClosed && collected.length < MAX_ITEMS && (collected.length - cat1Count) < REST_MAX_ITEMS;
            i++
          ) {
            await attemptPage.evaluate(() => window.scrollBy(0, 1000)).catch(() => {});
            await new Promise(r => setTimeout(r, 500));
            if (foundInThisAttempt > 0 && i >= 3) break;
          }
          for (let i = 0; i < 2 && !isClosed && foundInThisAttempt === 0; i++) {
            await new Promise(r => setTimeout(r, 500));
          }
        } catch (error) {
          console.error('mercari popular recommend-phase error:', error);
        } finally {
          if (attemptPage) await attemptPage.close().catch(() => {});
          if (recommendPage === attemptPage) recommendPage = null;
        }
        return foundInThisAttempt;
      };

      try {
        const sourceCategories = await getSourceCategories();
        // 1~5위는 추천 섹션과 번갈아 하나씩 쓰고, 6~10위(있다면)는 5차 시도까지 다 실패했을
        // 때 한꺼번에 씁니다.
        const [cat1, cat2, cat3, cat4, cat5, ...restCats] = sourceCategories;
        const alternatingCategories = [cat1, cat2, cat3, cat4, cat5];

        const hasBudget = () => !isClosed && collected.length < MAX_ITEMS;
        // 🌟 1번을 제외한 2~11번 전체가 지켜야 할 예산(REST_MAX_ITEMS)이 아직 남아있는지.
        const hasRestBudget = () => hasBudget() && (collected.length - cat1Count) < REST_MAX_ITEMS;

        // 1) 인기 카테고리 1위를 먼저 빠르게 로딩합니다. (REST_MAX_ITEMS 예산 대상이 아닙니다.)
        if (hasBudget() && cat1 !== undefined) {
          await crawlCategoryFast(cat1);
        }
        // 🌟 이 시점부터 collected.length - cat1Count 가 "1번 제외 나머지"의 누적 개수입니다.
        cat1Count = collected.length;

        // 2~10) 추천 섹션을 시도하고, 0건이면 다음 순위 카테고리를 하나씩 추가로 로딩하는
        // 과정을 최대 5회(추천 5차 시도까지) 반복합니다. (2~11번 전체는 REST_MAX_ITEMS로 제한)
        for (let attemptNo = 1; attemptNo <= 5 && hasRestBudget(); attemptNo++) {
          const found = await attemptRecommendOnce();
          if (!hasRestBudget() || found > 0) break;

          if (attemptNo < 5) {
            // 이번 추천 시도가 실패했으니, 다음 순위 카테고리(2~5위)를 추가로 로딩합니다.
            const nextCategory = alternatingCategories[attemptNo]; // attemptNo=1→cat2, ... 4→cat5
            if (nextCategory === undefined) break;
            await crawlCategoryFast(nextCategory, true);
          } else {
            // 11) 추천 5차 시도까지 전부 실패했다면 남은 6~10위를 한꺼번에 로딩합니다.
            if (restCats.length > 0) {
              console.log('🔁 [메루카리 인기상품] 추천 섹션 5회 연속 0건 — 나머지 인기 카테고리로 대체합니다.');
              await Promise.all(restCats.map(id => crawlCategoryFast(id, true)));
            }
          }
        }
      } catch (error) {
        console.error('mercari popular stream error:', error);
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
        if (recommendPage) await recommendPage.close().catch(() => {});
      }
    },
    cancel() {
      // 🌟 클라이언트가 연결을 끊으면(StrictMode의 첫 번째 abort 포함) 즉시 모든 단계의
      // 크롤링을 중단합니다. 카테고리 단계(createSearchStream)들은 이 signal을 넘겨받아
      // 자체적으로 페이지를 닫으므로, 여기서는 abort 신호만 보내면 됩니다.
      isClosed = true;
      categoryPhaseController.abort();
      if (recommendPage) recommendPage.close().catch(() => {});
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

// 🌟 아래 세 함수는 /api/mercari/search/route.ts의 추출 로직과 동일합니다 (검색 결과 첫
// 화면에서 상품을 뽑아내는, 이미 검증된 로직을 그대로 재사용).
// 🐛 mercari/search 와 같은 세 가지 문제를 여기서도 고칩니다.
//    1) 가격: 메루카리가 클래스명을 해시로 바꿔 `[class*="number"]` 가 0개 → 가격 0 → isValidItem 에서 전부 탈락
//    2) 썸네일: 목록 <img> 는 lazy 라 src 가 비어 있음 → 상품 id 로 CDN 썸네일 주소를 직접 생성
//    3) 끝 판정: "次へ" 버튼은 처음부터 존재하므로 "화면에 들어왔는지" 로 판정
//    ⚠️ 콜백은 브라우저 안에서 실행됩니다. 이름 있는 내부 함수를 두면 일부 번들러가 __name 헬퍼를 끼워
//       넣어 ReferenceError 가 나므로 로직을 인라인으로 둡니다.
async function extractCategoryCells(page: any, limit: number, checkEnd: boolean): Promise<{ items: PopularItem[]; isEndOfPage: boolean }> {
  return await page.evaluate(({ limit, checkEnd }: { limit: number; checkEnd: boolean }) => {
    const cells = Array.from(document.querySelectorAll('[data-testid="item-cell"]')).slice(0, limit);
    const items = cells.map(el => {
      const anchor = el.querySelector('a[href*="/item/"]') || el.querySelector('a');
      const link = anchor?.getAttribute('href') || '';
      const imgEl = el.querySelector('img');
      const idMatch = link.match(/item\/(m\d+)/);
      const id = idMatch ? idMatch[1] : link.split('/').pop() || '';

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

    const bodyText = document.body.innerText;
    const hasRelatedAds = bodyText.includes('他のサイトの関連広告') || bodyText.includes('다른 사이트의 관련 광고');
    const nextButton = Array.from(document.querySelectorAll('a, button')).find(el =>
      el.textContent?.includes('次へ') || el.textContent?.includes('다음')
    );
    const nextButtonVisible = !!nextButton && nextButton.getBoundingClientRect().top < window.innerHeight + 200;
    return { items, isEndOfPage: hasRelatedAds || nextButtonVisible };
  }, { limit, checkEnd }).catch((e: any) => {
    console.error('❌ [mercari/popular] 상품 추출 실패:', e?.message || e);
    return { items: [], isEndOfPage: false };
  });
}

async function extractCategoryItems(page: any, limit: number = 150): Promise<PopularItem[]> {
  return (await extractCategoryCells(page, limit, false)).items;
}

async function extractCategoryItemsAndCheckEnd(page: any, limit: number = 150): Promise<{ items: PopularItem[]; isEndOfPage: boolean }> {
  return extractCategoryCells(page, limit, true);
}

function mapCategoryApiItems(json: any): PopularItem[] {
  const rawItems = json.items || [];
  return rawItems.map((item: any): PopularItem => ({
    id: item.id,
    name: item.name,
    thumbnail: item.thumbnails?.[0] || '',
    price: parseInt(item.price, 10),
    status: (item.status === 'on_sale' || item.status === 'trading') ? 'on_sale' : 'sold_out',
    url: `https://jp.mercari.com/item/${item.id}`
  }));
}
