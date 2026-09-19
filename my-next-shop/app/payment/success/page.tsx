'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import GuideLayout from '@/app/components/GuideLayout';
import '../payment-premium.css';
import {
  CheckCircle, WarningOctagon, ShieldCheck, Receipt, Package, Hash,
  Clock, CreditCard, Wallet, LockKey, ArrowRight, ArrowCounterClockwise, Headset,
} from '@phosphor-icons/react';

interface ConfirmResult {
  approvedAt?: string;
  method?: string;
  balance?: number;
}

/** 토스에서 내려주는 승인 일시(ISO)를 "2026. 09. 18. 14:32" 형태로 */
function formatApprovedAt(value?: string) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return '-';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}. ${p(d.getMonth() + 1)}. ${p(d.getDate())}. ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<ConfirmResult>({});
  // 🌟 로딩 화면의 진행 단계 (0: 결제 요청 완료 → 1: 승인 확인 중 → 2: 충전 반영)
  const [step, setStep] = useState(1);

  useEffect(() => {
    const confirmPayment = async () => {
      if (!paymentKey || !orderId || !amount) {
        setStatus('error');
        setErrorMessage('결제 정보가 유실되었습니다.');
        return;
      }

      const userId = localStorage.getItem('user_id');
      if (!userId) {
        setStatus('error');
        setErrorMessage('로그인 정보가 없습니다. 관리자에게 문의해주세요.');
        return;
      }

      try {
        const res = await fetch('/api/payment/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentKey, orderId, amount, userId }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setStep(2);
          setResult({
            approvedAt: data?.data?.approvedAt,
            method: data?.data?.method,
            balance: data?.dbResult?.balance,
          });
          // 마지막 단계가 채워지는 것을 잠깐 보여준 뒤 결과로 넘어갑니다.
          setTimeout(() => setStatus('success'), 450);
        } else {
          setStatus('error');
          setErrorMessage(data.message || '결제 승인에 실패했습니다.');
        }
      } catch {
        setStatus('error');
        setErrorMessage('서버와 통신 중 문제가 발생했습니다.');
      }
    };

    // UX를 위해 최소 0.8초의 로딩 애니메이션을 보여준 후 실행
    const timer = setTimeout(() => confirmPayment(), 800);
    return () => clearTimeout(timer);
  }, [paymentKey, orderId, amount]);

  const amountNum = parseInt(amount || '0', 10);

  return (
    <div className="pay-page">
      <div className="pay-card">
        <div className="pay-body">

          {/* ===== 1. 승인 처리 중 ===== */}
          {status === 'loading' && (
            <>
              <div className="pay-loader" aria-hidden="true">
                <span className="pay-loader-track" />
                <span className="pay-loader-core"><ShieldCheck size={30} weight="duotone" /></span>
              </div>
              <span className="pay-eyebrow">PAYMENT IN PROGRESS</span>
              <h2 className="pay-title">결제를 안전하게<br />처리하고 있습니다</h2>
              <p className="pay-desc">창을 닫거나 새로고침하지 마시고<br />잠시만 기다려 주세요.</p>

              <div className="pay-steps" role="list">
                {['결제 요청', '승인 확인', '충전 반영'].map((label, i) => (
                  <div
                    key={label}
                    role="listitem"
                    className={`pay-step ${i < step ? 'is-done' : i === step ? 'is-active' : ''}`}
                  >
                    <span className="pay-step-dot">
                      {i < step ? <CheckCircle size={15} weight="fill" /> : i + 1}
                    </span>
                    <span className="pay-step-label">{label}</span>
                  </div>
                ))}
              </div>

              <span className="pay-secure"><LockKey size={14} weight="fill" /> 토스페이먼츠 안전 결제로 보호되고 있습니다</span>
            </>
          )}

          {/* ===== 2. 결제 완료 (영수증) ===== */}
          {status === 'success' && (
            <div className="pay-fade" style={{ display: 'contents' }}>
              <div className="pay-mark is-success">
                <span className="pay-ring" aria-hidden="true" />
                <span className="pay-ring" aria-hidden="true" />
                <CheckCircle size={46} weight="fill" />
              </div>
              <span className="pay-eyebrow is-success">PAYMENT COMPLETE</span>
              <h2 className="pay-title">결제가 정상적으로<br />완료되었습니다</h2>
              <p className="pay-desc">미쿠짱머니 충전이 계정에 즉시 반영되었습니다.</p>

              {/* 영수증 */}
              <div className="pay-receipt">
                <div className="pay-receipt-head">
                  <Receipt size={16} weight="duotone" />
                  RECEIPT
                  <span className="pay-receipt-chip">승인 완료</span>
                </div>

                <div className="pay-row">
                  <span className="pay-row-label"><Package size={15} weight="duotone" /> 주문 항목</span>
                  <span className="pay-row-value">미쿠짱머니 충전</span>
                </div>
                <div className="pay-row">
                  <span className="pay-row-label"><CreditCard size={15} weight="duotone" /> 결제 수단</span>
                  <span className="pay-row-value">{result.method || '신용·체크카드'}</span>
                </div>
                <div className="pay-row">
                  <span className="pay-row-label"><Clock size={15} weight="duotone" /> 승인 일시</span>
                  <span className="pay-row-value">{formatApprovedAt(result.approvedAt)}</span>
                </div>
                <div className="pay-row">
                  <span className="pay-row-label"><Hash size={15} weight="duotone" /> 주문 번호</span>
                  <span className="pay-row-value is-mono">{orderId}</span>
                </div>

                <div className="pay-perf" aria-hidden="true" />

                <div className="pay-total">
                  <span className="pay-total-label">최종 결제 금액</span>
                  <strong className="pay-total-value" translate="no">
                    {amountNum.toLocaleString()}
                    <span className="pay-krw">KRW</span>
                  </strong>
                </div>
              </div>

              {typeof result.balance === 'number' && (
                <div className="pay-balance">
                  <span className="pay-balance-icon" aria-hidden="true"><Wallet size={17} weight="duotone" /></span>
                  <span className="pay-balance-text">
                    충전 후 보유 머니 <strong translate="no">{result.balance.toLocaleString()}원</strong>
                  </span>
                </div>
              )}

              <div className="pay-actions">
                <button type="button" className="pay-btn is-primary" onClick={() => router.push('/mypage')}>
                  마이페이지로 이동 <ArrowRight size={16} weight="bold" />
                </button>
                <button type="button" className="pay-btn is-ghost" onClick={() => router.push('/mypage/money/history')}>
                  <Receipt size={16} weight="bold" /> 머니 이용 내역 보기
                </button>
              </div>

              <span className="pay-secure"><LockKey size={14} weight="fill" /> 토스페이먼츠 안전 결제</span>
            </div>
          )}

          {/* ===== 3. 승인 실패 ===== */}
          {status === 'error' && (
            <div className="pay-fade" style={{ display: 'contents' }}>
              <div className="pay-mark is-error">
                <span className="pay-ring" aria-hidden="true" />
                <WarningOctagon size={44} weight="fill" />
              </div>
              <span className="pay-eyebrow is-error">PAYMENT FAILED</span>
              <h2 className="pay-title">결제 승인 과정에서<br />문제가 발생했습니다</h2>
              <p className="pay-desc">결제가 완료되지 않았습니다. 아래 사유를 확인해 주세요.</p>

              <div className="pay-error-panel">
                <span className="pay-error-eyebrow">ERROR MESSAGE</span>
                <p className="pay-error-msg">{errorMessage}</p>
                {orderId && <span className="pay-error-code"><Hash size={12} weight="bold" /> {orderId}</span>}
              </div>

              <div className="pay-actions">
                <button type="button" className="pay-btn is-primary" onClick={() => router.push('/mypage/money/charge')}>
                  <ArrowCounterClockwise size={16} weight="bold" /> 다시 시도하기
                </button>
                <button type="button" className="pay-btn is-ghost" onClick={() => router.push('/inquiry/kakaotalk')}>
                  <Headset size={16} weight="bold" /> 고객센터 문의하기
                </button>
              </div>

              <span className="pay-secure"><LockKey size={14} weight="fill" /> 결제가 승인되지 않은 경우 금액은 청구되지 않습니다</span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <GuideLayout title="결제 처리" type="money">
      <Suspense fallback={
        <div className="pay-page">
          <div className="pay-card">
            <div className="pay-body">
              <div className="pay-loader" aria-hidden="true">
                <span className="pay-loader-track" />
                <span className="pay-loader-core"><ShieldCheck size={30} weight="duotone" /></span>
              </div>
              <h2 className="pay-title">결제 정보를 불러오는 중입니다</h2>
            </div>
          </div>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </GuideLayout>
  );
}
