'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react';
import { currentUnpaid } from '@/lib/shippingFees';
import GuideLayout from '../../components/GuideLayout';
import Link from 'next/link';
import NoticePanel from '../../components/NoticePanel';
import { useSearchParams, useRouter } from 'next/navigation';
import OrderTable, { OrderTableStyles } from './components/OrderTable';
import AddressForm from './components/AddressForm';
import PaymentSummary from './components/PaymentSummary';
import { ORDER_STATUS, ORDER_STATUS_LABEL, OrderStatus, orderStatusLabel } from '@/src/types/order';
import { useSession } from 'next-auth/react';
import { loginUrlWithReturn } from '@/lib/authRedirect';
import { useMikuAlert } from '@/app/context/MikuAlertContext';
import { useExchangeRate } from '@/app/context/ExchangeRateContext';
import '../mypage-premium.css';
import { calculateTieredPaymentFee, calculateTieredAgencyFee, toChargeableWon, DEFAULT_PAYMENT_FEE_RULE, DEFAULT_AGENCY_FEE_RULE, OrderFeeRule } from '@/src/utils/feeCalculator';
import { buildTrackingUrl } from '@/lib/shippingCarriers';

// 🌟 "현재 진행중인 현황" = 국제 배송(도착 완료 전 단계)을 제외한 나머지 모든 주문
const isProgressStatus = (status: string) => status !== ORDER_STATUS.SHIPPING;

// 🌟 같은 bundleId(합포장)로 묶인 주문들을 1건으로 집계합니다.
const countBundleAware = (list: any[]) => {
  const seenBundles = new Set<string>();
  let count = 0;
  list.forEach((item: any) => {
    if (item.bundleId) {
      if (seenBundles.has(item.bundleId)) return;
      seenBundles.add(item.bundleId);
    }
    count++;
  });
  return count;
};

// 🌟 도로명 주소에서 "OO로/OO길"로 시작하는 부분부터 끝까지(도로명 + 번지수)만 추출합니다.
function getLastRoadAddressPart(address?: string) {
  const tokens = address?.trim().split(/\s+/) || [];
  let roadTokenIndex = -1;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (/(로|길)$/.test(tokens[i])) { roadTokenIndex = i; break; }
  }
  return roadTokenIndex >= 0 ? tokens.slice(roadTokenIndex).join(' ') : (tokens[tokens.length - 1] || '');
}

// 🌟 카드를 눌렀을 때 여러 상태를 한 표에 모아 보여 주는 단계
const PHASE_VIEW_STATUSES: Record<string, string[]> = {
  progress: [ORDER_STATUS.ARRIVED, ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE],
  // 🛒 장바구니 카드: 구매 요청과 경매 요청을 한 표에 모아 봅니다.
  //    예전엔 카드를 누르면 둘 중 하나(구매 요청)로만 가서 경매 요청 상품을 열 방법이 없었습니다.
  request: [ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING],
  // 🛒 상단 '장바구니' 숫자: 장바구니 상품만 목록으로 보여 줍니다. 목록에서 바로 골라 결제합니다(아래 결제 카드 · 모바일은 하단 결제 바).
  cart: [ORDER_STATUS.CART],
  // ✈️ 국제 배송중 카드 · 상단 '국제 배송 중': 국제 배송 상품을 위쪽 표에 모아 보고, 누르면 상세 정보 확인에서 배송 조회까지 봅니다.
  shipping: [ORDER_STATUS.SHIPPING],
};
// 🌟 상단 '장바구니' 숫자로 연 보기(cart)는 '장바구니' 카드(request)가 선택된 것으로 표시합니다.
const PHASE_VIEW_CARD: Record<string, string> = { cart: 'request' };

// 🌟 '신청 내역 보기' 카드에서 보여 줄 상태.
//    구매대행·배송대행의 진행 중 상태에 더해 경매 진행·결과까지 한 표에서 봅니다.
//    (장바구니 카드가 맡는 구매 요청·경매 요청과, 아래 단계 카드가 맡는 입고 이후는 제외합니다)
const REQUEST_VIEW_STATUSES: string[] = [
  ORDER_STATUS.BIDDING,      // 경매 상황
  ORDER_STATUS.BID_SUCCESS,  // 경매 낙찰 성공
  ORDER_STATUS.PAID,         // 상품 결제 완료 (구매대행)
  ORDER_STATUS.WAITING,      // 입고 대기중 (배송대행)
  ORDER_STATUS.FAILED,       // 경매/구매 실패
];

// 🕒 최근 수정순 정렬 기준: 진행 상태가 마지막으로 바뀐 시각(statusChangedAt) → 없으면 신청 시각(registeredAt)
const touchedAt = (o: any) => new Date(o?.statusChangedAt || o?.registeredAt || 0).getTime() || 0;
const byRecentlyTouched = (a: any, b: any) => (touchedAt(b) - touchedAt(a)) || ((b?.id || 0) - (a?.id || 0));

const STATUS_PRIORITY: Record<string, number> = {
  [ORDER_STATUS.CART]: 1,
  [ORDER_STATUS.BID_PENDING]: 2,
  [ORDER_STATUS.BIDDING]: 3,
  [ORDER_STATUS.BID_SUCCESS]: 4,
  [ORDER_STATUS.PAID]: 5,
  [ORDER_STATUS.WAITING]: 5.5,
  [ORDER_STATUS.FAILED]: 6,
  [ORDER_STATUS.ARRIVED]: 7,
  [ORDER_STATUS.PREPARING]: 8,
  [ORDER_STATUS.PAYMENT_REQ]: 9,
  [ORDER_STATUS.PAYMENT_DONE]: 10,
  [ORDER_STATUS.SHIPPING]: 11,
};

// 🌟 각 상태별 상세 설명을 매핑하는 객체
const STATUS_DESCRIPTIONS: Record<string, string> = {
  [ORDER_STATUS.CART]: '구매신청 장바구니 목록',
  [ORDER_STATUS.BID_PENDING]: '경매 입찰을 위한 보증금 결제대기',
  [ORDER_STATUS.BIDDING]: '현재 경매 입찰 진행중인 상품',
  [ORDER_STATUS.BID_SUCCESS]: '경매 낙찰 성공, 1차결제 대기',
  [ORDER_STATUS.FAILED]: '상품 결제 완료 전 구매불가 목록',
  [ORDER_STATUS.PAID]: '1차결제완료 목록(구매진행)',
  [ORDER_STATUS.WAITING]: '배송대행 신청, 현지창고 도착 대기',
  [ORDER_STATUS.ARRIVED]: '현지창고 도착, 합포장신청',
  [ORDER_STATUS.PREPARING]: '미쿠짱창고 포장진행중',
  [ORDER_STATUS.PAYMENT_REQ]: '합포장완료 2차결제견적',
  [ORDER_STATUS.PAYMENT_DONE]: '출하준비중',
  [ORDER_STATUS.SHIPPING]: '국제배송추적 및 도착',
};

// =================================================================
// 1. 비즈니스 로직 영역 (Business Logic Layer)
// =================================================================
function usePurchaseStatusLogic() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showAlert, showConfirm } = useMikuAlert();
  const hasAlerted = useRef(false);

  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTabRaw] = useState<string>(ORDER_STATUS.ALL);
  // 🌟 "진행중인 목록만 보기" 필터(전체/요청/진행중/창고/배송 패널 공용 표시 옵션). 기본값은 활성화(ON)이며,
  // 스위치를 직접 끄거나 "전체 내역 보기"를 클릭했을 때만 꺼집니다. 개별 상태 탭(경매 낙찰 성공 등)으로
  // 이동해도 이 스위치 자체는 그대로 유지됩니다(실제 필터링은 activeTab===ALL일 때만 적용됨).
  const [progressFilterActive, setProgressFilterActive] = useState(true);
  // 🌟 "전체" 패널의 "전체 내역 보기"가 실제로 선택(클릭)됐는지 여부.
  // progressFilterActive와 별도로 관리해서, 토글을 그냥 껐을 때는 자동으로 선택 표시되지 않게 합니다.
  const [allViewSelected, setAllViewSelected] = useState(false);
  // 🌟 단계 카드(예: 입고 완료)를 눌렀을 때, 그 단계에 속한 여러 상태를 한 표에 모아 보여 줍니다.
  //    탭은 '전체(ALL)' 를 그대로 쓰고 표에 나올 상태만 이 단계의 상태로 좁힙니다. (행 클릭 → 상세 정보 확인 패널도 그대로 동작)
  const [phaseView, setPhaseView] = useState<string | null>(null);
  const setActiveTab = useCallback((value: string) => {
    setAllViewSelected(false);
    setPhaseView(null);
    setActiveTabRaw(value);
  }, []);
  const [userData, setUserData] = useState<any>(null);
  const [allOrders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  // 🌟 서비스별 내역 필터: /mypage/status?type=PURCHASE(구매대행) | DELIVERY(배송대행)
  // Header/사이드바의 "구매 내역"·"배송 내역" 메뉴가 이 쿼리로 진입합니다. 없으면 전체.
  const typeParam = (searchParams.get('type') || '').toUpperCase();
  const orderTypeFilter: 'PURCHASE' | 'DELIVERY' | null =
    typeParam === 'PURCHASE' || typeParam === 'DELIVERY' ? typeParam : null;
  const orders = useMemo(
    () => (orderTypeFilter ? allOrders.filter((o: any) => o.type === orderTypeFilter) : allOrders),
    [allOrders, orderTypeFilter]
  );
  // 필터가 바뀌면 이전 필터에서 선택했던 항목은 해제
  useEffect(() => { setSelectedItems([]); }, [orderTypeFilter]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  // 🌟 고정값(9.05) 대신 /api/estimate의 실제 환율을 참조합니다.
  const { exchangeRate } = useExchangeRate();

  const [phaseOrder, setPhaseOrder] = useState(['request', 'progress', 'warehouse', 'shipping']);

  // 🌟 결제/대행 수수료 구간 변수를 DB(order_fee_rules)에서 받아옵니다. 응답 전에는
  // feeCalculator.ts의 기본값(DB 시드값과 동일)을 그대로 써서 화면이 비어 보이지 않습니다.
  const [paymentFeeRule, setPaymentFeeRule] = useState<OrderFeeRule>(DEFAULT_PAYMENT_FEE_RULE);
  const [agencyFeeRule, setAgencyFeeRule] = useState<OrderFeeRule>(DEFAULT_AGENCY_FEE_RULE);
  useEffect(() => {
    fetch('/api/order-fee-rules')
      .then(res => res.json())
      .then(data => {
        if (!data.success || !Array.isArray(data.rules)) return;
        const payment = data.rules.find((r: any) => r.feeType === 'PAYMENT');
        if (payment) setPaymentFeeRule(payment);
        const agency = data.rules.find((r: any) => r.feeType === 'AGENCY');
        if (agency) setAgencyFeeRule(agency);
      })
      .catch(() => {});
  }, []);

  // 로그인 상태 확인
  // 🐛 예전엔 localStorage 의 user_id 만 봤습니다. 그런데 그 값은 Header 가 세션을 받은 뒤에야 채워지므로,
  //    SNS 로그인으로 이 화면에 곧장 돌아오면 아직 값이 없어 다시 로그인 페이지로 튕겼습니다.
  //    세션 판정이 끝날 때까지 기다렸다가, 세션이 있으면 user_id 를 여기서 먼저 채웁니다.
  const { data: session, status: authStatus } = useSession();
  useEffect(() => {
    if (authStatus === 'loading') return;

    const sessionUserId = (session?.user as any)?.id;
    if (authStatus === 'authenticated' && sessionUserId) {
      try { localStorage.setItem('user_id', String(sessionUserId)); } catch {}
    }

    let userId: string | null = null;
    try { userId = localStorage.getItem('user_id'); } catch {}

    if (!userId) {
      if (!hasAlerted.current) {
        hasAlerted.current = true;
        showAlert('로그인이 필요한 페이지입니다.', 'warning');
        // 🔐 로그인 뒤 지금 주소(쿼리 포함)로 돌아오도록 함께 넘깁니다.
        router.push(loginUrlWithReturn());
      }
      return;
    }
    setIsAuthChecking(false);
  }, [authStatus, session, router, showAlert]);

  // 🌟 입찰 금액 입력 프리미엄 모달 콘텐츠
  const BidInputContent = ({ item, onChange }: { item: any, onChange: (val: string) => void }) => {
    const [amount, setAmount] = useState("");
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setAmount(val);
      onChange(val);
    };
  
    const originalBid = item.myBidPrice || 0;
    const parsedAmount = parseInt(amount) || 0;

    return (
      <div className="miku-bid-modal notranslate" translate="no">
        <p className="prod-name-title">{item.productName}</p>

        <div className="info-row">
          <span className="label">현재 최고가</span>
          <span className="val highlight">¥ {item.productPrice?.toLocaleString()}</span>
        </div>

        <div className="info-row my-bid-row">
          <span className="label">내 입찰 금액</span>
          <div className="bid-calc">
            {parsedAmount > 0 ? (
              <>
                <span className="old-bid">¥ {originalBid.toLocaleString()}</span>
                <span className="arrow">→</span>
                <span className="new-bid">¥ {parsedAmount.toLocaleString()}</span>
              </>
            ) : (
              <span className="new-bid">¥ {originalBid.toLocaleString()}</span>
            )}
          </div>
        </div>

        <div className="input-container">
          <label>희망 입찰 금액(최종) (¥)</label>
          <input
            type="number" placeholder="희망 입찰 금액(최종) 입력"
            value={amount} onChange={handleInputChange}
            className="premium-input"
          />
        </div>
      </div>
    );
  };

 // 입찰 처리 로직
  const handleBidClick = async (item: any) => {
    let finalAmount = "";
    const isConfirmed = await showConfirm(<BidInputContent item={item} onChange={(val) => { finalAmount = val; }} />);

    if (isConfirmed) {
      // 🌟 입력값은 이제 "추가할 금액"이 아니라 "희망 입찰 금액(최종)"입니다.
      const finalBidAmount = parseInt(finalAmount);
      const currentHighest = item.productPrice || 0;
      if (!finalBidAmount || finalBidAmount <= currentHighest) {
        return showAlert("현재 최고가보다 높은 금액을 입력해주세요.", "error");
      }

      // 서버는 myBidPrice에 더해지는(increment) 값을 받으므로, 기존 입찰가와의 차액을 계산해서 보냅니다.
      const originalBid = item.myBidPrice || 0;
      const amount = finalBidAmount - originalBid;

      const deposit = finalBidAmount <= 20000 ? 2000 : Math.floor(finalBidAmount * 0.1);

      try {
        const res = await fetch('/api/orders/bid', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: item.orderId, amount, deposit })
        });

        if (res.ok) {
          // 추가 입찰이 성공하면 상태를 다시 '입찰 대기중(PENDING)'으로 즉시 변경
          await fetch('/api/orders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates: [{ id: item.orderId, bidStatus: 'PENDING' }] })
          });

          showAlert(`¥${finalBidAmount.toLocaleString()} 입찰 완료!`, 'success');
          fetchOrders();
        } else {
          const errorData = await res.json();
          showAlert(errorData.error || "입찰에 실패했습니다.", "error");
        }
      } catch (error) { showAlert("통신 에러가 발생했습니다.", "error"); }
    }
  };

  const fetchOrders = useCallback(() => {
    const storedId = localStorage.getItem('user_id');
    if (storedId) {
      setIsLoading(true);
      fetch(`/api/users?id=${storedId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUserData(data.user);
            const rawOrders = data.user.orders || [];
            const userAddresses = data.user.addresses || []; 
            const formattedOrders = rawOrders.map((order: any) => {
              // 지금 청구 중인 회차 (없으면 null). 한 번만 잊고 아래에서 나눠 씁니다.
              const fee: any = currentUnpaid<any>(order.shippingFees);
              return {
              ...order,
              // 💴 지금 청구 중인 회차만 평평하게 풀어 둡니다.
              //    이미 낸 회차는 빼야 추가 결제 때 1차 배송비까지 다시 청구하지 않습니다.
              //    orders.domesticShippingFee 와는 다른 값입니다 — 그쪽은 구매 요청 단계의 일본내 배송료(¥).
              shippingFees: order.shippingFees || [],
              intlFeeKrw: fee?.intlFeeKrw || 0,
              domesticFeeKrw: fee?.domesticFeeKrw || 0,
              extraFeeKrw: fee?.extraFeeKrw || 0,
              feeRound: fee?.round || 0,
              feeMemo: fee?.memo || '',
              address: order.addressId 
                ? userAddresses.find((a: any) => String(a.id) === String(order.addressId)) 
                : null
              };
            });
            setOrders(formattedOrders);
          }
        })
        .catch(err => console.error("데이터 로드 실패:", err))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { 
    if (!isAuthChecking) fetchOrders(); 
  }, [isAuthChecking, fetchOrders]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      const tabMap: Record<string, string> = {
        '전체내역': ORDER_STATUS.ALL,
        '장바구니': ORDER_STATUS.CART,
        '상품 결제 완료': ORDER_STATUS.PAID,
        '입고 대기중': ORDER_STATUS.WAITING,
        '입고완료': ORDER_STATUS.ARRIVED,
        '배송비 요청': ORDER_STATUS.PAYMENT_REQ,
      };
      setActiveTab(tabMap[tab] || tab);
      setSelectedItems([]);
    }
  }, [searchParams]);

  /**
   * 🔗 /mypage/status?phase=request
   *    단계 카드(장바구니 = 구매 요청 + 경매 요청)를 선택된 상태로 열어 줍니다.
   *    각 쇼핑몰 상세에서 장바구니에 담은 뒤 이동할 때 씁니다.
   *    주문번호(orderId)까지 함께 오면 아래 효과가 그 상품을 선택하고 스크롤합니다.
   */
  const phaseParam = (searchParams.get('phase') || '').trim();
  const phaseHandled = useRef(false);
  useEffect(() => {
    if (!phaseParam || phaseHandled.current) return;
    if (!PHASE_VIEW_STATUSES[phaseParam]) return; // 모르는 값이면 무시합니다.
    phaseHandled.current = true;
    setActiveTabRaw(ORDER_STATUS.ALL);
    setAllViewSelected(false);
    setPhaseView(phaseParam);
  }, [phaseParam]);

  // 🔗 /mypage/status?orderId=M260918-a3f9  (쉼표로 여러 개도 됩니다: ?orderId=A,B)
  //    받는 값: 주문번호(M…) · 묶음번호(MB…) · orders.id 숫자.
  //    알림톡 버튼과, 구매대행 신청 후 "장바구니 담기" 이동이 씁니다.
  //    그 주문이 속한 상태 탭으로 옮기고 해당 행들을 선택 상태로 만든 뒤,
  //    "전체 진행 현황" 패널이 통째로 보이도록 패널 맨 위로 스크롤합니다.
  //    주문 목록은 비동기로 오므로 목록이 채워진 뒤에 한 번만 실행합니다.
  const focusOrderParam = (searchParams.get('orderId') || searchParams.get('order') || '').trim();
  const focusHandled = useRef(false);
  useEffect(() => {
    if (!focusOrderParam || focusHandled.current || isLoading) return;

    const keys = focusOrderParam.split(',').map(v => v.trim()).filter(Boolean);
    // 묶음번호로 들어오면 그 묶음의 아무 주문이나 잡으면 됩니다. 아래에서 묶음 전체를 선택하기 때문입니다.
    const matched = keys
      .map(key => orders.find(
        (o: any) =>
          String(o.orderId) === key ||
          String(o.id) === key ||
          (!!o.bundleId && String(o.bundleId) === key)
      ))
      .filter(Boolean) as any[];

    if (matched.length === 0) {
      focusHandled.current = true;
      showAlert('해당 주문을 찾을 수 없습니다.', 'warning');
      return;
    }
    focusHandled.current = true;

    // 여러 건이면 첫 주문의 탭으로 옮깁니다. (한 번에 담은 상품은 모두 같은 상태입니다)
    const lead = matched[0];
    // 🛒 ?phase= 로 단계 카드를 지정해 들어왔고 그 단계가 이 주문을 품고 있으면 그대로 둡니다.
    //    (setActiveTab 은 phaseView 를 지우므로, 여기서 탭을 바꾸면 카드 선택이 풀립니다)
    const keepPhase = !!phaseParam && PHASE_VIEW_STATUSES[phaseParam]?.includes(lead.status);
    // ✈️ 국제 배송 상품은 '국제 배송중' 카드 보기(phaseView 'shipping')로 위쪽 표에 보여 줍니다.
    //    🔽 그 밖의 상태도 '전체 진행 현황'의 단계 카드 보기(펼치기 보기)로 엽니다. 개별 상태 탭으로 가지 않습니다.
    //       장바구니 담기 · 경매 요청 → '장바구니' 카드 / 경매 · 결제 · 입고 대기 → '신청 내역 보기' / 입고 이후 → '입고 완료' 카드
    if (!keepPhase) {
      const s = lead.status as string;
      if (s === ORDER_STATUS.SHIPPING) { setActiveTab(ORDER_STATUS.ALL); setPhaseView('shipping'); }
      else if (PHASE_VIEW_STATUSES.request.includes(s)) { setActiveTab(ORDER_STATUS.ALL); setPhaseView('request'); }
      else if (PHASE_VIEW_STATUSES.progress.includes(s)) { setActiveTab(ORDER_STATUS.ALL); setPhaseView('progress'); }
      else if (REQUEST_VIEW_STATUSES.includes(s)) { setActiveTab(ORDER_STATUS.ALL); }
      else setActiveTab(s);
    }

    // 합포장 묶음은 표에서 한 행으로 합쳐지므로, 묶음 전체를 선택해야 그 행이 선택 상태로 보입니다.
    const ids = new Set<string>();
    matched.forEach((t: any) => {
      if (t.bundleId) {
        orders
          .filter((o: any) => o.bundleId === t.bundleId && o.status === t.status)
          .forEach((o: any) => ids.add(String(o.orderId)));
      } else {
        ids.add(String(t.orderId));
      }
    });
    setSelectedItems([...ids]);

    // 탭이 바뀌어 표가 다시 그려진 뒤에 스크롤해야 해서 한 박자 늦춥니다.
    const timer = setTimeout(() => {
      document.getElementById('miku-progress-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => clearTimeout(timer);
  }, [focusOrderParam, phaseParam, orders, isLoading, setActiveTab, showAlert]);

  // 하위 상태 아이템 생성 시 상세 설명(desc) 데이터 추가
  const shippingPhases = useMemo(() => {
    // 🌟 "진행중인 목록만 보기"가 켜져 있으면 요청/진행중/창고/배송 모듈 전체가
    // 국제 배송(SHIPPING)을 제외한 주문만 기준으로 집계되도록 기준 목록을 바꿔치기합니다.
    const baseOrders = progressFilterActive ? orders.filter(o => isProgressStatus(o.status)) : orders;

    const getCount = (statusKeys: string[]) =>
      baseOrders.filter(item => statusKeys.includes(item.status)).length;

    // 🌟 배송비 요청/배송비 결제 완료/국제 배송 단계에서는 같은 bundleId(합포장)로 묶인 주문을 1건으로 집계합니다.
    const getBundleAwareCount = (statusKeys: string[]) => {
      const matched = baseOrders.filter(item => statusKeys.includes(item.status));
      const seenBundles = new Set<string>();
      let count = 0;
      matched.forEach((item: any) => {
        if (item.bundleId) {
          if (seenBundles.has(item.bundleId)) return;
          seenBundles.add(item.bundleId);
        }
        count++;
      });
      return count;
    };

    // 🌟 "진행중인 목록만 보기"가 켜져 있을 때는 0건인 하위 항목(예: 경매 요청)은 목록에서 숨깁니다.
    const createSubItems = (statusKeys: string[], bundleAware: boolean = false) =>
      statusKeys
        .map(key => ({
          key,
          // 🌟 이 단계의 주문이 모두 배송대행이면 "상품 결제 완료" 대신 "입고 대기중" 으로 보여 줍니다
          name: (() => {
            const inStatus = baseOrders.filter(item => item.status === key);
            return inStatus.length > 0 && inStatus.every((item: any) => item.type === 'DELIVERY')
              ? orderStatusLabel(key, 'DELIVERY')
              : (ORDER_STATUS_LABEL[key as OrderStatus] || key);
          })(),
          count: bundleAware ? getBundleAwareCount([key]) : baseOrders.filter(item => item.status === key).length,
          desc: STATUS_DESCRIPTIONS[key] || ''
        }))
        .filter(item => !progressFilterActive || item.count > 0);

    const phases = [
      {
        id: 'request', title: '장바구니', theme: 'theme-blue', icon: 'fa-cart-shopping',
        statuses: [ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING],
        totalCount: getCount([ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING]),
        subItems: createSubItems([ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING])
      },
      {
        // 🌟 예전 '구매 진행중' 자리. 카드를 누르면 입고 완료 · 배송 준비중 · 배송비 요청 · 배송비 결제 완료를 한 표에 모아 봅니다.
        //    (경매 · 상품 결제 완료 · 입고 대기중 · 실패는 '신청 내역 보기' 에서 봅니다)
        id: 'progress', title: '입고 완료', theme: 'theme-green', icon: 'fa-warehouse',
        statuses: PHASE_VIEW_STATUSES.progress,
        totalCount: getBundleAwareCount(PHASE_VIEW_STATUSES.progress),
        subItems: createSubItems(PHASE_VIEW_STATUSES.progress, true)
      },
      {
        // 🌟 배송 준비중(PREPARING)부터는 합포장(bundleId)으로 묶일 수 있으므로 창고 패널도 합포장 묶음 기준으로 집계합니다.
        id: 'warehouse', title: '현지 입고', theme: 'theme-green', icon: 'fa-warehouse',
        statuses: [ORDER_STATUS.ARRIVED, ORDER_STATUS.PREPARING],
        totalCount: getBundleAwareCount([ORDER_STATUS.ARRIVED, ORDER_STATUS.PREPARING]),
        subItems: createSubItems([ORDER_STATUS.ARRIVED, ORDER_STATUS.PREPARING], true)
      },
      {
        // 🌟 예전 '배송 준비' 자리 → '국제 배송중'. 카드를 누르면 국제 배송 상품을 위쪽 표에 모아 보여 주고(phaseView 'shipping'),
        //    상품을 누르면 상세 정보 확인에서 주소 · 배송업체 · 운송장을 보여 줍니다. 건수는 합포장 묶음을 1건으로 셉니다. ('진행중인 목록만 보기'와 상관없이 항상 셈)
        id: 'shipping', title: '국제 배송중', theme: 'theme-rose', icon: 'fa-plane',
        statuses: [ORDER_STATUS.SHIPPING],
        totalCount: (() => {
          const seen = new Set<string>();
          let count = 0;
          orders.filter(o => o.status === ORDER_STATUS.SHIPPING).forEach((o: any) => {
            if (o.bundleId) { if (seen.has(o.bundleId)) return; seen.add(o.bundleId); }
            count++;
          });
          return count;
        })(),
        subItems: [] as any[]
      }
    ];

    return phaseOrder.map(id => {
      const phase = phases.find(p => p.id === id);
      return { ...phase! };
    });
  }, [orders, phaseOrder, progressFilterActive]);

  const items = useMemo(() => {
    // 1. 탭 필터링.
    //    국제 배송(SHIPPING)은 어떤 탭에서도 이 표에 넣지 않습니다. 아래 "국제 배송 현황" 패널에서만 보여 주며,
    //    두 곳에 같은 상품이 나오면 진행 상황을 두 번 세는 것처럼 보이기 때문입니다.
    //    🛒 "전체 내역 보기"에서는 구매 요청(CART, 장바구니) 상품을 빼고 보여 줍니다. 장바구니는 '장바구니' 카드에서만 봅니다.
    const filtered = orders.filter(
      item => (isProgressStatus(item.status) || (activeTab === ORDER_STATUS.ALL && phaseView === 'shipping')) && (
        activeTab === ORDER_STATUS.ALL
          ? (phaseView ? PHASE_VIEW_STATUSES[phaseView]?.includes(item.status) : REQUEST_VIEW_STATUSES.includes(item.status))
          : item.status === activeTab
      ),
    );

    // 2. 🌟 어떤 탭이든 상관없이 항상 우선순위 및 id 기준 정렬 적용
    return filtered.sort((a, b) => {
      const priorityA = STATUS_PRIORITY[a.status] ?? 99;
      const priorityB = STATUS_PRIORITY[b.status] ?? 99;
      
      // 우선순위가 다르면 우선순위 정렬 (전체내역 탭에서 흐름을 유지)
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // 우선순위가 같으면 id 기준 내림차순(최신순) 정렬
      return (b.id || 0) - (a.id || 0);
    });
  }, [orders, activeTab, phaseView]);

  // 🔎 "상세 정보 확인" 패널(전체 내역 보기에서 배송비 요청 등을 눌렀을 때)은 탭이 '전체' 인 채로 결제해야 해서,
  //    결제 금액 계산만 그 패널의 상태 기준으로 합니다. (패널이 닫혀 있으면 평소처럼 현재 탭 기준)
  const [calcTabOverride, setCalcTabOverride] = useState<string | null>(null);

  // 결제 금액 계산에 쓸 상태. 상세 정보 확인 패널(calcTabOverride)이 열려 있으면 그 상태, 아니면 현재 탭입니다.
  //    🛒 단계 카드로 연 목록(장바구니 · 신청 내역 보기 등)은 탭이 '전체'라 결제 카드가 나오지 않습니다.
  //       결제는 상품을 눌러 연 상세 정보 확인 패널 안에서 합니다.
  const payStatus = calcTabOverride ?? activeTab;
  const calcTab = payStatus;
  const statusOverride = calcTabOverride;
  const calcItems = useMemo(
    () => (statusOverride ? orders.filter((o: any) => o.status === statusOverride) : items),
    [statusOverride, orders, items],
  );

  const totals = useMemo(() => {
    const selectedOrders = calcItems.filter(item => selectedItems.map(String).includes(String(item.orderId)));

    return selectedOrders.reduce((acc, item) => {
      // ⚠️ orders.productPrice 는 "단가"가 아니라 **그 주문 줄의 합계**(단가 × 수량)입니다.
      //    여기서 수량을 한 번 더 곱해 ¥620 × 10개가 ¥62,000 으로 부풀던 버그가 있었습니다.
      //    (상품 목록·정산·대시보드 등 다른 곳은 전부 합계로 읽고 있어 여기만 어긋나 있었습니다)
      const productP = Number(item.productPrice) || 0;
      // ⚠️ 구매 요청 단계의 일본내 배송료(¥). 배송비 요청 탭에서는 쓰지 않습니다.
      const domesticS = Number(item.domesticShippingFee) || 0; 
      // 💴 배송비 요청 단계의 청구 금액 (order_shipping_fees, 전부 원화)
      const secondP = Number(item.intlFeeKrw) || 0;
      const domesticKrw = Number(item.domesticFeeKrw) || 0;
      const extraP = Number(item.extraFeeKrw) || 0;
      
      const myBid = Number(item.myBidPrice) || 0;
      const fallbackDeposit = myBid > 0 ? (myBid <= 20000 ? 2000 : Math.floor(myBid * 0.1)) : 0;
      const depositAmt = Number(item.depositAmount) || fallbackDeposit; 

      if (calcTab === ORDER_STATUS.PAYMENT_REQ) {
        // 💸 배송비 요청 탭은 세 항목을 각각 모으고, 청구액은 아래 totalPriceVal 에서 셋을 더해 냅니다.
        acc.product += secondP;
        acc.domestic += domesticKrw;
        acc.extra += extraP;
      } else if (calcTab === ORDER_STATUS.BID_PENDING) {
        acc.deposit += depositAmt;
      } else {
        acc.product += productP;
        // 🌟 구매 요청(CART), 경매 낙찰 성공(BID_SUCCESS) 탭은 admin/estimate와 동일한 계산식을 적용합니다.
        if (calcTab === ORDER_STATUS.CART || calcTab === ORDER_STATUS.BID_SUCCESS) {
          // 🌟 purchase/quote(PurchaseFormContainer)와 공유하는 계산식: 결제 수수료는
          // 상품 총액(30,000엔) 기준, 대행 수수료는 수량(4개) 기준으로 구간별 정액 부과합니다.
          const itemQuantity = Number(item.productCount) || 1;
          acc.transfer += calculateTieredPaymentFee(productP, paymentFeeRule);
          acc.delivery += domesticS;
          acc.agency += calculateTieredAgencyFee(itemQuantity, agencyFeeRule);
        } else {
          // ℹ️ 결제·대행 수수료는 위 CART/BID_SUCCESS 가지에서만 구간별로 계산합니다.
          //    이 가지의 결과는 사실 어디에도 쓰이지 않습니다 — totals 를 읽는 PaymentSummary 가
          //    CART·PAYMENT_REQ·BID_PENDING·BID_SUCCESS 네 탭에서만 렌더되고,
          //    그 네 탭은 모두 위쪽 가지로 빠지기 때문입니다.
          //    (예전엔 orders.purchase_fee 와 존재하지 않는 item.transferFee 를 더했는데 둘 다 항상 0 이었습니다)
          acc.delivery += domesticS;
        }
      }
      return acc;
    }, { product: 0, transfer: 0, delivery: 0, agency: 0, deposit: 0, domestic: 0, extra: 0 });
  }, [calcItems, selectedItems, calcTab, paymentFeeRule, agencyFeeRule]);

  const totalPriceVal = calcTab === ORDER_STATUS.BID_PENDING
    ? totals.deposit
    // 💸 배송비 요청 청구액 = 국제 배송비 + 현지 배송비 + 추가 결제 금액
    //    (예전엔 국제 배송비만 받고 나머지는 표시만 했습니다)
    : calcTab === ORDER_STATUS.PAYMENT_REQ
      ? totals.product + totals.domestic + totals.extra
      : totals.product + totals.transfer + totals.delivery + totals.agency;

  // 🌟 배송비 요청 탭의 금액은 관리자가 이미 원화로 넣은 값이라 환산하지 않습니다.
  //    나머지는 견적 화면과 같은 규칙(100원 단위 올림)으로 맞춥니다. — src/utils/feeCalculator.ts
  const totalPriceWon = calcTab === ORDER_STATUS.PAYMENT_REQ
    ? totalPriceVal
    : toChargeableWon(totalPriceVal, exchangeRate);

  // 🌟 디버깅용 로그: 최종 결제예상액 계산식을 그대로 콘솔에 남깁니다.
  useEffect(() => {
    if (activeTab === ORDER_STATUS.PAYMENT_REQ) return;
    console.log(
      '[최종 결제예상액 계산]',
      `totals=${JSON.stringify(totals)}`,
      `totalPriceVal(${totals.product}+${totals.transfer}+${totals.delivery}+${totals.agency})=${totalPriceVal}`,
      `exchangeRate=${exchangeRate}`,
      `raw(${totalPriceVal}*${exchangeRate})=${totalPriceVal * exchangeRate}`,
      `totalPriceWon(100원 단위 올림)=${totalPriceWon}`
    );
  }, [totalPriceVal, exchangeRate, activeTab]);

  /** 실제로 삭제했으면 true 를 돌려줍니다. (상세 정보 확인 패널을 닫을지 판단하는 데 씁니다) */
  const handleDeleteOrder = async (orderId: string): Promise<boolean> => {
    const isConfirmed = await showConfirm("정말 이 상품을 장바구니에서 삭제하시겠습니까? 🗑️");
    if (isConfirmed) {
      try {
        const res = await fetch(`/api/orders?id=${orderId}`, { method: 'DELETE' });
        if (res.ok) {
          showAlert('상품이 삭제되었습니다.', 'success');
          // 지운 상품이 결제 선택에 남아 '선택 N건'에 계속 잡히지 않게 뺍니다
          setSelectedItems(prev => prev.filter(id => String(id) !== String(orderId)));
          fetchOrders();
          return true;
        } else showAlert('삭제 처리에 실패했습니다.', 'error');
      } catch (error) { showAlert('서버 통신 중 오류가 발생했습니다.', 'error'); }
    }
    return false;
  };

  const handleIndividualPacking = async (item: any) => {
    if (!selectedAddress) return showAlert('하단 수취인 주소 리스트에서 배송지를 먼저 선택해주세요.', 'warning');
    const addressDisplayName = selectedAddress.recipientName || selectedAddress.name || '선택된 배송지';
    const isConfirmed = await showConfirm(`선택하신 상품 \n[${item.productName}]을\n ${addressDisplayName}(으)로 배송 합니다\n이대로 개별 포장 요청 하시겠습니까?`);
    if (isConfirmed) {
      try {
        const updates = [{ id: item.orderId, status: ORDER_STATUS.PREPARING, address_id: selectedAddress.id }];
        const res = await fetch('/api/orders', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }) });
        if (res.ok) {
          showAlert('개별 포장 처리가 완료되었습니다.', 'success');
          fetchOrders();
          setActiveTab(ORDER_STATUS.PREPARING);
        } else showAlert('처리에 실패했습니다.', 'error');
      } catch (error) { showAlert('서버 통신 중 오류가 발생했습니다.', 'error'); }
    }
  };

  // 🌟 합포장/개별포장 분기 처리가 추가된 통합 업데이트 함수
  const handleUpdateStatus = async (newStatus: string, isBundle: boolean = true) => {
    if (selectedItems.length === 0) return showAlert('상품을 선택해주세요.', 'warning');
    if (newStatus === ORDER_STATUS.PREPARING && !selectedAddress) return showAlert('하단 수취인 주소 리스트에서 배송지를 먼저 선택해주세요.', 'warning');

    // 🌟 도로명 주소에서 "OO로/OO길"로 시작하는 부분부터 끝까지(도로명 + 번지수)를 통째로 사용합니다.
    const addressTokens = selectedAddress?.address?.trim().split(/\s+/) || [];
    let roadTokenIndex = -1;
    for (let i = addressTokens.length - 1; i >= 0; i--) {
      if (/(로|길)$/.test(addressTokens[i])) { roadTokenIndex = i; break; }
    }
    const lastAddressPart = roadTokenIndex >= 0
      ? addressTokens.slice(roadTokenIndex).join(' ')
      : (addressTokens[addressTokens.length - 1] || '');

    // 🌟 합포장/개별포장에 따라 안내 메세지 분기 (이름/주소/포장방식을 색으로 구분해 가독성 향상)
    const packPrefix = isBundle ? '묶어서 배송' : '각각 ';
    const packLabel = isBundle ? '(합포장)' : '개별 배송(포장)';
    const confirmMsgs: any = {
      [ORDER_STATUS.PAID]: '선택한 상품을 결제 하시겠습니까?',
      [ORDER_STATUS.PREPARING]: (
        <>
          선택하신 <span style={{ color: '#7c3aed', fontWeight: 900, textShadow: '0.4px 0 0 currentColor' }}>{selectedItems.length}건</span>의 상품을<br />
          <span style={{ color: '#2563eb', fontWeight: 900, textShadow: '0.4px 0 0 currentColor' }}>{selectedAddress?.recipientName || '선택된 배송지'}</span>
          {lastAddressPart && <span style={{ color: '#059669', fontWeight: 900, textShadow: '0.4px 0 0 currentColor' }}>({lastAddressPart})</span>}
          (으)로 <br />
          {packPrefix}<span style={{ color: '#e11d48', fontWeight: 900, textShadow: '0.4px 0 0 currentColor' }}>{packLabel}</span> 합니다.<br />
          이대로 진행하시겠습니까?
        </>
      ),
      [ORDER_STATUS.PAYMENT_DONE]: '선택한 상품의 배송비 결제를 진행하시겠습니까?',
      [ORDER_STATUS.BIDDING]: '선택한 상품의 보증금을 결제하고 입찰을 시작하시겠습니까?'
    };

    const isConfirmed = await showConfirm(confirmMsgs[newStatus] || '상태를 변경하시겠습니까?');

    if (isConfirmed) {
      if (([ORDER_STATUS.PAID, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.BIDDING] as string[]).includes(newStatus)) {
        try {
          const storedId = localStorage.getItem('user_id');
          const userRes = await fetch(`/api/users?id=${storedId}`);
          const uData = await userRes.json();
          if (uData.success) {
            const currentMoney = uData.user.cyberMoney || 0;
            if (currentMoney < totalPriceWon) {
              const chargeConfirmed = await showConfirm(`미쿠짱 금액이 부족합니다.\n부족한 금액: ₩${(totalPriceWon - currentMoney).toLocaleString()}\n충전하시겠습니까?`);
              // 🌟 충전 화면의 충전 금액에 부족한 금액이 자동으로 들어가도록 넘깁니다 (money/charge 가 ?amount= 를 읽음)
              if (chargeConfirmed) window.location.href = `/mypage/money/charge?amount=${Math.ceil(totalPriceWon - currentMoney)}`;
              return;
            }
          }
        } catch (error) { return showAlert('잔액 확인 중 오류가 발생했습니다.', 'error'); }
      }

      const addressUpdateData = newStatus === ORDER_STATUS.PREPARING && selectedAddress ? { address_id: selectedAddress.id } : {};
      
      // 🌟 개별포장(isBundle === false)일 경우 bundleId를 생성하지 않음
      // 🧾 묶음번호는 서버에서 만듭니다. 화면에서 만들면 같은 날 다른 회원의 묶음과 번호가 겹칠 수 있습니다.
      //    'AUTO' 를 보내면 /api/orders 가 MB250918-0001 형식으로 채워 넣고, 묶음 전체에 같은 값을 씁니다.
      const bundleId = 'AUTO';
      let updates = newStatus === ORDER_STATUS.PREPARING
        ? selectedItems.map(id => ({
            id,
            status: newStatus,
            ...(isBundle ? { bundleId } : {}),
            ...addressUpdateData
          }))
        : selectedItems.map(id => ({ id, status: newStatus, ...(newStatus === ORDER_STATUS.BIDDING ? { bidStatus: 'PENDING' } : {}) }));
      
      try {
        const storedId = localStorage.getItem('user_id');
        const isPayment = ([ORDER_STATUS.PAID, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.BIDDING] as string[]).includes(newStatus);
        // 💬 이용 내역에 남길 문구 — 무엇을 몇 건 결제했는지만 짧게 (금액·잔액은 이용 내역 화면에 따로 나옵니다)
        const payTitle = !isPayment ? undefined
          : `${newStatus === ORDER_STATUS.BIDDING ? '경매 보증금'
            : newStatus === ORDER_STATUS.PAYMENT_DONE ? '배송비 결제'
            : '상품 결제'} · ${selectedItems.length}건`;
        
        const res = await fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates, userId: isPayment ? storedId : null, deductAmount: isPayment ? totalPriceWon : 0, paymentTitle: payTitle })
        });

        if (res.ok) {
          showAlert('처리가 완료되었습니다.', 'success');
          setSelectedItems([]);
          fetchOrders();
          setActiveTab(newStatus);
        } else showAlert('처리에 실패했습니다.', 'error');
      } catch (error) { console.error(error); }
    }
  };

  return {
    isAuthChecking, isLoading, shippingPhases, activeTab, setActiveTab, items, orders, userData,
    selectedItems, setSelectedItems, selectedAddress, setSelectedAddress, exchangeRate,
    totals, totalPriceWon, fetchOrders, handleDeleteOrder, handleIndividualPacking, handleUpdateStatus, setCalcTabOverride,
    progressFilterActive, setProgressFilterActive, allViewSelected, setAllViewSelected, phaseView, setPhaseView,
    // 🛒 장바구니 카드(구매 요청 + 경매 요청 한 표)에서 쓸 결제 기준 상태
    payStatus,
    orderTypeFilter, allOrders
  };
}

// =================================================================
// 2. 화면 컴포넌트 영역 (View Layer)
// =================================================================

const SubStatusChip = ({ item, isActive, onClick }: { item: any, isActive: boolean, onClick: () => void }) => {
  // 🌟 클릭 시 이벤트 버블링과 기본 동작을 확실히 제어하기 위한 핸들러
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <button 
      type="button" // 🌟 명시적으로 버튼 타입 지정
      className={`miku-sub-status-chip ${isActive ? 'active' : ''} ${item.count > 0 ? 'has-count' : ''}`}
      onClick={handleClick}
    >
      <span className="status-name">{item.name}</span>
      <span className="status-count">{item.count}</span>
      {item.desc && <div className="miku-tooltip">{item.desc}</div>}
    </button>
  );
};

const PhaseModule = ({ phase, activeTab, onTabClick, onPhaseView, phaseView, onCardClick, todoCount = 0 }: {
  phase: any, activeTab: string, onTabClick: (key: string) => void,
  /** ✋ 이 카드 안에서 손님이 처리할 일(결제 · 포장 요청) 건수 — 아이콘 모서리에 빨간 숫자로 */
  todoCount?: number,
  onPhaseView?: (phaseId: string) => void, phaseView?: string | null,
  /** 카드 클릭을 직접 처리할 때 (예: 국제 배송중 → 아래 국제 배송 현황 패널로 이동) */
  onCardClick?: () => void,
}) => {
  // 여러 상태를 모아 보는 카드(입고 완료)는 그 모아 보기가 켜졌을 때만 선택 표시합니다
  const isGroupView = Boolean(onPhaseView && PHASE_VIEW_STATUSES[phase.id]);
  const activePhaseCard = phaseView ? (PHASE_VIEW_CARD[phaseView] || phaseView) : null;
  const isPhaseActive = isGroupView
    ? activePhaseCard === phase.id
    : (phase.statuses as string[]).includes(activeTab);
  // 🌟 하위 항목이 1개뿐일 때(예: 진행중인 목록만 보기로 나머지가 숨겨진 경우)는
  // 모듈 가로 폭을 넓게 유지할 이유가 없어 컴팩트하게 줄입니다.
  const isCompact = phase.subItems.length <= 1;
  // 🌟 하위 칩은 숨기므로 카드 전체를 눌러 이동합니다. (건수가 있는 첫 항목 → 없으면 첫 항목)
  const firstKey = (phase.subItems.find((it: any) => it.count > 0) || phase.subItems[0])?.key;
  const handleCardClick = () => {
    if (onCardClick) { onCardClick(); return; }
    if (isGroupView) { onPhaseView!(phase.id); return; }
    if (firstKey) onTabClick(firstKey);
  };

  return (
    <div
      data-phase={phase.id}
      className={`miku-phase-module ${phase.theme} ${isPhaseActive ? 'phase-active' : ''} phase-compact is-clickable`}
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(); } }}
    >
      <div className="phase-header">
        <div className="phase-title-group">
          <span className="phase-icon">
            <i className={`fa ${phase.icon}`}></i>
            {todoCount > 0 && <span className="phase-todo-dot" title={`처리할 일 ${todoCount}건`}>{todoCount}</span>}
          </span>
          <h3 className="phase-title">{phase.title}</h3>
        </div>
        <div className="phase-total-badge">
          합계 <span className="total-count">{phase.totalCount}</span>
        </div>
      </div>

      <div className={`phase-body ${isCompact ? 'phase-body-single' : ''}`}>
        {phase.subItems.map((item: any) => (
          <SubStatusChip
            key={item.key}
            item={item}
            isActive={activeTab === item.key}
            onClick={() => onTabClick(item.key)}
          />
        ))}
      </div>
      
      <div className="phase-connector">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </div>
  );
};


function MyPurchaseStatusContent() {
  const {
    isAuthChecking, isLoading, shippingPhases, activeTab, setActiveTab, items, orders, userData,
    selectedItems, setSelectedItems, selectedAddress, setSelectedAddress, exchangeRate,
    totals, totalPriceWon, fetchOrders, handleDeleteOrder, handleIndividualPacking, handleUpdateStatus, setCalcTabOverride,
    progressFilterActive, setProgressFilterActive, allViewSelected, setAllViewSelected, phaseView, setPhaseView,
    // 🛒 장바구니 카드(구매 요청 + 경매 요청 한 표)에서 쓸 결제 기준 상태
    payStatus,
    orderTypeFilter, allOrders
  } = usePurchaseStatusLogic();

  const sliderRef = useRef<HTMLDivElement>(null);
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: false });

  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  // 🌟 드래그 여부를 정밀하게 추적하는 상태
  const [isDragging, setIsDragging] = useState(false);

  const updateScrollEdges = () => {
    const slider = sliderRef.current;
    if (!slider) return;

    const edgeTolerance = 2;
    setScrollEdges({
      left: slider.scrollLeft > edgeTolerance,
      right: slider.scrollLeft + slider.clientWidth < slider.scrollWidth - edgeTolerance,
    });
  };

  // 🌟 좌/우 화살표를 누르면 다음(이전) 단계 카드의 시작 위치에 딱 맞춰 넘깁니다. (스냅은 화살표에서만)
  //    드래그는 손가락/마우스를 움직인 만큼만 자연스럽게 움직이고 멈춘 자리에 그대로 둡니다.
  const scrollPipeline = (dir: -1 | 1) => {
    const slider = sliderRef.current;
    if (!slider) return;
    stopMomentum();
    const cards = Array.from(slider.querySelectorAll<HTMLElement>('.miku-phase-module'));
    const max = slider.scrollWidth - slider.clientWidth;
    const cur = slider.scrollLeft;
    const starts = cards.map(c => Math.min(max, c.offsetLeft - cards[0].offsetLeft));
    const target = dir > 0
      ? (starts.find(x => x > cur + 4) ?? max)
      : ([...starts].reverse().find(x => x < cur - 4) ?? 0);
    slider.scrollTo({ left: target, behavior: 'smooth' });
  };

  useEffect(() => {
    updateScrollEdges();
    window.addEventListener('resize', updateScrollEdges);
    return () => window.removeEventListener('resize', updateScrollEdges);
  }, [shippingPhases.length, orders.length]);

  // 드래그 속도 추적 (놓은 뒤 관성으로 조금 더 미끄러지게) — 매 프레임 렌더를 피하려고 ref 로 둡니다.
  const dragVelRef = useRef(0);
  const dragLastRef = useRef<{ x: number; t: number } | null>(null);
  const momentumRafRef = useRef<number | null>(null);
  const stopMomentum = () => {
    if (momentumRafRef.current !== null) cancelAnimationFrame(momentumRafRef.current);
    momentumRafRef.current = null;
  };
  useEffect(() => () => stopMomentum(), []);

  const startDragging = (e: React.MouseEvent<HTMLDivElement>) => {
    stopMomentum();
    setIsMouseDown(true);
    setIsDragging(false); // 처음 누를 때는 드래그 상태 아님
    if (!sliderRef.current) return;
    setStartX(e.pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
    dragVelRef.current = 0;
    dragLastRef.current = { x: e.pageX, t: performance.now() };
  };

  const onDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDown || !sliderRef.current) return;

    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = x - startX; // 🌟 움직인 만큼 그대로 (예전엔 1.5배라 손보다 빨리 움직였음)

    // 마우스가 5픽셀 이상 실제로 이동했을 때만 드래그로 인정 (클릭과 구분)
    if (isDragging || Math.abs(walk) > 5) {
      if (!isDragging) setIsDragging(true);
      e.preventDefault();
      sliderRef.current.scrollLeft = scrollLeft - walk;

      const now = performance.now();
      const last = dragLastRef.current;
      if (last && now > last.t) {
        const v = (e.pageX - last.x) / (now - last.t); // px/ms
        dragVelRef.current = dragVelRef.current * 0.6 + v * 0.4; // 튀는 값을 부드럽게
      }
      dragLastRef.current = { x: e.pageX, t: now };
    }
  };

  const stopDragging = () => {
    if (!isMouseDown) return;
    setIsMouseDown(false);

    // 🌟 놓는 순간의 속도로 조금 더 미끄러지다 서서히 멈춥니다. (카드에 맞춰 붙지 않음)
    const slider = sliderRef.current;
    const recent = dragLastRef.current && performance.now() - dragLastRef.current.t < 80;
    let v = recent ? dragVelRef.current : 0;
    if (slider && Math.abs(v) > 0.05) {
      let prev = performance.now();
      const step = (now: number) => {
        const dt = Math.min(32, now - prev);
        prev = now;
        slider.scrollLeft -= v * dt;
        v *= Math.pow(0.94, dt / 16); // 마찰
        const atEdge = slider.scrollLeft <= 0 || slider.scrollLeft >= slider.scrollWidth - slider.clientWidth;
        if (Math.abs(v) > 0.02 && !atEdge) momentumRafRef.current = requestAnimationFrame(step);
        else momentumRafRef.current = null;
      };
      momentumRafRef.current = requestAnimationFrame(step);
    }

    // 약간의 딜레이를 주어 onClick 이벤트가 끝난 뒤에 드래그 상태가 풀리도록 함
    setTimeout(() => {
      setIsDragging(false);
    }, 50);
  };

  // 🔎 "전체 내역 보기" 표에서 입고 대기중(상품 결제 완료) · 입고 완료 상품을 누르면 탭을 옮기지 않고,
  //    아래 "상세 정보 확인" 패널에 같은 상태의 상품 전체를 체크 해제된 채로 보여 줍니다. (배송 준비중도 같음 — 합포장은 묶음 한 줄)
  //    입고 완료는 포장 요청 · 배송지 선택까지 함께 보여 줍니다.
  //    🌟 신청 내역 보기에 나오는 모든 상태(장바구니 제외)가 같은 방식으로 상세 패널을 엽니다.
  //    🛒 장바구니 카드의 구매 요청도 경매 요청처럼 상세 패널에서 금액 확인 · 결제까지 합니다.
  const DETAIL_STATUSES: string[] = Object.values(ORDER_STATUS).filter((st) => st !== ORDER_STATUS.ALL);
  // 상세 패널 안에서 바로 결제하는 상태 (구매 요청 · 경매 요청 · 낙찰 · 배송비 요청)
  const DETAIL_PAY_STATUSES: string[] = [ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING, ORDER_STATUS.BID_SUCCESS, ORDER_STATUS.PAYMENT_REQ];
  // 상세 패널 제목 옆 아이콘 (상태별)
  const DETAIL_ICONS: Record<string, string> = {
    [ORDER_STATUS.CART]: 'fa-cart-shopping',
    [ORDER_STATUS.BID_PENDING]: 'fa-gavel',
    [ORDER_STATUS.BIDDING]: 'fa-gavel',
    [ORDER_STATUS.BID_SUCCESS]: 'fa-trophy',
    [ORDER_STATUS.FAILED]: 'fa-circle-exclamation',
    [ORDER_STATUS.PAID]: 'fa-credit-card',
    [ORDER_STATUS.WAITING]: 'fa-hourglass-half',
    [ORDER_STATUS.ARRIVED]: 'fa-warehouse',
    [ORDER_STATUS.PREPARING]: 'fa-box',
    [ORDER_STATUS.PAYMENT_REQ]: 'fa-credit-card',
    [ORDER_STATUS.PAYMENT_DONE]: 'fa-circle-check',
    [ORDER_STATUS.SHIPPING]: 'fa-plane',
  };
  // 전체 진행 현황에서 숨길 단계 카드
  const HIDDEN_PHASES = ['warehouse'];
  const [detailStatus, setDetailStatus] = useState<string | null>(null);
  // 같은 "상품 결제 완료(PAID)" 라도 배송대행은 "입고 대기중" 이라 구매대행과 섞어 보여 주지 않습니다.
  // 누른 상품이 배송대행이면 배송대행만, 구매대행이면 구매대행만 보여 줍니다. (입고 완료는 구분 없이 전체)
  const [detailIsDelivery, setDetailIsDelivery] = useState(false);
  // 🔽 펼치기 보기: 장바구니 · 신청 내역 보기 · 입고 완료 보기(탭 '전체')에서는 상품을 누르면 그 아래에 상세가 펼쳐지고,
  //    결제 · 포장 요청이 필요한 상품은 목록에서 바로 골라 아래에서 처리합니다. (국제 배송중 보기는 배송 표 그대로)
  //    예전엔 상품을 누르면 맨 아래 '상세 정보 확인' 패널이 열리고, 거기서 다시 골라 처리했습니다.
  const isInlineView = activeTab === ORDER_STATUS.ALL && phaseView !== 'shipping';
  const isCartView = activeTab === ORDER_STATUS.ALL && (phaseView === 'cart' || phaseView === 'request');
  // 고른 상품의 상태가 결제 · 요청 기준입니다. (아무것도 안 골랐으면: 장바구니 보기는 첫 상품의 상태 — 결제 카드를 늘 보여 줌, 그 밖은 없음)
  const cartPayStatus = useMemo(() => {
    if (!isInlineView) return null;
    const firstSelected = orders.find((o: any) => selectedItems.map(String).includes(String(o.orderId)));
    if (firstSelected) return firstSelected.status as string;
    return isCartView ? ((items[0]?.status as string) || ORDER_STATUS.CART) : null;
  }, [isInlineView, isCartView, orders, selectedItems, items]);
  const INLINE_PAY_TARGET: Record<string, string> = {
    [ORDER_STATUS.CART]: ORDER_STATUS.PAID,
    [ORDER_STATUS.BID_SUCCESS]: ORDER_STATUS.PAID,
    [ORDER_STATUS.BID_PENDING]: ORDER_STATUS.BIDDING,
    [ORDER_STATUS.PAYMENT_REQ]: ORDER_STATUS.PAYMENT_DONE,
  };
  const inlinePackRef = useRef<HTMLDivElement>(null);
  // 배송비 요청 패널에서 결제할 때 금액 계산이 이 패널 기준이 되도록 알려 줍니다
  useEffect(() => {
    setCalcTabOverride(activeTab === ORDER_STATUS.ALL ? (detailStatus ?? cartPayStatus) : null);
  }, [activeTab, detailStatus, cartPayStatus, setCalcTabOverride]);
  // 🕒 상세 정보 확인은 최근에 수정(상태 변경)된 상품이 위로 오게 정렬합니다.
  const detailItems = useMemo(() => orders.filter((o: any) =>
    o.status === detailStatus &&
    (detailStatus !== ORDER_STATUS.PAID || (o.type === 'DELIVERY') === detailIsDelivery)
  ).sort(byRecentlyTouched), [orders, detailStatus, detailIsDelivery]);
  const arrivedDetailOpen = detailStatus !== null;
  const setArrivedDetailOpen = (open: boolean) => { if (!open) setDetailStatus(null); };
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const [detailFocusIds, setDetailFocusIds] = useState<string[]>([]);
  const handleAllRowClick = (status: string, ids?: string[]) => {
    if (DETAIL_STATUSES.includes(status) && ids?.length) {
      // 🌟 누른 상품 하나만이 아니라 같은 상태 상품 전체를 보여 주고, 체크는 모두 해제된 채로 시작합니다.
      setSelectedItems([]);
      const clicked: any = orders.find((o: any) => ids.map(String).includes(String(o.orderId)));
      setDetailIsDelivery(clicked?.type === 'DELIVERY');
      setDetailFocusIds(ids.map(String));
      setDetailStatus(status);
      setTimeout(() => detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      return;
    }
    handleTabChange(status);
  };
  const closeArrivedDetail = () => { setArrivedDetailOpen(false); setSelectedItems([]); };

  // 🌟 탭 변경 핸들러에 드래그 중일 때의 가드 추가
  const handleTabChange = (key: string) => {
    // 드래그 중이었다면 클릭(탭 변경)을 무시합니다.
    if (isDragging) return;
    setArrivedDetailOpen(false);

    setActiveTab(key);
    setSelectedItems([]);

    setTimeout(() => {
      if (!sliderRef.current) return;

      if (key === ORDER_STATUS.ALL) {
        // '전체' 카드는 장바구니 다음(두 번째)에 있어서 그 위치로 이동합니다
        const allModule = sliderRef.current.querySelector('[data-phase="all"]') as HTMLElement | null;
        const left = allModule ? allModule.offsetLeft - 15 : 0;
        sliderRef.current.scrollTo({ left: left > 0 ? left : 0, behavior: 'smooth' });
        return;
      }

      const phaseObj = shippingPhases.find(p => (p.statuses as string[]).includes(key));
      if (phaseObj) {
        const targetModule = sliderRef.current.querySelector(`[data-phase="${phaseObj.id}"]`) as HTMLElement;
        if (targetModule) {
          const targetScrollLeft = targetModule.offsetLeft - 15;
          sliderRef.current.scrollTo({
            left: targetScrollLeft > 0 ? targetScrollLeft : 0,
            behavior: 'smooth'
          });
        }
      }
    }, 50);
  };

  // 🌟 "현재 진행중인 현황 보기": 전체(ALL) 탭의 공용 테이블 렌더링을 그대로 재사용하면서,
  // 진행 중 단계(경매 상황/낙찰 성공/상품 결제 완료/실패)에 속한 주문만 골라서 보여줍니다.
  const handleShowProgressOverview = () => {
    if (isDragging) return;
    handleTabChange(ORDER_STATUS.ALL);
    setProgressFilterActive(true);
  };

  // 🌟 "전체 내역 보기"를 실제로 클릭했을 때만 선택 표시를 켭니다.
  // "진행중인 목록만 보기" 토글 상태는 건드리지 않고 그대로 존중합니다(토글이 켜져 있으면 계속 필터된 목록을 보여줌).
  // 토글을 그냥 껐을 때는 자동으로 선택 표시되지 않습니다.
  const handleShowAllOverview = () => {
    if (isDragging) return;
    handleTabChange(ORDER_STATUS.ALL);
    setAllViewSelected(true);
  };

  // 🌟 입고 완료 카드: 입고 완료 · 배송 준비중 · 배송비 요청 · 배송비 결제 완료를 한 표에 모아 봅니다
  const handleShowPhaseView = (phaseId: string) => {
    if (isDragging) return;
    handleTabChange(ORDER_STATUS.ALL);
    setPhaseView(phaseId);
  };

  // 🌟 "진행중인 목록만 보기" 토글 스위치 전용 핸들러.
  const handleToggleProgressFilter = () => {
    if (isDragging) return;
    if (progressFilterActive) {
      handleTabChange(ORDER_STATUS.ALL);
      setProgressFilterActive(false);
    } else {
      handleShowProgressOverview();
    }
  };


  // 🌟 "전체" 카드의 합계/전체 내역 보기 숫자도 합포장 묶음을 1건으로 집계합니다.
  // "전체 내역 보기"는 토글 상태와 무관하게 항상 국제 배송을 제외하므로, 실제 테이블 개수와 일치시킵니다.
  // ✋ 단계 카드의 '할 일' 숫자 (합포장 묶음은 1건)
  const countBundleAware = (list: any[]) => {
    const seen = new Set<string>(); let n = 0;
    list.forEach((o: any) => { if (o.bundleId) { if (seen.has(o.bundleId)) return; seen.add(o.bundleId); } n++; });
    return n;
  };
  const todoRequestView = orders.filter((o: any) => o.status === ORDER_STATUS.BID_SUCCESS).length;
  const todoProgressView = countBundleAware(orders.filter((o: any) => o.status === ORDER_STATUS.ARRIVED || o.status === ORDER_STATUS.PAYMENT_REQ));

  const totalCount = useMemo(
    // 🛒 전체 내역 보기 표와 같이 구매 요청(장바구니)은 세지 않습니다.
    () => countBundleAware(orders.filter((o: any) => REQUEST_VIEW_STATUSES.includes(o.status))),
    [orders]
  );

  // 🌟 "국제 배송 현황" 패널: 국제 배송(SHIPPING) 상태 주문을 합포장 묶음 기준으로 정리하고,
  // 각 배송의 물류 단계(deliveryStatus)를 함께 보여줍니다.
  // 🚚 국제 배송 상품은 위쪽 표가 아니라 아래 "국제 배송 현황" 패널에서만 봅니다.
  //    예전에는 이 패널의 행이나 상단 요약을 누르면 위쪽 표가 국제 배송 탭으로 바뀌어 같은 상품이 두 곳에 보였습니다.

  // 🚚 운송장 번호를 누르면 그 주문에 저장된 배송 업체(Order.shippingCarrierId)의 사이트를 새 창으로 엽니다.
  //    업체 이름·주소는 /api/users 가 shippingCarrier 로 함께 내려줍니다.
  //    업체 주소에 {tracking} 자리가 있으면 운송장 번호를 넣어 조회 결과로 바로 보냅니다.
  const openCarrierSite = (shipment: any) => {
    const url = buildTrackingUrl(shipment?.shippingCarrier?.url, shipment?.trackingNo);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const internationalShipments = useMemo(() => {
    // 🕒 상세 정보 확인에서 최근에 수정(발송)된 배송이 위로 오게 정렬합니다. (합포장은 묶음에서 가장 최근 것 기준)
    const shippingOrders = orders.filter((o: any) => o.status === ORDER_STATUS.SHIPPING).sort(byRecentlyTouched);
    const seenBundles = new Set<string>();
    const result: any[] = [];
    shippingOrders.forEach((o: any) => {
      if (o.bundleId) {
        if (seenBundles.has(o.bundleId)) return;
        seenBundles.add(o.bundleId);
        const group = shippingOrders.filter((g: any) => g.bundleId === o.bundleId);
        const first = group[0];
        result.push({
          ...first,
          orderIds: group.map((g: any) => g.orderId),
          // 🌟 상품명만 말줄임(...) 대상이 되도록 "외 N건" 접미사는 별도로 분리해서 보관합니다.
          // (한 문자열로 합치면 ...으로 잘릴 때 "외 N건"까지 함께 사라지는 문제가 있었습니다)
          productName: first.productName,
          isGroup: group.length > 1,
          bundleItems: group,
        });
      } else {
        result.push(o);
      }
    });
    return result;
  }, [orders]);

  // ✈️ 국제 배송 표 — 아래 '국제 배송 현황' 패널과 상세 정보 확인(국제 배송 상품을 눌렀을 때)이 같이 씁니다.
  const renderShipmentTable = (list: any[], focusIds?: string[]) => (
    <>
    {/* 표 모양(.premium-table 등)은 OrderTable 공통 스타일을 씁니다. OrderTable 이 없는 화면에서도 모양이 유지되도록 함께 넣습니다. */}
    <OrderTableStyles />
        <div className="table-container anim-slide-up delay-3">
          <table className="premium-table">
            <thead>
              <tr>
                <th className="th-cell th-product">상품명</th>
                <th className="th-cell th-recipient">주소</th>
                <th className="th-cell th-tracking">배송 조회</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={3} className="empty-row">현재 국제 배송 중인 상품이 없습니다.</td></tr>
              ) : (
                list.map((shipment: any) => {
                  const shipmentIds: string[] = shipment.orderIds || [shipment.orderId];
                  // 🔗 주소(?orderId=…)로 들어와 고른 주문이면 선택된 것으로 표시합니다.
                  //    합포장은 묶음 구성원이 모두 선택돼 있어야 그 행이 선택 상태입니다.
                  //    상세 정보 확인에서는 누른 상품(focusIds)을 강조합니다.
                  const isSelected = shipmentIds.length > 0 && (focusIds
                    ? shipmentIds.some(id => focusIds.includes(String(id)))
                    : shipmentIds.every(id => selectedItems.includes(String(id))));
                  return (
                  <tr
                    key={shipment.orderId}
                    className={`tr-row ${isSelected ? 'selected' : ''}`}
                    /* 🔗 주소로 들어온 주문번호를 찾아 스크롤하기 위한 표시 (합포장은 구성원 전부) */
                    data-order-ids={shipmentIds.join(' ')}
                  >
                    <td className="td-cell td-product">
                      <div className="prod-name-box" title={shipment.productName}>
                        {shipment.isGroup && (
                          <span className="bundle-group-badge">📦 합포장 {shipment.bundleItems.length}건</span>
                        )}
                        <span className="prod-name-text">{shipment.productName}</span>
                        {shipment.isGroup && (
                          <span className="prod-name-suffix">&nbsp;외 {shipment.bundleItems.length - 1}건</span>
                        )}
                      </div>
                    </td>
                    <td className="td-cell td-shipment-recipient">
                      {shipment.address?.recipientName || '미지정'}
                      {shipment.address?.address && (
                        <span className="recipient-address">({getLastRoadAddressPart(shipment.address.address)})</span>
                      )}
                    </td>
                    {/* 🚚 배송 조회: 배송업체(Order.shippingCarrierId → /api/users 의 shippingCarrier) + 운송장 번호를 한 카드로.
                        누르면 배송업체 조회 사이트를 새 창으로 엽니다. */}
                    <td className="td-cell td-shipment-tracking">
                      {(() => {
                        const carrierName = shipment.shippingCarrier?.name;
                        const canOpen = !!shipment.shippingCarrier?.url;
                        const isReady = !!(carrierName || shipment.trackingNo);
                        return (
                          <button
                            type="button"
                            className={`ship-track ${isReady ? '' : 'is-pending'} ${canOpen ? 'is-link' : ''}`}
                            onClick={(e) => { e.stopPropagation(); openCarrierSite(shipment); }}
                            disabled={!canOpen}
                            title={carrierName
                              ? `${carrierName} 배송 조회 (새 창)`
                              : '배송 업체가 아직 등록되지 않았습니다.'}
                          >
                            <span className="ship-track-icon" aria-hidden="true"><i className="fa fa-truck-fast"></i></span>
                            <span className="ship-track-body">
                              <span className="ship-track-carrier">{carrierName || '배송업체 준비중'}</span>
                              <span className="ship-track-no">{shipment.trackingNo || '운송장 준비중'}</span>
                            </span>
                            {canOpen && (
                              <span className="ship-track-go" aria-hidden="true"><i className="fa fa-arrow-up-right-from-square"></i></span>
                            )}
                          </button>
                        );
                      })()}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
    </>
  );


  const actionRequiredItems = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    
    const requiredStatuses = [
      { key: ORDER_STATUS.CART, type: 'payment', title: '상품 결제 대기', desc: '장바구니 상품의 결제를 진행해주세요.' },
      { key: ORDER_STATUS.BID_PENDING, type: 'payment', title: '경매 보증금 대기', desc: '경매 입찰을 위해 보증금을 결제해주세요.' },
      { key: ORDER_STATUS.BID_SUCCESS, type: 'payment', title: '낙찰 상품 결제 대기', desc: '낙찰된 경매 상품의 1차 결제를 진행해주세요.' },
      { key: ORDER_STATUS.ARRIVED, type: 'action', title: '배송 요청 대기', desc: '입고된 상품의 배송(합포장)을 요청해주세요.' },
      { key: ORDER_STATUS.PAYMENT_REQ, type: 'payment', title: '배송비 결제 대기', desc: '국제 배송비를 결제해주세요.' },
      { key: ORDER_STATUS.FAILED, type: 'alert', title: '경매/구매 실패 내역', desc: '실패 사유를 확인하고 처리해주세요.' },
    ];

    return requiredStatuses
      .map(status => {
        const count = orders.filter(order => order.status === status.key).length;
        return count > 0 ? { ...status, count } : null;
      })
      .filter(Boolean);
  }, [orders]);


  if (isAuthChecking) return <div style={{ height: '100vh', backgroundColor: '#f8fafc' }} />;
  if (isLoading) return <div style={{ padding: '100px', textAlign: 'center', color: '#64748b' }}>데이터를 불러오는 중입니다...</div>;

  const actionTotal = actionRequiredItems.reduce((sum: number, item: any) => sum + (item?.count || 0), 0);
  const typeLabel = orderTypeFilter === 'PURCHASE' ? '구매대행' : orderTypeFilter === 'DELIVERY' ? '배송대행' : '전체';

  return (
    <div className="miku-status-wrapper mp-skin">

      {/* 🌟 주문 현황 요약 카드 */}
      <section className="mp-hero is-compact mp-anim" aria-label="주문 현황 요약">
        <div className="mp-hero-main">
          <div className="mp-avatar" aria-hidden="true"><i className="fa fa-box-open"></i></div>
          <div className="mp-hero-text">
            <span className="mp-eyebrow-dark">ORDER STATUS</span>
            <h2 className="mp-hero-title">나의 <em>{typeLabel}</em> 주문 현황</h2>
            <p className="mp-hero-desc">
              {actionTotal > 0
                ? `확인이 필요한 주문이 ${actionTotal}건 있어요. 아래 진행 현황에서 결제·요청을 진행해 주세요.`
                : '진행 단계를 눌러 주문을 확인하고, 결제와 포장 요청을 한 곳에서 처리하세요.'}
            </p>
          </div>
        </div>

        <div className="mp-hero-money">
          <span className="mp-hero-money-label"><i className="fa fa-sack-dollar"></i> 미쿠짱머니</span>
          <strong className="mp-hero-money-value" translate="no">{(userData?.cyberMoney || 0).toLocaleString()}<small>원</small></strong>
          <div className="mp-hero-money-actions">
            <Link href="/mypage/money/charge" className="is-primary"><i className="fa fa-plus"></i> 충전</Link>
            <Link href="/mypage/money/history"><i className="fa fa-receipt"></i> 이용 내역</Link>
          </div>
        </div>

        <div className="mp-hero-stats">
          {/* 🌟 장바구니 건수 — 누르면 '신청 내역 보기'처럼 목록만 보여 줍니다. (결제는 상품을 눌러 상세 정보 확인에서) */}
          <button type="button" className="mp-hero-stat" onClick={() => handleShowPhaseView('cart')}>
            <span>장바구니</span><strong>{orders.filter((o: any) => o.status === ORDER_STATUS.CART).length}<small>건</small></strong>
          </button>
          {/* 🌟 확인 필요 대신 "전체 내역 보기" (장바구니 제외 · 국제 배송 제외 — 아래 전체 카드와 같은 숫자) */}
          <button type="button" className="mp-hero-stat" onClick={() => handleShowAllOverview()}>
            <span>신청 내역 보기</span><strong>{totalCount}<small>건</small></strong>
          </button>
          {/* 🌟 입고 완료 · 배송 준비중 · 배송비 요청 · 배송비 결제 완료를 더한 건수 (아래 '입고 완료' 카드와 같은 숫자, 합포장은 1건)
              누르면 그 카드처럼 네 상태를 한 표에 모아 보여 줍니다 */}
          <button type="button" className="mp-hero-stat" onClick={() => handleShowPhaseView('progress')}>
            <span>입고 완료</span><strong>{shippingPhases.find(p => p.id === 'progress')?.totalCount ?? 0}<small>건</small></strong>
          </button>
          <button type="button" className="mp-hero-stat" onClick={() => handleShowPhaseView('shipping')}>
            <span>국제 배송 중</span><strong>{internationalShipments.length}<small>건</small></strong>
          </button>
        </div>
      </section>

      {/* 🌟 서비스별 내역 필터 (전체 / 구매대행 / 배송대행) */}
      <nav className="miku-order-type-filter anim-slide-up" aria-label="서비스별 내역">
        {([
          { key: null, label: '전체', href: '/mypage/status' },
          { key: 'PURCHASE', label: '구매대행', href: '/mypage/status?type=PURCHASE' },
          { key: 'DELIVERY', label: '배송대행', href: '/mypage/status?type=DELIVERY' },
        ] as const).map(opt => {
          const count = opt.key ? allOrders.filter((o: any) => o.type === opt.key).length : allOrders.length;
          const isActive = orderTypeFilter === opt.key;
          return (
            <Link
              key={opt.label}
              href={opt.href}
              scroll={false}
              className={`type-filter-btn ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {opt.label}
              <span className="type-filter-count">{count}</span>
            </Link>
          );
        })}
      </nav>
      

      <div className="miku-status-section-header anim-slide-up delay-1" id="miku-progress-panel">
        <span className="mp-eyebrow" style={{ flexBasis: '100%', marginBottom: '-10px' }}>Progress</span>
        <h2>전체 진행 현황 <span className="section-icon-badge badge-blue"><i className="fa fa-chart-line"></i></span></h2>
        {/* 🚫 '진행중인 목록만 보기' 토글은 없앴습니다. 필터는 항상 켜진 상태(국제 배송 제외 · 0건 항목 숨김)로 동작합니다. */}
      </div>

      <div className="miku-progress-panel">
      <div className="miku-unified-pipeline-container anim-slide-up delay-1">

        <div className="pipeline-slider-shell">
          {/* 🌟 누르면 단계 카드를 한 장씩 넘깁니다. 더 넘길 곳이 없으면 숨고 눌리지 않습니다. */}
          <button
            type="button"
            className={`pipeline-arrow pipeline-arrow-left ${scrollEdges.left ? 'visible' : ''}`}
            onClick={() => scrollPipeline(-1)}
            aria-label="이전 단계 보기"
            tabIndex={scrollEdges.left ? 0 : -1}
            aria-hidden={!scrollEdges.left}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button
            type="button"
            className={`pipeline-arrow pipeline-arrow-right ${scrollEdges.right ? 'visible' : ''}`}
            onClick={() => scrollPipeline(1)}
            aria-label="다음 단계 보기"
            tabIndex={scrollEdges.right ? 0 : -1}
            aria-hidden={!scrollEdges.right}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <div 
            className={`pipeline-modules-wrapper ${isMouseDown && isDragging ? 'is-dragging' : ''} ${scrollEdges.left ? 'edge-left' : ''} ${scrollEdges.right ? 'edge-right' : ''}`}
            ref={sliderRef}
            onMouseDown={startDragging}
            onMouseLeave={stopDragging}
            onMouseUp={stopDragging}
            onMouseMove={onDrag}
            onScroll={updateScrollEdges}
          >
            {/* 🌟 순서: 장바구니 → 신청 내역 보기 → 입고 완료 → 국제 배송중 */}
            {shippingPhases.filter(p => p.id === 'request').map((phase) => (
              <PhaseModule
                key={phase.id}
                phase={phase}
                activeTab={activeTab}
                onTabClick={handleTabChange}
                onPhaseView={handleShowPhaseView}
                phaseView={phaseView}
              />
            ))}

            <div
              data-phase="all"
              className={`miku-phase-module theme-slate phase-compact is-clickable ${activeTab === ORDER_STATUS.ALL && !phaseView ? 'phase-active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={handleShowAllOverview}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleShowAllOverview(); } }}
            >
              <div className="phase-header">
                <div className="phase-title-group">
                  <span className="phase-icon">
                    <i className="fa fa-layer-group"></i>
                    {todoRequestView > 0 && <span className="phase-todo-dot" title={`처리할 일 ${todoRequestView}건`}>{todoRequestView}</span>}
                  </span>
                  <h3 className="phase-title">신청 내역 보기</h3>
                </div>
                <div className="phase-total-badge">
                  합계 <span className="total-count">{totalCount}</span>
                </div>
              </div>

              <div className="phase-body phase-body-single">
                <button
                  type="button"
                  className={`miku-sub-status-chip ${allViewSelected ? 'active' : ''} ${totalCount > 0 ? 'has-count' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleShowAllOverview(); }}
                >
                  <span className="status-name">전체 내역 보기</span>
                  <span className="status-count">{totalCount}</span>
                  <div className="miku-tooltip">전체 진행 내역 가져오기</div>
                </button>
              </div>

              <div className="phase-connector">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </div>

            {/* 🚫 현지 입고(warehouse) 카드는 숨깁니다. 입고 완료 상품은 '전체 내역 보기'에서 눌러 상세 정보 확인 패널로 봅니다.
                다시 보이게 하려면 HIDDEN_PHASES 에서 'warehouse' 를 빼면 됩니다. */}
            {shippingPhases.filter(p => p.id !== 'request' && !HIDDEN_PHASES.includes(p.id)).map((phase) => (
              <PhaseModule
                key={phase.id}
                phase={phase}
                activeTab={activeTab}
                onTabClick={handleTabChange}
                onPhaseView={handleShowPhaseView}
                phaseView={phaseView}
                todoCount={phase.id === 'progress' ? todoProgressView : 0}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="anim-slide-up delay-2">
        {activeTab === ORDER_STATUS.ALL && phaseView === 'shipping' ? (
          // ✈️ 국제 배송중: 상태가 하나뿐이라 상태 칸 없이, 상세 정보 확인과 같은 배송 정보(주소 · 배송업체 · 운송장)를 바로 보여 줍니다.
          <div className="miku-shipment-panel is-embedded">
            {renderShipmentTable(internationalShipments)}
          </div>
        ) : (
        <OrderTable
          items={items} orders={orders} activeTab={activeTab}
          selectedItems={selectedItems} setSelectedItems={setSelectedItems}
          fetchOrders={fetchOrders} selectedAddress={selectedAddress}
          onIndividualPacking={handleIndividualPacking} onDelete={handleDeleteOrder}
          onStatusClick={handleAllRowClick}
          /* 🔽 펼치기 보기: 결제 · 포장 요청할 상품은 체크박스로 바로 고르고, 상품을 누르면 그 아래에 상세가 펼쳐집니다 */
          inlineMode={isInlineView}
          myMoney={userData?.cyberMoney || 0} exchangeRate={exchangeRate}
        />
        )}
       </div>
      
      {/* 🌟 입고 완료 상태 시 노출되는 합포장/개별포장 통합 액션 버튼 영역 */}
      {(activeTab === ORDER_STATUS.ARRIVED || (isInlineView && cartPayStatus === ORDER_STATUS.ARRIVED)) && (
        <div className="anim-slide-up delay-3" ref={inlinePackRef}>
          <div className="package-action-group">
            <button 
              className={`btn-package btn-individual ${selectedItems.length > 0 ? 'active' : 'disabled'}`}
              onClick={() => handleUpdateStatus(ORDER_STATUS.PREPARING, false)} 
              disabled={selectedItems.length === 0}
            >
              개별 포장 요청
            </button>
            <button 
              className={`btn-package btn-combine ${selectedItems.length >= 2 ? 'active' : 'disabled'}`}
              onClick={() => handleUpdateStatus(ORDER_STATUS.PREPARING, true)} 
              disabled={selectedItems.length < 2}
            >
              📦 합포장 요청
            </button>
          </div>
          {selectedItems.length < 2 && <p className="bundle-helper">* 합포장은 2개 이상의 상품을 선택해야 가능합니다.</p>}
          <NoticePanel tone="rose" className="address-change-warning">
            <strong>배송비 결제 후에는 주소 변경이 어렵습니다.</strong><br />
            결제 전 배송지를 꼭 확인해주세요.
          </NoticePanel>
          <AddressForm userData={userData} selectedItems={selectedItems} fetchOrders={fetchOrders} selectedAddress={selectedAddress} setSelectedAddress={setSelectedAddress} />
        </div>
      )}

      {/* 📱 장바구니 보기(모바일): 화면 아래에 [선택 N건 · 합계 · 결제하기] 를 고정해, 목록 어디서든 바로 결제합니다 */}
      {isInlineView && !arrivedDetailOpen && selectedItems.length > 0 && cartPayStatus && (INLINE_PAY_TARGET[cartPayStatus] || cartPayStatus === ORDER_STATUS.ARRIVED) && (
        <div className="miku-cart-paybar" role="region" aria-label="선택한 상품 처리">
          <div className="miku-cart-paybar-info">
            <span>선택 <b>{selectedItems.length}</b>건</span>
            {cartPayStatus === ORDER_STATUS.ARRIVED
              ? <strong>포장 요청</strong>
              : <strong translate="no">₩ {totalPriceWon.toLocaleString()}</strong>}
          </div>
          {cartPayStatus === ORDER_STATUS.ARRIVED ? (
            // 📦 포장 요청은 배송지를 골라야 해서, 아래 포장 · 배송지 칸으로 내려 줍니다
            <button type="button" className="miku-cart-paybar-btn"
              onClick={() => inlinePackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              포장 · 배송지 선택
            </button>
          ) : (
            <button type="button" className="miku-cart-paybar-btn"
              onClick={() => handleUpdateStatus(INLINE_PAY_TARGET[cartPayStatus])}>
              {cartPayStatus === ORDER_STATUS.BID_PENDING ? '보증금 결제하기'
                : cartPayStatus === ORDER_STATUS.PAYMENT_REQ ? '배송비 결제하기' : '결제하기'}
            </button>
          )}
        </div>
      )}

      {/* 상세 정보 확인 패널이 열려 있으면 결제는 그 패널 안에서 합니다 (같은 결제 카드가 두 번 나오지 않게) */}
      {!(arrivedDetailOpen && activeTab === ORDER_STATUS.ALL) && (([ORDER_STATUS.CART, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.BID_PENDING, ORDER_STATUS.BID_SUCCESS] as string[]).includes(payStatus)) && (
        <div className="anim-slide-up delay-3">
          <PaymentSummary
            activeTab={payStatus} totals={totals} totalPriceWon={totalPriceWon}
            exchangeRate={exchangeRate} selectedItems={selectedItems}
            handleUpdateStatus={handleUpdateStatus}
            myMoney={userData?.cyberMoney || 0}
            orders={orders}
          />
        </div>
      )}
      </div>

      {/* 🔎 상세 정보 확인 — 신청 내역 보기에서 상품을 누르면 같은 상태 상품 전체를 보여 줍니다 */}
      {arrivedDetailOpen && activeTab === ORDER_STATUS.ALL && (
        <div ref={detailPanelRef} className="miku-detail-section">
          <div className="miku-status-section-header anim-slide-up">
            <span className="mp-eyebrow" style={{ flexBasis: '100%', marginBottom: '-10px' }}>Detail</span>
            <h2>
              상세 정보 확인
              <span className="section-icon-badge badge-green"><i className={`fa ${DETAIL_ICONS[detailStatus || ''] || 'fa-circle-info'}`}></i></span>
              <span className="miku-detail-status">{orderStatusLabel(detailStatus || '', detailIsDelivery ? 'DELIVERY' : null)}</span>
            </h2>
            <button type="button" className="miku-detail-close" onClick={closeArrivedDetail} aria-label="상세 정보 닫기">
              <i className="fa fa-xmark"></i> 닫기
            </button>
          </div>
          <div className="miku-progress-panel miku-detail-panel anim-slide-up">
            {detailStatus === ORDER_STATUS.SHIPPING ? (
              // ✈️ 국제 배송: 아래 '국제 배송 현황'과 같은 정보(주소 · 배송업체 · 운송장)를 보여 줍니다. 누른 상품은 강조됩니다.
              <div className="miku-shipment-panel is-embedded">
                {renderShipmentTable(internationalShipments, detailFocusIds)}
              </div>
            ) : (
            <OrderTable
              items={detailItems} orders={orders} activeTab={detailStatus}
              selectedItems={selectedItems} setSelectedItems={setSelectedItems}
              fetchOrders={fetchOrders} selectedAddress={selectedAddress}
              onIndividualPacking={handleIndividualPacking}
              /* 🗑 상세 정보 확인 안에서 상품을 지우면 패널을 닫습니다. (지워진 상품 목록을 그대로 보고 있지 않도록) */
              onDelete={async (orderId: string) => { if (await handleDeleteOrder(orderId)) closeArrivedDetail(); }}
              myMoney={userData?.cyberMoney || 0} exchangeRate={exchangeRate}
            />
            )}
            {detailStatus === ORDER_STATUS.ARRIVED && (<>
            <div className="package-action-group">
              <button
                className={`btn-package btn-individual ${selectedItems.length > 0 ? 'active' : 'disabled'}`}
                onClick={() => handleUpdateStatus(ORDER_STATUS.PREPARING, false)}
                disabled={selectedItems.length === 0}
              >
                개별 포장 요청
              </button>
              <button
                className={`btn-package btn-combine ${selectedItems.length >= 2 ? 'active' : 'disabled'}`}
                onClick={() => handleUpdateStatus(ORDER_STATUS.PREPARING, true)}
                disabled={selectedItems.length < 2}
              >
                📦 합포장 요청
              </button>
            </div>
            {selectedItems.length < 2 && <p className="bundle-helper">* 합포장은 2개 이상의 상품을 선택해야 가능합니다.</p>}
            <NoticePanel tone="rose" className="address-change-warning">
              <strong>배송비 결제 후에는 주소 변경이 어렵습니다.</strong><br />
              결제 전 배송지를 꼭 확인해주세요.
            </NoticePanel>
            <AddressForm userData={userData} selectedItems={selectedItems} fetchOrders={fetchOrders} selectedAddress={selectedAddress} setSelectedAddress={setSelectedAddress} />
            </>)}
            {detailStatus && DETAIL_PAY_STATUSES.includes(detailStatus) && (
              <div className="miku-detail-payment">
                <PaymentSummary
                  activeTab={detailStatus} totals={totals} totalPriceWon={totalPriceWon}
                  exchangeRate={exchangeRate} selectedItems={selectedItems}
                  handleUpdateStatus={handleUpdateStatus}
                  myMoney={userData?.cyberMoney || 0}
                  orders={orders}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🚫 맨 아래 '국제 배송 현황' 패널은 없앴습니다. 국제 배송 상품은 '국제 배송중' 카드(또는 상단 '국제 배송 중')를 눌러
          위쪽 표에서 보고, 상품을 누르면 상세 정보 확인에서 주소 · 배송업체 · 운송장을 봅니다. */}

      {/* ================================================================= */}
      {/* 3. 디자인 영역 (CSS Layer) */}
      {/* ================================================================= */}
      <style jsx global>{`
        :root {
          --smooth-easing: cubic-bezier(0.16, 1, 0.3, 1);
          --color-blue: #3b82f6;
          --color-purple: #8b5cf6;
          --color-green: #10b981;
          --color-orange: #f97316;
          --color-rose: #e11d48;
          --color-red: #ef4444;
          --shadow-soft: 0 1px 2px rgba(15, 23, 42, 0.04), 0 14px 34px -14px rgba(15, 23, 42, 0.10);
          --shadow-elevated: 0 6px 16px -4px rgba(15, 23, 42, 0.08), 0 24px 48px -16px rgba(15, 23, 42, 0.14);
          /* 🌟 파이프라인 카드 전용의 매우 은은한 그림자 (기본/호버/활성 모두 동일하게 사용) */
          --shadow-module: 0 1px 3px -1px rgba(15, 23, 42, 0.06), 0 3px 8px -4px rgba(15, 23, 42, 0.06);
          --border-subtle: rgba(226, 232, 240, 0.7);
        }

        /* 🌟 서비스별 내역 필터 */
        .miku-order-type-filter {
          display: inline-flex; gap: 4px; padding: 4px; margin-bottom: 28px;
          background: #ffffff; border: 1px solid #eee4e3; border-radius: 14px;
          box-shadow: 0 4px 14px -8px rgba(181, 97, 95, 0.25);
        }
        .miku-order-type-filter .type-filter-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 9px 18px; border-radius: 10px;
          font-size: 14px; font-weight: 700; color: #64748b; text-decoration: none;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        .miku-order-type-filter .type-filter-btn:hover { background: #fff8f7; color: #1e293b; }
        .miku-order-type-filter .type-filter-btn.active {
          background: linear-gradient(145deg, #e3868a 0%, #c9686c 100%);
          color: #ffffff;
          box-shadow: 0 6px 12px -6px rgba(181, 97, 95, 0.6);
        }
        .miku-order-type-filter .type-filter-count {
          min-width: 22px; padding: 1px 7px; border-radius: 999px; text-align: center; box-sizing: border-box;
          font-size: 12px; font-weight: 800; background: #f1f5f9; color: #64748b;
        }
        .miku-order-type-filter .type-filter-btn.active .type-filter-count { background: rgba(255,255,255,0.25); color: #ffffff; }
        @media (max-width: 768px) {
          .miku-order-type-filter { display: flex; margin-bottom: 20px; }
          .miku-order-type-filter .type-filter-btn { flex: 1; justify-content: center; padding: 9px 8px; font-size: 13px; }
        }

        .miku-status-wrapper {
          font-family: 'Pretendard', "Noto Sans KR", sans-serif;
          color: #1e293b;
          box-sizing: border-box;
          padding-bottom: 60px;
        }

        /* 🔗 구매 후 이동·알림톡 링크가 이 지점으로 스크롤합니다.
           상단 고정 헤더(약 80px)가 "전체 진행 현황" 제목을 가리지 않게 여백을 둡니다. */
        #miku-progress-panel { scroll-margin-top: 104px; }

        .miku-status-section-header {
          margin-bottom: 16px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
        }
        .miku-status-section-header h2 {
          font-size: 20px; font-weight: 900; color: #0f172a; margin: 0;
          display: flex; align-items: center; gap: 10px; letter-spacing: -0.4px;
        }
        .progress-only-toggle {
          background: none; border: none; padding: 0; cursor: pointer;
          display: flex; align-items: center; gap: 10px;
        }
        .progress-only-toggle .toggle-label {
          font-size: 13px; font-weight: 700; color: #64748b; transition: color 0.2s;
        }
        .progress-only-toggle.on .toggle-label { color: #0f172a; }
        .progress-only-toggle .toggle-track {
          position: relative; width: 44px; height: 24px; border-radius: 999px;
          background: #cbd5e1; flex-shrink: 0; transition: background 0.25s var(--smooth-easing);
        }
        .progress-only-toggle.on .toggle-track {
          background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%);
        }
        .progress-only-toggle .toggle-thumb {
          position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%;
          background: #fff; box-shadow: 0 2px 4px rgba(15, 23, 42, 0.25);
          transition: transform 0.25s var(--smooth-easing);
        }
        .progress-only-toggle.on .toggle-thumb { transform: translateX(20px); }
        .miku-status-section-header .section-icon-badge {
          width: 28px; height: 28px; border-radius: 9px; flex-shrink: 0; color: #fff;
          display: inline-flex; align-items: center; justify-content: center; font-size: 12px;
        }
        .miku-status-section-header .section-icon-badge.badge-amber {
          background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%);
          box-shadow: 0 6px 14px -5px rgba(234, 88, 12, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3);
        }
        .miku-status-section-header .section-icon-badge.badge-blue {
          background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%);
          box-shadow: 0 6px 14px -5px rgba(37, 99, 235, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3);
        }

        .miku-status-section-header .section-icon-badge.badge-green {
          background: linear-gradient(135deg, #34d399 0%, #059669 100%);
          box-shadow: 0 6px 14px -5px rgba(5, 150, 105, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3);
        }
        /* 🔎 상세 정보 확인 패널 */
        .miku-detail-section { scroll-margin-top: 90px; }
        /* 📱 장바구니 보기 — 모바일 하단 고정 결제 바 (PC 에서는 목록 아래 결제 카드로 충분해 숨김) */
        .miku-cart-paybar { display: none; }
        @media (max-width: 768px) {
          .miku-cart-paybar {
            position: fixed; left: 12px; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); z-index: 80;
            display: flex; align-items: center; gap: 10px;
            padding: 10px 10px 10px 16px; border-radius: 18px;
            background: #111827; color: #ffffff;
            box-shadow: 0 18px 40px -16px rgba(15, 23, 42, 0.7);
            animation: mikuPaybarIn 0.28s var(--smooth-easing) both;
          }
          .miku-cart-paybar-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
          .miku-cart-paybar-info span { font-size: 12px; font-weight: 600; color: #9ca3af; }
          .miku-cart-paybar-info span b { color: #ffffff; }
          .miku-cart-paybar-info strong { font-size: 18px; font-weight: 900; letter-spacing: -0.4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .miku-cart-paybar-btn {
            flex-shrink: 0; height: 46px; padding: 0 20px; border: 0; border-radius: 13px; cursor: pointer;
            font-size: 15px; font-weight: 900; color: #ffffff;
            background: linear-gradient(135deg, #f87171 0%, #e11d48 100%);
            box-shadow: 0 10px 20px -10px rgba(225, 29, 72, 0.9);
          }
          /* 고정 바에 목록 끝(결제 카드)이 가려지지 않게 */
          body:has(.miku-cart-paybar) { padding-bottom: 90px; }
        }
        @keyframes mikuPaybarIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .miku-detail-close {
          margin-left: auto;
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border-radius: 10px;
          border: 1px solid var(--border-subtle); background: #fff; color: #64748b;
          font-family: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer;
          transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
        }
        .miku-detail-status {
          display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 999px;
          font-size: 12px; font-weight: 800; color: #475569; background: #f1f5f9; border: 1px solid #e2e8f0;
        }
        .miku-detail-close:hover { color: #0f172a; border-color: #cbd5e1; background: #f8fafc; }
        .miku-detail-panel .package-action-group { margin-top: 20px; }
        .miku-detail-panel .miku-detail-payment { margin-top: 20px; }

        /* 🌟 국제 배송 현황 패널 */
        .miku-shipment-panel {
          background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
          border: 1px solid var(--border-subtle); border-radius: 24px;
          padding: 28px; margin-bottom: 32px; box-shadow: var(--shadow-soft);
          position: relative; overflow: hidden;
        }
        .miku-shipment-panel::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(90deg, #fb923c 0%, #ea580c 50%, #fb923c 100%);
        }
        .miku-shipment-panel .table-container { margin-bottom: 0; }
        /* 상세 정보 확인 안에 넣을 때는 패널 테두리 · 여백 없이 표만 */
        .miku-shipment-panel.is-embedded { padding: 0; margin: 0; border: 0; background: transparent; box-shadow: none; border-radius: 0; overflow: visible; }
        .miku-shipment-panel.is-embedded::before { display: none; }
        /* 🌟 상품명 칸은 주소/운송장 번호를 제외한 나머지 영역을 모두 차지합니다.
           table-layout: fixed로 각 칸의 폭을 실제 크기로 고정해서, 글자수로 미리 자르지 않고도
           칸 폭보다 텍스트가 클 때만 CSS 말줄임(...)으로 정확히 줄어들도록 합니다. */
        .miku-shipment-panel .premium-table { table-layout: fixed; min-width: 0; }
        /* 🔗 주소(?orderId=…)로 들어와 고른 주문임을 표시합니다. 위쪽 표의 선택 표시와 같은 모양입니다. */
        .miku-shipment-panel .tr-row.selected {
          background: linear-gradient(90deg, #fdf4f4 0%, #fffafa 100%);
          box-shadow: inset 3px 0 0 #c0606a;
        }
        .miku-shipment-panel .td-product { max-width: none; width: auto; }
        /* 🌟 "외 N건"은 항상 보이도록 줄어들지 않게(flex-shrink:0) 고정하고, 상품명 쪽만 ...으로 줄입니다. */
        .miku-shipment-panel .prod-name-suffix { flex-shrink: 0; white-space: nowrap; color: #64748b; font-weight: 700; }
        .miku-shipment-panel .th-recipient,
        .miku-shipment-panel .td-shipment-recipient { width: 100px; text-align: center; padding-right: 4px !important; }
        .miku-shipment-panel .th-tracking,
        .miku-shipment-panel .td-shipment-tracking { width: 236px; text-align: center; padding-left: 6px !important; padding-right: 12px !important; }
        /* 🌟 배송 조회 카드: 배송업체 + 운송장 번호를 한 버튼으로 (누르면 업체 조회 사이트) */
        .ship-track {
          position: relative; overflow: hidden;
          display: inline-flex; align-items: center; gap: 10px;
          width: 100%; max-width: 224px; box-sizing: border-box;
          padding: 8px 10px 8px 8px; border-radius: 14px;
          background: linear-gradient(135deg, #ffffff 0%, #fbfbfd 100%);
          border: 1px solid #e6e9ef;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 18px -14px rgba(15, 23, 42, 0.35);
          text-align: left; font-family: inherit; cursor: default;
          transition: transform 0.25s var(--smooth-easing), box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .ship-track::before {
          content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
          background: linear-gradient(180deg, #fb923c 0%, #ea580c 100%);
        }
        .ship-track.is-link { cursor: pointer; }
        .ship-track.is-link:hover {
          transform: translateY(-2px); border-color: #fdba74;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 14px 26px -16px rgba(234, 88, 12, 0.55);
        }
        .ship-track-icon {
          width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          margin-left: 4px;
          color: #ffffff; font-size: 13px;
          background: linear-gradient(135deg, #fb923c 0%, #c2410c 100%);
          box-shadow: 0 6px 12px -6px rgba(194, 65, 12, 0.7), inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .ship-track-body { display: flex; flex-direction: column; min-width: 0; flex: 1; gap: 1px; }
        .ship-track-carrier {
          font-size: 11px; font-weight: 800; color: #9a3412; letter-spacing: -0.1px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ship-track-no {
          font-size: 13px; font-weight: 800; color: #0f172a; letter-spacing: 0.02em;
          font-variant-numeric: tabular-nums;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ship-track-go {
          width: 24px; height: 24px; border-radius: 8px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: #fff7ed; color: #c2410c; font-size: 10px;
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .ship-track.is-link:hover .ship-track-go { background: #ffedd5; transform: translate(1px, -1px); }
        /* 🌟 업체·운송장이 아직 없는 주문: 회색 톤 */
        .ship-track.is-pending { background: #f8fafc; box-shadow: none; }
        .ship-track.is-pending::before { background: #e2e8f0; }
        .ship-track.is-pending .ship-track-icon { background: #e2e8f0; color: #94a3b8; box-shadow: none; }
        .ship-track.is-pending .ship-track-carrier,
        .ship-track.is-pending .ship-track-no { color: #94a3b8; }
        .ship-track:disabled { opacity: 1; }
        /* 🌟 사이드바가 있는 중간 폭(769~1100px): 상품명이 너무 좁아지지 않도록 조회 카드를 압축 */
        @media (min-width: 769px) and (max-width: 1100px) {
          .miku-shipment-panel .th-tracking,
          .miku-shipment-panel .td-shipment-tracking { width: 140px; padding-right: 8px !important; }
          .ship-track { gap: 6px; padding: 7px 8px 7px 9px; }
          .ship-track-icon, .ship-track-go { display: none; }
          .ship-track-no { font-size: 12px; letter-spacing: 0; }
        }

        /* 🌟 "전체 진행 현황" 하위의 파이프라인/테이블/결제요약을 하나의 패널처럼 감싸는 배경 */
        .miku-progress-panel {
          background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
          border: 1px solid var(--border-subtle); border-radius: 24px;
          padding: 28px; margin-bottom: 32px; box-shadow: var(--shadow-soft);
          position: relative; overflow: hidden;
        }
        .miku-progress-panel::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(90deg, #60a5fa 0%, #2563eb 50%, #60a5fa 100%);
        }
        .miku-progress-panel .miku-unified-pipeline-container { margin-bottom: 28px; }

        .miku-action-required-container {
          background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
          border: 1px solid var(--border-subtle); border-radius: 24px;
          padding: 26px 28px; margin-bottom: 32px; box-shadow: var(--shadow-soft);
          position: relative; overflow: hidden;
        }
        .miku-action-required-container::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(90deg, #fb923c 0%, #ef4444 50%, #fb923c 100%);
        }
        .container-header { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
        .header-icon {
          width: 42px; height: 42px; border-radius: 14px; flex-shrink: 0; color: #fff;
          display: flex; align-items: center; justify-content: center; font-size: 16px;
          background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%);
          box-shadow: 0 8px 18px -6px rgba(234, 88, 12, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.35);
        }
        .header-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px; }

        .action-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; align-items: start; }
        .miku-action-card {
          background: #ffffff; border: 1px solid var(--border-subtle); border-radius: 14px; padding: 14px 16px 12px;
          cursor: pointer; transition: all 0.3s var(--smooth-easing);
          display: flex; flex-direction: column; justify-content: flex-start; gap: 4px;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
        }
        .miku-action-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-elevated); background: #fff; border-color: rgba(148, 163, 184, 0.45); }

        /* 🌟 상단 "확인 필요" 를 눌렀을 때: 확인이 필요한 카드만 잠시 커졌다 돌아오며 색이 바뀝니다.
           ⚠️ 패널(.miku-action-required-container)에는 애니메이션을 걸지 않습니다.
              패널의 등장 애니메이션(anim-slide-up)을 덮어써서, 끝날 때 등장 효과가 다시 재생돼
              "잠깐 사라졌다 돌아오는" 것처럼 보였기 때문입니다. */
        .miku-action-required-container.is-attention .miku-action-card {
          --attn-bg: #f5f3ff; --attn-bd: #c4b5fd; --attn-glow: rgba(124, 58, 237, 0.28);
          animation: mikuCardHighlight 1.5s var(--smooth-easing);
        }
        .miku-action-required-container.is-attention .miku-action-card.alert { --attn-bg: #ffe4e6; --attn-bd: #fda4af; --attn-glow: rgba(225, 29, 72, 0.25); }
        .miku-action-required-container.is-attention .miku-action-card.action { --attn-bg: #ecfdf5; --attn-bd: #6ee7b7; --attn-glow: rgba(5, 150, 105, 0.25); }
        .miku-action-required-container.is-attention .miku-action-card:nth-child(2) { animation-delay: 0.08s; }
        .miku-action-required-container.is-attention .miku-action-card:nth-child(3) { animation-delay: 0.16s; }
        .miku-action-required-container.is-attention .miku-action-card:nth-child(n+4) { animation-delay: 0.24s; }
        .miku-action-required-container.is-attention .card-count { display: inline-block; animation: mikuCountPop 0.6s var(--smooth-easing) 0.15s; }
        @keyframes mikuCardHighlight {
          0%   { transform: scale(1);     background-color: #ffffff;       border-color: var(--border-subtle); box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03); }
          22%  { transform: scale(1.045); background-color: var(--attn-bg); border-color: var(--attn-bd);    box-shadow: 0 14px 28px -14px var(--attn-glow); }
          45%  { transform: scale(1);     background-color: var(--attn-bg); border-color: var(--attn-bd);    box-shadow: 0 8px 18px -12px var(--attn-glow); }
          65%  { transform: scale(1.025); background-color: var(--attn-bg); border-color: var(--attn-bd);    box-shadow: 0 12px 24px -14px var(--attn-glow); }
          100% { transform: scale(1);     background-color: #ffffff;       border-color: var(--border-subtle); box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03); }
        }
        @keyframes mikuCountPop {
          0% { transform: scale(1); }
          40% { transform: scale(1.4); }
          100% { transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .miku-action-required-container.is-attention .miku-action-card,
          .miku-action-required-container.is-attention .card-count { animation: none; }
          .miku-action-required-container.is-attention .miku-action-card { background-color: var(--attn-bg); border-color: var(--attn-bd); }
        }
        .miku-action-card.payment { border-left: 3px solid var(--color-purple); }
        .miku-action-card.alert { border-left: 3px solid var(--color-red); background: linear-gradient(180deg, #fff5f5 0%, #fff1f2 100%); }
        .miku-action-card.alert:hover { border-color: #fecdd3; }
        .miku-action-card.action { border-left: 3px solid var(--color-green); }

        .card-badge { display: inline-block; padding: 2px 7px; background: #e2e8f0; border-radius: 6px; font-size: 10px; font-weight: 700; color: #475569; line-height: 1.3; margin-bottom: 3px; }
        .miku-action-card.alert .card-badge { background: #ffe4e6; color: var(--color-red); }
        .card-title { font-size: 14px; font-weight: 700; line-height: 1.2; margin: 0; color: #1e293b; display: flex; align-items: center; gap: 6px; }
        .card-count { font-size: 16px; font-weight: 900; line-height: 1.2; color: var(--color-purple); }
        .miku-action-card.alert .card-count { color: var(--color-red); }
        .miku-action-card.action .card-count { color: var(--color-green); }
        .card-desc {
          font-size: 12px; color: #64748b; margin: 0; line-height: 1.35; word-break: keep-all;
          max-height: 0; opacity: 0; overflow: hidden;
          transition: max-height 0.3s var(--smooth-easing), opacity 0.25s ease, margin-top 0.3s var(--smooth-easing);
        }
        .miku-action-card:hover .card-desc { max-height: 48px; opacity: 1; margin-top: 4px; }
        .card-action-btn {
          background: none; border: none; padding: 0; color: #1e293b; font-size: 12px; font-weight: 700; line-height: 1.2;
          cursor: pointer; transition: color 0.2s; text-align: right; white-space: nowrap;
        }
        .miku-action-card:hover .card-action-btn { color: var(--color-purple); }
        .miku-action-card.alert:hover .card-action-btn { color: var(--color-red); }

        .miku-unified-pipeline-container { 
          margin-bottom: 12px; 
          display: flex; 
          flex-direction: column; 
          gap: 16px; 
          scroll-margin-top: 80px; 
        }


        .pipeline-slider-shell {
          position: relative;
          min-width: 0;
        }
        /* 🌟 좌/우로 더 스크롤할 수 있을 때 가장자리의 카드가 자연스럽게 사라지도록
           덧칠(회색 그라데이션 박스) 대신 스크롤 영역 자체에 마스크를 씌웁니다.
           카드가 배경색과 상관없이 투명하게 페이드되고, 마스크 위치를 애니메이션해 부드럽게 켜지고 꺼집니다. */
        .pipeline-modules-wrapper {
          --edge-fade: 56px;
          -webkit-mask-image:
            linear-gradient(90deg, transparent 0, #000 var(--edge-fade), #000 100%),
            linear-gradient(270deg, transparent 0, #000 var(--edge-fade), #000 100%);
          mask-image:
            linear-gradient(90deg, transparent 0, #000 var(--edge-fade), #000 100%),
            linear-gradient(270deg, transparent 0, #000 var(--edge-fade), #000 100%);
          -webkit-mask-size: calc(100% + var(--edge-fade)) 100%;
          mask-size: calc(100% + var(--edge-fade)) 100%;
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          /* 기본(양쪽 끝): 투명한 구간을 화면 밖으로 밀어 두어 마스크가 보이지 않습니다 */
          -webkit-mask-position: calc(-1 * var(--edge-fade)) 0, calc(100% + var(--edge-fade)) 0;
          mask-position: calc(-1 * var(--edge-fade)) 0, calc(100% + var(--edge-fade)) 0;
          -webkit-mask-composite: source-in;
          mask-composite: intersect;
          transition: -webkit-mask-position 0.3s ease, mask-position 0.3s ease;
        }
        .pipeline-modules-wrapper.edge-left {
          -webkit-mask-position: 0 0, calc(100% + var(--edge-fade)) 0;
          mask-position: 0 0, calc(100% + var(--edge-fade)) 0;
        }
        .pipeline-modules-wrapper.edge-right {
          -webkit-mask-position: calc(-1 * var(--edge-fade)) 0, 100% 0;
          mask-position: calc(-1 * var(--edge-fade)) 0, 100% 0;
        }
        .pipeline-modules-wrapper.edge-left.edge-right {
          -webkit-mask-position: 0 0, 100% 0;
          mask-position: 0 0, 100% 0;
        }

        /* 🌟 좌/우로 더 스크롤할 수 있을 때만 나타나는 방향 화살표. 카드와 겹치지 않도록
           패널 바깥쪽 여백(패딩) 안에, 슬라이더 영역 밖으로 배치합니다. */
        .pipeline-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 22px; height: 22px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          box-shadow: var(--shadow-module);
          display: flex; align-items: center; justify-content: center;
          color: #64748b;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
          z-index: 5;
        }
        .pipeline-arrow.visible { opacity: 1; pointer-events: auto; cursor: pointer; }
        .pipeline-arrow { padding: 0; font: inherit; -webkit-tap-highlight-color: transparent; }
        /* 아이콘은 작아도 누르기 쉽게 보이지 않는 터치 영역을 넓힙니다 */
        .pipeline-arrow::before { content: ''; position: absolute; inset: -10px; border-radius: 50%; }
        .pipeline-arrow.visible:hover { color: #1e293b; border-color: #94a3b8; transform: translateY(-50%) scale(1.12); }
        .pipeline-arrow.visible:active { transform: translateY(-50%) scale(0.94); }
        .pipeline-arrow:focus-visible { outline: 2px solid #94a3b8; outline-offset: 2px; }
        .pipeline-arrow { transition: opacity 0.2s ease, transform 0.15s ease, color 0.15s ease, border-color 0.15s ease; }
        .pipeline-arrow svg { width: 12px; height: 12px; }
        .pipeline-arrow-left { left: -14px; }
        .pipeline-arrow-right { right: -14px; }

        .pipeline-modules-wrapper {
          position: relative;
          display: flex; gap: 16px;
          overflow-x: auto;
          padding: 24px 0 10px 0;
          margin: -24px 0 -10px 0;
          scrollbar-width: none; -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
          /* ⚠️ scroll-behavior: smooth / scroll-snap 을 쓰지 않습니다.
             드래그 중 scrollLeft 를 바꿀 때마다 부드러운 스크롤이 걸려 한 박자 늦게 따라오고,
             놓으면 카드 위치로 튕겨 붙었습니다. 카드에 맞춰 붙는 이동은 좌우 화살표에서만 합니다. */
          user-select: none;
          cursor: grab;
        }
        .pipeline-modules-wrapper::-webkit-scrollbar { display: none; }
        .pipeline-modules-wrapper.is-dragging { cursor: grabbing; }
        .pipeline-modules-wrapper .miku-sub-status-chip {
          pointer-events: auto;
        }

        .miku-phase-module {
          flex: 1; min-width: 320px;
          background: linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%); border: 1px solid var(--border-subtle);
          border-radius: 22px; padding: 20px;
          position: relative;
          transition: all 0.4s var(--smooth-easing);
          display: flex; flex-direction: column; gap: 16px;
          box-shadow: var(--shadow-module);
        }

        .pipeline-modules-wrapper.is-dragging .miku-phase-module { pointer-events: none; }
        .miku-phase-module:hover { box-shadow: var(--shadow-module); border-color: #cbd5e1; transform: translateY(-2px); }
        .miku-phase-module.phase-active { border-color: #94a3b8; border-width: 1.5px; box-shadow: var(--shadow-module); }
        /* 🌟 하위 항목이 1개뿐인 모듈(예: 진행중인 목록만 보기)은 넓게 늘어나지 않도록 폭을 줄입니다. */
        .miku-phase-module.phase-compact { flex: 0 0 auto; min-width: 220px; }

        /* 🌟 단계 이름이 길어져도(구매 진행중 · 현지 입고) 합계 뱃지와 부딪혀 줄바꿈되지 않게 합니다 */
        .phase-header { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .phase-title { white-space: nowrap; }
        .phase-total-badge { white-space: nowrap; flex-shrink: 0; }
        .phase-title-group { display: flex; align-items: center; gap: 8px; }

        .phase-icon {
          width: 34px; height: 34px; border-radius: 12px; flex-shrink: 0; color: #fff;
          display: flex; align-items: center; justify-content: center; font-size: 13px;
        }
        /* ✋ 카드 안에 손님이 처리할 일이 있으면 아이콘 모서리에 빨간 숫자 */
        .phase-icon { position: relative; }
        .phase-todo-dot {
          position: absolute; top: -6px; right: -7px;
          min-width: 18px; height: 18px; padding: 0 5px; border-radius: 99px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 10.5px; font-weight: 900; font-style: normal; color: #ffffff;
          background: linear-gradient(135deg, #fb7185 0%, #e11d48 100%);
          border: 2px solid #ffffff; box-shadow: 0 4px 10px -4px rgba(225, 29, 72, 0.8);
          font-family: inherit; line-height: 1;
        }
        .phase-title { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.3px; }
        .phase-total-badge { font-size: 12px; color: #64748b; font-weight: 600; padding: 4px 10px; background: #f1f5f9; border-radius: 20px; }
        .phase-total-badge .total-count { font-weight: 800; color: #1e293b; margin-left: 2px; }
        
        .phase-body {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .phase-body.phase-body-single { grid-template-columns: 1fr; }
        /* 🌟 전체 진행 현황 카드의 하단 하위 칩 영역은 숨깁니다. (카드 전체를 눌러 이동) */
        .pipeline-modules-wrapper .phase-body { display: none; }
        .miku-phase-module.is-clickable { cursor: pointer; }
        .miku-phase-module.is-clickable:focus-visible { outline: 2px solid #94a3b8; outline-offset: 2px; }
        /* 🌟 PC: 카드 4개(장바구니 · 신청 내역 보기 · 구매 진행중 · 배송 준비)가 스크롤 없이 한 줄에 다 보이도록 나눠 가집니다 */
        @media (min-width: 769px) {
          .pipeline-modules-wrapper { gap: 12px; }
          .pipeline-modules-wrapper .miku-phase-module,
          .pipeline-modules-wrapper .miku-phase-module.phase-compact {
            flex: 1 1 auto; min-width: 0; padding: 14px 14px; border-radius: 18px;
          }
          .pipeline-modules-wrapper .phase-header { gap: 6px; }
          .pipeline-modules-wrapper .phase-title-group { gap: 8px; min-width: 0; }
          .pipeline-modules-wrapper .phase-icon { width: 30px; height: 30px; border-radius: 10px; font-size: 12px; }
          .pipeline-modules-wrapper .phase-title { font-size: 14.5px; overflow: hidden; text-overflow: ellipsis; }
          .pipeline-modules-wrapper .phase-total-badge { font-size: 11.5px; padding: 3px 8px; }
          .pipeline-modules-wrapper .phase-connector { right: -14px; }
        }

        .miku-sub-status-chip {
          background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 13px;
          padding: 8px 10px; font-size: 13px; font-weight: 600; color: #64748b;
          cursor: pointer; transition: all 0.25s var(--smooth-easing);
          display: flex; align-items: center; justify-content: space-between; gap: 4px;
          box-sizing: border-box;
          width: 100%;
          position: relative;
        }
        .miku-sub-status-chip .status-name {
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.3px;
        }
        .miku-sub-status-chip .status-count { 
          font-weight: 700; color: #94a3b8; font-size: 12px; 
          padding: 2px 6px; 
          border-radius: 4px; 
          transition: all 0.2s;
        }
        
        .miku-sub-status-chip:hover { background: #e2e8f0; color: #1e293b; border-color: #cbd5e1; }
        
        .theme-slate.phase-active { border-color: #475569; box-shadow: 0 0 0 3px rgba(71, 85, 105, 0.12), var(--shadow-module); }
        .theme-slate .miku-sub-status-chip.has-count .status-count { color: #334155; }
        .theme-slate .miku-sub-status-chip.active { background: linear-gradient(135deg, #475569 0%, #1e293b 100%); color: #fff; border-color: transparent; box-shadow: 0 4px 12px rgba(30, 41, 59, 0.35); }
        .theme-slate .phase-icon { background: linear-gradient(135deg, #475569 0%, #1e293b 100%); box-shadow: 0 6px 14px -5px rgba(30, 41, 59, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3); }

        .theme-blue.phase-active { border-color: var(--color-blue); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12), var(--shadow-module); }
        .theme-blue .miku-sub-status-chip.has-count .status-count { color: var(--color-blue); }
        .theme-blue .miku-sub-status-chip.active { background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%); color: #fff; border-color: transparent; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35); }
        .theme-blue .phase-icon { background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%); box-shadow: 0 6px 14px -5px rgba(37, 99, 235, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3); }

        .theme-purple.phase-active { border-color: var(--color-purple); box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12), var(--shadow-module); }
        .theme-purple .miku-sub-status-chip.has-count .status-count { color: var(--color-purple); }
        .theme-purple .miku-sub-status-chip.active { background: linear-gradient(135deg, #c084fc 0%, #7c3aed 100%); color: #fff; border-color: transparent; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.35); }
        .theme-purple .phase-icon { background: linear-gradient(135deg, #c084fc 0%, #7c3aed 100%); box-shadow: 0 6px 14px -5px rgba(124, 58, 237, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3); }

        .theme-green.phase-active { border-color: var(--color-green); box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12), var(--shadow-module); }
        .theme-green .miku-sub-status-chip.has-count .status-count { color: var(--color-green); }
        .theme-green .miku-sub-status-chip.active { background: linear-gradient(135deg, #34d399 0%, #059669 100%); color: #fff; border-color: transparent; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35); }
        .theme-green .phase-icon { background: linear-gradient(135deg, #34d399 0%, #059669 100%); box-shadow: 0 6px 14px -5px rgba(5, 150, 105, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3); }

        .theme-orange .phase-icon { background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%); box-shadow: 0 6px 14px -5px rgba(234, 88, 12, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3); }

        .theme-orange.phase-active { border-color: var(--color-orange); box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.12), var(--shadow-module); }
        .theme-orange .miku-sub-status-chip.has-count .status-count { color: var(--color-orange); }
        .theme-orange .miku-sub-status-chip.active { background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%); color: #fff; border-color: transparent; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.35); }

        .theme-rose .phase-icon { background: linear-gradient(135deg, #fb7185 0%, #be123c 100%); box-shadow: 0 6px 14px -5px rgba(190, 18, 60, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3); }

        .theme-rose.phase-active { border-color: var(--color-rose); box-shadow: 0 0 0 3px rgba(225, 29, 72, 0.12), var(--shadow-module); }
        .theme-rose .miku-sub-status-chip.has-count .status-count { color: var(--color-rose); }
        .theme-rose .miku-sub-status-chip.active { background: linear-gradient(135deg, #fb7185 0%, #be123c 100%); color: #fff; border-color: transparent; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.35); }

        .miku-sub-status-chip.active .status-count { color: #fff !important; background: rgba(255,255,255,0.25); }

        .miku-tooltip {
          position: absolute;
          bottom: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%) translateY(5px);
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(4px);
          color: #fff;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s var(--smooth-easing);
          z-index: 100;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .miku-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-width: 5px;
          border-style: solid;
          border-color: rgba(15, 23, 42, 0.9) transparent transparent transparent;
        }
        .miku-sub-status-chip:hover .miku-tooltip {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(0);
        }
        .pipeline-modules-wrapper.is-dragging .miku-tooltip { display: none !important; }

        .phase-connector {
          position: absolute; right: -10px; top: 50%; transform: translateY(-50%);
          width: 16px; height: 16px; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; color: #cbd5e1;
          z-index: 2; transition: all 0.3s;
        }
        .miku-phase-module:last-child .phase-connector { display: none; }
        .miku-phase-module:hover .phase-connector { border-color: #94a3b8; color: #94a3b8; }
        .phase-active .phase-connector { background: #1e293b; border-color: #1e293b; color: #fff; }

        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .anim-slide-up { opacity: 0; animation: slideUpFade 0.6s var(--smooth-easing) forwards; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }

        /* 🌟 하단 포장 액션 버튼 그룹 (수정된 버튼 스타일) */
        .package-action-group { display: flex; gap: 12px; width: 100%; margin-top: 32px; margin-bottom: 8px; }
        .btn-package { 
          flex: 1; padding: 18px 12px; font-size: 16px; font-weight: 800; 
          border-radius: 16px; text-align: center; 
          transition: all 0.3s var(--smooth-easing); 
        }
        
        /* 1. 비활성화 상태 (버튼 윤곽선 명확히 표시) */
        .btn-package.disabled { 
          background: #ffffff; 
          color: #94a3b8; 
          border: 1px solid #e2e8f0; 
          cursor: not-allowed; 
        }

        /* 2. 개별 포장 버튼 (활성화 상태) - 명확한 인지를 위해 다크 톤으로 변경 */
        .btn-individual.active {
          background: linear-gradient(135deg, #334155 0%, #0f172a 100%);
          color: #ffffff;
          border: 1px solid #0f172a;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(30, 41, 59, 0.25);
        }
        .btn-individual.active:hover {
          filter: brightness(1.08);
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.32);
        }

        /* 3. 합포장 요청 버튼 (활성화 상태) */
        .btn-combine.active { 
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); 
          color: #ffffff; 
          border: 1px solid transparent;
          cursor: pointer; 
          box-shadow: 0 4px 14px rgba(234, 88, 12, 0.3); 
        }
        .btn-combine.active:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 8px 20px rgba(234, 88, 12, 0.4); 
        }
        
        .bundle-helper { margin: 0 0 32px 0; font-size: 13px; color: var(--color-red); font-weight: 600; text-align: right; }

        .address-change-warning { margin: 0 0 32px 0; }

        @media (max-width: 768px) {
          /* 🌟 마이페이지·배송지 화면과 같은 폭이 되도록 좌우 12px 여백을 뺐습니다 */
          .miku-status-wrapper { padding: 0 0 40px; box-sizing: border-box; width: 100%; overflow-x: hidden; }
          .miku-status-section-header { margin-bottom: 10px; }
          .miku-status-section-header h2 { font-size: 16px; }
          .progress-only-toggle .toggle-label { font-size: 12px; }

          .miku-progress-panel { padding: 16px; border-radius: 16px; margin-bottom: 16px; }
          .miku-progress-panel .miku-unified-pipeline-container { margin-bottom: 20px; }
          .miku-shipment-panel { padding: 16px; border-radius: 16px; margin-bottom: 16px; }
          /* 🌟 국제 배송 현황 테이블(모바일): 합포장 뱃지는 자기 줄을 차지하고,
             상품명 + "외 N건"은 한 줄로 깔끔하게 말줄임(...) 처리합니다. 주소/운송장 번호 칸도 더 좁힙니다. */
          .miku-shipment-panel .premium-table { table-layout: fixed; }
          .miku-shipment-panel .td-product { width: auto; }
          .miku-shipment-panel .prod-name-box {
            display: flex !important; flex-wrap: wrap !important; align-items: center !important;
            row-gap: 4px; column-gap: 4px; overflow: hidden !important;
          }
          .miku-shipment-panel .bundle-group-badge { flex: 0 0 100%; margin-right: 0; }
          .miku-shipment-panel .prod-name-text {
            white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;
            flex: 1 1 auto; min-width: 0;
          }
          .miku-shipment-panel .th-recipient,
          .miku-shipment-panel .td-shipment-recipient { width: 74px !important; padding-right: 2px !important; font-size: 11px !important; }
          .miku-shipment-panel .th-tracking,
          .miku-shipment-panel .td-shipment-tracking { width: 108px !important; padding-left: 2px !important; padding-right: 4px !important; }
          .ship-track { gap: 6px; padding: 6px 6px 6px 7px; border-radius: 11px; }
          .ship-track-icon { display: none; }
          .ship-track-go { display: none; }
          .ship-track-carrier { font-size: 10px; }
          /* 모바일: 운송장 번호는 잘리지 않도록 줄바꿈해서 전부 보여줍니다 */
          .ship-track-no { font-size: 11px; letter-spacing: 0; line-height: 1.3; white-space: normal; word-break: break-all; overflow: visible; }
          .ship-track-carrier { white-space: normal; word-break: keep-all; line-height: 1.3; }
          .miku-shipment-panel .recipient-address { font-size: 10px; }

          .miku-action-required-container { padding: 10px; border-radius: 12px; margin-bottom: 16px; width: 100%; box-sizing: border-box; overflow: hidden; }
          .container-header { margin-bottom: 10px; }
          .container-header .header-title { font-size: 14px; word-break: keep-all; line-height: 1.2; }

          .action-cards-grid { 
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important; 
            gap: 8px !important; /* 상자 사이의 간격 */
            width: 100% !important; 
          }
          
          .miku-action-card { 
            padding: 8px 14px !important; /* 위아래 8px, 좌우 14px로 대폭 축소 */
            flex-direction: row !important; 
            align-items: center !important; 
            min-height: 42px !important; /* 너무 납작해지지 않도록 최소 높이 고정 */
          }

          .miku-action-card .card-info { 
            display: flex !important; 
            flex-direction: row !important; 
            align-items: center !important; /* 수직 중앙 정렬 */
            justify-content: space-between !important; 
            width: 100% !important; 
            gap: 0 !important; 
          }
          
          .miku-action-card .card-badge { 
            padding: 0 !important; 
            margin: 0 !important; 
            background: transparent !important; 
            font-size: 12px !important; 
            font-weight: 800 !important; /* 👈 600에서 800으로 변경하여 아주 굵게! */
            color: #1e293b !important; /* 👈 색상도 더 진하게 변경하여 선명도 업! */
            line-height: 1 !important; 
            display: flex !important;
            align-items: center !important;
          }
          .miku-action-card.alert .card-badge { color: var(--color-red) !important; background: transparent !important; }

          .miku-action-card .card-title { 
            font-size: 0 !important; 
            margin: 0 !important; 
            display: flex !important;
            align-items: center !important;
          }

          .miku-action-card .card-count { 
            font-size: 12px !important; 
            font-weight: 700 !important; 
            color: var(--color-purple) !important; 
            line-height: 1 !important; 
          }
          .miku-action-card.alert .card-count { color: var(--color-red) !important; }
          .miku-action-card.action .card-count { color: var(--color-green) !important; }

          .miku-action-card .card-desc,
          .miku-action-card .card-action-btn { 
            display: none !important;
          }
          .pipeline-modules-wrapper { margin: -16px 0 0 0; padding: 16px 0 10px 0; }
          .pipeline-arrow { width: 14px; height: 14px; }
          .pipeline-arrow svg { width: 8px; height: 8px; }
          .pipeline-arrow-left { left: -8px; }
          .pipeline-arrow-right { right: -8px; }
          .miku-phase-module { min-width: 260px; padding: 14px; gap: 10px; }
          .miku-phase-module.phase-compact { min-width: 180px; }
          .phase-title { font-size: 14px; }
          .phase-total-badge { font-size: 11px; padding: 3px 8px; }
          .miku-sub-status-chip { padding: 6px 10px; font-size: 12px; }
          
          .package-action-group { margin-top: 24px; margin-bottom: 8px; gap: 8px; flex-direction: row; }
          .btn-package { padding: 14px 8px; font-size: 14px; }
          .bundle-helper { text-align: center; font-size: 12px; margin-bottom: 32px; }
          
          .premium-table { min-width: 100% !important; table-layout: fixed; }
          .premium-table .th-check { width: 36px !important; } 
          .premium-table .th-cell { padding: 8px 4px !important; font-size: 10px !important; white-space: normal !important; word-break: keep-all !important; line-height: 1.2 !important; }
          .premium-table .td-cell { padding: 8px 4px !important; font-size: 11px !important; word-break: keep-all; }
          .premium-table .th-cell:first-child, .premium-table .td-cell:first-child { padding-left: 12px !important; padding-right: 2px !important; } 
          .premium-table .th-cell:last-child, .premium-table .td-cell:last-child { padding-right: 12px !important; }
          .premium-table .td-product { width: 28%; }
          .premium-table .prod-name-box { white-space: normal !important; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2;-webkit-box-orient: vertical; overflow: hidden; font-size: 11px !important; line-height: 1.3 !important; padding: 0 !important; }
          .premium-table .price-val, .premium-table .mybid-val { font-size: 11px !important; }
          .premium-table .badge-bid { display: block !important; padding: 4px !important; font-size: 10px !important; white-space: normal !important; word-break: keep-all !important; line-height: 1.2 !important; }
          .premium-table .btn-action { padding: 4px !important; font-size: 10px !important; white-space: normal !important; word-break: keep-all !important; line-height: 1.2 !important; width: 100%; box-sizing: border-box; }
          .premium-table .btn-expand { padding: 4px !important; font-size: 10px !important; }
          .custom-checkbox { width: 16px !important; height: 16px !important; margin: 0 auto; }
          .custom-checkbox svg { width: 10px !important; height: 10px !important; }
        }
      `}</style>
    </div>
  );
}

export default function MyPurchaseStatusPage() {
  return (
    <GuideLayout title="구매대행 상황" type="mypage">
      <Suspense fallback={<div style={{ padding: '100px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>페이지를 불러오는 중입니다...</div>}>
        <MyPurchaseStatusContent />
      </Suspense>
    </GuideLayout>
  );
}