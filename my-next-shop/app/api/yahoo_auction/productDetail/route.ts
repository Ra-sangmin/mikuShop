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

    // 핵심 요소 대기
    await page.waitForSelector('#itemTitle, .sc-1f0603b0-2', { timeout: 10000 });

    const html = await page.content();
    const $ = load(html);

    // --- 💰 기본 정보 파싱 ---
    const currentPrice = $('.sc-1f0603b0-2').first().text().replace(/[^0-9]/g, '');
    const bidCount = $('.sc-6162f90d-2').filter((_, el) => $(el).find('svg[aria-label="入札"]').length > 0).text().replace(/[^0-9]/g, '') || '0';
    const timeLeft = $('.sc-6162f90d-2').filter((_, el) => $(el).find('svg[aria-label="時間"]').length > 0).find('span').first().text().trim();
    const endSchedule = $('.sc-6162f90d-2').find('span[class*="gv-u-colorTextGray"]').text().trim();

    // --- 📸 이미지 갤러리 ---
    const images: string[] = [];
    $('.slick-track img').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !images.includes(src)) images.push(src);
    });

    // --- 🔨 [핵심] 상세 정보 표 데이터 파싱 ---
    const details: any = {};
    
    // 1. dl > dt, dd 형식 파싱 (상품 상태, 개수, 출품지역 등)
    $('dl dt').each((_, el) => {
      const label = $(el).text().trim();
      const dd = $(el).next('dd');
      const value = dd.text().trim();

      // 브랜드 추출
      if (label.includes('ブランド')) {
        details.brand = value.replace('詳細', '').trim();
        // 브랜드 상세 링크(href) 추출
        const brandHref = dd.find('a').attr('href');
        if (brandHref) {
          // 상대 경로일 경우 절대 경로로 변환
          details.brandUrl = brandHref.startsWith('http') 
            ? brandHref 
            : `https://auctions.yahoo.co.jp${brandHref}`;
        }
      }
      
      // 배송료 관련 (送料)
      if (label.includes('送料')) {
        details.shippingFeeText = value; // 예: "東京都는 1,440엔"
        // 배송료 부담자 판단 (원문에서 '출품자 부담' 혹은 '낙찰자 부담' 추출)
        // 보통 상세 페이지 상단이나 배송정보 섹션에 '출품자 부담(出品者負担)' 문구가 있습니다.
        details.shippingPayer = value.includes('出品者') ? '출품자(무료)' : '낙찰자 부담';
      }
      
      if (label.includes('商品の状態')) details.condition = value;
      if (label.includes('個数')) details.quantity = parseInt(value.replace(/[^0-9]/g, ''), 10) || 1;
      if (label.includes('発送元の地域')) details.location = value;
    });

    // 2. table > tr > th, td 형식 파싱 (자동연장, 조기종료, 반품여부, 시작가격 등)
    $('table tr').each((_, row) => {
      const label = $(row).find('th').text().trim();
      const value = $(row).find('td').text().trim();

      // 'あり(있음)'가 포함되어 있으면 true, 아니면 false로 정확히 매핑
      if (label.includes('早期終了')) details.earlyFinish = value.includes('あり');
      if (label.includes('自動延長')) details.autoExtension = value.includes('あり');
      
      if (label.includes('返品')) details.returnPolicy = value;
      if (label.includes('入札者評価制限') || label.includes('入札者制限')) details.bidRestriction = value;
      if (label.includes('開始時の価格') || label.includes('開始価格')) details.startPrice = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
    });

    const sellerUrl = $('#sellerInfo a[href^="https://auctions.yahoo.co.jp/seller/"]').attr('href') || '';
    const sellerRatingUrl = $('#sellerInfo a[href*="/show/rating"]').attr('href') || '';

    const data = {
      id: itemId,
      name: $('#itemTitle h1, .sc-409995be-3').text().trim(),
      price: parseInt(currentPrice, 10),
      bidCount: parseInt(bidCount, 10),
      timeLeft: timeLeft,
      endSchedule: endSchedule,
      description: $('#description .gtAvGj, .sc-409995be-0').html()?.trim(),
      images: images,
      thumbnail: images[0] || '',
      url: targetUrl,
      platform: 'yahoo_auction',
      
      // --- 추출한 상세 데이터 안전하게 할당 ---
      condition: details.condition || '중고',
      returnPolicy: details.returnPolicy || '반품 불가',
      bidRestriction: details.bidRestriction || '없음',
      earlyFinish: details.earlyFinish || false,
      autoExtension: details.autoExtension || false,
      location: details.location || '-',
      quantity: details.quantity || 1,
      startPrice: details.startPrice || 0,
      
      // --- 👤 판매자 정보 및 링크 할당 ---
      seller: $('.sc-959f324f-12 a, .Seller__name').text().trim(),
      sellerUrl: sellerUrl,
      sellerRating: $('.sc-959f324f-7 a, .Seller__ratingScore').text().trim().replace(/[^0-9]/g, ''),
      sellerRatingUrl: sellerRatingUrl,

      brand: details.brand || "Generic",
      brandUrl: details.brandUrl || "", 
      shippingPayer: details.shippingPayer || "낙찰자 부담",
      shippingFeeInfo: details.shippingFeeText || "[원문] 참조",

    };

    await page.close();
    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error("야후 상세 수집 오류:", error.message);
    if (sharedBrowser) {
        const pages = await sharedBrowser.pages();
        for (const p of pages) await p.close();
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}