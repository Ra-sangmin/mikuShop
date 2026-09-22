"use client";

import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import '../admin-common.css';
import { useFitTable, FitColGroup, FitTh } from '../components/useFitTable';
import {
  AdminHero, HeroButton, KpiCard, SkeletonRows, EmptyRow, useToasts, ToastStack,
} from '../components/AdminPremiumKit';
import {
  Crown, Receipt, AirplaneTilt, Package, ArrowClockwise, PencilSimple, Check, X, Info, Sparkle, Percent, Plus, Trash,
} from '@phosphor-icons/react';
import { SHIPPING_RATE_LABEL, type ShippingRateMethod } from '@/lib/shippingRates';

/* ============================================================
   👑 회원 등급 · 수수료 · 배송비 규칙 관리
   - src/utils/feeCalculator.ts 의 등급별 국제 배송비 할인율(membership_grades)
   - 결제/대행 수수료 구간(order_fee_rules)
   - guide/shipping-fee 의 국제 배송 요금표 (미쿠짱 특송 / EMS — shipping_rates, 등급 구분 없음)
   를 이 화면 한 곳에서 조회·수정합니다.
   ============================================================ */

// 🌟 표 5개 모두 공통 표(useFitTable) — 표마다 조절한 너비를 따로 저장합니다.
const GRADE_COLUMNS = ['sortOrder', 'name', 'requiredOrders', 'discountRate', 'description', 'manage'] as const;
const GRADE_DEFAULT_WIDTHS = { sortOrder: 80, name: 160, requiredOrders: 150, discountRate: 170, description: 420, manage: 170 };

const ORDER_FEE_COLUMNS = ['feeType', 'thresholdValue', 'belowThresholdFee', 'atOrAboveThresholdAmount', 'manage'] as const;
const ORDER_FEE_DEFAULT_WIDTHS = { feeType: 170, thresholdValue: 190, belowThresholdFee: 220, atOrAboveThresholdAmount: 260, manage: 170 };

// ✈️ 국제 배송 요금표 (미쿠짱 특송 / EMS) — 무게별 고정 요금, 등급 구분 없음
const RATE_COLUMNS = ['weightKg', 'fee', 'manage'] as const;
const RATE_DEFAULT_WIDTHS = { weightKg: 220, fee: 300, manage: 210 };

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
  const mikuTable = useFitTable({ storageKey: 'admin_membership_miku_rate_column_widths_v1', columns: RATE_COLUMNS, defaultWidths: RATE_DEFAULT_WIDTHS, pinned: { key: 'manage', minWidth: 190 } });
  const emsTable = useFitTable({ storageKey: 'admin_membership_ems_rate_column_widths_v1', columns: RATE_COLUMNS, defaultWidths: RATE_DEFAULT_WIDTHS, pinned: { key: 'manage', minWidth: 190 } });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', discountRate: 0, requiredOrders: 0, sortOrder: 0, description: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  // ✈️ 국제 배송 요금표 (shipping_rates)
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [isShippingLoading, setIsShippingLoading] = useState(true);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [editingRateId, setEditingRateId] = useState<number | null>(null);
  const [rateEditForm, setRateEditForm] = useState<{ weightKg: any; fee: any }>({ weightKg: '', fee: '' });
  const [newRate, setNewRate] = useState<Record<ShippingRateMethod, { weightKg: string; fee: string }>>({
    MIKU: { weightKg: '', fee: '' }, EMS: { weightKg: '', fee: '' },
  });
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

  /* ---------------- 국제 배송 요금표 ---------------- */
  const fetchShippingRules = async () => {
    setIsShippingLoading(true);
    try {
      const res = await fetch('/api/admin/shipping-rates');
      const data = await res.json();
      if (data.success) { setShippingRates(data.rates); setShippingError(null); }
      else setShippingError(data.error || '요금표를 불러오지 못했습니다.');
    } catch (error) {
      console.error("국제 배송 요금표 가져오기 실패:", error);
      setShippingError('요금표를 불러오지 못했습니다.');
    } finally {
      setIsShippingLoading(false);
    }
  };

  const callRates = async (method: 'PATCH' | 'POST' | 'DELETE' | 'PUT', body: any, okMsg: string, onDone?: () => void, query = '') => {
    setIsShippingUpdating(true);
    try {
      const res = await fetch(`/api/admin/shipping-rates${query}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'DELETE' ? undefined : JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        pushToast('success', okMsg);
        onDone?.();
        fetchShippingRules();
      } else {
        pushToast('error', data.error || '처리에 실패했습니다.');
      }
    } catch {
      pushToast('error', '서버 오류가 발생했습니다.');
    } finally {
      setIsShippingUpdating(false);
    }
  };

  const ratesOf = (m: ShippingRateMethod) => shippingRates.filter(r => r.method === m).sort((a, b) => a.weightKg - b.weightKg);
  const startEditingRate = (r: any) => { setEditingRateId(r.id); setRateEditForm({ weightKg: r.weightKg, fee: r.fee }); };
  const handleUpdateRate = (r: any) =>
    callRates('PATCH', { id: r.id, ...rateEditForm }, `${SHIPPING_RATE_LABEL[r.method as ShippingRateMethod]} ${rateEditForm.weightKg}kg 요금을 수정했습니다.`, () => setEditingRateId(null));
  const handleDeleteRate = (r: any) => {
    if (!confirm(`${SHIPPING_RATE_LABEL[r.method as ShippingRateMethod]} ${r.weightKg}kg 구간을 삭제할까요?`)) return;
    callRates('DELETE', null, `${r.weightKg}kg 구간을 삭제했습니다.`, undefined, `?id=${r.id}`);
  };
  const handleAddRate = (m: ShippingRateMethod) =>
    callRates('POST', { method: m, ...newRate[m] }, `${SHIPPING_RATE_LABEL[m]} ${newRate[m].weightKg}kg 구간을 추가했습니다.`,
      () => setNewRate(prev => ({ ...prev, [m]: { weightKg: '', fee: '' } })));
  const handleResetRates = (m: ShippingRateMethod) => {
    if (!confirm(`${SHIPPING_RATE_LABEL[m]} 요금표를 기본 요금표로 되돌릴까요? 직접 고친 값은 모두 사라집니다.`)) return;
    callRates('PUT', { method: m }, `${SHIPPING_RATE_LABEL[m]} 요금표를 기본값으로 되돌렸습니다.`);
  };

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
            <a href="#mg-miku"><AirplaneTilt size={13} weight="bold" /> 미쿠짱 특송</a>
            <a href="#mg-ems"><Package size={13} weight="bold" /> EMS</a>
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


      {/* ================= ✈️ 국제 배송 요금표 — MIKU ================= */}
      <section className="ap-panel" id="mg-miku">
        <div className="ap-sec-head">
          <span className="ap-section-title"><AirplaneTilt size={15} weight="duotone" /> {SHIPPING_RATE_LABEL.MIKU} 요금표</span>
          <span className="ap-section-hint">회원 등급 구분 없음 · 단위: 엔(¥)</span>
          <button type="button" className="ap-btn is-ghost" style={{ marginLeft: 'auto' }} disabled={isShippingUpdating} onClick={() => handleResetRates('MIKU')}>
            <ArrowClockwise size={13} weight="bold" /> 기본 요금표로 되돌리기
          </button>
        </div>
        <div className="ap-help">
          <Info size={15} weight="bold" />
          <span>무게는 그 구간의 <strong>상한</strong>입니다. 예) 1.1kg 은 다음 구간인 1.25kg 요금이 적용됩니다. 여기서 고친 값은 <strong>이용가이드 &gt; 국제배송 요금표</strong>에 바로 반영됩니다. {shippingError && <strong style={{ color: '#b45309' }}> · {shippingError}</strong>}</span>
        </div>
        <div className="ap-table-wrap" ref={mikuTable.wrapRef} style={{ maxHeight: 520 }}>
          <table className={`admin-table-resizable ${mikuTable.tableClassName}`} style={mikuTable.tableStyle}>
            <FitColGroup table={mikuTable} />
            <thead>
              <tr className="admin-table-head-row">
                <FitTh table={mikuTable} columnKey="weightKg">무게 (kg 이하)</FitTh>
                <FitTh table={mikuTable} columnKey="fee">요금</FitTh>
                <FitTh table={mikuTable} columnKey="manage">관리</FitTh>
              </tr>
            </thead>
            <tbody>
              {isShippingLoading ? (
                <SkeletonRows columns={RATE_COLUMNS} rows={6} pinnedKey="manage" />
              ) : ratesOf('MIKU').length === 0 ? (
                <EmptyRow colSpan={RATE_COLUMNS.length} title={shippingError || '등록된 요금 구간이 없습니다'} />
              ) : ratesOf('MIKU').map((r) => {
                const isEditing = editingRateId === r.id;
                return (
                  <tr key={r.id} className={`admin-table-body-row aft-row ${isEditing ? 'is-editing' : ''}`}>
                    <td className="ap-td">
                      {isEditing
                        ? numInput(rateEditForm.weightKg, v => setRateEditForm({ ...rateEditForm, weightKg: v }), 'kg')
                        : <span className="ap-strong ap-tabnum">{r.weightKg}<span className="ap-section-hint"> kg</span></span>}
                    </td>
                    <td className="ap-td">
                      {isEditing
                        ? numInput(rateEditForm.fee, v => setRateEditForm({ ...rateEditForm, fee: v }), '¥')
                        : <span className="ap-money">{yen(r.fee)}</span>}
                    </td>
                    <td className={mikuTable.pinnedCellClass('manage', 'ap-td')}>
                      <span className="ap-actions">
                        {renderEditActions(isEditing, isShippingUpdating, () => handleUpdateRate(r), () => setEditingRateId(null), () => startEditingRate(r))}
                        {!isEditing && (
                          <button type="button" className="ap-btn is-ghost" aria-label="구간 삭제" disabled={isShippingUpdating} onClick={() => handleDeleteRate(r)}>
                            <Trash size={13} weight="bold" />
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!isShippingLoading && !shippingError && (
                <tr className="admin-table-body-row aft-row">
                  <td className="ap-td">{numInput(newRate.MIKU.weightKg, v => setNewRate(prev => ({ ...prev, MIKU: { ...prev.MIKU, weightKg: v } })), 'kg')}</td>
                  <td className="ap-td">{numInput(newRate.MIKU.fee, v => setNewRate(prev => ({ ...prev, MIKU: { ...prev.MIKU, fee: v } })), '¥')}</td>
                  <td className={mikuTable.pinnedCellClass('manage', 'ap-td')}>
                    <button type="button" className="ap-btn is-primary" disabled={isShippingUpdating || !newRate.MIKU.weightKg || newRate.MIKU.fee === ''} onClick={() => handleAddRate('MIKU')}>
                      <Plus size={13} weight="bold" /> 구간 추가
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================= ✈️ 국제 배송 요금표 — EMS ================= */}
      <section className="ap-panel" id="mg-ems">
        <div className="ap-sec-head">
          <span className="ap-section-title"><Package size={15} weight="duotone" /> {SHIPPING_RATE_LABEL.EMS} 요금표</span>
          <span className="ap-section-hint">회원 등급 구분 없음 · 단위: 엔(¥)</span>
          <button type="button" className="ap-btn is-ghost" style={{ marginLeft: 'auto' }} disabled={isShippingUpdating} onClick={() => handleResetRates('EMS')}>
            <ArrowClockwise size={13} weight="bold" /> 기본 요금표로 되돌리기
          </button>
        </div>
        
        <div className="ap-table-wrap" ref={emsTable.wrapRef} style={{ maxHeight: 520 }}>
          <table className={`admin-table-resizable ${emsTable.tableClassName}`} style={emsTable.tableStyle}>
            <FitColGroup table={emsTable} />
            <thead>
              <tr className="admin-table-head-row">
                <FitTh table={emsTable} columnKey="weightKg">무게 (kg 이하)</FitTh>
                <FitTh table={emsTable} columnKey="fee">요금</FitTh>
                <FitTh table={emsTable} columnKey="manage">관리</FitTh>
              </tr>
            </thead>
            <tbody>
              {isShippingLoading ? (
                <SkeletonRows columns={RATE_COLUMNS} rows={6} pinnedKey="manage" />
              ) : ratesOf('EMS').length === 0 ? (
                <EmptyRow colSpan={RATE_COLUMNS.length} title={shippingError || '등록된 요금 구간이 없습니다'} />
              ) : ratesOf('EMS').map((r) => {
                const isEditing = editingRateId === r.id;
                return (
                  <tr key={r.id} className={`admin-table-body-row aft-row ${isEditing ? 'is-editing' : ''}`}>
                    <td className="ap-td">
                      {isEditing
                        ? numInput(rateEditForm.weightKg, v => setRateEditForm({ ...rateEditForm, weightKg: v }), 'kg')
                        : <span className="ap-strong ap-tabnum">{r.weightKg}<span className="ap-section-hint"> kg</span></span>}
                    </td>
                    <td className="ap-td">
                      {isEditing
                        ? numInput(rateEditForm.fee, v => setRateEditForm({ ...rateEditForm, fee: v }), '¥')
                        : <span className="ap-money">{yen(r.fee)}</span>}
                    </td>
                    <td className={emsTable.pinnedCellClass('manage', 'ap-td')}>
                      <span className="ap-actions">
                        {renderEditActions(isEditing, isShippingUpdating, () => handleUpdateRate(r), () => setEditingRateId(null), () => startEditingRate(r))}
                        {!isEditing && (
                          <button type="button" className="ap-btn is-ghost" aria-label="구간 삭제" disabled={isShippingUpdating} onClick={() => handleDeleteRate(r)}>
                            <Trash size={13} weight="bold" />
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!isShippingLoading && !shippingError && (
                <tr className="admin-table-body-row aft-row">
                  <td className="ap-td">{numInput(newRate.EMS.weightKg, v => setNewRate(prev => ({ ...prev, EMS: { ...prev.EMS, weightKg: v } })), 'kg')}</td>
                  <td className="ap-td">{numInput(newRate.EMS.fee, v => setNewRate(prev => ({ ...prev, EMS: { ...prev.EMS, fee: v } })), '¥')}</td>
                  <td className={emsTable.pinnedCellClass('manage', 'ap-td')}>
                    <button type="button" className="ap-btn is-primary" disabled={isShippingUpdating || !newRate.EMS.weightKg || newRate.EMS.fee === ''} onClick={() => handleAddRate('EMS')}>
                      <Plus size={13} weight="bold" /> 구간 추가
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ToastStack toasts={toasts} />
    </div>
  );
}
