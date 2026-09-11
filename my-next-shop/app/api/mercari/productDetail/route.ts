import { NextResponse, NextRequest } from 'next/server';
import { fetchDetailWithCache, DetailReadiness } from '@/lib/crawler/detailScraper';
import { createTtlCache } from '@/lib/crawler/ttlCache';

// 🚀 [속도 개선] 같은 상품을 다시 열어볼 때 매번 다시 스크래핑하지 않도록 짧은 TTL로 캐싱합니다.
const detailCache = createTtlCache<any>(5 * 60_000, 200);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get('itemId');

  if (!itemId) return NextResponse.json({ success: false, error: 'ID 필요' }, { status: 400 });

  const targetUrl = `https://jp.mercari.com/item/${itemId}`;

  const result = await fetchDetailWithCache({
    itemId,
    targetUrl,
    cache: detailCache,
    gotoTimeoutMs: 20000,
    waitReady: page => checkReady(page),
    parse: ($, page) => parseMercariItem($, itemId, targetUrl),
    isCacheable: data => Boolean(data.name),
  });

  if (!result.success) {
    console.error(`❌ [${itemId}] 수집 에러:`, result.error);
    return NextResponse.json({ success: false, error: result.error, ...result.extra }, { status: result.status ?? 500 });
  }

  return NextResponse.json({ success: true, data: result.data });
}

// 🌟 [핵심] 유연한 대기 및 삭제된 상품/캡챠 예외 처리
async function checkReady(page: any): Promise<DetailReadiness> {
  try {
    // 단일 셀렉터가 아닌 여러 가능성을 열어두고 최대 4초까지 대기합니다.
    // 🚀 [속도 개선] 8초 → 4초로 단축. 정상적인 페이지는 대부분 이 조건을 훨씬 빨리
    // 충족하므로 일반적인 경우엔 체감 속도에 영향이 없고, 유독 느리게 뜨는 페이지에서만
    // 더 빨리 실패 처리됩니다 (막히는 경우가 늘면 이 값을 다시 늘려주세요).
    await page.waitForFunction(() => {
      return document.querySelector('[data-testid="item-detail-container"]') || // 일반 상품
        document.querySelector('[data-testid="item-detail-title"]') || // 타이틀 테스트 id
        document.querySelector('div[data-testid="checkout-button"]') || // 샵 상품 등 다른 뷰
        document.querySelector('h1.heading__a061456a') || // 최소한의 제목 요소
        (document.body.innerText && document.body.innerText.includes('¥')); // 가격이 렌더링 된 경우
    }, { timeout: 4000 });
    return { ok: true };
  } catch (timeoutErr) {
    // 타임아웃 시 화면의 텍스트를 읽어 원인을 분석합니다.
    const pageText = await page.evaluate(() => document.body.innerText);

    if (pageText.includes('商品が見つかりません') || pageText.includes('削除されました') || pageText.includes('この商品は削除されました')) {
      console.warn(`⚠️ 삭제되거나 비공개 처리된 상품입니다.`);
      // 🌟 원래 로직과 동일하게 상태 코드는 200으로 유지합니다 (프론트가 isDeleted 플래그로 판단).
      return { ok: false, status: 200, error: '삭제되거나 존재하지 않는 상품입니다.', extra: { isDeleted: true } };
    }

    // 🚨 캡챠가 뜬 경우 대응 (메루카리는 Datadog 등 봇 방어가 강함)
    if (pageText.includes('Are you a human?') || pageText.includes('Press & Hold')) {
      console.warn(`🚨 캡챠/봇 방어 화면에 걸렸습니다.`);
      return { ok: false, status: 500, error: '시스템 보안에 의해 차단되었습니다. (캡챠 감지)' };
    }

    return { ok: false, status: 500, error: '상품 정보를 분석할 수 없는 페이지입니다.' };
  }
}

function parseMercariItem($: any, itemId: string, targetUrl: string) {
  const condition = $('span[data-testid="商品の状態"]').text().trim();
  const size = $('div[data-testid="item-size-and-brand-container"] p').text().replace('サイズ : ', '').trim();
  const ldJsonScript = $('script[type="application/ld+json"]').html();
  const ldData = ldJsonScript ? JSON.parse(ldJsonScript) : null;
  const productInfo = ldData?.["@graph"]?.find((obj: any) => obj["@type"] === "Product");

  const categories: string[] = [];
  $('[data-testid="item-detail-category"] .merBreadcrumbItem').each((_: any, el: any) => {
    categories.push($(el).text().trim());
  });

  const shippingPayer = $('span[data-testid="配送料の負担"]').text().trim();

  return {
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
}
