'use client';

import React, { useState, useEffect } from 'react';
import GuideLayout from '@/app/components/GuideLayout';

// --- 🎨 프리미엄 스타일 시스템 ---
const s = {
  container: {
    maxWidth: '672px',
    margin: '0 auto',
    padding: '48px 16px',
    fontFamily: 'Pretendard, "Noto Sans KR", sans-serif'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '32px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.04)',
    border: '1px solid #e2e8f0',
    padding: '40px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '800',
    color: '#334155',
    marginBottom: '8px'
  },
  inputWrapper: (isFocused: boolean) => ({
    width: '100%',
    padding: '16px 20px',
    borderRadius: '16px',
    border: `1px solid ${isFocused ? '#ff4b2b' : '#e2e8f0'}`,
    fontSize: '18px',
    fontWeight: '600',
    color: '#0f172a',
    boxShadow: isFocused ? '0 0 0 4px rgba(255, 75, 43, 0.1)' : 'none',
    transition: 'all 0.3s ease',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }),
  methodBtn: (isActive: boolean) => ({
    padding: '16px',
    borderRadius: '16px',
    fontWeight: '800',
    fontSize: '15px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '2px solid',
    backgroundColor: isActive ? '#fff1f0' : '#fff',
    color: isActive ? '#ff4b2b' : '#64748b',
    borderColor: isActive ? '#ff4b2b' : '#e2e8f0',
  }),
  quickBtn: {
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
    cursor: 'pointer',
    flex: 1,
  },
  submitBtn: (loading: boolean) => ({
    width: '100%',
    padding: '20px',
    backgroundColor: loading ? '#cbd5e1' : '#ff4b2b',
    color: '#fff',
    borderRadius: '20px',
    fontWeight: '900',
    fontSize: '18px',
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    boxShadow: loading ? 'none' : '0 8px 20px rgba(255, 75, 43, 0.2)',
    transition: 'all 0.3s ease',
  })
};

export default function MoneyChargePage() {
  const [amount, setAmount] = useState<string>('');
  const [depositor, setDepositor] = useState<string>(''); // 입금자명
  const [method, setMethod] = useState<'card' | 'transfer'>('transfer');
  const [currentMoney, setCurrentMoney] = useState<number>(0);
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  // 현재 잔액 로드
  const fetchUserMoney = async () => {
    const storedId = localStorage.getItem('user_id');
    if (!storedId) return;
    try {
      const res = await fetch(`/api/users?id=${storedId}`);
      const data = await res.json();
      if (data.success) setCurrentMoney(data.user.cyberMoney || 0);
    } catch (err) {
      console.error("머니 로드 실패:", err);
    }
  };

  useEffect(() => { fetchUserMoney(); }, []);

  // 금액 표시 포맷팅 (10000 -> 1만)
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

  // 🚀 충전 신청 핸들러
  const handleChargeRequest = async () => {
    if (!amount || parseInt(amount) < 5000) return alert('최소 충전 신청 금액은 5,000원입니다.');
    if (method === 'transfer' && !depositor) return alert('입금자명을 입력해주세요.');

    const storedId = localStorage.getItem('user_id');
    if (!storedId) return alert('로그인이 필요합니다.');

    setLoading(true);
    try {
      // 🌟 MoneyRequest(신청) 테이블에 저장
      const res = await fetch('/api/money/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: storedId,
          amount: amount,
          type: 'CHARGE',
          depositor: depositor, // 관리자 확인용 입금자명
          method: method
        })
      });

      if (res.ok) {
        alert('충전 신청이 완료되었습니다!\n운영자가 입금 확인 후 승인해 드립니다.');
        setAmount('');
        setDepositor('');
        
      } else {
        alert('신청 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      alert('서버 통신 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GuideLayout title="미쿠짱머니 충전 신청" type="money">
      <style jsx global>{`
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .anim { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <div style={s.container}>
        <div className="anim" style={s.card}>
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', marginBottom: '32px', textAlign: 'center' }}>
            미쿠짱머니 충전 신청
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* 1. 현재 잔액 표시 */}
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' }}>
              <span style={{ color: '#475569', fontWeight: '600', fontSize: '15px' }}>현재 보유 머니</span>
              <span style={{ fontSize: '22px', fontWeight: '900', color: '#ff4b2b' }}>{currentMoney.toLocaleString()}원</span>
            </div>

            {/* 2. 충전 금액 입력 */}
            <div>
              <label style={s.label}>충전 신청 금액</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={isFocused ? "number" : "text"}
                  value={isFocused ? amount : formatDisplay(amount)}
                  onChange={(e) => setAmount(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="금액을 입력해주세요"
                  style={s.inputWrapper(isFocused)}
                />
                <span style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: '#94a3b8' }}>원</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                {[10000, 30000, 50000, 100000].map((val) => (
                  <button key={val} onClick={() => setAmount((prev) => (parseInt(prev || '0') + val).toString())} style={s.quickBtn}>
                    +{val / 10000}만
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 결제 수단 선택 */}
            <div>
              <label style={s.label}>입금 방법 선택</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button onClick={() => setMethod('transfer')} style={s.methodBtn(method === 'transfer')}>무통장 입금</button>
                <button onClick={() => setMethod('card')} style={s.methodBtn(method === 'card')}>신용카드 결제</button>
              </div>
            </div>

            {/* 4. 무통장 입금 정보 입력 (입금자명 필수) */}
            {method === 'transfer' && (
              <div style={{ animation: 'slideUp 0.4s ease-out' }}>
                <div style={{ backgroundColor: '#f1f5f9', padding: '20px', borderRadius: '20px', border: '1px dashed #cbd5e1', marginBottom: '24px' }}>
                  <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '700', marginBottom: '4px' }}>입금 계좌 안내</p>
                  <p style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>미쿠은행 123-456-789012</p>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>예금주: (주)미쿠짱</p>
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

            {/* 5. 안내문구 */}
            <div style={{ backgroundColor: '#fff9f5', padding: '20px', borderRadius: '16px', fontSize: '13px', color: '#9a3412', lineHeight: '1.8', border: '1px solid #ffedd5' }}>
              <ul style={{ paddingLeft: '18px', margin: 0 }}>
                <li>신청하신 <b>입금자명</b>과 실제 송금자명이 일치해야 합니다.</li>
                <li>운영자가 입금 확인 후 수동으로 승인해 드립니다.</li>
                <li>승인 완료 시 카카오톡/문자로 알림이 발송됩니다.</li>
              </ul>
            </div>

            {/* 6. 신청 버튼 */}
            <button 
              onClick={handleChargeRequest} 
              disabled={loading}
              style={s.submitBtn(loading)}
            >
              {loading ? '신청 처리 중...' : '충전 신청하기'}
            </button>

          </div>
        </div>
      </div>
    </GuideLayout>
  );
}