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
      // 🚀 3. 브라우저 재사용 로직: 없으면 새로 켜고, 있으면 그대로 씁니다.
      if (!sharedBrowser || !sharedBrowser.connected) {
        sharedBrowser = await puppeteer.launch({ 
          headless: true, 
          args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
      }

      const page = await sharedBrowser.newPage();
      // 차단 방지를 위한 UserAgent 설정
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

      const targetUrl = `https://jp.mercari.com/item/${itemId}`;
      
      // 🚀 4. 실제 수집 수행
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForSelector('[data-testid="item-detail-container"]', { timeout: 10000 });

      const html = await page.content();
      const $ = cheerio.load(html);

      // 💡 2. 기타 상세 정보 추출
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

      // 💡 최종 데이터 구조화
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
    console.error("수집 에러:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}