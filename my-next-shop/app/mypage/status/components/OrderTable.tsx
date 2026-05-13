"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useMikuAlert } from '@/app/context/MikuAlertContext';
import { ORDER_STATUS, ORDER_STATUS_LABEL, OrderStatus } from '@/src/types/order';

export default function OrderTable({ items, activeTab, selectedItems, setSelectedItems, fetchOrders, selectedAddress , onIndividualPacking , onDelete }: any) {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const { showConfirm, showAlert } = useMikuAlert();
  const [isMobile, setIsMobile] = useState(false);

  // 🌟 실시간 시간 계산을 위한 현재 시간 state
  const [now, setNow] = useState(new Date());

  // 입찰 금액 입력 및 보증금 계산을 위한 컴포넌트
  const BidInputContent = ({ item, onChange }: { item: any, onChange: (val: string) => void }) => {
      const [amount, setAmount] = useState("");

      const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setAmount(val);
        onChange(val); // 부모(Promise)에게 값 전달
      };

      const originalBid = item.myBidPrice || 0;
      const parsedAmount = parseInt(amount) || 0;
      const totalMyBid = originalBid + parsedAmount;
      const deposit = parsedAmount > 0 
        ? (parsedAmount <= 20000 ? 2000 : Math.floor(parsedAmount * 0.1)) 
        : 0;

      return (
      <div className="notranslate" translate="no" style={{ textAlign: 'left', width: '100%' }}>
        {/* 1. 상품명 */}
        <p style={{ 
          fontSize: '13px', color: '#64748b', marginBottom: '24px', 
          textAlign: 'center', lineHeight: '1.6', wordBreak: 'keep-all' 
        }}>
          {item.productName}
        </p>
        
        {/* 2. 현재 최고가 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', padding: '0 4px' }}>
          <span style={{ fontSize: '14.5px', color: '#475569', fontWeight: '600' }}>현재 최고가</span>
          <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '16px' }}>
            ¥ {item.productPrice?.toLocaleString()}
          </span>
        </div>
        
        {/* 🌟 3. 내 입찰 금액 (취소선 및 화살표 애니메이션 적용) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', padding: '0 4px', alignItems: 'center' }}>
          <span style={{ fontSize: '14.5px', color: '#475569', fontWeight: '600' }}>내 입찰 금액</span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {parsedAmount > 0 ? (
              // 추가 금액을 입력했을 때: 기존 금액(취소선) -> 새 금액
              <>
                <span style={{ color: '#94a3b8', textDecoration: 'line-through', fontSize: '14px', fontWeight: '500' }}>
                  ¥ {originalBid.toLocaleString()}
                </span>
                <span style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: '800' }}>→</span>
                <span style={{ fontWeight: '900', color: '#3b82f6', fontSize: '17px' }}>
                  ¥ {totalMyBid.toLocaleString()}
                </span>
              </>
            ) : (
              // 아무것도 입력하지 않았을 때: 기존 금액만 표시
              <span style={{ fontWeight: '800', color: '#3b82f6', fontSize: '16px' }}>
                ¥ {originalBid.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* 4. 파스텔 톤 프리미엄 입력 컨테이너 */}
        <div style={{ 
          background: 'linear-gradient(145deg, #f8faff 0%, #f0f4f8 100%)', 
          padding: '20px', 
          borderRadius: '16px', 
          marginBottom: '24px',
          border: '1px solid rgba(226, 232, 240, 0.8)', 
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02), inset 0 2px 0 rgba(255, 255, 255, 1)' 
        }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: '#64748b' }}>
            추가 입찰 금액 (¥)
          </label>
          
          <input 
            type="number" 
            placeholder="추가할 금액 입력"
            value={amount}
            onChange={handleInputChange}
            style={{ 
              width: '100%', 
              padding: '14px 16px', 
              borderRadius: '12px', 
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '18px',
              fontWeight: '700',
              color: '#1e293b',
              boxSizing: 'border-box',
              marginBottom: '16px',
              outline: 'none',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.02)', 
              transition: 'border-color 0.2s ease'
            }}
          />


        </div>
      </div>
    );
  }

  const handleBidClick = async (item: any) => {
    let finalAmount = ""; // 입력값을 추적하기 위한 변수

    const isConfirmed = await showConfirm(
      <BidInputContent 
        item={item} 
        onChange={(val) => { finalAmount = val; }} 
      />
    );

    if (isConfirmed) {
      const amount = parseInt(finalAmount);
      if (!amount || amount <= 0) {
        showAlert("올바른 금액을 입력해주세요.", "error");
        return;
      }

      const deposit = amount <= 20000 ? 2000 : Math.floor(amount * 0.1);

      try {
        const res = await fetch('/api/orders/bid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            orderId: item.orderId, 
            amount: amount,
            deposit: deposit // 계산된 보증금도 함께 전송
          })
        });
        
        if (res.ok) {
          showAlert(`¥${amount.toLocaleString()} 추가 입찰 완료!`, 'success');
          fetchOrders();
        } else {
            const errorData = await res.json();
            showAlert(errorData.error || "입찰에 실패했습니다.", "error");
        }
      } catch (error) {
        showAlert("통신 에러가 발생했습니다.", "error");
      }
    }
  };

  // 📱 모바일 감지
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);

    // 1초마다 현재 시간을 갱신하여 남은 시간이 실시간으로 변하게 함
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(timer);
    };
  }, []);

  // --- 🎨 스타일 정의 ---
  const styles = useMemo(() => ({
    label: { fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: '500' as const },
    value: { fontWeight: '700' as const, fontSize: '13px', color: '#1e293b', lineHeight: '1.2' },
    badge: (bgColor: string) => ({ display: 'inline-block', padding: '4px 8px', borderRadius: '6px', fontWeight: '800' as const, fontSize: '11px', backgroundColor: bgColor, color: '#fff' }),
    mobileCard: { backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }
  }), []);

  // 🚀 종료 일시를 기준으로 현재 남은 시간을 계산하는 함수
  const formatAuctionDate = (dateString: string | Date) => {
    if (!dateString) return "-";
    
    const targetDate = new Date(dateString);
    const diff = targetDate.getTime() - now.getTime(); // 밀리초 차이 계산

    // 🌟 종료 시간이 현재보다 이전일 경우
    if (diff <= 0) {
      return <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>경매 종료</span>;
    }

    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const diffMinutes = Math.floor((diff / (1000 * 60)) % 60);
    const diffSeconds = Math.floor((diff / 1000) % 60);

    // 1. 남은 시간이 1일 이상일 때: "N일 N시간"
    if (diffDays > 0) {
      return `${diffDays}일 ${diffHours}시간`;
    }
    
    // 2. 남은 시간이 1시간 이상일 때: "N시간 N분"
    if (diffHours > 0) {
      return `${diffHours}시간 ${diffMinutes}분`;
    }

    // 3. 남은 시간이 1시간 미만일 때: "N분 N초" (빨간색 강조)
    return (
      <span className="time-pulse" style={{ color: '#ef4444', fontWeight: 'bold' }}>
        {diffMinutes}분 {diffSeconds}초
      </span>
    );
  };

  // 🚀 데이터 그룹화 및 정렬
  const isAuctionTab = activeTab === 'BID_PENDING' || activeTab === 'BIDDING';
  const showBundleAndRecipientTabs = [ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING];
  
  // 🌟 컬럼 수 계산기 수정 (BID_PENDING 추가)
  const getColSpanCount = () => {
    let count = 3; 
    if (activeTab === 'ALL') count += 1; 
    if ([ORDER_STATUS.CART, ORDER_STATUS.ARRIVED, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.BID_PENDING, ORDER_STATUS.BID_SUCCESS].includes(activeTab)) count += 1;
    if (showBundleAndRecipientTabs.includes(activeTab)) count += 1; 
    if (isAuctionTab) count += 2; 
    if (activeTab === ORDER_STATUS.SHIPPING) count += 1; 
    if (activeTab === ORDER_STATUS.PAYMENT_REQ) count += 1; 
    if (activeTab === ORDER_STATUS.CART || activeTab === ORDER_STATUS.ARRIVED || activeTab === ORDER_STATUS.BIDDING || activeTab === ORDER_STATUS.BID_PENDING) count += 1; 
    
    // 🌟 경매 상황(BIDDING) 탭에 '경매 상태' 열 추가
    if (activeTab === 'BIDDING') count += 1; 

    return count;
  };

  const renderOrderDetail = (item: any) => (
    <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid #e2e8f0', width: '100%', backgroundColor: '#f8fafc' }}>
      {(item.isBundleGroup ? item.originalItems : [item]).map((sub: any, idx: number) => (
        <div key={sub.orderId} style={{ padding: '20px', borderBottom: idx !== (item.isBundleGroup ? item.originalItems.length : 1) - 1 ? '1px dashed #cbd5e1' : 'none' }}>
          <div style={{ fontWeight: '800' }}>{sub.productName}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            ¥ {(sub.productPrice || 0).toLocaleString()} x {sub.productCount || sub.quantity || 1}개
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {isMobile ? (
        /* 📱 모바일 뷰 (생략 - 필요시 추가 구현) */
        <div>모바일 뷰 생략</div>
      ) : (
        /* 💻 PC 테이블 뷰 */
        <div className="table-wrapper">
          <style jsx>{`
            .table-wrapper { overflow-x: auto; border-radius: 12px; border: 1px solid #e2e8f0; background-color: #fff; }
            .custom-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            .th-cell { padding: 12px 5px; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #475569; background-color: #f8fafc; text-align: center; font-size: 13px; white-space: nowrap; }
            .td-cell { padding: 12px 5px; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #e2e8f0; vertical-align: middle; text-align: center; }
            .prod-name { font-size: 13px; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; width: 100%; text-align: left; padding: 0 15px; }
            .btn-action { padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 800; font-size: 12px; border: none; }
          `}</style>
          <table className="custom-table">
            <thead>
              <tr>
                {/* 🌟 BID_PENDING 탭에 체크박스 헤더 추가 */}
                {[ORDER_STATUS.CART, ORDER_STATUS.ARRIVED, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.BID_PENDING, ORDER_STATUS.BID_SUCCESS].includes(activeTab) && (
                  <th className="th-cell" style={{width:'45px'}}>
                    <input type="checkbox" />
                  </th>
                )}
                {activeTab === 'ALL' && <th className="th-cell" style={{width:'90px'}}>상태</th>}
                <th className="th-cell">상품명</th>
                
                {isAuctionTab && <th className="th-cell" style={{width:'120px'}}>남은 시간</th>}
                <th className="th-cell" style={{width:'130px'}}>{isAuctionTab ? '현재 최고가' : '상품 금액'}</th>
                {isAuctionTab && <th className="th-cell" style={{width:'130px'}}>내 입찰금액</th>}
                
                {/* 🌟 경매 상황(BIDDING) 탭 전용: 경매 상태 헤더 */}
                {activeTab === 'BIDDING' && <th className="th-cell" style={{width:'110px'}}>경매 상태</th>}
                
                {showBundleAndRecipientTabs.includes(activeTab) && <th className="th-cell" style={{width:'100px'}}>수취인</th>}
                {activeTab === ORDER_STATUS.PAYMENT_REQ && <th className="th-cell" style={{width:'110px'}}>배송비(₩)</th>}
                {activeTab === ORDER_STATUS.SHIPPING && <th className="th-cell" style={{width:'130px'}}>운송장 번호</th>}

                {/* 🌟 BID_PENDING 탭에도 관리(삭제) 열 추가 */}
                {(activeTab === ORDER_STATUS.CART || activeTab === ORDER_STATUS.ARRIVED || activeTab === 'BIDDING' || activeTab === ORDER_STATUS.BID_PENDING) && (
                  <th className="th-cell" style={{width:'110px'}}>관리</th>
                )}
                
                <th className="th-cell" style={{width:'100px'}}>상세보기</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => {
                const isExpanded = expandedRows.includes(item.orderId);
                return (
                  <React.Fragment key={item.orderId}>
                    <tr>
                      {/* 🌟 BID_PENDING 탭에 체크박스 바디 추가 및 정상 작동하도록 onChange 로직 수정 */}
                      {[ORDER_STATUS.CART, ORDER_STATUS.ARRIVED, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.BID_PENDING, ORDER_STATUS.BID_SUCCESS].includes(activeTab) && (
                        <td className="td-cell">
                          <input 
                            type="checkbox" 
                            checked={selectedItems.includes(item.orderId)} 
                            onChange={() => {
                              if (selectedItems.includes(item.orderId)) {
                                setSelectedItems(selectedItems.filter((id: string) => id !== item.orderId));
                              } else {
                                setSelectedItems([...selectedItems, item.orderId]);
                              }
                            }} 
                          />
                        </td>
                      )}
                      {activeTab === 'ALL' && <td className="td-cell"><span style={styles.badge('#3b82f6')}>{item.status}</span></td>}
                      <td className="td-cell"><div className="prod-name" title={item.productName}>{item.productName}</div></td>
                      
                      {isAuctionTab && (
                        <td className="td-cell" style={{fontSize: '12px'}}>
                          {formatAuctionDate(item.auctionEndDate)}
                        </td>
                      )}

                      <td className="td-cell">
                        <div style={{ fontWeight: '900', color: '#1e293b' }}>¥ {(item.productPrice || 0).toLocaleString()}</div>
                      </td>

                      {isAuctionTab && (
                        <td className="td-cell">
                          <div style={{ fontWeight: '900', color: '#2563eb' }}>¥ {(item.myBidPrice || 0).toLocaleString()}</div>
                        </td>
                      )}

                      {/* 🌟 경매 상황(BIDDING) 탭 전용: bidStatus 값 표시 뱃지 */}
                      {activeTab === 'BIDDING' && (
                        <td className="td-cell">
                          {/* 🌟 PENDING(최초 입찰 대기) 또는 ADDITIONAL(추가 입찰 대기)일 경우 모두 '입찰 대기중'으로 표시 */}
                          {(item.bidStatus === 'PENDING' || item.bidStatus === 'ADDITIONAL') && (
                            <span style={{ color: '#d97706', fontWeight: '800', fontSize: '12px', background: '#fef3c7', padding: '4px 8px', borderRadius: '4px' }}>
                              입찰 대기중
                            </span>
                          )}
                          
                          {/* 🌟 관리자가 수동으로 입찰을 완료 처리했을 경우 */}
                          {item.bidStatus === 'COMPLETED' && (
                            <span style={{ color: '#10b981', fontWeight: '800', fontSize: '12px', background: '#d1fae5', padding: '4px 8px', borderRadius: '4px' }}>
                              입찰 완료
                            </span>
                          )}
                          
                          {/* 만약 DB에 값이 없거나 다른 값이 들어있을 경우의 기본값 */}
                          {(!item.bidStatus || !['PENDING', 'COMPLETED', 'ADDITIONAL'].includes(item.bidStatus)) && (
                            <span style={{ color: '#64748b', fontWeight: '800', fontSize: '12px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>
                              상태 확인중
                            </span>
                          )}
                        </td>
                      )}

                      {showBundleAndRecipientTabs.includes(activeTab) && <td className="td-cell">{item.address?.recipientName || '미지정'}</td>}
                      {activeTab === ORDER_STATUS.PAYMENT_REQ && <td className="td-cell">₩ {(item.secondPaymentAmount || 0).toLocaleString()}</td>}
                      {activeTab === ORDER_STATUS.SHIPPING && <td className="td-cell">{item.trackingNo || '준비중'}</td>}

                      {/* 🌟 관리 열: 상태에 따른 버튼 노출 */}
                      {(activeTab === ORDER_STATUS.CART || activeTab === ORDER_STATUS.ARRIVED || activeTab === 'BIDDING' || activeTab === ORDER_STATUS.BID_PENDING) && (
                        <td className="td-cell">
                          {/* 🌟 경매 요청(BID_PENDING) 탭에서도 삭제 버튼 노출 */}
                          {(activeTab === ORDER_STATUS.CART || activeTab === ORDER_STATUS.BID_PENDING) && (
                            <button className="btn-action" onClick={() => onDelete(item.orderId)} style={{ color: '#ef4444', border: '1px solid #fee2e2', background: '#fff' }}>삭제</button>
                          )}
                          {activeTab === ORDER_STATUS.ARRIVED && (
                            <button className="btn-action" onClick={() => onIndividualPacking(item)} style={{ background: '#10b981', color: '#fff' }}>개별 포장</button>
                          )}
                          
                          {activeTab === 'BIDDING' && (
                            <button className="btn-action" onClick={() => handleBidClick(item)} style={{ background: '#3b82f6', color: '#fff' }}>추가 입찰</button>
                          )}
                        </td>
                      )}
                      
                      <td className="td-cell">
                        <button style={{ padding: '6px 12px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer' }} 
                                onClick={() => setExpandedRows(prev => prev.includes(item.orderId) ? prev.filter(id => id !== item.orderId) : [...prev, item.orderId])}>
                          {isExpanded ? '접기 ▲' : '보기 ▼'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && <tr><td colSpan={getColSpanCount()} style={{ padding: 0 }}>{renderOrderDetail(item)}</td></tr>}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}