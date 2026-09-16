'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { GlobalSidebar, GlobalFilterState } from "./GlobalSidebar";
import GlobalCategoryGrid from "./GlobalCategoryGrid";
import GlobalProductDetail, { GlobalProduct } from "./GlobalProductDetail";
import GlobalProductCard from "./GlobalProductCard";
import GlobalPagination from './GlobalPagination';
import GlobalSimplePagination from './GlobalSimplePagination';
import './global-shop-common.css';
import { House, CaretRight, SquaresFour, Fire, ListMagnifyingGlass, MagnifyingGlass } from '@phosphor-icons/react';

import { getShopTheme, shopThemeVars } from './shopTheme';

// --- [보조 컴포넌트] 로딩 오버레이 ---
// 🌟 스타일: ./global-shop-common.css의 .shop-overlay-* (색은 --shop-* 변수)
const MikuLoadingOverlay = ({ message, sub, brandVars }: { message: string; sub: string; brandVars: React.CSSProperties }) => (
  <div className="shop-overlay notranslate" translate="no" style={brandVars} role="status" aria-live="polite">
    <div className="shop-overlay-card">
      <span className="shop-overlay-glow" aria-hidden="true" />
      <div className="shop-overlay-mascot" aria-hidden="true">
        <img src="/miku-run.gif" alt="" />
      </div>
      <span className="shop-overlay-eyebrow">MIKUCHAN IS WORKING</span>
      <h3 className="shop-overlay-title">
        {message}
        <span className="shop-loader-dots" aria-hidden="true"><i /><i /><i /></span>
      </h3>
      <p className="shop-overlay-sub">{sub}</p>
      <div className="shop-overlay-bar" aria-hidden="true" />
    </div>
  </div>
);

// --- [보조 컴포넌트] 하단 로딩 카드 ---
// 🌟 검색 스트리밍과 실시간 인기 상품 로딩 양쪽에서 재사용합니다. 색은 쇼핑몰 테마(--shop-*)를
// 따르고, 곧 채워질 자리를 스켈레톤 카드로 미리 보여줍니다.
// 스타일: ./global-shop-common.css의 .shop-loader-* / .shop-skel
const PremiumBottomLoader = ({ eyebrow, message, sub, count, icon, wide, brandVars }: {
  eyebrow: string; message: string; sub: string; count: number; icon: React.ReactNode; wide?: boolean; brandVars: React.CSSProperties;
}) => (
  <div className="shop-loader notranslate" translate="no" style={brandVars} role="status" aria-live="polite">
    <div className="shop-loader-head">
      <span className="shop-loader-ring" aria-hidden="true"><span className="shop-loader-ring-icon">{icon}</span></span>
      <div className="shop-loader-text">
        <span className="shop-loader-eyebrow">{eyebrow}</span>
        <h4 className="shop-loader-title">
          {message}
          <span className="shop-loader-dots" aria-hidden="true"><i /><i /><i /></span>
        </h4>
        <p className="shop-loader-sub">{sub}</p>
      </div>
      <span className="shop-loader-count">지금까지 <b>{count}</b>개</span>
    </div>
    <div className={`shop-loader-grid ${wide ? 'is-wide' : ''}`} aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="shop-skel">
          <div className="shop-skel-img" />
          <div className="shop-skel-line" />
          <div className="shop-skel-line w60" />
          <div className="shop-skel-line w40" />
        </div>
      ))}
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
  // 기본값. 실제로는 쇼핑몰 상단 패널(.global-shop-header)의 아래쪽 + 여백으로 계산합니다
  // (사이트 헤더 높이가 화면 폭·스크롤에 따라 바뀌기 때문).
  const SIDEBAR_TOP = 160;
  const SIDEBAR_GAP = 15;
  const getSidebarTop = () => {
    const panel = document.querySelector('.global-shop-header') as HTMLElement | null;
    const bottom = panel?.getBoundingClientRect().bottom;
    return bottom && bottom > 0 ? Math.round(bottom + SIDEBAR_GAP) : SIDEBAR_TOP;
  };
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

      const sidebarTop = getSidebarTop();
      const sidebarEl = sidebarElRef.current;
      const footerEl = document.querySelector('footer.footer-wrapper') as HTMLElement | null;
      if (!sidebarEl || !footerEl) {
        setSidebarPin({ mode: 'fixed', top: sidebarTop });
        return;
      }

      const footerTop = footerEl.getBoundingClientRect().top;
      const sidebarHeight = sidebarEl.offsetHeight;

      if (sidebarTop + sidebarHeight + FOOTER_MARGIN > footerTop) {
        // 지금 fixed로 두면 Footer와 겹치므로, Footer 바로 위 문서 좌표에 고정
        const absoluteTop = window.scrollY + footerTop - sidebarHeight - FOOTER_MARGIN;
        setSidebarPin({ mode: 'absolute', top: absoluteTop });
      } else {
        setSidebarPin({ mode: 'fixed', top: sidebarTop });
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
    // 사이트 헤더가 스크롤에 따라 줄어드는 애니메이션이 끝난 뒤에도 위치를 다시 맞춥니다.
    const siteHeader = document.querySelector('.miku-header-wrapper');
    const ro = new ResizeObserver(onScrollOrResize);
    if (siteHeader) ro.observe(siteHeader);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      ro.disconnect();
    };
    // 상품 목록/상세보기 여부가 바뀌면 본문 높이가 달라져 Footer 위치도 바뀌므로 재계산합니다.
  }, [isMobile, props.items.length, props.isStreaming, Boolean(props.selectedProduct)]);

  const styles = useMemo(() => getCommonStyles(isMobile, props.platform), [isMobile, props.platform]);
  // 🌟 브레드크럼·카테고리 패널 포인트 컬러 (부드러운 톤, shopTheme.ts)
  const brandVars = shopThemeVars('shop', getShopTheme(props.platform as string)) as React.CSSProperties;
  // 🌟 인기 상품 순위 배지: 조회수 순으로 정렬돼 오는 플랫폼(라쿠텐·야후 쇼핑)에서만 표시합니다.
  //    메루카리·야후 옥션은 인기 카테고리별로 모은 목록이라 순서가 순위가 아닙니다.
  const showPopularRank = props.platform === 'rakuten' || props.platform === 'yahoo_shopping';

  // 🌟 카테고리를 선택하면(breadcrumb path가 생기면) 홈 화면이 아니므로, 그 사이 아이템이
  // 아직 로딩중이거나 결과가 0개여도 "실시간 인기 상품" 섹션이 다시 끼어들지 않게 합니다.
  const isHomeScreen = props.path.length === 0;

  return (
    <div style={styles.pageWrapper}>
      {/* 🚀 [수정 1] 전체 화면 로딩은 '아이템이 아예 없을 때'만 나오게 변경 */}
      {(props.isItemLoading && props.items.length === 0 || props.isDetailLoading) && (
        <MikuLoadingOverlay
          brandVars={brandVars}
          message={props.isItemLoading ? "상품을 불러오는 중입니다" : "상세 정보를 분석 중입니다"}
          sub={props.isItemLoading ? "조건에 맞는 상품을 찾고 있어요. 잠시만 기다려 주세요." : "상품 설명을 번역하고 요약하고 있어요."}
        />
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
                  border: '1px solid #edf0f4',
                  borderRadius: '28px',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 24px 48px -32px rgba(15, 23, 42, 0.3)',
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
            <nav
              className="notranslate shop-breadcrumb"
              aria-label="카테고리 경로"
              style={brandVars}
            >
              <button
                type="button"
                className={`shop-crumb shop-crumb-home ${props.path.length === 0 ? 'current' : ''}`}
                onClick={() => props.onNavigate(0, "HOME", 0)}
                aria-current={props.path.length === 0 ? 'page' : undefined}
              >
                <House weight={props.path.length === 0 ? 'fill' : 'bold'} />
                <span>HOME</span>
              </button>
              {props.path.map((p, i) => {
                const isLast = i === props.path.length - 1;
                return (
                  <React.Fragment key={p.id}>
                    <CaretRight className="shop-crumb-sep" weight="bold" aria-hidden="true" />
                    <button
                      type="button"
                      className={`shop-crumb ${isLast ? 'current' : ''}`}
                      onClick={() => props.onNavigate(p.id, p.name, i)}
                      aria-current={isLast ? 'page' : undefined}
                      title={p.name}
                    >
                      <span>{p.name}</span>
                    </button>
                  </React.Fragment>
                );
              })}
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
            <section
              className="shop-category-card"
              style={brandVars}
            >
              <div className="shop-category-head">
                <span className="shop-category-badge" aria-hidden="true"><SquaresFour weight="fill" /></span>
                <div className="shop-category-titles">
                  <span className="shop-category-eyebrow">CATEGORY</span>
                  <h3 className="shop-category-title notranslate" translate="no">
                    {props.path.length > 0 ? props.path[props.path.length - 1].name : '카테고리'}
                  </h3>
                </div>
                {!props.isLoading && props.categories.length > 0 && (
                  <span className="shop-category-count notranslate" translate="no">하위 {props.categories.length}개</span>
                )}
              </div>
              <GlobalCategoryGrid 
                categories={props.categories} 
                isLoading={props.isLoading} 
                platform={props.platform as any} 
                onMove={props.onNavigate}
                isLeaf={props.isLeaf}
              />
            </section>

            {/* 🌟 인기 상품을 아직 가져오는 중일 때 (메루카리처럼 크롤링에 시간이 걸리는 플랫폼용 안내) */}
            {isHomeScreen && props.items.length === 0 && props.isPopularLoading && (!props.popularProducts || props.popularProducts.length === 0) && (
              <PremiumBottomLoader
                brandVars={brandVars}
                eyebrow="TRENDING NOW"
                icon={<Fire weight="fill" />}
                message="미쿠짱이 열심히 인기 상품을 가져오고 있어요"
                sub="지금 많이 찾는 카테고리의 상품을 모으는 중이에요."
                count={props.popularProducts?.length || 0}
              />
            )}

            {/* 🌟 실시간 인기 상품: 검색/카테고리 결과가 없는 홈 화면일 때만, 조회수 상위 상품을 보여줍니다. */}
            {isHomeScreen && props.items.length === 0 && props.popularProducts && props.popularProducts.length > 0 && (
              <section className="shop-popular-card" style={{ ...brandVars, marginTop: isMobile ? '16px' : '24px' }}>
                <div className="shop-popular-head">
                  <span className="shop-popular-badge" aria-hidden="true"><Fire weight="fill" /></span>
                  <div className="shop-popular-titles">
                    <span className="shop-popular-eyebrow">TRENDING NOW</span>
                    <h3 className="shop-popular-title">실시간 인기 상품</h3>
                    <p className="shop-popular-desc">
                      {/* 🌟 회원 클릭이 아직 적어 플랫폼 인기 상품으로 채운 항목이 섞여 있으면 문구를 바꿉니다 */}
                      {showPopularRank
                        ? (props.popularProducts.some((p: any) => p.isPopularFiller)
                            ? '미쿠짱 회원들이 많이 본 상품에, 지금 인기 있는 상품을 더했어요'
                            : '미쿠짱 회원들이 많이 본 상품 순서예요')
                        : '지금 많이 찾는 카테고리의 상품을 모았어요'}
                    </p>
                  </div>
                  <div className="shop-popular-meta notranslate" translate="no">
                    <span className="shop-popular-live"><span className="shop-popular-live-dot" />LIVE</span>
                    <span className="shop-popular-count">{props.popularProducts.length}개</span>
                  </div>
                </div>
                <div className="shop-popular-grid">
                  {props.popularProducts.map((item: any, idx: number) => (
                    <GlobalProductCard
                      key={item.id || idx}
                      item={item}
                      onClick={() => props.onCardClick(item)}
                      variant="compact"
                      rank={showPopularRank && !item.isPopularFiller ? idx + 1 : undefined}
                    />
                  ))}
                </div>

                {/* 🌟 카테고리 1위 등 일부는 이미 떴지만, 뒤이어 추천 섹션/나머지 카테고리를
                    아직 가져오는 중일 때 맨 아래에 하단 로딩 바를 띄웁니다. */}
                {props.isPopularLoading && (
                  <PremiumBottomLoader
                    brandVars={brandVars}
                    eyebrow="TRENDING NOW"
                    icon={<Fire weight="fill" />}
                    message="미쿠짱이 열심히 다음 상품을 가져오고 있어요"
                    sub="나머지 인기 카테고리 상품을 이어서 가져오고 있어요."
                    count={props.popularProducts.length}
                  />
                )}
              </section>
            )}

            {/* 상품 리스트 섹션 */}
            {props.items.length > 0 && (
              <section className="shop-list" style={{ ...brandVars, marginTop: isMobile ? '12px' : '24px' }}>

                {/* 1. 목록 머리: 제목 + 페이지 정보 + 상단 페이지 이동 */}
                <div className="shop-list-head">
                  <span className="shop-list-badge" aria-hidden="true"><ListMagnifyingGlass weight="bold" /></span>
                  <div className="shop-list-titles">
                    <span className="shop-list-eyebrow">PRODUCTS</span>
                    <h3 className="shop-list-title notranslate" translate="no">
                      {props.path.length > 0 ? props.path[props.path.length - 1].name : '상품 목록'}
                    </h3>
                    <span className="shop-list-meta notranslate" translate="no">
                      {props.platform === 'mercari'
                        ? <><b>{props.pageInfo.page}</b> 페이지 · 상품 {props.items.length}개</>
                        : <><b>{props.pageInfo.page}</b> / {(props.pageInfo.pageCount || 1).toLocaleString()} 페이지 · 상품 {props.items.length}개</>}
                    </span>
                  </div>
                  <div className="shop-list-head-pager">
                    {props.platform === 'mercari' ? (
                      // 🌸 메루카리 전용: 이전/다음 버튼 모드
                      <GlobalSimplePagination 
                        currentPage={props.pageInfo.page} 
                        onPageChange={props.onPageChange} 
                      />
                    ) : (
                      <GlobalPagination 
                        currentPage={props.pageInfo.page} 
                        pageCount={props.pageInfo.pageCount || 1} 
                        onPageChange={props.onPageChange} 
                        size="compact"
                      />
                    )}
                  </div>
                </div>

                {/* 2. 상품 그리드 */}
                <div className="shop-list-grid">
                  {props.items.map((item, idx) => (
                    <GlobalProductCard key={idx} item={item} onClick={() => props.onCardClick(item)} />
                  ))}
                </div>

                {/* 3. 하단 페이지 이동 */}
                <div className="shop-list-foot">
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
              </section>
            )}

            {/* 4. 하단 로딩 바 (최하단에 배치) */}
            {props.isStreaming && props.isBottomLoaderAllowed && (
              <PremiumBottomLoader
                brandVars={brandVars}
                eyebrow="SEARCHING"
                icon={<MagnifyingGlass weight="bold" />}
                message="미쿠짱이 열심히 다음 상품을 가져오고 있어요"
                sub="검색 결과를 실시간으로 이어서 불러오고 있어요."
                count={props.items.length}
                wide
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
  // 🌟 모바일에서는 사이드바 aside 가 흐름상 높이 0(드로어는 fixed)이라 gap 20px 이 빈 여백으로만 남아 0 으로 둡니다.
  mainLayout: { display: 'flex', flexDirection: isMobile ? 'column' as const : 'row' as const, gap: isMobile ? '0px' : '20px', alignItems: 'flex-start', width: '100%', minWidth: 0 },
  // 🌟 데스크톱 사이드바는 이제 GlobalShoppingView에서 position:fixed로 직접 렌더링하므로
  // 여기서는 모바일(정적 흐름)용으로만 쓰입니다.
  sidebarWrapper: { width: '100%' },
  contentArea: { flex: 1, width: isMobile ? '100%' : undefined, maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' as const },
  card: { backgroundColor: 'white', borderRadius: '24px', padding: isMobile ? '20px' : '32px', border: '1px solid #e5e7eb', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' as const, overflow: 'hidden' as const },
  itemGrid: { display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fill, minmax(250px, 1fr))', gap: isMobile ? '12px' : '20px', width: '100%', minWidth: 0 },
  crawlBtn: (isRunning: boolean) => ({ padding: '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: isRunning ? '#9ca3af' : '#ff007f', color: 'white', fontWeight: 'bold' as const, cursor: 'pointer' }),
  // 🚀 하단 로딩 바는 이제 PremiumBottomLoader 컴포넌트가 자체 스타일로 렌더링합니다.
});