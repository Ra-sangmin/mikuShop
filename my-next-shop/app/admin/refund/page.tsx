"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RefundManagement() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('관리자');
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
          // '구매실패' 상태를 환불/실패 내역으로 간주
          const refundOrders = data.orders
            .filter((dbOrder: any) => dbOrder.status === '구매실패')
            .map((dbOrder: any) => ({
              id: dbOrder.orderId, 
              date: new Date(dbOrder.registeredAt).toLocaleDateString(),
              user: dbOrder.user?.name || '알 수 없음',
              product: dbOrder.productName,
              amount: Math.round(dbOrder.productPrice * 9.05),
              status: dbOrder.status
            }));
          setOrders(refundOrders);
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
            {[
              { name: '대시보드', path: '/admin/dashboard' },
              { name: '주문 관리', path: '/admin/orders' },
              { name: '배송 현황', path: '/admin/delivery' },
              { name: '정산 관리', path: '/admin/settlement' },
              { name: '환불 정보', path: '/admin/refund' },
              { name: '고객 센터', path: '/admin/cs' },
            ].map((item, idx) => (
              <li key={idx} 
                  onClick={() => router.push(item.path)}
                  style={{ 
                padding: '16px 24px', 
                cursor: 'pointer',
                backgroundColor: item.name === '환불 정보' ? '#3b82f6' : 'transparent',
                borderLeft: item.name === '환불 정보' ? '4px solid #fff' : '4px solid transparent',
                color: item.name === '환불 정보' ? '#fff' : '#94a3b8',
                fontWeight: item.name === '환불 정보' ? '600' : '400',
                transition: 'all 0.2s'
              }}>
                {item.name}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ height: '70px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 }}>환불 정보 관리</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b' }}>
              {adminName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: '500', color: '#334155' }}>{adminName}</span>
          </div>
        </header>

        <div style={{ padding: '30px', overflowY: 'auto' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>구매 실패 및 환불 요청 내역</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '14px', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '16px 12px' }}>일자</th>
                  <th style={{ padding: '16px 12px' }}>주문 번호</th>
                  <th style={{ padding: '16px 12px' }}>구매자</th>
                  <th style={{ padding: '16px 12px' }}>상품명</th>
                  <th style={{ padding: '16px 12px', textAlign: 'right' }}>환불 예정 금액</th>
                  <th style={{ padding: '16px 12px', textAlign: 'center' }}>상태</th>
                  <th style={{ padding: '16px 12px', textAlign: 'center' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {orders.length > 0 ? orders.map((order) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#334155' }}>
                    <td style={{ padding: '16px 12px' }}>{order.date}</td>
                    <td style={{ padding: '16px 12px', fontWeight: '600' }}>{order.id}</td>
                    <td style={{ padding: '16px 12px' }}>{order.user}</td>
                    <td style={{ padding: '16px 12px' }}>{order.product}</td>
                    <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: '700', color: '#ef4444' }}>₩ {order.amount.toLocaleString()}</td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <span style={{ padding: '4px 8px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <button style={{ padding: '6px 12px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        환불완료 처리
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      환불 또는 구매 실패 내역이 없습니다.
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
