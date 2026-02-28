'use client';

import React from 'react';
import GuideLayout from '@/app/components/GuideLayout'; // 경로가 다르다면 수정해 주세요.

interface Transaction {
  id: string;
  date: string;
  type: '충전' | '사용' | '환불';
  description: string;
  amount: number;
  balance: number;
}

const mockHistory: Transaction[] = [
  { id: '1', date: '2024-02-27 13:00', type: '충전', description: '무통장 입금 충전', amount: 50000, balance: 50000 },
  { id: '2', date: '2024-02-27 14:30', type: '사용', description: '주문 결제 (주문번호: 12345678901234)', amount: -35000, balance: 15000 },
  { id: '3', date: '2024-02-27 15:00', type: '사용', description: '배송비 결제 (주문번호: 12345678901234)', amount: -8000, balance: 7000 },
];

export default function MoneyHistoryPage() {

  const getBadgeStyle = (type: string) => {
    if (type === '충전') return { backgroundColor: '#eff6ff', color: '#2563eb' };
    if (type === '사용') return { backgroundColor: '#fef2f2', color: '#dc2626' };
    return { backgroundColor: '#f1f5f9', color: '#475569' };
  };

  return (
    <GuideLayout title="미쿠짱머니 이용내역" type="money">
      <style jsx global>{`
        /* 🌟 핵심 해결 1: 컨테이너 내부의 모든 요소가 지정된 너비를 초과하지 않도록 강제 */
        .history-container, .history-container * {
          box-sizing: border-box !important;
        }

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

        .desktop-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .desktop-table th {
          padding: 16px 12px;
          border-bottom: 2px solid #f1f5f9;
          color: #64748b;
          font-weight: 800;
          font-size: 14px;
        }
        .desktop-table td {
          padding: 16px 12px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          font-size: 14px;
        }

        .mobile-list { display: none; }

        /* 📱 모바일 환경 최적화 */
        @media (max-width: 768px) {
          /* 🌟 핵심 해결 2: 가로 스크롤 및 여백 원천 차단 */
          .history-container { 
            padding: 20px 10px !important; 
            width: 100% !important;
            overflow-x: hidden !important; 
          }
          .history-card { 
            padding: 24px 20px !important; 
            border-radius: 20px !important; 
            width: 100% !important;
            overflow: hidden !important; /* 카드 밖으로 나가는 텍스트 잘라냄 */
          }
          .history-card h2 { font-size: 20px !important; margin-bottom: 24px !important; }
          
          .balance-box { padding: 16px !important; width: 100% !important; }
          .balance-label { font-size: 14px !important; }
          .balance-val { font-size: 18px !important; }

          .desktop-table { display: none !important; }
          .mobile-list { display: flex !important; flex-direction: column; width: 100%; }
          
          .mob-list-item {
            padding: 20px 0;
            border-bottom: 1px solid #f1f5f9;
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: 100%;
          }
          .mob-list-item:last-child { border-bottom: none; padding-bottom: 0; }
          
          /* 화면 폭이 너무 좁을 때 아이템들이 겹치지 않게 flex-wrap 추가 */
          .mob-row-1 { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; flex-wrap: wrap; gap: 8px; }
          .mob-date { font-size: 13px; color: #64748b; font-weight: 500; }
          
          /* 🌟 핵심 해결 3: 아주 긴 주문번호가 나와도 화면을 밀어내지 않고 줄바꿈 되도록 설정 */
          .mob-desc { 
            font-size: 15px; 
            font-weight: 700; 
            color: #1e293b; 
            line-height: 1.4; 
            word-break: break-all !important; 
            white-space: normal !important;
          }
          
          .mob-row-2 { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
          .mob-balance { font-size: 13px; color: #94a3b8; font-weight: 600; }
          .mob-amount { font-size: 18px; font-weight: 900; }
        }
      `}</style>

      <div className="history-container" style={{ maxWidth: '672px', margin: '0 auto', padding: '48px 16px', fontFamily: 'Pretendard, "Noto Sans KR", sans-serif' }}>
        
        <div className="history-card" style={{ 
          backgroundColor: '#fff', 
          borderRadius: '24px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', 
          border: '1px solid #e2e8f0', 
          padding: '40px' 
        }}>
          
          <h2 className="anim-item" style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '32px', textAlign: 'center' }}>
            미쿠짱머니 이용내역
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
            
            {/* 1. 현재 보유 머니 */}
            <div className="anim-item delay-1 balance-box" style={{ 
              backgroundColor: '#f8fafc', borderRadius: '16px', padding: '20px', 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9', width: '100%'
            }}>
              <span className="balance-label" style={{ color: '#475569', fontWeight: '600', fontSize: '15px' }}>현재 보유 머니</span>
              <span className="balance-val" style={{ fontSize: '20px', fontWeight: '800', color: '#f97316' }}>7,000원</span>
            </div>

            {/* 2. 내역 리스트 영역 */}
            <div className="anim-item delay-2" style={{ width: '100%' }}>
              
              {/* 💻 PC 환경: 넓게 보는 테이블 구조 */}
              <table className="desktop-table">
                <thead>
                  <tr>
                    <th style={{ width: '160px' }}>일시</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>구분</th>
                    <th>상세 내용</th>
                    <th style={{ width: '110px', textAlign: 'right' }}>금액</th>
                    <th style={{ width: '110px', textAlign: 'right' }}>잔액</th>
                  </tr>
                </thead>
                <tbody>
                  {mockHistory.length > 0 ? (
                    mockHistory.map(item => (
                      <tr key={item.id}>
                        <td style={{ color: '#64748b' }}>{item.date}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '800', ...getBadgeStyle(item.type) }}>
                            {item.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: '700', color: '#1e293b' }}>{item.description}</td>
                        <td style={{ textAlign: 'right', fontWeight: '800', color: item.amount > 0 ? '#2563eb' : '#dc2626' }}>
                          {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()}원
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: '#64748b' }}>
                          {item.balance.toLocaleString()}원
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: '80px 20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '15px' }}>
                        이용내역이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* 📱 모바일 환경: 화면 가로에 꽉 차게 내려오는 리스트 구조 */}
              <div className="mobile-list">
                {mockHistory.length > 0 ? (
                  mockHistory.map(item => (
                    <div key={item.id} className="mob-list-item">
                      
                      <div className="mob-row-1">
                        <span className="mob-date">{item.date}</span>
                        <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', ...getBadgeStyle(item.type) }}>
                          {item.type}
                        </span>
                      </div>
                      
                      <div className="mob-desc">
                        {item.description}
                      </div>
                      
                      <div className="mob-row-2">
                        <span className="mob-balance">
                          잔액: {item.balance.toLocaleString()}원
                        </span>
                        <span className="mob-amount" style={{ color: item.amount > 0 ? '#2563eb' : '#dc2626' }}>
                          {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()}원
                        </span>
                      </div>
                      
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '14px' }}>
                    이용내역이 없습니다.
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </GuideLayout>
  );
}