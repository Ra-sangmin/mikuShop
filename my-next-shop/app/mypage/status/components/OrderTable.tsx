"use client";
import React, { useState, useEffect, useMemo } from 'react';

export default function OrderTable({ items, orders, activeTab, selectedItems, setSelectedItems, fetchOrders, selectedAddress, userData }: any) {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [expandedAddresses, setExpandedAddresses] = useState<string[]>([]);
  const [statusSort, setStatusSort] = useState<'asc' | 'desc'>('asc');

  // 🌟 DB에서 실시간으로 불러온 주소 데이터를 저장하는 상태
  const [fetchedAddresses, setFetchedAddresses] = useState<Record<string, any>>({});
  const [loadingAddresses, setLoadingAddresses] = useState<Record<string, boolean>>({});

  useEffect(() => { setStatusSort('asc'); }, [activeTab]);

  const toggleAll = (checked: boolean) => setSelectedItems(checked ? items.map((i: any) => i.orderId) : []);
  
  const toggleItem = (orderId: string) => {
    const item = orders.find((o: any) => o.orderId === orderId);
    if (activeTab === '배송비 요청' && item?.bundleId) {
      const bundleItems = orders.filter((o: any) => o.bundleId === item.bundleId && o.status === '배송비 요청').map((o: any) => o.orderId);
      setSelectedItems((prev: string[]) => prev.includes(orderId) ? prev.filter(id => !bundleItems.includes(id)) : Array.from(new Set([...prev, ...bundleItems])));
    } else {
      setSelectedItems((prev: string[]) => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
    }
  };

  // 🌟 상세 주소를 가져오는 로직을 독립적인 함수로 분리
  const fetchAddressData = async (addressId: string | number) => {
    if (!addressId || fetchedAddresses[String(addressId)] || loadingAddresses[String(addressId)]) return;

    setLoadingAddresses(prev => ({ ...prev, [String(addressId)]: true }));
    try {
      const res = await fetch(`/api/addresses?id=${addressId}`);
      const data = await res.json();

      if (data.success) {
        const newAddress = data.address || (data.addresses && data.addresses[0]);
        if (newAddress) {
          setFetchedAddresses(prev => ({ ...prev, [String(addressId)]: newAddress }));
        }
      }
    } catch (error) {
      console.error('주소 정보 불러오기 실패:', error);
    } finally {
      setLoadingAddresses(prev => ({ ...prev, [String(addressId)]: false }));
    }
  };

  // 🌟 상세보기를 펼칠 때 미리 주소를 가져오도록 수정
  const toggleExpandRow = (orderId: string, addressId?: string | number) => {
    setExpandedRows(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId); // 닫기
      } else {
        if (addressId) fetchAddressData(addressId); // 열 때 DB에서 데이터 미리 Fetch
        return [...prev, orderId]; // 열기
      }
    });
  };

  // 🌟 상세 주소 보기 버튼은 단순히 UI 열림/닫힘만 관리
  const toggleAddressExpand = (orderId: string) => {
    setExpandedAddresses(prev => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
  };

  const handleDelete = async (orderId: string) => {
    if (confirm('장바구니에서 이 상품을 정말 삭제하시겠습니까?')) {
      try {
        const res = await fetch(`/api/orders?orderId=${orderId}`, { method: 'DELETE' });
        if (res.ok) { alert('삭제되었습니다.'); fetchOrders(); }
      } catch (error) { console.error(error); alert('오류가 발생했습니다.'); }
    }
  };

  const handleIndividualPackage = async (orderId: string) => {
    if (!selectedAddress) {
      return alert('하단 수취인 주소 리스트에서 배송지를 먼저 선택해주세요.');
    }

    if (confirm('이 주문에 대해 개별 포장 요청을 하시겠습니까? (선택하신 배송지가 적용됩니다)')) {
      try {
        const addressUpdateData = { address_id: selectedAddress.id };
        const res = await fetch('/api/admin/orders', { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ updates: [{ id: orderId, status: '배송 준비중', ...addressUpdateData }] }) 
        });
        if (res.ok) { alert('개별 포장 요청(배송 준비중)으로 변경되었습니다.'); fetchOrders(); }
        else { alert('처리 중 오류가 발생했습니다.'); }
      } catch (error) { console.error(error); alert('통신 오류가 발생했습니다.'); }
    }
  };

  const handleCopyTrackingNo = (trackingNo: string) => {
    if (trackingNo && trackingNo !== '운송장 번호 없음') {
      navigator.clipboard.writeText(trackingNo)
        .then(() => alert(`운송장 번호 [${trackingNo}] 복사되었습니다.`))
        .catch((err) => {
          console.error('복사 실패:', err);
          alert('복사에 실패했습니다. 브라우저 설정을 확인해주세요.');
        });
    }
  };

  const STATUS_ORDER = ['장바구니', '구매실패', '상품 결제 완료', '입고완료', '배송 준비중', '배송비 요청', '배송비 결제 완료', '국제배송'];

  const sortedItems = useMemo(() => {
    if (activeTab !== '전체내역') return items;
    return [...items].sort((a: any, b: any) => {
      const indexA = STATUS_ORDER.indexOf(a.status);
      const indexB = STATUS_ORDER.indexOf(b.status);
      const orderA = indexA !== -1 ? indexA : 999;
      const orderB = indexB !== -1 ? indexB : 999;
      return statusSort === 'asc' ? orderA - orderB : orderB - orderA;
    });
  }, [items, activeTab, statusSort]);

  const handleSortClick = () => setStatusSort(prev => prev === 'asc' ? 'desc' : 'asc');

  const formatStatus = (status: string) => {
    if (status === '상품 결제 완료') return <><span className="pc-text">상품 결제 완료</span><span className="mobile-text">상품<br/>결제완료</span></>;
    if (status === '배송비 결제 완료') return <><span className="pc-text">배송비 결제 완료</span><span className="mobile-text">배송비<br/>결제 완료</span></>;
    return status;
  };

  const getStatusStyle = (status: string): React.CSSProperties => {
    if (['장바구니', '구매실패', '상품 결제 완료', '입고완료'].includes(status)) return { backgroundColor: '#3b82f6', color: '#ffffff', textShadow: '0px 1px 2px rgba(0,0,0,0.15)' };
    if (['배송 준비중', '배송비 요청', '배송비 결제 완료', '국제배송'].includes(status)) return { backgroundColor: '#f97316', color: '#ffffff', textShadow: '0px 1px 2px rgba(0,0,0,0.15)' };
    return { backgroundColor: '#f1f5f9', color: '#334155' };
  };

  const getColSpanCount = () => {
    let count = 3; 
    if (activeTab === '전체내역') count += 1; 
    if (['장바구니', '입고완료', '배송비 요청'].includes(activeTab)) count += 1; 
    if (['장바구니', '입고완료'].includes(activeTab)) count += 1; 
    if (activeTab === '국제배송') count += 1; 
    return count;
  };

  const showAddressTabs = ['배송 준비중', '배송비 요청', '배송비 결제 완료', '국제배송'];

  const formatDate = (dateString: any) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="table-wrapper">
        <style jsx>{`
          .table-wrapper { overflow-x: auto; border-radius: 12px; border: 1px solid #e2e8f0; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
          .custom-table { width: 100%; border-collapse: collapse; table-layout: fixed; min-width: 320px; }
          .th-cell { padding: 14px 10px; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #475569; background-color: #f8fafc; white-space: nowrap; font-size: 13px; text-align: center; }
          .sortable-header { cursor: pointer; user-select: none; transition: background-color 0.2s; }
          .sortable-header:hover { background-color: #f1f5f9; }
          .td-cell { padding: 16px 10px; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #e2e8f0; vertical-align: middle; text-align: center; }
          .col-chk { width: 40px; } .col-status { width: 140px; } .col-name { width: auto; } .col-tracking { width: 130px; } .col-price { width: 100px; } .col-action { width: 75px; } .col-btn { width: 100px; }
          .prod-name { font-size: 13px; font-weight: 700; color: #1e293b; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; word-break: break-all; }
          .status-badge { display: inline-block; padding: 6px 10px; border-radius: 8px; font-weight: 900; font-size: 12px; text-align: center; line-height: 1.3; white-space: nowrap; }
          .detail-btn { width: 100%; padding: 10px 0; border-radius: 8px; border: 1px solid #cbd5e1; cursor: pointer; font-weight: 800; font-size: 12px; transition: all 0.2s; white-space: nowrap; }
          .delete-btn { width: 100%; padding: 10px 0; border-radius: 8px; border: 1px solid #fca5a5; background-color: #fee2e2; color: #ef4444; cursor: pointer; font-weight: 800; font-size: 12px; transition: all 0.2s; white-space: nowrap; }
          .delete-btn:hover { background-color: #fecaca; }
          .package-btn { width: 100%; padding: 10px 0; border-radius: 8px; border: 1px solid #bfdbfe; background-color: #eff6ff; color: #2563eb; cursor: pointer; font-weight: 800; font-size: 12px; transition: all 0.2s; white-space: nowrap; letter-spacing: -0.5px; }
          .package-btn:hover { background-color: #dbeafe; }
          .mobile-text { display: none; } .pc-text { display: inline; }
          @media (max-width: 768px) {
            .th-cell { padding: 10px 4px; font-size: 12px; } .td-cell { padding: 12px 4px; }
            .col-chk { width: 30px; } .col-status { width: 85px; } .col-tracking { width: 90px; } .col-price { width: 80px; } .col-action { width: 65px; } .col-btn { width: 80px; }
            .prod-name { font-size: 12px; } .status-badge { padding: 6px 4px; font-size: 11px; white-space: normal; }
            .detail-btn { padding: 8px 0; font-size: 11px; } .delete-btn, .package-btn { padding: 8px 0; font-size: 11px; letter-spacing: -0.5px; }
            .mobile-text { display: inline; } .pc-text { display: none; }
          }
        `}</style>

        <table className="custom-table">
          <thead>
            <tr>
              {['장바구니', '입고완료', '배송비 요청'].includes(activeTab) && (
                <th className="th-cell col-chk" style={{ cursor: 'pointer' }} onClick={() => toggleAll(!(items.length > 0 && selectedItems.length === items.length))}>
                  <input type="checkbox" readOnly checked={items.length > 0 && selectedItems.length === items.length} />
                </th>
              )}
              {activeTab === '전체내역' && (
                <th className="th-cell col-status sortable-header" onClick={handleSortClick}>
                  진행상태 <span style={{ fontSize: '10px', color: '#94a3b8' }}>{statusSort === 'asc' ? '▲' : '▼'}</span>
                </th>
              )}
              
              <th className="th-cell col-name">상품명</th>
              
              {activeTab === '국제배송' && (
                <th className="th-cell col-tracking">운송장 번호</th>
              )}
              
              <th className="th-cell col-price">상품 금액</th>
              
              {activeTab === '장바구니' && <th className="th-cell col-action">삭제</th>}
              {activeTab === '입고완료' && <th className="th-cell col-action">포장요청</th>}
              <th className="th-cell col-btn">상세보기</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item: any) => {
              const isExpanded = expandedRows.includes(item.orderId);
              const isAddressExpanded = expandedAddresses.includes(item.orderId);

              // 🌟 addressId를 여기서 추출
              const addressId = item.addressId || item.address_id;
              
              const allPossibleAddresses = [
                ...(item.user?.addresses || []),
                ...(userData?.addresses || []),
                ...(userData?.addressList || [])
              ];
              
              const matchedAddress = fetchedAddresses[String(addressId)] || allPossibleAddresses.find((a: any) => String(a.id) === String(addressId));
              
              const addrInfo = matchedAddress || {};
              const recipientName = addrInfo.recipientName || addrInfo.name || item.recipient || '수취인 정보 없음';
              const phone = addrInfo.phone || '';
              const zipCode = addrInfo.zipCode || '';
              const address = addrInfo.address || '';
              const detailAddress = addrInfo.detailAddress || '';
              const customsCode = addrInfo.personalCustomsCode || '';

              const matchedOrder = orders.find((o: any) => o.orderId === item.orderId) || {};
              const trackingNo = matchedOrder.trackingNo || item.trackingNo || matchedOrder.tracking_no || item.tracking_no || '운송장 번호 없음';
              
              const bundleId = matchedOrder.bundleId || item.bundleId || matchedOrder.bundle_id || item.bundle_id || '-';
              const registeredAt = matchedOrder.registeredAt || item.registeredAt || matchedOrder.registered_at || item.registered_at;
              const receivedAt = matchedOrder.receivedAt || item.receivedAt || matchedOrder.received_at || item.received_at;
              const shippedAt = matchedOrder.shippedAt || item.shippedAt || matchedOrder.shipped_at || item.shipped_at;

              return (
                <React.Fragment key={item.orderId}>
                  <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid #e2e8f0' }}>
                    {['장바구니', '입고완료', '배송비 요청'].includes(activeTab) && (
                      <td className="td-cell" onClick={() => toggleItem(item.orderId)}>
                        <input type="checkbox" readOnly checked={selectedItems.includes(item.orderId)} />
                      </td>
                    )}
                    {activeTab === '전체내역' && (
                      <td className="td-cell"><span className="status-badge" style={getStatusStyle(item.status)}>{formatStatus(item.status)}</span></td>
                    )}
                    
                    <td className="td-cell" style={{ textAlign: 'left' }}>
                      <div style={{ paddingLeft: '10px' }}>
                        <div className="prod-name">{item.productName}</div>
                        {item.productUrl && <a href={item.productUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0ea5e9', textDecoration: 'none', fontSize: '11px', display: 'inline-block', marginTop: '6px', fontWeight: '700', padding: '2px 6px', backgroundColor: '#f0f9ff', borderRadius: '4px' }}>🔗 링크 이동</a>}
                      </div>
                    </td>
                    
                    {activeTab === '국제배송' && (
                      <td 
                        className="td-cell" 
                        onClick={() => handleCopyTrackingNo(trackingNo)}
                        title={trackingNo !== '운송장 번호 없음' ? '클릭하여 복사' : ''}
                        style={{ 
                          fontSize: '12px', 
                          color: trackingNo === '운송장 번호 없음' ? '#94a3b8' : '#0ea5e9',
                          fontWeight: '700', 
                          wordBreak: 'break-all',
                          cursor: trackingNo === '운송장 번호 없음' ? 'default' : 'pointer',
                          textDecoration: trackingNo === '운송장 번호 없음' ? 'none' : 'underline'
                        }}
                      >
                        {trackingNo}
                        {trackingNo !== '운송장 번호 없음' && (
                          <span style={{ fontSize: '10px', marginLeft: '4px' }}>📋</span>
                        )}
                      </td>
                    )}
                    
                    <td className="td-cell" style={{ fontWeight: '900', color: '#ef4444', fontSize: '14px' }}>
                      ¥ {item.productPrice?.toLocaleString() || 0}
                    </td>

                    {activeTab === '장바구니' && <td className="td-cell"><button className="delete-btn" onClick={() => handleDelete(item.orderId)}>삭제</button></td>}
                    {activeTab === '입고완료' && <td className="td-cell"><button className="package-btn" onClick={() => handleIndividualPackage(item.orderId)}>개별포장</button></td>}
                    <td className="td-cell">
                      {/* 🌟 상세보기 버튼을 누를 때 데이터 Fetch가 동시에 발생하도록 addressId 전달 */}
                      <button className="detail-btn" onClick={() => toggleExpandRow(item.orderId, addressId)} style={{ backgroundColor: isExpanded ? '#1e293b' : '#fff', color: isExpanded ? '#fff' : '#475569' }}>
                        {isExpanded ? '접기 ▲' : '상세보기 ▼'}
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <td colSpan={getColSpanCount()} style={{ padding: '24px 20px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'flex-start' }}>
                          
                          <div style={{ width: '100px', height: '100px', flexShrink: 0, border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                            {item.productImageUrl ? <img src={item.productImageUrl} alt="product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '24px', opacity: 0.2 }}>📦</span>}
                          </div>
                          
                          <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>주문번호</span><div style={{ fontWeight: '900', color: '#ff4b2b', fontSize: '14px', wordBreak: 'break-all' }}>{item.orderId}</div></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>상품 옵션</span><div style={{ fontWeight: '800', color: '#1e293b', fontSize: '14px' }}>{item.option || item.productOption || '-'}</div></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>서비스 신청</span><div style={{ fontWeight: '800', color: '#1e293b', fontSize: '14px' }}>{item.services || item.serviceRequest || '-'}</div></div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>합포장 번호</span><div style={{ fontWeight: '800', color: '#1e293b', fontSize: '14px' }}>{bundleId}</div></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>등록 일자</span><div style={{ fontWeight: '800', color: '#1e293b', fontSize: '14px' }}>{formatDate(registeredAt)}</div></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>입고 완료일</span><div style={{ fontWeight: '800', color: '#1e293b', fontSize: '14px' }}>{formatDate(receivedAt)}</div></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>국제 배송일</span><div style={{ fontWeight: '800', color: '#1e293b', fontSize: '14px' }}>{formatDate(shippedAt)}</div></div>

                            {showAddressTabs.includes(activeTab) && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>수취인 주소 정보</span>
                                <div style={{ padding: '16px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {/* 🌟 여기서 이제 미쿠짱 테스트가 아닌 미리 불러온 실제 이름이 뜹니다 */}
                                      <span>👤 {recipientName}</span>
                                    </div>
                                    {addressId && (
                                      <button 
                                        onClick={() => toggleAddressExpand(item.orderId)}
                                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: isAddressExpanded ? '#f1f5f9' : '#fff', color: '#475569', cursor: 'pointer' }}
                                      >
                                        {isAddressExpanded ? '상세 주소 닫기 ▲' : '상세 주소 보기 ▼'}
                                      </button>
                                    )}
                                  </div>
                                  
                                  {isAddressExpanded && (
                                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      {loadingAddresses[String(addressId)] ? (
                                        <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                                          데이터베이스에서 주소 정보를 불러오는 중입니다...
                                        </div>
                                      ) : matchedAddress ? (
                                        <>
                                          <div style={{ color: '#475569', fontSize: '14px', lineHeight: '1.5' }}>
                                            {zipCode && <span style={{ fontWeight: '800', color: '#64748b' }}>[{zipCode}] </span>} 
                                            {address} {detailAddress}
                                          </div>
                                          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '4px' }}>
                                            {phone && <div style={{ fontSize: '13px', color: '#475569' }}><span style={{ fontWeight: '800', color: '#94a3b8', marginRight: '6px' }}>연락처</span> {phone}</div>}
                                            {customsCode && <div style={{ fontSize: '13px', color: '#475569' }}><span style={{ fontWeight: '800', color: '#94a3b8', marginRight: '6px' }}>통관부호</span> {customsCode}</div>}
                                          </div>
                                        </>
                                      ) : (
                                        <div style={{ fontSize: '13px', color: '#ef4444' }}>
                                          해당 주소 정보(ID: {addressId})를 찾을 수 없습니다. 삭제된 주소일 수 있습니다.
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {!addressId && (
                                    <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginTop: '4px' }}>선택된 배송지 정보가 없습니다.</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={getColSpanCount()} style={{ padding: '80px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>해당 상태의 주문 내역이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {activeTab === '국제배송' && items.length > 0 && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          padding: '20px', 
          backgroundColor: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: '12px',
          color: '#475569',
          fontSize: '14px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.01)'
        }}>
          <span style={{ fontSize: '20px' }}>💡</span>
          <div>
            <span style={{ fontWeight: '800', color: '#1e293b' }}>운송장 번호</span>를 클릭하면 복사됩니다.
          </div>
        </div>
      )}
    </div>
  );
}