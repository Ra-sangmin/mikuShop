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

/** 요청 본문에서 이름·주소를 꺼내 검사합니다. 문제가 있으면 사용자에게 보여줄 문구를 담아 돌려줍니다. */
export function parseCarrierInput(body: any): CarrierInput | { error: string } {
  const name = String(body?.name ?? '').trim();
  if (!name) return { error: '업체 이름을 입력해주세요.' };
  if (name.length > CARRIER_NAME_MAX) return { error: `업체 이름은 ${CARRIER_NAME_MAX}자까지 입력할 수 있습니다.` };

  const url = normalizeCarrierUrl(body?.url);
  if (!url) return { error: '주소는 http:// 또는 https:// 로 시작하는 형식이어야 합니다.' };

  return { name, url };
}
