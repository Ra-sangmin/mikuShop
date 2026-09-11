"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
// 🌟 글로벌 상수 및 라벨 임포트
import { ORDER_STATUS, ORDER_STATUS_LABEL, OrderStatus } from '@/src/types/order';
import '../admin-common.css';

// 🌟 Enum 키를 기반으로 옵션 생성
const statusOptions = Object.keys(ORDER_STATUS).filter(key => key !== 'ALL') as OrderStatus[];

// 🌟 mypage/status와 동일하게 합포장(bundleId) 묶음을 한 행으로 표시하는 상태들
const GROUPABLE_STATUSES = [ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING];

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
  const defaultWidths = {
    date: 300, user: 150, address: 350, packing: 80, product: 600, 
    request: 300, price: 150, bidStatus: 120, status: 200, manage: 150
  };
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(defaultWidths);
  const [orders, setOrders] = useState<any[]>([]);
  const [originalOrders, setOriginalOrders] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [changedOrderIds, setChangedOrderIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  // 🌟 합포장(bundleId) 그룹을 mypage/status처럼 한 행으로 펼쳐보기 위한 상태
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());

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
    cols.push('product', 'request', 'price');
    // 🌟 1-3. 경매 상황 탭이거나, 전체 탭에서 경매 상황 주문을 함께 볼 때도 경매 상태 열이 보이도록 추가
    if (statusFilter === ORDER_STATUS.BIDDING || statusFilter === '전체') cols.push('bidStatus');
    cols.push('status', 'manage');
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
            registeredAt: dbOrder.registeredAt,
            user: dbOrder.user?.name || '알 수 없음',
            address: dbOrder.addressId ? (dbOrder.user?.addresses?.find((a: any) => a.id === dbOrder.addressId) || null) : null,
            addressId: dbOrder.addressId, 
            recipient: dbOrder.recipient || '',
            source: '기본구매처',
            product: dbOrder.productName,
            jpy: dbOrder.productPrice.toLocaleString(),
            status: dbOrder.status,
            // 🌟 2-1. bidStatus 맵핑 추가
            bidStatus: dbOrder.bidStatus || 'PENDING',
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

      // 🌟 합포장 주문은 같은 송장번호로 그룹 전체를 함께 변경합니다.
      const bundleIds = currentOrder.bundleId
        ? orders.filter(o => o.bundleId === currentOrder.bundleId).map(o => o.id)
        : [orderId];

      setOrders(orders.map(order => bundleIds.includes(order.id) ? { ...order, status: newStatus, trackingNo: trackingNo } : order));
      setChangedOrderIds(prev => {
        const newSet = new Set(prev);
        bundleIds.forEach(id => newSet.add(id));
        return newSet;
      });
      return;
    }

    // 🌟 합포장 주문은 상태 변경 시 그룹 전체가 함께 이동해야 mypage/status의 합포장 표시가 깨지지 않습니다.
    const bundleIds = currentOrder.bundleId
      ? orders.filter(o => o.bundleId === currentOrder.bundleId).map(o => o.id)
      : [orderId];

    setOrders(orders.map(order => bundleIds.includes(order.id) ? { ...order, status: newStatus } : order));

    setChangedOrderIds(prev => {
      const newSet = new Set(prev);
      bundleIds.forEach(id => {
        const originalOrder = originalOrders.find(o => o.id === id);
        const updatedOrder = orders.find(o => o.id === id);

        if (originalOrder?.status !== newStatus || originalOrder?.secondPaymentAmount !== updatedOrder?.secondPaymentAmount) {
          newSet.add(id);
        } else {
          newSet.delete(id);
        }
      });
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

  // 🌟 경매 상태(bidStatus) 변경 핸들러
  const handleBidStatusChange = (orderId: string, newBidStatus: string) => {
    setOrders(orders.map(order => order.id === orderId ? { ...order, bidStatus: newBidStatus } : order));
    
    setChangedOrderIds(prev => {
      const newSet = new Set(prev);
      const originalOrder = originalOrders.find(o => o.id === orderId);
      const updatedOrder = orders.find(o => o.id === orderId);
      
      // 기존 진행 상태, 2차 결제 금액, 그리고 새로운 경매 상태 중 하나라도 다르면 '변경됨'으로 처리
      if (
        originalOrder?.status !== updatedOrder?.status || 
        originalOrder?.secondPaymentAmount !== updatedOrder?.secondPaymentAmount ||
        originalOrder?.bidStatus !== newBidStatus
      ) {
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
      case ORDER_STATUS.BID_PENDING: return { bg: '#fdf4ff', text: '#c026d3', border: '#f0abfc' };
      case ORDER_STATUS.BIDDING: return { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' };
      case ORDER_STATUS.BID_SUCCESS: return { bg: '#ecfdf5', text: '#059669', border: '#6ee7b7' };
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

  // 🌟 경매 상황 탭이거나, 전체 탭에서 경매 상황 주문의 경매 상태를 함께 관리할 수 있도록 열을 노출합니다.
  const showBidStatusColumn = statusFilter === ORDER_STATUS.BIDDING || statusFilter === '전체';

  // 🌟 배송비 요청/배송비 결제 완료/국제 배송 상태에서, 같은 bundleId(합포장)를 가진 주문들을 한 행으로 합쳐서 보여줍니다.
  const toggleBundleExpand = (bundleId: string) => {
    setExpandedBundles(prev => {
      const next = new Set(prev);
      if (next.has(bundleId)) next.delete(bundleId); else next.add(bundleId);
      return next;
    });
  };

  const getVisibleColumnCount = () => getVisibleColumns().length;

  const displayOrders = (() => {
    const groupsByBundle: Record<string, any[]> = {};
    renderedOrders.forEach(order => {
      if (order.bundleId && GROUPABLE_STATUSES.includes(order.status)) {
        (groupsByBundle[order.bundleId] ||= []).push(order);
      }
    });

    const seenBundles = new Set<string>();
    const result: any[] = [];

    renderedOrders.forEach(order => {
      if (order.bundleId && GROUPABLE_STATUSES.includes(order.status)) {
        if (seenBundles.has(order.bundleId)) return;
        seenBundles.add(order.bundleId);

        const group = groupsByBundle[order.bundleId];
        if (group.length <= 1) {
          result.push(order);
          return;
        }

        // 🌟 2차 결제금액은 bundleItems[0](orders 배열 기준 최초 항목)에만 들어있으므로, 대표 행도 그 항목을 사용합니다.
        const masterId = orders.filter(o => o.bundleId === order.bundleId)[0]?.id;
        const representative = group.find(g => g.id === masterId) || group[0];
        const totalJpy = group.reduce((sum, o) => sum + (parseInt(String(o.jpy).replace(/[^0-9]/g, '')) || 0), 0);
        // 🌟 주문일시는 묶음 내 가장 이른 주문 기준으로 표시합니다.
        const earliestOrder = group.reduce((earliest, o) =>
          new Date(o.registeredAt).getTime() < new Date(earliest.registeredAt).getTime() ? o : earliest
        , group[0]);

        result.push({
          ...representative,
          product: `${representative.product} 외 ${group.length - 1}건`,
          jpy: totalJpy.toLocaleString(),
          date: earliestOrder.date,
          registeredAt: earliestOrder.registeredAt,
          isBundleGroup: true,
          bundleItems: group,
        });
      } else {
        result.push(order);
      }
    });

    return result;
  })();

  return (
    <div className="admin-container">

      {/* 🌟 1. 상단 액션바 (필터 + 버튼들) */}
      <div className="admin-action-bar">
        <div style={os.filterGroup}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-select-input"
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
            className="admin-search-input"
          />
        </div>

        <div style={os.buttonGroup}>
          <button onClick={() => setShowDebug(!showDebug)} style={os.btnDebug}>
            🛠️ 디버그 {showDebug ? '끄기' : '켜기'}
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={changedOrderIds.size === 0 || isSaving}
            className={changedOrderIds.size > 0 ? 'admin-btn-save-active' : 'admin-btn-save-disabled'}
          >
            {isSaving ? '저장 중...' : `변경사항 저장 (${changedOrderIds.size}건)`}
          </button>
        </div>
      </div>

      {/* 🌟 2. 테이블 영역 */}
      <div style={os.tableWrapper}>
        <table className="admin-table-resizable">
          <colgroup>
            <col style={{ width: columnWidths.date }} />
            <col style={{ width: columnWidths.user }} />
            <col style={{ width: columnWidths.address }} />
            {statusFilter === ORDER_STATUS.ARRIVED && <col style={{ width: columnWidths.packing }} />}
            <col style={{ width: columnWidths.product }} />
            <col style={{ width: columnWidths.request }} />
            <col style={{ width: columnWidths.price }} />
            {showBidStatusColumn && <col style={{ width: columnWidths.bidStatus }} />}
            <col style={{ width: columnWidths.status }} />
            <col style={{ width: columnWidths.manage }} />
          </colgroup>
          <thead>
            <tr className="admin-table-head-row">
              {/* 날짜 / ID */}
              <th className="admin-th-resizable">
                <div onMouseDown={(e) => onMouseDown('date', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                <div onClick={() => toggleSort('date')} style={{ cursor: 'pointer' }}>
                  주문일시 / ID
                  <span style={{ ...os.sortIcon, color: sortConfig.key === 'date' && sortConfig.direction !== 'default' ? colors.accent : colors.emptyText }}>
                    {sortConfig.key === 'date' && sortConfig.direction === 'asc' ? '▲' : sortConfig.key === 'date' && sortConfig.direction === 'desc' ? '▼' : '↕'}
                  </span>
                </div>
                <div onMouseDown={(e) => onMouseDown('date', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>

              {/* 주문자 */}
              <th className="admin-th-resizable">
                <div onMouseDown={(e) => onMouseDown('user', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                주문자
                <div onMouseDown={(e) => onMouseDown('user', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>

              {/* 수취인 주소 */}
              <th className="admin-th-resizable">
                <div onMouseDown={(e) => onMouseDown('address', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                수취인 주소
                <div onMouseDown={(e) => onMouseDown('address', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>

              {/* 포장 (조건부) */}
              {statusFilter === ORDER_STATUS.ARRIVED && (
                <th className="admin-th-resizable" style={{ textAlign: 'center' }}>
                  <div onMouseDown={(e) => onMouseDown('packing', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                  포장
                  <div onMouseDown={(e) => onMouseDown('packing', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
                </th>
              )}

              {/* 상품 정보 */}
              <th className="admin-th-resizable">
                <div onMouseDown={(e) => onMouseDown('product', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                상품 정보
                <div onMouseDown={(e) => onMouseDown('product', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>

              {/* 요청/서비스 */}
              <th className="admin-th-resizable">
                <div onMouseDown={(e) => onMouseDown('request', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                요청/서비스
                <div onMouseDown={(e) => onMouseDown('request', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>

              {/* 가격 */}
              <th className="admin-th-resizable" style={{ textAlign: 'right' }}>
                <div onMouseDown={(e) => onMouseDown('price', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                상품가격 (¥)
                <div onMouseDown={(e) => onMouseDown('price', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>

              {/* 🌟 3-2. 경매 상황 탭, 또는 전체 탭에서 경매 상태 헤더 추가 */}
              {showBidStatusColumn && (
                <th className="admin-th-resizable" style={{ textAlign: 'center' }}>
                  <div onMouseDown={(e) => onMouseDown('bidStatus', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                  경매 상태
                  <div onMouseDown={(e) => onMouseDown('bidStatus', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
                </th>
              )}
              {/* 진행 상태 */}
              <th className="admin-th-resizable" style={{ textAlign: 'center' }}>
                <div onMouseDown={(e) => onMouseDown('status', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                <div onClick={() => toggleSort('status')} style={{ cursor: 'pointer' }}>
                  진행 상태 (변경가능)
                  <span style={{ ...os.sortIcon, color: sortConfig.key === 'status' && sortConfig.direction !== 'default' ? colors.accent : colors.emptyText }}>
                    {sortConfig.key === 'status' && sortConfig.direction === 'asc' ? '▲' : sortConfig.key === 'status' && sortConfig.direction === 'desc' ? '▼' : '↕'}
                  </span>
                </div>
                <div onMouseDown={(e) => onMouseDown('status', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>

              {/* 관리 */}
              <th style={{ padding: '16px 12px', textAlign: 'center', position: 'relative' }}>
                <div onMouseDown={(e) => onMouseDown('manage', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                관리
                <div onMouseDown={(e) => onMouseDown('manage', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
              </th>
            </tr>
          </thead>
          <tbody>
            {/* 🌟 경매 상태 영어 -> 한글 변환용 객체 */}
            {displayOrders.map((order) => {
              const statusStyle = getStatusColor(order.status);
              const isChanged = changedOrderIds.has(order.id);
              const originalStatus = originalOrders.find(o => o.id === order.id)?.status as OrderStatus;
              
              // 🌟 원본 경매 상태값 찾기 추가
              const originalBidStatus = originalOrders.find(o => o.id === order.id)?.bidStatus || 'PENDING';
              
              const bidStatusLabels: Record<string, string> = {
                PENDING: '입찰 대기중',
                ADDITIONAL: '추가 입찰 완료',
                COMPLETED: '입찰 완료'
              };

              return (
                <React.Fragment key={order.id}>
                <tr
                  className="admin-table-body-row"
                  style={{
                    backgroundColor: isChanged ? '#f0fdf4' : (order.isBundleGroup ? '#fff7ed' : 'transparent'),
                  }}
                >
                  <td className="admin-base-td" style={order.isBundleGroup ? os.bundleGroupIdCell : undefined}>
                    <div className="admin-sub-text">{order.date}</div>
                    {!order.isBundleGroup && (
                      <div style={{ fontWeight: '600', color: colors.textMain, marginBottom: '2px' }}>{order.id}</div>
                    )}
                    {order.isBundleGroup && (
                      <span style={os.bundleGroupBadge}>📦 합포장 {order.bundleItems.length}건</span>
                    )}
                    {order.bundleId && (
                      <div style={{ fontSize: '11px', color: '#f97316', fontWeight: '700', marginTop: order.isBundleGroup ? '4px' : 0 }}>
                        <span style={{ color: colors.textSub, fontWeight: '400' }}>Bundle:</span> {order.bundleId}
                      </div>
                    )}
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
                  
                  {statusFilter === ORDER_STATUS.ARRIVED && (
                    <td className="admin-base-td" style={{ textAlign: 'center' }}>
                      <button
                        onClick={async () => {
                          if (confirm('이 주문에 대해 포장 요청을 하시겠습니까?')) {
                            try {
                              const res = await fetch('/api/admin/orders', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ updates: [{ id: order.id, status: 'PREPARING' }] })
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
                  
                  <td className="admin-base-td" style={{ maxWidth: '300px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
                      {order.isBundleGroup && (
                        <button
                          onClick={() => toggleBundleExpand(order.bundleId)}
                          style={{
                            ...os.btnBundleToggle,
                            ...(expandedBundles.has(order.bundleId) ? os.btnBundleToggleOpen : {})
                          }}
                        >
                          {expandedBundles.has(order.bundleId) ? '접기' : '모든 상품 보기'} ›
                        </button>
                      )}
                      <span style={os.sourceBadge}>{order.source}</span>
                      {order.productUrl && (
                        <a href={order.productUrl} target="_blank" rel="noopener noreferrer" style={os.urlLink}>[URL]</a>
                      )}
                    </div>
                    <div style={os.productTitle}>{order.product}</div>
                    <div style={{ fontSize: '12px', color: colors.textSub }}>옵션: {order.option}</div>
                  </td>

                  <td className="admin-base-td">
                    <div style={{ fontSize: '12px', marginBottom: '4px' }}><span style={{ fontWeight: '600' }}>요청:</span> {order.productRequest}</div>
                    <div style={{ fontSize: '12px', color: '#6366f1' }}><span style={{ fontWeight: '600' }}>서비스:</span> {order.serviceRequest}</div>
                  </td>

                  <td className="admin-base-td" style={{ textAlign: 'right', fontWeight: '700', color: colors.textMain }}>¥{order.jpy}</td>

                  {/* 🌟 경매 상황 탭, 또는 전체 탭에서 경매 상황 주문일 때: 경매 상태 (셀렉트 박스 + 취소선 인디케이터) */}
                  {showBidStatusColumn && (
                    <td className="admin-base-td" style={{ textAlign: 'center' }}>
                      {order.status === ORDER_STATUS.BIDDING ? (
                        <>
                          {/* 🌟 변경 전 경매 상태 (취소선) 표시 */}
                          {(isChanged && originalBidStatus !== order.bidStatus) && (
                            <div style={os.statusChangeIndicator}>
                              <span style={{ color: colors.emptyText, textDecoration: 'line-through' }}>
                                {bidStatusLabels[originalBidStatus] || '상태 확인중'}
                              </span>
                              <span>➔</span>
                            </div>
                          )}

                          <select
                            value={order.bidStatus}
                            onChange={(e) => handleBidStatusChange(order.id, e.target.value)}
                            className="admin-status-select"
                            style={{
                              backgroundColor: order.bidStatus === 'COMPLETED' ? '#d1fae5' : (order.bidStatus === 'ADDITIONAL' ? '#dbeafe' : '#fef3c7'),
                              color: order.bidStatus === 'COMPLETED' ? '#10b981' : (order.bidStatus === 'ADDITIONAL' ? '#3b82f6' : '#d97706'),
                              border: `1px solid ${order.bidStatus === 'COMPLETED' ? '#86efac' : (order.bidStatus === 'ADDITIONAL' ? '#93c5fd' : '#fde68a')}`,
                            }}
                          >
                            <option value="PENDING" style={{ backgroundColor: colors.white, color: colors.textMain }}>입찰 대기중</option>
                            <option value="ADDITIONAL" style={{ backgroundColor: colors.white, color: colors.textMain }}>추가 입찰 완료</option>
                            <option value="COMPLETED" style={{ backgroundColor: colors.white, color: colors.textMain }}>입찰 완료</option>
                          </select>
                        </>
                      ) : (
                        <span style={{ color: colors.emptyText }}>-</span>
                      )}
                    </td>
                  )}

                  <td className="admin-base-td" style={{ textAlign: 'center' }}>
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
                      className="admin-status-select"
                      style={{
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
                    <button className="admin-btn-detail">상세보기</button>
                  </td>
                </tr>

                {/* 🌟 합포장 묶음 펼치기: 포함된 상품명/상품가격 표시 */}
                {order.isBundleGroup && expandedBundles.has(order.bundleId) && (
                  <tr>
                    <td colSpan={getVisibleColumnCount()} style={os.bundleDetailCell}>
                      <div style={os.bundleDetailList}>
                        <div style={os.bundleDetailHeader}>
                          <span style={os.bundleDetailHeaderDate}>주문일시</span>
                          <span style={os.bundleDetailHeaderId}>주문 ID</span>
                          <span style={os.bundleDetailHeaderName}>상품명</span>
                          <span style={os.bundleDetailHeaderPrice}>가격</span>
                        </div>
                        {order.bundleItems.map((sub: any) => (
                          <div key={sub.id} style={os.bundleDetailRow}>
                            <span style={os.bundleDetailDate}>{sub.date}</span>
                            <span style={os.bundleDetailId}>{sub.id}</span>
                            <span style={os.bundleDetailName} title={sub.product}>{sub.product}</span>
                            <span style={os.bundleDetailPrice}>¥{sub.jpy}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
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

const os: Record<string, React.CSSProperties> = {
  filterGroup: {
    display: 'flex',
    gap: '12px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
  },

  // 입력 폼
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
  btnBundleToggle: {
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    height: '22px',
    padding: '0 8px',
    border: `1px solid ${colors.borderInput}`,
    background: '#f1f5f9',
    borderRadius: '6px',
    cursor: 'pointer',
    color: colors.textDark,
    fontSize: '11px',
    fontWeight: '700',
    whiteSpace: 'nowrap',
  },
  btnBundleToggleOpen: {
    background: '#fee2e2',
    borderColor: '#fda4af',
    color: '#e11d48',
  },
  bundleGroupIdCell: {
    borderLeft: '4px solid #f97316',
  },
  bundleGroupBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '999px',
    background: '#f97316',
    color: colors.white,
    fontSize: '11px',
    fontWeight: '800',
  },
  bundleDetailCell: {
    padding: '10px 20px',
    background: '#f8fafc',
  },
  bundleDetailList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  bundleDetailRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    background: colors.white,
    border: `1px solid ${colors.borderDark}`,
    borderRadius: '8px',
  },
  bundleDetailHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 14px',
    fontSize: '11px',
    fontWeight: '700',
    color: colors.emptyText,
  },
  bundleDetailHeaderDate: { flexShrink: 0, width: '140px', marginRight: '10px' },
  bundleDetailHeaderId: { flexShrink: 0, width: '160px', marginRight: '10px' },
  bundleDetailHeaderName: { flex: 1, textAlign: 'left' },
  bundleDetailHeaderPrice: { flexShrink: 0, marginLeft: '12px' },
  bundleDetailDate: {
    fontSize: '11px',
    fontWeight: '500',
    color: colors.emptyText,
    flexShrink: 0,
    width: '140px',
    marginRight: '10px',
  },
  bundleDetailId: {
    fontSize: '11px',
    fontWeight: '600',
    color: colors.textSub,
    flexShrink: 0,
    width: '160px',
    marginRight: '10px',
    fontFamily: 'monospace',
  },
  bundleDetailName: {
    fontSize: '13px',
    color: colors.textDark,
    flex: 1,
    minWidth: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    textAlign: 'left',
  },
  bundleDetailPrice: {
    fontSize: '13px',
    fontWeight: '800',
    color: colors.textMain,
    flexShrink: 0,
    marginLeft: '12px',
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

  // 테이블
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
  },

  // 상태 변경 관련
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