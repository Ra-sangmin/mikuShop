'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import GuideLayout from '../../components/GuideLayout';

type TabType = '항공' | 'EMS' | '우체국해운';
type MembershipLevel = 'newMember' | 'silver' | 'gold' | 'diamond';

/**
 * 배송비 계산 공식들 (항공, EMS, 우체국해운)
 */
export function calculateAirShippingFee(weight: number, level: MembershipLevel): number {
  if (weight <= 0) return 0;
  const steps = Math.ceil(weight / 0.5);
  if (steps === 1) {
    const baseFees: Record<MembershipLevel, number> = { newMember: 970, silver: 920, gold: 870, diamond: 790 };
    return baseFees[level];
  }
  const extraSteps = steps - 2; 
  const goldFee = 1200 + (extraSteps * 250);
  switch (level) {
    case 'newMember': return 1300 + (extraSteps * 300);
    case 'silver': return 1250 + (extraSteps * 250);
    case 'gold': return goldFee;
    case 'diamond':
      if (steps <= 9) return goldFee - 130;
      else if (steps === 10) return goldFee - 100;
      else return goldFee - 50;
    default: return 0;
  }
}

export function calculateEMSShippingFee(weight: number): number {
  if (weight <= 0) return 0;
  const roundedWeight = Math.ceil(weight * 2) / 2;
  const baseFees: Record<number, number> = {
    0.5: 1450, 1.0: 2200, 1.5: 2800, 2.0: 3400, 2.5: 3900, 3.0: 4400,
    3.5: 4900, 4.0: 5400, 4.5: 5900, 5.0: 6400, 5.5: 6900, 6.0: 7400,
    6.5: 8200, 7.0: 8200
  };
  if (roundedWeight <= 7.0) return baseFees[roundedWeight];
  const extraKg = Math.ceil((roundedWeight - 7.0) / 1);
  return 8200 + (extraKg * 800);
}

export function calculateOceanShippingFee(weight: number): number {
  if (weight <= 0) return 0;
  const roundedWeight = Math.ceil(weight * 2) / 2;
  if (roundedWeight <= 1.0) return 2100;
  const extraKgSteps = Math.ceil((roundedWeight - 1.0) / 1);
  return 2100 + (extraKgSteps * 400);
}

const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

export default function ShippingFeePage() {
  const [activeTab, setActiveTab] = useState<TabType>('항공');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 데이터 생성
  const airShippingFees = useMemo(() => Array.from({ length: 200 }, (_, i) => {
    const w = (i + 1) * 0.5;
    return {
      weight: `${w.toFixed(2)} kg`,
      newMember: formatCurrency(calculateAirShippingFee(w, 'newMember')),
      silver: formatCurrency(calculateAirShippingFee(w, 'silver')),
      gold: formatCurrency(calculateAirShippingFee(w, 'gold')),
      diamond: formatCurrency(calculateAirShippingFee(w, 'diamond'))
    };
  }), []);

  const emsShippingFees = useMemo(() => Array.from({ length: 60 }, (_, i) => {
    const w = (i + 1) * 0.5;
    const fee = formatCurrency(calculateEMSShippingFee(w));
    return { weight: `${w.toFixed(2)} kg`, newMember: fee, silver: fee, gold: fee, diamond: fee };
  }), []);

  const oceanShippingFees = useMemo(() => Array.from({ length: 40 }, (_, i) => {
    const w = (i + 1) * 0.5;
    const fee = formatCurrency(calculateOceanShippingFee(w));
    return { weight: `${w.toFixed(2)} kg`, newMember: fee, silver: fee, gold: fee, diamond: fee };
  }), []);

  const currentDisplayData = activeTab === '항공' ? airShippingFees : activeTab === 'EMS' ? emsShippingFees : oceanShippingFees;

  const totalPages = Math.ceil(currentDisplayData.length / itemsPerPage);
  const currentItems = currentDisplayData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [activeTab]);

  const thStyle: React.CSSProperties = { padding: '18px', fontSize: '19px', fontWeight: '700', color: '#1e293b', backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'center' };
  const tdStyle: React.CSSProperties = { padding: '16px', fontSize: '17.5px', color: '#475569', borderBottom: '1px solid #f1f5f9', textAlign: 'center' };

  return (
    <GuideLayout title="국제배송 요금표">
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0px 0px', color: '#334155' }}>
        
        {/* 🌟 전역 스타일: 버튼 호버 및 등장 애니메이션 키프레임 */}
        <style jsx global>{`
          @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(30px); }
            100% { opacity: 1; transform: translateY(0); }
          }

          /* 순차적 등장을 위한 클래스 */
          .animate-fade-in-1 { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          .animate-fade-in-2 { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; }
          .animate-fade-in-3 { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards; }

          .page-btn {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .page-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          .page-btn:active:not(:disabled) {
            transform: translateY(0);
          }
        `}</style>
        
        {/* 🌟 상단 탭 메뉴 (가장 먼저 등장) */}
        <div className="animate-fade-in-1" style={{ display: 'flex', gap: '12px', marginBottom: '30px' }}>
          {(['항공', 'EMS', '우체국해운'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '16px 36px', 
                borderRadius: '14px',
                fontWeight: '800',    
                fontSize: '25px',      
                cursor: 'pointer',
                border: 'none',
                backgroundColor: activeTab === tab ? '#ff4b2b' : '#f1f5f9',
                color: activeTab === tab ? '#fff' : '#64748b',
                boxShadow: activeTab === tab ? '0 6px 16px rgba(255, 75, 43, 0.35)' : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                flex: 1,               
                textAlign: 'center'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 🌟 테이블 섹션 (두 번째로 등장) */}
        <div className="animate-fade-in-2" style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>무게 (kg)</th>
                <th style={thStyle}>뉴멤버</th>
                <th style={thStyle}>실버</th>
                <th style={thStyle}>골드</th>
                <th style={thStyle}>다이아</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((row, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#fcfdfe', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={e => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#fcfdfe'}>
                  <td style={{ ...tdStyle, fontWeight: '700', color: '#0f172a' }}>{row.weight}</td>
                  <td style={tdStyle}>{row.newMember}</td>
                  <td style={tdStyle}>{row.silver}</td>
                  <td style={tdStyle}>{row.gold}</td>
                  <td style={{ ...tdStyle, color: '#ff4b2b', fontWeight: '600' }}>{row.diamond}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 고급스러운 페이지네이션 UI */}
          <div style={{ 
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', 
            padding: '30px', backgroundColor: '#fff', borderTop: '1px solid #f1f5f9' 
          }}>
            {/* 이전 버튼 */}
            <button 
              className="page-btn"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{
                padding: '10px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: '#64748b', fontWeight: '600',
                opacity: currentPage === 1 ? 0.4 : 1
              }}
            >
              이전
            </button>
            
            {/* 페이지 번호들 */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className="page-btn"
                  onClick={() => setCurrentPage(page)}
                  style={{
                    width: '42px', height: '42px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer',
                    border: 'none',
                    backgroundColor: currentPage === page ? '#334155' : '#f8fafc',
                    color: currentPage === page ? '#fff' : '#64748b',
                    fontSize: '15px'
                  }}
                >
                  {page}
                </button>
              ))}
            </div>

            {/* 다음 버튼 */}
            <button 
              className="page-btn"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{
                padding: '10px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: '#64748b', fontWeight: '600',
                opacity: currentPage === totalPages ? 0.4 : 1
              }}
            >
              다음
            </button>
          </div>
        </div>
        
        {/* 🌟 하단 텍스트 (마지막에 등장) */}
        <p className="animate-fade-in-3" style={{ textAlign: 'center', marginTop: '20px', color: '#94a3b8', fontSize: '14px' }}>
          현재 페이지: <b>{currentPage}</b> / 총 <b>{totalPages}</b> 페이지
        </p>
      </div>
    </GuideLayout>
  );
}