"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// --- 📦 공용 글로벌 컴포넌트 ---
import { GlobalSidebar, GlobalFilterState } from "@/app/main_shop/components/GlobalSidebar";
import GlobalCategoryGrid from "@/app/main_shop/components/GlobalCategoryGrid";
import GlobalProductDetail, { GlobalProduct } from "@/app/main_shop/components/GlobalProductDetail";
import GlobalProductCard, { GlobalItem } from "@/app/main_shop/components/GlobalProductCard";

// --- 🛠️ 유틸리티 ---
import SortBar from './SortBar';
import Pagination from './Pagination';
import FloatingButtons from '@/app/components/FloatingButtons';
import { useExchangeRate } from '@/app/context/ExchangeRateContext';

// --- 🎨 [재사용 스타일] 컴포넌트 외부 분리 ---
const getPageStyles = (isMobile: boolean) => ({
  pageWrapper: { width: '100%', minHeight: '100vh', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'center' },
  container: { width: '100%', maxWidth: '2000px', padding: isMobile ? '8px 12px' : '20px 24px', display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  mainLayout: { display: 'flex', flexDirection: isMobile ? 'column' as const : 'row' as const, gap: '20px', alignItems: 'flex-start' },
  sidebarWrapper: { width: isMobile ? '100%' : '390px', flexShrink: 0, position: isMobile ? 'static' as const : 'sticky' as const, top: '120px', zIndex: 10 },
  contentArea: { flex: 1, minWidth: 0, width: '100%' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '20px', fontSize: '13px', color: '#9ca3af', overflowX: 'auto' as const, whiteSpace: 'nowrap' as const },
  categoryCard: { backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '24px', padding: isMobile ? '20px' : '32px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', marginBottom: '40px' },
  itemGrid: { display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: isMobile ? '12px' : '24px' }
});

export default function RakutenPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { exchangeRate } = useExchangeRate();

  // URL 파라미터 상태
  const genreId = searchParams.get('genreId') || '0';
  const sort = searchParams.get('sort') || 'standard';
  const page = searchParams.get('page') || '1';
  
  // 데이터 상태
  const [categories, setCategories] = useState([]);
  const [path, setPath] = useState<{id: number, name: string}[]>([]);
  const [levelOptions, setLevelOptions] = useState<{[key: number]: any[]}>({});
  const [items, setItems] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, pageCount: 0 });
  const [loading, setLoading] = useState(false);
  
  // UI 상태
  const [selectedProduct, setSelectedProduct] = useState<GlobalProduct | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const styles = useMemo(() => getPageStyles(isMobile), [isMobile]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize(); window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🚀 [로직 1] 라쿠텐 데이터를 Global 규격으로 변환 (재사용 함수)
  const mapToGlobal = (item: any): GlobalProduct => ({
    id: item.itemId,
    platform: 'rakuten',
    name: item.itemName,
    price: item.itemPrice,
    description: item.itemCaption || "상세 설명이 없습니다.",
    images: item.mediumImageUrls || [item.itemImageUrl],
    thumbnail: item.mediumImageUrls?.[0] || item.itemImageUrl,
    condition: "",
    size: "", 
    categories: [], 
    url: item.itemUrl,
    shopUrl: item.itemUrl,
    status: item.availability === 1 ? 'on_sale' : 'sold_out',
    shopName : item.shopName,
  });

  // 🚀 [로직 2] 통합 네비게이션 함수
  const updateNavigation = (id: number, name: string, levelIndex?: number) => {
    if (!id || id === 0) { setPath([]); router.push('/main_shop/rakuten'); return; }
    
    setPath(prev => {
      if (levelIndex !== undefined) return [...prev.slice(0, levelIndex), { id, name }];
      const idx = prev.findIndex(p => p.id === id);
      return idx !== -1 ? prev.slice(0, idx + 1) : [...prev, { id, name }];
    });
    router.push(`/main_shop/rakuten?genreId=${id}&sort=${sort}&page=1`);
  };

  // 🚀 [로직 3] 데이터 페칭 (카테고리 & 아이템)
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // 카테고리 정보
        const catRes = await fetch(`/api/rakuten/categories?genreId=${genreId}`);
        const catData = await catRes.json();
        setCategories(catData.children || []);
        if (catData.parents) setPath(catData.parents.map((p: any) => ({ id: p.genreId, name: p.genreName })));
        
        // 특정 장르가 선택된 경우에만 상품 정보 호출
        if (genreId !== '0') {
          const itemRes = await fetch(`/api/rakuten/items?genreId=${genreId}&sort=${sort}&page=${page}`);
          const itemData = await itemRes.json();
          setItems(itemData.items || []);
          setPageInfo({ page: itemData.page, pageCount: itemData.pageCount });
        }
      } catch (e) { console.error("Data Load Error", e); }
      finally { setLoading(false); }
    }
    fetchData();
  }, [genreId, sort, page]);

  return (
    <div style={styles.pageWrapper} translate="yes">
      <div style={styles.container}>
        <div style={styles.mainLayout}>
          
          {/* --- 사이드바 --- */}
          <aside style={styles.sidebarWrapper}>
            <GlobalSidebar 
              platform="rakuten" 
              currentPath={path} 
              levelOptions={levelOptions} 
              onNavigate={updateNavigation} 
              onSearch={(f) => router.push(`/main_shop/rakuten?genreId=${genreId}&sort=${f.sortOrder}&page=1`)} 
            />
          </aside>

          {/* --- 콘텐츠 영역 --- */}
          <main style={styles.contentArea}>
            {/* 1. 브레드크럼 */}
            <nav style={styles.breadcrumb}>
              <span onClick={() => updateNavigation(0, "HOME")} style={{ cursor: 'pointer' }}>HOME</span>
              {path.map((p, i) => (
                <span key={p.id} onClick={() => updateNavigation(p.id, p.name, i + 1)} style={{ cursor: 'pointer' }}> / {p.name}</span>
              ))}
            </nav>

            {/* 2. 상세 정보 (선택 시 상단에 노출) */}
            <div ref={detailRef} 
              style={{ 
                // ✨ 상세창이 열려있을 때만 하단 여백 추가 (모바일 20px / PC 40px)
                marginBottom: selectedProduct ? (isMobile ? '20px' : '40px') : '0px',
                transition: 'margin-bottom 0.3s ease' 
              }}>
              {selectedProduct && (
                <GlobalProductDetail 
                  product={selectedProduct} 
                  onClose={() => setSelectedProduct(null)} 
                />
              )}
            </div>

            {/* 3. 카테고리 그리드 (항상 노출) */}
            <div style={styles.categoryCard}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '24px' }}>CATEGORY</h3>
              <GlobalCategoryGrid 
                categories={categories.map((c: any) => ({ genreId: c.genreId, genreName: c.genreName, genreLevel: 0 }))} 
                isLeaf={categories.length === 0} 
                isLoading={loading} 
                platform="rakuten" 
                onMove={updateNavigation}
                isMobile={isMobile}
              />
            </div>

            {/* 4. 상품 리스트 */}
            {items.length > 0 && (
              <>
                <SortBar currentSort={sort} />
                <div style={styles.itemGrid}>
                  {items.map((item: any) => (
                    <GlobalProductCard 
                      key={item.itemId} 
                      item={mapToGlobal(item)} 
                      onClick={(id) => {
                        const target = items.find((it: any) => it.itemId === id);
                        if (target) {
                          setSelectedProduct(mapToGlobal(target));

                          const targetTop = (detailRef.current?.offsetTop || 0) - 100;

                          window.scrollTo({ top: targetTop < 0 ? 0 : targetTop, behavior: 'smooth' });
                        }
                      }} 
                    />
                  ))}
                </div>
                <Pagination currentPage={pageInfo.page} pageCount={pageInfo.pageCount} />
              </>
            )}
          </main>
        </div>
      </div>
      <FloatingButtons />
    </div>
  );
}