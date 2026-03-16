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

const SHOW_HEADER = false; 

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

let globalItemsCache: { [key: string]: any[] } = {};
let globalProductDetailCache: { [key: string]: GlobalProduct } = {};

// 1. 실제 로직을 담당하는 Content 컴포넌트
function MercariCategoryContent() {
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCatId = searchParams.get('cat') || '';

  // 카테고리 상태
  const [categories, setCategories] = useState<MercariCategory[]>([]);
  const [isLeaf, setIsLeaf] = useState(false); 
  const [isLoading, setIsLoading] = useState(false);
  const [path, setPath] = useState<{id: number, name: string}[]>([]);
  const [levelOptions, setLevelOptions] = useState<{[key: number]: MercariCategory[]}>({});
  
  // 크롤러 상태
  const isAutoRunningRef = useRef(false); 
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  // 아이템 상태
  const [items, setItems] = useState<MercariItem[]>([]);
  const [displayItems, setDisplayItems] = useState<MercariItem[]>([]);
  const [isItemLoading, setIsItemLoading] = useState(false);

  // 상품 상세 상태
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [productDetail, setProductDetail] = useState<GlobalProduct | null>(null);
  
  const { showAlert } = useMikuAlert(); 
  const abortControllerRef = useRef<AbortController | null>(null);
  // page.tsx 상단 state 부분
  const [pageInfo, setPageInfo] = useState({ 
    page: 1, 
    pageCount: 100 // 🚀 1에서 15(혹은 그 이상)로 변경하세요!
  });

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
      addLog(msg);
      showAlert(msg);
      return false; 
    }
    return true; 
  };

  /*
  // 🚀 [로직 2] 아이템 순차 렌더링 효과 (스트리밍 대응)
  useEffect(() => {
    if (items && items.length > 0) {
      setDisplayItems([]); 
      let index = 0;
      
      const interval = setInterval(() => {
        if (index < items.length) {
          const nextItem = items[index];
          if (nextItem) setDisplayItems(prev => [...prev, nextItem]);
          index++;
        } else {
          clearInterval(interval);
        }
      }, 60);
      return () => clearInterval(interval);
    } else {
      setDisplayItems([]);
    }
  }, [items]);
*/
  const addLog = (msg: string) => setLog(prev => [msg, ...prev].slice(0, 10));

  // 🚀 [로직 3] 메루카리 파라미터 빌더
  const buildMercariParams = (catId: number, filters?: GlobalFilterState): URLSearchParams => {
    const params = new URLSearchParams({});
    if (catId !== 0) params.append("category_id", catId.toString());
    if (!filters) return params;

    const getSort = (val: string) => {
      switch (val) {
        case '가격 낮은 순': return 'price&order=asc';
        case '가격 높은 순': return 'price&order=desc';
        case '최신순':       return 'created_time&order=desc';
        default: return '';
      }
    };
    if (filters.sortOrder !== '기본순') params.append("sort", getSort(filters.sortOrder));
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
    if (filters.status !== '모두') params.append("status", filters.status === '판매중' ? 'on_sale' : 'sold_out');

    return params;
  };

  const loadItems = async (catId: number, filters?: GlobalFilterState) => {
    // 1. 이전 요청 중단
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log("🛑 이전 수집 작업을 중단했습니다.");
    }

    // 2. 새 요청을 위한 리모컨 생성
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 🚀 [수정] 모든 바구니를 확실히 비우고 시작합니다.
    setItems([]); 
    setDisplayItems([]); 
    setProductDetail(null);
    setIsItemLoading(true);

    const targetId = Number(catId);
    const params = buildMercariParams(targetId, filters);
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
      // 🚀 [수정 핵심] '내 요청'이 여전히 '최신 요청'일 때만 로딩을 끕니다.
      if (abortControllerRef.current === controller) {
        setIsItemLoading(false);
        console.log("🏁 최신 수집 작업 완료!");
      }
    }
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

  // 🚀 [로직 6] 카테고리 로드 및 초기 데이터 세팅
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/mercari/categories${currentCatId ? `?parentId=${currentCatId}` : ''}`);
        const result = await res.json();

        if (result.success) {
          setCategories(result.data);
          setIsLeaf(result.isLeaf || false);

          if (result.data && result.data.length > 0) {
            const fetchedLevel = result.data[0].genreLevel;
            setLevelOptions(prev => ({ ...prev, [fetchedLevel]: result.data }));
          } else if (!currentCatId || currentCatId === '0') {
            setLevelOptions({});
          }
          
          if (result.parents) {
            const serverPath = result.parents.map((p: any) => ({
              id: p.parent.genreId, name: p.parent.genreName
            }));
            setPath(serverPath);
          }
        }
      } catch (err) { /* 에러 처리 */ }
      finally { setIsLoading(false); }
    };
    loadData();
  }, [currentCatId]);

  // 🚀 [로직 7] 네비게이션 제어
  const handleMove = (id: number, name: string, level?: number) => {
    loadItems(id);
    if (!id) {
      setPath([]);
      router.push('/main_shop/mercari');
      return;
    }

    setPath(prev => {
      if (level) return [...prev.slice(0, level - 1), { id, name }];
      const existsIndex = prev.findIndex(p => p.id === id);
      if (existsIndex !== -1) return prev.slice(0, existsIndex + 1);
      return [...prev, { id, name }];
    });
    router.push(`/main_shop/mercari?cat=${id}`);
  };

  const handleSidebarNavigate = (id: number, name: string, levelIndex: number) => {
    setPath(prev => {
      const newPath = prev.slice(0, levelIndex);
      return [...newPath, { id, name }];
    });
    router.push(`/main_shop/mercari?cat=${id}`);
  };

  // 자동 수집 매크로
  const startAutoCrawl = async () => {
    if (isAutoRunning) return;
    setIsAutoRunning(true);
    isAutoRunningRef.current = true; 
    addLog("🚀 자동 수집 매크로를 시작합니다...");

    while (isAutoRunningRef.current) {
      try {
        const targetRes = await fetch('/api/mercari/auto-crawl');
        if (!isAutoRunningRef.current) break;
        const { nextId, nextName } = await targetRes.json();

        if (!nextId) {
          addLog("✅ 모든 카테고리 수집이 완료되었습니다!");
          break;
        }

        addLog(`🔎 [탐색 중] ${nextName} (${nextId})`);
        const crawlRes = await fetch(`/api/mercari/categories?parentId=${nextId}`);
        const crawlResult = await crawlRes.json();

        if (!isAutoRunningRef.current) break;

        if (crawlResult.success) {
          addLog(`📦 ${nextName} 완료! (${crawlResult.data?.length || 0}개)`);
        }
        if (!isAutoRunningRef.current) break;
      } catch (err) {
        addLog(`❌ 오류 발생: ${err}`);
        break;
      }
    }
    setIsAutoRunning(false);
    isAutoRunningRef.current = false;
    addLog("🛑 자동 수집이 중단되었습니다.");
  };

  const stopAutoCrawl = () => { isAutoRunningRef.current = false; setIsAutoRunning(false); };

  return (
    <GlobalShoppingView 
      platform="mercari"
      path={path}
      categories={categories}
      items={mappedDisplayItems}
      pageInfo={pageInfo}
      selectedProduct={productDetail}
      isLoading={isLoading}
      isItemLoading={isItemLoading}
      isDetailLoading={isDetailLoading}
      isLeaf={isLeaf}
      onNavigate={handleMove}
      onSearch={(filters: GlobalFilterState) => loadItems(Number(currentCatId), filters)}
      onCardClick={loadProductDetail}
      onCloseDetail={() => setProductDetail(null)}
      showCrawlHeader={SHOW_HEADER}
      isAutoRunning={isAutoRunning}
      onCrawlToggle={isAutoRunning ? stopAutoCrawl : startAutoCrawl}
      crawlLog={log[0]}
      onPageChange={(newPage) => { // 👈 빠져있던 페이지 변경 로직 추가!
      setPageInfo(prev => ({ ...prev, page: newPage }));
      loadItems(Number(currentCatId), { ...filters, page: newPage });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }}
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