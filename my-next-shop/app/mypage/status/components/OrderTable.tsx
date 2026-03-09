"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useMikuAlert } from '@/app/context/MikuAlertContext';
import { ORDER_STATUS, ORDER_STATUS_LABEL, OrderStatus } from '@/src/types/order';

export default function OrderTable({ items, activeTab, selectedItems, setSelectedItems, fetchOrders, selectedAddress , onIndividualPacking , onDelete }: any) {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [statusSort, setStatusSort] = useState<'asc' | 'desc'>('asc');
  const { showAlert } = useMikuAlert();
  
  const [fetchedAddresses, setFetchedAddresses] = useState<Record<string, any>>({});
  const [isMobile, setIsMobile] = useState(false);

  // 📱 모바일 감지
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSortClick = () => setStatusSort(prev => prev === 'asc' ? 'desc' : 'asc');

  // --- 🎨 스타일 정의 ---
  const styles = useMemo(() => ({
    label: { fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: '500' as const },
    value: { fontWeight: '700' as const, fontSize: '13px', color: '#1e293b', lineHeight: '1.2' },
    imageBox: { width: '80px', height: '80px', flexShrink: 0, border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    badge: (bgColor: string) => ({ display: 'inline-block', padding: '6px 10px', borderRadius: '8px', fontWeight: '900' as const, fontSize: '12px', backgroundColor: bgColor, color: '#fff' }),
    mobileCard: { backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }
  }), []);

  // 🚀 데이터 그룹화 및 정렬
  const showBundleAndRecipientTabs = [ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING];
  
  const displayItems = useMemo(() => {
    if (!showBundleAndRecipientTabs.includes(activeTab)) return items;
    const groups: Record<string, any[]> = {};
    const singleItems: any[] = [];
    items.forEach((item: any) => {
      if (item.bundleId && item.bundleId !== '-') {
        if (!groups[item.bundleId]) groups[item.bundleId] = [];
        groups[item.bundleId].push(item);
      } else { singleItems.push(item); }
    });
    const bundledItems = Object.keys(groups).map(bid => ({
      ...groups[bid][0], isBundleGroup: true, orderId: `BUNDLE-${bid}`, productName: `📦 합배송 - [${bid}]`, 
      productPrice: groups[bid].reduce((s, i) => s + (i.productPrice || 0), 0), originalItems: groups[bid]
    }));
    return [...bundledItems, ...singleItems];
  }, [items, activeTab]);

  const sortedItems = useMemo(() => {
    const STATUS_ORDER = [ORDER_STATUS.CART, ORDER_STATUS.FAILED, ORDER_STATUS.PAID, ORDER_STATUS.ARRIVED, ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING];
    if (activeTab !== 'ALL') return displayItems;
    return [...displayItems].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  }, [displayItems, activeTab]);

  // 🌟 전체 선택 로직
  const handleToggleAll = () => {
    const allIds = sortedItems.map((item: any) => item.isBundleGroup ? item.originalItems[0].orderId : item.orderId);
    setSelectedItems(selectedItems.length === allIds.length && allIds.length > 0 ? [] : allIds);
  };

  const toggleItem = (orderId: string) => {
    setSelectedItems((prev: string[]) => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
  };

  const getColSpanCount = () => {
    let count = 4;
    if (activeTab === 'ALL') count += 1;
    if (showBundleAndRecipientTabs.includes(activeTab)) count += 1;
    if (activeTab === ORDER_STATUS.CART || activeTab === ORDER_STATUS.ARRIVED) count += 1;
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
        /* 📱 모바일 뷰 */
        <div style={{ padding: '8px' }}>
          {sortedItems.map((item: any) => {
            const isExpanded = expandedRows.includes(item.orderId);
            const qty = item.productCount || item.quantity || 1;
            const itemId = item.isBundleGroup ? item.originalItems[0].orderId : item.orderId;
            return (
              <div key={item.orderId} style={styles.mobileCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                   <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="checkbox" checked={selectedItems.includes(itemId)} onChange={() => toggleItem(itemId)} />
                      <span style={styles.badge('#3b82f6')}>{item.status}</span>
                   </div>
                   <span style={{ fontWeight: '900', color: '#ef4444' }}>¥ {((item.productPrice || 0) * qty).toLocaleString()}</span>
                </div>
                <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '10px' }}>{item.productName}</div>
                <button style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }} 
                        onClick={() => setExpandedRows(prev => prev.includes(item.orderId) ? prev.filter(id => id !== item.orderId) : [...prev, item.orderId])}>
                  {isExpanded ? '접기 ▲' : '상세보기 ▼'}
                </button>
                {isExpanded && renderOrderDetail(item)}
              </div>
            );
          })}
        </div>
      ) : (
        /* 💻 PC 테이블 뷰 */
        <div className="table-wrapper">
          <style jsx>{`
            .table-wrapper { overflow-x: auto; border-radius: 12px; border: 1px solid #e2e8f0; background-color: #fff; }
            .custom-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            .th-cell { padding: 12px 5px; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #475569; background-color: #f8fafc; text-align: center; font-size: 13px; white-space: nowrap; }
            .td-cell { padding: 12px 5px; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #e2e8f0; vertical-align: middle; text-align: center; }
            .col-chk { width: 45px; } .col-status { width: 90px; } .col-price { width: 130px; } .col-recipient { width: 100px; } .col-action { width: 100px; } .col-btn { width: 100px; }
            .col-name { width: auto; }
            .prod-name { font-size: 13px; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; width: 100%; text-align: left; padding: 0 15px; }
          `}</style>
          <table className="custom-table">
            <thead>
              <tr>
                {[ORDER_STATUS.CART, ORDER_STATUS.ARRIVED, ORDER_STATUS.PAYMENT_REQ].includes(activeTab) && (
                  <th className="th-cell col-chk"><input type="checkbox" onChange={handleToggleAll} checked={sortedItems.length > 0 && selectedItems.length === sortedItems.length} /></th>
                )}
                {activeTab === 'ALL' && <th className="th-cell col-status">상태</th>}
                <th className="th-cell col-name">상품명</th>
                {showBundleAndRecipientTabs.includes(activeTab) && <th className="th-cell col-recipient">수취인</th>}
                <th className="th-cell col-price">상품 금액</th>
                {(activeTab === ORDER_STATUS.CART || activeTab === ORDER_STATUS.ARRIVED) && (
                  <th className="th-cell col-action">{activeTab === ORDER_STATUS.CART ? '삭제' : '개별 포장'}</th>
                )}
                <th className="th-cell col-btn">상세보기</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item: any) => {
                const isExpanded = expandedRows.includes(item.orderId);
                const itemId = item.isBundleGroup ? item.originalItems[0].orderId : item.orderId;
                const unitPrice = item.productPrice || 0;
                const qty = item.productCount || item.quantity || 1;
                const rowTotalPrice = unitPrice * qty;

                return (
                  <React.Fragment key={item.orderId}>
                    <tr>
                      <td className="td-cell col-chk"><input type="checkbox" checked={selectedItems.includes(itemId)} onChange={() => toggleItem(itemId)} /></td>
                      {activeTab === 'ALL' && <td className="td-cell"><span style={styles.badge('#3b82f6')}>{item.status}</span></td>}
                      <td className="td-cell col-name"><div className="prod-name" title={item.productName}>{item.productName}</div></td>
                      {showBundleAndRecipientTabs.includes(activeTab) && <td className="td-cell">👤 {item.address?.recipientName || '미지정'}</td>}
                      
                      <td className="td-cell col-price">
                        <div style={{ fontWeight: '900', color: '#ef4444', fontSize: '15px' }}>¥ {rowTotalPrice.toLocaleString()}</div>
                        {qty >= 2 && (
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', marginTop: '4px' }}>
                            (¥ {unitPrice.toLocaleString()} x {qty})
                          </div>
                        )}
                      </td>

                      {(activeTab === ORDER_STATUS.CART || activeTab === ORDER_STATUS.ARRIVED) && (
                        <td className="td-cell col-action">
                          {activeTab === ORDER_STATUS.CART ? 
                            <button onClick={() => onDelete(item.orderId)} style={{ color: '#ef4444', border: '1px solid #fee2e2', background: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '800', fontSize: '12px' }}>삭제</button> : 
                            <button onClick={() => onIndividualPacking(item)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '800', fontSize: '12px' }}>개별 포장</button>
                          }
                        </td>
                      )}
                      <td className="td-cell col-btn">
                        <button style={{ padding: '6px 12px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer' }} onClick={() => setExpandedRows(prev => prev.includes(item.orderId) ? prev.filter(id => id !== item.orderId) : [...prev, item.orderId])}>
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