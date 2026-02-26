"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettlementManagement() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('관리자');
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 통계용
  const [totalSettlement, setTotalSettlement] = useState(0);
  const [settledCount, setSettledCount] = useState(0);

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
          // 배송완료된 항목만 필터링
          const settledOrders = data.orders
            .filter((dbOrder: any) => dbOrder.deliveryStatus === '배송완료')
            .map((dbOrder: any) => ({
              id: dbOrder.orderId, 
              date: new Date(dbOrder.shippedAt || dbOrder.registeredAt).toLocaleDateString(),
              user: dbOrder.user?.name || '알 수 없음',
              product: dbOrder.productName,
              jpy: dbOrder.productPrice,
              krw: Math.round(dbOrder.productPrice * 9.05),
              status: dbOrder.status
            }));

          setOrders(settledOrders);
          
          const total = settledOrders.reduce((sum: number, order: any) => sum + order.krw, 0);
          setTotalSettlement(total);
          setSettledCount(settledOrders.length);
        }
      } catch (error) {
        console.error("데이터 가져오기 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [router]);

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
                backgroundColor: item === '정산 관리' ? '#3b82f6' : 'transparent',
                borderLeft: item === '정산 관리' ? '4px solid #fff' : '4px solid transparent',
                color: item === '정산 관리' ? '#fff' : '#94a3b8',
                fontWeight: item === '정산 관리' ? '600' : '400',
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
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 }}>정산 관리</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b' }}>
              {adminName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: '500', color: '#334155' }}>{adminName}</span>
          </div>
        </header>

        <div style={{ padding: '30px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
              <div style={{ color: '#64748b', fontSize: '15px', fontWeight: '500', marginBottom: '8px' }}>누적 정산액</div>
              <div style={{ color: '#0f172a', fontSize: '28px', fontWeight: '700' }}>₩ {totalSettlement.toLocaleString()}</div>
            </div>
            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
              <div style={{ color: '#64748b', fontSize: '15px', fontWeight: '500', marginBottom: '8px' }}>정산 완료 건수</div>
              <div style={{ color: '#3b82f6', fontSize: '28px', fontWeight: '700' }}>{settledCount}건</div>
            </div>
            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
              <div style={{ color: '#64748b', fontSize: '15px', fontWeight: '500', marginBottom: '8px' }}>평균 객단가</div>
              <div style={{ color: '#10b981', fontSize: '28px', fontWeight: '700' }}>₩ {settledCount > 0 ? Math.round(totalSettlement / settledCount).toLocaleString() : 0}</div>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>정산 완료 내역 (배송 완료 건)</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '14px', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '16px 12px' }}>완료 일자</th>
                  <th style={{ padding: '16px 12px' }}>주문 번호</th>
                  <th style={{ padding: '16px 12px' }}>구매자</th>
                  <th style={{ padding: '16px 12px' }}>상품명</th>
                  <th style={{ padding: '16px 12px', textAlign: 'right' }}>상품가 (JPY)</th>
                  <th style={{ padding: '16px 12px', textAlign: 'right' }}>정산 금액 (KRW)</th>
                </tr>
              </thead>
              <tbody>
                {orders.length > 0 ? orders.map((order) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#334155' }}>
                    <td style={{ padding: '16px 12px' }}>{order.date}</td>
                    <td style={{ padding: '16px 12px', fontWeight: '600' }}>{order.id}</td>
                    <td style={{ padding: '16px 12px' }}>{order.user}</td>
                    <td style={{ padding: '16px 12px' }}>{order.product}</td>
                    <td style={{ padding: '16px 12px', textAlign: 'right' }}>{order.jpy.toLocaleString()}￥</td>
                    <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>₩ {order.krw.toLocaleString()}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      정산 완료된 내역이 없습니다.
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
