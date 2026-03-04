"use client";
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import GuideLayout from '../../components/GuideLayout';
import { useSearchParams } from 'next/navigation';
import OrderTable from './components/OrderTable';
import AddressForm from './components/AddressForm';
import PaymentSummary from './components/PaymentSummary';
// 🌟 주문 상태 상수 및 라벨 임포트
import { ORDER_STATUS, ORDER_STATUS_LABEL, OrderStatus } from '@/src/types/order';
import { useMikuAlert } from '@/app/context/MikuAlertContext';

// 🌟 탭 구성: 표시용 name(한글)과 필터링용 key(영문)를 명확히 분리
const initialTabs = [
  { name: '전체내역', count: 0, key: ORDER_STATUS.ALL },
  { name: ORDER_STATUS_LABEL[ORDER_STATUS.CART], count: 0, key: ORDER_STATUS.CART },
  { name: ORDER_STATUS_LABEL[ORDER_STATUS.FAILED], count: 0, key: ORDER_STATUS.FAILED },
  { name: ORDER_STATUS_LABEL[ORDER_STATUS.PAID], count: 0, key: ORDER_STATUS.PAID },
  { name: ORDER_STATUS_LABEL[ORDER_STATUS.ARRIVED], count: 0, key: ORDER_STATUS.ARRIVED },
  { name: ORDER_STATUS_LABEL[ORDER_STATUS.PREPARING], count: 0, key: ORDER_STATUS.PREPARING },
  { name: ORDER_STATUS_LABEL[ORDER_STATUS.PAYMENT_REQ], count: 0, key: ORDER_STATUS.PAYMENT_REQ },
  { name: ORDER_STATUS_LABEL[ORDER_STATUS.PAYMENT_DONE], count: 0, key: ORDER_STATUS.PAYMENT_DONE },
  { name: ORDER_STATUS_LABEL[ORDER_STATUS.SHIPPING], count: 0, key: ORDER_STATUS.SHIPPING },
];

function MyPurchaseStatusContent() {
  const searchParams = useSearchParams();
  const { showAlert, showConfirm } = useMikuAlert();
  // 🌟 activeTab은 반드시 영문 키(예: 'CART')로 관리합니다.
  const [activeTab, setActiveTab] = useState<string>(ORDER_STATUS.CART);
  
  const [userData, setUserData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const exchangeRate = 9.05;

  // 🌟 개별 포장 처리 함수
  const handleIndividualPacking = async (item: any) => {
    if (!selectedAddress) {
      return showAlert('하단 수취인 주소 리스트에서 배송지를 먼저 선택해주세요.');
    }

    const addressDisplayName = selectedAddress.recipientName || selectedAddress.name || '선택된 배송지';
    const message = `선택하신 상품 \n[${item.productName}]을\n ${addressDisplayName}(으)로 배송 합니다\n이대로 개별 포장 요청 하시겠습니까?`;

    // 🌟 커스텀 컨펌창 호출 및 대기
    const isConfirmed = await showConfirm(message);

    if (isConfirmed) {
      const nextStatus = ORDER_STATUS.PREPARING;
      const updates = [{
        id: item.orderId,
        status: ORDER_STATUS.PREPARING,
        address_id: selectedAddress.id 
      }];

      try {
        const res = await fetch('/api/admin/orders', {
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

  const fetchOrders = () => {
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
  };

  useEffect(() => { fetchOrders(); }, []);

  // 🌟 URL 쿼리 파라미터가 한글일 경우를 대비한 매핑 로직
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

  // 🌟 탭별 주문 개수 카운트: item.status와 tab.key(영문)를 비교
  const tabs = useMemo(() => {
    return initialTabs.map(tab => {
      const count = orders.filter(item => 
        tab.key === ORDER_STATUS.ALL ? true : item.status === tab.key
      ).length;
      return { ...tab, count };
    });
  }, [orders]);

  // 🌟 실제 리스트 필터링: activeTab(영문)과 item.status를 비교
  const items = useMemo(() => {
    if (activeTab === ORDER_STATUS.ALL) return orders;
    return orders.filter(item => item.status === activeTab);
  }, [orders, activeTab]);

  const totals = useMemo(() => {
  // 1. 필터링 대상 및 ID 타입 체크 로그
  const selectedOrders = items.filter(item => {
    const isMatched = selectedItems.map(String).includes(String(item.orderId));
    return isMatched;
  });

  console.group("🔍 일내 배송료 계산 디버그");
  console.log("활성 탭:", activeTab);
  console.log("선택된 ID 목록:", selectedItems);
  console.log("필터링된 주문 개수:", selectedOrders.length);

  if (selectedOrders.length > 0) {
    // 2. 선택된 각 상품의 배송료 값과 타입을 표로 출력
    console.table(selectedOrders.map(item => ({
      상품명: item.productName,
      ID: item.orderId,
      일내배송료_값: item.domesticShippingFee,
      일내배송료_타입: typeof item.domesticShippingFee
    })));
  }
  console.groupEnd();

  return selectedOrders.reduce((acc, item) => {
    // 3. 안전한 숫자 변환 (123원 등 데이터 파싱)
    const productP = Number(item.productPrice) || 0;
    const domesticS = Number(item.domesticShippingFee) || 0; // 🌟 핵심: 로그의 123이 여기서 처리됨
    const transferF = Number(item.transferFee) || 0;
    const agencyF = Number(item.purchaseFee) || 0;
    const secondP = Number(item.secondPaymentAmount) || 0;

    if (activeTab === ORDER_STATUS.PAYMENT_REQ) {
      acc.product += secondP;
    } else {
      acc.product += productP;
      
      if (activeTab === ORDER_STATUS.CART) {
        acc.transfer += (transferF || 450); //
        acc.delivery += domesticS; // 🌟 누적 합산 확인
        acc.agency += (agencyF || 100); //
      } else {
        acc.transfer += transferF;
        acc.delivery += domesticS;
        acc.agency += agencyF;
      }
    }
    return acc;
  }, { product: 0, transfer: 0, delivery: 0, agency: 0 });
}, [items, selectedItems, activeTab]);

  const totalPriceVal = totals.product + totals.transfer + totals.delivery + totals.agency;
  const totalPriceWon = activeTab === ORDER_STATUS.PAYMENT_REQ ? totalPriceVal : Math.floor(totalPriceVal * exchangeRate);

  // 🌟 상태 업데이트 핸들러 (showConfirm 적용)
  const handleUpdateStatus = async (newStatus: string) => {
    if (selectedItems.length === 0) return showAlert('상품을 선택해주세요.');

    if (newStatus === ORDER_STATUS.PREPARING && !selectedAddress) {
      return showAlert('하단 수취인 주소 리스트에서 배송지를 먼저 선택해주세요.');
    }

    const addressDisplayName = selectedAddress?.recipientName || '선택된 배송지';
    const confirmMsgs: any = {
      [ORDER_STATUS.PAID]: '선택한 상품을 결제 하시겠습니까?',
      [ORDER_STATUS.PREPARING]: `선택하신 ${selectedItems.length}건의 상품들을\n${addressDisplayName}(으)로 배송 합니다\n이대로 합포장 요청 하시겠습니까?`,
      [ORDER_STATUS.PAYMENT_DONE]: '선택한 상품의 배송비 결제를 진행하시겠습니까?'
    };

    const isConfirmed = await showConfirm(confirmMsgs[newStatus] || '상태를 변경하시겠습니까?');

    if (isConfirmed) {
      if (newStatus === ORDER_STATUS.PAID || newStatus === ORDER_STATUS.PAYMENT_DONE) {
        try {
          const storedId = localStorage.getItem('user_id');
          const userRes = await fetch(`/api/users?id=${storedId}`);
          const uData = await userRes.json();
          if (uData.success) {
            const currentMoney = uData.user.cyberMoney || 0;
            if (currentMoney < totalPriceWon) {
              const missing = totalPriceWon - currentMoney;
              // 충전 유도는 중요하므로 confirm 유지 혹은 showAlert 후 이동 처리
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
        : selectedItems.map(id => ({ id, status: newStatus }));
      
      try {
        const storedId = localStorage.getItem('user_id');
        const isPayment = newStatus === ORDER_STATUS.PAID || newStatus === ORDER_STATUS.PAYMENT_DONE;
        const res = await fetch('/api/admin/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates, userId: isPayment ? storedId : null, deductAmount: isPayment ? totalPriceWon : 0 })
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
    if ([ORDER_STATUS.CART, ORDER_STATUS.FAILED, ORDER_STATUS.PAID, ORDER_STATUS.ARRIVED].includes(tab.key)) groupColor = '#3b82f6';
    else if ([ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING].includes(tab.key)) groupColor = '#f97316';

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
        <div className="tab-group">{tabs.slice(1, 5).map(renderTabItem)}</div>
        <div className="tab-group">{tabs.slice(5).map(renderTabItem)}</div>
      </div>

      <OrderTable items={items} orders={orders} activeTab={activeTab} selectedItems={selectedItems} setSelectedItems={setSelectedItems} fetchOrders={fetchOrders} selectedAddress={selectedAddress} onIndividualPacking={handleIndividualPacking}/>

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

      {/* 장바구니/배송비요청: 결제 요약 폼 */}
      {(activeTab === ORDER_STATUS.CART || activeTab === ORDER_STATUS.PAYMENT_REQ) && (
        <PaymentSummary 
          activeTab={activeTab} 
          totals={totals} // 👈 위에서 계산한 totals가 정확히 전달되어야 함
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