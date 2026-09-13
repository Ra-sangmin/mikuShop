'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { GlobalSidebar, GlobalFilterState } from "./GlobalSidebar";
import GlobalCategoryGrid from "./GlobalCategoryGrid";
import GlobalProductDetail, { GlobalProduct } from "./GlobalProductDetail";
import GlobalProductCard from "./GlobalProductCard";
import GlobalPagination from './GlobalPagination';
import GlobalSimplePagination from './GlobalSimplePagination';
import './global-shop-common.css';

// --- [보조 컴포넌트] 로딩 오버레이 ---
const MikuLoadingOverlay = ({ message, isMobile }: { message: string; isMobile: boolean }) => (
  <div style={{
    position: 'fixed', inset: 0, backgroundColor: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center'
  }}>
    <style>
      {`
        /* @keyframes spin은 GlobalCategoryGrid.tsx와 공통이라 ./global-shop-common.css로 옮겼습니다 */
        /* 글로우 효과도 1.5배 더 풍성하게 수정 */
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 15px rgba(255, 0, 127, 0.2); } 50% { box-shadow: 0 0 45px rgba(255, 0, 127, 0.4); } }
        @keyframes shimmerText { 0% { background-position: -100% 0; } 100% { background-position: 100% 0; } }
      `}
    </style>
    
    {/* 🚀 전체 크기 1.5배 확대 (154px -> 230px) */}
    <div style={{ position: 'relative', width: isMobile ? '150px' : '230px', height: isMobile ? '150px' : '230px' }}>
      
      {/* 1. 핑크색 테두리 (두께 9px로 강화) */}
      <div style={{
        position: 'absolute', inset: 0,
        border: `${isMobile ? '6px' : '9px'} solid #fce7f3`, borderTopColor: '#ff007f', borderRadius: '50%', 
        animation: 'spin 1s linear infinite, pulseGlow 2s ease-in-out infinite',
        boxSizing: 'border-box',
        zIndex: 2
      }} />
      
      {/* 2. 꽉 찬 미쿠짱 GIF 영역 (230px에 맞춰 확대) */}
      <div style={{
        position: 'absolute', 
        inset: isMobile ? '6px' : '9px', // 테두리 두께만큼 안쪽으로 여백
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: '50%',
        zIndex: 1
      }}>
        <img 
          src="/miku-run.gif" 
          alt="열심히 달리는 미쿠짱" 
          style={{ 
            width: '100%',
            height: '100%',
            objectFit: 'cover', // 원 안을 꽉 채우기
            transform: 'scale(1.05)' 
          }} 
        />
      </div>

    </div>

    {/* 🚀 하단 텍스트 영역도 1.5배 수준으로 확대 */}
    <div style={{ marginTop: '76px', textAlign: 'center' }}>
      <p style={{
        fontWeight: 'bold', fontSize: isMobile ? '20px' : '28px',
        background: 'linear-gradient(90deg, #1f2937 0%, #ff007f 50%, #1f2937 100%)',
        backgroundSize: '200% auto', color: 'transparent', WebkitBackgroundClip: 'text', animation: 'shimmerText 2.5s linear infinite',
        margin: 0, letterSpacing: '-1px'
      }}>{message}</p>
      <p style={{ color: '#9ca3af', fontSize: isMobile ? '14px' : '20px', marginTop: isMobile ? '10px' : '15px' }}>잠시후 로딩됩니다...</p>
    </div>
  </div>
);

// --- [보조 컴포넌트] 하단 로딩 바 ---
// 🌟 검색 스트리밍(핑크, #ff007f)과 실시간 인기 상품 로딩(오렌지, #ea580c) 양쪽에서 재사용하는
// 카드형 로딩 표시입니다. 이전엔 플레인한 흰 배경 + 점선 테두리 + 기본 FontAwesome 스피너였는데,
// 은은한 그라데이션 카드 + 이중 링 스피너(글로우 포함) + 셰이머 텍스트 + 알약형 카운트 배지로
// 다듬었습니다. color만 바꿔주면 어디서든 같은 톤으로 재사용됩니다.
const PremiumBottomLoader = ({ color, message, count }: { color: string; message: string; count: number }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '16px', padding: '36px 24px', marginTop: '20px', width: '100%',
    background: `linear-gradient(180deg, #ffffff 0%, ${color}0d 100%)`,
    borderRadius: '24px', border: `1px solid ${color}26`,
    boxShadow: `0 14px 32px ${color}14`,
    boxSizing: 'border-box',
  }}>
    <div style={{ position: 'relative', width: '40px', height: '40px', color }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: '3px solid rgba(0,0,0,0.06)', borderTopColor: 'currentColor',
        boxShadow: '0 0 12px -2px currentColor',
        animation: 'spin 0.85s cubic-bezier(0.6,0.05,0.4,0.95) infinite',
      }} />
    </div>
    <div style={{ textAlign: 'center' }}>
      <p className="notranslate" style={{
        fontSize: '15px', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.2px',
        background: `linear-gradient(90deg, #374151 0%, ${color} 50%, #374151 100%)`,
        backgroundSize: '200% auto', color: 'transparent', WebkitBackgroundClip: 'text', backgroundClip: 'text',
        animation: 'loaderShimmerText 2.6s linear infinite',
      }}>
        {message}
      </p>
      <span className="notranslate" style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '5px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 900,
        color, background: `${color}14`, border: `1px solid ${color}2e`,
      }}>
        {count}개 수집됨
      </span>
    </div>
  </div>
);

interface GlobalShoppingViewProps {
  platform: 'rakuten' | 'mercari' | 'amazon' | 'yahoo_auction' | 'yahoo_shopping';
  // 데이터
  path: { id: number; name: string }[];
  categories: any[];
  items: any[];
  // 🌟 홈 화면(카테고리 아래)에 노출할 실시간 인기 상품 목록 (선택적, 검색 결과가 없을 때만 표시)
  popularProducts?: any[];
  // 🌟 인기 상품을 크롤링/조회하는 중인지 여부 (로딩이 오래 걸리는 플랫폼에서 안내 문구 표시용)
  isPopularLoading?: boolean;
  pageInfo: { page: number; pageCount: number };
  selectedProduct: GlobalProduct | null;
  // 상태
  isLoading: boolean;
  isItemLoading: boolean;
  isStreaming?: boolean;
  isBottomLoaderAllowed?: boolean;
  isDetailLoading?: boolean;
  // 🚨 추가된 필수 속성
  isLeaf: boolean;
  // 이벤트 핸들러
  onNavigate: (id: number, name: string, level: number) => void;
  onSearch: (filters: GlobalFilterState) => void;
  onCardClick: (item: any) => void;
  onCloseDetail: () => void;
  onPageChange: (newPage: number) => void;
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

  // 🌟 데스크톱 사이드바를 Header와 동일하게 완전한 position:fixed로 고정합니다.
  // position:sticky는 이 페이지의 중첩된 flex 래퍼들(centering, gap, align-items 등) 안에서
  // 계속 "고정 범위"가 콘텐츠 높이에 종속되어, 스크롤 중간에 풀려 Footer와 같이 흘러가버리는
  // 문제가 반복됐습니다. 아예 fixed로 바꾸고, 실제 화면 좌표는 자리표시자(placeholder)의
  // 뷰포트 위치를 측정해 그대로 적용합니다. 자리표시자는 레이아웃 상 공간만 차지할 뿐
  // 화면에는 보이지 않고, 진짜 사이드바는 그 좌표 위에 fixed로 별도 렌더링됩니다.
  const sidebarPlaceholderRef = useRef<HTMLDivElement>(null);
  const sidebarElRef = useRef<HTMLElement>(null);
  const [sidebarLeft, setSidebarLeft] = useState<number | null>(null);

  // 🌟 사이드바가 Footer와 겹치는 문제 해결: 스크롤이 Footer 근처에 다다르면
  // position을 'fixed'에서 'absolute'로 전환해, 사이드바가 Footer 바로 위에서
  // 문서 좌표에 "얹혀서" 멈추도록 만듭니다(뷰포트 기준 fixed가 아니라 문서 기준
  // absolute가 되므로 더 이상 스크롤을 따라가지 않고 Footer 위에 정지합니다).
  // position:sticky를 다시 쓰지 않는 이유: 이 페이지의 Google 번역 위젯이 DOM을
  // 건드리면서 sticky 계산이 계속 깨졌던 전례가 있어(위 notranslate 주석 참고),
  // 스크롤/리사이즈 이벤트로 직접 계산하는 방식이 더 안정적입니다.
  const SIDEBAR_TOP = 160;
  const FOOTER_MARGIN = 24;
  const [sidebarPin, setSidebarPin] = useState<{ mode: 'fixed' | 'absolute'; top: number }>({ mode: 'fixed', top: SIDEBAR_TOP });

  useEffect(() => {
    if (isMobile) return;

    let ticking = false;
    const recompute = () => {
      ticking = false;
      if (sidebarPlaceholderRef.current) {
        setSidebarLeft(sidebarPlaceholderRef.current.getBoundingClientRect().left);
      }

      const sidebarEl = sidebarElRef.current;
      const footerEl = document.querySelector('footer.footer-wrapper') as HTMLElement | null;
      if (!sidebarEl || !footerEl) {
        setSidebarPin({ mode: 'fixed', top: SIDEBAR_TOP });
        return;
      }

      const footerTop = footerEl.getBoundingClientRect().top;
      const sidebarHeight = sidebarEl.offsetHeight;

      if (SIDEBAR_TOP + sidebarHeight + FOOTER_MARGIN > footerTop) {
        // 지금 fixed로 두면 Footer와 겹치므로, Footer 바로 위 문서 좌표에 고정
        const absoluteTop = window.scrollY + footerTop - sidebarHeight - FOOTER_MARGIN;
        setSidebarPin({ mode: 'absolute', top: absoluteTop });
      } else {
        setSidebarPin({ mode: 'fixed', top: SIDEBAR_TOP });
      }
    };

    const onScrollOrResize = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(recompute);
      }
    };

    recompute();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
    // 상품 목록/상세보기 여부가 바뀌면 본문 높이가 달라져 Footer 위치도 바뀌므로 재계산합니다.
  }, [isMobile, props.items.length, props.isStreaming, Boolean(props.selectedProduct)]);

  const styles = useMemo(() => getCommonStyles(isMobile, props.platform), [isMobile, props.platform]);

  // 🌟 카테고리를 선택하면(breadcrumb path가 생기면) 홈 화면이 아니므로, 그 사이 아이템이
  // 아직 로딩중이거나 결과가 0개여도 "실시간 인기 상품" 섹션이 다시 끼어들지 않게 합니다.
  const isHomeScreen = props.path.length === 0;

  return (
    <div style={styles.pageWrapper}>
      {/* 🚀 [수정 1] 전체 화면 로딩은 '아이템이 아예 없을 때'만 나오게 변경 */}
      {(props.isItemLoading && props.items.length === 0 || props.isDetailLoading) && (
        <MikuLoadingOverlay isMobile={isMobile} message={props.isItemLoading ? "상품을 불러오는 중입니다" : "상세 정보를 분석 중입니다"} />
      )}

      <div style={styles.container}>

        <div style={styles.mainLayout}>
          {/* 사이드바 (Google 번역 위젯이 이 영역의 DOM을 건드리면서 레이아웃을 깨뜨리는
              현상을 막기 위해 notranslate 처리 — 이 안의 텍스트는 원래도 한국어 UI 라벨뿐이라
              번역 대상이 아님) */}
          {isMobile ? (
            <aside style={styles.sidebarWrapper} className="notranslate" translate="no">
              <GlobalSidebar
                platform={props.platform as any}
                currentPath={props.path}
                onNavigate={props.onNavigate}
                onSearch={props.onSearch}
                isDetailOpen={Boolean(props.selectedProduct)}
                sortOptions={props.sortOptions} // 받아온 옵션을 사이드바로 토스!
              />
            </aside>
          ) : (
            <>
              {/* 레이아웃 상 자리만 차지하는 자리표시자 — 실제 사이드바는 fixed로 별도 렌더링.
                  🌟 폭은 GlobalSidebar 내부 카드의 실제 너비(390px, GlobalSidebar.tsx)와 정확히
                  맞춥니다. 여기서 1px라도 더 좁으면 overflowY:'auto' 때문에(스펙상 overflowY가
                  visible이 아니면 overflowX도 자동으로 auto가 됨) 안 써도 될 가로 스크롤바가 생깁니다. */}
              <div ref={sidebarPlaceholderRef} style={{ width: '390px', flexShrink: 0 }} />
              <aside
                ref={sidebarElRef}
                className="notranslate miku-fancy-scrollbar"
                translate="no"
                style={{
                  position: sidebarPin.mode,
                  top: `${sidebarPin.top}px`,
                  left: sidebarLeft ?? 0,
                  width: '390px',
                  maxHeight: 'calc(100vh - 180px)',
                  // 🌟 카드의 흰 배경/테두리/둥근 모서리를 여기(실제 스크롤 컨테이너)로 옮겨서,
                  // overflow 클리핑이 카드 모양 자체를 잘라내도록 합니다. 이렇게 해야 내부의
                  // sticky 하단 버튼이 카드 실제 끝이 아닌 위치(스크롤 중)에 떠 있어도, 항상
                  // 이 둥근 경계 안에서만 보이고 둥근 모서리 틈으로 다른 항목이 비치지 않습니다.
                  backgroundColor: 'white',
                  border: '1px solid #f3f4f6',
                  borderRadius: '32px',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  zIndex: 10,
                  visibility: sidebarLeft === null ? 'hidden' : 'visible',
                }}
              >
                <GlobalSidebar
                  platform={props.platform as any}
                  currentPath={props.path}
                  onNavigate={props.onNavigate}
                  onSearch={props.onSearch}
                  isDetailOpen={Boolean(props.selectedProduct)}
                  sortOptions={props.sortOptions} // 받아온 옵션을 사이드바로 토스!
                />
              </aside>
            </>
          )}

          {/* 메인 콘텐츠 */}
          <main style={styles.contentArea}>
            <nav style={styles.breadcrumb} className="notranslate">
              <span onClick={() => props.onNavigate(0, "HOME", 0)} style={{ cursor: 'pointer' }}>HOME</span>
              {props.path.map((p, i) => (
                <span key={p.id} onClick={() => props.onNavigate(p.id, p.name, i)} style={{ cursor: 'pointer' }}> / {p.name}</span>
              ))}
            </nav>

            {/* 상품 상세 */}
            {props.selectedProduct && (
              <div style={{ marginBottom: '40px' }}>
                {/* 🌟 key를 지정해 다른 상품 클릭 시 컴포넌트를 완전히 새로 마운트합니다.
                    key가 없으면 같은 자리에서 props만 갱신되는데, 그 과정에서 이전 상품의
                    요약 텍스트(useMemo/텍스트 노드)가 잠깐 겹쳐 보이는 문제가 있었습니다. */}
                <GlobalProductDetail key={props.selectedProduct.id} product={props.selectedProduct} onClose={props.onCloseDetail} />
              </div>
            )}

            {/* 카테고리 그리드 */}
            <div style={styles.card}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '20px' }}>카테고리</h3>
              <GlobalCategoryGrid 
                categories={props.categories} 
                isLoading={props.isLoading} 
                platform={props.platform as any} 
                onMove={props.onNavigate}
                isLeaf={props.isLeaf}
              />
            </div>

            {/* 🌟 인기 상품을 아직 가져오는 중일 때 (메루카리처럼 크롤링에 시간이 걸리는 플랫폼용 안내) */}
            {isHomeScreen && props.items.length === 0 && props.isPopularLoading && (!props.popularProducts || props.popularProducts.length === 0) && (
              <PremiumBottomLoader
                color="#ea580c"
                message="미쿠짱이 열심히 인기 상품을 가져오고 있어요"
                count={props.popularProducts?.length || 0}
              />
            )}

            {/* 🌟 실시간 인기 상품: 검색/카테고리 결과가 없는 홈 화면일 때만, 조회수 상위 상품을 보여줍니다. */}
            {isHomeScreen && props.items.length === 0 && props.popularProducts && props.popularProducts.length > 0 && (
              <div style={{ ...styles.card, marginTop: isMobile ? '20px' : '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <span style={{
                    width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    boxShadow: '0 4px 12px rgba(234, 88, 12, 0.35), inset 0 1px 1px rgba(255,255,255,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M13.5 2c.4 2.7-1 4.2-2.3 5.6C10 8.9 8.8 10.2 8.8 12.5a3.2 3.2 0 0 0 6.4 0c0-.8-.2-1.4-.5-1.9.7 1 .5 2.3-.3 2.9-.9.7-1.7-.2-1.2-1.1.6-1 .1-1.9-.4-2.6-.2 1-.8 1.7-1.4 2.4-.6.7-1 1.4-1 2.3a2 2 0 0 0 4 0c0-.5-.1-.9-.3-1.3.9.6 1.5 1.7 1.5 2.9a4.6 4.6 0 0 1-9.2 0c0-3.4 2-5.1 3.6-6.7C11.3 6.3 12.6 5 12.4 2.6c.4.1.8.3 1.1.4z" />
                    </svg>
                  </span>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#1f2937', margin: 0, letterSpacing: '-0.3px' }}>
                    실시간 인기 상품
                  </h3>
                </div>
                <div style={{
                  ...styles.itemGrid,
                  gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fill, minmax(170px, 1fr))',
                  gap: isMobile ? '10px' : '16px',
                }}>
                  {props.popularProducts.map((item: any, idx: number) => (
                    <GlobalProductCard key={item.id || idx} item={item} onClick={() => props.onCardClick(item)} variant="compact" />
                  ))}
                </div>

                {/* 🌟 카테고리 1위 등 일부는 이미 떴지만, 뒤이어 추천 섹션/나머지 카테고리를
                    아직 가져오는 중일 때 맨 아래에 하단 로딩 바를 띄웁니다. */}
                {props.isPopularLoading && (
                  <PremiumBottomLoader
                    color="#ea580c"
                    message="미쿠짱이 열심히 다음 상품을 가져오고 있어요"
                    count={props.popularProducts.length}
                  />
                )}
              </div>
            )}

            {/* 상품 리스트 섹션 */}
            {props.items.length > 0 && (
              <div style={{ marginTop: isMobile ? '8px' : '20px', display: 'flex', flexDirection: 'column' }}>
                
                {/* 🚀 1. 상단 페이지네이션 (선택 사항: 상품이 많을 때 위에서도 이동 가능하게) */}
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                  {props.platform === 'mercari' ? (
                    // 🌸 메루카리 전용: 이전/다음 버튼 모드
                    <GlobalSimplePagination 
                      currentPage={props.pageInfo.page} 
                      onPageChange={props.onPageChange} 
                    />
                  ) : (
                    // 📦 기타 플랫폼: 기존 숫자 페이지네이션
                    <GlobalPagination 
                      currentPage={props.pageInfo.page} 
                      pageCount={props.pageInfo.pageCount || 1} 
                      onPageChange={props.onPageChange} 
                    />
                  )}
                </div>

                {/* 2. 상품 그리드 */}
                <div style={styles.itemGrid}>
                  {props.items.map((item, idx) => (
                    <GlobalProductCard key={idx} item={item} onClick={() => props.onCardClick(item)} />
                  ))}
                </div>

                <div style={{ 
                  marginTop: '40px', 
                  borderTop: '1px solid #eee', 
                  paddingTop: '30px',
                  display: 'flex',           // 1. flex 레이아웃 적용
                  justifyContent: 'center',   // 2. 가로 방향 중앙 정렬
                  width: '100%'              // 3. 전체 너비 확보
                }}>
                  {props.platform === 'mercari' ? (
                    <GlobalSimplePagination 
                      currentPage={props.pageInfo.page} 
                      onPageChange={props.onPageChange} 
                    />
                  ) : (
                    <GlobalPagination 
                      currentPage={props.pageInfo.page} 
                      pageCount={props.pageInfo.pageCount || 1} 
                      onPageChange={props.onPageChange} 
                    />
                  )}
                </div>
                
              </div>
            )}

            {/* 4. 하단 로딩 바 (최하단에 배치) */}
            {props.isStreaming && props.isBottomLoaderAllowed && (
              <PremiumBottomLoader
                color="#ff007f"
                message="미쿠짱이 열심히 다음 상품을 가져오고 있어요"
                count={props.items.length}
              />
            )}


          </main>
        </div>
      </div>
    </div>
  );
}

// --- 공용 스타일 정의 ---
const getCommonStyles = (isMobile: boolean, platform: string) => ({
  // 🌟 overflowX:'clip'이 (overflow-y를 visible로 명시해도) 이 div를 사이드바
  // position:sticky의 기준 스크롤 컨테이너로 만들어버려 sticky가 전혀 동작하지 않게 됨.
  // 가로 스크롤 클리핑은 html/body의 전역 overflow-x:clip이 이미 담당하므로 여기선 제거.
  pageWrapper: { width: '100%', maxWidth: '100vw', minHeight: '100vh', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'center', boxSizing: 'border-box' as const },
  container: { width: '100%', maxWidth: '2000px', minWidth: 0, padding: isMobile ? '0 12px 0 44px' : '20px 24px', display: 'flex', flexDirection: 'column' as const, gap: isMobile ? '10px' : '20px', boxSizing: 'border-box' as const },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: 'white', borderRadius: '24px', border: '1px solid #f3f4f6', marginBottom: '10px' },
  // 🌟 alignItems를 'flex-start'로 두면 사이드바(aside)의 박스 높이가 사이드바 자체 콘텐츠
  // 높이로만 제한되어, position:sticky가 붙어있을 수 있는 범위도 그만큼만 생깁니다. 그래서
  // 상품 리스트로 본문이 길어지면 사이드바가 조금 스크롤되다 곧바로 sticky 범위를 벗어나
  // 페이지와 함께 흘러가버리는 문제가 있었습니다. 'stretch'로 두면 사이드바 박스가 옆
  // 본문(contentArea) 높이만큼 늘어나서, 페이지 전체 스크롤 동안 사이드바가 완전히 고정됩니다.
  mainLayout: { display: 'flex', flexDirection: isMobile ? 'column' as const : 'row' as const, gap: '20px', alignItems: 'flex-start', width: '100%', minWidth: 0 },
  // 🌟 데스크톱 사이드바는 이제 GlobalShoppingView에서 position:fixed로 직접 렌더링하므로
  // 여기서는 모바일(정적 흐름)용으로만 쓰입니다.
  sidebarWrapper: { width: '100%' },
  contentArea: { flex: 1, width: isMobile ? '100%' : undefined, maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' as const },
  breadcrumb: { display: 'flex', gap: '4px', marginBottom: isMobile ? '10px' : '20px', fontSize: '13px', color: '#9ca3af', minWidth: 0, maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  card: { backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '20px' : '32px', border: '1px solid #e5e7eb', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' as const, overflow: 'hidden' as const },
  itemGrid: { display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fill, minmax(250px, 1fr))', gap: isMobile ? '12px' : '20px', width: '100%', minWidth: 0 },
  crawlBtn: (isRunning: boolean) => ({ padding: '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: isRunning ? '#9ca3af' : '#ff007f', color: 'white', fontWeight: 'bold' as const, cursor: 'pointer' }),
  // 🚀 하단 로딩 바는 이제 PremiumBottomLoader 컴포넌트가 자체 스타일로 렌더링합니다.
});