'use client';

import React, { useState, useEffect, useRef } from 'react';
import GuideLayout from '@/app/components/GuideLayout';
import { loadPaymentWidget, PaymentWidgetInstance } from "@tosspayments/payment-widget-sdk";
import { useRouter } from 'next/navigation';
import { useMikuAlert } from '@/app/context/MikuAlertContext'; // 🌟 Context 임포트

// ==========================================
// 🎨 1. 디자인 및 스타일 시스템
// ==========================================
const s = {
  container: { maxWidth: '672px', margin: '0 auto', padding: '48px 16px', fontFamily: 'Pretendard, "Noto Sans KR", sans-serif' },
  card: { backgroundColor: '#fff', borderRadius: '32px', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.04)', border: '1px solid #e2e8f0', padding: '40px' },
  pageTitle: { fontSize: '26px', fontWeight: '900', color: '#0f172a', marginBottom: '32px', textAlign: 'center' as const },
  formWrapper: { display: 'flex', flexDirection: 'column' as const, gap: '28px' },
  
  moneySummaryBox: { backgroundColor: '#f8fafc', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' },
  moneySummaryLabel: { color: '#475569', fontWeight: '600', fontSize: '15px' },
  moneySummaryValue: { fontSize: '22px', fontWeight: '900', color: '#ff4b2b' },
  
  label: { display: 'block', fontSize: '14px', fontWeight: '800', color: '#334155', marginBottom: '8px' },
  inputContainer: { position: 'relative' as const },
  inputWrapper: (isFocused: boolean) => ({ width: '100%', padding: '16px 20px', borderRadius: '16px', border: `1px solid ${isFocused ? '#ff4b2b' : '#e2e8f0'}`, fontSize: '18px', fontWeight: '600', color: '#0f172a', boxShadow: isFocused ? '0 0 0 4px rgba(255, 75, 43, 0.1)' : 'none', transition: 'all 0.3s ease', outline: 'none', boxSizing: 'border-box' as const }),
  currencyUnit: { position: 'absolute' as const, right: '20px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: '#94a3b8' },
  quickBtnWrapper: { display: 'flex', gap: '8px', marginTop: '12px' },
  quickBtn: { padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer', flex: 1 },
  
  methodGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  methodBtn: (isActive: boolean) => ({ padding: '16px', borderRadius: '16px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s ease', border: '2px solid', backgroundColor: isActive ? '#fff1f0' : '#fff', color: isActive ? '#ff4b2b' : '#64748b', borderColor: isActive ? '#ff4b2b' : '#e2e8f0' }),
  
  animatedSection: { animation: 'slideUp 0.4s ease-out' },
  accountInfoBox: { backgroundColor: '#f1f5f9', padding: '20px', borderRadius: '20px', border: '1px dashed #cbd5e1', marginBottom: '24px' },
  accountInfoLabel: { fontSize: '13px', color: '#64748b', fontWeight: '700', marginBottom: '4px' },
  accountNumber: { fontSize: '17px', fontWeight: '900', color: '#0f172a' },
  accountOwner: { fontSize: '14px', fontWeight: '700', color: '#475569' },
  warningBox: { backgroundColor: '#fff9f5', padding: '20px', borderRadius: '16px', fontSize: '13px', color: '#9a3412', lineHeight: '1.8', border: '1px solid #ffedd5' },
  warningList: { paddingLeft: '18px', margin: 0 },
  
  cardWidgetWrapper: (isVisible: boolean) => ({ display: isVisible ? 'block' : 'none', animation: 'slideUp 0.4s ease-out' }),
  fullWidth: { width: '100%' },
  agreementWrapper: { width: '100%', marginTop: '12px' },
  
  submitBtn: (loading: boolean) => ({ width: '100%', padding: '20px', backgroundColor: loading ? '#cbd5e1' : '#ff4b2b', color: '#fff', borderRadius: '20px', fontWeight: '900', fontSize: '18px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 8px 20px rgba(255, 75, 43, 0.2)', transition: 'all 0.3s ease' })
};

const globalAnimation = `
  input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .anim { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
`;

// ==========================================
// 🧠 2. 비즈니스 로직 훅
// ==========================================
function useMoneyChargeLogic() {
  const router = useRouter(); 
  const { showAlert } = useMikuAlert(); // 🌟 미쿠짱 전역 Alert Context 연동
  const hasAlerted = useRef(false); 

  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [amount, setAmount] = useState<string>('');
  const [depositor, setDepositor] = useState<string>('');
  const [method, setMethod] = useState<'card' | 'transfer'>('transfer');
  const [currentMoney, setCurrentMoney] = useState<number>(0);
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const [paymentWidget, setPaymentWidget] = useState<PaymentWidgetInstance | null>(null);
  const paymentMethodsWidgetRef = useRef<any>(null);
  const clientKey = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

  useEffect(() => { 
    const storedId = localStorage.getItem('user_id');
    
    if (!storedId) {
      if (!hasAlerted.current) {
        hasAlerted.current = true;
        showAlert('로그인이 필요한 페이지입니다.', 'warning'); // 🌟 경고 메시지 띄우기
        router.push('/login'); // 페이지 라우팅
      }
      return; 
    }

    setIsAuthChecking(false);

    const fetchUserMoney = async () => {
      try {
        const res = await fetch(`/api/users?id=${storedId}`);
        const data = await res.json();
        if (data.success) setCurrentMoney(data.user.cyberMoney || 0);
      } catch (err) {
        console.error("머니 로드 실패:", err);
      }
    };

    fetchUserMoney(); 
    
    (async () => {
      try {
        let validCustomerKey = 'GUEST_' + Date.now();
        const cleanedId = storedId.replace(/[^a-zA-Z0-9\-_=.@]/g, '');
        
        if (cleanedId.length >= 2) {
          validCustomerKey = cleanedId.substring(0, 50);
        } else {
          validCustomerKey = 'USER_' + Date.now();
        }
        
        const widget = await loadPaymentWidget(clientKey, validCustomerKey);
        setPaymentWidget(widget);
      } catch (error) {
        console.error("토스 위젯 로드 실패:", error);
      }
    })();
  }, [router, showAlert]);

  useEffect(() => {
    if (paymentWidget == null) return;

    if (method === 'card') {
      const initialAmount = Math.max(parseInt(amount || '0'), 5000); 
      
      const paymentMethodsWidget = paymentWidget.renderPaymentMethods(
        '#payment-widget',
        { value: initialAmount },
        { variantKey: 'DEFAULT' }
      );
      
      paymentWidget.renderAgreement('#agreement', { variantKey: 'AGREEMENT' });
      paymentMethodsWidgetRef.current = paymentMethodsWidget;
    }
  }, [method, paymentWidget, amount]);

  useEffect(() => {
    const paymentMethodsWidget = paymentMethodsWidgetRef.current;
    if (paymentMethodsWidget == null) return;

    const numAmount = parseInt(amount || '0');
    if (numAmount >= 5000) {
      paymentMethodsWidget.updateAmount(numAmount);
    }
  }, [amount]);

  const formatDisplay = (value: string) => {
    if (!value) return '';
    const num = parseInt(value);
    if (isNaN(num)) return '';
    if (num >= 10000) {
      const man = Math.floor(num / 10000);
      const remainder = num % 10000;
      return remainder > 0 ? `${man}만 ${remainder.toLocaleString()}` : `${man}만`;
    }
    return num.toLocaleString();
  };

  const handleChargeRequest = async () => {
    const numAmount = parseInt(amount);
    
    if (!amount || numAmount < 5000) {
      return showAlert('최소 신청 금액은 5,000원입니다.', 'warning');
    }

    if (method === 'transfer') {
      if (!depositor) return showAlert('입금자명을 입력해주세요.', 'warning');
      
      const storedId = localStorage.getItem('user_id');
      if (!storedId) {
        showAlert('로그인이 필요합니다.', 'warning');
        router.push('/login');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/money/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: storedId, amount, type: 'CHARGE', depositor, method })
        });
        if (res.ok) {
          showAlert('충전 신청이 완료되었습니다!\n운영자가 입금 확인 후 승인해 드립니다.', 'success');
          setAmount('');
          setDepositor('');
        } else {
          showAlert('신청 처리 중 오류가 발생했습니다.', 'warning');
        }
      } catch (error) {
        showAlert('서버 통신 오류가 발생했습니다.', 'warning');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (method === 'card') {
      if (!paymentWidget) return showAlert('결제 모듈을 불러오는 중입니다. 잠시만 기다려주세요.', 'warning');

      try {
        await paymentWidget.requestPayment({
          orderId: "ORDER_" + Date.now(),
          orderName: `미쿠짱머니 ${numAmount.toLocaleString()}원 충전`,
          successUrl: `${window.location.origin}/payment/success`, 
          failUrl: `${window.location.origin}/payment/fail`,
          customerName: depositor || "미쿠짱 고객", 
        });
      } catch (err) {
        console.error("결제 에러:", err);
      }
    }
  };

  return {
    isAuthChecking, 
    amount, setAmount, depositor, setDepositor, method, setMethod, 
    currentMoney, isFocused, setIsFocused, loading, 
    formatDisplay, handleChargeRequest
  };
}

// ==========================================
// 🖥️ 3. 메인 컴포넌트
// ==========================================
export default function MoneyChargePage() {
  const {
    isAuthChecking,
    amount, setAmount, depositor, setDepositor, method, setMethod,
    currentMoney, isFocused, setIsFocused, loading,
    formatDisplay, handleChargeRequest
  } = useMoneyChargeLogic();

  // 로그인되지 않아 알림을 띄우는 중일 때는 배경만 렌더링
  if (isAuthChecking) {
    return <div style={{ height: '100vh', backgroundColor: '#fdfdfd' }} />;
  }

  return (
    <GuideLayout title="미쿠짱머니 충전 신청" type="money">
      <style jsx global>{globalAnimation}</style>

      <div style={s.container}>
        <div className="anim" style={s.card}>
          <h2 style={s.pageTitle}>
            미쿠짱머니 충전 신청
          </h2>
          
          <div style={s.formWrapper}>
            
            {/* 현재 머니 요약 */}
            <div style={s.moneySummaryBox}>
              <span style={s.moneySummaryLabel}>현재 보유 머니</span>
              <span style={s.moneySummaryValue}>{currentMoney.toLocaleString()}원</span>
            </div>

            {/* 금액 입력 */}
            <div>
              <label style={s.label}>충전 신청 금액</label>
              <div style={s.inputContainer}>
                <input
                  type={isFocused ? "number" : "text"}
                  value={isFocused ? amount : formatDisplay(amount)}
                  onChange={(e) => setAmount(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="최소 5,000원 이상"
                  style={s.inputWrapper(isFocused)}
                />
                <span style={s.currencyUnit}>원</span>
              </div>
              <div style={s.quickBtnWrapper}>
                {[10000, 30000, 50000, 100000].map((val) => (
                  <button key={val} onClick={() => setAmount((prev) => (parseInt(prev || '0') + val).toString())} style={s.quickBtn}>
                    +{val / 10000}만
                  </button>
                ))}
              </div>
            </div>

            {/* 입금 수단 선택 */}
            <div>
              <label style={s.label}>입금 방법 선택</label>
              <div style={s.methodGrid}>
                <button onClick={() => setMethod('transfer')} style={s.methodBtn(method === 'transfer')}>무통장 입금</button>
                <button onClick={() => setMethod('card')} style={s.methodBtn(method === 'card')}>신용카드 결제</button>
              </div>
            </div>

            {/* 무통장 입금 UI */}
            {method === 'transfer' && (
              <div style={s.animatedSection}>
                <div style={s.accountInfoBox}>
                  <p style={s.accountInfoLabel}>입금 계좌 안내</p>
                  <p style={s.accountNumber}>신한은행 110-629-593784</p>
                  <p style={s.accountOwner}>예금주: 미쿠짱</p>
                </div>

                <label style={s.label}>실제 입금자명</label>
                <input
                  type="text"
                  value={depositor}
                  onChange={(e) => setDepositor(e.target.value)}
                  placeholder="입금하신 분의 성함을 입력해주세요"
                  style={s.inputWrapper(false)}
                />
              </div>
            )}

            {/* 카드 결제 위젯 영역 */}
            <div style={s.cardWidgetWrapper(method === 'card')}>
              <div id="payment-widget" style={s.fullWidth} />
              <div id="agreement" style={s.agreementWrapper} />
            </div>

            {/* 무통장 입금 주의사항 */}
            {method === 'transfer' && (
              <div style={s.warningBox}>
                <ul style={s.warningList}>
                  <li>신청하신 <b>입금자명</b>과 실제 송금자명이 일치해야 합니다.</li>
                  <li>운영자가 입금 확인 후 수동으로 승인해 드립니다.</li>
                  <li>승인 완료 시 카카오톡/문자로 알림이 발송됩니다.</li>
                </ul>
              </div>
            )}

            {/* 결제/신청 버튼 */}
            <button 
              onClick={handleChargeRequest} 
              disabled={loading}
              style={s.submitBtn(loading)}
            >
              {loading ? '처리 중...' : (method === 'card' ? `${parseInt(amount || '0').toLocaleString()}원 결제하기` : '충전 신청하기')}
            </button>

          </div>
        </div>
      </div>
    </GuideLayout>
  );
}