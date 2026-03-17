'use client';

import React, { useState, useEffect } from 'react';

interface SimplePaginationProps {
  currentPage: number;
  onPageChange: (newPage: number) => void;
}

// --- 1. Sub-Components (외부 정의로 안정성 확보) ---
const ChevronLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export default function GlobalSimplePagination({
  currentPage,
  onPageChange,
}: SimplePaginationProps) {
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- 2. Logic ---
  const isFirstPage = currentPage <= 1;
  
  const handlePrev = () => !isFirstPage && onPageChange(currentPage - 1);
  const handleNext = () => onPageChange(currentPage + 1); // 다음은 항상 가능하게

  if (!mounted) return <div style={{ height: '56px' }} />;

  return (
    <div style={styles.wrapper}>
      <style>{hoverEffectStyles}</style>

      {/* [이전] 버튼 */}
      <button
        className="miku-page-btn"
        onClick={handlePrev}
        disabled={isFirstPage}
        style={getDynamicBtnStyle(isFirstPage)}
      >
        <ChevronLeft />
        이전
      </button>

      {/* 현재 페이지 배지 (중앙 강조) */}
      <div style={styles.badgeContainer}>
        <div className="miku-page-badge" style={styles.badge}>
          {currentPage}
        </div>
        <div style={styles.badgeGlow} />
      </div>

      {/* [다음] 버튼 */}
      <button
        className="miku-page-btn"
        onClick={handleNext}
        style={getDynamicBtnStyle(false)}
      >
        다음
        <ChevronRight />
      </button>
    </div>
  );
}

// --- 3. Styles & Helpers ---

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px', // 간격을 조금 더 넓혀서 여유롭게
    padding: '10px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(12px)',
    borderRadius: '30px',
    width: 'fit-content',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    userSelect: 'none',
  },
  badgeContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 900,
    fontSize: '18px',
    zIndex: 2,
    background: 'linear-gradient(135deg, #ff007f 0%, #ff4f9a 100%)',
    boxShadow: '0 4px 15px rgba(255, 0, 127, 0.35)',
  },
  badgeGlow: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    backgroundColor: '#ff007f',
    filter: 'blur(12px)',
    opacity: 0.15,
    zIndex: 1,
  },
};

const getDynamicBtnStyle = (disabled: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '10px 24px',
  borderRadius: '18px',
  fontSize: '15px',
  fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: disabled ? '1px solid #f3f4f6' : '1px solid #e5e7eb',
  outline: 'none',
  minWidth: '110px',
  backgroundColor: disabled ? 'rgba(243, 244, 246, 0.5)' : '#ffffff',
  color: disabled ? '#d1d5db' : '#374151',
  boxShadow: disabled ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.04)',
});

const hoverEffectStyles = `
  .miku-page-btn:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.08);
    border-color: #ff007f55;
    color: #ff007f;
  }
  .miku-page-btn:not(:disabled):active {
    transform: translateY(0) scale(0.96);
  }
`;