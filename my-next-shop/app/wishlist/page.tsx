"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GlobalProductDetail from '@/app/main_shop/components/GlobalProductDetail';
import { useExchangeRate } from '../context/ExchangeRateContext';
import GuideLayout from '../components/GuideLayout';

export default function WishlistPage() {
  const router = useRouter();
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const { exchangeRate } = useExchangeRate();
  const detailRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    if (selectedItem) {
      window.history.pushState({ isDetail: true }, "");
    }
    const handlePopState = (event: PopStateEvent) => {
      if (selectedItem) {
        setSelectedItem(null);
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedItem]);

  useEffect(() => {
    const domain = window.location.hostname;
    document.cookie = `googtrans=/ja/ko; path=/;`;
    document.cookie = `googtrans=/ja/ko; domain=${domain}; path=/;`;

    const savedWishlist = JSON.parse(localStorage.getItem('rakutenWishlist') || '[]');
    setWishlist(savedWishlist);
    setSelectedItems(savedWishlist.map((item: any) => item.itemId));
  }, []);

  const updateCounts = () => {
    const savedWishlist = JSON.parse(localStorage.getItem('rakutenWishlist') || '[]');
    setWishlist(savedWishlist);
  };

  const handleRemove = (itemId: string) => {
    if (confirm("이 상품을 관심상품에서 삭제하시겠습니까?")) {
      const updatedWishlist = wishlist.filter((item) => item.itemId !== itemId);
      setWishlist(updatedWishlist);
      localStorage.setItem('rakutenWishlist', JSON.stringify(updatedWishlist));
      if (currentItems.length === 1 && currentPage > 1) {
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

  return (
    <GuideLayout title="관심물품보기" type="mypage">
      
      <style jsx global>{`
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.95) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        .anim-slide-up { opacity: 0; animation: slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-pop-in { animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        .hover-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .hover-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.08) !important; }
        
        /* 📱 모바일 대응 스타일 */
        @media (max-width: 768px) {
          .wishlist-container { padding: 10px !important; }
          .wishlist-header { flex-direction: column; align-items: stretch !important; gap: 15px; margin-bottom: 20px !important; }
          
          /* 상품 카드 구조 변경 */
          .wish-item-row { gap: 10px !important; }
          .wish-card { flex-direction: column !important; }
          .wish-card-inner { padding: 15px !important; gap: 15px !important; flex-direction: row !important; align-items: flex-start !important; }
          
          .product-img-box { width: 90px !important; height: 90px !important; }
          .product-info-box h3 { font-size: 14px !important; -webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; }
          .price-yen { font-size: 16px !important; }
          .price-won { font-size: 13px !important; }
          
          .btn-detail { padding: 8px 12px !important; font-size: 12px !important; }
          .delete-bar { width: 45px !important; border-left: 1px dashed #eee !important; }
          .delete-bar i { font-size: 16px !important; }

          /* 하단 버튼 2열 배치 */
          .action-btn-group { display: grid !important; grid-template-columns: 1fr 1fr; gap: 10px !important; }
          .action-btn-group button { width: 100% !important; padding: 12px !important; font-size: 14px !important; }
        }
      `}</style>

      <div className="wishlist-container" style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'Pretendard, "Noto Sans KR", sans-serif' }}>
        
        {/* 상세 보기 영역 */}
        <div ref={detailRef} style={{ scrollMarginTop: '20px' }}>
          {selectedItem && (
            <div className="anim-pop-in" style={{ position: 'relative', width: '100%', margin: '0 auto 40px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', zIndex: 1000, overflow: 'hidden' }}>
              <button onClick={() => setSelectedItem(null)} style={{ position: 'absolute', top: '15px', right: '15px', width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f8fafc', border: 'none', color: '#64748b', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>✕</button>
              <GlobalProductDetail product={selectedItem}/>
            </div>
          )}
        </div>

        {/* 상단 헤더 - 환율 정보 */}
        <div className="anim-slide-up wishlist-header" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
          <div style={{ backgroundColor: '#f0f9ff', padding: '10px 18px', borderRadius: '20px', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#0ea5e9', fontWeight: '700' }}>
              환율: 100엔 = {exchangeRate.toFixed(2)}원
            </span>
          </div>
        </div>

        {/* 상품 리스트 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {wishlist.length === 0 ? (
            <div className="anim-slide-up" style={{ padding: '80px 0', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>📭</span>
              담아둔 관심상품이 없습니다.
            </div>
          ) : (
            currentItems.map((item, index) => (
              <div key={item.itemId || index} className="anim-slide-up wish-item-row" style={{ animationDelay: `${index * 0.05}s`, display: 'flex', alignItems: 'center', gap: '15px' }}>
                {/* 체크박스 */}
                <div onClick={() => toggleItemSelection(item.itemId)} style={{ width: '24px', height: '24px', backgroundColor: selectedItems.includes(item.itemId) ? '#ff4b2b' : '#fff', border: `2px solid ${selectedItems.includes(item.itemId) ? '#ff4b2b' : '#cbd5e1'}`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
                  {selectedItems.includes(item.itemId) && <i className="fa fa-check" style={{ fontSize: '12px' }}></i>}
                </div>

                {/* 상품 카드 */}
                <div className="hover-card wish-card" style={{ flex: 1, backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.02)', display: 'flex', overflow: 'hidden' }}>
                  <div className="wish-card-inner" style={{ padding: '20px', display: 'flex', flex: 1, gap: '20px', alignItems: 'center' }}>
                    <div onClick={() => handleItemClick(item)} className="product-img-box" style={{ width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, cursor: 'pointer', border: '1px solid #f1f5f9' }}>
                      <img src={item.imageUrl} alt="상품" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div className="product-info-box" style={{ flex: 1 }}>
                      <h3 onClick={() => handleItemClick(item)} style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '8px', cursor: 'pointer', lineHeight: '1.4' }}>{item.itemName}</h3>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span className="price-yen" style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b' }}>¥{Number(item.priceYen).toLocaleString()}</span>
                        <span className="price-won" style={{ fontSize: '14px', color: '#ef4444', fontWeight: '700' }}>(₩{(Math.round(Number(item.priceYen) * exchangeRate / 100) * 100).toLocaleString()})</span>
                      </div>
                      <div className="btn-detail" onClick={() => handleItemClick(item)} style={{ marginTop: '12px', display: 'inline-block', padding: '6px 14px', backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>상세보기</div>
                    </div>
                  </div>
                  {/* 삭제 버튼 */}
                  <div className="delete-bar" onClick={() => handleRemove(item.itemId)} style={{ width: '60px', backgroundColor: '#fff', borderLeft: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <i className="fa fa-trash-alt" style={{ fontSize: '18px', color: '#94a3b8' }}></i>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 하단 전체 조작 버튼 */}
        {wishlist.length > 0 && (
          <div className="anim-slide-up action-btn-group" style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '40px' }}>
            <button onClick={toggleAllSelection} style={{ padding: '14px 24px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '14px', color: '#334155', fontWeight: '800', cursor: 'pointer' }}>전체 선택</button>
            <button onClick={handleRemoveSelected} style={{ padding: '14px 24px', backgroundColor: '#fff', border: '1px solid #fca5a5', borderRadius: '12px', fontSize: '14px', color: '#ef4444', fontWeight: '800', cursor: 'pointer' }}>선택 삭제</button>
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="anim-slide-up" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '30px', paddingBottom: '40px' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button key={page} onClick={() => setCurrentPage(page)} style={{ width: '36px', height: '36px', border: 'none', backgroundColor: currentPage === page ? '#0f172a' : '#f1f5f9', color: currentPage === page ? '#fff' : '#64748b', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', fontSize: '13px' }}>{page}</button>
            ))}
          </div>
        )}
      </div>
    </GuideLayout>
  );
}