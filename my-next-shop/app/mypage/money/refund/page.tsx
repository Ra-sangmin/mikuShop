'use client';

import React, { useState, useEffect } from 'react';
import GuideLayout from '@/app/components/GuideLayout';

// --- 🎨 1. 깔끔하게 정리된 재사용 스타일 객체 ---
const s = {
  container: {
    maxWidth: '672px', margin: '0 auto', padding: '48px 16px', 
    fontFamily: 'Pretendard, "Noto Sans KR", sans-serif'
  },
  card: {
    backgroundColor: '#fff', borderRadius: '24px', padding: '40px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0'
  },
  title: {
    fontSize: '24px', fontWeight: '800', color: '#0f172a', 
    marginBottom: '32px', textAlign: 'center' as const
  },
  balanceBox: {
    backgroundColor: '#f8fafc', borderRadius: '16px', padding: '20px', 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9'
  },
  label: {
    display: 'block', fontSize: '13px', fontWeight: '800', color: '#475569', 
    marginLeft: '4px', marginBottom: '8px'
  },
  inputBase: {
    width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0',
    outline: 'none', boxSizing: 'border-box' as const, transition: 'all 0.3s ease'
  },
  infoBox: {
    backgroundColor: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1px solid #f1f5f9'
  },
  submitBtn: (loading: boolean) => ({
    width: '100%', padding: '18px', backgroundColor: loading ? '#cbd5e1' : '#0f172a', 
    color: '#fff', borderRadius: '16px', fontWeight: '900', fontSize: '18px', 
    border: 'none', cursor: loading ? 'not-allowed' : 'pointer'
  })
};

// --- 🛠️ 2. 컴포넌트 메인 로직 ---
export default function MoneyRefundPage() {
  const [balance, setBalance] = useState<number>(0);
  const [amount, setAmount] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountHolder, setAccountHolder] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // 1️⃣ 실제 유저의 잔액(환불 가능 머니) 불러오기
  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (userId) {
      fetch(`/api/users?id=${userId}`)
        .then(res => res.json())
        .then(data => { if (data.success) setBalance(data.user.cyberMoney || 0); });
    }
  }, []);

  // 2️⃣ 환불 신청 처리 로직 (DB 연동)
  const handleRefund = async () => {
    const userId = localStorage.getItem('user_id');
    const amountNum = parseInt(amount);

    // 유효성 검사
    if (!userId) return alert('로그인이 필요합니다.');
    if (!amount || amountNum <= 0) return alert('환불할 금액을 입력해주세요.');
    if (amountNum > balance) return alert('환불 가능 금액을 초과했습니다.');
    if (!bankName || !accountNumber || !accountHolder) return alert('환불받으실 계좌 정보를 모두 입력해주세요.');

    setLoading(true);
    try {
      // 🌟 통합된 /api/money/request API로 환불 신청 데이터 전송
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
        alert(`${amountNum.toLocaleString()}원 환불 신청이 접수되었습니다.\n영업일 기준 1-3일 내로 관리자 확인 후 처리됩니다.`);
        
      } else {
        const errorData = await res.json();
        alert(errorData.error || '환불 신청 중 오류가 발생했습니다.');
      }
    } catch (error) {
      alert('서버 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GuideLayout title="미쿠짱머니 환불 신청" type="money">
      {/* 3️⃣ 상태 의존적인 애니메이션 및 반응형 CSS */}
      <style jsx global>{`
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
      `}</style>

      <div className="refund-container" style={s.container}>
        <div className="refund-card" style={s.card}>
          <h2 className="anim-item" style={s.title}>미쿠짱머니 환불 신청</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* 1. 환불 가능 머니 (실제 잔액 연동) */}
            <div className="anim-item delay-1 balance-box" style={s.balanceBox}>
              <span className="balance-label" style={{ color: '#475569', fontWeight: '600', fontSize: '15px' }}>환불 가능 머니</span>
              <span className="balance-val" style={{ fontSize: '20px', fontWeight: '900', color: '#f97316' }}>
                {balance.toLocaleString()}원
              </span>
            </div>

            {/* 2. 환불 금액 입력 */}
            <div className="anim-item delay-2">
              <label style={s.label}>환불 신청 금액</label>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="환불할 금액 입력"
                  className="refund-input amount-input"
                  style={{ ...s.inputBase, padding: '16px 45px 16px 16px', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}
                />
                <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: '#94a3b8', pointerEvents: 'none' }}>원</span>
              </div>
              <button 
                onClick={() => setAmount(balance.toString())}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '13px', color: '#ea580c', fontWeight: '800' }}
              >
                전액 환불 신청
              </button>
            </div>

            {/* 3. 계좌 정보 입력 */}
            <div className="anim-item delay-3" style={{ paddingTop: '24px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px 0' }}>환불 계좌 정보</p>
              
              <div>
                <label style={s.label}>은행명</label>
                <input
                  type="text" value={bankName} onChange={(e) => setBankName(e.target.value)}
                  placeholder="예: 신한은행" className="refund-input"
                  style={{ ...s.inputBase, padding: '14px 16px', fontSize: '15px' }}
                />
              </div>

              <div>
                <label style={s.label}>계좌번호</label>
                <input
                  type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="'-' 없이 숫자만 입력" className="refund-input"
                  style={{ ...s.inputBase, padding: '14px 16px', fontSize: '15px' }}
                />
              </div>

              <div>
                <label style={s.label}>예금주</label>
                <input
                  type="text" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="성함 입력" className="refund-input"
                  style={{ ...s.inputBase, padding: '14px 16px', fontSize: '15px' }}
                />
              </div>
            </div>

            {/* 4. 안내 사항 및 전송 버튼 */}
            <div className="anim-item delay-4" style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '8px' }}>
              <div className="info-box" style={s.infoBox}>
                <p style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.8', fontWeight: '600', margin: 0, wordBreak: 'keep-all' }}>
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