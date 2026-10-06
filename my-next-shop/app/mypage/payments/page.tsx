'use client';

// 💳 마이페이지 > 결제 내역
//
// 단계마다 카드로 결제한 내역과, 관리자가 돌려드린 취소(환불) 내역을 함께 보여 줍니다.
// (예전 '미쿠짱머니 이용 내역' 자리를 대신합니다. 충전·잔액은 더 이상 없습니다)
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import GuideLayout from '@/app/components/GuideLayout';
import '@/app/guide/guide-common.css';
import '../mypage-premium.css';
import './payments.css';

type PaymentRow = {
  tossOrderId: string;
  purposeLabel: string;
  orderName: string;
  amount: number;
  canceledAmount: number;
  status: 'DONE' | 'PARTIAL_CANCELED' | 'CANCELED';
  method: string | null;
  approvedAt: string | null;
  createdAt: string;
  cancels: { amount: number; reason: string; createdAt: string }[];
};

const STATUS_TEXT: Record<string, string> = {
  DONE: '결제 완료',
  PARTIAL_CANCELED: '일부 취소',
  CANCELED: '전액 취소',
};

const won = (n: number) => `${Math.round(n).toLocaleString()}원`;
const when = (v?: string | null) => (v
  ? new Date(v).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  : '-');

export default function MyPaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/payments', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => (d?.success ? setRows(d.payments) : setError(d?.message || '결제 내역을 불러오지 못했습니다.')))
      .catch(() => setError('서버와 통신하지 못했습니다.'));
  }, []);

  const summary = useMemo(() => {
    const list = rows ?? [];
    const paid = list.reduce((n, p) => n + p.amount, 0);
    const canceled = list.reduce((n, p) => n + p.canceledAmount, 0);
    return { count: list.length, paid, canceled, net: paid - canceled };
  }, [rows]);

  return (
    <GuideLayout title="결제 내역" type="mypage">
      <div className="miku-payments-page">
        <section className="mp-hero mp-anim" aria-label="결제 내역 요약">
          <div className="mp-hero-main">
            <div className="mp-avatar" aria-hidden="true"><i className="fa fa-receipt"></i></div>
            <div className="mp-hero-text">
              <span className="mp-eyebrow-dark">PAYMENTS</span>
              <h3 className="mp-hero-title">카드 <em>결제 · 취소</em> 내역</h3>
              <p className="mp-hero-desc">환불은 결제하신 카드로 취소해 드립니다. 카드사에 따라 반영까지 영업일 3~7일이 걸릴 수 있어요.</p>
            </div>
          </div>
          <div className="mp-hero-stats">
            <div className="mp-hero-stat"><span>결제 건수</span><strong>{summary.count}<small>건</small></strong></div>
            <div className="mp-hero-stat"><span>결제 금액</span><strong translate="no">{summary.paid.toLocaleString()}<small>원</small></strong></div>
            <div className="mp-hero-stat"><span>취소 금액</span><strong translate="no">{summary.canceled.toLocaleString()}<small>원</small></strong></div>
            <div className="mp-hero-stat"><span>실 결제</span><strong translate="no">{summary.net.toLocaleString()}<small>원</small></strong></div>
          </div>
        </section>

        <section className="mp-section">
          <div className="mp-section-head">
            <div>
              <span className="mp-eyebrow">History</span>
              <h2 className="mp-section-title">결제 내역</h2>
              <p className="mp-section-sub">
                취소·환불 기준은 <Link href="/guide/refund">취소·환불 정책</Link>을 확인해 주세요.
              </p>
            </div>
          </div>

          <div className="mp-panel">
            {error && <p className="mpay-empty">{error}</p>}
            {!error && rows === null && <p className="mpay-empty">불러오는 중…</p>}
            {!error && rows?.length === 0 && (
              <p className="mpay-empty">아직 결제 내역이 없습니다. <Link href="/mypage/status">진행 현황</Link>에서 결제하시면 여기에 표시됩니다.</p>
            )}

            {rows && rows.length > 0 && (
              <ul className="mpay-list">
                {rows.map(p => (
                  <li key={p.tossOrderId} className="mpay-item">
                    <div className="mpay-head">
                      <span className="mpay-kind">{p.purposeLabel}</span>
                      <span className={`mpay-status is-${p.status.toLowerCase()}`}>{STATUS_TEXT[p.status] || p.status}</span>
                      <span className="mpay-date">{when(p.approvedAt || p.createdAt)}</span>
                    </div>
                    <div className="mpay-body">
                      <span className="mpay-name">{p.orderName}</span>
                      <strong className={`mpay-amount ${p.status === 'CANCELED' ? 'is-void' : ''}`} translate="no">{won(p.amount)}</strong>
                    </div>
                    <div className="mpay-meta">
                      <span>{p.method || '카드'}</span>
                      <span className="mpay-mono">{p.tossOrderId}</span>
                    </div>
                    {p.cancels.length > 0 && (
                      <ul className="mpay-cancels">
                        {p.cancels.map((c, i) => (
                          <li key={i}>
                            <span>{when(c.createdAt)} · {c.reason}</span>
                            <b translate="no">-{won(c.amount)}</b>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </GuideLayout>
  );
}
