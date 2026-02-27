"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductDetail from '../main_shop/rakuten/ProductDetail';
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

  // ★ 브라우저 뒤로가기 제어
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
    // 자동 번역을 위한 쿠키 설정
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

  // 페이지네이션 계산
  const totalPages = Math.ceil(wishlist.length / ITEMS_PER_PAGE);
  const currentItems = wishlist.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <GuideLayout title="관심물품보기" type="mypage">
      
      {/* 🌟 전역 애니메이션 키프레임 정의 */}
      <style jsx global>{`
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.95) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        .anim-slide-up {
          opacity: 0;
          animation: slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .anim-pop-in {
          animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* 호버 유틸리티 클래스 */
        .hover-card {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
        }
        .hover-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.08) !important;
        }
        
        .btn-transition {
          transition: all 0.2s ease;
        }
        .btn-transition:active {
          transform: scale(0.96);
        }
      `}</style>

      <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'Pretendard, "Noto Sans KR", dotum, sans-serif' }}>
        
        <div ref={detailRef} style={{ scrollMarginTop: '20px' }}>
        {selectedItem && (
          <div className="anim-pop-in" style={{ 
              position: 'relative',    
              width: '100%',            
              margin: '20px auto 40px',     
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
              zIndex: 1000,
              overflow: 'hidden'
          }}>
            <div style={{ textAlign: 'right' }}>
              <button 
                onClick={() => setSelectedItem(null)}
                className="btn-transition"
                style={{ 
                  position: 'absolute', top: '15px', right: '15px', width: '40px', height: '40px',
                  borderRadius: '50%', backgroundColor: '#f8fafc', border: 'none', color: '#64748b',
                  fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', zIndex: 1001
                }}
                onMouseOver={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseOut={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
              >
                ✕
              </button>
            </div>
            <ProductDetail 
              item={selectedItem} 
              exchangeRate={exchangeRate} 
              onCartUpdate={updateCounts}
              showWishlistButton={false}
            />
          </div>
        )}
        </div>

        {/* 🌟 상단 헤더 영역 */}
        <div className="anim-slide-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          </div>
          <div style={{ backgroundColor: '#f0f9ff', padding: '10px 18px', borderRadius: '20px', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <i className="fa fa-tag" style={{ color: '#0ea5e9' }}></i>
              <span style={{ fontSize: '14px', color: '#0ea5e9', fontWeight: '700' }}>
                  환율 환산: 100엔 = {exchangeRate.toFixed(2)}원
              </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
          
          {/* 🌟 상품 리스트 영역 */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {wishlist.length === 0 ? (
                  <div className="anim-slide-up" style={{ padding: '100px 0', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '16px', fontWeight: '500' }}>
                      <span style={{ fontSize: '40px', display: 'block', marginBottom: '15px', opacity: 0.5 }}>📭</span>
                      담아둔 관심상품이 없습니다.
                  </div>
              ) : (
                  currentItems.map((item, index) => {
                    // 🌟 카드별 순차 등장 딜레이 적용 (0.1s, 0.2s, 0.3s ...)
                    const animationDelay = `${0.1 + index * 0.1}s`;

                    return (
                      <div key={item.itemId || index} className="anim-slide-up" style={{ animationDelay, display: 'flex', alignItems: 'center', gap: '15px' }}>
                          {/* 체크박스 */}
                          <div 
                            className="btn-transition"
                            onClick={() => toggleItemSelection(item.itemId)} 
                            style={{ 
                              width: '26px', height: '26px', 
                              backgroundColor: selectedItems.includes(item.itemId) ? '#ff4b2b' : '#fff',
                              border: `2px solid ${selectedItems.includes(item.itemId) ? '#ff4b2b' : '#cbd5e1'}`, 
                              borderRadius: '6px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer'
                          }}>
                              {selectedItems.includes(item.itemId) && <i className="fa fa-check" style={{ fontSize: '14px' }}></i>}
                          </div>

                          {/* 상품 카드 */}
                          <div className="hover-card" style={{ flex: 1, backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.02)', display: 'flex', overflow: 'hidden' }}>
                              <div style={{ padding: '20px', display: 'flex', flex: 1, gap: '24px', alignItems: 'center' }}>
                                  <div 
                                      onClick={() => handleItemClick(item)}
                                      style={{ width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #f1f5f9', cursor: 'pointer', backgroundColor: '#fff' }}
                                  >
                                      <img src={item.imageUrl} alt="상품" style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.3s' }} onMouseOver={e => e.currentTarget.style.transform='scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform='scale(1)'} />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                      <h3 
                                          onClick={() => handleItemClick(item)}
                                          style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', marginBottom: '12px', cursor: 'pointer', lineHeight: '1.4' }}
                                          onMouseOver={e => e.currentTarget.style.color='#ff4b2b'}
                                          onMouseOut={e => e.currentTarget.style.color='#0f172a'}
                                      >
                                          {item.itemName}
                                      </h3>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                          <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>
                                              ¥{Number(item.priceYen).toLocaleString()}
                                          </div>
                                          <div style={{ fontSize: '15px', color: '#ef4444', fontWeight: '800' }}>
                                              (₩{(Math.round(Number(item.priceYen) * exchangeRate / 100) * 100).toLocaleString()})
                                          </div>
                                      </div>
                                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '12px', fontWeight: '500' }}>
                                          <span style={{ backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', marginRight: '8px' }}>{item.shopName}</span> 
                                          등록일: {new Date(item.addedAt || Date.now()).toLocaleDateString()}
                                      </div>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      <button 
                                          className="btn-transition"
                                          onClick={() => handleItemClick(item)}
                                          style={{ padding: '10px 20px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', fontSize: '14px', boxShadow: '0 4px 6px rgba(15, 23, 42, 0.2)' }}
                                          onMouseOver={e => e.currentTarget.style.backgroundColor='#334155'}
                                          onMouseOut={e => e.currentTarget.style.backgroundColor='#0f172a'}
                                      >
                                          상세보기
                                      </button>
                                  </div>
                              </div>
                              
                              {/* 삭제 바 */}
                              <div 
                                  className="btn-transition"
                                  onClick={() => handleRemove(item.itemId)}
                                  style={{ width: '60px', backgroundColor: '#fff', borderLeft: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                  onMouseOver={e => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.children[0].style.color = '#ef4444'; }}
                                  onMouseOut={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.children[0].style.color = '#94a3b8'; }}
                              >
                                  <i className="fa fa-trash-alt" style={{ fontSize: '20px', color: '#94a3b8', transition: 'color 0.2s' }}></i>
                              </div>
                          </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* 🌟 하단 전체 조작 버튼 */}
            {wishlist.length > 0 && (
              <div className="anim-slide-up" style={{ animationDelay: '0.4s', display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '40px' }}>
                  <button 
                    className="btn-transition"
                    onClick={toggleAllSelection}
                    style={{ padding: '14px 28px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '15px', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = '#0f172a'; e.currentTarget.style.color = '#0f172a'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; }}
                  >
                      <div style={{ width: '20px', height: '20px', backgroundColor: selectedItems.length === wishlist.length && wishlist.length > 0 ? '#ff4b2b' : '#fff', border: `2px solid ${selectedItems.length === wishlist.length && wishlist.length > 0 ? '#ff4b2b' : '#cbd5e1'}`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        {selectedItems.length === wishlist.length && wishlist.length > 0 && <i className="fa fa-check" style={{ fontSize: '10px' }}></i>}
                      </div>
                      전체 선택
                  </button>
                  <button 
                    className="btn-transition"
                    onClick={handleRemoveSelected}
                    style={{ padding: '14px 28px', backgroundColor: '#fff', border: '1px solid #fca5a5', borderRadius: '12px', fontSize: '15px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                    onMouseOver={e => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                    onMouseOut={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
                  >
                      <i className="fa fa-trash-alt"></i>
                      선택 삭제
                  </button>
              </div>
            )}

            {/* 🌟 페이지네이션 */}
            {totalPages > 1 && (
              <div className="anim-slide-up" style={{ animationDelay: '0.5s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '30px' }}>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    style={{ width: '38px', height: '38px', border: '1px solid #e2e8f0', backgroundColor: '#fff', borderRadius: '10px', cursor: 'pointer', color: '#64748b', fontWeight: 'bold', transition: 'all 0.2s' }}
                    onMouseOver={e=>e.currentTarget.style.backgroundColor='#f8fafc'} onMouseOut={e=>e.currentTarget.style.backgroundColor='#fff'}
                  >{"<"}</button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button 
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{ 
                        width: '38px', height: '38px', border: 'none', 
                        backgroundColor: currentPage === page ? '#0f172a' : 'transparent', 
                        color: currentPage === page ? '#fff' : '#64748b', 
                        borderRadius: '10px', cursor: 'pointer', fontWeight: '800',
                        transition: 'all 0.2s'
                      }}
                    >
                        {page}
                    </button>
                  ))}

                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    style={{ width: '38px', height: '38px', border: '1px solid #e2e8f0', backgroundColor: '#fff', borderRadius: '10px', cursor: 'pointer', color: '#64748b', fontWeight: 'bold', transition: 'all 0.2s' }}
                    onMouseOver={e=>e.currentTarget.style.backgroundColor='#f8fafc'} onMouseOut={e=>e.currentTarget.style.backgroundColor='#fff'}
                  >{">"}</button>
              </div>
            )}
          </div>

        </div>
      </div>
    </GuideLayout>
  );
}