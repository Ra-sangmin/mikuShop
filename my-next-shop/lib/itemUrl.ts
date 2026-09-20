// 🔗 판매처 상품 URL 다루기 (순수 함수만 — 화면에서도 씁니다)
//
// lib/itemVariants.ts 와 나눠 둔 이유는 그쪽이 prisma 를 쓰기 때문입니다.
// 관리자 화면(클라이언트 컴포넌트)에서 가져다 쓰려면 DB 의존이 없어야 합니다.

/** 옵션(SKU)을 읽어올 수 있는 판매처. */
export type ItemPlatform = 'rakuten' | 'yahoo_shopping';

/**
 * 판매처별로 읽어도 되는 호스트.
 *
 * 🔒 SSRF 방어에 씁니다. 여기에 없는 주소는 서버가 대신 읽지 않습니다.
 *    반드시 normalizeItemUrl() 을 **거친 뒤** 검사해야 합니다.
 *    제휴 링크의 겉 주소만 보면 안쪽 파라미터로 아무 사이트나 넣을 수 있습니다.
 */
const PLATFORM_HOSTS: Record<ItemPlatform, RegExp> = {
  rakuten: /(^|\.)rakuten\.co\.jp$/,
  yahoo_shopping: /(^|\.)shopping\.yahoo\.co\.jp$/,
};

/** 정규화한 주소가 그 판매처의 상품 페이지인지 봅니다. */
export function isAllowedItemHost(platform: ItemPlatform, normalizedUrl: string): boolean {
  try {
    return PLATFORM_HOSTS[platform].test(new URL(normalizedUrl).hostname);
  } catch {
    return false;
  }
}

/**
 * 캐시 키이자 실제로 읽을 상품 주소를 만듭니다.
 *
 * 두 가지를 처리합니다.
 *  1) 제휴 링크(hb.afl.rakuten.co.jp/hgc/…?pc=…)로 들어오는 경우.
 *     라쿠텐 검색 API 는 affiliateId 를 넣으면 itemUrl 도 제휴 링크로 내려 줍니다.
 *     그 주소를 그대로 읽으면 리디렉션 안내 페이지라 SKU 가 없습니다.
 *     진짜 상품 주소는 pc 파라미터(PC용)에 들어 있으므로 그걸 꺼냅니다.
 *  2) 쿼리스트링 제거. 제휴 코드·variantId 가 붙으면 같은 상품이 여러 건으로 쌓입니다.
 */
export function normalizeItemUrl(rawUrl: string): string {
  try {
    let u = new URL(rawUrl);

    // 제휴 링크면 안쪽의 실제 상품 주소로 바꿉니다. (pc = PC용, m = 모바일용)
    if (/(^|\.)afl\.rakuten\.co\.jp$/.test(u.hostname)) {
      const inner = u.searchParams.get('pc') || u.searchParams.get('m');
      if (inner) u = new URL(inner);
    }

    // 라쿠텐은 디렉터리형(/shop/item/), 야후는 파일형(/shop/12345.html) 주소입니다.
    // 파일형에 슬래시를 붙이면 404 가 나므로 확장자가 있으면 그대로 둡니다.
    const path = u.pathname.replace(/\/+$/, '');
    return `${u.origin}${path}${/\.[a-z0-9]{2,5}$/i.test(path) ? '' : '/'}`;
  } catch {
    return rawUrl.split('?')[0];
  }
}

/**
 * 주문에 저장해 둔 옵션 문구에서 SKU 번호를 꺼냅니다.
 *   "カラー: A / サイズ: M · [3216003-450005]"              → "3216003-450005"
 *   "カラー: ブラウン系 · [GDID164860024] · 요청: 빨리요"      → "GDID164860024"
 *
 * 장바구니가 SKU 를 " · " 로 끊어 넣으므로 **한 칸을 통째로 차지한 대괄호**만 봅니다.
 * 옵션 이름 안의 대괄호(야후의 "サイズ: [L]（メンズ：Lサイズ相当）")를 잘못 집지 않고,
 * 뒤에 요청 메모가 더 붙어 있어도 찾아냅니다.
 */
export function extractVariantId(productOption?: string | null): string | null {
  return productOption?.match(/(?:^|·\s*)\[([0-9A-Za-z-]+)\]\s*(?=·|$)/)?.[1] ?? null;
}

/** SKU 를 미리 골라 주는 주소 파라미터. 판매처마다 이름이 다릅니다. */
const VARIANT_PARAM: { host: RegExp; param: string }[] = [
  // 라쿠텐: ?variantId=3216003-450005
  { host: /(^|\.)rakuten\.co\.jp$/, param: 'variantId' },
  // 야후쇼핑: ?subcode=GDID164860024
  //   야후가 직접 쓰는 이름입니다. 이 파라미터가 있으면 응답의 getQuery·currentUrl 은 물론
  //   og:url·product:product_link 까지 그 주소로 바뀌고, 페이지 속성에 skuId 가 실려 옵니다.
  { host: /(^|\.)shopping\.yahoo\.co\.jp$/, param: 'subcode' },
];

/**
 * 상품 주소에 SKU 번호를 붙입니다. 판매처가 그 옵션을 골라 둔 상태로 페이지를 엽니다.
 * 직원이 주문할 때 색상·사이즈를 일일이 찾지 않아도 됩니다.
 *
 * 제휴 링크로 들어오면 **안쪽 상품 주소에만** 붙이고 제휴 껍데기는 그대로 둡니다.
 * 바깥에 붙이면 라쿠텐이 무시하고, 껍데기를 벗기면 제휴 추적이 끊깁니다.
 *
 * 모르는 판매처면 주소를 그대로 돌려줍니다. 아무 이름이나 붙이면 판매처가 조용히 무시해,
 * 옵션이 골라진 줄 알고 잘못 주문할 수 있습니다.
 */
export function withVariantId(rawUrl: string, variantId?: string | null): string {
  if (!variantId) return rawUrl;

  /** 그 주소를 받는 판매처가 쓰는 파라미터 이름. 모르는 곳이면 null. */
  const paramFor = (host: string) => VARIANT_PARAM.find(p => p.host.test(host))?.param ?? null;

  try {
    const u = new URL(rawUrl);

    const addTo = (target: string) => {
      const t = new URL(target);
      const param = paramFor(t.hostname);
      if (!param) return target;
      t.searchParams.set(param, variantId);
      return t.toString();
    };

    if (/(^|\.)afl\.rakuten\.co\.jp$/.test(u.hostname)) {
      const pc = u.searchParams.get('pc');
      const m = u.searchParams.get('m');
      if (pc) u.searchParams.set('pc', addTo(pc));
      if (m) u.searchParams.set('m', addTo(m));
      // 안쪽 주소를 하나도 못 찾았으면 손대지 않습니다. (깨진 링크를 만들지 않도록)
      if (!pc && !m) return rawUrl;
      return u.toString();
    }

    return paramFor(u.hostname) ? addTo(rawUrl) : rawUrl;
  } catch {
    return rawUrl;
  }
}
