"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useMemo } from 'react';
import { GlobalSidebar, GlobalFilterState } from "@/app/main_shop/components/GlobalSidebar";
import GlobalCategoryGrid from "@/app/main_shop/components/GlobalCategoryGrid";
import GlobalProductDetail, { GlobalProduct } from "@/app/main_shop/components/GlobalProductDetail";
import GlobalProductCard, { GlobalItem } from "@/app/main_shop/components/GlobalProductCard";
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

interface SidebarProps {
  currentPath: {id: number, name: string}[];
  levelOptions: {[key: number]: MercariCategory[]};
  onNavigate: (id: number, name: string, index: number) => void;
  onSearch: () => void;
}

let globalItemsCache: { [key: string]: any[] } = {};
let globalProductDetailCache: { [key: string]: GlobalProduct } = {};

// --- ✨ [외부 분리] 스타일 생성 함수 ---
const getStyles = (isMobile: boolean) => ({
  pageWrapper: {
    width: '100%', display: 'flex', justifyContent: 'center',
    backgroundColor: '#f8f9fa', minHeight: '100vh', fontFamily: 'sans-serif'
  },
  container: {
    width: '100%', maxWidth: '2000px',
    padding: isMobile ? '8px 12px 16px 12px' : '8px 24px 24px 24px',
    display: 'flex', flexDirection: 'column' as const,
    gap: isMobile ? '8px' : '12px' 
  },
  header: {
    display: 'flex',
    flexDirection: isMobile ? 'column' as const : 'row' as const,
    justifyContent: isMobile ? 'center' : 'space-between',
    alignItems: isMobile ? 'flex-start' : 'center',
    gap: isMobile ? '12px' : '0',
    marginBottom: '8px', 
    padding: '16px 20px',
    backgroundColor: 'white', borderRadius: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6'
  },
  mainLayout: {
    display: 'flex',
    flexDirection: isMobile ? 'column' as const : 'row' as const,
    gap: isMobile ? '16px' : '20px', 
    alignItems: 'flex-start'
  },
  sidebarWrapper: {
    width: isMobile ? '100%' : '430px',
    flexShrink: 0,
    position: isMobile ? 'static' as const : 'sticky' as const,
    top: isMobile ? 'auto' : '120px', 
    height: isMobile ? 'auto' : 'fit-content',
    maxHeight: isMobile ? 'none' : 'calc(100vh - 120px)', 
    overflowY: isMobile ? 'visible' as const : 'auto' as const, 
    alignSelf: 'start',
    zIndex: 10
  },
  contentArea: {
    flex: 1, minWidth: 0, width: '100%'
  },
  breadcrumb: {
    display: 'flex', alignItems: 'center', gap: '4px',
    marginBottom: isMobile ? '16px' : '24px',
    fontSize: '13px', color: '#9ca3af',
    overflowX: 'auto' as const, whiteSpace: 'nowrap' as const,
    paddingBottom: '4px'
  },
  categoryCard: {
    backgroundColor: 'white', border: '1px solid #e5e7eb',
    borderRadius: '24px', padding: isMobile ? '20px' : '32px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  },
  crawlButton: (isRunning: boolean) => ({
    paddingLeft: '32px', paddingRight: '32px', paddingTop: '10px', paddingBottom: '10px',
    borderRadius: '16px', fontWeight: 'bold' as const, fontSize: '14px',
    color: 'white', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
    backgroundColor: isRunning ? '#9ca3af' : '#ff007f',
    boxShadow: isRunning ? 'none' : '0 10px 15px -3px rgba(255, 0, 127, 0.2)',
    width: isMobile ? '100%' : 'auto'
  })
});

// --- [보조 컴포넌트 1] 로딩 스켈레톤 ---
const ProductSkeleton = () => (
  <div style={{
    backgroundColor: 'white', border: '1px solid #f3f4f6', borderRadius: '16px',
    overflow: 'hidden', animation: 'pulse 1.5s infinite ease-in-out'
  }}>
    <div style={{ aspectRatio: '1/1', backgroundColor: '#f3f4f6' }} />
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ height: '12px', backgroundColor: '#f3f4f6', borderRadius: '999px', width: '75%' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ height: '20px', backgroundColor: '#f3f4f6', borderRadius: '999px', width: '33%' }} />
        <div style={{ height: '32px', backgroundColor: '#f9fafb', borderRadius: '8px', width: '25%' }} />
      </div>
    </div>
  </div>
);

// --- [보조 컴포넌트 2] 미쿠 로딩 오버레이 ---
const MikuLoadingOverlay = ({ message }: { message: string }) => (
  <div style={{
    position: 'fixed', inset: 0, backgroundColor: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center'
  }}>
    <style>
      {`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 10px rgba(255, 0, 127, 0.2); } 50% { box-shadow: 0 0 25px rgba(255, 0, 127, 0.6); } }
        @keyframes shimmerText { 0% { background-position: -100% 0; } 100% { background-position: 100% 0; } }
      `}
    </style>
    <div style={{ position: 'relative' }}>
      <div style={{
        height: '96px', width: '96px', border: '4px solid #fce7f3', borderTopColor: '#ff007f', borderRadius: '50%', 
        animation: 'spin 1s linear infinite, pulseGlow 2s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#ff007f', fontWeight: 900, fontSize: '20px', textShadow: '0 0 8px rgba(255, 0, 127, 0.3)'
      }}>M</div>
    </div>
    <div style={{ marginTop: '32px', textAlign: 'center' }}>
      <p style={{ 
        fontWeight: 'bold', fontSize: '18px', background: 'linear-gradient(90deg, #1f2937 0%, #ff007f 50%, #1f2937 100%)',
        backgroundSize: '200% auto', color: 'transparent', WebkitBackgroundClip: 'text', animation: 'shimmerText 2.5s linear infinite'
      }}>{message}</p>
      <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '8px' }}>잠시후 로딩됩니다...</p>
    </div>
  </div>
);

export default function MercariCategoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCatId = searchParams.get('cat') || '';

  const [categories, setCategories] = useState<MercariCategory[]>([]);
  const [isLeaf, setIsLeaf] = useState(false); 
  const [isLoading, setIsLoading] = useState(false);
  const [path, setPath] = useState<{id: number, name: string}[]>([]);
  const [debugRaw, setDebugRaw] = useState<any>(null);
  const [levelOptions, setLevelOptions] = useState<{[key: number]: MercariCategory[]}>({});
  
  const isAutoRunningRef = useRef(false); 
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const [items, setItems] = useState<MercariItem[]>([]);
  const [displayItems, setDisplayItems] = useState<MercariItem[]>([]);
  const [isItemLoading, setIsItemLoading] = useState(false);

  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [productDetail, setProductDetail] = useState<GlobalProduct | null>(null);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { showAlert, showConfirm } = useMikuAlert(); 
  const abortControllerRef = useRef<AbortController | null>(null);

  // 🚀 모바일 대응을 위한 상태 추가
  const [isMobile, setIsMobile] = useState(false);

  const styles = useMemo(() => getStyles(isMobile), [isMobile]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize(); // 초기화
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

          if (!crawlResult.fromCache) {
            const requiredInterval = 5000; 
            const now = Date.now();
            const elapsedTime = now - lastCallTimestamp;

            if (elapsedTime < requiredInterval) {
              let waitTime = requiredInterval - elapsedTime;
              addLog(`⏳ IP 차단 방지 대기 중...`);
              while (waitTime > 0) {
                if (!isAutoRunningRef.current) break; 
                const step = Math.min(waitTime, 500);
                await new Promise(res => setTimeout(res, step));
                waitTime -= step;
              }
            }
          } else {
            addLog("⚡ 캐시 데이터: 대기 없이 다음 단계로 이동");
          }
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

  const stopAutoCrawl = () => {
    isAutoRunningRef.current = false; 
    setIsAutoRunning(false);
  };

  useEffect(() => {
    if (items && items.length > 0) {
      setDisplayItems([]); 
      let index = 0;
      
      const interval = setInterval(() => {
        if (index < items.length) {
          const nextItem = items[index];
          if (nextItem) { 
            setDisplayItems(prev => [...prev, nextItem]);
          }
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

  const addLog = (msg: string) => setLog(prev => [msg, ...prev].slice(0, 10));

  const loadItems = async (catId: number, filters?: GlobalFilterState) => {
      const targetId = Number(catId);
      const params = buildMercariParams(targetId, filters);
      const queryString = params.toString();
      const readableUrl = decodeURIComponent(queryString);

      if (globalItemsCache[queryString]) {
        console.log(`⚡ [Cache Hit] 캐시 데이터를 불러옵니다.`);
        setItems([...globalItemsCache[queryString]]);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        addLog("🛑 이전 로딩을 중단하고 새로운 검색을 시작합니다.");
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (!isCallAllowed()) return;

      let accumulatedData: MercariItem[] = [];

      addLog(`📡 [API Request] /api/mercari/search?${readableUrl}`);
      setProductDetail(null);
      setDisplayItems([]); 
      setIsItemLoading(true);
      
      try {
      const res = await fetch(`/api/mercari/search?${queryString}`, { signal: controller.signal });
      if (!res.body) throw new Error("ReadableStream not supported");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      MoveScrollTop();

      while (true) {
        if (controller.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const jsonStrings = chunkStr.trim().split('\n');
        
        for (const jsonStr of jsonStrings) {
          if (!jsonStr || controller.signal.aborted) continue;
          try {
            const result = JSON.parse(jsonStr);
            if (result.success && result.data.length > 0) {
              accumulatedData = [...accumulatedData, ...result.data];
              setDisplayItems(prev => [...prev, ...result.data]);
              setIsItemLoading(false);
            }
          } catch (e) { /* 방어 */ }
        }
      }

      if (!controller.signal.aborted && accumulatedData.length > 0) {
        globalItemsCache[queryString] = accumulatedData;
        console.log(`💾 [Cache Saved] ${queryString} 키로 ${accumulatedData.length}개의 아이템 저장 완료`);
      }

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log("📥 요청이 안전하게 취소되었습니다.");
      } else {
        console.error("상품 로딩 실패:", err);
        showAlert("상품 로딩 중 오류가 발생했습니다.");
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsItemLoading(false);
      }
    }
  };

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

  const loadProductDetail = async (itemId: string) => {
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

  const MoveScrollTop = () => {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleSidebarNavigate = (id: number, name: string, levelIndex: number) => {
    setPath(prev => {
      const newPath = prev.slice(0, levelIndex);
      return [...newPath, { id, name }];
    });
    router.push(`/main_shop/mercari?cat=${id}`);
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/mercari/categories${currentCatId ? `?parentId=${currentCatId}` : ''}`);
        const result = await res.json();
        setDebugRaw(result);

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

  const handleBreadcrumbClick = (id: number, index: number, newName?: string) => {
    if (id === 0) {
      setPath([]); setItems([]); setDisplayItems([]);
      router.push('/main_shop/mercari');
      return;
    }

    loadItems(id);
    setPath(prev => {
      const baseNav = prev.slice(0, index); 
      return newName ? [...baseNav, { id: Number(id), name: newName }] : prev.slice(0, index + 1);
    });
    router.push(`/main_shop/mercari?cat=${id}`);    
  };

  return (
    <div style={styles.pageWrapper} translate="yes">
      <div style={styles.container}>
        
        <div id="loading-portal">
          {isItemLoading && <MikuLoadingOverlay message="메루카리 상품을 수집하고 있습니다" />}
          {isDetailLoading && <MikuLoadingOverlay message="상품 상세 정보를 분석 중입니다" />}
        </div>

        <div style={styles.mainLayout}>
          <aside style={styles.sidebarWrapper}>
            <GlobalSidebar 
              platform="mercari"
              currentPath={path} 
              levelOptions={levelOptions} 
              onNavigate={handleSidebarNavigate} 
              onSearch={(filters: GlobalFilterState) => {
                loadItems(Number(currentCatId), filters); 
              }}
            />
          </aside>

          <main style={styles.contentArea}>
            {/* 1. 경로 안내 (Breadcrumb) */}
            <nav style={styles.breadcrumb}>
              <span style={{ cursor: 'pointer' }} onClick={() => handleBreadcrumbClick(0, -1)}>HOME</span>
              {path.map((p, index) => (
                <div key={`nav-${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#d1d5db' }}>/</span>
                  <span style={{ cursor: 'pointer' }} onClick={() => handleBreadcrumbClick(p.id, index)}>{p.name}</span>
                </div>
              ))}
            </nav>

            {/* 2. 상품 상세 정보 (팝업처럼 상단에 표시) */}
            <div style={{ display: productDetail ? 'block' : 'none', marginBottom: '40px' }}>
              {productDetail && (
                <GlobalProductDetail product={productDetail} onClose={() => setProductDetail(null)} />
              )}
            </div>

            {/* 3. 카테고리 선택 영역 (항상 표시되도록 변경) */}
            <div className="notranslate" translate="no" style={{ ...styles.categoryCard, marginBottom: '40px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                카테고리를 선택하세요
              </h3>
              <GlobalCategoryGrid 
                categories={categories}
                isLeaf={isLeaf}
                isLoading={isLoading}
                platform = 'mercari'
                onMove={handleMove}
              />
            </div>

            {/* 4. 상품 목록 영역 (로딩 중이거나 아이템이 있을 때만 아래에 나타남) */}
            {(isItemLoading || displayItems.length > 0) && (
              <div style={{ position: 'relative', minHeight: '400px', animation: 'fadeIn 0.5s ease-in-out' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', borderBottom: '1px solid #f3f4f6', paddingBottom: '16px' }}>
                  <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 900, color: '#1f2937', margin: 0 }}>
                    추천 <span style={{ color: '#ff007f' }}>아이템</span>
                  </h2>
                  {!isItemLoading && (
                    <button onClick={() => {
                      if (abortControllerRef.current) {
                        abortControllerRef.current.abort();
                        abortControllerRef.current = null;
                      }
                      setItems([]); 
                      setDisplayItems([]);
                    }} style={{ fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>
                      결과 닫기
                    </button>
                  )}
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(250px, 1fr))', 
                  gap: isMobile ? '12px' : '24px' 
                }}>
                  {isItemLoading 
                    ? [...Array(8)].map((_, i) => <ProductSkeleton key={`skel-${i}`} />) 
                    : mappedDisplayItems.map(item => item && (
                        <div key={`prod-${item.id}`}>
                          <GlobalProductCard item={item} onClick={loadProductDetail} />
                        </div>
                      ))
                  }
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}