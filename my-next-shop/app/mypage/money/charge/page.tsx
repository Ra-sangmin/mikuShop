'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BANK_ACCOUNT } from '@/lib/bankAccount';
import GuideLayout from '@/app/components/GuideLayout';
import '@/app/guide/guide-common.css';
import { loadPaymentWidget, PaymentWidgetInstance } from "@tosspayments/payment-widget-sdk";
import { useRouter } from 'next/navigation';
import { useMikuAlert } from '@/app/context/MikuAlertContext';
import { Landmark, CreditCard, Copy, Check, User, Info, Plus, RotateCcw, Loader2, Wallet, ArrowRight } from 'lucide-react';
import MoneyBalanceCard from '../MoneyBalanceCard';
import GuideTitle from '@/app/guide/components/GuideTitle';

// ==========================================
// 🎨 1. 디자인 및 스타일 시스템
// ==========================================
const s = {
  // 🌟 padding-top을 0으로: GuideLayout이 헤더와 콘텐츠 패널 사이 간격을 이미 없앴는데,
  // 이 컨테이너 자체의 위쪽 padding(48px)이 그 위에 또 여백을 만들고 있었음
  // 🌟 가로 폭: 다른 사이드바 페이지(inquiry/faq 등의 .guide-page-container)처럼 본문 영역 전체를 씁니다.
  container: { width: '100%', padding: '0 0 48px 0', boxSizing: 'border-box' as const, fontFamily: 'Pretendard, "Noto Sans KR", sans-serif' },
  formWrapper: { display: 'flex', flexDirection: 'column' as const, gap: '28px' },
  
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

  /* 🌟 타이틀/아이콘/패널/잔액 배지는 guide-common.css의 공용 클래스
     (.guide-title, .guide-title-icon, .guide-panel, .guide-title-row,
     .guide-title-balance)를 그대로 씁니다 — 이 파일에서 따로 정의하지 않습니다. */

  /* 🌟 모바일: currentMenu(고정 바)와 카드 사이 여백 제거 */
  @media (max-width: 768px) {
    .money-charge-container { padding-top: 0 !important; }
  }
`;

// ==========================================
// 🧠 2. 비즈니스 로직 훅
// ==========================================
function useMoneyChargeLogic() {
  const router = useRouter();
  const { showAlert } = useMikuAlert();
  const hasAlerted = useRef(false);

  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [amount, setAmount] = useState<string>('');
  // 🌟 다른 화면(예: 주문 결제 중 머니 부족)에서 ?amount= 로 부족한 금액을 넘겨받으면 충전 금액에 미리 채웁니다.
  //    최소 충전 금액보다 적으면 최소 금액으로, 1회 최대보다 많으면 최대 금액으로 맞춥니다.
  const [prefill, setPrefill] = useState<{ shortfall: number; filled: number } | null>(null);
  useEffect(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get('amount');
      const shortfall = Math.ceil(Number(raw));
      if (!raw || !Number.isFinite(shortfall) || shortfall <= 0) return;
      const filled = Math.min(1000000, Math.max(5000, shortfall));
      setAmount(String(filled));
      setPrefill({ shortfall, filled });
    } catch { /* 주소를 읽지 못하면 빈 칸 그대로 */ }
  }, []);
  const [depositor, setDepositor] = useState<string>('');
  const [method, setMethod] = useState<'card' | 'transfer'>('transfer');
  const [currentMoney, setCurrentMoney] = useState<number>(0);
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const [paymentWidget, setPaymentWidget] = useState<PaymentWidgetInstance | null>(null);
  const paymentMethodsWidgetRef = useRef<any>(null);
  
  // 🌟 환경 변수 적용 (운영/테스트 키 분리)
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

  const handleAmountChange = (newAmount: number) => {
    if (newAmount > 1000000) {
      setAmount('1000000');
      showAlert('1회 최대 충전 가능 금액은 100만 원입니다.', 'warning');
    } else {
      setAmount(newAmount === 0 ? '' : newAmount.toString());
    }
  };

  useEffect(() => {
    const storedId = localStorage.getItem('user_id');
    
    if (!storedId) {
      if (!hasAlerted.current) {
        hasAlerted.current = true;
        showAlert('로그인이 필요한 페이지입니다.', 'warning');
        router.push('/auth/login');
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
  }, [router, showAlert, clientKey]);

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

    setLoading(true);

    if (method === 'transfer') {
      if (!depositor) {
        setLoading(false); // 150라인: 유효성 검사 실패 시 버튼 활성화
        return showAlert('입금자명을 입력해주세요.', 'warning');
      }
      
      const storedId = localStorage.getItem('user_id');
      if (!storedId) {
        showAlert('로그인이 필요합니다.', 'warning');
        router.push('/auth/login');
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
      if (!paymentWidget) {
        setLoading(false); // 174라인: 위젯 미로딩 시 버튼 활성화
        return showAlert('결제 모듈을 불러오는 중입니다. 잠시만 기다려주세요.', 'warning');
      }

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
        setLoading(false);
      }
    }
  };

  return {
    isAuthChecking,
    amount, depositor, setDepositor, method, setMethod,
    currentMoney, isFocused, setIsFocused, loading,
    formatDisplay, handleChargeRequest, handleAmountChange, prefill
  };
}

// ==========================================
// 🖥️ 3. 메인 컴포넌트
// ==========================================
// 입금 계좌는 lib/bankAccount.ts 한 곳에서 관리합니다 (홈 화면과 같은 값)
const QUICK_AMOUNTS = [10000, 30000, 50000, 100000];
const MIN_AMOUNT = 5000;
const MAX_AMOUNT = 1000000;

export default function MoneyChargePage() {
  const {
    isAuthChecking,
    amount, depositor, setDepositor, method, setMethod,
    currentMoney, setIsFocused, loading,
    formatDisplay, handleChargeRequest, handleAmountChange, prefill
  } = useMoneyChargeLogic();
  const [copied, setCopied] = useState(false);

  if (isAuthChecking) {
    return <div style={{ height: '100vh', backgroundColor: '#fdfdfd' }} />;
  }

  const numAmount = parseInt(amount || '0') || 0;
  const isTooSmall = numAmount > 0 && numAmount < MIN_AMOUNT;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(BANK_ACCOUNT.number.replace(/-/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <GuideLayout title="미쿠짱머니 충전 신청" type="money">
      <style jsx global>{globalAnimation}</style>

      <div className="money-charge-container mm-page">
        {/* 🌟 요약 카드 + 제목 — mypage/wishlist 와 같은 구성 (카드가 제목 위) */}
        <MoneyBalanceCard
          current="charge"
          balance={currentMoney}
          stats={[
            { label: '충전 신청 금액', value: `${numAmount.toLocaleString()}원`, tone: 'plus' },
            { label: '충전 후 예상 잔액', value: `${(currentMoney + numAmount).toLocaleString()}원` },
            { label: '최소 충전', value: `${MIN_AMOUNT.toLocaleString()}원` },
            { label: '1회 최대', value: '100만원', text: true },
          ]}
        />

        <GuideTitle eyebrow="Charge" title="충전 신청" icon="fa-wallet" />

        <div className="guide-panel mm-anim">
          <div className="mm-stack">

            {/* 01 충전 금액 */}
            <section className="mm-section">
              <div className="mm-section-head">
                <h3 className="mm-section-title"><span className="mm-step">01</span>충전 금액</h3>
                <span className="mm-section-sub">최소 5,000원 · 1회 최대 100만원</span>
              </div>
              {prefill && (
                <div className="mm-prefill-note" role="status">
                  <i className="fa fa-circle-info" aria-hidden="true"></i>
                  <span>
                    주문 결제에 부족한 금액 <b>{prefill.shortfall.toLocaleString()}원</b>을 충전 금액에 넣어 두었어요.
                    {prefill.filled !== prefill.shortfall && (
                      <em>
                        {prefill.filled > prefill.shortfall
                          ? ` 최소 충전 금액이 ${prefill.filled.toLocaleString()}원이라 ${prefill.filled.toLocaleString()}원으로 맞췄어요.`
                          : ` 1회 최대 ${prefill.filled.toLocaleString()}원까지만 충전할 수 있어요.`}
                      </em>
                    )}
                  </span>
                </div>
              )}
              <div className={`mm-amount-box ${isTooSmall ? 'is-error' : ''}`}>
                <div className="mm-amount-row">
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="충전 신청 금액"
                    className="mm-amount-input"
                    value={numAmount ? numAmount.toLocaleString() : ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value.replace(/[^0-9]/g, '') || '0');
                      handleAmountChange(val);
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="금액 입력"
                  />
                  <span className="mm-amount-unit">원</span>
                </div>
                <div className="mm-amount-foot">
                  <span className={`mm-amount-readout ${isTooSmall ? 'is-error' : numAmount ? '' : 'is-muted'}`}>
                    {isTooSmall ? '최소 5,000원부터 신청할 수 있어요' : numAmount ? `${formatDisplay(amount)} 원` : '금액 버튼으로 빠르게 더할 수 있어요'}
                  </span>
                  <span className="mm-amount-limit">남은 한도 {(MAX_AMOUNT - numAmount).toLocaleString()}원</span>
                </div>
              </div>
              <div className="mm-chips">
                {QUICK_AMOUNTS.map((val) => (
                  <button
                    type="button"
                    key={val}
                    className="mm-chip"
                    onClick={() => handleAmountChange(numAmount + val)}
                  >
                    <Plus size={13} strokeWidth={2.6} />{val / 10000}만
                  </button>
                ))}
                <button type="button" className="mm-chip is-ghost" onClick={() => handleAmountChange(0)} aria-label="금액 초기화">
                  <RotateCcw size={13} strokeWidth={2.4} />초기화
                </button>
              </div>
            </section>

            {/* 02 결제 수단 */}
            <section className="mm-section">
              <div className="mm-section-head">
                <h3 className="mm-section-title"><span className="mm-step">02</span>결제 수단</h3>
              </div>
              <div className="mm-methods" role="radiogroup" aria-label="결제 수단">
                <button type="button" role="radio" aria-checked={method === 'transfer'} className={`mm-method ${method === 'transfer' ? 'is-active' : ''}`} onClick={() => setMethod('transfer')}>
                  <span className="mm-method-icon"><Landmark size={20} strokeWidth={2} /></span>
                  <span className="mm-method-text">
                    <strong>무통장 입금</strong>
                    <span>입금 확인 후 운영자 승인</span>
                  </span>
                  <span className="mm-radio" aria-hidden="true" />
                </button>
                <button type="button" role="radio" aria-checked={method === 'card'} className={`mm-method ${method === 'card' ? 'is-active' : ''}`} onClick={() => setMethod('card')}>
                  <span className="mm-method-icon"><CreditCard size={20} strokeWidth={2} /></span>
                  <span className="mm-method-text">
                    <strong>신용카드 결제</strong>
                    <span>결제 즉시 충전</span>
                  </span>
                  <span className="mm-radio" aria-hidden="true" />
                </button>
              </div>
            </section>

            {/* 03 입금 정보 */}
            {method === 'transfer' && (
              <section className="mm-section" style={s.animatedSection}>
                <div className="mm-section-head">
                  <h3 className="mm-section-title"><span className="mm-step">03</span>입금 정보</h3>
                </div>
                <div className="mm-bank">
                  <span className="mm-bank-icon is-logo"><img src={BANK_ACCOUNT.icon} alt="" /></span>
                  <div className="mm-bank-text">
                    <span className="mm-bank-eyebrow">입금 계좌 · {BANK_ACCOUNT.bank}</span>
                    <span className="mm-bank-number" translate="no">{BANK_ACCOUNT.number}</span>
                    <span className="mm-bank-owner">예금주 {BANK_ACCOUNT.owner}</span>
                  </div>
                  <button type="button" className={`mm-copy-btn ${copied ? 'is-done' : ''}`} onClick={handleCopy}>
                    {copied ? <Check size={14} strokeWidth={2.6} /> : <Copy size={14} strokeWidth={2.2} />}
                    {copied ? '복사됨' : '계좌번호 복사'}
                  </button>
                </div>

                <label className="mm-label" htmlFor="mm-depositor">실제 입금자명</label>
                <div className="mm-input-wrap">
                  <User size={17} strokeWidth={2} className="mm-input-icon" aria-hidden="true" />
                  <input
                    id="mm-depositor"
                    type="text"
                    value={depositor}
                    onChange={(e) => setDepositor(e.target.value)}
                    placeholder="입금하시는 분 성함"
                    className="mm-input has-icon"
                  />
                </div>
              </section>
            )}

            {method === 'card' && (
              <section className="mm-section">
                <div className="mm-section-head">
                  <h3 className="mm-section-title"><span className="mm-step">03</span>카드 결제 정보</h3>
                </div>
              </section>
            )}
            <div className={method === 'card' ? 'mm-widget' : undefined} style={s.cardWidgetWrapper(method === 'card')}>
              <div id="payment-widget" style={s.fullWidth} />
              <div id="agreement" style={s.agreementWrapper} />
            </div>

            {method === 'transfer' && (
              <div className="mm-notice">
                <span className="mm-notice-icon" aria-hidden="true"><Info size={17} strokeWidth={2.2} /></span>
                <div className="mm-notice-body">
                  <strong className="mm-notice-title">무통장 입금 안내</strong>
                  <ul>
                    <li>신청하신 <b>입금자명</b>과 실제 송금자명이 일치해야 합니다.</li>
                    <li>운영자가 입금 확인 후 수동으로 승인해 드립니다.</li>
                    <li>승인 완료 시 카카오톡/문자로 알림이 발송됩니다.</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="mm-summary" translate="no">
              <div className="mm-summary-item">
                <span>충전 신청 금액</span>
                <strong className={isTooSmall ? 'is-error' : 'is-accent'}>{numAmount.toLocaleString()}원</strong>
              </div>
              <div className="mm-summary-item">
                <span>충전 후 예상 잔액</span>
                <strong>{(currentMoney + numAmount).toLocaleString()}원</strong>
              </div>
            </div>

            <button
              type="button"
              className="mm-submit"
              onClick={handleChargeRequest}
              disabled={loading}
            >
              {loading ? (
                <><Loader2 size={18} strokeWidth={2.4} className="mm-spin" />처리 중...</>
              ) : (
                <>
                  {method === 'card' ? <CreditCard size={19} strokeWidth={2.2} /> : <Wallet size={19} strokeWidth={2.2} />}
                  {method === 'card' ? `${numAmount.toLocaleString()}원 결제하기` : '충전 신청하기'}
                  <span className="mm-submit-arrow"><ArrowRight size={14} strokeWidth={2.6} /></span>
                </>
              )}
            </button>

          </div>
        </div>
      </div>
    </GuideLayout>
  );
}
