import { NextResponse, NextRequest } from 'next/server';
import puppeteer, { Browser } from 'puppeteer';
import * as cheerio from 'cheerio';

// 🚀 1. 전역 변수: 브라우저 인스턴스와 마지막 실행 시간을 서버 메모리에 유지
let sharedBrowser: Browser | null = null;
let lastRequestTime = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get('itemId');

  if (!itemId) return NextResponse.json({ success: false, error: 'ID 필요' }, { status: 400 });
  
  // 요청 시작 시점에 타임스탬프 갱신 (대기 직후)
  lastRequestTime = Date.now();

  try {
      // 🚀 2. 브라우저 재사용 로직: 없으면 새로 켜고, 있으면 그대로 씁니다.
      if (!sharedBrowser || !sharedBrowser.connected) {
        sharedBrowser = await puppeteer.launch({ 
          headless: true, 
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] 
        });
      }

      const page = await sharedBrowser.newPage();
      
      // 🚀 [추가] 상세 페이지 로딩 속도 최적화 (이미지, CSS, 폰트 차단)
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) {
          request.abort();
        } else {
          request.continue();
        }
      });

      // 차단 방지를 위한 UserAgent 설정
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

      const targetUrl = `https://jp.mercari.com/item/${itemId}`;
      
      // 🚀 3. 실제 수집 수행 (페이지 이동)
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      
      // 🚀 [핵심 수정] 유연한 대기 및 삭제된 상품 예외 처리
      try {
        // 단일 셀렉터가 아닌 여러 가능성을 열어두고 최대 8초까지 대기합니다.
        // 그리고 Next.js 앱 등에서는 id=__next 요소 하위의 변화를 감지할 필요가 있음
        await page.waitForFunction(() => {
          return document.querySelector('[data-testid="item-detail-container"]') || // 일반 상품
                 document.querySelector('[data-testid="item-detail-title"]') || // 타이틀 테스트 id
                 document.querySelector('div[data-testid="checkout-button"]') || // 샵 상품 등 다른 뷰
                 document.querySelector('h1.heading__a061456a') || // 최소한의 제목 요소 
                 (document.body.innerText && document.body.innerText.includes('¥')); // 가격이 렌더링 된 경우
        }, { timeout: 8000 });
      } catch (timeoutErr) {
        // 8초 내에 핵심 요소가 안 뜨면 화면의 텍스트를 읽어 원인을 분석합니다.
        const pageText = await page.evaluate(() => document.body.innerText);
        
        if (pageText.includes('商品が見つかりません') || pageText.includes('削除されました') || pageText.includes('この商品は削除されました')) {
          console.warn(`⚠️ [${itemId}] 삭제되거나 비공개 처리된 상품입니다.`);
          await page.close();
          return NextResponse.json({ success: false, error: "삭제되거나 존재하지 않는 상품입니다.", isDeleted: true });
        }
        
        // 🚨 캡챠가 뜬 경우 대응 (메루카리는 Datadog 등 봇 방어가 강함)
        if (pageText.includes('Are you a human?') || pageText.includes('Press & Hold')) {
            console.warn(`🚨 [${itemId}] 캡챠/봇 방어 화면에 걸렸습니다.`);
            await page.close();
            return NextResponse.json({ success: false, error: "시스템 보안에 의해 차단되었습니다. (캡챠 감지)" }, { status: 500 });
        }

        console.error(`❌ [${itemId}] 상세 페이지 구조 인식 실패 (타임아웃)`);
        await page.close();
        return NextResponse.json({ success: false, error: "상품 정보를 분석할 수 없는 페이지입니다." }, { status: 500 });
      }

      // 💡 4. 정상 로드 시 기존 Cheerio 추출 로직 그대로 수행
      const html = await page.content();
      const $ = cheerio.load(html);

      // 기타 상세 정보 추출
      const condition = $('span[data-testid="商品の状態"]').text().trim();
      const size = $('div[data-testid="item-size-and-brand-container"] p').text().replace('サイズ : ', '').trim();
      const ldJsonScript = $('script[type="application/ld+json"]').html();
      const ldData = ldJsonScript ? JSON.parse(ldJsonScript) : null;
      const productInfo = ldData?.["@graph"]?.find((obj: any) => obj["@type"] === "Product");
      
      const categories: string[] = [];
      $('[data-testid="item-detail-category"] .merBreadcrumbItem').each((_, el) => {
        categories.push($(el).text().trim());
      });

      const shippingPayer = $('span[data-testid="配送料の負担"]').text().trim();

      // 최종 데이터 구조화
      const data = {
        id: itemId,
        name: productInfo?.name || $('h1[class*="heading"]').text().trim(),
        price: productInfo?.offers?.price || parseInt($('[data-testid="price"] span').last().text().replace(/[^0-9]/g, ''), 10),
        description: productInfo?.description || $('pre[data-testid="description"]').text().trim(),
        images: productInfo?.image || [], 
        thumbnail: productInfo?.image?.[0] || '',
        condition: condition,
        size: size,
        categories: categories,
        shippingPayer: shippingPayer,
        url: targetUrl,
        status: $('div:contains("売り切れ")').length > 0 ? 'sold_out' : 'on_sale'
      };

      await page.close();

      return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error(`❌ 수집 에러 [${itemId}]:`, error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}