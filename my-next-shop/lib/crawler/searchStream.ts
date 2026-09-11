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
  /** (선택) 검색 API 응답을 직접 가로채 더 빨리 데이터를 낚아채는 플랫폼용 */
  apiListener?: {
    matchesUrl: (url: string) => boolean;
    mapResponseItems: (json: any) => TItem[];
  };
  maxAttempts?: number;
  maxItems?: number;
  minWaitCount?: number;
  chunkSize?: number;
}

export function createSearchStream<TItem>(options: SearchStreamOptions<TItem>): ReadableStream<Uint8Array> {
  const {
    targetUrl, signal, startTime, cache,
    domReadySelector, extractItems, extractItemsAndCheckEnd,
    isValidItem, getItemId, apiListener,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    maxItems = DEFAULT_MAX_ITEMS,
    minWaitCount = DEFAULT_MIN_WAIT_COUNT,
    chunkSize = DEFAULT_CHUNK_SIZE,
  } = options;

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const state = { apiDataCaptured: false, isStreamClosed: false };
      const sentItems = new Set<string>();
      // 🚀 이번 검색에서 실제로 전송한 아이템을 모아뒀다가, 스크래핑이 끝나면 캐시에 저장해
      // 다음 번 같은 검색은 재스크래핑 없이 즉시 응답할 수 있게 합니다.
      const collectedItems: TItem[] = [];
      let page: any = null;

      const processAndSend = async (rawItems: TItem[]): Promise<number> => {
        const filtered = rawItems.filter(item => isValidItem(item) && !sentItems.has(getItemId(item)));
        if (filtered.length === 0) return 0;

        for (let i = 0; i < filtered.length; i += chunkSize) {
          const dataChunk = filtered.slice(i, i + chunkSize);
          dataChunk.forEach(item => sentItems.add(getItemId(item)));
          collectedItems.push(...dataChunk);

          controller.enqueue(encoder.encode(JSON.stringify({ success: true, data: dataChunk }) + '\n'));
          controller.enqueue(encoder.encode(' '.repeat(1024) + '\n')); // 브라우저 렌더링 독촉
          await new Promise(r => setTimeout(r, 10)); // 렌더링 틈 주기
        }
        return filtered.length;
      };

      const abortHandler = async () => {
        state.isStreamClosed = true;
        if (page) await page.close().catch(() => {});
      };
      signal.addEventListener('abort', abortHandler);

      try {
        // [1] 페이지 초기화 및 (선택적) API 리스너 부착
        // 🌟 원래 검색 라우트들이 명시적으로 1280x1080 뷰포트를 썼으므로 동일하게 맞춥니다.
        page = await createPage({ viewport: { width: 1280, height: 1080 } });

        if (apiListener) {
          page.on('response', async (response: any) => {
            if (state.isStreamClosed || signal.aborted || state.apiDataCaptured) return;
            if (!apiListener.matchesUrl(response.url())) return;
            try {
              const json = await response.json().catch(() => ({}));
              const mapped = apiListener.mapResponseItems(json);
              if (mapped.length > 0) {
                const sentCount = await processAndSend(mapped);
                if (sentCount > 0) {
                  state.apiDataCaptured = true;
                  console.log(`✅ [API 낚시 성공] ${sentCount}개 전송`);
                }
              }
            } catch (e) {}
          });
        }

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
        const capturedFirstCount = await processAndSend(firstScreenItems);

        const elapsedTime = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`📡 [초기 수집] ${capturedFirstCount}개 확보 완료! (소요시간: ${elapsedTime}초)`);

        // [5] 본대 무한 스크롤 루프
        let attempt = 0;
        let consecutiveEmpty = 0;

        while (attempt < maxAttempts && sentItems.size < maxItems && !state.isStreamClosed && !signal.aborted) {
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
            const addedCount = await processAndSend(currentItems);

            if (addedCount > 0) {
              consecutiveEmpty = 0;
              const elapsedTime3 = ((performance.now() - startTime) / 1000).toFixed(2);
              console.log(`✨ [${attempt}회차] ${addedCount}개 추가 (총: ${sentItems.size}개) (소요시간: ${elapsedTime3}초)`);
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
      } catch (err) {
        console.error("Stream Error:", err);
      } finally {
        signal.removeEventListener('abort', abortHandler);
        // 🚀 중간에 취소(abort)되지 않았다면 이번 결과를 캐시에 저장합니다.
        if (!signal.aborted && collectedItems.length > 0) {
          cache.set(targetUrl, collectedItems);
        }
        if (!state.isStreamClosed) {
          state.isStreamClosed = true;
          if (page) await page.close().catch(() => {});
          controller.close();
        }
      }
    }
  });
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
