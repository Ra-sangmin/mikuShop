// 🔨 경매 페이지에서 지금 금액을 읽어 옵니다. (관리자 낙찰 처리 · 회원 상세 보기 공용)
//
// 왜 저장값을 안 쓰나
//   주문에 저장된 금액은 **경매를 신청하던 때의 값**입니다. 경매는 진행 중에 계속 오르므로
//   저장해 둔 숫자는 보여 주는 순간 이미 낡았습니다. 실제로 ¥900 으로 저장된 주문의
//   그때 현재가가 ¥5,775 였던 적이 있습니다.
//
// ⚠️ 크롤링은 느리거나 실패할 수 있습니다. 부르는 쪽은 실패를 정상적인 결과로 다뤄야 합니다.
//    (관리자 화면은 직접 입력으로, 회원 화면은 값을 감추는 것으로 넘어갑니다)

/** 같은 서버의 다른 라우트를 부를 때 쓰는 주소 (ai-search 와 같은 방식) */
function internalBaseUrl(): string {
  return (process.env.INTERNAL_BASE_URL?.trim() || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/+$/, '');
}

/**
 * 야후 옥션 상품 ID 를 찾습니다.
 * 주문의 product_id 가 비어 있는 경우가 많아, 주문 URL 에서도 찾아봅니다.
 *   https://auctions.yahoo.co.jp/jp/auction/j1245534687 → j1245534687
 */
export function findYahooItemId(productId?: string | null, productUrl?: string | null): string | null {
  const direct = productId?.trim();
  if (direct) return direct;
  const m = String(productUrl ?? '').match(/auction\/([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

/* ------------------------------------------------------------------ 빠른 경로 */

/**
 * 🚀 헤드리스 크롬 없이 경매 페이지에서 금액을 읽습니다.
 *
 * 야후 경매 페이지는 화면에 그릴 값을 `__NEXT_DATA__` 스크립트 안에 JSON 으로 함께 내려줍니다.
 * 크롬을 띄워 화면을 그린 뒤 DOM 에서 읽을 필요 없이, HTML 한 번 받아 그 JSON 만 보면 됩니다.
 * (크롬 경로는 1~2초, 이 경로는 0.3초 수준이고 서버 부담도 훨씬 적습니다)
 *
 * ⚠️ 야후가 JSON 구조를 바꾸면 못 읽습니다. 그때는 부르는 쪽이 기존 크롬 경로로 넘어갑니다.
 */
async function fetchFromPageData(itemId: string, timeoutMs: number): Promise<LiveAuctionPrice | null> {
  try {
    const res = await fetch(`https://auctions.yahoo.co.jp/jp/auction/${encodeURIComponent(itemId)}`, {
      headers: {
        // 일반 브라우저처럼 요청해야 같은 HTML 을 받습니다.
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'ja,en;q=0.8',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) return null;

    const data = JSON.parse(m[1]);
    const item = findItemNode(data);
    if (!item) return null;

    // 💴 스토어(사업자) 출품은 세금 포함가가 실제 지불액입니다. 회원이 야후에서 보는 값도 이쪽입니다.
    const price = Number(item.taxinPrice ?? item.price);
    if (!Number.isFinite(price) || price <= 0) return null;

    return {
      ok: true,
      itemId,
      price,
      bidCount: Number.isFinite(Number(item.bids)) ? Number(item.bids) : null,
      timeLeft: remainingLabel(item.endTime),
      endSchedule: item.endTime ?? null,
    };
  } catch {
    return null; // 실패는 조용히 — 크롬 경로가 받습니다.
  }
}

/** JSON 어딘가에 있는 '상품 정보' 노드를 찾습니다. (initPrice + price + bids 를 함께 가진 객체) */
function findItemNode(root: any, depth = 0): any | null {
  if (!root || typeof root !== 'object' || depth > 8) return null;
  if ('initPrice' in root && 'price' in root && 'bids' in root) return root;
  for (const v of Object.values(root)) {
    const found = findItemNode(v, depth + 1);
    if (found) return found;
  }
  return null;
}

/** 남은 시간 표기. 크롬 경로가 돌려주던 형식(9時間 · 3日)에 맞춥니다. */
function remainingLabel(endTime?: string | null): string | null {
  if (!endTime) return null;
  const ms = new Date(endTime).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return '終了';
  const minutes = Math.floor(ms / 60000);
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)}日`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)}時間`;
  return `${minutes}分`;
}

export type LiveAuctionPrice =
  | { ok: true; itemId: string; price: number; bidCount: number | null; timeLeft: string | null; endSchedule: string | null }
  | { ok: false; itemId: string | null; error: string };

/** 경매 페이지의 지금 금액. 실패하면 이유를 담아 돌려줍니다. (예외를 던지지 않습니다) */
export async function fetchLiveAuctionPrice(
  productId?: string | null,
  productUrl?: string | null,
  timeoutMs = 25000,
): Promise<LiveAuctionPrice> {
  const itemId = findYahooItemId(productId, productUrl);
  if (!itemId) return { ok: false, itemId: null, error: '경매 번호를 찾지 못했습니다.' };

  // 🚀 먼저 HTML 안의 JSON 을 봅니다. (크롬을 띄우지 않아 훨씬 빠릅니다)
  const fast = await fetchFromPageData(itemId, Math.min(timeoutMs, 8000));
  if (fast) return fast;

  // 못 읽었으면 기존 방식(헤드리스 크롬)으로 넘어갑니다.
  try {
    const res = await fetch(`${internalBaseUrl()}/api/yahoo_auction/productDetail?itemId=${encodeURIComponent(itemId)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json: any = await res.json().catch(() => null);
    const price = Number(json?.data?.price);

    if (!res.ok || !Number.isFinite(price) || price <= 0) {
      return { ok: false, itemId, error: json?.error || '경매 페이지에서 금액을 읽지 못했습니다.' };
    }
    return {
      ok: true,
      itemId,
      price,
      bidCount: Number.isFinite(Number(json?.data?.bidCount)) ? Number(json.data.bidCount) : null,
      timeLeft: json?.data?.timeLeft ?? null,
      endSchedule: json?.data?.endSchedule ?? null,
    };
  } catch (e: any) {
    console.error('[경매 현재가] 조회 실패:', e?.message);
    return { ok: false, itemId, error: '경매 페이지를 불러오지 못했습니다.' };
  }
}
