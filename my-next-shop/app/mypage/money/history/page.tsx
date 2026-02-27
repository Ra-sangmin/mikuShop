'use client';

import React from 'react';
import GuideLayout from '@/app/components/GuideLayout';

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
  { id: '2', date: '2024-02-27 14:30', type: '사용', description: '주문 결제 (주문번호: 12345)', amount: -35000, balance: 15000 },
  { id: '3', date: '2024-02-27 15:00', type: '사용', description: '배송비 결제 (주문번호: 12345)', amount: -8000, balance: 7000 },
];

export default function MoneyHistoryPage() {
  return (
    <GuideLayout title="미쿠짱머니 이용내역" type="money">
      {/* 🌟 전역 스타일: 애니메이션 키프레임 및 테이블 호버 정의 */}
      <style jsx global>{`
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        /* 순차 등장 애니메이션 클래스 */
        .anim-header {
          opacity: 0;
          animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .anim-table-container {
          opacity: 0;
          animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
        }
        
        /* 테이블 행 애니메이션 및 호버 트랜지션 */
        .anim-row {
          opacity: 0;
          animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transition: background-color 0.2s ease;
        }
        .anim-row:hover {
          background-color: #f8fafc; /* Tailwind bg-slate-50/50 대체 */
        }
      `}</style>

      <div style={{ maxWidth: '896px', margin: '0 auto', padding: '48px 16px', fontFamily: 'Pretendard, "Noto Sans KR", sans-serif' }}>
        
        {/* 메인 카드 컨테이너 */}
        <div className="anim-header" style={{ 
          backgroundColor: '#fff', 
          borderRadius: '16px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', 
          border: '1px solid #e2e8f0', 
          overflow: 'hidden' 
        }}>
          
          {/* 상단 헤더 영역 (타이틀 및 현재 잔액) */}
          <div style={{ 
            padding: '24px', 
            borderBottom: '1px solid #f1f5f9', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            backgroundColor: '#f8fafc' 
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>머니 이용내역</h2>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', margin: '0 0 4px 0' }}>현재 보유 머니</p>
              <p style={{ fontSize: '24px', fontWeight: '900', color: '#f97316', margin: 0 }}>7,000원</p>
            </div>
          </div>

          {/* 데이터 테이블 영역 */}
          <div className="anim-table-container" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontWeight: '700', borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '16px 24px' }}>일시</th>
                  <th style={{ padding: '16px 24px', textAlign: 'center' }}>구분</th>
                  <th style={{ padding: '16px 24px' }}>상세 내용</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right' }}>금액</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right' }}>잔액</th>
                </tr>
              </thead>
              <tbody style={{ borderTop: '1px solid #f8fafc' }}>
                {mockHistory.length > 0 ? (
                  mockHistory.map((item, index) => {
                    // 각 행마다 약간의 시간차(Delay)를 주어 순차적으로 나타나게 함
                    const animationDelay = `${0.3 + index * 0.1}s`;

                    return (
                      <tr 
                        key={item.id} 
                        className="anim-row"
                        style={{ borderBottom: '1px solid #f8fafc', animationDelay }}
                      >
                        <td style={{ padding: '16px 24px', color: '#64748b' }}>{item.date}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                          <span style={{ 
                            padding: '4px 8px', 
                            borderRadius: '6px', 
                            fontSize: '11px', 
                            fontWeight: '800',
                            backgroundColor: item.type === '충전' ? '#eff6ff' : item.type === '사용' ? '#fef2f2' : '#f1f5f9',
                            color: item.type === '충전' ? '#2563eb' : item.type === '사용' ? '#dc2626' : '#475569'
                          }}>
                            {item.type}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', color: '#334155', fontWeight: '600' }}>{item.description}</td>
                        <td style={{ 
                          padding: '16px 24px', 
                          textAlign: 'right', 
                          fontWeight: '800',
                          color: item.amount > 0 ? '#2563eb' : '#dc2626'
                        }}>
                          {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()}원
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#0f172a', fontWeight: '800' }}>
                          {item.balance.toLocaleString()}원
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '80px 24px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                      이용내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
        </div>
      </div>
    </GuideLayout>
  );
}