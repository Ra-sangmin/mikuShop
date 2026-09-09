"use client";

import { useState, useEffect, useRef } from 'react';
import '../admin-common.css';

export default function SettlementManagement() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 통계용
  const [totalSettlement, setTotalSettlement] = useState(0);
  const [settledCount, setSettledCount] = useState(0);

  const persistWidths = true;

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    date: 150,
    id: 250,
    user: 150,
    address: 350,
    product: 600,
    jpy: 150,
    krw: 150
  });

  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

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

  const saveColumnWidths = (widths: Record<string, number>) => {
    if (persistWidths) {
      localStorage.setItem('admin_settlement_column_widths', JSON.stringify(widths));
    }
  };

  const onMouseDown = (key: string, side: 'left' | 'right', e: React.MouseEvent) => {
    let targetKey = key;
    const visibleCols = ['date', 'id', 'user', 'address', 'product', 'jpy', 'krw'];

    if (side === 'left') {
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
              address: dbOrder.addressId 
                ? (dbOrder.user?.addresses?.find((a: any) => a.id === dbOrder.addressId) || null)
                : null,
              recipient: dbOrder.recipient || '',
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
  }, []);

  return (
    <div style={ss.container}>
      
      {/* 🌟 통계 카드 섹션 */}
      <div style={ss.cardGrid}>
        <div className="admin-container">
          <div className="admin-stat-title">누적 정산액</div>
          <div className="admin-stat-count">₩ {totalSettlement.toLocaleString()}</div>
        </div>
        <div className="admin-container">
          <div className="admin-stat-title">정산 완료 건수</div>
          <div className="admin-stat-count" style={{ color: colors.accent }}>{settledCount}건</div>
        </div>
        <div className="admin-container">
          <div className="admin-stat-title">평균 객단가</div>
          <div className="admin-stat-count" style={{ color: '#10b981' }}>
            ₩ {settledCount > 0 ? Math.round(totalSettlement / settledCount).toLocaleString() : 0}
          </div>
        </div>
      </div>

      {/* 🌟 테이블 영역 */}
      <div className="admin-container">
        <h2 className="admin-section-title">정산 완료 내역 (배송 완료 건)</h2>
        <div style={ss.tableWrapper}>
          <table className="admin-table-resizable">
            <colgroup>
              <col style={{ width: columnWidths.date }} />
              <col style={{ width: columnWidths.id }} />
              <col style={{ width: columnWidths.user }} />
              <col style={{ width: columnWidths.address }} />
              <col style={{ width: columnWidths.product }} />
              <col style={{ width: columnWidths.jpy }} />
              <col style={{ width: columnWidths.krw }} />
            </colgroup>
            <thead>
              <tr className="admin-table-head-row">
                <th className="admin-th-resizable">
                  <div onMouseDown={(e) => onMouseDown('date', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                  완료 일자
                  <div onMouseDown={(e) => onMouseDown('date', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
                </th>
                <th className="admin-th-resizable">
                  <div onMouseDown={(e) => onMouseDown('id', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                  주문 번호
                  <div onMouseDown={(e) => onMouseDown('id', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
                </th>
                <th className="admin-th-resizable">
                  <div onMouseDown={(e) => onMouseDown('user', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                  구매자
                  <div onMouseDown={(e) => onMouseDown('user', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
                </th>
                <th className="admin-th-resizable">
                  <div onMouseDown={(e) => onMouseDown('address', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                  수취인 주소
                  <div onMouseDown={(e) => onMouseDown('address', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
                </th>
                <th className="admin-th-resizable">
                  <div onMouseDown={(e) => onMouseDown('product', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                  상품명
                  <div onMouseDown={(e) => onMouseDown('product', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
                </th>
                <th className="admin-th-resizable" style={{ textAlign: 'right' }}>
                  <div onMouseDown={(e) => onMouseDown('jpy', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                  상품가 (JPY)
                  <div onMouseDown={(e) => onMouseDown('jpy', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
                </th>
                <th style={{ padding: '16px 12px', textAlign: 'right', position: 'relative' }}>
                  <div onMouseDown={(e) => onMouseDown('krw', 'left', e)} className="admin-resize-handle-left" onMouseOver={(e) => e.currentTarget.style.borderLeft = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderLeft = 'none'} />
                  정산 금액 (KRW)
                  <div onMouseDown={(e) => onMouseDown('krw', 'right', e)} className="admin-resize-handle-right" onMouseOver={(e) => e.currentTarget.style.borderRight = `3px solid ${colors.accent}`} onMouseOut={(e) => e.currentTarget.style.borderRight = 'none'} />
                </th>
              </tr>
            </thead>
            <tbody>
              {!isLoading ? (
                orders.length > 0 ? orders.map((order) => (
                  <tr key={order.id} className="admin-table-body-row">
                    <td className="admin-base-td">{order.date}</td>
                    <td className="admin-base-td" style={{ fontWeight: '600' }}>{order.id}</td>
                    <td className="admin-base-td">{order.user}</td>
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
                    <td className="admin-base-td">{order.product}</td>
                    <td className="admin-base-td" style={{ textAlign: 'right' }}>{order.jpy.toLocaleString()}￥</td>
                    <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: '700', color: colors.textMain }}>
                      ₩ {order.krw.toLocaleString()}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="admin-empty-td">정산 완료된 내역이 없습니다.</td>
                  </tr>
                )
              ) : (
                <tr>
                  <td colSpan={7} className="admin-empty-td">데이터를 불러오는 중입니다...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 🎨 스타일 정의 영역 (Settlement Styles: ss)
// ==========================================

const colors = {
  white: '#fff',
  border: '#f1f5f9',
  borderDark: '#e2e8f0',
  textMain: '#0f172a',
  textSub: '#64748b',
  textDark: '#334155',
  accent: '#3b82f6',
  emptyText: '#94a3b8',
  bgHead: '#f8fafc',
};

const ss: Record<string, React.CSSProperties> = {
  // 최상위 컨테이너 (기존처럼 전체 배경 역할은 제거되었지만, 내부 여백 등을 위해 유지)
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px', // 통계카드와 테이블 사이 간격
  },

  // 통계 카드 그리드
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },

  // 테이블 구조
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
  },
};