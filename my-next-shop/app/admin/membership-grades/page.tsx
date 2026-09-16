"use client";

import { useState, useEffect, useMemo } from 'react';
import '../admin-common.css';
import { useResizableColumns, ResizableTableHead, type ResizableColumn } from '../components/useResizableColumns';

// 🌟 이 화면의 표 5개는 모두 orders 처럼 헤더 경계를 드래그해 열 너비를 조절할 수 있습니다.
//    (표마다 조절한 너비를 따로 저장하므로 storageKey 도 표마다 다릅니다)
const GRADE_COLUMNS: readonly ResizableColumn[] = [
  { key: 'sortOrder', label: '순서' },
  { key: 'name', label: '등급명' },
  { key: 'requiredOrders', label: '필요 주문 건수', align: 'right' },
  { key: 'discountRate', label: '국제 배송비 할인율', align: 'right' },
  { key: 'description', label: '설명' },
  { key: 'manage', label: '관리', align: 'center' },
];
const GRADE_DEFAULT_WIDTHS = {
  sortOrder: 90, name: 150, requiredOrders: 150, discountRate: 170, description: 320, manage: 160,
};

const ORDER_FEE_COLUMNS: readonly ResizableColumn[] = [
  { key: 'feeType', label: '구분' },
  { key: 'thresholdValue', label: '기준값', align: 'right' },
  { key: 'belowThresholdFee', label: '기준 미만 금액', align: 'right' },
  { key: 'atOrAboveThresholdAmount', label: '기준 이상 금액', align: 'right' },
  { key: 'manage', label: '관리', align: 'center' },
];
const ORDER_FEE_DEFAULT_WIDTHS = {
  feeType: 150, thresholdValue: 150, belowThresholdFee: 170, atOrAboveThresholdAmount: 200, manage: 160,
};

const AIR_COLUMNS: readonly ResizableColumn[] = [
  { key: 'grade', label: '등급' },
  { key: 'firstStepFee', label: '0.5kg 이하 기본가', align: 'right' },
  { key: 'baseFeeAtStepTwo', label: '1.0kg 기준가', align: 'right' },
  { key: 'stepIncrement', label: '0.5kg당 증가액', align: 'right' },
  { key: 'discountVsGoldLow', label: '골드대비 할인(4.5kg 이하)', align: 'right' },
  { key: 'discountVsGoldMid', label: '골드대비 할인(4.5~5.0kg)', align: 'right' },
  { key: 'discountVsGoldHigh', label: '골드대비 할인(5.0kg 초과)', align: 'right' },
  { key: 'manage', label: '관리', align: 'center' },
];
const AIR_DEFAULT_WIDTHS = {
  grade: 130, firstStepFee: 160, baseFeeAtStepTwo: 140, stepIncrement: 150,
  discountVsGoldLow: 200, discountVsGoldMid: 200, discountVsGoldHigh: 200, manage: 160,
};

const EMS_COLUMNS: readonly ResizableColumn[] = [
  { key: 'weightKg', label: '무게(kg)' },
  { key: 'fee', label: '요금', align: 'right' },
  { key: 'manage', label: '관리', align: 'center' },
];
const EMS_DEFAULT_WIDTHS = { weightKg: 140, fee: 180, manage: 160 };

const EXTRA_COLUMNS: readonly ResizableColumn[] = [
  { key: 'method', label: '구분' },
  { key: 'thresholdWeightKg', label: '기준 무게(kg)', align: 'right' },
  { key: 'baseFeeAtThreshold', label: '기준 요금', align: 'right' },
  { key: 'extraPerKg', label: '초과 1kg당 추가금', align: 'right' },
  { key: 'manage', label: '관리', align: 'center' },
];
const EXTRA_DEFAULT_WIDTHS = {
  method: 170, thresholdWeightKg: 150, baseFeeAtThreshold: 150, extraPerKg: 190, manage: 160,
};

// 🌟 air_shipping_fee_rules.grade는 코드(NEW/SILVER/GOLD/DIAMOND) 고정값이고, 화면에
// 보여줄 실제 이름은 membership_grades.name(관리자가 위 표에서 바꿀 수 있음)을 따릅니다.
// 두 테이블 모두 이 순서(NEW→SILVER→GOLD→DIAMOND, sortOrder 1→4)로 시드되어 있어
// 위치로 매칭합니다.
const AIR_GRADE_CODE_ORDER = ['NEW', 'SILVER', 'GOLD', 'DIAMOND'];

// 🌟 src/utils/feeCalculator.ts의 등급별 국제 배송비 할인율(NEW/SILVER/GOLD/DIAMOND)이
// 참조할 membership_grades 테이블과, guide/shipping-fee의 항공/EMS/우체국해운 요금
// 계산식이 참조할 3개 테이블(air_shipping_fee_rules/ems_shipping_fee_breakpoints/
// shipping_fee_extra_rates)을 이 페이지 한 곳에서 조회/수정합니다.
export default function MembershipGradeManagement() {
  const [grades, setGrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🌟 표별 열 너비 조절 (orders 와 동일한 방식)
  const gradeCols = useResizableColumns({
    storageKey: 'admin_membership_grades_column_widths',
    defaultWidths: GRADE_DEFAULT_WIDTHS,
    visibleColumns: GRADE_COLUMNS.map(c => c.key),
  });
  const orderFeeCols = useResizableColumns({
    storageKey: 'admin_membership_order_fee_column_widths',
    defaultWidths: ORDER_FEE_DEFAULT_WIDTHS,
    visibleColumns: ORDER_FEE_COLUMNS.map(c => c.key),
  });
  const airCols = useResizableColumns({
    storageKey: 'admin_membership_air_column_widths',
    defaultWidths: AIR_DEFAULT_WIDTHS,
    visibleColumns: AIR_COLUMNS.map(c => c.key),
  });
  const emsCols = useResizableColumns({
    storageKey: 'admin_membership_ems_column_widths',
    defaultWidths: EMS_DEFAULT_WIDTHS,
    visibleColumns: EMS_COLUMNS.map(c => c.key),
  });
  const extraCols = useResizableColumns({
    storageKey: 'admin_membership_extra_column_widths',
    defaultWidths: EXTRA_DEFAULT_WIDTHS,
    visibleColumns: EXTRA_COLUMNS.map(c => c.key),
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', discountRate: 0, requiredOrders: 0, sortOrder: 0, description: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  // 항공/EMS/우체국해운 요금 규칙
  const [airRules, setAirRules] = useState<any[]>([]);
  const [emsBreakpoints, setEmsBreakpoints] = useState<any[]>([]);
  const [extraRates, setExtraRates] = useState<any[]>([]);
  const [isShippingLoading, setIsShippingLoading] = useState(true);

  const [editingAirId, setEditingAirId] = useState<number | null>(null);
  const [airEditForm, setAirEditForm] = useState({
    firstStepFee: '', baseFeeAtStepTwo: '', stepIncrement: '',
    discountVsGoldLow: '', discountVsGoldMid: '', discountVsGoldHigh: '',
  });

  const [editingEmsId, setEditingEmsId] = useState<number | null>(null);
  const [emsEditForm, setEmsEditForm] = useState({ fee: '' });

  const [editingExtraId, setEditingExtraId] = useState<number | null>(null);
  const [extraEditForm, setExtraEditForm] = useState({ thresholdWeightKg: '', baseFeeAtThreshold: '', extraPerKg: '' });

  const [isShippingUpdating, setIsShippingUpdating] = useState(false);

  // 결제/대행 수수료 구간 규칙 (src/utils/feeCalculator.ts가 참조하는 order_fee_rules)
  const [orderFeeRules, setOrderFeeRules] = useState<any[]>([]);
  const [isOrderFeeLoading, setIsOrderFeeLoading] = useState(true);
  const [editingOrderFeeId, setEditingOrderFeeId] = useState<number | null>(null);
  const [orderFeeEditForm, setOrderFeeEditForm] = useState({ thresholdValue: '', belowThresholdFee: '', atOrAboveThresholdAmount: '' });
  const [isOrderFeeUpdating, setIsOrderFeeUpdating] = useState(false);

  const ORDER_FEE_TYPE_LABEL: Record<string, string> = { PAYMENT: '결제 수수료', AGENCY: '대행 수수료' };

  useEffect(() => {
    fetchGrades();
    fetchShippingRules();
    fetchOrderFeeRules();
  }, []);

  const fetchOrderFeeRules = async () => {
    setIsOrderFeeLoading(true);
    try {
      const res = await fetch('/api/admin/order-fee-rules');
      const data = await res.json();
      if (data.success) {
        setOrderFeeRules(data.rules);
      }
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
        setEditingOrderFeeId(null);
        fetchOrderFeeRules();
      } else {
        alert(data.error || '수정 실패');
      }
    } catch (error) {
      alert('서버 오류가 발생했습니다.');
    } finally {
      setIsOrderFeeUpdating(false);
    }
  };

  // 🐛 예전에는 AIR_GRADE_CODE_ORDER의 순번으로 grades[idx]를 집어왔습니다. grades는 id 순으로
  //    내려오는데 이 화면에서 sortOrder를 편집할 수 있고 등급이 추가/삭제될 수도 있어서,
  //    순번이 어긋나면 엉뚱한 등급 이름이 항공 요금 행에 붙었습니다.
  //    → membership_grades.name이 고유(unique)하고 코드값(NEW/SILVER/…)과 같으므로 이름으로 맞춥니다.
  const airGradeDisplayNameByCode = useMemo(() => {
    const byName = new Map<string, any>(
      grades.map((g: any) => [String(g.name).toUpperCase(), g])
    );
    const map: Record<string, string> = {};
    AIR_GRADE_CODE_ORDER.forEach((code) => {
      map[code] = byName.get(code.toUpperCase())?.name ?? code;
    });
    return map;
  }, [grades]);

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

  const handleUpdateAir = async (id: number) => {
    setIsShippingUpdating(true);
    try {
      const res = await fetch('/api/admin/shipping-fee-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'air', id, ...airEditForm }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingAirId(null);
        fetchShippingRules();
      } else {
        alert(data.error || '수정 실패');
      }
    } catch (error) {
      alert('서버 오류가 발생했습니다.');
    } finally {
      setIsShippingUpdating(false);
    }
  };

  const startEditingEms = (bp: any) => {
    setEditingEmsId(bp.id);
    setEmsEditForm({ fee: bp.fee });
  };

  const handleUpdateEms = async (id: number) => {
    setIsShippingUpdating(true);
    try {
      const res = await fetch('/api/admin/shipping-fee-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ems', id, ...emsEditForm }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingEmsId(null);
        fetchShippingRules();
      } else {
        alert(data.error || '수정 실패');
      }
    } catch (error) {
      alert('서버 오류가 발생했습니다.');
    } finally {
      setIsShippingUpdating(false);
    }
  };

  const startEditingExtra = (rate: any) => {
    setEditingExtraId(rate.id);
    setExtraEditForm({
      thresholdWeightKg: rate.thresholdWeightKg,
      baseFeeAtThreshold: rate.baseFeeAtThreshold,
      extraPerKg: rate.extraPerKg,
    });
  };

  const handleUpdateExtra = async (id: number) => {
    setIsShippingUpdating(true);
    try {
      const res = await fetch('/api/admin/shipping-fee-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'extra', id, ...extraEditForm }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingExtraId(null);
        fetchShippingRules();
      } else {
        alert(data.error || '수정 실패');
      }
    } catch (error) {
      alert('서버 오류가 발생했습니다.');
    } finally {
      setIsShippingUpdating(false);
    }
  };

  const fetchGrades = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/membership-grades');
      const data = await res.json();
      if (data.success) {
        setGrades(data.grades);
      }
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
        alert('등급 정보가 수정되었습니다.');
        setEditingId(null);
        fetchGrades();
      } else {
        alert(data.error || '수정 실패');
      }
    } catch (error) {
      console.error("등급 수정 에러:", error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
    <div className="admin-container" style={gs.section}>
      <h3 className="admin-section-title">회원 등급 및 국제 배송비 할인율</h3>
      <div style={gs.tableWrapper}>
        <table className="admin-table-resizable" style={{ width: gradeCols.totalTableWidth }}>
          <ResizableTableHead columns={GRADE_COLUMNS} columnWidths={gradeCols.columnWidths} onMouseDown={gradeCols.onMouseDown} />
          <tbody>
            {!isLoading ? (
              grades.length > 0 ? grades.map((grade) => (
                <tr key={grade.id} className="admin-table-body-row">
                  {/* 순서 */}
                  <td style={gs.td}>
                    {editingId === grade.id ? (
                      <input
                        type="number"
                        value={editForm.sortOrder}
                        onChange={(e) => setEditForm({ ...editForm, sortOrder: parseInt(e.target.value) || 0 })}
                        style={gs.numberInputSmall}
                      />
                    ) : grade.sortOrder}
                  </td>

                  {/* 등급명 */}
                  <td style={gs.td}>
                    {editingId === grade.id ? (
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        style={gs.textInput}
                      />
                    ) : (
                      <span style={gs.gradeBadge}>{grade.name}</span>
                    )}
                  </td>

                  {/* 필요 주문 건수 */}
                  <td style={gs.tdRight}>
                    {editingId === grade.id ? (
                      <div style={gs.percentInputWrap}>
                        <input
                          type="number"
                          value={editForm.requiredOrders}
                          onChange={(e) => setEditForm({ ...editForm, requiredOrders: parseInt(e.target.value) || 0 })}
                          style={gs.numberInput}
                        />
                        <span>건</span>
                      </div>
                    ) : (
                      `${grade.requiredOrders}건`
                    )}
                  </td>

                  {/* 할인율 */}
                  <td style={gs.tdRight}>
                    {editingId === grade.id ? (
                      <div style={gs.percentInputWrap}>
                        <input
                          type="number"
                          value={editForm.discountRate}
                          onChange={(e) => setEditForm({ ...editForm, discountRate: parseFloat(e.target.value) || 0 })}
                          style={gs.numberInput}
                        />
                        <span>%</span>
                      </div>
                    ) : (
                      `${(grade.discountRate * 100).toFixed(0)}%`
                    )}
                  </td>

                  {/* 설명 */}
                  <td style={gs.td}>
                    {editingId === grade.id ? (
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        style={gs.textInput}
                        placeholder="관리자 메모"
                      />
                    ) : (
                      <span style={gs.descText}>{grade.description || '-'}</span>
                    )}
                  </td>

                  {/* 관리 버튼 */}
                  <td style={gs.tdCenter}>
                    {editingId === grade.id ? (
                      <div style={gs.actionButtons}>
                        <button
                          onClick={() => handleUpdate(grade.id)}
                          disabled={isUpdating}
                          style={gs.btnPrimary}
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={gs.btnSecondary}
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(grade)}
                        style={gs.btnSecondary}
                      >
                        수정
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="admin-empty-td">등록된 등급이 없습니다.</td>
                </tr>
              )
            ) : (
              <tr>
                <td colSpan={6} className="admin-empty-td">로딩 중...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* ================= 결제/대행 수수료 규칙 ================= */}
    <div className="admin-container" style={gs.section}>
      <h3 className="admin-section-title">결제/대행 수수료 구간 규칙</h3>
      <p style={gs.helperText}>
        <strong>결제 수수료</strong>: 상품 가격 합계가 기준값 미만이면 "기준 미만 금액", 이상이면 "기준 이상 금액"이 고정으로 부과됩니다.<br />
        <strong>대행 수수료</strong>: 수량이 기준값 미만이면 "기준 미만 금액"이 고정으로, 이상이면 수량 × "기준 이상 금액"(수량당 단가)으로 계산됩니다.
      </p>
      <div style={gs.tableWrapper}>
        <table className="admin-table-resizable" style={{ width: orderFeeCols.totalTableWidth }}>
          <ResizableTableHead columns={ORDER_FEE_COLUMNS} columnWidths={orderFeeCols.columnWidths} onMouseDown={orderFeeCols.onMouseDown} />
          <tbody>
            {!isOrderFeeLoading ? orderFeeRules.map((rule) => {
              const isEditing = editingOrderFeeId === rule.id;
              const unit = rule.feeType === 'AGENCY' ? '개' : '엔';
              return (
                <tr key={rule.id} className="admin-table-body-row">
                  <td style={gs.td}><span style={gs.gradeBadge}>{ORDER_FEE_TYPE_LABEL[rule.feeType] ?? rule.feeType}</span></td>
                  <td style={gs.tdRight}>
                    {isEditing ? (
                      <div style={gs.percentInputWrap}>
                        <input type="number" value={orderFeeEditForm.thresholdValue} onChange={(e) => setOrderFeeEditForm({ ...orderFeeEditForm, thresholdValue: e.target.value })} style={gs.numberInput} />
                        <span>{unit}</span>
                      </div>
                    ) : `${rule.thresholdValue.toLocaleString()}${unit}`}
                  </td>
                  <td style={gs.tdRight}>
                    {isEditing ? (
                      <input type="number" value={orderFeeEditForm.belowThresholdFee} onChange={(e) => setOrderFeeEditForm({ ...orderFeeEditForm, belowThresholdFee: e.target.value })} style={gs.numberInput} />
                    ) : `¥${rule.belowThresholdFee.toLocaleString()}`}
                  </td>
                  <td style={gs.tdRight}>
                    {isEditing ? (
                      <input type="number" value={orderFeeEditForm.atOrAboveThresholdAmount} onChange={(e) => setOrderFeeEditForm({ ...orderFeeEditForm, atOrAboveThresholdAmount: e.target.value })} style={gs.numberInput} />
                    ) : `¥${rule.atOrAboveThresholdAmount.toLocaleString()}${rule.feeType === 'AGENCY' ? ' X 수량' : ''}`}
                  </td>
                  <td style={gs.tdCenter}>
                    {isEditing ? (
                      <div style={gs.actionButtons}>
                        <button onClick={() => handleUpdateOrderFee(rule.id)} disabled={isOrderFeeUpdating} style={gs.btnPrimary}>저장</button>
                        <button onClick={() => setEditingOrderFeeId(null)} style={gs.btnSecondary}>취소</button>
                      </div>
                    ) : (
                      <button onClick={() => startEditingOrderFee(rule)} style={gs.btnSecondary}>수정</button>
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={5} className="admin-empty-td">로딩 중...</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* ================= 항공 요금 변수 ================= */}
    <div className="admin-container" style={gs.section}>
      <h3 className="admin-section-title">항공 배송비 등급별 변수</h3>
      <p style={gs.helperText}>무게 0.5kg 이하는 "0.5kg 이하 기본가" 고정, 0.5kg 초과는 "1.0kg 기준가 + 1.0kg을 넘어 0.5kg 늘어날 때마다 0.5kg당 증가액"으로 계산됩니다. DIAMOND는 GOLD 요금에서 할인액을 빼는 방식이라 1.0kg 기준가/0.5kg당 증가액이 없습니다.</p>
      <div style={gs.tableWrapper}>
        <table className="admin-table-resizable" style={{ width: airCols.totalTableWidth }}>
          <ResizableTableHead columns={AIR_COLUMNS} columnWidths={airCols.columnWidths} onMouseDown={airCols.onMouseDown} />
          <tbody>
            {!isShippingLoading ? airRules.map((rule) => {
              const isEditing = editingAirId === rule.id;
              return (
                <tr key={rule.id} className="admin-table-body-row">
                  <td style={gs.td}><span style={gs.gradeBadge}>{airGradeDisplayNameByCode[rule.grade] ?? rule.grade}</span></td>
                  {(['firstStepFee', 'baseFeeAtStepTwo', 'stepIncrement', 'discountVsGoldLow', 'discountVsGoldMid', 'discountVsGoldHigh'] as const).map((field) => (
                    <td key={field} style={gs.tdRight}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={airEditForm[field]}
                          onChange={(e) => setAirEditForm({ ...airEditForm, [field]: e.target.value })}
                          style={gs.numberInput}
                        />
                      ) : (rule[field] ?? '-')}
                    </td>
                  ))}
                  <td style={gs.tdCenter}>
                    {isEditing ? (
                      <div style={gs.actionButtons}>
                        <button onClick={() => handleUpdateAir(rule.id)} disabled={isShippingUpdating} style={gs.btnPrimary}>저장</button>
                        <button onClick={() => setEditingAirId(null)} style={gs.btnSecondary}>취소</button>
                      </div>
                    ) : (
                      <button onClick={() => startEditingAir(rule)} style={gs.btnSecondary}>수정</button>
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={8} className="admin-empty-td">로딩 중...</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* ================= EMS 구간표 ================= */}
    <div className="admin-container" style={gs.section}>
      <h3 className="admin-section-title">EMS 요금 구간표 (0.5 ~ 7.0kg)</h3>
      <p style={gs.helperText}>등급과 무관한 공통 요금이며, 7kg 초과분은 아래 "초과 규칙"을 따릅니다.</p>
      <div style={{ ...gs.tableWrapper, maxHeight: '360px', overflowY: 'auto' }}>
        <table className="admin-table-resizable" style={{ width: emsCols.totalTableWidth }}>
          <ResizableTableHead columns={EMS_COLUMNS} columnWidths={emsCols.columnWidths} onMouseDown={emsCols.onMouseDown} />
          <tbody>
            {!isShippingLoading ? emsBreakpoints.map((bp) => {
              const isEditing = editingEmsId === bp.id;
              return (
                <tr key={bp.id} className="admin-table-body-row">
                  <td style={gs.td}>{bp.weightKg}kg</td>
                  <td style={gs.tdRight}>
                    {isEditing ? (
                      <input
                        type="number"
                        value={emsEditForm.fee}
                        onChange={(e) => setEmsEditForm({ fee: e.target.value })}
                        style={gs.numberInput}
                      />
                    ) : `¥${bp.fee.toLocaleString()}`}
                  </td>
                  <td style={gs.tdCenter}>
                    {isEditing ? (
                      <div style={gs.actionButtons}>
                        <button onClick={() => handleUpdateEms(bp.id)} disabled={isShippingUpdating} style={gs.btnPrimary}>저장</button>
                        <button onClick={() => setEditingEmsId(null)} style={gs.btnSecondary}>취소</button>
                      </div>
                    ) : (
                      <button onClick={() => startEditingEms(bp)} style={gs.btnSecondary}>수정</button>
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={3} className="admin-empty-td">로딩 중...</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* ================= EMS/우체국해운 초과 규칙 ================= */}
    <div className="admin-container" style={gs.section}>
      <h3 className="admin-section-title">EMS / 우체국해운 기준 무게 초과 규칙</h3>
      <p style={gs.helperText}>기준 무게까지는 "기준 요금" 고정, 초과분부터는 1kg마다 "초과 1kg당 추가금"이 더해집니다. (우체국해운은 구간표 없이 이 규칙 하나로 전체 계산됩니다.)</p>
      <div style={gs.tableWrapper}>
        <table className="admin-table-resizable" style={{ width: extraCols.totalTableWidth }}>
          <ResizableTableHead columns={EXTRA_COLUMNS} columnWidths={extraCols.columnWidths} onMouseDown={extraCols.onMouseDown} />
          <tbody>
            {!isShippingLoading ? extraRates.map((rate) => {
              const isEditing = editingExtraId === rate.id;
              return (
                <tr key={rate.id} className="admin-table-body-row">
                  <td style={gs.td}><span style={gs.gradeBadge}>{rate.method}</span></td>
                  <td style={gs.tdRight}>
                    {isEditing ? (
                      <input type="number" value={extraEditForm.thresholdWeightKg} onChange={(e) => setExtraEditForm({ ...extraEditForm, thresholdWeightKg: e.target.value })} style={gs.numberInput} />
                    ) : `${rate.thresholdWeightKg}kg`}
                  </td>
                  <td style={gs.tdRight}>
                    {isEditing ? (
                      <input type="number" value={extraEditForm.baseFeeAtThreshold} onChange={(e) => setExtraEditForm({ ...extraEditForm, baseFeeAtThreshold: e.target.value })} style={gs.numberInput} />
                    ) : `¥${rate.baseFeeAtThreshold.toLocaleString()}`}
                  </td>
                  <td style={gs.tdRight}>
                    {isEditing ? (
                      <input type="number" value={extraEditForm.extraPerKg} onChange={(e) => setExtraEditForm({ ...extraEditForm, extraPerKg: e.target.value })} style={gs.numberInput} />
                    ) : `¥${rate.extraPerKg.toLocaleString()}`}
                  </td>
                  <td style={gs.tdCenter}>
                    {isEditing ? (
                      <div style={gs.actionButtons}>
                        <button onClick={() => handleUpdateExtra(rate.id)} disabled={isShippingUpdating} style={gs.btnPrimary}>저장</button>
                        <button onClick={() => setEditingExtraId(null)} style={gs.btnSecondary}>취소</button>
                      </div>
                    ) : (
                      <button onClick={() => startEditingExtra(rate)} style={gs.btnSecondary}>수정</button>
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={5} className="admin-empty-td">로딩 중...</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}

// ==========================================
// 🎨 스타일 정의 영역 (Grade Styles: gs)
// ==========================================

const colors = {
  white: '#fff',
  borderInput: '#cbd5e1',
  textSub: '#64748b',
  accent: '#3b82f6',
  badgeBgLevel: '#eff6ff',
  badgeTextLevel: '#3b82f6',
};

// 🌟 열 너비를 고정(table-layout: fixed)했으므로, 넘치는 값은 말줄임으로 처리합니다.
const baseTd: React.CSSProperties = {
  padding: '16px 12px',
  borderRight: '1px solid #f1f5f9',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const gs: Record<string, React.CSSProperties> = {
  section: {
    marginBottom: '24px',
  },
  helperText: {
    fontSize: '13px',
    color: colors.textSub,
    margin: '-12px 0 16px',
    lineHeight: 1.5,
  },
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
  },
  td: { ...baseTd },
  tdCenter: { ...baseTd, textAlign: 'center' },
  tdRight: { ...baseTd, textAlign: 'right' },

  textInput: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: `1px solid ${colors.borderInput}`,
    width: '100%',
    boxSizing: 'border-box',
  },
  numberInput: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: `1px solid ${colors.borderInput}`,
    width: '70px',
    maxWidth: '100%',
    boxSizing: 'border-box',
    textAlign: 'right',
  },
  numberInputSmall: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: `1px solid ${colors.borderInput}`,
    width: '56px',
    maxWidth: '100%',
    boxSizing: 'border-box',
    textAlign: 'right',
  },
  percentInputWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '6px',
  },

  gradeBadge: {
    padding: '4px 8px',
    backgroundColor: colors.badgeBgLevel,
    color: colors.badgeTextLevel,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '700',
  },
  descText: {
    color: colors.textSub,
    fontSize: '13px',
  },
  actionButtons: {
    display: 'flex',
    gap: '4px',
    justifyContent: 'center',
  },
  btnPrimary: {
    padding: '6px 12px',
    backgroundColor: colors.accent,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '6px 12px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.borderInput}`,
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
};
