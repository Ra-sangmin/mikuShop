'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react';
import GuideLayout from '../../components/GuideLayout';
import { useSearchParams, useRouter } from 'next/navigation';
import OrderTable from './components/OrderTable';
import AddressForm from './components/AddressForm';
import PaymentSummary from './components/PaymentSummary';

import { ORDER_STATUS, ORDER_STATUS_LABEL, OrderStatus } from '@/src/types/order';
import { useMikuAlert } from '@/app/context/MikuAlertContext';

const initialTabs = [
  { name: '전체내역', count: 0, key: ORDER_STATUS.ALL },
  { name: ORDER_STATUS_LABEL[ORDER_STATUS.BID_PENDING], count: 0, key: ORDER_STATUS.BID_PENDING },
  { name: ORDER_STATUS_LABEL[ORDER_STATUS.BIDDING], count: 0, key: ORDER_STATUS.BIDDING },
  { name: ORDER_STATUS_LABEL[ORDER_STATUS.BID_SUCCESS], count: 0, key: ORDER_STATUS.BID_SUCCESS },
  { name: ORDER_STATUS_LABEL[ORDER_STATUS.CART], count: 0, key: ORDER_STATUS.CART },
  { name: ORDER_STATUS_LABEL[ORDER_STATUS.PAID], count: 0, key: ORDER_STATUS.PAID },
  { name: ORDER_STATUS_LABEL[ORDER_STATUS.FAILED], count: 0, key: ORDER_STATUS.FAILED },
  { name: ORDER_STATUS_LABEL[ORDER_STATUS.ARRIVED], count: 0, key: ORDER_STATUS.ARRIVED },
  { name: ORDER_STATUS_LABEL[ORDER_STATUS.PREPARING], count: 0, key: ORDER_STATUS.PREPARING },
  { name: ORDER_STATUS_LABEL[ORDER_STATUS.PAYMENT_REQ], count: 0, key: ORDER_STATUS.PAYMENT_REQ },
  { name: ORDER_STATUS_LABEL[ORDER_STATUS.PAYMENT_DONE], count: 0, key: ORDER_STATUS.PAYMENT_DONE },
  { name: ORDER_STATUS_LABEL[ORDER_STATUS.SHIPPING], count: 0, key: ORDER_STATUS.SHIPPING },
];

// =================================================================
// 1. 비즈니스 로직 영역 (Business Logic Layer)
// =================================================================
function usePurchaseStatusLogic() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showAlert, showConfirm } = useMikuAlert();
  const hasAlerted = useRef(false);

  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(ORDER_STATUS.CART);
  const [userData, setUserData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const exchangeRate = 9.05;

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

  const tabs = useMemo(() => {
    return initialTabs.map(tab => {
      const count = orders.filter(item => tab.key === ORDER_STATUS.ALL ? true : item.status === tab.key).length;
      return { ...tab, count };
    });
  }, [orders]);

  const items = useMemo(() => {
    if (activeTab === ORDER_STATUS.ALL) return orders;
    return orders.filter(item => item.status === activeTab);
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

  // 데이터 삭제 처리
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

  // 개별 포장 처리
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

  // 상태 업데이트 및 결제 처리
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
      if ([ORDER_STATUS.PAID, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.BIDDING].includes(newStatus)) {
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
        const isPayment = [ORDER_STATUS.PAID, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.BIDDING].includes(newStatus);
        
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
    isAuthChecking, isLoading, tabs, activeTab, setActiveTab, items, orders, userData,
    selectedItems, setSelectedItems, selectedAddress, setSelectedAddress, exchangeRate,
    totals, totalPriceWon, fetchOrders, handleDeleteOrder, handleIndividualPacking, handleUpdateStatus
  };
}


// =================================================================
// 2. 화면 컴포넌트 영역 (View Layer)
// 그룹핑을 통한 컬러 테마 클래스 전달
// =================================================================
const StatusTab = ({ tab, isActive, onClick }: { tab: any, isActive: boolean, onClick: () => void }) => {
  const formatTabName = (key: string) => {
    if (key === ORDER_STATUS.ALL) return '전체내역';
    const label = ORDER_STATUS_LABEL[key as OrderStatus] || key;
    if (key === ORDER_STATUS.PAID) return <><span className="pc-text">{label}</span><span className="mobile-text">상품<br/>결제완료</span></>;
    if (key === ORDER_STATUS.PAYMENT_DONE) return <><span className="pc-text">{label}</span><span className="mobile-text">배송비<br/>결제 완료</span></>;
    return label;
  };

  return (
    <div className={`miku-status-tab ${isActive ? 'active' : ''}`} onClick={onClick}>
      <span className="tab-name">{formatTabName(tab.key)}</span>
      <span className="tab-count">{tab.count}</span>
    </div>
  );
};


function MyPurchaseStatusContent() {
  const { 
    isAuthChecking, isLoading, tabs, activeTab, setActiveTab, items, orders, userData,
    selectedItems, setSelectedItems, selectedAddress, setSelectedAddress, exchangeRate,
    totals, totalPriceWon, fetchOrders, handleDeleteOrder, handleIndividualPacking, handleUpdateStatus
  } = usePurchaseStatusLogic();

  if (isAuthChecking) return <div style={{ height: '100vh', backgroundColor: '#f8fafc' }} />;
  if (isLoading) return <div style={{ padding: '100px', textAlign: 'center', color: '#64748b' }}>데이터를 불러오는 중입니다...</div>;

  // 🌟 탭을 4개의 컬러 그룹으로 나눔 (이미지 디자인 복구)
  const tabGroups = [
    { theme: 'theme-gray', items: tabs.slice(0, 1) },
    { theme: 'theme-purple', items: tabs.slice(1, 4) },
    { theme: 'theme-blue', items: tabs.slice(4, 7) },
    { theme: 'theme-orange', items: tabs.slice(7) }
  ];

  return (
    <div className="miku-status-wrapper">
      
      {/* 🌟 상단 탭 리스트 (색상별 그룹화 디자인 복구) */}
      <div className="miku-status-tabs-container anim-slide-up">
        {tabGroups.map((group, gIdx) => (
          <div key={gIdx} className={`tabs-group ${group.theme}`}>
            {group.items.map(t => (
              <StatusTab 
                key={t.key} tab={t} isActive={activeTab === t.key} 
                onClick={() => { setActiveTab(t.key); setSelectedItems([]); }} 
              />
            ))}
          </div>
        ))}
      </div>

      <div className="anim-slide-up delay-1">
        <OrderTable 
          items={items} orders={orders} activeTab={activeTab} 
          selectedItems={selectedItems} setSelectedItems={setSelectedItems} 
          fetchOrders={fetchOrders} selectedAddress={selectedAddress} 
          onIndividualPacking={handleIndividualPacking} onDelete={handleDeleteOrder} 
        />
      </div>
      
      {/* 입고완료: 합포장 버튼 & 주소 폼 */}
      {activeTab === ORDER_STATUS.ARRIVED && (
        <div className="anim-slide-up delay-2">
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

      {/* 장바구니/배송비요청/경매요청: 결제 요약 폼 */}
      {([ORDER_STATUS.CART, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.BID_PENDING, ORDER_STATUS.BID_SUCCESS].includes(activeTab as OrderStatus)) && (
        <div className="anim-slide-up delay-2">
          <PaymentSummary 
            activeTab={activeTab} totals={totals} totalPriceWon={totalPriceWon} 
            exchangeRate={exchangeRate} selectedItems={selectedItems} 
            handleUpdateStatus={handleUpdateStatus} 
          />
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. 디자인 영역 (CSS Layer) */}
      {/* 하단 컬러 라인과 활성 탭 채우기 등 순수 CSS로 제어합니다. */}
      {/* ================================================================= */}
      <style jsx global>{`
        .miku-status-wrapper {
          font-family: 'Pretendard', "Noto Sans KR", sans-serif;
          color: #0f172a;
          box-sizing: border-box;
        }

        .miku-status-tabs-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 32px;
        }

        /* 🌟 탭 그룹 디자인 (이미지의 하단 컬러 라인 복구) */
        .tabs-group {
          display: flex;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 12px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.02);
          overflow: hidden;
          /* 이미지처럼 하단에 테마 색상 굵은 선 적용 */
          border-bottom-width: 3px;
          border-bottom-style: solid;
        }

        .tabs-group.theme-gray { border-color: #94a3b8; }
        .tabs-group.theme-purple { border-color: #a855f7; }
        .tabs-group.theme-blue { border-color: #3b82f6; }
        .tabs-group.theme-orange { border-color: #ff7e36; }

        /* 🌟 개별 탭 디자인 */
        .miku-status-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: #64748b;
          text-align: center;
        }
        
        .miku-status-tab:hover:not(.active) { background: #f8fafc; color: #0f172a; }
        
        .tab-name { font-size: 14px; font-weight: 700; line-height: 1.3; word-break: keep-all; }
        .tab-count {
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 800;
          background: #f1f5f9;
          color: inherit;
          transition: all 0.3s;
        }

        .pc-text { display: inline; }
        .mobile-text { display: none; }

        /* 🌟 탭 활성화 상태 (해당 테마 색상으로 배경 채우기) */
        .tabs-group.theme-gray .miku-status-tab.active { background: #0f172a; color: #ffffff; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2); }
        .tabs-group.theme-purple .miku-status-tab.active { background: linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%); color: #ffffff; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3); }
        .tabs-group.theme-blue .miku-status-tab.active { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .tabs-group.theme-orange .miku-status-tab.active { background: linear-gradient(135deg, #ff7e36 0%, #e63e1f 100%); color: #ffffff; box-shadow: 0 4px 12px rgba(255, 126, 54, 0.3); }

        .miku-status-tab.active .tab-count { background: rgba(255,255,255,0.2); color: #ffffff; }

        /* 🌟 합포장 요청 버튼 영역 */
        .bundle-request-area {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          margin-top: 32px;
          margin-bottom: 48px;
          padding: 0 10px;
        }
        .bundle-btn {
          padding: 16px 32px;
          font-size: 16px;
          font-weight: 800;
          border-radius: 16px;
          border: none;
          background: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .bundle-btn.active {
          background: linear-gradient(135deg, #ff4b2b 0%, #e63e1f 100%);
          color: #ffffff;
          cursor: pointer;
          box-shadow: 0 8px 20px -4px rgba(255, 75, 43, 0.3);
        }
        .bundle-btn.active:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -6px rgba(255, 75, 43, 0.4);
        }
        .bundle-helper {
          margin: 10px 0 0 0;
          font-size: 13px;
          color: #ef4444;
          font-weight: 600;
        }

        /* 애니메이션 */
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .anim-slide-up { opacity: 0; animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }

        /* =============================================================
           📱 모바일 반응형 최적화
           ============================================================= */
        @media (max-width: 768px) {
          .tabs-group {
            flex-direction: row;
            overflow-x: auto;
            white-space: nowrap;
            padding: 8px;
            gap: 8px;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }
          .tabs-group::-webkit-scrollbar { display: none; }
          
          .miku-status-tab {
            flex: 0 0 auto;
            flex-direction: column;
            padding: 10px 16px;
            min-width: 80px;
          }
          .tab-name { font-size: 12px; }
          .tab-count { font-size: 11px; padding: 2px 6px; }
          
          .pc-text { display: none; }
          .mobile-text { display: inline; text-align: center; }

          .bundle-request-area { align-items: stretch; margin-bottom: 32px; }
          .bundle-btn { width: 100%; text-align: center; padding: 16px; }
          .bundle-helper { text-align: center; }
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