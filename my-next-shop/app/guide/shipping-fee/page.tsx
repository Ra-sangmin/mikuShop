'use client';

// ✈️ 이용가이드 > 국제배송 요금표
//   미쿠짱 특송(롯데 특송 요금)과 EMS 를 한 표에서 나란히 비교합니다. (회원 등급 구분 없음)
//   - 요금 값: 관리자 > 회원 등급 관리 (DB shipping_rates) → /api/shipping-rates
//   - 기본값 · 조회 함수: lib/shippingRates.ts  (응답 전 · 실패 시 기본값으로 보여 줍니다)
//   - 무게는 그 구간의 상한입니다. 예) 1.1kg → 1.25kg 구간 요금

import React, { useState, useMemo, useEffect, useRef } from 'react';
import GuideLayout from '../../components/GuideLayout';
import '../guide-common.css';
import GuideFooterNotice from '../components/GuideFooterNotice';
import GuidePremiumHero from '../components/GuidePremiumHero';
import GuideTitle from '../components/GuideTitle';
import { AirplaneTilt, MagnifyingGlass, Crown, ArrowDown, X } from '@phosphor-icons/react';
import { DEFAULT_SHIPPING_RATES, lookupShippingFee, type RatePair } from '@/lib/shippingRates';

type Row = { weightKg: number; miku: number | null; ems: number | null };

// 무게 구간 묶음 (표 안 소제목)
const BANDS: { max: number; title: string; eyebrow: string }[] = [
  { max: 1, title: '1kg 이하', eyebrow: 'LIGHT' },
  { max: 2, title: '1 ~ 2kg', eyebrow: 'COMPACT' },
  { max: 10, title: '2 ~ 10kg', eyebrow: 'STANDARD' },
  { max: Infinity, title: '10kg 초과', eyebrow: 'HEAVY' },
];

const yen = (v: number | null) => (v === null ? '-' : v.toLocaleString('ko-KR'));
const fmtKg = (w: number) => (Number.isInteger(w) ? String(w) : String(+w.toFixed(2)));

export default function ShippingFeePage() {
  const [weightQuery, setWeightQuery] = useState('');
  const [foundWeight, setFoundWeight] = useState<number | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | HTMLDivElement | null>>({});

  // 🌟 요금표는 DB(관리자 > 회원 등급 관리)에서 받아옵니다.
  const [rates, setRates] = useState<{ MIKU: RatePair[]; EMS: RatePair[] }>(DEFAULT_SHIPPING_RATES);
  useEffect(() => {
    fetch('/api/shipping-rates')
      .then(res => res.json())
      .then(data => { if (data?.success && data.rates) setRates(data.rates); })
      .catch(() => {});
  }, []);

  // 두 요금표의 무게를 합쳐 한 줄에 나란히 놓습니다. (한쪽에 없는 무게는 그쪽 표의 다음 구간 요금)
  const rows: Row[] = useMemo(() => {
    const weights = Array.from(new Set([...rates.MIKU, ...rates.EMS].map(([w]) => w))).sort((a, b) => a - b);
    return weights.map(w => ({
      weightKg: w,
      miku: lookupShippingFee(w, rates.MIKU),
      ems: lookupShippingFee(w, rates.EMS),
    }));
  }, [rates]);

  const bands = useMemo(() => {
    let prev = 0;
    return BANDS.map(b => {
      const list = rows.filter(r => r.weightKg > prev + 1e-9 && r.weightKg <= b.max + 1e-9);
      prev = b.max;
      return { ...b, rows: list };
    }).filter(b => b.rows.length > 0);
  }, [rows]);

  const maxWeightKg = rows[rows.length - 1]?.weightKg ?? 0;
  const saving = (r: Row) => (r.miku !== null && r.ems !== null ? r.ems - r.miku : null);
  const savingPct = (r: Row) => {
    const s = saving(r);
    return s !== null && r.ems ? Math.round((s / r.ems) * 100) : null;
  };
  const maxSaving = rows.reduce((m, r) => Math.max(m, saving(r) ?? 0), 0);
  const maxPct = rows.reduce((m, r) => Math.max(m, savingPct(r) ?? 0), 0);

  // 🌟 무게로 바로 찾기: 입력한 무게가 들어가는 구간(다음 구간으로 올림)을 강조하고 그 줄로 스크롤합니다.
  const found = foundWeight === null ? null : rows.find(r => r.weightKg === foundWeight) || null;
  const handleWeightSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const w = parseFloat(weightQuery);
    if (!w || w <= 0 || rows.length === 0) { setFoundWeight(null); return; }
    const hit = rows.find(r => w <= r.weightKg + 1e-9) || rows[rows.length - 1];
    setFoundWeight(hit.weightKg);
    setTimeout(() => {
      const isMobile = window.matchMedia('(max-width: 600px)').matches;
      const el = rowRefs.current[`${isMobile ? 'm' : 't'}-${hit.weightKg}`];
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 40);
  };
  const overMax = found !== null && parseFloat(weightQuery) > maxWeightKg;

  return (
    <GuideLayout title="국제배송 요금표" type="fee">
      <div className="shipping-fee-container">

        <style jsx global>{`
          .shipping-fee-container {
            /* 🌟 guide/membership, fee-guide, shipping-fee, customs 4개 페이지 본문 폭 통일 */
            width: 100%;
            max-width: 1100px;
            margin: 0 auto;
            padding: 0 0 56px;
            box-sizing: border-box;
            color: #334155;
            --sf-miku: #b04a12;
            --sf-miku-2: #d0591a;
            --sf-ink: #0f172a;
            --sf-line: #eef1f5;
          }

          /* ---------- 상단: 두 서비스 소개 카드 ---------- */
          .sf-compare {
            display: grid; grid-template-columns: 1.15fr 1fr; gap: 14px; margin-bottom: 18px;
          }
          .sf-svc {
            position: relative; overflow: hidden;
            display: flex; flex-direction: column; gap: 10px;
            padding: 22px 24px; border-radius: 20px;
            border: 1px solid #e9edf3; background: #fff;
            box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 18px 36px -28px rgba(15,23,42,0.35);
          }
          .sf-svc-head { display: flex; align-items: center; gap: 12px; }
          .sf-svc-icon {
            width: 42px; height: 42px; border-radius: 14px; flex-shrink: 0;
            display: inline-flex; align-items: center; justify-content: center; font-size: 20px;
          }
          .sf-svc-eyebrow { display: block; font-size: 10.5px; font-weight: 900; letter-spacing: 0.18em; }
          .sf-svc-name { margin: 2px 0 0; font-size: 19px; font-weight: 900; letter-spacing: -0.4px; color: var(--sf-ink); }
          .sf-svc-desc { margin: 0; font-size: 13.5px; font-weight: 600; line-height: 1.55; color: #64748b; word-break: keep-all; }
          .sf-svc-from { display: flex; align-items: baseline; gap: 6px; margin-top: 2px; }
          .sf-svc-from span { font-size: 12px; font-weight: 700; color: #94a3b8; }
          .sf-svc-from strong { font-size: 24px; font-weight: 900; letter-spacing: -0.6px; font-variant-numeric: tabular-nums; }
          .sf-svc-from small { font-size: 13px; font-weight: 800; margin-right: 1px; opacity: 0.7; }

          .sf-svc.is-miku {
            border-color: transparent; color: #fff;
            background:
              radial-gradient(120% 140% at 100% 0%, rgba(253, 186, 116, 0.35) 0%, transparent 55%),
              linear-gradient(135deg, #1b2336 0%, #0f172a 100%);
            box-shadow: 0 26px 48px -30px rgba(15, 23, 42, 0.8), inset 0 1px 0 rgba(255,255,255,0.08);
          }
          .sf-svc.is-miku::after {
            content: ''; position: absolute; left: 0; right: 0; top: 0; height: 3px;
            background: linear-gradient(90deg, #f59e0b, #fb923c, #d0591a);
          }
          .sf-svc.is-miku .sf-svc-icon { color: #fff; background: linear-gradient(135deg, #fb923c 0%, #c2410c 100%); box-shadow: 0 10px 20px -10px rgba(234, 88, 12, 0.9); }
          .sf-svc.is-miku .sf-svc-eyebrow { color: #fdba74; }
          .sf-svc.is-miku .sf-svc-name { color: #fff; }
          .sf-svc.is-miku .sf-svc-desc { color: #cbd5e1; }
          .sf-svc.is-miku .sf-svc-from strong { color: #fed7aa; }
          .sf-svc.is-miku .sf-svc-from span { color: #94a3b8; }
          .sf-svc-badge {
            position: absolute; top: 18px; right: 18px;
            display: inline-flex; align-items: center; gap: 5px;
            padding: 5px 10px; border-radius: 999px;
            font-size: 11px; font-weight: 900; letter-spacing: 0.04em;
            color: #7c2d12; background: linear-gradient(135deg, #fde68a 0%, #fdba74 100%);
            box-shadow: 0 8px 16px -10px rgba(251, 146, 60, 0.9);
          }
          .sf-svc.is-ems .sf-svc-icon { color: #1d4ed8; background: #eef4ff; border: 1px solid #dbe6fb; }
          .sf-svc.is-ems .sf-svc-eyebrow { color: #2563eb; }
          .sf-svc.is-ems .sf-svc-from strong { color: #1e293b; }

          /* ---------- 무게로 바로 찾기 ---------- */
          .weight-search {
            display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px 14px;
            margin-bottom: 18px; padding: 14px 16px; border-radius: 18px;
            background: linear-gradient(180deg, #ffffff 0%, #fbfbfd 100%); border: 1px solid #eceef3;
          }
          .weight-search-label { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 800; color: #374151; }
          .weight-search-label svg { color: var(--sf-miku); }
          .weight-search-form { display: flex; align-items: center; gap: 6px; }
          .weight-search-input { position: relative; }
          .weight-search-input input {
            width: 140px; height: 42px; padding: 0 34px 0 14px; border-radius: 12px;
            border: 1px solid #e2e5eb; background: #fff; font-size: 14px; font-weight: 700; color: #111827;
            outline: none; box-sizing: border-box; font-family: inherit;
          }
          .weight-search-input input:focus { border-color: var(--sf-miku-2); box-shadow: 0 0 0 4px rgba(208, 89, 26, 0.16); }
          .weight-search-input span { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 13px; font-weight: 800; color: #6b7280; pointer-events: none; }
          .weight-search-btn {
            height: 42px; padding: 0 18px; border-radius: 12px; border: none; cursor: pointer; font-family: inherit;
            font-size: 13px; font-weight: 800; color: #fff;
            background: linear-gradient(135deg, var(--sf-miku-2) 0%, #a4440f 100%);
            box-shadow: 0 8px 16px -8px rgba(164, 68, 15, 0.6);
          }
          .sf-result {
            flex-basis: 100%;
            display: flex; align-items: center; flex-wrap: wrap; gap: 8px 14px;
            padding: 12px 14px; border-radius: 14px;
            background: #fff7ef; border: 1px solid #f6dcc8;
            font-size: 13px; font-weight: 700; color: #7c2d12;
          }
          .sf-result b { font-weight: 900; font-variant-numeric: tabular-nums; }
          .sf-result .sf-result-sep { width: 1px; height: 14px; background: #f1c9a8; }
          .sf-result .sf-save-pill { margin-left: auto; }
          .sf-result-close { border: 0; background: transparent; color: #b45309; cursor: pointer; display: inline-flex; padding: 2px; }

          /* ---------- 비교 표 ---------- */
          .sf-table-wrap {
            position: relative; border-radius: 22px; overflow: hidden;
            background: #fff; border: 1px solid #e9edf3;
            box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 24px 48px -28px rgba(15,23,42,0.28);
          }
          .sf-table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
          .sf-table col.c-w { width: 20%; }
          .sf-table col.c-m { width: 28%; }
          .sf-table col.c-e { width: 22%; }
          .sf-table col.c-s { width: 30%; }
          .sf-table thead th {
            position: sticky; top: 0; z-index: 2;
            padding: 18px 16px; text-align: center;
            background: linear-gradient(180deg, #172033 0%, #0f172a 100%);
            color: #94a3b8; font-size: 11.5px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;
          }
          .sf-table thead th .th-sub { display: block; margin-top: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: none; color: #64748b; }
          .sf-table thead th.th-miku {
            color: #fff; background: linear-gradient(180deg, #2a2233 0%, #1c1826 100%);
            box-shadow: inset 1px 0 0 rgba(255,255,255,0.06), inset -1px 0 0 rgba(255,255,255,0.06);
          }
          .sf-table thead th.th-miku::after {
            content: ''; position: absolute; left: 14%; right: 14%; bottom: 0; height: 2px;
            background: linear-gradient(90deg, transparent, #fb923c 30%, #fde68a 50%, #fb923c 70%, transparent);
          }
          .sf-table thead th.th-miku .th-sub { color: #fdba74; }
          .th-name { display: inline-flex; align-items: center; gap: 7px; }
          .th-crown { color: #fbbf24; }

          .sf-band td {
            padding: 16px 20px 10px; background: #fff !important; border-bottom: 1px solid var(--sf-line);
            text-align: left;
          }
          .sf-band-inner { display: flex; align-items: baseline; gap: 10px; }
          .sf-band-eyebrow { font-size: 10.5px; font-weight: 900; letter-spacing: 0.2em; color: var(--sf-miku-2); }
          .sf-band-title { font-size: 15px; font-weight: 900; color: var(--sf-ink); letter-spacing: -0.3px; }
          .sf-band-count { font-size: 12px; font-weight: 700; color: #94a3b8; }

          .sf-table tbody td {
            padding: 13px 16px; border-bottom: 1px solid #f3f5f8;
            font-size: 14.5px; text-align: center; color: #1f2937; font-variant-numeric: tabular-nums;
            transition: background-color 0.15s ease;
          }
          .sf-row:hover td { background: #fffaf5; }
          .sf-row td.td-w { font-weight: 800; color: var(--sf-ink); }
          .sf-row td.td-w small { font-size: 11px; font-weight: 700; color: #94a3b8; margin-left: 2px; }
          .sf-row td.td-m {
            background: #fffaf4; color: var(--sf-miku); font-weight: 900; font-size: 16px;
            box-shadow: inset 1px 0 0 #f6e4d2, inset -1px 0 0 #f6e4d2;
          }
          .sf-row:hover td.td-m { background: #fff1e4; }
          .sf-row td.td-e { color: #64748b; font-weight: 700; }
          .yen { font-size: 0.78em; font-weight: 700; margin-right: 2px; opacity: 0.6; }

          .sf-save { display: flex; align-items: center; gap: 10px; justify-content: center; }
          .sf-save-bar { flex: 1; max-width: 120px; height: 6px; border-radius: 999px; background: #f1f5f9; overflow: hidden; }
          .sf-save-bar span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #34d399, #059669); }
          .sf-save-pill {
            display: inline-flex; align-items: center; gap: 3px; white-space: nowrap;
            padding: 4px 9px; border-radius: 999px;
            font-size: 12px; font-weight: 800; color: #047857; background: #ecfdf5; border: 1px solid #bbf7d0;
            font-variant-numeric: tabular-nums;
          }
          .sf-save-pill.is-none { color: #94a3b8; background: #f8fafc; border-color: #eef1f5; }

          .sf-row.is-found td { background: #fff3e6 !important; }
          .sf-row.is-found td:first-child { box-shadow: inset 4px 0 0 var(--sf-miku-2); }
          .sf-row.is-found td.td-m { background: #ffe8d4 !important; }

          /* ---------- 모바일 카드 ---------- */
          .sf-cards { display: none; }
          .sf-card-band { padding: 18px 4px 8px; display: flex; align-items: baseline; gap: 8px; }
          .sf-card {
            display: grid; grid-template-columns: 64px 1fr 1fr; align-items: center; gap: 8px;
            padding: 12px 14px; margin-bottom: 8px; border-radius: 16px;
            background: #fff; border: 1px solid #eef1f5;
            box-shadow: 0 10px 20px -18px rgba(15,23,42,0.4);
          }
          .sf-card.is-found { border-color: #f6c7a4; background: #fff7ef; box-shadow: inset 4px 0 0 var(--sf-miku-2); }
          .sf-card-w { font-size: 15px; font-weight: 900; color: var(--sf-ink); }
          .sf-card-w small { font-size: 11px; font-weight: 700; color: #94a3b8; margin-left: 1px; }
          .sf-card-cell { display: flex; flex-direction: column; gap: 2px; }
          .sf-card-cell span { font-size: 10.5px; font-weight: 800; color: #94a3b8; letter-spacing: 0.02em; }
          .sf-card-cell strong { font-size: 15px; font-weight: 900; font-variant-numeric: tabular-nums; }
          .sf-card-cell.is-miku span { color: var(--sf-miku-2); }
          .sf-card-cell.is-miku strong { color: var(--sf-miku); font-size: 16px; }
          .sf-card-cell.is-ems strong { color: #64748b; }
          .sf-card-save { grid-column: 2 / -1; }

          @media (max-width: 860px) {
            .sf-compare { grid-template-columns: 1fr; }
          }
          @media (max-width: 600px) {
            .shipping-fee-container { padding: 0; }
            .sf-svc { padding: 18px; border-radius: 18px; }
            .sf-svc-name { font-size: 17px; }
            .sf-svc-from strong { font-size: 21px; }
            .sf-table-wrap { display: none; }
            .sf-cards { display: block; }
            .weight-search { margin-top: 4px; }
            .weight-search-form { width: 100%; }
            .weight-search-input { flex: 1; }
            .weight-search-input input { width: 100%; }
            .sf-result .sf-save-pill { margin-left: 0; }
          }
        `}</style>

        <GuidePremiumHero
          ariaLabel="국제 배송비 요약"
          eyebrow="SHIPPING RATE"
          title={<>무게별 <em>국제 배송비</em>를 확인하세요</>}
          desc="미쿠짱 특송과 EMS 요금을 한 표에서 비교해 보세요. 무게는 요금표의 다음 구간으로 올림해 적용돼요."
          icon={<AirplaneTilt weight="duotone" />}
          feature={{
            label: <><i className="fa fa-crown"></i> 미쿠짱 특송</>,
            value: `최대 ${maxPct}% 절약`,
            sub: `EMS 대비 최대 ¥${maxSaving.toLocaleString()} 저렴`,
            subBelow: true,
            actions: [
              { href: '/delivery/request', label: <><i className="fa fa-truck-fast"></i> 배송대행 신청</>, primary: true },
              { href: '/guide/customs', label: <><i className="fa fa-landmark"></i> 관부가세 안내</> },
            ],
          }}
          stats={[
            { label: '최소 구간', value: `${fmtKg(rows[0]?.weightKg ?? 0.5)}kg` },
            { label: '조회 범위', value: `~${fmtKg(maxWeightKg)}kg` },
            { label: '수수료 안내', value: <>보러가기 <i className="fa fa-arrow-right"></i></>, text: true, href: '/guide/fee-guide' },
            { label: '배송대행 방법', value: <>보러가기 <i className="fa fa-arrow-right"></i></>, text: true, href: '/guide/delivery-method' },
          ]}
        />

        <GuideTitle eyebrow="Shipping Rate" title="국제 배송 요금표" icon="fa-plane" />

        <div className="guide-panel">

          {/* 두 배송 방법 소개 */}
          <div className="sf-compare">
            <div className="sf-svc is-miku">
              <span className="sf-svc-badge"><Crown size={12} weight="fill" /> 추천</span>
              <div className="sf-svc-head">
                <span className="sf-svc-icon" aria-hidden="true"><AirplaneTilt weight="fill" /></span>
                <div>
                  <span className="sf-svc-eyebrow">MIKU EXPRESS</span>
                  <h4 className="sf-svc-name">미쿠짱 특송</h4>
                </div>
              </div>
              <p className="sf-svc-desc">합리적인 요금의 항공 특송입니다. 무게가 늘수록 EMS 보다 더 크게 절약돼요.</p>
              <div className="sf-svc-from">
                <span>0.5kg</span>
                <strong><small>¥</small>{yen(rows[0]?.miku ?? null)}</strong>
                <span>부터</span>
              </div>
            </div>
            <div className="sf-svc is-ems">
              <div className="sf-svc-head">
                <span className="sf-svc-icon" aria-hidden="true"><i className="fa fa-envelope"></i></span>
                <div>
                  <span className="sf-svc-eyebrow">EXPRESS MAIL</span>
                  <h4 className="sf-svc-name">EMS</h4>
                </div>
              </div>
              <p className="sf-svc-desc">우체국 국제특급 우편입니다. 비교용 요금으로 함께 보여 드려요.</p>
              <div className="sf-svc-from">
                <span>0.5kg</span>
                <strong><small>¥</small>{yen(rows[0]?.ems ?? null)}</strong>
                <span>부터</span>
              </div>
            </div>
          </div>

          {/* 무게로 바로 찾기 */}
          <div className="weight-search">
            <span className="weight-search-label"><MagnifyingGlass size={16} weight="bold" />무게로 바로 찾기</span>
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
            {found && (
              <div className="sf-result" role="status">
                <span><b>{fmtKg(found.weightKg)}kg</b> 구간{overMax && ' (표의 마지막 구간 · 초과 무게는 1:1 상담)'}</span>
                <span className="sf-result-sep" aria-hidden="true" />
                <span>미쿠짱 특송 <b>¥{yen(found.miku)}</b></span>
                <span className="sf-result-sep" aria-hidden="true" />
                <span>EMS <b>¥{yen(found.ems)}</b></span>
                {(saving(found) ?? 0) > 0 && (
                  <span className="sf-save-pill"><ArrowDown size={11} weight="bold" /> ¥{yen(saving(found))} 절약</span>
                )}
                <button type="button" className="sf-result-close" aria-label="강조 해제" onClick={() => setFoundWeight(null)}><X size={14} weight="bold" /></button>
              </div>
            )}
          </div>

          {/* PC: 비교 표 */}
          <div className="sf-table-wrap">
            <table className="sf-table">
              <colgroup><col className="c-w" /><col className="c-m" /><col className="c-e" /><col className="c-s" /></colgroup>
              <thead>
                <tr>
                  <th>Weight<span className="th-sub">이하</span></th>
                  <th className="th-miku">
                    <span className="th-name"><Crown size={13} weight="fill" className="th-crown" /> 미쿠짱 특송</span>
                    <span className="th-sub">추천 요금</span>
                  </th>
                  <th>EMS<span className="th-sub">비교 요금</span></th>
                  <th>Saving<span className="th-sub">EMS 대비 절약</span></th>
                </tr>
              </thead>
              <tbody>
                {bands.map(band => (
                  <React.Fragment key={band.title}>
                    <tr className="sf-band">
                      <td colSpan={4}>
                        <span className="sf-band-inner">
                          <span className="sf-band-eyebrow">{band.eyebrow}</span>
                          <span className="sf-band-title">{band.title}</span>
                          <span className="sf-band-count">{band.rows.length}개 구간</span>
                        </span>
                      </td>
                    </tr>
                    {band.rows.map(r => {
                      const s = saving(r);
                      const pct = savingPct(r);
                      return (
                        <tr
                          key={r.weightKg}
                          ref={el => { rowRefs.current[`t-${r.weightKg}`] = el; }}
                          className={`sf-row ${foundWeight === r.weightKg ? 'is-found' : ''}`}
                        >
                          <td className="td-w">{fmtKg(r.weightKg)}<small>kg</small></td>
                          <td className="td-m"><span className="yen">¥</span>{yen(r.miku)}</td>
                          <td className="td-e"><span className="yen">¥</span>{yen(r.ems)}</td>
                          <td>
                            {s !== null && s > 0 ? (
                              <span className="sf-save">
                                <span className="sf-save-bar" aria-hidden="true"><span style={{ width: `${Math.min(100, (pct ?? 0) * 2)}%` }} /></span>
                                <span className="sf-save-pill"><ArrowDown size={11} weight="bold" />¥{yen(s)} · {pct}%</span>
                              </span>
                            ) : (
                              <span className="sf-save-pill is-none">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일: 카드 */}
          <div className="sf-cards">
            {bands.map(band => (
              <React.Fragment key={band.title}>
                <div className="sf-card-band">
                  <span className="sf-band-eyebrow">{band.eyebrow}</span>
                  <span className="sf-band-title">{band.title}</span>
                </div>
                {band.rows.map(r => {
                  const s = saving(r);
                  return (
                    <div
                      key={r.weightKg}
                      ref={el => { rowRefs.current[`m-${r.weightKg}`] = el; }}
                      className={`sf-card ${foundWeight === r.weightKg ? 'is-found' : ''}`}
                    >
                      <span className="sf-card-w">{fmtKg(r.weightKg)}<small>kg</small></span>
                      <span className="sf-card-cell is-miku"><span>미쿠짱 특송</span><strong>¥{yen(r.miku)}</strong></span>
                      <span className="sf-card-cell is-ems"><span>EMS</span><strong>¥{yen(r.ems)}</strong></span>
                      {s !== null && s > 0 && (
                        <span className="sf-card-save"><span className="sf-save-pill"><ArrowDown size={11} weight="bold" />EMS 대비 ¥{yen(s)} 절약</span></span>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Footer info (guide/customs, guide/fee-guide와 동일한 디자인) */}
          <GuideFooterNotice style={{ marginTop: '24px', marginBottom: '30px' }}>
            <span style={{ display: 'block', fontSize: '15.5px', lineHeight: '1.5', color: '#1e293b', fontWeight: '700', marginBottom: '10px' }}>
              실제 무게(kg)와 부피 무게(가로×세로×높이 ÷ 5,000㎤) 중<br />
              <strong style={{ color: '#b04a12', fontWeight: '900' }}>더 큰 값</strong>을 기준으로 배송비가 산정됩니다.
            </span>
            <span style={{ display: 'block', fontSize: '13.5px', lineHeight: '1.6', color: '#6b7280', fontWeight: '500' }}>
              부피가 큰 상품(피규어, 프라모델, 스낵류 등)은 요금이 달라질 수 있어요.<br />
              {fmtKg(maxWeightKg)}kg 을 넘는 상품과 정확한 확인은 <span className="footer-info-link">1:1 상담</span>을 통해 문의주세요.
            </span>
          </GuideFooterNotice>

        </div>
      </div>
    </GuideLayout>
  );
}
