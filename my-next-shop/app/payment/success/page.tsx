'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import GuideLayout from '@/app/components/GuideLayout'; 
import { CheckCircle, XCircle, CircleNotch, Receipt } from "@phosphor-icons/react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

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
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(data.message || '결제 승인에 실패했습니다.');
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage('서버와 통신 중 문제가 발생했습니다.');
      }
    };

    // UX를 위해 최소 0.8초의 로딩 애니메이션을 보여준 후 실행
    const timer = setTimeout(() => confirmPayment(), 800);
    return () => clearTimeout(timer);
  }, [paymentKey, orderId, amount]);

  return (
    <div style={styles.container}>
      <PageStyles />
      <div className="premium-card fade-in-up">
        
        {/* =====================================
            1. 로딩 상태 UI 
        ===================================== */}
        {status === 'loading' && (
          <div style={styles.stateWrapper}>
            <div style={styles.iconCircle('rgba(210, 115, 119, 0.1)')}>
              <CircleNotch size={48} color="#d27377" weight="bold" className="spin-anim" />
            </div>
            <h2 style={styles.title}>결제를 안전하게<br/>처리하고 있습니다</h2>
            <p style={styles.desc}>창을 닫거나 새로고침하지 마시고<br/>잠시만 기다려주세요.</p>
          </div>
        )}

        {/* =====================================
            2. 성공 상태 UI (프리미엄 영수증 폼)
        ===================================== */}
        {status === 'success' && (
          <div style={styles.stateWrapper} className="fade-in">
            <div style={styles.iconCircle('rgba(16, 185, 129, 0.1)')}>
              <CheckCircle size={56} color="#10b981" weight="fill" className="pop-anim" />
            </div>
            <h2 style={styles.title}>결제가 성공적으로<br/>완료되었습니다!</h2>
            <p style={styles.desc}>미쿠짱머니 충전이 즉시 반영되었습니다.</p>

            {/* 영수증 박스 */}
            <div style={styles.receiptBox}>
              <div style={styles.receiptHeader}>
                <Receipt size={20} color="#64748b" weight="duotone" />
                <span>결제 상세 내역</span>
              </div>
              
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>주문 항목</span>
                <span style={styles.receiptValue}>미쿠짱머니 충전</span>
              </div>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>주문 번호</span>
                <span style={styles.receiptValueSmall}>{orderId}</span>
              </div>
              
              <div style={styles.receiptDivider}></div>
              
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabelTotal}>최종 결제 금액</span>
                <span style={styles.receiptTotal}>{parseInt(amount || '0').toLocaleString()}원</span>
              </div>
            </div>

            <button 
              className="premium-btn primary-btn"
              onClick={() => router.push('/mypage')}
            >
              마이페이지로 이동
            </button>
          </div>
        )}

        {/* =====================================
            3. 실패/에러 상태 UI
        ===================================== */}
        {status === 'error' && (
          <div style={styles.stateWrapper} className="fade-in">
            <div style={styles.iconCircle('rgba(239, 68, 68, 0.1)')}>
              <XCircle size={56} color="#ef4444" weight="fill" className="shake-anim" />
            </div>
            <h2 style={styles.title}>결제 승인 과정에서<br/>문제가 발생했습니다</h2>
            <p style={styles.descError}>{errorMessage}</p>
            
            <button 
              className="premium-btn secondary-btn"
              onClick={() => router.push('/mypage/money/charge')}
            >
              다시 시도하기
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <GuideLayout title="결제 처리" type="money">
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '100px', fontSize: '20px', fontWeight: 'bold', color: '#64748b' }}>페이지를 불러오는 중입니다...</div>}>
        <SuccessContent />
      </Suspense>
    </GuideLayout>
  );
}

// ==========================================
// 🌟 인라인 스타일 객체
// ==========================================
const styles: Record<string, any> = {
  container: {
    maxWidth: '540px',
    margin: '80px auto',
    padding: '0 20px',
    fontFamily: 'Pretendard, "Noto Sans KR", sans-serif',
  },
  stateWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  iconCircle: (bgColor: string) => ({
    width: '100px',
    height: '100px',
    backgroundColor: bgColor,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '28px',
  }),
  title: {
    fontSize: '28px',
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: '1.4',
    marginBottom: '12px',
    letterSpacing: '-0.5px',
  },
  desc: {
    color: '#64748b',
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '32px',
  },
  descError: {
    color: '#ef4444',
    fontSize: '15px',
    fontWeight: '600',
    backgroundColor: '#fef2f2',
    padding: '12px 20px',
    borderRadius: '12px',
    marginBottom: '32px',
  },
  receiptBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: '24px',
    padding: '28px',
    border: '1px solid #e2e8f0',
    marginBottom: '36px',
    textAlign: 'left',
  },
  receiptHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '800',
    color: '#475569',
    marginBottom: '20px',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '16px',
  },
  receiptRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  receiptLabel: {
    fontSize: '15px',
    color: '#64748b',
    fontWeight: '600',
  },
  receiptValue: {
    fontSize: '16px',
    color: '#0f172a',
    fontWeight: '700',
  },
  receiptValueSmall: {
    fontSize: '13px',
    color: '#94a3b8',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  receiptDivider: {
    borderBottom: '1px dashed #cbd5e1',
    margin: '20px 0',
  },
  receiptLabelTotal: {
    fontSize: '16px',
    color: '#334155',
    fontWeight: '800',
  },
  receiptTotal: {
    fontSize: '24px',
    color: '#d27377',
    fontWeight: '900',
  },
};

// ==========================================
// 🌟 전역 애니메이션 및 버튼 CSS
// ==========================================
function PageStyles() {
  return (
    <style jsx global>{`
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes popIn {
        0% { transform: scale(0.5); opacity: 0; }
        70% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }

      .fade-in-up { animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .fade-in { animation: fadeIn 0.5s ease-out forwards; }
      .spin-anim { animation: spin 1.2s linear infinite; }
      .pop-anim { animation: popIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .shake-anim { animation: shake 0.4s ease-in-out; }

      .premium-card {
        background-color: #fff;
        padding: 56px 48px;
        border-radius: 36px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.04);
        border: 1px solid #f1f5f9;
        position: relative;
        overflow: hidden;
      }

      .premium-btn {
        width: 100%;
        padding: 20px;
        border-radius: 20px;
        font-size: 18px;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .primary-btn {
        background: linear-gradient(135deg, #e3868a 0%, #d27377 100%);
        color: #fff;
        border: none;
        box-shadow: 0 10px 25px rgba(210, 115, 119, 0.25);
      }
      .primary-btn:hover {
        transform: translateY(-3px);
        box-shadow: 0 15px 35px rgba(210, 115, 119, 0.35);
      }

      .secondary-btn {
        background: #f8fafc;
        color: #475569;
        border: 1px solid #e2e8f0;
      }
      .secondary-btn:hover {
        background: #f1f5f9;
        color: #0f172a;
        border-color: #cbd5e1;
      }

      @media (max-width: 600px) {
        .premium-card { padding: 40px 24px; border-radius: 28px; }
        .receiptBox { padding: 20px; border-radius: 20px; }
      }
    `}</style>
  );
}