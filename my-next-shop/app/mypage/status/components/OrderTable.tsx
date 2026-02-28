"use client";
import React, { useState } from 'react';

export default function OrderTable({ items, orders, activeTab, selectedItems, setSelectedItems, fetchOrders }: any) {
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const toggleAll = (checked: boolean) => {
    setSelectedItems(checked ? items.map((i: any) => i.orderId) : []);
  };

  const toggleItem = (orderId: string) => {
    const item = orders.find((o: any) => o.orderId === orderId);
    if (activeTab === '배송비 요청' && item?.bundleId) {
      const bundleItems = orders.filter((o: any) => o.bundleId === item.bundleId && o.status === '배송비 요청').map((o: any) => o.orderId);
      setSelectedItems((prev: string[]) => prev.includes(orderId) ? prev.filter(id => !bundleItems.includes(id)) : Array.from(new Set([...prev, ...bundleItems])));
    } else {
      setSelectedItems((prev: string[]) => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
    }
  };

  const toggleExpandRow = (orderId: string) => {
    setExpandedRows(prev => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => alert(`복사되었습니다: ${text}`));
  };

  const handleDelete = async (orderId: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      const res = await fetch(`/api/orders?orderId=${orderId}`, { method: 'DELETE' });
      if (res.ok) { alert('삭제되었습니다.'); fetchOrders(); }
    }
  };

  // 모바일/PC 반응형 진행상태 텍스트 분리
  const formatStatus = (status: string) => {
    if (status === '상품 결제 완료') {
      return (
        <>
          <span className="pc-text">상품 결제 완료</span>
          <span className="mobile-text">상품<br/>결제완료</span>
        </>
      );
    }
    if (status === '배송비 결제 완료') {
      return (
        <>
          <span className="pc-text">배송비 결제 완료</span>
          <span className="mobile-text">배송비<br/>결제 완료</span>
        </>
      );
    }
    return status;
  };

  // 🌟 진행상태에 따른 배경색 & 글자색(흰색) 적용 함수
  const getStatusStyle = (status: string): React.CSSProperties => {
    // 1단계 (구매 관련) : 파란색 바탕 + 흰색 글씨 + 텍스트 그림자
    if (['장바구니', '구매실패', '상품 결제 완료', '입고완료'].includes(status)) {
      return { 
        backgroundColor: '#3b82f6', 
        color: '#ffffff', 
        textShadow: '0px 1px 2px rgba(0,0,0,0.15)' 
      };
    }
    // 2단계 (배송 관련) : 주황색 바탕 + 흰색 글씨 + 텍스트 그림자
    if (['배송 준비중', '배송비 요청', '배송비 결제 완료', '국제배송'].includes(status)) {
      return { 
        backgroundColor: '#f97316', 
        color: '#ffffff', 
        textShadow: '0px 1px 2px rgba(0,0,0,0.15)' 
      };
    }
    // 기본값 : 밝은 회색 바탕 + 진한 회색 글씨
    return { 
      backgroundColor: '#f1f5f9', 
      color: '#334155' 
    };
  };

  return (
    <div className="table-wrapper">
      <style jsx>{`
        .table-wrapper {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background-color: #fff;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }
        .custom-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          min-width: 320px; 
        }
        .th-cell {
          padding: 14px 10px;
          border-right: 1px solid #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
          font-weight: 800;
          color: #475569;
          background-color: #f8fafc;
          white-space: nowrap;
          font-size: 13px;
          text-align: center;
        }
        .td-cell {
          padding: 16px 10px;
          border-right: 1px solid #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: middle;
          text-align: center;
        }
        
        .col-chk { width: 40px; }
        .col-name { width: auto; }
        .col-status { width: 140px; } 
        .col-btn { width: 100px; }

        .prod-name {
          font-size: 13px; font-weight: 700; color: #1e293b; line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; 
          overflow: hidden; text-overflow: ellipsis; word-break: break-all;
        }
        
        .status-badge {
          display: inline-block; 
          padding: 6px 10px; 
          border-radius: 8px; 
          font-weight: 900; 
          font-size: 12px; 
          text-align: center;
          line-height: 1.3;
          white-space: nowrap; 
        }
        
        .detail-btn {
          width: 100%; padding: 10px 0; border-radius: 8px; border: 1px solid #cbd5e1; 
          cursor: pointer; font-weight: 800; font-size: 12px; transition: all 0.2s; white-space: nowrap;
        }

        .mobile-text { display: none; }
        .pc-text { display: inline; }

        @media (max-width: 768px) {
          .th-cell { padding: 10px 4px; font-size: 12px; }
          .td-cell { padding: 12px 6px; }
          
          .col-chk { width: 30px; }
          .col-status { width: 80px; } 
          .col-btn { width: 80px; }

          .prod-name { font-size: 12px; }
          
          .status-badge { 
            padding: 6px 4px; 
            font-size: 11px; 
            white-space: normal; 
          }
          .detail-btn { padding: 8px 0; font-size: 11px; }

          .mobile-text { display: inline; }
          .pc-text { display: none; }
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
            <th className="th-cell col-name" style={{ textAlign: 'left' }}>상품명</th>
            <th className="th-cell col-status">진행상태</th>
            <th className="th-cell col-btn">상세보기</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any) => {
            const isExpanded = expandedRows.includes(item.orderId);
            const colSpanCount = ['장바구니', '입고완료', '배송비 요청'].includes(activeTab) ? 4 : 3;

            return (
              <React.Fragment key={item.orderId}>
                <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid #e2e8f0' }}>
                  {['장바구니', '입고완료', '배송비 요청'].includes(activeTab) && (
                    <td className="td-cell" onClick={() => toggleItem(item.orderId)}>
                      <input type="checkbox" readOnly checked={selectedItems.includes(item.orderId)} style={{ cursor: 'pointer' }} />
                    </td>
                  )}
                  
                  <td className="td-cell" style={{ textAlign: 'left' }}>
                    <div className="prod-name">
                      {item.productName}
                    </div>
                    {item.productUrl && (
                      <a href={item.productUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0ea5e9', textDecoration: 'none', fontSize: '11px', display: 'inline-block', marginTop: '6px', fontWeight: '700', padding: '2px 6px', backgroundColor: '#f0f9ff', borderRadius: '4px' }}>
                        🔗 링크 이동
                      </a>
                    )}
                  </td>
                  
                  <td className="td-cell">
                    <span className="status-badge" style={getStatusStyle(item.status)}>
                      {formatStatus(item.status)}
                    </span>
                  </td>
                  
                  <td className="td-cell">
                    <button 
                      className="detail-btn"
                      onClick={() => toggleExpandRow(item.orderId)} 
                      style={{ 
                        backgroundColor: isExpanded ? '#1e293b' : '#fff', 
                        color: isExpanded ? '#fff' : '#475569',
                      }}
                    >
                      {isExpanded ? '접기 ▲' : '상세보기 ▼'}
                    </button>
                  </td>
                </tr>

                {/* 아코디언 상세 영역 */}
                {isExpanded && (
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td colSpan={colSpanCount} style={{ padding: '20px', textAlign: 'left' }}>
                      
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        
                        {/* 상세 보기 내 이미지 영역 */}
                        <div style={{ width: '80px', height: '80px', flexShrink: 0, border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                          {item.productImageUrl ? (
                            <img src={item.productImageUrl} alt="product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '24px', opacity: 0.2 }}>📦</span>
                          )}
                        </div>

                        {/* 상세 정보 텍스트 그리드 */}
                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>주문번호</span>
                            <div style={{ fontWeight: '900', color: '#ff4b2b', fontSize: '14px', wordBreak: 'break-all' }}>{item.orderId}</div>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>{activeTab === '배송비 요청' ? '배송비 결제 금액' : '상품 금액'}</span>
                            <div style={{ fontWeight: '900', color: '#ef4444', fontSize: '15px' }}>
                              {activeTab === '배송비 요청' ? '₩' : '¥'} {activeTab === '배송비 요청' ? (item.secondPaymentAmount || 0).toLocaleString() : item.productPrice.toLocaleString()}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>수취인</span>
                            <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '14px' }}>{item.recipient || '-'}</div>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>등록일</span>
                            <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '14px' }}>{new Date(item.registeredAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 삭제 액션 영역 */}
                      {activeTab === '장바구니' && (
                        <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed #cbd5e1', textAlign: 'right' }}>
                          <button 
                            onClick={() => handleDelete(item.orderId)} 
                            style={{ padding: '8px 16px', backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '13px' }}
                          >
                            목록에서 삭제
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          
          {items.length === 0 && (
            <tr>
              <td colSpan={['장바구니', '입고완료', '배송비 요청'].includes(activeTab) ? 4 : 3} style={{ padding: '80px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '14px' }}>
                해당 상태의 주문 내역이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}