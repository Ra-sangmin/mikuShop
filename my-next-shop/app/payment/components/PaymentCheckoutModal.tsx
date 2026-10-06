'use client';

// 💳 장바구니 위 결제 팝업 — 화면을 떠나지 않고 결제합니다.
//    PC 는 승인까지 이 팝업 안에서 끝나고, 모바일은 카드사 인증 뒤 완료 화면으로 이동합니다. (CheckoutPanel 참고)
import React, { useEffect } from 'react';
import CheckoutPanel from './CheckoutPanel';
import '../payment-premium.css';

export default function PaymentCheckoutModal({ id, onClose, onPaid }: {
  id: string;
  onClose: () => void;
  onPaid: () => void;
}) {
  // 팝업이 떠 있는 동안 뒤 화면이 스크롤되지 않게 합니다.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="pay-modal-overlay" role="dialog" aria-modal="true" aria-label="카드 결제">
      <div className="pay-modal pay-page">
        <CheckoutPanel id={id} inModal onClose={onClose} onPaid={onPaid} />
      </div>
    </div>
  );
}
