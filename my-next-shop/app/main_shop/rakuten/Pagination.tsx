'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react'; // 상단에 추가

interface Props {
  currentPage: number;
  pageCount: number;
}

export default function Pagination({ currentPage, pageCount, sort }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inputPage, setInputPage] = useState(currentPage);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > pageCount) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/main_shop/rakuten?${params.toString()}`);
  };

  // 기존 EJS 로직: 시작 및 끝 페이지 계산
  let startPage = Math.max(1, currentPage - 4);
  let endPage = Math.min(pageCount, startPage + 9);
  if (endPage - startPage < 9) startPage = Math.max(1, endPage - 9);

  const pages = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  // 공통 스타일 정의
  const buttonBaseStyle: React.CSSProperties = {
    padding: '8px 14px',
    border: 'none',
    borderRight: '1px solid #ddd',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '40px',
      fontFamily: 'sans-serif'
    }}>
      
      {/* 1. 페이지 번호 네비게이션 */}
      <div style={{
        display: 'flex',
        border: '1px solid #ddd',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        {/* 1. 처음으로/이전 버튼들 */}
        {currentPage > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              style={{ ...buttonBaseStyle, borderRight: '1px solid #ddd' }}
            >
             처음
            </button>
          </>
        )}

        {/* 2. 숫자 페이지 버튼들 */}
        {pages.map((p, index) => {
          // 마지막 숫자 버튼이고 뒤에 화살표(», »»)가 없다면 테두리 제거
          const isLastElement = index === pages.length - 1 && currentPage >= pageCount;
          return (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              style={{
                ...buttonBaseStyle,
                backgroundColor: p === currentPage ? '#337ab7' : '#fff',
                color: p === currentPage ? '#fff' : '#337ab7',
                fontWeight: p === currentPage ? 'bold' : 'normal',
                borderRight: isLastElement ? 'none' : '1px solid #ddd'
              }}
            >
              {p}
            </button>
          );
        })}

        {/* 3. 다음/끝으로 버튼들 */}
        {currentPage < pageCount && (
        <>
          <button
            onClick={() => handlePageChange(Math.min(pageCount, currentPage + 10))}
            style={{ 
              ...buttonBaseStyle, 
              borderRight: '1px solid #ddd' // 이 선이 이미지에서 빠져있던 구분선입니다.
            }}
          >
            &raquo;
          </button>
          <button
            onClick={() => handlePageChange(pageCount)}
            style={{ 
              ...buttonBaseStyle, 
              borderRight: 'none' // 전체 컨테이너의 오른쪽 테두리와 겹치므로 제거
            }}
          >
            끝
          </button>
        </>
      )}
      </div>

      {/* 2. 직접 이동 입력창 및 버튼 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="number"
          min="1"
          max={pageCount}
          // value와 onChange를 사용하여 상태와 동기화
          value={inputPage}
          onChange={(e) => setInputPage(Number(e.target.value))}
          style={{
            width: '60px',
            padding: '6px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            textAlign: 'right',
            outline: 'none',
            fontSize: '14px'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handlePageChange(inputPage);
          }}
        />
        
        <span style={{ fontSize: '14px', color: '#666' }}>
          / {pageCount.toLocaleString()} 페이지
        </span>

        {/* 새롭게 추가된 이동 버튼 */}
        <button
          onClick={() => handlePageChange(inputPage)}
          style={{
            padding: '6px 12px',
            backgroundColor: '#f8f8f8',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '13px',
            cursor: 'pointer',
            color: '#333',
            marginLeft: '5px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eee'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f8f8'}
        >
          이동
        </button>
      </div>
    </div>
  );
}