"use client";

import React, { useState, useRef, useEffect } from 'react';

// --- 상수 데이터 ---
const COLOR_OPTIONS = [
  { name: '모두', code: '#fff', border: true },
  { name: '화이트계열', code: '#fff', border: true },
  { name: '블랙계열', code: '#000' },
  { name: '그레이계열', code: '#808080' },
  { name: '브라운계열', code: '#8b4513' },
  { name: '베이지계열', code: '#f5f5dc', border: true },
  { name: '그린계열', code: '#008000' },
  { name: '블루계열', code: '#0000ff' },
  { name: '퍼플계열', code: '#800080' },
  { name: '옐로우계열', code: '#ffff00', border: true },
  { name: '핑크계열', code: '#ffc0cb' },
  { name: '레드계열', code: '#ff0000' },
  { name: '오렌지계열', code: '#ffa500' },
];

// --- 인터페이스 정의 ---
interface MercariCategory {
  genreId: number;
  genreName: string;
  genreLevel: number;
}

export interface FilterState {
  sortOrder: string;
  keyword: string;
  excludeKeyword: string;
  brand: string;
  size: string;
  sellerType: string;    // 출품자
  minPrice: string;
  maxPrice: string;
  condition: string;     // 물품의 상태
  shippingPayer: string; // 배송료 부담
  hasDiscount: string;   // 할인 옵션
  listingType: string;   // 출품 형태
  colors: string[];
  shippingOption: string; // 배송 옵션
  status: string;        // 판매 상황
}

interface SidebarProps {
  currentPath: { id: number, name: string }[];
  levelOptions: { [key: number]: MercariCategory[] };
  onNavigate: (id: number, name: string, index: number) => void;
  onSearch: (filters: FilterState) => void;
}

interface CategoryGridProps {
  categories: MercariCategory[];
  isLeaf: boolean;
  isLoading: boolean;
  onMove: (id: number, name: string) => void;
}

export function MercariSidebar({ currentPath = [], levelOptions, onNavigate, onSearch }: SidebarProps) {
  const visibleLevels = Math.max(1, Math.min(5, currentPath.length + 1));
  // 1. 드롭다운 열림 상태를 관리하는 상태 추가 (상단에 배치)
  const [isColorOpen, setIsColorOpen] = useState(false);
  // 🚀 1. 색상 영역 전체를 감지하기 위한 Ref 추가
  const colorContainerRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<FilterState>({
    sortOrder: '기본순',
    keyword: '',
    excludeKeyword: '',
    brand: '',
    size: '모두',
    sellerType: '모두',
    minPrice: '',
    maxPrice: '',
    condition: '모두',
    shippingPayer: '모두',
    hasDiscount: '모두',
    listingType: '모두',
    colors: ['모두'],
    shippingOption: '모두',
    status: '모두'
  });

  // --- [추가] 사이드바 전체 드래그 스크롤 로직 ---
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isSidebarDragging, setIsSidebarDragging] = useState(false);
  const [sidebarStartY, setSidebarStartY] = useState(0);
  const [sidebarScrollTop, setSidebarScrollTop] = useState(0);

  // 🚀 드래그 스크롤을 위한 Ref 및 상태
  const colorListRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const handleChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const onSidebarDragStart = (e: React.MouseEvent) => {
    // input, select, button 등을 직접 클릭했을 때는 드래그가 시작되지 않도록 제외
    const target = e.target as HTMLElement;
    if (['INPUT', 'SELECT', 'BUTTON', 'OPTION'].includes(target.tagName)) return;

    if (!sidebarRef.current) return;
    setIsSidebarDragging(true);
    setSidebarStartY(e.pageY - sidebarRef.current.offsetTop);
    setSidebarScrollTop(sidebarRef.current.scrollTop);
  };

  const onSidebarDragMove = (e: React.MouseEvent) => {
    if (!isSidebarDragging || !sidebarRef.current) return;
    e.preventDefault();
    const y = e.pageY - sidebarRef.current.offsetTop;
    const walk = (y - sidebarStartY) * 1.5; // 스크롤 감도
    sidebarRef.current.scrollTop = sidebarScrollTop - walk;
  };

  const onSidebarDragEnd = () => {
    setIsSidebarDragging(false);
  };

  // 🚀 마우스 드래그 시작
  const onDragStart = (e: React.MouseEvent) => {
    e.stopPropagation(); // 🚀 부모(전체 스크롤)로 이벤트가 퍼지는 것을 차단!
    if (!colorListRef.current) return;
    setIsDragging(true);
    setStartY(e.pageY - colorListRef.current.offsetTop);
    setScrollTop(colorListRef.current.scrollTop);
  };

  // 🚀 드래그 중
  const onDragMove = (e: React.MouseEvent) => {
    if (!isDragging || !colorListRef.current) return;
    e.stopPropagation(); // 🚀 드래그 중에도 부모 스크롤이 반응하지 않게 차단!
    e.preventDefault(); 
    const y = e.pageY - colorListRef.current.offsetTop;
    const walk = (y - startY) * 1.5;
    colorListRef.current.scrollTop = scrollTop - walk;
  };

  // 🚀 드래그 종료
  const onDragEnd = (e: React.MouseEvent) => {
    e.stopPropagation(); // 🚀 마우스를 뗄 때도 부모에게 알리지 않음
    setIsDragging(false);
  };

  // 🚀 2. 색상 드롭다운 전용 외부 클릭 감지 로직
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 클릭한 곳이 colorContainerRef 외부라면 닫기
      if (colorContainerRef.current && !colorContainerRef.current.contains(event.target as Node)) {
        setIsColorOpen(false);
      }
    };

    if (isColorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColorOpen]);

  return (
    <aside style={{ width: '390px', display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'sans-serif' }}>
    
      <div style={{ backgroundColor: 'white', border: '1px solid #f3f4f6', borderRadius: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#111827', fontWeight: 900, fontSize: '20px', margin: 0 }}>상세검색</h2>
          <span style={{ backgroundColor: '#ff0038', color: 'white', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 900 }}>ADVANCED</span>
        </div>

        {/* 🚀 [수정] 메인 스크롤 영역에 드래그 이벤트 적용 */}
        <div 
          ref={sidebarRef}
          onMouseDown={onSidebarDragStart}
          onMouseMove={onSidebarDragMove}
          onMouseUp={onSidebarDragEnd}
          onMouseLeave={onSidebarDragEnd}
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            overflowY: 'auto', 
            maxHeight: '72vh',
            cursor: isSidebarDragging ? 'grabbing' : 'default', // 드래그 시 커서 변경
            userSelect: isSidebarDragging ? 'none' : 'auto', // 드래그 중 텍스트 선택 방지
            scrollBehavior: isSidebarDragging ? 'auto' : 'smooth'
          }}
        >

          {/* 🚀 1. 정렬 섹션 (키워드 위로 이동) */}
          <Section title="정렬">
            <SimpleDropdown 
              label="검색 결과 정렬" 
              options={['기본순', '가격 낮은 순', '가격 높은 순', '최신순']}
              value={filters.sortOrder}
              onSelect={(v) => handleChange('sortOrder', v)}
              placeholder="정렬 방식을 선택하세요"
            />
          </Section>
          
          <Section title="키워드">
            <CustomInput label="검색어" value={filters.keyword} onChange={(v) => handleChange('keyword', v)} placeholder="검색어 입력..." />
            <CustomInput label="제외할 단어" value={filters.excludeKeyword} onChange={(v) => handleChange('excludeKeyword', v)} placeholder="제외할 단어 입력..." />
          </Section>

          <Section title="카테고리">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {Array.from({ length: visibleLevels }).map((_, i) => {
                const level = i + 1;
                const options = levelOptions[level] || [];
                const currentLevelId = currentPath[i]?.id || "";
                
                return (
                  <CategoryDropdown
                    key={`level-${level}`}
                    label={level === 1 ? "대분류" : `${level}단계 분류`}
                    placeholder={level === 1 ? "대분류 선택" : "하위 분류 선택"}
                    options={options}
                    value={currentLevelId.toString()}
                    onSelect={(id, name) => onNavigate(id, name, i)}
                  />
                );
              })}
            </div>
          </Section>

          <Section title="출품자">
            <CapsuleGroup options={['모두', '개인', '메루카리샵']} current={filters.sellerType} onChange={(v) => handleChange('sellerType', v)} />
          </Section>

          <Section title="가격대">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PriceInput value={filters.minPrice} onChange={(v) => handleChange('minPrice', v)} placeholder="Min" />
              <span style={{ color: '#d1d5db' }}>~</span>
              <PriceInput value={filters.maxPrice} onChange={(v) => handleChange('maxPrice', v)} placeholder="Max" />
            </div>
          </Section>

          <Section title="물품의 상태">
            <SimpleDropdown
              label="상태 선택"
              options={['모두', '신품, 미사용', '미사용에 가까움', '눈에 띄는 흠집 없음', '다소 흠집 있음', '전반적으로 나쁨']}
              value={filters.condition}
              onSelect={(v) => handleChange('condition', v)}
              placeholder="물품 상태를 선택하세요"
            />
          </Section>

          <Section title="배송료 부담">
            <CapsuleGroup options={['모두', '배송비 포함', '배송비 제외']} current={filters.shippingPayer} onChange={(v) => handleChange('shippingPayer', v)} />
          </Section>

          <Section title="할인 옵션">
            <CapsuleGroup options={['모두', '할인 대상 상품']} current={filters.hasDiscount} onChange={(v) => handleChange('hasDiscount', v)} />
          </Section>

          <Section title="출품 형태">
            <CapsuleGroup options={['모두', '경매']} current={filters.listingType} onChange={(v) => handleChange('listingType', v)} />
          </Section>

          <Section title="색상">
            <div ref={colorContainerRef} style={{ position: 'relative' }}>
              {/* 선택된 색상 표시 버튼 */}
              <div
                onClick={() => setIsColorOpen(!isColorOpen)}
                style={{
                  width: '100%', padding: '12px 16px', backgroundColor: '#f9fafb',
                  borderRadius: '16px', fontSize: '13px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  border: isColorOpen ? '1px solid #ff0038' : '1px solid transparent',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%', border: '1px solid #efefef',
                  backgroundColor: COLOR_OPTIONS.find(c => c.name === (filters.colors[0] || '모두'))?.code || 'white'
                }} />
                <span style={{ flex: 1, fontWeight: 600 }}>{filters.colors[0] || '모두'}</span>
                <span style={{ color: '#d1d5db', fontSize: '10px' }}>{isColorOpen ? '▲' : '▼'}</span>
              </div>

              {/* 🚀 드래그 가능한 색상 리스트 */}
              {isColorOpen && (
                <div 
                  ref={colorListRef}
                  onMouseDown={onDragStart}
                  onMouseMove={onDragMove}
                  onMouseUp={onDragEnd}
                  onMouseLeave={onDragEnd}
                  style={{
                    position: 'absolute', 
                    top: '55px', 
                    left: 0, 
                    width: '100%',
                    // 💡 배경색을 확실한 흰색으로, z-index를 높게 설정
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '20px',
                    boxShadow: '0 15px 35px rgba(0,0,0,0.2)', 
                    zIndex: 1000, // 최상단으로 올림
                    maxHeight: '280px', 
                    overflowY: 'auto', 
                    padding: '12px 0',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                  }}
                >
                  {COLOR_OPTIONS.map((c) => (
                    <div
                      key={c.name}
                      onClick={() => {
                        if (!isDragging) {
                          handleChange('colors', [c.name]);
                          setIsColorOpen(false);
                        }
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fff5f6'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      style={{
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '14px', 
                        padding: '12px 20px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        border: c.border ? '1px solid #eee' : 'none', 
                        backgroundColor: c.code,
                      }} />
                      <span style={{ 
                        fontSize: '14px', 
                        color: filters.colors[0] === c.name ? '#ff0038' : '#333',
                        fontWeight: filters.colors[0] === c.name ? '900' : '500'
                      }}>
                        {c.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          <Section title="배송 옵션">
            <CapsuleGroup options={['모두', '익명 배송', '수취 옵션', '옵션 없음']} current={filters.shippingOption} onChange={(v) => handleChange('shippingOption', v)} />
          </Section>

          <Section title="판매 상황" last>
             <CapsuleGroup options={['모두', '판매중', '품절']} current={filters.status} onChange={(v) => handleChange('status', v)} />
          </Section>
        </div>

        <div style={{ padding: '24px', borderTop: '1px solid #f9fafb' }}>
          <button 
            onClick={() => onSearch(filters)}
            style={{ width: '100%', padding: '18px 0', background: 'linear-gradient(to right, #ff0038, #ff4d4d)', color: 'white', fontWeight: 900, borderRadius: '24px', border: 'none', cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(255, 0, 56, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}
          >
            <span>조건으로 검색하기 🔍</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

// --- 보조 컴포넌트 (내부 인라인 스타일) ---

function Section({ title, children, last }: { title: string, children: React.ReactNode, last?: boolean }) {
  return (
    <div style={{ padding: '24px', borderBottom: last ? 'none' : '1px solid #f9fafb' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
        <span style={{ width: '6px', height: '18px', backgroundColor: '#ff0038', borderRadius: '10px' }} />
        {title}
      </h3>
      {children}
    </div>
  );
}

function CustomInput({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder: string }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '6px', paddingLeft: '4px', textTransform: 'uppercase' }}>{label}</p>
      <input 
        type="text" 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '14px 16px', backgroundColor: '#f9fafb', border: '1px solid transparent',
          borderRadius: '16px', outline: 'none', fontSize: '13px', boxSizing: 'border-box', transition: 'background-color 0.2s'
        }}
        onFocus={(e) => e.currentTarget.style.backgroundColor = 'white'}
        onBlur={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
      />
    </div>
  );
}

function PriceInput({ value, onChange, placeholder }: { value: string, onChange: (v: string) => void, placeholder: string }) {
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#d1d5db', fontWeight: 'bold', fontSize: '12px' }}>¥</span>
      <input 
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '14px 12px 14px 30px', backgroundColor: '#f9fafb', border: 'none',
          borderRadius: '16px', outline: 'none', fontSize: '13px', boxSizing: 'border-box'
        }}
      />
    </div>
  );
}

function CapsuleGroup({ options, current, onChange, label }: { options: string[], current: string, onChange: (v: string) => void, label?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {label && (
        <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', paddingLeft: '4px' }}>
          {label}
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              // 🚀 글자 크기를 11px -> 14px로 변경
              fontSize: '14px', 
              fontWeight: 'bold',
              // 🚀 여백 조절 (상하 10px, 좌우 18px)
              padding: '10px 18px', 
              borderRadius: '24px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: current === opt ? '#ff0038' : '#f9fafb',
              color: current === opt ? 'white' : '#6b7280',
              transition: 'all 0.2s',
              // 클릭 시 살짝 작아지는 효과 (선택사항)
              transform: 'scale(1)',
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function SimpleDropdown({ 
  label, 
  options, 
  value, 
  onSelect, 
  placeholder 
}: { 
  label: string, 
  options: string[], 
  value: string, 
  onSelect: (val: string) => void,
  placeholder: string 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  // 🚀 전체 컨테이너를 감지하기 위한 Ref 추가
  const containerRef = useRef<HTMLDivElement>(null);
  // 드래그 상태 관리
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const onDragStart = (e: React.MouseEvent) => {
    e.stopPropagation(); // 전체 스크롤 방지
    if (!listRef.current) return;
    setIsDragging(true);
    setStartY(e.pageY - listRef.current.offsetTop);
    setScrollTop(listRef.current.scrollTop);
  };

  const onDragMove = (e: React.MouseEvent) => {
    if (!isDragging || !listRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    const y = e.pageY - listRef.current.offsetTop;
    const walk = (y - startY) * 1.5;
    listRef.current.scrollTop = scrollTop - walk;
  };

  const onDragEnd = (e: React.MouseEvent) => {
    if(isDragging) e.stopPropagation();
    setIsDragging(false);
  };

  // 🚀 외부 클릭 감지 로직 추가
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 클릭된 요소가 드롭다운 컨테이너 외부에 있다면 닫기
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} style={{ marginBottom: '12px', position: 'relative' }}>
      {label && <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '6px', paddingLeft: '4px' }}>{label}</p>}
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', padding: '14px 16px', backgroundColor: '#f9fafb',
          borderRadius: '16px', fontSize: '14px', cursor: 'pointer', // 글자 크기 14px로 반영
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: isOpen ? '1px solid #ff0038' : '1px solid transparent',
          boxSizing: 'border-box', transition: 'all 0.2s'
        }}
      >
        <span style={{ color: value && value !== '모두' ? '#111827' : '#9ca3af', fontWeight: value && value !== '모두' ? 600 : 400 }}>
          {value || placeholder}
        </span>
        <span style={{ color: '#d1d5db', fontSize: '10px' }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div
          ref={listRef}
          onMouseDown={onDragStart}
          onMouseMove={onDragMove}
          onMouseUp={onDragEnd}
          onMouseLeave={onDragEnd}
          style={{
            position: 'absolute', top: '75px', left: 0, width: '100%',
            backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '20px',
            boxShadow: '0 15px 35px rgba(0,0,0,0.15)', zIndex: 110,
            maxHeight: '250px', overflowY: 'auto', padding: '8px 0',
            cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none'
          }}
        >
          {options.map((opt) => (
            <div
              key={opt}
              onClick={() => {
                if (!isDragging) {
                  onSelect(opt);
                  setIsOpen(false);
                }
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fff5f6'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              style={{
                padding: '12px 20px', fontSize: '14px', cursor: 'pointer',
                color: value === opt ? '#ff0038' : '#4b5563',
                fontWeight: value === opt ? 'bold' : 'normal',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <div style={{ 
                width: '6px', height: '6px', borderRadius: '50%', 
                backgroundColor: value === opt ? '#ff0038' : '#e5e7eb' 
              }} />
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- 카테고리 전용 커스텀 드롭다운 컴포넌트 ---
function CategoryDropdown({ 
  label, 
  options, 
  value, 
  onSelect, 
  placeholder 
}: { 
  label: string, 
  options: MercariCategory[], 
  value: string, 
  onSelect: (id: number, name: string) => void,
  placeholder: string 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  
  // 드래그 상태 관리
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const currentLabel = options.find(opt => opt.genreId.toString() === value)?.genreName || placeholder;

  const onDragStart = (e: React.MouseEvent) => {
    e.stopPropagation(); // 전체 스크롤 방지
    if (!listRef.current) return;
    setIsDragging(true);
    setStartY(e.pageY - listRef.current.offsetTop);
    setScrollTop(listRef.current.scrollTop);
  };

  const onDragMove = (e: React.MouseEvent) => {
    if (!isDragging || !listRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    const y = e.pageY - listRef.current.offsetTop;
    const walk = (y - startY) * 1.5;
    listRef.current.scrollTop = scrollTop - walk;
  };

  const onDragEnd = (e: React.MouseEvent) => {
    if(isDragging) e.stopPropagation();
    setIsDragging(false);
  };

  return (
    <div style={{ marginBottom: '12px', position: 'relative' }}>
      <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '6px', paddingLeft: '4px' }}>{label}</p>
      
      {/* 드롭다운 버튼 */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', padding: '14px 16px', backgroundColor: '#f9fafb',
          borderRadius: '16px', fontSize: '13px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: isOpen ? '1px solid #ff0038' : '1px solid transparent',
          boxSizing: 'border-box', transition: 'all 0.2s'
        }}
      >
        <span style={{ color: value ? '#111827' : '#9ca3af', fontWeight: value ? 600 : 400 }}>{currentLabel}</span>
        <span style={{ color: '#d1d5db', fontSize: '10px' }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {/* 드래그 가능한 리스트 박스 */}
      {isOpen && (
        <div
          ref={listRef}
          onMouseDown={onDragStart}
          onMouseMove={onDragMove}
          onMouseUp={onDragEnd}
          onMouseLeave={onDragEnd}
          style={{
            position: 'absolute', top: '75px', left: 0, width: '100%',
            backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '20px',
            boxShadow: '0 15px 35px rgba(0,0,0,0.15)', zIndex: 110,
            maxHeight: '250px', overflowY: 'auto', padding: '8px 0',
            cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none'
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.genreId}
              onClick={() => {
                if (!isDragging) {
                  onSelect(opt.genreId, opt.genreName);
                  setIsOpen(false);
                }
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fff5f6'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              style={{
                padding: '12px 20px', fontSize: '13px', cursor: 'pointer',
                color: value === opt.genreId.toString() ? '#ff0038' : '#4b5563',
                fontWeight: value === opt.genreId.toString() ? 'bold' : 'normal',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <div style={{ 
                width: '6px', height: '6px', borderRadius: '50%', 
                backgroundColor: value === opt.genreId.toString() ? '#ff0038' : '#e5e7eb' 
              }} />
              {opt.genreName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 🚀 2. 메인 카테고리 그리드 컴포넌트
export default function MercariCategoryGrid({ 
  categories, 
  isLeaf, 
  isLoading, 
  onMove 
}: CategoryGridProps) {

  const styles = {
    loadingWrapper: {
      height: '160px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    spinner: {
      height: '32px',
      width: '32px',
      border: '4px solid #fce7f3',
      borderTopColor: '#ff007f',
      borderRadius: '50%',
      // 💡 spin 애니메이션은 글로벌 CSS에 정의되어 있어야 작동합니다.
      animation: 'spin 1s linear infinite'
    },
    gridContainer: {
      display: 'grid',
      // 💡 반응형을 위해 auto-fill 사용 (화면 크기에 맞춰 열 개수 조절)
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: '12px',
      animation: 'fadeIn 0.5s ease-in-out'
    },
    messageText: {
      textAlign: 'center' as const,
      padding: '40px 0',
      color: '#9ca3af',
      fontSize: '14px',
      fontStyle: 'italic' as const
    },
    emptyText: {
      textAlign: 'center' as const,
      padding: '40px 0',
      color: '#d1d5db',
      fontSize: '14px'
    }
  };

  if (isLoading) return (
    <div style={styles.loadingWrapper}>
      <div style={styles.spinner} />
    </div>
  );

  return (
    <div style={{ width: '100%' }}>
      {!isLeaf && categories.length > 0 ? (
        <div style={styles.gridContainer}>
          {categories.map((cat) => (
            <CategoryItem 
              key={cat.genreId}
              name={cat.genreName}
              onClick={() => onMove(cat.genreId, cat.genreName)}
            />
          ))}
        </div>
      ) : isLeaf ? (
        <div style={styles.messageText}>
          최하위 카테고리입니다. 왼쪽 상세 검색의 [검색하기] 버튼을 눌러주세요.
        </div>
      ) : (
        <div style={styles.emptyText}>데이터가 없습니다.</div>
      )}
    </div>
  );
}

// --- [추가] 개별 카테고리 아이템 컴포넌트 (호버 효과용) ---
function CategoryItem({ name, onClick }: { name: string, onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        fontSize: '14px',
        color: isHovered ? '#ff007f' : '#4b5563',
        cursor: 'pointer',
        padding: '12px 16px',
        borderRadius: '12px',
        border: `1px solid ${isHovered ? '#fce7f3' : '#f9fafb'}`,
        backgroundColor: isHovered ? '#fff1f2' : 'transparent',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <span style={{
        width: '6px',
        height: '6px',
        backgroundColor: isHovered ? '#ff007f' : '#e5e7eb',
        borderRadius: '50%',
        marginRight: '8px',
        transition: 'background-color 0.2s'
      }} />
      {name}
    </div>
  );
}