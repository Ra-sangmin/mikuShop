"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react'; // Suspense 추가
import { useSearchParams, useRouter } from 'next/navigation';

// --- 📦 공용 글로벌 컴포넌트 ---
import GlobalShoppingView from "@/app/main_shop/components/GlobalShoppingView";
import { GlobalFilterState } from "@/app/main_shop/components/GlobalSidebar";
import { GlobalProduct } from "@/app/main_shop/components/GlobalProductDetail";

// --- 🛠️ 유틸리티 ---
import { getTranslatedText } from '@/lib/search-utils';

interface RakutenCategory {
  genreId: number; 
  genreName: string; 
  genreLevel: number; 
  parentId: number; 
  isLeaf: boolean; 
  updatedAt: string | Date; 
}

// ✨ 라쿠텐 전용 정렬 옵션 정의
const RakutenSortOptions = [
  { id: 'standard', label: '기본순' },
  { id: '-updateTimestamp', label: '최신등록순' },
  { id: '-reviewCount', label: '조회수많은순' },
  { id: '-itemPrice', label: '가격높은순' },
  { id: '+itemPrice', label: '가격낮은순' },
];

// 1. 실제 로직을 담당하는 Content 컴포넌트
function RakutenContent() {

  // 1. 부모에서도 필터를 기억할 상태를 만듭니다.
  const [currentFilters, setCurrentFilters] = useState<GlobalFilterState>({});

  const router = useRouter();
  const searchParams = useSearchParams();
  const genreId = searchParams.get('genreId') || '0';

  // 카테고리
  const [categories, setCategories] = useState<RakutenCategory[]>([]);
  const [isLeaf, setIsLeaf] = useState(false); 
  const [path, setPath] = useState<{id: number, name: string}[]>([]);

  // 아이템
  const [items, setItems] = useState<GlobalProduct[]>([]);

  // 상품 상세
  const [productDetail, setProductDetail] = useState<GlobalProduct | null>(null);

  // page
  const [pageInfo, setPageInfo] = useState({ page: 1, pageCount: 100 });

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

  const GetParams = (genreId: number, filters?: GlobalFilterState): URLSearchParams => {
    
    const params = new URLSearchParams({});

    if (genreId !== 0) params.append("genreId", genreId.toString());

    if (!filters) return params;

    if (filters.page) params.append("page", filters.page.toString());
    if (filters.sortOrder) params.append("sort", filters.sortOrder);
    if (filters.keyword) params.append("keyword", filters.keyword);
    if (filters.excludeKeyword) params.append("NGKeyword", filters.excludeKeyword);
    if (filters.minPrice) params.append("minPrice", filters.minPrice);
    if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);

    return params;
  };

  // 🚀 [로직 4] 아이템 로드 함수 (필터 포함)
  const loadItems = async (catId: any, filters?: GlobalFilterState) => {

    // 🚀 [수정] 모든 바구니를 확실히 비우고 시작합니다.
    setItems([]); 
    setProductDetail(null);

    const targetId = Number(catId);
    const params = GetParams(targetId, filters);
    const queryString = params.toString();
    
    if (genreId !== '0') {
      const itemRes = await fetch(`/api/rakuten/items?${queryString.toString()}`);
      const itemData = await itemRes.json();

      setPageInfo({ page: itemData.page, pageCount: itemData.pageCount });

      const mappedItems = itemData.items.map(mapToGlobal);
      setItems(mappedItems);
    }

  };

  // 페이지 변경 핸들러
  const OnPageChange = (newPage: number) => {
    
    const updatedPageInfo = { ...pageInfo, page: newPage };

    setPageInfo(updatedPageInfo);

    loadItems(genreId, { ...currentFilters, page: newPage });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // 🚀 [로직 4] 검색 및 필터링 함수 (번역 포함)
  const OnSearch = async (filters: GlobalFilterState) => {

      const translatedKeyword = await getTranslatedText(filters.keyword || "");
  
      const translatedExcludeKeyword = await getTranslatedText(filters.excludeKeyword || "");

        // 2. 번역된 키워드로 필터 교체
      const updatedFilters = { 
        ...filters, 
        keyword: translatedKeyword,
        excludeKeyword: translatedExcludeKeyword 
      };

      setCurrentFilters(updatedFilters); 
      
      loadItems(Number(genreId), updatedFilters);
  };

  // 🚀 [로직 5] 상품 상세 정보 로드
  const loadProductDetail = async (item: any) => {
    setProductDetail(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

    // 🚀 [로직 2] 네비게이션 함수
  const updateNavigation = (id: number, name: string, levelIndex: number) => {
    
    setIsLeaf(false);
    setItems([]); 
    setProductDetail(null);
    setPageInfo(prev => ({ ...prev, page: 1 }));

    if (!id || id === 0 ||  name === 'HOME') { 
      setPath([]); 
      router.push('/main_shop/rakuten'); 
      return; 
    }
    
    setPath(prev => {
      const filtered = prev.slice(0, levelIndex);
      return [...filtered, { id: id, name: name }];
    });
    router.push(`/main_shop/rakuten?genreId=${id}`);
  };

  // 🚀 [로직 3] 데이터 페칭 (카테고리 & 아이템)
  useEffect(() => {
    const fetchData = async () => {
      setIsLeaf(false);
      setCategories([]); 

      try {
        const apiUrl = `/api/rakuten/categories?genreId=${genreId}`;

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
    }
    fetchData();
  }, [genreId]);

  return (
    <GlobalShoppingView 
      platform="rakuten"
      path={path}
      categories={categories}
      items={items}
      pageInfo={pageInfo}
      selectedProduct={productDetail}
      sortOptions={RakutenSortOptions}
      isLoading={false}
      isItemLoading={false}
      isLeaf={isLeaf}
      onNavigate={updateNavigation}
      onSearch={OnSearch}
      onCardClick={loadProductDetail}
      onCloseDetail={() => setProductDetail(null)}
      onPageChange={OnPageChange}
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