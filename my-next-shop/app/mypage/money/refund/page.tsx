'use client';

import React, { useState } from 'react';
import GuideLayout from '@/app/components/GuideLayout';

export default function MoneyRefundPage() {
  const [amount, setAmount] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountHolder, setAccountHolder] = useState<string>('');

  const handleRefund = () => {
    if (!amount || parseInt(amount) <= 0) {
      alert('환불할 금액을 입력해주세요.');
      return;
    }
    if (!bankName || !accountNumber || !accountHolder) {
      alert('환불받으실 계좌 정보를 모두 입력해주세요.');
      return;
    }
    alert(`${parseInt(amount).toLocaleString()}원 환불 신청이 접수되었습니다.\n영업일 기준 1-3일 내로 처리됩니다.`);
  };

  return (
    <GuideLayout title="미쿠짱머니 환불 신청" type="money">
      <style jsx global>{`
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .anim-item {
          opacity: 0;
          animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.4s; }

        .refund-input {
          transition: all 0.3s ease;
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          outline: none;
          box-sizing: border-box;
        }
        .refund-input:focus {
          border-color: #f97316 !important;
          box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1) !important;
        }

        .action-btn {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .action-btn:hover {
          background-color: #1e293b !important;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.15) !important;
        }

        /* 📱 모바일 대응 스타일 추가 */
        @media (max-width: 768px) {
          .refund-container { padding: 20px 10px !important; }
          .refund-card { padding: 24px 20px !important; border-radius: 20px !important; }
          .refund-card h2 { font-size: 20px !important; margin-bottom: 24px !important; }
          
          .balance-box { padding: 16px !important; }
          .balance-label { font-size: 14px !important; }
          .balance-val { font-size: 18px !important; }

          /* iOS 자동 줌 방지를 위해 입력창 폰트 16px 이상 유지 */
          .refund-input { font-size: 16px !important; padding: 12px !important; }
          .amount-input { font-size: 20px !important; }
          
          .info-box { padding: 12px !important; }
          .info-box p { font-size: 12px !important; line-height: 1.6 !important; }
          
          .action-btn { padding: 16px !important; font-size: 16px !important; }
        }
      `}</style>

      <div className="refund-container" style={{ maxWidth: '672px', margin: '0 auto', padding: '48px 16px', fontFamily: 'Pretendard, "Noto Sans KR", sans-serif' }}>
        
        <div className="refund-card" style={{ 
          backgroundColor: '#fff', 
          borderRadius: '24px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', 
          border: '1px solid #e2e8f0', 
          padding: '40px' 
        }}>
          
          <h2 className="anim-item" style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '32px', textAlign: 'center' }}>
            미쿠짱머니 환불 신청
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* 1. 환불 가능 머니 */}
            <div className="anim-item delay-1 balance-box" style={{ 
              backgroundColor: '#f8fafc', borderRadius: '16px', padding: '20px', 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' 
            }}>
              <span className="balance-label" style={{ color: '#475569', fontWeight: '600', fontSize: '15px' }}>환불 가능 머니</span>
              <span className="balance-val" style={{ fontSize: '20px', fontWeight: '800', color: '#f97316' }}>7,000원</span>
            </div>

            {/* 2. 환불 금액 입력 */}
            <div className="anim-item delay-2">
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#334155', marginLeft: '4px', marginBottom: '8px' }}>환불 신청 금액</label>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="환불할 금액 입력"
                  className="refund-input amount-input"
                  style={{ padding: '14px 45px 14px 16px', fontSize: '18px', fontWeight: '600', color: '#0f172a' }}
                />
                <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: '#94a3b8', pointerEvents: 'none' }}>
                  원
                </span>
              </div>
              <button 
                onClick={() => setAmount('7000')}
                style={{ 
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  fontSize: '12px', color: '#ea580c', fontWeight: '800'
                }}
              >
                전액 환불 신청
              </button>
            </div>

            {/* 3. 계좌 정보 입력 */}
            <div className="anim-item delay-3" style={{ paddingTop: '24px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>환불 계좌 정보</p>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', marginLeft: '4px', marginBottom: '6px' }}>은행명</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="예: 신한은행"
                  className="refund-input"
                  style={{ padding: '12px 16px', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', marginLeft: '4px', marginBottom: '6px' }}>계좌번호</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="'-' 없이 숫자만 입력"
                  className="refund-input"
                  style={{ padding: '12px 16px', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', marginLeft: '4px', marginBottom: '6px' }}>예금주</label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="성함 입력"
                  className="refund-input"
                  style={{ padding: '12px 16px', fontSize: '14px' }}
                />
              </div>
            </div>

            {/* 4. 안내 사항 및 버튼 */}
            <div className="anim-item delay-4" style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '8px' }}>
              
              <div className="info-box" style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.8', fontWeight: '500', margin: 0, wordBreak: 'keep-all' }}>
                  • 환불 신청은 영업일 기준 1-3일 이내에 처리됩니다.<br />
                  • 무통장 입금 충전건은 해당 계좌로 현금 환불됩니다.<br />
                  • 카드 결제건은 카드 승인 취소로 처리될 수 있습니다.<br />
                  • 이벤트 무상 지급 머니는 환불이 불가능합니다.
                </p>
              </div>

              <button
                className="action-btn"
                onClick={handleRefund}
                style={{
                  width: '100%', padding: '18px', backgroundColor: '#0f172a', color: '#fff',
                  borderRadius: '16px', fontWeight: '900', fontSize: '18px', border: 'none', cursor: 'pointer'
                }}
              >
                환불 신청하기
              </button>

            </div>
          </div>
        </div>
      </div>
    </GuideLayout>
  );
}