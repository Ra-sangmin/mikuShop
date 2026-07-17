'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react';
import GuideLayout from '../../components/GuideLayout';
import { useSearchParams, useRouter } from 'next/navigation';
import OrderTable from './components/OrderTable';
import AddressForm from './components/AddressForm';
import PaymentSummary from './components/PaymentSummary';

import { ORDER_STATUS, ORDER_STATUS_LABEL, OrderStatus } from '@/src/types/order';
import { useMikuAlert } from '@/app/context/MikuAlertContext';

const STATUS_PRIORITY: Record<string, number> = {
  [ORDER_STATUS.CART]: 1,
  [ORDER_STATUS.BID_PENDING]: 2,
  [ORDER_STATUS.BIDDING]: 3,
  [ORDER_STATUS.BID_SUCCESS]: 4,
  [ORDER_STATUS.PAID]: 5,
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
  const [activeTab, setActiveTab] = useState<string>(ORDER_STATUS.ALL);
  const [userData, setUserData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const exchangeRate = 9.05;

  const [phaseOrder, setPhaseOrder] = useState(['request', 'progress', 'warehouse', 'shipping']);

  // 로그인 상태 확인
  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      if (!hasAlerted.current) {
        hasAlerted.current = true;
        showAlert('로그인이 필요한 페이지입니다.', 'warning');
        router.push('/auth/login');
      }
      return;
    }
    setIsAuthChecking(false);
  }, [router, showAlert]);

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
            const formattedOrders = rawOrders.map((order: any) => ({
              ...order,
              address: order.addressId 
                ? userAddresses.find((a: any) => String(a.id) === String(order.addressId)) 
                : null
            }));
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
        '입고완료': ORDER_STATUS.ARRIVED,
        '배송비 요청': ORDER_STATUS.PAYMENT_REQ,
      };
      setActiveTab(tabMap[tab] || tab);
      setSelectedItems([]);
    }
  }, [searchParams]);

  // 하위 상태 아이템 생성 시 상세 설명(desc) 데이터 추가
  const shippingPhases = useMemo(() => {
    const getCount = (statusKeys: string[]) => 
      orders.filter(item => statusKeys.includes(item.status)).length;

    const createSubItems = (statusKeys: string[]) => 
      statusKeys.map(key => ({
        key,
        name: ORDER_STATUS_LABEL[key as OrderStatus] || key,
        count: orders.filter(item => item.status === key).length,
        desc: STATUS_DESCRIPTIONS[key] || '' 
      }));

    const phases = [
      { 
        id: 'request', title: '요청', theme: 'theme-blue', icon: '📝',
        statuses: [ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING],
        totalCount: getCount([ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING]),
        subItems: createSubItems([ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING])
      },
      { 
        id: 'progress', title: '진행 중', theme: 'theme-purple', icon: '⏳',
        statuses: [ORDER_STATUS.BIDDING, ORDER_STATUS.BID_SUCCESS, ORDER_STATUS.PAID, ORDER_STATUS.FAILED],
        totalCount: getCount([ORDER_STATUS.BIDDING, ORDER_STATUS.BID_SUCCESS, ORDER_STATUS.PAID, ORDER_STATUS.FAILED]),
        subItems: createSubItems([ORDER_STATUS.BIDDING, ORDER_STATUS.BID_SUCCESS, ORDER_STATUS.PAID, ORDER_STATUS.FAILED])
      },
      { 
        id: 'warehouse', title: '창고', theme: 'theme-green', icon: '🏢',
        statuses: [ORDER_STATUS.ARRIVED, ORDER_STATUS.PREPARING],
        totalCount: getCount([ORDER_STATUS.ARRIVED, ORDER_STATUS.PREPARING]),
        subItems: createSubItems([ORDER_STATUS.ARRIVED, ORDER_STATUS.PREPARING])
      },
      { 
        id: 'shipping', title: '배송', theme: 'theme-orange', icon: '✈️',
        statuses: [ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING],
        totalCount: getCount([ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING]),
        subItems: createSubItems([ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING])
      }
    ];

    return phaseOrder.map(id => {
      const phase = phases.find(p => p.id === id);
      return { ...phase! };
    });
  }, [orders, phaseOrder]);


  const items = useMemo(() => {
    // 1. 탭 필터링 (전체가 아니면 상태값으로 필터링)
    const filtered = activeTab === ORDER_STATUS.ALL 
      ? [...orders] 
      : orders.filter(item => item.status === activeTab);

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
  }, [orders, activeTab]);

  const totals = useMemo(() => {
    const selectedOrders = items.filter(item => selectedItems.map(String).includes(String(item.orderId)));

    return selectedOrders.reduce((acc, item) => {
      const productP = Number(item.productPrice * item.productCount) || 0;
      const domesticS = Number(item.domesticShippingFee) || 0; 
      const transferF = Number(item.transferFee) || 0;
      const agencyF = Number(item.purchaseFee) || 0;
      const secondP = Number(item.secondPaymentAmount) || 0;
      
      const myBid = Number(item.myBidPrice) || 0;
      const fallbackDeposit = myBid > 0 ? (myBid <= 20000 ? 2000 : Math.floor(myBid * 0.1)) : 0;
      const depositAmt = Number(item.depositAmount) || fallbackDeposit; 

      if (activeTab === ORDER_STATUS.PAYMENT_REQ) {
        acc.product += secondP;
      } else if (activeTab === ORDER_STATUS.BID_PENDING) {
        acc.deposit += depositAmt;
      } else {
        acc.product += productP;
        if (activeTab === ORDER_STATUS.CART) {
          acc.transfer += (transferF || 450); 
          acc.delivery += domesticS; 
          acc.agency += (agencyF || 100); 
        } else {
          acc.transfer += transferF;
          acc.delivery += domesticS;
          acc.agency += agencyF;
        }
      }
      return acc;
    }, { product: 0, transfer: 0, delivery: 0, agency: 0, deposit: 0 }); 
  }, [items, selectedItems, activeTab]);

  const totalPriceVal = activeTab === ORDER_STATUS.BID_PENDING 
    ? totals.deposit 
    : totals.product + totals.transfer + totals.delivery + totals.agency;

  const totalPriceWon = activeTab === ORDER_STATUS.PAYMENT_REQ 
    ? totalPriceVal 
    : Math.floor(totalPriceVal * exchangeRate);

  const handleDeleteOrder = async (orderId: string) => {
    const isConfirmed = await showConfirm("정말 이 상품을 장바구니에서 삭제하시겠습니까? 🗑️");
    if (isConfirmed) {
      try {
        const res = await fetch(`/api/orders?id=${orderId}`, { method: 'DELETE' });
        if (res.ok) {
          showAlert('상품이 삭제되었습니다.', 'success');
          fetchOrders(); 
        } else showAlert('삭제 처리에 실패했습니다.', 'error');
      } catch (error) { showAlert('서버 통신 중 오류가 발생했습니다.', 'error'); }
    }
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

  const handleUpdateStatus = async (newStatus: string) => {
    if (selectedItems.length === 0) return showAlert('상품을 선택해주세요.', 'warning');
    if (newStatus === ORDER_STATUS.PREPARING && !selectedAddress) return showAlert('하단 수취인 주소 리스트에서 배송지를 먼저 선택해주세요.', 'warning');

    const addressDisplayName = selectedAddress?.recipientName || '선택된 배송지';
    const confirmMsgs: any = {
      [ORDER_STATUS.PAID]: '선택한 상품을 결제 하시겠습니까?',
      [ORDER_STATUS.PREPARING]: `선택하신 ${selectedItems.length}건의 상품들을\n${addressDisplayName}(으)로 배송 합니다\n이대로 합포장 요청 하시겠습니까?`,
      [ORDER_STATUS.PAYMENT_DONE]: '선택한 상품의 배송비 결제를 진행하시겠습니까?',
      [ORDER_STATUS.BIDDING]: '선택한 상품의 보증금을 결제하고 입찰을 시작하시겠습니까?' 
    };

    const isConfirmed = await showConfirm(confirmMsgs[newStatus] || '상태를 변경하시겠습니까?');

    if (isConfirmed) {
      // 🌟 [수정됨] as string[] 추가하여 타입 에러(ts(2345)) 해결
      if (([ORDER_STATUS.PAID, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.BIDDING] as string[]).includes(newStatus)) {
        try {
          const storedId = localStorage.getItem('user_id');
          const userRes = await fetch(`/api/users?id=${storedId}`);
          const uData = await userRes.json();
          if (uData.success) {
            const currentMoney = uData.user.cyberMoney || 0;
            if (currentMoney < totalPriceWon) {
              const chargeConfirmed = await showConfirm(`미쿠짱 금액이 부족합니다.\n부족한 금액: ₩${(totalPriceWon - currentMoney).toLocaleString()}\n충전하시겠습니까?`);
              if (chargeConfirmed) window.location.href = '/mypage/money/charge';
              return;
            }
          }
        } catch (error) { return showAlert('잔액 확인 중 오류가 발생했습니다.', 'error'); }
      }

      const addressUpdateData = newStatus === ORDER_STATUS.PREPARING && selectedAddress ? { address_id: selectedAddress.id } : {};
      let updates = newStatus === ORDER_STATUS.PREPARING 
        ? selectedItems.map(id => ({ id, status: newStatus, bundleId: 'B' + Date.now(), ...addressUpdateData })) 
        : selectedItems.map(id => ({ id, status: newStatus, ...(newStatus === ORDER_STATUS.BIDDING ? { bidStatus: 'PENDING' } : {}) }));
      
      try {
        const storedId = localStorage.getItem('user_id');
        // 🌟 [수정됨] as string[] 추가하여 타입 에러(ts(2345)) 해결
        const isPayment = ([ORDER_STATUS.PAID, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.BIDDING] as string[]).includes(newStatus);
        
        const res = await fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates, userId: isPayment ? storedId : null, deductAmount: isPayment ? totalPriceWon : 0, paymentTitle: newStatus === ORDER_STATUS.BIDDING ? '경매 보증금 결제' : undefined })
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
    totals, totalPriceWon, fetchOrders, handleDeleteOrder, handleIndividualPacking, handleUpdateStatus
  };
}


// =================================================================
// 2. 화면 컴포넌트 영역 (View Layer)
// =================================================================

const SubStatusChip = ({ item, isActive, onClick }: { item: any, isActive: boolean, onClick: () => void }) => (
  <button 
    className={`miku-sub-status-chip ${isActive ? 'active' : ''} ${item.count > 0 ? 'has-count' : ''}`}
    onClick={onClick}
  >
    <span className="status-name">{item.name}</span>
    <span className="status-count">{item.count}</span>
    {item.desc && <div className="miku-tooltip">{item.desc}</div>}
  </button>
);

const PhaseModule = ({ phase, activeTab, onTabClick }: { phase: any, activeTab: string, onTabClick: (key: string) => void }) => {
  // 🌟 [수정됨] as string[] 추가하여 타입 에러 해결
  const isPhaseActive = (phase.statuses as string[]).includes(activeTab);

  return (
    <div 
      data-phase={phase.id}
      className={`miku-phase-module ${phase.theme} ${isPhaseActive ? 'phase-active' : ''}`}
    >
      <div className="phase-header">
        <div className="phase-title-group">
          <span className="phase-icon">{phase.icon}</span>
          <h3 className="phase-title">{phase.title}</h3>
        </div>
        <div className="phase-total-badge">
          합계 <span className="total-count">{phase.totalCount}</span>
        </div>
      </div>
      
      <div className="phase-body">
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
    totals, totalPriceWon, fetchOrders, handleDeleteOrder, handleIndividualPacking, handleUpdateStatus
  } = usePurchaseStatusLogic();

  const sliderRef = useRef<HTMLDivElement>(null);

  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const startDragging = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.miku-sub-status-chip')) return;
    setIsMouseDown(true);
    if (!sliderRef.current) return;
    setStartX(e.pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
  };

  const stopDragging = () => {
    setIsMouseDown(false);
  };

  const onDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDown || !sliderRef.current) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; 
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setSelectedItems([]);

    setTimeout(() => {
      if (!sliderRef.current) return;

      if (key === ORDER_STATUS.ALL) {
        sliderRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        return;
      }

      // 🌟 [수정됨] as string[] 추가하여 타입 에러 해결
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

  const actionRequiredItems = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    
    const requiredStatuses = [
      { key: ORDER_STATUS.CART, type: 'payment', title: '상품 결제 대기', desc: '장바구니 상품의 결제를 진행해주세요.' },
      { key: ORDER_STATUS.PAYMENT_REQ, type: 'payment', title: '배송비 결제 대기', desc: '국제 배송비를 결제해주세요.' },
      { key: ORDER_STATUS.BID_PENDING, type: 'payment', title: '경매 보증금 대기', desc: '경매 입찰을 위해 보증금을 결제해주세요.' },
      { key: ORDER_STATUS.FAILED, type: 'alert', title: '경매/구매 실패 내역', desc: '실패 사유를 확인하고 처리해주세요.' },
      { key: ORDER_STATUS.ARRIVED, type: 'action', title: '배송 요청 대기', desc: '입고된 상품의 배송(합포장)을 요청해주세요.' },
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

  return (
    <div className="miku-status-wrapper">
      
      {actionRequiredItems.length > 0 && (
        <div className="miku-action-required-container anim-slide-up">
          <div className="container-header">
            <span className="header-icon">🚨</span>
            <h2 className="header-title">고객님의 확인 및 처리가 필요한 항목이 있습니다</h2>
          </div>
          <div className="action-cards-grid">
            {actionRequiredItems.map((item: any) => (
              <div key={item.key} className={`miku-action-card ${item.type}`} onClick={() => handleTabChange(item.key)}>
                <div className="card-info">
                  <span className="card-badge">{ORDER_STATUS_LABEL[item.key as OrderStatus]}</span>
                  <h4 className="card-title">{item.title} <span className="card-count">{item.count}</span></h4>
                  <p className="card-desc">{item.desc}</p>
                </div>
                <button className="card-action-btn">즉시 처리하기 ➔</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="miku-unified-pipeline-container anim-slide-up delay-1">
        
        <button 
          className={`miku-all-history-btn ${activeTab === ORDER_STATUS.ALL ? 'active' : ''}`}
          onClick={() => handleTabChange(ORDER_STATUS.ALL)}
        >
          <span className="btn-icon">📋</span> 전체 진행 내역 <span className="btn-count">{orders.length}</span>
        </button>

        <div 
          className={`pipeline-modules-wrapper ${isMouseDown ? 'is-dragging' : ''}`}
          ref={sliderRef}
          onMouseDown={startDragging}
          onMouseLeave={stopDragging}
          onMouseUp={stopDragging}
          onMouseMove={onDrag}
        >
          {shippingPhases.map((phase) => (
            <PhaseModule 
              key={phase.id} 
              phase={phase} 
              activeTab={activeTab} 
              onTabClick={handleTabChange} 
            />
          ))}
        </div>
      </div>

      <div className="anim-slide-up delay-2">
        <OrderTable 
          items={items} orders={orders} activeTab={activeTab} 
          selectedItems={selectedItems} setSelectedItems={setSelectedItems} 
          fetchOrders={fetchOrders} selectedAddress={selectedAddress} 
          onIndividualPacking={handleIndividualPacking} onDelete={handleDeleteOrder} 
        />
       </div>
      
      {activeTab === ORDER_STATUS.ARRIVED && (
        <div className="anim-slide-up delay-3">
          <div className="bundle-request-area">
            <button 
              className={`bundle-btn ${selectedItems.length >= 2 ? 'active' : ''}`}
              onClick={() => handleUpdateStatus(ORDER_STATUS.PREPARING)} 
              disabled={selectedItems.length < 2}
            >
              📦 합포장 요청 ({selectedItems.length}개 선택됨)
            </button>
            {selectedItems.length < 2 && <p className="bundle-helper">합포장은 2개 이상의 상품을 선택해야 가능합니다.</p>}
          </div>
          <AddressForm userData={userData} selectedItems={selectedItems} fetchOrders={fetchOrders} selectedAddress={selectedAddress} setSelectedAddress={setSelectedAddress} />
        </div>
      )}

      {/* 🌟 [수정됨] as string[] 추가하여 타입 에러 해결 */}
      {(([ORDER_STATUS.CART, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.BID_PENDING, ORDER_STATUS.BID_SUCCESS] as string[]).includes(activeTab)) && (
        <div className="anim-slide-up delay-3">
          <PaymentSummary 
            activeTab={activeTab} totals={totals} totalPriceWon={totalPriceWon} 
            exchangeRate={exchangeRate} selectedItems={selectedItems} 
            handleUpdateStatus={handleUpdateStatus} 
          />
        </div>
      )}

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
          --color-red: #ef4444;
        }

        .miku-status-wrapper {
          font-family: 'Pretendard', "Noto Sans KR", sans-serif;
          color: #1e293b;
          box-sizing: border-box;
          padding-bottom: 60px;
        }

        .miku-action-required-container {
          background: #fff; border: 1px solid rgba(226, 232, 240, 0.7); border-radius: 20px;
          padding: 24px; margin-bottom: 32px; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.03);
          border-left: 5px solid var(--color-red);
        }
        .container-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .header-icon { font-size: 24px; }
        .header-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px; }

        .action-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
        .miku-action-card {
          background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px;
          cursor: pointer; transition: all 0.3s var(--smooth-easing);
          display: flex; flex-direction: column; justify-content: space-between; gap: 16px;
        }
        .miku-action-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.05); background: #fff; border-color: #cbd5e1; }
        .miku-action-card.payment { border-left: 4px solid var(--color-purple); }
        .miku-action-card.alert { border-left: 4px solid var(--color-red); background: #fff1f2; }
        .miku-action-card.alert:hover { border-color: #fecdd3; }
        .miku-action-card.action { border-left: 4px solid var(--color-green); }

        .card-badge { display: inline-block; padding: 3px 8px; background: #e2e8f0; border-radius: 6px; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 8px; }
        .miku-action-card.alert .card-badge { background: #ffe4e6; color: var(--color-red); }
        .card-title { font-size: 16px; font-weight: 700; margin: 0 0 6px 0; color: #1e293b; display: flex; align-items: center; gap: 8px; }
        .card-count { font-size: 20px; font-weight: 900; color: var(--color-purple); }
        .miku-action-card.alert .card-count { color: var(--color-red); }
        .miku-action-card.action .card-count { color: var(--color-green); }
        .card-desc { font-size: 13px; color: #64748b; margin: 0; line-height: 1.4; word-break: keep-all; }
        .card-action-btn { background: none; border: none; padding: 0; color: #1e293b; font-size: 13px; font-weight: 700; cursor: pointer; transition: color 0.2s; text-align: left; }
        .miku-action-card:hover .card-action-btn { color: var(--color-purple); }
        .miku-action-card.alert:hover .card-action-btn { color: var(--color-red); }

        .miku-unified-pipeline-container { margin-bottom: 32px; display: flex; flex-direction: column; gap: 16px; }

        .miku-all-history-btn {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
          padding: 16px 24px; font-size: 15px; font-weight: 700; color: #475569;
          cursor: pointer; transition: all 0.3s var(--smooth-easing);
          display: flex; align-items: center; gap: 10px; width: fit-content;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .miku-all-history-btn:hover { border-color: #cbd5e1; background: #f8fafc; color: #0f172a; }
        .miku-all-history-btn.active { background: #0f172a; border-color: #0f172a; color: #fff; }
        .miku-all-history-btn.active .btn-count { color: #fff; }

        .pipeline-modules-wrapper {
          position: relative;
          display: flex; gap: 16px;
          overflow-x: auto; 
          padding: 24px 24px 10px 5px; 
          margin: -24px -24px -10px -5px;
          scrollbar-width: none; -webkit-overflow-scrolling: touch;
          user-select: none; 
          cursor: grab;
        }
        .pipeline-modules-wrapper::-webkit-scrollbar { display: none; }
        .pipeline-modules-wrapper.is-dragging { cursor: grabbing; }

        .miku-phase-module {
          flex: 1; min-width: 320px; 
          background: #fff; border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 20px; padding: 20px;
          position: relative;
          transition: all 0.4s var(--smooth-easing);
          display: flex; flex-direction: column; gap: 16px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.02);
        }
        
        .pipeline-modules-wrapper.is-dragging .miku-phase-module { pointer-events: none; }
        .miku-phase-module:hover { box-shadow: 0 10px 25px rgba(0,0,0,0.05); border-color: #cbd5e1; }
        .miku-phase-module.phase-active { border-color: #94a3b8; border-width: 1.5px; box-shadow: 0 10px 30px -5px rgba(0,0,0,0.08); }

        .phase-header { display: flex; justify-content: space-between; align-items: center; }
        .phase-title-group { display: flex; align-items: center; gap: 8px; }

        .phase-icon { font-size: 20px; }
        .phase-title { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.3px; }
        .phase-total-badge { font-size: 12px; color: #64748b; font-weight: 600; padding: 4px 10px; background: #f1f5f9; border-radius: 20px; }
        .phase-total-badge .total-count { font-weight: 800; color: #1e293b; margin-left: 2px; }
        
        .phase-body { 
          display: grid; 
          grid-template-columns: repeat(2, 1fr); 
          gap: 8px; 
        }

        .miku-sub-status-chip {
          background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 12px;
          padding: 8px 10px; font-size: 13px; font-weight: 600; color: #64748b;
          cursor: pointer; transition: all 0.2s var(--smooth-easing);
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
        
        .theme-blue.phase-active { border-color: var(--color-blue); }
        .theme-blue .miku-sub-status-chip.has-count .status-count { color: var(--color-blue); }
        .theme-blue .miku-sub-status-chip.active { background: var(--color-blue); color: #fff; border-color: var(--color-blue); box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3); }

        .theme-purple.phase-active { border-color: var(--color-purple); }
        .theme-purple .miku-sub-status-chip.has-count .status-count { color: var(--color-purple); }
        .theme-purple .miku-sub-status-chip.active { background: var(--color-purple); color: #fff; border-color: var(--color-purple); box-shadow: 0 4px 10px rgba(139, 92, 246, 0.3); }

        .theme-green.phase-active { border-color: var(--color-green); }
        .theme-green .miku-sub-status-chip.has-count .status-count { color: var(--color-green); }
        .theme-green .miku-sub-status-chip.active { background: var(--color-green); color: #fff; border-color: var(--color-green); box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); }

        .theme-orange.phase-active { border-color: var(--color-orange); }
        .theme-orange .miku-sub-status-chip.has-count .status-count { color: var(--color-orange); }
        .theme-orange .miku-sub-status-chip.active { background: var(--color-orange); color: #fff; border-color: var(--color-orange); box-shadow: 0 4px 10px rgba(249, 115, 22, 0.3); }
        
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

        .bundle-request-area { display: flex; flex-direction: column; align-items: flex-end; margin-top: 32px; margin-bottom: 48px; padding: 0 10px; }
        .bundle-btn { padding: 16px 32px; font-size: 16px; font-weight: 800; border-radius: 16px; border: none; background: #e2e8f0; color: #94a3b8; cursor: not-allowed; transition: all 0.3s var(--smooth-easing); }
        .bundle-btn.active { background: linear-gradient(135deg, #ff4b2b 0%, #e63e1f 100%); color: #ffffff; cursor: pointer; box-shadow: 0 8px 20px -4px rgba(255, 75, 43, 0.3); }
        .bundle-btn.active:hover { transform: translateY(-2px); box-shadow: 0 12px 24px -6px rgba(255, 75, 43, 0.4); }
        .bundle-helper { margin: 10px 0 0 0; font-size: 13px; color: var(--color-red); font-weight: 600; }

        @media (max-width: 768px) {
          .miku-status-wrapper { padding: 0 15px 40px; }
          .miku-action-required-container { padding: 16px; border-radius: 16px; }
          .container-header .header-title { font-size: 15px; }
          .action-cards-grid { grid-template-columns: 1fr; gap: 12px; }
          .miku-action-card { padding: 16px; gap: 12px; }
          .card-title { font-size: 15px; }
          .card-count { font-size: 18px; }
          .miku-all-history-btn { width: 100%; justify-content: center; padding: 14px; font-size: 14px; }
          
          .pipeline-modules-wrapper { margin: 0 -15px; padding: 24px 20px 10px 15px; }
          .miku-phase-module { min-width: 260px; padding: 16px; gap: 12px; }
          .phase-title { font-size: 15px; }
          .phase-total-badge { font-size: 11px; padding: 3px 8px; }
          .miku-sub-status-chip { padding: 6px 10px; font-size: 12px; }
          .bundle-request-area { align-items: stretch; margin-bottom: 32px; margin-top: 20px; }
          .bundle-btn { width: 100%; text-align: center; padding: 16px; font-size: 15px; }
          .bundle-helper { text-align: center; font-size: 12px; }
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