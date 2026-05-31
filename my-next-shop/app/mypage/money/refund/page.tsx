'use client';

import React, { useState, useEffect, useRef } from 'react';
import GuideLayout from '@/app/components/GuideLayout';
import { useRouter } from 'next/navigation'; // 🌟 라우터 임포트
import { useMikuAlert } from '@/app/context/MikuAlertContext'; // 🌟 미쿠짱 Alert 임포트

// ==========================================
// 🎨 1. 디자인 및 스타일 시스템 (모든 인라인 스타일 분리)
// ==========================================
const s = {
  // 공통 및 레이아웃
  container: { maxWidth: '672px', margin: '0 auto', padding: '48px 16px', fontFamily: 'Pretendard, "Noto Sans KR", sans-serif' },
  card: { backgroundColor: '#fff', borderRadius: '24px', padding: '40px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' },
  title: { fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '32px', textAlign: 'center' as const },
  formWrapper: { display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  
  // 환불 가능 머니 영역
  balanceBox: { backgroundColor: '#f8fafc', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' },
  balanceLabel: { color: '#475569', fontWeight: '600', fontSize: '15px' },
  balanceVal: { fontSize: '20px', fontWeight: '900', color: '#f97316' },
  
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
  @keyframes slideUpFade { 0% { opacity: 0; transform: translateY(15px); } 100% { opacity: 1; transform: translateY(0); } }
  .anim-item { opacity: 0; animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .delay-1 { animation-delay: 0.1s; } .delay-2 { animation-delay: 0.2s; } .delay-3 { animation-delay: 0.3s; } .delay-4 { animation-delay: 0.4s; }

  .refund-input:focus { border-color: #f97316 !important; box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1) !important; }
  .action-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
  .action-btn:hover:not(:disabled) { background-color: #1e293b !important; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(15, 23, 42, 0.15) !important; }

  @media (max-width: 768px) {
    .refund-container { padding: 20px 10px !important; }
    .refund-card { padding: 24px 20px !important; border-radius: 20px !important; }
    .refund-card h2 { font-size: 20px !important; margin-bottom: 24px !important; }
    .balance-box { padding: 16px !important; }
    .balance-label { font-size: 14px !important; }
    .balance-val { font-size: 18px !important; }
    .refund-input { font-size: 16px !important; padding: 12px !important; }
    .amount-input { font-size: 20px !important; }
    .info-box { padding: 12px !important; }
    .info-box p { font-size: 12px !important; line-height: 1.6 !important; }
    .action-btn { padding: 16px !important; font-size: 16px !important; }
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
        router.push('/login');
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
      router.push('/login');
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

  return (
    <GuideLayout title="미쿠짱머니 환불 신청" type="money">
      <style jsx global>{globalStyles}</style>

      <div className="refund-container" style={s.container}>
        <div className="refund-card" style={s.card}>
          <h2 className="anim-item" style={s.title}>미쿠짱머니 환불 신청</h2>
          
          <div style={s.formWrapper}>
            
            {/* 1. 환불 가능 머니 */}
            <div className="anim-item delay-1 balance-box" style={s.balanceBox}>
              <span className="balance-label" style={s.balanceLabel}>환불 가능 머니</span>
              <span className="balance-val" style={s.balanceVal}>
                {balance.toLocaleString()}원
              </span>
            </div>

            {/* 2. 환불 금액 입력 */}
            <div className="anim-item delay-2">
              <label style={s.label}>환불 신청 금액</label>
              <div style={s.amountInputWrapper}>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="환불할 금액 입력"
                  className="refund-input amount-input"
                  style={s.amountInput}
                />
                <span style={s.currencyUnit}>원</span>
              </div>
              <button 
                onClick={() => setAmount(balance.toString())}
                style={s.fullRefundBtn}
              >
                전액 환불 신청
              </button>
            </div>

            {/* 3. 계좌 정보 입력 */}
            <div className="anim-item delay-3" style={s.accountSection}>
              <p style={s.accountTitle}>환불 계좌 정보</p>
              
              <div>
                <label style={s.label}>은행명</label>
                <input
                  type="text" value={bankName} onChange={(e) => setBankName(e.target.value)}
                  placeholder="예: 신한은행" className="refund-input"
                  style={s.standardInput}
                />
              </div>

              <div>
                <label style={s.label}>계좌번호</label>
                <input
                  type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="'-' 없이 숫자만 입력" className="refund-input"
                  style={s.standardInput}
                />
              </div>

              <div>
                <label style={s.label}>예금주</label>
                <input
                  type="text" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="성함 입력" className="refund-input"
                  style={s.standardInput}
                />
              </div>
            </div>

            {/* 4. 안내 사항 및 전송 버튼 */}
            <div className="anim-item delay-4" style={s.bottomSection}>
              <div className="info-box" style={s.infoBox}>
                <p style={s.infoText}>
                  • 환불 신청은 영업일 기준 1-3일 이내에 처리됩니다.<br />
                  • 무통장 입금 충전건은 해당 계좌로 현금 환불됩니다.<br />
                  • 카드 결제건은 카드 승인 취소로 처리될 수 있습니다.<br />
                  • 이벤트 무상 지급 머니는 환불이 불가능합니다.
                </p>
              </div>

              <button
                className="action-btn"
                onClick={handleRefund}
                disabled={loading}
                style={s.submitBtn(loading)}
              >
                {loading ? '신청 처리 중...' : '환불 신청하기'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </GuideLayout>
  );
}