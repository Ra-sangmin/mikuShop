"use client";

import React, { useState, useEffect } from 'react';
import { useFitTable, FitColGroup, FitTh } from '../components/useFitTable';
import { useAdminExchangeRate, jpyToKrw } from '../components/useAdminExchangeRate';
import { currentUnpaid, nextRound, rowTotal, paidTotal } from '@/lib/shippingFees';
import { AdminHero, HeroButton, KpiCard, SearchField, SegFilter, EmptyRow, SkeletonRows, BundleItemsPanel, BundleBadge, BundleToggle, UserBasicInfo, type BasicInfoUser, UserSummaryStats, type SummaryUser, useToasts, ToastStack, gradeTone, toneVars } from '../components/AdminPremiumKit';
import { useRouter } from 'next/navigation';
// 🌟 글로벌 상수 및 라벨 임포트
import { ORDER_STATUS, ORDER_STATUS_LABEL as BASE_STATUS_LABEL, OrderStatus } from '@/src/types/order';
import { ADMIN_ORDERS_CHANGED_EVENT } from '@/app/admin/adminEvents';

// 🏷 관리자 주문 관리에서만 쓰는 상태 이름 — 장바구니(CART)는 회원 화면과 같은 말(장바구니)로 보여 줍니다.
const ORDER_STATUS_LABEL: Record<OrderStatus, string> = { ...BASE_STATUS_LABEL, [ORDER_STATUS.CART]: '장바구니' };
import '../admin-common.css';
import './orders-premium.css';
import { extractVariantId, withVariantId } from '@/lib/itemUrl';
import OrderDetailModal, { parseServices, SERVICE_ICON } from '../components/OrderDetailModal';
import {
  Wrench, FloppyDisk, Package,
  MapPinLine, EnvelopeSimple, ArrowRight, Truck,
  Sparkle, ShoppingCart, Warehouse, CreditCard, ClipboardText, Gavel,
  ArrowSquareOut, Tag, PencilSimple, CaretUp, ChatText, CaretDown, CircleNotch, CheckCircle, AirplaneTilt, HourglassMedium, UserCircle, X, Copy,
} from '@phosphor-icons/react';

// 🌟 Enum 키를 기반으로 옵션 생성
const statusOptions = Object.keys(ORDER_STATUS).filter(key => key !== 'ALL') as OrderStatus[];

// 🌟 진행 상태 탭에서 뺄 상태.
//    국제배송부터는 배송 관리(/admin/delivery)가 맡으므로 이 화면의 탭에서는 보이지 않습니다.
//    행의 상태 변경 드롭다운에는 그대로 남습니다 — 주문을 국제배송으로 넘기는 곳이 거기라서입니다.
const TAB_HIDDEN_STATUSES: string[] = [ORDER_STATUS.SHIPPING];
const tabStatusOptions = statusOptions.filter(key => !TAB_HIDDEN_STATUSES.includes(key));

/** '#4f46e5' → '79, 70, 229' (상태 탭 점 색에 사용) */
const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

/** 📨 알림 발송 이력 한 줄. /api/admin/orders/notifications 응답과 짝을 이룹니다. */
type NotificationLogRow = {
  id: number;
  channel: string;
  status: string;
  success: boolean;
  error: string | null;
  createdAt: string;
  /** 이 발송에 함께 묶여 나간 주문번호들 (알림톡은 여러 건을 한 통으로 보냅니다) */
  groupOrderIds: string[];
  /** 고객이 받은 본문에 찍힌 대표 주문번호 */
  leadOrderId: string | null;
};

// 🌟 mypage/status와 동일하게 합포장(bundleId) 묶음을 한 행으로 표시하는 상태들
const GROUPABLE_STATUSES = [ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING];

// 🌟 가중치 로직
const statusWeight: Record<string, number> = {
  [ORDER_STATUS.CART]: 1,
  [ORDER_STATUS.FAILED]: 99,
  [ORDER_STATUS.PAID]: 2,
  [ORDER_STATUS.WAITING]: 3,
  [ORDER_STATUS.ARRIVED]: 4,
  [ORDER_STATUS.PREPARING]: 5,
  [ORDER_STATUS.PAYMENT_REQ]: 6,
  [ORDER_STATUS.PAYMENT_DONE]: 7,
  [ORDER_STATUS.SHIPPING]: 8
};

// 🧾 부가 서비스 목록/아이콘은 주문 상세 팝업과 같이 쓰려고 OrderDetailModal.tsx 에 있습니다.

// ⚡ 탭별 메인 액션 — 그 단계에서 가장 자주 하는 '다음 단계'로 바로 넘깁니다.
//    (구매 요청 · 경매 요청 · 경매 낙찰 성공 · 입고 완료 · 배송비 요청 · 경매/구매 실패는 제외 — 회원 결제나 종료 상태라 관리자가 바로 넘기지 않음)
const QUICK_FLOW: Record<string, { next: OrderStatus; label: string }> = {
  // 경매 요청은 회원이 결제해야 다음 단계로 넘어가므로 메인 버튼을 두지 않습니다. (구매 요청처럼 선택 칸만)
  [ORDER_STATUS.BIDDING]:      { next: ORDER_STATUS.BID_SUCCESS,  label: '낙찰 처리' },
  // 경매 낙찰 성공도 회원 결제 후에 넘어가므로 메인 버튼을 두지 않습니다.
  [ORDER_STATUS.PAID]:         { next: ORDER_STATUS.ARRIVED,      label: '입고 처리' },
  [ORDER_STATUS.WAITING]:      { next: ORDER_STATUS.ARRIVED,      label: '입고 처리' },
  // 입고 완료도 메인 버튼 없이 선택 칸만 둡니다.
  [ORDER_STATUS.PREPARING]:    { next: ORDER_STATUS.PAYMENT_REQ,  label: '배송비 요청' },
  // 배송비 요청도 회원이 배송비를 결제해야 넘어가므로 메인 버튼을 두지 않습니다.
  [ORDER_STATUS.PAYMENT_DONE]: { next: ORDER_STATUS.SHIPPING,     label: '국제 발송' },
};

// 메인 버튼 색 = 넘어갈 단계의 색
const QUICK_TONE: Record<string, string> = {
  [ORDER_STATUS.BIDDING]: '#d97706',
  [ORDER_STATUS.BID_SUCCESS]: '#059669',
  [ORDER_STATUS.PAID]: '#2563eb',
  [ORDER_STATUS.WAITING]: '#0891b2',
  [ORDER_STATUS.ARRIVED]: '#059669',
  [ORDER_STATUS.PREPARING]: '#7c3aed',
  [ORDER_STATUS.PAYMENT_REQ]: '#ea580c',
  [ORDER_STATUS.PAYMENT_DONE]: '#0d9488',
  [ORDER_STATUS.SHIPPING]: '#4f46e5',
};
const QUICK_ICON: Record<string, React.ReactNode> = {
  [ORDER_STATUS.BIDDING]: <Gavel size={13} weight="bold" />,
  [ORDER_STATUS.BID_SUCCESS]: <CheckCircle size={13} weight="bold" />,
  [ORDER_STATUS.PAID]: <CreditCard size={13} weight="bold" />,
  [ORDER_STATUS.WAITING]: <HourglassMedium size={13} weight="bold" />,
  [ORDER_STATUS.ARRIVED]: <Warehouse size={13} weight="bold" />,
  [ORDER_STATUS.PREPARING]: <Package size={13} weight="bold" />,
  [ORDER_STATUS.PAYMENT_REQ]: <Truck size={13} weight="bold" />,
  [ORDER_STATUS.PAYMENT_DONE]: <CheckCircle size={13} weight="bold" />,
  [ORDER_STATUS.SHIPPING]: <AirplaneTilt size={13} weight="bold" />,
};

// 🗂 상단 탭 묶음 — 누가 처리할 차례인지
//    관리자 처리 필요: 관리자가 확인 · 처리해야 다음으로 넘어가는 단계
//    회원 처리 대기  : 회원의 결제 · 요청을 기다리는 단계
// 🔔 주문 상태를 바꾼 뒤, 왼쪽 메뉴 '주문 관리' 옆 숫자를 바로 다시 세게 알리는 이벤트 이름
const ADMIN_TABS: string[] = [ORDER_STATUS.BIDDING, ORDER_STATUS.FAILED, ORDER_STATUS.PAID, ORDER_STATUS.WAITING, ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_DONE];
const USER_TABS: string[] = [ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING, ORDER_STATUS.BID_SUCCESS, ORDER_STATUS.ARRIVED, ORDER_STATUS.PAYMENT_REQ];

export default function OrderManagement() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  // 🔖 보던 탭을 주소(?tab=)에 남겨, '변경사항 저장' 뒤 새로고침돼도 같은 탭에 머뭅니다.
  const tabReadyRef = React.useRef(false);
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab && (tab === '전체' || (statusOptions as string[]).includes(tab))) setStatusFilter(tab);
    tabReadyRef.current = true;
  }, []);
  useEffect(() => {
    if (!tabReadyRef.current) return;
    const url = new URL(window.location.href);
    if (statusFilter === '전체') url.searchParams.delete('tab');
    else url.searchParams.set('tab', statusFilter);
    window.history.replaceState(window.history.state, '', url.toString());
  }, [statusFilter]);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'default' | 'asc' | 'desc' }>({ key: 'date', direction: 'asc' });
  // 🕒 '처리 중 전체' 탭은 제목을 눌러 직접 정렬하기 전까지 '최근 변경순'으로 보여줍니다.
  const [sortTouched, setSortTouched] = useState(false);
  useEffect(() => { setSortTouched(false); }, [statusFilter]);
  const useRecentOrder = statusFilter === '전체' && !sortTouched;

  const defaultWidths = {
    date: 300, user: 150, address: 350, packing: 80, product: 600, 
    request: 300, price: 150, bidStatus: 120, status: 200, manage: 150
  };
  const [orders, setOrders] = useState<any[]>([]);
  const [originalOrders, setOriginalOrders] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [changedOrderIds, setChangedOrderIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  // 💬 입고 일괄 처리처럼 한 회원에게 여러 건이 몰릴 때, 이번 저장의 알림톡만 끕니다.
  //    (서버도 회원당 1통으로 자동 제한하지만, 아예 안 보내고 싶을 때 쓰는 스위치입니다)
  const [skipAlimtalk, setSkipAlimtalk] = useState(false);
  // 메인 액션 버튼은 팝업을 거쳐 호출되기도 하므로, 누른 순간의 토글 값을 ref 로 읽습니다.
  const skipAlimtalkRef = React.useRef(skipAlimtalk);
  useEffect(() => { skipAlimtalkRef.current = skipAlimtalk; }, [skipAlimtalk]);
  // 🧪 로컬(localhost / 127.0.0.1)에서 테스트할 때는 실제 고객에게 알림톡이 나가지 않도록 기본으로 켜 둡니다.
  //    (운영 사이트에서는 기본 꺼짐. 로컬에서도 필요하면 스위치를 꺼서 보낼 수 있습니다)
  useEffect(() => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      setSkipAlimtalk(true);
      skipAlimtalkRef.current = true;
    }
  }, []);

  // 📨 알림 발송 이력 (CS 문의 대응용)
  //    알림톡은 여러 주문을 한 통으로 묶어 보내므로, 고객이 대표 주문번호 하나만 들고 문의합니다.
  //    그 발송에 함께 묶였던 주문이 무엇인지 여기서 확인합니다.
  const [logModalOrderId, setLogModalOrderId] = useState<string | null>(null);
  const [logRows, setLogRows] = useState<NotificationLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  // 🌟 합포장(bundleId) 그룹을 mypage/status처럼 한 행으로 펼쳐보기 위한 상태
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());
  // 💸 배송비 입력칸은 평소엔 요약 칩으로 접어 두고, 누른 주문만 펼칩니다. (행 높이를 줄이려고)
  const [openFeeIds, setOpenFeeIds] = useState<Set<string>>(new Set());
  // 📋 상세보기 팝업 (수취인 주소 등)
  const [detailOrder, setDetailOrder] = useState<any | null>(null);
  // 🌏 영문 주소 · 복사 등 팝업 안의 상태는 OrderDetailModal 이 가지고 있습니다.
  const toggleFee = (id: string) => setOpenFeeIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // 💱 헤더에 보이는 "최종 표시 환율"(1엔당 원). 배송비를 엔화로 받아 원화로 환산할 때 씁니다.
  const { rate: exchangeRate, basisUnit: rateBasisUnit } = useAdminExchangeRate();

  // 🌟 배송 준비중 -> 배송비 요청 전환 시, 국제 배송비/일본 내 배송비를 한 팝업에서 함께 입력받기 위한 상태
  //  mode: 'full'  = 최초 배송비 요청 (국제 + 현지 + 추가)
  //        'extra' = 배송비 결제 완료 뒤 추가로 생긴 비용 (추가 금액만, 새 회차)
  const [feeModal, setFeeModal] = useState<
    { orderId: string; bundleId: string | null; count: number; mode: 'full' | 'extra'; round: number } | null
  >(null);
  const [feeModalIntl, setFeeModalIntl] = useState('');
  const [feeModalDomestic, setFeeModalDomestic] = useState('');
  // 💸 배송비로 묶기 애매한 실비(포장 보강 · 분리 배송 등)를 따로 받는 칸. 이것만 원화입니다.
  const [feeModalExtra, setFeeModalExtra] = useState('');
  // 📝 추가 청구 사유. 고객 화면에도 보여서 "왜 더 내는지" 문의를 줄입니다.
  const [feeModalMemo, setFeeModalMemo] = useState('');

  // 🚚 배송비 결제 완료 -> 국제배송 전환 시, 배송 업체와 송장번호를 한 팝업에서 함께 입력받습니다.
  //    업체 목록은 관리자 > 국제 배송 업체 정보 관리(shipping_carriers)에서 가져옵니다.
  const [carriers, setCarriers] = useState<{ id: number; name: string; url: string }[]>([]);
  const [shipModal, setShipModal] = useState<{ orderId: string; bundleId: string | null; count: number } | null>(null);
  const [shipModalCarrierId, setShipModalCarrierId] = useState('');
  const [shipModalTrackingNo, setShipModalTrackingNo] = useState('');

  const getVisibleColumns = () => {
    // 수취인 주소는 표에서 빼고 '상세보기' 팝업에서 보여줍니다. (행 높이·가로 폭 절약)
    const cols = ['date', 'user'];
    cols.push('product', 'price');
    // 경매 상태 열은 '경매 상황' 탭에서만 보여줍니다. (처리 중 전체 탭에서는 숨김)
    if (statusFilter === ORDER_STATUS.BIDDING) cols.push('bidStatus');
    cols.push('status', 'manage');
    return cols;
  };

  // 🌟 공통 표 훅 (app/admin/components/useFitTable.tsx)
  //    - 가로 폭에 꽉 맞춤, 경계선을 끌면 이웃 열부터 차례로 최소 폭(헤더 제목 폭)까지 줄임
  //    - '관리' 열은 항상 맨 오른쪽에 붙어 남은 폭을 차지 (탭에 따라 bidStatus 열이 붙었다 빠져도 자동 반영)
  const table = useFitTable({
    storageKey: 'admin_orders_column_widths',
    columns: getVisibleColumns(),
    defaultWidths,
    pinned: { key: 'manage', minWidth: 110 },
  });

  // 🚚 배송 업체 목록은 화면에 들어올 때 한 번만 받아 둡니다 (국제배송 팝업의 드롭다운용)
  useEffect(() => {
    fetch('/api/admin/shipping-carriers')
      .then(res => res.json())
      .then(data => { if (data.success) setCarriers(data.carriers); })
      .catch(err => console.error('배송 업체 목록 조회 실패:', err));
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/admin/orders');
        const data = await res.json();

        if (data.success) {
          const tempOrders = data.orders.map((dbOrder: any) => ({
            id: dbOrder.orderId,
            date: new Date(dbOrder.registeredAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
            registeredAt: dbOrder.registeredAt,
            // 🕒 진행 상태가 마지막으로 바뀐 시각. 예전 주문(기록 없음)은 입고·발송·주문 시각 중 가장 늦은 값으로 대신합니다.
            lastChangedAt: dbOrder.statusChangedAt
              || [dbOrder.shippedAt, dbOrder.receivedAt, dbOrder.registeredAt].filter(Boolean)
                  .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0],
            user: dbOrder.user?.name || '알 수 없음',
            // 👤 주문자를 누르면 회원 기본 정보를 띄웁니다. 조회에 회원 ID 가 필요합니다.
            userId: dbOrder.userId ?? dbOrder.user?.id ?? null,
            address: dbOrder.addressId ? (dbOrder.user?.addresses?.find((a: any) => a.id === dbOrder.addressId) || null) : null,
            addressId: dbOrder.addressId, 
            recipient: dbOrder.recipient || '',
            source: '기본구매처',
            product: dbOrder.productName,
            // 🌟 합포장 펼침 목록에서 상품을 눈으로 구분할 수 있게 썸네일도 함께 받아둡니다.
            productImageUrl: dbOrder.productImageUrl || '',
            jpy: dbOrder.productPrice.toLocaleString(),
            status: dbOrder.status,
            // 🌟 2-1. bidStatus 맵핑 추가
            bidStatus: dbOrder.bidStatus || 'PENDING',
            // 💴 배송비 청구 내역. 한 주문에 여러 회차가 붙을 수 있어서,
            //    편집 대상인 "아직 결제 안 된 회차"만 평평하게 풀어 둡니다.
            fees: dbOrder.shippingFees || [],
            ...(() => {
              const f: any = currentUnpaid<any>(dbOrder.shippingFees);
              return {
                feeRound: f?.round || 0,
                feeMemo: f?.memo || '',
                intlFeeJpy: f?.intlFeeJpy || 0,
                intlFeeKrw: f?.intlFeeKrw || 0,
                domesticFeeJpy: f?.domesticFeeJpy || 0,
                domesticFeeKrw: f?.domesticFeeKrw || 0,
                extraFeeKrw: f?.extraFeeKrw || 0,
                appliedExchangeRate: f?.appliedExchangeRate || 0,
              };
            })(),
            trackingNo: dbOrder.trackingNo || '',
            shippingCarrierId: dbOrder.shippingCarrierId ?? null,
            option: dbOrder.productOption || '-',
            productUrl: dbOrder.productUrl || '',
            productRequest: dbOrder.productRequest || '-',
            serviceRequest: dbOrder.serviceRequest || '-',
            bundleId: dbOrder.bundleId || ''
          }));
          setOrders(tempOrders);
          setOriginalOrders(tempOrders);

          const ordersNeedingAddress = tempOrders.filter((o: any) => o.addressId && !o.address);
          
          if (ordersNeedingAddress.length > 0) {
            const uniqueAddressIds = Array.from(new Set(ordersNeedingAddress.map((o: any) => o.addressId)));
            await Promise.all(uniqueAddressIds.map(async (addressId) => {
              try {
                const addrRes = await fetch(`/api/addresses?id=${addressId}`);
                const addrData = await addrRes.json();
                if (addrData.success) {
                  const fetchedAddress = addrData.address || (addrData.addresses && addrData.addresses[0]);
                  if (fetchedAddress) {
                    setOrders((prevOrders: any) => prevOrders.map((o: any) => o.addressId === addressId ? { ...o, address: fetchedAddress } : o));
                    setOriginalOrders((prevOrders: any) => prevOrders.map((o: any) => o.addressId === addressId ? { ...o, address: fetchedAddress } : o));
                  }
                }
              } catch (err) {
                console.error(`주소 정보 불러오기 실패 (ID: ${addressId}):`, err);
              }
            }));
          }
        }
      } catch (error) {
        console.error("데이터 가져오기 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [router]);

  const handleStatusChange = (orderId: string, newStatus: string) => {
    const currentOrder = orders.find(o => o.id === orderId);
    if (!currentOrder) return;

    if (newStatus === ORDER_STATUS.PAYMENT_REQ && currentOrder.bundleId) {
      const bundleItems = orders.filter(o => o.bundleId === currentOrder.bundleId);
      // 배송비 두 칸은 엔화 원본으로 되돌립니다. (원화를 오늘 환율로 나누면 금액이 틀어집니다)
      const originalIntlJpy = bundleItems.reduce((sum, o) => sum + (o.intlFeeJpy || 0), 0);
      const originalDomesticJpy = bundleItems.reduce((sum, o) => sum + (o.domesticFeeJpy || 0), 0);
      const originalExtraAmount = bundleItems.reduce((sum, o) => sum + (o.extraFeeKrw || 0), 0);

      setFeeModalIntl(originalIntlJpy.toString());
      setFeeModalDomestic(originalDomesticJpy.toString());
      setFeeModalExtra(originalExtraAmount.toString());
      setFeeModalMemo(bundleItems.find(o => o.feeMemo)?.feeMemo || '');
      setFeeModal({
        orderId, bundleId: currentOrder.bundleId, count: bundleItems.length,
        mode: 'full', round: bundleItems[0].feeRound || nextRound(bundleItems[0].fees),
      });
      return;
    }

    if (newStatus === ORDER_STATUS.PREPARING && currentOrder.bundleId) {
      const bundleItems = orders.filter(o => o.bundleId === currentOrder.bundleId);
      setOrders(orders.map(order => {
        if (order.bundleId === currentOrder.bundleId) {
          return {
            ...order, status: newStatus,
            intlFeeKrw: 0, domesticFeeKrw: 0, extraFeeKrw: 0,
            intlFeeJpy: 0, domesticFeeJpy: 0, appliedExchangeRate: 0,
            feeRound: 0, feeMemo: '',
            // 아직 결제 전인 청구만 지웁니다. 이미 난 회차는 서버가 거러냅니다.
            deleteShippingFeeRound: order.feeRound || 1,
          };
        }
        return order;
      }));
      setChangedOrderIds(prev => {
        const newSet = new Set(prev);
        bundleItems.forEach(item => newSet.add(item.id));
        return newSet;
      });
      return;
    }

    if (newStatus === ORDER_STATUS.PAYMENT_REQ && currentOrder.status === ORDER_STATUS.PREPARING) {
      setFeeModalIntl((currentOrder.intlFeeJpy || 0).toString());
      setFeeModalDomestic((currentOrder.domesticFeeJpy || 0).toString());
      setFeeModalExtra((currentOrder.extraFeeKrw || 0).toString());
      setFeeModalMemo(currentOrder.feeMemo || '');
      setFeeModal({
        orderId, bundleId: null, count: 1,
        mode: 'full', round: currentOrder.feeRound || nextRound(currentOrder.fees),
      });
      return;
    }

    // 🚚 국제배송으로 넘길 때는 배송비 요청 때처럼 팝업에서 두 값(배송 업체 + 송장번호)을 받습니다.
    if (newStatus === ORDER_STATUS.SHIPPING) {
      const bundleCount = currentOrder.bundleId
        ? orders.filter(o => o.bundleId === currentOrder.bundleId).length
        : 1;
      setShipModalCarrierId(currentOrder.shippingCarrierId ? String(currentOrder.shippingCarrierId) : '');
      setShipModalTrackingNo(currentOrder.trackingNo || '');
      setShipModal({ orderId, bundleId: currentOrder.bundleId || null, count: bundleCount });
      return;
    }

    // 🌟 합포장 주문은 상태 변경 시 그룹 전체가 함께 이동해야 mypage/status의 합포장 표시가 깨지지 않습니다.
    const bundleIds = currentOrder.bundleId
      ? orders.filter(o => o.bundleId === currentOrder.bundleId).map(o => o.id)
      : [orderId];

    setOrders(orders.map(order => bundleIds.includes(order.id) ? { ...order, status: newStatus } : order));

    setChangedOrderIds(prev => {
      const newSet = new Set(prev);
      bundleIds.forEach(id => {
        const originalOrder = originalOrders.find(o => o.id === id);
        const updatedOrder = orders.find(o => o.id === id);

        if (originalOrder?.status !== newStatus || originalOrder?.intlFeeKrw !== updatedOrder?.intlFeeKrw) {
          newSet.add(id);
        } else {
          newSet.delete(id);
        }
      });
      return newSet;
    });
  };

  // 🌟 feeModal(국제 배송비 + 현지 배송비 + 추가 결제 비용 입력 팝업)에서 확인을 눌렀을 때 상태 변경을 적용합니다.
  //    배송비 두 칸은 엔화(물류센터 실지출)로 받아 그 자리에서 청구 원화로 환산하고,
  //    나중에 금액이 달라지지 않도록 엔화 원본과 적용 환율을 함께 박아 둡니다.
  const confirmFeeModal = () => {
    if (!feeModal) return;
    if (!exchangeRate) {
      alert('환율을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    const intlJpy = parseInt(feeModalIntl.replace(/[^0-9]/g, '')) || 0;
    const domesticJpy = parseInt(feeModalDomestic.replace(/[^0-9]/g, '')) || 0;
    const numExtraAmount = parseInt(feeModalExtra.replace(/[^0-9]/g, '')) || 0;
    const numAmount = jpyToKrw(intlJpy, exchangeRate);
    const numDomesticAmount = jpyToKrw(domesticJpy, exchangeRate);

    const round = feeModal.round;
    const memo = feeModalMemo.trim();

    // 합포장은 첫 주문에만 금액을 넣습니다. (기존 규칙과 같음)
    //   나머지 주문은 혹시 전에 들어간 미납 행이 있으면 지우라고 알려줍니다.
    const feeFields = (isFirst: boolean) => {
      if (!isFirst) {
        return {
          feeRound: 0, feeMemo: '',
          intlFeeJpy: 0, intlFeeKrw: 0, domesticFeeJpy: 0, domesticFeeKrw: 0,
          extraFeeKrw: 0, appliedExchangeRate: 0,
          deleteShippingFeeRound: round,
        };
      }
      const row = {
        round,
        intlFeeJpy: intlJpy,
        intlFeeKrw: numAmount,
        domesticFeeJpy: domesticJpy,
        domesticFeeKrw: numDomesticAmount,
        extraFeeKrw: numExtraAmount,
        appliedExchangeRate: exchangeRate,
        memo: memo || null,
      };
      // 화면용 평평한 값 + 저장용 shippingFee 를 함께 들려보냅니다.
      return {
        feeRound: round, feeMemo: memo,
        intlFeeJpy: intlJpy, intlFeeKrw: numAmount,
        domesticFeeJpy: domesticJpy, domesticFeeKrw: numDomesticAmount,
        extraFeeKrw: numExtraAmount, appliedExchangeRate: exchangeRate,
        shippingFee: row,
      };
    };

    if (quickViaModal) {
      // ⚡ 빠른 처리
      const target = orders.find(o => o.id === feeModal.orderId);
      setFeeModal(null);
      setQuickViaModal(false);
      if (target) handleQuickAdvance(target, ORDER_STATUS.PAYMENT_REQ, (_id, idx) => feeFields(idx === 0));
      return;
    }

    if (feeModal.bundleId) {
      const bundleId = feeModal.bundleId;
      const bundleItems = orders.filter(o => o.bundleId === bundleId);
      setOrders(orders.map(order => order.bundleId === bundleId
        ? { ...order, status: ORDER_STATUS.PAYMENT_REQ, ...feeFields(bundleItems[0].id === order.id) }
        : order));
      setChangedOrderIds(prev => {
        const newSet = new Set(prev);
        bundleItems.forEach(item => newSet.add(item.id));
        return newSet;
      });
    } else {
      const orderId = feeModal.orderId;
      setOrders(orders.map(order => order.id === orderId
        ? { ...order, status: ORDER_STATUS.PAYMENT_REQ, ...feeFields(true) }
        : order));
      setChangedOrderIds(prev => { const newSet = new Set(prev); newSet.add(orderId); return newSet; });
    }

    setFeeModal(null);
  };

  const cancelFeeModal = () => { setFeeModal(null); setQuickViaModal(false); setFeeModalMemo(''); };

  /**
   * 💴 추가 결제 요청 — 배송비 결제 완료된 주문에 비용이 더 생겼을 때.
   *    새 회차를 만들어 추가 금액만 받고, 주문을 다시 '배송비 요청' 으로 되돌립니다.
   *    이미 낸 회차는 paidAt 이 찍혔 있어 다시 청구되지 않습니다.
   */
  const startExtraFeeRequest = (order: any) => {
    const group = order.bundleId ? orders.filter(o => o.bundleId === order.bundleId) : [order];
    const head = group[0];
    setFeeModalIntl('0');
    setFeeModalDomestic('0');
    setFeeModalExtra('');
    setFeeModalMemo('');
    setFeeModal({
      orderId: order.id,
      bundleId: order.bundleId || null,
      count: group.length,
      mode: 'extra',
      round: nextRound(head.fees),
    });
    setQuickViaModal(true);
  };

  // 💴 팝업에 보여줄 환산 결과. 확인을 누를 때 저장되는 값과 같은 식입니다.
  const feeModalIntlWon = jpyToKrw(parseInt(feeModalIntl.replace(/[^0-9]/g, '')) || 0, exchangeRate);
  const feeModalDomesticWon = jpyToKrw(parseInt(feeModalDomestic.replace(/[^0-9]/g, '')) || 0, exchangeRate);
  const feeModalTotalWon = feeModalIntlWon + feeModalDomesticWon + (parseInt(feeModalExtra.replace(/[^0-9]/g, '')) || 0);

  // 🚚 shipModal(배송 업체 + 송장번호 입력 팝업)에서 확인을 눌렀을 때 상태 변경을 적용합니다.
  //    실제 DB 반영은 다른 변경과 마찬가지로 "변경사항 저장" 버튼에서 한 번에 이뤄집니다.
  const confirmShipModal = () => {
    if (!shipModal) return;
    if (!shipModalCarrierId) {
      alert('배송 업체를 선택해주세요.');
      return;
    }
    const trackingNo = shipModalTrackingNo.trim();
    if (!trackingNo) {
      alert('송장번호를 입력해주세요.');
      return;
    }

    if (quickViaModal) {
      const target = orders.find(o => o.id === shipModal.orderId);
      setShipModal(null);
      setQuickViaModal(false);
      if (target) handleQuickAdvance(target, ORDER_STATUS.SHIPPING, () => ({
        trackingNo, shippingCarrierId: Number(shipModalCarrierId),
      }));
      return;
    }

    // 🌟 합포장 주문은 같은 업체·송장번호로 그룹 전체를 함께 변경합니다.
    const bundleIds = shipModal.bundleId
      ? orders.filter(o => o.bundleId === shipModal.bundleId).map(o => o.id)
      : [shipModal.orderId];

    setOrders(orders.map(order => bundleIds.includes(order.id)
      ? { ...order, status: ORDER_STATUS.SHIPPING, trackingNo, shippingCarrierId: Number(shipModalCarrierId) }
      : order));
    setChangedOrderIds(prev => {
      const newSet = new Set(prev);
      bundleIds.forEach(id => newSet.add(id));
      return newSet;
    });

    setShipModal(null);
  };

  const cancelShipModal = () => { setShipModal(null); setQuickViaModal(false); };

  /**
   * 💴 행에서 금액을 고치면, 화면용 평평한 값과 함께 저장용 shippingFee 를 다시 만듭니다.
   *    서버는 이 키가 있을 때만 해당 회차를 씁니다. 아직 회차가 없는 주문이면 1차로 두고 새로 만듭니다.
   */
  const withFeePayload = (order: any) => {
    const round = order.feeRound || nextRound(order.fees);
    return {
      ...order,
      feeRound: round,
      shippingFee: {
        round,
        intlFeeJpy: order.intlFeeJpy || 0,
        intlFeeKrw: order.intlFeeKrw || 0,
        domesticFeeJpy: order.domesticFeeJpy || 0,
        domesticFeeKrw: order.domesticFeeKrw || 0,
        extraFeeKrw: order.extraFeeKrw || 0,
        appliedExchangeRate: order.appliedExchangeRate || 0,
        memo: order.feeMemo || null,
      },
    };
  };

  // 💴 행의 배송비 칸도 팝업과 같이 엔화로 받습니다.
  //    입력할 때마다 그 자리에서 청구 원화를 다시 환산하고, 적용한 환율도 같이 갱신합니다.
  const handleFeeJpyChange = (orderId: string, field: 'intl' | 'domestic', value: string) => {
    const jpy = parseInt(value.replace(/[^0-9]/g, '')) || 0;
    const won = jpyToKrw(jpy, exchangeRate);
    const patch = field === 'intl'
      ? { intlFeeJpy: jpy, intlFeeKrw: won }
      : { domesticFeeJpy: jpy, domesticFeeKrw: won };
    setOrders(orders.map(order => order.id === orderId
      ? withFeePayload({ ...order, ...patch, appliedExchangeRate: exchangeRate || order.appliedExchangeRate })
      : order));

    setChangedOrderIds(prev => {
      const newSet = new Set(prev);
      const originalOrder = originalOrders.find(o => o.id === orderId);
      const originalJpy = field === 'intl' ? originalOrder?.intlFeeJpy : originalOrder?.domesticFeeJpy;
      if (originalJpy !== jpy || originalOrder?.status !== orders.find(o => o.id === orderId)?.status) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  };


  // 📝 청구 사유 — 팝업을 다시 열지 않고 행에서 바로 고칠 수 있게 합니다.
  //    고객 화면에 그대로 보이는 문구라 오타를 고칠 일이 자주 생깁니다.
  const handleFeeMemoChange = (orderId: string, value: string) => {
    setOrders(orders.map(order => order.id === orderId ? withFeePayload({ ...order, feeMemo: value }) : order));

    setChangedOrderIds(prev => {
      const newSet = new Set(prev);
      const originalOrder = originalOrders.find(o => o.id === orderId);
      if ((originalOrder?.feeMemo || '') !== value || originalOrder?.status !== orders.find(o => o.id === orderId)?.status) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  };

  // 💸 추가 결제 비용 — 배송비 두 칸과 같은 방식으로 다룹니다.
  const handleExtraFeeChange = (orderId: string, value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, '')) || 0;
    setOrders(orders.map(order => order.id === orderId ? withFeePayload({ ...order, extraFeeKrw: numValue }) : order));

    setChangedOrderIds(prev => {
      const newSet = new Set(prev);
      const originalOrder = originalOrders.find(o => o.id === orderId);
      if (originalOrder?.extraFeeKrw !== numValue || originalOrder?.status !== orders.find(o => o.id === orderId)?.status) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  };

  // 🌟 경매 상태(bidStatus) 변경 핸들러
  const handleBidStatusChange = (orderId: string, newBidStatus: string) => {
    setOrders(orders.map(order => order.id === orderId ? { ...order, bidStatus: newBidStatus } : order));
    
    setChangedOrderIds(prev => {
      const newSet = new Set(prev);
      const originalOrder = originalOrders.find(o => o.id === orderId);
      const updatedOrder = orders.find(o => o.id === orderId);
      
      // 기존 진행 상태, 2차 결제 금액, 그리고 새로운 경매 상태 중 하나라도 다르면 '변경됨'으로 처리
      if (
        originalOrder?.status !== updatedOrder?.status || 
        originalOrder?.intlFeeKrw !== updatedOrder?.intlFeeKrw ||
        originalOrder?.bidStatus !== newBidStatus
      ) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId); 
      }
      return newSet;
    });
  };

  // 👤 주문자 팝업 — 회원 관리의 "기본 정보"와 같은 내용을 보여줍니다.
  //    주문을 보다가 연락처·통관부호를 확인하려고 회원 관리로 넘어갔다 돌아오는 일이 잦았습니다.
  const [userModal, setUserModal] = useState<{ id: number; name: string } | null>(null);
  const [userDetail, setUserDetail] = useState<(BasicInfoUser & SummaryUser) | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  useEffect(() => {
    if (!userModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setUserModal(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [userModal]);

  const openUserModal = async (userId: number | null, name: string) => {
    if (!userId) return;
    setUserModal({ id: userId, name });
    setUserDetail(null);
    setUserLoading(true);
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`);
      const data = await res.json();
      setUserDetail(res.ok && data.success ? data.user : null);
    } catch (error) {
      console.error('회원 정보 조회 실패:', error);
      setUserDetail(null);
    } finally {
      setUserLoading(false);
    }
  };

  const openNotificationLogs = async (orderId: string) => {
    setLogModalOrderId(orderId);
    setLogRows([]);
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/notifications?orderId=${encodeURIComponent(orderId)}`);
      const data = await res.json();
      setLogRows(res.ok && data.success ? data.logs : []);
    } catch (error) {
      console.error('발송 이력 조회 실패:', error);
      setLogRows([]);
    } finally {
      setLogsLoading(false);
    }
  };

  // ⚡ 빠른 처리 — '상품 결제 완료' 탭의 [입고 처리] 버튼.
  //    누르면 바로 저장(자동 저장)되고 입고 완료로 넘어갑니다. 합포장은 묶음 전체가 함께 넘어갑니다.
  const { toasts, pushToast } = useToasts();
  const [quickBusyId, setQuickBusyId] = useState<string | null>(null);
  const handleQuickAdvance = async (
    order: any,
    nextStatus: OrderStatus,
    patch?: (id: string, idx: number) => Record<string, unknown>,
  ) => {
    if (quickBusyId) return;
    const ids: string[] = order.bundleId
      ? orders.filter(o => o.bundleId === order.bundleId).map(o => o.id)
      : [order.id];
    const updates = ids.map((id, idx) => ({ id, status: nextStatus, ...(patch ? patch(id, idx) : {}) }));
    setQuickBusyId(order.id);
    // 💬 '알림톡 보내지 않기'가 켜져 있으면 이 처리의 알림톡도 보내지 않습니다. (모든 탭 공통)
    const noTalk = skipAlimtalkRef.current;
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, skipAlimtalk: noTalk }),
      });
      if (!res.ok) throw new Error('save failed');
      // 저장된 값으로 화면·원본을 함께 맞춰 '변경사항 저장' 대기 목록에 남지 않게 합니다.
      const nowIso = new Date().toISOString();
      const byId = new Map(updates.map(u => [u.id, { ...u, lastChangedAt: nowIso }]));
      const apply = (list: any[]) => list.map(o => byId.has(o.id) ? { ...o, ...byId.get(o.id) } : o);
      setOrders(prev => apply(prev));
      setOriginalOrders(prev => apply(prev));
      setChangedOrderIds(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
      pushToast('success', `${order.isBundleGroup ? `합포장 ${ids.length}건` : order.id} → ${ORDER_STATUS_LABEL[nextStatus]} 처리했습니다.${noTalk ? ' (알림톡 없이)' : ''}`);
      // 🔔 왼쪽 메뉴 '주문 관리' 옆 숫자를 바로 다시 세게 합니다. (AdminSidebar 가 듣습니다)
      window.dispatchEvent(new Event(ADMIN_ORDERS_CHANGED_EVENT));
    } catch {
      pushToast('error', '처리하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setQuickBusyId(null);
    }
  };

  // 팝업이 필요한 단계(배송비 요청 · 국제 발송)는 팝업에서 [확인]을 누르는 순간 바로 저장합니다.
  const [quickViaModal, setQuickViaModal] = useState(false);
  const startQuickAction = (order: any) => {
    const flow = QUICK_FLOW[order.status as string];
    if (!flow) return;
    if (flow.next === ORDER_STATUS.PAYMENT_REQ) {
      const group = order.bundleId ? orders.filter(o => o.bundleId === order.bundleId) : [order];
      setFeeModalIntl(String(group.reduce((sum, o) => sum + (o.intlFeeJpy || 0), 0)));
      setFeeModalDomestic(String(group.reduce((sum, o) => sum + (o.domesticFeeJpy || 0), 0)));
      setFeeModalExtra(String(group.reduce((sum, o) => sum + (o.extraFeeKrw || 0), 0)));
      setFeeModalMemo(group.find(o => o.feeMemo)?.feeMemo || '');
      setFeeModal({
        orderId: order.id, bundleId: order.bundleId || null, count: group.length,
        mode: 'full', round: group[0].feeRound || nextRound(group[0].fees),
      });
      setQuickViaModal(true);
      return;
    }
    if (flow.next === ORDER_STATUS.SHIPPING) {
      const count = order.bundleId ? orders.filter(o => o.bundleId === order.bundleId).length : 1;
      setShipModalCarrierId(order.shippingCarrierId ? String(order.shippingCarrierId) : '');
      setShipModalTrackingNo(order.trackingNo || '');
      setShipModal({ orderId: order.id, bundleId: order.bundleId || null, count });
      setQuickViaModal(true);
      return;
    }
    handleQuickAdvance(order, flow.next);
  };

  // 🧭 처리 중 전체 탭: 행의 빈 곳을 누르면 그 주문의 상태 탭으로 이동하고, 이동한 뒤 그 행을 잠깐 강조합니다.
  //    버튼 · 링크 · 선택 칸 · 입력칸을 누른 경우는 그 동작만 하고 이동하지 않습니다.
  const [flashOrderId, setFlashOrderId] = useState<string | null>(null);
  const jumpToStatusTab = (e: React.MouseEvent, order: any) => {
    if (statusFilter !== '전체') return;
    if (!tabStatusOptions.includes(order.status)) return;
    const el = e.target as HTMLElement;
    if (el.closest('button, a, select, input, textarea, label, .ord-split, .ord-fees, .ord-fee-chip')) return;
    if (window.getSelection()?.toString()) return; // 글자를 드래그해 복사하는 중이면 이동하지 않음
    setStatusFilter(order.status);
    setFlashOrderId(order.id);
    window.setTimeout(() => {
      const row = document.querySelector(`tr[data-order-id="${CSS.escape(order.id)}"]`) as HTMLElement | null;
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
    window.setTimeout(() => setFlashOrderId(null), 1800);
  };

  const handleSaveChanges = async () => {
    if (changedOrderIds.size === 0) return;
    setIsSaving(true);
    const updates = orders.filter(order => changedOrderIds.has(order.id));

    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, skipAlimtalk })
      });

      if (res.ok) {
        // 🔔 왼쪽 메뉴 숫자도 바로 다시 세게 합니다. (아래 새로고침 전에 한 번 알려 둡니다)
        window.dispatchEvent(new Event(ADMIN_ORDERS_CHANGED_EVENT));
        alert("성공적으로 저장되었습니다!");
        window.location.reload(); // 단순화를 위해 리로드 처리 (필요시 기존 fetch로직 복구)
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
    setSortTouched(true);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case ORDER_STATUS.CART: return { bg: '#f8fafc', text: '#64748b', border: '#cbd5e1' };
      case ORDER_STATUS.FAILED: return { bg: '#fef2f2', text: '#ef4444', border: '#fca5a5' };
      case ORDER_STATUS.BID_PENDING: return { bg: '#fdf4ff', text: '#c026d3', border: '#f0abfc' };
      case ORDER_STATUS.BIDDING: return { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' };
      case ORDER_STATUS.BID_SUCCESS: return { bg: '#ecfdf5', text: '#059669', border: '#6ee7b7' };
      case ORDER_STATUS.PAID: return { bg: '#eff6ff', text: '#3b82f6', border: '#93c5fd' };
      case ORDER_STATUS.WAITING: return { bg: '#ecfeff', text: '#0891b2', border: '#67e8f9' };
      case ORDER_STATUS.ARRIVED: return { bg: '#f0fdf4', text: '#22c55e', border: '#86efac' };
      case ORDER_STATUS.PREPARING: return { bg: '#f5f3ff', text: '#8b5cf6', border: '#c4b5fd' };
      case ORDER_STATUS.PAYMENT_REQ: return { bg: '#fff7ed', text: '#ea580c', border: '#fdba74' };
      case ORDER_STATUS.PAYMENT_DONE: return { bg: '#f0fdfa', text: '#0d9488', border: '#5eead4' };
      case ORDER_STATUS.SHIPPING: return { bg: '#eef2ff', text: '#4f46e5', border: '#a5b4fc' };
      default: return { bg: '#f8fafc', text: '#64748b', border: '#cbd5e1' };
    }
  };

  const getRenderedOrders = () => {
    let result = [...orders];
    if (statusFilter === '전체') {
      const excludeStatuses = [ORDER_STATUS.CART, ORDER_STATUS.FAILED, ORDER_STATUS.SHIPPING, '국내통관중', '국내배송중', '배송완료'];
      result = result.filter(order => !excludeStatuses.includes(order.status) || changedOrderIds.has(order.id));
    } else {
      // 국제배송 전용 분기는 없앴습니다. 그 탭을 배송 관리(/admin/delivery)로 옮겨
      // statusFilter 가 SHIPPING 이 되는 경로가 사라졌기 때문입니다.
      result = result.filter(order => order.status === statusFilter || changedOrderIds.has(order.id));
    }

    const q = searchTerm.trim().toLowerCase();
    if (q !== '') {
      // 묶음번호(MB…)로도 찾을 수 있게 합니다. 고객 문의는 묶음번호로 오는 경우가 있습니다.
      const matched = result.filter(order =>
        order.id.toLowerCase().includes(q) ||
        order.user.toLowerCase().includes(q) ||
        (order.bundleId || '').toLowerCase().includes(q)
      );

      // 🌟 합포장은 한 건만 걸려도 묶음 전체를 남깁니다.
      //    안 그러면 묶음이 쪼개져 단독 행으로 보이고, "모든 상품 보기"도 사라집니다.
      const matchedBundles = new Set(matched.map(o => o.bundleId).filter(Boolean));
      if (matchedBundles.size === 0) {
        result = matched;
      } else {
        const matchedIds = new Set(matched.map(o => o.id));
        result = result.filter(order => matchedIds.has(order.id) || (order.bundleId && matchedBundles.has(order.bundleId)));
      }
    }

    if (useRecentOrder) {
      // 🕒 최근에 진행 상태가 바뀐 주문이 위로. (같으면 최근 주문이 위로)
      const t = (v: any) => (v ? new Date(v).getTime() : 0);
      result.sort((a, b) => (t(b.lastChangedAt) - t(a.lastChangedAt)) || (t(b.registeredAt) - t(a.registeredAt)));
    } else if (sortConfig.direction !== 'default') {
      result.sort((a, b) => {
        if (sortConfig.key === 'status') {
          const weightA = statusWeight[a.status] || 99;
          const weightB = statusWeight[b.status] || 99;
          return sortConfig.direction === 'asc' ? weightA - weightB : weightB - weightA;
        } else if (sortConfig.key === 'date') {
          const bundleA = a.bundleId || '';
          const bundleB = b.bundleId || '';
          if (bundleA !== bundleB) {
            return sortConfig.direction === 'asc' ? bundleA.localeCompare(bundleB) : bundleB.localeCompare(bundleA);
          }
          // 🐛 a.date는 "2026. 09. 15. 오후 12:05" 같은 한국어 표시 문자열이라 사전순으로 비교하면
          //    '오전'과 '오후'가 뒤섞이고 오후 12:05가 오후 03:24보다 뒤로 갔습니다.
          //    → 같은 행에 있는 원본 타임스탬프(registeredAt)로 비교합니다.
          const timeA = new Date(a.registeredAt).getTime();
          const timeB = new Date(b.registeredAt).getTime();
          return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
        }
        return 0;
      });
    }
    return result;
  };

  const renderedOrders = getRenderedOrders();

  // 🌟 검색어가 "주문번호"에 걸린 주문. 묶음번호·주문자명으로 찾으면 묶음 전체가 걸려
  //    특정할 대상이 없으므로 주문번호만 봅니다. 자동 펼침과 하이라이트의 기준입니다.
  const focusedOrderIds = (() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return new Set<string>();
    return new Set<string>(orders.filter(o => String(o.id).toLowerCase().includes(q)).map(o => String(o.id)));
  })();

  // 🌟 주문번호로 찾으면 그 주문이 든 묶음을 자동으로 펼칩니다.
  //    대표 행에는 "○○ 외 N건"만 나와서 찾던 상품이 어느 것인지 보이지 않습니다.
  //    편 뒤에는 평범한 펼침 상태이므로 관리자가 접기를 누르면 그대로 닫힙니다.
  useEffect(() => {
    if (focusedOrderIds.size === 0) return;
    const toOpen = orders
      .filter(o => o.bundleId && focusedOrderIds.has(String(o.id)))
      .map(o => String(o.bundleId));
    if (toOpen.length === 0) return;

    setExpandedBundles(prev => {
      const next = new Set(prev);
      let changed = false;
      toOpen.forEach(id => { if (!next.has(id)) { next.add(id); changed = true; } });
      // 바뀐 게 없으면 같은 Set 을 돌려줘야 렌더가 반복되지 않습니다.
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, orders]);

  // 🌟 경매 상황 탭이거나, 전체 탭에서 경매 상황 주문의 경매 상태를 함께 관리할 수 있도록 열을 노출합니다.
  const showBidStatusColumn = statusFilter === ORDER_STATUS.BIDDING;

  // 🌟 배송비 요청/배송비 결제 완료/국제 배송 상태에서, 같은 bundleId(합포장)를 가진 주문들을 한 행으로 합쳐서 보여줍니다.
  const toggleBundleExpand = (bundleId: string) => {
    setExpandedBundles(prev => {
      const next = new Set(prev);
      if (next.has(bundleId)) next.delete(bundleId); else next.add(bundleId);
      return next;
    });
  };

  const getVisibleColumnCount = () => getVisibleColumns().length;

  const displayOrders = (() => {
    const groupsByBundle: Record<string, any[]> = {};
    renderedOrders.forEach(order => {
      if (order.bundleId && GROUPABLE_STATUSES.includes(order.status)) {
        (groupsByBundle[order.bundleId] ||= []).push(order);
      }
    });

    const seenBundles = new Set<string>();
    const result: any[] = [];

    renderedOrders.forEach(order => {
      if (order.bundleId && GROUPABLE_STATUSES.includes(order.status)) {
        if (seenBundles.has(order.bundleId)) return;
        seenBundles.add(order.bundleId);

        const group = groupsByBundle[order.bundleId];
        if (group.length <= 1) {
          result.push(order);
          return;
        }

        // 🌟 2차 결제금액은 bundleItems[0](orders 배열 기준 최초 항목)에만 들어있으므로, 대표 행도 그 항목을 사용합니다.
        const masterId = orders.filter(o => o.bundleId === order.bundleId)[0]?.id;
        const representative = group.find(g => g.id === masterId) || group[0];
        const totalJpy = group.reduce((sum, o) => sum + (parseInt(String(o.jpy).replace(/[^0-9]/g, '')) || 0), 0);
        // 🌟 주문일시는 묶음 내 가장 이른 주문 기준으로 표시합니다.
        const earliestOrder = group.reduce((earliest, o) =>
          new Date(o.registeredAt).getTime() < new Date(earliest.registeredAt).getTime() ? o : earliest
        , group[0]);

        result.push({
          ...representative,
          product: `${representative.product} 외 ${group.length - 1}건`,
          jpy: totalJpy.toLocaleString(),
          date: earliestOrder.date,
          registeredAt: earliestOrder.registeredAt,
          isBundleGroup: true,
          bundleItems: group,
        });
      } else {
        result.push(order);
      }
    });

    return result;
  })();

  // 🗂 처리 중 전체: '관리자 처리 필요' 묶음을 먼저, 그다음 '회원 처리 대기'. 묶음 안의 순서(최근 변경순 등)는 그대로.
  const tabGroupOf = (status: string) => ADMIN_TABS.includes(status) ? 'admin' : USER_TABS.includes(status) ? 'user' : 'etc';
  const listOrders = statusFilter === '전체'
    ? [...displayOrders.filter(o => tabGroupOf(o.status) === 'admin'),
       ...displayOrders.filter(o => tabGroupOf(o.status) === 'user'),
       ...displayOrders.filter(o => tabGroupOf(o.status) === 'etc')]
    : displayOrders;

  const tableSections: { key: string; title: string; desc: string; list: any[] }[] = statusFilter === '전체'
    ? [
        { key: 'admin', title: '관리자 처리 필요', desc: '확인 · 처리해야 다음 단계로 넘어가는 주문', list: listOrders.filter(o => tabGroupOf(o.status) === 'admin') },
        { key: 'user', title: '회원 처리 대기', desc: '회원의 결제 · 요청을 기다리는 주문', list: listOrders.filter(o => tabGroupOf(o.status) === 'user') },
        ...(listOrders.some(o => tabGroupOf(o.status) === 'etc')
          ? [{ key: 'etc', title: '기타', desc: '', list: listOrders.filter(o => tabGroupOf(o.status) === 'etc') }] : []),
      ]
    : [{
        key: 'all',
        title: ORDER_STATUS_LABEL[statusFilter as OrderStatus] || statusFilter,
        desc: tabGroupOf(statusFilter) === 'admin' ? '관리자 처리 필요 · 확인 · 처리해야 다음 단계로 넘어가는 주문'
          : tabGroupOf(statusFilter) === 'user' ? '회원 처리 대기 · 회원의 결제 · 요청을 기다리는 주문' : '',
        list: listOrders,
      }];

  // 🌟 상단 카드 · 상태 탭의 건수 (저장 전 화면 상태 기준)
  //    합포장(목록에서 한 줄로 묶이는 상태)은 묶음 하나를 1건으로 셉니다. 목록에 보이는 줄 수와 맞춥니다.
  const orderStats = (() => {
    const unitKey = (o: any) => (o.bundleId && GROUPABLE_STATUSES.includes(o.status)) ? `B:${o.bundleId}` : `O:${o.id}`;
    const byStatusSets: Record<string, Set<string>> = {};
    orders.forEach((o: any) => { (byStatusSets[o.status] ||= new Set()).add(unitKey(o)); });
    const byStatus: Record<string, number> = {};
    Object.entries(byStatusSets).forEach(([k, v]) => { byStatus[k] = v.size; });
    const excluded = [ORDER_STATUS.CART, ORDER_STATUS.FAILED, ORDER_STATUS.SHIPPING, '국내통관중', '국내배송중', '배송완료'] as string[];
    const active = new Set(orders.filter((o: any) => !excluded.includes(o.status)).map((o: any) => `${o.status}|${unitKey(o)}`)).size;
    return { byStatus, active };
  })();

  return (
    <>
    <div className="ap-page ord-page">

      {/* 🌟 0. 히어로 + 요약 카드 (카드를 누르면 해당 상태만 봅니다) */}
      <AdminHero
        eyebrow="ORDERS" icon={<Sparkle size={11} weight="fill" />}
        title="주문 관리"
        description="구매대행·배송대행 주문의 진행 상태를 확인하고 변경합니다. 상태를 바꾼 뒤 ‘변경사항 저장’을 눌러야 반영됩니다."
        accentRgb="99, 102, 241"
        actions={
          <HeroButton onClick={() => setShowDebug(!showDebug)}>
            <Wrench size={15} weight="bold" /> 디버그 {showDebug ? '끄기' : '켜기'}
          </HeroButton>
        }
      >
        <div className="ap-kpis">
          <KpiCard icon={<ShoppingCart size={18} weight="duotone" />} label="신규 장바구니" toneRgb="147, 197, 253" loading={isLoading}
            value={<>{(orderStats.byStatus[ORDER_STATUS.CART] || 0).toLocaleString()}<small>건</small></>}
            foot={<><Gavel size={11} weight="bold" style={{ verticalAlign: '-1px' }} /> 경매 요청 {(orderStats.byStatus[ORDER_STATUS.BID_PENDING] || 0).toLocaleString()}건 · 경매 중 {(orderStats.byStatus[ORDER_STATUS.BIDDING] || 0).toLocaleString()}건</>}
            active={statusFilter === ORDER_STATUS.CART} onClick={() => setStatusFilter(ORDER_STATUS.CART)} />
          <KpiCard icon={<ClipboardText size={18} weight="duotone" />} label="처리 중 주문" loading={isLoading}
            value={<>{orderStats.active.toLocaleString()}<small>건</small></>}
            foot={changedOrderIds.size > 0
              ? <span className="is-warn">저장하지 않은 변경 {changedOrderIds.size}건</span>
              : '장바구니·구매실패·국제배송 제외'}
            active={statusFilter === '전체'} onClick={() => setStatusFilter('전체')} />
          <KpiCard icon={<Warehouse size={18} weight="duotone" />} label="일본 창고 입고" toneRgb="196, 181, 253" loading={isLoading}
            value={<>{(orderStats.byStatus[ORDER_STATUS.ARRIVED] || 0).toLocaleString()}<small>건</small></>}
            foot={`배송 준비중 ${(orderStats.byStatus[ORDER_STATUS.PREPARING] || 0).toLocaleString()}건`}
            active={statusFilter === ORDER_STATUS.ARRIVED} onClick={() => setStatusFilter(ORDER_STATUS.ARRIVED)} />
          <KpiCard icon={<CreditCard size={18} weight="duotone" />} label="배송비 결제 대기" toneRgb="253, 186, 116" loading={isLoading}
            value={<>{(orderStats.byStatus[ORDER_STATUS.PAYMENT_REQ] || 0).toLocaleString()}<small>건</small></>}
            foot={`결제 완료 ${(orderStats.byStatus[ORDER_STATUS.PAYMENT_DONE] || 0).toLocaleString()}건 · 국제배송 ${(orderStats.byStatus[ORDER_STATUS.SHIPPING] || 0).toLocaleString()}건`}
            active={statusFilter === ORDER_STATUS.PAYMENT_REQ} onClick={() => setStatusFilter(ORDER_STATUS.PAYMENT_REQ)} />
        </div>
      </AdminHero>

      <section className="ap-panel">
      {/* 🌟 1. 상단 툴바 (검색 + 알림톡 스위치 + 저장) */}
      <div className="ord-toolbar">
        <div className="ord-toolbar-left">
          <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="주문번호(ID), 묶음번호, 주문자명 검색" />
          <span className="ord-count">표시 <b>{displayOrders.length.toLocaleString()}</b>건</span>
          {useRecentOrder && <span className="ord-sort-hint" title="제목(주문일시 · 진행 상태)을 누르면 다른 순서로 정렬합니다">최근 변경순</span>}
        </div>

        <div className="ord-toolbar-right">
          {/* 💬 알림톡은 건당 비용이 들고 같은 내용이 연달아 오면 고객도 불편합니다.
              입고 일괄 처리처럼 한 번에 많이 바꿀 때 꺼 두세요. 메일은 그대로 나갑니다. */}
          <label
            className={`ord-switch ${skipAlimtalk ? 'is-on' : ''}`}
            title="켜면 이번 저장에서는 알림톡을 보내지 않습니다. 이메일 안내는 그대로 발송됩니다."
          >
            <input
              type="checkbox"
              checked={skipAlimtalk}
              onChange={(e) => setSkipAlimtalk(e.target.checked)}
            />
            <span className="ord-switch-track" aria-hidden="true" />
            알림톡 보내지 않기
          </label>

          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={changedOrderIds.size === 0 || isSaving}
            className="ap-btn is-lg is-success"
          >
            <FloppyDisk size={14} weight="bold" />
            {isSaving ? '저장 중...' : '변경사항 저장'}
            <span className="ap-btn-badge">{changedOrderIds.size}</span>
          </button>
        </div>
      </div>

      {/* 🌟 진행 상태 탭 (건수 포함) — 누가 처리할 차례인지에 따라 두 묶음으로 나눕니다. */}
      {(() => {
        const toOpt = (key: string) => ({
          value: key,
          label: ORDER_STATUS_LABEL[key as OrderStatus],
          count: orderStats.byStatus[key] || 0,
          dotRgb: hexToRgb(getStatusColor(key).text),
        });
        const sum = (keys: string[]) => keys.reduce((n, k) => n + (orderStats.byStatus[k] || 0), 0);
        return (
          <div className="ord-status-tabs ord-tab-groups">
            <div className="ord-tab-all">
              <SegFilter<string> ariaLabel="처리 중 전체" value={statusFilter} onChange={setStatusFilter}
                options={[{ value: '전체', label: '처리 중 전체', count: orderStats.active }]} />
            </div>
            <div className="ord-tab-group is-admin">
              <span className="ord-tab-group-label">
                <Wrench size={12} weight="fill" /> 관리자 처리 필요 <b>{sum(ADMIN_TABS).toLocaleString()}</b>
              </span>
              <SegFilter<string> ariaLabel="관리자 처리 필요" value={statusFilter} onChange={setStatusFilter}
                options={ADMIN_TABS.map(toOpt)} />
            </div>
            <div className="ord-tab-group is-user">
              <span className="ord-tab-group-label">
                <HourglassMedium size={12} weight="fill" /> 회원 처리 대기 <b>{sum(USER_TABS).toLocaleString()}</b>
              </span>
              <SegFilter<string> ariaLabel="회원 처리 대기" value={statusFilter} onChange={setStatusFilter}
                options={USER_TABS.map(toOpt)} />
            </div>
          </div>
        );
      })()}

      {/* 🌟 2. 테이블 영역 — 처리 중 전체는 '관리자 처리 필요' / '회원 처리 대기' 표를 따로 둡니다. (각자 머리글) */}
      {tableSections.map((sec, si) => (
      <React.Fragment key={`sec-${si}`}>
      {(() => {
        // 개별 탭: 그 탭이 속한 묶음(관리자/회원) 모양 + 상태 색 점
        const tone = sec.key === 'all' ? tabGroupOf(statusFilter) : sec.key;
        return (
        <div className={`ord-sec-head is-${tone} ${sec.key === 'all' ? 'is-single' : ''}`}
          style={sec.key === 'all' ? ({ ['--sec-c' as string]: getStatusColor(statusFilter).text } as React.CSSProperties) : undefined}>
          <span className="ord-sec-icon">
            {tone === 'admin' ? <Wrench size={15} weight="fill" /> : tone === 'user' ? <HourglassMedium size={15} weight="fill" /> : <Package size={15} weight="fill" />}
          </span>
          <span className="ord-sec-text">
            <strong>{sec.key === 'all' && <i className="ord-sec-dot" aria-hidden="true" />}{sec.title} <b>{sec.list.length.toLocaleString()}</b></strong>
            {sec.desc && <span>{sec.desc}</span>}
          </span>
        </div>
        );
      })()}
      <div className={`ord-table-wrap ap-table-wrap ${sec.key !== 'all' ? `is-sec is-${sec.key}` : ''}`} ref={si === 0 ? table.wrapRef : undefined}>
        {/* 🐛 table-layout: fixed는 표에 "확정된 너비"가 있어야 적용됩니다. CSS에는
            width: max-content만 있어서 긴 상품명이 colgroup에 지정한 열 너비를 무시하고
            열을 밀어냈고, 그래서 열 경계를 드래그해도 줄어들지 않았습니다.
            → 현재 탭에서 보이는 열들의 너비 합을 표 너비로 직접 지정합니다. */}
        <table className={`admin-table-resizable ${table.tableClassName}`} style={table.tableStyle}>
          <FitColGroup table={table} />
          <thead>
            <tr className="admin-table-head-row">
              {/* 날짜 / ID */}
              <FitTh table={table} columnKey="date">
                <span onClick={() => toggleSort('date')} style={{ cursor: 'pointer' }}>
                  주문일시 / ID
                  <span style={{ ...os.sortIcon, color: !useRecentOrder && sortConfig.key === 'date' && sortConfig.direction !== 'default' ? colors.accent : colors.emptyText }}>
                    {useRecentOrder ? '↕' : sortConfig.key === 'date' && sortConfig.direction === 'asc' ? '▲' : sortConfig.key === 'date' && sortConfig.direction === 'desc' ? '▼' : '↕'}
                  </span>
                </span>
              </FitTh>

              <FitTh table={table} columnKey="user">주문자</FitTh>


              <FitTh table={table} columnKey="product">상품 정보</FitTh>
              <FitTh table={table} columnKey="price" style={{ textAlign: 'right' }}>상품가격 (¥)</FitTh>

              {/* 🌟 3-2. 경매 상황 탭, 또는 전체 탭에서 경매 상태 헤더 추가 */}
              {showBidStatusColumn && (
                <FitTh table={table} columnKey="bidStatus" style={{ textAlign: 'center' }}>경매 상태</FitTh>
              )}

              {/* 진행 상태 */}
              <FitTh table={table} columnKey="status" style={{ textAlign: 'center' }}>
                <span onClick={() => toggleSort('status')} style={{ cursor: 'pointer' }}>
                  진행 상태 변경
                  <span style={{ ...os.sortIcon, color: !useRecentOrder && sortConfig.key === 'status' && sortConfig.direction !== 'default' ? colors.accent : colors.emptyText }}>
                    {useRecentOrder ? '↕' : sortConfig.key === 'status' && sortConfig.direction === 'asc' ? '▲' : sortConfig.key === 'status' && sortConfig.direction === 'desc' ? '▼' : '↕'}
                  </span>
                </span>
              </FitTh>

              {/* 관리 — 항상 맨 오른쪽 고정 */}
              <FitTh table={table} columnKey="manage" style={{ textAlign: 'center' }}>관리</FitTh>
            </tr>
          </thead>
          <tbody>
            {/* 🌟 경매 상태 영어 -> 한글 변환용 객체 */}
            {isLoading && <SkeletonRows columns={getVisibleColumns()} pinnedKey="manage" />}
            {!isLoading && sec.list.length === 0 && (
              <EmptyRow colSpan={getVisibleColumnCount()} icon={<Package size={24} weight="duotone" />}
                title={searchTerm ? '검색 결과가 없습니다' : sec.key === 'all' ? '이 상태의 주문이 없습니다' : `${sec.title} 주문이 없습니다`}
                description={searchTerm ? '다른 주문번호나 주문자명으로 검색해 보세요.' : '다른 진행 상태를 선택해 보세요.'} />
            )}
            {!isLoading && sec.list.map((order) => {
              const statusStyle = getStatusColor(order.status);
              const isChanged = changedOrderIds.has(order.id);
              const originalStatus = originalOrders.find(o => o.id === order.id)?.status as OrderStatus;
              
              // 🌟 원본 경매 상태값 찾기 추가
              const originalBidStatus = originalOrders.find(o => o.id === order.id)?.bidStatus || 'PENDING';
              
              const bidStatusLabels: Record<string, string> = {
                PENDING: '입찰 대기중',
                ADDITIONAL: '추가 입찰 완료',
                COMPLETED: '입찰 완료'
              };

              return (
                <React.Fragment key={order.id}>
                <tr
                  className={`admin-table-body-row aft-row ${isChanged ? 'ord-row-changed' : ''} ${order.isBundleGroup ? `abx-row ${expandedBundles.has(order.bundleId) ? 'abx-open' : ''}` : ''} ${statusFilter === '전체' && tabStatusOptions.includes(order.status) ? 'ord-row-jump' : ''} ${flashOrderId === order.id ? 'ord-row-flash' : ''} ${statusFilter === '전체' ? `ord-in-${tabGroupOf(order.status)}` : ''}`}
                  data-order-id={order.id}
                  style={{
                    backgroundColor: isChanged ? '#f0fdf4' : 'transparent',
                  }}
                  title={statusFilter === '전체' && tabStatusOptions.includes(order.status) ? `누르면 '${ORDER_STATUS_LABEL[order.status as OrderStatus]}' 탭으로 이동` : undefined}
                  onClick={(e) => jumpToStatusTab(e, order)}
                >
                  <td className="admin-base-td">
                    <div className="admin-sub-text">{order.date}</div>
                    {!order.isBundleGroup && (
                      <span className="ord-id">
                        {order.id}
                        {/* 📨 고객이 "알림 못 받았다"·"이 번호로 받았다" 고 문의할 때 바로 확인합니다. */}
                        <button
                          onClick={() => openNotificationLogs(order.id)}
                          className="ord-log-btn"
                          title="알림 발송 이력 보기"
                        >
                          <EnvelopeSimple size={12} weight="fill" />
                        </button>
                      </span>
                    )}
                    {order.isBundleGroup ? (
                      <BundleBadge count={order.bundleItems.length} bundleId={order.bundleId} />
                    ) : order.bundleId && (
                      <div className="ord-bundle-id"><span>Bundle</span> {order.bundleId}</div>
                    )}
                  </td>
                  <td className="admin-base-td">
                    <button
                      type="button"
                      className="ord-user is-clickable"
                      onClick={() => openUserModal(order.userId, order.user)}
                      disabled={!order.userId}
                      title={order.userId ? '회원 정보 보기' : '연결된 회원이 없습니다'}
                    >
                      <span className="ord-user-avatar" aria-hidden="true">
                        {(order.user?.trim()?.[0] || '?').toUpperCase()}
                      </span>
                      <span className="ord-user-name">{order.user}</span>
                    </button>
                  </td>
                  
                  
                  <td className="admin-base-td ord-product-td" style={{ maxWidth: '300px' }}>
                    <div className="ord-pwrap">
                    <div className="ord-pcard">
                      <span className="ord-pthumb">
                        <Package size={18} weight="duotone" />
                        {order.productImageUrl && (
                          // 이미지가 깨지면 숨겨서 뒤의 상자 아이콘이 보이게 합니다.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={order.productImageUrl} alt="" referrerPolicy="no-referrer" loading="lazy"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        )}
                      </span>
                      <div className="ord-pbody">
                        <div className="ord-pname" title={order.product}>{order.product}</div>
                        <div className="ord-pmeta">
                          {/* 합포장이면 '전체 N건' 버튼, 아니면 '원본' 버튼을 맨 앞에 둡니다. */}
                          {order.isBundleGroup ? (
                            <BundleToggle
                              open={expandedBundles.has(order.bundleId)}
                              count={order.bundleItems.length}
                              onClick={() => toggleBundleExpand(order.bundleId)}
                            />
                          ) : order.productUrl && (() => {
                            // 🔗 주문에 SKU 번호가 남아 있으면 그 옵션이 선택된 상태로 엽니다.
                            //    직원이 색상·사이즈를 다시 찾지 않아도 됩니다. (없으면 평소대로 상품 페이지)
                            const sku = extractVariantId(order.option);
                            const openUrl = withVariantId(order.productUrl, sku);
                            // 판매처가 옵션 미리 선택을 지원하지 않으면 주소가 그대로입니다.
                            // 그때는 "옵션까지 열린다"고 적지 않습니다.
                            const preselects = openUrl !== order.productUrl;
                            return (
                              <a
                                href={openUrl}
                                target="_blank" rel="noopener noreferrer" className="ord-url"
                                title={preselects ? `선택한 옵션(${sku})으로 원본 페이지 열기` : '상품 원본 페이지 열기'}
                              >
                                원본 <ArrowSquareOut size={10} weight="bold" />
                              </a>
                            );
                          })()}
                          {/* 부가 서비스 · 옵션은 아이콘으로만 (내용은 상세보기에서) */}
                          {parseServices(order.serviceRequest).map(sv => (
                            <span key={sv} className={`ord-svc-ic ${SERVICE_ICON[sv]?.cls || 'is-etc'}`} title={sv} aria-label={sv}>
                              {SERVICE_ICON[sv]?.icon || <Sparkle size={12} weight="fill" />}
                            </span>
                          ))}
                          {order.option && order.option !== '-' && (
                            <span className="ord-svc-ic is-opt" title={`옵션: ${order.option}`} aria-label="옵션 있음">
                              <Tag size={12} weight="fill" />
                            </span>
                          )}
                          {order.productRequest && order.productRequest !== '-' && (
                            <span className="ord-svc-ic is-req" title={`요청: ${order.productRequest}`} aria-label="요청사항 있음">
                              <ChatText size={12} weight="fill" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    </div>
                  </td>


                  <td className="admin-base-td ord-price" translate="no"><i>¥</i>{order.jpy}</td>

                  {/* 🌟 경매 상황 탭, 또는 전체 탭에서 경매 상황 주문일 때: 경매 상태 (셀렉트 박스 + 취소선 인디케이터) */}
                  {showBidStatusColumn && (
                    <td className="admin-base-td" style={{ textAlign: 'center' }}>
                      {order.status === ORDER_STATUS.BIDDING ? (
                        <>
                          {/* 🌟 변경 전 경매 상태 (취소선) 표시 */}
                          {(isChanged && originalBidStatus !== order.bidStatus) && (
                            <div className="ord-change">
                              <span className="is-before">{bidStatusLabels[originalBidStatus] || '상태 확인중'}</span>
                              <ArrowRight size={10} weight="bold" />
                            </div>
                          )}

                          <select
                            value={order.bidStatus}
                            onChange={(e) => handleBidStatusChange(order.id, e.target.value)}
                            className="admin-status-select"
                            style={{
                              backgroundColor: order.bidStatus === 'COMPLETED' ? '#d1fae5' : (order.bidStatus === 'ADDITIONAL' ? '#dbeafe' : '#fef3c7'),
                              color: order.bidStatus === 'COMPLETED' ? '#10b981' : (order.bidStatus === 'ADDITIONAL' ? '#3b82f6' : '#d97706'),
                              border: `1px solid ${order.bidStatus === 'COMPLETED' ? '#86efac' : (order.bidStatus === 'ADDITIONAL' ? '#93c5fd' : '#fde68a')}`,
                            }}
                          >
                            <option value="PENDING" style={{ backgroundColor: colors.white, color: colors.textMain }}>입찰 대기중</option>
                            <option value="ADDITIONAL" style={{ backgroundColor: colors.white, color: colors.textMain }}>추가 입찰 완료</option>
                            <option value="COMPLETED" style={{ backgroundColor: colors.white, color: colors.textMain }}>입찰 완료</option>
                          </select>
                        </>
                      ) : (
                        <span style={{ color: colors.emptyText }}>-</span>
                      )}
                    </td>
                  )}

                  <td className="admin-base-td" style={{ textAlign: 'center' }}>
                    {(isChanged && originalStatus !== order.status) && (
                      <div className="ord-change">
                        <span className="is-before">{ORDER_STATUS_LABEL[originalStatus]}</span>
                        <ArrowRight size={10} weight="bold" />
                      </div>
                    )}

                    {(statusFilter === '전체' || statusFilter === order.status) && QUICK_FLOW[order.status] && !(isChanged && originalStatus !== order.status) ? (
                      /* ⚡ 탭별 메인 액션 (바로 저장) + [▼] (예외 상황용 전체 목록, '변경사항 저장'으로 반영) */
                      <>
                      {/* 처리 중 전체 탭: 지금 어떤 상태인지 버튼 위에 함께 보여줍니다. */}
                      {statusFilter === '전체' && (
                        <span className="ord-now" style={{ ['--now-c' as string]: statusStyle.text, ['--now-bg' as string]: statusStyle.bg, ['--now-bd' as string]: statusStyle.border } as React.CSSProperties}>
                          <i aria-hidden="true" />현재 {ORDER_STATUS_LABEL[order.status as OrderStatus]}
                        </span>
                      )}
                      <div className="ord-split" style={{ ['--split' as string]: QUICK_TONE[QUICK_FLOW[order.status].next] } as React.CSSProperties}>
                        <button type="button" className="ord-split-main"
                          onClick={() => startQuickAction(order)}
                          disabled={quickBusyId !== null}
                          title={`누르면 바로 저장되고 '${ORDER_STATUS_LABEL[QUICK_FLOW[order.status].next]}'(으)로 넘어갑니다`}>
                          {quickBusyId === order.id
                            ? <><CircleNotch size={13} weight="bold" className="ord-spin" /> 처리 중…</>
                            : <>{QUICK_ICON[QUICK_FLOW[order.status].next]} {QUICK_FLOW[order.status].label}</>}
                        </button>
                        {/* 💴 배송비를 받은 뒤에 비용이 더 생겼을 때. 새 회차를 만들어 배송비 요청으로 되돌립니다. */}
                        {order.status === ORDER_STATUS.PAYMENT_DONE && (
                          <button
                            type="button"
                            className="ord-split-extra"
                            onClick={() => startExtraFeeRequest(order)}
                            disabled={quickBusyId !== null}
                            title="추가로 생긴 비용을 청구합니다. 이미 낸 배송비는 다시 청구되지 않습니다."
                          >
                            <CreditCard size={12} weight="bold" /> 추가 청구
                          </button>
                        )}
                        <span className="ord-split-more" title="다른 상태로 변경 (취소 · 이전 단계 등)">
                          <CaretDown size={12} weight="bold" />
                          <select
                            aria-label="다른 상태로 변경"
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            disabled={quickBusyId !== null}
                          >
                            {statusOptions.map(status => (
                              <option key={status} value={status}>
                                {ORDER_STATUS_LABEL[status]}
                              </option>
                            ))}
                          </select>
                        </span>
                      </div>
                      </>
                    ) : (
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="admin-status-select"
                      style={{
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.text,
                        border: `1px solid ${statusStyle.border}`,
                      }}
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status} style={{ backgroundColor: colors.white, color: colors.textMain }}>
                          {ORDER_STATUS_LABEL[status]}
                        </option>
                      ))}
                    </select>
                    )}

                    {/* 배송비 입력칸(요약 칩)은 '배송비 요청' 탭에서만 보여줍니다. (처리 중 전체 탭에서는 숨김) */}
                    {order.status === ORDER_STATUS.PAYMENT_REQ && statusFilter === ORDER_STATUS.PAYMENT_REQ && (() => {
                      // 합포장에서 다른 주문에 이미 금액이 들어가 있으면 이 칸은 잠급니다.
                      const intlLocked = !!order.bundleId && orders.some(o => o.bundleId === order.bundleId && o.id !== order.id && o.intlFeeJpy > 0);
                      const localLocked = !!order.bundleId && orders.some(o => o.bundleId === order.bundleId && o.id !== order.id && o.domesticFeeJpy > 0);
                      const extraLocked = !!order.bundleId && orders.some(o => o.bundleId === order.bundleId && o.id !== order.id && o.extraFeeKrw > 0);
                      const feeOpen = openFeeIds.has(order.id);
                      // 배송비 두 줄은 실제 지불한 엔화를 보여주고, 추가 결제 비용과 합계만 원화입니다.
                      const intlJpy = order.intlFeeJpy || 0;
                      const localJpy = order.domesticFeeJpy || 0;
                      const extra = order.extraFeeKrw || 0;
                      const billed = (order.intlFeeKrw || 0) + (order.domesticFeeKrw || 0) + extra;
                      if (!feeOpen) {
                        return (
                          <button type="button" className={`ord-fee-chip ${intlJpy || localJpy || extra ? '' : 'is-empty'}`}
                            onClick={() => toggleFee(order.id)} aria-expanded={false} title="배송비 입력칸 펼치기">
                            {intlJpy || localJpy || extra ? (
                              <span className="ord-fee-chip-vals">
                                <span><em>국제</em>¥{intlJpy.toLocaleString()}</span>
                                <span><em className="is-local">현지</em>¥{localJpy.toLocaleString()}</span>
                                <span><em className="is-extra">추가</em>{extra.toLocaleString()}₩</span>
                                <span className="ord-fee-chip-sum"><em>청구</em>{billed.toLocaleString()}₩</span>
                              </span>
                            ) : (
                              <span className="ord-fee-chip-empty">배송비 입력</span>
                            )}
                            <PencilSimple size={12} weight="bold" className="ord-fee-chip-edit" />
                          </button>
                        );
                      }
                      return (
                        <div className="ord-fees">
                          <label className={`ord-fee-row ${intlLocked ? 'is-locked' : ''}`} title={intlLocked ? '합배송 금액이 다른 상품에 입력됨' : '국제 배송비 — 물류센터에 지불한 엔화'}>
                            <span className="ord-fee-tag">국제</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              className="ord-fee-input"
                              aria-label="국제 배송비(엔)"
                              value={intlJpy.toLocaleString()}
                              onChange={(e) => handleFeeJpyChange(order.id, 'intl', e.target.value)}
                              disabled={intlLocked}
                            />
                            <span className="ord-fee-unit">¥</span>
                          </label>
                          <div className="ord-fee-conv">≈ ₩ {(order.intlFeeKrw || 0).toLocaleString()}</div>
                          <label className={`ord-fee-row ${localLocked ? 'is-locked' : ''}`} title={localLocked ? '합배송 금액이 다른 상품에 입력됨' : '현지 배송비 — 물류센터에 지불한 엔화'}>
                            <span className="ord-fee-tag is-local">현지</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              className="ord-fee-input"
                              aria-label="현지 배송비(엔)"
                              value={localJpy.toLocaleString()}
                              onChange={(e) => handleFeeJpyChange(order.id, 'domestic', e.target.value)}
                              disabled={localLocked}
                            />
                            <span className="ord-fee-unit">¥</span>
                          </label>
                          <div className="ord-fee-conv">≈ ₩ {(order.domesticFeeKrw || 0).toLocaleString()}</div>
                          <label className={`ord-fee-row ${extraLocked ? 'is-locked' : ''}`} title={extraLocked ? '합배송 금액이 다른 상품에 입력됨' : '추가 결제 비용 (원)'}>
                            <span className="ord-fee-tag is-extra">추가</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              className="ord-fee-input"
                              aria-label="추가 결제 비용(원)"
                              value={(order.extraFeeKrw || 0).toLocaleString()}
                              onChange={(e) => handleExtraFeeChange(order.id, e.target.value)}
                              disabled={extraLocked}
                            />
                            <span className="ord-fee-unit">₩</span>
                          </label>
                          {/* 📝 청구 사유. 고객 화면에도 그대로 보입니다. */}
                          <label className={`ord-fee-row is-memo ${extraLocked ? 'is-locked' : ''}`}
                            title={extraLocked ? '합배송 금액이 다른 상품에 입력됨' : '청구 사유 — 고객에게 보이는 문구'}>
                            <span className="ord-fee-tag is-memo">사유</span>
                            <input
                              type="text"
                              className="ord-fee-input is-memo"
                              aria-label="청구 사유"
                              placeholder="예: 포장 보강"
                              value={order.feeMemo || ''}
                              onChange={(e) => handleFeeMemoChange(order.id, e.target.value)}
                              disabled={extraLocked}
                            />
                          </label>
                          {/* 엔화 입력이 원화로 얼마로 청구되는지 바로 보여줍니다. */}
                          <div className="ord-fee-sum">
                            <span>{order.feeRound > 1 ? `청구액 (${order.feeRound}차)` : '청구액'}</span>
                            <strong>₩ {billed.toLocaleString()}</strong>
                          </div>
                          {/* 이미 낸 회차는 고칠 수 없으므로 금액만 알려 줍니다. */}
                          {paidTotal(order.fees) > 0 && (
                            <div className="ord-fee-paid">
                              결제 완료 ₩ {paidTotal(order.fees).toLocaleString()}
                              <em>{(order.fees || []).filter((f: any) => f.paidAt).length}회차</em>
                            </div>
                          )}
                          {(intlLocked || localLocked || extraLocked) && <div className="ord-fee-hint">합배송 금액이 다른 상품에 입력됨</div>}
                          <button type="button" className="ord-fee-close" onClick={() => toggleFee(order.id)}>
                            <CaretUp size={10} weight="bold" /> 접기
                          </button>
                        </div>
                      );
                    })()}
                  </td>
                  
                  <td className="aft-pinned ord-manage-td" style={{ padding: '16px 12px', textAlign: 'center' }}>
                    <button type="button" className="admin-btn-detail" onClick={() => setDetailOrder(order)}>
                      <MapPinLine size={13} weight="bold" /> 상세보기
                    </button>
                    <span className={`ord-manage-addr ${order.address ? '' : 'is-empty'}`}
                      title={order.address ? `${order.address.recipientName} · [${order.address.zipCode}] ${order.address.address} ${order.address.detailAddress}` : '배송지 미지정'}>
                      {order.address ? order.address.recipientName : '배송지 미지정'}
                    </span>
                  </td>
                </tr>

                {/* 🌟 합포장 묶음 펼치기: 포함된 상품명/상품가격 표시 */}
                {order.isBundleGroup && expandedBundles.has(order.bundleId) && (
                  <tr>
                    <td colSpan={getVisibleColumnCount()} className="abx-cell">
                      <BundleItemsPanel
                        items={order.bundleItems.map((sub: any) => ({
                          id: sub.id,
                          dateText: sub.date,
                          name: sub.product,
                          priceText: `¥${sub.jpy}`,
                          imageUrl: sub.productImageUrl,
                          // 묶음 안의 상품도 고른 옵션이 선택된 채로 열리게 합니다.
                          productUrl: withVariantId(sub.productUrl, extractVariantId(sub.option)),
                        }))}
                        highlightIds={focusedOrderIds}
                      />
                    </td>
                  </tr>
                )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      </React.Fragment>
      ))}
      </section>
      
      {/* 🌟 3. 디버그 패널 */}
      {showDebug && (
        <div style={os.debugPanel}>
          <h3 style={{ fontSize: '16px', color: colors.textDark, marginBottom: '16px' }}>🛠️ 내부 데이터 상태 (디버그)</h3>
          <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
            <pre style={os.debugPre}>
              <strong style={{ color: colors.white }}>[📦 렌더링 중인 orders 데이터]</strong>{"\n"}
              {JSON.stringify(renderedOrders, null, 2)}
            </pre>
            <pre style={{ ...os.debugPre, color: '#86efac' }}>
              <strong style={{ color: colors.white }}>[🔄 변경된 order IDs]</strong>{"\n"}
              {JSON.stringify(Array.from(changedOrderIds), null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>

    <ToastStack toasts={toasts} />

    {/* 📋 상세보기 — 수취인 주소 · 주문 정보 (공용: app/admin/components/OrderDetailModal.tsx) */}
    {detailOrder && (
      <OrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} pushToast={pushToast} />
    )}

    {/* 🌟 배송 준비중 -> 배송비 요청 전환: 국제 배송비 + 일본 내 배송비를 한 팝업에서 함께 입력 */}
    {feeModal && (
      <div className="ord-modal-overlay">
        <div className="ord-modal">
          <span className="ord-modal-mark" aria-hidden="true"><Truck size={22} weight="duotone" /></span>
          <h3 className="ord-modal-title">
            {feeModal.mode === 'extra' ? `추가 결제 요청 (${feeModal.round}차)` : '배송비 입력'}
          </h3>
          <p className="ord-modal-desc">
            {feeModal.mode === 'extra'
              ? '이미 낸 배송비는 다시 청구되지 않습니다. 여기 적은 금액만 새로 청구됩니다.'
              : feeModal.bundleId
                ? `합배송 그룹 전체에 적용됩니다. (그룹 내 상품 수: ${feeModal.count}개)`
                : '이 주문에 적용됩니다.'}
          </p>

          {/* 💴 배송비는 물류센터에 엔화로 지불합니다. 실지출 엔화를 받아
              헤더의 최종 표시 환율로 청구 원화를 바로 보여줍니다. (100원 단위 올림) */}
          {feeModal.mode === 'full' && (
            <>
              <label className="ord-modal-label">국제 배송비(¥)</label>
              <input
                type="text"
                autoFocus
                value={feeModalIntl}
                onChange={(e) => setFeeModalIntl(e.target.value.replace(/[^0-9]/g, ''))}
                className="ord-modal-input"
              />
              <div className="ord-modal-conv">≈ ₩ {feeModalIntlWon.toLocaleString()}</div>

              <label className="ord-modal-label">현지 배송비(¥)</label>
              <input
                type="text"
                value={feeModalDomestic}
                onChange={(e) => setFeeModalDomestic(e.target.value.replace(/[^0-9]/g, ''))}
                className="ord-modal-input"
              />
              <div className="ord-modal-conv">≈ ₩ {feeModalDomesticWon.toLocaleString()}</div>
            </>
          )}

          <label className="ord-modal-label">추가 결제 비용(₩)</label>
          <input
            type="text"
            autoFocus={feeModal.mode === 'extra'}
            value={feeModalExtra}
            onChange={(e) => setFeeModalExtra(e.target.value.replace(/[^0-9]/g, ''))}
            className="ord-modal-input"
          />

          {/* 📝 고객 화면에도 보입니다. 추가 청구일 땐 사유가 없으면 문의가 옵니다. */}
          <label className="ord-modal-label">
            청구 사유{feeModal.mode === 'extra' ? '' : ' (선택)'}
          </label>
          <input
            type="text"
            value={feeModalMemo}
            onChange={(e) => setFeeModalMemo(e.target.value)}
            className="ord-modal-input"
            placeholder="예: 포장 보강 · 분리 배송"
          />

          <div className="ord-modal-total">
            <span className="ord-modal-total-label">
              청구액
              <em>
                {exchangeRate
                  ? `적용 환율 ${rateBasisUnit}엔 = ${(exchangeRate * rateBasisUnit).toFixed(2)}원`
                  : '환율을 불러오는 중입니다…'}
              </em>
            </span>
            <strong>₩ {feeModalTotalWon.toLocaleString()}</strong>
          </div>

          <div className="ord-modal-actions">
            <button onClick={cancelFeeModal} className="ord-modal-btn is-cancel">취소</button>
            <button
              onClick={confirmFeeModal}
              className="ord-modal-btn is-confirm"
              disabled={!exchangeRate || (feeModal.mode === 'extra' && !(parseInt(feeModalExtra.replace(/[^0-9]/g, '')) || 0))}
            >확인</button>
          </div>
        </div>
      </div>
    )}

    {/* 🚚 배송비 결제 완료 -> 국제배송 전환: 배송 업체와 송장번호를 한 팝업에서 함께 입력 */}
    {shipModal && (
      <div className="ord-modal-overlay">
        <div className="ord-modal">
          <span className="ord-modal-mark" aria-hidden="true"><Package size={22} weight="duotone" /></span>
          <h3 className="ord-modal-title">국제배송 정보 입력</h3>
          <p className="ord-modal-desc">
            {shipModal.bundleId
              ? `합배송 그룹 전체에 적용됩니다. (그룹 내 상품 수: ${shipModal.count}개)`
              : '이 주문에 적용됩니다.'}
          </p>

          <label className="ord-modal-label">배송 업체</label>
          <select
            autoFocus
            value={shipModalCarrierId}
            onChange={(e) => setShipModalCarrierId(e.target.value)}
            className="ord-modal-input"
          >
            <option value="">선택해주세요</option>
            {carriers.map(carrier => (
              <option key={carrier.id} value={carrier.id}>{carrier.name}</option>
            ))}
          </select>
          {carriers.length === 0 && (
            <p style={os.shipModalEmptyHint}>
              등록된 배송 업체가 없습니다. 관리자 &gt; 국제 배송 업체 정보 관리에서 먼저 등록해주세요.
            </p>
          )}

          <label className="ord-modal-label">송장번호</label>
          <input
            type="text"
            value={shipModalTrackingNo}
            onChange={(e) => setShipModalTrackingNo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmShipModal(); }}
            className="ord-modal-input"
          />

          <div className="ord-modal-actions">
            <button onClick={cancelShipModal} className="ord-modal-btn is-cancel">취소</button>
            <button onClick={confirmShipModal} className="ord-modal-btn is-confirm">확인</button>
          </div>
        </div>
      </div>
    )}

    {/* 📨 알림 발송 이력 */}
    {/* 👤 주문자 정보 — 회원 관리의 "기본 정보"와 같은 패널을 씁니다. */}
    {userModal && (() => {
      const tone = gradeTone(userDetail?.grade?.name);
      return (
      <div className="ord-modal-overlay" onClick={() => setUserModal(null)}>
        <div className="ord-umodal" style={toneVars(tone)} role="dialog" aria-modal="true" aria-label={`${userModal.name} 회원 기본 정보`}
          onClick={(e) => e.stopPropagation()}>
          {/* 머리 — 등급 색 배경 + 이니셜 아바타 */}
          <div className="ord-umodal-hero">
            <span className="ord-umodal-avatar" aria-hidden="true">{(userModal.name?.trim()?.[0] || '?').toUpperCase()}</span>
            <div className="ord-umodal-who">
              <span className="ord-umodal-eyebrow"><UserCircle size={12} weight="fill" /> 회원 기본 정보</span>
              <h3>{userModal.name}</h3>
              {userDetail?.grade?.name && <span className="ord-umodal-grade">{userDetail.grade.name}</span>}
            </div>
            <button type="button" className="ord-umodal-close" onClick={() => setUserModal(null)} aria-label="닫기">
              <X size={16} weight="bold" />
            </button>
          </div>

          <div className="ord-umodal-body">
            {userLoading && (
              <div className="ord-umodal-state"><CircleNotch size={18} weight="bold" className="ord-spin" /> 불러오는 중…</div>
            )}
            {!userLoading && !userDetail && (
              <div className="ord-umodal-state is-error">회원 정보를 불러오지 못했습니다.</div>
            )}
            {!userLoading && userDetail && (
              <>
                {/* 주문·머니·등급을 먼저 보여 줍니다. 주문 화면에서 가장 자주 확인하는 값입니다. */}
                <UserSummaryStats user={userDetail} />
                <div className="ord-umodal-info">
                  <UserBasicInfo
                    user={userDetail}
                    onCopy={(_text, label) => pushToast('success', `${label}을(를) 복사했습니다.`)}
                  />
                </div>
                <p className="ord-umodal-hint"><Copy size={11} weight="bold" /> 값을 누르면 복사됩니다</p>
              </>
            )}
          </div>

          <div className="ord-umodal-foot">
            <button type="button" onClick={() => setUserModal(null)} className="ord-modal-btn is-confirm">닫기</button>
          </div>
        </div>
      </div>
      );
    })()}

    {logModalOrderId && (
      <div className="ord-modal-overlay" onClick={() => setLogModalOrderId(null)}>
        <div className="ord-modal" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
          <span className="ord-modal-mark" aria-hidden="true"><EnvelopeSimple size={22} weight="duotone" /></span>
          <h3 className="ord-modal-title">알림 발송 이력</h3>
          <p className="ord-modal-desc">{logModalOrderId}</p>

          {logsLoading && <p style={os.logEmpty}>불러오는 중...</p>}

          {!logsLoading && logRows.length === 0 && (
            <p style={os.logEmpty}>
              이 주문으로 발송된 알림이 없습니다.<br />
              (상태가 알림 대상이 아니거나, 아직 상태를 바꾸지 않았습니다)
            </p>
          )}

          {!logsLoading && logRows.map((log) => (
            <div key={log.id} style={os.logRow}>
              <div style={os.logRowHead}>
                <span style={os.logChannel}>{log.channel === 'ALIMTALK' ? '💬 알림톡' : '✉️ 메일'}</span>
                <span>{ORDER_STATUS_LABEL[log.status as OrderStatus] || log.status}</span>
                <span style={{ color: log.success ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                  {log.success ? '성공' : '실패'}
                </span>
                <span style={os.logTime}>{new Date(log.createdAt).toLocaleString('ko-KR')}</span>
              </div>

              {/* 한 통에 여러 주문이 묶였다면, 고객이 받은 본문은 "대표 외 N건" 입니다. */}
              {log.groupOrderIds.length > 1 ? (
                <div style={os.logGroup}>
                  고객이 받은 번호: <b>{log.leadOrderId}</b> 외 {log.groupOrderIds.length - 1}건
                  <div style={os.logGroupList}>
                    {log.groupOrderIds.map((id: string) => (
                      <span key={id} style={id === logModalOrderId ? os.logChipSelf : os.logChip}>{id}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={os.logGroup}>이 주문 단독으로 발송되었습니다.</div>
              )}

              {log.error && <div style={os.logError}>사유: {log.error}</div>}
            </div>
          ))}

          <div className="ord-modal-actions">
            <button onClick={() => setLogModalOrderId(null)} className="ord-modal-btn is-cancel">닫기</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ==========================================
// 🎨 스타일 정의 영역 (Order Styles: os)
// ==========================================

const colors = {
  white: '#fff',
  border: '#f1f5f9',
  borderDark: '#e2e8f0',
  borderInput: '#cbd5e1',
  textMain: '#0f172a',
  textSub: '#64748b',
  textDark: '#334155',
  accent: '#3b82f6',
  emptyText: '#94a3b8',
  bgHead: '#f8fafc',
};

const os: Record<string, React.CSSProperties> = {
  filterGroup: {
    display: 'flex',
    gap: '12px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },

  // 📨 알림 발송 이력
  logBtn: {
    marginLeft: '6px',
    padding: '0 4px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '12px',
    lineHeight: 1,
  },
  logEmpty: {
    padding: '18px 4px',
    fontSize: '13px',
    color: colors.emptyText,
    textAlign: 'center',
    lineHeight: 1.6,
  },
  logRow: {
    border: `1px solid ${colors.borderDark}`,
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '8px',
  },
  logRowHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    flexWrap: 'wrap',
  },
  logChannel: { fontWeight: 700 },
  logTime: { marginLeft: 'auto', fontSize: '12px', color: colors.textSub },
  logGroup: { marginTop: '6px', fontSize: '12px', color: colors.textSub },
  logGroupList: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' },
  logChip: {
    padding: '2px 6px',
    borderRadius: '4px',
    background: '#f1f5f9',
    color: colors.textSub,
    fontSize: '11px',
  },
  logChipSelf: {
    padding: '2px 6px',
    borderRadius: '4px',
    background: '#dbeafe',
    color: '#1d4ed8',
    fontSize: '11px',
    fontWeight: 700,
  },
  logError: { marginTop: '6px', fontSize: '12px', color: '#dc2626' },

  // 💬 "알림톡 보내지 않기" 체크박스
  skipTalkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: colors.emptyText,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  // 🌟 배송비 입력 팝업 (feeModal)
  feeModalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  feeModalBox: {
    width: '360px',
    backgroundColor: colors.white,
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)',
  },
  feeModalTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: colors.textMain,
    margin: '0 0 8px',
  },
  feeModalDesc: {
    fontSize: '13px',
    color: colors.textSub,
    margin: '0 0 20px',
    lineHeight: 1.5,
  },
  feeModalLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 700,
    color: colors.textDark,
    marginBottom: '6px',
  },
  // 🚚 배송 업체가 하나도 없을 때 드롭다운 아래에 띄우는 안내
  shipModalEmptyHint: {
    fontSize: '12px',
    color: '#ef4444',
    margin: '-8px 0 16px',
    lineHeight: 1.5,
  },
  feeModalInput: {
    width: '100%',
    padding: '10px 12px',
    marginBottom: '18px',
    borderRadius: '8px',
    border: `1.5px solid ${colors.borderInput}`,
    fontSize: '15px',
    textAlign: 'right',
    outline: 'none',
    boxSizing: 'border-box',
  },
  feeModalButtonRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '8px',
  },
  feeModalCancelBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '10px',
    border: `1px solid ${colors.borderDark}`,
    backgroundColor: colors.white,
    color: colors.textSub,
    fontWeight: 700,
    cursor: 'pointer',
  },
  feeModalConfirmBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: colors.accent,
    color: colors.white,
    fontWeight: 700,
    cursor: 'pointer',
  },

  // 입력 폼
  paymentInput: {
    width: '100px',
    padding: '4px 8px',
    borderRadius: '4px',
    border: `1px solid ${colors.borderInput}`,
    fontSize: '12px',
    textAlign: 'right',
    outline: 'none',
  },
  
  // 버튼들
  btnDebug: {
    padding: '8px 16px',
    backgroundColor: colors.textDark,
    color: colors.white,
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    border: 'none',
  },
  btnBundleToggle: {
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    height: '22px',
    padding: '0 8px',
    border: `1px solid ${colors.borderInput}`,
    background: '#f1f5f9',
    borderRadius: '6px',
    cursor: 'pointer',
    color: colors.textDark,
    fontSize: '11px',
    fontWeight: '700',
    whiteSpace: 'nowrap',
  },
  btnBundleToggleOpen: {
    background: '#fee2e2',
    borderColor: '#fda4af',
    color: '#e11d48',
  },
  bundleGroupIdCell: {
    borderLeft: '4px solid #f97316',
  },
  bundleGroupBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '999px',
    background: '#f97316',
    color: colors.white,
    fontSize: '11px',
    fontWeight: '800',
  },
  // 🌟 합포장 펼침 목록의 인라인 스타일은 없앴습니다.
  //    <BundleItemsPanel>(AdminPremiumKit) 로 옮겨 배송 현황과 같은 모양을 공유합니다.
  btnPacking: {
    padding: '6px 12px',
    backgroundColor: colors.accent,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },

  // 테이블
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
  },

  // 상태 변경 관련
  statusChangeIndicator: {
    fontSize: '11px',
    color: '#ef4444',
    marginBottom: '6px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },

  // 기타 디테일
  sortIcon: {
    marginLeft: '6px',
    fontSize: '12px',
  },
  sourceBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    backgroundColor: colors.borderDark,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#475569',
  },
  urlLink: {
    fontSize: '11px',
    color: colors.accent,
    textDecoration: 'none',
  },
  productTitle: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontWeight: '600',
    marginBottom: '2px',
  },
  
  // 디버그 패널
  debugPanel: {
    marginTop: '30px',
    borderTop: `2px dashed ${colors.borderInput}`,
    paddingTop: '20px',
  },
  debugPre: {
    backgroundColor: '#1e293b',
    color: '#a5b4fc',
    padding: '16px',
    borderRadius: '8px',
    overflowX: 'auto',
    fontSize: '12px',
    lineHeight: '1.5',
    margin: 0,
  },
};