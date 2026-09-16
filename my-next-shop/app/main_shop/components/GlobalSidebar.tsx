"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SlidersHorizontal, ArrowCounterClockwise, CaretDown, Check, MagnifyingGlass } from '@phosphor-icons/react';
import { getShopTheme, shopThemeVars } from './shopTheme';

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
export type ShoppingPlatform = 'mercari' | 'rakuten' | 'amazon' | 'yahoo_shopping' | 'yahoo_auction' | 'default';

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
  isDetailOpen?: boolean;
  // ✨ 정렬 옵션을 부모로부터 받을 수 있도록 추가
  sortOptions?: { id: string, label: string }[];
}

// --- 플랫폼별 테마 컬러 설정 ---
const PLATFORM_THEMES: Record<ShoppingPlatform, { color: string; bg: string; light: string }> = {
  mercari: { color: '#ff0038', bg: '#fff1f2', light: '#f9fafb' },
  rakuten: { color: '#bf0000', bg: '#fef2f2', light: '#f9fafb' },
  amazon: { color: '#ff9900', bg: '#fff7ed', light: '#f9fafb' },
  yahoo_shopping: { color: '#bf0000', bg: '#fef2f2', light: '#f9fafb' },
  yahoo_auction: { color: '#ffa600', bg: '#fff7ed', light: '#f9fafb' },
  default: { color: '#6366f1', bg: '#f5f3ff', light: '#f9fafb' }
};

export function GlobalSidebar({ platform = 'mercari', onSearch, isDetailOpen = false, sortOptions }: GlobalSidebarProps) {
    
    const isMobile = useIsMobile(); 
  
    // 🚀 모바일 드로어(Drawer) 상태 관리
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
      if (isDetailOpen) setIsDrawerOpen(false);
    }, [isDetailOpen]);
  
    // 🚀 [핵심] 사이드바 내부에서 관리하는 필터 상태 (Source of Truth)
    const makeDefaultFilters = (): GlobalFilterState => ({
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
    const [filters, setFilters] = useState<GlobalFilterState>(makeDefaultFilters);
    // 🌟 원색 대신 부드러운 톤(shopTheme.ts)을 씁니다.
    const themeVars = shopThemeVars('gs', getShopTheme(platform)) as React.CSSProperties;

    // 🌟 기본값과 다른 조건 수 (헤더의 배지·초기화 버튼에 사용)
    const activeFilterCount = useMemo(() => {
      const d = makeDefaultFilters();
      const keys: (keyof GlobalFilterState)[] = ['keyword', 'excludeKeyword', 'minPrice', 'maxPrice', 'sortOrder',
        'sellerType', 'condition', 'shippingPayer', 'hasDiscount', 'listingType', 'shippingOption', 'status'];
      let n = keys.filter(k => String(filters[k] ?? '').trim() !== String(d[k] ?? '').trim()).length;
      if ((filters.colors[0] || '모두') !== '모두') n += 1;
      return n;
    }, [filters]);
    const resetFilters = () => setFilters(makeDefaultFilters());
    
    // 🚀 스와이프 터치 좌표 추적
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const touchCurrentX = useRef(0);
    const touchCurrentY = useRef(0);

    // 🚀 [상세 검색 보기 탭] 드래그로 서서히 열기
    const drawerRef = useRef<HTMLElement>(null);
    const [isOpenDragging, setIsOpenDragging] = useState(false);
    const [openDragX, setOpenDragX] = useState(0);
    // 드래그 후 브라우저가 만들어내는 ghost click이 onClick 토글을 다시 꺼버리는 것을 방지
    const suppressClickRef = useRef(false);

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
      // 의미 있는 움직임이 있었다면, 뒤이어 발생하는 ghost click을 무시하도록 표시
      if (Math.abs(deltaX) > 8 || deltaY > 8) {
        suppressClickRef.current = true;
      }
      setIsOpenDragging(false);
      setOpenDragX(0);
    };

    // 🚀 탭을 오른쪽으로 드래그하면 패널이 그만큼 딸려나오고, 절반 이상 나오면 완전히 열림
    const handleOpenDragStart = (e: React.TouchEvent) => {
      handleTouchStart(e);
      setIsOpenDragging(true);
      setOpenDragX(0);
    };

    const handleOpenDragMove = (e: React.TouchEvent) => {
      handleTouchMove(e);
      const deltaX = e.touches[0].clientX - touchStartX.current;
      const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);
      if (deltaY > deltaX) return; // 세로 스크롤 의도로 판단되면 무시

      const drawerWidth = drawerRef.current?.offsetWidth || 300;
      const clamped = Math.min(Math.max(deltaX, 0), drawerWidth);
      setOpenDragX(clamped);

      if (clamped >= drawerWidth / 2) {
        setIsDrawerOpen(true);
        setIsOpenDragging(false);
        setOpenDragX(0);
        suppressClickRef.current = true;
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
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 9998, opacity: isDrawerOpen ? 1 : 0, pointerEvents: isDrawerOpen ? 'auto' : 'none', transition: 'opacity 0.3s ease' 
          }} 
        />
      )}

      {/* 🚀 사이드바 본체 (왼쪽 스와이프로 닫기 로직 적용) */}
      <style>{GS_STYLES}</style>
      <aside
        ref={drawerRef}
        className={`gs-root ${isMobile ? 'gs-mobile' : ''}`}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
        onTouchEnd={isMobile ? handleTouchEndClose : undefined}
        style={isMobile ? {
          ...themeVars,
          position: 'fixed', top: 0, left: 0, bottom: 0, width: '85vw', maxWidth: '360px', zIndex: 9999,
          transform: isDrawerOpen
            ? 'translateX(0)'
            : isOpenDragging
              ? `translateX(calc(-100% + ${openDragX}px))`
              : 'translateX(-100%)',
          transition: isOpenDragging ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          // 🌟 배경은 안쪽 카드(흰색, 오른쪽 모서리 32px 라운드)가 담당합니다. 이 aside 까지 흰색이면
          // 카드의 둥근 모서리 바깥(오른쪽 위·아래 귀퉁이)에 각진 흰 배경 + 카드 그림자가 겹쳐
          // 회색 사각 귀퉁이가 보였습니다. 투명하게 두어 모서리 밖으로는 뒤의 어두운 오버레이만 비치게 합니다.
          display: 'flex', flexDirection: 'column', backgroundColor: 'transparent'
        } : {
          ...themeVars,
          width: '390px', display: 'flex', flexDirection: 'column', gap: '16px'
        }}
        data-platform={platform}
      >
        {/* 🚀 상세 검색 보기 ↔ 닫기 토글 탭 (사이드바 자식이라 드래그/오픈에 맞춰 함께 이동) */}
        {isMobile && (
          <div
            onTouchStart={!isDrawerOpen ? handleOpenDragStart : undefined}
            onTouchMove={!isDrawerOpen ? handleOpenDragMove : undefined}
            onTouchEnd={!isDrawerOpen ? handleTouchEndOpen : undefined}
            onClick={() => {
              if (suppressClickRef.current) {
                suppressClickRef.current = false;
                return;
              }
              setIsDrawerOpen(!isDrawerOpen);
            }}
            style={{
              position: 'absolute', left: '100%', top: '95px', zIndex: 10000,
              display: 'flex', alignItems: 'center', cursor: 'pointer'
            }}
          >
            <div style={{
              padding: '16px 8px',
              backgroundColor: isDrawerOpen ? '#111827' : 'white',
              color: isDrawerOpen ? 'white' : '#ff007f',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderTopRightRadius: '16px', borderBottomRightRadius: '16px',
              boxShadow: isDrawerOpen ? '4px 0 14px rgba(0,0,0,0.35)' : '4px 0 12px rgba(0,0,0,0.15)',
              // border 단축 속성과 borderLeft를 섞으면 React 경고가 나므로 세 방향을 따로 지정
              borderTop: isDrawerOpen ? '1px solid rgba(255,255,255,0.25)' : '1px solid #fce7f3',
              borderRight: isDrawerOpen ? '1px solid rgba(255,255,255,0.25)' : '1px solid #fce7f3',
              borderBottom: isDrawerOpen ? '1px solid rgba(255,255,255,0.25)' : '1px solid #fce7f3',
              marginLeft: '0px',
            }}>
              <span style={{ fontSize: '13px', fontWeight: '900', writingMode: 'vertical-rl', textOrientation: 'upright', letterSpacing: isDrawerOpen ? '2px' : '4px' }}>
                {isDrawerOpen ? '닫기 ✕' : '상세 검색 보기'}
              </span>
            </div>
          </div>
        )}

        <div style={{
          // 🌟 데스크톱에서는 흰 배경/테두리/둥근 모서리를 이 카드가 아니라 바깥쪽
          // GlobalShoppingView의 fixed/absolute <aside>가 직접 갖도록 옮겼습니다. 그 aside가
          // 실제 스크롤 컨테이너이자 카드의 시각적 경계 역할을 동시에 하기 때문에, 스크롤 중
          // sticky로 고정되는 "조건으로 검색하기" 버튼도 항상 그 rounded 경계 안에서만 보이고
          // (overflow로 완전히 잘려서) 스크롤된 다른 항목이 둥근 모서리 틈으로 비쳐 보이는
          // 문제가 생기지 않습니다. 이 카드 자체에 배경/테두리/radius를 주면 sticky 버튼이
          // 카드 실제 하단이 아닌 위치에 떠 있을 때 그 radius가 어긋난 모서리를 만들어버립니다.
          backgroundColor: isMobile ? 'white' : 'transparent',
          border: isMobile ? 'none' : 'none',
          borderRadius: isMobile ? '0 32px 32px 0' : '0',
          boxShadow: isMobile ? '4px 0 16px rgba(0,0,0,0.25)' : 'none',
          overflow: isMobile ? 'hidden' : 'visible',
          height: isMobile ? '100%' : 'auto', display: 'flex', flexDirection: 'column',
        }}>

          {/* 🚀 상단 헤더 영역: 아이콘 + 제목 + 적용 조건 수 + 초기화 */}
          <div className="gs-head">
            <span className="gs-head-badge" aria-hidden="true"><SlidersHorizontal weight="bold" /></span>
            <div className="gs-head-titles">
              <span className="gs-head-eyebrow">FILTER</span>
              <h2 className="gs-head-title">
                상세검색
                {activeFilterCount > 0 && <span className="gs-head-count">{activeFilterCount}</span>}
              </h2>
            </div>
            <button
              type="button"
              className="gs-reset-btn"
              onClick={resetFilters}
              disabled={activeFilterCount === 0}
              title="조건 초기화"
            >
              <ArrowCounterClockwise weight="bold" /> 초기화
            </button>
          </div>

          <div
            ref={sidebarRef}
            className="miku-fancy-scrollbar"
            onMouseDown={!isMobile ? onSidebarDragStart : undefined}
            onMouseMove={!isMobile ? onSidebarDragMove : undefined}
            onMouseUp={!isMobile ? onSidebarDragEnd : undefined}
            onMouseLeave={!isMobile ? onSidebarDragEnd : undefined}
            style={{ 
              display: 'flex', flexDirection: 'column',
              // 🌟 데스크톱에서는 이 안쪽 박스를 더 이상 자체 스크롤(overflowY:'auto' + maxHeight:'72vh')
              // 컨테이너로 두지 않습니다. 이 영역이 스크롤 가능한 상태였기 때문에, 사용자가 사이드바
              // 위에서 마우스 휠을 굴리면 브라우저가 (바깥의 sticky 사이드바 전체를 고정한 채) 이
              // 안쪽 목록만 슬쩍 스크롤시켜서 "고정은 되어 있는데 스크롤하면 내용이 조금씩 밀린다"는
              // 현상이 발생했습니다. overflow를 visible로 두면 안쪽 콘텐츠가 그냥 사이드바의 일부로
              // 펼쳐지고, 스크롤은 오직 바깥 페이지 스크롤(및 그에 따른 position:sticky)만 담당하게
              // 되어 완전히 고정된 것처럼 보입니다.
              overflowY: isMobile ? 'auto' : 'visible', 
              flex: 1, maxHeight: isMobile ? 'none' : 'none', 
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
              <div className="gs-price-row">
                <PriceInput value={filters.minPrice} onChange={(v: string) => handleChange('minPrice', v)} placeholder="Min" isMobile={isMobile} />
                <span className="gs-price-sep">~</span>
                <PriceInput value={filters.maxPrice} onChange={(v: string) => handleChange('maxPrice', v)} placeholder="Max" isMobile={isMobile} />
              </div>
            </Section>


            {platform == 'mercari' && (
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
                        width: '100%', padding: isMobile ? '10px 14px' : '6px 16px', backgroundColor: '#f9fafb', borderRadius: '16px', fontSize: isMobile ? '12px' : '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', border: isColorOpen ? '1px solid var(--gs-brand)' : '1px solid #eef0f3', boxSizing: 'border-box'
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
                        style={{ position: 'absolute', top: isMobile ? '55px' : '43px', left: 0, width: '100%', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '20px', boxShadow: '0 15px 35px rgba(0,0,0,0.2)', zIndex: 1000, maxHeight: '280px', overflowY: 'auto', padding: '12px 0', cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
                      >
                        {COLOR_OPTIONS.map((c) => (
                          <div
                            key={c.name}
                            onClick={() => { if (!isDragging) { handleChange('colors', [c.name]); setIsColorOpen(false); } }}
                            style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: isMobile ? '10px 16px' : '12px 20px', cursor: 'pointer' }}
                          >
                            <div style={{ width: isMobile ? '20px' : '24px', height: isMobile ? '20px' : '24px', borderRadius: '50%', border: c.border ? '1px solid #eee' : 'none', backgroundColor: c.code }} />
                            <span style={{ fontSize: isMobile ? '13px' : '14px', color: filters.colors[0] === c.name ? 'var(--gs-brand)' : '#333', fontWeight: filters.colors[0] === c.name ? '900' : '500' }}>{c.name}</span>
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

          <div className="gs-foot" style={isMobile ? {} : { position: 'sticky', bottom: 0 }}>
            {/* 🌟 데스크톱에서는 카드가 길어져도 버튼이 항상 보이도록 스크롤 컨테이너(aside) 하단에 고정.
                모서리 처리는 바깥 aside의 overflow 클리핑이 담당합니다. */}
            <button
              type="button"
              className="gs-submit-btn"
              onClick={() => {
                // 🚀 [중요] 부모에게 현재 필터 상태를 전송!
                onSearch(filters);
                if(isMobile) setIsDrawerOpen(false); 
              }}
            >
              <MagnifyingGlass weight="bold" />
              <span>조건으로 검색하기</span>
              {activeFilterCount > 0 && <span className="gs-submit-count">{activeFilterCount}</span>}
            </button>
          </div>
        </div>

      </aside>
    </>
  );
}

// --- 하위 컴포넌트들 (공용 테마 적용) ---

// --- 보조 컴포넌트들 ---
function Section({ title, children, last, isOpen, onToggle }: any) {
  return (
    <div className={`gs-section ${isOpen ? 'open' : ''} ${last ? 'last' : ''}`}>
      <button type="button" className="gs-section-head" onClick={onToggle} aria-expanded={isOpen}>
        <span className="gs-section-title">
          <span className="gs-section-bar" aria-hidden="true" />
          {title}
        </span>
        <CaretDown className="gs-section-caret" weight="bold" aria-hidden="true" />
      </button>
      {isOpen && <div className="gs-section-body">{children}</div>}
    </div>
  );
}

function CustomInput({ label, value, onChange, placeholder }: any) {
  return (
    <label className="gs-field">
      <span className="gs-label">{label}</span>
      <input
        type="text" className="gs-input" value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      />
    </label>
  );
}

function PriceInput({ value, onChange, placeholder }: any) {
  return (
    <div className="gs-price">
      <span className="gs-price-unit">¥</span>
      <input
        type="number" className="gs-input gs-price-input" value={value} min={0}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        aria-label={placeholder === 'Min' ? '최소 가격' : '최대 가격'}
      />
    </div>
  );
}

function CapsuleGroup({ options, current, onChange, label }: any) {
  return (
    <div className="gs-field">
      {label && <span className="gs-label">{label}</span>}
      <div className="gs-chips">
        {options.map((opt: string) => (
          <button
            key={opt} type="button" onClick={() => onChange(opt)}
            className={`gs-chip ${current === opt ? 'active' : ''}`}
            aria-pressed={current === opt}
          >
            {current === opt && <Check weight="bold" />}
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
    <div ref={containerRef} className="gs-field gs-dropdown">
      {label && <span className="gs-label">{label}</span>}
      <button
        type="button"
        className={`gs-input gs-select ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className={value && value !== '모두' ? 'gs-select-value' : 'gs-select-placeholder'}>{value || placeholder}</span>
        <CaretDown className="gs-select-caret" weight="bold" aria-hidden="true" />
      </button>
      <div
        ref={listRef} onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd}
        className="gs-popover miku-fancy-scrollbar"
        style={{ display: isOpen ? 'block' : 'none', cursor: isDragging ? 'grabbing' : 'pointer' }}
        role="listbox"
      >
        {options.map((opt: string) => (
          <div
            key={opt}
            role="option"
            aria-selected={value === opt}
            className={`gs-option ${value === opt ? 'selected' : ''}`}
            onClick={() => { if (!isDragging) { onSelect(opt); setIsOpen(false); } }}
          >
            <span>{opt}</span>
            {value === opt && <Check weight="bold" />}
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
        style={{ width: '100%', padding: isMobile ? '12px 14px' : '6px 16px', backgroundColor: '#f9fafb', borderRadius: '16px', fontSize: isMobile ? '12px' : '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: isOpen ? '1px solid #ff0038' : '1px solid transparent', boxSizing: 'border-box', transition: 'all 0.2s' }}
      >
        <span style={{ color: value ? '#111827' : '#9ca3af', fontWeight: value ? 600 : 400 }}>{currentLabel}</span>
        <span style={{ color: '#d1d5db', fontSize: '10px' }}>{isOpen ? '▲' : '▼'}</span>
      </div>
      <div
        ref={listRef} onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd}
        style={{ display: isOpen ? 'block' : 'none', position: 'absolute', top: isMobile ? '75px' : '61px', left: 0, width: '100%', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '20px', boxShadow: '0 15px 35px rgba(0,0,0,0.15)', zIndex: 110, maxHeight: '250px', overflowY: 'auto', padding: '8px 0', cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
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

// ==========================================
// 🌟 상세검색 패널 스타일 (--gs-brand: 플랫폼 포인트 컬러)
// ⚠️ color-mix()는 이 프로젝트의 CSS 빌드에서 오류를 내므로 쓰지 않습니다.
// ==========================================
const GS_STYLES = `
  .gs-root { font-family: 'Pretendard', 'Noto Sans KR', sans-serif; }

  .gs-head {
    display: flex; align-items: center; gap: 12px;
    padding: 22px 22px 18px;
    border-bottom: 1px solid #f1f3f6;
    flex-shrink: 0;
    position: relative;
  }
  .gs-head::before {
    content: ''; position: absolute; top: 0; left: 24px; right: 24px; height: 3px;
    border-radius: 0 0 3px 3px;
    background: linear-gradient(90deg, transparent 0%, var(--gs-brand) 30%, var(--gs-brand) 70%, transparent 100%);
    opacity: 0.55;
  }
  .gs-head-badge {
    width: 42px; height: 42px; flex-shrink: 0;
    border-radius: 13px;
    display: flex; align-items: center; justify-content: center;
    font-size: 19px; color: #ffffff;
    background: linear-gradient(145deg, var(--gs-from) 0%, var(--gs-to) 100%);
    box-shadow: 0 10px 20px -10px var(--gs-shadow), inset 0 1px 0 rgba(255,255,255,0.35);
  }
  .gs-head-badge svg { fill: currentColor; }
  .gs-head-titles { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
  .gs-head-eyebrow { font-size: 10.5px; font-weight: 800; letter-spacing: 0.16em; color: var(--gs-brand); line-height: 1; }
  .gs-head-title {
    margin: 0; display: flex; align-items: center; gap: 8px;
    font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.6px; line-height: 1.2;
  }
  .gs-head-count {
    min-width: 20px; height: 20px; padding: 0 6px; box-sizing: border-box;
    border-radius: 999px;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800; color: #ffffff; letter-spacing: 0;
    background: var(--gs-to);
  }
  .gs-reset-btn {
    flex-shrink: 0;
    display: inline-flex; align-items: center; gap: 5px;
    padding: 7px 12px;
    border-radius: 999px;
    border: 1px solid #eceff3;
    background: #ffffff;
    font-size: 12px; font-weight: 700; color: #475569;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .gs-reset-btn svg { fill: currentColor; font-size: 12px; transition: transform 0.4s ease; }
  .gs-reset-btn:hover:not(:disabled) { color: var(--gs-brand); border-color: var(--gs-brand); background: var(--gs-brand-bg); }
  .gs-reset-btn:hover:not(:disabled) svg { transform: rotate(-180deg); }
  .gs-reset-btn:disabled { opacity: 0.45; cursor: default; }

  /* 섹션 */
  .gs-section { border-bottom: 1px solid #f3f4f7; }
  .gs-section.last { border-bottom: none; }
  .gs-section-head {
    width: 100%;
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 22px;
    background: transparent; border: none;
    cursor: pointer; user-select: none;
    font-family: inherit;
    transition: background-color 0.2s ease;
  }
  .gs-section-head:hover { background: #fafbfc; }
  .gs-section-title {
    display: flex; align-items: center; gap: 10px;
    font-size: 15.5px; font-weight: 800; color: #1e293b; letter-spacing: -0.4px;
    transition: color 0.2s ease;
  }
  .gs-section-bar {
    width: 4px; height: 15px; border-radius: 4px;
    background: #d5dae1;
    transition: background-color 0.2s ease, height 0.2s ease;
  }
  .gs-section.open .gs-section-title { color: #0f172a; }
  .gs-section.open .gs-section-bar { background: var(--gs-brand); height: 17px; }
  .gs-section-caret {
    font-size: 13px; color: #a3adbb;
    transition: transform 0.3s ease, color 0.2s ease;
  }
  .gs-section.open .gs-section-caret { transform: rotate(180deg); color: var(--gs-brand); }
  .gs-section-body {
    display: flex; flex-direction: column; gap: 12px;
    padding: 0 22px 18px;
    animation: gsSlideDown 0.28s ease-out;
  }
  @keyframes gsSlideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }

  /* 입력 요소 */
  .gs-field { display: flex; flex-direction: column; gap: 6px; }
  .gs-label { font-size: 12px; font-weight: 700; color: #5b6576; letter-spacing: -0.1px; padding-left: 2px; }
  .gs-input {
    width: 100%; height: 42px;
    padding: 0 14px;
    border-radius: 12px;
    border: 1px solid #eceff3;
    background: #f7f8fa;
    font-family: inherit; font-size: 14px; font-weight: 500; color: #0f172a;
    outline: none; box-sizing: border-box;
    transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .gs-input::placeholder { color: #8791a1; font-weight: 500; }
  .gs-input:hover { border-color: #dde2e8; background: #ffffff; }
  .gs-input:focus, .gs-input.open {
    background: #ffffff;
    border-color: var(--gs-brand);
    box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.04), 0 6px 16px -12px var(--gs-shadow);
  }
  .gs-price { position: relative; flex: 1; min-width: 0; }
  .gs-price-unit {
    position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
    font-size: 13px; font-weight: 800; color: #7b8595; pointer-events: none;
  }
  .gs-price-input { padding-left: 28px; -moz-appearance: textfield; }
  .gs-price-input::-webkit-outer-spin-button, .gs-price-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .gs-price-row { display: flex; align-items: center; gap: 8px; }
  .gs-price-sep { color: #c5ccd6; font-weight: 700; }

  /* 드롭다운 */
  .gs-dropdown { position: relative; }
  .gs-select {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    cursor: pointer; text-align: left;
  }
  .gs-select-value { font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gs-select-placeholder { color: #6b7585; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gs-select-caret { flex-shrink: 0; font-size: 12px; color: #a3adbb; transition: transform 0.25s ease, color 0.2s ease; }
  .gs-select.open .gs-select-caret { transform: rotate(180deg); color: var(--gs-brand); }
  .gs-popover {
    position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 110;
    max-height: 260px; overflow-y: auto;
    padding: 6px;
    background: #ffffff;
    border: 1px solid #eceff3;
    border-radius: 14px;
    box-shadow: 0 18px 40px -16px rgba(15, 23, 42, 0.3);
    user-select: none;
    box-sizing: border-box;
  }
  .gs-option {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 10px 12px;
    border-radius: 9px;
    font-size: 14px; font-weight: 500; color: #475569;
    transition: background-color 0.15s ease, color 0.15s ease;
  }
  .gs-option:hover { background: #f5f6f8; color: #0f172a; }
  .gs-option.selected { background: var(--gs-brand-bg); color: var(--gs-brand); font-weight: 800; }
  .gs-option svg { flex-shrink: 0; fill: currentColor; font-size: 13px; }

  /* 칩 */
  .gs-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .gs-chip {
    display: inline-flex; align-items: center; gap: 5px;
    height: 34px; padding: 0 14px;
    border-radius: 999px;
    border: 1px solid #e6e9ee;
    background: #ffffff;
    font-family: inherit; font-size: 13.5px; font-weight: 700; color: #64748b;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .gs-chip:hover { border-color: #cfd5de; color: #0f172a; }
  .gs-chip.active {
    color: #ffffff; border-color: transparent;
    background: linear-gradient(145deg, var(--gs-from) 0%, var(--gs-to) 100%);
    box-shadow: 0 6px 14px -8px var(--gs-shadow);
  }
  .gs-chip svg { fill: currentColor; font-size: 12px; }

  /* 하단 버튼 */
  .gs-foot {
    padding: 16px 22px 22px;
    flex-shrink: 0;
    background: linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 28%);
    z-index: 2;
  }
  .gs-submit-btn {
    width: 100%; height: 56px;
    display: flex; align-items: center; justify-content: center; gap: 9px;
    border: none; border-radius: 16px;
    font-family: inherit; font-size: 16px; font-weight: 900; color: #ffffff; letter-spacing: -0.3px;
    background: linear-gradient(145deg, var(--gs-from) 0%, var(--gs-to) 100%);
    box-shadow: 0 16px 28px -18px var(--gs-shadow), inset 0 1px 0 rgba(255,255,255,0.35);
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
  }
  .gs-submit-btn svg { fill: currentColor; font-size: 18px; }
  .gs-submit-btn:hover { transform: translateY(-2px); filter: brightness(1.03); box-shadow: 0 20px 32px -18px var(--gs-shadow), inset 0 1px 0 rgba(255,255,255,0.35); }
  .gs-submit-btn:active { transform: translateY(0); }
  .gs-submit-count {
    min-width: 22px; height: 22px; padding: 0 7px; box-sizing: border-box;
    border-radius: 999px;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 800;
    background: rgba(255,255,255,0.25);
  }

  .gs-section-head:focus-visible, .gs-chip:focus-visible, .gs-submit-btn:focus-visible, .gs-reset-btn:focus-visible {
    outline: 2px solid var(--gs-brand); outline-offset: 2px;
  }

  /* 모바일 드로어 */
  .gs-mobile .gs-head { padding: 20px 18px 16px; }
  .gs-mobile .gs-head-badge { width: 38px; height: 38px; font-size: 17px; border-radius: 12px; }
  .gs-mobile .gs-head-title { font-size: 18px; }
  .gs-mobile .gs-section-head { padding: 14px 18px; }
  .gs-mobile .gs-section-body { padding: 0 18px 16px; }
  .gs-mobile .gs-input { height: 44px; font-size: 14px; }
  .gs-mobile .gs-foot { padding: 14px 16px 18px; border-top: 1px solid #f1f3f6; }
  .gs-mobile .gs-submit-btn { height: 50px; font-size: 15px; }
`;
