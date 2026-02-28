"use client";
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import GuideLayout from '../../components/GuideLayout';
import { useSearchParams } from 'next/navigation';
import OrderTable from './components/OrderTable';
import AddressForm from './components/AddressForm';
import PaymentSummary from './components/PaymentSummary';

const initialTabs = [
  { name: '전체내역', count: 0 },
  { name: '장바구니', count: 0 },
  { name: '구매실패', count: 0 },
  { name: '상품 결제 완료', count: 0 },
  { name: '입고완료', count: 0 },
  { name: '배송 준비중', count: 0 },
  { name: '배송비 요청', count: 0 },
  { name: '배송비 결제 완료', count: 0 },
  { name: '국제배송', count: 0 },
];

function MyPurchaseStatusContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('장바구니');
  const [userData, setUserData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const exchangeRate = 9.05;

  const fetchOrders = () => {
    const storedId = localStorage.getItem('user_id');
    if (storedId) {
      fetch(`/api/users?id=${storedId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUserData(data.user);
            setOrders(data.user.orders || []);
          }
        })
        .catch(err => console.error("데이터 로드 실패:", err))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
      setSelectedItems([]);
    }
  }, [searchParams]);

  const tabs = useMemo(() => {
    return initialTabs.map(tab => {
      const count = orders.filter(item => tab.name === '전체내역' ? true : item.status === tab.name).length;
      return { ...tab, count };
    });
  }, [orders]);

  const items = useMemo(() => {
    if (activeTab === '전체내역') return orders;
    return orders.filter(item => item.status === activeTab);
  }, [orders, activeTab]);

  const totals = useMemo(() => {
    const selectedOrders = items.filter(item => selectedItems.includes(item.orderId));
    return selectedOrders.reduce((acc, item) => {
      if (activeTab === '배송비 요청') {
        acc.product += item.secondPaymentAmount || 0;
      } else {
        acc.product += item.productPrice || 0;
        if (activeTab === '장바구니') {
          acc.transfer += (item.transferFee || 0) + 450;
          acc.delivery += (item.domesticShippingFee || 0) + 200;
          acc.agency += (item.purchaseFee || 0) + 100;
        } else {
          acc.transfer += item.transferFee || 0;
          acc.delivery += item.domesticShippingFee || 0;
          acc.agency += item.purchaseFee || 0;
        }
      }
      return acc;
    }, { product: 0, transfer: 0, delivery: 0, agency: 0 });
  }, [items, selectedItems, activeTab]);

  const totalPriceVal = totals.product + totals.transfer + totals.delivery + totals.agency;
  const totalPriceWon = activeTab === '배송비 요청' ? totalPriceVal : Math.floor(totalPriceVal * exchangeRate);

  const handleUpdateStatus = async (newStatus: string) => {
    if (selectedItems.length === 0) return alert('상품을 선택해주세요.');

    const confirmMsgs: any = {
      '상품 결제 완료': '선택한 상품을 결제 하시겠습니까?',
      '배송 준비중': '선택한 상품들을 합포장 요청 하시겠습니까?',
      '배송비 결제 완료': '선택한 상품의 배송비 결제를 진행하시겠습니까?'
    };

    if (confirm(confirmMsgs[newStatus] || '상태를 변경하시겠습니까?')) {
      if (newStatus === '상품 결제 완료' || newStatus === '배송비 결제 완료') {
        try {
          const storedId = localStorage.getItem('user_id');
          const userRes = await fetch(`/api/users?id=${storedId}`);
          const uData = await userRes.json();
          if (uData.success) {
            const currentMoney = uData.user.cyberMoney || 0;
            if (currentMoney < totalPriceWon) {
              const missing = totalPriceWon - currentMoney;
              if (confirm(`미쿠짱 금액이 부족합니다.\n\n부족한 금액: ₩${missing.toLocaleString()}\n충전하시겠습니까?`)) {
                window.location.href = '/mypage/money/charge';
              }
              return;
            }
          }
        } catch (error) { return alert('잔액 확인 중 오류가 발생했습니다.'); }
      }

      let updates = newStatus === '배송 준비중' 
        ? selectedItems.map(id => ({ id, status: newStatus, bundleId: 'B' + Date.now() })) 
        : selectedItems.map(id => ({ id, status: newStatus }));
      
      try {
        const storedId = localStorage.getItem('user_id');
        const isPayment = newStatus === '상품 결제 완료' || newStatus === '배송비 결제 완료';
        const res = await fetch('/api/admin/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates, userId: isPayment ? storedId : null, deductAmount: isPayment ? totalPriceWon : 0 })
        });

        if (res.ok) {
          alert('처리가 완료되었습니다.');
          setSelectedItems([]);
          fetchOrders();
          setActiveTab(newStatus);
        } else alert('처리에 실패했습니다.');
      } catch (error) { console.error(error); }
    }
  };

  // 🌟 모바일/PC 반응형 텍스트 분리 렌더링
  const formatTabName = (name: string) => {
    if (name === '상품 결제 완료') {
      return (
        <>
          <span className="pc-text">상품 결제 완료</span>
          <span className="mobile-text">상품<br/>결제완료</span>
        </>
      );
    }
    if (name === '배송비 결제 완료') {
      return (
        <>
          <span className="pc-text">배송비 결제 완료</span>
          <span className="mobile-text">배송비<br/>결제 완료</span>
        </>
      );
    }
    return name;
  };

  const renderTabItem = (tab: any) => {
    const isActive = activeTab === tab.name;
    let groupColor = '#64748b'; 
    if (['장바구니', '구매실패', '상품 결제 완료', '입고완료'].includes(tab.name)) groupColor = '#3b82f6';
    else if (['배송 준비중', '배송비 요청', '배송비 결제 완료', '국제배송'].includes(tab.name)) groupColor = '#f97316';

    return (
      <div 
        key={tab.name} 
        className={`tab-item-box ${isActive ? 'active-tab' : ''}`}
        onClick={() => { setActiveTab(tab.name); setSelectedItems([]); }}
        style={{ 
          backgroundColor: isActive ? groupColor : '#fff', 
          color: isActive ? '#fff' : '#475569', 
          borderBottom: isActive ? 'none' : `3px solid ${groupColor}` 
        }}
      >
        <span className="tab-text">{formatTabName(tab.name)}</span>
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
        .tab-group {
          display: flex;
          flex-wrap: nowrap; 
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          width: 100%;
        }

        .tab-item-box {
          flex: 1 1 0px;
          min-width: 0; 
          padding: 14px 4px;
          text-align: center;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
          border-right: 1px solid #eee;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        
        .tab-item-box:last-child {
          border-right: none;
        }

        .tab-text {
          font-size: 13px;
          font-weight: 600;
          word-break: keep-all; 
          line-height: 1.3;
        }

        .tab-item-box.active-tab .tab-text {
          font-weight: 800;
        }

        .tab-badge {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        /* 🌟 기본적으로 모바일 텍스트는 숨기고 PC 텍스트만 표시 */
        .mobile-text { display: none; }
        .pc-text { display: inline; }

        @media (max-width: 768px) {
          .tab-item-box {
            flex-direction: column; 
            padding: 8px 2px;
            gap: 4px;
          }
          .tab-text {
            font-size: 11px; 
          }
          .tab-badge {
            font-size: 10px;
            padding: 2px 4px;
          }
          
          /* 🌟 모바일 화면일 때만 모바일 텍스트를 표시하고 PC 텍스트를 숨김 */
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

      {/* 테이블 영역 (OrderTable 컴포넌트) */}
      <OrderTable items={items} orders={orders} activeTab={activeTab} selectedItems={selectedItems} setSelectedItems={setSelectedItems} fetchOrders={fetchOrders} />

      {/* 입고완료: 합포장 버튼 & 주소 폼 */}
      {activeTab === '입고완료' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px', marginBottom: '40px' }}>
            <button onClick={() => handleUpdateStatus('배송 준비중')} disabled={selectedItems.length < 2} style={{ backgroundColor: selectedItems.length >= 2 ? '#ff4b2b' : '#cbd5e1', color: '#fff', border: 'none', padding: '16px 32px', fontSize: '16px', fontWeight: '900', borderRadius: '12px', cursor: selectedItems.length >= 2 ? 'pointer' : 'not-allowed' }}>
              📦 합포장 요청 ({selectedItems.length}개 선택됨)
            </button>
          </div>
          <AddressForm userData={userData} selectedItems={selectedItems} fetchOrders={fetchOrders} />
        </>
      )}

      {/* 장바구니/배송비요청: 결제 요약 폼 */}
      {(activeTab === '장바구니' || activeTab === '배송비 요청') && (
        <PaymentSummary activeTab={activeTab} totals={totals} totalPriceWon={totalPriceWon} exchangeRate={exchangeRate} selectedItems={selectedItems} handleUpdateStatus={handleUpdateStatus} />
      )}
    </div>
  );
}

export default function MyPurchaseStatusPage() {
  return (
    <GuideLayout title="구매대행 상황" type="mypage" fullWidth>
      <Suspense fallback={<div style={{ padding: '100px', textAlign: 'center' }}>로딩 중...</div>}>
        <MyPurchaseStatusContent />
      </Suspense>
    </GuideLayout>
  );
}