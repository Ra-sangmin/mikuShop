"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ORDER_STATUS, DELIVERY_STATUS } from '@/src/types/order';
import '../admin-common.css';

// 🐛 이 화면은 주문 상태를 한글 라벨('장바구니', '국제배송' …)과 비교하고 있었지만 API는
//    Prisma enum('CART', 'SHIPPING' …)을 내려줍니다. 조건이 한 번도 참이 되지 않아
//    장바구니·실패 주문이 "처리 중"에 섞이고, 배송 중/누적 정산액은 0에 고정돼 있었습니다.
//    "처리 중"에서 제외할 상태: 아직 접수 전(장바구니)·종료된 건(실패)·배송 단계로 넘어간 건
const EXCLUDED_FROM_PROCESSING: string[] = [
  ORDER_STATUS.CART,
  ORDER_STATUS.FAILED,
  ORDER_STATUS.SHIPPING,
];

export default function AdminDashboard() {
  const router = useRouter();
  
  // 🌟 데이터 State 관리
  const [dbRecentOrders, setDbRecentOrders] = useState<any[]>([]);
  const [dbShippingOrders, setDbShippingOrders] = useState<any[]>([]);
  
  // 🌟 통계 데이터 State 관리
  const [todayOrderCount, setTodayOrderCount] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);
  const [shippingCount, setShippingCount] = useState(0);
  const [totalSettlement, setTotalSettlement] = useState(0);

  useEffect(() => {
    const fetchDashboardOrders = async () => {
      try {
        const res = await fetch('/api/admin/orders');
        const data = await res.json();

        if (data.success) {
          // 1. 최신 주문 5개 (관리 대상만 필터링)
          const formatted = data.orders
            .filter((order: any) => !EXCLUDED_FROM_PROCESSING.includes(order.status))
            .slice(0, 5)
            .map((dbOrder: any) => ({
              id: dbOrder.orderId,
              user: dbOrder.user?.name || '알 수 없음',
              product: dbOrder.productName,
              status: dbOrder.status,
              amount: Math.round(dbOrder.productPrice * 9.05).toLocaleString()
            }));
          setDbRecentOrders(formatted);

          // 2. 배송 상태 필터링
          const shippingOrders = data.orders
            .filter((order: any) =>
              order.status === ORDER_STATUS.SHIPPING &&
              order.deliveryStatus !== DELIVERY_STATUS.COMPLETED
            )
            .map((dbOrder: any) => ({
              id: dbOrder.orderId,
              user: dbOrder.user?.name || '알 수 없음',
              status: dbOrder.deliveryStatus || DELIVERY_STATUS.PREPARING,
            }));
          setDbShippingOrders(shippingOrders);

          // 3. 통계 계산 (오늘 주문)
          const now = new Date();
          const todayOrders = data.orders.filter((order: any) => {
            const orderDate = new Date(order.registeredAt);
            return (
              orderDate.getFullYear() === now.getFullYear() &&
              orderDate.getMonth() === now.getMonth() &&
              orderDate.getDate() === now.getDate() &&
              ![ORDER_STATUS.CART, ORDER_STATUS.FAILED].includes(order.status)
            );
          });
          setTodayOrderCount(todayOrders.length);

          // 4. 처리 중 & 배송 중 카운트
          const processing = data.orders.filter((order: any) =>
            !EXCLUDED_FROM_PROCESSING.includes(order.status)
          ).length;
          setProcessingCount(processing);

          const shipping = data.orders.filter((order: any) =>
            order.status === ORDER_STATUS.SHIPPING && order.deliveryStatus !== DELIVERY_STATUS.COMPLETED
          ).length;
          setShippingCount(shipping);

          // 5. 누적 정산액
          const totalKRW = data.orders
            .filter((order: any) => order.deliveryStatus === DELIVERY_STATUS.COMPLETED)
            .reduce((sum: number, order: any) => sum + (order.productPrice * 9.05), 0);
          setTotalSettlement(Math.round(totalKRW));
        }
      } catch (error) {
        console.error("데이터 불러오기 실패:", error);
      }
    };

    fetchDashboardOrders();
  }, []);

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
      default: return { bg: '#f8fafc', text: '#64748b' }; 
    }
  };

  return (
    <>
      {/* 🌟 통계 카드 섹션 */}
      <div style={ds.cardGrid}>
        {[
          { title: '오늘의 주문', count: `${todayOrderCount}건`, color: '#3b82f6', icon: '📝' },
          { title: '처리 중', count: `${processingCount}건`, color: '#f59e0b', icon: '⏳' },
          { title: '배송 중', count: `${shippingCount}건`, color: '#10b981', icon: '🚚' },
          { title: '누적 정산액', count: `₩ ${totalSettlement.toLocaleString()}`, color: '#8b5cf6', icon: '💰' },
        ].map((card, idx) => (
          <div key={idx} className="admin-container admin-flex-between">
            <div>
              <div className="admin-stat-title">{card.title}</div>
              <div className="admin-stat-count">{card.count}</div>
            </div>
            <div style={{ ...ds.statIcon, backgroundColor: `${card.color}15` }}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      <div style={ds.flexGap}>
        {/* 🌟 최근 주문 목록 */}
        <div className="admin-container" style={{ flex: 2 }}>
          <div className="admin-flex-between" style={{ marginBottom: '20px' }}>
            <h2 className="admin-title-font" style={{ margin: 0 }}>최근 주문 목록 (최신 5건)</h2>
            <button
              onClick={() => router.push('/admin/orders')}
              style={ds.detailBtn}
            >
              자세히 보기 &gt;
            </button>
          </div>
          <table className="admin-table-simple">
            <thead>
              <tr style={ds.tableHeadRow}>
                <th style={ds.th}>주문 ID</th>
                <th style={ds.th}>사용자</th>
                <th style={ds.th}>상품명</th>
                <th style={ds.thCenter}>상태</th>
                <th style={ds.thRight}>결제 금액</th>
              </tr>
            </thead>
            <tbody>
              {dbRecentOrders.length > 0 ? dbRecentOrders.map((order, idx) => {
                const badge = getBadgeStyle(order.status);
                return (
                  <tr key={idx} className="admin-table-body-row">
                    <td style={ds.tdBold}>{order.id}</td>
                    <td style={ds.td}>{order.user}</td>
                    <td style={ds.tdEllipsis}>{order.product}</td>
                    <td style={ds.tdCenter}>
                      <span style={{ 
                        ...ds.badge, 
                        backgroundColor: badge.bg, 
                        color: badge.text 
                      }}>
                        {order.status}
                      </span>
                    </td>
                    <td style={ds.tdAmount}>₩{order.amount}</td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={5} className="admin-empty-td">최근 주문 내역이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 🌟 배송 상태 목록 */}
        <div className="admin-container" style={{ flex: 1 }}>
          <h2 className="admin-section-title">배송 상태 (배송 중)</h2>
          <table className="admin-table-simple">
            <thead>
              <tr style={ds.tableHeadRow}>
                <th style={ds.th}>주문 ID</th>
                <th style={ds.th}>사용자</th>
                <th style={ds.thRight}>상태</th>
              </tr>
            </thead>
            <tbody>
              {dbShippingOrders.length > 0 ? dbShippingOrders.map((ship, idx) => (
                <tr key={idx} className="admin-table-body-row">
                  <td style={ds.td}>{ship.id}</td>
                  <td style={ds.td}>{ship.user}</td>
                  <td style={ds.tdRight}>
                    <span style={ds.shippingBadge}>{ship.status}</span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="admin-empty-td">국제배송 중인 내역이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ==========================================
// 🎨 스타일 정의 영역 (추후 분리 가능)
// ==========================================

// 1. 공통 변수 (색상)
const colors = {
  white: '#fff',
  border: '#f1f5f9',
  borderDark: '#e2e8f0',
  textMain: '#0f172a',
  textSub: '#64748b',
  textDark: '#334155',
  accent: '#3b82f6',
  badgeBgInfo: '#eef2ff',
  badgeTextInfo: '#4f46e5',
  emptyText: '#94a3b8',
};

const baseTh: React.CSSProperties = { padding: '12px 8px' };
const baseTd: React.CSSProperties = { padding: '16px 8px' };

const baseBadge: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '12px',
  fontWeight: '600',
};

// 4. 최종 컴포넌트 스타일 (ds)
const ds: Record<string, React.CSSProperties> = {
  // 레이아웃
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '30px',
  },
  flexGap: {
    display: 'flex',
    gap: '24px',
  },
  
  // 통계 카드
  statIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },

  detailBtn: {
    padding: '6px 12px',
    border: `1px solid ${colors.borderDark}`,
    backgroundColor: colors.white,
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },

  // 🌟 다른 admin 페이지들과 값이 달라(테두리색/배경 없음) 공용 .admin-table-head-row로
  // 통일하지 않고 그대로 둡니다.
  tableHeadRow: {
    borderBottom: `2px solid ${colors.border}`,
    color: colors.textSub,
    fontSize: '14px',
  },

  // 테이블 셀 (TH)
  th: { ...baseTh },
  thCenter: { ...baseTh, textAlign: 'center' },
  thRight: { ...baseTh, textAlign: 'right' },
  
  // 테이블 셀 (TD)
  td: { ...baseTd },
  tdBold: { ...baseTd, fontWeight: '500' },
  tdCenter: { ...baseTd, textAlign: 'center' },
  tdRight: { ...baseTd, textAlign: 'right' },
  tdAmount: { ...baseTd, textAlign: 'right', fontWeight: '600' },
  tdEllipsis: {
    ...baseTd,
    maxWidth: '200px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  
  // 뱃지 (Badge)
  badge: {
    ...baseBadge,
    borderRadius: '20px',
  },
  shippingBadge: {
    ...baseBadge,
    borderRadius: '6px',
    backgroundColor: colors.badgeBgInfo,
    color: colors.badgeTextInfo,
  },
};