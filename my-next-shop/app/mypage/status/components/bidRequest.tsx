// 🔨 입찰·추가 입찰 요청 (마이페이지 진행 현황 공용)
//
// 입찰 버튼이 두 곳(전체 진행 현황 page.tsx, 목록 OrderTable.tsx)에 있어 같은 흐름을 여기 모읍니다.
//
// 💰 추가 입찰은 보증금을 더 받지 않습니다. 처음 낸 보증금 그대로 진행합니다. (app/api/orders/bid)
export type BidOutcome =
  | { ok: true }
  | { ok: false; message: string };

/**
 * 입찰을 접수합니다. 성공하면 입찰 상태를 '입찰 대기중'으로 되돌리는 것까지 합니다.
 *
 * @param amount 기존 입찰가에 **더할** 금액 (서버가 increment 로 받습니다)
 */
export async function requestBid(orderId: string, amount: number): Promise<BidOutcome> {
  try {
    const res = await fetch('/api/orders/bid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, amount }),
    });
    const data = await res.json().catch(() => ({} as any));

    if (res.ok) {
      // 입찰이 접수되면 상태를 다시 '입찰 대기중(PENDING)'으로 돌려 놓습니다.
      await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: [{ id: orderId, bidStatus: 'PENDING' }] }),
      });
      return { ok: true };
    }

    return { ok: false, message: data?.error || '입찰에 실패했습니다.' };
  } catch {
    return { ok: false, message: '통신 에러가 발생했습니다.' };
  }
}
