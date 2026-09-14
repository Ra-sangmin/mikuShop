'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import GuideLayout from '../../components/GuideLayout';
import '../guide-common.css';
import GuideFooterNotice from '../components/GuideFooterNotice';

type TabType = '항공' | 'EMS' | '우체국해운';
type MembershipLevel = 'newMember' | 'silver' | 'gold' | 'diamond';

type AirRule = {
  firstStepFee: number | null;
  baseFeeAtStepTwo: number | null;
  stepIncrement: number | null;
  discountVsGoldLow: number | null;
  discountVsGoldMid: number | null;
  discountVsGoldHigh: number | null;
};
type ExtraRate = { thresholdWeightKg: number; baseFeeAtThreshold: number; extraPerKg: number };

// 🌟 계산 공식 자체는 그대로 두고, 공식에 들어가는 숫자(가격/증가액 등)만
// /api/shipping-fee-rules(DB)에서 받아온 값을 인자로 전달받습니다.
const GRADE_KEY_MAP: Record<string, MembershipLevel> = { NEW: 'newMember', SILVER: 'silver', GOLD: 'gold', DIAMOND: 'diamond' };

/**
 * 배송비 계산 로직 (공식은 기존 유지, 변수는 DB에서 주입)
 */
export function calculateAirShippingFee(weight: number, level: MembershipLevel, rules: Record<MembershipLevel, AirRule>): number {
  if (weight <= 0) return 0;
  const steps = Math.ceil(weight / 0.5);
  const rule = rules[level];
  if (steps === 1) return rule.firstStepFee ?? 0;

  const extraSteps = steps - 2;
  if (level === 'diamond') {
    const goldRule = rules.gold;
    const goldFee = (goldRule.baseFeeAtStepTwo ?? 0) + (extraSteps * (goldRule.stepIncrement ?? 0));
    if (steps <= 9) return goldFee - (rule.discountVsGoldLow ?? 0);
    else if (steps === 10) return goldFee - (rule.discountVsGoldMid ?? 0);
    else return goldFee - (rule.discountVsGoldHigh ?? 0);
  }
  return (rule.baseFeeAtStepTwo ?? 0) + (extraSteps * (rule.stepIncrement ?? 0));
}

export function calculateEMSShippingFee(weight: number, breakpoints: Record<number, number>, extraRate: ExtraRate): number {
  if (weight <= 0) return 0;
  const roundedWeight = Math.ceil(weight * 2) / 2;
  if (roundedWeight <= extraRate.thresholdWeightKg) return breakpoints[roundedWeight] ?? 0;
  const extraKg = Math.ceil((roundedWeight - extraRate.thresholdWeightKg) / 1);
  return extraRate.baseFeeAtThreshold + (extraKg * extraRate.extraPerKg);
}

export function calculateOceanShippingFee(weight: number, extraRate: ExtraRate): number {
  if (weight <= 0) return 0;
  const roundedWeight = Math.ceil(weight * 2) / 2;
  if (roundedWeight <= extraRate.thresholdWeightKg) return extraRate.baseFeeAtThreshold;
  const extraKgSteps = Math.ceil((roundedWeight - extraRate.thresholdWeightKg) / 1);
  return extraRate.baseFeeAtThreshold + (extraKgSteps * extraRate.extraPerKg);
}

const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

// 🌟 /api/shipping-fee-rules 응답이 오기 전까지 화면이 비어 보이지 않도록 쓰는 기본값이며,
// DB의 초기 시드값과 동일합니다. 응답이 오면 즉시 이 값을 대체합니다.
const DEFAULT_AIR_RULES: Record<MembershipLevel, AirRule> = {
  newMember: { firstStepFee: 970, baseFeeAtStepTwo: 1300, stepIncrement: 300, discountVsGoldLow: null, discountVsGoldMid: null, discountVsGoldHigh: null },
  silver: { firstStepFee: 920, baseFeeAtStepTwo: 1250, stepIncrement: 250, discountVsGoldLow: null, discountVsGoldMid: null, discountVsGoldHigh: null },
  gold: { firstStepFee: 870, baseFeeAtStepTwo: 1200, stepIncrement: 250, discountVsGoldLow: null, discountVsGoldMid: null, discountVsGoldHigh: null },
  diamond: { firstStepFee: 790, baseFeeAtStepTwo: null, stepIncrement: null, discountVsGoldLow: 130, discountVsGoldMid: 100, discountVsGoldHigh: 50 },
};
const DEFAULT_EMS_BREAKPOINTS: Record<number, number> = {
  0.5: 1450, 1.0: 2200, 1.5: 2800, 2.0: 3400, 2.5: 3900, 3.0: 4400,
  3.5: 4900, 4.0: 5400, 4.5: 5900, 5.0: 6400, 5.5: 6900, 6.0: 7400,
  6.5: 8200, 7.0: 8200,
};
const DEFAULT_EMS_EXTRA: ExtraRate = { thresholdWeightKg: 7.0, baseFeeAtThreshold: 8200, extraPerKg: 800 };
const DEFAULT_OCEAN_EXTRA: ExtraRate = { thresholdWeightKg: 1.0, baseFeeAtThreshold: 2100, extraPerKg: 400 };

// 🌟 New/Silver/Gold/Dia 표기는 membership_grades 테이블(sortOrder 순)에서 가져옵니다.
// admin/membership-grades에서 등급명을 바꾸면 이 표에도 그대로 반영됩니다.
const DEFAULT_GRADE_NAMES = ['New', 'Silver', 'Gold', 'Dia'];

export default function ShippingFeePage() {
  const [activeTab, setActiveTab] = useState<TabType>('항공');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const tabMenuRef = useRef<HTMLDivElement>(null);
  const [gradeNames, setGradeNames] = useState<string[]>(DEFAULT_GRADE_NAMES);
  const [airRules, setAirRules] = useState<Record<MembershipLevel, AirRule>>(DEFAULT_AIR_RULES);
  const [emsBreakpoints, setEmsBreakpoints] = useState<Record<number, number>>(DEFAULT_EMS_BREAKPOINTS);
  const [emsExtra, setEmsExtra] = useState<ExtraRate>(DEFAULT_EMS_EXTRA);
  const [oceanExtra, setOceanExtra] = useState<ExtraRate>(DEFAULT_OCEAN_EXTRA);

  useEffect(() => {
    fetch('/api/membership-grades')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.grades) && data.grades.length > 0) {
          setGradeNames(data.grades.map((g: any) => g.name));
        }
      })
      .catch(() => {});
  }, []);

  // 🌟 항공/EMS/우체국해운 요금 계산 변수를 DB(membership_grades와 별도로
  // air_shipping_fee_rules / ems_shipping_fee_breakpoints / shipping_fee_extra_rates)에서 받아옵니다.
  useEffect(() => {
    fetch('/api/shipping-fee-rules')
      .then(res => res.json())
      .then(data => {
        if (!data.success) return;

        if (Array.isArray(data.airRules) && data.airRules.length > 0) {
          const nextAirRules = { ...DEFAULT_AIR_RULES };
          data.airRules.forEach((r: any) => {
            const key = GRADE_KEY_MAP[r.grade];
            if (key) nextAirRules[key] = r;
          });
          setAirRules(nextAirRules);
        }

        if (Array.isArray(data.emsBreakpoints) && data.emsBreakpoints.length > 0) {
          const nextBreakpoints: Record<number, number> = {};
          data.emsBreakpoints.forEach((b: any) => { nextBreakpoints[b.weightKg] = b.fee; });
          setEmsBreakpoints(nextBreakpoints);
        }

        const extraRates = Array.isArray(data.extraRates) ? data.extraRates : [];
        const ems = extraRates.find((r: any) => r.method === 'EMS');
        if (ems) setEmsExtra(ems);
        const ocean = extraRates.find((r: any) => r.method === 'OCEAN');
        if (ocean) setOceanExtra(ocean);
      })
      .catch(() => {});
  }, []);

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
      newMember: formatCurrency(calculateAirShippingFee(w, 'newMember', airRules)),
      silver: formatCurrency(calculateAirShippingFee(w, 'silver', airRules)),
      gold: formatCurrency(calculateAirShippingFee(w, 'gold', airRules)),
      diamond: formatCurrency(calculateAirShippingFee(w, 'diamond', airRules))
    };
  }), [airRules]);

  const emsShippingFees = useMemo(() => Array.from({ length: 60 }, (_, i) => {
    const w = (i + 1) * 0.5;
    const fee = formatCurrency(calculateEMSShippingFee(w, emsBreakpoints, emsExtra));
    return { weight: `${w.toFixed(1)}k`, newMember: fee, silver: fee, gold: fee, diamond: fee };
  }), [emsBreakpoints, emsExtra]);

  const oceanShippingFees = useMemo(() => Array.from({ length: 40 }, (_, i) => {
    const w = (i + 1) * 0.5;
    const fee = formatCurrency(calculateOceanShippingFee(w, oceanExtra));
    return { weight: `${w.toFixed(1)}k`, newMember: fee, silver: fee, gold: fee, diamond: fee };
  }), [oceanExtra]);

  const currentDisplayData = activeTab === '항공' ? airShippingFees : activeTab === 'EMS' ? emsShippingFees : oceanShippingFees;
  const totalPages = Math.ceil(currentDisplayData.length / itemsPerPage);
  const currentItems = currentDisplayData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [activeTab]);

  return (
    <GuideLayout title="국제배송 요금표" type="fee">
      <div className="shipping-fee-container">
        
        <style jsx global>{`
          .shipping-fee-container {
            /* 🌟 guide/membership, fee-guide, shipping-fee, customs 4개 페이지가 서로 다른
               max-width/padding을 써서 전체 가로 폭과 타이틀 위치가 제각각이었습니다.
               1100px + 좌우 24px로 4개 페이지 모두 통일합니다. */
            width: 100%;
            max-width: 1100px;
            margin: 0 auto;
            padding: 0 24px 56px;
            box-sizing: border-box;
            color: #334155;
          }

          .tab-menu {
            display: flex;
            gap: 6px;
            margin-bottom: 24px;
            padding: 6px;
            background: #eef1f6;
            border-radius: 16px;
          }
          .tab-btn {
            flex: 1; padding: 13px 0; border-radius: 12px;
            font-weight: 800; font-size: 16px; cursor: pointer; border: none;
            background: transparent; color: #64748b;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .tab-btn:hover:not(.active) { color: #ff4b2b; }
          .tab-btn.active {
            background: linear-gradient(135deg, #ff7a59 0%, #ff4b2b 100%);
            color: #fff;
            box-shadow: 0 10px 22px -8px rgba(255, 75, 43, 0.55);
          }

          .table-wrapper {
            position: relative;
            background-color: #fff; border-radius: 20px;
            border: 1px solid #eef0f5; box-shadow: 0 16px 36px -16px rgba(15, 23, 42, 0.14);
            overflow: hidden;
          }

          .shipping-table {
            width: 100%; border-collapse: collapse; table-layout: fixed;
          }

          .shipping-table th {
            padding: 16px 2px; background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
            border-bottom: 2px solid #e2e8f0;
            font-size: 12.5px; font-weight: 800; color: #64748b; text-align: center;
            letter-spacing: 0.03em; text-transform: uppercase;
          }
          .shipping-table th.col-d { background: linear-gradient(180deg, #fff1ee 0%, #ffe0d5 100%); color: #ff4b2b !important; }

          .shipping-table td {
            padding: 12px 2px; border-bottom: 1px solid #f1f5f9;
            font-size: 13.5px; text-align: center; color: #334155;
          }
          .shipping-table tbody tr { transition: background-color 0.15s ease; }
          .shipping-table tbody tr:hover { background-color: #fbfbfe; }
          .shipping-table td.col-d { background-color: rgba(255, 75, 43, 0.035); }

          .card-list { display: none; }

          .fee-card {
            border-bottom: 1px solid #f1f5f9;
            padding: 16px 18px;
          }
          .fee-card:last-child { border-bottom: none; }

          .fee-card-header {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .fee-card-header::before {
            content: '';
            width: 4px;
            height: 14px;
            border-radius: 2px;
            background: linear-gradient(180deg, #ff7a59, #ea580c);
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
            border: 1px solid #f1f5f9;
            border-radius: 12px;
            padding: 9px 12px;
          }
          .fee-item.dia { background: linear-gradient(135deg, #fff1ee 0%, #ffe4dc 100%); border-color: #ffd4c7; }

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

          .pagination-wrap {
            display: flex; flex-direction: column; align-items: center; gap: 10px;
            margin-top: 20px; margin-bottom: 30px;
            padding: 18px; background-color: #fff; border-radius: 18px;
            border: 1px solid #eef0f5; box-shadow: 0 10px 24px -16px rgba(15, 23, 42, 0.12);
          }
          .pagination-nums { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; }
          .num-btn {
            width: 32px; height: 32px; border-radius: 10px; font-weight: 800; border: none;
            background-color: #f8fafc; color: #64748b; font-size: 12px; cursor: pointer;
            transition: all 0.2s ease;
          }
          .num-btn:hover:not(.active) { background-color: #e2e8f0; color: #334155; }
          .num-btn.active {
            background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
            color: #fff;
            box-shadow: 0 8px 16px -6px rgba(30, 41, 59, 0.45);
          }
          .pagination-counter { color: #94a3b8; font-size: 11px; font-weight: 700; }

          /* 🌟 하단 안내 카드는 app/guide/components/GuideFooterNotice.tsx로 공용화했습니다. */

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
              border-radius: 0;
            }

            .table-wrapper { display: none; }
            .card-list { display: block; }

            .num-btn { width: 34px !important; height: 34px !important; font-size: 13px !important; }
          }
        `}</style>

        {/* 🌟 새로 추가된 큰 제목 영역 (membership 페이지와 동일한 위치/스타일) */}
        <h2 className="guide-title">국제 배송 요금표 <span className="guide-title-icon"><i className="fa fa-plane"></i></span></h2>

        <div className="guide-panel">

        <div className="tab-menu" ref={tabMenuRef}>
          {(['항공', 'EMS', '우체국해운'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
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
                <th className="col-n">{gradeNames[0]}</th>
                <th className="col-s">{gradeNames[1]}</th>
                <th className="col-g">{gradeNames[2]}</th>
                <th className="col-d">{gradeNames[3]}</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((row, index) => (
                <tr key={index}>
                  <td style={{ fontWeight: '800', color: '#0f172a' }}>{row.weight}</td>
                  <td>{row.newMember}</td>
                  <td>{row.silver}</td>
                  <td>{row.gold}</td>
                  <td className="col-d" style={{ color: '#ff4b2b', fontWeight: '800' }}>{row.diamond}</td>
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
                  <span className="label">{gradeNames[0]}</span>
                  <span className="value">{row.newMember}</span>
                </div>
                <div className="fee-item">
                  <span className="label">{gradeNames[1]}</span>
                  <span className="value">{row.silver}</span>
                </div>
                <div className="fee-item">
                  <span className="label">{gradeNames[2]}</span>
                  <span className="value">{row.gold}</span>
                </div>
                <div className="fee-item dia">
                  <span className="label">{gradeNames[3]}</span>
                  <span className="value">{row.diamond}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pagination-wrap">
          <div className="pagination-nums">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`num-btn ${currentPage === page ? 'active' : ''}`}
              >
                {page}
              </button>
            ))}
          </div>
          <p className="pagination-counter">
            {currentPage} / {totalPages}
          </p>
        </div>

        {/* Footer info (guide/customs, guide/fee-guide와 동일한 디자인) */}
        <GuideFooterNotice style={{ marginBottom: '30px' }}>
          <span style={{ display: 'block', fontSize: '15.5px', lineHeight: '1.5', color: '#1e293b', fontWeight: '700', marginBottom: '10px' }}>
            실제 무게(kg)와 부피 무게(가로×세로×높이 ÷ 6,000㎤) 중<br />
            <strong style={{ color: '#ff4b2b', fontWeight: '900' }}>더 큰 값</strong>을 기준으로 배송비가 산정됩니다.
          </span>
          <span style={{ display: 'block', fontSize: '13.5px', lineHeight: '1.6', color: '#94a3b8', fontWeight: '500' }}>
            부피가 큰 상품(피규어, 프라모델, 스낵류 등)은 요금이 달라질 수 있어요.<br />
            정확한 확인은 <span className="footer-info-link">1:1 상담</span>을 통해 문의주세요.
          </span>
        </GuideFooterNotice>

        </div>
      </div>
    </GuideLayout>
  );
}