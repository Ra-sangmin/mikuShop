"use client";

import React, { useState, useEffect, useRef } from 'react';
import './global-shop-common.css';
import { CaretRight, CaretDown, CaretUp, FlagCheckered } from '@phosphor-icons/react';
import { getShopTheme, shopThemeVars } from './shopTheme';

// --- 모바일 감지 커스텀 훅 ---
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}

// --- 플랫폼별 타입 및 인터페이스 ---
export type ShoppingPlatform = 'mercari' | 'rakuten' | 'amazon' | 'yahoo' | 'yahoo_shopping' | 'yahoo_auction' | 'default';

export interface GlobalCategory {
  genreId: number;
  genreName: string;
  genreLevel: number;
}

interface GlobalCategoryGridProps {
  categories: GlobalCategory[];
  isLeaf: boolean;
  isLoading: boolean;
  /** 현재 활성화된 플랫폼 (mercari, rakuten, amazon, yahoo) */
  platform: ShoppingPlatform; 
  onMove: (id: number, name: string, levelIndex : number) => void;
  isMobile?: boolean;
}

// --- 플랫폼별 테마 설정 (색상 가이드라인) ---
const PLATFORM_THEMES: Record<ShoppingPlatform, { color: string; bg: string }> = {
  mercari: { color: '#ff0038', bg: '#fff1f2' },
  rakuten: { color: '#bf0000', bg: '#fef2f2' },
  amazon: { color: '#ff9900', bg: '#fff7ed' },
  yahoo: { color: '#ff0033', bg: '#fff1f2' },
  // 🌟 실제로 넘어오는 값은 yahoo_shopping / yahoo_auction이라 기본(보라)색으로 떨어지던 문제 수정
  yahoo_shopping: { color: '#bf0000', bg: '#fef2f2' },
  yahoo_auction: { color: '#f08c00', bg: '#fff7ed' },
  default: { color: '#6366f1', bg: '#f5f3ff' }
};

export default function GlobalCategoryGrid({ 
  categories, 
  isLeaf, 
  isLoading, 
  platform = 'default',
  onMove 
}: GlobalCategoryGridProps) {
  const isMobile = useIsMobile(); 
  const theme = PLATFORM_THEMES[platform] || PLATFORM_THEMES.default;

  // 🚀 [추가] 더보기 상태 관리
  const [isExpanded, setIsExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 🌟 더보기/접기 토글. 접을 때는 펼쳐진 목록 아래쪽까지 스크롤해 내려온 상태라 접는 순간
  // 화면에 상품 목록만 남아 버리므로, 카테고리 패널 맨 위(고정 헤더·쇼핑몰 패널 바로 아래)로 자동 스크롤합니다.
  const handleToggleExpanded = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    if (next) return;
    const root = rootRef.current;
    if (!root) return;
    const card = (root.closest('.shop-category-card') as HTMLElement | null) ?? root;
    const shopHeader = document.querySelector('.global-shop-header') as HTMLElement | null;
    const siteHeader = document.querySelector('.miku-header-wrapper') as HTMLElement | null;
    const fixedBottom = Math.max(
      shopHeader?.getBoundingClientRect().bottom ?? 0,
      siteHeader?.getBoundingClientRect().bottom ?? 0,
    );
    const targetY = card.getBoundingClientRect().top + window.scrollY - fixedBottom - 12;
    if (window.scrollY > targetY) {
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    }
  };

  // 🚀 [추가] 모바일일 경우 초기 8개만 노출, PC는 전체 노출
  const initialCount = isMobile ? 8 : categories.length;
  const visibleCategories = isExpanded ? categories : categories.slice(0, initialCount);
  const hasMore = categories.length > initialCount;

  const styles = {
    loadingWrapper: { height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    spinner: { 
      height: '32px', 
      width: '32px', 
      border: '4px solid #f3f4f6', 
      borderTopColor: theme.color, // 플랫폼 컬러 적용
      borderRadius: '50%', 
      animation: 'spin 1s linear infinite' 
    },
    gridContainer: { 
      display: 'grid', 
      gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: isMobile ? '8px' : '12px', 
      animation: 'fadeIn 0.5s ease-in-out',
      width: '100%',
      minWidth: 0
    },
    messageText: { textAlign: 'center' as const, padding: '40px 0', color: '#9ca3af', fontSize: '14px', fontStyle: 'italic' as const },
    emptyText: { textAlign: 'center' as const, padding: '40px 0', color: '#d1d5db', fontSize: '14px' },

    // 🚀 [추가] 더보기 버튼 스타일
    expandButton: {
      width: '100%',
      marginTop: '16px',
      padding: '12px',
      borderRadius: '12px',
      border: `1px solid ${theme.color}20`,
      backgroundColor: theme.bg,
      color: theme.color,
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      transition: 'all 0.2s'
    }
  };

  // 카테고리 이동 시 상태 초기화 (페이지 이동 후 다시 접힌 상태로 시작)
  useEffect(() => {
    setIsExpanded(false);
  }, [categories]);

  // 🌟 카테고리를 가져오는 동안: 상품 로딩과 같은 미쿠짱 마스코트 로더 + 곧 채워질 자리(스켈레톤 칩)
  if (isLoading) return (
    <div className="shop-cat-loading notranslate" translate="no" style={shopThemeVars('shop', getShopTheme(platform)) as React.CSSProperties} role="status" aria-live="polite">
      <div className="shop-cat-loading-head">
        <span className="shop-cat-loading-mascot" aria-hidden="true"><img src="/miku-run.gif" alt="" /></span>
        <div className="shop-cat-loading-text">
          <span className="shop-cat-loading-eyebrow">MIKUCHAN IS WORKING</span>
          <h4 className="shop-cat-loading-title">
            카테고리를 불러오는 중
            <span className="shop-loader-dots" aria-hidden="true"><i /><i /><i /></span>
          </h4>
          <p className="shop-cat-loading-sub">쇼핑몰에서 하위 카테고리 목록을 가져오고 있어요. 잠시만 기다려 주세요.</p>
        </div>
      </div>
      <div className="shop-cat-grid shop-cat-skel-grid" aria-hidden="true">
        {Array.from({ length: isMobile ? 6 : 8 }).map((_, i) => (
          <div key={i} className="shop-cat-skel" style={{ animationDelay: `${i * 0.08}s` }}>
            <span className="shop-cat-skel-dot" />
            <span className="shop-cat-skel-line" style={{ width: `${48 + ((i * 17) % 40)}%` }} />
          </div>
        ))}
      </div>
      <div className="shop-cat-loading-bar" aria-hidden="true" />
    </div>
  );

  return (
    <div ref={rootRef} className="shop-cat" style={shopThemeVars('shop', getShopTheme(platform)) as React.CSSProperties}>
      {/* 카테고리 리스트 표시 */}
      {!isLoading && !isLeaf && categories.length > 0 && (
       <>
          <div className="shop-cat-grid">
            {visibleCategories.map((cat, idx) => (
              <GlobalCategoryItem 
                key={cat.genreId} 
                name={cat.genreName} 
                index={idx}
                onClick={() => onMove(cat.genreId, cat.genreName , cat.genreLevel)} 
              />
            ))}
          </div>

          {hasMore && (
            <button type="button" className="shop-cat-more" onClick={handleToggleExpanded}>
              {isExpanded ? (
                <>카테고리 접기 <span className="shop-cat-more-count">{categories.length}개</span> <CaretUp weight="bold" /></>
              ) : (
                <>카테고리 더보기 <span className="shop-cat-more-count">+{categories.length - initialCount}</span> <CaretDown weight="bold" /></>
              )}
            </button>
          )}
        </>
      )}

      {/* 최하위 카테고리 */}
      {!isLoading && isLeaf && categories.length === 0 && (
        <div className="shop-cat-message">
          <span className="shop-cat-message-icon"><FlagCheckered weight="fill" /></span>
          <div>
            <strong>마지막 카테고리입니다.</strong>
            <p>왼쪽 상세검색에서 조건을 정한 뒤 <b>조건으로 검색하기</b>를 눌러주세요.</p>
          </div>
        </div>
      )}
      
      {/* 데이터 없음 */}
      {!isLoading && !isLeaf && categories.length === 0 && (
        <div className="shop-cat-empty">표시할 하위 카테고리가 없습니다.</div>
      )}
    </div>
  );
}

// --- 내부 아이템 컴포넌트 ---
function GlobalCategoryItem({ name, index, onClick }: { name: string; index: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      translate="no"
      className="notranslate shop-cat-item"
      style={{ animationDelay: `${Math.min(index, 20) * 18}ms` }}
      title={name}
    >
      <span className="shop-cat-dot" aria-hidden="true" />
      <span className="shop-cat-name">{name}</span>
      <CaretRight className="shop-cat-arrow" weight="bold" aria-hidden="true" />
    </button>
  );
}
