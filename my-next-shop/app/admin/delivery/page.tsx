"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';

const deliveryStatusOptions = ['배송전', '국내통관중', '국내배송중', '배송완료'];

export default function DeliveryManagement() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('관리자');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  
  const [orders, setOrders] = useState<any[]>([]);
  const [originalOrders, setOriginalOrders] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [changedOrderIds, setChangedOrderIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  
  // 🌟 추가됨: 자동 동기화 로딩 상태
  const [isSyncing, setIsSyncing] = useState(false);

  // 🌟 설정 상태 관리 (항상 true로 유지)
  const persistWidths = true;

  // 🌟 컬럼 너비 상태 관리
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    date: 300,
    user: 150,
    address: 350, // 수취인 주소 컬럼 너비 추가
    product: 600,
    tracking: 300,
    status: 200,
    manage: 150
  });

  // 로컬 스토리지에서 너비 불러오기
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

  // 너비 변경 시 로컬 스토리지에 저장
  const saveColumnWidths = (widths: Record<string, number>) => {
    if (persistWidths) {
      localStorage.setItem('admin_delivery_column_widths', JSON.stringify(widths));
    }
  };

  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const onMouseDown = (key: string, side: 'left' | 'right', e: React.MouseEvent) => {
    let targetKey = key;
    const visibleCols = ['date', 'user', 'address', 'product', 'tracking', 'status', 'manage'];

    if (side === 'left') {
      const colIndex = visibleCols.indexOf(key);
      if (colIndex > 0) {
        targetKey = visibleCols[colIndex - 1];
      } else {
        return;
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
    
    setColumnWidths(prev => ({
      ...prev,
      [key]: Math.max(50, startWidth + deltaX)
    }));
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
    const storedName = localStorage.getItem('admin_name');
    if (!localStorage.getItem('admin_id')) {
      router.push('/admin/login');
      return;
    }
    if (storedName) setAdminName(storedName);

    fetchOrders(); // 🌟 함수화하여 재사용 가능하게 변경
  }, [router]);

  // 🌟 데이터 가져오기 로직 별도 분리
  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/orders');
      const data = await res.json();
      if (data.success) {
        // 🌟 status가 '국제배송'인 항목만 필터링
        const deliveryOrders = data.orders.filter((dbOrder: any) => dbOrder.status === '국제배송');
        
        const formattedOrders = deliveryOrders.map((dbOrder: any) => ({
          id: dbOrder.orderId, 
          date: new Date(dbOrder.registeredAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
          user: dbOrder.user?.name || '알 수 없음',
          // 🌟 수취인 주소 정보 매칭
          address: dbOrder.addressId 
            ? (dbOrder.user?.addresses?.find((a: any) => a.id === dbOrder.addressId) || null)
            : null,
          recipient: dbOrder.recipient || '',
          product: dbOrder.productName,
          status: dbOrder.deliveryStatus || '배송전', // status 대신 deliveryStatus 사용
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

  // 🌟 추가됨: 자동 동기화 호출 함수
  const handleAutoSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/orders/sync-tracking', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        alert(data.message);
        if (data.updatedCount > 0) {
          fetchOrders(); // 화면 갱신
        }
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
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
    
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
      case '배송전': return { bg: '#eef2ff', text: '#4f46e5', border: '#a5b4fc' };
      case '국내통관중': return { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' };
      case '국내배송중': return { bg: '#fdf4ff', text: '#9333ea', border: '#f5d0fe' };
      case '배송완료': return { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' };
      default: return { bg: '#f8fafc', text: '#64748b', border: '#cbd5e1' };
    }
  };

  const getRenderedOrders = () => {
    let result = orders.filter(order => deliveryStatusOptions.includes(order.status));
    if (statusFilter === '전체') {
      result = result.filter(order => order.status !== '배송완료' || changedOrderIds.has(order.id));
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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: "'Inter', 'Noto Sans KR', sans-serif" }}>
      <AdminSidebar />

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{ height: '70px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 }}>배송 현황</h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            
            {/* 🌟 1. 자동 동기화 버튼 다시 추가 */}
            <button 
              onClick={handleAutoSync}
              disabled={isSyncing}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                borderRadius: '8px',
                fontWeight: '600',
                border: 'none',
                cursor: isSyncing ? 'wait' : 'pointer'
              }}
            >
              {isSyncing ? '조회 중...' : '🚚 배송상태 자동 동기화'}
            </button>

            {/* 🌟 2. 기존 저장 버튼 */}
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
                cursor: changedOrderIds.size > 0 ? 'pointer' : 'not-allowed'
              }}
            >
              {isSaving ? '저장 중...' : `상태 저장 (${changedOrderIds.size}건)`}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b' }}>
                {adminName.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontWeight: '500', color: '#334155' }}>{adminName}</span>
            </div>
          </div>
        </header>

        {/* 나머지 테이블 로직 동일... */}
        <div style={{ padding: '30px', overflowY: 'auto' }}>
           {/* 이전과 동일한 테이블 내용 */}
           <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', padding: '24px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#f8fafc', color: '#334155' }}
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
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', width: '300px' }}
                />
              </div>
            </div>

            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed', border: '1px solid #e2e8f0', width: 'max-content' }}>
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
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '14px', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '16px 12px', position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                    <div onMouseDown={(e) => onMouseDown('date', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                    주문일시 / ID
                    <div onMouseDown={(e) => onMouseDown('date', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                  </th>
                  <th style={{ padding: '16px 12px', position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                    <div onMouseDown={(e) => onMouseDown('user', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                    주문자
                    <div onMouseDown={(e) => onMouseDown('user', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                  </th>
                  <th style={{ padding: '16px 12px', position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                    <div onMouseDown={(e) => onMouseDown('address', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                    수취인 주소
                    <div onMouseDown={(e) => onMouseDown('address', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                  </th>
                  <th style={{ padding: '16px 12px', position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                    <div onMouseDown={(e) => onMouseDown('product', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                    상품명
                    <div onMouseDown={(e) => onMouseDown('product', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                  </th>
                  <th style={{ padding: '16px 12px', position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                    <div onMouseDown={(e) => onMouseDown('tracking', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                    운송장번호
                    <div onMouseDown={(e) => onMouseDown('tracking', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                    <div onMouseDown={(e) => onMouseDown('status', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                    배송 상태
                    <div onMouseDown={(e) => onMouseDown('status', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', position: 'relative' }}>
                    <div onMouseDown={(e) => onMouseDown('manage', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                    관리
                    <div onMouseDown={(e) => onMouseDown('manage', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {renderedOrders.length > 0 ? renderedOrders.map((order) => {
                  const colors = getStatusColor(order.status);
                  const isChanged = changedOrderIds.has(order.id);

                  return (
                    <tr key={order.id} style={{ 
                      borderBottom: '1px solid #f1f5f9', 
                      fontSize: '14px', 
                      color: '#334155',
                      backgroundColor: isChanged ? '#f0fdf4' : 'transparent'
                    }}>
                      <td style={{ padding: '16px 12px', borderRight: '1px solid #f1f5f9' }}>
                        <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>{order.date}</div>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{order.id}</div>
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
                      <td style={{ padding: '16px 12px', borderRight: '1px solid #f1f5f9' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.product}</div>
                      </td>
                      <td style={{ padding: '16px 12px', fontWeight: '600', color: '#4b5563', borderRight: '1px solid #f1f5f9' }}>{order.trackingNo}</td>
                      <td style={{ padding: '16px 12px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
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
                            textAlign: 'center'
                          }}
                        >
                          {deliveryStatusOptions.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                        <button style={{ padding: '6px 12px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                          추적하기
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      표시할 배송 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}
