"use client";

import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import '../admin-common.css';
import { useFitTable, FitColGroup, FitTh } from '../components/useFitTable';
import {
  AdminHero, HeroButton, KpiCard, SkeletonRows, EmptyRow, useToasts, ToastStack,
} from '../components/AdminPremiumKit';
import {
  Crown, Receipt, AirplaneTilt, Package, Scales, ArrowClockwise, PencilSimple, Check, X, Info, Sparkle, Percent,
} from '@phosphor-icons/react';

/* ============================================================
   👑 회원 등급 · 수수료 · 배송비 규칙 관리
   - src/utils/feeCalculator.ts 의 등급별 국제 배송비 할인율(membership_grades)
   - 결제/대행 수수료 구간(order_fee_rules)
   - guide/shipping-fee 의 항공 / EMS / 우체국해운 요금 계산식이 참조하는 3개 테이블
     (air_shipping_fee_rules / ems_shipping_fee_breakpoints / shipping_fee_extra_rates)
   를 이 화면 한 곳에서 조회·수정합니다.
   ============================================================ */

// 🌟 표 5개 모두 공통 표(useFitTable) — 표마다 조절한 너비를 따로 저장합니다.
const GRADE_COLUMNS = ['sortOrder', 'name', 'requiredOrders', 'discountRate', 'description', 'manage'] as const;
const GRADE_DEFAULT_WIDTHS = { sortOrder: 80, name: 160, requiredOrders: 150, discountRate: 170, description: 420, manage: 170 };

const ORDER_FEE_COLUMNS = ['feeType', 'thresholdValue', 'belowThresholdFee', 'atOrAboveThresholdAmount', 'manage'] as const;
const ORDER_FEE_DEFAULT_WIDTHS = { feeType: 170, thresholdValue: 190, belowThresholdFee: 220, atOrAboveThresholdAmount: 260, manage: 170 };

const AIR_FIELDS = ['firstStepFee', 'baseFeeAtStepTwo', 'stepIncrement', 'discountVsGoldLow', 'discountVsGoldMid', 'discountVsGoldHigh'] as const;
const AIR_COLUMNS = ['grade', ...AIR_FIELDS, 'manage'] as const;
const AIR_DEFAULT_WIDTHS = {
  grade: 120, firstStepFee: 150, baseFeeAtStepTwo: 130, stepIncrement: 140,
  discountVsGoldLow: 190, discountVsGoldMid: 190, discountVsGoldHigh: 190, manage: 170,
};
const AIR_LABELS: Record<(typeof AIR_FIELDS)[number], string> = {
  firstStepFee: '0.5kg 이하 기본가',
  baseFeeAtStepTwo: '1.0kg 기준가',
  stepIncrement: '0.5kg당 증가액',
  discountVsGoldLow: '골드대비 할인(4.5kg 이하)',
  discountVsGoldMid: '골드대비 할인(4.5~5.0kg)',
  discountVsGoldHigh: '골드대비 할인(5.0kg 초과)',
};

const EMS_COLUMNS = ['weightKg', 'fee', 'manage'] as const;
const EMS_DEFAULT_WIDTHS = { weightKg: 200, fee: 300, manage: 170 };

const EXTRA_COLUMNS = ['method', 'thresholdWeightKg', 'baseFeeAtThreshold', 'extraPerKg', 'manage'] as const;
const EXTRA_DEFAULT_WIDTHS = { method: 190, thresholdWeightKg: 190, baseFeeAtThreshold: 190, extraPerKg: 230, manage: 170 };

// 🌟 air_shipping_fee_rules.grade는 코드(NEW/SILVER/GOLD/DIAMOND) 고정값이고, 화면에
// 보여줄 실제 이름은 membership_grades.name(관리자가 위 표에서 바꿀 수 있음)을 따릅니다.
const AIR_GRADE_CODE_ORDER = ['NEW', 'SILVER', 'GOLD', 'DIAMOND'];

const ORDER_FEE_TYPE_LABEL: Record<string, string> = { PAYMENT: '결제 수수료', AGENCY: '대행 수수료' };

// 등급 이름 → 색 (admin/users 와 같은 규칙)
const GRADE_TONE: { match: RegExp; rgb: string; from: string; to: string }[] = [
  { match: /diamond|다이아/i, rgb: '6, 182, 212', from: '#67e8f9', to: '#0891b2' },
  { match: /platinum|플래티/i, rgb: '79, 70, 229', from: '#a5b4fc', to: '#4f46e5' },
  { match: /gold|골드/i, rgb: '217, 119, 6', from: '#fcd34d', to: '#d97706' },
  { match: /silver|실버/i, rgb: '100, 116, 139', from: '#cbd5e1', to: '#64748b' },
  { match: /bronze|브론즈/i, rgb: '234, 88, 12', from: '#fdba74', to: '#ea580c' },
];
const DEFAULT_TONE = { rgb: '37, 99, 235', from: '#93c5fd', to: '#2563eb' };
const gradeTone = (name?: string) => GRADE_TONE.find(t => name && t.match.test(name)) || DEFAULT_TONE;

function GradeChip({ name }: { name: string }) {
  const tone = gradeTone(name);
  return (
    <span className="ap-badge" style={{ ['--b-rgb' as string]: tone.rgb } as CSSProperties}>
      <Crown size={11} weight="fill" /> {name}
    </span>
  );
}

const yen = (v: unknown) => (v === null || v === undefined || v === '' ? '-' : `¥${Number(v).toLocaleString()}`);

export default function MembershipGradeManagement() {
  const { toasts, pushToast } = useToasts();

  const [grades, setGrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🌟 공통 표 5개
  const gradeTable = useFitTable({ storageKey: 'admin_membership_grades_column_widths_v2', columns: GRADE_COLUMNS, defaultWidths: GRADE_DEFAULT_WIDTHS, pinned: { key: 'manage', minWidth: 150 } });
  const orderFeeTable = useFitTable({ storageKey: 'admin_membership_order_fee_column_widths_v2', columns: ORDER_FEE_COLUMNS, defaultWidths: ORDER_FEE_DEFAULT_WIDTHS, pinned: { key: 'manage', minWidth: 150 } });
  const airTable = useFitTable({ storageKey: 'admin_membership_air_column_widths_v2', columns: AIR_COLUMNS, defaultWidths: AIR_DEFAULT_WIDTHS, pinned: { key: 'manage', minWidth: 150 } });
  const emsTable = useFitTable({ storageKey: 'admin_membership_ems_column_widths_v2', columns: EMS_COLUMNS, defaultWidths: EMS_DEFAULT_WIDTHS, pinned: { key: 'manage', minWidth: 150 } });
  const extraTable = useFitTable({ storageKey: 'admin_membership_extra_column_widths_v2', columns: EXTRA_COLUMNS, defaultWidths: EXTRA_DEFAULT_WIDTHS, pinned: { key: 'manage', minWidth: 150 } });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', discountRate: 0, requiredOrders: 0, sortOrder: 0, description: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  // 항공/EMS/우체국해운 요금 규칙
  const [airRules, setAirRules] = useState<any[]>([]);
  const [emsBreakpoints, setEmsBreakpoints] = useState<any[]>([]);
  const [extraRates, setExtraRates] = useState<any[]>([]);
  const [isShippingLoading, setIsShippingLoading] = useState(true);

  const [editingAirId, setEditingAirId] = useState<number | null>(null);
  const [airEditForm, setAirEditForm] = useState<Record<(typeof AIR_FIELDS)[number], any>>({
    firstStepFee: '', baseFeeAtStepTwo: '', stepIncrement: '',
    discountVsGoldLow: '', discountVsGoldMid: '', discountVsGoldHigh: '',
  });

  const [editingEmsId, setEditingEmsId] = useState<number | null>(null);
  const [emsEditForm, setEmsEditForm] = useState<{ fee: any }>({ fee: '' });

  const [editingExtraId, setEditingExtraId] = useState<number | null>(null);
  const [extraEditForm, setExtraEditForm] = useState<{ thresholdWeightKg: any; baseFeeAtThreshold: any; extraPerKg: any }>({ thresholdWeightKg: '', baseFeeAtThreshold: '', extraPerKg: '' });

  const [isShippingUpdating, setIsShippingUpdating] = useState(false);

  // 결제/대행 수수료 구간 규칙 (src/utils/feeCalculator.ts가 참조하는 order_fee_rules)
  const [orderFeeRules, setOrderFeeRules] = useState<any[]>([]);
  const [isOrderFeeLoading, setIsOrderFeeLoading] = useState(true);
  const [editingOrderFeeId, setEditingOrderFeeId] = useState<number | null>(null);
  const [orderFeeEditForm, setOrderFeeEditForm] = useState<{ thresholdValue: any; belowThresholdFee: any; atOrAboveThresholdAmount: any }>({ thresholdValue: '', belowThresholdFee: '', atOrAboveThresholdAmount: '' });
  const [isOrderFeeUpdating, setIsOrderFeeUpdating] = useState(false);

  useEffect(() => {
    fetchGrades();
    fetchShippingRules();
    fetchOrderFeeRules();
  }, []);

  const refreshAll = () => { fetchGrades(); fetchShippingRules(); fetchOrderFeeRules(); };

  /* ---------------- 결제/대행 수수료 ---------------- */
  const fetchOrderFeeRules = async () => {
    setIsOrderFeeLoading(true);
    try {
      const res = await fetch('/api/admin/order-fee-rules');
      const data = await res.json();
      if (data.success) setOrderFeeRules(data.rules);
    } catch (error) {
      console.error("결제/대행 수수료 규칙 가져오기 실패:", error);
    } finally {
      setIsOrderFeeLoading(false);
    }
  };

  const startEditingOrderFee = (rule: any) => {
    setEditingOrderFeeId(rule.id);
    setOrderFeeEditForm({
      thresholdValue: rule.thresholdValue,
      belowThresholdFee: rule.belowThresholdFee,
      atOrAboveThresholdAmount: rule.atOrAboveThresholdAmount,
    });
  };

  const handleUpdateOrderFee = async (id: number) => {
    setIsOrderFeeUpdating(true);
    try {
      const res = await fetch('/api/admin/order-fee-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...orderFeeEditForm }),
      });
      const data = await res.json();
      if (data.success) {
        pushToast('success', '수수료 규칙을 수정했습니다.');
        setEditingOrderFeeId(null);
        fetchOrderFeeRules();
      } else {
        pushToast('error', data.error || '수정에 실패했습니다.');
      }
    } catch {
      pushToast('error', '서버 오류가 발생했습니다.');
    } finally {
      setIsOrderFeeUpdating(false);
    }
  };

  // 🐛 grades는 id 순으로 내려오고 sortOrder·등급 추가/삭제로 순번이 어긋날 수 있어,
  //    membership_grades.name(고유, 코드값과 같음)으로 항공 요금 행과 맞춥니다.
  const airGradeDisplayNameByCode = useMemo(() => {
    const byName = new Map<string, any>(grades.map((g: any) => [String(g.name).toUpperCase(), g]));
    const map: Record<string, string> = {};
    AIR_GRADE_CODE_ORDER.forEach((code) => {
      map[code] = byName.get(code.toUpperCase())?.name ?? code;
    });
    return map;
  }, [grades]);

  /* ---------------- 배송비 규칙 ---------------- */
  const fetchShippingRules = async () => {
    setIsShippingLoading(true);
    try {
      const res = await fetch('/api/admin/shipping-fee-rules');
      const data = await res.json();
      if (data.success) {
        setAirRules(data.airRules);
        setEmsBreakpoints(data.emsBreakpoints);
        setExtraRates(data.extraRates);
      }
    } catch (error) {
      console.error("배송비 규칙 가져오기 실패:", error);
    } finally {
      setIsShippingLoading(false);
    }
  };

  const patchShipping = async (body: Record<string, any>, onDone: () => void, label: string) => {
    setIsShippingUpdating(true);
    try {
      const res = await fetch('/api/admin/shipping-fee-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        pushToast('success', `${label}을(를) 수정했습니다.`);
        onDone();
        fetchShippingRules();
      } else {
        pushToast('error', data.error || '수정에 실패했습니다.');
      }
    } catch {
      pushToast('error', '서버 오류가 발생했습니다.');
    } finally {
      setIsShippingUpdating(false);
    }
  };

  const startEditingAir = (rule: any) => {
    setEditingAirId(rule.id);
    setAirEditForm({
      firstStepFee: rule.firstStepFee ?? '',
      baseFeeAtStepTwo: rule.baseFeeAtStepTwo ?? '',
      stepIncrement: rule.stepIncrement ?? '',
      discountVsGoldLow: rule.discountVsGoldLow ?? '',
      discountVsGoldMid: rule.discountVsGoldMid ?? '',
      discountVsGoldHigh: rule.discountVsGoldHigh ?? '',
    });
  };
  const handleUpdateAir = (id: number) => patchShipping({ type: 'air', id, ...airEditForm }, () => setEditingAirId(null), '항공 배송비 변수');

  const startEditingEms = (bp: any) => {
    setEditingEmsId(bp.id);
    setEmsEditForm({ fee: bp.fee });
  };
  const handleUpdateEms = (id: number) => patchShipping({ type: 'ems', id, ...emsEditForm }, () => setEditingEmsId(null), 'EMS 요금');

  const startEditingExtra = (rate: any) => {
    setEditingExtraId(rate.id);
    setExtraEditForm({
      thresholdWeightKg: rate.thresholdWeightKg,
      baseFeeAtThreshold: rate.baseFeeAtThreshold,
      extraPerKg: rate.extraPerKg,
    });
  };
  const handleUpdateExtra = (id: number) => patchShipping({ type: 'extra', id, ...extraEditForm }, () => setEditingExtraId(null), '초과 규칙');

  /* ---------------- 회원 등급 ---------------- */
  const fetchGrades = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/membership-grades');
      const data = await res.json();
      if (data.success) setGrades(data.grades);
    } catch (error) {
      console.error("등급 목록 가져오기 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (grade: any) => {
    setEditingId(grade.id);
    setEditForm({
      name: grade.name,
      discountRate: grade.discountRate * 100, // 소수(0.1) → 퍼센트(10) 단위로 편집
      requiredOrders: grade.requiredOrders,
      sortOrder: grade.sortOrder,
      description: grade.description || '',
    });
  };

  const handleUpdate = async (id: number) => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/admin/membership-grades', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: editForm.name,
          discountRate: editForm.discountRate / 100, // 퍼센트 → 소수로 환산해 저장
          requiredOrders: editForm.requiredOrders,
          sortOrder: editForm.sortOrder,
          description: editForm.description,
        }),
      });
      const data = await res.json();
      if (data.success) {
        pushToast('success', `'${editForm.name}' 등급 정보를 수정했습니다.`);
        setEditingId(null);
        fetchGrades();
      } else {
        pushToast('error', data.error || '수정에 실패했습니다.');
      }
    } catch (error) {
      console.error("등급 수정 에러:", error);
      pushToast('error', '서버 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  /* ---------------- 요약 ---------------- */
  const sortedGrades = useMemo(() => [...grades].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)), [grades]);
  const topGrade = sortedGrades.reduce<any | null>((best, g) => (!best || g.discountRate > best.discountRate ? g : best), null);
  const paymentRule = orderFeeRules.find(r => r.feeType === 'PAYMENT');
  const agencyRule = orderFeeRules.find(r => r.feeType === 'AGENCY');
  const anyLoading = isLoading || isShippingLoading || isOrderFeeLoading;

  /* 표 안 저장/취소 · 수정 버튼 */
  const renderEditActions = (editing: boolean, busy: boolean, onSave: () => void, onCancel: () => void, onEdit: () => void) =>
    editing ? (
      <span className="ap-actions">
        <button type="button" className="ap-btn is-ghost" onClick={onCancel} aria-label="취소"><X size={12} weight="bold" /></button>
        <button type="button" className="ap-btn is-primary" onClick={onSave} disabled={busy}>
          <Check size={13} weight="bold" /> {busy ? '저장 중…' : '저장'}
        </button>
      </span>
    ) : (
      <button type="button" className="ap-btn is-ghost" onClick={onEdit}><PencilSimple size={13} weight="bold" /> 수정</button>
    );

  const numInput = (value: any, onChange: (v: string) => void, unit?: string) => (
    <span className="ap-cell-unit">
      <input className="ap-cell-input" type="number" value={value} onChange={(e) => onChange(e.target.value)} />
      {unit && <span>{unit}</span>}
    </span>
  );

  return (
    <div className="ap-page">
      <AdminHero
        eyebrow="GRADES & FEES" icon={<Sparkle size={11} weight="fill" />}
        title="등급 · 수수료 · 배송비 규칙"
        description="회원 등급별 할인율과 결제·대행 수수료, 국제 배송비 계산에 쓰는 값을 한곳에서 관리합니다."
        accentRgb="245, 158, 11"
        actions={<>
          <div className="ap-jump">
            <a href="#mg-grades"><Crown size={13} weight="bold" /> 등급</a>
            <a href="#mg-fees"><Receipt size={13} weight="bold" /> 수수료</a>
            <a href="#mg-air"><AirplaneTilt size={13} weight="bold" /> 항공</a>
            <a href="#mg-ems"><Package size={13} weight="bold" /> EMS</a>
            <a href="#mg-extra"><Scales size={13} weight="bold" /> 초과 규칙</a>
          </div>
          <HeroButton onClick={refreshAll} disabled={anyLoading}>
            <ArrowClockwise size={15} weight="bold" className={anyLoading ? 'ap-spin' : ''} /> 새로고침
          </HeroButton>
        </>}
      >
        <div className="ap-kpis">
          <KpiCard icon={<Crown size={18} weight="duotone" />} label="회원 등급" toneRgb="252, 211, 77" loading={isLoading}
            value={<>{grades.length.toLocaleString()}<small>단계</small></>}
            foot={sortedGrades.map(g => g.name).join(' → ') || '등급 없음'} />
          <KpiCard icon={<Percent size={18} weight="duotone" />} label="최고 배송비 할인율" toneRgb="103, 232, 249" loading={isLoading}
            value={<>{topGrade ? (topGrade.discountRate * 100).toFixed(0) : 0}<small>%</small></>}
            foot={topGrade ? `${topGrade.name} · 주문 ${topGrade.requiredOrders}건 이상` : '-'} />
          <KpiCard icon={<Receipt size={18} weight="duotone" />} label="결제 수수료" toneRgb="147, 197, 253" loading={isOrderFeeLoading}
            value={paymentRule ? <>{yen(paymentRule.belowThresholdFee)}<small> / {yen(paymentRule.atOrAboveThresholdAmount)}</small></> : '-'}
            foot={paymentRule ? `상품가 ¥${Number(paymentRule.thresholdValue).toLocaleString()} 기준 미만 / 이상` : '규칙 없음'} />
          <KpiCard icon={<Package size={18} weight="duotone" />} label="대행 수수료" toneRgb="196, 181, 253" loading={isOrderFeeLoading}
            value={agencyRule ? <>{yen(agencyRule.belowThresholdFee)}<small> / {yen(agencyRule.atOrAboveThresholdAmount)}×수량</small></> : '-'}
            foot={agencyRule ? `수량 ${Number(agencyRule.thresholdValue).toLocaleString()}개 기준 미만 / 이상` : '규칙 없음'} />
        </div>
      </AdminHero>

      {/* ================= 회원 등급 ================= */}
      <section className="ap-panel" id="mg-grades">
        <div className="ap-sec-head">
          <span className="ap-section-title"><Crown size={15} weight="duotone" /> 회원 등급 및 국제 배송비 할인율</span>
          <span className="ap-section-hint">순서가 낮을수록 아래 등급입니다</span>
        </div>
        <div className="ap-table-wrap" ref={gradeTable.wrapRef}>
          <table className={`admin-table-resizable ${gradeTable.tableClassName}`} style={gradeTable.tableStyle}>
            <FitColGroup table={gradeTable} />
            <thead>
              <tr className="admin-table-head-row">
                <FitTh table={gradeTable} columnKey="sortOrder">순서</FitTh>
                <FitTh table={gradeTable} columnKey="name">등급명</FitTh>
                <FitTh table={gradeTable} columnKey="requiredOrders">필요 주문 건수</FitTh>
                <FitTh table={gradeTable} columnKey="discountRate">배송비 할인율</FitTh>
                <FitTh table={gradeTable} columnKey="description">설명 (관리자 메모)</FitTh>
                <FitTh table={gradeTable} columnKey="manage">관리</FitTh>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={GRADE_COLUMNS} rows={4} pinnedKey="manage" />
              ) : sortedGrades.length === 0 ? (
                <EmptyRow colSpan={GRADE_COLUMNS.length} icon={<Crown size={24} weight="duotone" />} title="등록된 등급이 없습니다" />
              ) : sortedGrades.map((grade) => {
                const isEditing = editingId === grade.id;
                return (
                  <tr key={grade.id} className={`admin-table-body-row aft-row ${isEditing ? 'is-editing' : ''}`}>
                    <td className="ap-td">
                      {isEditing
                        ? <input className="ap-cell-input" type="number" value={editForm.sortOrder} onChange={(e) => setEditForm({ ...editForm, sortOrder: parseInt(e.target.value) || 0 })} />
                        : <span className="ap-strong ap-tabnum">{grade.sortOrder}</span>}
                    </td>
                    <td className="ap-td">
                      {isEditing
                        ? <input className="ap-cell-input" type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                        : <GradeChip name={grade.name} />}
                    </td>
                    <td className="ap-td">
                      {isEditing
                        ? numInput(editForm.requiredOrders, v => setEditForm({ ...editForm, requiredOrders: parseInt(v) || 0 }), '건')
                        : <span className="ap-strong ap-tabnum">{grade.requiredOrders.toLocaleString()}<span className="ap-section-hint"> 건 이상</span></span>}
                    </td>
                    <td className="ap-td">
                      {isEditing
                        ? numInput(editForm.discountRate, v => setEditForm({ ...editForm, discountRate: parseFloat(v) || 0 }), '%')
                        : (
                          <span className="ap-badge" style={{ ['--b-rgb' as string]: grade.discountRate > 0 ? '5, 150, 105' : '148, 163, 184' } as CSSProperties}>
                            {(grade.discountRate * 100).toFixed(0)}% 할인
                          </span>
                        )}
                    </td>
                    <td className="ap-td is-left" title={grade.description || ''}>
                      {isEditing
                        ? <input className="ap-cell-input" type="text" value={editForm.description} placeholder="관리자 메모" onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                        : (grade.description || <span className="ap-empty-mark">메모 없음</span>)}
                    </td>
                    <td className={gradeTable.pinnedCellClass('manage', 'ap-td')}>
                      {renderEditActions(isEditing, isUpdating, () => handleUpdate(grade.id), () => setEditingId(null), () => startEditing(grade))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================= 결제/대행 수수료 ================= */}
      <section className="ap-panel" id="mg-fees">
        <div className="ap-sec-head">
          <span className="ap-section-title"><Receipt size={15} weight="duotone" /> 결제 / 대행 수수료 구간 규칙</span>
        </div>
        <div className="ap-help">
          <Info size={15} weight="bold" />
          <span>
            <strong>결제 수수료</strong>: 상품 가격 합계가 기준값 미만이면 ‘기준 미만 금액’, 이상이면 ‘기준 이상 금액’이 고정으로 부과됩니다.<br />
            <strong>대행 수수료</strong>: 수량이 기준값 미만이면 ‘기준 미만 금액’이 고정으로, 이상이면 수량 × ‘기준 이상 금액’(수량당 단가)으로 계산됩니다.
          </span>
        </div>
        <div className="ap-table-wrap" ref={orderFeeTable.wrapRef}>
          <table className={`admin-table-resizable ${orderFeeTable.tableClassName}`} style={orderFeeTable.tableStyle}>
            <FitColGroup table={orderFeeTable} />
            <thead>
              <tr className="admin-table-head-row">
                <FitTh table={orderFeeTable} columnKey="feeType">구분</FitTh>
                <FitTh table={orderFeeTable} columnKey="thresholdValue">기준값</FitTh>
                <FitTh table={orderFeeTable} columnKey="belowThresholdFee">기준 미만 금액</FitTh>
                <FitTh table={orderFeeTable} columnKey="atOrAboveThresholdAmount">기준 이상 금액</FitTh>
                <FitTh table={orderFeeTable} columnKey="manage">관리</FitTh>
              </tr>
            </thead>
            <tbody>
              {isOrderFeeLoading ? (
                <SkeletonRows columns={ORDER_FEE_COLUMNS} rows={2} pinnedKey="manage" />
              ) : orderFeeRules.length === 0 ? (
                <EmptyRow colSpan={ORDER_FEE_COLUMNS.length} title="등록된 수수료 규칙이 없습니다" />
              ) : orderFeeRules.map((rule) => {
                const isEditing = editingOrderFeeId === rule.id;
                const unit = rule.feeType === 'AGENCY' ? '개' : '엔';
                return (
                  <tr key={rule.id} className={`admin-table-body-row aft-row ${isEditing ? 'is-editing' : ''}`}>
                    <td className="ap-td">
                      <span className="ap-badge" style={{ ['--b-rgb' as string]: rule.feeType === 'AGENCY' ? '124, 58, 237' : '37, 99, 235' } as CSSProperties}>
                        {ORDER_FEE_TYPE_LABEL[rule.feeType] ?? rule.feeType}
                      </span>
                    </td>
                    <td className="ap-td">
                      {isEditing
                        ? numInput(orderFeeEditForm.thresholdValue, v => setOrderFeeEditForm({ ...orderFeeEditForm, thresholdValue: v }), unit)
                        : <span className="ap-strong ap-tabnum">{Number(rule.thresholdValue).toLocaleString()}{unit}</span>}
                    </td>
                    <td className="ap-td">
                      {isEditing
                        ? numInput(orderFeeEditForm.belowThresholdFee, v => setOrderFeeEditForm({ ...orderFeeEditForm, belowThresholdFee: v }), '¥')
                        : <span className="ap-money">{yen(rule.belowThresholdFee)}</span>}
                    </td>
                    <td className="ap-td">
                      {isEditing
                        ? numInput(orderFeeEditForm.atOrAboveThresholdAmount, v => setOrderFeeEditForm({ ...orderFeeEditForm, atOrAboveThresholdAmount: v }), rule.feeType === 'AGENCY' ? '¥ × 수량' : '¥')
                        : <span className="ap-money">{yen(rule.atOrAboveThresholdAmount)}{rule.feeType === 'AGENCY' && <span className="ap-section-hint"> × 수량</span>}</span>}
                    </td>
                    <td className={orderFeeTable.pinnedCellClass('manage', 'ap-td')}>
                      {renderEditActions(isEditing, isOrderFeeUpdating, () => handleUpdateOrderFee(rule.id), () => setEditingOrderFeeId(null), () => startEditingOrderFee(rule))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================= 항공 요금 변수 ================= */}
      <section className="ap-panel" id="mg-air">
        <div className="ap-sec-head">
          <span className="ap-section-title"><AirplaneTilt size={15} weight="duotone" /> 항공 배송비 등급별 변수</span>
          <span className="ap-section-hint">단위: 엔(¥)</span>
        </div>
        <div className="ap-help">
          <Info size={15} weight="bold" />
          <span>무게 0.5kg 이하는 ‘0.5kg 이하 기본가’ 고정, 0.5kg 초과는 ‘1.0kg 기준가 + 1.0kg을 넘어 0.5kg 늘어날 때마다 0.5kg당 증가액’으로 계산됩니다. <strong>DIAMOND</strong>는 GOLD 요금에서 할인액을 빼는 방식이라 1.0kg 기준가·0.5kg당 증가액이 없습니다.</span>
        </div>
        <div className="ap-table-wrap" ref={airTable.wrapRef}>
          <table className={`admin-table-resizable ${airTable.tableClassName}`} style={airTable.tableStyle}>
            <FitColGroup table={airTable} />
            <thead>
              <tr className="admin-table-head-row">
                <FitTh table={airTable} columnKey="grade">등급</FitTh>
                {AIR_FIELDS.map(f => <FitTh key={f} table={airTable} columnKey={f}>{AIR_LABELS[f]}</FitTh>)}
                <FitTh table={airTable} columnKey="manage">관리</FitTh>
              </tr>
            </thead>
            <tbody>
              {isShippingLoading ? (
                <SkeletonRows columns={AIR_COLUMNS} rows={4} pinnedKey="manage" />
              ) : airRules.length === 0 ? (
                <EmptyRow colSpan={AIR_COLUMNS.length} title="등록된 항공 요금 규칙이 없습니다" />
              ) : airRules.map((rule) => {
                const isEditing = editingAirId === rule.id;
                return (
                  <tr key={rule.id} className={`admin-table-body-row aft-row ${isEditing ? 'is-editing' : ''}`}>
                    <td className="ap-td"><GradeChip name={airGradeDisplayNameByCode[rule.grade] ?? rule.grade} /></td>
                    {AIR_FIELDS.map((field) => (
                      <td key={field} className="ap-td">
                        {isEditing
                          ? numInput(airEditForm[field], v => setAirEditForm({ ...airEditForm, [field]: v }))
                          : (rule[field] === null || rule[field] === undefined
                            ? <span className="ap-empty-mark">-</span>
                            : <span className={field.startsWith('discount') ? 'ap-money is-sub' : 'ap-money'}>{field.startsWith('discount') ? '−' : ''}{yen(rule[field])}</span>)}
                      </td>
                    ))}
                    <td className={airTable.pinnedCellClass('manage', 'ap-td')}>
                      {renderEditActions(isEditing, isShippingUpdating, () => handleUpdateAir(rule.id), () => setEditingAirId(null), () => startEditingAir(rule))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================= EMS 구간표 ================= */}
      <section className="ap-panel" id="mg-ems">
        <div className="ap-sec-head">
          <span className="ap-section-title"><Package size={15} weight="duotone" /> EMS 요금 구간표 (0.5 ~ 7.0kg)</span>
          <span className="ap-section-hint">등급과 무관한 공통 요금 · 7kg 초과분은 아래 ‘초과 규칙’을 따릅니다</span>
        </div>
        <div className="ap-table-wrap" ref={emsTable.wrapRef} style={{ maxHeight: 420 }}>
          <table className={`admin-table-resizable ${emsTable.tableClassName}`} style={emsTable.tableStyle}>
            <FitColGroup table={emsTable} />
            <thead>
              <tr className="admin-table-head-row">
                <FitTh table={emsTable} columnKey="weightKg">무게 (kg)</FitTh>
                <FitTh table={emsTable} columnKey="fee">요금</FitTh>
                <FitTh table={emsTable} columnKey="manage">관리</FitTh>
              </tr>
            </thead>
            <tbody>
              {isShippingLoading ? (
                <SkeletonRows columns={EMS_COLUMNS} rows={5} pinnedKey="manage" />
              ) : emsBreakpoints.length === 0 ? (
                <EmptyRow colSpan={EMS_COLUMNS.length} title="등록된 EMS 구간이 없습니다" />
              ) : emsBreakpoints.map((bp) => {
                const isEditing = editingEmsId === bp.id;
                return (
                  <tr key={bp.id} className={`admin-table-body-row aft-row ${isEditing ? 'is-editing' : ''}`}>
                    <td className="ap-td"><span className="ap-strong ap-tabnum">{bp.weightKg}<span className="ap-section-hint"> kg</span></span></td>
                    <td className="ap-td">
                      {isEditing
                        ? numInput(emsEditForm.fee, v => setEmsEditForm({ fee: v }), '¥')
                        : <span className="ap-money">{yen(bp.fee)}</span>}
                    </td>
                    <td className={emsTable.pinnedCellClass('manage', 'ap-td')}>
                      {renderEditActions(isEditing, isShippingUpdating, () => handleUpdateEms(bp.id), () => setEditingEmsId(null), () => startEditingEms(bp))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================= EMS/우체국해운 초과 규칙 ================= */}
      <section className="ap-panel" id="mg-extra">
        <div className="ap-sec-head">
          <span className="ap-section-title"><Scales size={15} weight="duotone" /> EMS / 우체국해운 기준 무게 초과 규칙</span>
        </div>
        <div className="ap-help">
          <Info size={15} weight="bold" />
          <span>기준 무게까지는 ‘기준 요금’ 고정, 초과분부터는 1kg마다 ‘초과 1kg당 추가금’이 더해집니다. (우체국해운은 구간표 없이 이 규칙 하나로 전체 계산됩니다.)</span>
        </div>
        <div className="ap-table-wrap" ref={extraTable.wrapRef}>
          <table className={`admin-table-resizable ${extraTable.tableClassName}`} style={extraTable.tableStyle}>
            <FitColGroup table={extraTable} />
            <thead>
              <tr className="admin-table-head-row">
                <FitTh table={extraTable} columnKey="method">구분</FitTh>
                <FitTh table={extraTable} columnKey="thresholdWeightKg">기준 무게 (kg)</FitTh>
                <FitTh table={extraTable} columnKey="baseFeeAtThreshold">기준 요금</FitTh>
                <FitTh table={extraTable} columnKey="extraPerKg">초과 1kg당 추가금</FitTh>
                <FitTh table={extraTable} columnKey="manage">관리</FitTh>
              </tr>
            </thead>
            <tbody>
              {isShippingLoading ? (
                <SkeletonRows columns={EXTRA_COLUMNS} rows={2} pinnedKey="manage" />
              ) : extraRates.length === 0 ? (
                <EmptyRow colSpan={EXTRA_COLUMNS.length} title="등록된 초과 규칙이 없습니다" />
              ) : extraRates.map((rate) => {
                const isEditing = editingExtraId === rate.id;
                return (
                  <tr key={rate.id} className={`admin-table-body-row aft-row ${isEditing ? 'is-editing' : ''}`}>
                    <td className="ap-td">
                      <span className="ap-badge" style={{ ['--b-rgb' as string]: rate.method === 'EMS' ? '37, 99, 235' : '13, 148, 136' } as CSSProperties}>
                        {rate.method === 'OCEAN' ? '우체국해운 (OCEAN)' : rate.method}
                      </span>
                    </td>
                    <td className="ap-td">
                      {isEditing
                        ? numInput(extraEditForm.thresholdWeightKg, v => setExtraEditForm({ ...extraEditForm, thresholdWeightKg: v }), 'kg')
                        : <span className="ap-strong ap-tabnum">{rate.thresholdWeightKg}<span className="ap-section-hint"> kg</span></span>}
                    </td>
                    <td className="ap-td">
                      {isEditing
                        ? numInput(extraEditForm.baseFeeAtThreshold, v => setExtraEditForm({ ...extraEditForm, baseFeeAtThreshold: v }), '¥')
                        : <span className="ap-money">{yen(rate.baseFeeAtThreshold)}</span>}
                    </td>
                    <td className="ap-td">
                      {isEditing
                        ? numInput(extraEditForm.extraPerKg, v => setExtraEditForm({ ...extraEditForm, extraPerKg: v }), '¥/kg')
                        : <span className="ap-money">+{yen(rate.extraPerKg)}<span className="ap-section-hint"> /kg</span></span>}
                    </td>
                    <td className={extraTable.pinnedCellClass('manage', 'ap-td')}>
                      {renderEditActions(isEditing, isShippingUpdating, () => handleUpdateExtra(rate.id), () => setEditingExtraId(null), () => startEditingExtra(rate))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <ToastStack toasts={toasts} />
    </div>
  );
}
