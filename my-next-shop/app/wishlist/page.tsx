'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import GlobalProductDetail from '@/app/main_shop/components/GlobalProductDetail';
import { useExchangeRate } from '../context/ExchangeRateContext';
import GuideLayout from '../components/GuideLayout';

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
    wishlist, selectedItems, selectedItem, setSelectedItem, exchangeRate, detailRef,
    currentPage, setCurrentPage, totalPages, currentItems,
    handleRemove, handleRemoveSelected, toggleItemSelection, toggleAllSelection, handleItemClick
  };
}

// =================================================================
// 2. 화면 영역 (View Layer)
// 인라인 스타일을 배제하고 HTML 구조와 CSS 클래스(className)만 배치합니다.
// =================================================================

// 🌟 개별 아이템 렌더링 컴포넌트
const WishlistItem = ({ item, isSelected, exchangeRate, onToggle, onClickDetail, onRemove }: any) => {
  return (
    <div className="miku-wish-item-row">
      
      {/* 커스텀 체크박스 */}
      <div className={`miku-wish-checkbox ${isSelected ? 'active' : ''}`} onClick={() => onToggle(item.itemId)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>

      {/* 프리미엄 카드 영역 */}
      <div className="miku-wish-card">
        <div className="miku-wish-card-inner">
          <div className="miku-wish-img-box" onClick={() => onClickDetail(item)}>
            <img src={item.imageUrl} alt={item.itemName} />
          </div>
          
          <div className="miku-wish-info">
            <h3 onClick={() => onClickDetail(item)}>{item.itemName}</h3>
            
            <div className="miku-wish-price-box">
              <span className="price-yen">¥{Number(item.priceYen).toLocaleString()}</span>
              <span className="price-won">(₩{(Math.round(Number(item.priceYen) * exchangeRate / 100) * 100).toLocaleString()})</span>
            </div>
            
            <button className="miku-wish-detail-btn" onClick={() => onClickDetail(item)}>
              상세보기
            </button>
          </div>
        </div>
        
        {/* 휴지통 (삭제) 버튼 */}
        <button className="miku-wish-delete-btn" onClick={() => onRemove(item.itemId)} title="삭제">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
    </div>
  );
};

// 🌟 메인 페이지
export default function WishlistPage() {
  const {
    wishlist, selectedItems, selectedItem, setSelectedItem, exchangeRate, detailRef,
    currentPage, setCurrentPage, totalPages, currentItems,
    handleRemove, handleRemoveSelected, toggleItemSelection, toggleAllSelection, handleItemClick
  } = useWishlistLogic();

  return (
    <GuideLayout title="관심물품보기" type="mypage">
      <div className="miku-wish-wrapper">
        
        {/* 상세 보기 오버레이 */}
        <div ref={detailRef} className="miku-wish-detail-anchor">
          {selectedItem && (
            <div className="miku-wish-modal-wrapper anim-pop-in">
              <button className="miku-wish-modal-close" onClick={() => setSelectedItem(null)}>✕</button>
              <GlobalProductDetail product={selectedItem}/>
            </div>
          )}
        </div>

        {/* 상단 헤더 - 환율 정보 */}
        <div className="miku-wish-header anim-slide-up">
          <div className="miku-wish-rate-pill">
            <span className="icon">💱</span>
            <span>환율: 100엔 = <b>{exchangeRate.toFixed(2)}</b>원</span>
          </div>
        </div>

        {/* 🌟 상품 리스트 및 빈 화면 영역 */}
        <div className="miku-wish-list">
          {wishlist.length === 0 ? (
            <div className="miku-wish-empty anim-slide-up">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              <h2>관심상품이 없습니다</h2>
              <p>마음에 드는 상품을 찾아 하트를 눌러보세요.</p>
            </div>
          ) : (
            currentItems.map((item, index) => (
              <div key={item.itemId || index} className="anim-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                <WishlistItem 
                  item={item} 
                  isSelected={selectedItems.includes(item.itemId)}
                  exchangeRate={exchangeRate}
                  onToggle={toggleItemSelection}
                  onClickDetail={handleItemClick}
                  onRemove={handleRemove}
                />
              </div>
            ))
          )}
        </div>

        {/* 하단 일괄 처리 버튼 */}
        {wishlist.length > 0 && (
          <div className="miku-wish-action-group anim-slide-up">
            <button className="btn-outline" onClick={toggleAllSelection}>
              {selectedItems.length === wishlist.length ? '전체 해제' : '전체 선택'}
            </button>
            <button className="btn-danger" onClick={handleRemoveSelected}>
              선택 삭제 ({selectedItems.length})
            </button>
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="miku-wish-pagination anim-slide-up">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button 
                key={page} 
                onClick={() => setCurrentPage(page)} 
                className={`page-btn ${currentPage === page ? 'active' : ''}`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* 3. 디자인 영역 (CSS Layer) */}
      {/* 호버 효과와 모바일 반응형 감지 등을 모두 순수 CSS로 통제합니다. */}
      {/* 글로벌 오염 방지를 위해 모든 클래스명은 .miku-wish- 로 시작합니다. */}
      {/* ================================================================= */}
      <style jsx global>{`
        /* 공통 래퍼 */
        .miku-wish-wrapper {
          max-width: 1000px;
          margin: 0 auto;
          color: #0f172a;
          font-family: 'Pretendard', "Noto Sans KR", sans-serif;
          box-sizing: border-box;
        }

        /* 환율 헤더 */
        .miku-wish-header {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 24px;
          width: 100%;
        }
        .miku-wish-rate-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          padding: 12px 20px;
          border-radius: 100px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          font-size: 14px;
          color: #475569;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
          box-sizing: border-box;
        }
        .miku-wish-rate-pill .icon { font-size: 16px; }
        .miku-wish-rate-pill b { color: #0ea5e9; font-weight: 800; }

        /* 🌟 빈 화면 (Empty State - 레이아웃 복구 완벽 처리) */
        .miku-wish-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          text-align: center;
          background-color: #ffffff;
          border-radius: 24px;
          border: 1px dashed #cbd5e1;
          color: #64748b;
          width: 100%;
          box-sizing: border-box;
        }
        .miku-wish-empty svg { width: 48px; height: 48px; color: #cbd5e1; margin-bottom: 16px; }
        .miku-wish-empty h2 { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
        .miku-wish-empty p { font-size: 15px; margin: 0; }

        /* 리스트 영역 */
        .miku-wish-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }

        .miku-wish-item-row {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
          box-sizing: border-box;
        }

        /* 🌟 커스텀 애니메이션 체크박스 */
        .miku-wish-checkbox {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 2px solid #cbd5e1;
          background-color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
        }
        .miku-wish-checkbox svg {
          width: 14px;
          height: 14px;
          color: white;
          opacity: 0;
          transform: scale(0.5);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .miku-wish-checkbox.active {
          border-color: #ff4b2b;
          background: linear-gradient(135deg, #ff4b2b 0%, #e63e1f 100%);
          box-shadow: 0 4px 10px rgba(255, 75, 43, 0.2);
        }
        .miku-wish-checkbox.active svg { opacity: 1; transform: scale(1); }

        /* 🌟 프리미엄 상품 카드 */
        .miku-wish-card {
          flex: 1;
          background-color: #ffffff;
          border-radius: 24px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 4px 10px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: row;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
        }
        .miku-wish-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.08);
          border-color: #cbd5e1;
        }

        .miku-wish-card-inner {
          display: flex;
          flex: 1;
          padding: 20px;
          gap: 24px;
          align-items: center;
          box-sizing: border-box;
        }

        /* 썸네일 */
        .miku-wish-img-box {
          width: 110px;
          height: 110px;
          flex-shrink: 0;
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          box-sizing: border-box;
        }
        .miku-wish-img-box img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: transform 0.3s ease;
        }
        .miku-wish-card:hover .miku-wish-img-box img { transform: scale(1.05); }

        /* 정보 및 타이틀 */
        .miku-wish-info { flex: 1; min-width: 0; }
        .miku-wish-info h3 {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 10px 0;
          cursor: pointer;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 0.2s;
        }
        .miku-wish-info h3:hover { text-decoration: underline; }

        .miku-wish-price-box {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 12px;
        }
        .price-yen { font-size: 20px; font-weight: 900; color: #0f172a; }
        .price-won { font-size: 14px; color: #ef4444; font-weight: 700; }

        /* 상세보기 버튼 */
        .miku-wish-detail-btn {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          background-color: #f1f5f9;
          color: #334155;
        }
        .miku-wish-detail-btn:hover { background-color: #0f172a; color: #ffffff; }

        /* 삭제 버튼 */
        .miku-wish-delete-btn {
          width: 64px;
          height: auto;
          cursor: pointer;
          background: #ffffff;
          border: none;
          border-left: 1px dashed #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .miku-wish-delete-btn svg { width: 20px; height: 20px; }
        .miku-wish-delete-btn:hover { background-color: #fff1f2; color: #e11d48; }

        /* 하단 액션 그룹 버튼들 */
        .miku-wish-action-group {
          display: flex;
          flex-direction: row;
          justify-content: center;
          gap: 16px;
          marginTop: 40px;
          width: 100%;
        }
        .miku-wish-action-group button {
          width: auto;
          padding: 14px 28px;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .btn-outline { background-color: #ffffff; border: 1px solid #cbd5e1; color: #334155; }
        .btn-outline:hover { background-color: #f8fafc; border-color: #94a3b8; }
        
        .btn-danger { background-color: #ffffff; border: 1px solid #fca5a5; color: #ef4444; }
        .btn-danger:hover { background-color: #ef4444; color: #ffffff; box-shadow: 0 8px 16px rgba(239, 68, 68, 0.2); }

        /* 페이지네이션 */
        .miku-wish-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin-top: 40px;
          padding-bottom: 20px;
          width: 100%;
        }
        .page-btn {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 800;
          font-size: 14px;
          transition: all 0.2s;
          border: 1px solid #e2e8f0;
          background-color: #ffffff;
          color: #64748b;
        }
        .page-btn:hover { background-color: #f1f5f9; color: #0f172a; }
        .page-btn.active {
          border-color: #0f172a;
          background-color: #0f172a;
          color: #ffffff;
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2);
        }

        /* 상세 모달 */
        .miku-wish-detail-anchor { scroll-margin-top: 20px; width: 100%; }
        .miku-wish-modal-wrapper {
          position: relative;
          width: 100%;
          margin: 0 auto 40px;
          background-color: #fff;
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 28px;
          box-shadow: 0 24px 48px -12px rgba(0,0,0,0.1);
          z-index: 1000;
          overflow: hidden;
        }
        .miku-wish-modal-close {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: #f1f5f9;
          border: none;
          color: #64748b;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1001;
          transition: all 0.2s;
        }
        .miku-wish-modal-close:hover { background-color: #e2e8f0; color: #0f172a; transform: rotate(90deg); }

        /* 애니메이션 */
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.98) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .anim-slide-up { opacity: 0; animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-pop-in { animation: popIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        /* =============================================================
           📱 모바일 반응형 처리 (JS 개입 없이 CSS로 완벽 제어)
           ============================================================= */
        @media (max-width: 768px) {
          .miku-wish-header { justify-content: center; }
          .miku-wish-rate-pill { width: 100%; justify-content: center; }
          
          .miku-wish-item-row { gap: 12px; }
          
          .miku-wish-card { flex-direction: column; }
          /* 모바일에서는 hover 시 카드가 위로 올라가지 않도록 고정 */
          .miku-wish-card:hover { transform: translateY(0); box-shadow: 0 4px 10px rgba(0,0,0,0.02); }

          .miku-wish-card-inner { padding: 16px; gap: 16px; align-items: flex-start; }
          .miku-wish-img-box { width: 90px; height: 90px; }
          .miku-wish-info h3 { font-size: 14px; }
          .price-yen { font-size: 18px; }

          .miku-wish-delete-btn {
            width: 100%;
            height: 44px;
            border-left: none;
            border-top: 1px dashed #e2e8f0;
            background-color: #f8fafc;
          }

          .miku-wish-action-group { flex-direction: column; gap: 12px; margin-top: 30px; }
          .miku-wish-action-group button { width: 100%; padding: 16px; }
        }
      `}</style>
    </GuideLayout>
  );
}