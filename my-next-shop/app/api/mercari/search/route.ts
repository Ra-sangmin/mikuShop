export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

const MIN_WAIT_COUNT = 1; // 1개라도 보이면 0.1초도 안 기다리고 즉시 스크래핑 시작!
const CHUNK_SIZE = 5;     // 단, 프론트엔드 화면에는 5개씩 예쁘게 묶어서 전송 (깜빡임 방지)

// 🚀 [설계도] 아이템 형식 정의
interface MercariItem {
  id: string;
  name: string;
  thumbnail: string;
  price: number;
  status: 'on_sale' | 'sold_out';
  url: string;
}

if (!puppeteer.plugins || puppeteer.plugins.length === 0) {
  puppeteer.use(StealthPlugin());
}

let sharedBrowser: any = null;

export async function GET(req: NextRequest) {
  const { signal } = req;
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('category_id');
  const startTime = performance.now();

  if (categoryId === '0') {
    return new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify({ success: true, data: [] }) + '\n'));
        controller.close();
      }
    }), { headers: { 'Content-Type': 'application/x-ndjson' } });
  }

  const targetUrl = generateMercariTargetUrl(searchParams);
  console.log(`\n🏎️ [TURBO MODE] 크롤링 시작: ${targetUrl}`);

  // 분리한 스트림 생성 함수 호출
  const stream = createMercariStream(targetUrl, signal , startTime);

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

export function createMercariStream(targetUrl: string, signal: AbortSignal , startTime: number) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      // 공유 상태 객체 (참조 전달을 위해 객체로 관리)
      const state = { apiDataCaptured: false, isStreamClosed: false };
      const sentItems = new Set<string>();
      let page: any = null;

      const abortHandler = async () => {
        state.isStreamClosed = true;
        if (page) await page.close().catch(() => {});
      };
      signal.addEventListener('abort', abortHandler);

      try {
        // [1] 페이지 초기화 및 API 리스너 부착
        page = await setupPage(signal);
        attachApiListener({ page, signal, state, sentItems, controller, encoder });

        // 🚀 [복구 및 최적화] await는 반드시 있어야 브라우저가 멈추지 않고 일합니다.
        // domcontentloaded로 설정하여 이미지 다운로드는 기다리지 않고 빠르게 통과합니다.
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
        
        // 🚀 [하이브리드 대기 로직 - 궁극의 최적화 버전]
        // Node.js는 API만 감시하고, 브라우저는 DOM만 감시하게 역할을 완벽히 분리합니다.
        const apiPromise = new Promise(resolve => {
          const interval = setInterval(() => {
            if (state.isStreamClosed) {
              clearInterval(interval);
              return resolve(false);
            }
            if (sentItems.size >= MIN_WAIT_COUNT) {
              clearInterval(interval);
              console.log("⚡ [승리 조건 1 달성] API가 먼저 데이터를 낚아챘습니다!");
              return resolve(true);
            }
          }, 50); // 내장 메모리만 검사하므로 50ms 간격이어도 부하가 0입니다.
        });

        const domPromise = page.waitForSelector('[data-testid="item-cell"]', { timeout: 5000 })
          .then(() => {
            console.log("⚡ [승리 조건 2 달성] 화면에 상품이 먼저 렌더링되었습니다!");
            return true;
          })
          .catch(() => false); // 5초 타임아웃 시 에러 내지 않고 조용히 종료

        // API 낚시와 DOM 렌더링 중 누가 더 빠른지 경주(Race)를 시킵니다.
        // 누군가 이기는 순간 즉시 다음 코드로 넘어갑니다! (로그 도배 절대 불가)
        await Promise.race([apiPromise, domPromise]);

        // 🚀 대기가 끝나면 (누가 이겼든 상관없이) 화면에 있는 걸 싹 긁어 프론트로 보냅니다.
        // 메루카리는 첫 페이지 데이터를 HTML에 구워놓기 때문에 이 작업이 꼭 필요합니다.
        const firstScreenItems = await extractItems(page, 150); 
        const capturedFirstCount = await processAndSend(firstScreenItems, sentItems, controller, encoder);
        
        const elapsedTime = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`📡 [초기 수집] ${capturedFirstCount}개 확보 완료! (소요시간: ${elapsedTime}초)`);

        // [5] 본대 무한 스크롤 루프
        let attempt = 0;
        let consecutiveEmpty = 0;
        
        while (attempt < 35 && sentItems.size < 130 && !state.isStreamClosed && !signal.aborted) {
          attempt++;

          try {
              // 🚀 [체크] 페이지가 닫혔는지 혹은 중단되었는지 루프 시작점에서도 확인
              if (state.isStreamClosed || signal.aborted || !page || page.isClosed()) break;
              // 🚀 1. 랜덤 스크롤 (인간처럼)
              const jitter = Math.floor(Math.random() * 500);
              await page.evaluate((j : any) => window.scrollBy(0, 1200 + j), jitter).catch(() => {});

              // 🚀 2. 랜덤 대기 (로봇 패턴 파괴)
              const delay = 1000 + Math.floor(Math.random() * 500);
              await new Promise(r => setTimeout(r, delay));

              // 🚀 3. 가끔 마우스 흔들기
              if (attempt % 5 === 0) {
                await page.mouse.move(Math.random() * 100, Math.random() * 200);
              }
              
              const currentItems = await extractItems(page, 150);
              const addedCount = await processAndSend(currentItems, sentItems, controller, encoder);
              
              if (addedCount > 0) {
                consecutiveEmpty = 0;
                const elapsedTime3 = ((performance.now() - startTime) / 1000).toFixed(2);
                console.log(`✨ [${attempt}회차] ${addedCount}개 추가 (총: ${sentItems.size}개) (소요시간: ${elapsedTime3}초)`);
              } else {
                // 🚀 [핵심 수정] 새로운 아이템이 없을 때, 종료 조건 정밀 검사
                const isEndOfPage = await page.evaluate(() => {
                  const bodyText = document.body.innerText;
                  // 1. "관련 광고" 텍스트가 존재하는가?
                  const hasRelatedAds = bodyText.includes('他のサイトの関連広告') || bodyText.includes('다른 사이트의 관련 광고');
                  
                  // 2. "다음(次へ)" 버튼이 화면에 보이는가? (빨간 테두리 버튼 찾기)
                  const nextButton = Array.from(document.querySelectorAll('a, button')).find(el => 
                    el.textContent?.includes('次へ') || el.textContent?.includes('다음')
                  );

                  // 광고 섹션이 있거나, 다음 버튼이 나타났다면 "진짜 끝"
                  return hasRelatedAds || !!nextButton;
                });

                if (isEndOfPage) {
                  console.log("🏁 [종료 신호 포착] 광고 섹션 또는 '다음' 버튼에 도달했습니다. 루프를 종료합니다!");
                  break; 
                }

                // 위 조건은 아니지만 계속 데이터가 없다면 안전을 위해 2회 후 종료
                if (++consecutiveEmpty >= 2) {
                  console.log("⚠️ 연속 데이터 없음으로 인한 종료");
                  break;
                }
              }
          } catch (err: any) {
            // 🚀 Detached Frame 에러나 Page Closed 에러가 나면 조용히 루프를 나갑니다.
            if (err.message.includes('detached') || err.message.includes('closed')) {
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
        if (!state.isStreamClosed) {
          state.isStreamClosed = true;
          if (page) await page.close().catch(() => {});
          controller.close();
        }
      }
    }
  });
}

async function extractItems(page: any, limit: number = 150): Promise<MercariItem[]> {
  return await page.evaluate((limit: number) => {
    const cells = Array.from(document.querySelectorAll('[data-testid="item-cell"]'));
    // slice(-limit) 이나 slice(0, limit) 대신 전체를 가져와서 
    // processAndSend의 중복 제거 로직에 맡기는 게 가장 안전합니다.
    return cells.map(el => {
      const anchor = el.querySelector('a');
      const link = anchor?.getAttribute('href') || '';
      const imgEl = el.querySelector('img');
      
      // ID 추출 로직 강화 (경로에서 m으로 시작하는 ID를 정확히 추출)
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
    }).filter(item => item.id); // ID가 없는 쓰레기 데이터는 미리 제외
  }, limit).catch(() => []);
}

async function processAndSend(
  newRawItems: MercariItem[],
  sentItems: Set<string>,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
  ) {
    const filtered = newRawItems.filter(item => item.id && item.price > 0 && !sentItems.has(item.id));
    if (filtered.length === 0) return 0;

    const chunkSize = CHUNK_SIZE;

    for (let i = 0; i < filtered.length; i += chunkSize) {
      const dataChunk = filtered.slice(i, i + chunkSize);
      dataChunk.forEach(item => sentItems.add(item.id));

      const chunkString = JSON.stringify({ success: true, data: dataChunk }) + '\n';
      controller.enqueue(encoder.encode(chunkString));
      controller.enqueue(encoder.encode(' '.repeat(1024) + '\n')); // 브라우저 렌더링 독촉
      
      await new Promise(r => setTimeout(r, 10)); // 렌더링 틈 주기
    }
    return filtered.length;
}

async function setupPage(signal: AbortSignal) {
  if (!sharedBrowser || !sharedBrowser.connected) {
    sharedBrowser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage',
      // 🌟 [핵심 최적화] 크롬 터보 옵션 추가
      '--disable-accelerated-2d-canvas', // 캔버스 렌더링 끄기
      '--disable-gpu',                   // GPU 하드웨어 가속 끄기 (서버에선 필요 없음)
      '--disable-extensions',            // 확장 프로그램 완전 차단
      '--blink-settings=imagesEnabled=false', // 블링크 엔진 단에서 이미지 로드 차단
      '--disable-background-timer-throttling', // 백그라운드 탭 속도 제한 풀기
      '--disable-renderer-backgrounding' // 렌더러 우선순위 낮추지 않음
    ]
  });
  }
  const page = await sharedBrowser.newPage();
  
  if (signal.aborted) {
    await page.close();
    throw new Error('Aborted');
  }

  await page.setViewport({ width: 1280, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  // 이미지 등 불필요한 리소스 차단
  await page.setRequestInterception(true);
  page.on('request', (req: any) => {
    const resourceType = req.resourceType();
    const url = req.url();

    // 차단 목록 확장
    if (
      ['image', 'font', 'media', 'stylesheet'].includes(resourceType) || 
      url.includes('google-analytics') || 
      url.includes('facebook') || 
      url.includes('ad-delivery') ||
      url.includes('sentry.io') || // 에러 수집만 정확히 차단
      url.includes('karte')        // 마케팅 툴
    ) {

      // 이미 처리된 요청인지 확인 후 차단 (에러 방지용)
      if (!req.isInterceptResolutionHandled()) {
        req.abort();
      }

    } else {
      if (!req.isInterceptResolutionHandled()) {
        req.continue();
      }
    }
  });

  return page;
}

function attachApiListener(params: {
  page: any,
  signal: AbortSignal,
  state: { apiDataCaptured: boolean, isStreamClosed: boolean },
  sentItems: Set<string>,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
}) {
  const { page, signal, state, sentItems, controller, encoder } = params;

  page.on('response', async (response: any) => {
    if (state.isStreamClosed || signal.aborted || state.apiDataCaptured) return;

    const url = response.url();
    if (url.includes('api/v1/search') || url.includes('search_index')) {
      try {
        const json = await response.json().catch(() => ({}));
        const rawItems = json.items || [];

        if (rawItems.length > 0) {
          const mappedItems: MercariItem[] = rawItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            thumbnail: item.thumbnails?.[0] || '',
            price: parseInt(item.price, 10),
            status: (item.status === 'on_sale' || item.status === 'trading') ? 'on_sale' : 'sold_out',
            url: `https://jp.mercari.com/item/${item.id}`
          }));

          const sentCount = await processAndSend(mappedItems, sentItems, controller, encoder);
          if (sentCount > 0) {
            state.apiDataCaptured = true;
            console.log(`✅ [API 낚시 성공] ${sentCount}개 전송`);
          }
        }
      } catch (e) {}
    }
  });
}