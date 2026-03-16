export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

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

function generateMercariTargetUrl(searchParams: URLSearchParams): string {
  const params = new URLSearchParams();
  const categoryId = searchParams.get('category_id') ?? '';
  const keyword = searchParams.get('keyword');
  const sort = searchParams.get('sort') ?? 'created_at:desc';
  const status = searchParams.get('status') ?? 'on_sale';
  const page = searchParams.get('page');

  if (categoryId && categoryId !== '0') params.set('category_id', categoryId);
  if (keyword) params.set('keyword', keyword);
  if (page && page !== '1') params.set('p', (parseInt(page) - 1).toString()); 
  params.set('sort', sort);
  params.set('status', status);

  ['price_min', 'price_max', 'exclude_keyword'].forEach(key => {
    const val = searchParams.get(key);
    if (val) params.set(key, val);
  });

  return `https://jp.mercari.com/search?${params.toString()}`;
}

export async function GET(req: NextRequest) {
  const { signal } = req;
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('category_id');

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

  const stream = new ReadableStream<Uint8Array>({
    async start(controller: any) {
      const encoder = new TextEncoder();
      let apiDataCaptured = false;
      let sentItems = new Set<string>();
      let isStreamClosed = false; // 🚀 스트림 상태 추적 변수 (에러 방지 핵심)
      let page: any = null;

      // 🔌 [중단 로직] 클라이언트가 연결을 끊으면 즉시 자원 해제
      const abortHandler = async () => {
        console.log("🔌 [SIGNAL] 클라이언트 연결 끊김 -> 자원 해제");
        isStreamClosed = true;
        try {
          if (page) await page.close().catch(() => {});
        } catch (e) {}
      };
      signal.addEventListener('abort', abortHandler);

      try {
        if (!sharedBrowser || !sharedBrowser.connected) {
          sharedBrowser = await puppeteer.launch({ 
            headless: true, 
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
          });
        }
        
        page = await sharedBrowser.newPage();
        await page.setViewport({ width: 1280, height: 3000 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        await page.setRequestInterception(true);
        page.on('request', (r: any) => ['image', 'font', 'media'].includes(r.resourceType()) ? r.abort() : r.continue());

        // ⚡ [최적화 3] API 낚시
        page.on('response', async (response: any) => {
          if (isStreamClosed || signal.aborted) return;
          const url = response.url();
          if (url.includes('api/v1/search') || url.includes('search_index')) {
            try {
              const json = await response.json();
              const rawItems = json.items || [];
              if (rawItems.length > 0 && !apiDataCaptured) {
                apiDataCaptured = true;
                const items: MercariItem[] = rawItems.map((item: any) => ({
                  id: item.id, name: item.name, thumbnail: item.thumbnails[0] || '',
                  price: parseInt(item.price, 10),
                  status: (item.status === 'on_sale' || item.status === 'trading') ? 'on_sale' : 'sold_out',
                  url: `https://jp.mercari.com/item/${item.id}`
                }));
                const newItems = items.filter((item: MercariItem) => !sentItems.has(item.id));
                if (newItems.length > 0 && !isStreamClosed) {
                  newItems.forEach((item: any) => sentItems.add(item.id));
                  controller.enqueue(encoder.encode(JSON.stringify({ success: true, data: newItems }) + '\n'));
                  controller.enqueue(encoder.encode(' '.repeat(2048) + '\n')); 
                  console.log(`✅ [API 낚시 성공] ${newItems.length}개 전송`);
                }
              }
            } catch (e) {}
          }
        });

        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});

        // ⚡ [최적화 4] 병렬 감시
        let isDomReady = false;
        for (let i = 0; i < 25; i++) {
          if (apiDataCaptured || isStreamClosed || signal.aborted) break;
          const count = await page.evaluate(() => document.querySelectorAll('[data-testid="item-cell"]').length).catch(() => 0);
          if (count >= 10) { isDomReady = true; break; }
          await new Promise(r => setTimeout(r, 100));
        }

        // ⚡ [최적화 5] 선발대 즉시 추출
        if (!apiDataCaptured && isDomReady && !isStreamClosed) {
          const initialItems = await page.evaluate(() => {
            const cells = Array.from(document.querySelectorAll('[data-testid="item-cell"]'));
            return cells.slice(0, 15).map(el => {
              const link = el.querySelector('a')?.getAttribute('href') || '';
              const imgEl = el.querySelector('img');
              return {
                id: link.split('/').pop() || '',
                name: imgEl?.getAttribute('alt') || '상품명 없음',
                thumbnail: imgEl?.src || '',
                price: parseInt(el.querySelector('[class*="number"]')?.textContent?.replace(/[^0-9]/g, '') || '0', 10),
                status: el.innerHTML.includes('売り切れ') ? 'sold_out' : 'on_sale',
                url: `https://jp.mercari.com${link}`
              };
            });
          }).catch(() => []);

          const newItems = initialItems.filter((item: any) => item.id && item.price > 0 && !sentItems.has(item.id));
          if (newItems.length > 0 && !isStreamClosed) {
            newItems.forEach((item: any) => sentItems.add(item.id));
            controller.enqueue(encoder.encode(JSON.stringify({ success: true, data: newItems }) + '\n'));
            console.log(`✅ [선발대 성공] ${newItems.length}개 즉시 전송`);
          }
        }

        // ⚡ [최적화 6] 본대 순차 수집 (130개 목표 / 2회 조기종료 모드)
        let attempt = 0;
        let consecutiveEmpty = 0;
        const targetTotal = 130;

        while (attempt < 35 && sentItems.size < targetTotal) { 
          if (signal.aborted || isStreamClosed) break;
          attempt++;
          
          await page.evaluate(() => {
            window.scrollBy(0, 2500);
            setTimeout(() => window.scrollBy(0, -300), 500); 
          }).catch(() => {});

          const waitTime = sentItems.size > 80 ? 4000 : 3000; 
          await new Promise(r => setTimeout(r, waitTime)); 

          await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const moreBtn = buttons.find(b => b.textContent?.includes('さらに表示') || b.textContent?.includes('Show more'));
            if (moreBtn) (moreBtn as any).click();
          }).catch(() => {});

          if (isStreamClosed || signal.aborted) break;

          const domItems = await page.evaluate(() => {
            const cells = Array.from(document.querySelectorAll('[data-testid="item-cell"]'));
            return cells.slice(-150).map(el => {
              const link = el.querySelector('a')?.getAttribute('href') || '';
              const imgEl = el.querySelector('img');
              return {
                id: link.split('/').pop() || '',
                name: imgEl?.getAttribute('alt') || '상품명 없음',
                thumbnail: imgEl?.src || '',
                price: parseInt(el.querySelector('[class*="number"]')?.textContent?.replace(/[^0-9]/g, '') || '0', 10),
                status: el.innerHTML.includes('売り切れ') ? 'sold_out' : 'on_sale',
                url: `https://jp.mercari.com${link}`
              };
            });
          }).catch(() => []);

          const newItems = domItems.filter((item: any) => item.id && item.price > 0 && !sentItems.has(item.id));

          if (newItems.length > 0) {
            consecutiveEmpty = 0; 
            newItems.forEach((item: any) => sentItems.add(item.id));
            
            // 🚀 [설계 포인트 1] 데이터를 15개씩 쪼개는 바구니를 만듭니다.
            const chunkSize = 15; 
            for (let i = 0; i < newItems.length; i += chunkSize) {
              const dataChunk = newItems.slice(i, i + chunkSize);
              
              // 쪼개진 데이터 덩어리를 JSON으로 만들고 줄바꿈(\n)을 붙여 보냅니다.
              const chunkString = JSON.stringify({ success: true, data: dataChunk }) + '\n';
              controller.enqueue(encoder.encode(chunkString));
              
              // 💡 패딩을 데이터 덩어리마다 붙여서 즉시 렌더링을 독촉합니다.
              controller.enqueue(encoder.encode(' '.repeat(1024) + '\n')); 
              
              // 🚀 아주 짧은 대기 시간을 줘서 브라우저가 숫자를 올릴 틈을 줍니다.
              await new Promise(r => setTimeout(r, 10)); 
            }
          } else {
            consecutiveEmpty++;
            console.log(`⚠️ 새로운 상품 없음 (${consecutiveEmpty}/2)`);
            if (consecutiveEmpty >= 2) {
              console.log("🏁 [조기 종료] 새로운 데이터가 없어 수집을 마무리합니다.");
              break; 
            }
          }
        }

      } catch (err: any) {
        console.error(`❌ [ERROR] ${err.message}`);
      } finally {
        signal.removeEventListener('abort', abortHandler);
        if (!isStreamClosed) {
          isStreamClosed = true;
          try {
            if (page) await page.close().catch(() => {});
            controller.close();
          } catch (e) {}
        }
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