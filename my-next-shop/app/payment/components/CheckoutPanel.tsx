'use client';

// 💳 카드 결제 본문 — 결제 화면(/payment/checkout)과 장바구니 위 결제 팝업(PaymentCheckoutModal)이 함께 씁니다.
//
// 금액·주문명은 서버가 만든 결제 건(/api/payments)에서만 가져옵니다. 화면에서 바꿀 수 없습니다.
//
// 결제창을 띄운 뒤 결과를 받는 방식이 둘입니다.
//   · 팝업 + PC   → 토스 'Promise 방식'. 페이지 이동 없이 결과(paymentKey)를 받아 이 자리에서 승인까지 끝냅니다.
//   · 그 밖(모바일 · 결제 페이지) → 'Redirect 방식'. 카드사 앱 인증 뒤 /payment/success 로 돌아와 승인합니다.
//   ⚠️ 토스는 Promise 방식을 PC 에서만 지원합니다. 모바일은 카드사 앱으로 넘어갔다 돌아와야 해서 이동이 꼭 필요합니다.
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { loadPaymentWidget, type PaymentWidgetInstance } from '@tosspayments/payment-widget-sdk';
import '../payment-premium.css';
import { CreditCard, LockKey, WarningOctagon, ArrowLeft, ShieldCheck, CheckCircle, X } from '@phosphor-icons/react';

type CheckoutPayment = {
  id: string;
  purposeLabel: string;
  orderName: string;
  amount: number;
  status: string;
  customerKey: string;
  customerName?: string | null;
  customerEmail?: string | null;
  items: { orderId: string; productName: string; productImageUrl?: string | null; amount: number }[];
};

// 🌟 환경 변수 적용 (운영/테스트 키 분리)
const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm';

/** 토스가 Promise 방식을 지원하지 않는 환경(모바일 브라우저·앱) */
const isMobileBrowser = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

type Phase = 'loading' | 'ready' | 'confirming' | 'done' | 'error';

export default function CheckoutPanel({ id, inModal = false, onClose, onPaid }: {
  /** 결제 건 번호 (/api/payments POST 가 돌려준 토스 주문번호) */
  id: string | null;
  /** 장바구니 위 팝업으로 열렸는지 — PC 면 이동 없이 결제를 끝냅니다 */
  inModal?: boolean;
  /** 닫기 · 돌아가기 */
  onClose: () => void;
  /** 이 자리에서 결제가 끝났을 때 (팝업 + PC) */
  onPaid?: () => void;
}) {
  const [payment, setPayment] = useState<CheckoutPayment | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');
  const [widgetReady, setWidgetReady] = useState(false);
  // 결제 수단 영역이 실제로 화면에 그려졌는지 (토스 'ready' 이벤트) · 결제 수단을 골랐는지 · 필수 약관 동의
  // ⚠️ renderPaymentMethods 는 호출 즉시 돌아오지만 실제 그리기는 비동기라, 그 전에 결제를 누르면 토스가 에러를 냅니다.
  const [methodsReady, setMethodsReady] = useState(false);
  const [methodSelected, setMethodSelected] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<{ approvedAt?: string; method?: string } | null>(null);
  const widgetRef = useRef<PaymentWidgetInstance | null>(null);
  const methodsRef = useRef<ReturnType<PaymentWidgetInstance['renderPaymentMethods']> | null>(null);

  // 토스 위젯이 그려질 자리. 결제 건마다 다른 id 를 써서 팝업을 닫았다 다시 열어도 겹치지 않게 합니다.
  const methodsId = `toss-methods-${id ?? 'none'}`;
  const agreementId = `toss-agreement-${id ?? 'none'}`;

  const fail = (message: string) => { setError(message); setPhase('error'); };

  // 1. 결제 건 불러오기
  useEffect(() => {
    if (!id) { fail('결제 정보가 없습니다. 진행 현황에서 다시 결제해 주세요.'); return; }
    fetch(`/api/payments?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (!d?.success) return fail(d?.message || '결제 정보를 불러오지 못했습니다.');
        if (d.payment.status !== 'READY') return fail('이미 처리된 결제입니다. 진행 현황에서 확인해 주세요.');
        setPayment(d.payment);
        setPhase('ready');
      })
      .catch(() => fail('서버와 통신하지 못했습니다.'));
  }, [id]);

  // 2. 토스 결제위젯 그리기
  useEffect(() => {
    if (!payment) return;
    let cancelled = false;
    (async () => {
      try {
        const widget = await loadPaymentWidget(CLIENT_KEY, payment.customerKey);
        if (cancelled) return;
        setMethodsReady(false);
        setMethodSelected(false);
        const methods = widget.renderPaymentMethods(`#${methodsId}`, { value: payment.amount }, { variantKey: 'DEFAULT' });
        methods.on('ready', () => { if (!cancelled) setMethodsReady(true); });
        methods.on('customPaymentMethodSelect', () => { if (!cancelled) setMethodSelected(true); });
        methods.on('customPaymentMethodUnselect', () => { if (!cancelled) setMethodSelected(false); });
        const agreement = widget.renderAgreement(`#${agreementId}`, { variantKey: 'AGREEMENT' });
        agreement.on('change', (status) => { if (!cancelled) setAgreed(!!status?.agreedRequiredTerms); });
        methodsRef.current = methods;
        widgetRef.current = widget;
        setWidgetReady(true);
      } catch (e) {
        console.error('토스 위젯 로드 실패:', e);
        if (!cancelled) fail('결제 모듈을 불러오지 못했습니다. 다시 시도해 주세요.');
      }
    })();
    return () => { cancelled = true; };
  }, [payment, methodsId, agreementId]);

  // 3. 결제 수단 선택 여부 — 일반 결제 수단(카드·간편결제)은 토스가 선택 이벤트를 주지 않아 잠깐씩 확인합니다.
  useEffect(() => {
    if (!methodsReady) return;
    const check = () => {
      try {
        const m = methodsRef.current?.getSelectedPaymentMethod();
        setMethodSelected(!!(m && (m.method || m.paymentMethodKey || m.easyPay?.provider || (m.type && m.type !== 'NORMAL'))));
      } catch { /* 위젯이 아직 준비 중이면 다음 확인 때 다시 봅니다 */ }
    };
    check();
    const timer = window.setInterval(check, 400);
    return () => window.clearInterval(timer);
  }, [methodsReady]);

  const canPay = widgetReady && methodsReady && methodSelected && agreed && !paying;

  const handlePay = async () => {
    if (!payment || !widgetRef.current || !canPay) return;
    setError('');
    setPaying(true);
    const base = {
      orderId: payment.id,
      orderName: payment.orderName,
      customerName: payment.customerName || undefined,
      customerEmail: payment.customerEmail || undefined,
    };

    try {
      // 📱 모바일 · 결제 페이지 — 카드사 인증 뒤 /payment/success 로 이동해 승인합니다.
      if (!inModal || isMobileBrowser()) {
        await widgetRef.current.requestPayment({
          ...base,
          successUrl: `${window.location.origin}/payment/success`,
          failUrl: `${window.location.origin}/payment/fail`,
        });
        return;
      }

      // 🖥 팝업 + PC — 결과를 이 자리에서 받아 바로 승인합니다.
      const result = await widgetRef.current.requestPayment(base);
      if (!result) { setPaying(false); return; }

      setPhase('confirming');
      const res = await fetch('/api/payment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentKey: result.paymentKey, orderId: result.orderId, amount: result.amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        fail(data?.message || '결제 승인에 실패했습니다. 결제가 승인되지 않았다면 금액은 청구되지 않습니다.');
        return;
      }
      setReceipt({ approvedAt: data?.data?.approvedAt, method: data?.data?.method });
      setPhase('done');
    } catch (e: any) {
      // 회원이 결제창을 닫으면 USER_CANCEL 로 옵니다. 다시 누를 수 있게만 풀어 둡니다.
      if (e?.code !== 'USER_CANCEL') {
        console.error('결제 요청 에러:', e);
        if (e?.message) setError(e.message);
      }
      setPaying(false);
    }
  };

  const closeButton = inModal && phase !== 'confirming' && (
    <button type="button" className="pay-modal-close" onClick={phase === 'done' ? onPaid : onClose} aria-label="닫기">
      <X size={18} weight="bold" />
    </button>
  );

  if (phase === 'error') {
    return (
      <div className="pay-card">
        {closeButton}
        <div className="pay-body pay-fade">
          <div className="pay-mark is-error"><WarningOctagon size={44} weight="fill" /></div>
          <h2 className="pay-title">결제를 진행할 수 없습니다</h2>
          <div className="pay-error-panel"><p className="pay-error-msg">{error}</p></div>
          <div className="pay-actions">
            <button type="button" className="pay-btn is-primary" onClick={onClose}>
              <ArrowLeft size={16} weight="bold" /> {inModal ? '닫기' : '진행 현황으로 돌아가기'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'loading' || phase === 'confirming' || !payment) {
    return (
      <div className="pay-card">
        {closeButton}
        <div className="pay-body">
          <div className="pay-loader" aria-hidden="true">
            <span className="pay-loader-track" />
            <span className="pay-loader-core"><ShieldCheck size={30} weight="duotone" /></span>
          </div>
          <h2 className="pay-title">{phase === 'confirming' ? '결제를 승인하고 있습니다' : '결제 정보를 불러오는 중입니다'}</h2>
          {phase === 'confirming' && <p className="pay-desc">창을 닫지 말고 잠시만 기다려 주세요.</p>}
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="pay-card">
        {closeButton}
        <div className="pay-body pay-fade">
          <div className="pay-mark is-success">
            <span className="pay-ring" aria-hidden="true" />
            <CheckCircle size={46} weight="fill" />
          </div>
          <span className="pay-eyebrow is-success">PAYMENT COMPLETE</span>
          <h2 className="pay-title">결제가 완료되었습니다</h2>
          <p className="pay-desc">{payment.purposeLabel}가 주문에 바로 반영되었습니다.</p>
          <div className="pay-checkout-total">
            <span>{receipt?.method || '카드'} 결제</span>
            <strong translate="no">{payment.amount.toLocaleString()}<small>원</small></strong>
          </div>
          <div className="pay-actions">
            <button type="button" className="pay-btn is-primary" onClick={onPaid}>확인</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pay-card pay-checkout">
      {closeButton}
      <div className="pay-body">
        <span className="pay-eyebrow">{payment.purposeLabel}</span>
        <h2 className="pay-title">결제할 내역을 확인해 주세요</h2>

        <ul className="pay-items">
          {payment.items.map(item => (
            <li key={item.orderId} className="pay-item">
              {item.productImageUrl
                ? <img src={item.productImageUrl} alt="" className="pay-item-thumb" />
                : <span className="pay-item-thumb" aria-hidden="true" />}
              <span className="pay-item-name">{item.productName}</span>
              <span className="pay-item-amount" translate="no">{item.amount.toLocaleString()}원</span>
            </li>
          ))}
        </ul>

        <div className="pay-checkout-total">
          <span>최종 결제 금액</span>
          <strong translate="no">{payment.amount.toLocaleString()}<small>원</small></strong>
        </div>

        {!methodsReady && (
          <div className="pay-methods-loading" role="status" aria-live="polite">
            <span className="pay-spinner" aria-hidden="true" />
            결제 수단을 불러오는 중이에요…
          </div>
        )}
        <div id={methodsId} className={`pay-widget${methodsReady ? '' : ' is-loading'}`} />
        <div id={agreementId} className="pay-widget" />

        {error && <p className="pay-inline-error">{error}</p>}

        <div className="pay-actions">
          <button type="button" className="pay-btn is-primary" onClick={handlePay} disabled={!canPay} aria-busy={!methodsReady || paying}>
            {!methodsReady || paying
              ? <span className="pay-spinner is-light" aria-hidden="true" />
              : <CreditCard size={17} weight="bold" />}
            {paying ? '결제창을 여는 중…'
              : !methodsReady ? '결제 수단 불러오는 중…'
              : !methodSelected ? '결제 방법을 선택해 주세요'
              : !agreed ? '필수 약관에 동의해 주세요'
              : `${payment.amount.toLocaleString()}원 결제하기`}
          </button>
          {!inModal && (
            <button type="button" className="pay-btn is-ghost" onClick={onClose}>
              <ArrowLeft size={16} weight="bold" /> 돌아가기
            </button>
          )}
        </div>

        <p className="pay-checkout-note">
          결제 취소·환불은 결제하신 카드로만 진행됩니다. 자세한 내용은{' '}
          <Link href="/guide/refund" target={inModal ? '_blank' : undefined}>취소·환불 정책</Link>을 확인해 주세요.
        </p>
        <span className="pay-secure"><LockKey size={14} weight="fill" /> 토스페이먼츠 안전 결제</span>
      </div>
    </div>
  );
}
