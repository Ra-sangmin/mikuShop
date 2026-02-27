"use client";
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import GuideLayout from '../../components/GuideLayout';
import { useSearchParams } from 'next/navigation';

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
            setOrders(data.user.orders || []);
            setCyberMoney(data.user.cyberMoney || 0);
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
    
    // 배송비 요청 탭에서 bundleId가 있는 경우 묶음 처리
    if (activeTab === '배송비 요청' && item?.bundleId) {
      const bundleItems = orders
        .filter(o => o.bundleId === item.bundleId && o.status === '배송비 요청')
        .map(o => o.orderId);
      
      setSelectedItems(prev => {
        const isCurrentlySelected = prev.includes(orderId);
        if (isCurrentlySelected) {
          // 이미 선택되어 있다면 묶음 전체 해제
          return prev.filter(id => !bundleItems.includes(id));
        } else {
          // 선택되어 있지 않다면 묶음 전체 선택
          const newSelection = new Set([...prev, ...bundleItems]);
          return Array.from(newSelection);
        }
      });
    } else {
      // 일반적인 단건 토글
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
        // 장바구니 탭에서는 수수료들을 아이템마다 추가
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
      // 결제 단계인 경우 사이버머니 잔액 확인 (DB 최신 데이터 기준)
      if (newStatus === '상품 결제 완료' || newStatus === '배송비 결제 완료') {
        try {
          const storedId = localStorage.getItem('user_id');
          const userRes = await fetch(`/api/users?id=${storedId}`);
          const userData = await userRes.json();
          
          if (userData.success) {
            const currentCyberMoney = userData.user.cyberMoney || 0;
            setCyberMoney(currentCyberMoney); // 상태 동기화

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
        // 합포장 요청 시 고유한 bundleId 생성 (B + 타임스탬프)
        const bundleId = 'B' + Date.now();
        updates = selectedItems.map(id => ({ id, status: newStatus, bundleId }));
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

  // 🌟 스켈레톤 로딩 애니메이션
  if (isLoading) return (
    <div style={{ padding: '100px 50px', textAlign: 'center', color: '#64748b' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #f1f5f9', borderTopColor: '#ff4b2b', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
      데이터를 불러오는 중입니다...
    </div>
  );

  return (
    <div style={{ fontFamily: '"Noto Sans KR", sans-serif', color: '#333' }}>
      
      {/* 🌟 전역 애니메이션 키프레임 */}
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

        /* 탭 호버 트랜지션 */
        .tab-item { transition: all 0.2s ease; }
        .tab-item:hover:not(.active-tab) { background-color: #fff8f6 !important; color: #ff4b2b !important; }

        /* 테이블 행 트랜지션 */
        .table-row { transition: background-color 0.2s ease; }
        .table-row:hover { background-color: #f8fafc !important; }

        /* 주문 액션 버튼 호버 */
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
          
          // 🎨 탭 그룹별 색상 정의
          let groupColor = '#64748b'; // 기본 (전체내역)
          
          if (['장바구니', '구매실패', '상품 결제 완료', '입고완료'].includes(tab.name)) {
            groupColor = '#3b82f6'; // 2단계: 구매 진행 (Blue)
          } else if (['배송 준비중', '배송비 요청', '배송비 결제 완료', '국제배송'].includes(tab.name)) {
            groupColor = '#f97316'; // 3단계: 배송 진행 (Orange)
          }

          return (
            <div 
              key={tab.name}
              className={`tab-item ${isActive ? 'active-tab' : ''}`}
              onClick={() => setActiveTab(tab.name)}
              style={{
                flex: '1 1 auto', // 유동적인 너비 조절
                minWidth: '100px',
                padding: '14px 0', 
                textAlign: 'center', 
                fontSize: '13px', 
                cursor: 'pointer',
                // 활성화 시 그룹 컬러 배경, 비활성화 시 흰색 배경에 상단 보더로 포인트
                backgroundColor: isActive ? groupColor : '#fff',
                color: isActive ? '#fff' : '#475569',
                borderRight: '1px solid #eee',
                borderBottom: isActive ? 'none' : `3px solid ${groupColor}`, // 비활성화 시에도 그룹 표시
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '6px',
                transition: 'all 0.2s ease',
                fontWeight: isActive ? '800' : '600'
              }}
            >
              {tab.name}
              <span style={{ 
                backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#f1f5f9', 
                color: isActive ? '#fff' : groupColor,
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontSize: '11px', 
                fontWeight: '800',
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
                <th 
                  style={{ ...thStyle, cursor: 'pointer' }}
                  onClick={() => toggleAll(!(items.length > 0 && selectedItems.length === items.length))}
                >
                  <input 
                    type="checkbox" 
                    readOnly
                    checked={items.length > 0 && selectedItems.length === items.length}
                  />
                </th>
              )}
              <th style={thStyle}>
                합배송번호<br/>주문번호<br/>상품번호
              </th>
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
              // 🌟 테이블 행마다 0.05초 간격으로 순차 등장 애니메이션 적용
              const animationDelay = `${0.2 + index * 0.05}s`;
              return (
                <tr 
                  key={item.orderId} 
                  className="table-row anim-slide-up"
                  style={{ borderBottom: '1px solid #ddd', textAlign: 'center', animationDelay }}
                >
                  {['장바구니', '입고완료', '배송비 요청'].includes(activeTab) && (
                    <td 
                      style={{ ...tdStyle, cursor: 'pointer' }}
                      onClick={() => toggleItem(item.orderId)}
                    >
                      <input 
                        type="checkbox" 
                        readOnly
                        checked={selectedItems.includes(item.orderId)}
                      />
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(item.trackingNo);
                          }}
                          style={{ 
                            backgroundColor: '#eef2ff', 
                            color: '#4f46e5', 
                            padding: '8px 12px', 
                            borderRadius: '8px', 
                            fontWeight: '800', 
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'inline-block',
                            border: '1px solid #c7d2fe',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={e => {
                            e.currentTarget.style.backgroundColor = '#e0e7ff';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.backgroundColor = '#eef2ff';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
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
                                  updates: [{ id: item.orderId, status: '배송 준비중' }] 
                                })
                              });
                              if (res.ok) {
                                alert('포장 요청(배송 준비중)으로 변경되었습니다.');
                                fetchOrders();
                              } else {
                                alert('처리 중 오류가 발생했습니다.');
                              }
                            } catch (error) {
                              console.error(error);
                              alert('통신 오류가 발생했습니다.');
                            }
                          }
                        }}
                        style={{ 
                          backgroundColor: '#3b82f6', 
                          color: '#fff', 
                          border: 'none', 
                          padding: '6px 12px', 
                          borderRadius: '6px', 
                          fontSize: '11px', 
                          fontWeight: 'bold', 
                          cursor: 'pointer', 
                          transition: 'all 0.2s' 
                        }}
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
        <div className="anim-slide-up delay-3" style={{ 
          marginTop: '20px', 
          marginBottom: '40px',
          padding: '16px 24px',
          // 🌟 1. 은은한 투톤 그라데이션 배경으로 고급스러움 강조
          background: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)',
          borderRadius: '100px', // 🌟 2. 둥근 알약(Pill) 형태로 부드럽고 세련된 느낌
          border: '1px solid #e0e7ff',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '14px',
          // 🌟 3. 부드럽고 넓게 퍼지는 그림자로 공중에 떠 있는 듯한 입체감 부여
          boxShadow: '0 8px 24px rgba(79, 70, 229, 0.08)' 
        }}>
          {/* 🌟 4. 아이콘 전용 둥근 컨테이너로 시선 집중 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '34px',
            height: '34px',
            backgroundColor: '#fff',
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.15)',
            fontSize: '18px'
          }}>
            💡
          </div>
          
          <span style={{ color: '#334155', fontSize: '14px', fontWeight: '500', letterSpacing: '-0.02em' }}>
            편리한 배송 조회를 위해{' '}
            {/* 🌟 5. 핵심 액션 키워드에 뱃지(Badge) 스타일 하이라이트 적용 */}
            <strong style={{ 
              color: '#4f46e5', 
              fontWeight: '800', 
              backgroundColor: '#e0e7ff', 
              padding: '4px 10px', 
              borderRadius: '8px', 
              margin: '0 2px' 
            }}>
              운송장 번호
            </strong>
            를 클릭하면 즉시 복사됩니다.
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
                <td style={{ padding: '24px 15px', fontSize: '18px', color: '#1e293b', fontWeight: '700' }}>
                  ¥ {totals.product.toLocaleString()}
                </td>
                <td style={{ padding: '24px 15px', fontSize: '18px', color: '#1e293b', fontWeight: '700' }}>
                  ¥ {totals.transfer.toLocaleString()}
                </td>
                <td style={{ padding: '24px 15px', fontSize: '18px', color: '#1e293b', fontWeight: '700' }}>
                  ¥ {totals.delivery.toLocaleString()}
                </td>
                <td style={{ padding: '24px 15px', fontSize: '18px', color: '#1e293b', fontWeight: '700' }}>
                  ¥ {totals.agency.toLocaleString()}
                </td>
                <td style={{ padding: '24px 15px', fontSize: '24px', color: '#ff4b2b', fontWeight: '900', textAlign: 'left', paddingLeft: '30px', backgroundColor: '#fff8f6', borderRadius: '12px' }}>
                  ₩ {totalPriceWon.toLocaleString()} 
                  {activeTab !== '배송비 요청' && <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginTop: '4px' }}>환율 {exchangeRate} 적용</span>}
                </td>
              </tr>
            </tbody>
          </table>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
            <button 
              className="action-btn"
              onClick={() => handleUpdateStatus(activeTab === '장바구니' ? '상품 결제 완료' : '배송비 결제 완료')}
              disabled={selectedItems.length === 0}
              style={{ 
                backgroundColor: selectedItems.length > 0 ? '#ff4b2b' : '#cbd5e1', 
                color: '#fff', 
                border: 'none', 
                padding: '16px 40px', 
                fontSize: '18px', 
                fontWeight: '900', 
                borderRadius: '12px', 
                cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed',
                boxShadow: selectedItems.length > 0 ? '0 4px 12px rgba(255, 75, 43, 0.2)' : 'none',
              }}
            >
              {activeTab === '장바구니' ? '선택상품 결제 하기' : '선택상품 배송비 결제하기'}
            </button>
          </div>
        </div>
      )}

      {/* 🌟 합포장 요청 버튼 (구매대행 상황 하단 우측) */}
      {activeTab === '입고완료' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px', marginBottom: '20px' }}>
          <div style={{ position: 'relative' }}>
            <button
              className="action-btn"
              onClick={() => handleUpdateStatus('배송 준비중')}
              disabled={selectedItems.length < 2}
              style={{
                backgroundColor: selectedItems.length >= 2 ? '#ff4b2b' : '#cbd5e1',
                color: '#fff',
                border: 'none',
                padding: '16px 32px',
                fontSize: '16px',
                fontWeight: '900',
                borderRadius: '12px',
                cursor: selectedItems.length >= 2 ? 'pointer' : 'not-allowed',
                boxShadow: selectedItems.length >= 2 ? '0 4px 12px rgba(255, 75, 43, 0.2)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
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

const thStyle: React.CSSProperties = {
  padding: '12px 8px', borderRight: '1px solid #f1f5f9', fontWeight: '800', color: '#64748b'
};

const tdStyle: React.CSSProperties = {
  padding: '16px 10px', borderRight: '1px solid #f1f5f9', verticalAlign: 'middle'
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', width: '130px', color: '#334155', outline: 'none'
};

const selectStyle: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#334155', outline: 'none'
};

const pageButtonStyle: React.CSSProperties = {
  padding: '8px 14px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '13px', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontWeight: 'bold', transition: 'all 0.2s'
};
