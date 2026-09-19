'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import GuideLayout from '@/app/components/GuideLayout';
import '../payment-premium.css';
import {
  WarningOctagon, LockKey, ArrowCounterClockwise, Headset, Hash,
  CreditCard, ShieldWarning, Timer, CheckCircle,
} from '@phosphor-icons/react';

// 🌟 결제가 막히는 대표적인 이유. 고객이 스스로 확인할 수 있는 것만 적습니다.
const REASONS = [
  { icon: <CreditCard size={15} weight="duotone" />, text: '카드 한도 초과 또는 잔액 부족' },
  { icon: <ShieldWarning size={15} weight="duotone" />, text: '카드사 안전결제(ISP·앱카드) 인증 실패' },
  { icon: <Timer size={15} weight="duotone" />, text: '결제창을 닫았거나 인증 시간이 초과됨' },
];

function FailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 토스페이먼츠에서 넘겨주는 에러 파라미터 받기
  const message = searchParams.get('message') || '결제를 취소하셨거나 알 수 없는 오류가 발생했습니다.';
  const code = searchParams.get('code') || 'PAYMENT_FAILED';

  return (
    <div className="pay-page">
      <div className="pay-card">
        <div className="pay-body">

          <div className="pay-mark is-error">
            <span className="pay-ring" aria-hidden="true" />
            <WarningOctagon size={44} weight="fill" />
          </div>

          <span className="pay-eyebrow is-error">PAYMENT FAILED</span>
          <h2 className="pay-title">결제가 완료되지<br />않았습니다</h2>
          <p className="pay-desc">결제가 중단되어 금액은 청구되지 않았습니다.<br />아래 사유를 확인한 뒤 다시 시도해 주세요.</p>

          <div className="pay-error-panel">
            <span className="pay-error-eyebrow">ERROR MESSAGE</span>
            <p className="pay-error-msg">{message}</p>
            <span className="pay-error-code"><Hash size={12} weight="bold" /> {code}</span>
          </div>

          <div className="pay-reasons">
            <span className="pay-reasons-title">이런 경우에 주로 발생합니다</span>
            {REASONS.map(reason => (
              <div key={reason.text} className="pay-reason">
                {reason.icon}
                <span>{reason.text}</span>
              </div>
            ))}
          </div>

          <div className="pay-actions">
            <button type="button" className="pay-btn is-primary" onClick={() => router.push('/mypage/money/charge')}>
              <ArrowCounterClockwise size={16} weight="bold" /> 충전 페이지로 돌아가기
            </button>
            <button type="button" className="pay-btn is-ghost" onClick={() => router.push('/inquiry/kakaotalk')}>
              <Headset size={16} weight="bold" /> 고객센터 문의하기
            </button>
          </div>

          <span className="pay-secure">
            <CheckCircle size={14} weight="fill" /> 승인되지 않은 결제는 청구되지 않습니다
          </span>

        </div>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <GuideLayout title="결제 실패" type="money">
      {/* 🌟 useSearchParams를 사용할 때는 Suspense로 감싸는 것이 Next.js 권장 사항입니다 */}
      <Suspense fallback={
        <div className="pay-page">
          <div className="pay-card">
            <div className="pay-body">
              <div className="pay-loader" aria-hidden="true">
                <span className="pay-loader-track" />
                <span className="pay-loader-core"><LockKey size={28} weight="duotone" /></span>
              </div>
              <h2 className="pay-title">정보를 불러오는 중입니다</h2>
            </div>
          </div>
        </div>
      }>
        <FailContent />
      </Suspense>
    </GuideLayout>
  );
}
