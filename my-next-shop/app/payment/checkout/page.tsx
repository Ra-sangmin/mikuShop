'use client';

// 💳 카드 결제 화면 (?id=<결제 건 번호>)
//
// 보통은 진행 현황 위에 뜨는 결제 팝업(PaymentCheckoutModal)에서 결제합니다.
// 이 화면은 주소로 직접 들어오거나 팝업을 쓸 수 없을 때를 위한 같은 내용의 페이지입니다. (본문: CheckoutPanel)
import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GuideLayout from '@/app/components/GuideLayout';
import CheckoutPanel from '../components/CheckoutPanel';
import '../payment-premium.css';

function CheckoutContent() {
  const router = useRouter();
  const id = useSearchParams().get('id');
  return (
    <div className="pay-page">
      <CheckoutPanel id={id} onClose={() => router.push('/mypage/status')} />
    </div>
  );
}

export default function PaymentCheckoutPage() {
  return (
    <GuideLayout title="결제하기" type="mypage">
      <Suspense fallback={null}>
        <CheckoutContent />
      </Suspense>
    </GuideLayout>
  );
}
