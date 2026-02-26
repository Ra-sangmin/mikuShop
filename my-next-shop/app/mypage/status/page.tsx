"use client";
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import GuideLayout from '../../components/GuideLayout';
import { useSearchParams } from 'next/navigation';
// 🌟 1. 더 이상 가짜 데이터를 쓰지 않으므로 useCart는 제거합니다.

const initialTabs = [
  { name: '전체내역', count: 0 },
  { name: '장바구니', count: 0 },
  { name: '구매실패', count: 0 },
  { name: '1차완료', count: 0 },
  { name: '입고대기', count: 0 },
  { name: '입고완료', count: 0 },
  { name: '합포장중', count: 0 },
  { name: '2차요청', count: 0 },
  { name: '2차완료', count: 0 },
  { name: '국제배송', count: 0 },
];

function MyPurchaseStatusContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('장바구니');
  
  // 🌟 2. DB에서 가져온 데이터를 담을 State
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 선택된 주문의 고유 orderId를 담는 배열 (string 타입으로 변경)
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const exchangeRate = 9.05; // 🌟 아까 대시보드와 동일한 9.05로 맞췄습니다.

  // 🌟 3. 데이터 불러오기 로직 (마이페이지와 동일)
  const fetchOrders = () => {
    const storedId = localStorage.getItem('user_id');
    if (storedId) {
      fetch(`/api/users?id=${storedId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setOrders(data.user.orders || []);
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

  // 🌟 4. 데이터 가공 로직 (cartItems 대신 DB의 orders 사용)
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

  const toggleItem = (orderId: string) => {
    setSelectedItems(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const totalPriceYen = items
    .filter(item => selectedItems.includes(item.orderId))
    // DB의 productPrice(엔화)를 합산합니다.
    .reduce((sum, item) => sum + (item.productPrice || 0), 0);

  const totalPriceWon = Math.floor(totalPriceYen * exchangeRate);

  // 🌟 5. DB 업데이트 연동 (상태를 '1차완료' 또는 '2차완료'로 변경)
  const handleUpdateStatus = async (newStatus: string) => {
    if (selectedItems.length === 0) {
      alert('상품을 선택해주세요.');
      return;
    }

    const confirmMsg = newStatus === '1차완료' 
      ? '선택한 상품을 주문하시겠습니까? (1차완료로 이동)' 
      : '선택한 상품의 2차 결제를 진행하시겠습니까? (2차완료로 이동)';

    if (confirm(confirmMsg)) {
      const updates = selectedItems.map(id => ({ id, status: newStatus }));
      
      try {
        const res = await fetch('/api/admin/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        });

        if (res.ok) {
          alert(newStatus === '1차완료' 
            ? '주문이 완료되어 1차완료 탭으로 이동되었습니다.' 
            : '2차 결제가 완료되어 2차완료 탭으로 이동되었습니다.');
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

  // 로딩 중 표시
  if (isLoading) return <div style={{ padding: '50px', textAlign: 'center' }}>데이터를 불러오는 중입니다...</div>;

  return (
    <div style={{ fontFamily: '"Noto Sans KR", sans-serif', color: '#333' }}>
      
      {/* 상단 탭 */}
      <div style={{ display: 'flex', border: '1px solid #ddd', marginBottom: '15px' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          return (
            <div 
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              style={{
                flex: 1,
                padding: '12px 0',
                textAlign: 'center',
                fontSize: '13px',
                cursor: 'pointer',
                backgroundColor: isActive ? '#ff4b2b' : '#fff',
                color: isActive ? '#fff' : '#333',
                borderRight: '1px solid #ddd',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '5px',
                fontWeight: isActive ? 'bold' : 'normal'
              }}
            >
              {tab.name}
              <span style={{ 
                backgroundColor: isActive ? '#fff' : '#888', 
                color: isActive ? '#ff4b2b' : '#fff',
                padding: '1px 5px',
                borderRadius: '3px',
                fontSize: '11px'
              }}>{tab.count}</span>
            </div>
          );
        })}
      </div>

      {/* 검색 필터 바 */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', alignItems: 'center', border: '1px solid #ddd', padding: '10px', backgroundColor: '#fff' }}>
        <input type="date" style={inputStyle} />
        <span style={{color: '#888'}}>~</span>
        <input type="date" style={inputStyle} />
        <select style={selectStyle}>
          <option>--배송센터--</option>
        </select>
        <select style={selectStyle}>
          <option>장바구니</option>
        </select>
        <select style={selectStyle}>
          <option>--검색옵션--</option>
        </select>
        <button style={{ backgroundColor: '#f8f9fa', border: '1px solid #ddd', padding: '5px 15px', fontSize: '12px', cursor: 'pointer' }}>검색</button>
      </div>

      {/* 데이터 테이블 */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #ddd' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #ddd' }}>
              <th style={thStyle}><input type="checkbox" /></th>
              <th style={thStyle}>합배송번호<br/>주문번호<br/>상품번호<br/>운송장번호</th>
              <th style={thStyle}>상품이미지</th>
              <th style={thStyle}>상품가</th>
              <th style={thStyle}>상품명<br/>상품URL</th>
              <th style={thStyle}>등록일자<br/><span style={{ color: '#ff4b2b' }}>입고완료일</span><br/><span style={{ color: '#0056b3' }}>국제배송일</span></th>
              <th style={thStyle}>상품옵션</th>
              <th style={thStyle}>서비스<br/>신청</th>
              <th style={thStyle}>진행상태</th>
              <th style={thStyle}>구매수수료<br/><span style={{ color: '#ff4d4f' }}>일내배/착불</span></th>
              <th style={thStyle}>수취인</th>
              {activeTab === '장바구니' && <th style={thStyle}>삭제</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.orderId} style={{ borderBottom: '1px solid #ddd', textAlign: 'center' }}>
                <td style={tdStyle}>
                  <input 
                    type="checkbox" 
                    checked={selectedItems.includes(item.orderId)}
                    onChange={() => toggleItem(item.orderId)}
                  />
                </td>
                <td style={tdStyle}>
                  {item.bundleId && <div style={{ color: '#666' }}>{item.bundleId}</div>}
                  <div style={{ backgroundColor: '#ff4b2b', color: '#fff', padding: '3px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '3px', fontWeight: 'bold' }}>
                    {item.orderId}
                  </div>
                  {item.productId && <div style={{ color: '#666' }}>{item.productId}</div>}
                  {item.trackingNo && <div style={{ color: '#0056b3' }}>{item.trackingNo}</div>}
                </td>
                <td style={tdStyle}>
                  <div style={{ width: '60px', height: '60px', border: '1px solid #eee', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.productImageUrl ? (
                      <img src={item.productImageUrl} alt="product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <img src="/images/logo.png" alt="no image" style={{ width: '40px', opacity: 0.1 }} />
                    )}
                  </div>
                </td>
                <td style={{ ...tdStyle, color: '#ff4d4f', fontWeight: 'bold' }}>
                  ¥ {item.productPrice.toLocaleString()}
                </td>
                <td style={{ ...tdStyle, textAlign: 'left', maxWidth: '300px', wordBreak: 'break-all', color: '#333', fontWeight: '500' }}>
                  <div style={{ marginBottom: '4px' }}>{item.productName}</div>
                  {item.productUrl && (
                    <a href={item.productUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#888', textDecoration: 'none', fontSize: '11px' }}>
                      🔗 링크 이동
                    </a>
                  )}
                </td>
                <td style={{ ...tdStyle, color: '#666' }}>
                  {new Date(item.registeredAt).toLocaleDateString('ko-KR')}<br/>
                  {item.receivedAt ? <span style={{ color: '#ff4b2b' }}>{new Date(item.receivedAt).toLocaleDateString('ko-KR')}</span> : <span style={{ color: '#ccc' }}>-</span>}<br/>
                  {item.shippedAt ? <span style={{ color: '#0056b3' }}>{new Date(item.shippedAt).toLocaleDateString('ko-KR')}</span> : <span style={{ color: '#ccc' }}>-</span>}
                </td>
                <td style={tdStyle}>{item.productOption || '-'}</td>
                <td style={tdStyle}>{item.serviceRequest || '-'}</td>
                <td style={tdStyle}>
                  <span style={{ padding: '4px 8px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #ddd' }}>
                    {activeTab === '국제배송' ? (item.deliveryStatus || '배송전') : item.status}
                  </span>
                </td>
                <td style={tdStyle}>
                  <div style={{ color: '#0056b3' }}>{item.purchaseFee.toLocaleString()}</div>
                  <div style={{ color: '#ff4d4f' }}>{item.domesticShippingFee.toLocaleString()}</div>
                </td>
                <td style={tdStyle}>{item.recipient || '-'}</td>
                {activeTab === '장바구니' && (
                  <td style={tdStyle}>
                    <button 
                      onClick={() => alert('삭제 기능은 백엔드 DELETE API 추가 후 작동합니다!')}
                      style={{ 
                        backgroundColor: '#666', 
                        color: '#fff', 
                        border: 'none', 
                        padding: '4px 8px', 
                        borderRadius: '3px', 
                        fontSize: '11px', 
                        cursor: 'pointer' 
                      }}
                    >
                      삭제
                    </button>
                  </td>
                )}
              </tr>
            ))}
            
            {/* 데이터가 없을 때 표시할 UI */}
            {items.length === 0 && (
              <tr>
                <td colSpan={12} style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                  해당 상태의 주문 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px', gap: '5px', marginBottom: '40px' }}>
        <button style={pageButtonStyle}>«</button>
        <button style={pageButtonStyle}>‹</button>
        <button style={{ ...pageButtonStyle, backgroundColor: '#000', color: '#fff' }}>1</button>
        <button style={pageButtonStyle}>›</button>
        <button style={pageButtonStyle}>»</button>
      </div>

      {/* 장바구니 및 2차요청 결제 요약 */}
      {(activeTab === '장바구니' || activeTab === '2차요청') && (
        <div style={{ marginTop: '40px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd', textAlign: 'center', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #ddd' }}>
                <th style={{ padding: '15px', borderRight: '1px solid #ddd', color: '#666', fontWeight: 'bold', width: '25%' }}>1차결제금액 (엔화)</th>
                <th style={{ padding: '15px', borderRight: '1px solid #ddd', width: '8%' }}></th>
                <th style={{ padding: '15px', borderRight: '1px solid #ddd', color: '#666', fontWeight: 'bold', width: '33%' }}>총 수수료<br/>(2차요청 후 안내)</th>
                <th style={{ padding: '15px', borderRight: '1px solid #ddd', width: '8%' }}></th>
                <th style={{ padding: '15px', color: '#666', fontWeight: 'bold', width: '26%' }}>최종 결제예상액 (원화)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '20px', borderRight: '1px solid #ddd', fontSize: '18px', color: '#333' }}>¥ {totalPriceYen.toLocaleString()}</td>
                <td style={{ padding: '20px', borderRight: '1px solid #ddd', fontSize: '20px', color: '#ff4b2b', fontWeight: 'bold' }}>+</td>
                <td style={{ padding: '20px', borderRight: '1px solid #ddd', fontSize: '18px', color: '#333' }}>¥ 0</td>
                <td style={{ padding: '20px', borderRight: '1px solid #ddd', fontSize: '20px', color: '#ff4b2b', fontWeight: 'bold' }}>=</td>
                <td style={{ padding: '20px', fontSize: '18px', color: '#ff4b2b', fontWeight: 'bold', textAlign: 'left', paddingLeft: '30px' }}>
                  ₩ {totalPriceWon.toLocaleString()} <span style={{ fontSize: '13px', color: '#888', fontWeight: 'normal' }}>(환율 {exchangeRate} 적용)</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button 
              onClick={() => handleUpdateStatus(activeTab === '장바구니' ? '1차완료' : '2차완료')}
              disabled={selectedItems.length === 0}
              style={{ 
                backgroundColor: selectedItems.length > 0 ? '#ff4b2b' : '#ccc', 
                color: '#fff', 
                border: 'none', 
                padding: '12px 30px', 
                fontSize: '16px', 
                fontWeight: 'bold', 
                borderRadius: '4px', 
                cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed',
                boxShadow: selectedItems.length > 0 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {activeTab === '장바구니' ? '선택상품 주문하기' : '선택상품 2차결제하기'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default function MyPurchaseStatusPage() {
  return (
    <GuideLayout title="구매대행 상황" type="mypage" fullWidth>
      <Suspense fallback={<div>로딩 중...</div>}>
        <MyPurchaseStatusContent />
      </Suspense>
    </GuideLayout>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 5px',
  borderRight: '1px solid #ddd',
  fontWeight: 'normal',
  color: '#666'
};

const tdStyle: React.CSSProperties = {
  padding: '15px 10px',
  borderRight: '1px solid #ddd',
  verticalAlign: 'middle'
};

const inputStyle: React.CSSProperties = {
  padding: '5px',
  border: '1px solid #ddd',
  fontSize: '12px',
  width: '120px'
};

const selectStyle: React.CSSProperties = {
  padding: '5px',
  border: '1px solid #ddd',
  fontSize: '12px'
};

const pageButtonStyle: React.CSSProperties = {
  padding: '5px 10px',
  border: '1px solid #ddd',
  backgroundColor: '#fff',
  fontSize: '12px',
  cursor: 'pointer'
};
