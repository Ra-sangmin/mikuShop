"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';

export default function SettlementManagement() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('관리자');
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 통계용
  const [totalSettlement, setTotalSettlement] = useState(0);
  const [settledCount, setSettledCount] = useState(0);

  // 🌟 설정 상태 관리 (항상 true로 유지)
  const persistWidths = true;

  // 🌟 컬럼 너비 상태 관리
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    date: 150,
    id: 300,
    user: 200,
    product: 600,
    jpy: 200,
    krw: 200
  });

  // 로컬 스토리지에서 너비 불러오기
  useEffect(() => {
    const isEnabled = localStorage.getItem('admin_persist_column_widths') !== 'false';
    if (!isEnabled) return;

    const savedWidths = localStorage.getItem('admin_settlement_column_widths');
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
      localStorage.setItem('admin_settlement_column_widths', JSON.stringify(widths));
    }
  };

  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const onMouseDown = (key: string, side: 'left' | 'right', e: React.MouseEvent) => {
    let targetKey = key;
    const visibleCols = ['date', 'id', 'user', 'product', 'jpy', 'krw'];

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
      <AdminSidebar />

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed', border: '1px solid #e2e8f0', width: 'max-content' }}>
              <colgroup>
                <col style={{ width: columnWidths.date }} />
                <col style={{ width: columnWidths.id }} />
                <col style={{ width: columnWidths.user }} />
                <col style={{ width: columnWidths.product }} />
                <col style={{ width: columnWidths.jpy }} />
                <col style={{ width: columnWidths.krw }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '14px', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '16px 12px', position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                    <div onMouseDown={(e) => onMouseDown('date', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                    완료 일자
                    <div onMouseDown={(e) => onMouseDown('date', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                  </th>
                  <th style={{ padding: '16px 12px', position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                    <div onMouseDown={(e) => onMouseDown('id', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                    주문 번호
                    <div onMouseDown={(e) => onMouseDown('id', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                  </th>
                  <th style={{ padding: '16px 12px', position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                    <div onMouseDown={(e) => onMouseDown('user', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                    구매자
                    <div onMouseDown={(e) => onMouseDown('user', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                  </th>
                  <th style={{ padding: '16px 12px', position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                    <div onMouseDown={(e) => onMouseDown('product', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                    상품명
                    <div onMouseDown={(e) => onMouseDown('product', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'right', position: 'relative', borderRight: '1px solid #e2e8f0' }}>
                    <div onMouseDown={(e) => onMouseDown('jpy', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                    상품가 (JPY)
                    <div onMouseDown={(e) => onMouseDown('jpy', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'right', position: 'relative' }}>
                    <div onMouseDown={(e) => onMouseDown('krw', 'left', e)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                    정산 금액 (KRW)
                    <div onMouseDown={(e) => onMouseDown('krw', 'right', e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', backgroundColor: 'transparent', zIndex: 10 }} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.length > 0 ? orders.map((order) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#334155' }}>
                    <td style={{ padding: '16px 12px', borderRight: '1px solid #f1f5f9' }}>{order.date}</td>
                    <td style={{ padding: '16px 12px', fontWeight: '600', borderRight: '1px solid #f1f5f9' }}>{order.id}</td>
                    <td style={{ padding: '16px 12px', borderRight: '1px solid #f1f5f9' }}>{order.user}</td>
                    <td style={{ padding: '16px 12px', borderRight: '1px solid #f1f5f9' }}>{order.product}</td>
                    <td style={{ padding: '16px 12px', textAlign: 'right', borderRight: '1px solid #f1f5f9' }}>{order.jpy.toLocaleString()}￥</td>
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
        </div>
      </main>
    </div>
  );
}
