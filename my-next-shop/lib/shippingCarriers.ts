// 🚚 국제 배송 업체 입력값 정리 (관리자 API 가 씁니다 — app/api/admin/shipping-carriers)
//
// 이름과 주소만 받는 단순한 표지만, 주소는 화면에서 링크로 걸리므로 형식을 보장해 둡니다.

/** 업체 이름 길이 제한 (DB 는 VARCHAR(191)) */
export const CARRIER_NAME_MAX = 191;

export interface CarrierInput { name: string; url: string; }

/**
 * 관리자가 "ems.epost.go.kr" 처럼 프로토콜 없이 적는 경우가 많아 https:// 를 붙여 줍니다.
 * 그래도 http/https 주소로 읽히지 않으면 null 을 돌려줍니다. (javascript: 같은 값을 링크로 걸지 않기 위해)
 */
export function normalizeCarrierUrl(raw: unknown): string | null {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (!parsed.hostname.includes('.')) return null; // "https://ems" 같은 값은 주소로 보지 않습니다
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * 🔎 운송장 번호를 넣은 조회 주소를 만듭니다.
 *
 * 업체마다 조회 주소 형식이 제각각이라(질의 이름이 POST_CODE · invoice · trackingNumber …),
 * 코드에 업체별 규칙을 두지 않고 **주소 안에 번호가 들어갈 자리를 표시**하게 했습니다.
 *
 *   https://service.epost.go.kr/trace...comm?ems_gubun=E&POST_CODE={tracking}
 *                                                                  ^^^^^^^^^^ 이 자리에 운송장 번호가 들어갑니다
 *
 * 자리 표시가 없으면 예전처럼 주소만 엽니다. (업체 조회 첫 화면에서 손님이 직접 붙여넣습니다)
 * `{운송장}` 으로 적어도 됩니다 — 주소로 정규화될 때 한글이 퍼센트 인코딩되므로 그 형태도 함께 찾습니다.
 */
const TRACKING_PLACEHOLDERS = [
  '{tracking}',
  '{TRACKING}',
  '{운송장}',
  `{${encodeURIComponent('운송장')}}`,
];

export function hasTrackingPlaceholder(url: string | null | undefined): boolean {
  const text = String(url ?? '');
  return TRACKING_PLACEHOLDERS.some(token => text.includes(token));
}

export function buildTrackingUrl(url: string | null | undefined, trackingNo?: string | null): string | null {
  const base = String(url ?? '').trim();
  if (!base) return null;

  const no = String(trackingNo ?? '').trim();
  if (!no) {
    // 번호가 아직 없으면 자리 표시를 그대로 두지 않고 비웁니다. (주소에 {tracking} 이 남아 보이지 않도록)
    return TRACKING_PLACEHOLDERS.reduce((acc, token) => acc.split(token).join(''), base);
  }

  const encoded = encodeURIComponent(no);
  if (hasTrackingPlaceholder(base)) {
    return TRACKING_PLACEHOLDERS.reduce((acc, token) => acc.split(token).join(encoded), base);
  }

  // 자리 표시가 없는 업체도 번호를 붙여 보냅니다. (주소 끝에 이어 붙임)
  //   https://ex.com/track      → https://ex.com/track/12345
  //   https://ex.com/track?no=  → https://ex.com/track?no=12345
  // ⚠️ 업체마다 조회 주소 형식이 달라 이 방식으로 항상 조회 화면에 닿지는 않습니다.
  //    정확히 보내려면 관리자 > 국제 배송 업체에서 번호가 들어갈 자리에 {tracking} 을 적어 주세요.
  if (/[?&=/]$/.test(base)) return `${base}${encoded}`;   // ?no= · / 로 끝나면 그대로 이음
  return `${base}/${encoded}`;                            // 그 외엔 경로로 붙입니다
}

/** 요청 본문에서 이름·주소를 꺼내 검사합니다. 문제가 있으면 사용자에게 보여줄 문구를 담아 돌려줍니다. */
export function parseCarrierInput(body: any): CarrierInput | { error: string } {
  const name = String(body?.name ?? '').trim();
  if (!name) return { error: '업체 이름을 입력해주세요.' };
  if (name.length > CARRIER_NAME_MAX) return { error: `업체 이름은 ${CARRIER_NAME_MAX}자까지 입력할 수 있습니다.` };

  const url = normalizeCarrierUrl(body?.url);
  if (!url) return { error: '주소는 http:// 또는 https:// 로 시작하는 형식이어야 합니다.' };

  return { name, url };
}
