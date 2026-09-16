'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import GuideLayout from '../../components/GuideLayout';
import '../guide-common.css';
import GuideFooterNotice from '../components/GuideFooterNotice';
import GuidePremiumHero from '../components/GuidePremiumHero';
import GuideTitle from '../components/GuideTitle';
import { AirplaneTilt, MagnifyingGlass, CaretLeft, CaretRight } from '@phosphor-icons/react';

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

// 🌟 요금표 셀 표시용: "2.5k" → 2.5 + 작은 kg, "¥1,300" → 옅은 ¥ + 숫자
const renderWeight = (w: string) => (
  <>{w.replace(/k$/i, '')}<small>kg</small></>
);
const renderYen = (v: string) => (
  v.startsWith('¥') ? <><span className="yen">¥</span>{v.slice(1)}</> : v
);

export default function ShippingFeePage() {
  const [activeTab, setActiveTab] = useState<TabType>('항공');
  const [currentPage, setCurrentPage] = useState(1);
  const [weightQuery, setWeightQuery] = useState('');
  const [foundIndex, setFoundIndex] = useState<number | null>(null);
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

  useEffect(() => { setCurrentPage(1); setFoundIndex(null); }, [activeTab]);

  // 🌟 무게로 바로 찾기: 0.5kg 단위로 올림한 행이 있는 페이지로 이동하고 그 행을 강조합니다.
  const maxWeightKg = currentDisplayData.length * 0.5;
  const handleWeightSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const w = parseFloat(weightQuery);
    if (!w || w <= 0) { setFoundIndex(null); return; }
    const idx = Math.min(Math.ceil(w / 0.5), currentDisplayData.length) - 1;
    setFoundIndex(idx);
    setCurrentPage(Math.floor(idx / itemsPerPage) + 1);
  };
  const pageOffset = (currentPage - 1) * itemsPerPage;

  return (
    <GuideLayout title="국제배송 요금표" type="fee">
      <div className="shipping-fee-container">
        
        <style jsx global>{`
          .shipping-fee-container {
            /* 🌟 guide/membership, fee-guide, shipping-fee, customs 4개 페이지가 서로 다른
               max-width/padding을 써서 전체 가로 폭과 타이틀 위치가 제각각이었습니다.
               좌우 여백 없이(guide-page-container와 동일) 본문 폭을 통일합니다. */
            width: 100%;
            max-width: 1100px;
            margin: 0 auto;
            padding: 0 0 56px;
            box-sizing: border-box;
            color: #334155;
          }

          .tab-menu {
            display: flex;
            gap: 6px;
            margin-bottom: 16px;
            padding: 5px;
            background: #f1f3f6;
            border: 1px solid #e8ebf0;
            border-radius: 16px;
          }
          .tab-btn {
            flex: 1; padding: 13px 0; border-radius: 12px;
            font-weight: 800; font-size: 16px; cursor: pointer; border: none;
            background: transparent; color: #64748b;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .tab-btn { color: #4b5563; font-family: inherit; }
          .tab-btn:hover:not(.active) { color: #111827; background: rgba(255,255,255,0.6); }
          .tab-btn.active {
            background: #ffffff;
            color: #b04a12;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 6px 14px rgba(15, 23, 42, 0.08);
          }

          /* ============================================================
             🌟 국제 배송 요금표 (프리미엄 리디자인)
             - 헤더: 네이비 다크 행(상단 검은색 카드와 같은 톤) + 등급별 색 점
             - 무게: 숫자 + 작은 단위(kg), 행마다 은은한 줄무늬 · 따뜻한 hover
             - DIAMOND 열: 따뜻한 크림 배경 + 앰버 숫자로 최우수 등급 강조
             ============================================================ */
          .table-wrapper {
            position: relative;
            background-color: #fff; border-radius: 22px;
            border: 1px solid #e9edf3;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 24px 48px -28px rgba(15, 23, 42, 0.28);
            overflow: hidden;
          }

          .shipping-table {
            width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed;
          }
          .shipping-table th {
            position: relative;
            padding: 16px 4px;
            background: linear-gradient(180deg, #172033 0%, #0f172a 100%);
            color: #cbd5e1; text-align: center;
            font-size: 11.5px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;
            border-bottom: 1px solid rgba(255,255,255,0.06);
          }
          .shipping-table th:first-child { border-top-left-radius: 22px; }
          .shipping-table th:last-child { border-top-right-radius: 22px; }
          .shipping-table thead tr::after { content: none; }
          .shipping-table th .th-inner { display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
          .shipping-table th .th-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--th-color, #94a3b8); box-shadow: 0 0 0 3px var(--th-glow, rgba(148,163,184,0.25)); }
          .shipping-table th.col-w { color: #94a3b8; }
          .shipping-table th.col-n { --th-color: #a78bfa; --th-glow: rgba(167,139,250,0.28); }
          .shipping-table th.col-s { --th-color: #cbd5e1; --th-glow: rgba(203,213,225,0.25); }
          .shipping-table th.col-g { --th-color: #fbbf24; --th-glow: rgba(251,191,36,0.28); }
          .shipping-table th.col-d {
            --th-color: #7dd3fc; --th-glow: rgba(125,211,252,0.3);
            color: #ffffff;
            background: linear-gradient(180deg, #1b2a45 0%, #14213a 100%);
            box-shadow: inset 1px 0 0 rgba(255,255,255,0.08);
          }
          .shipping-table th.col-d::after {
            content: ''; position: absolute; left: 12%; right: 12%; bottom: 0; height: 2px;
            background: linear-gradient(90deg, transparent, #fbbf24 30%, #fde68a 50%, #fbbf24 70%, transparent);
          }

          .shipping-table td {
            padding: 13px 4px; border-bottom: 1px solid #f1f4f8;
            font-size: 14px; text-align: center; color: #1f2937; font-variant-numeric: tabular-nums;
            transition: background-color 0.15s ease;
          }
          .shipping-table tbody tr:nth-child(even) td { background-color: #fbfbfd; }
          .shipping-table tbody tr:last-child td { border-bottom: none; }
          .shipping-table tbody tr:hover td { background-color: #fff7f0; }
          .shipping-table td.col-w { font-weight: 800; color: #0f172a; font-size: 14.5px; }
          .shipping-table td.col-w small { font-size: 11px; font-weight: 700; color: #94a3b8; margin-left: 2px; letter-spacing: 0.02em; }
          .shipping-table td .yen { font-weight: 600; color: #94a3b8; margin-right: 1px; font-size: 12px; }
          .shipping-table td.col-d {
            background-color: #fffaf4; color: #b04a12; font-weight: 800; font-size: 15px;
            box-shadow: inset 1px 0 0 #f6e4d2;
          }
          .shipping-table tbody tr:nth-child(even) td.col-d { background-color: #fff6ec; }
          .shipping-table tbody tr:hover td.col-d { background-color: #ffefdf; }
          .shipping-table td.col-d .yen { color: #d19a6a; }
          .shipping-table tbody tr.is-found td { background: #fff3e6 !important; box-shadow: inset 0 1px 0 #f6dcc8, inset 0 -1px 0 #f6dcc8; }
          .shipping-table tbody tr.is-found td:first-child { box-shadow: inset 3px 0 0 #d0591a, inset 0 1px 0 #f6dcc8, inset 0 -1px 0 #f6dcc8; }
          .fee-card.is-found { background: #fff6ef; box-shadow: inset 3px 0 0 #d0591a; }

          .weight-search {
            display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px 14px;
            margin-bottom: 16px; padding: 12px 14px; border-radius: 16px;
            background: #fbfbfc; border: 1px solid #eceef3;
          }
          .weight-search-label { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; color: #374151; }
          .weight-search-label svg { color: #b04a12; }
          .weight-search-form { display: flex; align-items: center; gap: 6px; }
          .weight-search-input { position: relative; }
          .weight-search-input input {
            width: 130px; height: 40px; padding: 0 34px 0 14px; border-radius: 12px;
            border: 1px solid #e2e5eb; background: #fff; font-size: 14px; font-weight: 700; color: #111827;
            outline: none; box-sizing: border-box; font-family: inherit;
          }
          .weight-search-input input:focus { border-color: #d0591a; box-shadow: 0 0 0 4px rgba(208, 89, 26, 0.16); }
          .weight-search-input span { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 13px; font-weight: 800; color: #6b7280; pointer-events: none; }
          .weight-search-btn {
            height: 40px; padding: 0 16px; border-radius: 12px; border: none; cursor: pointer; font-family: inherit;
            font-size: 13px; font-weight: 800; color: #fff;
            background: linear-gradient(135deg, #d0591a 0%, #a4440f 100%);
            box-shadow: 0 8px 16px -8px rgba(164, 68, 15, 0.6);
          }
          .weight-search-result { font-size: 12px; font-weight: 700; color: #6b7280; }
          .weight-search-result b { color: #b04a12; }

          .card-list { display: none; }

          .fee-card {
            border-bottom: 1px solid #f1f5f9;
            padding: 16px 18px;
          }
          .fee-card:nth-child(even) { background: #fbfbfd; }
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
            background: linear-gradient(180deg, #d0591a, #a4440f);
          }
          .fee-card-header small { font-size: 11px; font-weight: 700; color: #94a3b8; margin-left: -4px; }

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
            padding: 9px 10px;
            gap: 6px;
          }
          .fee-item.dia { background: #fff6ef; border-color: #f6dcc8; }

          .fee-item .label {
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: #6b7280;
            white-space: nowrap;
          }
          .fee-item.dia .label { color: #b04a12; }

          .fee-item .value {
            font-size: 15px;
            font-weight: 800;
            color: #334155;
          }
          .fee-item.dia .value { color: #b04a12; }

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
          .num-btn { font-family: inherit; font-variant-numeric: tabular-nums; }
          .num-btn.active {
            background: linear-gradient(135deg, #d0591a 0%, #a4440f 100%);
            color: #fff;
            box-shadow: 0 8px 16px -8px rgba(164, 68, 15, 0.6);
          }
          .pagination-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: center; }
          .page-arrow {
            width: 32px; height: 32px; border-radius: 10px; border: 1px solid #e2e5eb; background: #fff; color: #374151;
            display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
          }
          .page-arrow:disabled { color: #c4c8d0; background: #f9fafb; cursor: not-allowed; }
          .pagination-counter { color: #6b7280; font-size: 12px; font-weight: 700; margin: 0; }

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
            .weight-search { margin-top: 14px; }
            .weight-search-form { width: 100%; }
            .weight-search-input { flex: 1; }
            .weight-search-input input { width: 100%; }
          }
        `}</style>

        {/* 🌟 새로 추가된 큰 제목 영역 (membership 페이지와 동일한 위치/스타일) */}
        {/* 🌟 요약 카드 + 제목 — mypage/wishlist 와 같은 구성 (카드가 제목 위) */}
        <GuidePremiumHero
          ariaLabel="국제 배송비 요약"
          eyebrow="SHIPPING RATE"
          title={<>무게별 <em>국제 배송비</em>를 확인하세요</>}
          desc="회원 등급이 높을수록 항공 배송비가 저렴해집니다. 요금은 0.5kg 단위로 올림해 적용돼요."
          icon={<AirplaneTilt weight="duotone" />}
          feature={{
            label: <><i className="fa fa-plane"></i> 선택한 배송</>,
            value: activeTab,
            sub: '0.5kg 단위 적용',
            actions: [
              { href: '/delivery/request', label: <><i className="fa fa-truck-fast"></i> 배송대행 신청</>, primary: true },
              { href: '/guide/customs', label: <><i className="fa fa-landmark"></i> 관부가세 안내</> },
            ],
          }}
          stats={[
            { label: '무게 단위', value: '0.5kg' },
            { label: '조회 범위', value: `~${maxWeightKg}kg` },
            { label: '회원 등급 혜택', value: <>보러가기 <i className="fa fa-arrow-right"></i></>, text: true, href: '/guide/membership' },
            { label: '배송대행 방법', value: <>보러가기 <i className="fa fa-arrow-right"></i></>, text: true, href: '/guide/delivery-method' },
          ]}
        />

        <GuideTitle eyebrow="Shipping Rate" title="국제 배송 요금표" icon="fa-plane" />

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

        <div className="weight-search">
          <span className="weight-search-label"><MagnifyingGlass size={16} weight="bold" />무게로 바로 찾기
            {foundIndex !== null && (
              <span className="weight-search-result"> · <b>{currentDisplayData[foundIndex]?.weight}g</b> 구간을 표시했어요</span>
            )}
          </span>
          <form className="weight-search-form" onSubmit={handleWeightSearch}>
            <div className="weight-search-input">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={weightQuery}
                onChange={(e) => setWeightQuery(e.target.value)}
                placeholder="예: 2.3"
                aria-label="상품 무게(kg)"
              />
              <span>kg</span>
            </div>
            <button type="submit" className="weight-search-btn">찾기</button>
          </form>
        </div>

        <div className="table-wrapper">
          <table className="shipping-table">
            <thead>
              <tr>
                <th className="col-w"><span className="th-inner">Weight</span></th>
                <th className="col-n"><span className="th-inner"><i className="th-dot" aria-hidden="true"></i>{gradeNames[0]}</span></th>
                <th className="col-s"><span className="th-inner"><i className="th-dot" aria-hidden="true"></i>{gradeNames[1]}</span></th>
                <th className="col-g"><span className="th-inner"><i className="th-dot" aria-hidden="true"></i>{gradeNames[2]}</span></th>
                <th className="col-d"><span className="th-inner"><i className="th-dot" aria-hidden="true"></i>{gradeNames[3]}</span></th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((row, index) => (
                <tr key={index} className={foundIndex === pageOffset + index ? 'is-found' : ''}>
                  <td className="col-w">{renderWeight(row.weight)}</td>
                  <td>{renderYen(row.newMember)}</td>
                  <td>{renderYen(row.silver)}</td>
                  <td>{renderYen(row.gold)}</td>
                  <td className="col-d">{renderYen(row.diamond)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-wrapper card-list">
          {currentItems.map((row, index) => (
            <div className={`fee-card ${foundIndex === pageOffset + index ? 'is-found' : ''}`} key={index}>
              <div className="fee-card-header">{renderWeight(row.weight)}</div>
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
          <div className="pagination-row">
          <button type="button" className="page-arrow" aria-label="이전 페이지" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
            <CaretLeft size={14} weight="bold" />
          </button>
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
          <button type="button" className="page-arrow" aria-label="다음 페이지" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
            <CaretRight size={14} weight="bold" />
          </button>
          </div>
          <p className="pagination-counter">
            {currentPage} / {totalPages}
          </p>
        </div>

        {/* Footer info (guide/customs, guide/fee-guide와 동일한 디자인) */}
        <GuideFooterNotice style={{ marginBottom: '30px' }}>
          <span style={{ display: 'block', fontSize: '15.5px', lineHeight: '1.5', color: '#1e293b', fontWeight: '700', marginBottom: '10px' }}>
            실제 무게(kg)와 부피 무게(가로×세로×높이 ÷ 6,000㎤) 중<br />
            <strong style={{ color: '#b04a12', fontWeight: '900' }}>더 큰 값</strong>을 기준으로 배송비가 산정됩니다.
          </span>
          <span style={{ display: 'block', fontSize: '13.5px', lineHeight: '1.6', color: '#6b7280', fontWeight: '500' }}>
            부피가 큰 상품(피규어, 프라모델, 스낵류 등)은 요금이 달라질 수 있어요.<br />
            정확한 확인은 <span className="footer-info-link">1:1 상담</span>을 통해 문의주세요.
          </span>
        </GuideFooterNotice>

        </div>
      </div>
    </GuideLayout>
  );
}