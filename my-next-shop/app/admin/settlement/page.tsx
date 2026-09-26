"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import '../admin-common.css';
import './settlement-premium.css';
import { DELIVERY_STATUS } from '@/src/types/order';
import { useFitTable, FitColGroup, FitTh } from '../components/useFitTable';
import {
  AdminHero, HeroButton, KpiCard, SearchField, SegFilter, EmptyRow, SkeletonRows,
  useToasts, ToastStack, fmtDate, downloadCsv,
} from '../components/AdminPremiumKit';
import {
  ArrowClockwise, DownloadSimple, Wallet, Receipt, ChartLineUp, CalendarCheck, Package, Sparkle,
} from '@phosphor-icons/react';

/* ============================================================
   💰 정산 관리 — 배송 완료(COMPLETED)된 주문의 정산 내역
   ============================================================ */

// ⚠️ 기존 화면과 같은 고정 환율입니다. (실제 결제 환율과 다를 수 있습니다)
const SETTLEMENT_RATE = 9.05;

type Period = 'all' | 'thisMonth' | 'lastMonth' | 'last30';

const COLUMNS = ['date', 'id', 'user', 'address', 'product', 'jpy', 'krw'] as const;
const DEFAULT_WIDTHS = {
  date: 120,
  id: 190,
  user: 130,
  address: 300,
  product: 330,
  jpy: 130,
  krw: 160,
};

type SettlementRow = {
  id: string;
  completedAt: string;
  user: string;
  address: any | null;
  recipient: string;
  product: string;
  productImageUrl: string | null;
  jpy: number;
  krw: number;
};

const startOfMonth = (offset = 0) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset, 1);
};

export default function SettlementManagement() {
  const [orders, setOrders] = useState<SettlementRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState<Period>('all');
  const { toasts, pushToast } = useToasts();

  // 🌟 공통 표 — 마지막 '정산 금액' 열이 오른쪽에 붙어 남은 폭을 차지합니다.
  const table = useFitTable({
    storageKey: 'admin_settlement_column_widths_v2',
    columns: COLUMNS,
    defaultWidths: DEFAULT_WIDTHS,
    pinned: { key: 'krw', minWidth: 140 },
  });

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/orders');
      const data = await res.json();
      if (data.success) {
        // 🐛 deliveryStatus는 Prisma enum('COMPLETED')입니다. 한글 라벨과 비교하면 항상 불일치합니다.
        const rows: SettlementRow[] = data.orders
          .filter((o: any) => o.deliveryStatus === DELIVERY_STATUS.COMPLETED)
          .map((o: any) => ({
            id: o.orderId,
            completedAt: o.shippedAt || o.registeredAt,
            user: o.user?.name || '알 수 없음',
            address: o.addressId ? (o.user?.addresses?.find((a: any) => a.id === o.addressId) || null) : null,
            recipient: o.recipient || '',
            product: o.productName,
            productImageUrl: o.productImageUrl || null,
            jpy: o.productPrice || 0,
            krw: Math.round((o.productPrice || 0) * SETTLEMENT_RATE),
          }))
          .sort((a: SettlementRow, b: SettlementRow) => +new Date(b.completedAt) - +new Date(a.completedAt));
        setOrders(rows);
      } else {
        pushToast('error', data.error || '정산 내역을 불러오지 못했습니다.');
      }
    } catch (error) {
      console.error("데이터 가져오기 실패:", error);
      pushToast('error', '정산 내역을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  /* ---------- 기간 ---------- */
  const inPeriod = useCallback((iso: string, p: Period) => {
    const t = new Date(iso).getTime();
    if (p === 'thisMonth') return t >= startOfMonth(0).getTime();
    if (p === 'lastMonth') return t >= startOfMonth(-1).getTime() && t < startOfMonth(0).getTime();
    if (p === 'last30') return t >= Date.now() - 30 * 86400000;
    return true;
  }, []);

  const periodCounts = useMemo(() => ({
    all: orders.length,
    thisMonth: orders.filter(o => inPeriod(o.completedAt, 'thisMonth')).length,
    lastMonth: orders.filter(o => inPeriod(o.completedAt, 'lastMonth')).length,
    last30: orders.filter(o => inPeriod(o.completedAt, 'last30')).length,
  }), [orders, inPeriod]);

  const rendered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return orders.filter(o => {
      if (!inPeriod(o.completedAt, period)) return false;
      if (!q) return true;
      return o.id.toLowerCase().includes(q) || o.user.toLowerCase().includes(q) || o.product?.toLowerCase().includes(q);
    });
  }, [orders, period, searchTerm, inPeriod]);

  /* ---------- 집계 ---------- */
  const sum = (list: SettlementRow[]) => list.reduce((s, o) => s + o.krw, 0);
  const totalAll = sum(orders);
  const thisMonthList = orders.filter(o => inPeriod(o.completedAt, 'thisMonth'));
  const lastMonthList = orders.filter(o => inPeriod(o.completedAt, 'lastMonth'));
  const thisMonthSum = sum(thisMonthList);
  const lastMonthSum = sum(lastMonthList);
  const monthDelta = lastMonthSum > 0 ? Math.round(((thisMonthSum - lastMonthSum) / lastMonthSum) * 100) : null;
  const avg = orders.length ? Math.round(totalAll / orders.length) : 0;

  const renderedKrw = sum(rendered);
  const renderedJpy = rendered.reduce((s, o) => s + o.jpy, 0);

  const exportCsv = () => {
    downloadCsv(
      `mikushop_settlement_${new Date().toISOString().slice(0, 10)}.csv`,
      ['완료일자', '주문번호', '구매자', '수취인', '주소', '상품명', '상품가(JPY)', '정산금액(KRW)'],
      rendered.map(o => [
        fmtDate(o.completedAt), o.id, o.user, o.address?.recipientName || o.recipient,
        o.address ? `[${o.address.zipCode}] ${o.address.address} ${o.address.detailAddress}` : '',
        o.product, o.jpy, o.krw,
      ]),
    );
    pushToast('success', `${rendered.length.toLocaleString()}건을 내보냈습니다.`);
  };

  return (
    <div className="ap-page stl-page">
      <AdminHero
        eyebrow="SETTLEMENT" icon={<Sparkle size={11} weight="fill" />}
        title="정산 관리"
        description={`배송이 완료된 주문의 정산 내역입니다. 정산 금액은 상품가 × ${SETTLEMENT_RATE} 기준으로 계산합니다.`}
        accentRgb="16, 185, 129"
        actions={<>
          <HeroButton onClick={fetchOrders} disabled={isLoading}>
            <ArrowClockwise size={15} weight="bold" className={isLoading ? 'ap-spin' : ''} /> 새로고침
          </HeroButton>
          <HeroButton primary onClick={exportCsv} disabled={isLoading || rendered.length === 0}>
            <DownloadSimple size={15} weight="bold" /> CSV 내보내기
          </HeroButton>
        </>}
      >
        <div className="ap-kpis">
          <KpiCard icon={<Wallet size={18} weight="duotone" />} label="누적 정산액" toneRgb="110, 231, 183" loading={isLoading}
            value={<><span className="ap-cur">₩</span>{totalAll.toLocaleString()}</>}
            foot={`전체 ${orders.length.toLocaleString()}건`} />
          <KpiCard icon={<CalendarCheck size={18} weight="duotone" />} label="이번 달 정산액" loading={isLoading}
            value={<><span className="ap-cur">₩</span>{thisMonthSum.toLocaleString()}</>}
            foot={monthDelta === null
              ? `이번 달 ${thisMonthList.length.toLocaleString()}건`
              : <span className={monthDelta >= 0 ? 'is-up' : 'is-down'}>지난달 대비 {monthDelta >= 0 ? '+' : ''}{monthDelta}%</span>}
            active={period === 'thisMonth'} onClick={() => setPeriod(period === 'thisMonth' ? 'all' : 'thisMonth')} />
          <KpiCard icon={<Receipt size={18} weight="duotone" />} label="정산 완료 건수" toneRgb="147, 197, 253" loading={isLoading}
            value={<>{orders.length.toLocaleString()}<small>건</small></>}
            foot={`지난달 ${lastMonthList.length.toLocaleString()}건`} />
          <KpiCard icon={<ChartLineUp size={18} weight="duotone" />} label="평균 객단가" toneRgb="253, 186, 116" loading={isLoading}
            value={<><span className="ap-cur">₩</span>{avg.toLocaleString()}</>}
            foot="주문 1건당 평균 정산 금액" />
        </div>
      </AdminHero>

      <section className="ap-panel">
        <div className="ap-toolbar">
          <div className="ap-toolbar-left">
            <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="주문번호, 구매자, 상품명 검색" />
            <SegFilter<Period>
              ariaLabel="기간"
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'all', label: '전체', count: periodCounts.all },
                { value: 'thisMonth', label: '이번 달', count: periodCounts.thisMonth },
                { value: 'lastMonth', label: '지난 달', count: periodCounts.lastMonth },
                { value: 'last30', label: '최근 30일', count: periodCounts.last30 },
              ]}
            />
          </div>
          <div className="ap-toolbar-right">
            <span className="ap-count">합계 <b>₩{renderedKrw.toLocaleString()}</b></span>
          </div>
        </div>

        <div className="ap-table-wrap" ref={table.wrapRef}>
          <table className={`admin-table-resizable ${table.tableClassName}`} style={table.tableStyle}>
            <FitColGroup table={table} />
            <thead>
              <tr className="admin-table-head-row">
                <FitTh table={table} columnKey="date">완료 일자</FitTh>
                <FitTh table={table} columnKey="id">주문 번호</FitTh>
                <FitTh table={table} columnKey="user">구매자</FitTh>
                <FitTh table={table} columnKey="address">수취인 · 주소</FitTh>
                <FitTh table={table} columnKey="product">상품</FitTh>
                <FitTh table={table} columnKey="jpy">상품가 (JPY)</FitTh>
                <FitTh table={table} columnKey="krw">정산 금액 (KRW)</FitTh>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={COLUMNS} pinnedKey="krw" />
              ) : rendered.length === 0 ? (
                <EmptyRow colSpan={COLUMNS.length} icon={<Receipt size={24} weight="duotone" />}
                  title={searchTerm || period !== 'all' ? '조건에 맞는 정산 내역이 없습니다' : '정산 완료된 내역이 없습니다'}
                  description={searchTerm || period !== 'all' ? '검색어나 기간을 바꿔 보세요.' : '배송 완료된 주문이 이곳에 표시됩니다.'} />
              ) : rendered.map(o => (
                <tr key={o.id} className="admin-table-body-row aft-row">
                  <td className="ap-td stl-td-date"><span className="ap-strong ap-tabnum">{fmtDate(o.completedAt)}</span></td>
                  <td className="ap-td stl-td-id"><span className="ap-id">{o.id}</span></td>
                  <td className="ap-td stl-td-user"><span className="ap-strong">{o.user}</span></td>
                  <td className="ap-td is-left stl-td-addr">
                    {o.address ? (
                      <div className="ap-address">
                        <span className="ap-address-top">{o.address.recipientName}<span>{o.address.phone}</span></span>
                        <span className="ap-address-line" title={`[${o.address.zipCode}] ${o.address.address} ${o.address.detailAddress}`}>
                          [{o.address.zipCode}] {o.address.address} {o.address.detailAddress}
                        </span>
                      </div>
                    ) : (
                      <span className="ap-empty-mark">{o.recipient ? `${o.recipient} (주소 정보 없음)` : '배송지 미지정'}</span>
                    )}
                  </td>
                  <td className="ap-td is-left stl-td-product">
                    <span className="ap-product">
                      <span className="ap-thumb">
                        {o.productImageUrl ? <img src={o.productImageUrl} alt="" referrerPolicy="no-referrer" /> : <Package size={16} weight="duotone" />}
                      </span>
                      <span className="ap-product-name" title={o.product}>{o.product}</span>
                    </span>
                  </td>
                  <td className="ap-td is-right stl-td-jpy"><span className="ap-money is-sub"><i>¥</i>{o.jpy.toLocaleString()}</span></td>
                  <td className={table.pinnedCellClass('krw', 'ap-td is-right stl-td-krw')}>
                    <span className="ap-money"><i>₩</i>{o.krw.toLocaleString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            {!isLoading && rendered.length > 0 && (
              <tfoot>
                <tr>
                  <td className="ap-td is-left" colSpan={5}>
                    <span className="ap-strong">합계</span> <span className="ap-section-hint">{rendered.length.toLocaleString()}건</span>
                  </td>
                  <td className="ap-td is-right"><span className="ap-money is-sub"><i>¥</i>{renderedJpy.toLocaleString()}</span></td>
                  <td className={table.pinnedCellClass('krw', 'ap-td is-right')}>
                    <span className="ap-money"><i>₩</i>{renderedKrw.toLocaleString()}</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <ToastStack toasts={toasts} />
    </div>
  );
}
