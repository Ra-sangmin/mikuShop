"use client";

import { useState, useEffect, useRef } from 'react';
// 🌟 글로벌 상수 및 라벨 임포트
import { DELIVERY_STATUS, DeliveryStatus } from '@/src/types/order';

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
        const deliveryOrders = data.orders.filter((dbOrder: any) => dbOrder.status === '국제배송');
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
    const updates = orders.filter(order => changedOrderIds.has(order.id));

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
    <div style={ds.container}>
      
      {/* 🌟 상단 액션바 (검색, 필터 + 동기화, 저장) */}
      <div style={ds.actionBar}>
        <div style={ds.filterGroup}>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={ds.selectInput}
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
            style={ds.searchInput}
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
            style={changedOrderIds.size > 0 ? ds.btnSaveActive : ds.btnSaveDisabled}
          >
            {isSaving ? '저장 중...' : `상태 저장 (${changedOrderIds.size}건)`}
          </button>
        </div>
      </div>

      {/* 🌟 테이블 영역 */}
      <div style={ds.tableWrapper}>
        <table style={ds.table}>
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
            <tr style={ds.tableHeadRow}>
              <th style={ds.thResizable}>
                <div onMouseDown={(e) => onMouseDown('date', 'left', e)} style={ds.resizeHandleLeft} onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                주문일시 / ID
                <div onMouseDown={(e) => onMouseDown('date', 'right', e)} style={ds.resizeHandleRight} onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
              <th style={ds.thResizable}>
                <div onMouseDown={(e) => onMouseDown('user', 'left', e)} style={ds.resizeHandleLeft} onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                주문자
                <div onMouseDown={(e) => onMouseDown('user', 'right', e)} style={ds.resizeHandleRight} onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
              <th style={ds.thResizable}>
                <div onMouseDown={(e) => onMouseDown('address', 'left', e)} style={ds.resizeHandleLeft} onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                수취인 주소
                <div onMouseDown={(e) => onMouseDown('address', 'right', e)} style={ds.resizeHandleRight} onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
              <th style={ds.thResizable}>
                <div onMouseDown={(e) => onMouseDown('product', 'left', e)} style={ds.resizeHandleLeft} onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                상품명
                <div onMouseDown={(e) => onMouseDown('product', 'right', e)} style={ds.resizeHandleRight} onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
              <th style={ds.thResizable}>
                <div onMouseDown={(e) => onMouseDown('tracking', 'left', e)} style={ds.resizeHandleLeft} onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                운송장번호
                <div onMouseDown={(e) => onMouseDown('tracking', 'right', e)} style={ds.resizeHandleRight} onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
              <th style={{ ...ds.thResizable, textAlign: 'center' }}>
                <div onMouseDown={(e) => onMouseDown('status', 'left', e)} style={ds.resizeHandleLeft} onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                배송 상태
                <div onMouseDown={(e) => onMouseDown('status', 'right', e)} style={ds.resizeHandleRight} onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
              <th style={{ padding: '16px 12px', textAlign: 'center', position: 'relative' }}>
                <div onMouseDown={(e) => onMouseDown('manage', 'left', e)} style={ds.resizeHandleLeft} onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                관리
                <div onMouseDown={(e) => onMouseDown('manage', 'right', e)} style={ds.resizeHandleRight} onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
            </tr>
          </thead>
          <tbody>
            {!isLoading ? (
              renderedOrders.length > 0 ? renderedOrders.map((order) => {
                const statusStyle = getStatusColor(order.status);
                const isChanged = changedOrderIds.has(order.id);

                return (
                  <tr key={order.id} style={{ ...ds.tableBodyRow, backgroundColor: isChanged ? '#f0fdf4' : 'transparent' }}>
                    <td style={ds.td}>
                      <div style={ds.subText}>{order.date}</div>
                      <div style={{ fontWeight: '600', color: colors.textMain }}>{order.id}</div>
                    </td>
                    <td style={{ ...ds.td, fontWeight: '500' }}>{order.user}</td>
                    <td style={{ ...ds.td, fontSize: '13px' }}>
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
                    <td style={ds.td}>
                      <div style={ds.productTitle}>{order.product}</div>
                    </td>
                    <td style={{ ...ds.td, fontWeight: '600', color: '#4b5563' }}>{order.trackingNo}</td>
                    <td style={{ ...ds.td, textAlign: 'center' }}>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        style={{ 
                          ...ds.statusSelect,
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
                      <button style={ds.btnDetail}>추적하기</button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} style={ds.emptyTd}>표시할 배송 내역이 없습니다.</td>
                </tr>
              )
            ) : (
              <tr>
                <td colSpan={7} style={ds.emptyTd}>데이터를 불러오는 중입니다...</td>
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

const mixins = {
  flexBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,
};

const baseTh: React.CSSProperties = { padding: '16px 12px' };
const baseTd: React.CSSProperties = { padding: '16px 12px', borderRight: `1px solid ${colors.border}` };

const ds: Record<string, React.CSSProperties> = {
  // 메인 컨테이너
  container: {
    backgroundColor: colors.white,
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    border: `1px solid ${colors.border}`,
    padding: '24px',
  },
  
  // 상단 액션바
  actionBar: {
    ...mixins.flexBetween,
    marginBottom: '24px',
  },
  filterGroup: {
    display: 'flex',
    gap: '12px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
  },
  
  // 입력 폼
  selectInput: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: `1px solid ${colors.borderInput}`,
    outline: 'none',
    backgroundColor: colors.bgHead,
    color: colors.textDark,
  },
  searchInput: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: `1px solid ${colors.borderInput}`,
    outline: 'none',
    width: '300px',
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
  btnSaveDisabled: {
    padding: '8px 16px',
    backgroundColor: colors.borderDark,
    color: colors.emptyText,
    borderRadius: '8px',
    fontWeight: '600',
    border: 'none',
    cursor: 'not-allowed',
    transition: 'all 0.2s',
  },
  btnSaveActive: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: colors.white,
    borderRadius: '8px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)',
  },
  btnDetail: {
    padding: '6px 12px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.borderInput}`,
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
    color: colors.textDark,
  },

  // 테이블
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    borderCollapse: 'collapse',
    textAlign: 'left',
    tableLayout: 'fixed',
    border: `1px solid ${colors.borderDark}`,
    width: 'max-content',
  },
  tableHeadRow: {
    borderBottom: `2px solid ${colors.borderDark}`,
    color: colors.textSub,
    fontSize: '14px',
    backgroundColor: colors.bgHead,
  },
  tableBodyRow: {
    borderBottom: `1px solid ${colors.border}`,
    fontSize: '14px',
    color: colors.textDark,
    transition: 'background-color 0.3s',
  },
  
  // 테이블 셀 (TH/TD)
  thResizable: {
    ...baseTh,
    userSelect: 'none',
    position: 'relative',
    borderRight: `1px solid ${colors.borderDark}`,
  },
  td: { ...baseTd },

  // 리사이즈 핸들러
  resizeHandleLeft: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10
  },
  resizeHandleRight: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10
  },

  // 상태 셀렉트
  statusSelect: {
    padding: '6px 12px', 
    borderRadius: '20px', 
    fontSize: '13px', 
    fontWeight: '600',
    outline: 'none',
    cursor: 'pointer',
    textAlign: 'center',
    appearance: 'auto',
  },

  // 텍스트 스타일
  subText: {
    color: colors.emptyText,
    fontSize: '12px',
    marginBottom: '4px',
  },
  productTitle: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  emptyTd: {
    padding: '30px',
    textAlign: 'center',
    color: colors.emptyText,
  },
};