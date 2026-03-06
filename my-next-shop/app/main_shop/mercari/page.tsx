"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import MercariCategoryGrid, { MercariSidebar,FilterState } from "./MercariCategoryGrid";
import MercariProductDetail, { DetailedProduct } from "./mercariProductDetail";
import MercariProductCard from "./mercariProductCard";
import { checkMercariCooldown } from "./mercariApi";
import { lastCallTimestamp } from "./mercariApi";

// 💡 [개발자 설정] 상단 헤더 활성화 여부
const SHOW_HEADER = false; // false로 설정하면 헤더가 사라집니다.

// 인터페이스 정의
interface MercariCategory {
  // DB의 genreId (Int)와 대응
  genreId: number; 
  
  // DB의 genreName (String)
  genreName: string; 
  
  // 모델에 추가된 genreLevel (Int) 반영
  genreLevel: number; 
  
  // DB의 parentId (Int). 루트인 경우 0으로 처리
  parentId: number; 
  
  // DB의 isLeaf (Boolean)
  isLeaf: boolean; 
  
  // JSON 응답 시 날짜는 보통 문자열로 오지만, Date 객체로 변환하여 쓸 수 있음
  updatedAt: string | Date; 
}

// 인터페이스 정의 추가
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
  // 💡 검색 실행을 위한 함수 추가
  onSearch: () => void;
}

// 💡 여기에 선언하면 다른 화면에 갔다 와도 데이터가 유지됩니다!
let globalItemsCache: { [key: number]: any[] } = {};
let globalProductDetailCache: { [key: string]: DetailedProduct } = {};

// --- [보조 컴포넌트 1] 로딩 스켈레톤 (인라인 스타일) ---
const ProductSkeleton = () => (
  <div style={{
    backgroundColor: 'white', border: '1px solid #f3f4f6', borderRadius: '16px',
    overflow: 'hidden', animation: 'pulse 1.5s infinite ease-in-out'
  }}>
    <div style={{ aspectRatio: '1/1', backgroundColor: '#f3f4f6' }} />
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ h: '12px', backgroundColor: '#f3f4f6', borderRadius: '999px', width: '75%' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ height: '20px', backgroundColor: '#f3f4f6', borderRadius: '999px', width: '33%' }} />
        <div style={{ height: '32px', backgroundColor: '#f9fafb', borderRadius: '8px', width: '25%' }} />
      </div>
    </div>
  </div>
);

// --- [보조 컴포넌트 2] 미쿠 로딩 오버레이 (인라인 스타일) ---
const MikuLoadingOverlay = ({ message }: { message: string }) => (
  <div style={{
    position: 'fixed', inset: 0, backgroundColor: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center'
  }}>
    <div style={{ position: 'relative' }}>
      <div style={{
        height: '96px', width: '96px', border: '4px solid #fce7f3',
        borderTopColor: '#ff007f', borderRadius: '50%', animation: 'spin 1s linear infinite'
      }} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#ff007f', fontWeight: 900, fontSize: '20px'
      }}>M</div>
    </div>
    <div style={{ marginTop: '32px', textAlign: 'center' }}>
      <p style={{ color: '#1f2937', fontWeight: 'bold', fontSize: '18px' }}>{message}</p>
      <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '8px' }}>일본 서버 보안 연결 중...</p>
    </div>
  </div>
);
export default function MercariCategoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCatId = searchParams.get('cat') || '';

  // 💡 상태 선언 확인
  const [categories, setCategories] = useState<MercariCategory[]>([]);
  const [isLeaf, setIsLeaf] = useState(false); 
  const [isLoading, setIsLoading] = useState(false);
  const [path, setPath] = useState<{id: number, name: string}[]>([]);
  const [debugRaw, setDebugRaw] = useState<any>(null);
  const [levelOptions, setLevelOptions] = useState<{[key: number]: MercariCategory[]}>({});
  
  const isAutoRunningRef = useRef(false); // 💡 window 대신 ref 사용
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  // 컴포넌트 내부 상태 추가
  const [items, setItems] = useState<MercariItem[]>([]);
  const [displayItems, setDisplayItems] = useState<MercariItem[]>([]);
  const [isItemLoading, setIsItemLoading] = useState(false);

  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [productDetail, setProductDetail] = useState<DetailedProduct | null>(null);
  
  
  // 🚀 쿨타임 체크와 경고 처리를 하나로 합친 함수
  const isCallAllowed = () => {
    const status = checkMercariCooldown();

    if (!status.canCall) {
      const msg = `⚠️ 과부하 방지를 위해 ${status.remainingTime}초 후에 다시 시도해 주세요!`;
      addLog(msg);
      alert(msg);
      return false; // 실행 불가 상태
    }

    return true; // 실행 가능 상태
  };

   // 🚀 자동 수집 핵심 로직
  const startAutoCrawl = async () => {
    if (isAutoRunning) return;

    setIsAutoRunning(true);
    isAutoRunningRef.current = true; // 🚀 수집 시작 상태로 설정

    addLog("🚀 자동 수집 매크로를 시작합니다...");

    // 💡 루프 조건으로 Ref를 사용합니다.
    while (isAutoRunningRef.current) {
      try {
        // 2. 수집할 대상 ID 가져오기
        const targetRes = await fetch('/api/mercari/auto-crawl');

        // 🛑 중단 체크 1: fetch 직후
        if (!isAutoRunningRef.current) break;

        const { nextId, nextName } = await targetRes.json();

        if (!nextId) {
          addLog("✅ 모든 카테고리 수집이 완료되었습니다!");
          break;
        }

        addLog(`🔎 [탐색 중] ${nextName} (${nextId})`);

        // 3. 기존에 만드신 GET API 호출 (실제 크롤링 및 DB 저장 수행)
        const crawlRes = await fetch(`/api/mercari/categories?parentId=${nextId}`);
        const crawlResult = await crawlRes.json();

        // 🛑 중단 체크 2: fetch 직후
        if (!isAutoRunningRef.current) break;

        if (crawlResult.success) {
          addLog(`📦 ${nextName} 완료! (${crawlResult.data?.length || 0}개)`);

          // 🚀 핵심: 캐시 데이터가 아닐 때만 대기 시간을 가집니다.
          if (!crawlResult.fromCache) {

            const requiredInterval = 5000; // 5초 대기 기준
            const now = Date.now();
            const elapsedTime = now - lastCallTimestamp;

            if (elapsedTime < requiredInterval) {
              let waitTime = requiredInterval - elapsedTime;
              addLog(`⏳ IP 차단 방지 대기 중...`);

              // 🛑 중요: 5초를 통째로 기다리지 않고, 500ms씩 나눠서 기다리며 중단 여부 확인
              while (waitTime > 0) {
                if (!isAutoRunningRef.current) break; // 대기 중 버튼 누르면 즉시 탈출
                const step = Math.min(waitTime, 500);
                await new Promise(res => setTimeout(res, step));
                waitTime -= step;
              }
            }

          } else {
            // 캐시 데이터면 대기 없이 즉시 다음 루프 실행
            addLog("⚡ 캐시 데이터: 대기 없이 다음 단계로 이동");
          }
        }

        // 🛑 중단 체크 3: 루프 마지막
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
    // 💡 false로 바꾸는 순간 위 while문의 조건이 깨지며 멈춥니다.
    isAutoRunningRef.current = false; 
    setIsAutoRunning(false);
  };

  /// 🚀 page.tsx 내의 순차 로드 Effect를 이렇게 수정하세요.
  useEffect(() => {
    if (items && items.length > 0) {
      setDisplayItems([]); // 이전 목록 비우기
      let index = 0;
      
      const interval = setInterval(() => {
        // 💡 items[index]가 존재할 때만 추가하도록 방어 로직 추가
        if (index < items.length) {
          const nextItem = items[index];
          if (nextItem) { // <--- 여기서 한 번 더 체크!
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

  

  // --- 스타일 객체 정의 수정 ---
const styles = {
    pageWrapper: {
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
      fontFamily: 'sans-serif'
    },
    container: {
      width: '100%',
      maxWidth: '1400px',
      // 🚀 상단 패딩을 24px -> 8px로 대폭 축소
      padding: '8px 24px 24px 24px', 
      display: 'flex',
      flexDirection: 'column' as const,
      // 🚀 헤더와 메인 레이아웃 사이의 간격을 32px -> 12px로 축소
      gap: '12px' 
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      // 🚀 헤더 하단 여백을 32px -> 8px로 축소
      marginBottom: '8px', 
      padding: '16px 20px', // 패딩도 살짝 줄임
      backgroundColor: 'white',
      borderRadius: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      border: '1px solid #f3f4f6'
    },
    mainLayout: {
      display: 'flex',
      // 🚀 사이드바와 콘텐츠 사이 간격 32px -> 20px로 조정
      gap: '20px', 
      alignItems: 'flex-start'
    },
    sidebarWrapper: {
      width: '430px',
      flexShrink: 0,
      position: 'sticky' as const,
      // 🚀 스티키 위치를 상단에 더 밀착 (24px -> 10px)
      top: '10px', 
      selfAlign: 'start'
    },
    contentArea: {
      flex: 1,
      minWidth: 0
    },
    breadcrumb: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      marginBottom: '24px',
      fontSize: '13px',
      color: '#9ca3af',
      overflowX: 'auto' as const,
      whiteSpace: 'nowrap' as const
    },
    categoryCard: {
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '24px',
      padding: '32px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    },
    footer: {
      marginTop: '80px',
      backgroundColor: '#1e1e1e',
      borderRadius: '24px',
      padding: '32px',
      border: '1px solid #374151',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
    },
    crawlButton: (isRunning: boolean) => ({
      px: '32px',
      py: '10px',
      borderRadius: '16px',
      fontWeight: 'bold',
      fontSize: '14px',
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: isRunning ? '#9ca3af' : '#ff007f',
      boxShadow: isRunning ? 'none' : '0 10px 15px -3px rgba(255, 0, 127, 0.2)'
    })
  };

  const addLog = (msg: string) => {
    setLog(prev => [msg, ...prev].slice(0, 10)); // 최근 10개 로그만 유지
  };

  const loadItems = async (catId: number, filters?: FilterState) => {

    // 💡 확실하게 숫자로 변환하여 체크합니다.
    const targetId = Number(catId);

    if (!filters && globalItemsCache[targetId]) {
      console.log(`⚡ [Cache Hit] ${targetId} 아이템을 캐시에서 불러옵니다.`);
      setItems([...globalItemsCache[targetId]]);
      return; 
    }

    // 🚀 한 줄로 체크 끝! (안 지났으면 여기서 바로 중단됨)
    if (!isCallAllowed()) return;

    setProductDetail(null); 
    setIsItemLoading(true);

    try {

      // 🚀 1. 기본 파라미터 설정
      const params = new URLSearchParams({});

      if(targetId != 0) params.append("category_id", targetId.toString());

      // 🚀 2. 필터 정보가 있다면 파라미터에 추가
      if (filters) {
        //정렬
        const getSort = (val: string) => {
          switch (val) {
            case '가격 낮은 순': return 'price&order=asc';
            case '가격 높은 순': return  'price&order=desc';
            case '최신순':       return 'created_time&order=desc';
            default: return ''; // 기본순
          }
        };
        if (filters.sortOrder !== '기본순') params.append("sort", getSort(filters.sortOrder));


        //검색어
        if (filters.keyword) params.append("keyword", filters.keyword);

        //제외할 단어
        if (filters.excludeKeyword) params.append("exclude_keyword", filters.excludeKeyword);
        
        //출품자
        const getSellerId = (val: string) => {
          return val === '개인' ? 'mercari' : val === '메루카리샵' ? 'beyond' : '';
        };

        if (filters.sellerType !== '모두') params.append("item_types", getSellerId(filters.sellerType));


        //가격대 
        if (filters.minPrice) params.append("price_min", filters.minPrice);
        if (filters.maxPrice) params.append("price_max", filters.maxPrice);

        //물품의 상태
        const getCondition = (val: string) => {
           switch (val) {
              case '신품, 미사용': return '1';
              case '미사용에 가까움': return '2';
              case '눈에 띄는 흠집 없음': return '3';
              case '다소 흠집 있음': return '4';
              case '전반적으로 나쁨': return '6';
              default: return ''; // 기본순
          }
        };
        if (filters.condition !== '모두') params.append("item_condition_id", getCondition(filters.condition));


        //배송료 부담
        const getShippingPayer = (val: string) => {
           switch (val) {
              case '배송비 포함': return '2';
              case '배송비 제외': return '1';
              default: return ''; // 기본순
          }
        };
        if (filters.shippingPayer !== '모두') params.append("shipping_payer_id", getShippingPayer(filters.shippingPayer));

        //할인 옵션
        const getHasDiscount = (val: string) => {
          switch (val) {
            case '할인 대상 상품': return '9df96424-a8c2-414a-bbab-74bd11bd20aa';
            default: return ''; // 기본순
          }
        };
        if (filters.hasDiscount !== '모두') params.append("hasDiscount", getHasDiscount(filters.hasDiscount));


        //출품 형태
        const getListingType = (val: string) => {
          switch (val) {
            case '경매': return '3b6eac8c-7be5-4c9c-b537-7c05cd3c4905';
            default: return ''; // 기본순
          }
        };
        if (filters.listingType !== '모두') params.append("listingType", getListingType(filters.listingType));

        //색상 
        const getColorId = (val: string) => {
          switch (val) {
            case '화이트계열': return '2';
            case '블랙계열': return  '1';
            case '그레이계열': return  '3';
            case '브라운계열': return  '4';
            case '베이지계열': return  '9';
            case '그린계열': return  '10';
            case '블루계열': return  '8';
            case '퍼플계열': return  '7';
            case '옐로우계열': return  '11';
            case '핑크계열': return  '6';
            case '레드계열': return  '5';
            case '오렌지계열': return  '12';
            default: return ''; // 기본순
          }
        };

        if (filters.colors && filters.colors.length > 0 && filters.colors[0] !== '모두') {
          params.append("color_id", getColorId(filters.colors[0]));
        }

        //배송 옵션
        const getShippingOption = (val: string) => {
          switch (val) {
            case '익명 배송': return 'anonymous';
            case '수취 옵션': return  'japan_post';
            case '옵션 없음': return  'no_option';
            default: return ''; // 기본순
          }
        };
        if (filters.shippingOption !== '모두') params.append("shipping_method", getShippingOption(filters.shippingOption));

        //판매 상황
        const getStatus = (val: string) => {
          switch (val) {
            case '판매중': return 'on_sale';
            case '품절': return  'sold_out';
            default: return ''; // 기본순
          }
        };
        if (filters.status !== '모두') params.append("status", getStatus(filters.status));

        
      }
      
      const queryString = params.toString();
      const logMsg = `📡 [API Request] /${queryString}`;
      //console.log(logMsg); // 브라우저 콘솔 기록
      //addLog(logMsg);      // 화면 하단 시스템 모니터에 출력

      const readableUrl = decodeURIComponent(params.toString());
      addLog(`📡 [API Request] /api/mercari/search?${readableUrl}`); //

      //return;

      // 🚀 throttledMercariFetch 사용
      const res = await fetch(`/api/mercari/search?${params.toString()}`);
      const result = await res.json();
      
      if (result.success) {

        const fetchedData = result.data || [];
        setItems(fetchedData);
        MoveScrollTop();

        // 필터 없는 기본 조회일 때만 전역 캐시에 저장
        if (!filters) {
          globalItemsCache[targetId] = fetchedData;
        }

      }
    } catch (err) {
      console.error("상품 로딩 실패", err);
    } finally {
      setIsItemLoading(false);
    }
  };

  // 🚀 2. loadProductDetail로 함수명 및 경로 업데이트
  const loadProductDetail = async (itemId: string) => {

    if (globalProductDetailCache[itemId]) {
      console.log(`⚡ [Cache Hit] ${itemId} 아이템을 캐시에서 불러옵니다.`);
      setProductDetail(globalProductDetailCache[itemId]); // 객체 그대로 전달
      MoveScrollTop();
      return; 
    }
    
    // 🚀 한 줄로 체크 끝! (안 지났으면 여기서 바로 중단됨)
    if (!isCallAllowed()) return;

    setIsDetailLoading(true);
    setProductDetail(null); 
    addLog(`🔎 [상세조회] productDetail 요청 (ID: ${itemId})`);

    try {

      // 🚀 throttledMercariFetch 사용
      const res = await fetch(`/api/mercari/productDetail?itemId=${itemId}`);
      const result = await res.json();

      if (result.success) {
        setProductDetail(result.data); // 🚀 정밀해진 데이터를 상태에 저장
        addLog(`✨ 상품 정보 로드 성공: ${itemId}`);
        
        globalProductDetailCache[itemId] = result.data;

        MoveScrollTop();
        
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      console.error("Detail Load Fail:", err.message);
      addLog(`❌ 로드 실패: ${err.message}`);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const MoveScrollTop = () => {
    // 💡 특정 요소가 아니라 '페이지 전체의 맨 위'로 부드럽게 스크롤합니다.
    setTimeout(() => {
      window.scrollTo({
        top: 0, 
        behavior: 'smooth' 
      });
    }, 100);
  };

  // 🚀 사이드바 전용 네비게이션 함수 (동작 보장형)
  const handleSidebarNavigate = (id: number, name: string, levelIndex: number) => {
    setPath(prev => {
      // 💡 선택한 단계까지만 남기고 새 경로 추가
      const newPath = prev.slice(0, levelIndex);
      return [...newPath, { id, name }];
    });
    router.push(`/main_shop/mercari?cat=${id}`);
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      try {

        // 🚀 throttledMercariFetch 사용
        const res = await fetch(`/api/mercari/categories${currentCatId ? `?parentId=${currentCatId}` : ''}`);
        const result = await res.json();

        setDebugRaw(result);

        if (result.success) {
          setCategories(result.data);
          const leafStatus = result.isLeaf || false;
          setIsLeaf(leafStatus);

          // 🚀 버그 수정 포인트: 
          if (result.data && result.data.length > 0) {
            // 데이터가 있을 때만 해당 레벨의 옵션으로 저장합니다.
            const fetchedLevel = result.data[0].genreLevel;
            setLevelOptions(prev => ({
              ...prev,
              [fetchedLevel]: result.data
            }));
          } else if (!currentCatId || currentCatId === '0') {
            // 초기 진입(ROOT)인데 데이터가 없는 특수 상황 대응
            setLevelOptions({});
          }
          
          if (result.parents) {
            const serverPath = result.parents.map((p: any) => ({
              id: p.parent.genreId,
              name: p.parent.genreName
            }));
            setPath(serverPath);
          }
          
        }
      } catch (err) { /* 에러 처리 */ }
      finally { setIsLoading(false); }

    };
    loadData();
  }, [currentCatId]);

  // 💡 level 인자를 추가하여 어떤 단계를 수정 중인지 파악합니다.
  const handleMove = (id: number, name: string, level?: number) => {

    loadItems(id);

    if (!id) {
      setPath([]);
      router.push('/main_shop/mercari');
      return;
    }

    setPath(prev => {
      if (level) {
        // 🚀 핵심: 선택한 레벨 이전까지만 남기고, 새로운 값을 그 자리에 넣습니다.
        // 예: 5단계(반팔) 상태에서 5단계(긴팔) 선택 시 -> 4단계까지 자르고 긴팔 추가
        return [...prev.slice(0, level - 1), { id, name }];
      }

      // 그리드에서 클릭한 경우 (기존 로직 유지하되 중복 방지)
      const existsIndex = prev.findIndex(p => p.id === id);
      if (existsIndex !== -1) return prev.slice(0, existsIndex + 1);
      return [...prev, { id, name }];
    });

    router.push(`/main_shop/mercari?cat=${id}`);
  };

  // 브레드크럼의 특정 단계를 클릭했을 때 호출되는 함수
  const handleBreadcrumbClick = (id: number, index: number, newName?: string) => {
    if (id === 0) {
    setPath([]);
    setItems([]);
    setDisplayItems([]);
    router.push('/main_shop/mercari');
    return;
    }

    loadItems(id);

    setPath(prev => {
      // 💡 핵심: index 위치 전까지만 남깁니다 (slice)
      const baseNav = prev.slice(0, index); 
      
      // 🚀 새로운 이름(newName)이 있으면 그 자리에 새 항목을 넣고, 
      // 없으면 원래 브레드크럼 로직대로 그 위치까지만 유지합니다.
      const newPath = newName 
        ? [...baseNav, { id: Number(id), name: newName }] 
        : prev.slice(0, index + 1);
        
      return newPath;
    });

    router.push(`/main_shop/mercari?cat=${id}`);    
    
  };

  return (
    <div style={styles.pageWrapper} translate="no">
      <div style={styles.container}>
        
        {/* 🚀 로딩 오버레이 포탈 */}
        <div id="loading-portal">
          {isItemLoading && <MikuLoadingOverlay message="메루카리 상품을 수집하고 있습니다" />}
          {isDetailLoading && <MikuLoadingOverlay message="상품 상세 정보를 분석 중입니다" />}
        </div>

        {/* 🚀 [수정] 상단 헤더 바 - SHOW_HEADER 변수에 따라 렌더링 결정 */}
        {SHOW_HEADER && (
          <header style={styles.header}>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#1f2937', letterSpacing: '-0.05em', margin: 0 }}>
              Miku <span style={{ color: '#ff007f' }}>Mercari</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button 
                onClick={isAutoRunning ? stopAutoCrawl : startAutoCrawl}
                style={styles.crawlButton(isAutoRunning)}
              >
                {isAutoRunning ? "🤖 자동 수집 중" : "🚀 카테고리 수집 시작"}
              </button>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#9ca3af' }}>
                {log[0] || "Ready"}
              </div>
            </div>
          </header>
        )}

        {/* 🚀 메인 콘텐츠 영역 */}
        <div style={styles.mainLayout}>
          
          {/* 📍 좌측 사이드바 컨테이너 */}
          <aside style={styles.sidebarWrapper}>
            <MercariSidebar 
              currentPath={path} 
              levelOptions={levelOptions} 
              onNavigate={handleSidebarNavigate} 
              onSearch={(filters: FilterState) => {
                loadItems(Number(currentCatId), filters); 
              }}
            />
          </aside>

          {/* 📍 우측 콘텐츠 본문 */}
          <main style={styles.contentArea}>
            {/* 네비게이션 경로 */}
            <nav style={styles.breadcrumb}>
              <span style={{ cursor: 'pointer' }} onClick={() => handleBreadcrumbClick(0, -1)}>HOME</span>
              {path.map((p, index) => (
                <div key={`nav-${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#d1d5db' }}>/</span>
                  <span style={{ cursor: 'pointer' }} onClick={() => handleBreadcrumbClick(p.id, index)}>{p.name}</span>
                </div>
              ))}
            </nav>

            {/* 상품 상세 뷰 */}
            {productDetail && (
              <div style={{ marginBottom: '40px' }}>
                <MercariProductDetail product={productDetail} onClose={() => setProductDetail(null)} />
              </div>
            )}

            {/* 상품 목록 혹은 카테고리 그리드 */}
            <div style={{ position: 'relative', minHeight: '600px' }}>
              {(isItemLoading || displayItems.length > 0) ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', borderBottom: '1px solid #f3f4f6', paddingBottom: '20px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1f2937', margin: 0 }}>
                      추천 <span style={{ color: '#ff007f' }}>아이템</span>
                    </h2>
                    {!isItemLoading && (
                      <button onClick={() => {setItems([]); setDisplayItems([]);}} style={{ fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>목록 닫기</button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '24px' }}>
                    {isItemLoading ? (
                      [...Array(8)].map((_, i) => <ProductSkeleton key={`skel-${i}`} />)
                    ) : (
                      displayItems.map((item, idx) => (
                        item && (
                          <div key={`prod-${item.id}`}>
                            <MercariProductCard item={item} onClick={loadProductDetail} />
                          </div>
                        )
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div style={styles.categoryCard}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>카테고리를 선택하세요</h3>
                  <MercariCategoryGrid 
                    categories={categories}
                    isLeaf={isLeaf}
                    isLoading={isLoading}
                    onMove={handleMove}
                  />
                </div>
              )}
            </div>
          </main>
        </div>

        {/* 🚀 하단 시스템 터미널 */}
        <footer style={styles.footer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '1px solid #374151', paddingBottom: '16px' }}>
            <div style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%' }}></div>
            <h3 style={{ color: '#f472b6', fontFamily: 'monospace', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>System Monitor</h3>
          </div>
          <pre style={{ color: 'rgba(16, 185, 129, 0.8)', fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.6, overflow: 'auto', maxHeight: '200px', margin: 0 }}>
            {debugRaw ? JSON.stringify(debugRaw, null, 2) : "// Awaiting system signal..."}
          </pre>
        </footer>
      </div>
    </div>
  );
}