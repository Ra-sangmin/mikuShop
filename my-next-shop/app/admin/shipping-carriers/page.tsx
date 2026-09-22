"use client";

// 🚚 국제 배송 업체 정보 관리
// 배송 업체 이름과 주소를 추가·수정해 DB(shipping_carriers)에 반영합니다.
// 주문 관리에서 국제배송으로 넘길 때 이 목록에서 업체를 고르고, 배송 관리의 '추적' 버튼이 이 주소를 엽니다.

import { useState, useEffect, useCallback, useMemo } from 'react';
import '../admin-common.css';
import { useFitTable, FitColGroup, FitTh } from '../components/useFitTable';
import {
  AdminHero, HeroButton, KpiCard, SearchField, EmptyRow, SkeletonRows, useToasts, ToastStack, fmtDate,
} from '../components/AdminPremiumKit';
import {
  Truck, ArrowClockwise, Plus, PencilSimple, Check, X, ArrowSquareOut, Info, ClockCounterClockwise, Link, Sparkle, Trash,} from '@phosphor-icons/react';

const COLUMNS = ['name', 'url', 'updatedAt', 'manage'] as const;
const DEFAULT_WIDTHS = { name: 240, url: 520, updatedAt: 160, manage: 170 };

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
  const [searchTerm, setSearchTerm] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  // 🗑️ 삭제는 되돌릴 수 없어서, 같은 줄에서 한 번 더 확인받습니다.
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm);
  const [addForm, setAddForm] = useState(emptyForm);

  const { toasts, pushToast } = useToasts();

  // 🌟 공통 표 (가로 꽉 채움 · 연쇄 열 조절 · 관리 열 오른쪽 고정)
  const table = useFitTable({
    storageKey: 'admin_shipping_carriers_column_widths_v2',
    columns: COLUMNS,
    defaultWidths: DEFAULT_WIDTHS,
    pinned: { key: 'manage', minWidth: 150 },
  });

  const fetchCarriers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/shipping-carriers');
      const data = await res.json();
      if (data.success) setCarriers(data.carriers);
      else pushToast('error', data.error || '배송 업체를 불러오지 못했습니다.');
    } catch (error) {
      console.error('배송 업체 조회 에러:', error);
      pushToast('error', '서버 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { fetchCarriers(); }, [fetchCarriers]);

  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.url.trim()) {
      pushToast('error', '업체 이름과 주소를 모두 입력해주세요.');
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
        pushToast('success', `'${addForm.name.trim()}' 업체를 추가했습니다.`);
        setAddForm(emptyForm);
        fetchCarriers();
      } else {
        pushToast('error', data.error || '추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('배송 업체 추가 에러:', error);
      pushToast('error', '서버 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editForm.name.trim() || !editForm.url.trim()) {
      pushToast('error', '업체 이름과 주소를 모두 입력해주세요.');
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
        pushToast('success', '업체 정보를 수정했습니다.');
        setEditingId(null);
        fetchCarriers();
      } else {
        pushToast('error', data.error || '수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('배송 업체 수정 에러:', error);
      pushToast('error', '서버 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 🗑️ 배송 업체 삭제.
   *    이 업체로 발송한 주문이 있으면 서버가 막고 몇 건인지 알려 줍니다.
   *    (외래키가 ON DELETE SET NULL 이라 그냥 지우면 그 주문들의 송장 추적 링크가 끊깁니다)
   */
  const handleDelete = async (carrier: Carrier) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/shipping-carriers?id=${carrier.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        pushToast('success', `'${carrier.name}' 업체를 삭제했습니다.`);
        setDeletingId(null);
        fetchCarriers();
      } else {
        pushToast('error', data.error || '삭제에 실패했습니다.');
        setDeletingId(null);
      }
    } catch (error) {
      console.error('배송 업체 삭제 에러:', error);
      pushToast('error', '서버 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const startEditing = (carrier: Carrier) => {
    setEditingId(carrier.id);
    setEditForm({ name: carrier.name, url: carrier.url });
  };

  const safeDate = (value: string) => (Number.isNaN(new Date(value).getTime()) ? '-' : fmtDate(value));

  const latest = useMemo(
    () => carriers.reduce<Carrier | null>((a, c) => (!a || new Date(c.updatedAt) > new Date(a.updatedAt) ? c : a), null),
    [carriers]
  );

  const rendered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return carriers;
    return carriers.filter(c => c.name.toLowerCase().includes(q) || c.url.toLowerCase().includes(q));
  }, [carriers, searchTerm]);

  return (
    <div className="ap-page">
      <AdminHero
        eyebrow="CARRIERS" icon={<Sparkle size={11} weight="fill" />}
        title="국제 배송 업체"
        description="국제배송에 쓰는 배송 업체와 조회 주소를 관리합니다."
        accentRgb="14, 165, 233"
        actions={
          <HeroButton onClick={fetchCarriers} disabled={isLoading}>
            <ArrowClockwise size={15} weight="bold" className={isLoading ? 'ap-spin' : ''} /> 새로고침
          </HeroButton>
        }
      >
        <div className="ap-kpis is-3">
          <KpiCard icon={<Truck size={18} weight="duotone" />} label="등록된 배송 업체" loading={isLoading}
            value={<>{carriers.length.toLocaleString()}<small>곳</small></>}
            foot="주문 관리에서 국제배송 전환 시 선택합니다" />
          <KpiCard icon={<ClockCounterClockwise size={18} weight="duotone" />} label="최근 수정" toneRgb="147, 197, 253" loading={isLoading}
            value={latest ? safeDate(latest.updatedAt) : '-'}
            foot={latest ? `${latest.name}` : '아직 등록된 업체가 없습니다'} />
          <KpiCard icon={<Link size={18} weight="duotone" />} label="조회 주소 사용처" toneRgb="110, 231, 183"
            value={<small style={{ fontSize: 15, color: '#e2e8f0' }}>배송 관리 · 추적 버튼</small>}
            foot="송장번호를 복사한 뒤 이 주소를 엽니다" />
        </div>
      </AdminHero>

      <section className="ap-panel">
        <div className="ap-help">
          <Info size={15} weight="bold" />
          <span>
            주소는 <code>https://</code> 를 빼고 적어도 자동으로 붙습니다. 업체 이름·주소를 바꾸면 이 업체로 발송한 주문에도 바로 반영됩니다.
            <br />
            주소에 <code>{'{tracking}'}</code> 을 넣으면 그 자리에 <b>운송장 번호</b>가 채워져 조회 결과로 바로 열립니다.
            예: <code>{'...comm?ems_gubun=E&POST_CODE={tracking}'}</code> · 넣지 않으면 조회 첫 화면만 열립니다.
          </span>
        </div>

        {/* ===== 추가 ===== */}
        <div className="ap-form">
          <div className="ap-form-head">
            <span className="ap-form-title"><Plus size={14} weight="bold" /> 새 배송 업체 추가</span>
          </div>
          <div className="ap-form-row">
            <label className="ap-form-field" style={{ flex: '0 1 240px' }}>
              <span className="ap-label">업체 이름</span>
              <input className="ap-input" type="text" value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="예: EMS" />
            </label>
            <label className="ap-form-field" style={{ flex: '1 1 320px' }}>
              <span className="ap-label">조회 주소 (URL)</span>
              <input className="ap-input" type="text" value={addForm.url}
                onChange={(e) => setAddForm({ ...addForm, url: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                placeholder="예: ems.epost.go.kr" />
            </label>
            <button type="button" className="ap-btn is-lg is-primary" onClick={handleAdd}
              disabled={isSaving || !addForm.name.trim() || !addForm.url.trim()}>
              <Plus size={14} weight="bold" /> 추가
            </button>
          </div>
        </div>

        {/* ===== 목록 ===== */}
        <div className="ap-toolbar">
          <div className="ap-toolbar-left">
            <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="업체 이름 또는 주소 검색" />
          </div>
          <div className="ap-toolbar-right">
            <span className="ap-count">{searchTerm ? '검색 결과' : '전체'} <b>{rendered.length.toLocaleString()}</b>곳</span>
          </div>
        </div>

        <div className="ap-table-wrap" ref={table.wrapRef}>
          <table className={`admin-table-resizable ${table.tableClassName}`} style={table.tableStyle}>
            <FitColGroup table={table} />
            <thead>
              <tr className="admin-table-head-row">
                <FitTh table={table} columnKey="name">업체 이름</FitTh>
                <FitTh table={table} columnKey="url">조회 주소 (URL)</FitTh>
                <FitTh table={table} columnKey="updatedAt">최근 수정</FitTh>
                <FitTh table={table} columnKey="manage">관리</FitTh>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={COLUMNS} rows={4} pinnedKey="manage" />
              ) : rendered.length === 0 ? (
                <EmptyRow colSpan={COLUMNS.length} icon={<Truck size={24} weight="duotone" />}
                  title={searchTerm ? '검색 결과가 없습니다' : '등록된 배송 업체가 없습니다'}
                  description={searchTerm ? '다른 이름이나 주소로 검색해 보세요.' : '위에서 첫 배송 업체를 추가해 주세요.'} />
              ) : rendered.map((carrier) => {
                const isEditing = editingId === carrier.id;
                return (
                  <tr key={carrier.id} className={`admin-table-body-row aft-row ${isEditing ? 'is-editing' : ''}`}>
                    <td className="ap-td">
                      {isEditing ? (
                        <input className="ap-cell-input" type="text" value={editForm.name} autoFocus
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                      ) : (
                        <span className="ap-person" style={{ justifyContent: 'center' }}>
                          <span className="ap-avatar" style={{ background: 'linear-gradient(135deg, #7dd3fc 0%, #0284c7 100%)' }} aria-hidden="true">
                            <Truck size={15} weight="fill" />
                          </span>
                          <span className="ap-strong">{carrier.name}</span>
                        </span>
                      )}
                    </td>
                    <td className="ap-td is-left">
                      {isEditing ? (
                        <input className="ap-cell-input" type="text" value={editForm.url}
                          onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(carrier.id); if (e.key === 'Escape') setEditingId(null); }} />
                      ) : (
                        <a href={carrier.url} target="_blank" rel="noopener noreferrer" className="ap-link" title={carrier.url}>
                          <span>{carrier.url}</span> <ArrowSquareOut size={12} weight="bold" />
                        </a>
                      )}
                    </td>
                    <td className="ap-td"><span className="ap-strong ap-tabnum">{safeDate(carrier.updatedAt)}</span></td>
                    <td className={table.pinnedCellClass('manage', 'ap-td')}>
                      {isEditing ? (
                        <span className="ap-actions">
                          <button type="button" className="ap-btn is-ghost" onClick={() => setEditingId(null)} aria-label="취소"><X size={12} weight="bold" /></button>
                          <button type="button" className="ap-btn is-primary" onClick={() => handleUpdate(carrier.id)} disabled={isSaving}>
                            <Check size={13} weight="bold" /> 저장
                          </button>
                        </span>
                      ) : deletingId === carrier.id ? (
                        <span className="ap-actions">
                          <span className="sc-del-ask">삭제할까요?</span>
                          <button type="button" className="ap-btn is-ghost" onClick={() => setDeletingId(null)} disabled={isDeleting}>취소</button>
                          <button type="button" className="ap-btn is-danger" onClick={() => handleDelete(carrier)} disabled={isDeleting}>
                            {isDeleting ? '삭제 중…' : '삭제'}
                          </button>
                        </span>
                      ) : (
                        <span className="ap-actions">
                          <button type="button" className="ap-btn is-ghost" onClick={() => startEditing(carrier)}>
                            <PencilSimple size={13} weight="bold" /> 수정
                          </button>
                          <button type="button" className="ap-btn is-ghost sc-del-btn"
                            onClick={() => { setEditingId(null); setDeletingId(carrier.id); }}
                            title="이 업체로 발송한 주문이 있으면 삭제할 수 없습니다">
                            <Trash size={13} weight="bold" /> 삭제
                          </button>
                        </span>
                      )}
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
