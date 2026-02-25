"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProductCard from '../rakuten/ProductCard';
import ProductDetail from '../rakuten/ProductDetail';
import SortBar from '../rakuten/SortBar';
import Pagination from '../rakuten/Pagination';
import Link from 'next/link';
import { useExchangeRate } from '@/app/context/ExchangeRateContext';

export default function YahooShoppingPage() {
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
      // 상세보기가 열릴 때 히스토리에 가짜 상태 추가
      window.history.pushState({ isDetail: true }, "");
    }

    const handlePopState = (event: PopStateEvent) => {
      if (selectedItem) {
        // 뒤로가기 발생 시 상세보기를 닫고 히스토리 이동을 막음
        setSelectedItem(null);
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedItem]);

  // ★ 2. ProductDetail의 위치를 기억할 ref 생성
  const detailRef = useRef<HTMLDivElement>(null);

  // 글로벌 환율 정보 가져오기
  const { exchangeRate } = useExchangeRate();
  const [cartCount, setCartCount] = useState<number>(0);
  const [wishlistCount, setWishlistCount] = useState<number>(0);

  // API 주소를 동적으로 생성하는 함수
  const getDynamicApiUrl = (path: string, queryParams: string) => {
    const hostName = window.location.hostname; 
    const protocol = window.location.protocol;
    
    // ngrok 도메인인 경우 포트 없이 요청 (타임아웃 방지)
    if (hostName.includes('ngrok-free.dev')) {
        return `${protocol}//${hostName}/rakuten/${path}?${queryParams}`;
    }

    return `${protocol}//${hostName}:4000/rakuten/${path}?${queryParams}`;
  };

  // ★ 장바구니 개수를 다시 계산하는 함수 (자식 컴포넌트에게도 전달됨)
  const updateCounts = () => {
    const savedCart = JSON.parse(localStorage.getItem('rakutenCart') || '[]');
    setCartCount(savedCart.length);
    const savedWishlist = JSON.parse(localStorage.getItem('rakutenWishlist') || '[]');
    setWishlistCount(savedWishlist.length);
  };

  // 처음 로드될 때 개수 세팅
  useEffect(() => {
    updateCounts(); // 화면 열릴 때 뱃지 세팅
  }, []);

  // 카테고리 데이터 로드
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

  // 상품 데이터 로드
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

      {/* 카테고리 박스 영역 */}
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
              

              {/* ★ ProductDetail에 onCartUpdate 프롭스로 갱신 함수 전달 */}
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

                      // 1. 위로 띄울 여백(오프셋)을 설정합니다. (음수로 설정하면 위로 올라갑니다)
                      const yOffset = -60; 
                      
                      // 2. 요소의 현재 화면상 위치 + 현재 스크롤 위치 + 오프셋(-20) 계산
                      if (detailRef.current) {
                        const elementPosition = detailRef.current.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.scrollY + yOffset;
                
                        // 3. 계산된 정확한 좌표로 부드럽게 스크롤합니다!
                        window.scrollTo({
                          top: offsetPosition,
                          behavior: 'smooth'
                        });
                      }
                      //window.scrollTo({ top: 570, left: 0, behavior: 'smooth' });
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
