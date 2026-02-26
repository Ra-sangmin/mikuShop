"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 기존의 initialOrders(가짜 데이터)는 지우거나 비워둡니다.
const statusOptions = ['장바구니', '구매실패', '1차완료', '입고대기', '입고완료', '합포장중', '2차요청', '2차완료', '국제배송'];

const statusWeight: Record<string, number> = {
  '장바구니': 1, '구매실패': 99, '1차완료': 2, '입고대기': 3, '입고완료': 4,
  '합포장중': 5, '2차요청': 6, '2차완료': 7, '국제배송': 8
};

export default function OrderManagement() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('관리자');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'default' | 'asc' | 'desc' }>({ key: '', direction: 'default' });

  // 🌟 State 초기값을 빈 배열([])로 설정하고 로딩 상태를 추가합니다.
  const [orders, setOrders] = useState<any[]>([]);
  const [originalOrders, setOriginalOrders] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true); // 로딩 스피너용
  
  const [changedOrderIds, setChangedOrderIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem('admin_name');
    if (!localStorage.getItem('admin_id')) {
      router.push('/admin/login');
      return;
    }
    if (storedName) setAdminName(storedName);

    // 🌟 API 호출: DB에서 진짜 데이터를 가져오는 함수
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/admin/orders');
        const data = await res.json();

        if (data.success) {
          // DB 데이터를 프론트엔드 테이블 양식에 맞게 예쁘게 변환(Mapping)합니다.
          const formattedOrders = data.orders.map((dbOrder: any) => ({
            id: dbOrder.orderId, 
            // 날짜 포맷팅 (YYYY-MM-DD HH:MM 형식)
            date: new Date(dbOrder.registeredAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
            user: dbOrder.user?.name || '알 수 없음', // 관계(Join)로 가져온 유저 이름!
            source: '기본구매처', // DB에 별도 컬럼이 없다면 임시 표시
            product: dbOrder.productName,
            jpy: dbOrder.productPrice.toLocaleString(),
            krw: Math.round(dbOrder.productPrice * 9.05).toLocaleString(), // 임시 환율 적용 (엔화 * 9.05)
            status: dbOrder.status
          }));

          setOrders(formattedOrders);
          setOriginalOrders(formattedOrders);
        }
      } catch (error) {
        console.error("데이터 가져오기 실패:", error);
      } finally {
        setIsLoading(false); // 데이터 로딩 완료
      }
    };

    fetchOrders();

    // 🌟 3. 폴링(Polling) 설정: 10초마다 서버에서 데이터를 새로 가져와 자동 갱신합니다.
    const intervalId = setInterval(fetchOrders, 10000); 

    // 컴포넌트가 언마운트될 때 타이머를 해제하여 메모리 누수를 방지합니다.
    return () => clearInterval(intervalId);
  }, [router]);

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
        body: JSON.stringify({ updates })
      });

      if (res.ok) {
        alert("성공적으로 저장되었습니다!");
        setChangedOrderIds(new Set()); 
        // 🌟 저장 성공 후 데이터를 다시 불러와서 화면을 갱신(Refresh)합니다.
        const updatedRes = await fetch('/api/admin/orders');
        const updatedData = await updatedRes.json();
        if (updatedData.success) {
          const formattedOrders = updatedData.orders.map((dbOrder: any) => ({
            id: dbOrder.orderId, 
            date: new Date(dbOrder.registeredAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
            user: dbOrder.user?.name || '알 수 없음',
            source: '기본구매처',
            product: dbOrder.productName,
            jpy: dbOrder.productPrice.toLocaleString(),
            krw: Math.round(dbOrder.productPrice * 9.05).toLocaleString(),
            status: dbOrder.status
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

  // 🌟 변경: 9가지 상태에 맞춰 다양한 색상 배지 적용
  const getStatusColor = (status: string) => {
    switch(status) {
      case '장바구니': return { bg: '#f8fafc', text: '#64748b', border: '#cbd5e1' }; // 회색
      case '구매실패': return { bg: '#fef2f2', text: '#ef4444', border: '#fca5a5' }; // 빨강
      case '1차완료': return { bg: '#eff6ff', text: '#3b82f6', border: '#93c5fd' }; // 파랑
      case '입고대기': return { bg: '#fffbeb', text: '#f59e0b', border: '#fcd34d' }; // 노랑
      case '입고완료': return { bg: '#f0fdf4', text: '#22c55e', border: '#86efac' }; // 초록
      case '합포장중': return { bg: '#f5f3ff', text: '#8b5cf6', border: '#c4b5fd' }; // 보라
      case '2차요청': return { bg: '#fff7ed', text: '#ea580c', border: '#fdba74' }; // 주황
      case '2차완료': return { bg: '#f0fdfa', text: '#0d9488', border: '#5eead4' }; // 청록
      case '국제배송': return { bg: '#eef2ff', text: '#4f46e5', border: '#a5b4fc' }; // 남색
      default: return { bg: '#f8fafc', text: '#64748b', border: '#cbd5e1' };
    }
  };

  const getRenderedOrders = () => {
    let result = [...orders];

    if (statusFilter === '전체') {
      // '전체' 상태일 때는 장바구니, 구매실패, 국제배송, 국내통관중, 국내배송중, 배송완료를 제외한 목록만 표시
      // 즉, 1차완료, 입고대기, 입고완료, 합포장중, 2차요청, 2차완료 단계만 표시
      const excludeStatuses = ['장바구니', '구매실패', '국제배송', '국내통관중', '국내배송중', '배송완료'];
      result = result.filter(order => 
        !excludeStatuses.includes(order.status) || changedOrderIds.has(order.id)
      );
    } else if (statusFilter === '국제배송') {
      // '국제배송' 필터 선택 시 모든 배송 단계(국제배송, 국내통관중, 국내배송중, 배송완료)를 표시
      const shippingStatuses = ['국제배송', '국내통관중', '국내배송중', '배송완료'];
      result = result.filter(order => 
        shippingStatuses.includes(order.status) || changedOrderIds.has(order.id)
      );
    } else {
      // 그 외 특정 상태 선택 시 해당 상태만 표시
      // 단, 다른 상태로 변경되어 아직 저장되지 않은(changedOrderIds에 포함된) 항목은 현재 필터에서도 보이게 유지
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
                backgroundColor: item === '주문 관리' ? '#3b82f6' : 'transparent',
                borderLeft: item === '주문 관리' ? '4px solid #fff' : '4px solid transparent',
                color: item === '주문 관리' ? '#fff' : '#94a3b8',
                fontWeight: item === '주문 관리' ? '600' : '400',
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

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '14px', backgroundColor: '#f8fafc' }}>
                  
                  <th 
                    onClick={() => toggleSort('date')}
                    style={{ 
                      padding: '16px 12px', 
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'background-color 0.2s',
                      width: '180px'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    주문일시 / ID
                    <span style={{ marginLeft: '6px', fontSize: '12px', color: sortConfig.key === 'date' && sortConfig.direction !== 'default' ? '#3b82f6' : '#94a3b8' }}>
                      {sortConfig.key === 'date' && sortConfig.direction === 'asc' ? '▲' : sortConfig.key === 'date' && sortConfig.direction === 'desc' ? '▼' : '↕'}
                    </span>
                  </th>

                  <th style={{ padding: '16px 12px' }}>주문자</th>
                  <th style={{ padding: '16px 12px' }}>구매처 / 상품명</th>
                  <th style={{ padding: '16px 12px', textAlign: 'right' }}>결제 금액 (₩)</th>
                  
                  <th 
                    onClick={() => toggleSort('status')}
                    style={{ 
                      padding: '16px 12px', 
                      textAlign: 'center', 
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    진행 상태 (변경가능) 
                    <span style={{ marginLeft: '6px', fontSize: '12px', color: sortConfig.key === 'status' && sortConfig.direction !== 'default' ? '#3b82f6' : '#94a3b8' }}>
                      {sortConfig.key === 'status' && sortConfig.direction === 'asc' ? '▲' : sortConfig.key === 'status' && sortConfig.direction === 'desc' ? '▼' : '↕'}
                    </span>
                  </th>

                  <th style={{ padding: '16px 12px', textAlign: 'center' }}>관리</th>
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
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>{order.date}</div>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{order.id}</div>
                      </td>
                      <td style={{ padding: '16px 12px', fontWeight: '500' }}>{order.user}</td>
                      <td style={{ padding: '16px 12px', maxWidth: '300px' }}>
                        <span style={{ display: 'inline-block', padding: '2px 6px', backgroundColor: '#e2e8f0', borderRadius: '4px', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                          {order.source}
                        </span>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.product}</div>
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>₩{order.krw}</td>
                      <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                        
                        {isChanged && (
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
      </main>
    </div>
  );
}