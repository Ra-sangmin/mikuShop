"use client";

import { useState, useEffect, useRef } from 'react';
// 🌟 글로벌 상수 및 라벨 임포트
import { DELIVERY_STATUS, DeliveryStatus, ORDER_STATUS } from '@/src/types/order';
import '../admin-common.css';

// 🌟 Enum 키를 기반으로 옵션 생성
const deliveryStatusOptions = Object.keys(DELIVERY_STATUS) as DeliveryStatus[];

export default function DeliveryManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  
  const [orders, setOrders] = useState<any[]>([]);
  const [originalOrders, setOriginalOrders] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [changedOrderIds, setChangedOrderIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const persistWidths = true;

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    date: 300,
    user: 150,
    address: 350,
    product: 600,
    tracking: 300,
    status: 200,
    manage: 150
  });

  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  // 🌟 표 전체 너비 = 각 열 너비의 합. table-layout: fixed가 동작하려면 확정된 값이 필요합니다.
  const totalTableWidth = Object.values(columnWidths).reduce((sum, w) => sum + (Number(w) || 0), 0);

  useEffect(() => {
    const isEnabled = localStorage.getItem('admin_persist_column_widths') !== 'false';
    if (!isEnabled) return;
    const savedWidths = localStorage.getItem('admin_delivery_column_widths');
    if (savedWidths) {
      try {
        setColumnWidths(JSON.parse(savedWidths));
      } catch (e) {
        console.error("Failed to parse column widths", e);
      }
    }
  }, []);

  const saveColumnWidths = (widths: Record<string, number>) => {
    if (persistWidths) {
      localStorage.setItem('admin_delivery_column_widths', JSON.stringify(widths));
    }
  };

  const onMouseDown = (key: string, side: 'left' | 'right', e: React.MouseEvent) => {
    let targetKey = key;
    const visibleCols = ['date', 'user', 'address', 'product', 'tracking', 'status', 'manage'];

    if (side === 'left') {
      const colIndex = visibleCols.indexOf(key);
      if (colIndex > 0) targetKey = visibleCols[colIndex - 1];
      else return;
    }

    resizingRef.current = { key: targetKey, startX: e.pageX, startWidth: columnWidths[targetKey] };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { key, startX, startWidth } = resizingRef.current;
    const deltaX = e.pageX - startX;
    setColumnWidths(prev => ({ ...prev, [key]: Math.max(50, startWidth + deltaX) }));
  };

  const onMouseUp = () => {
    if (resizingRef.current) {
      setColumnWidths(prev => {
        saveColumnWidths(prev);
        return prev;
      });
    }
    resizingRef.current = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/orders');
      const data = await res.json();
      if (data.success) {
        // 🐛 status는 Prisma enum('SHIPPING')으로 내려옵니다. 한글 라벨('국제배송')과 비교하면
        //    영원히 일치하지 않아 배송 현황 목록이 항상 비어 있었습니다.
        const deliveryOrders = data.orders.filter((dbOrder: any) => dbOrder.status === ORDER_STATUS.SHIPPING);
        const formattedOrders = deliveryOrders.map((dbOrder: any) => ({
          id: dbOrder.orderId, 
          date: new Date(dbOrder.registeredAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
          user: dbOrder.user?.name || '알 수 없음',
          address: dbOrder.addressId 
            ? (dbOrder.user?.addresses?.find((a: any) => a.id === dbOrder.addressId) || null)
            : null,
          recipient: dbOrder.recipient || '',
          product: dbOrder.productName,
          status: dbOrder.deliveryStatus || DELIVERY_STATUS.PREPARING,
          trackingNo: dbOrder.trackingNo || '-',
        }));
        setOrders(formattedOrders);
        setOriginalOrders(formattedOrders);
      }
    } catch (error) {
      console.error("데이터 가져오기 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/orders/sync-tracking', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        alert(data.message);
        if (data.updatedCount > 0) fetchOrders();
      } else {
        alert(data.error || "동기화 실패");
      }
    } catch (error) {
      alert("서버 통신 오류가 발생했습니다.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStatusChange = (orderId: string, newStatus: string) => {
    setOrders(orders.map(order => order.id === orderId ? { ...order, status: newStatus } : order));
    
    setChangedOrderIds(prev => {
      const newSet = new Set(prev);
      const originalStatus = originalOrders.find(o => o.id === orderId)?.status;
      if (originalStatus !== newStatus) newSet.add(orderId);
      else newSet.delete(orderId); 
      return newSet;
    });
  };

  const handleSaveChanges = async () => {
    if (changedOrderIds.size === 0) return;
    setIsSaving(true);
    // 🐛 trackingNo는 화면 표시용으로 null을 '-'로 바꿔 두었습니다. 그대로 보내면 '-'가
    //    실제 송장번호로 DB에 저장되고, sync-tracking이 이를 유효한 송장으로 취급합니다.
    //    저장할 때는 표시용 placeholder를 다시 null로 되돌립니다.
    const updates = orders
      .filter(order => changedOrderIds.has(order.id))
      .map(order => ({
        ...order,
        trackingNo: order.trackingNo === '-' || order.trackingNo?.trim() === '' ? null : order.trackingNo,
      }));

    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, type: 'delivery' })
      });

      if (res.ok) {
        alert("성공적으로 저장되었습니다!");
        setChangedOrderIds(new Set()); 
        setOriginalOrders(orders); 
      } else {
        alert("저장에 실패했습니다.");
      }
    } catch (error) {
      alert("통신 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case DELIVERY_STATUS.PREPARING: return { bg: '#eef2ff', text: '#4f46e5', border: '#a5b4fc' };
      case DELIVERY_STATUS.CUSTOMS: return { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' };
      case DELIVERY_STATUS.LOCAL_DELIVERY: return { bg: '#fdf4ff', text: '#9333ea', border: '#f5d0fe' };
      case DELIVERY_STATUS.COMPLETED: return { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' };
      default: return { bg: '#f8fafc', text: '#64748b', border: '#cbd5e1' };
    }
  };

  const getRenderedOrders = () => {
    let result = orders.filter(order => deliveryStatusOptions.includes(order.status));
    if (statusFilter === '전체') {
      result = result.filter(order => order.status !== DELIVERY_STATUS.COMPLETED || changedOrderIds.has(order.id));
    } else {
      result = result.filter(order => order.status === statusFilter || changedOrderIds.has(order.id));
    }
    if (searchTerm.trim() !== '') {
      result = result.filter(order => 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        order.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.trackingNo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return result;
  };

  const renderedOrders = getRenderedOrders();

  return (
    <div className="admin-container">

      {/* 🌟 상단 액션바 (검색, 필터 + 동기화, 저장) */}
      <div className="admin-action-bar">
        <div style={ds.filterGroup}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-select-input"
          >
            <option value="전체">전체 배송 상태 ( 배송완료 제외 )</option>
            {deliveryStatusOptions.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="주문번호, 주문자명, 운송장번호 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="admin-search-input"
          />
        </div>

        <div style={ds.buttonGroup}>
          <button
            onClick={handleAutoSync}
            disabled={isSyncing}
            style={ds.btnSync}
          >
            {isSyncing ? '조회 중...' : '🚚 배송상태 자동 동기화'}
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={changedOrderIds.size === 0 || isSaving}
            className={changedOrderIds.size > 0 ? 'admin-btn-save-active' : 'admin-btn-save-disabled'}
          >
            {isSaving ? '저장 중...' : `상태 저장 (${changedOrderIds.size}건)`}
          </button>
        </div>
      </div>

      {/* 🌟 테이블 영역 */}
      <div style={ds.tableWrapper}>
        {/* 🐛 table-layout: fixed는 표에 "확정된 너비"가 있어야만 적용됩니다. CSS에는
            width: max-content만 있어서 브라우저가 내용 기준으로 폭을 정했고, 그 결과
            공백 없는 긴 일본어 상품명이 colgroup의 600px을 무시하고 열을 1270px까지
            밀어냈습니다(그래서 핸들을 드래그해도 열이 줄지 않았습니다).
            → 지정한 열 너비의 합을 표 너비로 직접 지정해 fixed 레이아웃을 활성화합니다.
              (열이 고정되면 셀 안의 말줄임(text-overflow: ellipsis)도 비로소 동작합니다) */}
        <table className="admin-table-resizable" style={{ width: totalTableWidth }}>
          <colgroup>
            <col style={{ width: columnWidths.date }} />
            <col style={{ width: columnWidths.user }} />
            <col style={{ width: columnWidths.address }} />
            <col style={{ width: columnWidths.product }} />
            <col style={{ width: columnWidths.tracking }} />
            <col style={{ width: columnWidths.status }} />
            <col style={{ width: columnWidths.manage }} />
          </colgroup>
          <thead>
            <tr className="admin-table-head-row">
              <th className="admin-th-resizable">
                <div onMouseDown={(e) => onMouseDown('date', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                주문일시 / ID
                <div onMouseDown={(e) => onMouseDown('date', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
              <th className="admin-th-resizable">
                <div onMouseDown={(e) => onMouseDown('user', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                주문자
                <div onMouseDown={(e) => onMouseDown('user', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
              <th className="admin-th-resizable">
                <div onMouseDown={(e) => onMouseDown('address', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                수취인 주소
                <div onMouseDown={(e) => onMouseDown('address', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
              <th className="admin-th-resizable">
                <div onMouseDown={(e) => onMouseDown('product', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                상품명
                <div onMouseDown={(e) => onMouseDown('product', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
              <th className="admin-th-resizable">
                <div onMouseDown={(e) => onMouseDown('tracking', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                운송장번호
                <div onMouseDown={(e) => onMouseDown('tracking', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
              <th className="admin-th-resizable" style={{ textAlign: 'center' }}>
                <div onMouseDown={(e) => onMouseDown('status', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                배송 상태
                <div onMouseDown={(e) => onMouseDown('status', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
              <th style={{ padding: '16px 12px', textAlign: 'center', position: 'relative' }}>
                <div onMouseDown={(e) => onMouseDown('manage', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                관리
                <div onMouseDown={(e) => onMouseDown('manage', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
            </tr>
          </thead>
          <tbody>
            {!isLoading ? (
              renderedOrders.length > 0 ? renderedOrders.map((order) => {
                const statusStyle = getStatusColor(order.status);
                const isChanged = changedOrderIds.has(order.id);

                return (
                  <tr key={order.id} className="admin-table-body-row" style={{ backgroundColor: isChanged ? '#f0fdf4' : 'transparent' }}>
                    <td className="admin-base-td">
                      <div className="admin-sub-text">{order.date}</div>
                      <div style={{ fontWeight: '600', color: colors.textMain }}>{order.id}</div>
                    </td>
                    <td className="admin-base-td" style={{ fontWeight: '500' }}>{order.user}</td>
                    <td className="admin-base-td" style={{ fontSize: '13px' }}>
                      {order.address ? (
                        <>
                          <div style={{ fontWeight: '600', color: colors.textMain, marginBottom: '2px' }}>
                            {order.address.recipientName} ({order.address.phone})
                          </div>
                          <div style={{ color: colors.textSub, lineHeight: '1.4' }}>
                            [{order.address.zipCode}] {order.address.address} {order.address.detailAddress}
                          </div>
                          <div style={{ fontSize: '11px', color: colors.accent, marginTop: '2px' }}>
                            통관번호: {order.address.personalCustomsCode}
                          </div>
                        </>
                      ) : (
                        <div style={{ color: colors.emptyText }}>
                          {order.recipient ? `${order.recipient} (주소 정보 없음)` : '배송지 미지정'}
                        </div>
                      )}
                    </td>
                    <td className="admin-base-td">
                      <div style={ds.productTitle}>{order.product}</div>
                    </td>
                    <td className="admin-base-td" style={{ fontWeight: '600', color: '#4b5563' }}>{order.trackingNo}</td>
                    <td className="admin-base-td" style={{ textAlign: 'center' }}>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className="admin-status-select"
                        style={{
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.text,
                          border: `1px solid ${statusStyle.border}`,
                        }}
                      >
                        {deliveryStatusOptions.map(status => (
                          <option key={status} value={status} style={{ backgroundColor: colors.white, color: colors.textMain }}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <button className="admin-btn-detail">추적하기</button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="admin-empty-td">표시할 배송 내역이 없습니다.</td>
                </tr>
              )
            ) : (
              <tr>
                <td colSpan={7} className="admin-empty-td">데이터를 불러오는 중입니다...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// 🎨 스타일 정의 영역 (Delivery Styles: ds)
// ==========================================

const colors = {
  white: '#fff',
  border: '#f1f5f9',
  borderDark: '#e2e8f0',
  borderInput: '#cbd5e1',
  textMain: '#0f172a',
  textSub: '#64748b',
  textDark: '#334155',
  accent: '#3b82f6',
  emptyText: '#94a3b8',
  bgHead: '#f8fafc',
};

const ds: Record<string, React.CSSProperties> = {
  filterGroup: {
    display: 'flex',
    gap: '12px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
  },

  // 버튼들
  btnSync: {
    padding: '8px 16px',
    backgroundColor: colors.accent,
    color: colors.white,
    borderRadius: '8px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
  },

  // 테이블
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
  },

  // 텍스트 스타일
  productTitle: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};