"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// --- 📦 공용 글로벌 컴포넌트 ---
import GlobalShoppingView from "@/app/main_shop/components/GlobalShoppingView";
import { GlobalFilterState } from "@/app/main_shop/components/GlobalSidebar";
import { GlobalProduct } from "@/app/main_shop/components/GlobalProductDetail";
import { GlobalItem } from "@/app/main_shop/components/GlobalProductCard";

// --- 🛠️ 유틸리티 ---
import { useMikuAlert } from '@/app/context/MikuAlertContext'; 
import { getTranslatedText } from '@/lib/search-utils';

// 야후 옥션 전용 카테고리 인터페이스
interface YahooAuctionCategory {
  genreId: string; 
  genreName: string; 
  isLeaf: boolean;
  genreLevel?: number;
}

interface YahooAuctionItem {
  id: string;
  name: string;
  price: number;
  thumbnail: string;
  status: string;
  url: string;
  // 🌟 [추가] 야후 옥션 전용 필드 (입찰수, 남은 시간)
  bidCount?: number;
  timeLeft?: string;
}

// ✨ 야후 옥션 전용 정렬 옵션
const YahooAuctionSortOptions = [
  { id: 'end', label: '종료임박순' },
  { id: 'cbids', label: '입찰수많은순' },
  { id: 'bidorbuy', label: '즉시구매가격순' },
  { id: 'a-price', label: '현재가격낮은순' },
  { id: 'd-price', label: '현재가격높은순' },
  { id: 'new', label: '신규등록순' },
];

let globalItemsCache: { [key: string]: any[] } = {};

function YahooAuctionContent() {

  const [currentFilters, setCurrentFilters] = useState<GlobalFilterState>({
    sortOrder: 'end',      // 야후 옥션 기본 정렬값
    keyword: '',
    excludeKeyword: '',
    brand: '',
    size: '모두',
    sellerType: '모두',
    minPrice: '',
    maxPrice: '',
    condition: '모두',
    shippingPayer: '모두',
    hasDiscount: '모두',
    listingType: '모두',
    colors: ['모두'],
    shippingOption: '모두',
    status: '모두',
    page: 1,
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const lastFetchedIdRef = useRef<number | null>(null);

  // ✨ URL 파라미터를 genreId로 완벽 통일!
  const genreId = searchParams.get('genreId') || '0';
  const sort = searchParams.get('sort') || 'end';
  const page = searchParams.get('page') || '1';
  const keyword = searchParams.get('keyword') || '';

  // 데이터 상태
  const [categories, setCategories] = useState<YahooAuctionCategory[]>([]);
  const [isLeaf, setIsLeaf] = useState(false);
  const [path, setPath] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(false);

  // 아이템
  const [items, setItems] = useState<YahooAuctionItem[]>([]);
  const [displayItems, setDisplayItems] = useState<YahooAuctionItem[]>([]);
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

  const GetParams = (genreId: number, filters?: GlobalFilterState): URLSearchParams => {
    
    const params = new URLSearchParams({});

    if (genreId !== 0) params.append("category_id", genreId.toString());

    if (!filters) return params;

    // TODO: 필터 적용 로직 주석 해제 필요 시 추가

    return params;
  };

  // 🚀 [수정] 야후 옥션 데이터를 Global 규격으로 완벽하게 변환!
  const mappedDisplayItems = useMemo((): GlobalItem[] => {
    return displayItems.map(item => ({
      ...item,
      platform: 'yahoo_auction', // 🚨 기존에 'mercari'로 되어있던 치명적 버그 수정!
      status: item.status as 'on_sale' | 'sold_out',
      bidCount: item.bidCount,   // ✨ 입찰수 연결
      timeLeft: item.timeLeft,   // ✨ 남은 시간 연결
    }));
  }, [displayItems]);
  
  const loadItems = async (catId: any, filters?: GlobalFilterState) => {
      // 1. 이전 요청 중단
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log("🛑 이전 수집 작업을 중단했습니다.");
      }
  
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
  
      // 2. 새 요청을 위한 리모컨 생성
      const controller = new AbortController();
      abortControllerRef.current = controller;
  
      // 모든 바구니 비우기
      setItems([]); 
      setDisplayItems([]); 
      setProductDetail(null);
      setIsItemLoading(false);
      setIsStreaming(false);
      setIsBottomLoaderAllowed(false);
  
      // 1.2초 후에 로딩바 표시
      loadingTimerRef.current = setTimeout(() => {
        setIsItemLoading(true);
        console.log("⏳ 1.2초가 지나 로딩바를 표시합니다.");
  
        // 3초 후 강제 종료
        loadingTimerRef.current = setTimeout(() => {
          setIsItemLoading(false);
          setIsBottomLoaderAllowed(true);
          console.log("⏳ 표시 후 3.0초가 지나 로딩바를 강제로 숨깁니다.");
        }, 3000);
  
      }, 1200);
  
      const targetId = Number(catId);
      const params = GetParams(targetId, filters);
      const queryString = params.toString();
  
      // 캐시 확인
      if (globalItemsCache[queryString]) {
        setItems([...globalItemsCache[queryString]]);
        setDisplayItems([...globalItemsCache[queryString]]);
        setIsItemLoading(false);
        return;
      }
  
      setIsStreaming(true);
  
      try {
        const res = await fetch(`/api/yahoo_auction/search?${queryString}`, { 
          signal: controller.signal 
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
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || ""; 
  
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const result = JSON.parse(line);
              
              if (result.success && result.data) {
                setItems(prev => [...prev, ...result.data]); 
                setDisplayItems(prev => [...prev, ...result.data]); 
              }
            } catch (e) {
              console.error("JSON 파싱 에러:", e);
            }
          }
        }   
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log("🤫 이전 요청은 조용히 사라집니다...");
          return; 
        }
        console.error("❌ 실제 통신 에러:", err);
      } finally {
  
        if (abortControllerRef.current === controller) {
          setIsStreaming(false);
  
          if (loadingTimerRef.current) {
            clearTimeout(loadingTimerRef.current); 
            loadingTimerRef.current = null;
          }
  
          setIsItemLoading(false);
          console.log("🏁 최신 수집 작업 완료!");
        }
      }
    };
  
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLeaf(false);
      setCategories([]);

      try {
        const res = await fetch(`/api/yahoo_auction/categories?genre=${genreId}`);
        const result = await res.json();

        if (result.success) {
          console.log("🛠️ [Debug] 야후 옥션 카테고리 로드 완료:", result.data);

          const serverData = result.data || [];
          const serverIsLeaf = !!result.isLeaf;

          setCategories(serverData);
          setIsLeaf(serverIsLeaf);

          if (result.path) {
            setPath(result.path.map((p: any) => ({ id: p.id, name: p.name })));
          }

          if (genreId !== '0') {
            console.log(`📦 장르 변경 감지: ${genreId}번 카테고리 상품 로드 시작`);
            await loadItems(genreId, currentFilters);
          }
        }
      } catch (e) {
        console.error("Yahoo Auction Category Load Error", e);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [genreId]); 

  const updateNavigation = (id: number, name: string, levelIndex: number) => {
    setIsLeaf(false);
    setItems([]); 
    setProductDetail(null);
    setPageInfo(prev => ({ ...prev, page: 1 }));

    if (!id || id === 0 ||  name === 'HOME') { 
      setPath([]); 
      router.push('/main_shop/yahoo_auction'); 
      return; 
    }
    
    setPath(prev => {
      const filtered = prev.slice(0, levelIndex);
      return [...filtered, { id: id, name: name }];
    });

    router.push(`/main_shop/yahoo_auction?genreId=${id}`);
  };

  const OnSearch = async (filters: GlobalFilterState) => {
      const translatedKeyword = await getTranslatedText(filters.keyword || "");
      const translatedExcludeKeyword = await getTranslatedText(filters.excludeKeyword || "");

      const updatedFilters = { 
        ...filters, 
        keyword: translatedKeyword,
        excludeKeyword: translatedExcludeKeyword 
      };

      setCurrentFilters(updatedFilters); 
      loadItems(Number(genreId), updatedFilters);
  };

  const loadProductDetail = async (item: GlobalItem) => {
      const itemId = item.id;
  
      setIsDetailLoading(true);
      setProductDetail(null); 
  
      try {
        const res = await fetch(`/api/yahoo_auction/productDetail?itemId=${itemId}`);
        const result = await res.json();
        if (result.success) {
          const mappedData: GlobalProduct = { ...result.data, platform: 'yahoo_auction' };
          setProductDetail(mappedData);
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

  return (
    <GlobalShoppingView
      platform="yahoo_auction"
      path={path}
      categories={categories}
      items={mappedDisplayItems} 
      pageInfo={pageInfo}
      selectedProduct={productDetail}
      sortOptions={YahooAuctionSortOptions}
      isLoading={loading}
      isItemLoading={isItemLoading}
      isStreaming={isStreaming}
      isBottomLoaderAllowed={isBottomLoaderAllowed}
      isDetailLoading={isDetailLoading}
      isLeaf={isLeaf}
      onNavigate={updateNavigation}
      onSearch={OnSearch}
      onCardClick={loadProductDetail}
      onCloseDetail={() => setProductDetail(null)}
      onPageChange={(p) => router.push(`/main_shop/yahoo_auction?genreId=${genreId}&page=${p}&keyword=${keyword}`)}
    />
  );
}

export default function YahooAuctionPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        {/* ✨ 로딩 스피너 색상도 라쿠텐 레드(#bf0000)에서 야후 레드(#ff0033)로 맞춰주었습니다 */}
        <i className="fa fa-spinner fa-spin fa-2x" style={{ color: '#ff0033' }}></i>
        <p style={{ marginTop: '15px', color: '#666' }}>야후 옥션 카테고리를 불러오는 중입니다...</p>
      </div>
    }>
      <YahooAuctionContent />
    </Suspense>
  );
}