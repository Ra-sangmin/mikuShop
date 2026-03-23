"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';

// --- 모바일 감지 커스텀 훅 ---
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

// --- 플랫폼별 타입 정의 ---
export type ShoppingPlatform = 'mercari' | 'rakuten' | 'amazon' | 'yahoo' | 'yahoo_auction' | 'default';

interface GlobalCategory {
  genreId: number;
  genreName: string;
  genreLevel: number;
}

export interface GlobalFilterState {
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
  page?: number;
}

interface GlobalSidebarProps {
  platform: ShoppingPlatform;
  currentPath: { id: number, name: string }[];
  onNavigate: (id: number, name: string, index: number) => void;
  onSearch: (filters: GlobalFilterState) => void;
  // ✨ 정렬 옵션을 부모로부터 받을 수 있도록 추가
  sortOptions?: { id: string, label: string }[];
}

// --- 플랫폼별 테마 컬러 설정 ---
const PLATFORM_THEMES: Record<ShoppingPlatform, { color: string; bg: string; light: string }> = {
  mercari: { color: '#ff0038', bg: '#fff1f2', light: '#f9fafb' },
  rakuten: { color: '#bf0000', bg: '#fef2f2', light: '#f9fafb' },
  amazon: { color: '#ff9900', bg: '#fff7ed', light: '#f9fafb' },
  yahoo: { color: '#ff0033', bg: '#fff1f2', light: '#f9fafb' },
  yahoo_auction: { color: '#ffa600', bg: '#fff7ed', light: '#f9fafb' },
  default: { color: '#6366f1', bg: '#f5f3ff', light: '#f9fafb' }
};

export function GlobalSidebar({ platform = 'mercari',onSearch , sortOptions }: GlobalSidebarProps) {
    
    const isMobile = useIsMobile(); 
  
    // 🚀 모바일 드로어(Drawer) 상태 관리
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
    // 🚀 [핵심] 사이드바 내부에서 관리하는 필터 상태 (Source of Truth)
    const [filters, setFilters] = useState<GlobalFilterState>({
      sortOrder: sortOptions && sortOptions.length > 0 ? sortOptions[0].id : '기본순', 
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
      status: '모두', // 기본값을 '판매중'으로 설정하여 사용자 편의성 증대
      page: 1,
    });
    
    // 🚀 스와이프 터치 좌표 추적
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const touchCurrentX = useRef(0);
    const touchCurrentY = useRef(0);
  
    const [openDropdownLevel, setOpenDropdownLevel] = useState<number | null>(null);
    const categoryAreaRef = useRef<HTMLDivElement>(null);
  
    const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
      '정렬': true, '키워드': true,'가격대': true,
      '출품자': false, '물품의 상태': false, '배송료 부담': false,
      '색상': false, '판매 상황': false,
    });
    
    const toggleSection = (title: string) => {
      setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));
    };
  
    const [isColorOpen, setIsColorOpen] = useState(false);
    const colorContainerRef = useRef<HTMLDivElement>(null);
  
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [isSidebarDragging, setIsSidebarDragging] = useState(false);
    const [sidebarStartY, setSidebarStartY] = useState(0);
    const [sidebarScrollTop, setSidebarScrollTop] = useState(0);
  
    const colorListRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
  
    const handleChange = (key: keyof GlobalFilterState, value: any) => {
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
  
    const handleTouchEndOpen = () => {
      const deltaX = touchCurrentX.current - touchStartX.current;
      const deltaY = Math.abs(touchCurrentY.current - touchStartY.current);
      if (deltaX > 40 && deltaX > deltaY) {
        setIsDrawerOpen(true);
      }
    };
  
    const handleTouchEndClose = () => {
      const deltaX = touchStartX.current - touchCurrentX.current;
      const deltaY = Math.abs(touchStartY.current - touchCurrentY.current);
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

    // ✨ 드롭다운용 렌더링을 위해 라벨(label) 추출 배열과 현재 선택된 라벨 찾기
    const currentSortLabels = sortOptions ? sortOptions.map(opt => opt.label) : ['기본순', '가격 낮은 순', '가격 높은 순', '최신순'];
    
    // 현재 filters.sortOrder(id값)에 해당하는 label 찾기 (화면에 보여주기 위함)
    const currentSortDisplayValue = sortOptions 
      ? sortOptions.find(opt => opt.id === filters.sortOrder)?.label || sortOptions[0].label 
      : filters.sortOrder;

    // 드롭다운 항목 선택 시 처리 핸들러
    const handleSortSelect = (selectedLabel: string) => {
      if (sortOptions) {
        // 선택된 라벨을 통해 원래의 id 값을 찾아서 업데이트
        const targetId = sortOptions.find(opt => opt.label === selectedLabel)?.id;
        if (targetId) handleChange('sortOrder', targetId);
      } else {
        handleChange('sortOrder', selectedLabel);
      }
    };
  
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
      {isMobile && (
        <div 
          onClick={() => setIsDrawerOpen(false)} 
          style={{ 
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', 
            zIndex: 9998, opacity: isDrawerOpen ? 1 : 0, pointerEvents: isDrawerOpen ? 'auto' : 'none', transition: 'opacity 0.3s ease' 
          }} 
        />
      )}

      {isMobile && !isDrawerOpen && (
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEndOpen}
          onClick={() => setIsDrawerOpen(true)}
          style={{ 
            position: 'fixed', left: 0, top: '80px', zIndex: 9998, display: 'flex', alignItems: 'center', cursor: 'pointer' 
          }}
        >
          <div style={{
            padding: '16px 8px', backgroundColor: 'white', color: '#ff007f', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', borderTopRightRadius: '16px', borderBottomRightRadius: '16px', 
            boxShadow: '4px 0 12px rgba(0,0,0,0.15)', border: '1px solid #fce7f3', borderLeft: 'none', marginLeft: '-2px',
          }}>
            <span style={{ fontSize: '13px', fontWeight: '900', writingMode: 'vertical-rl', textOrientation: 'upright', letterSpacing: '4px' }}>
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
          display: 'flex', flexDirection: 'column', backgroundColor: 'white'
        } : {
          width: '390px', display: 'flex', flexDirection: 'column', gap: '16px'
        }}
      >
        <div style={{ 
          backgroundColor: 'white', border: isMobile ? 'none' : '1px solid #f3f4f6', 
          borderRadius: isMobile ? '0 32px 32px 0' : '32px', 
          boxShadow: isMobile ? '10px 0 30px rgba(0,0,0,0.2)' : '0 25px 50px -12px rgba(0, 0, 0, 0.1)', 
          overflow: 'hidden', height: isMobile ? '100%' : 'auto', display: 'flex', flexDirection: 'column'
        }}>

          {/* 🚀 상단 헤더 영역: 제목 및 닫기 버튼 */}
          <div style={{ 
            padding: isMobile ? '20px' : '24px', 
            borderBottom: '1px solid #f9fafb', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexShrink: 0 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ color: '#111827', fontWeight: 900, fontSize: isMobile ? '18px' : '20px', margin: 0 }}>상세검색</h2>
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
              flex: 1, maxHeight: isMobile ? 'none' : '72vh', 
              cursor: isSidebarDragging ? 'grabbing' : 'default',
              userSelect: isSidebarDragging ? 'none' : 'auto', scrollBehavior: isSidebarDragging ? 'auto' : 'smooth',
              paddingBottom: '20px' 
            }}
          >
            <Section title="정렬" isOpen={openSections['정렬']} onToggle={() => toggleSection('정렬')} isMobile={isMobile}>
              <SimpleDropdown 
                label="검색 결과 정렬" 
                options={currentSortLabels} // 추출한 라벨 배열 전달
                value={currentSortDisplayValue} // 현재 선택된 라벨 표시
                onSelect={handleSortSelect} // 선택 핸들러 연결
                placeholder="정렬 방식을 선택하세요" 
                isMobile={isMobile} 
              />
            </Section>
            
            <Section title="키워드" isOpen={openSections['키워드']} onToggle={() => toggleSection('키워드')} isMobile={isMobile}>
              <CustomInput label="검색어" value={filters.keyword} onChange={(v: string) => handleChange('keyword', v)} placeholder="검색어 입력..." isMobile={isMobile} />
              <CustomInput label="제외할 단어" value={filters.excludeKeyword} onChange={(v: string) => handleChange('excludeKeyword', v)} placeholder="제외할 단어 입력..." isMobile={isMobile} />
            </Section>

            <Section title="가격대" isOpen={openSections['가격대']} onToggle={() => toggleSection('가격대')} isMobile={isMobile}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PriceInput value={filters.minPrice} onChange={(v: string) => handleChange('minPrice', v)} placeholder="Min" isMobile={isMobile} />
                <span style={{ color: '#d1d5db' }}>~</span>
                <PriceInput value={filters.maxPrice} onChange={(v: string) => handleChange('maxPrice', v)} placeholder="Max" isMobile={isMobile} />
              </div>
            </Section>


            {platform !== 'rakuten' && platform !== 'yahoo_auction' && (
              <>
                <Section title="출품자" isOpen={openSections['출품자']} onToggle={() => toggleSection('출품자')} isMobile={isMobile}>
                  <CapsuleGroup options={['모두', '개인', '메루카리샵']} current={filters.sellerType} onChange={(v: string) => handleChange('sellerType', v)} isMobile={isMobile} />
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
            </>)}
          </div>

          <div style={{ padding: isMobile ? '16px' : '24px', borderTop: '1px solid #f9fafb', flexShrink: 0, backgroundColor: 'white' }}>
            <button 
              onClick={() => {
                // 🚀 [중요] 부모에게 현재 필터 상태를 전송!
                onSearch(filters);
                if(isMobile) setIsDrawerOpen(false); 
              }}
              style={{ width: '100%', padding: isMobile ? '14px 0' : '18px 0', background: 'linear-gradient(to right, #ff0038, #ff4d4d)', color: 'white', fontWeight: 900, borderRadius: '24px', border: 'none', cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(255, 0, 56, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', fontSize: isMobile ? '15px' : '16px' }}
            >
              <span>조건으로 검색하기 🔍</span>
            </button>
          </div>
        </div>

        {/* 🚀 [핵심 수정] 사이드바 우측에 붙어있는 닫기 버튼 */}
        {isMobile && (
          <div
            onClick={() => setIsDrawerOpen(false)}
            style={{
              position: 'absolute',
              left: '100%', // 사이드바 바로 오른쪽에 위치
              top: '80px',
              zIndex: 10000,
              cursor: 'pointer',
              display: isDrawerOpen ? 'flex' : 'none', // 열렸을 때만 표시
            }}
          >
            <div style={{
              padding: '16px 12px',
              backgroundColor: '#111827', // 닫기 버튼은 시인성을 위해 어두운 색 권장
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderTopRightRadius: '16px',
              borderBottomRightRadius: '16px',
              boxShadow: '4px 0 12px rgba(0,0,0,0.15)',
            }}>
              <span style={{ 
                fontSize: '13px', 
                fontWeight: '900', 
                writingMode: 'vertical-rl', 
                textOrientation: 'upright', 
                letterSpacing: '2px' 
              }}>
                닫기 ✕
              </span>
            </div>
          </div>
        )}
        
      </aside>
    </>
  );
}

// --- 하위 컴포넌트들 (공용 테마 적용) ---

// --- 보조 컴포넌트들 ---
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
          <div key={opt} onClick={() => { if (!isDragging) { onSelect(opt); setIsOpen(false); } }} style={{ padding: isMobile ? '10px 16px' : '12px 20px', fontSize: isMobile ? '13px' : '14px', cursor: 'pointer', color: value === opt ? '#ff0038' : '#4b5563', fontWeight: value === opt ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
    <div className="notranslate" translate="no" ref={containerRef} style={{ marginBottom: '5px', position: 'relative' }}>
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
          <div key={opt.genreId} onClick={() => { if (!isDragging) onSelect(opt.genreId, opt.genreName); }} style={{ padding: isMobile ? '10px 16px' : '12px 20px', fontSize: '13px', cursor: 'pointer', color: value === opt.genreId.toString() ? '#ff0038' : '#4b5563', fontWeight: value === opt.genreId.toString() ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: value === opt.genreId.toString() ? '#ff0038' : '#e5e7eb' }} />{opt.genreName}
          </div>
        ))}
      </div>
    </div>
  );
}