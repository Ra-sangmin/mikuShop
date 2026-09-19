"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ORDER_STATUS, DELIVERY_STATUS, ORDER_STATUS_LABEL, DELIVERY_STATUS_LABEL,
  type OrderStatus, type DeliveryStatus,
} from '@/src/types/order';
import {
  Receipt, HourglassMedium, Truck, Coins, CaretRight, Tray, Package,
} from '@phosphor-icons/react';
import '../admin-common.css';
import './dashboard-premium.css';

// 🐛 이 화면은 주문 상태를 한글 라벨('장바구니', '국제배송' …)과 비교하고 있었지만 API는
//    Prisma enum('CART', 'SHIPPING' …)을 내려줍니다. 조건이 한 번도 참이 되지 않아
//    장바구니·실패 주문이 "처리 중"에 섞이고, 배송 중/누적 정산액은 0에 고정돼 있었습니다.
//    "처리 중"에서 제외할 상태: 아직 접수 전(장바구니)·종료된 건(실패)·배송 단계로 넘어간 건
const EXCLUDED_FROM_PROCESSING: string[] = [
  ORDER_STATUS.CART,
  ORDER_STATUS.FAILED,
  ORDER_STATUS.SHIPPING,
];

// 🌟 상태별 뱃지 색상. 화면에는 enum 대신 ORDER_STATUS_LABEL 의 한글이 보입니다.
//    (예전에는 한글 라벨로 분기하고 있어서 모든 뱃지가 회색으로 떨어졌습니다.)
const ORDER_TONE: Record<string, { text: string; rgb: string }> = {
  [ORDER_STATUS.BID_PENDING]: { text: '#b45309', rgb: '245, 158, 11' },
  [ORDER_STATUS.BIDDING]: { text: '#b45309', rgb: '245, 158, 11' },
  [ORDER_STATUS.BID_SUCCESS]: { text: '#0f766e', rgb: '13, 148, 136' },
  [ORDER_STATUS.PAID]: { text: '#15803d', rgb: '34, 197, 94' },
  [ORDER_STATUS.ARRIVED]: { text: '#1d4ed8', rgb: '59, 130, 246' },
  [ORDER_STATUS.PREPARING]: { text: '#6d28d9', rgb: '139, 92, 246' },
  [ORDER_STATUS.PAYMENT_REQ]: { text: '#c2410c', rgb: '234, 88, 12' },
  [ORDER_STATUS.PAYMENT_DONE]: { text: '#15803d', rgb: '34, 197, 94' },
  [ORDER_STATUS.SHIPPING]: { text: '#4338ca', rgb: '79, 70, 229' },
  [ORDER_STATUS.FAILED]: { text: '#b91c1c', rgb: '239, 68, 68' },
};
const DEFAULT_TONE = { text: '#475569', rgb: '100, 116, 139' };

const DELIVERY_TONE: Record<string, { text: string; rgb: string }> = {
  [DELIVERY_STATUS.PREPARING]: { text: '#6d28d9', rgb: '139, 92, 246' },
  [DELIVERY_STATUS.SHIPPED]: { text: '#4338ca', rgb: '79, 70, 229' },
  [DELIVERY_STATUS.CUSTOMS]: { text: '#b45309', rgb: '245, 158, 11' },
  [DELIVERY_STATUS.LOCAL_DELIVERY]: { text: '#1d4ed8', rgb: '59, 130, 246' },
  [DELIVERY_STATUS.COMPLETED]: { text: '#15803d', rgb: '34, 197, 94' },
};

interface RecentOrder { id: string; user: string; product: string; status: string; amount: string; }
interface ShippingOrder { id: string; user: string; status: string; }

/** 사용자 이름의 첫 글자 (아바타용) */
const initialOf = (name: string) => (name?.trim()?.[0] || '?').toUpperCase();

export default function AdminDashboard() {
  const router = useRouter();

  // 🌟 데이터 State 관리
  const [dbRecentOrders, setDbRecentOrders] = useState<RecentOrder[]>([]);
  const [dbShippingOrders, setDbShippingOrders] = useState<ShippingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🌟 통계 데이터 State 관리
  const [todayOrderCount, setTodayOrderCount] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);
  const [shippingCount, setShippingCount] = useState(0);
  const [totalSettlement, setTotalSettlement] = useState(0);
  // 🌟 막대 그래프의 분모로 쓸 "관리 대상 주문 수"(장바구니·실패 제외)
  const [managedCount, setManagedCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    const fetchDashboardOrders = async () => {
      try {
        const res = await fetch('/api/admin/orders');
        const data = await res.json();

        if (data.success) {
          // 1. 최신 주문 5개 (관리 대상만 필터링)
          const formatted: RecentOrder[] = data.orders
            .filter((order: any) => !EXCLUDED_FROM_PROCESSING.includes(order.status))
            .slice(0, 5)
            .map((dbOrder: any) => ({
              id: dbOrder.orderId,
              user: dbOrder.user?.name || '알 수 없음',
              product: dbOrder.productName,
              status: dbOrder.status,
              amount: Math.round(dbOrder.productPrice * 9.05).toLocaleString(),
            }));
          setDbRecentOrders(formatted);

          // 2. 배송 상태 필터링
          const shippingOrders: ShippingOrder[] = data.orders
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
          const completed = data.orders.filter((order: any) => order.deliveryStatus === DELIVERY_STATUS.COMPLETED);
          const totalKRW = completed.reduce((sum: number, order: any) => sum + (order.productPrice * 9.05), 0);
          setTotalSettlement(Math.round(totalKRW));
          setCompletedCount(completed.length);

          // 6. 막대 그래프 분모 (장바구니·실패를 뺀 전체 주문)
          setManagedCount(
            data.orders.filter((order: any) =>
              ![ORDER_STATUS.CART, ORDER_STATUS.FAILED].includes(order.status)
            ).length
          );
        }
      } catch (error) {
        console.error("데이터 불러오기 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardOrders();
  }, []);

  /** 분모가 0일 때도 안전하게 막대 폭(%)을 계산합니다. */
  const ratio = (value: number) => (managedCount > 0 ? Math.min(100, Math.round((value / managedCount) * 100)) : 0);

  const STATS = [
    {
      key: 'today', eyebrow: 'TODAY', title: '오늘의 주문',
      value: todayOrderCount, unit: '건', icon: <Receipt size={21} weight="duotone" />,
      from: '#60a5fa', to: '#2563eb', rgb: '59, 130, 246',
      percent: ratio(todayOrderCount),
      foot: <>전체 관리 대상 <b>{managedCount}건</b> 중 {ratio(todayOrderCount)}%</>,
    },
    {
      key: 'processing', eyebrow: 'IN PROGRESS', title: '처리 중',
      value: processingCount, unit: '건', icon: <HourglassMedium size={21} weight="duotone" />,
      from: '#fbbf24', to: '#d97706', rgb: '245, 158, 11',
      percent: ratio(processingCount),
      foot: <>구매·입고·결제 대기 <b>{processingCount}건</b></>,
    },
    {
      key: 'shipping', eyebrow: 'SHIPPING', title: '배송 중',
      value: shippingCount, unit: '건', icon: <Truck size={21} weight="duotone" />,
      from: '#34d399', to: '#059669', rgb: '16, 185, 129',
      percent: ratio(shippingCount),
      foot: <>국제배송 진행 <b>{shippingCount}건</b></>,
    },
    {
      key: 'settlement', eyebrow: 'SETTLEMENT', title: '누적 정산액',
      value: totalSettlement, unit: '', won: true, icon: <Coins size={21} weight="duotone" />,
      from: '#a78bfa', to: '#7c3aed', rgb: '139, 92, 246',
      percent: ratio(completedCount),
      foot: <>배송 완료 <b>{completedCount}건</b> 기준</>,
    },
  ];

  return (
    <div className="adm-dash">

      {/* 🌟 통계 카드 섹션 */}
      <div className="adm-stat-grid">
        {STATS.map(card => (
          <article
            key={card.key}
            className="adm-stat"
            style={{ ['--c-from' as any]: card.from, ['--c-to' as any]: card.to, ['--c-rgb' as any]: card.rgb }}
          >
            <div className="adm-stat-top">
              <span className="adm-stat-icon" aria-hidden="true">{card.icon}</span>
              <span className="adm-stat-eyebrow">{card.eyebrow}</span>
            </div>
            <span className="adm-stat-title">{card.title}</span>
            {isLoading ? (
              <span className="adm-skel is-lg" style={{ width: '60%' }} />
            ) : (
              <strong className="adm-stat-value" translate="no">
                {card.won && <span className="adm-won">₩</span>}
                {card.value.toLocaleString()}
                {card.unit && <span className="adm-unit">{card.unit}</span>}
              </strong>
            )}
            <div className="adm-stat-meter" aria-hidden="true">
              <i style={{ width: `${isLoading ? 0 : card.percent}%` }} />
            </div>
            <span className="adm-stat-foot">{card.foot}</span>
          </article>
        ))}
      </div>

      <div className="adm-cols">

        {/* 🌟 최근 주문 목록 */}
        <div className="adm-col-main">
          <section className="adm-panel">
            <header className="adm-panel-head">
              <span className="adm-panel-titles">
                <span className="adm-panel-eyebrow">RECENT ORDERS</span>
                <h2 className="adm-panel-title">최근 주문 목록</h2>
              </span>
              <span className="adm-chip">최신 {dbRecentOrders.length}건</span>
              <button type="button" className="adm-more" onClick={() => router.push('/admin/orders')}>
                자세히 보기 <CaretRight size={12} weight="bold" />
              </button>
            </header>

            <table className="adm-table">
              <thead>
                <tr>
                  <th>주문 ID</th>
                  <th>사용자</th>
                  <th>상품명</th>
                  <th className="adm-th-c">상태</th>
                  <th className="adm-th-r">결제 금액</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j}><span className="adm-skel" style={{ width: j === 2 ? '90%' : '70%' }} /></td>
                      ))}
                    </tr>
                  ))
                ) : dbRecentOrders.length > 0 ? dbRecentOrders.map(order => {
                  const tone = ORDER_TONE[order.status] || DEFAULT_TONE;
                  return (
                    <tr
                      key={order.id}
                      className="is-clickable"
                      onClick={() => router.push('/admin/orders')}
                    >
                      <td><span className="adm-id">{order.id}</span></td>
                      <td>
                        <span className="adm-user">
                          <span className="adm-avatar" aria-hidden="true">{initialOf(order.user)}</span>
                          <span className="adm-user-name">{order.user}</span>
                        </span>
                      </td>
                      <td><div className="adm-product" title={order.product}>{order.product}</div></td>
                      <td className="adm-td-c">
                        <span
                          className="adm-badge"
                          style={{ ['--b-text' as any]: tone.text, ['--b-rgb' as any]: tone.rgb }}
                        >
                          <i className="adm-dot" />
                          {ORDER_STATUS_LABEL[order.status as OrderStatus] || order.status}
                        </span>
                      </td>
                      <td className="adm-td-r">
                        <span className="adm-amount" translate="no"><i>₩</i>{order.amount}</span>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5}>
                      <div className="adm-empty">
                        <span className="adm-empty-icon"><Tray size={22} weight="duotone" /></span>
                        <strong>최근 주문 내역이 없습니다</strong>
                        <span>새 주문이 접수되면 이곳에 표시됩니다.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </div>

        {/* 🌟 배송 상태 목록 */}
        <div className="adm-col-side">
          <section className="adm-panel">
            <header className="adm-panel-head">
              <span className="adm-panel-titles">
                <span className="adm-panel-eyebrow">DELIVERY</span>
                <h2 className="adm-panel-title">배송 상태</h2>
              </span>
              <span className="adm-chip">{dbShippingOrders.length}건</span>
            </header>

            <div className="adm-ship-list">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="adm-ship">
                    <span className="adm-skel" style={{ width: 34, height: 34, borderRadius: 11 }} />
                    <span className="adm-ship-body">
                      <span className="adm-skel" style={{ width: '60%' }} />
                      <span className="adm-skel" style={{ width: '38%', height: 9 }} />
                    </span>
                  </div>
                ))
              ) : dbShippingOrders.length > 0 ? dbShippingOrders.map(ship => {
                const tone = DELIVERY_TONE[ship.status] || DEFAULT_TONE;
                return (
                  <div
                    key={ship.id}
                    className="adm-ship"
                    style={{ ['--b-text' as any]: tone.text, ['--b-rgb' as any]: tone.rgb }}
                  >
                    <span className="adm-ship-icon" aria-hidden="true"><Package size={17} weight="duotone" /></span>
                    <span className="adm-ship-body">
                      <span className="adm-ship-id">{ship.id}</span>
                      <span className="adm-ship-user">{ship.user}</span>
                    </span>
                    <span
                      className="adm-badge"
                      style={{ ['--b-text' as any]: tone.text, ['--b-rgb' as any]: tone.rgb }}
                    >
                      <i className="adm-dot" />
                      {DELIVERY_STATUS_LABEL[ship.status as DeliveryStatus] || ship.status}
                    </span>
                  </div>
                );
              }) : (
                <div className="adm-empty">
                  <span className="adm-empty-icon"><Truck size={22} weight="duotone" /></span>
                  <strong>배송 중인 주문이 없습니다</strong>
                  <span>국제배송이 시작되면 이곳에 표시됩니다.</span>
                </div>
              )}
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
