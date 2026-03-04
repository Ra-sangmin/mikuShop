import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ success: false, error: '타겟 URL이 필요합니다.' }, { status: 400 });
  }

  let browser;

  try {
    // 1. headless: false로 설정하여 내 컴퓨터에 크롬 창이 직접 뜨도록 함 (봇 차단 화면인지 눈으로 확인 가능)
    browser = await puppeteer.launch({ 
      headless: false, 
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,960'] 
    });
    
    const page = await browser.newPage();

    // 2. 사람인 것처럼 브라우저 신분증(User-Agent) 위장
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 960 });

    // 3. 페이지 접속 (네트워크가 조용해질 때까지 대기)
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // 4. 타임아웃을 10초 -> 30초(30000ms)로 증가
    await page.waitForSelector('li[data-testid="item-cell"]', { timeout: 30000 });

    const html = await page.content();
    const $ = cheerio.load(html);
    const items: any[] = [];

    $('li[data-testid="item-cell"]').each((index, element) => {
      const link = $(element).find('a').attr('href');
      const itemId = link ? link.split('/').pop() : null; 
      const imageUrl = $(element).find('img').attr('src');
      const title = $(element).find('span[data-testid="thumbnail-item-name"]').text().trim();
      const priceText = $(element).find('.merPrice').text().trim(); 
      const priceJpy = parseInt(priceText.replace(/[^0-9]/g, ''), 10); 

      if (itemId && title && priceJpy) {
        items.push({
          id: itemId,
          title: title,
          price_jpy: priceJpy,
          url: `https://jp.mercari.com${link}`,
          image_url: imageUrl || ''
        });
      }
    });

    await browser.close();

    return NextResponse.json({ success: true, count: items.length, data: items });

  } catch (error) {
    console.error("크롤링 에러 상세:", error);
    if (browser) await browser.close();
    
    // 에러 메시지를 프론트엔드로 전달하여 원인 파악
    return NextResponse.json({ 
      success: false, 
      error: '데이터 추출 실패. 봇 차단 화면이 떴거나 로딩이 너무 깁니다.',
      details: String(error)
    }, { status: 500 });
  }
}