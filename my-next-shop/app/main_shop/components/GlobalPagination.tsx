'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { CaretDoubleLeft, CaretLeft, CaretRight, CaretDoubleRight } from '@phosphor-icons/react';

interface GlobalPaginationProps {
  currentPage: number;
  pageCount: number;
  /**
   * 페이지 이동 시 별도의 로직(예: API 재호출)이 필요한 경우 사용합니다.
   * 전달하지 않으면 현재 URL의 쿼리 파라미터를 자동으로 업데이트합니다.
   */
  onPageChange?: (page: number) => void;
  /** 쿼리 파라미터 키 이름 (기본값: 'page') */
  paramName?: string;
  /** 'compact': 목록 상단용 작은 크기 (직접 입력 이동 칸 숨김) */
  size?: 'default' | 'compact';
}

export default function GlobalPagination({ 
  currentPage, 
  pageCount, 
  onPageChange, 
  paramName = 'page',
  size = 'default',
}: GlobalPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [inputPage, setInputPage] = useState(currentPage);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setInputPage(currentPage);
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    const targetPage = Math.max(1, Math.min(page, pageCount));
    
    if (onPageChange) {
      onPageChange(targetPage);
      return;
    }

    // 현재 경로(pathname)를 유지하면서 쿼리 파라미터만 스마트하게 교체
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, targetPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  // 5개 단위 페이지 그룹 계산
  const pages = useMemo(() => {
    const visiblePageCount = isMobile ? 3 : 5;
    let startPage = Math.max(1, currentPage - (isMobile ? 1 : 2));
    let endPage = Math.min(pageCount, startPage + visiblePageCount - 1);
    
    if (endPage - startPage < visiblePageCount - 1) {
      startPage = Math.max(1, endPage - (visiblePageCount - 1));
    }

    const result = [];
    for (let i = startPage; i <= endPage; i++) {
      result.push(i);
    }
    return result;
  }, [currentPage, pageCount, isMobile]);

  if (pageCount <= 0) return null;

  const isCompact = size === 'compact';
  const jumpBack = currentPage <= 5;
  const jumpForward = currentPage > pageCount - 5;

  // 🌟 색은 부모의 --shop-* CSS 변수(shopTheme.ts)를 이어받습니다. 없으면 기본(인디고)색.
  return (
    <nav className={`gp-root ${isCompact ? 'gp-compact' : ''}`} aria-label="페이지 이동">
      <style>{GP_STYLES}</style>
      <div className="gp-bar">
        <button type="button" className="gp-nav" onClick={() => handlePageChange(1)} disabled={currentPage === 1} aria-label="첫 페이지" title="첫 페이지">
          <CaretDoubleLeft weight="bold" />
        </button>
        <button type="button" className="gp-nav" onClick={() => handlePageChange(currentPage - 5)} disabled={jumpBack} aria-label="이전 5페이지" title="이전 5페이지">
          <CaretLeft weight="bold" />
        </button>

        <div className="gp-pages">
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              className={`gp-page ${p === currentPage ? 'active' : ''}`}
              onClick={() => handlePageChange(p)}
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p}
            </button>
          ))}
        </div>

        <button type="button" className="gp-nav" onClick={() => handlePageChange(currentPage + 5)} disabled={jumpForward} aria-label="다음 5페이지" title="다음 5페이지">
          <CaretRight weight="bold" />
        </button>
        <button type="button" className="gp-nav" onClick={() => handlePageChange(pageCount)} disabled={currentPage === pageCount} aria-label="마지막 페이지" title="마지막 페이지">
          <CaretDoubleRight weight="bold" />
        </button>
      </div>

      {/* 직접 페이지 입력 이동 (compact에서는 숨김) */}
      {!isCompact && (
        <form
          className="gp-jump"
          onSubmit={(e) => { e.preventDefault(); handlePageChange(inputPage); }}
        >
          <input
            type="number"
            className="gp-jump-input"
            min={1}
            max={pageCount}
            value={inputPage}
            onChange={(e) => setInputPage(Number(e.target.value))}
            aria-label="이동할 페이지"
          />
          <span className="gp-jump-total">/ {pageCount.toLocaleString()}</span>
          <button type="submit" className="gp-jump-btn">이동</button>
        </form>
      )}
    </nav>
  );
}

const GP_STYLES = `
  .gp-root {
    display: flex; align-items: center; justify-content: center; flex-wrap: wrap;
    gap: 14px;
    max-width: 100%;
    font-family: 'Pretendard', 'Noto Sans KR', sans-serif;
    --gp-accent: var(--shop-brand, #4f57c9);
    --gp-from: var(--shop-from, #6a72de);
    --gp-to: var(--shop-to, #4f57c9);
    --gp-shadow: var(--shop-shadow, rgba(79, 87, 201, 0.45));
    --gp-bg: var(--shop-brand-bg, #f3f3fe);
  }
  .gp-bar, .gp-jump {
    display: flex; align-items: center;
    padding: 6px;
    border-radius: 18px;
    background: #ffffff;
    border: 1px solid #edf0f4;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 14px 30px -24px rgba(15, 23, 42, 0.35);
    box-sizing: border-box;
    max-width: 100%;
  }
  .gp-bar { gap: 2px; }
  .gp-pages { display: flex; align-items: center; gap: 4px; margin: 0 6px; padding: 0 6px; border-left: 1px solid #f0f2f5; border-right: 1px solid #f0f2f5; }
  .gp-nav, .gp-page {
    min-width: 42px; height: 42px; padding: 0 10px;
    display: flex; align-items: center; justify-content: center;
    border: none; border-radius: 12px;
    background: transparent;
    font-family: inherit; font-variant-numeric: tabular-nums;
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
    box-sizing: border-box;
  }
  .gp-nav { color: #64748b; font-size: 15px; }
  .gp-nav svg { fill: currentColor; }
  .gp-nav:hover:not(:disabled) { background: #f4f6f8; color: #0f172a; }
  .gp-nav:disabled { color: #d3d9e1; cursor: default; }
  .gp-page { font-size: 15.5px; font-weight: 600; color: #475569; }
  .gp-page:hover:not(.active) { background: var(--gp-bg); color: var(--gp-accent); }
  .gp-page.active {
    color: #ffffff; font-weight: 800;
    background: linear-gradient(145deg, var(--gp-from) 0%, var(--gp-to) 100%);
    box-shadow: 0 8px 16px -8px var(--gp-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.3);
    cursor: default;
  }
  .gp-nav:focus-visible, .gp-page:focus-visible, .gp-jump-btn:focus-visible { outline: 2px solid var(--gp-accent); outline-offset: 2px; }

  .gp-jump { gap: 8px; padding: 6px 6px 6px 8px; }
  .gp-jump-input {
    width: 64px; height: 42px;
    border-radius: 12px;
    border: 1px solid #e6e9ee;
    background: #f7f8fa;
    text-align: center;
    font-family: inherit; font-size: 15.5px; font-weight: 700; color: #0f172a;
    outline: none; box-sizing: border-box;
    -moz-appearance: textfield;
    transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
  }
  .gp-jump-input::-webkit-outer-spin-button, .gp-jump-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .gp-jump-input:focus { background: #ffffff; border-color: var(--gp-accent); box-shadow: 0 0 0 3px var(--gp-bg); }
  .gp-jump-total { font-size: 14px; font-weight: 600; color: #64748b; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .gp-jump-btn {
    height: 42px; padding: 0 18px;
    border: none; border-radius: 12px;
    font-family: inherit; font-size: 14.5px; font-weight: 800; color: #ffffff;
    background: #1e293b;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.2s ease;
  }
  .gp-jump-btn:hover { background: #0f172a; transform: translateY(-1px); }

  /* 목록 상단용 작은 크기 */
  .gp-compact .gp-bar { padding: 4px; border-radius: 14px; box-shadow: none; }
  .gp-compact .gp-nav, .gp-compact .gp-page { min-width: 34px; height: 34px; padding: 0 8px; border-radius: 10px; font-size: 13.5px; }
  .gp-compact .gp-pages { margin: 0 4px; padding: 0 4px; gap: 2px; }

  @media (max-width: 768px) {
    .gp-root { gap: 10px; }
    .gp-bar { padding: 4px; border-radius: 14px; }
    .gp-nav, .gp-page { min-width: 34px; height: 38px; padding: 0 6px; border-radius: 10px; font-size: 14px; }
    .gp-pages { margin: 0 3px; padding: 0 3px; gap: 2px; }
    .gp-jump { padding: 4px 4px 4px 6px; border-radius: 14px; }
    .gp-jump-input { width: 56px; height: 38px; font-size: 14px; }
    .gp-jump-total { font-size: 13px; }
    .gp-jump-btn { height: 38px; padding: 0 14px; font-size: 13.5px; }
  }
`;
