'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react';
import GuideLayout from '../../components/GuideLayout';
import { useSearchParams, useRouter } from 'next/navigation'; // 🌟 useRouter 추가
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

function MyPurchaseStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter(); // 🌟 라우터 초기화
  const { showAlert, showConfirm } = useMikuAlert();
  const hasAlerted = useRef(false); // 🌟 알림 중복 방지

  // 🌟 로그인 확인 상태 추가
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [activeTab, setActiveTab] = useState<string>(ORDER_STATUS.CART);
  const [userData, setUserData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const exchangeRate = 9.05;

  // 🌟 1. 컴포넌트 마운트 시 로그인 체크 수행
  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    
    if (!userId) {
      if (!hasAlerted.current) {
        hasAlerted.current = true;
        showAlert('로그인이 필요한 페이지입니다.', 'warning');
        router.push('/login');
      }
      return;
    }

    // 로그인이 확인되면 인증 체크 종료 -> UI 렌더링 시작
    setIsAuthChecking(false);
  }, [router, showAlert]);


  const handleDeleteOrder = async (orderId: string) => {
    const isConfirmed = await showConfirm("정말 이 상품을 장바구니에서 삭제하시겠습니까? 🗑️");
    
    if (isConfirmed) {
      try {
        const res = await fetch(`/api/orders?id=${orderId}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          showAlert('상품이 삭제되었습니다.', 'success');
          fetchOrders(); 
        } else {
          showAlert('삭제 처리에 실패했습니다.', 'error');
        }
      } catch (error) {
        console.error('삭제 오류:', error);
        showAlert('서버 통신 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const handleIndividualPacking = async (item: any) => {
    if (!selectedAddress) {
      return showAlert('하단 수취인 주소 리스트에서 배송지를 먼저 선택해주세요.', 'warning');
    }

    const addressDisplayName = selectedAddress.recipientName || selectedAddress.name || '선택된 배송지';
    const message = `선택하신 상품 \n[${item.productName}]을\n ${addressDisplayName}(으)로 배송 합니다\n이대로 개별 포장 요청 하시겠습니까?`;

    const isConfirmed = await showConfirm(message);

    if (isConfirmed) {
      const nextStatus = ORDER_STATUS.PREPARING;
      const updates = [{
        id: item.orderId,
        status: ORDER_STATUS.PREPARING,
        address_id: selectedAddress.id 
      }];

      try {
        const res = await fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        });

        if (res.ok) {
          showAlert('개별 포장 처리가 완료되었습니다.', 'success');
          fetchOrders();
          setActiveTab(nextStatus);
        } else {
          showAlert('처리에 실패했습니다.', 'error');
        }
      } catch (error) {
        console.error('개별 포장 오류:', error);
        showAlert('서버 통신 중 오류가 발생했습니다.', 'error');
      }
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

  // 🌟 2. 로그인 체크(isAuthChecking)가 완료된 후에만 데이터를 가져오도록 의존성 변경
  useEffect(() => { 
    if (!isAuthChecking) {
      fetchOrders(); 
    }
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
      const targetTab = tabMap[tab] || tab; 
      setActiveTab(targetTab);
      setSelectedItems([]);
    }
  }, [searchParams]);

  const tabs = useMemo(() => {
    return initialTabs.map(tab => {
      const count = orders.filter(item => 
        tab.key === ORDER_STATUS.ALL ? true : item.status === tab.key
      ).length;
      return { ...tab, count };
    });
  }, [orders]);

  const items = useMemo(() => {
    if (activeTab === ORDER_STATUS.ALL) return orders;
    return orders.filter(item => item.status === activeTab);
  }, [orders, activeTab]);

  const totals = useMemo(() => {
    const selectedOrders = items.filter(item => {
      const isMatched = selectedItems.map(String).includes(String(item.orderId));
      return isMatched;
    });

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

  const handleUpdateStatus = async (newStatus: string) => {
    if (selectedItems.length === 0) return showAlert('상품을 선택해주세요.', 'warning');

    if (newStatus === ORDER_STATUS.PREPARING && !selectedAddress) {
      return showAlert('하단 수취인 주소 리스트에서 배송지를 먼저 선택해주세요.', 'warning');
    }

    const addressDisplayName = selectedAddress?.recipientName || '선택된 배송지';
    const confirmMsgs: any = {
      [ORDER_STATUS.PAID]: '선택한 상품을 결제 하시겠습니까?',
      [ORDER_STATUS.PREPARING]: `선택하신 ${selectedItems.length}건의 상품들을\n${addressDisplayName}(으)로 배송 합니다\n이대로 합포장 요청 하시겠습니까?`,
      [ORDER_STATUS.PAYMENT_DONE]: '선택한 상품의 배송비 결제를 진행하시겠습니까?',
      [ORDER_STATUS.BIDDING]: '선택한 상품의 보증금을 결제하고 입찰을 시작하시겠습니까?' 
    };

    const isConfirmed = await showConfirm(confirmMsgs[newStatus] || '상태를 변경하시겠습니까?');

    if (isConfirmed) {
      if (newStatus === ORDER_STATUS.PAID || newStatus === ORDER_STATUS.PAYMENT_DONE || newStatus === ORDER_STATUS.BIDDING) {
        try {
          const storedId = localStorage.getItem('user_id');
          const userRes = await fetch(`/api/users?id=${storedId}`);
          const uData = await userRes.json();
          if (uData.success) {
            const currentMoney = uData.user.cyberMoney || 0;
            if (currentMoney < totalPriceWon) {
              const missing = totalPriceWon - currentMoney;
              const chargeConfirmed = await showConfirm(`미쿠짱 금액이 부족합니다.\n부족한 금액: ₩${missing.toLocaleString()}\n충전하시겠습니까?`);
              if (chargeConfirmed) {
                window.location.href = '/mypage/money/charge';
              }
              return;
            }
          }
        } catch (error) { return showAlert('잔액 확인 중 오류가 발생했습니다.', 'error'); }
      }

      const addressUpdateData = newStatus === ORDER_STATUS.PREPARING && selectedAddress 
        ? { address_id: selectedAddress.id } 
        : {};

      let updates = newStatus === ORDER_STATUS.PREPARING 
        ? selectedItems.map(id => ({ id, status: newStatus, bundleId: 'B' + Date.now(), ...addressUpdateData })) 
        : selectedItems.map(id => ({ 
            id, 
            status: newStatus,
            ...(newStatus === ORDER_STATUS.BIDDING ? { bidStatus: 'PENDING' } : {}) 
          }));
      
      try {
        const storedId = localStorage.getItem('user_id');
        const isPayment = newStatus === ORDER_STATUS.PAID || newStatus === ORDER_STATUS.PAYMENT_DONE || newStatus === ORDER_STATUS.BIDDING;
        
        const res = await fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            updates, 
            userId: isPayment ? storedId : null, 
            deductAmount: isPayment ? totalPriceWon : 0,
            paymentTitle: newStatus === ORDER_STATUS.BIDDING ? '경매 보증금 결제' : undefined 
          })
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

  const formatTabName = (key: string) => {
    if (key === ORDER_STATUS.ALL) return '전체내역';
    const label = ORDER_STATUS_LABEL[key as OrderStatus] || key;
    
    if (key === ORDER_STATUS.PAID) {
      return (
        <>
          <span className="pc-text">{label}</span>
          <span className="mobile-text">상품<br/>결제완료</span>
        </>
      );
    }
    if (key === ORDER_STATUS.PAYMENT_DONE) {
      return (
        <>
          <span className="pc-text">{label}</span>
          <span className="mobile-text">배송비<br/>결제 완료</span>
        </>
      );
    }
    return label;
  };

  const renderTabItem = (tab: any) => {
    const isActive = activeTab === tab.key;
    
    let groupColor = '#64748b'; 
    if ([ORDER_STATUS.BID_PENDING, ORDER_STATUS.BIDDING , ORDER_STATUS.BID_SUCCESS].includes(tab.key)) groupColor = '#8b5cf6';
    else if ([ORDER_STATUS.CART, ORDER_STATUS.PAID,ORDER_STATUS.FAILED].includes(tab.key)) groupColor = '#3b82f6';
    else if ([ORDER_STATUS.ARRIVED,ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING].includes(tab.key)) groupColor = '#f97316';

    return (
      <div 
        key={tab.key} 
        className={`tab-item-box ${isActive ? 'active-tab' : ''}`}
        onClick={() => { setActiveTab(tab.key); setSelectedItems([]); }}
        style={{ 
          backgroundColor: isActive ? groupColor : '#fff', 
          color: isActive ? '#fff' : '#475569', 
          borderBottom: isActive ? 'none' : `3px solid ${groupColor}` 
        }}
      >
        <span className="tab-text">{formatTabName(tab.key)}</span>
        <span className="tab-badge" style={{ 
          backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#f1f5f9', 
          color: isActive ? '#fff' : groupColor 
        }}>
          {tab.count}
        </span>
      </div>
    );
  };

  // 🌟 3. 로그인 여부 확인 중일 때는 빈 화면을 렌더링해 깜빡임 방지
  if (isAuthChecking) {
    return <div style={{ height: '100vh', backgroundColor: '#fdfdfd' }} />;
  }

  if (isLoading) return <div style={{ padding: '100px', textAlign: 'center' }}>로딩 중...</div>;

  return (
    <div style={{ fontFamily: '"Noto Sans KR", sans-serif', color: '#333' }}>
      
      <style jsx global>{`
        .tab-group { display: flex; flex-wrap: nowrap; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; width: 100%; }
        .tab-item-box { flex: 1 1 0px; min-width: 0; padding: 14px 4px; text-align: center; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 6px; border-right: 1px solid #eee; transition: all 0.2s ease; box-sizing: border-box; }
        .tab-item-box:last-child { border-right: none; }
        .tab-text { font-size: 13px; font-weight: 600; word-break: keep-all; line-height: 1.3; }
        .tab-item-box.active-tab .tab-text { font-weight: 800; }
        .tab-badge { padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 800; white-space: nowrap; }
        .mobile-text { display: none; }
        .pc-text { display: inline; }
        @media (max-width: 768px) {
          .tab-item-box { flex-direction: column; padding: 8px 2px; gap: 4px; }
          .tab-text { font-size: 11px; }
          .tab-badge { font-size: 10px; padding: 2px 4px; }
          .mobile-text { display: inline; }
          .pc-text { display: none; }
        }
      `}</style>

      {/* 상태 탭 3단 분리 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' }}>
        <div className="tab-group">{tabs.slice(0, 1).map(renderTabItem)}</div>
        <div className="tab-group">{tabs.slice(1, 4).map(renderTabItem)}</div>
        <div className="tab-group">{tabs.slice(4, 7).map(renderTabItem)}</div>
        <div className="tab-group">{tabs.slice(7).map(renderTabItem)}</div>
      </div>

      <OrderTable 
        items={items} 
        orders={orders} 
        activeTab={activeTab} 
        selectedItems={selectedItems} 
        setSelectedItems={setSelectedItems} 
        fetchOrders={fetchOrders} 
        selectedAddress={selectedAddress} 
        onIndividualPacking={handleIndividualPacking}
        onDelete={handleDeleteOrder} 
      />
      
      {/* 입고완료: 합포장 버튼 & 주소 폼 */}
      {activeTab === ORDER_STATUS.ARRIVED && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px', marginBottom: '40px' }}>
            <button onClick={() => handleUpdateStatus(ORDER_STATUS.PREPARING)} disabled={selectedItems.length < 2} style={{ backgroundColor: selectedItems.length >= 2 ? '#ff4b2b' : '#cbd5e1', color: '#fff', border: 'none', padding: '16px 32px', fontSize: '16px', fontWeight: '900', borderRadius: '12px', cursor: selectedItems.length >= 2 ? 'pointer' : 'not-allowed' }}>
              📦 합포장 요청 ({selectedItems.length}개 선택됨)
            </button>
          </div>
          <AddressForm userData={userData} selectedItems={selectedItems} fetchOrders={fetchOrders} selectedAddress={selectedAddress} setSelectedAddress={setSelectedAddress} />
        </>
      )}

      {/* 장바구니/배송비요청/경매요청: 결제 요약 폼 */}
      {(activeTab === ORDER_STATUS.CART || activeTab === ORDER_STATUS.PAYMENT_REQ || activeTab === ORDER_STATUS.BID_PENDING || activeTab === ORDER_STATUS.BID_SUCCESS) && (
        <PaymentSummary 
          activeTab={activeTab} 
          totals={totals} 
          totalPriceWon={totalPriceWon} 
          exchangeRate={exchangeRate} 
          selectedItems={selectedItems} 
          handleUpdateStatus={handleUpdateStatus} 
        />
      )}
    </div>
  );
}

export default function MyPurchaseStatusPage() {
  return (
    <GuideLayout title="구매대행 상황" type="mypage">
      <Suspense fallback={<div style={{ padding: '100px', textAlign: 'center' }}>로딩 중...</div>}>
        <MyPurchaseStatusContent />
      </Suspense>
    </GuideLayout>
  );
}