"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react'; // Suspense 추가
import { useSearchParams, useRouter } from 'next/navigation';

// --- 📦 공용 글로벌 컴포넌트 ---
import GlobalShoppingView from "@/app/main_shop/components/GlobalShoppingView";
import { GlobalFilterState } from "@/app/main_shop/components/GlobalSidebar";
import { GlobalProduct } from "@/app/main_shop/components/GlobalProductDetail";
import { GlobalItem } from "@/app/main_shop/components/GlobalProductCard";

// --- 🛠️ 유틸리티 ---
import { checkMercariCooldown, lastCallTimestamp } from "./mercariApi";
import { useMikuAlert } from '@/app/context/MikuAlertContext'; 
import { getTranslatedText } from '@/lib/search-utils';

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

let globalItemsCache: { [key: string]: any[] } = {};
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
  
  // page
  const [pageInfo, setPageInfo] = useState({ page: 1, pageCount: 100 });

  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { showAlert } = useMikuAlert(); 
  const abortControllerRef = useRef<AbortController | null>(null);

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

    const getSellerId = (val: string) => (val === '개인' ? 'mercari' : val === '메루카리샵' ? 'beyond' : '');
    if (filters.sellerType !== '모두') params.append("item_types", getSellerId(filters.sellerType));

    if (filters.minPrice) params.append("price_min", filters.minPrice);
    if (filters.maxPrice) params.append("price_max", filters.maxPrice);

    const getCondition = (val: string) => {
      const map: { [key: string]: string } = { '신품, 미사용': '1', '미사용에 가까움': '2', '눈에 띄는 흠집 없음': '3', '다소 흠집 있음': '4', '전반적으로 나쁨': '6' };
      return map[val] || '';
    };
    if (filters.condition !== '모두') params.append("item_condition_id", getCondition(filters.condition));

    if (filters.shippingPayer !== '모두') params.append("shipping_payer_id", filters.shippingPayer === '배송비 포함' ? '2' : '1');
    if (filters.hasDiscount !== '모두') params.append("hasDiscount", '9df96424-a8c2-414a-bbab-74bd11bd20aa');
    if (filters.listingType !== '모두') params.append("listingType", '3b6eac8c-7be5-4c9c-b537-7c05cd3c4905');

    const getColorId = (val: string) => {
      const map: { [key: string]: string } = { '화이트계열': '2', '블랙계열': '1', '그레이계열': '3', '브라운계열': '4', '베이지계열': '9', '그린계열': '10', '블루계열': '8', '퍼플계열': '7', '옐로우계열': '11', '핑크계열': '6', '레드계열': '5', '오렌지계열': '12' };
      return map[val] || '';
    };
    if (filters.colors?.length > 0 && filters.colors[0] !== '모두') params.append("color_id", getColorId(filters.colors[0]));

    const getShippingOption = (val: string) => {
      const map: { [key: string]: string } = { '익명 배송': 'anonymous', '수취 옵션': 'japan_post', '옵션 없음': 'no_option' };
      return map[val] || '';
    };
    if (filters.shippingOption !== '모두') params.append("shipping_method", getShippingOption(filters.shippingOption));
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

    // 🚀 [수정] 모든 바구니를 확실히 비우고 시작합니다.
    setItems([]); 
    setDisplayItems([]); 
    setProductDetail(null);
    setIsItemLoading(false);
    setIsStreaming(false);
    setIsBottomLoaderAllowed(false);

    // 🚀 [수정] 2초 후에만 로딩 상태를 true로 변경합니다.
    loadingTimerRef.current = setTimeout(() => {
      setIsItemLoading(true);
      console.log("⏳ 1.5초가 지나 로딩바를 표시합니다.");

      // 표시된 직후, 2.5초 타이머를 새로 하나 더 돌려서 무조건 끕니다.
      loadingTimerRef.current = setTimeout(() => {
        setIsItemLoading(false);
        setIsBottomLoaderAllowed(true);
        console.log("⏳ 표시 후 3.0초가 지나 로딩바를 강제로 숨깁니다.");
      }, 3000);

    }, 2000);

    const targetId = Number(catId);
    const params = GetParams(targetId, filters);
    const queryString = params.toString();

    // 캐시 확인 로직
    if (globalItemsCache[queryString]) {
      setItems([...globalItemsCache[queryString]]);
      setDisplayItems([...globalItemsCache[queryString]]);
      setIsItemLoading(false); // 🚀 캐시일 땐 바로 로딩 종료
      return;
    }

    if (!isCallAllowed()) {
      setIsItemLoading(false); // 🚀 쿨다운일 때도 로딩 종료
      return;
    }

    setIsStreaming(true);

    try {
      const res = await fetch(`/api/mercari/search?${queryString}`, { 
        signal: controller.signal // 리모컨 연결
      });
      
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
              setItems(prev => [...prev, ...result.data]); // 숫자 카운트용
              setDisplayItems(prev => [...prev, ...result.data]); // 상품 리스트용
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
        return; 
      }
      console.error("❌ 실제 통신 에러:", err);
    } finally {

      if (abortControllerRef.current === controller) {
        
        setIsStreaming(false);

        // 👈 타이머 정리 로직을 이 안으로 옮깁니다!
        if (loadingTimerRef.current) {
          clearTimeout(loadingTimerRef.current); 
          loadingTimerRef.current = null;
        }

        setIsItemLoading(false);
        console.log("🏁 최신 수집 작업 완료!");
      }

      // 🚀 [수정 핵심] '내 요청'이 여전히 '최신 요청'일 때만 로딩을 끕니다.
      if (abortControllerRef.current === controller) {
        setIsItemLoading(false);
        console.log("🏁 최신 수집 작업 완료!");
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

    // 🚀 홈이 아닐 때만 아이템 수집을 즉시 시작합니다!
    // activeFilters는 부모가 들고 있는 현재 필터 상태입니다.
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
          
        } 
      } catch (err) {
        console.error("❌ 통신 중 진짜 에러 발생:", err);
      } finally {
      }
    };

    fetchData();
  }, [genreId]);

  return (
    <GlobalShoppingView 
      platform="mercari"
      path={path}
      categories={categories}
      items={mappedDisplayItems}
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
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <i className="fa fa-spinner fa-spin fa-2x" style={{ color: '#ff0021' }}></i>
        <p style={{ marginTop: '15px', color: '#666' }}>메르카리 정보를 불러오는 중입니다...</p>
      </div>
    }>
      <MercariCategoryContent />
    </Suspense>
  );
}