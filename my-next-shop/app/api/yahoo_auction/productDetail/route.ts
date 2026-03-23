import { NextResponse, NextRequest } from 'next/server';
import puppeteer, { Browser } from 'puppeteer';
import { load } from 'cheerio';

let sharedBrowser: Browser | null = null;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get('itemId');

  if (!itemId) return NextResponse.json({ success: false, error: 'ID 필요' }, { status: 400 });

  try {
    if (!sharedBrowser || !sharedBrowser.connected) {
      sharedBrowser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
      });
    }

    const page = await sharedBrowser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    const targetUrl = `https://auctions.yahoo.co.jp/jp/auction/${itemId}`;
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // 🚀 핵심 요소가 나타날 때까지 대기
    await page.waitForSelector('#itemTitle, .sc-1f0603b0-2', { timeout: 10000 });

    const html = await page.content();
    const $ = load(html);

    // --- 💰 실시간 금액 파싱 ---
    // 캡처 이미지의 "8,500원"에 해당하는 일본어 원문 가격 추출
    const currentPrice = $('.sc-1f0603b0-2').first().text().replace(/[^0-9]/g, '');
    
    // --- 🔨 입찰수 파싱 ---
    // 망치 아이콘 옆의 숫자 추출
    const bidCount = $('.sc-6162f90d-2').filter((_, el) => $(el).find('svg[aria-label="入札"]').length > 0).text().replace(/[^0-9]/g, '') || '0';

    // --- ⏳ 남은 시간 파싱 ---
    // 시계 아이콘 옆의 "1日", "3시간" 등 텍스트 추출
    const timeLeft = $('.sc-6162f90d-2').filter((_, el) => $(el).find('svg[aria-label="時間"]').length > 0).find('.gv-u-fontSize16--_aSkEz8L_OSLLKFaubKB').text().trim();
    
    // --- 🏁 경매 종료 예정 시간 ---
    const endSchedule = $('.sc-6162f90d-2').find('span[class*="gv-u-colorTextGray"]').text().trim();

    // --- 📸 이미지 갤러리 ---
    const images: string[] = [];
    $('.slick-track img').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !images.includes(src)) images.push(src);
    });

    const data = {
      id: itemId,
      name: $('#itemTitle h1').text().trim(),
      price: parseInt(currentPrice, 10),
      bidCount: parseInt(bidCount, 10),
      timeLeft: timeLeft,      // "1日", "3시간" 등
      endSchedule: endSchedule, // "3월 24일 22시 51분 종료 예정"
      description: $('#description .gtAvGj').html()?.trim(),
      images: images,
      thumbnail: images[0] || '',
      condition: $('.sc-6162f90d-3').text().trim(),
      seller: $('.sc-959f324f-12 a').text().trim(),
      sellerRating: $('.sc-959f324f-7 a').text().trim(),
      url: targetUrl,
      platform: 'yahoo_auction'
    };

    await page.close();
    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error("야후 상세 수집 오류:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}