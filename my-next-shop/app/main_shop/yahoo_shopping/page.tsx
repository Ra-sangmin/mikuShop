"use client";

import { readPopularCache, writePopularCache } from "@/app/main_shop/components/popularCache";
import { readCategoryTreeCache, writeCategoryTreeCache } from "@/app/main_shop/components/categoryTreeCache";
import { isPureCategoryQuery, categoryCacheKey, readCategoryListCache, writeCategoryListCache } from "@/app/main_shop/components/categoryListCache";

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

// 🌟 카테고리 목록 캐시(하루) 판별 규칙: genreId + page + 기본 정렬(-score) 만 있으면 "순수 카테고리 조회"
const YAHOO_CACHE_RULE = { categoryKey: 'genreId', pageKeys: ['page'], sortKey: 'sort', defaultSort: YahooSortOptions[0].id };

function YahooContent() {

  const [currentFilters, setCurrentFilters] = useState<GlobalFilterState>({});

  const router = useRouter();
  const searchParams = useSearchParams();
  const genreId = searchParams.get('genreId') || '1';

  // 🌟 카테고리를 서버에서 가져오는 동안 true (캐시 적중 시엔 바로 false)
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLeaf, setIsLeaf] = useState(false); 
  const [path, setPath] = useState<{id: number, name: string}[]>([]);

  const [items, setItems] = useState<GlobalProduct[]>([]);

  const [productDetail, setProductDetail] = useState<GlobalProduct | null>(null);

  // 🌟 실시간 인기 상품 (홈 화면 카테고리 아래에 노출)
  const [popularProducts, setPopularProducts] = useState<GlobalProduct[]>([]);

  const [pageInfo, setPageInfo] = useState({ page: 1, pageCount: 1 });

  // 🌟 카테고리를 연달아 누르면 먼저 보낸 요청의 응답이 나중에 도착해 화면을 덮어쓸 수 있어, 마지막 요청만 반영합니다
  const loadSeqRef = useRef(0);

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
      // 🐛 예전엔 검색 결과 순번(index: 1, 2, 3…)을 id 로 써서, 서로 다른 상품이 같은 id 로
      //    묶였고 trackView 의 인기 집계가 "몇 번째 칸"을 세는 꼴이었습니다.
      //    → 야후 상품 고유 코드(code, 예: meiseishop_246)를 씁니다. (없으면 순번으로 폴백)
      id: item.code || String(item.index),
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
    const seq = ++loadSeqRef.current;

    setItems([]);
    setProductDetail(null);

    const targetId = Number(catId);
    const params = GetParams(targetId, filters);

    if (targetId !== 1) {

      // 🌟 카테고리만 골라 본 목록은 페이지별로 하루 동안 캐시합니다 (검색·상세검색·비기본 정렬은 제외).
      //    (app/main_shop/components/categoryListCache.ts)
      const cacheKey = isPureCategoryQuery(params, YAHOO_CACHE_RULE) ? categoryCacheKey('yahoo_shopping', params, YAHOO_CACHE_RULE) : null;
      if (cacheKey) {
        const cached = readCategoryListCache<GlobalProduct>(cacheKey);
        if (cached) {
          if (cached.pageInfo) setPageInfo(cached.pageInfo);
          setItems(cached.items);
          return;
        }
      }

      const res = await fetch(`/api/yahoo_shopping/items?${params.toString()}`);
      const data = await res.json();

      const nextPageInfo = { page: data.page, pageCount: data.pageCount };
      const mapped: GlobalProduct[] = data.items.map(mapToGlobal);
      // 🌟 응답이 오기 전에 다른 카테고리로 옮겨 갔더라도 받은 결과는 그 카테고리의 캐시로 남깁니다
      if (cacheKey) writeCategoryListCache(cacheKey, mapped, nextPageInfo);

      if (seq !== loadSeqRef.current) return; // 그 사이 다른 카테고리를 눌렀다면 화면에는 반영하지 않습니다
      setPageInfo(nextPageInfo);
      setItems(mapped);
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
    // 🌟 상품은 URL 의 genreId 만 있으면 되므로 카테고리 응답을 기다리지 않고 먼저 시작합니다.
    if (genreId !== '0') {
      loadItems(genreId, currentFilters);
    }

    const applyCategories = (result: { data?: any[]; isLeaf?: boolean; parents?: { genreId: number; genreName: string }[] }) => {
      setCategories(result.data || []);
      setIsLeaf(!!result.isLeaf);
      if (result.parents) setPath(result.parents.map((p) => ({ id: p.genreId, name: p.genreName })));
    };

    // 🌟 하루 안에 본 카테고리는 브라우저 캐시에서 즉시 (서버 요청 0건)
    const cached = readCategoryTreeCache('yahoo_shopping', genreId);
    if (cached) { applyCategories(cached); setIsCategoryLoading(false); return; }

    setIsLeaf(false);
    setCategories([]);
    setIsCategoryLoading(true);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/yahoo_shopping/categories?genreId=${genreId}`);
        const result = await res.json();
        if (cancelled) return;
        if (result.success) {
          applyCategories(result);
          writeCategoryTreeCache('yahoo_shopping', genreId, { data: result.data || [], isLeaf: !!result.isLeaf, parents: result.parents || [] });
        }
      } catch (e) {
        if (!cancelled) console.error("Data Load Error", e);
      } finally {
        if (!cancelled) setIsCategoryLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [genreId]);

  // 🚀 [로직 6] 실시간 인기 상품 로드 (홈 화면 진입 시 한 번만 조회)
  useEffect(() => {
    // 🌟 10분 안에 다시 들어오면(카테고리·상세·다른 페이지 갔다 오기, 새로고침) API 를 다시 부르지 않고
    //    세션 캐시에서 바로 보여줍니다. (app/main_shop/components/popularCache.ts)
    const cached = readPopularCache('yahoo_shopping');
    if (cached) {
      setPopularProducts(cached);
      return;
    }

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
            // 🌟 회원 클릭이 아니라 야후 쇼핑 인기 상품으로 채운 항목 (순위 배지 제외용)
            isPopularFiller: !!row.isFiller,
          }));
          setPopularProducts(mapped);
          writePopularCache('yahoo_shopping', mapped);
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
      isLoading={isCategoryLoading}
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