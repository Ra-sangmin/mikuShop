// 🛒 판매처 상품의 옵션(SKU)과 가격 읽어오기 — 라쿠텐 · 야후쇼핑
//
// 왜 페이지를 읽나
//   공식 API 로는 옵션별 정보를 얻을 수 없습니다.
//     라쿠텐: FAQ 에서 "API 결과로 색상·사이즈를 가져올 수 없다"고 밝히고 있습니다.
//             판매자 전용 RMS API 는 우리가 쓸 수 없습니다.
//     야후:   검색 API 는 상품 단위라 SKU 목록이 없습니다.
//   두 곳 모두 상품 페이지에 SKU 가 서버렌더링된 JSON 으로 들어 있어 그대로 읽습니다.
//   자바스크립트 실행이 필요 없어 헤드리스 크롬(메루카리 방식)은 쓰지 않습니다.
//
// ⚠️ 공식 API 가 아니므로 라쿠텐이 마크업을 바꾸면 조용히 깨집니다.
//    그래서 이 파일은 실패할 때 예외를 던지지 않고 null 을 돌려주고,
//    호출부는 검색 API 가 주는 최저~최고가 표시로 물러납니다. 상세 페이지 자체는 계속 열려야 합니다.

import prisma from '@/lib/prisma';
import { translateWithDeepL } from '@/lib/categoryTranslation';
// URL 다루기는 화면에서도 써서 prisma 의존이 없는 파일로 나눠 두었습니다.
import { normalizeItemUrl, type ItemPlatform } from '@/lib/itemUrl';

export { normalizeItemUrl };
export type { ItemPlatform };

/** 캐시 유지 시간. 구매대행은 관리자가 실제 구매 시 금액을 확정하므로 몇 시간 늦어도 됩니다. */
export const VARIANT_CACHE_HOURS = 6;

/**
 * 옵션 문구는 일본어 원문과 한국어를 함께 들고 다닙니다.
 *
 * 손님 화면에는 한국어를 보여 주지만, 주문에는 **일본어 원문**을 저장합니다.
 * 직원이 라쿠텐에서 실제로 주문할 때 보는 선택지가 일본어라,
 * 번역된 문구만 남기면 어느 옵션인지 대조하기 어렵습니다.
 */
export type Localized = { ja: string; ko: string };

/** 파싱 직후의 모습. 아직 번역 전이라 전부 일본어 원문입니다. */
type RawParsed = {
  axes: string[];
  axisValues: string[][];
  variants: { variantId: string; options: string[]; price: number; soldOut?: boolean }[];
  /** 별개 상품 (야후의 "기타 변형"). 라쿠텐에는 없습니다. */
  related?: { name: string; fullName: string; url: string; price: number | null; imageUrl: string | null; soldOut: boolean; current: boolean }[];
};

/** 🔗 같은 상품처럼 보이지만 실제로는 별개인 상품. (야후의 "기타 변형") */
export type RelatedItem = {
  /** 짧은 구분 이름. 라벨(トップスのみ · 上下セット)이라 차이가 바로 보입니다. */
  name: Localized;
  /**
   * 판매처의 원래 상품명(일본어). 이 상품으로 바꿔 골랐을 때 제목으로 씁니다.
   * 번역해 두지 않는 이유는 상세 화면 제목이 원래 구글 웹번역으로 옮겨지기 때문입니다.
   */
  fullName: string;
  url: string;
  price: number | null;
  imageUrl: string | null;
  soldOut: boolean;
  /** 지금 보고 있는 상품이면 true — 목록에서 "현재 상품"으로 표시합니다. */
  current: boolean;
};

export type ItemVariant = {
  /** 판매처의 SKU 식별자 (라쿠텐 3216001-450007 · 야후 1405220101) */
  variantId: string;
  /** 축 순서대로의 옵션 값 (예: [{ja:"A：黒とダークグレー2枚組", ko:"A: 검정과 짙은 회색 2장 세트"}, …]) */
  options: Localized[];
  price: number;
  /** 품절이면 고를 수 없게 막습니다. (야후만 재고를 알려 줍니다) */
  soldOut?: boolean;
};

export type ItemVariantSet = {
  axes: Localized[];
  /** 축마다 고를 수 있는 값 목록. 라쿠텐 페이지에 적힌 순서(M·L·XL…)를 그대로 씁니다. */
  axisValues: Localized[][];
  variants: ItemVariant[];
  /** 별개 상품 목록. 없으면 빈 배열입니다. */
  relatedItems: RelatedItem[];
  minPrice: number;
  maxPrice: number;
  fetchedAt: Date;
};

/* ------------------------------------------------------------------ 파싱 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * JSON 문자열에서 `"키":[ … ]` 배열을 통째로 꺼냅니다.
 *
 * 정규식으로 `\[([\s\S]*?)\]` 를 쓰면 안쪽에 중첩된 배열(labels 등)의 닫는 괄호에서
 * 먼저 멈춰, 첫 원소만 읽고 끝납니다. 그래서 대괄호 깊이를 직접 셉니다.
 * 문자열 안의 괄호는 세지 않도록 따옴표 구간은 건너뜁니다.
 */
function sliceJsonArray(src: string, key: string): string {
  const at = src.indexOf(`"${key}":[`);
  if (at < 0) return '';

  const start = src.indexOf('[', at);
  let depth = 0;
  let inString = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (inString) {
      if (c === '\\') i++;           // 이스케이프된 문자는 통째로 건너뜁니다
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '[') depth++;
    else if (c === ']' && --depth === 0) return src.slice(start + 1, i);
  }
  return '';
}

/**
 * 🛒 라쿠텐 상품 페이지에서 SKU 목록을 뽑습니다. 못 찾으면 null.
 *
 * 페이지 안의 JSON 은 HTML 속성으로 한 번 감싸여 있어 따옴표가 이스케이프돼 있습니다.
 * 먼저 그걸 풀고, SKU 하나가 가진 세 값을 한 묶음으로 읽습니다.
 */
export function parseRakuten(html: string): RawParsed | null {
  const un = html.replace(/\\"/g, '"');

  // 옵션 축은 variantSelectors 가 들고 있습니다.
  //   "variantSelectors":[{"key":"3216","label":"カラー","values":[{"value":"A…","label":"A…"}, …]}, …]
  // 축 이름(label)과 각 축이 가질 수 있는 값 목록을 함께 읽습니다.
  // 값 목록이 필요한 이유는 화면에서 선택지를 "원래 순서(M·L·XL…)"대로 보여주기 위해서입니다.
  // SKU 목록에서 추려내면 순서가 뒤섞입니다.
  let axes: string[] = [];
  let axisValues: string[][] = [];
  const selectorsRaw = un.match(/"variantSelectors":\[([\s\S]*?)\],"inventoryType"/)?.[1];
  if (selectorsRaw) {
    for (const block of selectorsRaw.matchAll(/"label":"([^"]*)","values":\[([\s\S]*?)\]\}/g)) {
      axes.push(block[1].trim());
      axisValues.push([...block[2].matchAll(/"value":"([^"]*)"/g)].map(m => m[1].trim()));
    }
  }

  // variantId → selectorValues → taxIncludedPrice 가 이 순서로 한 SKU 안에 들어 있습니다.
  const re = /"variantId":"([^"]+)"[\s\S]{0,400}?"selectorValues":\[([^\]]*)\][\s\S]{0,6000}?"taxIncludedPrice":(\d+)/g;
  const seen = new Set<string>();
  const variants: RawParsed['variants'] = [];

  for (const m of un.matchAll(re)) {
    const [, variantId, rawOptions, rawPrice] = m;
    if (seen.has(variantId)) continue; // 같은 SKU 가 페이지에 두 번 나오는 경우가 있습니다
    seen.add(variantId);

    const options = rawOptions
      ? rawOptions.split('","').map(v => v.replace(/^"|"$/g, '').trim()).filter(Boolean)
      : [];
    const price = Number(rawPrice);
    if (!price) continue;

    variants.push({ variantId, options, price });
  }

  if (variants.length === 0) return null;

  // 축 이름을 못 읽었으면 순서만으로 이름을 붙입니다. 선택지는 SKU 에서 추려냅니다.
  if (axes.length !== variants[0].options.length) {
    axes = variants[0].options.map((_, i) => `옵션 ${i + 1}`);
    axisValues = axes.map((_, i) => [...new Set(variants.map(v => v.options[i]).filter(Boolean))]);
  }

  return { axes, axisValues, variants };
}

/**
 * 🛍️ 야후쇼핑 상품 페이지에서 SKU 목록과 "기타 변형"을 뽑습니다.
 *
 * 야후는 한 화면에 성격이 다른 둘을 나란히 보여 줍니다.
 *   변형      individualItemList — **같은 상품의 SKU**. 사이즈·색상 조합.
 *   기타 변형  variations        — **별개 상품**으로 가는 링크. 가격이 다릅니다.
 *                                 (예: 탑스만 7,700엔 / 상하 세트 15,400엔 — 서로 다른 상품)
 * 둘을 섞으면 손님이 고른 가격과 실제 가격이 달라지므로 따로 담아 돌려줍니다.
 *
 * SKU 의 price 는 대개 null 인데, "기본가를 그대로 쓴다"는 뜻입니다.
 *
 * itemUrl 이 필요한 이유: 야후는 형제 변형들의 목록을 **각자 것까지 전부** 페이지에 담습니다.
 * 그래서 isSelected 가 true 인 항목이 네 번 나오고, 먼저 나온 것을 고르면 엉뚱한 상품이
 * "현재 상품"이 됩니다. 지금 읽고 있는 주소와 맞춰 보는 쪽이 확실합니다.
 */
export function parseYahoo(html: string, itemUrl: string): RawParsed | null {
  const un = html.replace(/\\"/g, '"');

  // 상품 기본가. SKU 의 price 가 null 일 때 씁니다.
  const basePrice = Number(un.match(/"itemCode":"[^"]+","price":(\d+)/)?.[1] ?? 0);

  const variants: RawParsed['variants'] = [];
  const axisOrder: string[] = [];
  const axisValueOrder = new Map<string, string[]>();
  const seen = new Set<string>();

  const skuRe = /"skuId":"([^"]+)","optionList":\[([\s\S]*?)\],"price":(null|\d+)[\s\S]{0,300}?"isAvailable":(true|false)/g;
  for (const m of un.matchAll(skuRe)) {
    const [, skuId, rawOptions, rawPrice, available] = m;
    if (seen.has(skuId)) continue;
    seen.add(skuId);

    const options: string[] = [];
    for (const o of rawOptions.matchAll(/"name":"([^"]*)","choiceName":"([^"]*)"/g)) {
      const [, axis, value] = o;
      if (!axisOrder.includes(axis)) { axisOrder.push(axis); axisValueOrder.set(axis, []); }
      const list = axisValueOrder.get(axis)!;
      if (!list.includes(value)) list.push(value);  // 페이지에 나온 순서를 지킵니다
      options.push(value);
    }
    if (options.length === 0) continue;

    const price = rawPrice === 'null' ? basePrice : Number(rawPrice);
    if (!price) continue;

    variants.push({ variantId: skuId, options, price, soldOut: available !== 'true' });
  }

  // 🔗 기타 변형 — 별개 상품입니다. 옵션과 섞지 않습니다.
  //    "multipleVariations":{…,"variationItems":[{ id, name, url, price, imageUrl, labels:[{name,value}] }, …]}
  //    name 은 검색용 문구가 잔뜩 붙은 긴 상품명이라, 화면에는 labels 의 값
  //    (トップスのみ · 上下セット …)을 씁니다. 짧고 차이가 바로 보입니다.
  const here = normalizeItemUrl(itemUrl);
  const related: NonNullable<RawParsed['related']> = [];
  const itemsRaw = sliceJsonArray(un, 'variationItems');
  const itemRe = /"id":"([^"]+)","name":"([^"]*)","url":"([^"]*)","price":(\d+),"isAvailable":(true|false)[\s\S]{0,400}?"imageUrl":"([^"]*)"[\s\S]{0,300}?"labels":\[([\s\S]*?)\]/g;
  for (const m of itemsRaw.matchAll(itemRe)) {
    const [, , fullName, url, price, available, imageUrl, rawLabels] = m;
    const label = rawLabels.match(/"value":"([^"]*)"/)?.[1];
    related.push({
      name: (label || fullName).trim(),
      fullName: fullName.trim(),
      url,
      price: Number(price) || null,
      imageUrl: imageUrl || null,
      soldOut: available !== 'true',
      current: normalizeItemUrl(url) === here,
    });
  }

  if (variants.length === 0 && related.length === 0) return null;

  const axes = axisOrder;
  const axisValues = axes.map(a => axisValueOrder.get(a) ?? []);
  return { axes, axisValues, variants, related };
}

/**
 * 응답 본문을 올바른 문자셋으로 읽습니다.
 *
 * ⚠️ 라쿠텐 상품 페이지는 UTF-8 이 아니라 **EUC-JP** 입니다.
 *    res.text() 는 문자셋을 무시하고 UTF-8 로 읽어서, 일본어가 통째로 깨집니다.
 *    (실제로 "カラー" 가 "���顼" 로 저장돼 번역도 하지 못했습니다)
 *    그래서 헤더의 charset 을 보고 직접 디코딩합니다.
 */
async function decodeBody(res: Response): Promise<string> {
  const buf = await res.arrayBuffer();
  const charset = res.headers.get('content-type')?.match(/charset=["']?([\w-]+)/i)?.[1];
  try {
    return new TextDecoder(charset || 'utf-8').decode(buf);
  } catch {
    // 모르는 문자셋이면 UTF-8 로 시도합니다. 깨지더라도 페이지 구조(따옴표·숫자)는 남아
    // 가격은 읽히고, 옵션 이름만 원문 그대로 남습니다.
    return new TextDecoder('utf-8').decode(buf);
  }
}

/** 플랫폼별 파서. 새 판매처를 붙이면 여기에 한 줄 더하면 됩니다. */
const PARSERS: Record<ItemPlatform, (html: string, itemUrl: string) => RawParsed | null> = {
  rakuten: parseRakuten,
  yahoo_shopping: parseYahoo,
};

/** 상품 페이지를 받아 SKU 를 뽑습니다. 실패하면 null (호출부가 옵션 영역을 지웁니다). */
async function fetchParsed(platform: ItemPlatform, itemUrl: string) {
  try {
    const res = await fetch(itemUrl, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'ja' },
      cache: 'no-store',
      // 판매처가 느릴 때 상세 페이지 전체가 같이 멈추지 않도록 끊습니다.
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      console.warn(`[상품옵션] ${platform} 페이지 응답 ${res.status}: ${itemUrl}`);
      return null;
    }
    return PARSERS[platform](await decodeBody(res), itemUrl);
  } catch (e) {
    console.warn(`[상품옵션] ${platform} 페이지를 읽지 못했습니다: ${(e as Error).message}`);
    return null;
  }
}

/* ------------------------------------------------------------------ 번역 */

/**
 * 옵션 이름을 한국어로 바꿉니다. 카테고리와 같은 Translation 테이블을 씁니다.
 * 이미 번역해 둔 문구는 다시 부르지 않아, 같은 판매처의 다른 상품에서도 재사용됩니다.
 */
async function translateOptionLabels(labels: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(labels.map(v => v.trim()).filter(Boolean))];
  if (unique.length === 0) return out;

  const known = await prisma.translation.findMany({ where: { jp: { in: unique } } });
  known.forEach(row => out.set(row.jp, row.ko));

  const missing = unique.filter(v => !out.has(v));
  if (missing.length === 0) return out;

  const translated = await translateWithDeepL(missing);
  await Promise.all(translated.map(async ({ text, ok }, i) => {
    const jp = missing[i];
    out.set(jp, text);
    // 번역에 실패했으면 저장하지 않습니다. 원문이 한국어로 굳어 다음에도 그대로 나옵니다.
    if (!ok || text === jp) return;
    await prisma.translation.upsert({
      where: { jp },
      update: { ko: text },
      create: { jp, ko: text },
    }).catch(() => { /* 동시에 같은 문구를 넣으면 한쪽이 실패합니다. 무시해도 됩니다. */ });
  }));

  return out;
}

/* ------------------------------------------------------------------ 진입점 */

function fromCache(row: {
  axes: unknown; axisValues: unknown; variants: unknown; relatedItems: unknown;
  minPrice: number; maxPrice: number; fetchedAt: Date;
}): ItemVariantSet {
  return {
    axes: (row.axes ?? []) as Localized[],
    axisValues: (row.axisValues ?? []) as Localized[][],
    variants: (row.variants ?? []) as ItemVariant[],
    relatedItems: (row.relatedItems ?? []) as RelatedItem[],
    minPrice: row.minPrice,
    maxPrice: row.maxPrice,
    fetchedAt: row.fetchedAt,
  };
}

/**
 * 상품의 옵션과 가격을 돌려줍니다. 캐시가 유효하면 그대로, 아니면 페이지를 다시 읽습니다.
 * 옵션도 관련 상품도 없으면 null 입니다.
 */
export async function getItemVariants(platform: ItemPlatform, rawUrl: string): Promise<ItemVariantSet | null> {
  const itemUrl = normalizeItemUrl(rawUrl);

  const cached = await prisma.itemVariantCache.findUnique({
    where: { platform_itemUrl: { platform, itemUrl } },
  });
  const freshUntil = Date.now() - VARIANT_CACHE_HOURS * 3600_000;
  if (cached && cached.fetchedAt.getTime() > freshUntil) return fromCache(cached);

  const parsed = await fetchParsed(platform, itemUrl);
  if (!parsed) {
    // 캐시가 오래됐어도 새로 못 읽었으면 옛 값이라도 돌려줍니다. 빈 화면보다 낫습니다.
    return cached ? fromCache(cached) : null;
  }

  // 축 이름·옵션 값·관련 상품 이름을 한 번에 번역합니다. (DeepL 호출 횟수를 줄입니다)
  const dict = await translateOptionLabels([
    ...parsed.axes,
    ...parsed.axisValues.flat(),
    ...parsed.variants.flatMap(v => v.options),
    ...(parsed.related ?? []).map(r => r.name),
  ]);
  // 일본어 원문을 버리지 않고 한 쌍으로 묶습니다. (화면=ko, 주문 저장=ja)
  const pair = (ja: string): Localized => ({ ja, ko: dict.get(ja.trim()) || ja });

  const axes = parsed.axes.map(pair);
  const axisValues = parsed.axisValues.map(values => values.map(pair));
  const variants: ItemVariant[] = parsed.variants.map(v => ({
    variantId: v.variantId,
    options: v.options.map(pair),
    price: v.price,
    soldOut: v.soldOut ?? false,
  }));
  const relatedItems: RelatedItem[] = (parsed.related ?? []).map(r => ({ ...r, name: pair(r.name) }));

  // 관련 상품은 별개 상품이라 이 상품의 가격 범위에 넣지 않습니다.
  const prices = variants.map(v => v.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const fetchedAt = new Date();

  const data = {
    axes, axisValues,
    variants: variants as unknown as object,
    relatedItems: relatedItems as unknown as object,
    minPrice, maxPrice, fetchedAt,
  };
  await prisma.itemVariantCache.upsert({
    where: { platform_itemUrl: { platform, itemUrl } },
    update: data,
    create: { platform, itemUrl, ...data },
  }).catch(e => console.warn('[상품옵션] 캐시 저장 실패:', (e as Error).message));

  return { axes, axisValues, variants, relatedItems, minPrice, maxPrice, fetchedAt };
}
