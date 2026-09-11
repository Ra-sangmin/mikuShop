import { NextResponse, NextRequest } from 'next/server';
import { fetchDetailWithCache, DetailReadiness } from '@/lib/crawler/detailScraper';
import { createTtlCache } from '@/lib/crawler/ttlCache';

// 🚀 [속도 개선] 같은 상품을 다시 열어볼 때 매번 다시 스크래핑하지 않도록 짧은 TTL로 캐싱합니다.
const detailCache = createTtlCache<any>(5 * 60_000, 200);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get('itemId');

  if (!itemId) return NextResponse.json({ success: false, error: 'ID 필요' }, { status: 400 });

  const targetUrl = `https://auctions.yahoo.co.jp/jp/auction/${itemId}`;

  const result = await fetchDetailWithCache({
    itemId,
    targetUrl,
    cache: detailCache,
    gotoTimeoutMs: 20000,
    waitReady: page => checkReady(page),
    parse: ($) => parseYahooAuctionItem($, itemId, targetUrl),
  });

  if (!result.success) {
    console.error(`❌ [${itemId}] 야후 상세 수집 오류:`, result.error);
    return NextResponse.json({ success: false, error: result.error }, { status: result.status ?? 500 });
  }

  return NextResponse.json({ success: true, data: result.data });
}

async function checkReady(page: any): Promise<DetailReadiness> {
  try {
    await page.waitForSelector('#itemTitle, .sc-1f0603b0-2', { timeout: 10000 });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, status: 500, error: err.message };
  }
}

function parseYahooAuctionItem($: any, itemId: string, targetUrl: string) {
  // --- 💰 기본 정보 파싱 ---
  // 🌟 야후 옥션이 styled-components 해시 클래스(.sc-...)를 걷어내고 유틸리티 클래스로
  // 개편하면서 기존 선택자가 전부 매칭 0건이 되어, 현재가/입찰수/남은 시간이 항상
  // 비어있는 값(0, "경매 종료")으로 표시되던 버그가 있었습니다. aria-label 아이콘
  // 기준으로 가장 가까운 컨테이너를 찾는 방식으로 교체합니다(아이콘의 aria-label은
  // 해시 클래스보다 훨씬 안정적으로 유지됩니다).
  const currentPrice = $('.fs_3xlarge').first().text().replace(/[^0-9]/g, '');
  const timeStack = $('svg[aria-label="時間"]').parent();
  const bidCount = $('svg[aria-label="入札"]').parent().text().replace(/[^0-9]/g, '') || '0';
  const timeLeft = timeStack.find('span').first().text().trim();
  const endSchedule = timeStack.find('span[class*="colorTextGray"]').text().trim();

  // --- 📸 이미지 갤러리 ---
  const images: string[] = [];
  $('.slick-track img').each((_: any, el: any) => {
    const src = $(el).attr('src');
    if (src && !images.includes(src)) images.push(src);
  });

  // --- 🔨 [핵심] 상세 정보 표 데이터 파싱 ---
  const details: any = {};

  // 1. dl > dt, dd 형식 파싱 (상품 상태, 개수, 출품지역 등)
  $('dl dt').each((_: any, el: any) => {
    const label = $(el).text().trim();
    const dd = $(el).next('dd');
    const value = dd.text().trim();

    if (label.includes('ブランド')) {
      details.brand = value.replace('詳細', '').trim();
      const brandHref = dd.find('a').attr('href');
      if (brandHref) {
        details.brandUrl = brandHref.startsWith('http')
          ? brandHref
          : `https://auctions.yahoo.co.jp${brandHref}`;
      }
    }

    if (label.includes('送料')) {
      details.shippingFeeText = value;
      details.shippingPayer = value.includes('出品者') ? '출품자(무료)' : '낙찰자 부담';
    }

    if (label.includes('商品の状態')) details.condition = value;
    if (label.includes('個数')) details.quantity = parseInt(value.replace(/[^0-9]/g, ''), 10) || 1;
    if (label.includes('発送元の地域')) details.location = value;
  });

  // 2. table > tr > th, td 형식 파싱 (자동연장, 조기종료, 반품여부, 시작가격 등)
  $('table tr').each((_: any, row: any) => {
    const label = $(row).find('th').text().trim();
    const value = $(row).find('td').text().trim();

    if (label.includes('早期終了')) details.earlyFinish = value.includes('あり');
    if (label.includes('自動延長')) details.autoExtension = value.includes('あり');

    if (label.includes('返品')) details.returnPolicy = value;
    if (label.includes('入札者評価制限') || label.includes('入札者制限')) details.bidRestriction = value;
    if (label.includes('開始時の価格') || label.includes('開始価格')) details.startPrice = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
  });

  const sellerUrl = $('#sellerInfo a[href^="https://auctions.yahoo.co.jp/seller/"]').attr('href') || '';
  const sellerRatingUrl = $('#sellerInfo a[href*="/show/rating"]').attr('href') || '';

  return {
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

    condition: details.condition || '중고',
    returnPolicy: details.returnPolicy || '반품 불가',
    bidRestriction: details.bidRestriction || '없음',
    earlyFinish: details.earlyFinish || false,
    autoExtension: details.autoExtension || false,
    location: details.location || '-',
    quantity: details.quantity || 1,
    startPrice: details.startPrice || 0,

    seller: $('.sc-959f324f-12 a, .Seller__name').text().trim(),
    sellerUrl: sellerUrl,
    sellerRating: $('.sc-959f324f-7 a, .Seller__ratingScore').text().trim().replace(/[^0-9]/g, ''),
    sellerRatingUrl: sellerRatingUrl,

    brand: details.brand || "Generic",
    brandUrl: details.brandUrl || "",
    shippingPayer: details.shippingPayer || "낙찰자 부담",
    shippingFeeInfo: details.shippingFeeText || "[원문] 참조",
  };
}
