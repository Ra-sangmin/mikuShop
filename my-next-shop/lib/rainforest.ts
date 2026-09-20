// 🌧️ Rainforest API — 아마존 재팬 상품·카테고리
//
// 왜 직접 안 긁나
//   아마존은 봇 차단이 강해서 운영 서버(EC2)에서 목록·검색·카테고리 페이지가 전부
//   캡차나 503 으로 막힙니다. 상품 상세(/dp)만 통과합니다. (2026-09 실측)
//   Rainforest 가 대신 긁어 JSON 으로 주므로 우리 서버 IP 가 아마존에 노출되지 않습니다.
//
// ⚠️ 요청마다 크레딧을 씁니다. 무료 체험은 100건, 유료는 월 500건(Hobbyist)부터입니다.
//    그래서 부르는 쪽은 **반드시 캐시를 끼고** 써야 합니다. 같은 화면을 두 번 열었다고
//    두 번 청구되면 안 됩니다.

const ENDPOINT = 'https://api.rainforestapi.com/request';

/** 아마존 재팬 고정. 다른 나라 아마존은 배송대행 대상이 아닙니다. */
const DOMAIN = 'amazon.co.jp';

export class RainforestError extends Error {}

/** 요청 한 건. type 별 파라미터는 호출부가 채웁니다. */
async function call<T>(params: Record<string, string>): Promise<T> {
  const key = process.env.RAINFOREST_API_KEY;
  if (!key) throw new RainforestError('RAINFOREST_API_KEY 가 없습니다.');

  const url = new URL(ENDPOINT);
  url.searchParams.set('api_key', key);
  url.searchParams.set('amazon_domain', DOMAIN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(60_000) });
  const body = await res.json().catch(() => null);

  // 실패해도 크레딧이 빠지는 경우가 있어, 무엇이 잘못됐는지는 남겨 둡니다.
  if (!res.ok || body?.request_info?.success === false) {
    throw new RainforestError(body?.request_info?.message ?? `HTTP ${res.status}`);
  }
  return body as T;
}

/* ------------------------------------------------------------------ 카테고리 */

export type AmazonNode = { id: string; name: string };

type CategoryResponse = {
  request_info?: { credits_remaining?: number };
  refinements?: { departments?: { name: string; value: string }[] };
  category_results?: unknown[];
};

/**
 * 한 카테고리의 **하위 카테고리**를 가져옵니다.
 *
 * 아마존 재팬은 Rainforest 의 Categories API(트리 전용)가 지원하지 않습니다.
 *   "The Categories API does not support returning standard categories from amazon.co.jp"
 * 대신 카테고리 조회 응답의 `refinements.departments` 에 현재 노드와 자식들이 들어옵니다.
 *   [ {name:"ファッション", value:"n/2229202051"},      ← 현재 노드 (맨 앞)
 *     {name:"レディース",  value:"n/2230006051"}, … ]   ← 자식들
 * 그래서 맨 앞 하나를 빼고 읽습니다.
 */
export async function fetchChildCategories(categoryId: string): Promise<{
  children: AmazonNode[];
  creditsRemaining: number | null;
}> {
  const body = await call<CategoryResponse>({ type: 'category', category_id: categoryId });

  const departments = body.refinements?.departments ?? [];
  const children: AmazonNode[] = [];
  for (const d of departments) {
    const id = d.value?.match(/n\/(\d+)/)?.[1];
    // 자기 자신은 건너뜁니다. (목록 맨 앞에 현재 노드가 들어옵니다)
    if (!id || id === categoryId || !d.name?.trim()) continue;
    if (children.some(c => c.id === id)) continue;
    children.push({ id, name: d.name.trim() });
  }

  return { children, creditsRemaining: body.request_info?.credits_remaining ?? null };
}

/** 남은 크레딧 조회. 이 호출은 크레딧을 쓰지 않습니다. */
export async function fetchCredits(): Promise<{ used: number; remaining: number } | null> {
  const key = process.env.RAINFOREST_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://api.rainforestapi.com/account?api_key=${key}`, { cache: 'no-store' });
    const j = await res.json();
    const a = j.account_info ?? j;
    return { used: a.credits_used ?? 0, remaining: a.credits_remaining ?? 0 };
  } catch {
    return null;
  }
}
