'use client';

import React, { useState, useEffect, useRef } from 'react';
import GuideLayout from '@/app/components/GuideLayout';
import '@/app/guide/guide-common.css';
import { useRouter } from 'next/navigation'; // 🌟 라우터 임포트
import { useMikuAlert } from '@/app/context/MikuAlertContext'; // 🌟 미쿠짱 Alert 임포트
import { Landmark, Hash, User, ShieldCheck, Coins, Undo2, Loader2, ArrowRight } from 'lucide-react';
import MoneyBalanceCard from '../MoneyBalanceCard';
import GuideTitle from '@/app/guide/components/GuideTitle';

// ==========================================
// 🎨 1. 디자인 및 스타일 시스템 (모든 인라인 스타일 분리)
// ==========================================
const s = {
  // 공통 및 레이아웃
  // 🌟 padding-top을 0으로: GuideLayout이 헤더와 콘텐츠 패널 사이 간격을 이미 없앴는데,
  // 이 컨테이너 자체의 위쪽 padding(48px)이 그 위에 또 여백을 만들고 있었음
  // 🌟 가로 폭: 다른 사이드바 페이지(inquiry/faq 등의 .guide-page-container)처럼 본문 영역 전체를 씁니다.
  container: { width: '100%', padding: '0 0 48px 0', boxSizing: 'border-box' as const, fontFamily: 'Pretendard, "Noto Sans KR", sans-serif' },
  formWrapper: { display: 'flex', flexDirection: 'column' as const, gap: '24px' },

  // 라벨 및 입력창 공통
  label: { display: 'block', fontSize: '13px', fontWeight: '800', color: '#475569', marginLeft: '4px', marginBottom: '8px' },
  
  // 금액 입력 영역
  amountInputWrapper: { position: 'relative' as const, marginBottom: '8px' },
  amountInput: { width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', boxSizing: 'border-box' as const, transition: 'all 0.3s ease', padding: '16px 45px 16px 16px', fontSize: '18px', fontWeight: '700', color: '#0f172a' },
  currencyUnit: { position: 'absolute' as const, right: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: '#94a3b8', pointerEvents: 'none' as const },
  fullRefundBtn: { background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '13px', color: '#ea580c', fontWeight: '800' },
  
  // 환불 계좌 정보 영역
  accountSection: { paddingTop: '24px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  accountTitle: { fontSize: '16px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px 0' },
  standardInput: { width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', boxSizing: 'border-box' as const, transition: 'all 0.3s ease', padding: '14px 16px', fontSize: '15px' },
  
  // 하단 안내 및 전송 버튼
  bottomSection: { display: 'flex', flexDirection: 'column' as const, gap: '24px', marginTop: '8px' },
  infoBox: { backgroundColor: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1px solid #f1f5f9' },
  infoText: { fontSize: '12px', color: '#64748b', lineHeight: '1.8', fontWeight: '600', margin: 0, wordBreak: 'keep-all' as const },
  submitBtn: (loading: boolean) => ({ width: '100%', padding: '18px', backgroundColor: loading ? '#cbd5e1' : '#0f172a', color: '#fff', borderRadius: '16px', fontWeight: '900', fontSize: '18px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' })
};

const globalStyles = `
  /* 🌟 화면 디자인은 ../money-common.css(mm- 클래스)에 있습니다. */
  @media (max-width: 768px) {
    /* 🌟 currentMenu(고정 바)와 카드 사이 여백 제거 */
    .refund-container { padding-top: 0 !important; }
  }
`;

// ==========================================
// 🧠 2. 비즈니스 로직 훅 (상태 관리 및 API 통신)
// ==========================================
function useMoneyRefundLogic() {
  const router = useRouter(); // 🌟 라우터 추가
  const { showAlert } = useMikuAlert(); // 🌟 전역 알림 컨텍스트 추가
  const hasAlerted = useRef(false); // 🌟 알림 중복 방지

  const [isAuthChecking, setIsAuthChecking] = useState(true); // 🌟 로그인 확인 상태 추가
  const [balance, setBalance] = useState<number>(0);
  const [amount, setAmount] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountHolder, setAccountHolder] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    
    // 🌟 1. 로그인 체크 로직
    if (!userId) {
      if (!hasAlerted.current) {
        hasAlerted.current = true;
        showAlert('로그인이 필요한 페이지입니다.', 'warning');
        router.push('/auth/login');
      }
      return;
    }

    // 🌟 2. 로그인이 확인되면 인증 중단 -> 화면 표시
    setIsAuthChecking(false);

    // 🌟 3. 유저 잔액 가져오기
    fetch(`/api/users?id=${userId}`)
      .then(res => res.json())
      .then(data => { if (data.success) setBalance(data.user.cyberMoney || 0); })
      .catch(err => console.error(err));
  }, [router, showAlert]);

  const handleRefund = async () => {
    const userId = localStorage.getItem('user_id');
    const amountNum = parseInt(amount);

    // 🌟 기본 alert를 모두 showAlert로 교체
    if (!userId) {
      showAlert('로그인이 필요합니다.', 'warning');
      router.push('/auth/login');
      return;
    }
    if (!amount || amountNum <= 0) return showAlert('환불할 금액을 입력해주세요.', 'warning');
    if (amountNum > balance) return showAlert('환불 가능 금액을 초과했습니다.', 'warning');
    if (!bankName || !accountNumber || !accountHolder) return showAlert('환불받으실 계좌 정보를 모두 입력해주세요.', 'warning');

    setLoading(true);
    try {
      const res = await fetch('/api/money/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: amountNum,
          type: 'REFUND',
          bankName,
          accountNumber,
          accountHolder
        })
      });

      if (res.ok) {
        showAlert(`${amountNum.toLocaleString()}원 환불 신청이 접수되었습니다.\n영업일 기준 1-3일 내로 관리자 확인 후 처리됩니다.`, 'success');
        setAmount('');
        // 신청 완료 후 입력 필드 초기화
        setBankName('');
        setAccountNumber('');
        setAccountHolder('');
      } else {
        const errorData = await res.json();
        showAlert(errorData.error || '환불 신청 중 오류가 발생했습니다.', 'warning');
      }
    } catch (error) {
      showAlert('서버 통신 중 오류가 발생했습니다.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  return {
    isAuthChecking, // 🌟 UI 컴포넌트로 내보내기
    balance, amount, setAmount, bankName, setBankName, 
    accountNumber, setAccountNumber, accountHolder, setAccountHolder, 
    loading, handleRefund
  };
}

// ==========================================
// 🖥️ 3. 메인 컴포넌트 (UI 렌더링 전용)
// ==========================================
const BANK_SUGGESTIONS = ['KB국민은행', '신한은행', '우리은행', '하나은행', 'NH농협은행', 'IBK기업은행', '카카오뱅크', '토스뱅크', '케이뱅크', 'SC제일은행', '우체국'];

export default function MoneyRefundPage() {
  const {
    isAuthChecking, // 🌟 상태 가져오기
    balance, amount, setAmount, bankName, setBankName, 
    accountNumber, setAccountNumber, accountHolder, setAccountHolder, 
    loading, handleRefund
  } = useMoneyRefundLogic();

  // 🌟 로그인 여부 확인 중일 때는 빈 화면을 렌더링해 깜빡임 방지
  if (isAuthChecking) {
    return <div style={{ height: '100vh', backgroundColor: '#fdfdfd' }} />;
  }

  const numAmount = parseInt(amount || '0') || 0;
  const isOver = numAmount > balance;
  const afterBalance = Math.max(0, balance - numAmount);

  return (
    <GuideLayout title="미쿠짱머니 환불 신청" type="money">
      <style jsx global>{globalStyles}</style>

      <div className="refund-container mm-page">
        {/* 🌟 요약 카드 + 제목 — mypage/wishlist 와 같은 구성 (카드가 제목 위) */}
        <MoneyBalanceCard
          current="refund"
          balance={balance}
          stats={[
            { label: '환불 신청 금액', value: `${numAmount.toLocaleString()}원`, tone: isOver ? 'warn' : 'minus' },
            { label: '환불 가능 금액', value: `${balance.toLocaleString()}원` },
            { label: '환불 후 잔액', value: isOver ? '한도 초과' : `${afterBalance.toLocaleString()}원`, tone: isOver ? 'warn' : 'default', text: isOver },
            { label: '환불 방식', value: '계좌 입금', text: true },
          ]}
        />

        <GuideTitle eyebrow="Refund" title="환불 신청" icon="fa-money-bill-transfer" />

        <div className="refund-card guide-panel mm-anim">
          <div className="mm-stack">

            {/* 01 환불 금액 */}
            <section className="mm-section">
              <div className="mm-section-head">
                <h3 className="mm-section-title"><span className="mm-step">01</span>환불 금액</h3>
                <button type="button" className="mm-text-btn" onClick={() => setAmount(balance.toString())} disabled={balance <= 0}>
                  <Coins size={13} strokeWidth={2.4} />전액 환불
                </button>
              </div>
              <div className={`mm-amount-box ${isOver ? 'is-error' : ''}`}>
                <div className="mm-amount-row">
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="환불 신청 금액"
                    value={numAmount ? numAmount.toLocaleString() : ''}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="금액 입력"
                    className="mm-amount-input"
                  />
                  <span className="mm-amount-unit">원</span>
                </div>
                <div className="mm-amount-foot">
                  <span className={`mm-amount-readout ${isOver ? 'is-error' : numAmount ? '' : 'is-muted'}`}>
                    {isOver ? '보유 머니보다 많이 신청할 수 없어요' : numAmount ? `환불 후 잔액 ${afterBalance.toLocaleString()}원` : '보유 머니 안에서 신청할 수 있어요'}
                  </span>
                  <span className="mm-amount-limit">환불 가능 {balance.toLocaleString()}원</span>
                </div>
              </div>
            </section>

            {/* 02 환불 계좌 */}
            <section className="mm-section">
              <div className="mm-section-head">
                <h3 className="mm-section-title"><span className="mm-step">02</span>환불 받을 계좌</h3>
                <span className="mm-section-sub">본인 명의 계좌를 입력해주세요</span>
              </div>

              <div className="mm-field">
                <label className="mm-label" htmlFor="mm-bank-name">은행명</label>
                <div className="mm-input-wrap">
                  <Landmark size={17} strokeWidth={2} className="mm-input-icon" aria-hidden="true" />
                  <input
                    id="mm-bank-name"
                    type="text" value={bankName} onChange={(e) => setBankName(e.target.value)}
                    placeholder="예: 신한은행" className="mm-input has-icon refund-input"
                    list="mm-bank-list" autoComplete="off"
                  />
                  <datalist id="mm-bank-list">
                    {BANK_SUGGESTIONS.map(b => <option key={b} value={b} />)}
                  </datalist>
                </div>
              </div>

              <div className="mm-field">
                <label className="mm-label" htmlFor="mm-account-number">계좌번호</label>
                <div className="mm-input-wrap">
                  <Hash size={17} strokeWidth={2} className="mm-input-icon" aria-hidden="true" />
                  <input
                    id="mm-account-number"
                    type="text" inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="'-' 없이 숫자만 입력" className="mm-input has-icon refund-input"
                  />
                </div>
              </div>

              <div className="mm-field">
                <label className="mm-label" htmlFor="mm-account-holder">예금주</label>
                <div className="mm-input-wrap">
                  <User size={17} strokeWidth={2} className="mm-input-icon" aria-hidden="true" />
                  <input
                    id="mm-account-holder"
                    type="text" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="예금주 성함 입력" className="mm-input has-icon refund-input"
                  />
                </div>
              </div>
            </section>

            {/* 안내 사항 */}
            <div className="mm-notice is-neutral info-box">
              <span className="mm-notice-icon" aria-hidden="true"><ShieldCheck size={17} strokeWidth={2.2} /></span>
              <div className="mm-notice-body">
                <strong className="mm-notice-title">환불 안내</strong>
                <ul>
                  <li>환불 신청은 <b>영업일 기준 1~3일</b> 이내에 처리됩니다.</li>
                  <li>무통장 입금 충전건은 해당 계좌로 현금 환불됩니다.</li>
                  <li>카드 결제건은 카드 승인 취소로 처리될 수 있습니다.</li>
                  <li>이벤트 무상 지급 머니는 환불이 불가능합니다.</li>
                </ul>
              </div>
            </div>

            <div className="mm-summary" translate="no">
              <div className="mm-summary-item">
                <span>환불 신청 금액</span>
                <strong className={isOver ? 'is-error' : 'is-accent'}>{numAmount.toLocaleString()}원</strong>
              </div>
              <div className="mm-summary-item">
                <span>환불 후 잔액</span>
                <strong className={isOver ? 'is-error' : ''}>{isOver ? '한도 초과' : `${afterBalance.toLocaleString()}원`}</strong>
              </div>
            </div>

            <button
              type="button"
              className="mm-submit is-dark action-btn"
              onClick={handleRefund}
              disabled={loading}
            >
              {loading ? (
                <><Loader2 size={18} strokeWidth={2.4} className="mm-spin" />신청 처리 중...</>
              ) : (
                <>
                  <Undo2 size={19} strokeWidth={2.2} />
                  환불 신청하기
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
