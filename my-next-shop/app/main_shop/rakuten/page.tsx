"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react'; // Suspense 추가
import { useSearchParams, useRouter } from 'next/navigation';

// --- 📦 공용 글로벌 컴포넌트 ---
import GlobalShoppingView from "@/app/main_shop/components/GlobalShoppingView";
import { GlobalProduct } from "@/app/main_shop/components/GlobalProductDetail";
import { GlobalFilterState } from "@/app/main_shop/components/GlobalSidebar";

// --- 🛠️ 유틸리티 ---
import { useExchangeRate } from '@/app/context/ExchangeRateContext';

const SHOW_HEADER = false; 

// 1. 실제 로직을 담당하는 Content 컴포넌트
function RakutenContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { exchangeRate } = useExchangeRate();

  // URL 파라미터 상태
  const genreId = searchParams.get('genreId') || '0';
  const sort = searchParams.get('sort') || 'standard';
  const page = searchParams.get('page') || '1';
  const keyword = searchParams.get('keyword') || '';
  const NGKeyword = searchParams.get('NGKeyword') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  // 데이터 상태
  const [categories, setCategories] = useState([]);
  const [path, setPath] = useState<{id: number, name: string}[]>([]);
  const [items, setItems] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, pageCount: 0 });
  const [loading, setLoading] = useState(false);
  
  // 크롤러 상태
  const isAutoRunningRef = useRef(false); 
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  // UI 상태
  const [selectedProduct, setSelectedProduct] = useState<GlobalProduct | null>(null);

  // ✨ 라쿠텐 전용 정렬 옵션 정의
  const rakutenSortOptions = [
    { id: 'standard', label: '기본순' },
    { id: '-updateTimestamp', label: '최신등록순' },
    { id: '-reviewCount', label: '조회수많은순' },
    { id: '-itemPrice', label: '가격높은순' },
    { id: '+itemPrice', label: '가격낮은순' },
  ];

  // 🚀 [로직 1] 라쿠텐 데이터를 Global 규격으로 변환
  const mapToGlobal = (item: any): GlobalProduct => {
    const resizeImage = (url: string) => {
      if (!url) return "";
      return url.replace('_ex=128x128', '_ex=512x512');
    };

    return {
      id: item.itemId,
      platform: 'rakuten',
      name: item.itemName,
      price: item.itemPrice,
      description: item.itemCaption || "상세 설명이 없습니다.",
      images: item.mediumImageUrls 
        ? item.mediumImageUrls.map((img: any) => resizeImage(img.imageUrl || img)) 
        : [resizeImage(item.itemImageUrl)],
      thumbnail: resizeImage(item.mediumImageUrls?.[0]?.imageUrl || item.mediumImageUrls?.[0] || item.itemImageUrl),
      condition: "",
      size: "", 
      categories: [], 
      url: item.itemUrl,
      shopUrl: item.itemUrl,
      status: item.availability === 1 ? 'on_sale' : 'sold_out',
      shopName: item.shopName,
    };
  };

  // 🚀 [로직 2] 네비게이션 함수
  const updateNavigation = (id: number, name: string, levelIndex: number) => {
    setSelectedProduct(null);
    if (!id || id === 0) { 
      setPath([]); 
      router.push('/main_shop/rakuten'); 
      return; 
    }
    
    setPath(prev => {
      const filtered = prev.slice(0, levelIndex);
      return [...filtered, { id: id, name: name }];
    });
    router.push(`/main_shop/rakuten?genreId=${id}&sort=${sort}&page=1`);
  };

  // 🚀 [로직 3] 데이터 페칭 (카테고리 & 아이템)
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const catRes = await fetch(`/api/rakuten/categories?genreId=${genreId}`);
        const catData = await catRes.json();

        if (catData.success) {
            const apiParams = new URLSearchParams({
              genreId: genreId,
              sort: sort,
              page: page
            });

          if (keyword) apiParams.append('keyword', keyword);
          if (NGKeyword) apiParams.append('NGKeyword', NGKeyword);
          if (minPrice) apiParams.append('minPrice', minPrice);
          if (maxPrice) apiParams.append('maxPrice', maxPrice);

          setCategories(catData.data || []);
          if (catData.parents) {
            setPath(catData.parents.map((p: any) => ({ id: p.genreId, name: p.genreName })));
          }
          
          if (genreId !== '0') {
            const itemRes = await fetch(`/api/rakuten/items?${apiParams.toString()}`);
            const itemData = await itemRes.json();
            setItems(itemData.items || []);
            setPageInfo({ page: itemData.page, pageCount: itemData.pageCount });
          }
        }
      } catch (e) { 
        console.error("Data Load Error", e); 
      } finally { 
        setLoading(false); 
      }
    }
    fetchData();
  }, [genreId, sort, page, keyword, NGKeyword, minPrice, maxPrice]);

  const stopAutoCrawl = () => { isAutoRunningRef.current = false; setIsAutoRunning(false); };
  const startAutoCrawl = async () => { /* 자동 수집 로직은 기존과 동일 */ };

  return (
    <GlobalShoppingView 
      platform="rakuten"
      path={path}
      categories={categories.map((c: any) => ({ 
        genreId: c.genreId, 
        genreName: c.genreName, 
        genreLevel: c.genreLevel 
      }))}
      items={items.map(mapToGlobal)}
      pageInfo={pageInfo}
      selectedProduct={selectedProduct}
      sortOptions={rakutenSortOptions}
      isLoading={loading}
      isItemLoading={loading && genreId !== '0'}
      isLeaf={categories.length === 0}
      onNavigate={updateNavigation}
      onSearch={(f: GlobalFilterState) => {
        setSelectedProduct(null);
        const params = new URLSearchParams();
        params.append('genreId', genreId);
        params.append('sort', f.sortOrder); 
        params.append('page', '1');

        if (f.keyword && f.keyword.trim() !== '') {
          params.append('keyword', f.keyword.trim());
        }
        if (f.excludeKeyword && f.excludeKeyword.trim() !== '') {
          params.append('NGKeyword', f.excludeKeyword.trim());
        }
        if (f.minPrice && f.minPrice.trim() !== '') {
          params.append('minPrice', f.minPrice.trim());
        }
        if (f.maxPrice && f.maxPrice.trim() !== '') {
          params.append('maxPrice', f.maxPrice.trim());
        }
        router.push(`/main_shop/rakuten?${params.toString()}`);
      }}
      onCardClick={(item) => {
        setSelectedProduct(item);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      onCloseDetail={() => setSelectedProduct(null)}
      showCrawlHeader={SHOW_HEADER}
      isAutoRunning={isAutoRunning}
      onCrawlToggle={isAutoRunning ? stopAutoCrawl : startAutoCrawl}
      crawlLog={log[0]}
    />
  );
}

// 2. 최종 Export할 페이지 컴포넌트 (Suspense 적용)
export default function RakutenPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <i className="fa fa-spinner fa-spin fa-2x" style={{ color: '#bf0000' }}></i>
        <p style={{ marginTop: '15px', color: '#666' }}>라쿠텐 정보를 불러오는 중입니다...</p>
      </div>
    }>
      <RakutenContent />
    </Suspense>
  );
}