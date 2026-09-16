'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GlobalProductDetail from '@/app/main_shop/components/GlobalProductDetail';
import { useExchangeRate } from '@/app/context/ExchangeRateContext';
import GuideLayout from '@/app/components/GuideLayout';
import '@/app/guide/guide-common.css';
import '../mypage-premium.css';

// =================================================================
// 1. 비즈니스 로직 영역 (Business Logic Layer)
// 화면 크기(isMobile)나 호버(isHovered) 같은 스타일 관련 상태를 모두 제거하고
// 오직 데이터 관리와 동작 기능만 깔끔하게 남겼습니다.
// =================================================================
function useWishlistLogic() {
  const router = useRouter();
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const { exchangeRate } = useExchangeRate();
  const detailRef = useRef<HTMLDivElement>(null);
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 5;

  // 🌟 요약 카드의 미쿠짱머니 표시용 (마이페이지·주문 현황·배송지 화면과 동일한 구성)
  const [cyberMoney, setCyberMoney] = useState<number>(0);
  useEffect(() => {
    const storedId = localStorage.getItem('user_id');
    if (!storedId) return;
    fetch(`/api/users?id=${storedId}`)
      .then(res => res.json())
      .then(data => { if (data?.success) setCyberMoney(Number(data.user?.cyberMoney) || 0); })
      .catch(() => {});
  }, []);

  // 뒤로가기 및 상세 모달 상태 연동
  useEffect(() => {
    if (selectedItem) {
      window.history.pushState({ isDetail: true }, "");
    }
    const handlePopState = () => {
      if (selectedItem) {
        setSelectedItem(null);
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedItem]);

  // 초기 데이터 로드 (로컬 스토리지)
  useEffect(() => {
    const domain = window.location.hostname;
    document.cookie = `googtrans=/ja/ko; path=/;`;
    document.cookie = `googtrans=/ja/ko; domain=${domain}; path=/;`;

    const savedWishlist = JSON.parse(localStorage.getItem('rakutenWishlist') || '[]');
    setWishlist(savedWishlist);
    setSelectedItems(savedWishlist.map((item: any) => item.itemId));
  }, []);

  const handleRemove = (itemId: string) => {
    if (confirm("이 상품을 관심상품에서 삭제하시겠습니까?")) {
      const updatedWishlist = wishlist.filter((item) => item.itemId !== itemId);
      setWishlist(updatedWishlist);
      localStorage.setItem('rakutenWishlist', JSON.stringify(updatedWishlist));
      
      const currentItemsCount = wishlist.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).length;
      if (currentItemsCount === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  const handleRemoveSelected = () => {
    if (selectedItems.length === 0) {
      alert("삭제할 상품을 선택해주세요.");
      return;
    }
    if (confirm("선택한 상품을 삭제하시겠습니까?")) {
      const updatedWishlist = wishlist.filter((item) => !selectedItems.includes(item.itemId));
      setWishlist(updatedWishlist);
      localStorage.setItem('rakutenWishlist', JSON.stringify(updatedWishlist));
      setSelectedItems([]);
      setCurrentPage(1);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const toggleAllSelection = () => {
    if (selectedItems.length === wishlist.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(wishlist.map(item => item.itemId));
    }
  };

  const handleItemClick = (item: any) => {
    setSelectedItem(item);
    setTimeout(() => {
      if (detailRef.current) {
        detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const totalPages = Math.ceil(wishlist.length / ITEMS_PER_PAGE);
  const currentItems = wishlist.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return {
    cyberMoney,
    wishlist, selectedItems, selectedItem, setSelectedItem, exchangeRate, detailRef,
    currentPage, setCurrentPage, totalPages, currentItems,
    handleRemove, handleRemoveSelected, toggleItemSelection, toggleAllSelection, handleItemClick
  };
}

// =================================================================
// 2. 화면 영역 (View Layer)
// 스타일은 ../mypage-premium.css(mp- 클래스)를 사용합니다.
// =================================================================

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

// 🌟 개별 아이템 카드
const WishlistItem = ({ item, isSelected, exchangeRate, onToggle, onClickDetail, onRemove }: any) => {
  const priceYen = Number(item.priceYen) || 0;
  const priceWon = Math.round(priceYen * exchangeRate / 100) * 100;
  return (
    <div className={`mp-wish ${isSelected ? 'is-selected' : ''}`}>
      <button type="button" className="mp-wish-check" onClick={() => onToggle(item.itemId)} aria-pressed={isSelected} aria-label={isSelected ? '선택 해제' : '선택'}>
        <span className={`mp-check ${isSelected ? 'is-on' : ''}`}><CheckIcon /></span>
      </button>

      <button type="button" className="mp-wish-img" onClick={() => onClickDetail(item)} aria-label="상세보기">
        <img src={item.imageUrl} alt={item.itemName} />
      </button>

      <div className="mp-wish-body">
        <h3 className="mp-wish-name" onClick={() => onClickDetail(item)}>{item.itemName}</h3>
        <div className="mp-wish-price" translate="no">
          <strong>¥{priceYen.toLocaleString()}</strong>
          <span>약 {priceWon.toLocaleString()}원</span>
        </div>
        <div className="mp-wish-actions">
          <button type="button" className="mp-btn is-primary" onClick={() => onClickDetail(item)}>
            상세보기 <i className="fa fa-arrow-right"></i>
          </button>
        </div>
      </div>

      <button type="button" className="mp-wish-del" onClick={() => onRemove(item.itemId)} title="삭제" aria-label="관심상품에서 삭제">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
    </div>
  );
};

// 🌟 메인 페이지
export default function WishlistPage() {
  const {
    cyberMoney,
    wishlist, selectedItems, selectedItem, setSelectedItem, exchangeRate, detailRef,
    currentPage, setCurrentPage, totalPages, currentItems,
    handleRemove, handleRemoveSelected, toggleItemSelection, toggleAllSelection, handleItemClick
  } = useWishlistLogic();

  const selectedTotalYen = wishlist
    .filter(item => selectedItems.includes(item.itemId))
    .reduce((sum, item) => sum + (Number(item.priceYen) || 0), 0);
  const allSelected = wishlist.length > 0 && selectedItems.length === wishlist.length;
  const partlySelected = selectedItems.length > 0 && !allSelected;

  return (
    <GuideLayout title="관심 상품 목록" type="mypage">
      <div className="miku-wish-page">
        {/* 🌟 요약 카드 — 배송지 화면(mypage/profile)처럼 제목 위에 배치합니다 */}
        <section className="mp-hero mp-anim" aria-label="관심 상품 요약">
          <div className="mp-hero-main">
            <div className="mp-avatar" aria-hidden="true"><i className="fa fa-heart"></i></div>
            <div className="mp-hero-text">
              <span className="mp-eyebrow-dark">WISH LIST</span>
              <h3 className="mp-hero-title">마음에 담아둔 <em>관심 상품</em></h3>
              <p className="mp-hero-desc">상품을 눌러 상세 정보를 확인하고, 바로 구매대행을 신청할 수 있어요.</p>
            </div>
          </div>
          <div className="mp-hero-money">
            <span className="mp-hero-money-label"><i className="fa fa-sack-dollar"></i> 미쿠짱머니</span>
            <strong className="mp-hero-money-value" translate="no">{cyberMoney.toLocaleString()}<small>원</small></strong>
            <div className="mp-hero-money-actions">
              <Link href="/mypage/money/charge" className="is-primary"><i className="fa fa-plus"></i> 충전</Link>
              <Link href="/mypage/money/history"><i className="fa fa-receipt"></i> 이용 내역</Link>
            </div>
          </div>
          <div className="mp-hero-stats">
            <div className="mp-hero-stat"><span>관심 상품</span><strong>{wishlist.length}<small>개</small></strong></div>
            <div className="mp-hero-stat"><span>선택한 상품</span><strong>{selectedItems.length}<small>개</small></strong></div>
            <div className="mp-hero-stat"><span>선택 합계</span><strong translate="no">¥{selectedTotalYen.toLocaleString()}</strong></div>
            <div className="mp-hero-stat"><span>원화 예상</span><strong translate="no">{(Math.round(selectedTotalYen * exchangeRate / 100) * 100).toLocaleString()}<small>원</small></strong></div>
          </div>
        </section>

        {/* 🌟 배송지 화면(mypage/profile)의 "나의 한국 배송지 주소" 제목과 같은 구성: 작은 영문 눈썹 + 제목 + 로즈 아이콘 뱃지 */}
        <div className="miku-wish-outer-header mp-anim d1">
          <span className="mp-eyebrow">Wish List</span>
          <h2>관심 상품 목록 <span className="miku-wish-title-badge"><i className="fa fa-heart"></i></span></h2>
        </div>

        <div className="guide-panel">
          <div className="miku-wish-wrapper">
            {/* 상세 보기 */}
            <div ref={detailRef} className="miku-wish-detail-anchor">
              {selectedItem && (
                <div className="miku-wish-modal-wrapper anim-pop-in">
                  <GlobalProductDetail product={selectedItem} onClose={() => setSelectedItem(null)} />
                </div>
              )}
            </div>

            {wishlist.length === 0 ? (
              <div className="mp-empty mp-anim d1">
                <div className="mp-empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                </div>
                <h3>관심상품이 없습니다</h3>
                <p>마음에 드는 상품을 찾아 하트를 눌러보세요.</p>
                <Link href="/" className="mp-btn is-primary">
                  쇼핑하러 가기 <i className="fa fa-arrow-right"></i>
                </Link>
              </div>
            ) : (
              <>
                {/* 🌟 일괄 선택 / 삭제 */}
                <div className="mp-toolbar mp-anim d1">
                  <button type="button" className="mp-check-all" onClick={toggleAllSelection}>
                    <span className={`mp-check ${allSelected ? 'is-on' : partlySelected ? 'is-partial' : ''}`}>
                      {partlySelected ? <span style={{ width: 10, height: 2, borderRadius: 1, background: 'currentColor' }} /> : <CheckIcon />}
                    </span>
                    {allSelected ? '전체 해제' : '전체 선택'}
                    <span className="mp-toolbar-count"><b>{selectedItems.length}</b> / {wishlist.length}</span>
                  </button>
                  <button type="button" className="mp-btn is-danger" onClick={handleRemoveSelected} disabled={selectedItems.length === 0}>
                    <i className="fa fa-trash-can"></i> 선택 삭제 ({selectedItems.length})
                  </button>
                </div>

                <div className="mp-wish-grid">
                  {currentItems.map((item, index) => (
                    <div key={item.itemId || index} className="mp-anim" style={{ animationDelay: `${index * 0.04}s`, minWidth: 0 }}>
                      <WishlistItem
                        item={item}
                        isSelected={selectedItems.includes(item.itemId)}
                        exchangeRate={exchangeRate}
                        onToggle={toggleItemSelection}
                        onClickDetail={handleItemClick}
                        onRemove={handleRemove}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <nav className="mp-pager" aria-label="페이지 이동">
                <button type="button" className="mp-page-btn" aria-label="이전 페이지" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
                  <i className="fa fa-chevron-left"></i>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    type="button"
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`mp-page-btn ${currentPage === page ? 'is-active' : ''}`}
                    aria-current={currentPage === page ? 'page' : undefined}
                  >
                    {page}
                  </button>
                ))}
                <button type="button" className="mp-page-btn" aria-label="다음 페이지" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
                  <i className="fa fa-chevron-right"></i>
                </button>
              </nav>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* 🌟 마이페이지·배송지 화면과 같은 폭(레이아웃 컨텐츠 영역 전체)을 쓰도록 좌우 여백·폭 제한을 뺐습니다 */
        .miku-wish-page { margin: 0 auto; box-sizing: border-box; }
        .miku-wish-wrapper {
          max-width: 1000px;
          margin: 0 auto;
          color: #111827;
          font-family: 'Pretendard', "Noto Sans KR", sans-serif;
          box-sizing: border-box;
        }
        .miku-wish-page .mp-hero { margin-bottom: 24px; }
        .miku-wish-outer-header { margin-bottom: 24px; }
        .miku-wish-outer-header h2 { font-size: 22px; font-weight: 900; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 10px; }
        .miku-wish-title-badge {
          width: 30px; height: 30px; border-radius: 10px; flex-shrink: 0; color: #fff;
          display: inline-flex; align-items: center; justify-content: center; font-size: 13px;
          background: linear-gradient(135deg, var(--mp-from) 0%, var(--mp-to) 100%);
          box-shadow: 0 6px 14px -6px var(--mp-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }
        .miku-wish-detail-anchor { scroll-margin-top: 140px; }

        /* 상세 보기 */
        .miku-wish-modal-wrapper { position: relative; margin-bottom: 24px; }
        .miku-wish-modal-wrapper #global-detail-view { margin-top: 0; }
        @keyframes wishPopIn {
          0% { opacity: 0; transform: scale(0.98) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .anim-pop-in { animation: wishPopIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @media (max-width: 768px) {
          .miku-wish-page { padding: 0; }
        }
      `}</style>
    </GuideLayout>
  );
}
