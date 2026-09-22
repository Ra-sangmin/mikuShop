"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import '../admin-common.css';
import './delivery-premium.css';
import { DELIVERY_STATUS, DELIVERY_STATUS_LABEL, ORDER_STATUS, type DeliveryStatus } from '@/src/types/order';
import { useFitTable, FitColGroup, FitTh } from '../components/useFitTable';
import { buildTrackingUrl, hasTrackingPlaceholder } from '@/lib/shippingCarriers';
import {
  AdminHero, HeroButton, KpiCard, SearchField, SegFilter, EmptyRow, SkeletonRows,
  useToasts, ToastStack, fmtDateTime, BundleItemsPanel,
  BundleBadge, ProductCell,
} from '../components/AdminPremiumKit';
import {
  Truck, ArrowClockwise, ArrowsClockwise, FloppyDisk, Package, AirplaneTilt,
  ShieldCheck, House, CheckCircle, ArrowSquareOut, Copy, Sparkle,
} from '@phosphor-icons/react';

/* ============================================================
   🚚 배송 관리 — 국제배송(SHIPPING) 주문의 배송 단계를 관리합니다.
   ============================================================ */

const deliveryStatusOptions = Object.keys(DELIVERY_STATUS) as DeliveryStatus[];

// 배송 단계별 색 ("r, g, b")
const DELIVERY_TONE: Record<DeliveryStatus, string> = {
  PREPARING: '99, 102, 241',
  SHIPPED: '14, 165, 233',
  CUSTOMS: '217, 119, 6',
  LOCAL_DELIVERY: '147, 51, 234',
  COMPLETED: '22, 163, 74',
};

type Filter = 'ACTIVE' | 'ALL' | DeliveryStatus;

const COLUMNS = ['date', 'user', 'product', 'address', 'tracking', 'status', 'manage'] as const;
const DEFAULT_WIDTHS = {
  date: 190,
  user: 130,
  address: 300,
  product: 300,
  tracking: 190,
  status: 150,
  manage: 150,
};

type DeliveryRow = {
  id: string;             // orderId
  registeredAt: string;
  user: string;
  address: any | null;
  recipient: string;
  product: string;
  productImageUrl: string | null;
  productUrl: string;     // 상품 원본 페이지 ('' = 없음)
  serviceRequest: string; // 부가 서비스 ("사진 검수, 포장 보완")
  productOption: string;
  productRequest: string;
  productPrice: number;   // 현지 통화(엔) 기준 상품가
  status: DeliveryStatus;
  trackingNo: string;     // 화면 표시용 ('' = 없음)
  carrierId: number | null;
  bundleId: string;       // 합포장 묶음 번호 ('' = 단독 주문)
};

/**
 * 화면에 실제로 그리는 행.
 * 합포장은 여러 주문을 한 행으로 합쳐 보여주므로, 대표 행에 묶음 정보를 얹습니다.
 * (admin/orders 와 같은 방식입니다)
 */
type DisplayRow = DeliveryRow & {
  isBundleGroup?: boolean;
  bundleItems?: DeliveryRow[];
};

/**
 * 합포장(bundleId)이 같은 주문을 한 건으로 묶습니다.
 *
 * 이 화면은 국제배송(SHIPPING) 건만 다루고 합포장은 같은 송장으로 함께 나가므로,
 * 표의 행도 탭의 숫자도 "묶음 하나 = 한 건"이어야 합니다.
 * 표와 숫자가 같은 함수를 쓰도록 여기 한 곳에 둡니다. (따로 세면 서로 어긋납니다)
 */
function groupByBundle(rows: DeliveryRow[]): DisplayRow[] {
  const groups = new Map<string, DeliveryRow[]>();
  rows.forEach(o => {
    if (!o.bundleId) return;
    const list = groups.get(o.bundleId);
    if (list) list.push(o);
    else groups.set(o.bundleId, [o]);
  });

  const seen = new Set<string>();
  const result: DisplayRow[] = [];

  rows.forEach(o => {
    if (!o.bundleId) { result.push(o); return; }
    if (seen.has(o.bundleId)) return;
    seen.add(o.bundleId);

    const group = groups.get(o.bundleId) ?? [o];
    // 묶음번호는 있는데 여기 한 건만 있으면(검색·필터로 걸러진 경우 포함) 그냥 단독으로 둡니다.
    if (group.length <= 1) { result.push(o); return; }

    // 대표는 주문번호 오름차순 첫 건으로 고정합니다.
    // 정렬·검색에 따라 대표가 바뀌면 관리자가 보는 번호가 매번 달라져 헷갈립니다.
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    const rep = sorted[0];

    // 주문일시는 묶음에서 가장 이른 주문 기준입니다. (주문 관리와 같은 규칙)
    // 대표 주문의 날짜를 쓰면 "이 묶음이 언제 시작됐는지"와 어긋납니다.
    const earliest = sorted.reduce((min, o) =>
      new Date(o.registeredAt).getTime() < new Date(min.registeredAt).getTime() ? o : min
    , sorted[0]);

    result.push({
      ...rep,
      registeredAt: earliest.registeredAt,
      product: `${rep.product} 외 ${sorted.length - 1}건`,
      isBundleGroup: true,
      bundleItems: sorted,
    });
  });

  return result;
}

// 🏠 도로명 주소에서 "○○로 / ○○길"부터 끝까지(도로명 + 번지)만 — 마이페이지 배송 준비 수취인과 같은 규칙
function lastRoadPart(address?: string) {
  const tokens = address?.trim().split(/\s+/) || [];
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (/(로|길)$/.test(tokens[i])) return tokens.slice(i).join(' ');
  }
  return tokens[tokens.length - 1] || '';
}

export default function DeliveryManagement() {
  const [orders, setOrders] = useState<DeliveryRow[]>([]);
  const [originalOrders, setOriginalOrders] = useState<DeliveryRow[]>([]);
  const [carriers, setCarriers] = useState<{ id: number; name: string; url: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  // 🏠 수취인 자세히 보기 팝업
  const [addrDetail, setAddrDetail] = useState<DisplayRow | null>(null);
  const [addrCopied, setAddrCopied] = useState(false);
  useEffect(() => {
    if (!addrDetail) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAddrDetail(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addrDetail]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<Filter>('ACTIVE');
  const [changedOrderIds, setChangedOrderIds] = useState<Set<string>>(new Set());
  // 🌟 "모든 상품 보기"로 펼쳐 둔 합포장 묶음번호
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());

  const { toasts, pushToast } = useToasts();

  // 🌟 공통 표 (가로 꽉 채움 · 연쇄 열 조절 · 관리 열 오른쪽 고정)
  const table = useFitTable({
    storageKey: 'admin_delivery_column_widths_v2',
    columns: COLUMNS,
    defaultWidths: DEFAULT_WIDTHS,
    pinned: { key: 'manage', minWidth: 110 },
  });

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/orders');
      const data = await res.json();
      if (data.success) {
        // 🐛 status는 Prisma enum('SHIPPING')으로 내려옵니다. 한글 라벨과 비교하면 항상 불일치합니다.
        const rows: DeliveryRow[] = data.orders
          .filter((o: any) => o.status === ORDER_STATUS.SHIPPING)
          .map((o: any) => ({
            id: o.orderId,
            registeredAt: o.registeredAt,
            user: o.user?.name || '알 수 없음',
            address: o.addressId ? (o.user?.addresses?.find((a: any) => a.id === o.addressId) || null) : null,
            recipient: o.recipient || '',
            product: o.productName,
            productImageUrl: o.productImageUrl || null,
            productUrl: o.productUrl || '',
            serviceRequest: o.serviceRequest || '',
            productOption: o.productOption || '',
            productRequest: o.productRequest || '',
            productPrice: Number(o.productPrice) || 0,
            status: (o.deliveryStatus || DELIVERY_STATUS.PREPARING) as DeliveryStatus,
            trackingNo: o.trackingNo || '',
            carrierId: o.shippingCarrierId ?? null,
            bundleId: o.bundleId || '',
          }));
        setOrders(rows);
        setOriginalOrders(rows);
        setChangedOrderIds(new Set());
      } else {
        pushToast('error', data.error || '배송 목록을 불러오지 못했습니다.');
      }
    } catch (error) {
      console.error("데이터 가져오기 실패:", error);
      pushToast('error', '배송 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    fetchOrders();
    fetch('/api/admin/shipping-carriers')
      .then(res => res.json())
      .then(data => { if (data.success) setCarriers(data.carriers); })
      .catch(err => console.error('배송 업체 목록 조회 실패:', err));
  }, [fetchOrders]);

  const handleAutoSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/orders/sync-tracking', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        pushToast('success', data.message || '배송 상태를 동기화했습니다.');
        if (data.updatedCount > 0) fetchOrders();
      } else {
        pushToast('error', data.error || '동기화에 실패했습니다.');
      }
    } catch {
      pushToast('error', '서버 통신 오류가 발생했습니다.');
    } finally {
      setIsSyncing(false);
    }
  };

  // 🌟 합포장은 같은 송장으로 함께 움직이므로, 대표 행에서 상태를 바꾸면 묶음 전체에 적용합니다.
  //    한 묶음 안에서 배송 단계가 갈리면 고객 안내가 어긋납니다.
  const handleStatusChange = (orderIds: string[], newStatus: DeliveryStatus) => {
    setOrders(prev => prev.map(o => (orderIds.includes(o.id) ? { ...o, status: newStatus } : o)));
    setChangedOrderIds(prev => {
      const next = new Set(prev);
      orderIds.forEach(id => {
        const originalStatus = originalOrders.find(o => o.id === id)?.status;
        if (originalStatus !== newStatus) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const handleSaveChanges = async () => {
    if (changedOrderIds.size === 0) return;
    setIsSaving(true);
    // 저장에 필요한 값만 보냅니다. (송장번호가 없으면 null)
    const updates = orders
      .filter(o => changedOrderIds.has(o.id))
      .map(o => ({ id: o.id, status: o.status, trackingNo: o.trackingNo.trim() || null }));

    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, type: 'delivery' }),
      });
      if (res.ok) {
        pushToast('success', `${updates.length}건의 배송 상태를 저장했습니다.`);
        setChangedOrderIds(new Set());
        setOriginalOrders(orders);
      } else {
        pushToast('error', '저장에 실패했습니다.');
      }
    } catch {
      pushToast('error', '통신 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const openTracking = (row: DeliveryRow) => {
    const carrier = carriers.find(c => c.id === row.carrierId);
    // 🔎 업체 주소에 {tracking} 자리가 있으면 조회 결과로 바로 갑니다.
    //    그런 경우엔 붙여넣을 필요가 없어 복사하지 않고 안내 문구도 달라집니다.
    const direct = hasTrackingPlaceholder(carrier?.url) && !!row.trackingNo;
    if (row.trackingNo && !direct) navigator.clipboard?.writeText(row.trackingNo).catch(() => {});
    if (carrier?.url) {
      window.open(buildTrackingUrl(carrier.url, row.trackingNo) || carrier.url, '_blank', 'noopener,noreferrer');
      pushToast('success', direct
        ? `${carrier.name} 에서 ${row.trackingNo} 조회 화면을 열었습니다.`
        : row.trackingNo ? `송장번호를 복사했습니다. ${carrier.name} 조회 페이지에 붙여넣으세요.` : `${carrier.name} 조회 페이지를 열었습니다.`);
    } else if (row.trackingNo) {
      pushToast('success', '송장번호를 복사했습니다. (배송 업체가 지정되지 않은 주문입니다)');
    }
  };

  /* ---------- 집계 ---------- */
  // 🌟 합포장은 한 건으로 셉니다. 표에도 한 행으로 나오므로, 탭 숫자가 주문 개수를 세면
  //    "진행 중 4건"인데 표에는 2줄만 보이는 어긋남이 생깁니다.
  const bundledOrders = useMemo(() => groupByBundle(orders), [orders]);

  const counts = useMemo(() => {
    const c: Record<DeliveryStatus, number> = { PREPARING: 0, SHIPPED: 0, CUSTOMS: 0, LOCAL_DELIVERY: 0, COMPLETED: 0 };
    bundledOrders.forEach(o => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [bundledOrders]);
  const activeCount = bundledOrders.length - counts.COMPLETED;
  const noTrackingCount = bundledOrders.filter(o => o.status !== 'COMPLETED' && !o.trackingNo).length;

  /* ---------- 검색 ---------- */
  // 검색어가 "주문번호"에 걸린 주문. 이것만 따로 두는 이유는, 묶음번호·주문자명으로 찾으면
  // 묶음 전체가 걸려 특정할 대상이 없기 때문입니다. 자동 펼침과 하이라이트의 기준입니다.
  const focusedOrderIds = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return new Set<string>();
    return new Set(orders.filter(o => o.id.toLowerCase().includes(q)).map(o => o.id));
  }, [orders, searchTerm]);

  /* ---------- 필터 ---------- */
  const rendered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const byStatus = orders.filter(o => {
      // 방금 바꾼 행은 필터와 상관없이 계속 보여줍니다. (저장 전 사라지지 않도록)
      if (changedOrderIds.has(o.id)) return true;
      if (filter === 'ACTIVE' && o.status === 'COMPLETED') return false;
      if (filter !== 'ACTIVE' && filter !== 'ALL' && o.status !== filter) return false;
      return true;
    });

    if (!q) return byStatus;

    // 묶음번호(MB…)로도 찾을 수 있게 합니다. 고객 문의는 묶음번호로 오는 경우가 있습니다.
    const matched = byStatus.filter(o =>
      o.id.toLowerCase().includes(q) ||
      o.user.toLowerCase().includes(q) ||
      o.trackingNo.toLowerCase().includes(q) ||
      o.bundleId.toLowerCase().includes(q)
    );

    // 🌟 합포장은 한 건만 걸려도 묶음 전체를 남깁니다.
    //    안 그러면 묶음이 쪼개져 단독 행으로 보이고, "모든 상품 보기"도 사라집니다.
    const matchedBundles = new Set(matched.map(o => o.bundleId).filter(Boolean));
    if (matchedBundles.size === 0) return matched;

    const matchedIds = new Set(matched.map(o => o.id));
    return byStatus.filter(o => matchedIds.has(o.id) || (o.bundleId && matchedBundles.has(o.bundleId)));
  }, [orders, filter, searchTerm, changedOrderIds]);

  // 🌟 주문번호로 찾으면 그 주문이 든 묶음을 자동으로 펼칩니다.
  //    대표 행에는 "○○ 외 N건"만 나와서, 찾던 상품이 실제로 어느 것인지 보이지 않습니다.
  //    편 뒤에는 평범한 펼침 상태이므로 관리자가 접기를 누르면 그대로 닫힙니다.
  useEffect(() => {
    if (focusedOrderIds.size === 0) return;
    const toOpen = orders.filter(o => o.bundleId && focusedOrderIds.has(o.id)).map(o => o.bundleId);
    if (toOpen.length === 0) return;

    setExpandedBundles(prev => {
      const next = new Set(prev);
      let changed = false;
      toOpen.forEach(id => { if (!next.has(id)) { next.add(id); changed = true; } });
      // 바뀐 게 없으면 같은 Set 을 돌려줘야 렌더가 반복되지 않습니다.
      return changed ? next : prev;
    });
  }, [focusedOrderIds, orders]);

  /* ---------- 합포장 묶기 ---------- */
  const displayRows = useMemo(() => groupByBundle(rendered), [rendered]);

  const toggleBundle = (bundleId: string) => {
    setExpandedBundles(prev => {
      const next = new Set(prev);
      if (next.has(bundleId)) next.delete(bundleId);
      else next.add(bundleId);
      return next;
    });
  };

  const carrierName = (id: number | null) => carriers.find(c => c.id === id)?.name;

  return (
    <div className="ap-page">
      <AdminHero
        eyebrow="DELIVERY" icon={<Sparkle size={11} weight="fill" />}
        title="배송 관리"
        description="국제배송 중인 주문의 배송 단계를 확인하고 변경합니다."
        accentRgb="14, 165, 233"
        actions={<>
          <HeroButton onClick={fetchOrders} disabled={isLoading}>
            <ArrowClockwise size={15} weight="bold" className={isLoading ? 'ap-spin' : ''} /> 새로고침
          </HeroButton>
          <HeroButton primary onClick={handleAutoSync} disabled={isSyncing}>
            <ArrowsClockwise size={15} weight="bold" className={isSyncing ? 'ap-spin' : ''} />
            {isSyncing ? '조회 중…' : '배송상태 자동 동기화'}
          </HeroButton>
        </>}
      >
        <div className="ap-kpis">
          <KpiCard icon={<Truck size={18} weight="duotone" />} label="배송 진행 중" loading={isLoading}
            value={<>{activeCount.toLocaleString()}<small>건</small></>}
            foot={noTrackingCount > 0 ? <span className="is-warn">송장번호 없음 {noTrackingCount}건</span> : '모든 건에 송장번호가 있습니다'}
            active={filter === 'ACTIVE'} onClick={() => setFilter('ACTIVE')} />
          <KpiCard icon={<ShieldCheck size={18} weight="duotone" />} label="국내 통관 중" toneRgb="252, 211, 77" loading={isLoading}
            value={<>{counts.CUSTOMS.toLocaleString()}<small>건</small></>}
            foot="통관 지연 여부를 확인하세요"
            active={filter === 'CUSTOMS'} onClick={() => setFilter('CUSTOMS')} />
          <KpiCard icon={<House size={18} weight="duotone" />} label="국내 배송 중" toneRgb="216, 180, 254" loading={isLoading}
            value={<>{counts.LOCAL_DELIVERY.toLocaleString()}<small>건</small></>}
            foot={`배송시작 ${counts.SHIPPED.toLocaleString()}건 · 배송전 ${counts.PREPARING.toLocaleString()}건`}
            active={filter === 'LOCAL_DELIVERY'} onClick={() => setFilter('LOCAL_DELIVERY')} />
          <KpiCard icon={<CheckCircle size={18} weight="duotone" />} label="배송 완료" toneRgb="110, 231, 183" loading={isLoading}
            value={<>{counts.COMPLETED.toLocaleString()}<small>건</small></>}
            foot="완료된 건은 정산 관리로 넘어갑니다"
            active={filter === 'COMPLETED'} onClick={() => setFilter('COMPLETED')} />
        </div>
      </AdminHero>

      <section className="ap-panel">
        <div className="ap-toolbar">
          <div className="ap-toolbar-left">
            <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="주문번호, 묶음번호, 주문자, 송장번호 검색" />
            <SegFilter<Filter>
              ariaLabel="배송 상태"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'ACTIVE', label: '진행 중', count: activeCount },
                ...deliveryStatusOptions.map(s => ({ value: s as Filter, label: DELIVERY_STATUS_LABEL[s], count: counts[s], dotRgb: DELIVERY_TONE[s] })),
                { value: 'ALL', label: '전체', count: bundledOrders.length },
              ]}
            />
          </div>
          <div className="ap-toolbar-right">
            <span className="ap-count">표시 <b>{displayRows.length.toLocaleString()}</b>건</span>
            <button type="button" className="ap-btn is-lg is-primary"
              onClick={handleSaveChanges} disabled={changedOrderIds.size === 0 || isSaving}>
              <FloppyDisk size={14} weight="bold" />
              {isSaving ? '저장 중…' : '상태 저장'}
              <span className="ap-btn-badge">{changedOrderIds.size}</span>
            </button>
          </div>
        </div>

        <div className="ap-table-wrap" ref={table.wrapRef}>
          <table className={`admin-table-resizable ${table.tableClassName}`} style={table.tableStyle}>
            <FitColGroup table={table} />
            <thead>
              <tr className="admin-table-head-row">
                <FitTh table={table} columnKey="date">주문일시 / 주문번호</FitTh>
                <FitTh table={table} columnKey="user">주문자</FitTh>
                <FitTh table={table} columnKey="product">상품 정보</FitTh>
                <FitTh table={table} columnKey="address">수취인</FitTh>
                <FitTh table={table} columnKey="tracking">배송 업체 · 송장</FitTh>
                <FitTh table={table} columnKey="status">배송 상태</FitTh>
                <FitTh table={table} columnKey="manage">관리</FitTh>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={COLUMNS} pinnedKey="manage" />
              ) : displayRows.length === 0 ? (
                <EmptyRow colSpan={COLUMNS.length} icon={<Package size={24} weight="duotone" />}
                  title={searchTerm ? '검색 결과가 없습니다' : '표시할 배송 건이 없습니다'}
                  description={searchTerm ? '다른 주문번호·주문자·송장번호로 검색해 보세요.' : '국제배송으로 넘어간 주문이 이곳에 표시됩니다.'} />
              ) : displayRows.map(o => {
                // 묶음이면 포함된 모든 주문이 대상입니다. (상태 변경·변경 표시가 묶음 전체에 걸립니다)
                const groupIds = o.bundleItems ? o.bundleItems.map(b => b.id) : [o.id];
                const isChanged = groupIds.some(id => changedOrderIds.has(id));
                const carrier = carrierName(o.carrierId);
                const isOpen = expandedBundles.has(o.bundleId);
                return (
                  <Fragment key={o.bundleId && o.isBundleGroup ? `bundle-${o.bundleId}` : o.id}>
                  <tr className={`admin-table-body-row aft-row ${isChanged ? 'is-changed' : ''} ${o.isBundleGroup ? `abx-row ${isOpen ? 'abx-open' : ''}` : ''}`}>
                    <td className="ap-td is-left">
                      {/* 🌟 묶음은 개별 주문번호 대신 묶음번호를 보여줍니다. (주문 관리와 같은 방식)
                          대표 한 건의 번호만 띄우면 나머지 주문의 번호로 착각하기 쉽습니다.
                          개별 번호는 "모든 상품 보기"를 펼치면 전부 나옵니다. */}
                      {!o.isBundleGroup && <span className="ap-id">{o.id}</span>}
                      <span className="ap-sub">{fmtDateTime(o.registeredAt)}</span>
                      {o.isBundleGroup && (
                        <BundleBadge count={o.bundleItems!.length} bundleId={o.bundleId} />
                      )}
                    </td>
                    <td className="ap-td"><span className="ap-strong">{o.user}</span></td>
                    <td className="ap-td is-left">
                      {/* 주문 관리와 같은 모양: 썸네일 · 한 줄 이름 · [원본 | 전체 N건] · 서비스/옵션/요청 아이콘 */}
                      <ProductCell
                        name={o.product}
                        imageUrl={o.productImageUrl}
                        productUrl={o.productUrl}
                        serviceRequest={o.isBundleGroup ? o.bundleItems!.map(b => b.serviceRequest).join(',') : o.serviceRequest}
                        option={o.isBundleGroup ? o.bundleItems!.map(b => b.productOption).filter(v => v && v !== '-').join(' / ') : o.productOption}
                        request={o.isBundleGroup ? o.bundleItems!.map(b => b.productRequest).filter(v => v && v !== '-').join(' / ') : o.productRequest}
                        bundle={o.isBundleGroup ? { open: isOpen, count: o.bundleItems!.length, onToggle: () => toggleBundle(o.bundleId) } : undefined}
                      />
                    </td>
                    <td className="ap-td">
                      {/* 회원 화면(마이페이지 · 배송 준비)과 같은 모양: 이름 + (도로명 · 번지). 누르면 연락처 · 통관번호 등 자세히 */}
                      {o.address ? (
                        <button type="button" className="dlv-rcpt" onClick={() => { setAddrCopied(false); setAddrDetail(o); }}
                          title="눌러서 연락처 · 주소 · 통관번호 보기">
                          <span className="dlv-rcpt-name">{o.address.recipientName || '미지정'}</span>
                          {o.address.address && <span className="dlv-rcpt-addr">({lastRoadPart(o.address.address)})</span>}
                        </button>
                      ) : (
                        <span className="ap-empty-mark">{o.recipient ? `${o.recipient} (주소 정보 없음)` : '배송지 미지정'}</span>
                      )}
                    </td>
                    <td className="ap-td">
                      {o.trackingNo ? (
                        <>
                          <button type="button" className="ap-id" style={{ cursor: 'pointer' }} title="송장번호 복사"
                            onClick={() => navigator.clipboard?.writeText(o.trackingNo).then(() => pushToast('success', '송장번호를 복사했습니다.')).catch(() => {})}>
                            {o.trackingNo} <Copy size={10} weight="bold" />
                          </button>
                          <span className="ap-sub">{carrier || '배송 업체 미지정'}</span>
                        </>
                      ) : (
                        <span className="ap-empty-mark">송장번호 없음</span>
                      )}
                    </td>
                    <td className="ap-td">
                      <select
                        value={o.status}
                        onChange={(e) => handleStatusChange(groupIds, e.target.value as DeliveryStatus)}
                        className="ap-pill-select"
                        style={{ ['--b-rgb' as string]: DELIVERY_TONE[o.status] } as React.CSSProperties}
                        aria-label={o.isBundleGroup ? `합포장 ${groupIds.length}건 배송 상태 변경` : '배송 상태 변경'}
                      >
                        {deliveryStatusOptions.map(s => <option key={s} value={s}>{DELIVERY_STATUS_LABEL[s]}</option>)}
                      </select>
                    </td>
                    <td className={table.pinnedCellClass('manage', 'ap-td')}>
                      <button type="button" className="ap-btn is-ghost"
                        disabled={!o.trackingNo && !carrier}
                        onClick={() => openTracking(o)}>
                        <AirplaneTilt size={13} weight="bold" /> 추적 <ArrowSquareOut size={11} weight="bold" />
                      </button>
                    </td>
                  </tr>

                  {/* 🌟 합포장에 묶인 주문들 — 대표 행에는 "외 N건"으로만 나오므로 여기서 전부 보여줍니다. */}
                  {o.isBundleGroup && isOpen && (
                    <tr>
                      <td colSpan={COLUMNS.length} className="abx-cell">
                        <BundleItemsPanel
                          items={o.bundleItems!.map(sub => ({
                            id: sub.id,
                            dateText: fmtDateTime(sub.registeredAt),
                            name: sub.product,
                            priceText: `¥${sub.productPrice.toLocaleString()}`,
                            imageUrl: sub.productImageUrl,
                            productUrl: sub.productUrl,
                          }))}
                          highlightIds={focusedOrderIds}
                        />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {addrDetail?.address && (() => {
        const a = addrDetail.address;
        const full = `[${a.zipCode}] ${a.address} ${a.detailAddress || ''}`.trim();
        const copyAll = async () => {
          try {
            await navigator.clipboard.writeText(`${a.recipientName} ${a.phone || ''}\n${full}${a.personalCustomsCode ? `\n통관번호 ${a.personalCustomsCode}` : ''}`);
            setAddrCopied(true);
            setTimeout(() => setAddrCopied(false), 1500);
          } catch { /* 복사 권한이 없으면 무시 */ }
        };
        const rows: [string, React.ReactNode, string?][] = [
          ['받는 분', <strong key="n">{a.recipientName}{a.recipientEnglishName ? <em> · {a.recipientEnglishName}</em> : null}</strong>],
          ['연락처', a.phone || '-', 'is-mono'],
          ['주소', <><span className="dlv-addr-zip">{a.zipCode}</span> {a.address}{a.detailAddress && <><br />{a.detailAddress}</>}</>],
          ['통관번호', a.personalCustomsCode || '-', 'is-mono'],
        ];
        return (
          <div className="dlv-addr-overlay" onClick={() => setAddrDetail(null)}>
            <div className="dlv-addr-modal" role="dialog" aria-modal="true" aria-label="수취인 정보" onClick={(e) => e.stopPropagation()}>
              <div className="dlv-addr-head">
                <span className="dlv-addr-mark"><House size={20} weight="duotone" /></span>
                <div>
                  <strong>수취인 정보</strong>
                  <span>{addrDetail.isBundleGroup ? `묶음 ${addrDetail.bundleId} · ${addrDetail.bundleItems!.length}건` : addrDetail.id}</span>
                </div>
                <button type="button" className="dlv-addr-close" onClick={() => setAddrDetail(null)} aria-label="닫기">×</button>
              </div>
              <dl className="dlv-addr-list">
                {rows.map(([k, v, cls]) => (
                  <div key={k}><dt>{k}</dt><dd className={cls || ''}>{v}</dd></div>
                ))}
              </dl>
              <div className="dlv-addr-actions">
                <button type="button" className={`dlv-addr-btn is-ghost ${addrCopied ? 'is-done' : ''}`} onClick={copyAll}>
                  <Copy size={14} weight="bold" /> {addrCopied ? '복사됨' : '전체 복사'}
                </button>
                <button type="button" className="dlv-addr-btn is-primary" onClick={() => setAddrDetail(null)}>닫기</button>
              </div>
            </div>
          </div>
        );
      })()}

      <ToastStack toasts={toasts} />
    </div>
  );
}
