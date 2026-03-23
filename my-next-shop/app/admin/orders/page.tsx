"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
// 🌟 글로벌 상수 및 라벨 임포트
import { ORDER_STATUS, ORDER_STATUS_LABEL, OrderStatus } from '@/src/types/order';

// 🌟 Enum 키를 기반으로 옵션 생성
const statusOptions = Object.keys(ORDER_STATUS).filter(key => key !== 'ALL') as OrderStatus[];

// 🌟 가중치 로직
const statusWeight: Record<string, number> = {
  [ORDER_STATUS.CART]: 1,
  [ORDER_STATUS.FAILED]: 99,
  [ORDER_STATUS.PAID]: 2,
  [ORDER_STATUS.ARRIVED]: 4,
  [ORDER_STATUS.PREPARING]: 5,
  [ORDER_STATUS.PAYMENT_REQ]: 6,
  [ORDER_STATUS.PAYMENT_DONE]: 7,
  [ORDER_STATUS.SHIPPING]: 8
};

export default function OrderManagement() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'default' | 'asc' | 'desc' }>({ key: 'date', direction: 'asc' });

  const persistWidths = true;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    date: 300,
    user: 150,
    address: 350,
    packing: 80,
    product: 600,
    request: 300,
    price: 150,
    status: 200,
    manage: 150
  });

  const [orders, setOrders] = useState<any[]>([]);
  const [originalOrders, setOriginalOrders] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [changedOrderIds, setChangedOrderIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    const isEnabled = localStorage.getItem('admin_persist_column_widths') !== 'false';
    if (!isEnabled) return;
    const savedWidths = localStorage.getItem('admin_orders_column_widths');
    if (savedWidths) {
      try {
        setColumnWidths(JSON.parse(savedWidths));
      } catch (e) {
        console.error("Failed to parse column widths", e);
      }
    }
  }, []);

  const saveColumnWidths = (widths: Record<string, number>) => {
    if (persistWidths) localStorage.setItem('admin_orders_column_widths', JSON.stringify(widths));
  };

  const getVisibleColumns = () => {
    const cols = ['date', 'user', 'address'];
    if (statusFilter === ORDER_STATUS.ARRIVED) cols.push('packing');
    cols.push('product', 'request', 'price', 'status', 'manage');
    return cols;
  };

  const onMouseDown = (key: string, side: 'left' | 'right', e: React.MouseEvent) => {
    let targetKey = key;
    if (side === 'left') {
      const visibleCols = getVisibleColumns();
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
      setColumnWidths(prev => { saveColumnWidths(prev); return prev; });
    }
    resizingRef.current = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/admin/orders');
        const data = await res.json();

        if (data.success) {
          const tempOrders = data.orders.map((dbOrder: any) => ({
            id: dbOrder.orderId, 
            date: new Date(dbOrder.registeredAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
            user: dbOrder.user?.name || '알 수 없음',
            address: dbOrder.addressId ? (dbOrder.user?.addresses?.find((a: any) => a.id === dbOrder.addressId) || null) : null,
            addressId: dbOrder.addressId, 
            recipient: dbOrder.recipient || '',
            source: '기본구매처',
            product: dbOrder.productName,
            jpy: dbOrder.productPrice.toLocaleString(),
            krw: Math.round(dbOrder.productPrice * 9.05).toLocaleString(),
            status: dbOrder.status,
            secondPaymentAmount: dbOrder.secondPaymentAmount || 0,
            trackingNo: dbOrder.trackingNo || '',
            option: dbOrder.productOption || '-',
            productUrl: dbOrder.productUrl || '',
            productRequest: dbOrder.productRequest || '-',
            serviceRequest: dbOrder.serviceRequest || '-',
            bundleId: dbOrder.bundleId || ''
          }));
          setOrders(tempOrders);
          setOriginalOrders(tempOrders);

          const ordersNeedingAddress = tempOrders.filter((o: any) => o.addressId && !o.address);
          
          if (ordersNeedingAddress.length > 0) {
            const uniqueAddressIds = Array.from(new Set(ordersNeedingAddress.map((o: any) => o.addressId)));
            await Promise.all(uniqueAddressIds.map(async (addressId) => {
              try {
                const addrRes = await fetch(`/api/addresses?id=${addressId}`);
                const addrData = await addrRes.json();
                if (addrData.success) {
                  const fetchedAddress = addrData.address || (addrData.addresses && addrData.addresses[0]);
                  if (fetchedAddress) {
                    setOrders((prevOrders: any) => prevOrders.map((o: any) => o.addressId === addressId ? { ...o, address: fetchedAddress } : o));
                    setOriginalOrders((prevOrders: any) => prevOrders.map((o: any) => o.addressId === addressId ? { ...o, address: fetchedAddress } : o));
                  }
                }
              } catch (err) {
                console.error(`주소 정보 불러오기 실패 (ID: ${addressId}):`, err);
              }
            }));
          }
        }
      } catch (error) {
        console.error("데이터 가져오기 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [router]);

  const handleStatusChange = (orderId: string, newStatus: string) => {
    const currentOrder = orders.find(o => o.id === orderId);
    if (!currentOrder) return;

    if (newStatus === ORDER_STATUS.PAYMENT_REQ && currentOrder.bundleId) {
      const bundleItems = orders.filter(o => o.bundleId === currentOrder.bundleId);
      const originalAmount = bundleItems.reduce((sum, o) => sum + (o.secondPaymentAmount || 0), 0);
      const amount = prompt(`합배송 그룹 전체에 대한 2차 결제 금액(₩)을 입력해주세요:\n(그룹 내 상품 수: ${bundleItems.length}개)`, originalAmount.toString());
      if (amount === null) return;

      const numAmount = parseInt(amount.replace(/[^0-9]/g, '')) || 0;
      setOrders(orders.map(order => {
        if (order.bundleId === currentOrder.bundleId) {
          const isFirstInBundle = bundleItems[0].id === order.id;
          return { ...order, status: newStatus, secondPaymentAmount: isFirstInBundle ? numAmount : 0 };
        }
        return order;
      }));

      setChangedOrderIds(prev => {
        const newSet = new Set(prev);
        bundleItems.forEach(item => newSet.add(item.id));
        return newSet;
      });
      return;
    }

    if (newStatus === ORDER_STATUS.PREPARING && currentOrder.bundleId) {
      const bundleItems = orders.filter(o => o.bundleId === currentOrder.bundleId);
      setOrders(orders.map(order => {
        if (order.bundleId === currentOrder.bundleId) {
          return { ...order, status: newStatus, secondPaymentAmount: 0 };
        }
        return order;
      }));
      setChangedOrderIds(prev => {
        const newSet = new Set(prev);
        bundleItems.forEach(item => newSet.add(item.id));
        return newSet;
      });
      return;
    }

    if (newStatus === ORDER_STATUS.PAYMENT_REQ && currentOrder.status === ORDER_STATUS.PREPARING) {
      const amount = prompt("2차 결제 금액(₩)을 입력해주세요:", currentOrder.secondPaymentAmount.toString());
      if (amount === null) return;

      const numAmount = parseInt(amount.replace(/[^0-9]/g, '')) || 0;
      setOrders(orders.map(order => order.id === orderId ? { ...order, status: newStatus, secondPaymentAmount: numAmount } : order));
      setChangedOrderIds(prev => { const newSet = new Set(prev); newSet.add(orderId); return newSet; });
      return;
    }

    if (newStatus === ORDER_STATUS.SHIPPING) {
      const trackingNo = prompt("송장번호를 입력해주세요:", currentOrder.trackingNo || '');
      if (trackingNo === null) return;

      setOrders(orders.map(order => order.id === orderId ? { ...order, status: newStatus, trackingNo: trackingNo } : order));
      setChangedOrderIds(prev => { const newSet = new Set(prev); newSet.add(orderId); return newSet; });
      return;
    }

    setOrders(orders.map(order => order.id === orderId ? { ...order, status: newStatus } : order));
    
    setChangedOrderIds(prev => {
      const newSet = new Set(prev);
      const originalOrder = originalOrders.find(o => o.id === orderId);
      const updatedOrder = orders.find(o => o.id === orderId);
      
      if (originalOrder?.status !== newStatus || originalOrder?.secondPaymentAmount !== updatedOrder?.secondPaymentAmount) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId); 
      }
      return newSet;
    });
  };

  const handleSecondPaymentChange = (orderId: string, value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, '')) || 0;
    setOrders(orders.map(order => order.id === orderId ? { ...order, secondPaymentAmount: numValue } : order));

    setChangedOrderIds(prev => {
      const newSet = new Set(prev);
      const originalOrder = originalOrders.find(o => o.id === orderId);
      if (originalOrder?.secondPaymentAmount !== numValue || originalOrder?.status !== orders.find(o => o.id === orderId)?.status) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
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
        body: JSON.stringify({ updates })
      });

      if (res.ok) {
        alert("성공적으로 저장되었습니다!");
        window.location.reload(); // 단순화를 위해 리로드 처리 (필요시 기존 fetch로직 복구)
      } else {
        alert("저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("통신 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSort = (key: string) => {
    let direction: 'asc' | 'desc' | 'default' = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = 'default';
    }
    setSortConfig({ key, direction });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case ORDER_STATUS.CART: return { bg: '#f8fafc', text: '#64748b', border: '#cbd5e1' };
      case ORDER_STATUS.FAILED: return { bg: '#fef2f2', text: '#ef4444', border: '#fca5a5' };
      case ORDER_STATUS.PAID: return { bg: '#eff6ff', text: '#3b82f6', border: '#93c5fd' };
      case ORDER_STATUS.ARRIVED: return { bg: '#f0fdf4', text: '#22c55e', border: '#86efac' };
      case ORDER_STATUS.PREPARING: return { bg: '#f5f3ff', text: '#8b5cf6', border: '#c4b5fd' };
      case ORDER_STATUS.PAYMENT_REQ: return { bg: '#fff7ed', text: '#ea580c', border: '#fdba74' };
      case ORDER_STATUS.PAYMENT_DONE: return { bg: '#f0fdfa', text: '#0d9488', border: '#5eead4' };
      case ORDER_STATUS.SHIPPING: return { bg: '#eef2ff', text: '#4f46e5', border: '#a5b4fc' };
      default: return { bg: '#f8fafc', text: '#64748b', border: '#cbd5e1' };
    }
  };

  const getRenderedOrders = () => {
    let result = [...orders];
    if (statusFilter === '전체') {
      const excludeStatuses = [ORDER_STATUS.CART, ORDER_STATUS.FAILED, ORDER_STATUS.SHIPPING, '국내통관중', '국내배송중', '배송완료'];
      result = result.filter(order => !excludeStatuses.includes(order.status) || changedOrderIds.has(order.id));
    } else if (statusFilter === ORDER_STATUS.SHIPPING) {
      const shippingStatuses = [ORDER_STATUS.SHIPPING, '국내통관중', '국내배송중', '배송완료'];
      result = result.filter(order => shippingStatuses.includes(order.status) || changedOrderIds.has(order.id));
    } else {
      result = result.filter(order => order.status === statusFilter || changedOrderIds.has(order.id));
    }

    if (searchTerm.trim() !== '') {
      result = result.filter(order => order.id.toLowerCase().includes(searchTerm.toLowerCase()) || order.user.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (sortConfig.direction !== 'default') {
      result.sort((a, b) => {
        if (sortConfig.key === 'status') {
          const weightA = statusWeight[a.status] || 99;
          const weightB = statusWeight[b.status] || 99;
          return sortConfig.direction === 'asc' ? weightA - weightB : weightB - weightA;
        } else if (sortConfig.key === 'date') {
          const bundleA = a.bundleId || '';
          const bundleB = b.bundleId || '';
          if (bundleA !== bundleB) {
            return sortConfig.direction === 'asc' ? bundleA.localeCompare(bundleB) : bundleB.localeCompare(bundleA);
          }
          return sortConfig.direction === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
        }
        return 0;
      });
    }
    return result;
  };

  const renderedOrders = getRenderedOrders();

  return (
    <div style={os.container}>
      
      {/* 🌟 1. 상단 액션바 (필터 + 버튼들) */}
      <div style={os.actionBar}>
        <div style={os.filterGroup}>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={os.selectInput}
          >
            <option value="전체">전체 상태 ( 장바구니, 구매실패, 국제배송 제외 )</option>
            {statusOptions.map(key => (
              <option key={key} value={key}>{ORDER_STATUS_LABEL[key]}</option>
            ))}
          </select>
          <input 
            type="text" 
            placeholder="주문번호(ID) 또는 주문자명 검색..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={os.searchInput}
          />
        </div>

        <div style={os.buttonGroup}>
          <button onClick={() => setShowDebug(!showDebug)} style={os.btnDebug}>
            🛠️ 디버그 {showDebug ? '끄기' : '켜기'}
          </button>
          <button 
            onClick={handleSaveChanges}
            disabled={changedOrderIds.size === 0 || isSaving}
            style={changedOrderIds.size > 0 ? os.btnSaveActive : os.btnSaveDisabled}
          >
            {isSaving ? '저장 중...' : `변경사항 저장 (${changedOrderIds.size}건)`}
          </button>
        </div>
      </div>

      {/* 🌟 2. 테이블 영역 */}
      <div style={os.tableWrapper}>
        <table style={os.table}>
          <colgroup>
            <col style={{ width: columnWidths.date }} />
            <col style={{ width: columnWidths.user }} />
            <col style={{ width: columnWidths.address }} />
            {statusFilter === ORDER_STATUS.ARRIVED && <col style={{ width: columnWidths.packing }} />}
            <col style={{ width: columnWidths.product }} />
            <col style={{ width: columnWidths.request }} />
            <col style={{ width: columnWidths.price }} />
            <col style={{ width: columnWidths.status }} />
            <col style={{ width: columnWidths.manage }} />
          </colgroup>
          <thead>
            <tr style={os.tableHeadRow}>
              {/* 날짜 / ID */}
              <th style={os.thResizable}>
                <div onMouseDown={(e) => onMouseDown('date', 'left', e)} style={os.resizeHandleLeft} onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                <div onClick={() => toggleSort('date')} style={{ cursor: 'pointer' }}>
                  주문일시 / ID
                  <span style={{ ...os.sortIcon, color: sortConfig.key === 'date' && sortConfig.direction !== 'default' ? colors.accent : colors.emptyText }}>
                    {sortConfig.key === 'date' && sortConfig.direction === 'asc' ? '▲' : sortConfig.key === 'date' && sortConfig.direction === 'desc' ? '▼' : '↕'}
                  </span>
                </div>
                <div onMouseDown={(e) => onMouseDown('date', 'right', e)} style={os.resizeHandleRight} onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>

              {/* 주문자 */}
              <th style={os.thResizable}>
                <div onMouseDown={(e) => onMouseDown('user', 'left', e)} style={os.resizeHandleLeft} onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                주문자
                <div onMouseDown={(e) => onMouseDown('user', 'right', e)} style={os.resizeHandleRight} onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>

              {/* 수취인 주소 */}
              <th style={os.thResizable}>
                <div onMouseDown={(e) => onMouseDown('address', 'left', e)} style={os.resizeHandleLeft} onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                수취인 주소
                <div onMouseDown={(e) => onMouseDown('address', 'right', e)} style={os.resizeHandleRight} onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
              
              {/* 포장 (조건부) */}
              {statusFilter === ORDER_STATUS.ARRIVED && (
                <th style={{ ...os.thResizable, textAlign: 'center' }}>
                  <div onMouseDown={(e) => onMouseDown('packing', 'left', e)} style={os.resizeHandleLeft} onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                  포장
                  <div onMouseDown={(e) => onMouseDown('packing', 'right', e)} style={os.resizeHandleRight} onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
                </th>
              )}
              
              {/* 상품 정보 */}
              <th style={os.thResizable}>
                <div onMouseDown={(e) => onMouseDown('product', 'left', e)} style={os.resizeHandleLeft} onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                상품 정보
                <div onMouseDown={(e) => onMouseDown('product', 'right', e)} style={os.resizeHandleRight} onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
              
              {/* 요청/서비스 */}
              <th style={os.thResizable}>
                <div onMouseDown={(e) => onMouseDown('request', 'left', e)} style={os.resizeHandleLeft} onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                요청/서비스
                <div onMouseDown={(e) => onMouseDown('request', 'right', e)} style={os.resizeHandleRight} onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
              
              {/* 가격 */}
              <th style={{ ...os.thResizable, textAlign: 'right' }}>
                <div onMouseDown={(e) => onMouseDown('price', 'left', e)} style={os.resizeHandleLeft} onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                상품가격 (₩)
                <div onMouseDown={(e) => onMouseDown('price', 'right', e)} style={os.resizeHandleRight} onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
              
              {/* 진행 상태 */}
              <th style={{ ...os.thResizable, textAlign: 'center' }}>
                <div onMouseDown={(e) => onMouseDown('status', 'left', e)} style={os.resizeHandleLeft} onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                <div onClick={() => toggleSort('status')} style={{ cursor: 'pointer' }}>
                  진행 상태 (변경가능) 
                  <span style={{ ...os.sortIcon, color: sortConfig.key === 'status' && sortConfig.direction !== 'default' ? colors.accent : colors.emptyText }}>
                    {sortConfig.key === 'status' && sortConfig.direction === 'asc' ? '▲' : sortConfig.key === 'status' && sortConfig.direction === 'desc' ? '▼' : '↕'}
                  </span>
                </div>
                <div onMouseDown={(e) => onMouseDown('status', 'right', e)} style={os.resizeHandleRight} onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>

              {/* 관리 */}
              <th style={{ padding: '16px 12px', textAlign: 'center', position: 'relative' }}>
                <div onMouseDown={(e) => onMouseDown('manage', 'left', e)} style={os.resizeHandleLeft} onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                관리
                <div onMouseDown={(e) => onMouseDown('manage', 'right', e)} style={os.resizeHandleRight} onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
            </tr>
          </thead>
          <tbody>
            {renderedOrders.map((order) => {
              const statusStyle = getStatusColor(order.status);
              const isChanged = changedOrderIds.has(order.id);
              const originalStatus = originalOrders.find(o => o.id === order.id)?.status as OrderStatus;

              return (
                <tr key={order.id} style={{ ...os.tableBodyRow, backgroundColor: isChanged ? '#f0fdf4' : 'transparent' }}>
                  <td style={os.td}>
                    <div style={os.subText}>{order.date}</div>
                    <div style={{ fontWeight: '600', color: colors.textMain, marginBottom: '2px' }}>{order.id}</div>
                    {order.bundleId && (
                      <div style={{ fontSize: '11px', color: '#f97316', fontWeight: '700' }}>
                        <span style={{ color: colors.textSub, fontWeight: '400' }}>Bundle:</span> {order.bundleId}
                      </div>
                    )}
                  </td>
                  <td style={{ ...os.td, fontWeight: '500' }}>{order.user}</td>
                  <td style={{ ...os.td, fontSize: '13px' }}>
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
                  
                  {statusFilter === ORDER_STATUS.ARRIVED && (
                    <td style={{ ...os.td, textAlign: 'center' }}>
                      <button
                        onClick={async () => {
                          if (confirm('이 주문에 대해 포장 요청을 하시겠습니까?')) {
                            try {
                              const res = await fetch('/api/admin/orders', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ updates: [{ id: order.id, status: '배송 준비중' }] })
                              });
                              if (res.ok) {
                                alert('포장 요청(배송 준비중)으로 변경되었습니다.');
                                window.location.reload();
                              } else alert('처리 중 오류가 발생했습니다.');
                            } catch (error) {
                              alert('통신 오류가 발생했습니다.');
                            }
                          }
                        }}
                        style={os.btnPacking}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.accent}
                      >
                        개별 포장 요청
                      </button>
                    </td>
                  )}
                  
                  <td style={{ ...os.td, maxWidth: '300px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      <span style={os.sourceBadge}>{order.source}</span>
                      {order.productUrl && (
                        <a href={order.productUrl} target="_blank" rel="noopener noreferrer" style={os.urlLink}>[URL]</a>
                      )}
                    </div>
                    <div style={os.productTitle}>{order.product}</div>
                    <div style={{ fontSize: '12px', color: colors.textSub }}>옵션: {order.option}</div>
                  </td>
                  
                  <td style={os.td}>
                    <div style={{ fontSize: '12px', marginBottom: '4px' }}><span style={{ fontWeight: '600' }}>요청:</span> {order.productRequest}</div>
                    <div style={{ fontSize: '12px', color: '#6366f1' }}><span style={{ fontWeight: '600' }}>서비스:</span> {order.serviceRequest}</div>
                  </td>
                  
                  <td style={{ ...os.td, textAlign: 'right', fontWeight: '700', color: colors.textMain }}>₩{order.krw}</td>
                  
                  <td style={{ ...os.td, textAlign: 'center' }}>
                    {(isChanged && originalStatus !== order.status) && (
                      <div style={os.statusChangeIndicator}>
                        <span style={{ color: colors.emptyText, textDecoration: 'line-through' }}>
                          {ORDER_STATUS_LABEL[originalStatus]}
                        </span>
                        <span>➔</span>
                      </div>
                    )}

                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      style={{ 
                        ...os.statusSelect,
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.text,
                        border: `1px solid ${statusStyle.border}`,
                      }}
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status} style={{ backgroundColor: colors.white, color: colors.textMain }}>
                          {ORDER_STATUS_LABEL[status]}
                        </option>
                      ))}
                    </select>

                    {order.status === ORDER_STATUS.PAYMENT_REQ && (
                      <div style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '11px', color: colors.textSub, marginBottom: '4px', fontWeight: '600' }}>2차 결제금액(₩)</div>
                        <input 
                          type="text" 
                          value={order.secondPaymentAmount.toLocaleString()}
                          onChange={(e) => handleSecondPaymentChange(order.id, e.target.value)}
                          disabled={order.bundleId && orders.some(o => o.bundleId === order.bundleId && o.id !== order.id && o.secondPaymentAmount > 0)}
                          style={{
                            ...os.paymentInput,
                            backgroundColor: (order.bundleId && orders.some(o => o.bundleId === order.bundleId && o.id !== order.id && o.secondPaymentAmount > 0)) ? colors.border : colors.white,
                            cursor: (order.bundleId && orders.some(o => o.bundleId === order.bundleId && o.id !== order.id && o.secondPaymentAmount > 0)) ? 'not-allowed' : 'text'
                          }}
                        />
                        {order.bundleId && orders.some(o => o.bundleId === order.bundleId && o.id !== order.id && o.secondPaymentAmount > 0) && (
                          <div style={{ fontSize: '10px', color: colors.emptyText, marginTop: '2px' }}>합배송 금액이 다른 상품에 입력됨</div>
                        )}
                      </div>
                    )}
                  </td>
                  
                  <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                    <button style={os.btnDetail}>상세보기</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* 🌟 3. 디버그 패널 */}
      {showDebug && (
        <div style={os.debugPanel}>
          <h3 style={{ fontSize: '16px', color: colors.textDark, marginBottom: '16px' }}>🛠️ 내부 데이터 상태 (디버그)</h3>
          <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
            <pre style={os.debugPre}>
              <strong style={{ color: colors.white }}>[📦 렌더링 중인 orders 데이터]</strong>{"\n"}
              {JSON.stringify(renderedOrders, null, 2)}
            </pre>
            <pre style={{ ...os.debugPre, color: '#86efac' }}>
              <strong style={{ color: colors.white }}>[🔄 변경된 order IDs]</strong>{"\n"}
              {JSON.stringify(Array.from(changedOrderIds), null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 🎨 스타일 정의 영역 (Order Styles: os)
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

const os: Record<string, React.CSSProperties> = {
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
  paymentInput: {
    width: '100px', 
    padding: '4px 8px', 
    borderRadius: '4px', 
    border: `1px solid ${colors.borderInput}`, 
    fontSize: '12px', 
    textAlign: 'right', 
    outline: 'none',
  },
  
  // 버튼들
  btnDebug: {
    padding: '8px 16px',
    backgroundColor: colors.textDark,
    color: colors.white,
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    border: 'none',
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
  btnPacking: {
    padding: '6px 12px',
    backgroundColor: colors.accent,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
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
  
  // 상태 변경 관련
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
  statusChangeIndicator: {
    fontSize: '11px',
    color: '#ef4444',
    marginBottom: '6px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },
  
  // 기타 디테일
  sortIcon: {
    marginLeft: '6px',
    fontSize: '12px',
  },
  subText: {
    color: colors.emptyText,
    fontSize: '12px',
    marginBottom: '4px',
  },
  sourceBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    backgroundColor: colors.borderDark,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#475569',
  },
  urlLink: {
    fontSize: '11px',
    color: colors.accent,
    textDecoration: 'none',
  },
  productTitle: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontWeight: '600',
    marginBottom: '2px',
  },
  
  // 디버그 패널
  debugPanel: {
    marginTop: '30px',
    borderTop: `2px dashed ${colors.borderInput}`,
    paddingTop: '20px',
  },
  debugPre: {
    backgroundColor: '#1e293b',
    color: '#a5b4fc',
    padding: '16px',
    borderRadius: '8px',
    overflowX: 'auto',
    fontSize: '12px',
    lineHeight: '1.5',
    margin: 0,
  },
};