// 💳 토스페이먼츠 서버 API (승인 · 취소)
//
// 시크릿 키는 환경변수(TOSS_SECRET_KEY)에서만 읽습니다. 개발 환경에서만 토스 문서용 공개 테스트 키로 대체합니다.
// 결제위젯 연동 키(test_gsk_… / live_gsk_…)로 승인과 취소를 모두 부릅니다.
const TOSS_PAYMENTS_API = 'https://api.tosspayments.com/v1/payments';

export type TossResult<T = any> =
  | { ok: true; data: T }
  | { ok: false; status: number; code?: string; message: string };

function secretKey(): string {
  return process.env.TOSS_SECRET_KEY
    || (process.env.NODE_ENV !== 'production' ? 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6' : '');
}

async function call<T = any>(path: string, body: unknown, idempotencyKey?: string): Promise<TossResult<T>> {
  const key = secretKey();
  if (!key) {
    console.error('TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.');
    return { ok: false, status: 500, message: '결제 설정 오류입니다.' };
  }
  // 토스 API 스펙: "시크릿키:" 를 Base64 로 (끝의 콜론 필수)
  const headers: Record<string, string> = {
    Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
    'Content-Type': 'application/json',
  };
  // 같은 키로 다시 보내면 토스가 처음 결과를 돌려줍니다 — 네트워크가 끊겨 재시도해도 두 번 취소되지 않습니다.
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  try {
    const res = await fetch(`${TOSS_PAYMENTS_API}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, code: data?.code, message: data?.message || '토스 요청이 거절되었습니다.' };
    return { ok: true, data };
  } catch (error) {
    console.error('[토스] 통신 오류', path, error);
    return { ok: false, status: 502, message: '결제사와 통신하지 못했습니다.' };
  }
}

/** 결제 승인 — 결제창에서 돌아온 paymentKey · orderId · amount 를 그대로 넘깁니다 */
export const tossConfirm = (paymentKey: string, orderId: string, amount: number) =>
  call('/confirm', { paymentKey, orderId, amount });

/** 결제 취소. cancelAmount 를 주면 부분 취소, 없으면 남은 금액 전액 취소입니다. */
export const tossCancel = (paymentKey: string, cancelReason: string, cancelAmount?: number, idempotencyKey?: string) =>
  call(`/${encodeURIComponent(paymentKey)}/cancel`,
    cancelAmount ? { cancelReason, cancelAmount } : { cancelReason },
    idempotencyKey);
