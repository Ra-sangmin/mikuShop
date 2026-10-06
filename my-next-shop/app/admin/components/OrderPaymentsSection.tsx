"use client";

// 💳 주문 상세 > 결제 내역 · 결제 취소
//
// 이 주문이 들어간 카드 결제와, 그중 이 주문 몫을 보여 줍니다. (결제 한 건에 여러 주문이 함께 들어갈 수 있습니다)
// 돌려줄 돈(구매 실패 · 패찰 보증금 · 남는 보증금 · 차액)은 여기서 금액을 정해 '결제 취소'로 돌려줍니다.
// 토스 정책상 환불은 결제했던 카드로만 합니다. 자동으로 취소하지 않습니다 — 관리자가 금액을 보고 직접 누릅니다.
//   API: app/api/admin/payments   스타일: app/admin/orders/orders-premium.css 의 ord-pay
import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, ArrowCounterClockwise, CircleNotch } from '@phosphor-icons/react';

type PushToast = (type: 'success' | 'error', message: string) => void;

type PaymentRow = {
  id: number;
  amount: number;
  canceledAmount: number;
  cancelable: number;
  cancels: { amount: number; reason: string; canceledBy: string | null; createdAt: string }[];
  payment: {
    tossOrderId: string;
    purposeLabel: string;
    amount: number;
    status: string;
    method: string | null;
    approvedAt: string | null;
    orderCount: number;
  };
};

const STATUS_TEXT: Record<string, string> = {
  DONE: '결제 완료',
  PARTIAL_CANCELED: '일부 취소',
  CANCELED: '전액 취소',
};

const won = (n: number) => `${Math.round(n).toLocaleString()}원`;
const when = (v?: string | null) => (v ? new Date(v).toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-');

export default function OrderPaymentsSection({ orderId, pushToast }: { orderId: string; pushToast: PushToast }) {
  const [rows, setRows] = useState<PaymentRow[] | null>(null);
  // 취소 입력을 펼친 결제 몫 (한 번에 하나)
  const [openId, setOpenId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/admin/payments?orderId=${encodeURIComponent(orderId)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setRows(d?.success ? d.items : []))
      .catch(() => setRows([]));
  }, [orderId]);
  useEffect(() => { load(); }, [load]);

  const openCancel = (row: PaymentRow) => {
    setOpenId(row.id);
    setAmount(String(row.cancelable)); // 남은 몫 전부를 기본값으로 — 부분 취소면 고쳐 씁니다
    setReason('');
  };

  const submitCancel = async (row: PaymentRow) => {
    const value = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    if (!value || value <= 0) return pushToast('error', '취소할 금액을 입력해 주세요.');
    if (value > row.cancelable) return pushToast('error', `이 주문에서 취소할 수 있는 금액은 ${won(row.cancelable)}입니다.`);
    if (!reason.trim()) return pushToast('error', '취소 사유를 입력해 주세요. (회원에게 보이는 결제 내역에 남습니다)');

    setBusy(true);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentItemId: row.id, amount: value, reason: reason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        pushToast('error', data?.message || '결제 취소에 실패했습니다.');
      } else {
        pushToast('success', `${won(value)} 결제 취소를 완료했습니다.`);
        setOpenId(null);
        load();
      }
    } catch {
      pushToast('error', '서버와 통신하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ord-detail-sec">
      <div className="ord-detail-sec-title"><CreditCard size={14} weight="bold" /> 결제 내역</div>

      {rows === null && <div className="ord-detail-empty"><CircleNotch size={15} weight="bold" className="ord-spin" /> 불러오는 중…</div>}
      {rows?.length === 0 && <div className="ord-detail-empty">카드 결제 내역이 없습니다</div>}

      {rows?.map(row => (
        <div key={row.id} className="ord-pay">
          <div className="ord-pay-head">
            <span className="ord-pay-kind">{row.payment.purposeLabel}</span>
            <span className={`ord-pay-status is-${row.payment.status.toLowerCase()}`}>{STATUS_TEXT[row.payment.status] || row.payment.status}</span>
            <span className="ord-pay-date">{when(row.payment.approvedAt)}</span>
          </div>
          <dl className="ord-detail-list">
            <div><dt>이 주문 몫</dt><dd className="is-strong">{won(row.amount)}</dd></div>
            {row.payment.orderCount > 1 && (
              <div><dt>결제 전체</dt><dd>{won(row.payment.amount)} · 주문 {row.payment.orderCount}건 함께 결제</dd></div>
            )}
            {row.canceledAmount > 0 && <div><dt>취소한 금액</dt><dd>{won(row.canceledAmount)}</dd></div>}
            <div><dt>결제 수단</dt><dd>{row.payment.method || '-'}</dd></div>
            <div><dt>토스 주문번호</dt><dd className="ord-pay-mono">{row.payment.tossOrderId}</dd></div>
          </dl>

          {row.cancels.length > 0 && (
            <ul className="ord-pay-cancels">
              {row.cancels.map((c, i) => (
                <li key={i}>
                  <b>-{won(c.amount)}</b> {c.reason}
                  <span>{when(c.createdAt)}{c.canceledBy ? ` · ${c.canceledBy}` : ''}</span>
                </li>
              ))}
            </ul>
          )}

          {row.cancelable > 0 && openId !== row.id && (
            <button type="button" className="ord-pay-cancel-btn" onClick={() => openCancel(row)}>
              <ArrowCounterClockwise size={14} weight="bold" /> 결제 취소 (최대 {won(row.cancelable)})
            </button>
          )}

          {openId === row.id && (
            <div className="ord-pay-form">
              <label className="ord-modal-label">취소 금액 (원)</label>
              <input className="ord-modal-input" inputMode="numeric" value={amount}
                onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))} />
              <label className="ord-modal-label">취소 사유</label>
              <input className="ord-modal-input" value={reason} maxLength={200}
                placeholder="예) 낙찰 실패 보증금 환불 · 품절로 구매 실패"
                onChange={e => setReason(e.target.value)} />
              <p className="ord-pay-note">결제하신 카드로 바로 취소됩니다. 되돌릴 수 없으니 금액을 한 번 더 확인해 주세요.</p>
              <div className="ord-pay-actions">
                <button type="button" className="ord-modal-btn is-cancel" disabled={busy} onClick={() => setOpenId(null)}>닫기</button>
                <button type="button" className="ord-modal-btn is-danger" disabled={busy} onClick={() => submitCancel(row)}>
                  {busy ? <><CircleNotch size={15} weight="bold" className="ord-spin" /> 취소 중…</> : <>{won(parseInt(amount || '0', 10) || 0)} 취소하기</>}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
