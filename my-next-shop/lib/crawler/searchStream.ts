import { createPage } from './browserPool';

// 🚀 mercari/search와 yahoo_auction/search가 거의 동일한 구조(페이지 진입 → API/DOM 경주 →
// 무한 스크롤 → 청크 전송 → 캐시 저장)를 각자 복사-붙여넣기로 들고 있던 것을 하나로 합친
// 공용 검색 스트리밍 엔진입니다. 플랫폼마다 다른 부분(URL, DOM 선택자, 추출 로직, 유효성 검사)만
// 옵션으로 주입받습니다.

const DEFAULT_MAX_ATTEMPTS = 35;
const DEFAULT_MAX_ITEMS = 130;
const DEFAULT_MIN_WAIT_COUNT = 1;
const DEFAULT_CHUNK_SIZE = 5;

export interface SearchStreamOptions<TItem> {
  targetUrl: string;
  signal: AbortSignal;
  startTime: number;
  /** 검색 결과 캐시 (플랫폼별로 별도 인스턴스를 넘겨주세요) */
  cache: { get(key: string): TItem[] | undefined; set(key: string, value: TItem[]): void };
  /** 첫 화면에 상품이 이미 렌더링됐는지 확인할 선택자 (플랫폼마다 DOM 구조가 다릅니다) */
  domReadySelector: string;
  /** 첫 화면(HTML에 이미 구워져 있는 데이터)에서 아이템을 뽑아냅니다. */
  extractItems: (page: any, limit: number) => Promise<TItem[]>;
  /** 스크롤 루프 매 회차마다 아이템 추출 + "끝 페이지 도달 여부"를 한 번에 계산합니다. */
  extractItemsAndCheckEnd: (page: any, limit: number) => Promise<{ items: TItem[]; isEndOfPage: boolean }>;
  /** 가격이 0이거나 이미 종료된 경매처럼, 화면에 보여주면 안 되는 항목을 걸러냅니다. */
  isValidItem: (item: TItem) => boolean;
  /** 아이템 고유 id 추출 (중복 전송 방지용) */
  getItemId: (item: TItem) => string;
  /** (선택) 프론트가 이미 갖고 있는 상품 id. 이 상품들은 다시 보내지 않고 나머지만 이어서 보냅니다.
   *  (받는 도중 다른 카테고리로 옮겨 가 중간까지만 캐시된 목록을 이어받을 때 사용) */
  knownIds?: Set<string>;
  /** (선택) 검색 API 응답을 직접 가로채 더 빨리 데이터를 낚아채는 플랫폼용 */
  apiListener?: {
    matchesUrl: (url: string) => boolean;
    mapResponseItems: (json: any) => TItem[];
  };
  maxAttempts?: number;
  maxItems?: number;
  minWaitCount?: number;
  chunkSize?: number;
  /** (선택) 뷰포트 크기 재정의. 기본값은 검색 라우트들이 원래 쓰던 1280x1080입니다.
   *  화면을 작게 잡으면 첫 화면에 렌더링되는 상품 수 자체가 줄어, "일단 몇 개만 빠르게"
   *  가져올 때 더 빨리 끝납니다. */
  viewport?: { width: number; height: number };
}

export function createSearchStream<TItem>(options: SearchStreamOptions<TItem>): ReadableStream<Uint8Array> {
  const {
    targetUrl, signal, startTime, cache,
    domReadySelector, extractItems, extractItemsAndCheckEnd,
    isValidItem, getItemId, apiListener,
    knownIds = new Set<string>(),
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    maxItems = DEFAULT_MAX_ITEMS,
    minWaitCount = DEFAULT_MIN_WAIT_COUNT,
    chunkSize = DEFAULT_CHUNK_SIZE,
    viewport = { width: 1280, height: 1080 },
  } = options;

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const state = { apiDataCaptured: false, isStreamClosed: false };
      const sentItems = new Set<string>();
      // 🌟 이번 크롤링에서 마주친 모든 상품 id (프론트가 이미 가진 것 포함). 이어받기 때 "진행 중인지" 판단용
      const seenIds = new Set<string>();
      // 🚀 이번 검색에서 실제로 전송한 아이템을 모아뒀다가, 스크래핑이 끝나면 캐시에 저장해
      // 다음 번 같은 검색은 재스크래핑 없이 즉시 응답할 수 있게 합니다.
      const collectedItems: TItem[] = [];
      let page: any = null;

      const processAndSend = async (rawItems: TItem[]): Promise<{ sent: number; encountered: number }> => {
        // 🌟 [버그 수정] 아래 apiListener 핸들러는 `await response.json()`으로 넘어가기 전에만
        // isStreamClosed를 확인합니다. 그 await 도중에 메인 흐름(특히 maxAttempts:0처럼 아주
        // 빨리 끝나는 경우)이 먼저 끝나 controller.close()를 호출해버리면, json 디코딩이 끝난
        // 뒤 여기로 들어와 이미 닫힌 controller에 enqueue를 시도해 "Controller is already
        // closed" 에러로 죽었습니다. 매 시점마다 다시 확인해 조용히 무시합니다.
        if (state.isStreamClosed) return { sent: 0, encountered: 0 };

        const valid = rawItems.filter(isValidItem);
        let encountered = 0;
        for (const item of valid) {
          const id = getItemId(item);
          if (!seenIds.has(id)) { seenIds.add(id); encountered++; }
        }
        const filtered = valid.filter(item => !sentItems.has(getItemId(item)) && !knownIds.has(getItemId(item)));
        if (filtered.length === 0) return { sent: 0, encountered };

        for (let i = 0; i < filtered.length; i += chunkSize) {
          if (state.isStreamClosed) break;

          const dataChunk = filtered.slice(i, i + chunkSize);
          dataChunk.forEach(item => sentItems.add(getItemId(item)));
          collectedItems.push(...dataChunk);

          try {
            controller.enqueue(encoder.encode(JSON.stringify({ success: true, data: dataChunk }) + '\n'));
            controller.enqueue(encoder.encode(' '.repeat(1024) + '\n')); // 브라우저 렌더링 독촉
          } catch (e) {
            // 🌟 마지막 방어선: 그 사이 컨트롤러가 닫혔다면 조용히 중단합니다.
            state.isStreamClosed = true;
            break;
          }
          await new Promise(r => setTimeout(r, 10)); // 렌더링 틈 주기
        }
        return { sent: filtered.length, encountered };
      };

      const abortHandler = async () => {
        state.isStreamClosed = true;
        if (page) await page.close().catch(() => {});
      };
      signal.addEventListener('abort', abortHandler);

      try {
        // [1] 페이지 초기화 및 (선택적) API 리스너 부착
        // 🌟 원래 검색 라우트들이 명시적으로 1280x1080 뷰포트를 썼으므로 기본값을 그렇게
        // 맞추되, 호출하는 쪽에서 더 작은 뷰포트를 넘기면 그걸 씁니다.
        page = await createPage({ viewport });

        if (apiListener) {
          page.on('response', async (response: any) => {
            if (state.isStreamClosed || signal.aborted || state.apiDataCaptured) return;
            if (!apiListener.matchesUrl(response.url())) return;
            try {
              const json = await response.json().catch(() => ({}));
              const mapped = apiListener.mapResponseItems(json);
              if (mapped.length > 0) {
                const { sent: sentCount } = await processAndSend(mapped);
                if (sentCount > 0) {
                  state.apiDataCaptured = true;
                  console.log(`✅ [API 낚시 성공] ${sentCount}개 전송`);
                }
              }
            } catch (e) {}
          });
        }

        // 🐛 첫 화면에서 상품을 하나도 못 긁으면(사이트가 느리거나 첫 렌더가 늦어 선택자 대기가
        //    타임아웃되는 "가끔" 케이스) 예전엔 그대로 0개로 끝났습니다. 한 번은 다시 시도합니다.
        for (let round = 0; round < 2; round++) {
        if (round > 0) console.log(`🔁 [재시도] 첫 시도에서 상품을 못 가져와 페이지를 다시 엽니다: ${targetUrl}`);

        // domcontentloaded로 설정하여 이미지 다운로드는 기다리지 않고 빠르게 통과합니다.
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});

        // 🚀 [하이브리드 대기] Node.js는 API만 감시하고, 브라우저는 DOM만 감시하게 역할을 분리합니다.
        const apiPromise = new Promise(resolve => {
          const interval = setInterval(() => {
            if (state.isStreamClosed) {
              clearInterval(interval);
              return resolve(false);
            }
            if (sentItems.size >= minWaitCount) {
              clearInterval(interval);
              console.log("⚡ [승리 조건 1 달성] API가 먼저 데이터를 낚아챘습니다!");
              return resolve(true);
            }
          }, 50);
        });

        const domPromise = page.waitForSelector(domReadySelector, { timeout: 5000 })
          .then(() => {
            console.log("⚡ [승리 조건 2 달성] 화면에 상품이 먼저 렌더링되었습니다!");
            return true;
          })
          .catch(() => false);

        await Promise.race([apiPromise, domPromise]);

        // 🚀 대기가 끝나면 (누가 이겼든 상관없이) 화면에 있는 걸 싹 긁어 프론트로 보냅니다.
        const firstScreenItems = await extractItems(page, 150);
        const { sent: capturedFirstCount } = await processAndSend(firstScreenItems);

        const elapsedTime = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`📡 [초기 수집] ${capturedFirstCount}개 확보 완료! (소요시간: ${elapsedTime}초)`);

        // [5] 본대 무한 스크롤 루프
        let attempt = 0;
        let consecutiveEmpty = 0;

        // 🌟 상한은 "마주친 상품 수" 기준 (이어받기 땐 프론트가 이미 가진 것도 포함되므로 예전과 같은 총량에서 멈춥니다)
        while (attempt < maxAttempts && seenIds.size < maxItems && !state.isStreamClosed && !signal.aborted) {
          attempt++;

          try {
            if (state.isStreamClosed || signal.aborted || !page || page.isClosed()) break;

            // 1. 랜덤 스크롤 (인간처럼)
            const jitter = Math.floor(Math.random() * 500);
            await page.evaluate((j: any) => window.scrollBy(0, 1200 + j), jitter).catch(() => {});

            // 2. 랜덤 대기 (로봇 패턴 파괴)
            const delay = 500 + Math.floor(Math.random() * 400);
            await new Promise(r => setTimeout(r, delay));

            // 3. 가끔 마우스 흔들기
            if (attempt % 5 === 0) {
              await page.mouse.move(Math.random() * 100, Math.random() * 200);
            }

            const { items: currentItems, isEndOfPage } = await extractItemsAndCheckEnd(page, 150);
            const { sent: addedCount, encountered } = await processAndSend(currentItems);

            // 🐛 이어받기 중엔 "프론트가 이미 가진 상품" 구간을 지나는 동안 전송량이 0이라, 전송량으로만 보면
            //    "연속 데이터 없음" 으로 오판해 새 상품에 닿기 전에 멈췄습니다.
            //    → 새로 마주친 상품(이미 가진 것 포함) 기준으로 진행 여부를 판단합니다.
            if (encountered > 0) {
              consecutiveEmpty = 0;
              if (addedCount > 0) {
                const elapsedTime3 = ((performance.now() - startTime) / 1000).toFixed(2);
                console.log(`✨ [${attempt}회차] ${addedCount}개 추가 (총: ${sentItems.size}개) (소요시간: ${elapsedTime3}초)`);
              }
            } else {
              if (isEndOfPage) {
                console.log("🏁 [종료 신호 포착] 광고 섹션 또는 '다음' 버튼에 도달했습니다. 루프를 종료합니다!");
                break;
              }
              if (++consecutiveEmpty >= 2) {
                console.log("⚠️ 연속 데이터 없음으로 인한 종료");
                break;
              }
            }
          } catch (err: any) {
            if (err.message?.includes('detached') || err.message?.includes('closed')) {
              console.log("🤫 페이지가 이미 닫혔네요. 안전하게 정지합니다.");
              break;
            }
            console.error("❌ 루프 내부 에러:", err);
            break;
          }
        }

        // 하나라도 가져왔거나, 취소됐거나, 페이지가 닫혔으면 재시도하지 않습니다.
        if (collectedItems.length > 0 || state.isStreamClosed || signal.aborted || !page || page.isClosed()) break;
        }
      } catch (err) {
        console.error("Stream Error:", err);
      } finally {
        signal.removeEventListener('abort', abortHandler);
        // 🚀 중간에 취소(abort)되지 않았다면 이번 결과를 캐시에 저장합니다.
        //    (이어받기는 일부만 모은 것이므로 서버 캐시에는 넣지 않습니다)
        if (!signal.aborted && collectedItems.length > 0 && knownIds.size === 0) {
          cache.set(targetUrl, collectedItems);
        }
        if (!state.isStreamClosed) {
          // 🌟 끝났다는 신호를 보냅니다. 재시도까지 했는데도 0개면 실패로 알려서 화면이
          //    "조용한 빈 목록" 대신 안내 문구를 띄울 수 있게 합니다. (모르는 줄은 기존 클라이언트가 무시)
          try {
            if (collectedItems.length === 0 && !signal.aborted && knownIds.size === 0) {
              controller.enqueue(encoder.encode(JSON.stringify({ success: false, error: '상품을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.' }) + '\n'));
            }
            controller.enqueue(encoder.encode(JSON.stringify({ done: true, total: collectedItems.length }) + '\n'));
          } catch { /* 이미 닫힌 컨트롤러 */ }
          state.isStreamClosed = true;
          if (page) await page.close().catch(() => {});
          controller.close();
        }
      }
    }
  });
}

/** 프론트가 보낸 `known=id1,id2,…` (이미 갖고 있는 상품) 을 Set 으로 읽습니다. */
export function parseKnownIds(searchParams: URLSearchParams, max = 1000): Set<string> {
  const raw = searchParams.get('known') || '';
  return new Set(raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, max));
}

// 🚀 캐시 적중 시 Puppeteer 없이 즉시 청크로 흘려보내는 스트림
export function createCachedSearchStream<TItem>(items: TItem[], chunkSize = DEFAULT_CHUNK_SIZE): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < items.length; i += chunkSize) {
        const dataChunk = items.slice(i, i + chunkSize);
        controller.enqueue(encoder.encode(JSON.stringify({ success: true, data: dataChunk }) + '\n'));
      }
      controller.close();
    }
  });
}
