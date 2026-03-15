"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProductCard from '../rakuten/ProductCard';
import ProductDetail from '../rakuten/ProductDetail';
import SortBar from '../rakuten/SortBar';
import Pagination from '../rakuten/Pagination';
import Link from 'next/link';
import { useExchangeRate } from '@/app/context/ExchangeRateContext';

// 1. 실제 로직을 담당하는 Content 컴포넌트
function YahooShoppingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL에서 상태 추출
  const genreId = searchParams.get('genreId') || '0';
  const sort = searchParams.get('sort') || 'standard';
  const page = searchParams.get('page') || '1';
  
  const [categories, setCategories] = useState([]); 
  const [currentGenre, setCurrentGenre] = useState({ genreName: '' }); 
  const [parentsGenre, setParentsGenre] = useState<any[]>([]); 
  const [childrenGenre, setChildrenGenre] = useState([]); 
  const [items, setItems] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, pageCount: 0, sort : 'standard' });
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

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

  const detailRef = useRef<HTMLDivElement>(null);
  const { exchangeRate } = useExchangeRate();
  const [cartCount, setCartCount] = useState<number>(0);
  const [wishlistCount, setWishlistCount] = useState<number>(0);

  const getDynamicApiUrl = (path: string, queryParams: string) => {
    const hostName = window.location.hostname; 
    const protocol = window.location.protocol;
    
    if (hostName.includes('ngrok-free.dev')) {
        return `${protocol}//${hostName}/rakuten/${path}?${queryParams}`;
    }
    return `${protocol}//${hostName}:4000/rakuten/${path}?${queryParams}`;
  };

  const updateCounts = () => {
    const savedCart = JSON.parse(localStorage.getItem('rakutenCart') || '[]');
    setCartCount(savedCart.length);
    const savedWishlist = JSON.parse(localStorage.getItem('rakutenWishlist') || '[]');
    setWishlistCount(savedWishlist.length);
  };

  useEffect(() => {
    updateCounts();
  }, []);

  useEffect(() => {
      const domain = window.location.hostname;
      document.cookie = `googtrans=/ja/ko; path=/;`;
      document.cookie = `googtrans=/ja/ko; domain=${domain}; path=/;`;

      async function fetchCategories() {
          setSelectedItem(null);
          setItems([]); 

          const apiUrl = getDynamicApiUrl('categories', `genreId=${genreId}`);
          const res = await fetch(apiUrl); 
          const data = await res.json();

          setCategories(data.children || []); 
          setCurrentGenre(data.current || { genreName: '' }); 
          setParentsGenre(data.parents || []); 
          setChildrenGenre(data.children || []); 
      }
      fetchCategories();
  }, [genreId]);

  useEffect(() => {
    async function loadItems() {
      if (genreId === '0') {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const apiUrl = getDynamicApiUrl('items', `genreId=${genreId}&sort=${sort}&page=${page}`);
        const response = await fetch(apiUrl);
        const data = await response.json();

        setItems(data.items || []);
        setPageInfo({ page: data.page, pageCount: data.pageCount, sort : sort});
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    }
    if (genreId !== '0') loadItems();
  }, [genreId, sort, page]);

  return (
    <div className="category-box">
      <div className="page-title-container" role="alert">
        <nav className="breadcrumb-bar">
          <a href="/" style={{ fontSize: '20px' }}><i className="fa fa-home" style={{ marginRight: '8px' }}></i> 홈 </a>
          {parentsGenre.map((parent, index) => {
            const currentSort = searchParams.get('sort');
            const params = new URLSearchParams();
            params.set('genreId', parent.genreId);
            if (currentSort) {
              params.set('sort', currentSort);
            }
            params.set('page', '1'); 

            return (
              <span key={parent.genreId || index} style={{ fontSize: '13px', color: '#666' }}>
                <span style={{ margin: '0 8px', color: '#ccc' }}>  `&gt;` </span>
                <Link 
                  href={`/rakuten?${params.toString()}`}
                  style={{ 
                    fontSize: '18px',
                    textDecoration: 'none', 
                    color: '#666',
                    cursor: 'pointer' 
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  {parent.genreName}
                </Link>
              </span>
            );
          })}

          {currentGenre.genreName && (
            <>
              <span style={{ margin: '0 8px', color: '#ccc' }}> `&gt;` </span>
              <span style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#333' 
              }}>
                {currentGenre.genreName}
              </span>
            </>
          )}
        </nav>
      </div>

      <div className="category-box" style={{ width: '100%', marginBottom: '20px' }}>
        {categories.length === 0 ? (
          <p style={{ fontSize: '16px', color: '#888', padding: '20px' }}>하위 카테고리가 없습니다.</p> 
        ) : (
            <div 
              className="category-flex-container" 
              style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
                  gap: '10px 20px', 
                  width: '100%'
              }}
            >
              {categories.map((cat: any) => {
                  const params = new URLSearchParams();
                  params.set('genreId', cat.genreId); 
                  if (sort) params.set('sort', sort);

                  return (
                    <div key={cat.genreId} className="cat-item">
                      <Link href={`/rakuten?${params.toString()}`}
                          style={{
                              fontSize: '16px',
                              fontWeight: '500',         
                              padding: '6px 12px',
                              letterSpacing: '-0.3px',
                              display: 'inline-block',
                              border: 'none',            
                              backgroundColor: 'transparent', 
                              color: '#666',             
                              textDecoration: 'none',
                              textAlign: 'left',         
                              whiteSpace: 'nowrap',
                              transition: 'color 0.2s ease', 
                              lineHeight: '1.2'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#337ab7'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#333'}
                      >
                        {cat.genreName}
                      </Link>
                    </div>
                  );
              })}
            </div>
        )}
      </div>

      {!loading && items.length > 0 ? (
        <>
          <SortBar 
              currentSort={sort}
              setSelectedItem={setSelectedItem} 
          />

          <div ref={detailRef} style={{ scrollMarginTop: '20px' }}>
          {selectedItem && (
            <div className="detail-view-container" style={{ 
                position: 'relative',    
                width: '100%',            
                maxWidth: '1500px',      
                margin: '20px auto',     
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                zIndex: 1000
            }}>
              <div style={{ textAlign: 'right' }}>
                <button 
                  onClick={() => {
                    setSelectedItem(null);
                      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                  }}
                  style={{ 
                    position: 'absolute', top: '-15px', right: '-20px', width: '50px', height: '50px',
                    borderRadius: '50%', backgroundColor: '#fff', border: '2px solid #333',
                    fontSize: '25px', fontWeight: 'bold', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    paddingTop: '4px', paddingLeft: '2px', zIndex: 1001
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eee'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                >
                  X
                </button>
              </div>
              <ProductDetail 
                key={selectedItem.itemId} 
                item={selectedItem} 
                exchangeRate={exchangeRate} 
                onCartUpdate={updateCounts}
              />
            </div>
          )}
          </div>
          <div className="item-box">
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '15px', padding: '20px', backgroundColor: '#f9f9f9'
            }}>
              {items.map((item: any) => (
                <ProductCard 
                  key={item.itemId} 
                  item={item} 
                  exchangeRate={exchangeRate} 
                  onWishlistUpdate={updateCounts}
                  onItemClick={() => {
                      setSelectedItem(item);
                      const yOffset = -60; 
                      if (detailRef.current) {
                        const elementPosition = detailRef.current.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.scrollY + yOffset;
                        window.scrollTo({
                          top: offsetPosition,
                          behavior: 'smooth'
                        });
                      }
                  }}
                />
              ))}
            </div>
          </div>
          <Pagination currentPage={pageInfo.page} pageCount={pageInfo.pageCount} />
        </>
      ) : (
        loading && (
          <div style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            padding: '100px 0', width: '100%', minHeight: '400px'  
          }}>
            <i className="fa fa-spinner fa-spin fa-3x" style={{ color: '#337ab7', marginBottom: '20px' }}></i>
            <p style={{ fontSize: '16px', color: '#666' }}>상품 정보를 불러오는 중입니다...</p>
          </div>
        )
      )}
    </div>
  );
}

// 2. 최종 Export할 페이지 컴포넌트 (Suspense 적용)
export default function YahooShoppingPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <i className="fa fa-spinner fa-spin fa-2x" style={{ color: '#337ab7' }}></i>
      </div>
    }>
      <YahooShoppingContent />
    </Suspense>
  );
}