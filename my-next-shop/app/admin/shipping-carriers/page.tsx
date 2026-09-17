"use client";

// 🚚 국제 배송 업체 정보 관리
// 배송 업체 이름과 주소를 추가·수정해 DB(shipping_carriers)에 반영합니다.
// 표의 열 너비 조절은 다른 관리자 화면(orders, membership-grades)과 같은 훅을 씁니다.

import { useState, useEffect, useCallback } from 'react';
import '../admin-common.css';
import { useResizableColumns, ResizableTableHead, type ResizableColumn } from '../components/useResizableColumns';

const CARRIER_COLUMNS: readonly ResizableColumn[] = [
  { key: 'name', label: '업체 이름' },
  { key: 'url', label: '주소(URL)' },
  { key: 'updatedAt', label: '최근 수정' },
  { key: 'manage', label: '관리', align: 'center' },
];
const CARRIER_DEFAULT_WIDTHS = { name: 220, url: 460, updatedAt: 180, manage: 160 };

interface Carrier {
  id: number;
  name: string;
  url: string;
  updatedAt: string;
}

const emptyForm = { name: '', url: '' };

export default function ShippingCarrierManagement() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [addForm, setAddForm] = useState(emptyForm);

  const cols = useResizableColumns({
    storageKey: 'admin_shipping_carriers_column_widths',
    defaultWidths: CARRIER_DEFAULT_WIDTHS,
    visibleColumns: CARRIER_COLUMNS.map(c => c.key),
  });

  const fetchCarriers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/shipping-carriers');
      const data = await res.json();
      if (data.success) setCarriers(data.carriers);
      else alert(data.error || '배송 업체를 불러오지 못했습니다.');
    } catch (error) {
      console.error('배송 업체 조회 에러:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCarriers(); }, [fetchCarriers]);

  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.url.trim()) {
      alert('업체 이름과 주소를 모두 입력해주세요.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/shipping-carriers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (data.success) {
        setAddForm(emptyForm);
        fetchCarriers();
      } else {
        alert(data.error || '추가 실패');
      }
    } catch (error) {
      console.error('배송 업체 추가 에러:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editForm.name.trim() || !editForm.url.trim()) {
      alert('업체 이름과 주소를 모두 입력해주세요.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/shipping-carriers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        fetchCarriers();
      } else {
        alert(data.error || '수정 실패');
      }
    } catch (error) {
      console.error('배송 업체 수정 에러:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (carrier: Carrier) => {
    setEditingId(carrier.id);
    setEditForm({ name: carrier.name, url: carrier.url });
  };

  const formatDate = (value: string) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
  };

  return (
    <div className="admin-container" style={gs.section}>
      <h3 className="admin-section-title">국제 배송 업체 정보</h3>
      <p style={gs.helperText}>
        배송 업체 이름과 주소를 등록해 두면 배송 안내에서 그대로 씁니다.
        주소는 <code>https://</code> 를 빼고 적어도 자동으로 붙습니다.
      </p>

      {/* ===== 추가 ===== */}
      <div style={gs.addBar}>
        <input
          type="text"
          value={addForm.name}
          onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
          placeholder="업체 이름 (예: EMS)"
          style={gs.addNameInput}
        />
        <input
          type="text"
          value={addForm.url}
          onChange={(e) => setAddForm({ ...addForm, url: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="주소 (예: ems.epost.go.kr)"
          style={gs.addUrlInput}
        />
        <button onClick={handleAdd} disabled={isSaving} style={gs.btnPrimary}>
          추가
        </button>
      </div>

      {/* ===== 목록 ===== */}
      <div style={gs.tableWrapper}>
        <table className="admin-table-resizable" style={{ width: cols.totalTableWidth }}>
          <ResizableTableHead columns={CARRIER_COLUMNS} columnWidths={cols.columnWidths} onMouseDown={cols.onMouseDown} />
          <tbody>
            {!isLoading ? (
              carriers.length > 0 ? carriers.map((carrier) => (
                <tr key={carrier.id} className="admin-table-body-row">
                  {/* 업체 이름 */}
                  <td style={gs.td}>
                    {editingId === carrier.id ? (
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        style={gs.textInput}
                      />
                    ) : (
                      <span style={gs.nameBadge}>{carrier.name}</span>
                    )}
                  </td>

                  {/* 주소 */}
                  <td style={gs.td}>
                    {editingId === carrier.id ? (
                      <input
                        type="text"
                        value={editForm.url}
                        onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                        style={gs.textInput}
                      />
                    ) : (
                      <a href={carrier.url} target="_blank" rel="noopener noreferrer" style={gs.link}>
                        {carrier.url}
                      </a>
                    )}
                  </td>

                  {/* 최근 수정 */}
                  <td style={gs.td}>
                    <span style={gs.descText}>{formatDate(carrier.updatedAt)}</span>
                  </td>

                  {/* 관리 버튼 */}
                  <td style={gs.tdCenter}>
                    {editingId === carrier.id ? (
                      <div style={gs.actionButtons}>
                        <button onClick={() => handleUpdate(carrier.id)} disabled={isSaving} style={gs.btnPrimary}>
                          저장
                        </button>
                        <button onClick={() => setEditingId(null)} style={gs.btnSecondary}>
                          취소
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEditing(carrier)} style={gs.btnSecondary}>
                        수정
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={CARRIER_COLUMNS.length} className="admin-empty-td">등록된 배송 업체가 없습니다.</td>
                </tr>
              )
            ) : (
              <tr>
                <td colSpan={CARRIER_COLUMNS.length} className="admin-empty-td">로딩 중...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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

const baseInput: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: '6px',
  border: `1px solid ${colors.borderInput}`,
  boxSizing: 'border-box',
};

const gs: Record<string, React.CSSProperties> = {
  section: { marginBottom: '24px' },
  helperText: {
    fontSize: '13px',
    color: colors.textSub,
    margin: '-12px 0 16px',
    lineHeight: 1.5,
  },
  addBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '16px',
  },
  addNameInput: { ...baseInput, flex: '0 1 220px' },
  addUrlInput: { ...baseInput, flex: '1 1 320px' },
  tableWrapper: { width: '100%', overflowX: 'auto' },
  td: { ...baseTd },
  tdCenter: { ...baseTd, textAlign: 'center' },

  textInput: { ...baseInput, padding: '4px 8px', borderRadius: '4px', width: '100%' },

  nameBadge: {
    padding: '4px 8px',
    backgroundColor: colors.badgeBgLevel,
    color: colors.badgeTextLevel,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '700',
  },
  link: { color: colors.accent, textDecoration: 'none' },
  descText: { color: colors.textSub, fontSize: '13px' },
  actionButtons: { display: 'flex', gap: '4px', justifyContent: 'center' },
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
