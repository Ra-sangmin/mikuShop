"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// --- 📦 공용 글로벌 컴포넌트 ---
import GlobalShoppingView from "@/app/main_shop/components/GlobalShoppingView";
import { GlobalFilterState } from "@/app/main_shop/components/GlobalSidebar";
import { GlobalProduct } from "@/app/main_shop/components/GlobalProductDetail";
import { useGlobalSearch } from "@/app/main_shop/components/GlobalSearchContext";

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
  const genreId = searchParams.get('genreId') || '1';

  const [categories, setCategories] = useState<any[]>([]);
  const [isLeaf, setIsLeaf] = useState(false); 
  const [path, setPath] = useState<{id: number, name: string}[]>([]);

  const [items, setItems] = useState<GlobalProduct[]>([]);

  const [productDetail, setProductDetail] = useState<GlobalProduct | null>(null);

  // 🌟 실시간 인기 상품 (홈 화면 카테고리 아래에 노출)
  const [popularProducts, setPopularProducts] = useState<GlobalProduct[]>([]);

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

  
  const GetParams = (genreId: number, filters?: GlobalFilterState): URLSearchParams => {
    
    const params = new URLSearchParams({});

    // 🌟 genreId를 항상 명시적으로 보냅니다. 0은 "카테고리 상관없이 전체 검색"을 뜻하며,
    // 이 값을 생략하면 백엔드 기본값(1)으로 대체되어 전체 검색이 아니게 됩니다.
    params.append("genreId", genreId.toString());

    if (!filters) return params;

    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.sortOrder) params.append("sort", filters.sortOrder);
    if (filters?.keyword) params.append("keyword", filters.keyword);
    if (filters?.excludeKeyword) params.append("NGKeyword", filters.excludeKeyword);
    if (filters?.minPrice) params.append("minPrice", filters.minPrice);
    if (filters?.maxPrice) params.append("maxPrice", filters.maxPrice);

    return params;
  };

  // 🚀 [로직 2] 상품 로드 함수
  const loadItems = async (catId: any, filters?: GlobalFilterState) => {

    setItems([]);
    setProductDetail(null);

    const targetId = Number(catId);
    const params = GetParams(targetId, filters);

    if (targetId !== 1) {

      const res = await fetch(`/api/yahoo_shopping/items?${params.toString()}`);
      const data = await res.json();

      setPageInfo({ page: data.page, pageCount: data.pageCount });
      setItems(data.items.map(mapToGlobal));
    }
  };

  const updateNavigation = (id: number, name: string, levelIndex: number) => {
    
    if(id.toString() === genreId.toString())
        return;
   
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
    router.push(`/main_shop/yahoo_shopping?genreId=${id}`);
  };

  // 🚀 [로직 3] 검색 및 필터링
  const OnSearch = async (filters: GlobalFilterState) => {
    const translatedKeyword = await getTranslatedText(filters.keyword || "");
    const updatedFilters = { ...filters, keyword: translatedKeyword };
    setCurrentFilters(updatedFilters);
    loadItems(genreId, updatedFilters);
  };

  // 🌟 헤더 통합검색: 현재 선택된 카테고리와 상관없이 야후 쇼핑 전체에서 키워드로 검색합니다.
  const { searchRequest } = useGlobalSearch();
  const handledSearchTokenRef = useRef(0);
  useEffect(() => {
    if (!searchRequest || searchRequest.token === handledSearchTokenRef.current) return;
    handledSearchTokenRef.current = searchRequest.token;

    (async () => {
      const translatedKeyword = await getTranslatedText(searchRequest.keyword);
      const updatedFilters = { ...currentFilters, keyword: translatedKeyword, page: 1 };
      setCurrentFilters(updatedFilters);
      setPageInfo(prev => ({ ...prev, page: 1 }));
      loadItems(0, updatedFilters); // genreId=0: 전체 카테고리 대상 검색
    })();
  }, [searchRequest]);

  // 🚀 [로직 5] 상품 상세 정보 로드
  const loadProductDetail = (item: any) => {
    setProductDetail(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 🌟 "실시간 인기 상품" 집계용 조회수 기록 (fire-and-forget, 실패해도 상세보기는 그대로 동작)
    fetch('/api/yahoo_shopping/trackView', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: item.id,
        name: item.name,
        price: item.price,
        thumbnail: item.thumbnail,
        url: item.url,
        shopName: item.shopName,
      }),
    }).catch(() => {});
  };

  // 🚀 [로직 4] 카테고리 로드 및 초기 페칭
  useEffect(() => {
    const fetchData = async () => {

      setIsLeaf(false);
      setCategories([]); 

      try {
        const apiUrl = `/api/yahoo_shopping/categories?genreId=${genreId}`;

        const res = await fetch(apiUrl);
        const result = await res.json();

        if (result.success) {

          const serverData = result.data || [];
          const serverIsLeaf = !!result.isLeaf;

          setCategories(serverData);
          setIsLeaf(serverIsLeaf);

          if (result.parents) {
            setPath(result.parents.map((p: any) => ({ id: p.genreId, name: p.genreName })));
          }

          if (genreId !== '0') {
            console.log(`📦 장르 변경 감지: ${genreId}번 카테고리 상품 로드 시작`);
            await loadItems(genreId, currentFilters);
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
  }, [genreId]);

  // 🚀 [로직 6] 실시간 인기 상품 로드 (홈 화면 진입 시 한 번만 조회)
  useEffect(() => {
    const fetchPopular = async () => {
      try {
        const res = await fetch('/api/yahoo_shopping/popular?limit=100');
        const result = await res.json();
        if (result.success) {
          const mapped: GlobalProduct[] = (result.data || []).map((row: any) => ({
            id: row.itemId,
            platform: 'yahoo_shopping',
            name: row.name,
            price: row.price,
            description: '',
            images: row.thumbnail ? [row.thumbnail] : [],
            thumbnail: row.thumbnail || '',
            condition: '',
            size: '',
            categories: [],
            url: row.url,
            shopUrl: row.url,
            status: 'on_sale',
            shopName: row.shopName || undefined,
          }));
          setPopularProducts(mapped);
        }
      } catch (e) {
        console.error('인기 상품 로드 실패', e);
      }
    };
    fetchPopular();
  }, []);

  return (
    <GlobalShoppingView
      platform="yahoo_shopping"
      path={path}
      categories={categories}
      items={items}
      popularProducts={popularProducts}
      pageInfo={pageInfo}
      selectedProduct={productDetail}
      sortOptions={YahooSortOptions}
      isLoading={false}
      isItemLoading={false}
      isLeaf={isLeaf}
      onNavigate={updateNavigation}
      onSearch={OnSearch}
      onCardClick={loadProductDetail}
      onCloseDetail={() => setProductDetail(null)}
      onPageChange={(p) => loadItems(genreId, { ...currentFilters, page: p })}
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