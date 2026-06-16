"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// --- 📦 공용 글로벌 컴포넌트 ---
import GlobalShoppingView from "@/app/main_shop/components/GlobalShoppingView";
import { GlobalFilterState } from "@/app/main_shop/components/GlobalSidebar";
import { GlobalProduct } from "@/app/main_shop/components/GlobalProductDetail";

// --- 🛠️ 유틸리티 ---
import { getTranslatedText } from '@/lib/search-utils';

// ✨ 야후 쇼핑 전용 정렬 옵션 (야후 API 기준)
const YahooSortOptions = [
  { id: '-score', label: '추천순' },
  { id: '+price', label: '가격낮은순' },
  { id: '-price', label: '가격높은순' },
  { id: '-review_count', label: '리뷰많은순' },
  { id: '-sold', label: '판매량순' },
];

function YahooContent() {
  const [currentFilters, setCurrentFilters] = useState<GlobalFilterState>({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('categoryId') || '1';

  const [categories, setCategories] = useState<any[]>([]);
  const [isLeaf, setIsLeaf] = useState(false); 
  const [path, setPath] = useState<{id: number, name: string}[]>([]);

  const [items, setItems] = useState<GlobalProduct[]>([]);
  const [productDetail, setProductDetail] = useState<GlobalProduct | null>(null);
  const [pageInfo, setPageInfo] = useState({ page: 1, pageCount: 1 });

  // 🚀 [로직 1] 야후 데이터를 Global 규격으로 변환
  const mapToGlobal = (item: any): GlobalProduct => {

    const getHighResImage = (url?: string) => {
      if (!url) return '';
      // /i/c/ 나 /i/g/ 같은 화질 폴더명을 /i/n/ (고해상도)로 덮어씌움
      return url.replace(/\/i\/[a-z]\//, '/i/n/');
    };

    // 변환된 고해상도 URL 생성
    const highResImageUrl = getHighResImage(item.image?.medium);

    return {
      id: item.index,
      platform: 'yahoo_shopping',
      name: item.name,
      price: item.price,
      description: item.description || "상세 설명이 없습니다.",
      images: [highResImageUrl],
      thumbnail: highResImageUrl,
      condition: item.condition || "new",
      size: "",
      categories: [],
      url: item.url,
      shopUrl: item.url,
      status: 'on_sale',
      shopName: item.brand.name,
    };
  };

  // 🚀 [로직 2] 상품 로드 함수
  const loadItems = async (catId: any, filters?: GlobalFilterState) => {
    setItems([]);
    setProductDetail(null);

    const params = new URLSearchParams({ categoryId: catId.toString() });
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.sortOrder) params.append("sort", filters.sortOrder);
    if (filters?.keyword) params.append("keyword", filters.keyword);
    if (filters?.excludeKeyword) params.append("NGKeyword", filters.excludeKeyword);
    if (filters?.minPrice) params.append("minPrice", filters.minPrice);
    if (filters?.maxPrice) params.append("maxPrice", filters.maxPrice);

    const res = await fetch(`/api/yahoo_shopping/items?${params.toString()}`);
    const data = await res.json();

    if (data.items) {
      setItems(data.items.map(mapToGlobal));
      setPageInfo({ page: data.page, pageCount: data.pageCount });
      //setPageInfo({ page: filters?.page || 1, pageCount: Math.ceil(data.totalResultsAvailable / 20) });
    }
  };

  const updateNavigation = (id: number, name: string, levelIndex: number) => {
    
    setIsLeaf(false);
    setItems([]); 
    setProductDetail(null);
    setPageInfo(prev => ({ ...prev, page: 1 }));

    if (!id || id === 0 ||  name === 'HOME') { 
      setPath([]); 
      router.push('/main_shop/yahoo_shopping'); 
      return; 
    }
    
    setPath(prev => {
      const filtered = prev.slice(0, levelIndex);
      return [...filtered, { id: id, name: name }];
    });
    router.push(`/main_shop/yahoo_shopping?categoryId=${id}`);
  };

  // 🚀 [로직 3] 검색 및 필터링
  const OnSearch = async (filters: GlobalFilterState) => {
    const translatedKeyword = await getTranslatedText(filters.keyword || "");
    const updatedFilters = { ...filters, keyword: translatedKeyword };
    setCurrentFilters(updatedFilters);
    loadItems(categoryId, updatedFilters);
  };

  // 🚀 [로직 4] 카테고리 로드 및 초기 페칭
  useEffect(() => {
    const fetchData = async () => {

      //setIsLeaf(false);
      setCategories([]); 


      try {
        const apiUrl = `/api/yahoo_shopping/categories?genreId=${categoryId}`;

        const res = await fetch(apiUrl);
        const result = await res.json();

        if (result.success) {

          const serverData = result.data || [];
          //const serverIsLeaf = !!result.isLeaf;
          
          setCategories(serverData);
          //setIsLeaf(serverIsLeaf);

          if (result.parents) {
            setPath(result.parents.map((p: any) => ({ id: p.genreId, name: p.genreName })));
          }

          if (categoryId !== '0') {
            console.log(`📦 장르 변경 감지: ${categoryId}번 카테고리 상품 로드 시작`);
            await loadItems(categoryId, currentFilters);
          }
        }
      } catch (e) { 
        console.error("Data Load Error", e); 
      } finally { 
      }

      // 카테고리 로드 로직 (API 연동 필요)
      // const res = await fetch(`/api/yahoo_shopping/categories?categoryId=${categoryId}`);
      // const result = await res.json();
      
      // if (result.success) {

      //   console.log(JSON.stringify(result, null, 2));

      //   setCategories(result.categories);
      //   //if (categoryId !== '0') await loadItems(categoryId, currentFilters);
      // }
    };
    fetchData();
  }, [categoryId]);

  return (
    <GlobalShoppingView
      platform="yahoo_shopping"
      path={[]} // 필요시 카테고리 path 추가
      categories={categories}
      items={items}
      pageInfo={pageInfo}
      selectedProduct={productDetail}
      sortOptions={YahooSortOptions}
      isLoading={false}
      isItemLoading={false}
      isLeaf={false}
      //onNavigate={(id, name) => router.push(`/main_shop/yahoo_shopping?categoryId=${id}`)}
      onNavigate={updateNavigation}
      onSearch={OnSearch}
      onCardClick={(item) => { setProductDetail(item); window.scrollTo(0,0); }}
      onCloseDetail={() => setProductDetail(null)}
      onPageChange={(p) => loadItems(categoryId, { ...currentFilters, page: p })}
    />
  );
}

export default function YahooPage() {
  return (
    <Suspense fallback={<div>야후 쇼핑 정보를 불러오는 중입니다...</div>}>
      <YahooContent />
    </Suspense>
  );
}