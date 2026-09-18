'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useMikuAlert } from '@/app/context/MikuAlertContext';
import { ORDER_STATUS, ORDER_STATUS_LABEL } from '@/src/types/order';

// 🌟 상태 우선순위 정의 (요청 -> 진행중 -> 창고 -> 배송 순)
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

// 🌟 도로명 주소에서 "OO로/OO길"로 시작하는 부분부터 끝까지(도로명 + 번지수)만 추출 (confirmMsgs와 동일 로직)
// 🌟 상품명이 너무 길면 50자까지만 보여주고 나머지는 ...으로 축약합니다.
function truncateText(text: string, maxLength: number) {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function getLastRoadAddressPart(address?: string) {
  const tokens = address?.trim().split(/\s+/) || [];
  let roadTokenIndex = -1;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (/(로|길)$/.test(tokens[i])) { roadTokenIndex = i; break; }
  }
  return roadTokenIndex >= 0 ? tokens.slice(roadTokenIndex).join(' ') : (tokens[tokens.length - 1] || '');
}

// =================================================================
// 1. 비즈니스 로직 영역 (Business Logic Layer)
// =================================================================
function useOrderTableLogic({ activeTab, fetchOrders }: any) {
  const { showConfirm, showAlert } = useMikuAlert();
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

  // 🚀 남은 시간 계산 로직
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
    let count = activeTab === ORDER_STATUS.PAYMENT_REQ ? 1 : 2; // 기본: 상품명(+가격, 배송비 요청 탭은 가격 컬럼 없음)
    if (activeTab === 'ALL') count += 1; // 상태 (전체내역 전용)
    if ([ORDER_STATUS.CART, ORDER_STATUS.ARRIVED, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.BID_PENDING, ORDER_STATUS.BID_SUCCESS, 'BIDDING'].includes(activeTab)) count += 1; // 체크박스
    if ([ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING].includes(activeTab)) count += 1; // 수취인
    if (activeTab === 'BID_PENDING' || activeTab === 'BIDDING') count += 2; // 남은시간, 내 입찰금액
    if (activeTab === ORDER_STATUS.SHIPPING) count += 1; // 운송장
    if (activeTab === ORDER_STATUS.PAYMENT_REQ) count += 2; // 일본 내 배송비, 국제 배송비
    if ([ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING].includes(activeTab)) count += 1; // 삭제버튼(휴지통)
    if (activeTab === 'BIDDING') count += 1; // 경매 상태
    return count;
  }, [activeTab]);

  return {
    isMobile, now, showConfirm, showAlert,
    getAuctionTimeData, getColSpanCount
  };
}

// =================================================================
// 2. 화면 컴포넌트 영역 (View Layer)
// =================================================================

// 🌟 입찰 금액 입력 프리미엄 모달 콘텐츠
const BidInputContent = ({ item, myMoney, exchangeRate, onChange }: { item: any, myMoney: number, exchangeRate: number, onChange: (val: string) => void }) => {
  const { setConfirmDisabled } = useMikuAlert();
  const [amount, setAmount] = useState("");
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAmount(val);
    onChange(val);
  };

  const originalBid = item.myBidPrice || 0;
  const parsedAmount = parseInt(amount) || 0;
  // 🌟 다른 화면(PaymentSummary)과 동일하게 반올림 후 100원 단위로 올림 처리
  const bidAmountWon = parsedAmount > 0 ? Math.ceil(Math.round(parsedAmount * exchangeRate) / 100) * 100 : 0;
  const isInsufficient = parsedAmount > 0 && bidAmountWon > myMoney;

  // 🌟 희망 입찰 금액(원화 환산)이 보유 미쿠짱 머니보다 많으면 "확인" 버튼을 눌러도 진행되지 않게 막습니다.
  useEffect(() => {
    setConfirmDisabled(isInsufficient);
  }, [isInsufficient, setConfirmDisabled]);

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
              <span className="new-bid">¥ {parsedAmount.toLocaleString()}</span>
            </>
          ) : (
            <span className="new-bid">¥ {originalBid.toLocaleString()}</span>
          )}
        </div>
      </div>

      <div className="input-container">
        <label>희망 입찰 금액(최종) (¥)</label>
        <input
          type="number" placeholder="희망 입찰 금액(최종) 입력"
          value={amount} onChange={handleInputChange}
          className={`premium-input ${isInsufficient ? 'insufficient' : ''}`}
        />
        <div className="bid-my-money-info">
          내 미쿠짱 머니 ₩ {myMoney.toLocaleString()}
        </div>
        {parsedAmount > 0 && (
          <div className="bid-krw-info">
            희망 입찰 금액 (원화 환산) ₩ {bidAmountWon.toLocaleString()}
          </div>
        )}
        {isInsufficient && (
          <div className="bid-insufficient-warning">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            미쿠짱 머니가 부족합니다
          </div>
        )}
      </div>
    </div>
  );
};

// 🌟 메인 테이블 컴포넌트
export default function OrderTable({ items, activeTab, selectedItems, setSelectedItems, fetchOrders, selectedAddress, onIndividualPacking, onDelete, onStatusClick, myMoney = 0, exchangeRate = 0 }: any) {
  const {
    isMobile, showConfirm, showAlert,
    getAuctionTimeData, getColSpanCount
  } = useOrderTableLogic({ activeTab, fetchOrders });

  const isAuctionTab = activeTab === 'BID_PENDING' || activeTab === 'BIDDING';
  const showBundleAndRecipientTabs = [ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING];
  // 🌟 합포장(bundleId) 묶음을 한 행으로 합쳐서 보여주는 탭들 (배송비 요청/배송비 결제 완료/국제 배송)
  const bundleGroupTabs = [ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING];
  const hasCheckbox = [ORDER_STATUS.CART, ORDER_STATUS.ARRIVED, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.BID_PENDING, ORDER_STATUS.BID_SUCCESS, 'BIDDING'].includes(activeTab as any);
  // 🌟 전체내역 탭에서는 행을 클릭하면 해당 상품의 상태 탭으로 이동합니다.
  const isAllTab = activeTab === 'ALL';

  // 상태값에 따른 테마 색상 반환 함수
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
    const isConfirmed = await showConfirm(<BidInputContent item={item} myMoney={myMoney} exchangeRate={exchangeRate} onChange={(val) => { finalAmount = val; }} />);

    if (isConfirmed) {
      // 🌟 입력값은 이제 "추가할 금액"이 아니라 "희망 입찰 금액(최종)"입니다.
      const finalBidAmount = parseInt(finalAmount);
      const currentHighest = item.productPrice || 0;
      if (!finalBidAmount || finalBidAmount <= currentHighest) {
        return showAlert("현재 최고가보다 높은 금액을 입력해주세요.", "error");
      }

      // 🌟 확인 버튼은 비활성화로 막혀있지만, 만약을 대비해 제출 시점에도 한 번 더 검증합니다.
      const finalBidAmountWon = Math.ceil(Math.round(finalBidAmount * exchangeRate) / 100) * 100;
      if (finalBidAmountWon > myMoney) {
        return showAlert("미쿠짱 머니가 부족합니다.", "error");
      }

      // 서버는 myBidPrice에 더해지는(increment) 값을 받으므로, 기존 입찰가와의 차액을 계산해서 보냅니다.
      const originalBid = item.myBidPrice || 0;
      const amount = finalBidAmount - originalBid;

      const deposit = finalBidAmount <= 20000 ? 2000 : Math.floor(finalBidAmount * 0.1);

      try {
        const res = await fetch('/api/orders/bid', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: item.orderId, amount, deposit })
        });

        if (res.ok) {
          await fetch('/api/orders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates: [{ id: item.orderId, bidStatus: 'PENDING' }] })
          });

          showAlert(`¥${finalBidAmount.toLocaleString()} 입찰 완료!`, 'success');
          fetchOrders();
        } else {
          const errorData = await res.json();
          showAlert(errorData.error || "입찰에 실패했습니다.", "error");
        }
      } catch (error) { showAlert("통신 에러가 발생했습니다.", "error"); }
    }
  };

  // 🌟 합포장 묶음에서 어떤 상품들이 포함됐는지 펼쳐보기 위한 상태
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const toggleExpand = (bundleId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(bundleId)) next.delete(bundleId); else next.add(bundleId);
      return next;
    });
  };

  // 🌟 합포장(bundleId 공유) 묶음은 orderIds 배열로 한 번에 선택/해제합니다.
  const toggleCheck = (orderIdOrIds: string | string[]) => {
    const ids = Array.isArray(orderIdOrIds) ? orderIdOrIds : [orderIdOrIds];
    const allSelected = ids.every((id: string) => selectedItems.includes(id));
    if (allSelected) setSelectedItems(selectedItems.filter((id: string) => !ids.includes(id)));
    else setSelectedItems([...selectedItems.filter((id: string) => !ids.includes(id)), ...ids]);
  };

  // 🌟 배송비 요청/배송비 결제 완료/국제 배송 탭 + 전체내역(ALL, 진행중 목록 포함) 탭에서는
  // 같은 bundleId(합포장)로 묶인 주문들을 한 행으로 합쳐서 보여줍니다.
  const displayItems = React.useMemo(() => {
    const shouldGroup = bundleGroupTabs.includes(activeTab) || activeTab === ORDER_STATUS.ALL;
    if (!shouldGroup) return items;

    const groupsByBundleId: Record<string, any[]> = {};
    items.forEach((item: any) => {
      if (item.bundleId) (groupsByBundleId[item.bundleId] ||= []).push(item);
    });

    // 🌟 원래 정렬 순서(우선순위/최신순)를 유지하기 위해, 각 항목을 순서대로 훑으며
    // 묶음은 처음 등장하는 위치에서 한 번만 합쳐서 내보냅니다.
    const seenBundles = new Set<string>();
    const result: any[] = [];
    items.forEach((item: any) => {
      if (item.bundleId) {
        if (seenBundles.has(item.bundleId)) return;
        seenBundles.add(item.bundleId);
        const group = groupsByBundleId[item.bundleId];
        const first = group[0];
        result.push({
          ...first,
          orderId: item.bundleId,
          orderIds: group.map((g: any) => g.orderId),
          productName: group.length > 1 ? `${first.productName} 외 ${group.length - 1}건` : first.productName,
          productPrice: group.reduce((sum: number, g: any) => sum + (g.productPrice || 0), 0),
          domesticShippingFee: group.reduce((sum: number, g: any) => sum + (g.domesticShippingFee || 0), 0),
          secondPaymentAmount: group.reduce((sum: number, g: any) => sum + (g.secondPaymentAmount || 0), 0),
          isGroup: group.length > 1,
          bundleItems: group,
        });
      } else {
        result.push(item);
      }
    });

    return result;
  }, [items, activeTab]);

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
              {hasCheckbox && (
                <th className="th-cell th-check"><div className="header-spacer"></div></th>
              )}
              {activeTab === 'ALL' && <th className="th-cell th-status">상태</th>}
              <th className="th-cell th-product">상품명</th>
              
              {isAuctionTab && <th className="th-cell th-time">남은 시간</th>}
              {activeTab !== ORDER_STATUS.PAYMENT_REQ && <th className="th-cell th-price">{isAuctionTab ? '현재 최고가' : '상품 금액'}</th>}
              {isAuctionTab && <th className="th-cell th-mybid">내 입찰금액</th>}
              
              {activeTab === 'BIDDING' && <th className="th-cell th-auction-status">경매 상태</th>}
              {showBundleAndRecipientTabs.includes(activeTab) && <th className="th-cell th-recipient">수취인</th>}
              {activeTab === ORDER_STATUS.PAYMENT_REQ && <th className="th-cell th-domestic-fee">현지 배송비(₩)</th>}
              {activeTab === ORDER_STATUS.PAYMENT_REQ && <th className="th-cell th-shipping-fee">국제 배송비(₩)</th>}
              {activeTab === ORDER_STATUS.SHIPPING && <th className="th-cell th-tracking">운송장 번호</th>}
              
              {/* 삭제 버튼용 빈 헤더를 맨 끝으로 배치 */}
              {([ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING].includes(activeTab)) && (
                <th className="th-cell th-delete-col"></th>
              )}
            </tr>
          </thead>

          <tbody>
            {displayItems.length === 0 ? (
              <tr><td colSpan={getColSpanCount()} className="empty-row">해당하는 상품이 없습니다.</td></tr>
            ) : (
              displayItems.map((item: any) => {
                const ids: string[] = item.orderIds || [item.orderId];
                const isChecked = ids.every((id: string) => selectedItems.includes(id));
                const timeData = getAuctionTimeData(item.auctionEndDate);

                return (
                  <React.Fragment key={item.orderId}>
                    {/* 🌟 행 전체에 onClick 이벤트 및 커서 클래스 적용 */}
                    <tr
                      /* 🔗 /mypage/status?orderId=... 로 들어왔을 때 이 행을 찾아 스크롤하기 위한 표시.
                         합포장 묶음은 한 행이 여러 주문을 담으므로 공백으로 이어 붙입니다. */
                      data-order-ids={ids.join(' ')}
                      className={`tr-row ${isChecked ? 'selected' : ''} ${hasCheckbox || isAllTab ? 'clickable' : ''}`}
                      onClick={() => {
                        if (isAllTab) { onStatusClick?.(item.status); return; }
                        if (hasCheckbox) toggleCheck(ids);
                      }}
                    >
                      {/* 체크박스 */}
                      {hasCheckbox && (
                        <td className="td-cell td-check">
                          {/* e.stopPropagation()으로 중복 클릭 방지 */}
                          <div className={`custom-checkbox ${isChecked ? 'checked' : ''}`} onClick={(e) => { e.stopPropagation(); toggleCheck(ids); }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                        </td>
                      )}

                      {/* 상태 뱃지 */}
                      {activeTab === 'ALL' && (
                        <td className="td-cell td-status">
                          <span className={`badge-status ${getBadgeTheme(item.status)}`}>
                            {ORDER_STATUS_LABEL[item.status as keyof typeof ORDER_STATUS_LABEL] || item.status}
                          </span>
                        </td>
                      )}
                      
                      <td className={`td-cell td-product ${hasCheckbox ? 'with-checkbox' : ''}`}>
                        <div className="prod-name-box" title={item.productName}>
                          {item.isGroup && (
                            <span className="bundle-group-badge">📦 합포장 {item.bundleItems.length}건</span>
                          )}
                          <span className="prod-name-text">{item.productName}</span>
                          {item.isGroup && (
                            <button
                              className={`btn-bundle-toggle ${expandedGroups.has(item.orderId) ? 'open' : ''}`}
                              onClick={(e) => { e.stopPropagation(); toggleExpand(item.orderId); }}
                              title={expandedGroups.has(item.orderId) ? '접기' : '포함된 상품 보기'}
                            >
                              <span className="btn-bundle-toggle-label">{expandedGroups.has(item.orderId) ? '접기' : '모든 상품 보기'}</span>
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                          )}
                        </div>
                      </td>

                      {isAuctionTab && (
                        <td className="td-cell">
                          <span className={`time-text ${timeData.isEnded ? 'ended' : ''} ${timeData.isUrgent ? 'time-pulse urgent' : ''}`}>
                            {timeData.text}
                          </span>
                        </td>
                      )}

                      {activeTab !== ORDER_STATUS.PAYMENT_REQ && (
                        <td className="td-cell"><div className="price-val">¥ {(item.productPrice || 0).toLocaleString()}</div></td>
                      )}

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

                      {showBundleAndRecipientTabs.includes(activeTab) && (
                        <td className="td-cell">
                          {item.address?.recipientName || '미지정'}
                          {item.address?.address && (
                            <span className="recipient-address">({getLastRoadAddressPart(item.address.address)})</span>
                          )}
                        </td>
                      )}
                      {activeTab === ORDER_STATUS.PAYMENT_REQ && <td className="td-cell">₩ {(item.domesticShippingFee || 0).toLocaleString()}</td>}
                      {activeTab === ORDER_STATUS.PAYMENT_REQ && <td className="td-cell font-bold">₩ {(item.secondPaymentAmount || 0).toLocaleString()}</td>}
                      {activeTab === ORDER_STATUS.SHIPPING && <td className="td-cell">{item.trackingNo || '준비중'}</td>}

                      {/* 🛒 장바구니/보증금 대기 상태일 때만 휴지통(삭제) 아이콘 노출 */}
                      {([ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING].includes(activeTab)) && (
                        <td className="td-cell td-delete-col">
                          {/* e.stopPropagation()으로 삭제 시 행 선택 방지 */}
                          <button className="btn-del-icon" onClick={(e) => { e.stopPropagation(); onDelete(item.orderId); }} title="삭제">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>

                    {/* 🌟 합포장 묶음 펼치기: 포함된 상품명/상품가격 표시 */}
                    {item.isGroup && expandedGroups.has(item.orderId) && (
                      <tr className="tr-bundle-detail">
                        <td className="td-cell td-bundle-detail" colSpan={getColSpanCount()}>
                          <div className="bundle-detail-list">
                            <div className="bundle-detail-header">
                              <span className="bundle-detail-header-name">상품명</span>
                              <span className="bundle-detail-header-price">상품 금액</span>
                            </div>
                            {item.bundleItems.map((sub: any) => (
                              <div className="bundle-detail-row" key={sub.orderId}>
                                <span className="bundle-detail-name" title={sub.productName}>{truncateText(sub.productName, 50)}</span>
                                <span className="bundle-detail-price">¥ {(sub.productPrice || 0).toLocaleString()}</span>
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

        /* 🌟 테이블 컨테이너 */
        .table-container {
          background: #ffffff;
          border-radius: 22px;
          border: 1px solid rgba(226, 232, 240, 0.75);
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 16px 36px -16px rgba(15, 23, 42, 0.10);
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .premium-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 800px;
        }

        .th-cell {
          padding: 18px 12px;
          background: linear-gradient(180deg, #fafbfc 0%, #f4f6f9 100%);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.2px;
          color: #475569;
          text-align: center;
          border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
        }
        .th-cell:first-child { border-top-left-radius: 22px; }
        .th-cell:last-child { border-top-right-radius: 22px; }

        .td-cell {
          padding: 16px 12px;
          font-size: 14px;
          color: #334155;
          text-align: center;
          vertical-align: middle;
          border-bottom: 1px solid #f1f5f9;
        }
        .tr-row { transition: all 0.2s ease; }
        .tr-row.clickable { cursor: pointer; }
        .tr-row:hover { background: #f8fafc; }
        .tr-row.selected { background: linear-gradient(90deg, #fdf4f4 0%, #fffafa 100%); box-shadow: inset 3px 0 0 #c0606a; }

        .empty-row { padding: 60px; text-align: center; color: #94a3b8; font-weight: 600; }

        /* 🌟 상태 컬럼 너비 확보 (글자 겹침 방지) */
        .th-status, .td-status {
          width: 130px !important;
          min-width: 130px !important;
        }

        .th-check, .td-check { width: 55px; min-width: 55px; padding-left: 18px !important; padding-right: 15px !important; }
        .td-check .custom-checkbox { margin: 0; }
        .td-product { text-align: left; max-width: 250px; padding-left: 18px; }
        .td-product.with-checkbox { padding-left: 0; }
        .prod-name-box {
          display: flex; align-items: center; min-width: 0;
          font-weight: 700; color: #0f172a;
          padding: 0;
        }
        .prod-name-text {
          flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* 🌟 커스텀 체크박스 */
        .custom-checkbox {
          width: 22px; height: 22px; margin: 0 auto;
          border-radius: 6px; border: 2px solid #cbd5e1;
          background: #ffffff; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .custom-checkbox svg { width: 12px; height: 12px; color: white; opacity: 0; transform: scale(0.5); transition: all 0.2s; }
        .custom-checkbox.checked { border-color: transparent; background: linear-gradient(135deg, #c0606a 0%, #a94a53 100%); box-shadow: 0 2px 6px rgba(169, 74, 83, 0.3); }
        .custom-checkbox.checked svg { opacity: 1; transform: scale(1); }

        /* 🌟 전체내역 상태 뱃지 (고정 크기 적용) */
        .badge-status { 
          display: inline-block;
          width: 105px;
          text-align: center;
          padding: 6px 0; 
          border-radius: 8px; 
          font-size: 12px; 
          font-weight: 800; 
          white-space: nowrap; 
          box-sizing: border-box;
        }
        .badge-status.theme-blue { background: #dbeafe; color: var(--color-blue); box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.15); }
        .badge-status.theme-purple { background: #f3e8ff; color: var(--color-purple); box-shadow: inset 0 0 0 1px rgba(139, 92, 246, 0.15); }
        .badge-status.theme-green { background: #d1fae5; color: var(--color-green); box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.15); }
        .badge-status.theme-orange { background: #ffedd5; color: var(--color-orange); box-shadow: inset 0 0 0 1px rgba(249, 115, 22, 0.15); }
        .badge-status.theme-red { background: #fee2e2; color: var(--color-red); box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.15); }
        .badge-status.theme-default { background: #f1f5f9; color: #64748b; }

        .badge-bid { padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 800; white-space: nowrap; }
        .badge-bid.pending { background: #fef3c7; color: #d97706; }
        .badge-bid.completed { background: #d1fae5; color: #10b981; }
        .badge-bid.additional { background: #dbeafe; color: #2563eb; }
        .badge-bid.default { background: #f1f5f9; color: #64748b; }

        .price-val { font-weight: 900; color: #0f172a; font-size: 15px; letter-spacing: -0.3px; }
        .recipient-address { display: block; margin-top: 2px; font-size: 12px; color: #94a3b8; }

        .bundle-group-badge {
          display: inline-flex; align-items: center; gap: 6px;
          height: 24px; padding: 0 12px; margin-right: 8px; flex-shrink: 0;
          border-radius: 999px; background: #a94a53; color: #fff;
          font-size: 12px; font-weight: 800; white-space: nowrap;
        }
        .btn-bundle-toggle {
          display: inline-flex; align-items: center; gap: 4px;
          height: 24px; padding: 0 8px; margin-left: 8px; flex-shrink: 0;
          border: 1px solid #cbd5e1; background: #f1f5f9; border-radius: 6px; cursor: pointer;
          color: #475569; font-size: 11px; font-weight: 700; white-space: nowrap;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }
        .btn-bundle-toggle svg { transition: transform 0.15s ease; }
        .btn-bundle-toggle:hover { background: #e2e8f0; }
        .btn-bundle-toggle.open { background: #fee2e2; border-color: #fda4af; color: #e11d48; }
        .btn-bundle-toggle.open svg { transform: rotate(90deg); }

        .tr-bundle-detail { background: #f8fafc; }
        .td-bundle-detail { padding: 10px 20px !important; }
        .bundle-detail-list { display: flex; flex-direction: column; gap: 6px; }
        .bundle-detail-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 14px; font-size: 14px; font-weight: 700; color: #64748b;
        }
        .bundle-detail-header-name { text-align: left; }
        .bundle-detail-header-price { flex-shrink: 0; margin-left: 12px; }
        .bundle-detail-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
        }
        .bundle-detail-name {
          font-size: 13px; color: #334155; flex: 1; min-width: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          text-align: left;
        }
        .bundle-detail-price { font-size: 13px; font-weight: 800; color: #0f172a; flex-shrink: 0; margin-left: 12px; }
        .mybid-val { font-weight: 900; color: #3b82f6; font-size: 15px; }
        .font-bold { font-weight: 800; }

        /* 🌟 타이머 및 애니메이션 */
        .time-text { font-weight: 700; color: #475569; }
        .time-text.ended { color: #94a3b8; }
        .urgent { color: #ef4444; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .time-pulse { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

        /* 🌟 우측 휴지통(삭제) 버튼 스타일 */
        .th-delete-col { 
          width: 40px; 
          min-width: 40px; 
          padding: 0; 
        }
        .td-delete-col { 
          width: 40px; 
          padding: 0 16px 0 0 !important; 
          text-align: right; 
        }

        .btn-del-icon {
          background: transparent;
          border: none;
          color: #cbd5e1; 
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .btn-del-icon:hover {
          background: #fee2e2;
          color: #ef4444; 
        }

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
        .bid-my-money-info { margin-top: 10px; font-size: 12px; font-weight: 700; color: #64748b; text-align: right; }
        .bid-krw-info { margin-top: 4px; font-size: 12px; font-weight: 700; color: #3b82f6; text-align: right; }
        .premium-input.insufficient { color: #ef4444; }
        .bid-insufficient-warning {
          margin-top: 12px; padding: 10px 12px; border-radius: 10px;
          background: #fef2f2; border: 1.5px solid #fecaca;
          color: #b91c1c; font-size: 13px; font-weight: 800; text-align: center;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }

        /* 애니메이션 */
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .anim-slide-up { opacity: 0; animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}