"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react'; // Suspense 추가
import { useSearchParams, useRouter } from 'next/navigation';

// --- 📦 공용 글로벌 컴포넌트 ---
import GlobalShoppingView from "@/app/main_shop/components/GlobalShoppingView";
import { GlobalFilterState } from "@/app/main_shop/components/GlobalSidebar";
import { GlobalProduct } from "@/app/main_shop/components/GlobalProductDetail";
import { GlobalItem } from "@/app/main_shop/components/GlobalProductCard";
import { useGlobalSearch } from "@/app/main_shop/components/GlobalSearchContext";

// --- 🛠️ 유틸리티 ---
import { checkMercariCooldown, lastCallTimestamp } from "./mercariApi";
import { readPopularCache, writePopularCache } from "@/app/main_shop/components/popularCache";
import { isPureCategoryQuery, categoryCacheKey, readCategoryListCache, writeCategoryListCache } from "@/app/main_shop/components/categoryListCache";
import { useMikuAlert } from '@/app/context/MikuAlertContext'; 
import { getTranslatedText } from '@/lib/search-utils';
import '@/app/main_shop/platform-pages-common.css';

interface MercariCategory {
  genreId: number; 
  genreName: string; 
  genreLevel: number; 
  parentId: number; 
  isLeaf: boolean; 
  updatedAt: string | Date; 
}

interface MercariItem {
  id: string;
  name: string;
  price: number;
  thumbnail: string;
  status: string;
  url: string;
}

// ✨ 라쿠텐 전용 정렬 옵션 정의
const MercariSortOptions = [
  { id: '기본순', label: '기본순' },
  { id: '가격 낮은 순', label: '가격 낮은 순' },
  { id: '가격 높은 순', label: '가격 높은 순' },
  { id: '최신순', label: '최신순' },
];

// 🌟 카테고리 목록 캐시(하루) 판별 규칙: category_id + page_token 만 있으면 "순수 카테고리 조회"
//    (정렬은 기본순이 아닐 때만 sort 키가 붙으므로, sort 가 있으면 자동으로 제외됩니다)
const MERCARI_CACHE_RULE = { categoryKey: 'category_id', pageKeys: ['page_token'] };
let globalProductDetailCache: { [key: string]: GlobalProduct } = {};

// 1. 실제 로직을 담당하는 Content 컴포넌트
function MercariCategoryContent() {

  // 1. 부모에서도 필터를 기억할 상태를 만듭니다.
  const [currentFilters, setCurrentFilters] = useState<GlobalFilterState>({});

  const router = useRouter();
  const searchParams = useSearchParams();
  const genreId = searchParams.get('cat') || '';

  // 카테고리
  const [categories, setCategories] = useState<MercariCategory[]>([]);
  const [isLeaf, setIsLeaf] = useState(false); 
  const [path, setPath] = useState<{id: number, name: string}[]>([]);

  // 아이템 
  const [items, setItems] = useState<MercariItem[]>([]);
  const [displayItems, setDisplayItems] = useState<MercariItem[]>([]);
  const [isItemLoading, setIsItemLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isBottomLoaderAllowed, setIsBottomLoaderAllowed] = useState(false);

  // 상품 상세
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [productDetail, setProductDetail] = useState<GlobalProduct | null>(null);

  // 🌟 실시간 인기 상품 (메루카리 홈 화면에 지금 노출 중인 추천 상품, 홈 진입 시 한 번만 조회)
  const [popularProducts, setPopularProducts] = useState<GlobalProduct[]>([]);
  // 🌟 홈 화면 크롤링이라 시간이 좀 걸려서, 로딩 중임을 알려주는 안내 문구용 상태
  const [isPopularLoading, setIsPopularLoading] = useState(false);

  // page
  const [pageInfo, setPageInfo] = useState({ page: 1, pageCount: 100 });

  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { showAlert } = useMikuAlert(); 
  const abortControllerRef = useRef<AbortController | null>(null);

  // 🐛 상품 수집은 카테고리 "클릭" 에서만 시작됐기 때문에, 주소로 바로 들어오거나 새로고침·뒤로가기로
  //    돌아오면 카테고리만 뜨고 상품은 영영 안 불러왔습니다. 클릭으로 이미 요청한 카테고리를 기억해 두고,
  //    URL 변경 effect 에서는 그 외의 경우(직접 진입/새로고침/뒤로가기)에만 수집을 시작합니다.
  const requestedGenreRef = useRef<string | null>(null);

  // 🚀 [로직 1] 메루카리 아이템을 Global 규격으로 매핑
  const mappedDisplayItems = useMemo((): GlobalItem[] => {
    return displayItems.map(item => ({
      ...item,
      platform: 'mercari', 
      status: item.status as 'on_sale' | 'sold_out'
    }));
  }, [displayItems]);

  const isCallAllowed = () => {
    const status = checkMercariCooldown();
    if (!status.canCall) {
      const msg = `⚠️ 과부하 방지를 위해 ${status.remainingTime}초 후에 다시 시도해 주세요!`;
      showAlert(msg);
      return false; 
    }
    return true; 
  };

  // 🚀 [로직 3] 메루카리 파라미터 빌더
  const GetParams = (catId: number, filters?: GlobalFilterState): URLSearchParams => {

    const params = new URLSearchParams({});

    if (catId !== 0) params.append("category_id", catId.toString());
    
    if (!filters) return params;

    // 🚀 2. 페이지 토큰 (page_token)
    // 사용자가 발견한 규칙 v1:4 (5페이지)에 따라 (page - 1)을 넣어줍니다.
    // 1페이지일 때는 토큰을 보내지 않는 것이 기본입니다.
    if (filters?.page && filters.page > 1) {
      const tokenValue = `v1:${filters.page - 1}`;
      params.append("page_token", tokenValue);
    }
    
    if (filters.sortOrder !== '기본순') {
      switch (filters.sortOrder) {
        case '가격 낮은 순':
          params.append("sort", "price");
          params.append("order", "asc");
          break;
        case '가격 높은 순':
          params.append("sort", "price");
          params.append("order", "desc");
          break;
        case '최신순':
          params.append("sort", "created_time");
          params.append("order", "desc");
          break;
      }
    }

    if (filters.keyword) params.append("keyword", filters.keyword);
    if (filters.excludeKeyword) params.append("exclude_keyword", filters.excludeKeyword);

    // 🐛 필터를 한 번도 고르지 않은 상태(값이 undefined)에서도 `!== '모두'` 가 참이 되어
    //    빈 값·기본값 파라미터(item_types= / shipping_payer_id=1 / hasDiscount=… 등)가 붙었습니다.
    //    서버는 이 키들을 무시하므로 결과는 같지만, "카테고리만 고른 조회" 판별(캐시)을 방해해서
    //    실제로 값을 고른 경우에만 붙입니다.
    const isChosen = (v?: string) => !!v && v !== '모두';
    const getSellerId = (val: string) => (val === '개인' ? 'mercari' : val === '메루카리샵' ? 'beyond' : '');
    if (isChosen(filters.sellerType)) params.append("item_types", getSellerId(filters.sellerType));

    if (filters.minPrice) params.append("price_min", filters.minPrice);
    if (filters.maxPrice) params.append("price_max", filters.maxPrice);

    const getCondition = (val: string) => {
      const map: { [key: string]: string } = { '신품, 미사용': '1', '미사용에 가까움': '2', '눈에 띄는 흠집 없음': '3', '다소 흠집 있음': '4', '전반적으로 나쁨': '6' };
      return map[val] || '';
    };
    if (isChosen(filters.condition)) params.append("item_condition_id", getCondition(filters.condition));

    if (isChosen(filters.shippingPayer)) params.append("shipping_payer_id", filters.shippingPayer === '배송비 포함' ? '2' : '1');
    if (isChosen(filters.hasDiscount)) params.append("hasDiscount", '9df96424-a8c2-414a-bbab-74bd11bd20aa');
    if (isChosen(filters.listingType)) params.append("listingType", '3b6eac8c-7be5-4c9c-b537-7c05cd3c4905');

    const getColorId = (val: string) => {
      const map: { [key: string]: string } = { '화이트계열': '2', '블랙계열': '1', '그레이계열': '3', '브라운계열': '4', '베이지계열': '9', '그린계열': '10', '블루계열': '8', '퍼플계열': '7', '옐로우계열': '11', '핑크계열': '6', '레드계열': '5', '오렌지계열': '12' };
      return map[val] || '';
    };
    if (filters.colors?.length > 0 && filters.colors[0] !== '모두') params.append("color_id", getColorId(filters.colors[0]));

    const getShippingOption = (val: string) => {
      const map: { [key: string]: string } = { '익명 배송': 'anonymous', '수취 옵션': 'japan_post', '옵션 없음': 'no_option' };
      return map[val] || '';
    };
    if (isChosen(filters.shippingOption)) params.append("shipping_method", getShippingOption(filters.shippingOption));
    if (filters.status !== '모두')
    {
      /*
        if (filters.status === '판매 중') {
          params.append("status", "on_sale");
        } else if (filters.status === '품절') {
          params.append("status", "sold_out");
        }  */
    }
    

    return params;
  };

  // 🌟 목록을 받는 도중 이 페이지를 떠나면 요청을 끊어(서버 크롤링도 중단) 받은 만큼만 미완성 캐시로 남깁니다
  useEffect(() => () => { abortControllerRef.current?.abort(); }, []);

  const loadItems = async (catId: any, filters?: GlobalFilterState) => {
    // 1. 이전 요청 중단
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log("🛑 이전 수집 작업을 중단했습니다.");
    }

    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current); // 실행 대기 중인 로딩 처리가 있다면 취소
    }

    // 2. 새 요청을 위한 리모컨 생성
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const receivedRows: MercariItem[] = []; // 🌟 캐시 저장용으로 수신 상품을 모아 둡니다
    const seenIds = new Set<string>(); // 🌟 같은 상품이 두 번 오면(이어받기·서버 캐시) 한 번만 붙입니다

    // 🚀 [수정] 모든 바구니를 확실히 비우고 시작합니다.
    setItems([]); 
    setDisplayItems([]); 
    setProductDetail(null);
    setIsItemLoading(false);
    setIsStreaming(false);
    setIsBottomLoaderAllowed(false);

    // 🚀 [수정] 0.5초 후에만 로딩 상태를 true로 변경합니다.
    loadingTimerRef.current = setTimeout(() => {
      setIsItemLoading(true);
      console.log("⏳ 0.5초가 지나 로딩바를 표시합니다.");

      // 표시된 직후, 2.5초 타이머를 새로 하나 더 돌려서 무조건 끕니다.
      loadingTimerRef.current = setTimeout(() => {
        setIsItemLoading(false);
        setIsBottomLoaderAllowed(true);
        console.log("⏳ 표시 후 3.0초가 지나 로딩바를 강제로 숨깁니다.");
      }, 3000);

    }, 500);

    const targetId = Number(catId);
    const params = GetParams(targetId, filters);
    let queryString = params.toString();

    // 🌟 카테고리만 골라 본 목록은 페이지별로 하루 동안 캐시합니다 (검색·상세검색·비기본 정렬은 제외).
    //    캐시가 있으면 쿨다운·크롤링 없이 바로 보여줍니다. (app/main_shop/components/categoryListCache.ts)
    const cacheKey = isPureCategoryQuery(params, MERCARI_CACHE_RULE) ? categoryCacheKey('mercari', params, MERCARI_CACHE_RULE) : null;
    if (cacheKey) {
      const cached = readCategoryListCache<MercariItem>(cacheKey);
      if (cached && cached.complete === false) {
        // 🌟 받는 도중 다른 카테고리로 옮겨 가 중간까지만 저장된 목록: 받은 만큼 먼저 보여주고,
        //    서버에 그 상품 id 들을 알려 "아직 못 받은 나머지" 만 이어서 받습니다.
        receivedRows.push(...cached.items);
        cached.items.forEach(row => seenIds.add(row.id));
        setItems([...cached.items]);
        setDisplayItems([...cached.items]);
        params.append('known', cached.items.map(row => row.id).join(','));
        queryString = params.toString();
      } else if (cached) {
        if (loadingTimerRef.current) {
          clearTimeout(loadingTimerRef.current);
          loadingTimerRef.current = null;
        }
        setItems([...cached.items]);
        setDisplayItems([...cached.items]);
        setIsItemLoading(false); // 🚀 캐시일 땐 바로 로딩 종료
        return;
      }
    }

    setIsStreaming(true);

    // 🐛 쿨다운(5초) 안에 카테고리를 또 누르면 예전엔 목록을 비운 채 "N초 후 다시 시도" 알림만 띄우고
    //    끝나서, 사용자가 다시 누르지 않는 한 빈 화면으로 남았습니다.
    //    → 거부하지 않고 남은 시간만큼 기다렸다가 진행합니다. (로더는 그대로 표시, 과부하 방지는 유지)
    const cooldown = checkMercariCooldown();
    if (!cooldown.canCall) {
      await new Promise(r => setTimeout(r, cooldown.remainingTime * 1000));
      if (abortControllerRef.current !== controller) return; // 기다리는 사이 다른 요청이 나감
      checkMercariCooldown(); // 슬롯 갱신
    }

    // 🌟 서버가 마지막에 보내는 { success:false, error } / { done, total } 줄을 읽어
    //    "조용한 빈 목록" 대신 안내를 띄우기 위한 집계
    let received = 0;
    let failMessage: string | null = null;

    try {
      const res = await fetch(`/api/mercari/search?${queryString}`, {
        signal: controller.signal // 리모컨 연결
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("ReadableStream not supported");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (loadingTimerRef.current) {
          clearTimeout(loadingTimerRef.current);
          loadingTimerRef.current = null;
          setIsItemLoading(false);
          setIsBottomLoaderAllowed(true);
        }

        buffer += decoder.decode(value, { stream: true });
        
        // 🚀 [설계 포인트 2] 줄바꿈(\n)을 기준으로 데이터 덩어리를 나눕니다.
        const lines = buffer.split('\n');
        
        // 마지막 줄은 불완전할 수 있으니 buffer에 다시 담아둡니다.
        buffer = lines.pop() || ""; 

        // 나뉜 데이터 덩어리(line)를 순서대로 처리합니다.
        for (const line of lines) {
          if (!line.trim()) continue; // 공백 패딩은 무시
          try {
            const result = JSON.parse(line);
            
            // 🚀 데이터 덩어리가 도착할 때마다 setDisplayItems를 호출합니다!
            // 여기서 items와 displayItems를 같이 업데이트해서 숫자가 올라가게 합니다.
            if (result.success && result.data) {
              const fresh: MercariItem[] = result.data.filter((row: MercariItem) => !seenIds.has(row.id));
              fresh.forEach(row => seenIds.add(row.id));
              if (fresh.length === 0) continue;
              received += fresh.length;
              receivedRows.push(...fresh);
              setItems(prev => [...prev, ...fresh]); // 숫자 카운트용
              setDisplayItems(prev => [...prev, ...fresh]); // 상품 리스트용
            } else if (result.success === false && result.error) {
              failMessage = result.error;
            }
          } catch (e) {
            console.error("JSON 파싱 에러:", e);
          }
        }
      }
    } catch (err: any) {
      // 🚀 [수정] 중단 에러(AbortError)인 경우 로딩을 끄지 않고 그냥 나갑니다.
      if (err.name === 'AbortError') {
        console.log("🤫 이전 요청은 조용히 사라집니다...");
        // 🌟 다른 카테고리로 옮겨 가며 중단됐다면 지금까지 받은 만큼을 "미완성" 으로 저장해 두었다가,
        //    다시 돌아왔을 때 나머지만 이어서 받습니다.
        if (cacheKey && receivedRows.length > 0) writeCategoryListCache(cacheKey, receivedRows, undefined, { complete: false });
        return;
      }
      console.error("❌ 실제 통신 에러:", err);
      failMessage = '상품을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    } finally {
      // 🚀 [수정 핵심] '내 요청'이 여전히 '최신 요청'일 때만 로딩을 끕니다.
      if (abortControllerRef.current === controller) {
        setIsStreaming(false);

        if (loadingTimerRef.current) {
          clearTimeout(loadingTimerRef.current);
          loadingTimerRef.current = null;
        }

        setIsItemLoading(false);
        console.log("🏁 최신 수집 작업 완료!");

        // 🐛 예전엔 서버가 0개로 끝나도 아무 말 없이 빈 화면이었습니다.
        if (received === 0 && receivedRows.length === 0 && failMessage) showAlert(failMessage, 'error');

        // 🌟 끝까지 정상 수신한 순수 카테고리 조회만 캐시에 저장합니다 (중단·실패·0개는 저장 안 함)
        if (cacheKey && !controller.signal.aborted && !failMessage && receivedRows.length > 0) {
          writeCategoryListCache(cacheKey, receivedRows);
        }
      }
    }
  };

  const OnPageChange = (newPage: number) => {

    const updatedPageInfo = { ...pageInfo, page: newPage };

    setPageInfo(updatedPageInfo);
    
    // 🚀 이제 filters 대신 부모가 기억하고 있는 currentFilters를 사용하세요!
    loadItems(genreId, { ...currentFilters, page: newPage });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    
  };

  const OnSearch = async (filters: GlobalFilterState) => {
        // 1. 🚀 한국어 -> 일본어 번역 실행 
      // (getTranslatedKeyword 내부에서 언어 체크 후 필요할 때만 번역합니다)
      const translatedKeyword = await getTranslatedText(filters.keyword || "");

      const translatedExcludeKeyword = await getTranslatedText(filters.excludeKeyword || "");

      // 2. 번역된 키워드로 필터 교체
      const updatedFilters = { 
        ...filters, 
        keyword: translatedKeyword,
        excludeKeyword: translatedExcludeKeyword 
      };

      // 3. 부모 상태 업데이트
      setCurrentFilters(updatedFilters); 

      // 4. 데이터 로드 호출
      // (이 함수 안에서 미쿠짱 로딩 팝업과 스트리밍이 시작됩니다!)
      loadItems(genreId, updatedFilters);
  };

  // 🌟 헤더 통합검색: 현재 선택된 카테고리와 상관없이 메루카리 전체에서 키워드로 검색합니다.
  const { searchRequest } = useGlobalSearch();
  const handledSearchTokenRef = useRef(0);
  useEffect(() => {
    if (!searchRequest || searchRequest.token === handledSearchTokenRef.current) return;
    handledSearchTokenRef.current = searchRequest.token;

    (async () => {
      const translatedKeyword = await getTranslatedText(searchRequest.keyword);
      const updatedFilters = { ...currentFilters, keyword: translatedKeyword };
      delete (updatedFilters as any).page; // 새 검색이니 페이지 토큰은 초기화
      setCurrentFilters(updatedFilters);
      loadItems(0, updatedFilters); // category_id 없이(0): 전체 카테고리 대상 검색
    })();
  }, [searchRequest]);

  // 🚀 [로직 5] 상품 상세 정보 로드
  const loadProductDetail = async (item: GlobalItem) => {
    const itemId = item.id;
    if (globalProductDetailCache[itemId]) {
      setProductDetail({ ...globalProductDetailCache[itemId], platform: 'mercari' } as GlobalProduct); 
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
      return; 
    }
    if (!isCallAllowed()) return;

    setIsDetailLoading(true);
    setProductDetail(null); 

    try {
      const res = await fetch(`/api/mercari/productDetail?itemId=${itemId}`);
      const result = await res.json();
      if (result.success) {
        const mappedData: GlobalProduct = { ...result.data, platform: 'mercari' };
        setProductDetail(mappedData);
        globalProductDetailCache[itemId] = result.data;
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      showAlert('상품 로딩에 실패하였습니다.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const updateNavigation = (id: number, name: string, level?: number) => {

    if(id.toString() === genreId.toString())
        return;
      
    // 🌟 목록을 받는 도중 다른 카테고리(홈 포함)로 옮기면 요청을 끊어, 받은 만큼만 미완성 캐시로 남기고
    //    이전 카테고리 상품이 새 화면에 계속 덧붙는 것도 막습니다
    abortControllerRef.current?.abort();
    setIsLeaf(false);

    setItems([]); 
    setDisplayItems([]);
    setPageInfo(prev => ({ ...prev, page: 1 })); // 페이지도 1로 초기화

    if (!id || id === 0 || name === 'HOME') {
      setPath([]);
      router.push('/main_shop/mercari');
      return;
    }

    // 브레드크럼 클릭 시 경로 계산 (기존 로직 유지)
    setPath(prev => {
      if (level !== undefined) return [...prev.slice(0, level), { id, name }];
      const existsIndex = prev.findIndex(p => p.id === id);
      if (existsIndex !== -1) return prev.slice(0, existsIndex + 1);
      return [...prev, { id, name }];
    });

    router.push(`/main_shop/mercari?cat=${id}`);

    // 🌟 "실시간 인기 상품"이 참고할 카테고리 클릭수 집계 (fire-and-forget, 실패해도 이동은 그대로 동작)
    fetch('/api/mercari/trackCategoryClick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genreId: id, genreName: name }),
    }).catch(() => {});

    // 🚀 홈이 아닐 때만 아이템 수집을 즉시 시작합니다!
    // activeFilters는 부모가 들고 있는 현재 필터 상태입니다.
    requestedGenreRef.current = String(id);
    loadItems(id, currentFilters);
  };

  // 🚀 [로직 6] 카테고리 로드 및 초기 데이터 세팅
  useEffect(() => {
    const fetchData = async () => {
      // 1. 시작하자마자 상태 초기화 (이전 기억 삭제)
      setIsLeaf(false);
      setCategories([]); 

      try {
        const apiUrl = `/api/mercari/categories${genreId ? `?parentId=${genreId}` : ''}`;

        const res = await fetch(apiUrl);
        const result = await res.json();

        if (result.success) {

          const serverData = result.data || [];
          const serverIsLeaf = !!result.isLeaf;

          setCategories(serverData);
          setIsLeaf(serverIsLeaf);

          // 경로 업데이트
          if (result.parents) {
            setPath(result.parents.map((p: any) => ({ id: p.parent.genreId, name: p.genreName })));
          }

          // 🐛 직접 진입/새로고침/뒤로가기: 클릭으로 요청한 적 없는 카테고리면 여기서 상품 수집을 시작합니다.
          if (genreId && genreId !== '0' && requestedGenreRef.current !== String(genreId)) {
            requestedGenreRef.current = String(genreId);
            loadItems(genreId, currentFilters);
          }
        }
      } catch (err) {
        console.error("❌ 통신 중 진짜 에러 발생:", err);
      } finally {
      }
    };

    fetchData();
  }, [genreId]);

  // 🚀 [로직 7] 실시간 인기 상품 로드 (홈 화면 진입 시 한 번만 조회)
  // 🌟 [속도 개선] 전부 모일 때까지 기다리지 않고, 백엔드가 ndjson으로 몇 개씩 흘려보내는
  // 즉시 화면에 반영합니다 (검색 스트리밍과 동일한 청크 파싱 방식).
  // 🌟 [버그 수정] 개발 모드의 React StrictMode는 useEffect를 일부러 두 번 실행하는데,
  // 정리(cleanup) 없이 그냥 두면 두 인스턴스가 각자 스트림을 읽으며 같은 popularProducts에
  // 계속 append하다가 똑같은 상품이 두 번씩 쌓여 "동일 key" 에러가 났습니다. 이전 요청을
  // AbortController로 취소하고, 취소된 인스턴스는 상태 갱신도 멈추게 합니다.
  useEffect(() => {
    // 🌟 10분 안에 다시 들어오면(카테고리·상세·다른 페이지 갔다 오기, 새로고침) 수십 초 걸리는
    //    크롤링을 다시 하지 않고 세션 캐시에서 바로 보여줍니다. (components/popularCache.ts)
    const cached = readPopularCache('mercari');
    if (cached) {
      setPopularProducts(cached);
      setIsPopularLoading(false);
      return;
    }

    const controller = new AbortController();
    let ignore = false;
    // 스트림이 끝까지 정상 완료됐을 때만 캐시에 저장하기 위한 누적분 (중단되면 저장하지 않습니다)
    const received: GlobalProduct[] = [];

    const mapRow = (row: any): GlobalProduct => ({
      id: row.id,
      platform: 'mercari',
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
      status: row.status,
    });

    const fetchPopular = async () => {
      setIsPopularLoading(true);
      setPopularProducts([]); // 🌟 새 요청 시작 시 이전 누적분을 비웁니다 (중복 방지)
      try {
        const res = await fetch('/api/mercari/popular', { signal: controller.signal });
        if (!res.body) throw new Error("ReadableStream not supported");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done || ignore) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim() || ignore) continue;
            try {
              const result = JSON.parse(line);
              if (result.success && result.data?.length) {
                // 🌟 [버그 수정] 여기서 로딩 상태를 꺼버리면 1단계(카테고리 1위) 첫 청크가
                // 도착하는 순간 영영 꺼진 채로 남아, 뒤이은 추천 섹션/카테고리 2~10위 단계의
                // 하단 로딩 바가 다시는 뜨지 않았습니다. 전체 스트림이 끝날 때(finally)만 꺼서,
                // 100개를 다 모으거나 모든 단계가 끝날 때까지 계속 보이게 합니다.
                const rows: GlobalProduct[] = result.data.map(mapRow);
                received.push(...rows);
                setPopularProducts(prev => [...prev, ...rows]);
              }
            } catch (e) {
              console.error("인기 상품 JSON 파싱 에러:", e);
            }
          }
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') console.error('인기 상품 로드 실패', e);
      } finally {
        if (!ignore) {
          setIsPopularLoading(false);
          // 끝까지 받은 결과만 캐시합니다 (StrictMode 첫 인스턴스나 이탈로 중단된 경우는 ignore=true 라 제외)
          writePopularCache('mercari', received);
        }
      }
    };
    fetchPopular();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, []);

  return (
    <GlobalShoppingView
      platform="mercari"
      path={path}
      categories={categories}
      items={mappedDisplayItems}
      popularProducts={popularProducts}
      isPopularLoading={isPopularLoading}
      pageInfo={pageInfo}
      selectedProduct={productDetail}
      sortOptions={MercariSortOptions}
      isLoading={false}
      isItemLoading={isItemLoading}
      isStreaming={isStreaming}
      isBottomLoaderAllowed={isBottomLoaderAllowed}
      isDetailLoading={isDetailLoading}
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
export default function MercariCategoryPage() {
  return (
    <Suspense fallback={
      <div className="platform-loading-wrap">
        <i className="fa fa-spinner fa-spin fa-2x" style={{ color: '#ff0021' }}></i>
        <p className="platform-loading-text">메르카리 정보를 불러오는 중입니다...</p>
      </div>
    }>
      <MercariCategoryContent />
    </Suspense>
  );
}