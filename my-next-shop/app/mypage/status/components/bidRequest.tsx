// 🔨 입찰·추가 입찰 요청 (마이페이지 진행 현황 공용)
//
// 입찰 버튼이 두 곳(전체 진행 현황 page.tsx, 목록 OrderTable.tsx)에 있어 같은 흐름을 여기 모읍니다.
// 예전에는 두 곳이 각자 fetch 를 돌렸고, 한쪽(추가 입찰)에는 잔액 검사가 아예 없었습니다.
//
// 잔액이 모자라면 오류만 띄우지 않고 **충전으로 이어 줍니다.** 입찰은 보증금이 빠져야 접수되는데,
// "부족합니다"만 보여 주면 회원은 얼마를 더 넣어야 하는지 모른 채 화면을 떠납니다.
import React from 'react';

export const MONEY_CHARGE_PATH = '/mypage/money/charge';

export type InsufficientBalance = { need: number; balance: number; shortfall: number };
export type BidOutcome =
  | { ok: true }
  | { ok: false; message: string; insufficient?: InsufficientBalance };

/**
 * 입찰을 접수합니다. 성공하면 입찰 상태를 '입찰 대기중'으로 되돌리는 것까지 합니다.
 *
 * @param amount 기존 입찰가에 **더할** 금액 (서버가 increment 로 받습니다)
 *
 * 💰 보증금은 보내지 않습니다. 서버가 입찰가로 직접 계산합니다.
 *    (화면 값을 믿으면 보증금 0 으로 입찰하는 요청도 통과합니다)
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

    if (data?.code === 'INSUFFICIENT_BALANCE') {
      return {
        ok: false,
        message: data.error || '미쿠짱머니가 부족합니다.',
        insufficient: {
          need: Number(data.need) || 0,
          balance: Number(data.balance) || 0,
          shortfall: Number(data.shortfall) || 0,
        },
      };
    }
    return { ok: false, message: data?.error || '입찰에 실패했습니다.' };
  } catch {
    return { ok: false, message: '통신 에러가 발생했습니다.' };
  }
}

/** 잔액이 모자랄 때 보여 주는 안내. 얼마가 더 필요한지까지 알려 줍니다. */
export function InsufficientBalanceNotice({ need, balance, shortfall }: InsufficientBalance) {
  const won = (n: number) => `${Math.max(0, Math.round(n)).toLocaleString()}원`;
  return (
    <div style={{ lineHeight: 1.7 }}>
      <strong style={{ display: 'block', marginBottom: 8 }}>미쿠짱머니가 부족합니다</strong>
      <span style={{ fontSize: 14, color: '#475569' }}>
        이번에 낼 보증금은 <b>{won(need)}</b> 입니다.
        <br />
        현재 잔액 {won(balance)} · <b style={{ color: '#e11d48' }}>{won(shortfall)} 부족</b>
      </span>
      <span style={{ display: 'block', marginTop: 10, fontSize: 13.5, color: '#64748b' }}>
        충전하시면 이어서 입찰하실 수 있어요.
      </span>
    </div>
  );
}
