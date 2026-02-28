"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';

const statusOptions = ['장바구니', '구매실패', '상품 결제 완료', '입고대기', '입고완료', '배송 준비중', '배송비 요청', '배송비 결제 완료', '국제배송'];

const statusWeight: Record<string, number> = {
  '장바구니': 1, '구매실패': 99, '상품 결제 완료': 2, '입고대기': 3, '입고완료': 4,
  '배송 준비중': 5, '배송비 요청': 6, '배송비 결제 완료': 7, '국제배송': 8
};

export default function OrderManagement() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('관리자');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'default' | 'asc' | 'desc' }>({ key: 'date', direction: 'asc' });

  // 🌟 설정 상태 관리 (항상 true로 유지)
  const persistWidths = true;

  // 🌟 컬럼 너비 상태 관리
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    date: 300,
    user: 150,
    address: 350, // 수취인 주소 컬럼 너비 설정
    packing: 80,
    product: 600,
    request: 300,
    price: 150,
    status: 200,
    manage: 150
  });

  // 로컬 스토리지에서 너비 불러오기
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

  // 너비 변경 시 로컬 스토리지에 저장
  const saveColumnWidths = (widths: Record<string, number>) => {
    if (persistWidths) {
      localStorage.setItem('admin_orders_column_widths', JSON.stringify(widths));
    }
  };

  // 🌟 엑셀 방식 리사이징: 오직 조절하려는 컬럼의 상태만 저장
  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  // 현재 화면에 보이는 컬럼들의 순서를 배열로 반환
  const getVisibleColumns = () => {
    const cols = ['date', 'user', 'address']; // address 추가
    if (statusFilter === '입고완료') cols.push('packing');
    cols.push('product', 'request', 'price', 'status', 'manage');
    return cols;
  };

  const onMouseDown = (key: string, side: 'left' | 'right', e: React.MouseEvent) => {
    let targetKey = key;

    // 🌟 엑셀 원리: B열의 '왼쪽 선'을 잡고 끈다는 것은 사실 A열의 '오른쪽 선'을 조절하는 것과 같음
    if (side === 'left') {
      const visibleCols = getVisibleColumns();
      const colIndex = visibleCols.indexOf(key);
      if (colIndex > 0) {
        targetKey = visibleCols[colIndex - 1]; // 진짜 타겟은 이전 컬럼
      } else {
        return; // 첫 번째 컬럼의 왼쪽은 밖이므로 조절 불가
      }
    }

    resizingRef.current = {
      key: targetKey,
      startX: e.pageX,
      startWidth: columnWidths[targetKey]
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { key, startX, startWidth } = resizingRef.current;
    const deltaX = e.pageX - startX;
    
    // 🌟 오직 타겟이 된 1개의 컬럼 너비만 조절. (다른 왼쪽 탭은 영향받지 않고, 오른쪽 탭들은 밀려남)
    setColumnWidths(prev => ({
      ...prev,
      [key]: Math.max(50, startWidth + deltaX)
    }));
  };

  const onMouseUp = () => {
    if (resizingRef.current) {
      // 마우스 업 시점에 최종 저장 (성능 최적화)
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

  const [orders, setOrders] = useState<any[]>([]);
  const [originalOrders, setOriginalOrders] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [changedOrderIds, setChangedOrderIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem('admin_name');
    if (!localStorage.getItem('admin_id')) {
      router.push('/admin/login');
      return;
    }
    if (storedName) setAdminName(storedName);

    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/admin/orders');
        const data = await res.json();

        if (data.success) {
          const formattedOrders = data.orders.map((dbOrder: any) => ({
            id: dbOrder.orderId, 
            date: new Date(dbOrder.registeredAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
            user: dbOrder.user?.name || '알 수 없음',
            // 🌟 수취인 주소 정보 매칭
            address: dbOrder.addressId 
              ? (dbOrder.user?.addresses?.find((a: any) => a.id === dbOrder.addressId) || null)
              : null,
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

          setOrders(formattedOrders);
          setOriginalOrders(formattedOrders);
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

    if (newStatus === '배송비 요청' && currentOrder.bundleId) {
      const bundleItems = orders.filter(o => o.bundleId === currentOrder.bundleId);
      const originalAmount = bundleItems.reduce((sum, o) => sum + (o.secondPaymentAmount || 0), 0);
      
      const amount = prompt(`합배송 그룹 전체에 대한 2차 결제 금액(₩)을 입력해주세요:\n(그룹 내 상품 수: ${bundleItems.length}개)`, originalAmount.toString());
      if (amount === null) return;

      const numAmount = parseInt(amount.replace(/[^0-9]/g, '')) || 0;
      
      setOrders(orders.map(order => {
        if (order.bundleId === currentOrder.bundleId) {
          const isFirstInBundle = bundleItems[0].id === order.id;
          return { 
            ...order, 
            status: newStatus, 
            secondPaymentAmount: isFirstInBundle ? numAmount : 0 
          };
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

    if (newStatus === '배송 준비중' && currentOrder.bundleId) {
      const bundleItems = orders.filter(o => o.bundleId === currentOrder.bundleId);
      
      setOrders(orders.map(order => {
        if (order.bundleId === currentOrder.bundleId) {
          return { 
            ...order, 
            status: newStatus, 
            secondPaymentAmount: 0 
          };
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

    if (newStatus === '배송비 요청') {
      if (currentOrder.status === '배송 준비중') {
        const amount = prompt("2차 결제 금액(₩)을 입력해주세요:", currentOrder.secondPaymentAmount.toString());
        if (amount === null) return;

        const numAmount = parseInt(amount.replace(/[^0-9]/g, '')) || 0;
        setOrders(orders.map(order => 
          order.id === orderId ? { ...order, status: newStatus, secondPaymentAmount: numAmount } : order
        ));
        
        setChangedOrderIds(prev => {
          const newSet = new Set(prev);
          newSet.add(orderId);
          return newSet;
        });
        return;
      }
    }

    if (newStatus === '국제배송') {
      const trackingNo = prompt("송장번호를 입력해주세요:", currentOrder.trackingNo || '');
      if (trackingNo === null) return;

      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus, trackingNo: trackingNo } : order
      ));
      
      setChangedOrderIds(prev => {
        const newSet = new Set(prev);
        newSet.add(orderId);
        return newSet;
      });
      return;
    }

    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
    
    setChangedOrderIds(prev => {
      const newSet = new Set(prev);
      const originalOrder = originalOrders.find(o => o.id === orderId);
      const currentOrder = orders.find(o => o.id === orderId);
      
      if (originalOrder?.status !== newStatus || originalOrder?.secondPaymentAmount !== currentOrder?.secondPaymentAmount) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId); 
      }
      return newSet;
    });
  };

  const handleSecondPaymentChange = (orderId: string, value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, '')) || 0;
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, secondPaymentAmount: numValue } : order
    ));

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
        setChangedOrderIds(new Set()); 
        const updatedRes = await fetch('/api/admin/orders');
        const updatedData = await updatedRes.json();
        if (updatedData.success) {
          const formattedOrders = updatedData.orders.map((dbOrder: any) => ({
            id: dbOrder.orderId, 
            date: new Date(dbOrder.registeredAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
            user: dbOrder.user?.name || '알 수 없음',
            address: dbOrder.addressId 
              ? (dbOrder.user?.addresses?.find((a: any) => a.id === dbOrder.addressId) || null)
              : null,
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
            serviceRequest: dbOrder.serviceRequest || '-'
          }));
          setOrders(formattedOrders);
          setOriginalOrders(formattedOrders);
        }
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
      case '장바구니': return { bg: '#f8fafc', text: '#64748b', border: '#cbd5e1' };
      case '구매실패': return { bg: '#fef2f2', text: '#ef4444', border: '#fca5a5' };
      case '상품 결제 완료': return { bg: '#eff6ff', text: '#3b82f6', border: '#93c5fd' };
      case '입고대기': return { bg: '#fffbeb', text: '#f59e0b', border: '#fcd34d' };
      case '입고완료': return { bg: '#f0fdf4', text: '#22c55e', border: '#86efac' };
      case '배송 준비중': return { bg: '#f5f3ff', text: '#8b5cf6', border: '#c4b5fd' };
      case '배송비 요청': return { bg: '#fff7ed', text: '#ea580c', border: '#fdba74' };
      case '배송비 결제 완료': return { bg: '#f0fdfa', text: '#0d9488', border: '#5eead4' };
      case '국제배송': return { bg: '#eef2ff', text: '#4f46e5', border: '#a5b4fc' };
      default: return { bg: '#f8fafc', text: '#64748b', border: '#cbd5e1' };
    }
  };

  const getRenderedOrders = () => {
    let result = [...orders];

    if (statusFilter === '전체') {
      const excludeStatuses = ['장바구니', '구매실패', '국제배송', '국내통관중', '국내배송중', '배송완료'];
      result = result.filter(order => 
        !excludeStatuses.includes(order.status) || changedOrderIds.has(order.id)
      );
    } else if (statusFilter === '국제배송') {
      const shippingStatuses = ['국제배송', '국내통관중', '국내배송중', '배송완료'];
      result = result.filter(order => 
        shippingStatuses.includes(order.status) || changedOrderIds.has(order.id)
      );
    } else {
      result = result.filter(order => order.status === statusFilter || changedOrderIds.has(order.id));
    }

    if (searchTerm.trim() !== '') {
      result = result.filter(order => 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        order.user.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortConfig.direction !== 'default') {
      result.sort((a, b) => {
        if (sortConfig.key === 'status') {
          const weightA = statusWeight[a.status] || 99;
          const weightB = statusWeight[b.status] || 99;
          return sortConfig.direction === 'asc' ? weightA - weightB : weightB - weightA;
        } 
        else if (sortConfig.key === 'date') {
          const bundleA = a.bundleId || '';
          const bundleB = b.bundleId || '';
          if (bundleA !== bundleB) {
            return sortConfig.direction === 'asc' 
              ? bundleA.localeCompare(bundleB) 
              : bundleB.localeCompare(bundleA);
          }
          return sortConfig.direction === 'asc' 
            ? a.date.localeCompare(b.date) 
            : b.date.localeCompare(a.date);
        }
        return 0;
      });
    }
    return result;
  };

  const renderedOrders = getRenderedOrders();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: "'Inter', 'Noto Sans KR', sans-serif" }}>
      <AdminSidebar />

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{ height: '70px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 }}>주문 관리</h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button 
              onClick={handleSaveChanges}
              disabled={changedOrderIds.size === 0 || isSaving}
              style={{
                padding: '8px 16px',
                backgroundColor: changedOrderIds.size > 0 ? '#10b981' : '#e2e8f0',
                color: changedOrderIds.size > 0 ? '#fff' : '#94a3b8',
                borderRadius: '8px',
                fontWeight: '600',
                border: 'none',
                cursor: changedOrderIds.size > 0 ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                boxShadow: changedOrderIds.size > 0 ? '0 4px 6px -1px rgba(16, 185, 129, 0.4)' : 'none'
              }}
            >
              {isSaving ? '저장 중...' : `변경사항 저장 (${changedOrderIds.size}건)`}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b' }}>
                {adminName.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontWeight: '500', color: '#334155' }}>{adminName}</span>
            </div>
          </div>
        </header>

        <div style={{ padding: '30px', overflowY: 'auto' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', padding: '24px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc', color: '#334155' }}
                    >
                      <option value="전체">전체 상태 ( 장바구니, 구매실패, 국제배송 제외 )</option>
                      {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <input 
                      type="text" 
                      placeholder="주문번호(ID) 또는 주문자명 검색..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', width: '300px' }}
                    />
                  </div>
                </div>

                <div style={{ width: '100%', overflowX: 'auto' }}>
                  {/* 🌟 수정사항: table에서 minWidth: '100%' 제거 (브라우저의 불필요한 공백 억지 배분 방지) */}
                  <table style={{ borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed', border: '1px solid #e2e8f0', width: 'max-content' }}>
              <colgroup>
                <col style={{ width: columnWidths.date }} />
                <col style={{ width: columnWidths.user }} />
                {statusFilter === '입고완료' && <col style={{ width: columnWidths.packing }} />}
                <col style={{ width: columnWidths.product }} />
                <col style={{ width: columnWidths.request }} />
                <col style={{ width: columnWidths.price }} />
                <col style={{ width: columnWidths.status }} />
                <col style={{ width: columnWidths.manage }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '14px', backgroundColor: '#f8fafc' }}>
                  
                  <th 
                    style={{ 
                      padding: '16px 12px', 
                      userSelect: 'none',
                      position: 'relative',
                      borderRight: '1px solid #e2e8f0'
                    }}
                  >
                    <div onMouseDown={(e) => onMouseDown('date', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} onMouseOver={(e) => e.currentTarget.style.borderLeft = '3px solid #3b82f6'} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                    <div onClick={() => toggleSort('date')} style={{ cursor: 'pointer' }}>
                      주문일시 / ID
                      <span style={{ marginLeft: '6px', fontSize: '12px', color: sortConfig.key === 'date' && sortConfig.direction !== 'default' ? '#3b82f6' : '#94a3b8' }}>
                        {sortConfig.key === 'date' && sortConfig.direction === 'asc' ? '▲' : sortConfig.key === 'date' && sortConfig.direction === 'desc' ? '▼' : '↕'}
                      </span>
                    </div>
                    <div onMouseDown={(e) => onMouseDown('date', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} onMouseOver={(e) => e.currentTarget.style.borderRight = '3px solid #3b82f6'} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
                  </th>

                  <th style={{ padding: '16px 12px', position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                    <div onMouseDown={(e) => onMouseDown('user', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} onMouseOver={(e) => e.currentTarget.style.borderLeft = '3px solid #3b82f6'} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                    주문자
                    <div onMouseDown={(e) => onMouseDown('user', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} onMouseOver={(e) => e.currentTarget.style.borderRight = '3px solid #3b82f6'} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
                  </th>

                  <th style={{ padding: '16px 12px', position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                    <div onMouseDown={(e) => onMouseDown('address', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} onMouseOver={(e) => e.currentTarget.style.borderLeft = '3px solid #3b82f6'} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                    수취인 주소
                    <div onMouseDown={(e) => onMouseDown('address', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} onMouseOver={(e) => e.currentTarget.style.borderRight = '3px solid #3b82f6'} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
                  </th>
                  
                  {statusFilter === '입고완료' && (
                    <th style={{ padding: '16px 12px', textAlign: 'center', position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                      <div onMouseDown={(e) => onMouseDown('packing', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} onMouseOver={(e) => e.currentTarget.style.borderLeft = '3px solid #3b82f6'} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                      포장
                      <div onMouseDown={(e) => onMouseDown('packing', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} onMouseOver={(e) => e.currentTarget.style.borderRight = '3px solid #3b82f6'} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
                    </th>
                  )}
                  
                  <th style={{ padding: '16px 12px', position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                    <div onMouseDown={(e) => onMouseDown('product', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} onMouseOver={(e) => e.currentTarget.style.borderLeft = '3px solid #3b82f6'} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                    상품 정보
                    <div onMouseDown={(e) => onMouseDown('product', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} onMouseOver={(e) => e.currentTarget.style.borderRight = '3px solid #3b82f6'} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
                  </th>
                  
                  <th style={{ padding: '16px 12px', position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                    <div onMouseDown={(e) => onMouseDown('request', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} onMouseOver={(e) => e.currentTarget.style.borderLeft = '3px solid #3b82f6'} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                    요청/서비스
                    <div onMouseDown={(e) => onMouseDown('request', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} onMouseOver={(e) => e.currentTarget.style.borderRight = '3px solid #3b82f6'} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
                  </th>
                  
                  <th style={{ padding: '16px 12px', textAlign: 'right', position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                    <div onMouseDown={(e) => onMouseDown('price', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} onMouseOver={(e) => e.currentTarget.style.borderLeft = '3px solid #3b82f6'} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                    상품가격 (₩)
                    <div onMouseDown={(e) => onMouseDown('price', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} onMouseOver={(e) => e.currentTarget.style.borderRight = '3px solid #3b82f6'} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
                  </th>
                  
                  <th 
                    style={{ 
                      padding: '16px 12px', 
                      textAlign: 'center', 
                      userSelect: 'none',
                      position: 'relative',
                      borderRight: '1px solid #e2e8f0'
                    }}
                  >
                    <div onMouseDown={(e) => onMouseDown('status', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} onMouseOver={(e) => e.currentTarget.style.borderLeft = '3px solid #3b82f6'} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                    <div onClick={() => toggleSort('status')} style={{ cursor: 'pointer' }}>
                      진행 상태 (변경가능) 
                      <span style={{ marginLeft: '6px', fontSize: '12px', color: sortConfig.key === 'status' && sortConfig.direction !== 'default' ? '#3b82f6' : '#94a3b8' }}>
                        {sortConfig.key === 'status' && sortConfig.direction === 'asc' ? '▲' : sortConfig.key === 'status' && sortConfig.direction === 'desc' ? '▼' : '↕'}
                      </span>
                    </div>
                    <div onMouseDown={(e) => onMouseDown('status', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} onMouseOver={(e) => e.currentTarget.style.borderRight = '3px solid #3b82f6'} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
                  </th>

                  <th style={{ padding: '16px 12px', textAlign: 'center', position: 'relative' }}>
                    <div onMouseDown={(e) => onMouseDown('manage', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} onMouseOver={(e) => e.currentTarget.style.borderLeft = '3px solid #3b82f6'} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                    관리
                    <div onMouseDown={(e) => onMouseDown('manage', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} onMouseOver={(e) => e.currentTarget.style.borderRight = '3px solid #3b82f6'} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {renderedOrders.map((order) => {
                  const colors = getStatusColor(order.status);
                  const isChanged = changedOrderIds.has(order.id);
                  const originalStatus = originalOrders.find(o => o.id === order.id)?.status;

                  return (
                    <tr key={order.id} style={{ 
                      borderBottom: '1px solid #f1f5f9', 
                      fontSize: '14px', 
                      color: '#334155',
                      backgroundColor: isChanged ? '#f0fdf4' : 'transparent',
                      transition: 'background-color 0.3s'
                    }}>
                      <td style={{ padding: '16px 12px', borderRight: '1px solid #f1f5f9' }}>
                        <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>{order.date}</div>
                        <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '2px' }}>{order.id}</div>
                        {order.bundleId && (
                          <div style={{ fontSize: '11px', color: '#f97316', fontWeight: '700' }}>
                            <span style={{ color: '#94a3b8', fontWeight: '400' }}>Bundle:</span> {order.bundleId}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px 12px', fontWeight: '500', borderRight: '1px solid #f1f5f9' }}>{order.user}</td>
                      <td style={{ padding: '16px 12px', borderRight: '1px solid #f1f5f9', fontSize: '13px' }}>
                        {order.address ? (
                          <>
                            <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '2px' }}>
                              {order.address.recipientName} ({order.address.phone})
                            </div>
                            <div style={{ color: '#64748b', lineHeight: '1.4' }}>
                              [{order.address.zipCode}] {order.address.address} {order.address.detailAddress}
                            </div>
                            <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '2px' }}>
                              통관번호: {order.address.personalCustomsCode}
                            </div>
                          </>
                        ) : (
                          <div style={{ color: '#94a3b8' }}>
                            {order.recipient ? `${order.recipient} (주소 정보 없음)` : '배송지 미지정'}
                          </div>
                        )}
                      </td>
                      {statusFilter === '입고완료' && (
                        <td style={{ padding: '16px 12px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                          <button
                            onClick={async () => {
                              if (confirm('이 주문에 대해 포장 요청을 하시겠습니까?')) {
                                try {
                                  const res = await fetch('/api/admin/orders', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                      updates: [{ id: order.id, status: '배송 준비중' }] 
                                    })
                                  });
                                  if (res.ok) {
                                    alert('포장 요청(배송 준비중)으로 변경되었습니다.');
                                    window.location.reload();
                                  } else {
                                    alert('처리 중 오류가 발생했습니다.');
                                  }
                                } catch (error) {
                                  console.error(error);
                                  alert('통신 오류가 발생했습니다.');
                                }
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#3b82f6',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                          >
                            개별 포장 요청
                          </button>
                        </td>
                      )}
                      <td style={{ padding: '16px 12px', maxWidth: '300px', borderRight: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                          <span style={{ display: 'inline-block', padding: '2px 6px', backgroundColor: '#e2e8f0', borderRadius: '4px', fontSize: '11px', fontWeight: '600', color: '#475569' }}>
                            {order.source}
                          </span>
                          {order.productUrl && (
                            <a href={order.productUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#3b82f6', textDecoration: 'none' }}>[URL]</a>
                          )}
                        </div>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '600', marginBottom: '2px' }}>{order.product}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>옵션: {order.option}</div>
                      </td>
                      <td style={{ padding: '16px 12px', borderRight: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '12px', marginBottom: '4px' }}><span style={{ fontWeight: '600' }}>요청:</span> {order.productRequest}</div>
                        <div style={{ fontSize: '12px', color: '#6366f1' }}><span style={{ fontWeight: '600' }}>서비스:</span> {order.serviceRequest}</div>
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: '700', color: '#0f172a', borderRight: '1px solid #f1f5f9' }}>₩{order.krw}</td>
                      <td style={{ padding: '16px 12px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                        
                        {(isChanged && originalStatus !== order.status) && (
                          <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '6px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <span style={{ color: '#94a3b8', textDecoration: 'line-through' }}>
                              {originalStatus}
                            </span>
                            <span>➔</span>
                          </div>
                        )}

                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          style={{ 
                            padding: '6px 12px', 
                            borderRadius: '20px', 
                            fontSize: '13px', 
                            fontWeight: '600',
                            backgroundColor: colors.bg,
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                            outline: 'none',
                            cursor: 'pointer',
                            textAlign: 'center',
                            appearance: 'auto' 
                          }}
                        >
                          {statusOptions.map(status => (
                            <option key={status} value={status} style={{ backgroundColor: '#fff', color: '#0f172a' }}>
                              {status}
                            </option>
                          ))}
                        </select>

                        {order.status === '배송비 요청' && (
                          <div style={{ marginTop: '10px' }}>
                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>2차 결제금액(₩)</div>
                            <input 
                              type="text" 
                              value={order.secondPaymentAmount.toLocaleString()}
                              onChange={(e) => handleSecondPaymentChange(order.id, e.target.value)}
                              disabled={
                                order.bundleId && orders.some(o => 
                                  o.bundleId === order.bundleId && 
                                  o.id !== order.id && 
                                  o.secondPaymentAmount > 0
                                )
                              }
                              style={{ 
                                width: '100px', 
                                padding: '4px 8px', 
                                borderRadius: '4px', 
                                border: '1px solid #cbd5e1', 
                                fontSize: '12px', 
                                textAlign: 'right', 
                                outline: 'none',
                                backgroundColor: (order.bundleId && orders.some(o => o.bundleId === order.bundleId && o.id !== order.id && o.secondPaymentAmount > 0)) ? '#f1f5f9' : '#fff',
                                cursor: (order.bundleId && orders.some(o => o.bundleId === order.bundleId && o.id !== order.id && o.secondPaymentAmount > 0)) ? 'not-allowed' : 'text'
                              }}
                            />
                            {order.bundleId && orders.some(o => o.bundleId === order.bundleId && o.id !== order.id && o.secondPaymentAmount > 0) && (
                              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>합배송 금액이 다른 상품에 입력됨</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                        <button style={{ padding: '6px 12px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '500', color: '#334155' }}>
                          상세보기
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
