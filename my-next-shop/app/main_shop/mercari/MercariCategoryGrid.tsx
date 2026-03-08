"use client";

import React, { useState, useRef, useEffect } from 'react';

// --- 모바일 감지 커스텀 훅 (성능 최적화를 위해 상단에 한 번만 선언) ---
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize(); // 초기화
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}

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
  sellerType: string;
  minPrice: string;
  maxPrice: string;
  condition: string;
  shippingPayer: string;
  hasDiscount: string;
  listingType: string;
  colors: string[];
  shippingOption: string;
  status: string;
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
  const isMobile = useIsMobile(); 

  // 🚀 모바일 드로어(Drawer) 상태 관리
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 🚀 스와이프 터치 좌표 추적 (가로, 세로 모두 추적하여 오작동 방지)
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchCurrentX = useRef(0);
  const touchCurrentY = useRef(0);

  const [openDropdownLevel, setOpenDropdownLevel] = useState<number | null>(null);
  const categoryAreaRef = useRef<HTMLDivElement>(null);

  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    '정렬': true, '키워드': true, '카테고리': true, '출품자': false,
    '가격대': false, '물품의 상태': false, '배송료 부담': false,
    '색상': false, '판매 상황': false,
  });
  
  const toggleSection = (title: string) => {
    setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const [isColorOpen, setIsColorOpen] = useState(false);
  const colorContainerRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<FilterState>({
    sortOrder: '기본순', keyword: '', excludeKeyword: '', brand: '',
    size: '모두', sellerType: '모두', minPrice: '', maxPrice: '',
    condition: '모두', shippingPayer: '모두', hasDiscount: '모두',
    listingType: '모두', colors: ['모두'], shippingOption: '모두', status: '모두'
  });

  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isSidebarDragging, setIsSidebarDragging] = useState(false);
  const [sidebarStartY, setSidebarStartY] = useState(0);
  const [sidebarScrollTop, setSidebarScrollTop] = useState(0);

  const colorListRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const handleChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // --- 스와이프 제스처 핸들러 ---
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchCurrentX.current = e.touches[0].clientX;
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    touchCurrentY.current = e.touches[0].clientY;
  };

  // 💡 드래그하여 열기
  const handleTouchEndOpen = () => {
    const deltaX = touchCurrentX.current - touchStartX.current;
    const deltaY = Math.abs(touchCurrentY.current - touchStartY.current);
    // 우측으로 40px 이상 이동했고, 세로 이동보다 가로 이동이 클 때만 열림
    if (deltaX > 40 && deltaX > deltaY) {
      setIsDrawerOpen(true);
    }
  };

  // 💡 드래그하여 닫기 (사이드바가 열려있을 때 왼쪽으로 스와이프)
  const handleTouchEndClose = () => {
    const deltaX = touchStartX.current - touchCurrentX.current;
    const deltaY = Math.abs(touchStartY.current - touchCurrentY.current);
    
    // 왼쪽으로 50px 이상 이동했고, 세로(스크롤) 이동보다 가로 이동 폭이 클 때 닫힘 (오작동 완벽 방지)
    if (deltaX > 50 && deltaX > deltaY) {
      setIsDrawerOpen(false);
    }
  };

  // 기존 드래그 스크롤 핸들러 (PC 환경용)
  const onSidebarDragStart = (e: React.MouseEvent) => {
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
    sidebarRef.current.scrollTop = sidebarScrollTop - (y - sidebarStartY) * 1.5;
  };

  const onSidebarDragEnd = () => setIsSidebarDragging(false);

  // 색상 리스트 드래그
  const onDragStart = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!colorListRef.current) return;
    setIsDragging(true);
    setStartY(e.pageY - colorListRef.current.offsetTop);
    setScrollTop(colorListRef.current.scrollTop);
  };

  const onDragMove = (e: React.MouseEvent) => {
    if (!isDragging || !colorListRef.current) return;
    e.stopPropagation(); e.preventDefault(); 
    const y = e.pageY - colorListRef.current.offsetTop;
    colorListRef.current.scrollTop = scrollTop - (y - startY) * 1.5;
  };

  const onDragEnd = (e: React.MouseEvent) => {
    e.stopPropagation(); setIsDragging(false);
  };

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (categoryAreaRef.current && !categoryAreaRef.current.contains(event.target as Node)) {
        setOpenDropdownLevel(null);
      }
    };
    if (openDropdownLevel !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [openDropdownLevel]);

  return (
    <>
      {/* 🚀 모바일 환경: 배경 딤(Dim) 처리 */}
      {isMobile && (
        <div 
          onClick={() => setIsDrawerOpen(false)} 
          style={{ 
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', 
            zIndex: 9998, opacity: isDrawerOpen ? 1 : 0, pointerEvents: isDrawerOpen ? 'auto' : 'none', transition: 'opacity 0.3s ease' 
          }} 
        />
      )}

      {/* 🚀 모바일 환경: "상세 검색 보기" 핸들 (왼쪽 상단으로 이동) */}
      {isMobile && !isDrawerOpen && (
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEndOpen}
          onClick={() => setIsDrawerOpen(true)} // 클릭(터치)으로도 바로 열림
          style={{ 
            position: 'fixed', 
            left: 0, 
            top: '80px', /* 🚀 50%에서 상단 80px로 변경 (헤더 높이에 따라 조절하세요) */
            zIndex: 9998, 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer' 
          }}
        >
          <div style={{
            padding: '16px 8px', backgroundColor: 'white', color: '#ff007f', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', borderTopRightRadius: '16px', borderBottomRightRadius: '16px', 
            boxShadow: '4px 0 12px rgba(0,0,0,0.15)', border: '1px solid #fce7f3', borderLeft: 'none', marginLeft: '-2px',
          }}>
            <span style={{ 
              fontSize: '13px', fontWeight: '900', writingMode: 'vertical-rl', 
              textOrientation: 'upright', letterSpacing: '4px' 
            }}>
              상세 검색 보기
            </span>
          </div>
        </div>
      )}

      {/* 🚀 사이드바 본체 (왼쪽 스와이프로 닫기 로직 적용) */}
      <aside 
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
        onTouchEnd={isMobile ? handleTouchEndClose : undefined}
        style={isMobile ? {
          position: 'fixed', top: 0, left: 0, bottom: 0, width: '85vw', maxWidth: '360px', zIndex: 9999,
          transform: isDrawerOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex', flexDirection: 'column'
        } : {
          width: '390px', display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'sans-serif' 
        }}
      >
        <div style={{ 
          backgroundColor: 'white', border: isMobile ? 'none' : '1px solid #f3f4f6', 
          borderRadius: isMobile ? '0 32px 32px 0' : '32px', 
          boxShadow: isMobile ? '10px 0 30px rgba(0,0,0,0.2)' : '0 25px 50px -12px rgba(0, 0, 0, 0.1)', 
          overflow: 'hidden', height: isMobile ? '100%' : 'auto', display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: isMobile ? '20px' : '24px', borderBottom: '1px solid #f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <h2 style={{ color: '#111827', fontWeight: 900, fontSize: isMobile ? '18px' : '20px', margin: 0 }}>상세검색</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ backgroundColor: '#ff0038', color: 'white', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 900 }}>ADVANCED</span>
              {/* 모바일 닫기 버튼 */}
              {isMobile && (
                <button onClick={() => setIsDrawerOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#9ca3af', cursor: 'pointer', padding: '0 4px' }}>✕</button>
              )}
            </div>
          </div>

          <div 
            ref={sidebarRef}
            onMouseDown={!isMobile ? onSidebarDragStart : undefined}
            onMouseMove={!isMobile ? onSidebarDragMove : undefined}
            onMouseUp={!isMobile ? onSidebarDragEnd : undefined}
            onMouseLeave={!isMobile ? onSidebarDragEnd : undefined}
            style={{ 
              display: 'flex', flexDirection: 'column', overflowY: 'auto', 
              flex: 1, 
              maxHeight: isMobile ? 'none' : '72vh', 
              cursor: isSidebarDragging ? 'grabbing' : 'default',
              userSelect: isSidebarDragging ? 'none' : 'auto', scrollBehavior: isSidebarDragging ? 'auto' : 'smooth',
              paddingBottom: '20px' 
            }}
          >
            {/* --- 필터 섹션들 시작 --- */}
            <Section title="정렬" isOpen={openSections['정렬']} onToggle={() => toggleSection('정렬')} isMobile={isMobile}>
              <SimpleDropdown label="검색 결과 정렬" options={['기본순', '가격 낮은 순', '가격 높은 순', '최신순']} value={filters.sortOrder} onSelect={(v: string) => handleChange('sortOrder', v)} placeholder="정렬 방식을 선택하세요" isMobile={isMobile} />
            </Section>
            
            <Section title="키워드" isOpen={openSections['키워드']} onToggle={() => toggleSection('키워드')} isMobile={isMobile}>
              <CustomInput label="검색어" value={filters.keyword} onChange={(v: string) => handleChange('keyword', v)} placeholder="검색어 입력..." isMobile={isMobile} />
              <CustomInput label="제외할 단어" value={filters.excludeKeyword} onChange={(v: string) => handleChange('excludeKeyword', v)} placeholder="제외할 단어 입력..." isMobile={isMobile} />
            </Section>

            <Section title="카테고리" isOpen={openSections['카테고리']} onToggle={() => toggleSection('카테고리')} isMobile={isMobile}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const level = i + 1;
                  const options = levelOptions[level] || [];
                  if (level > 1 && options.length === 0) return null;
                  const optionsWithNone = level > 1 ? [{ genreId: -1, genreName: '선택안함', genreLevel: level }, ...options] : options;

                  return (
                    <div key={`level-${level}`} style={{ position: 'relative', zIndex: 100 - i }}>
                      <CategoryDropdown
                        label={level === 1 ? "대분류" : `${level}단계 분류`}
                        placeholder={level === 1 ? "대분류 선택" : "하위 분류 선택"}
                        options={optionsWithNone}
                        value={currentPath[i]?.id.toString() || ""}
                        isOpen={openDropdownLevel === level}
                        onToggle={() => setOpenDropdownLevel(openDropdownLevel === level ? null : level)}
                        
                        // ✨ (id: number, name: string) 으로 타입 명시!
                        onSelect={(id: number, name: string) => {
                          setOpenDropdownLevel(null);
                          if (id === -1) {
                            const parent = currentPath[i - 1];
                            onNavigate(parent?.id || 0, parent?.name || "HOME", i - 1);
                          } else {
                            onNavigate(id, name, i);
                          }
                        }}
                        isMobile={isMobile}
                      />
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section title="출품자" isOpen={openSections['출품자']} onToggle={() => toggleSection('출품자')} isMobile={isMobile}>
              <CapsuleGroup options={['모두', '개인', '메루카리샵']} current={filters.sellerType} onChange={(v: string) => handleChange('sellerType', v)} isMobile={isMobile} />
            </Section>

            <Section title="가격대" isOpen={openSections['가격대']} onToggle={() => toggleSection('가격대')} isMobile={isMobile}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PriceInput value={filters.minPrice} onChange={(v: string) => handleChange('minPrice', v)} placeholder="Min" isMobile={isMobile} />
                <span style={{ color: '#d1d5db' }}>~</span>
                <PriceInput value={filters.maxPrice} onChange={(v: string) => handleChange('maxPrice', v)} placeholder="Max" isMobile={isMobile} />
              </div>
            </Section>

            <Section title="물품의 상태" isOpen={openSections['물품의 상태']} onToggle={() => toggleSection('물품의 상태')} isMobile={isMobile}>
              <SimpleDropdown label="상태 선택" options={['모두', '신품, 미사용', '미사용에 가까움', '눈에 띄는 흠집 없음', '다소 흠집 있음', '전반적으로 나쁨']} value={filters.condition} onSelect={(v: string) => handleChange('condition', v)} placeholder="물품 상태를 선택하세요" isMobile={isMobile} />
            </Section>

            <Section title="배송료 부담" isOpen={openSections['배송료 부담']} onToggle={() => toggleSection('배송료 부담')} isMobile={isMobile}>
              <CapsuleGroup options={['모두', '배송비 포함', '배송비 제외']} current={filters.shippingPayer} onChange={(v: string) => handleChange('shippingPayer', v)} isMobile={isMobile} />
            </Section>

            <Section title="할인 옵션" isOpen={openSections['할인 옵션']} onToggle={() => toggleSection('할인 옵션')} isMobile={isMobile}>
              <CapsuleGroup options={['모두', '할인 대상 상품']} current={filters.hasDiscount} onChange={(v: string) => handleChange('hasDiscount', v)} isMobile={isMobile} />
            </Section>

            <Section title="출품 형태" isOpen={openSections['출품 형태']} onToggle={() => toggleSection('출품 형태')} isMobile={isMobile}>
              <CapsuleGroup options={['모두', '경매']} current={filters.listingType} onChange={(v: string) => handleChange('listingType', v)} isMobile={isMobile} />
            </Section>

            <Section title="색상" isOpen={openSections['색상']} onToggle={() => toggleSection('색상')} isMobile={isMobile}>
              <div ref={colorContainerRef} style={{ position: 'relative' }}>
                <div
                  onClick={() => setIsColorOpen(!isColorOpen)}
                  style={{
                    width: '100%', padding: isMobile ? '10px 14px' : '12px 16px', backgroundColor: '#f9fafb', borderRadius: '16px', fontSize: isMobile ? '12px' : '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', border: isColorOpen ? '1px solid #ff0038' : '1px solid transparent', boxSizing: 'border-box'
                  }}
                >
                  <div style={{ width: isMobile ? '16px' : '18px', height: isMobile ? '16px' : '18px', borderRadius: '50%', border: '1px solid #efefef', backgroundColor: COLOR_OPTIONS.find(c => c.name === (filters.colors[0] || '모두'))?.code || 'white' }} />
                  <span style={{ flex: 1, fontWeight: 600 }}>{filters.colors[0] || '모두'}</span>
                  <span style={{ color: '#d1d5db', fontSize: '10px' }}>{isColorOpen ? '▲' : '▼'}</span>
                </div>

                {isColorOpen && (
                  <div 
                    ref={colorListRef}
                    onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd}
                    style={{ position: 'absolute', top: '55px', left: 0, width: '100%', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '20px', boxShadow: '0 15px 35px rgba(0,0,0,0.2)', zIndex: 1000, maxHeight: '280px', overflowY: 'auto', padding: '12px 0', cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
                  >
                    {COLOR_OPTIONS.map((c) => (
                      <div
                        key={c.name}
                        onClick={() => { if (!isDragging) { handleChange('colors', [c.name]); setIsColorOpen(false); } }}
                        onMouseOver={(e) => { if (!isMobile) e.currentTarget.style.backgroundColor = '#fff5f6'; }}
                        onMouseOut={(e) => { if (!isMobile) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: isMobile ? '10px 16px' : '12px 20px', cursor: 'pointer' }}
                      >
                        <div style={{ width: isMobile ? '20px' : '24px', height: isMobile ? '20px' : '24px', borderRadius: '50%', border: c.border ? '1px solid #eee' : 'none', backgroundColor: c.code }} />
                        <span style={{ fontSize: isMobile ? '13px' : '14px', color: filters.colors[0] === c.name ? '#ff0038' : '#333', fontWeight: filters.colors[0] === c.name ? '900' : '500' }}>{c.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>

            <Section title="배송 옵션" isOpen={openSections['배송 옵션']} onToggle={() => toggleSection('배송 옵션')} isMobile={isMobile}>
              <CapsuleGroup options={['모두', '익명 배송', '수취 옵션', '옵션 없음']} current={filters.shippingOption} onChange={(v: string) => handleChange('shippingOption', v)} isMobile={isMobile} />
            </Section>

            <Section title="판매 상황" isOpen={openSections['판매 상황']} onToggle={() => toggleSection('판매 상황')} isMobile={isMobile}>
               <CapsuleGroup options={['모두', '판매중', '품절']} current={filters.status} onChange={(v: string) => handleChange('status', v)} isMobile={isMobile} />
            </Section>
          </div>

          <div style={{ padding: isMobile ? '16px' : '24px', borderTop: '1px solid #f9fafb', flexShrink: 0, backgroundColor: 'white' }}>
            <button 
              onClick={() => {
                onSearch(filters);
                if(isMobile) setIsDrawerOpen(false); 
              }}
              style={{ width: '100%', padding: isMobile ? '14px 0' : '18px 0', background: 'linear-gradient(to right, #ff0038, #ff4d4d)', color: 'white', fontWeight: 900, borderRadius: '24px', border: 'none', cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(255, 0, 56, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', fontSize: isMobile ? '15px' : '16px' }}
            >
              <span>조건으로 검색하기 🔍</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// --- 보조 컴포넌트들 (isMobile 속성 수신) ---
function Section({ title, children, last, isOpen, onToggle, isMobile }: any) {
  return (
    <div style={{ borderBottom: last ? 'none' : '1px solid #f9fafb' }}>
      <div 
        onClick={onToggle}
        style={{ padding: isMobile ? '12px 16px' : '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
      >
        <h3 style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 900, color: isOpen ? '#ff0038' : '#111827', display: 'flex', alignItems: 'center', gap: '10px', margin: 0, transition: 'color 0.2s' }}>
          <span style={{ width: '5px', height: '16px', backgroundColor: isOpen ? '#ff0038' : '#d1d5db', borderRadius: '10px' }} />
          {title}
        </h3>
        <span style={{ fontSize: '10px', color: '#9ca3af', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>▼</span>
      </div>
      <div style={{ display: isOpen ? 'block' : 'none', padding: isMobile ? '0 16px 12px 16px' : '0 16px 16px 16px', animation: 'slideDown 0.3s ease-out' }}>
        <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        {children}
      </div>
    </div>
  );
}

function CustomInput({ label, value, onChange, placeholder, isMobile }: any) {
  return (
    <div style={{ marginBottom: '5px' }}>
      <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '6px', paddingLeft: '4px', textTransform: 'uppercase' }}>{label}</p>
      <input 
        type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: isMobile ? '12px 14px' : '14px 16px', backgroundColor: '#f9fafb', border: '1px solid transparent', borderRadius: '16px', outline: 'none', fontSize: isMobile ? '12px' : '13px', boxSizing: 'border-box', transition: 'background-color 0.2s' }}
        onFocus={(e) => e.currentTarget.style.backgroundColor = 'white'}
        onBlur={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
      />
    </div>
  );
}

function PriceInput({ value, onChange, placeholder, isMobile }: any) {
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#d1d5db', fontWeight: 'bold', fontSize: '12px' }}>¥</span>
      <input 
        type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: isMobile ? '12px 12px 12px 28px' : '14px 12px 14px 30px', backgroundColor: '#f9fafb', border: 'none', borderRadius: '16px', outline: 'none', fontSize: isMobile ? '12px' : '13px', boxSizing: 'border-box' }}
      />
    </div>
  );
}

function CapsuleGroup({ options, current, onChange, label, isMobile }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {label && <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', paddingLeft: '4px' }}>{label}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {options.map((opt: string) => (
          <button
            key={opt} onClick={() => onChange(opt)}
            style={{
              fontSize: isMobile ? '13px' : '14px', fontWeight: 'bold',
              padding: isMobile ? '8px 14px' : '10px 18px', borderRadius: '24px', border: 'none', cursor: 'pointer',
              backgroundColor: current === opt ? '#ff0038' : '#f9fafb',
              color: current === opt ? 'white' : '#6b7280', transition: 'all 0.2s', transform: 'scale(1)',
            }}
            onMouseDown={(e) => { if (!isMobile) e.currentTarget.style.transform = 'scale(0.96)' }}
            onMouseUp={(e) => { if (!isMobile) e.currentTarget.style.transform = 'scale(1)' }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function SimpleDropdown({ label, options, value, onSelect, placeholder, isMobile }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const onDragStart = (e: React.MouseEvent) => {
    e.stopPropagation(); if (!listRef.current) return;
    setIsDragging(true); setStartY(e.pageY - listRef.current.offsetTop); setScrollTop(listRef.current.scrollTop);
  };
  const onDragMove = (e: React.MouseEvent) => {
    if (!isDragging || !listRef.current) return;
    e.stopPropagation(); e.preventDefault();
    const y = e.pageY - listRef.current.offsetTop; listRef.current.scrollTop = scrollTop - (y - startY) * 1.5;
  };
  const onDragEnd = (e: React.MouseEvent) => { if(isDragging) e.stopPropagation(); setIsDragging(false); };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} style={{ marginBottom: '1px', position: 'relative' }}>
      {label && <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '6px', paddingLeft: '4px' }}>{label}</p>}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '100%', padding: isMobile ? '12px 14px' : '14px 16px', backgroundColor: '#f9fafb', borderRadius: '16px', fontSize: isMobile ? '13px' : '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: isOpen ? '1px solid #ff0038' : '1px solid transparent', boxSizing: 'border-box', transition: 'all 0.2s' }}
      >
        <span style={{ color: value && value !== '모두' ? '#111827' : '#9ca3af', fontWeight: value && value !== '모두' ? 600 : 400 }}>{value || placeholder}</span>
        <span style={{ color: '#d1d5db', fontSize: '10px' }}>{isOpen ? '▲' : '▼'}</span>
      </div>
      <div
        ref={listRef} onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd}
        style={{ display: isOpen ? 'block' : 'none', position: 'absolute', top: '75px', left: 0, width: '100%', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '20px', boxShadow: '0 15px 35px rgba(0,0,0,0.15)', zIndex: 110, maxHeight: '250px', overflowY: 'auto', padding: '8px 0', cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
      >
        {options.map((opt: string) => (
          <div key={opt} onClick={() => { if (!isDragging) { onSelect(opt); setIsOpen(false); } }} onMouseOver={(e) => { if (!isMobile) e.currentTarget.style.backgroundColor = '#fff5f6' }} onMouseOut={(e) => { if (!isMobile) e.currentTarget.style.backgroundColor = 'transparent' }} style={{ padding: isMobile ? '10px 16px' : '12px 20px', fontSize: isMobile ? '13px' : '14px', cursor: 'pointer', color: value === opt ? '#ff0038' : '#4b5563', fontWeight: value === opt ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: value === opt ? '#ff0038' : '#e5e7eb' }} />{opt}
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryDropdown({ label, options, value, onSelect, placeholder, isOpen, onToggle, isMobile }: any) {
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const currentLabel = options.find((opt: any) => opt.genreId.toString() === value)?.genreName || placeholder;

  const onDragStart = (e: React.MouseEvent) => { e.stopPropagation(); if (!listRef.current) return; setIsDragging(true); setStartY(e.pageY - listRef.current.offsetTop); setScrollTop(listRef.current.scrollTop); };
  const onDragMove = (e: React.MouseEvent) => { if (!isDragging || !listRef.current) return; e.stopPropagation(); e.preventDefault(); const y = e.pageY - listRef.current.offsetTop; listRef.current.scrollTop = scrollTop - (y - startY) * 1.5; };
  const onDragEnd = (e: React.MouseEvent) => { if(isDragging) e.stopPropagation(); setIsDragging(false); };

  return (
    <div ref={containerRef} style={{ marginBottom: '5px', position: 'relative' }}>
      <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '6px', paddingLeft: '4px' }}>{label}</p>
      <div
        onClick={onToggle} onMouseDown={(e) => e.stopPropagation()}
        style={{ width: '100%', padding: isMobile ? '12px 14px' : '14px 16px', backgroundColor: '#f9fafb', borderRadius: '16px', fontSize: isMobile ? '12px' : '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: isOpen ? '1px solid #ff0038' : '1px solid transparent', boxSizing: 'border-box', transition: 'all 0.2s' }}
      >
        <span style={{ color: value ? '#111827' : '#9ca3af', fontWeight: value ? 600 : 400 }}>{currentLabel}</span>
        <span style={{ color: '#d1d5db', fontSize: '10px' }}>{isOpen ? '▲' : '▼'}</span>
      </div>
      <div
        ref={listRef} onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd}
        style={{ display: isOpen ? 'block' : 'none', position: 'absolute', top: '75px', left: 0, width: '100%', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '20px', boxShadow: '0 15px 35px rgba(0,0,0,0.15)', zIndex: 110, maxHeight: '250px', overflowY: 'auto', padding: '8px 0', cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
      >
        {options.map((opt: any) => (
          <div key={opt.genreId} onClick={() => { if (!isDragging) onSelect(opt.genreId, opt.genreName); }} onMouseOver={(e) => { if (!isMobile) e.currentTarget.style.backgroundColor = '#fff5f6' }} onMouseOut={(e) => { if (!isMobile) e.currentTarget.style.backgroundColor = 'transparent' }} style={{ padding: isMobile ? '10px 16px' : '12px 20px', fontSize: '13px', cursor: 'pointer', color: value === opt.genreId.toString() ? '#ff0038' : '#4b5563', fontWeight: value === opt.genreId.toString() ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: value === opt.genreId.toString() ? '#ff0038' : '#e5e7eb' }} />{opt.genreName}
          </div>
        ))}
      </div>
    </div>
  );
}

// 🚀 2. 메인 카테고리 그리드 컴포넌트
export default function MercariCategoryGrid({ categories, isLeaf, isLoading, onMove }: CategoryGridProps) {
  const isMobile = useIsMobile(); 

  const styles = {
    loadingWrapper: { height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    spinner: { height: '32px', width: '32px', border: '4px solid #fce7f3', borderTopColor: '#ff007f', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    gridContainer: { display: 'grid', gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(130px, 1fr))' : 'repeat(auto-fill, minmax(160px, 1fr))', gap: isMobile ? '8px' : '12px', animation: 'fadeIn 0.5s ease-in-out' },
    messageText: { textAlign: 'center' as const, padding: '40px 0', color: '#9ca3af', fontSize: '14px', fontStyle: 'italic' as const },
    emptyText: { textAlign: 'center' as const, padding: '40px 0', color: '#d1d5db', fontSize: '14px' }
  };

  if (isLoading) return <div style={styles.loadingWrapper}><div style={styles.spinner} /></div>;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: (!isLeaf && categories.length > 0) ? 'block' : 'none' }}>
        <div style={styles.gridContainer}>
          {categories.map((cat) => (
            <CategoryItem key={cat.genreId} name={cat.genreName} onClick={() => onMove(cat.genreId, cat.genreName)} isMobile={isMobile} />
          ))}
        </div>
      </div>
      <div style={{ display: (isLeaf && categories.length === 0) ? 'block' : 'none' }}><div style={styles.messageText}>최하위 카테고리입니다. 왼쪽 상세 검색의 [검색하기] 버튼을 눌러주세요.</div></div>
      <div style={{ display: (!isLeaf && categories.length === 0) ? 'block' : 'none' }}><div style={styles.emptyText}>데이터가 없습니다.</div></div>
    </div>
  );
}

function CategoryItem({ name, onClick, isMobile }: { name: string, onClick: () => void, isMobile: boolean }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} style={{ fontSize: isMobile ? '13px' : '14px', color: isHovered && !isMobile ? '#ff007f' : '#4b5563', cursor: 'pointer', padding: isMobile ? '10px 12px' : '12px 16px', borderRadius: '12px', border: `1px solid ${isHovered && !isMobile ? '#fce7f3' : '#f9fafb'}`, backgroundColor: isHovered && !isMobile ? '#fff1f2' : 'transparent', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center' }}>
      <span style={{ width: '6px', height: '6px', backgroundColor: isHovered && !isMobile ? '#ff007f' : '#e5e7eb', borderRadius: '50%', marginRight: '8px', transition: 'background-color 0.2s' }} />{name}
    </div>
  );
}