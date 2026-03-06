"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useMikuAlert } from '@/app/context/MikuAlertContext';
// 🌟 주문 상태 상수 및 라벨 임포트
import { ORDER_STATUS, ORDER_STATUS_LABEL, OrderStatus } from '@/src/types/order';

export default function OrderTable({ items, activeTab, selectedItems, setSelectedItems, fetchOrders, selectedAddress , onIndividualPacking , onDelete }: any) {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [statusSort, setStatusSort] = useState<'asc' | 'desc'>('asc');
  const { showAlert } = useMikuAlert();
  
  const [fetchedAddresses, setFetchedAddresses] = useState<Record<string, any>>({});
  const [loadingAddresses, setLoadingAddresses] = useState<Record<string, boolean>>({});
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => { setStatusSort('asc'); }, [activeTab]);

  const handleSortClick = () => setStatusSort(prev => prev === 'asc' ? 'desc' : 'asc');

  // 🌟 비교 로직을 Enum 키로 변경
  const showBundleAndRecipientTabs = [
    ORDER_STATUS.PREPARING, 
    ORDER_STATUS.PAYMENT_REQ, 
    ORDER_STATUS.PAYMENT_DONE, 
    ORDER_STATUS.SHIPPING
  ];

  const displayItems = useMemo(() => {
    if (!showBundleAndRecipientTabs.includes(activeTab)) return items;
    const groups: Record<string, any[]> = {};
    const singleItems: any[] = [];

    items.forEach((item: any) => {
      if (item.bundleId && item.bundleId !== '-') {
        if (!groups[item.bundleId]) groups[item.bundleId] = [];
        groups[item.bundleId].push(item);
      } else {
        singleItems.push(item);
      }
    });

    const bundledItems = Object.keys(groups).map(bundleId => {
      const group = groups[bundleId];
      return {
        ...group[0],
        isBundleGroup: true,
        orderId: `BUNDLE-${bundleId}`,
        productName: `📦 합배송 - [${bundleId}]`,
        productPrice: group.reduce((sum, i) => sum + (i.productPrice || 0), 0),
        originalItems: group,
      };
    });
    return [...bundledItems, ...singleItems];
  }, [items, activeTab]);

  const formatDate = (dateString: any) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ko-KR', { 
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
    });
  };

  const renderOrderDetail = (item: any) => {
    const subItems = item.isBundleGroup ? item.originalItems : [item];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid #e2e8f0',width: '100%', backgroundColor: '#f8fafc' }}>
        {subItems.map((sub: any, idx: number) => (
          <div key={sub.orderId} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px',width: '100%', borderBottom: (idx !== subItems.length - 1) ? '1px dashed #cbd5e1' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
              <div style={{ width: '80px', height: '80px', flexShrink: 0, border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {sub.productImageUrl ? <img src={sub.productImageUrl} alt="prod" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: '24px', opacity: 0.2 }}>📦</div>}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>상품명</span>
                  <div style={{ fontWeight: '800', fontSize: '15px', color: '#1e293b', lineHeight: '1.4', wordBreak: 'break-all' }}>{sub.productName}</div>
                </div>
                <div>
                  {sub.productUrl ? <a href={sub.productUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#3b82f6', textDecoration: 'none', padding: '4px 10px', border: '1px solid #bfdbfe', borderRadius: '4px', backgroundColor: '#eff6ff', fontWeight: 'bold', display: 'inline-block' }}>상품 페이지 바로가기 ↗</a> : <span style={{ fontSize: '11px', color: '#94a3b8' }}>연결 링크 없음</span>}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', width: '100%'}}>
              <div><span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px' }}>주문번호</span><div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>{sub.orderId}</div></div>
              <div><span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px' }}>금액</span><div style={{ fontWeight: '700', fontSize: '14px', color: '#ef4444' }}>¥ {sub.productPrice?.toLocaleString()}</div></div>
              <div><span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px' }}>옵션</span><div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>{sub.option || sub.productOption || '-'}</div></div>
              <div><span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px' }}>등록일자</span><div style={{ fontWeight: '700', fontSize: '12px', color: '#475569' }}>{formatDate(sub.registeredAt)}</div></div>
              <div><span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px' }}>입고 완료일</span><div style={{ fontWeight: '700', fontSize: '12px', color: '#475569' }}>{formatDate(sub.receivedAt)}</div></div>
              <div><span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px' }}>국제 배송일</span><div style={{ fontWeight: '700', fontSize: '12px', color: '#475569' }}>{formatDate(sub.shippedAt)}</div></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleShowAddressAlert = (addr: any) => {
    if (!addr) return showAlert("배송지 정보가 등록되어 있지 않습니다.");
    const message = [`[수취인 배송 정보]`, `━━━━━━━━━━━━━━`, `👤 성함: ${addr.recipientName || addr.name || '-'}`, `📞 연락처: ${addr.phone || '-'}`, `📮 우편번호: ${addr.zipCode || '-'}`, `🏠 주소: ${addr.address || ''} ${addr.detailAddress || ''}`, `📦 통관부호: ${addr.personalCustomsCode || '-'}`].join('\n');
    showAlert(message);
  };

  const toggleItem = (orderId: string) => {
    if (orderId.startsWith('BUNDLE-')) {
      const bundleId = orderId.replace('BUNDLE-', '');
      const groupItems = items.filter((o: any) => o.bundleId === bundleId).map((o: any) => o.orderId);
      setSelectedItems((prev: string[]) => prev.includes(groupItems[0]) ? prev.filter(id => !groupItems.includes(id)) : Array.from(new Set([...prev, ...groupItems])));
    } else {
      setSelectedItems((prev: string[]) => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
    }
  };

  const toggleExpandRow = (orderId: string, addressId?: string | number) => {
    setExpandedRows(prev => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
  };

  // 🌟 정렬 순서 가중치를 Enum 키 순서로 변경
  const STATUS_ORDER = [
    ORDER_STATUS.CART, 
    ORDER_STATUS.FAILED, 
    ORDER_STATUS.PAID, 
    ORDER_STATUS.ARRIVED, 
    ORDER_STATUS.PREPARING, 
    ORDER_STATUS.PAYMENT_REQ, 
    ORDER_STATUS.PAYMENT_DONE, 
    ORDER_STATUS.SHIPPING
  ];

  const sortedItems = useMemo(() => {
    const baseItems = displayItems;
    if (activeTab !== 'ALL') return baseItems;
    return [...baseItems].sort((a: any, b: any) => {
      const indexA = STATUS_ORDER.indexOf(a.status);
      const indexB = STATUS_ORDER.indexOf(b.status);
      return statusSort === 'asc' ? indexA - indexB : indexB - indexA;
    });
  }, [displayItems, activeTab, statusSort]);

  const getColSpanCount = () => {
    let count = 3; 

    //전체내역 탭에서 '진행상태' 컬럼이 있는 경우
    if (activeTab === 'ALL') count += 1;

    //체크박스 컬럼이 있는 경우 
    if ([ORDER_STATUS.CART, ORDER_STATUS.ARRIVED, ORDER_STATUS.PAYMENT_REQ].includes(activeTab)) count += 1; 

    //입고완료 탭에서 '개별포장' 컬럼이 있는 경우
    if (activeTab === ORDER_STATUS.ARRIVED) count += 1; 

    //수취인 정보 컬럼이 있는 경우
    if (showBundleAndRecipientTabs.includes(activeTab)) count += 1;

    //국제배송 탭에서 '운송장 번호' 컬럼이 있는 경우
    if (activeTab === ORDER_STATUS.SHIPPING) count += 1;

    // 배송비(₩): 배송비 요청 탭에서 상품 금액 오른쪽에 추가됨 (+1)
    if (activeTab === ORDER_STATUS.PAYMENT_REQ) count += 1;

    // 장바구니 탭일때 : 삭제 버튼이 있는경우
    if (activeTab === ORDER_STATUS.CART) count += 1;

    return count;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="table-wrapper">
        <style jsx>{`
          .table-wrapper { overflow-x: auto; border-radius: 12px; border: 1px solid #e2e8f0; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
          .custom-table { width: 100%; border-collapse: collapse; table-layout: fixed; min-width: 320px; }
          .th-cell { padding: 14px 10px; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #475569; background-color: #f8fafc; text-align: center; font-size: 13px; }
          .td-cell { padding: 16px 10px; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #e2e8f0; vertical-align: middle; text-align: center; }
          .col-chk { width: 40px; } .col-status { width: 140px; } .col-price { width: 100px; } .col-btn { width: 120px; }
          .col-action { width: 110px; }
          .prod-name { font-size: 13px; font-weight: 700; color: #1e293b; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-all; }
          .status-badge { display: inline-block; padding: 6px 10px; border-radius: 8px; font-weight: 900; font-size: 12px; }
          .detail-btn { width: 100%; padding: 10px 0; border-radius: 8px; border: 1px solid #cbd5e1; cursor: pointer; font-weight: 800; font-size: 12px; transition: all 0.2s; background-color: #fff; color: #475569; }
          .detail-btn:hover { background-color: #f8fafc; border-color: #94a3b8; }
          .pack-btn { padding: 6px 12px; border-radius: 6px; border: none; background-color: #10b981; color: #fff; font-weight: 800; font-size: 11px; cursor: pointer; }
          .pack-btn:hover { background-color: #059669; }
          .recipient-name { font-size: 12px; font-weight: 800; color: #475569; background-color: #f8fafc; padding: 4px 8px; border-radius: 6px; border: 1px solid #e2e8f0; cursor: pointer; }
          .delete-btn {
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid #fee2e2;
            background-color: #fff;
            color: #ef4444;
            font-weight: 800;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .delete-btn:hover {
            background-color: #fef2f2;
            border-color: #fca5a5;
          }
        `}</style>

        <table className="custom-table">
          <thead>
            <tr>
              {[ORDER_STATUS.CART, ORDER_STATUS.ARRIVED, ORDER_STATUS.PAYMENT_REQ].includes(activeTab) && <th className="th-cell col-chk"><input type="checkbox" readOnly checked={items.length > 0 && selectedItems.length === items.length} /></th>}
              {activeTab === 'ALL' && <th className="th-cell col-status" onClick={handleSortClick} style={{cursor:'pointer'}}>진행상태 {statusSort === 'asc' ? '▲' : '▼'}</th>}
              <th className="th-cell">상품명</th>
              {/* 🌟 1. 국제 배송 탭일 때 운송장 번호 헤더 추가 */}
              {activeTab === ORDER_STATUS.SHIPPING && (
                <th className="th-cell" style={{ width: '180px', color: '#2563eb' }}>운송장 번호</th>
              )}
              {showBundleAndRecipientTabs.includes(activeTab) && <th className="th-cell col-recipient">수취인</th>}
              <th className="th-cell col-price">상품 금액</th>
              {/* 🌟 2. 배송비 요청 탭일 때 배송비 컬럼 추가 */}
              {activeTab === ORDER_STATUS.PAYMENT_REQ && (
                <th className="th-cell" style={{ width: '120px', color: '#ea580c' }}>배송비 (₩)</th>
              )}
              {activeTab === ORDER_STATUS.CART && <th className="th-cell col-action">삭제</th>}
              {activeTab === ORDER_STATUS.ARRIVED && <th className="th-cell col-action">액션</th>}
              
              <th className="th-cell col-btn">상세보기</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item: any) => {
              const isExpanded = expandedRows.includes(item.orderId);
              const addressId = item.addressId || item.address_id;
              const matchedAddress = fetchedAddresses[String(addressId)] || item.address;
              const recipientName = matchedAddress?.recipientName || matchedAddress?.name || '미지정';

              return (
                <React.Fragment key={item.orderId}>
                  <tr>
                    {[ORDER_STATUS.CART, ORDER_STATUS.ARRIVED, ORDER_STATUS.PAYMENT_REQ].includes(activeTab) && (
                      <td className="td-cell" onClick={() => toggleItem(item.orderId)}>
                        <input type="checkbox" readOnly checked={selectedItems.includes(item.isBundleGroup ? item.originalItems[0].orderId : item.orderId)} />
                      </td>
                    )}
                    {activeTab === 'ALL' && <td className="td-cell"><span className="status-badge" style={{backgroundColor: '#3b82f6', color: '#fff'}}>{item.status}</span></td>}
                    <td className="td-cell" style={{ textAlign: 'left' }}>
                      <div style={{ paddingLeft: '10px' }}>
                        <div className="prod-name" style={{ color: item.isBundleGroup ? '#f97316' : '#1e293b' }}>{item.productName}</div>
                        {item.isBundleGroup && <div style={{fontSize:'11px', color:'#94a3b8', marginTop:'4px'}}>합배송 총 {item.originalItems.length}건</div>}
                      </div>
                    </td>

                    {/* 🌟 2. 국제 배송 탭일 때 운송장 번호 데이터 셀 추가 */}
                    {activeTab === ORDER_STATUS.SHIPPING && (
                      <td className="td-cell">
                        {item.trackingNo ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                            <span style={{ fontWeight: '800', color: '#2563eb', fontSize: '14px' }}>
                              {item.trackingNo}
                            </span>
                            {/* 클릭 시 배송 조회 페이지로 연결하는 버튼 (예시: 우체국 택배) */}
                            <button 
                              onClick={() => window.open(`https://service.epost.go.kr/trace.RetrieveDomRcvCondition.comm?displayHeader=N&sid1=${item.trackingNumber}`, '_blank')}
                              style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: '#f8fafc' }}
                            >
                              배송조회 🔍
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>발급 대기 중</span>
                        )}
                      </td>
                    )}
                    
                    {showBundleAndRecipientTabs.includes(activeTab) && (
                      <td className="td-cell">
                        <span className="recipient-name" onClick={() => handleShowAddressAlert(matchedAddress)}>👤 {recipientName}</span>
                      </td>
                    )}
                    <td className="td-cell" style={{ fontWeight: '900', color: '#ef4444' }}>¥ {item.productPrice?.toLocaleString()}</td>
                    
                    {/* 🌟 3. 배송비 데이터 출력 (secondPaymentAmount 사용) */}
                    {activeTab === ORDER_STATUS.PAYMENT_REQ && (
                      <td className="td-cell" style={{ fontWeight: '900', color: '#ea580c', backgroundColor: '#fff7ed' }}>
                        ₩ {(item.secondPaymentAmount || 0).toLocaleString()}
                      </td>
                    )}
                    
                    {/* 🚀 액션 셀: 탭에 따라 버튼 분기 */}
                    {(activeTab === ORDER_STATUS.ARRIVED || activeTab === ORDER_STATUS.CART) && (
                      <td className="td-cell">
                        {activeTab === ORDER_STATUS.ARRIVED && !item.isBundleGroup && (
                          <button className="pack-btn" onClick={() => onIndividualPacking(item)}>개별 포장</button>
                        )}
                        
                        {/* 🗑️ 장바구니 탭 전용 삭제 버튼 추가 */}
                        {activeTab === ORDER_STATUS.CART && (
                          <button 
                            className="delete-btn" 
                            onClick={(e) => {
                              e.stopPropagation(); // 행 클릭 이벤트 전파 방지
                              onDelete(item.orderId); // DB 삭제 함수 호출
                            }}
                          >
                            상품 삭제
                          </button>
                        )}

                      </td>
                    )}

                    {/* 🌟 입고완료 탭 전용 개별 포장 버튼 */}
                    {activeTab === ORDER_STATUS.ARRIVED && (
                      <td className="td-cell">
                        {!item.isBundleGroup && (
                          <button className="pack-btn" onClick={() => onIndividualPacking(item)}>개별 포장</button>
                        )}
                      </td>
                    )}

                    <td className="td-cell">
                      <button className="detail-btn" onClick={() => toggleExpandRow(item.orderId, addressId)} style={{ backgroundColor: isExpanded ? '#1e293b' : '#fff', color: isExpanded ? '#fff' : '#475569' }}>
                        {isExpanded ? '접기 ▲' : (item.isBundleGroup ? '상품 정보 보기 ▼' : '상세보기 ▼')}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                    {/* 🌟 colSpan을 탭 상황에 맞춰 동적으로 가져오고 패딩을 0으로 설정 */}
                    <td colSpan={getColSpanCount()} style={{ padding: '0', border: 'none' }}>
                      <div style={{ 
                        width: '100%', 
                        backgroundColor: '#f8fafc', // 전체 회색 배경 적용
                        borderBottom: '1px solid #e2e8f0' 
                      }}>
                        {renderOrderDetail(item)}
                      </div>
                    </td>
                  </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 디버그 UI */}
      <div style={{ marginTop: '20px', borderTop: '1px dashed #cbd5e1', paddingTop: '20px' }}>
        <button onClick={() => setShowDebug(!showDebug)} style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#fff', borderRadius: '8px', fontWeight: 'bold', border: 'none' }}>🛠️ 디버그 모드 {showDebug ? '끄기' : '켜기'}</button>
        {showDebug && (
          <pre style={{ backgroundColor: '#1e293b', color: '#a5b4fc', padding: '16px', borderRadius: '8px', marginTop: '10px', fontSize: '12px' }}>
            {JSON.stringify(items, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}