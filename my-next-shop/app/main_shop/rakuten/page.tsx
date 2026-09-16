"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react'; // Suspense 추가
import { useSearchParams, useRouter } from 'next/navigation';

// --- 📦 공용 글로벌 컴포넌트 ---
import GlobalShoppingView from "@/app/main_shop/components/GlobalShoppingView";
import { GlobalFilterState } from "@/app/main_shop/components/GlobalSidebar";
import { GlobalProduct } from "@/app/main_shop/components/GlobalProductDetail";
import { useGlobalSearch } from "@/app/main_shop/components/GlobalSearchContext";
import { useMikuAlert } from '@/app/context/MikuAlertContext';
import { readPopularCache, writePopularCache } from "@/app/main_shop/components/popularCache";
import { isPureCategoryQuery, categoryCacheKey, readCategoryListCache, writeCategoryListCache } from "@/app/main_shop/components/categoryListCache";

// --- 🛠️ 유틸리티 ---
import { getTranslatedText } from '@/lib/search-utils';
import '@/app/main_shop/platform-pages-common.css';

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

// 🌟 카테고리 목록 캐시(하루) 판별 규칙: genreId + page + 기본 정렬(standard) 만 있으면 "순수 카테고리 조회"
const RAKUTEN_CACHE_RULE = { categoryKey: 'genreId', pageKeys: ['page'], sortKey: 'sort', defaultSort: RakutenSortOptions[0].id };

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

  // 🌟 실시간 인기 상품 (홈 화면 카테고리 아래에 노출)
  const [popularProducts, setPopularProducts] = useState<GlobalProduct[]>([]);

  // page
  const [pageInfo, setPageInfo] = useState({ page: 1, pageCount: 100 });

  // 🌟 상품 로딩 표시 (예전엔 false 고정이라 1~3초 걸리는 동안 빈 화면만 보여 재클릭을 유발했습니다)
  //    메루카리와 같은 단계: 0.5초까진 아무것도 안 띄우고 → 전체 오버레이 → 3초 더 지나도 안 끝나면
  //    오버레이를 내리고 카테고리는 그대로 둔 채 하단에 스켈레톤 로더(isStreaming)를 보여줍니다.
  const [isItemLoading, setIsItemLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isBottomLoaderAllowed, setIsBottomLoaderAllowed] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showAlert } = useMikuAlert();

  const clearLoadingTimer = () => {
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    loadingTimerRef.current = null;
  };
  const resetLoadingUI = () => {
    clearLoadingTimer();
    setIsItemLoading(false);
    setIsStreaming(false);
    setIsBottomLoaderAllowed(false);
  };
  useEffect(() => clearLoadingTimer, []);

  // 🐛 카테고리를 빠르게 옮기면 앞 카테고리의 응답이 뒤늦게 도착해 현재 화면을 덮어썼습니다.
  //    (URL 은 하위 카테고리인데 상위 카테고리 상품이 보이거나, 빈 목록으로 지워지는 현상)
  //    → 요청마다 번호를 매기고, 가장 최근 번호의 응답만 화면에 반영합니다.
  const loadSeqRef = useRef(0);

  // 🌟 헤더 통합검색으로 들어온 검색어. 이후 카테고리를 클릭하면 이 검색어는 풀어줍니다.
  //    (사이드바 입력칸에는 보이지 않는 검색어라, 남겨두면 이유 없이 상품이 0개로 나옵니다)
  const headerKeywordRef = useRef<string | null>(null);

  // 🚀 [로직 1] 라쿠텐 데이터를 Global 규격으로 변환
  const mapToGlobal = (item: any): GlobalProduct => {
    const resizeImage = (url: string) => {
      if (!url) return "";
      return url.replace('_ex=128x128', '_ex=512x512');
    };

    return {
      id: item.itemCode,
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
    const seq = ++loadSeqRef.current;
    const isLatest = () => seq === loadSeqRef.current;

    // 🚀 [수정] 모든 바구니를 확실히 비우고 시작합니다.
    setItems([]);
    setProductDetail(null);

    const targetId = Number(catId);
    const params = GetParams(targetId, filters);
    const queryString = params.toString();

    // 🌟 원래는 URL의 genreId만 봤는데, 그러면 헤더 통합검색(홈에서 카테고리 상관없이
    // 전체 검색, catId=0)을 호출해도 홈 화면 URL(genreId='0')에 막혀 아무 것도 안 불러왔습니다.
    // 실제로 요청받은 catId(targetId) 기준으로 판단하되, 키워드가 있으면 전체(0)여도 진행합니다.
    if (targetId === 0 && !filters?.keyword) { resetLoadingUI(); return; }

    // 🌟 카테고리만 골라 본 목록은 페이지별로 하루 동안 캐시합니다 (검색·상세검색·비기본 정렬은 제외).
    //    캐시가 있으면 라쿠텐 API(1초 1회 제한)를 부르지 않고 바로 보여줍니다. (categoryListCache.ts)
    const cacheKey = isPureCategoryQuery(params, RAKUTEN_CACHE_RULE) ? categoryCacheKey('rakuten', params, RAKUTEN_CACHE_RULE) : null;
    if (cacheKey) {
      const cached = readCategoryListCache<GlobalProduct>(cacheKey);
      if (cached) {
        if (cached.pageInfo) setPageInfo(cached.pageInfo);
        setItems(cached.items);
        resetLoadingUI();
        return;
      }
    }

    // 🚀 0.5초 안에 끝나면 아무것도 띄우지 않습니다. (빠른 응답에서 깜빡임 방지)
    resetLoadingUI();
    setIsStreaming(true);
    loadingTimerRef.current = setTimeout(() => {
      if (!isLatest()) return;
      setIsItemLoading(true);
      // 오버레이를 3초 보여줘도 안 끝나면 오버레이를 내리고 하단 스켈레톤 로더로 전환합니다.
      loadingTimerRef.current = setTimeout(() => {
        if (!isLatest()) return;
        setIsItemLoading(false);
        setIsBottomLoaderAllowed(true);
      }, 3000);
    }, 500);

    try {
      const itemRes = await fetch(`/api/rakuten/items?${queryString}`);
      const itemData = await itemRes.json().catch(() => ({}));

      // 🐛 서버가 500({ error }) 을 주면 예전엔 itemData.items.map 에서 터져 조용히 빈 화면이 됐습니다.
      if (!itemRes.ok || !Array.isArray(itemData.items)) {
        throw new Error(itemData.error || `HTTP ${itemRes.status}`);
      }

      const nextPageInfo = { page: Number(itemData.page) || 1, pageCount: Number(itemData.pageCount) || 0 };
      const mapped: GlobalProduct[] = itemData.items.map(mapToGlobal);
      // 🌟 응답이 오기 전에 다른 카테고리로 옮겨 갔더라도 받은 결과는 그 카테고리의 캐시로 남겨,
      //    다시 돌아왔을 때 API 를 다시 부르지 않게 합니다.
      if (cacheKey) writeCategoryListCache(cacheKey, mapped, nextPageInfo);

      // 🐛 이 응답보다 새 요청이 이미 나갔다면 (카테고리를 또 옮겼다면) 화면에 반영하지 않습니다.
      if (!isLatest()) return;

      setPageInfo(nextPageInfo);
      setItems(mapped);
    } catch (e) {
      if (!isLatest()) return;
      console.error('라쿠텐 상품 로드 실패:', e);
      setItems([]);
      showAlert('상품을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      if (isLatest()) resetLoadingUI();
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

  // 🌟 헤더 통합검색: 현재 선택된 카테고리와 상관없이 라쿠텐 전체에서 키워드로 검색합니다.
  const { searchRequest } = useGlobalSearch();
  const handledSearchTokenRef = useRef(0);
  useEffect(() => {
    if (!searchRequest || searchRequest.token === handledSearchTokenRef.current) return;
    handledSearchTokenRef.current = searchRequest.token;

    (async () => {
      const translatedKeyword = await getTranslatedText(searchRequest.keyword);
      const updatedFilters = { ...currentFilters, keyword: translatedKeyword, page: 1 };
      headerKeywordRef.current = translatedKeyword;
      setCurrentFilters(updatedFilters);
      setPageInfo(prev => ({ ...prev, page: 1 }));
      loadItems(0, updatedFilters); // genreId=0: 전체 카테고리 대상 검색
    })();
  }, [searchRequest]);

  // 🚀 [로직 5] 상품 상세 정보 로드
  const loadProductDetail = async (item: any) => {
    setProductDetail(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 🌟 "실시간 인기 상품" 집계용 조회수 기록 (fire-and-forget, 실패해도 상세보기는 그대로 동작)
    fetch('/api/rakuten/trackView', {
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

    // 🚀 [로직 2] 네비게이션 함수
  const updateNavigation = (id: number, name: string, levelIndex: number) => {
    
    if(id.toString() === genreId.toString())
        return;
      
    setIsLeaf(false);
    setItems([]);
    setProductDetail(null);
    setPageInfo(prev => ({ ...prev, page: 1 }));

    // 🌟 헤더 통합검색 검색어는 카테고리를 고르는 순간 풀어줍니다. (사이드바에서 직접 입력한 검색어는 유지)
    if (headerKeywordRef.current && currentFilters.keyword === headerKeywordRef.current) {
      headerKeywordRef.current = null;
      setCurrentFilters(prev => ({ ...prev, keyword: '', page: 1 }));
    }

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

  // 🚀 [로직 6] 실시간 인기 상품 로드 (홈 화면 진입 시 한 번만 조회)
  useEffect(() => {
    // 🌟 10분 안에 다시 들어오면(카테고리·상세·다른 페이지 갔다 오기, 새로고침) API 를 다시 부르지 않고
    //    세션 캐시에서 바로 보여줍니다. (app/main_shop/components/popularCache.ts)
    const cached = readPopularCache('rakuten');
    if (cached) {
      setPopularProducts(cached);
      return;
    }

    const fetchPopular = async () => {
      try {
        const res = await fetch('/api/rakuten/popular?limit=100');
        const result = await res.json();
        if (result.success) {
          const mapped: GlobalProduct[] = (result.data || []).map((row: any) => ({
            id: row.itemId,
            platform: 'rakuten',
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
            // 🌟 회원 클릭이 아니라 라쿠텐 인기 상품으로 채운 항목 (순위 배지 제외용)
            isPopularFiller: !!row.isFiller,
          }));
          setPopularProducts(mapped);
          writePopularCache('rakuten', mapped);
        }
      } catch (e) {
        console.error('인기 상품 로드 실패', e);
      }
    };
    fetchPopular();
  }, []);

  return (
    <GlobalShoppingView 
      platform="rakuten"
      path={path}
      categories={categories}
      items={items}
      popularProducts={popularProducts}
      pageInfo={pageInfo}
      selectedProduct={productDetail}
      sortOptions={RakutenSortOptions}
      isLoading={false}
      isItemLoading={isItemLoading}
      isStreaming={isStreaming}
      isBottomLoaderAllowed={isBottomLoaderAllowed}
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
      <div className="platform-loading-wrap">
        <i className="fa fa-spinner fa-spin fa-2x" style={{ color: '#bf0000' }}></i>
        <p className="platform-loading-text">라쿠텐 정보를 불러오는 중입니다...</p>
      </div>
    }>
      <RakutenContent />
    </Suspense>
  );
}