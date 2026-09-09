'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';

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
}

export default function GlobalPagination({ 
  currentPage, 
  pageCount, 
  onPageChange, 
  paramName = 'page' 
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

  const navButtonStyle = (disabled: boolean): React.CSSProperties => ({
    minWidth: isMobile ? '36px' : '52px',
    height: isMobile ? '42px' : '52px',
    padding: isMobile ? '0 6px' : '0 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: 'transparent',
    color: disabled ? '#e5e7eb' : '#4b5563',
    fontSize: isMobile ? '12px' : '15px',
    fontWeight: '600',
    cursor: disabled ? 'default' : 'pointer',
    transition: 'all 0.2s ease',
  });

  if (pageCount <= 0) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: isMobile ? '12px' : '24px',
      marginTop: isMobile ? '28px' : '60px',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '30px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '100%' }}>
        
        {/* 네비게이션 버튼 그룹 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '2px' : '6px',
          backgroundColor: '#fff',
          padding: isMobile ? '5px' : '10px',
          maxWidth: '100%',
          boxSizing: 'border-box',
          borderRadius: '20px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
          border: '1px solid #f0f0f0'
        }}>
          
          <button onClick={() => handlePageChange(1)} disabled={currentPage === 1} style={navButtonStyle(currentPage === 1)}>
            처음
          </button>

          <button onClick={() => handlePageChange(currentPage - 5)} disabled={currentPage <= 5} style={{ ...navButtonStyle(currentPage <= 5), fontSize: isMobile ? '16px' : '20px' }}>
            &lsaquo;
          </button>

          <div style={{ display: 'flex', gap: isMobile ? '2px' : '6px', margin: isMobile ? '0 2px' : '0 10px' }}>
            {pages.map((p) => (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                style={{
                  minWidth: isMobile ? '36px' : '52px',
                  height: isMobile ? '42px' : '52px',
                  borderRadius: '14px',
                  border: 'none',
                  fontSize: isMobile ? '14px' : '18px',
                  fontWeight: p === currentPage ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: p === currentPage ? '#2563eb' : 'transparent',
                  color: p === currentPage ? '#fff' : '#4b5563',
                  boxShadow: p === currentPage ? '0 10px 15px -3px rgba(37, 99, 235, 0.3)' : 'none',
                }}
              >
                {p}
              </button>
            ))}
          </div>

          <button onClick={() => handlePageChange(currentPage + 5)} disabled={currentPage > pageCount - 5} style={{ ...navButtonStyle(currentPage > pageCount - 5), fontSize: isMobile ? '16px' : '20px' }}>
            &rsaquo;
          </button>

          <button onClick={() => handlePageChange(pageCount)} disabled={currentPage === pageCount} style={navButtonStyle(currentPage === pageCount)}>
            끝
          </button>
        </div>

        {/* 직접 페이지 입력 이동 */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          backgroundColor: '#fff',
          padding: isMobile ? '5px 6px' : '10px 20px',
          borderRadius: '20px',
          border: '1px solid #f0f0f0',
          boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
          gap: isMobile ? '5px' : '15px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              value={inputPage}
              onChange={(e) => setInputPage(Number(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && handlePageChange(inputPage)}
              style={{
                width: isMobile ? '58px' : '80px',
                height: isMobile ? '40px' : '46px',
                border: '2px solid #eee',
                borderRadius: '12px',
                textAlign: 'center',
                fontSize: isMobile ? '15px' : '18px',
                fontWeight: '600',
                outline: 'none'
              }}
            />
            <span style={{ fontSize: isMobile ? '13px' : '16px', color: '#999' }}>/ {pageCount.toLocaleString()}</span>
          </div>
          <button
            onClick={() => handlePageChange(inputPage)}
            style={{
              height: isMobile ? '40px' : '46px',
              padding: isMobile ? '0 14px' : '0 25px',
              backgroundColor: '#111',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: isMobile ? '13px' : '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            이동
          </button>
        </div>
      </div>
    </div>
  );
}