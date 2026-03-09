"use client";

import React, { useState, useEffect } from 'react';

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
export type ShoppingPlatform = 'mercari' | 'rakuten' | 'amazon' | 'yahoo' | 'default';

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
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: isMobile ? '8px' : '12px', 
      animation: 'fadeIn 0.5s ease-in-out' 
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

  if (isLoading) return (
    <div style={styles.loadingWrapper}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={styles.spinner} />
    </div>
  );

  return (
    <div style={{ width: '100%' }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      
      {/* 카테고리 리스트 표시 */}
      {!isLeaf && categories.length > 0 && (
       <>
          <div style={styles.gridContainer}>
            {/* 🚀 visibleCategories를 사용하여 렌더링 */}
            {visibleCategories.map((cat) => (
              <GlobalCategoryItem 
                key={cat.genreId} 
                name={cat.genreName} 
                onClick={() => onMove(cat.genreId, cat.genreName , cat.genreLevel)} 
                isMobile={isMobile}
                theme={theme}
              />
            ))}
          </div>

          {/* 🚀 [추가] 더보기 / 접기 버튼 */}
          {hasMore && (
            <button 
              style={styles.expandButton} 
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>접기 <span style={{fontSize: '10px'}}>▲</span></>
              ) : (
                <>카테고리 더보기 (+{categories.length - initialCount}) <span style={{fontSize: '10px'}}>▼</span></>
              )}
            </button>
          )}
        </>
      )}

      {/* 안내 메시지 */}
      {isLeaf && categories.length === 0 && (
        <div style={styles.messageText}>최하위 카테고리입니다. 왼쪽 상세 검색의 [검색하기] 버튼을 눌러주세요.</div>
      )}
      
      {!isLeaf && categories.length === 0 && (
        <div style={styles.emptyText}>데이터가 없습니다.</div>
      )}
    </div>
  );
}

// --- 내부 아이템 컴포넌트 ---
function GlobalCategoryItem({ 
  name, 
  onClick, 
  isMobile, 
  theme 
}: { 
  name: string, 
  onClick: () => void, 
  isMobile: boolean,
  theme: { color: string; bg: string }
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      onClick={onClick} 
      onMouseEnter={() => setIsHovered(true)} 
      onMouseLeave={() => setIsHovered(false)} 
      style={{ 
        fontSize: isMobile ? '13px' : '14px', 
        color: (isHovered && !isMobile) ? theme.color : '#4b5563', // 플랫폼 컬러 적용
        cursor: 'pointer', 
        padding: isMobile ? '3px 12px' : '12px 16px', 
        borderRadius: '12px', 
        border: `1px solid ${(isHovered && !isMobile) ? `${theme.color}30` : '#f9fafb'}`, 
        backgroundColor: (isHovered && !isMobile) ? theme.bg : 'transparent', // 플랫폼 배경색 적용
        transition: 'all 0.2s ease', 
        display: 'flex', 
        alignItems: 'center' 
      }}
    >
      <span style={{ 
        width: '6px', 
        height: '6px', 
        backgroundColor: (isHovered && !isMobile) ? theme.color : '#e5e7eb', 
        borderRadius: '50%', 
        marginRight: '8px', 
        transition: 'background-color 0.2s' 
      }} />
      {name}
    </div>
  );
}