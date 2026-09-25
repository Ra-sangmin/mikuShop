"use client";

import { readPopularCache, writePopularCache } from "@/app/main_shop/components/popularCache";
import { readCategoryTreeCache, writeCategoryTreeCache } from "@/app/main_shop/components/categoryTreeCache";
import { isPureCategoryQuery, categoryCacheKey, readCategoryListCache, writeCategoryListCache } from "@/app/main_shop/components/categoryListCache";

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// --- 📦 공용 글로벌 컴포넌트 ---
import GlobalShoppingView from "@/app/main_shop/components/GlobalShoppingView";
import { GlobalFilterState } from "@/app/main_shop/components/GlobalSidebar";
import { GlobalProduct } from "@/app/main_shop/components/GlobalProductDetail";
import { GlobalItem } from "@/app/main_shop/components/GlobalProductCard";
import { useGlobalSearch } from "@/app/main_shop/components/GlobalSearchContext";

// --- 🛠️ 유틸리티 ---
import { useMikuAlert } from '@/app/context/MikuAlertContext'; 
import { getTranslatedText } from '@/lib/search-utils';
import '@/app/main_shop/platform-pages-common.css';

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
  { id: 'new', label: '신규등록순' },
  { id: 'endtime', label: '종료임박순' },
  { id: 'cbids', label: '입찰수많은순' },
  { id: 'bidorbuy', label: '즉시구매가격순' },
  { id: 'a-price', label: '현재가격낮은순' },
  { id: 'd-price', label: '현재가격높은순' },
];

// 🌟 카테고리 목록 캐시(하루) 판별 규칙: category_id + page + 기본 정렬(new) 만 있으면 "순수 카테고리 조회"
const YAHOO_AUCTION_CACHE_RULE = { categoryKey: 'category_id', pageKeys: ['page'], sortKey: 'sort', defaultSort: YahooAuctionSortOptions[0].id };

function YahooAuctionContent() {

  const [currentFilters, setCurrentFilters] = useState<GlobalFilterState>({
    sortOrder: 'new',      // 야후 옥션 기본 정렬값
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

  // 🌟 실시간 인기 상품 (비로그인 상태에서도 볼 수 있는, 몇몇 대분류의 신규 등록 경매 상품)
  const [popularProducts, setPopularProducts] = useState<GlobalProduct[]>([]);
  const [isPopularLoading, setIsPopularLoading] = useState(false);

  // page
  const [pageInfo, setPageInfo] = useState({ page: 1, pageCount: 100 });

  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { showAlert } = useMikuAlert(); 
  const abortControllerRef = useRef<AbortController | null>(null);

  const GetParams = (genreId: number, filters?: GlobalFilterState): URLSearchParams => {
    
    const params = new URLSearchParams({});

    if (genreId !== 0) params.append("category_id", genreId.toString());

    if (!filters) return params;

    if (filters.sortOrder) {params.append("sort", filters.sortOrder); }
    if (filters.page) params.append("page", filters.page.toString());
    // 🌟 [버그 수정] keyword가 여기서 빠져있어서, 사이드바/헤더 어디서 검색해도 키워드가
    // 백엔드로 전달되지 않고 그냥 카테고리 목록만 그대로 보여주고 있었습니다.
    if (filters.keyword) params.append("keyword", filters.keyword);

    return params;
  };

  // 🚀 [수정] 야후 옥션 데이터를 Global 규격으로 완벽하게 변환!
  const mappedDisplayItems = useMemo((): GlobalItem[] => {
    const getRemainingSeconds = (timeLeft?: string) => {
      const value = (timeLeft || '').trim();
      const minuteMatch = value.match(/(\d+)\s*(?:分|분)/);
      const secondMatch = value.match(/(\d+)\s*(?:秒|초)/);

      if (!minuteMatch && !secondMatch) return null;

      return (minuteMatch ? Number(minuteMatch[1]) * 60 : 0) +
        (secondMatch ? Number(secondMatch[1]) : 0);
    };

    return displayItems
      .filter(item => {
        const timeLeft = (item.timeLeft || '').trim();
        const isEnded = timeLeft === '終了' || timeLeft === '종료' ||
          timeLeft.includes('終了') || timeLeft.includes('종료') ||
          /남은 시간\s*0/.test(timeLeft) ||
          /終了|落札|売り切れ|SOLD|sold|closed|終了しました|取引終了/i.test(item.name);
        const isWithinOneMinute = currentFilters.sortOrder === 'endtime' &&
          (getRemainingSeconds(item.timeLeft) ?? Number.POSITIVE_INFINITY) <= 60;

        return item.status === 'on_sale' && !isEnded && !isWithinOneMinute;
      })
      .map(item => ({
      ...item,
      platform: 'yahoo_auction', // 🚨 기존에 'mercari'로 되어있던 치명적 버그 수정!
      status: item.status as 'on_sale' | 'sold_out',
      bidCount: item.bidCount,   // ✨ 입찰수 연결
      timeLeft: item.timeLeft,   // ✨ 남은 시간 연결
      }));
  }, [displayItems, currentFilters.sortOrder]);
  
  // 🌟 목록을 받는 도중 이 페이지를 떠나면 요청을 끊어(서버 크롤링도 중단) 받은 만큼만 미완성 캐시로 남깁니다
  useEffect(() => () => { abortControllerRef.current?.abort(); }, []);

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
      const receivedRows: YahooAuctionItem[] = []; // 🌟 캐시 저장용으로 수신 상품을 모아 둡니다
      const seenIds = new Set<string>(); // 🌟 같은 상품이 두 번 오면(이어받기·서버 캐시) 한 번만 붙입니다
  
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
      let queryString = params.toString();
  
      // 🌟 카테고리만 골라 본 목록은 페이지별로 하루 동안 캐시합니다 (검색·상세검색·비기본 정렬은 제외).
      //    캐시가 있으면 크롤링 없이 바로 보여줍니다. (app/main_shop/components/categoryListCache.ts)
      const cacheKey = isPureCategoryQuery(params, YAHOO_AUCTION_CACHE_RULE) ? categoryCacheKey('yahoo_auction', params, YAHOO_AUCTION_CACHE_RULE) : null;
      if (cacheKey) {
        const cached = readCategoryListCache<YahooAuctionItem>(cacheKey);
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
          setIsItemLoading(false);
          return;
        }
      }
  
      setIsStreaming(true);

      // 🌟 서버가 마지막에 보내는 { success:false, error } / { done, total } 줄을 읽어
      //    "조용한 빈 목록" 대신 안내를 띄우기 위한 집계
      let received = 0;
      let failMessage: string | null = null;

      try {
        const res = await fetch(`/api/yahoo_auction/search?${queryString}`, {
          signal: controller.signal
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
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || ""; 
  
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const result = JSON.parse(line);
              
              if (result.success && result.data) {
                const fresh: YahooAuctionItem[] = result.data.filter((row: YahooAuctionItem) => !seenIds.has(row.id));
                fresh.forEach(row => seenIds.add(row.id));
                if (fresh.length === 0) continue;
                received += fresh.length;
                receivedRows.push(...fresh);
                setItems(prev => [...prev, ...fresh]);
                setDisplayItems(prev => [...prev, ...fresh]);
              } else if (result.success === false && result.error) {
                failMessage = result.error;
              }
            } catch (e) {
              console.error("JSON 파싱 에러:", e);
            }
          }
        }
      } catch (err: any) {
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
  
  useEffect(() => {
    // 🌟 상품은 URL 의 genreId 만 있으면 되므로 카테고리 응답을 기다리지 않고 먼저 시작합니다.
    if (genreId !== '0') {
      console.log(`📦 장르 변경 감지: ${genreId}번 카테고리 상품 로드 시작`);
      loadItems(genreId, currentFilters);
    }

    const applyCategories = (result: { data?: any[]; isLeaf?: boolean; parents?: { genreId: number; genreName: string }[]; path?: { id: number; name: string }[] }) => {
      setCategories(result.data || []);
      setIsLeaf(!!result.isLeaf);
      if (result.parents) setPath(result.parents.map((p) => ({ id: p.genreId, name: p.genreName })));
      else if (result.path) setPath(result.path.map((p) => ({ id: p.id, name: p.name })));
    };

    // 🌟 하루 안에 본 카테고리는 브라우저 캐시에서 즉시 (서버 요청 0건)
    const cached = readCategoryTreeCache('yahoo_auction', genreId);
    if (cached) { applyCategories(cached); setLoading(false); return; }

    setIsLeaf(false);
    setCategories([]);
    setLoading(true);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/yahoo_auction/categories?genre=${genreId}`);
        const result = await res.json();
        if (cancelled) return;
        if (result.success) {
          applyCategories(result);
          writeCategoryTreeCache('yahoo_auction', genreId, { data: result.data || [], isLeaf: !!result.isLeaf, parents: result.parents || [] });
        }
      } catch (e) {
        if (!cancelled) console.error("Yahoo Auction Category Load Error", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [genreId]);

  // 🚀 실시간 인기 상품 로드 (홈 화면 진입 시 한 번만 조회)
  // 🌟 [버그 수정] 개발 모드의 React StrictMode는 useEffect를 일부러 두 번 실행하는데,
  // 정리(cleanup) 없이 그냥 두면 두 인스턴스가 각자 스트림을 읽으며 같은 popularProducts에
  // 계속 append하다가 똑같은 상품이 두 번씩 쌓여 "동일 key" 에러가 났습니다. 이전 요청을
  // AbortController로 취소하고, 취소된 인스턴스는 상태 갱신도 멈추게 합니다.
  useEffect(() => {
    // 🌟 10분 안에 다시 들어오면(카테고리·상세·다른 페이지 갔다 오기, 새로고침) 수십 초 걸리는
    //    크롤링을 다시 하지 않고 세션 캐시에서 바로 보여줍니다. (components/popularCache.ts)
    const cached = readPopularCache('yahoo_auction');
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
      platform: 'yahoo_auction',
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
      bidCount: row.bidCount,
      timeLeft: row.timeLeft,
    });

    // 🌟 [속도 개선] 카테고리를 순서대로 다 돌 때까지 기다리지 않고, 백엔드가 ndjson으로
    // 카테고리별로 흘려보내는 즉시 화면에 반영합니다 (검색 스트리밍과 동일한 청크 파싱 방식).
    const fetchPopular = async () => {
      setIsPopularLoading(true);
      setPopularProducts([]); // 🌟 새 요청 시작 시 이전 누적분을 비웁니다 (중복 방지)
      try {
        const res = await fetch('/api/yahoo_auction/popular', { signal: controller.signal });
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
                // 🌟 [버그 수정] 여기서 로딩 상태를 꺼버리면 첫 청크가 도착하는 순간 영영 꺼진
                // 채로 남아, 뒤이은 카테고리 단계들의 하단 로딩 바가 다시는 뜨지 않았습니다.
                // 전체 스트림이 끝날 때(finally)만 꺼지도록 합니다.
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
          writePopularCache('yahoo_auction', received);
        }
      }
    };
    fetchPopular();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, []);

  const updateNavigation = (id: number, name: string, levelIndex: number) => {

    if(id.toString() === genreId.toString())
        return;
      
    // 🌟 목록을 받는 도중 다른 카테고리(홈 포함)로 옮기면 요청을 끊어, 받은 만큼만 미완성 캐시로 남기고
    //    이전 카테고리 상품이 새 화면에 계속 덧붙는 것도 막습니다
    abortControllerRef.current?.abort();
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

    // 🌟 "실시간 인기 상품"이 참고할 카테고리 클릭수 집계 (fire-and-forget, 실패해도 이동은 그대로 동작)
    fetch('/api/yahoo_auction/trackCategoryClick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genreId: id, genreName: name }),
    }).catch(() => {});
  };

    // 페이지 변경 핸들러
  const OnPageChange = (newPage: number) => {
    
    const updatedPageInfo = { ...pageInfo, page: newPage };

    setPageInfo(updatedPageInfo);

    loadItems(genreId, { ...currentFilters, page: newPage });

    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // 🌟 헤더 통합검색: 현재 선택된 카테고리와 상관없이 야후 옥션 전체에서 키워드로 검색합니다.
  const { searchRequest } = useGlobalSearch();
  const handledSearchTokenRef = useRef(0);
  useEffect(() => {
    if (!searchRequest || searchRequest.token === handledSearchTokenRef.current) return;
    handledSearchTokenRef.current = searchRequest.token;

    (async () => {
      const translatedKeyword = await getTranslatedText(searchRequest.keyword);
      // 🤖 헤더 AI 검색이 문장에서 뽑은 가격·제외어 (일반 검색어만 온 경우엔 기존 값 유지)
      const extra = searchRequest.extra;
      const aiFilters = extra
        ? { minPrice: extra.minPrice ?? '', maxPrice: extra.maxPrice ?? '', excludeKeyword: extra.excludeKeyword ?? '' }
        : {};
      const updatedFilters = { ...currentFilters, ...aiFilters, keyword: translatedKeyword, page: 1 };
      setCurrentFilters(updatedFilters);
      setPageInfo(prev => ({ ...prev, page: 1 }));
      loadItems(0, updatedFilters); // category_id 없이(0): 전체 카테고리 대상 검색
    })();
  }, [searchRequest]);

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
          throw new Error(result.error || '상품 상세 정보를 불러오지 못했습니다.');
        }
      } catch (err: any) {
        const fallbackProduct: GlobalProduct = {
          id: item.id,
          platform: 'yahoo_auction',
          name: item.name || '상품 상세 정보',
          price: Number(item.price) || 0,
          thumbnail: item.thumbnail || '',
          images: item.thumbnail ? [item.thumbnail] : [],
          description: '상세 정보를 불러오지 못했습니다. 원문 페이지에서 확인해 주세요.',
          url: item.url || `https://auctions.yahoo.co.jp/jp/auction/${item.id}`,
          status: item.status,
          categories: [],
          bidCount: item.bidCount,
          timeLeft: item.timeLeft,
        };
        setProductDetail(fallbackProduct);
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
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
      popularProducts={popularProducts}
      isPopularLoading={isPopularLoading}
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
      onPageChange={OnPageChange}
    />
  );
}

export default function YahooAuctionPage() {
  return (
    <Suspense fallback={
      <div className="platform-loading-wrap">
        {/* ✨ 로딩 스피너 색상도 라쿠텐 레드(#bf0000)에서 야후 레드(#ff0033)로 맞춰주었습니다 */}
        <i className="fa fa-spinner fa-spin fa-2x" style={{ color: '#ff0033' }}></i>
        <p className="platform-loading-text">야후 옥션 카테고리를 불러오는 중입니다...</p>
      </div>
    }>
      <YahooAuctionContent />
    </Suspense>
  );
}