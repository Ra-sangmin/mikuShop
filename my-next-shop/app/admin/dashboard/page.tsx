"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const shippingStatus = [
  { id: '20260223-05', user: '저티종', status: '해외 배송중' },
  { id: '20260223-01', user: '배송쫑', status: '해외 배송중' },
  { id: '20260222-12', user: '메승자인', status: '국내 통관중' },
  { id: '20260221-09', user: '배송종', status: '배송 완료' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('관리자');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const [dbRecentOrders, setDbRecentOrders] = useState<any[]>([]);
  const [dbShippingOrders, setDbShippingOrders] = useState<any[]>([]);
  
  // 🌟 1. 통계 카드용 State 추가 (오늘의 주문, 처리 중, 배송 중)
  const [todayOrderCount, setTodayOrderCount] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);
  const [shippingCount, setShippingCount] = useState(0);
  const [totalSettlement, setTotalSettlement] = useState(0);

  const handleLogout = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    
    setIsLoggingOut(true);
    try {
      const res = await fetch('/api/admin/logout', { method: 'POST' });
      if (res.ok) {
        localStorage.removeItem('admin_id');
        localStorage.removeItem('admin_name');
        router.push('/admin/login');
      } else {
        alert('로그아웃에 실패했습니다.');
      }
    } catch (error) {
      console.error('Logout error:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    const storedName = localStorage.getItem('admin_name');
    const storedId = localStorage.getItem('admin_id');
    
    if (!storedId) {
      router.push('/admin/login');
      return;
    } else if (storedName) {
      setAdminName(storedName);
    }

    const fetchDashboardOrders = async () => {
      try {
        const res = await fetch('/api/admin/orders');
        const data = await res.json();

        if (data.success) {
          // 최신 주문 5개 자르기 (장바구니, 구매실패, 국제배송 등 관리 목록에서 제외된 상태는 필터링)
          const formatted = data.orders
            .filter((order: any) => !['장바구니', '구매실패', '국제배송', '국내통관중', '국내배송중', '배송완료'].includes(order.status))
            .slice(0, 5)
            .map((dbOrder: any) => ({
              id: dbOrder.orderId,
              user: dbOrder.user?.name || '알 수 없음',
              product: dbOrder.productName,
              status: dbOrder.status,
              amount: Math.round(dbOrder.productPrice * 9.05).toLocaleString()
            }));
          setDbRecentOrders(formatted);

          // 🌟 배송 상태 (국제배송 시작 ~ 국내배송중) 필터링
          // 배송 완료가 아닌 배송 단계 아이템들만 표시
          const shippingOrders = data.orders
            .filter((order: any) => 
              ['국제배송', '국내통관중', '국내배송중'].includes(order.status) && 
              order.deliveryStatus !== '배송완료'
            )
            .map((dbOrder: any) => ({
              id: dbOrder.orderId,
              user: dbOrder.user?.name || '알 수 없음',
              status: dbOrder.deliveryStatus || '배송전', // deliveryStatus 표시
            }));
          setDbShippingOrders(shippingOrders);

          // 🌟 2. 오늘 들어온 주문 개수 계산 로직 (장바구니, 구매실패 제외)
          const now = new Date();
          const todayOrders = data.orders.filter((order: any) => {
            const orderDate = new Date(order.registeredAt);
            return (
              orderDate.getFullYear() === now.getFullYear() &&
              orderDate.getMonth() === now.getMonth() &&
              orderDate.getDate() === now.getDate() &&
              !['장바구니', '구매실패'].includes(order.status)
            );
          });
          setTodayOrderCount(todayOrders.length); // State에 저장

          // 🌟 (보너스) 처리 중 & 배송 중 카운트 연동
          // 처리 중: 장바구니, 구매실패, 국제배송을 제외한 모든 진행 상태
          const processing = data.orders.filter((order: any) => 
            !['장바구니', '구매실패', '국제배송', '국내통관중', '국내배송중', '배송완료',].includes(order.status)
          ).length;
          setProcessingCount(processing);

          // 배송 중: status가 국제배송 이고 deliveryStatus가 배송완료가 아닌 값을 가져온다
          const shipping = data.orders.filter((order: any) => 
            order.status === '국제배송' && order.deliveryStatus !== '배송완료'
          ).length;
          setShippingCount(shipping);

          // 🌟 누적 정산액 계산: '배송완료'된 항목들의 productPrice 합산 (엔화 -> 원화 환산)
          const totalKRW = data.orders
            .filter((order: any) => order.deliveryStatus === '배송완료')
            .reduce((sum: number, order: any) => sum + (order.productPrice * 9.05), 0);
          setTotalSettlement(Math.round(totalKRW));
        }
      } catch (error) {
        console.error("데이터 불러오기 실패:", error);
      }
    };

    fetchDashboardOrders();
  }, [router]);

  const getBadgeStyle = (status: string) => {
    switch(status) {
      case '구매실패': return { bg: '#fef2f2', text: '#ef4444' }; 
      case '1차완료': return { bg: '#eff6ff', text: '#3b82f6' }; 
      case '입고대기': return { bg: '#fffbeb', text: '#f59e0b' }; 
      case '입고완료': return { bg: '#f0fdf4', text: '#22c55e' }; 
      case '합포장중': return { bg: '#f5f3ff', text: '#8b5cf6' }; 
      case '2차요청': return { bg: '#fff7ed', text: '#ea580c' }; 
      case '2차완료': return { bg: '#f0fdfa', text: '#0d9488' }; 
      case '국제배송': return { bg: '#eef2ff', text: '#4f46e5' }; 
      case '장바구니':
      default: return { bg: '#f8fafc', text: '#64748b' }; 
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: "'Inter', 'Noto Sans KR', sans-serif" }}>
      
      <aside style={{ width: '260px', backgroundColor: '#1e293b', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>📦</span> 미쿠짱 관리자
        </div>
        <nav style={{ flex: 1, padding: '20px 0' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {[
              { name: '대시보드', path: '/admin/dashboard' },
              { name: '주문 관리', path: '/admin/orders' },
              { name: '배송 현황', path: '/admin/delivery' },
              { name: '정산 관리', path: '/admin/settlement' },
              { name: '환불 정보', path: '/admin/refund' },
              { name: '고객 센터', path: '/admin/cs' },
            ].map((item, idx) => (
              <li 
                key={idx} 
                onClick={() => router.push(item.path)}
                style={{ 
                  padding: '16px 24px', 
                  cursor: 'pointer',
                  backgroundColor: item.name === '대시보드' ? '#3b82f6' : 'transparent',
                  borderLeft: item.name === '대시보드' ? '4px solid #fff' : '4px solid transparent',
                  color: item.name === '대시보드' ? '#fff' : '#94a3b8',
                  fontWeight: item.name === '대시보드' ? '600' : '400',
                  transition: 'all 0.2s'
                }}
              >
                {item.name}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ height: '70px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 }}>대시보드</h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '500' }}>
              <span style={{ color: '#64748b', marginRight: '8px' }}>현재 환율 (JPY/KRW)</span>
              <span style={{ color: '#0f172a' }}>100엔 = <strong style={{ color: '#ef4444' }}>905.42원</strong></span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ cursor: 'pointer', fontSize: '20px' }}>🔔</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 12px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', backgroundColor: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>
                    {adminName.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: '600', color: '#334155', fontSize: '14px' }}>{adminName}</span>
                </div>
                
                <div style={{ width: '1px', height: '20px', backgroundColor: '#e2e8f0' }}></div>
                
                <button 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  style={{ border: 'none', backgroundColor: 'transparent', color: '#ef4444', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}
                >
                  {isLoggingOut ? '...' : '로그아웃'}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div style={{ padding: '30px', overflowY: 'auto' }}>
          
          {/* 🌟 3. 통계 카드 UI에 State 적용 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
            {[
              { title: '오늘의 주문', count: `${todayOrderCount}건`, color: '#3b82f6', icon: '📝' },
              { title: '처리 중', count: `${processingCount}건`, color: '#f59e0b', icon: '⏳' },
              { title: '배송 중', count: `${shippingCount}건`, color: '#10b981', icon: '🚚' },
              { title: '누적 정산액', count: `₩ ${totalSettlement.toLocaleString()}`, color: '#8b5cf6', icon: '💰' },
            ].map((card, idx) => (
              <div key={idx} style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '15px', fontWeight: '500', marginBottom: '8px' }}>{card.title}</div>
                  <div style={{ color: '#0f172a', fontSize: '28px', fontWeight: '700' }}>{card.count}</div>
                </div>
                <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                  {card.icon}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ flex: 2, backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>최근 주문 목록 (최신 5건)</h2>
                <button 
                  onClick={() => router.push('/admin/orders')}
                  style={{ padding: '6px 12px', border: '1px solid #e2e8f0', backgroundColor: '#fff', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                >
                  자세히 보기 &gt;
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '14px' }}>
                    <th style={{ padding: '12px 8px' }}>주문 ID</th>
                    <th style={{ padding: '12px 8px' }}>사용자</th>
                    <th style={{ padding: '12px 8px' }}>상품명</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center' }}>상태</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>결제 금액</th>
                  </tr>
                </thead>
                <tbody>
                  {dbRecentOrders.length > 0 ? (
                    dbRecentOrders.map((order, idx) => {
                      const badge = getBadgeStyle(order.status);
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f8fafc', fontSize: '14px', color: '#334155' }}>
                          <td style={{ padding: '16px 8px', fontWeight: '500' }}>{order.id}</td>
                          <td style={{ padding: '16px 8px' }}>{order.user}</td>
                          <td style={{ padding: '16px 8px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {order.product}
                          </td>
                          <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                            <span style={{ 
                              padding: '4px 10px', 
                              borderRadius: '20px', 
                              fontSize: '12px', 
                              fontWeight: '600',
                              backgroundColor: badge.bg,
                              color: badge.text
                            }}>
                              {order.status}
                            </span>
                          </td>
                          <td style={{ padding: '16px 8px', textAlign: 'right', fontWeight: '600' }}>₩{order.amount}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                        최근 주문 내역이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 20px 0' }}>배송 상태 (배송 중)</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '14px' }}>
                    <th style={{ padding: '12px 8px' }}>주문 ID</th>
                    <th style={{ padding: '12px 8px' }}>사용자</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {dbShippingOrders.length > 0 ? (
                    dbShippingOrders.map((ship, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f8fafc', fontSize: '14px', color: '#334155' }}>
                        <td style={{ padding: '16px 8px' }}>{ship.id}</td>
                        <td style={{ padding: '16px 8px' }}>{ship.user}</td>
                        <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                          <span style={{ 
                            padding: '4px 10px', 
                            borderRadius: '6px', 
                            fontSize: '12px', 
                            backgroundColor: '#eef2ff',
                            color: '#4f46e5',
                            fontWeight: '600'
                          }}>
                            {ship.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                        국제배송 중인 내역이 없습니다.
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