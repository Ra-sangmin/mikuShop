'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import GuideLayout from '../../components/GuideLayout';

type TabType = '항공' | 'EMS' | '우체국해운';
type MembershipLevel = 'newMember' | 'silver' | 'gold' | 'diamond';

/**
 * 배송비 계산 로직 (기존 유지)
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
  const tabMenuRef = useRef<HTMLDivElement>(null);

  // 🌟 탭 메뉴(항공/EMS/우체국해운)가 고정(fixed)되며 흐름에서 빠지므로,
  // 실제 렌더링된 높이를 측정해 콘텐츠가 그만큼 밀려나도록 CSS 변수로 노출한다.
  useEffect(() => {
    const el = tabMenuRef.current;
    const updateTabMenuHeight = () => {
      const h = el ? el.getBoundingClientRect().height : 58;
      document.documentElement.style.setProperty('--tab-menu-h', `${h}px`);
    };

    updateTabMenuHeight();

    const ro = new ResizeObserver(updateTabMenuHeight);
    if (el) ro.observe(el);
    window.addEventListener('resize', updateTabMenuHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateTabMenuHeight);
    };
  }, []);

  const airShippingFees = useMemo(() => Array.from({ length: 200 }, (_, i) => {
    const w = (i + 1) * 0.5;
    return {
      weight: `${w.toFixed(1)}k`, 
      newMember: formatCurrency(calculateAirShippingFee(w, 'newMember')),
      silver: formatCurrency(calculateAirShippingFee(w, 'silver')),
      gold: formatCurrency(calculateAirShippingFee(w, 'gold')),
      diamond: formatCurrency(calculateAirShippingFee(w, 'diamond'))
    };
  }), []);

  const emsShippingFees = useMemo(() => Array.from({ length: 60 }, (_, i) => {
    const w = (i + 1) * 0.5;
    const fee = formatCurrency(calculateEMSShippingFee(w));
    return { weight: `${w.toFixed(1)}k`, newMember: fee, silver: fee, gold: fee, diamond: fee };
  }), []);

  const oceanShippingFees = useMemo(() => Array.from({ length: 40 }, (_, i) => {
    const w = (i + 1) * 0.5;
    const fee = formatCurrency(calculateOceanShippingFee(w));
    return { weight: `${w.toFixed(1)}k`, newMember: fee, silver: fee, gold: fee, diamond: fee };
  }), []);

  const currentDisplayData = activeTab === '항공' ? airShippingFees : activeTab === 'EMS' ? emsShippingFees : oceanShippingFees;
  const totalPages = Math.ceil(currentDisplayData.length / itemsPerPage);
  const currentItems = currentDisplayData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [activeTab]);

  return (
    <GuideLayout title="국제배송 요금표" type="fee">
      <div className="shipping-fee-container">
        
        <style jsx global>{`
          .shipping-fee-container {
            width: 100%;
            max-width: 840px;
            margin: 0 auto;
            color: #334155;
          }

          .tab-menu { display: flex; gap: 8px; margin-bottom: 20px; }
          .tab-btn {
            flex: 1; padding: 12px 0; border-radius: 10px;
            font-weight: 800; font-size: 18px; cursor: pointer; border: none; transition: all 0.2s;
          }

          .table-wrapper {
            background-color: #fff; border-radius: 12px;
            border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.02);
            overflow: hidden;
          }

          .shipping-table {
            width: 100%; border-collapse: collapse; table-layout: fixed;
          }

          .shipping-table th {
            padding: 12px 2px; background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;
            font-size: 14px; font-weight: 800; color: #1e293b; text-align: center;
          }

          .shipping-table td {
            padding: 10px 2px; border-bottom: 1px solid #f1f5f9;
            font-size: 13.5px; text-align: center;
          }

          .card-list { display: none; }

          .fee-card {
            border-bottom: 1px solid #f1f5f9;
            padding: 14px 16px;
          }
          .fee-card:last-child { border-bottom: none; }

          .fee-card-header {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 10px;
          }

          .fee-card-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 12px;
          }

          .fee-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #f8fafc;
            border-radius: 8px;
            padding: 8px 10px;
          }
          .fee-item.dia { background-color: #fff1ee; }

          .fee-item .label {
            font-size: 13px;
            font-weight: 700;
            color: #94a3b8;
          }
          .fee-item.dia .label { color: #ff4b2b; }

          .fee-item .value {
            font-size: 15px;
            font-weight: 800;
            color: #334155;
          }
          .fee-item.dia .value { color: #ff4b2b; }

          @media (max-width: 600px) {
            /* 탭 바(고정 바)의 실제 높이(내부 16px 여백 포함)만큼 콘텐츠를 밀어냄 */
            .shipping-fee-container {
              padding: 0;
              padding-top: var(--tab-menu-h, 58px);
            }
            .tab-btn { padding: 10px 0 !important; font-size: 14px !important; border-radius: 8px !important; }
            /* 🌟 탭 메뉴도 드래그(스크롤)와 무관하게 완전 고정, currentMenu 바로 아래 틈 없이 붙임 */
            .tab-menu {
              gap: 6px !important;
              margin: 0 !important;
              padding: 10px 20px !important;
              position: fixed;
              left: 0;
              right: 0;
              top: calc(var(--sticky-header-h, 89px) + var(--sticky-menu-h, 64px));
              z-index: 60;
              background: rgba(248, 250, 252, 0.92);
              backdrop-filter: blur(10px);
            }

            .table-wrapper { display: none; }
            .card-list { display: block; }

            .num-btn { width: 34px !important; height: 34px !important; font-size: 13px !important; }
          }
        `}</style>

        <div className="tab-menu" ref={tabMenuRef}>
          {(['항공', 'EMS', '우체국해운'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="tab-btn"
              style={{
                backgroundColor: activeTab === tab ? '#ff4b2b' : '#f1f5f9',
                color: activeTab === tab ? '#fff' : '#64748b',
                boxShadow: activeTab === tab ? '0 4px 10px rgba(255, 75, 43, 0.2)' : 'none',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="table-wrapper">
          <table className="shipping-table">
            <thead>
              <tr>
                <th className="col-w">Weight</th>
                <th className="col-n">New</th>
                <th className="col-s">Silver</th>
                <th className="col-g">Gold</th>
                <th className="col-d" style={{ color: '#ff4b2b' }}>Dia</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((row, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#fcfdfe' }}>
                  <td style={{ fontWeight: '800', color: '#0f172a' }}>{row.weight}</td>
                  <td>{row.newMember}</td>
                  <td>{row.silver}</td>
                  <td>{row.gold}</td>
                  <td style={{ color: '#ff4b2b', fontWeight: '800' }}>{row.diamond}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-wrapper card-list">
          {currentItems.map((row, index) => (
            <div className="fee-card" key={index}>
              <div className="fee-card-header">{row.weight}</div>
              <div className="fee-card-grid">
                <div className="fee-item">
                  <span className="label">New</span>
                  <span className="value">{row.newMember}</span>
                </div>
                <div className="fee-item">
                  <span className="label">Silver</span>
                  <span className="value">{row.silver}</span>
                </div>
                <div className="fee-item">
                  <span className="label">Gold</span>
                  <span className="value">{row.gold}</span>
                </div>
                <div className="fee-item dia">
                  <span className="label">Dia</span>
                  <span className="value">{row.diamond}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '20px', paddingBottom: '30px' }}>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className="num-btn"
                style={{
                  width: '30px', height: '30px', borderRadius: '6px', fontWeight: '800', border: 'none',
                  backgroundColor: currentPage === page ? '#334155' : '#f1f5f9',
                  color: currentPage === page ? '#fff' : '#64748b',
                  fontSize: '12px', cursor: 'pointer'
                }}
              >
                {page}
              </button>
            ))}
          </div>
          <p style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700' }}>
            {currentPage} / {totalPages}
          </p>
        </div>
      </div>
    </GuideLayout>
  );
}