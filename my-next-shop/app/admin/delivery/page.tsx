"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
      {/* 사이드바 영역 생략 (동일) */}
      <aside style={{ width: '260px', backgroundColor: '#1e293b', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>📦</span> 미쿠짱 관리자
        </div>
        <nav style={{ flex: 1, padding: '20px 0' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {['대시보드', '주문 관리', '배송 현황', '정산 관리', '환불 정보', '고객 센터'].map((item, idx) => (
              <li key={idx} 
                  onClick={() => {
                    if (item === '대시보드') router.push('/admin/dashboard');
                    if (item === '주문 관리') router.push('/admin/orders');
                    if (item === '배송 현황') router.push('/admin/delivery');
                    if (item === '정산 관리') router.push('/admin/settlement');
                  }}
                  style={{ 
                padding: '16px 24px', 
                cursor: 'pointer',
                backgroundColor: item === '배송 현황' ? '#3b82f6' : 'transparent',
                borderLeft: item === '배송 현황' ? '4px solid #fff' : '4px solid transparent',
                color: item === '배송 현황' ? '#fff' : '#94a3b8',
                fontWeight: item === '배송 현황' ? '600' : '400',
                transition: 'all 0.2s'
              }}>
                {item}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '14px', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '16px 12px', width: '180px' }}>주문일시 / ID</th>
                  <th style={{ padding: '16px 12px' }}>주문자</th>
                  <th style={{ padding: '16px 12px' }}>상품명</th>
                  <th style={{ padding: '16px 12px' }}>운송장번호</th>
                  <th style={{ padding: '16px 12px', textAlign: 'center' }}>배송 상태</th>
                  <th style={{ padding: '16px 12px', textAlign: 'center' }}>관리</th>
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
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>{order.date}</div>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{order.id}</div>
                      </td>
                      <td style={{ padding: '16px 12px', fontWeight: '500' }}>{order.user}</td>
                      <td style={{ padding: '16px 12px', maxWidth: '250px' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.product}</div>
                      </td>
                      <td style={{ padding: '16px 12px', fontWeight: '600', color: '#4b5563' }}>{order.trackingNo}</td>
                      <td style={{ padding: '16px 12px', textAlign: 'center' }}>
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
                    <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      표시할 배송 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}