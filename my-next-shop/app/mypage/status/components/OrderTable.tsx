'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useMikuAlert } from '@/app/context/MikuAlertContext';
import { ORDER_STATUS, ORDER_STATUS_LABEL } from '@/src/types/order';

// 🌟 [추가할 부분 1] 정렬을 위한 상태 우선순위 정의 (요청 -> 진행중 -> 창고 -> 배송 순)
const STATUS_PRIORITY: Record<string, number> = {
  [ORDER_STATUS.CART]: 1,
  [ORDER_STATUS.BID_PENDING]: 2,
  [ORDER_STATUS.BIDDING]: 3,
  [ORDER_STATUS.BID_SUCCESS]: 4,
  [ORDER_STATUS.PAID]: 5,
  [ORDER_STATUS.FAILED]: 6,
  [ORDER_STATUS.ARRIVED]: 7,
  [ORDER_STATUS.PREPARING]: 8,
  [ORDER_STATUS.PAYMENT_REQ]: 9,
  [ORDER_STATUS.PAYMENT_DONE]: 10,
  [ORDER_STATUS.SHIPPING]: 11,
};

// =================================================================
// 1. 비즈니스 로직 영역 (Business Logic Layer)
// 실시간 타이머 계산, 입찰 처리, 테이블 열(ColSpan) 계산 등 기능 전담
// =================================================================
function useOrderTableLogic({ activeTab, fetchOrders }: any) {
  const { showConfirm, showAlert } = useMikuAlert();
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [now, setNow] = useState(new Date());

  // 📱 모바일 감지 및 🌟 실시간 1초 타이머
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);

    const timer = setInterval(() => setNow(new Date()), 1000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(timer);
    };
  }, []);

  const toggleRow = (orderId: string) => {
    setExpandedRows(prev => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]);
  };

  // 🚀 남은 시간 계산 로직 (데이터만 반환)
  const getAuctionTimeData = useCallback((dateString: string | Date) => {
    if (!dateString) return { text: "-", isUrgent: false, isEnded: false };
    
    const diff = new Date(dateString).getTime() - now.getTime();

    if (diff <= 0) return { text: "경매 종료", isUrgent: false, isEnded: true };

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    if (d > 0) return { text: `${d}일 ${h}시간`, isUrgent: false, isEnded: false };
    if (h > 0) return { text: `${h}시간 ${m}분`, isUrgent: false, isEnded: false };
    return { text: `${m}분 ${s}초`, isUrgent: true, isEnded: false };
  }, [now]);

  // 🚀 동적 테이블 컬럼 수 계산
  const getColSpanCount = useCallback(() => {
    let count = 3; // 기본: 상품명, 가격, 상세보기
    if (activeTab === 'ALL') count += 1; 
    if ([ORDER_STATUS.CART, ORDER_STATUS.ARRIVED, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.BID_PENDING, ORDER_STATUS.BID_SUCCESS, 'BIDDING'].includes(activeTab)) count += 1; // 체크박스
    if ([ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING].includes(activeTab)) count += 1; // 수취인
    if (activeTab === 'BID_PENDING' || activeTab === 'BIDDING') count += 2; // 남은시간, 내 입찰금액
    if (activeTab === ORDER_STATUS.SHIPPING) count += 1; // 운송장
    if (activeTab === ORDER_STATUS.PAYMENT_REQ) count += 1; // 배송비
    if ([ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING].includes(activeTab)) count += 1; // 관리 버튼
    if (activeTab === 'BIDDING') count += 1; // 경매 상태
    return count;
  }, [activeTab]);

  return {
    expandedRows, toggleRow, isMobile, now, showConfirm, showAlert,
    getAuctionTimeData, getColSpanCount
  };
}


// =================================================================
// 2. 화면 컴포넌트 영역 (View Layer)
// 인라인 스타일을 배제하고 시각적 요소와 클래스명 위주로 구성합니다.
// =================================================================
// 🌟 입찰 금액 입력 프리미엄 모달 콘텐츠
const BidInputContent = ({ item, onChange }: { item: any, onChange: (val: string) => void }) => {
  const [amount, setAmount] = useState("");
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAmount(val);
    onChange(val);
  };

  const originalBid = item.myBidPrice || 0;
  const parsedAmount = parseInt(amount) || 0;
  const totalMyBid = originalBid + parsedAmount;

  return (
    <div className="miku-bid-modal notranslate" translate="no">
      <p className="prod-name-title">{item.productName}</p>
      
      <div className="info-row">
        <span className="label">현재 최고가</span>
        <span className="val highlight">¥ {item.productPrice?.toLocaleString()}</span>
      </div>
      
      <div className="info-row my-bid-row">
        <span className="label">내 입찰 금액</span>
        <div className="bid-calc">
          {parsedAmount > 0 ? (
            <>
              <span className="old-bid">¥ {originalBid.toLocaleString()}</span>
              <span className="arrow">→</span>
              <span className="new-bid">¥ {totalMyBid.toLocaleString()}</span>
            </>
          ) : (
            <span className="new-bid">¥ {originalBid.toLocaleString()}</span>
          )}
        </div>
      </div>

      <div className="input-container">
        <label>추가 입찰 금액 (¥)</label>
        <input 
          type="number" placeholder="추가할 금액 입력"
          value={amount} onChange={handleInputChange}
          className="premium-input"
        />
      </div>
    </div>
  );
};

// 🌟 메인 테이블 컴포넌트
export default function OrderTable({ items, activeTab, selectedItems, setSelectedItems, fetchOrders, selectedAddress, onIndividualPacking, onDelete }: any) {
  const { 
    expandedRows, toggleRow, isMobile, showConfirm, showAlert, 
    getAuctionTimeData, getColSpanCount 
  } = useOrderTableLogic({ activeTab, fetchOrders });

  const isAuctionTab = activeTab === 'BID_PENDING' || activeTab === 'BIDDING';
  const showBundleAndRecipientTabs = [ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING];

  // 🌟 [신규] 상태값에 따른 테마 색상 반환 함수
  const getBadgeTheme = (status: string) => {
    if ([ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING].includes(status as any)) return 'theme-blue';
    if ([ORDER_STATUS.FAILED].includes(status as any)) return 'theme-red';
    if ([ORDER_STATUS.BIDDING, ORDER_STATUS.BID_SUCCESS, ORDER_STATUS.PAID].includes(status as any)) return 'theme-purple';
    if ([ORDER_STATUS.ARRIVED, ORDER_STATUS.PREPARING].includes(status as any)) return 'theme-green';
    if ([ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING].includes(status as any)) return 'theme-orange';
    return 'theme-default';
  };
  
  // 입찰 처리 로직
  const handleBidClick = async (item: any) => {
    let finalAmount = "";
    const isConfirmed = await showConfirm(<BidInputContent item={item} onChange={(val) => { finalAmount = val; }} />);

    if (isConfirmed) {
      const amount = parseInt(finalAmount);
      if (!amount || amount <= 0) return showAlert("올바른 금액을 입력해주세요.", "error");

      const deposit = amount <= 20000 ? 2000 : Math.floor(amount * 0.1);

      try {
        const res = await fetch('/api/orders/bid', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: item.orderId, amount, deposit })
        });
        
        if (res.ok) {
          // 추가 입찰이 성공하면 상태를 다시 '입찰 대기중(PENDING)'으로 즉시 변경
          await fetch('/api/orders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates: [{ id: item.orderId, bidStatus: 'PENDING' }] })
          });

          showAlert(`¥${amount.toLocaleString()} 추가 입찰 완료!`, 'success');
          fetchOrders();
        } else {
          const errorData = await res.json();
          showAlert(errorData.error || "입찰에 실패했습니다.", "error");
        }
      } catch (error) { showAlert("통신 에러가 발생했습니다.", "error"); }
    }
  };


  const toggleCheck = (orderId: string) => {
    if (selectedItems.includes(orderId)) setSelectedItems(selectedItems.filter((id: string) => id !== orderId));
    else setSelectedItems([...selectedItems, orderId]);
  };

  return (
    <div className="miku-ordertable-wrapper">
      
      {isMobile ? (
        <div className="mobile-fallback">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <p>상세 내역은 PC 환경에 최적화되어 있습니다.<br/>화면을 옆으로 스크롤하여 확인해주세요.</p>
        </div>
      ) : null}

      <div className="table-container anim-slide-up">
        <table className="premium-table">
          <thead>
            <tr>
              {/* 체크박스 헤더 */}
              {[ORDER_STATUS.CART, ORDER_STATUS.ARRIVED, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.BID_PENDING, ORDER_STATUS.BID_SUCCESS, 'BIDDING'].includes(activeTab) && (
                <th className="th-cell th-check"><div className="header-spacer"></div></th>
              )}
              {activeTab === 'ALL' && <th className="th-cell th-status">상태</th>}
              <th className="th-cell th-product">상품명</th>
              
              {isAuctionTab && <th className="th-cell th-time">남은 시간</th>}
              <th className="th-cell th-price">{isAuctionTab ? '현재 최고가' : '상품 금액'}</th>
              {isAuctionTab && <th className="th-cell th-mybid">내 입찰금액</th>}
              
              {activeTab === 'BIDDING' && <th className="th-cell th-auction-status">경매 상태</th>}
              {showBundleAndRecipientTabs.includes(activeTab) && <th className="th-cell th-recipient">수취인</th>}
              {activeTab === ORDER_STATUS.PAYMENT_REQ && <th className="th-cell th-shipping-fee">배송비(₩)</th>}
              {activeTab === ORDER_STATUS.SHIPPING && <th className="th-cell th-tracking">운송장 번호</th>}

              {/* 관리 버튼 헤더 */}
              {([ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING].includes(activeTab)) && (
                <th className="th-cell th-manage">관리</th>
              )}
              <th className="th-cell th-detail">상세보기</th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={getColSpanCount()} className="empty-row">해당하는 상품이 없습니다.</td></tr>
            ) : (
              items.map((item: any) => {
                const isExpanded = expandedRows.includes(item.orderId);
                const isChecked = selectedItems.includes(item.orderId);
                const timeData = getAuctionTimeData(item.auctionEndDate);

                return (
                  <React.Fragment key={item.orderId}>
                    <tr className={`tr-row ${isChecked ? 'selected' : ''}`}>
                      
                      {/* 체크박스 */}
                      {[ORDER_STATUS.CART, ORDER_STATUS.ARRIVED, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.BID_PENDING, ORDER_STATUS.BID_SUCCESS, 'BIDDING'].includes(activeTab) && (
                        <td className="td-cell">
                          <div className={`custom-checkbox ${isChecked ? 'checked' : ''}`} onClick={() => toggleCheck(item.orderId)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                        </td>
                      )}

                      {/* 🌟 전체내역 탭일 때 동적으로 클래스(getBadgeTheme) 부여 */}
                      {activeTab === 'ALL' && (
                        <td className="td-cell">
                          <span className={`badge-status ${getBadgeTheme(item.status)}`}>
                            {ORDER_STATUS_LABEL[item.status as keyof typeof ORDER_STATUS_LABEL] || item.status}
                          </span>
                        </td>
                      )}
                      
                      <td className="td-cell td-product">
                        <div className="prod-name-box" title={item.productName}>{item.productName}</div>
                      </td>

                      {isAuctionTab && (
                        <td className="td-cell">
                          <span className={`time-text ${timeData.isEnded ? 'ended' : ''} ${timeData.isUrgent ? 'time-pulse urgent' : ''}`}>
                            {timeData.text}
                          </span>
                        </td>
                      )}

                      <td className="td-cell"><div className="price-val">¥ {(item.productPrice || 0).toLocaleString()}</div></td>

                      {isAuctionTab && (
                        <td className="td-cell"><div className="mybid-val">¥ {(item.myBidPrice || 0).toLocaleString()}</div></td>
                      )}

                      {/* 경매 상태 렌더링 */}
                      {activeTab === 'BIDDING' && (
                        <td className="td-cell">
                          {item.bidStatus === 'PENDING' ? <span className="badge-bid pending">입찰 대기중</span>
                          : item.bidStatus === 'ADDITIONAL' ? <span className="badge-bid additional">추가 입찰 완료</span>
                          : item.bidStatus === 'COMPLETED' ? <span className="badge-bid completed">입찰 완료</span>
                          : <span className="badge-bid default">상태 확인중</span>}
                        </td>
                      )}

                      {showBundleAndRecipientTabs.includes(activeTab) && <td className="td-cell">{item.address?.recipientName || '미지정'}</td>}
                      {activeTab === ORDER_STATUS.PAYMENT_REQ && <td className="td-cell font-bold">₩ {(item.secondPaymentAmount || 0).toLocaleString()}</td>}
                      {activeTab === ORDER_STATUS.SHIPPING && <td className="td-cell">{item.trackingNo || '준비중'}</td>}
                      
                      {/* 🛒 장바구니나 📌 보증금 대기 상태일 때만 '삭제' 버튼만 남김 */}
                      {([ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING].includes(activeTab)) && (
                        <td className="td-cell">
                          <div className="action-btn-group">
                            <button className="btn-action btn-del" onClick={() => onDelete(item.orderId)}>삭제</button>
                          </div>
                        </td>
                      )}

                      <td className="td-cell">
                        <button className={`btn-expand ${isExpanded ? 'active' : ''}`} onClick={() => toggleRow(item.orderId)}>
                          {isExpanded ? '접기 ▲' : '보기 ▼'}
                        </button>
                      </td>
                    </tr>

                    {/* 확장 아코디언 영역 */}
                    {isExpanded && (
                      <tr className="expanded-tr">
                        <td colSpan={getColSpanCount()} className="expanded-td">
                          <div className="expanded-content">
                            {(item.isBundleGroup ? item.originalItems : [item]).map((sub: any, idx: number) => (
                              <div key={sub.orderId} className={`expanded-item ${idx !== (item.isBundleGroup ? item.originalItems.length : 1) - 1 ? 'border-bottom' : ''}`}>
                                <div className="sub-name">{sub.productName}</div>
                                <div className="sub-price">¥ {(sub.productPrice || 0).toLocaleString()} <span className="sub-qty">x {sub.productCount || sub.quantity || 1}개</span></div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* 🌟 경매 상황 탭일 때 테이블 하단에 노출되는 추가 입찰 버튼 */}
      {activeTab === 'BIDDING' && (
        <div className="anim-slide-up delay-3" style={{ marginTop: '24px' }}>
          <div className="package-action-group">
            <button 
              className={`btn-package btn-combine ${selectedItems.length === 1 ? 'active' : 'disabled'}`}
              onClick={() => {
                const targetItem = items.find((i: any) => i.orderId === selectedItems[0]);
                if (targetItem) handleBidClick(targetItem);
              }} 
              disabled={selectedItems.length !== 1}
            >
              🔨 선택한 상품 추가 입찰하기
            </button>
          </div>
          {selectedItems.length !== 1 && <p className="bundle-helper" style={{ textAlign: 'right', color: '#ef4444', fontSize: '13px', fontWeight: 600, marginTop: '8px' }}>* 추가 입찰할 상품을 1개만 선택해주세요.</p>}
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. 디자인 영역 (CSS Layer) */}
      {/* 글로벌 오염을 막기 위해 모든 클래스는 .miku-ordertable- 관련 스코프로 작성 */}
      {/* ================================================================= */}
      <style jsx global>{`
        .miku-ordertable-wrapper {
          width: 100%;
          font-family: 'Pretendard', "Noto Sans KR", sans-serif;
        }

        /* 📱 모바일 폴백 메시지 */
        .mobile-fallback {
          display: none;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 10px;
          padding: 10px 16px;
          color: #64748b;
          margin-bottom: 16px;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .mobile-fallback svg { width: 20px; height: 20px; color: #94a3b8; flex-shrink: 0; }
        .mobile-fallback p { font-size: 12px; line-height: 1.4; margin: 0; text-align: left; }

        @media (max-width: 768px) { .mobile-fallback { display: flex; } }

        /* 🌟 테이블 컨테이너 (가로 스크롤 허용, 둥근 모서리 보존) */
        .table-container {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 10px 30px rgba(0,0,0,0.02);
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        /* 🌟 프리미엄 테이블 스타일 */
        .premium-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 800px;
        }
        
        .th-cell {
          padding: 18px 12px;
          background: #f8fafc;
          font-size: 14px;
          font-weight: 800;
          color: #475569;
          text-align: center;
          border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
        }
        .th-cell:first-child { border-top-left-radius: 20px; }
        .th-cell:last-child { border-top-right-radius: 20px; }

        .td-cell {
          padding: 16px 12px;
          font-size: 14px;
          color: #334155;
          text-align: center;
          vertical-align: middle;
          border-bottom: 1px solid #f1f5f9;
        }
        .tr-row { transition: all 0.2s ease; }
        .tr-row:hover { background: #f8fafc; }
        .tr-row.selected { background: #fff8f6; }

        .empty-row { padding: 60px; text-align: center; color: #94a3b8; font-weight: 600; }

        /* 🌟 상품명 영역 */
        .td-product { text-align: left; max-width: 250px; }
        .prod-name-box {
          font-weight: 700; color: #0f172a;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          padding: 0 8px;
        }

        /* 🌟 커스텀 체크박스 */
        .custom-checkbox {
          width: 22px; height: 22px; margin: 0 auto;
          border-radius: 6px; border: 2px solid #cbd5e1;
          background: #ffffff; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .custom-checkbox svg { width: 12px; height: 12px; color: white; opacity: 0; transform: scale(0.5); transition: all 0.2s; }
        .custom-checkbox.checked { border-color: transparent; background: linear-gradient(135deg, #ff4b2b 0%, #e63e1f 100%); box-shadow: 0 2px 6px rgba(255, 75, 43, 0.3); }
        .custom-checkbox.checked svg { opacity: 1; transform: scale(1); }

        /* 🌟 전체내역 상태 뱃지 (Theme별 색상 매핑) */
        .badge-status { 
          padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 800; white-space: nowrap; 
        }
        .badge-status.theme-blue { background: #dbeafe; color: var(--color-blue); }
        .badge-status.theme-purple { background: #f3e8ff; color: var(--color-purple); }
        .badge-status.theme-green { background: #d1fae5; color: var(--color-green); }
        .badge-status.theme-orange { background: #ffedd5; color: var(--color-orange); }
        .badge-status.theme-red { background: #fee2e2; color: var(--color-red); }
        .badge-status.theme-default { background: #f1f5f9; color: #64748b; }

        /* 경매 상태 특화 뱃지 (기존) */
        .badge-bid { padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 800; white-space: nowrap; }
        .badge-bid.pending { background: #fef3c7; color: #d97706; }
        .badge-bid.completed { background: #d1fae5; color: #10b981; }
        .badge-bid.additional { background: #dbeafe; color: #2563eb; }
        .badge-bid.default { background: #f1f5f9; color: #64748b; }

        .price-val { font-weight: 900; color: #0f172a; font-size: 15px; }
        .mybid-val { font-weight: 900; color: #3b82f6; font-size: 15px; }
        .font-bold { font-weight: 800; }

        /* 🌟 타이머 및 애니메이션 */
        .time-text { font-weight: 700; color: #475569; }
        .time-text.ended { color: #94a3b8; }
        .urgent { color: #ef4444; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .time-pulse { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

        /* 🌟 버튼 영역 */
        .action-btn-group { display: flex; gap: 6px; justify-content: center; }
        .btn-action {
          padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.2s; border: none;
        }
        .btn-del { background: #ffffff; border: 1px solid #fca5a5; color: #ef4444; }
        .btn-del:hover { background: #fff1f2; }
        .btn-pack { background: #10b981; color: #ffffff; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2); }
        .btn-pack:hover { background: #059669; }
        .btn-bid { background: #3b82f6; color: #ffffff; box-shadow: 0 2px 6px rgba(59, 130, 246, 0.2); }
        .btn-bid:hover { background: #2563eb; }

        .btn-expand {
          padding: 6px 12px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px;
          font-size: 12px; font-weight: 700; color: #475569; cursor: pointer; transition: all 0.2s;
        }
        .btn-expand:hover { background: #f8fafc; border-color: #94a3b8; }
        .btn-expand.active { background: #0f172a; color: #ffffff; border-color: #0f172a; }

        /* 🌟 확장(아코디언) 영역 */
        .expanded-tr { background: #f8fafc; }
        .expanded-td { padding: 0; border-bottom: 1px solid #e2e8f0; }
        .expanded-content { display: flex; flex-direction: column; padding: 10px 30px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.02); }
        .expanded-item { padding: 16px 0; text-align: left; }
        .expanded-item.border-bottom { border-bottom: 1px dashed #cbd5e1; }
        .sub-name { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
        .sub-price { font-size: 13px; color: #475569; font-weight: 600; }
        .sub-qty { color: #94a3b8; font-weight: 500; margin-left: 4px; }

        /* 🌟 입찰 모달 콘텐츠 (.miku-bid-modal) */
        .miku-bid-modal { width: 100%; text-align: left; font-family: 'Pretendard', sans-serif; }
        .prod-name-title { font-size: 14px; color: #64748b; margin: 0 0 24px 0; text-align: center; line-height: 1.5; word-break: keep-all; font-weight: 600; }
        
        .info-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 0 8px; }
        .info-row .label { font-size: 14px; color: #475569; font-weight: 700; }
        .info-row .val { font-size: 16px; font-weight: 800; color: #0f172a; }
        .info-row .val.highlight { font-size: 18px; color: #ef4444; }
        
        .my-bid-row { margin-bottom: 24px; }
        .bid-calc { display: flex; align-items: center; gap: 8px; }
        .old-bid { color: #94a3b8; text-decoration: line-through; font-size: 14px; font-weight: 600; }
        .arrow { color: #cbd5e1; font-weight: 900; }
        .new-bid { color: #3b82f6; font-size: 18px; font-weight: 900; }

        .input-container {
          background: linear-gradient(145deg, #f8faff 0%, #f0f4f8 100%);
          padding: 24px; border-radius: 20px; border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: inset 0 2px 4px rgba(255,255,255,1);
        }
        .input-container label { display: block; font-size: 13px; font-weight: 800; color: #475569; margin-bottom: 12px; }
        .premium-input {
          width: 100%; padding: 16px; border-radius: 14px; border: 1px solid #cbd5e1;
          font-size: 18px; font-weight: 800; color: #0f172a; outline: none; box-sizing: border-box;
          transition: all 0.2s; background: #ffffff;
        }
        .premium-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }

        /* 애니메이션 */
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .anim-slide-up { opacity: 0; animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}