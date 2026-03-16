'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { GlobalSidebar, GlobalFilterState } from "./GlobalSidebar";
import GlobalCategoryGrid from "./GlobalCategoryGrid";
import GlobalProductDetail, { GlobalProduct } from "./GlobalProductDetail";
import GlobalProductCard from "./GlobalProductCard";
import GlobalPagination from './GlobalPagination';

// --- [보조 컴포넌트] 로딩 오버레이 & 스켈레톤 ---
const MikuLoadingOverlay = ({ message }: { message: string }) => (
  <div style={{
    position: 'fixed', inset: 0, backgroundColor: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center'
  }}>
    {/* 🚨 멈춰있던 원인 해결: CSS 애니메이션 키프레임 부활! */}
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
      }}>MIKU</div>
    </div>
    
    <div style={{ marginTop: '32px', textAlign: 'center' }}>
      <p style={{ 
        fontWeight: 'bold', fontSize: '18px', background: 'linear-gradient(90deg, #1f2937 0%, #ff007f 50%, #1f2937 100%)',
        backgroundSize: '200% auto', color: 'transparent', WebkitBackgroundClip: 'text', animation: 'shimmerText 2.5s linear infinite',
        margin: 0
      }}>{message}</p>
      <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '8px' }}>잠시후 로딩됩니다...</p>
    </div>
  </div>
);

interface GlobalShoppingViewProps {
  platform: 'rakuten' | 'mercari' | 'amazon' | 'yahoo';
  // 데이터
  path: { id: number; name: string }[];
  categories: any[];
  items: any[];
  pageInfo: { page: number; pageCount: number };
  selectedProduct: GlobalProduct | null;
  // 상태
  isLoading: boolean;
  isItemLoading: boolean;
  isDetailLoading?: boolean;
  // 🚨 추가된 필수 속성
  isLeaf: boolean;
  // 이벤트 핸들러
  onNavigate: (id: number, name: string, level: number) => void;
  onSearch: (filters: GlobalFilterState) => void;
  onCardClick: (item: any) => void;
  onCloseDetail: () => void;
  onPageChange: (newPage: number) => void;
  // 크롤러 관련 (선택 사항)
  showCrawlHeader?: boolean;
  isAutoRunning?: boolean;
  onCrawlToggle?: () => void;
  crawlLog?: string;
  sortOptions?: { id: string, label: string }[]; // 선택적 속성으로 추가
}

export default function GlobalShoppingView(props: GlobalShoppingViewProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const styles = useMemo(() => getCommonStyles(isMobile, props.platform), [isMobile, props.platform]);

  return (
    <div style={styles.pageWrapper}>
      {/* 🚀 [수정 1] 전체 화면 로딩은 '아이템이 아예 없을 때'만 나오게 변경 */}
      {(props.isItemLoading && props.items.length === 0 || props.isDetailLoading) && (
        <MikuLoadingOverlay message={props.isItemLoading ? "상품을 불러오는 중입니다" : "상세 정보를 분석 중입니다"} />
      )}

      <div style={styles.container}>
        {/* 헤더 섹션 (수집 기능 등) */}
        {props.showCrawlHeader && (
          <header style={styles.header}>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#1f2937', margin: 0 }}>
              Miku <span style={{ color: '#ff007f' }}>{props.platform.toUpperCase()}</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button onClick={props.onCrawlToggle} style={styles.crawlBtn(props.isAutoRunning || false)}>
                {props.isAutoRunning ? "🤖 중지" : "🚀 수집 시작"}
              </button>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>{props.crawlLog || "Ready"}</div>
            </div>
          </header>
        )}

        <div style={styles.mainLayout}>
          {/* 사이드바 */}
          <aside style={styles.sidebarWrapper}>
            <GlobalSidebar 
              platform={props.platform} 
              currentPath={props.path} 
              onNavigate={props.onNavigate} 
              onSearch={props.onSearch} 
              sortOptions={props.sortOptions} // 받아온 옵션을 사이드바로 토스!
            />
          </aside>

          {/* 메인 콘텐츠 */}
          <main style={styles.contentArea}>
            <nav style={styles.breadcrumb}>
              <span onClick={() => props.onNavigate(0, "HOME", 0)} style={{ cursor: 'pointer' }}>HOME</span>
              {props.path.map((p, i) => (
                <span key={p.id} onClick={() => props.onNavigate(p.id, p.name, i)} style={{ cursor: 'pointer' }}> / {p.name}</span>
              ))}
            </nav>

            {/* 상품 상세 */}
            {props.selectedProduct && (
              <div style={{ marginBottom: '40px' }}>
                <GlobalProductDetail product={props.selectedProduct} onClose={props.onCloseDetail} />
              </div>
            )}

            {/* 카테고리 그리드 */}
            <div style={styles.card}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '20px' }}>카테고리</h3>
              <GlobalCategoryGrid 
                categories={props.categories} 
                isLoading={props.isLoading} 
                platform={props.platform} 
                onMove={props.onNavigate}
                isLeaf={props.isLeaf}
              />
            </div>

            {/* 상품 리스트 섹션 */}
            {props.items.length > 0 && (
              <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column' }}>
                
                {/* 🚀 1. 상단 페이지네이션 (선택 사항: 상품이 많을 때 위에서도 이동 가능하게) */}
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                  <GlobalPagination 
                    currentPage={props.pageInfo.page} 
                    pageCount={props.pageInfo.pageCount || 1} 
                    // 🚀 부모에게서 받은 함수를 여기서 연결합니다!
                    onPageChange={props.onPageChange} 
                  />
                </div>

                {/* 2. 상품 그리드 */}
                <div style={styles.itemGrid}>
                  {props.items.map((item, idx) => (
                    <GlobalProductCard key={idx} item={item} onClick={() => props.onCardClick(item)} />
                  ))}
                </div>

                {/* 🚀 3. 페이지네이션을 로딩 바 '위'로 올림 */}
                {/* 수집 중이라도 페이지 이동은 가능해야 하므로 로딩 바보다 먼저 보여줍니다. */}
                <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                  <GlobalPagination 
                    currentPage={props.pageInfo.page} 
                    pageCount={props.pageInfo.pageCount || 1} 
                    // 🚀 여기도 마찬가지로 연결!
                    onPageChange={props.onPageChange} 
                  />
                </div>

                {/* 4. 하단 로딩 바 (최하단에 배치) */}
                {props.isItemLoading && (
                  <div style={styles.bottomLoader}>
                    <div style={styles.spinnerIcon}>
                      <i className="fa fa-spinner fa-spin fa-2x"></i>
                    </div>
                    <p style={styles.loaderText} className="notranslate">
                      미쿠짱이 열심히 다음 상품을 가져오고 있어요... ( 
                      
                      {/* 🚀 숫자를 한 번 더 span으로 감싸고 클래스를 줍니다. */}
                      <span className="notranslate" style={{ fontWeight: 900, color: '#ff007f' }}>
                        {props.items.length}
                      </span> 
                      
                      개 수집됨 )
                    </p>
                  </div>
                )}
                
              </div>
            )}


          </main>
        </div>
      </div>
    </div>
  );
}

// --- 공용 스타일 정의 ---
const getCommonStyles = (isMobile: boolean, platform: string) => ({
  pageWrapper: { width: '100%', minHeight: '100vh', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'center' },
  container: { width: '100%', maxWidth: '2000px', padding: isMobile ? '8px 12px' : '20px 24px', display: 'flex', flexDirection: 'column' as const, gap: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: 'white', borderRadius: '24px', border: '1px solid #f3f4f6', marginBottom: '10px' },
  mainLayout: { display: 'flex', flexDirection: isMobile ? 'column' as const : 'row' as const, gap: '20px', alignItems: 'flex-start' },
  sidebarWrapper: { width: isMobile ? '100%' : '380px', position: isMobile ? 'static' as const : 'sticky' as const, top: '120px' },
  contentArea: { flex: 1, minWidth: 0 },
  breadcrumb: { display: 'flex', gap: '4px', marginBottom: '20px', fontSize: '13px', color: '#9ca3af' },
  card: { backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '20px' : '32px', border: '1px solid #e5e7eb' },
  itemGrid: { display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' },
  crawlBtn: (isRunning: boolean) => ({ padding: '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: isRunning ? '#9ca3af' : '#ff007f', color: 'white', fontWeight: 'bold' as const, cursor: 'pointer' }),
  // 🚀 [추가] 하단 로딩 바 스타일
  bottomLoader: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
    marginTop: '20px',
    backgroundColor: 'white',
    borderRadius: '24px',
    border: '1px dashed #ff007f', // 핑크색 점선으로 강조
    width: '100%'
  },
  spinnerIcon: {
    color: '#ff007f',
    marginBottom: '12px',
    animation: 'spin 1s linear infinite'
  },
  loaderText: {
    fontSize: '15px',
    fontWeight: 'bold' as const,
    color: '#1f2937',
    margin: 0
  },
});