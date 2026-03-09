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
      }}>M</div>
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
      {/* 로딩 포털 */}
      {(props.isItemLoading || props.isDetailLoading) && (
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
                <span key={p.id} onClick={() => props.onNavigate(p.id, p.name, i + 1)} style={{ cursor: 'pointer' }}> / {p.name}</span>
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
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '20px' }}>CATEGORY</h3>
              <GlobalCategoryGrid 
                categories={props.categories} 
                isLoading={props.isLoading} 
                platform={props.platform} 
                onMove={props.onNavigate}
                isLeaf={props.isLeaf}
              />
            </div>

            {/* 상품 리스트 */}
            {props.items.length > 0 && (
              <div style={{ marginTop: '40px' }}>
                <div style={styles.itemGrid}>
                  {props.items.map((item, idx) => (
                    <GlobalProductCard key={idx} item={item} onClick={() => props.onCardClick(item)} />
                  ))}
                </div>
                <GlobalPagination currentPage={props.pageInfo.page} pageCount={props.pageInfo.pageCount} />
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
  crawlBtn: (isRunning: boolean) => ({ padding: '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: isRunning ? '#9ca3af' : '#ff007f', color: 'white', fontWeight: 'bold' as const, cursor: 'pointer' })
});