"use client";
import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import GuideLayout from '../../components/GuideLayout';
import { useSearchParams } from 'next/navigation';
import DaumPostcode from 'react-daum-postcode'; // 🌟 우편번호 컴포넌트 추가

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
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  
  // 🌟 우편번호 모달 상태 및 상세주소 포커스 Ref 추가
  const [isOpenPostcode, setIsOpenPostcode] = useState(false);
  const detailAddressRef = useRef<HTMLInputElement>(null);

  // 폼 입력 상태 추가
  const [addressForm, setAddressForm] = useState({
    id: null as number | null, // 배송지 고유 ID 추가
    recipientName: '',
    recipientEnglishName: '',
    phone: '',
    zipCode: '',
    address: '',
    detailAddress: '',
    personalCustomsCode: ''
  });

  const [orders, setOrders] = useState<any[]>([]);
  const [cyberMoney, setCyberMoney] = useState(0);
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
            setCyberMoney(data.user.cyberMoney || 0);
            
            // 추가된 배송지 목록 가져오기
            fetch(`/api/addresses?userId=${storedId}`)
              .then(res => res.json())
              .then(addrData => {
                if (addrData.success) {
                  // 🌟 기본 배송지가 상단에 오도록 정렬
                  const sorted = [...addrData.addresses].sort((a, b) => {
                    if (a.isDefault) return -1;
                    if (b.isDefault) return 1;
                    return 0;
                  });
                  setSavedAddresses(sorted);

                  // 🌟 기본 배송지가 있다면 해당 ID를 디폴트로 선택
                  const defaultAddr = sorted.find(a => a.isDefault);
                  if (defaultAddr) {
                    setSelectedAddressId(defaultAddr.id);
                    setAddressForm({
                      id: defaultAddr.id,
                      recipientName: defaultAddr.recipientName,
                      recipientEnglishName: defaultAddr.recipientEnglishName || '',
                      phone: defaultAddr.phone,
                      zipCode: defaultAddr.zipCode,
                      address: defaultAddr.address,
                      detailAddress: defaultAddr.detailAddress,
                      personalCustomsCode: defaultAddr.personalCustomsCode || ''
                    });
                  } else {
                    // 기본 배송지가 없으면 기존 회원가입 정보 선택
                    setSelectedAddressId('basic');
                    setAddressForm({
                      id: null,
                      recipientName: data.user.name || '',
                      recipientEnglishName: '',
                      phone: data.user.phone || '',
                      zipCode: data.user.zipCode || '',
                      address: data.user.address || '',
                      detailAddress: data.user.detailAddress || '',
                      personalCustomsCode: data.user.personalCustomsCode || ''
                    });
                  }
                }
              });
          }
        })
        .catch(err => console.error("데이터 로드 실패:", err))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const tabs = useMemo(() => {
    return initialTabs.map(tab => {
      const count = orders.filter(item => 
        tab.name === '전체내역' ? true : item.status === tab.name
      ).length;
      return { ...tab, count };
    });
  }, [orders]);

  const items = useMemo(() => {
    if (activeTab === '전체내역') return orders;
    return orders.filter(item => item.status === activeTab);
  }, [orders, activeTab]);

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(items.map(item => item.orderId));
    } else {
      setSelectedItems([]);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`운송장 번호가 복사되었습니다.\n운송장 번호 : ${text}`);
    }).catch(err => {
      console.error('복사 실패:', err);
    });
  };

  const toggleItem = (orderId: string) => {
    const item = orders.find(o => o.orderId === orderId);
    
    if (activeTab === '배송비 요청' && item?.bundleId) {
      const bundleItems = orders
        .filter(o => o.bundleId === item.bundleId && o.status === '배송비 요청')
        .map(o => o.orderId);
      
      setSelectedItems(prev => {
        const isCurrentlySelected = prev.includes(orderId);
        if (isCurrentlySelected) {
          return prev.filter(id => !bundleItems.includes(id));
        } else {
          const newSelection = new Set([...prev, ...bundleItems]);
          return Array.from(newSelection);
        }
      });
    } else {
      setSelectedItems(prev => 
        prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
      );
    }
  };

  const selectedOrders = useMemo(() => items.filter(item => selectedItems.includes(item.orderId)), [items, selectedItems]);

  const totals = useMemo(() => {
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
  }, [selectedOrders, activeTab]);

  const totalPriceVal = totals.product + totals.transfer + totals.delivery + totals.agency;
  const totalPriceWon = activeTab === '배송비 요청' ? totalPriceVal : Math.floor(totalPriceVal * exchangeRate);

  const handleDelete = async (orderId: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      try {
        const res = await fetch(`/api/orders?orderId=${orderId}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          alert('삭제되었습니다.');
          fetchOrders(); 
        } else {
          alert('삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error("삭제 에러:", error);
        alert('삭제 처리 중 오류가 발생했습니다.');
      }
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (selectedItems.length === 0) {
      alert('상품을 선택해주세요.');
      return;
    }

    let confirmMsg = '';
    if (newStatus === '상품 결제 완료') {
      confirmMsg = '선택한 상품을 결제 하시겠습니까? (상품 결제 완료로 이동)';
    } else if (newStatus === '배송 준비중') {
      confirmMsg = '선택한 상품들을 합포장 요청 하시겠습니까? (배송 준비중으로 이동)';
    } else {
      confirmMsg = '선택한 상품의 배송비 결제를 진행하시겠습니까? (배송비 결제 완료로 이동)';
    }

    if (confirm(confirmMsg)) {
      if (newStatus === '상품 결제 완료' || newStatus === '배송비 결제 완료') {
        try {
          const storedId = localStorage.getItem('user_id');
          const userRes = await fetch(`/api/users?id=${storedId}`);
          const userData = await userRes.json();
          
          if (userData.success) {
            const currentCyberMoney = userData.user.cyberMoney || 0;
            setCyberMoney(currentCyberMoney);

            if (currentCyberMoney < totalPriceWon) {
              const missingAmount = totalPriceWon - currentCyberMoney;
              if (confirm(`미쿠짱 금액이 부족합니다.\n\n현재 보유: ₩${currentCyberMoney.toLocaleString()}\n부족한 금액: ₩${missingAmount.toLocaleString()}\n\n충전하시겠습니까?`)) {
                window.location.href = '/mypage/money/charge';
              }
              return;
            }
          }
        } catch (error) {
          console.error("잔액 확인 실패:", error);
          alert('잔액 확인 중 오류가 발생했습니다.');
          return;
        }
      }

      let updates;
      if (newStatus === '배송 준비중') {
        const bundleId = 'B' + Date.now();
        updates = selectedItems.map(id => ({ 
          id, 
          status: newStatus, 
          bundleId,
          addressId: selectedAddressId === 'basic' ? null : selectedAddressId
        }));
      } else {
        updates = selectedItems.map(id => ({ id, status: newStatus }));
      }
      
      try {
        const storedId = localStorage.getItem('user_id');
        const isPayment = newStatus === '상품 결제 완료' || newStatus === '배송비 결제 완료';
        
        const res = await fetch('/api/admin/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            updates,
            userId: isPayment ? storedId : null,
            deductAmount: isPayment ? totalPriceWon : 0
          })
        });

        if (res.ok) {
          alert(newStatus === '상품 결제 완료' 
            ? '결제가 완료되어 상품 결제 완료 탭으로 이동되었습니다.' 
            : '배송비 결제가 완료되어 배송비 결제 완료 탭으로 이동되었습니다.');
          setSelectedItems([]);
          fetchOrders();
          setActiveTab(newStatus);
        } else {
          alert('처리에 실패했습니다.');
        }
      } catch (error) {
        console.error("업데이트 에러:", error);
      }
    }
  };

  // 🌟 우편번호 검색 완료 핸들러
  const handleCompletePostcode = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = '';

    if (data.addressType === 'R') {
      if (data.bname !== '') {
        extraAddress += data.bname;
      }
      if (data.buildingName !== '') {
        extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      }
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }

    setAddressForm(prev => ({
      ...prev,
      zipCode: data.zonecode,
      address: fullAddress,
      detailAddress: '' // 동/호수를 다시 입력하도록 초기화
    }));

    setIsOpenPostcode(false);

    // 모달이 닫힌 직후 자연스럽게 포커스 이동
    setTimeout(() => {
      detailAddressRef.current?.focus();
    }, 100);
  };

  if (isLoading) return (
    <div style={{ padding: '100px 50px', textAlign: 'center', color: '#64748b' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #f1f5f9', borderTopColor: '#ff4b2b', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
      데이터를 불러오는 중입니다...
    </div>
  );

  return (
    <div style={{ fontFamily: '"Noto Sans KR", sans-serif', color: '#333', position: 'relative' }}>
      
      <style jsx global>{`
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .anim-slide-up {
          opacity: 0;
          animation: slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }

        .tab-item { transition: all 0.2s ease; }
        .tab-item:hover:not(.active-tab) { background-color: #fff8f6 !important; color: #ff4b2b !important; }
        .table-row { transition: background-color 0.2s ease; }
        .table-row:hover { background-color: #f8fafc !important; }
        .action-btn { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .action-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(255, 75, 43, 0.25) !important;
          background-color: #e63e1c !important;
        }
        .action-btn:active:not(:disabled) { transform: translateY(0); }
      `}</style>

      {/* 상단 탭 */}
      <div className="anim-slide-up" style={{ display: 'flex', flexWrap: 'wrap', border: '1px solid #ddd', marginBottom: '15px', borderRadius: '8px', overflow: 'hidden' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          let groupColor = '#64748b';
          if (['장바구니', '구매실패', '상품 결제 완료', '입고완료'].includes(tab.name)) {
            groupColor = '#3b82f6';
          } else if (['배송 준비중', '배송비 요청', '배송비 결제 완료', '국제배송'].includes(tab.name)) {
            groupColor = '#f97316';
          }

          return (
            <div 
              key={tab.name}
              className={`tab-item ${isActive ? 'active-tab' : ''}`}
              onClick={() => setActiveTab(tab.name)}
              style={{
                flex: '1 1 auto', minWidth: '100px', padding: '14px 0', textAlign: 'center', fontSize: '13px', cursor: 'pointer',
                backgroundColor: isActive ? groupColor : '#fff',
                color: isActive ? '#fff' : '#475569',
                borderRight: '1px solid #eee',
                borderBottom: isActive ? 'none' : `3px solid ${groupColor}`,
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
                transition: 'all 0.2s ease', fontWeight: isActive ? '800' : '600'
              }}
            >
              {tab.name}
              <span style={{ 
                backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#f1f5f9', 
                color: isActive ? '#fff' : groupColor,
                padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '800',
              }}>
                {tab.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* 검색 필터 바 */}
      <div className="anim-slide-up delay-1" style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center', border: '1px solid #ddd', padding: '12px 16px', backgroundColor: '#fff', borderRadius: '8px' }}>
        <input type="date" style={inputStyle} />
        <span style={{color: '#888'}}>~</span>
        <input type="date" style={inputStyle} />
        <select style={selectStyle}><option>--배송센터--</option></select>
        <select style={selectStyle}><option>장바구니</option></select>
        <select style={selectStyle}><option>--검색옵션--</option></select>
        <button style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '6px 16px', fontSize: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.backgroundColor='#334155'} onMouseOut={e=>e.currentTarget.style.backgroundColor='#0f172a'}>
          검색
        </button>
      </div>

      {/* 데이터 테이블 */}
      <div className="anim-slide-up delay-2" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #ddd' }}>
              {['장바구니', '입고완료', '배송비 요청'].includes(activeTab) && (
                <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => toggleAll(!(items.length > 0 && selectedItems.length === items.length))}>
                  <input type="checkbox" readOnly checked={items.length > 0 && selectedItems.length === items.length} />
                </th>
              )}
              <th style={thStyle}>합배송번호<br/>주문번호<br/>상품번호</th>
              {activeTab === '국제배송' && <th style={thStyle}>운송장번호</th>}
              <th style={thStyle}>상품이미지</th>
              <th style={thStyle}>{activeTab === '배송비 요청' ? '배송비 결제 금액' : '상품가'}</th>
              <th style={thStyle}>상품명<br/>상품URL</th>
              <th style={thStyle}>등록일자<br/><span style={{ color: '#ff4b2b' }}>입고완료일</span><br/><span style={{ color: '#0ea5e9' }}>국제배송일</span></th>
              <th style={thStyle}>상품옵션</th>
              <th style={thStyle}>서비스<br/>신청</th>
              <th style={thStyle}>진행상태</th>
              <th style={thStyle}>구매수수료<br/><span style={{ color: '#ef4444' }}>일내배/착불</span></th>
              <th style={thStyle}>수취인</th>
              {activeTab === '입고완료' && <th style={thStyle}>포장</th>}
              {activeTab === '장바구니' && <th style={thStyle}>삭제</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const animationDelay = `${0.2 + index * 0.05}s`;
              return (
                <tr key={item.orderId} className="table-row anim-slide-up" style={{ borderBottom: '1px solid #ddd', textAlign: 'center', animationDelay }}>
                  {['장바구니', '입고완료', '배송비 요청'].includes(activeTab) && (
                    <td style={{ ...tdStyle, cursor: 'pointer' }} onClick={() => toggleItem(item.orderId)}>
                      <input type="checkbox" readOnly checked={selectedItems.includes(item.orderId)} />
                    </td>
                  )}
                  <td style={tdStyle}>
                    {item.bundleId && <div style={{ color: '#64748b' }}>{item.bundleId}</div>}
                    <div style={{ backgroundColor: '#ff4b2b', color: '#fff', padding: '3px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '3px', fontWeight: 'bold' }}>
                      {item.orderId}
                    </div>
                    {item.productId && <div style={{ color: '#64748b' }}>{item.productId}</div>}
                  </td>
                  {activeTab === '국제배송' && (
                    <td style={tdStyle}>
                      {item.trackingNo ? (
                        <div 
                          onClick={(e) => { e.stopPropagation(); handleCopy(item.trackingNo); }}
                          style={{ backgroundColor: '#eef2ff', color: '#4f46e5', padding: '8px 12px', borderRadius: '8px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'inline-block', border: '1px solid #c7d2fe', transition: 'all 0.2s' }}
                          onMouseOver={e => { e.currentTarget.style.backgroundColor = '#e0e7ff'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                          onMouseOut={e => { e.currentTarget.style.backgroundColor = '#eef2ff'; e.currentTarget.style.transform = 'translateY(0)'; }}
                          title="클릭하여 복사"
                        >
                          {item.trackingNo}
                        </div>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>-</span>
                      )}
                    </td>
                  )}
                  <td style={tdStyle}>
                    <div style={{ width: '60px', height: '60px', border: '1px solid #e2e8f0', borderRadius: '6px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#fff' }}>
                      {item.productImageUrl ? (
                        <img src={item.productImageUrl} alt="product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '20px', opacity: 0.2 }}>📦</span>
                      )}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: '#ef4444', fontWeight: '800', fontSize: '14px' }}>
                    {activeTab === '배송비 요청' ? '₩' : '¥'} {activeTab === '배송비 요청' 
                      ? (item.secondPaymentAmount || 0).toLocaleString() 
                      : item.productPrice.toLocaleString()}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'left', maxWidth: '280px', wordBreak: 'break-all', color: '#1e293b', fontWeight: '600' }}>
                    <div style={{ marginBottom: '6px', lineHeight: '1.4' }}>{item.productName}</div>
                    {item.productUrl && (
                      <a href={item.productUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0ea5e9', textDecoration: 'none', fontSize: '11px', display: 'inline-block', padding: '2px 6px', backgroundColor: '#f0f9ff', borderRadius: '4px' }}>
                        🔗 링크 이동
                      </a>
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: '#64748b', fontWeight: '500' }}>
                    {new Date(item.registeredAt).toLocaleDateString('ko-KR')}<br/>
                    {item.receivedAt ? <span style={{ color: '#ff4b2b', fontWeight: '700' }}>{new Date(item.receivedAt).toLocaleDateString('ko-KR')}</span> : <span style={{ color: '#cbd5e1' }}>-</span>}<br/>
                    {item.shippedAt ? <span style={{ color: '#0ea5e9', fontWeight: '700' }}>{new Date(item.shippedAt).toLocaleDateString('ko-KR')}</span> : <span style={{ color: '#cbd5e1' }}>-</span>}
                  </td>
                  <td style={tdStyle}>{item.productOption || '-'}</td>
                  <td style={tdStyle}>{item.serviceRequest || '-'}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '4px 10px', backgroundColor: '#f1f5f9', color: '#334155', borderRadius: '20px', border: '1px solid #e2e8f0', fontWeight: '700' }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ color: '#0ea5e9', fontWeight: 'bold' }}>{item.purchaseFee.toLocaleString()}</div>
                    <div style={{ color: '#ef4444', fontWeight: 'bold' }}>{item.domesticShippingFee.toLocaleString()}</div>
                  </td>
                  <td style={tdStyle}>{item.recipient || '-'}</td>
                  {activeTab === '입고완료' && (
                    <td style={tdStyle}>
                      <button 
                        onClick={async () => {
                          if (confirm('이 주문에 대해 포장 요청을 하시겠습니까?')) {
                            try {
                              const res = await fetch('/api/admin/orders', { 
                                method: 'PUT', 
                                headers: { 'Content-Type': 'application/json' }, 
                                body: JSON.stringify({ 
                                  updates: [{ 
                                    id: item.orderId, 
                                    status: '배송 준비중',
                                    addressId: selectedAddressId === 'basic' ? null : selectedAddressId
                                  }] 
                                }) 
                              });
                              if (res.ok) { alert('포장 요청(배송 준비중)으로 변경되었습니다.'); fetchOrders(); } 
                              else { alert('처리 중 오류가 발생했습니다.'); }
                            } catch (error) { console.error(error); alert('통신 오류가 발생했습니다.'); }
                          }
                        }}
                        style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseOver={e=>{e.currentTarget.style.backgroundColor='#2563eb'}}
                        onMouseOut={e=>{e.currentTarget.style.backgroundColor='#3b82f6'}}
                      >
                        개별 포장 요청
                      </button>
                    </td>
                  )}
                  {activeTab === '장바구니' && (
                    <td style={tdStyle}>
                      <button 
                        onClick={() => handleDelete(item.orderId)}
                        style={{ backgroundColor: '#fff', color: '#ef4444', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseOver={e=>{e.currentTarget.style.backgroundColor='#fef2f2'}}
                        onMouseOut={e=>{e.currentTarget.style.backgroundColor='#fff'}}
                      >
                        삭제
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            
            {items.length === 0 && (
              <tr>
                <td colSpan={['장바구니', '입고완료', '배송비 요청', '국제배송'].includes(activeTab) ? 13 : 12} style={{ padding: '80px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '14px' }}>
                  해당 상태의 주문 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      <div className="anim-slide-up delay-3" style={{ display: 'flex', justifyContent: 'center', marginTop: '30px', gap: '5px' }}>
        <button style={pageButtonStyle}>«</button>
        <button style={pageButtonStyle}>‹</button>
        <button style={{ ...pageButtonStyle, backgroundColor: '#0f172a', color: '#fff', borderColor: '#0f172a' }}>1</button>
        <button style={pageButtonStyle}>›</button>
        <button style={pageButtonStyle}>»</button>
      </div>

      {/* 안내 문구 (국제배송 탭) */}
      {activeTab === '국제배송' && (
        <div className="anim-slide-up delay-3" style={{ marginTop: '20px', marginBottom: '40px', padding: '16px 24px', background: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)', borderRadius: '100px', border: '1px solid #e0e7ff', display: 'inline-flex', alignItems: 'center', gap: '14px', boxShadow: '0 8px 24px rgba(79, 70, 229, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', backgroundColor: '#fff', borderRadius: '50%', boxShadow: '0 2px 8px rgba(79, 70, 229, 0.15)', fontSize: '18px' }}>💡</div>
          <span style={{ color: '#334155', fontSize: '14px', fontWeight: '500', letterSpacing: '-0.02em' }}>
            편리한 배송 조회를 위해 <strong style={{ color: '#4f46e5', fontWeight: '800', backgroundColor: '#e0e7ff', padding: '4px 10px', borderRadius: '8px', margin: '0 2px' }}>운송장 번호</strong>를 클릭하면 즉시 복사됩니다.
          </span>
        </div>
      )}

      {/* 장바구니 및 배송비 요청 결제 요약 */}
      {(activeTab === '장바구니' || activeTab === '배송비 요청') && (
        <div className="anim-slide-up delay-3" style={{ marginTop: '40px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ padding: '15px', color: '#64748b', fontWeight: '800' }}>상품 가격</th>
                <th style={{ padding: '15px', color: '#64748b', fontWeight: '800' }}>송금 수수료</th>
                <th style={{ padding: '15px', color: '#64748b', fontWeight: '800' }}>현지 배송료</th>
                <th style={{ padding: '15px', color: '#64748b', fontWeight: '800' }}>대행 수수료</th>
                <th style={{ padding: '15px', color: '#0f172a', fontWeight: '900', width: '26%' }}>최종 결제예상액 (원화)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '24px 15px', fontSize: '18px', color: '#1e293b', fontWeight: '700' }}>¥ {totals.product.toLocaleString()}</td>
                <td style={{ padding: '24px 15px', fontSize: '18px', color: '#1e293b', fontWeight: '700' }}>¥ {totals.transfer.toLocaleString()}</td>
                <td style={{ padding: '24px 15px', fontSize: '18px', color: '#1e293b', fontWeight: '700' }}>¥ {totals.delivery.toLocaleString()}</td>
                <td style={{ padding: '24px 15px', fontSize: '18px', color: '#1e293b', fontWeight: '700' }}>¥ {totals.agency.toLocaleString()}</td>
                <td style={{ padding: '24px 15px', fontSize: '24px', color: '#ff4b2b', fontWeight: '900', textAlign: 'left', paddingLeft: '30px', backgroundColor: '#fff8f6', borderRadius: '12px' }}>
                  ₩ {totalPriceWon.toLocaleString()} 
                  {activeTab !== '배송비 요청' && <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginTop: '4px' }}>환율 {exchangeRate} 적용</span>}
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
            <button className="action-btn" onClick={() => handleUpdateStatus(activeTab === '장바구니' ? '상품 결제 완료' : '배송비 결제 완료')} disabled={selectedItems.length === 0} style={{ backgroundColor: selectedItems.length > 0 ? '#ff4b2b' : '#cbd5e1', color: '#fff', border: 'none', padding: '16px 40px', fontSize: '18px', fontWeight: '900', borderRadius: '12px', cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed', boxShadow: selectedItems.length > 0 ? '0 4px 12px rgba(255, 75, 43, 0.2)' : 'none' }}>
              {activeTab === '장바구니' ? '선택상품 결제 하기' : '선택상품 배송비 결제하기'}
            </button>
          </div>
        </div>
      )}

      {/* 🌟 합포장 요청 버튼 (구매대행 상황 하단 우측) */}
      {activeTab === '입고완료' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px', marginBottom: '40px' }}>
          <div style={{ position: 'relative' }}>
            <button className="action-btn" onClick={() => handleUpdateStatus('배송 준비중')} disabled={selectedItems.length < 2} style={{ backgroundColor: selectedItems.length >= 2 ? '#ff4b2b' : '#cbd5e1', color: '#fff', border: 'none', padding: '16px 32px', fontSize: '16px', fontWeight: '900', borderRadius: '12px', cursor: selectedItems.length >= 2 ? 'pointer' : 'not-allowed', boxShadow: selectedItems.length >= 2 ? '0 4px 12px rgba(255, 75, 43, 0.2)' : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>📦</span>
              합포장 요청 ({selectedItems.length}개 선택됨)
            </button>
            {selectedItems.length < 2 && (
              <div style={{ position: 'absolute', bottom: '100%', right: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', marginBottom: '10px', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                2개 이상의 상품을 선택해주세요
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🌟 입고완료 탭 전용 주소지 정보 섹션 */}
      {activeTab === '입고완료' && (
        <div className="anim-slide-up delay-3" style={{ marginTop: '50px' }}>
          
          {/* 1. 수취인 주소 리스트 */}
          <div style={{ marginBottom: '50px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ width: '4px', height: '22px', backgroundColor: '#1e293b', borderRadius: '4px' }}></div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#1e293b', letterSpacing: '-0.02em' }}>
                수취인 주소 리스트
              </h3>
            </div>
            
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ ...premiumThStyle, width: '10%' }}>성명(한글)</th>
                    <th style={{ ...premiumThStyle, width: '10%' }}>성명(영문)</th>
                    <th style={{ ...premiumThStyle, width: '15%' }}>핸드폰</th>
                    <th style={{ ...premiumThStyle, width: '35%' }}>주소</th>
                    <th style={{ ...premiumThStyle, width: '20%' }}>개인통관고유부호</th>
                    <th style={{ ...premiumThStyle, width: '10%', textAlign: 'center' }}>선택</th>
                  </tr>
                </thead>
                <tbody>
                  {savedAddresses.map((addr) => (
                    <tr 
                      key={addr.id} 
                      className="table-row" 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: selectedAddressId === addr.id ? '#f0f9ff' : 'transparent',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <td style={{...premiumTdStyle, fontWeight: '700', color: '#0f172a'}}>
                        {addr.recipientName}
                        {addr.isDefault && <span style={{ display: 'block', fontSize: '11px', color: '#3b82f6', marginTop: '4px', fontWeight: '800' }}>기본 배송지</span>}
                      </td>
                      <td style={{...premiumTdStyle, color: '#475569'}}>{addr.recipientEnglishName || '-'}</td>
                      <td style={{...premiumTdStyle, color: '#475569'}}>{addr.phone}</td>
                      <td style={{...premiumTdStyle, color: '#334155', lineHeight: '1.5'}}>
                        ({addr.zipCode}) {addr.address} <br/> 
                        <span style={{ color: '#64748b' }}>{addr.detailAddress}</span>
                      </td>
                      <td style={{...premiumTdStyle, color: '#475569'}}>{addr.personalCustomsCode || '-'}</td>
                      <td style={{...premiumTdStyle, textAlign: 'center'}}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button 
                            onClick={() => {
                              setSelectedAddressId(addr.id);
                              setAddressForm({
                                id: addr.id,
                                recipientName: addr.recipientName,
                                recipientEnglishName: addr.recipientEnglishName || '',
                                phone: addr.phone,
                                zipCode: addr.zipCode,
                                address: addr.address,
                                detailAddress: addr.detailAddress,
                                personalCustomsCode: addr.personalCustomsCode || ''
                              });
                              setShowAddressForm(true);
                            }}
                            style={{
                              ...premiumSelectBtnStyle,
                              backgroundColor: selectedAddressId === addr.id ? '#0ea5e9' : '#fff',
                              color: selectedAddressId === addr.id ? '#fff' : '#334155',
                              borderColor: selectedAddressId === addr.id ? '#0ea5e9' : '#cbd5e1'
                            }}
                          >
                            {selectedAddressId === addr.id ? '선택됨' : '선택'}
                          </button>
                          <button 
                            onClick={async () => {
                              if (addr.isDefault) {
                                alert('기본 배송지는 삭제할 수 없습니다.');
                                return;
                              }
                              if(confirm('이 배송지를 삭제하시겠습니까?')) {
                                const res = await fetch(`/api/addresses?id=${addr.id}`, { method: 'DELETE' });
                                if(res.ok) {
                                  alert('삭제되었습니다.');
                                  const storedId = localStorage.getItem('user_id');
                                  if(storedId) {
                                    fetch(`/api/addresses?userId=${storedId}`)
                                      .then(r => r.json())
                                      .then(d => { if(d.success) setSavedAddresses(d.addresses); });
                                  }
                                }
                              }
                            }}
                            style={{ 
                              ...premiumSelectBtnStyle, 
                              color: addr.isDefault ? '#94a3b8' : '#ef4444', 
                              borderColor: addr.isDefault ? '#e2e8f0' : '#fca5a5',
                              cursor: addr.isDefault ? 'not-allowed' : 'pointer',
                              backgroundColor: addr.isDefault ? '#f8fafc' : '#fff'
                            }}
                            title={addr.isDefault ? "기본 배송지는 삭제할 수 없습니다" : ""}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {savedAddresses.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        <div style={{ fontSize: '24px', marginBottom: '10px' }}>📪</div>
                        등록된 주소 정보가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* 새 배송지 추가 버튼 */}
            {!showAddressForm && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
                <button
                  onClick={() => setShowAddressForm(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', backgroundColor: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                  onMouseOver={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                  onMouseOut={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  <span style={{ fontSize: '18px' }}>+</span> 새 배송지 추가
                </button>
              </div>
            )}
          </div>

          {/* 2. 받으실 배송지 주소 폼 */}
          <div style={{ marginBottom: '60px', display: showAddressForm ? 'block' : 'none', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', paddingTop: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '4px', height: '22px', backgroundColor: '#ff4b2b', borderRadius: '4px' }}></div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#1e293b', letterSpacing: '-0.02em' }}>
                  받으실 배송지 주소
                </h3>
              </div>
              <button
                onClick={() => setShowAddressForm(false)}
                style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', backgroundColor: '#ffffff', color: '#1e293b', border: '1px solid #94a3b8', borderRadius: '100px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
                onMouseOver={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                onMouseOut={e => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05)'; }}
              >
                <span style={{ fontSize: '14px', fontWeight: '900', marginTop: '1px' }}>✕</span> 닫기
              </button>
            </div>
            
            <div style={{ backgroundColor: '#fff', padding: '10px 40px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)', border: '1px solid #f1f5f9' }}>
              
              <div style={premiumFormRowStyle}>
                <div style={{...premiumFormLabelStyle, flexDirection: 'row', alignItems: 'center', paddingTop: '0'}}>
                  <span style={{ color: '#ef4444', marginRight: '4px', fontWeight: 'bold' }}>*</span>성명(한글)
                </div>
                <div style={formContentStyle}>
                  <input type="text" value={addressForm.recipientName} onChange={(e) => setAddressForm({ ...addressForm, recipientName: e.target.value })} placeholder="수취인 실명을 입력해 주세요" style={premiumInputStyle} />
                </div>
              </div>

              <div style={premiumFormRowStyle}>
                <div style={{...premiumFormLabelStyle, flexDirection: 'row', alignItems: 'center', paddingTop: '0'}}>
                  <span style={{ color: '#ef4444', marginRight: '4px', fontWeight: 'bold' }}>*</span>성명(영문)
                </div>
                <div style={formContentStyle}>
                  <input type="text" value={addressForm.recipientEnglishName} onChange={(e) => setAddressForm({ ...addressForm, recipientEnglishName: e.target.value })} placeholder="영문 성명을 입력해 주세요" style={premiumInputStyle} />
                </div>
              </div>

              <div style={premiumFormRowStyle}>
                <div style={{...premiumFormLabelStyle, flexDirection: 'row', alignItems: 'center', paddingTop: '0'}}>
                  <span style={{ color: '#ef4444', marginRight: '4px', fontWeight: 'bold' }}>*</span>핸드폰
                </div>
                <div style={{...formContentStyle, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'}}>
                  <input type="text" value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} style={{ ...premiumInputStyle, maxWidth: '240px' }} />
                  <span style={{ fontSize: '14px', color: '#64748b' }}>예) 010-2345-1245 해당번호로 <strong style={{ color: '#6b21a8' }}>카카오톡 알림</strong> 발송</span>
                </div>
              </div>

              {/* 🌟 우편번호 및 주소 영역 */}
              <div style={premiumFormRowStyle}>
                <div style={{...premiumFormLabelStyle, flexDirection: 'row', alignItems: 'center', paddingTop: '0'}}>
                  <span style={{ color: '#ef4444', marginRight: '4px', fontWeight: 'bold' }}>*</span>주소
                </div>
                <div style={formContentStyle}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input type="text" value={addressForm.zipCode} readOnly placeholder="우편번호" style={{ ...premiumInputStyle, maxWidth: '200px', backgroundColor: '#f8fafc', color: '#64748b' }} />
                    <button 
                      type="button" 
                      onClick={() => setIsOpenPostcode(true)}
                      style={{ padding: '0 20px', backgroundColor: '#5b21b6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'background-color 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = '#4c1d95'} onMouseOut={e => e.currentTarget.style.backgroundColor = '#5b21b6'}
                    >
                      우편번호검색
                    </button>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <input type="text" value={addressForm.address} readOnly placeholder="기본 주소" style={{ ...premiumInputStyle, backgroundColor: '#f8fafc', color: '#64748b' }} />
                  </div>
                  <div>
                    {/* 🌟 포커스 자동 이동을 위한 Ref 추가 */}
                    <input type="text" ref={detailAddressRef} value={addressForm.detailAddress} onChange={(e) => setAddressForm({ ...addressForm, detailAddress: e.target.value })} placeholder="상세 주소 (동, 호수 등을 입력해주세요)" style={premiumInputStyle} />
                  </div>
                </div>
              </div>

              <div style={{ ...premiumFormRowStyle, borderBottom: 'none' }}>
                <div style={{...premiumFormLabelStyle, flexDirection: 'row', alignItems: 'center', paddingTop: '0'}}>
                  개인통관고유부호
                </div>
                <div style={formContentStyle}>
                  <input type="text" value={addressForm.personalCustomsCode} onChange={(e) => setAddressForm({ ...addressForm, personalCustomsCode: e.target.value })} style={{ ...premiumInputStyle, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '13px', color: '#ef4444', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '14px' }}>⚠️</span> 본인 명의로 발급받은 번호만 유효합니다.
                  </p>
                </div>
              </div>

            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={async () => {
                  // 1. 필수 입력 필드 검증
                  if (!addressForm.recipientName) return alert('성명(한글)을 입력해 주세요.');
                  if (!addressForm.recipientEnglishName) return alert('성명(영문)을 입력해 주세요.');
                  if (!addressForm.phone) return alert('핸드폰 번호를 입력해 주세요.');
                  if (!addressForm.zipCode || !addressForm.address || !addressForm.detailAddress) return alert('주소를 모두 입력해 주세요.');
                  if (!addressForm.personalCustomsCode) return alert('개인통관고유부호를 입력해 주세요.');
                  
                  const isUpdate = addressForm.id !== null;
                  if (isUpdate) {
                    if (!confirm('배송지 정보를 수정하시겠습니까?')) return;
                  }

                  const storedId = localStorage.getItem('user_id');
                  if (!storedId) return;

                  try {
                    // 2. 배송지 DB에 저장/업데이트
                    const addrRes = await fetch('/api/addresses', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: storedId,
                        ...addressForm, // 이 안에 id가 포함되어 있음
                        isDefault: false
                      })
                    });

                    if (!addrRes.ok) {
                      alert('배송지 저장에 실패했습니다.');
                      return;
                    }

                    // 3. 선택된 주문 상품들에 배송 정보 적용 (recipient 업데이트)
                    if (selectedItems.length > 0) {
                      const finalAddrId = addressForm.id || (addrRes.ok ? (await addrRes.clone().json()).address.id : null);
                      await fetch('/api/admin/orders', {
                        method: 'PUT', 
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          updates: selectedItems.map(id => ({ 
                            id, 
                            recipient: addressForm.recipientName,
                            addressId: finalAddrId
                          })) 
                        })
                      });
                    }

                    // 4. 유저의 최근 사용 배송지 ID 업데이트 (로그인한 유저 정보에 저장)
                    const finalAddrId = addressForm.id || (addrRes.ok ? (await addrRes.clone().json()).address.id : null);
                    if (finalAddrId) {
                      await fetch('/api/users', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          id: storedId,
                          addressId: finalAddrId,
                          addressMode: isUpdate ? 'update' : 'add' // 추가 시에만 누적되도록 모드 전달
                        })
                      });
                    }

                    // 5. 완료 처리
                    alert(isUpdate ? '배송지 정보가 수정되었습니다.' : '새 배송지가 저장되었습니다.');
                    setShowAddressForm(false);
                    fetchOrders();
                  } catch (error) {
                    console.error("저장 오류:", error);
                    alert('처리 중 오류가 발생했습니다.');
                  }
                }}
                style={{ padding: '12px 30px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)' }}
                onMouseOver={e => { e.currentTarget.style.backgroundColor = '#1e293b'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={e => { e.currentTarget.style.backgroundColor = '#0f172a'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {addressForm.id ? '배송지 수정하기' : '배송지 추가하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 우편번호 검색 모달 (팝업 윈도우 스타일) */}
      {isOpenPostcode && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          animation: 'slideUpFade 0.3s ease-out'
        }}>
          <div style={{
            backgroundColor: '#fff', width: '100%', maxWidth: '500px',
            borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>우편번호 검색</h3>
              <button 
                onClick={() => setIsOpenPostcode(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'flex' }}
                onMouseOver={e => e.currentTarget.style.color = '#ef4444'} onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
              >
                ✕
              </button>
            </div>
            <div style={{ height: '450px' }}>
              <DaumPostcode onComplete={handleCompletePostcode} style={{ width: '100%', height: '100%' }} />
            </div>
          </div>
        </div>
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

const thStyle: React.CSSProperties = { padding: '12px 8px', borderRight: '1px solid #f1f5f9', fontWeight: '800', color: '#64748b' };
const tdStyle: React.CSSProperties = { padding: '16px 10px', borderRight: '1px solid #f1f5f9', verticalAlign: 'middle' };
const inputStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', width: '130px', color: '#334155', outline: 'none' };
const selectStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#334155', outline: 'none' };
const pageButtonStyle: React.CSSProperties = { padding: '8px 14px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '13px', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontWeight: 'bold', transition: 'all 0.2s' };
const formRowStyle: React.CSSProperties = { display: 'flex', borderBottom: '1px solid #eee', padding: '15px 0' };
const formLabelStyle: React.CSSProperties = { width: '180px', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', color: '#555' };
const formContentStyle: React.CSSProperties = { flex: 1 };
const formSubLabelStyle: React.CSSProperties = { fontSize: '12px', color: '#888', marginBottom: '4px' };

const premiumThStyle: React.CSSProperties = { padding: '16px 20px', textAlign: 'left', fontWeight: '700', color: '#64748b', borderRight: 'none' };
const premiumTdStyle: React.CSSProperties = { padding: '20px', textAlign: 'left', verticalAlign: 'middle', borderRight: 'none' };
const premiumSelectBtnStyle: React.CSSProperties = { padding: '8px 16px', fontSize: '13px', fontWeight: '700', color: '#334155', border: '1px solid #cbd5e1', backgroundColor: '#fff', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s ease' };
const premiumFormRowStyle: React.CSSProperties = { display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '24px 0', alignItems: 'flex-start' };
const premiumFormLabelStyle: React.CSSProperties = { width: '180px', fontSize: '15px', fontWeight: '800', color: '#334155', paddingTop: '12px', display: 'flex', flexDirection: 'column' };
const premiumFormSubLabelStyle: React.CSSProperties = { fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' };
const premiumInputStyle: React.CSSProperties = { width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#1e293b', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' };
const premiumActionBtnStyle: React.CSSProperties = { padding: '0 20px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'background-color 0.2s', whiteSpace: 'nowrap' };
