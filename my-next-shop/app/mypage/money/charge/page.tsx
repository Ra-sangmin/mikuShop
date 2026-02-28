'use client';

import React, { useState, useEffect } from 'react';
import GuideLayout from '@/app/components/GuideLayout';

export default function MoneyChargePage() {
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<'card' | 'transfer'>('transfer');
  const [currentMoney, setCurrentMoney] = useState<number>(0);
  const [isFocused, setIsFocused] = useState(false);

  const fetchUserMoney = async () => {
    const storedId = localStorage.getItem('user_id');
    if (storedId) {
      try {
        const res = await fetch(`/api/users?id=${storedId}`);
        const data = await res.json();
        if (data.success) {
          setCurrentMoney(data.user.cyberMoney || 0);
        }
      } catch (err) {
        console.error("머니 로드 실패:", err);
      }
    }
  };

  useEffect(() => {
    fetchUserMoney();
  }, []);

  const formatDisplay = (value: string) => {
    if (!value) return '';
    const num = parseInt(value);
    if (isNaN(num)) return '';

    if (num >= 10000) {
      const man = Math.floor(num / 10000);
      const remainder = num % 10000;
      return remainder > 0 
        ? `${man}만 ${remainder.toLocaleString()}` 
        : `${man}만`;
    }
    return num.toLocaleString();
  };

  const handleCharge = async () => {
    if (!amount || parseInt(amount) <= 0) {
      alert('충전할 금액을 입력해주세요.');
      return;
    }

    const storedId = localStorage.getItem('user_id');
    if (!storedId) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: storedId,
          cyberMoney: amount
        })
      });

      if (res.ok) {
        alert(`${parseInt(amount).toLocaleString()}원 충전이 완료되었습니다.`);
        setAmount('');
        fetchUserMoney();
      } else {
        alert('충전 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error("충전 에러:", error);
      alert('서버 통신 오류가 발생했습니다.');
    }
  };

  return (
    <GuideLayout title="미쿠짱머니 충전" type="money">
      <style jsx global>{`
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }

        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes expandDown {
          0% { opacity: 0; transform: translateY(-10px); max-height: 0; overflow: hidden; }
          100% { opacity: 1; transform: translateY(0); max-height: 200px; overflow: visible; }
        }

        .anim-item {
          opacity: 0;
          animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.4s; }
        .delay-5 { animation-delay: 0.5s; }

        .charge-input {
          transition: all 0.3s ease;
        }
        .charge-input:focus {
          outline: none;
          border-color: #ff4b2b !important;
          box-shadow: 0 0 0 4px rgba(255, 75, 43, 0.15) !important;
        }

        .submit-btn {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .submit-btn:hover {
          background-color: #e63e1c !important;
          transform: translateY(-3px);
          box-shadow: 0 12px 24px rgba(255, 75, 43, 0.25) !important;
        }

        /* 📱 모바일 대응 스타일 */
        .money-card {
          background-color: #fff;
          border-radius: 24px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.04);
          border: 1px solid #e2e8f0;
          padding: 40px;
        }

        @media (max-width: 768px) {
          .charge-wrapper { padding: 20px 10px !important; }
          .money-card { padding: 24px 20px !important; border-radius: 20px !important; }
          .money-card h2 { fontSize: 22px !important; marginBottom: 24px !important; }
          .balance-box { padding: 16px !important; }
          .balance-label { font-size: 14px !important; }
          .balance-val { font-size: 18px !important; }
          
          .quick-btn-group { gap: 6px !important; }
          .quick-btn { padding: 10px 4px !important; font-size: 12px !important; }
          
          .method-btn { padding: 12px !important; font-size: 14px !important; }
          .transfer-info { padding: 16px !important; }
          .transfer-info p { font-size: 12px !important; }
          
          .submit-btn { padding: 16px !important; font-size: 16px !important; }
        }
      `}</style>

      <div className="charge-wrapper" style={{ maxWidth: '672px', margin: '0 auto', padding: '48px 16px', fontFamily: 'Pretendard, "Noto Sans KR", sans-serif' }}>
        
        <div className="money-card">
          
          <h2 className="anim-item" style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', marginBottom: '32px', textAlign: 'center' }}>
            미쿠짱머니 충전
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* 1. 현재 잔액 */}
            <div className="anim-item delay-1 balance-box" style={{ 
              backgroundColor: '#f8fafc', borderRadius: '16px', padding: '20px', 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' 
            }}>
              <span className="balance-label" style={{ color: '#475569', fontWeight: '600', fontSize: '15px' }}>현재 보유 머니</span>
              <span className="balance-val" style={{ fontSize: '22px', fontWeight: '900', color: '#ff4b2b' }}>{currentMoney.toLocaleString()}원</span>
            </div>

            {/* 2. 충전 금액 입력 */}
            <div className="anim-item delay-2">
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#334155', marginBottom: '8px' }}>충전 금액</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={isFocused ? "number" : "text"}
                  value={isFocused ? amount : formatDisplay(amount)}
                  onChange={(e) => setAmount(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="금액을 입력해주세요"
                  className="charge-input"
                  style={{
                    width: '100%', 
                    padding: '16px 50px 16px 20px', 
                    borderRadius: '16px', 
                    border: '1px solid #e2e8f0',
                    fontSize: '18px', 
                    fontWeight: '600', 
                    color: '#0f172a', 
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ 
                  position: 'absolute', 
                  right: '20px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  fontWeight: '800', 
                  color: '#94a3b8', 
                  pointerEvents: 'none',
                  backgroundColor: '#fff', 
                  paddingLeft: '5px' 
                }}>
                  원
                </span>
              </div>
              
              {/* 금액 퀵 버튼 */}
              <div className="quick-btn-group" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                {[10000, 30000, 50000, 100000].map((val) => (
                  <button
                    key={val}
                    className="quick-btn"
                    onClick={() => setAmount((prev) => (parseInt(prev || '0') + val).toString())}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#fff',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#475569',
                      cursor: 'pointer',
                      flex: 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    +{val / 10000}만
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 결제 수단 선택 */}
            <div className="anim-item delay-3">
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#334155', marginBottom: '8px' }}>결제 수단</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  className="method-btn"
                  onClick={() => setMethod('transfer')}
                  style={{
                    padding: '16px', borderRadius: '16px', fontWeight: '800', fontSize: '15px', cursor: 'pointer',
                    transition: 'all 0.2s ease', border: '2px solid', outline: 'none',
                    backgroundColor: method === 'transfer' ? '#fff1f0' : '#fff',
                    color: method === 'transfer' ? '#ff4b2b' : '#64748b',
                    borderColor: method === 'transfer' ? '#ff4b2b' : '#e2e8f0'
                  }}
                >
                  무통장 입금
                </button>
                <button
                  className="method-btn"
                  onClick={() => setMethod('card')}
                  style={{
                    padding: '16px', borderRadius: '16px', fontWeight: '800', fontSize: '15px', cursor: 'pointer',
                    transition: 'all 0.2s ease', border: '2px solid', outline: 'none',
                    backgroundColor: method === 'card' ? '#fff1f0' : '#fff',
                    color: method === 'card' ? '#ff4b2b' : '#64748b',
                    borderColor: method === 'card' ? '#ff4b2b' : '#e2e8f0'
                  }}
                >
                  신용카드
                </button>
              </div>
            </div>

            {/* 4. 무통장 입금 안내 */}
            {method === 'transfer' && (
              <div style={{ animation: 'expandDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <div className="transfer-info" style={{ backgroundColor: '#fff8f6', borderRadius: '16px', padding: '20px', border: '1px solid #ffe4e0' }}>
                  <p style={{ fontSize: '14px', color: '#c2410c', fontWeight: '800', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>ℹ️</span> 무통장 입금 안내
                  </p>
                  <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.8', fontWeight: '500' }}>
                    <p style={{ margin: 0 }}>• 입금 계좌: <b>신한은행 110-xxx-xxxxxx</b> (예금주: 미쿠짱)</p>
                    <p style={{ margin: 0 }}>• 본인 성함으로 입금해주셔야 자동 승인이 빠릅니다.</p>
                    <p style={{ margin: 0 }}>• 입금 확인 후 약 10분 이내로 충전이 완료됩니다.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. 충전하기 버튼 */}
            <div className="anim-item delay-4" style={{ marginTop: '10px' }}>
              <button
                className="submit-btn"
                onClick={handleCharge}
                style={{
                  width: '100%', padding: '18px', backgroundColor: '#ff4b2b', color: '#fff',
                  borderRadius: '16px', fontWeight: '900', fontSize: '18px', border: 'none', cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(255, 75, 43, 0.2)'
                }}
              >
                충전 신청하기
              </button>
            </div>

            {/* 6. 하단 안내 문구 */}
            <p className="anim-item delay-5" style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', margin: 0, lineHeight: '1.6', fontWeight: '500', wordBreak: 'keep-all' }}>
              미쿠짱머니는 상품 결제 시 현금처럼 사용 가능하며,<br className="pc-only" />
              머니 환불은 고객센터를 통해 신청하실 수 있습니다.
            </p>

          </div>
        </div>
      </div>
    </GuideLayout>
  );
}