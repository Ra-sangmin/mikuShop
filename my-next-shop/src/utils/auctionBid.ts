// 🔨 야후 옥션 입찰 규칙
//
// 💡 야후는 입찰가를 **"여기까지 낼게요" 한도**로 받습니다. (자동 입찰 · 代理入札)
//    화면에 보이는 경매가는 "이기는 금액"이 아니라 지금까지 확정된 금액입니다.
//    누군가 한도 ¥1,000 을 걸어 두어도 화면에는 ¥500 으로 보일 수 있고,
//    그 상태에서 ¥600 으로 입찰하면 상대의 자동 입찰이 올라가며 곧바로 집니다.
//    숨은 한도는 알 방법이 없으므로, 우리가 할 수 있는 일은
//      · 최소 인상폭을 지키게 해서 **무조건 실패할 입찰을 막고**
//      · 입력한 금액이 '한도'라는 것을 알려 주는 것
//    두 가지입니다.

/** 금액대별 최소 인상폭 (야후 옥션 입찰 단위) */
const BID_INCREMENTS: { upTo: number; step: number }[] = [
  { upTo: 1000, step: 10 },
  { upTo: 5000, step: 100 },
  { upTo: 10000, step: 250 },
  { upTo: 50000, step: 500 },
  { upTo: Infinity, step: 1000 },
];

/** 지금 경매가 기준 최소 인상폭 (엔) */
export function bidIncrement(currentPrice: number): number {
  const price = Math.max(0, Number(currentPrice) || 0);
  return BID_INCREMENTS.find(r => price < r.upTo)?.step ?? 1000;
}

/**
 * 다음 입찰이 가능한 **최소 금액** (엔).
 * 이보다 적게 걸면 야후가 입찰 자체를 거부합니다.
 */
export function minNextBid(currentPrice: number): number {
  const price = Math.max(0, Number(currentPrice) || 0);
  if (price <= 0) return 1;
  return price + bidIncrement(price);
}

/** 화면에 그대로 쓰는 안내. 입찰가는 '한도'라는 점을 분명히 합니다. */
export const BID_LIMIT_NOTICE =
  '입력하신 금액은 최대 한도입니다. 실제로는 필요한 만큼만 올라가고, 다른 분이 더 높은 한도를 걸어 두었으면 이 금액으로는 낙찰되지 않을 수 있어요.';

/** 지금 경매가 옆에 붙이는 짧은 주석 */
export const BID_HIDDEN_LIMIT_HINT = '다른 분의 한도가 더 높을 수 있어요';
