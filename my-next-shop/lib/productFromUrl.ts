// 🛍️ 손님이 붙여넣은 상품 주소에서 이름·가격·사진을 꺼냅니다.
//
// 구매대행 신청 화면(/purchase/request 등)에서 씁니다. 손님이 주소만 넣으면
// 나머지 칸을 대신 채워 주는 용도라, **못 채워도 오류가 아닙니다.**
// 못 찾은 항목은 비워 두고 손님이 직접 적습니다. 그래서 이 파일은 예외를 던지지 않습니다.
//
// 대부분의 일본 쇼핑몰은 OpenGraph 태그(og:title·og:image)를 답니다. 그것부터 보고,
// 안 다는 곳만 따로 규칙을 둡니다. 지금은 아마존이 그렇습니다.

import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import { safeFetch } from '@/lib/safeFetch';
import { createTtlCache } from '@/lib/crawler/ttlCache';

export type ExtractedProduct = {
  /** 일본어 원문 상품명. 번역은 호출부가 합니다. */
  name: string;
  /** 엔화 가격. 못 찾으면 null 입니다. */
  price: number | null;
  imageUrl: string | null;
};

/* ------------------------------------------------------------------ 인코딩 */

/**
 * 응답을 올바른 문자셋으로 읽습니다.
 *
 * 일본 쇼핑몰은 아직 EUC-JP·Shift_JIS 를 쓰는 곳이 많습니다. UTF-8 로 읽으면
 * 상품명이 통째로 깨져 번역도 못 합니다. 헤더에 charset 이 없으면 본문의
 * <meta charset> 까지 보고 정합니다.
 */
function decodeBody(buffer: Buffer, contentType: string): string {
  const pick = (v: string) => {
    const c = v.toLowerCase();
    if (c.includes('euc-kr')) return 'euc-kr';
    if (c.includes('euc-jp')) return 'euc-jp';
    if (c.includes('shift_jis') || c.includes('sjis') || c.includes('shift-jis')) return 'shift_jis';
    return null;
  };

  const fromHeader = pick(contentType);
  if (fromHeader) return iconv.decode(buffer, fromHeader);

  // 헤더에 없으면 본문 앞부분의 meta 태그를 봅니다. (앞 2KB 면 충분합니다)
  const head = buffer.subarray(0, 2048).toString('latin1');
  const fromMeta = pick(head.match(/charset\s*=\s*["']?([\w-]+)/i)?.[1] ?? '');
  if (fromMeta) return iconv.decode(buffer, fromMeta);

  return buffer.toString('utf-8');
}

/* ------------------------------------------------------------------ 정리 */

/**
 * 상품명에서 쇼핑몰 이름을 떼어냅니다.
 *
 * <title> 이나 og:title 에는 쇼핑몰 이름이 따라붙습니다.
 *   "Amazon.co.jp: [TENTIAL] BAKUNE …"  →  "[TENTIAL] BAKUNE …"
 *   "【楽天市場】カジュアルパンツ …"       →  "カジュアルパンツ …"
 * 그대로 두면 번역 글자수만 잡아먹고, 주문서에도 쇼핑몰 이름이 상품명처럼 남습니다.
 */
function stripShopName(title: string): string {
  return title
    .replace(/^Amazon(\.co\.jp)?\s*[:|｜]\s*/i, '')
    .replace(/^【楽天市場】/, '')
    .replace(/\s*[-|｜]\s*(Yahoo!ショッピング|ヤフオク!|メルカリ|通販)\s*$/i, '')
    .replace(/\s*[:|｜]\s*ZOZOTOWN\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "27,520" · "¥27,520" · "27520円" 에서 숫자만 꺼냅니다. */
function parsePrice(raw?: string | null): number | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  // 0원이거나 비상식적으로 큰 값은 잘못 집은 것으로 봅니다.
  return n > 0 && n < 100_000_000 ? n : null;
}

/**
 * 아마존 이미지 주소의 크기 토큰을 키웁니다.
 *   …71AKnGIFVQL._AC_SX342_SY445_QL70_ML2_.jpg  →  …71AKnGIFVQL.jpg
 * 상세 화면에 올라가는 사진이라 썸네일 크기로 받으면 흐릿합니다.
 */
function upgradeAmazonImage(url: string): string {
  return url.replace(/\._[A-Z0-9_,]+_\.(jpg|png|webp)$/i, '.$1');
}

/* ------------------------------------------------------------------ 추출 */

/**
 * HTML 에서 상품 정보를 꺼냅니다. 주소는 어느 쇼핑몰인지 판단하는 데만 씁니다.
 * 공개 함수로 둔 이유는 테스트에서 저장해 둔 HTML 로 바로 돌려보기 위해서입니다.
 */
export function extractProduct(html: string, pageUrl: string): ExtractedProduct {
  const $ = cheerio.load(html);
  const meta = (prop: string) =>
    $(`meta[property="${prop}"]`).attr('content') ?? $(`meta[name="${prop}"]`).attr('content') ?? null;

  // 어느 쇼핑몰이든 공통으로 먼저 봅니다.
  let name = meta('og:title') ?? $('title').text();
  let imageUrl = meta('og:image');
  // 가격은 OpenGraph 를 먼저 보고, 없으면 schema.org 표기를 봅니다.
  // 라쿠텐처럼 og 에는 가격을 안 넣어도 itemprop="price" 는 넣는 곳이 많습니다.
  let price =
    parsePrice(meta('product:price:amount')) ??
    parsePrice($('[itemprop="price"]').first().attr('content') ?? $('[itemprop="price"]').first().text());

  // 🛒 아마존은 OpenGraph 태그를 달지 않습니다. 화면 요소에서 직접 읽습니다.
  if (/(^|\.)amazon\.co\.jp$/.test(safeHost(pageUrl))) {
    // 상품 페이지(/dp/ASIN)가 아니면 아무것도 돌려주지 않습니다.
    // 검색 결과 주소(/s?k=…)를 넣으면 <title> 의 검색어와 아무 상품의 가격을 집어와
    // 그럴듯하지만 틀린 값이 주문서에 들어갑니다. 빈 칸이 잘못된 값보다 낫습니다.
    if (!extractAsin(pageUrl)) return { name: '', price: null, imageUrl: null };

    name = $('#productTitle').text() || name;
    price = parsePrice($('.a-price-whole').first().text()) ?? price;

    const img =
      $('#landingImage').attr('data-old-hires') ||
      $('#imgTagWrapperId img').attr('src') ||
      $('#landingImage').attr('src') ||
      null;
    if (img) imageUrl = upgradeAmazonImage(img);
  }

  return {
    name: stripShopName(name ?? ''),
    price,
    // 상대 경로로 주는 쇼핑몰이 있어 절대 주소로 바꿔 둡니다.
    imageUrl: imageUrl ? toAbsolute(imageUrl, pageUrl) : null,
  };
}

/**
 * 아마존 주소에서 상품 번호(ASIN)를 꺼냅니다. 상품 페이지가 아니면 null.
 *   /dp/B0GK8RCPNY · /gp/product/B0GK8RCPNY · /무언가/dp/B0GK8RCPNY/ref=…
 * 손님이 광고를 타고 들어간 긴 주소(?tag=…&hvadid=… 등)를 그대로 붙여넣어도
 * 경로만 보므로 영향받지 않습니다.
 */
export function extractAsin(rawUrl: string): string | null {
  try {
    const path = new URL(rawUrl).pathname;
    return path.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function safeHost(raw: string): string {
  try {
    return new URL(raw).hostname;
  } catch {
    return '';
  }
}

function toAbsolute(src: string, base: string): string | null {
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ 캐시 */

/**
 * 같은 주소를 다시 읽지 않기 위한 캐시.
 *
 * ⚠️ 아마존이 이걸 특히 필요로 합니다. 운영 서버(EC2)에서 아마존 목록·검색 페이지는
 *    이미 캡차로 막혀 있고, 상품 상세(/dp)만 통과합니다. 그 하나도 자주 두드리면
 *    같은 취급을 받을 수 있어서, 부를 일 자체를 줄여 둡니다.
 *
 * 손님이 입력 칸을 들락거리거나, 여러 명이 같은 인기 상품을 주문할 때 특히 잘 듣습니다.
 * 가격이 몇 분 사이 바뀌는 일은 드물고, 실제 결제 금액은 관리자가 구매할 때 확정하므로
 * 조금 지난 값이어도 문제가 없습니다.
 */
const CACHE_MINUTES = 30;
const cache = createTtlCache<ExtractedProduct>(CACHE_MINUTES * 60_000, 500);

/** 캐시 키. 같은 상품을 가리키는 주소는 한 칸을 쓰도록 맞춰 줍니다. */
function cacheKey(rawUrl: string): string {
  // 아마존은 같은 상품의 주소가 광고 파라미터 때문에 사람마다 다릅니다.
  // ASIN 이 같으면 같은 상품이므로 그걸로 묶습니다.
  const asin = extractAsin(rawUrl);
  if (asin) return `asin:${asin}`;

  try {
    const u = new URL(rawUrl);
    return `${u.origin}${u.pathname}`; // 추적 파라미터는 떼고 봅니다
  } catch {
    return rawUrl;
  }
}

/**
 * 주소를 열어 상품 정보를 꺼냅니다.
 * 읽지 못하면 null — 손님이 직접 입력하면 되므로 오류로 만들지 않습니다.
 */
export async function fetchProduct(rawUrl: string): Promise<ExtractedProduct | null> {
  const key = cacheKey(rawUrl);
  const hit = cache.get(key);
  if (hit) return hit;

  try {
    const res = await safeFetch(rawUrl);
    if (!res.ok) {
      console.warn(`[상품정보] 페이지 응답 ${res.status}: ${rawUrl}`);
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const html = decodeBody(buffer, res.headers.get('content-type') ?? '');
    const product = extractProduct(html, res.url || rawUrl);

    // 이름을 못 찾았으면 캡차 화면을 받았거나 상품 페이지가 아닙니다.
    // 그런 결과를 캐시에 넣으면 30분 동안 계속 빈 값을 돌려주게 되므로 넣지 않습니다.
    if (product.name) cache.set(key, product);
    return product;
  } catch (e) {
    console.warn(`[상품정보] 읽기 실패: ${(e as Error).message}`);
    return null;
  }
}
