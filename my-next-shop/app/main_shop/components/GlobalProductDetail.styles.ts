import { CSSProperties } from "react";

export interface DetailTheme {
  main: string;
  light: string;
}

export const getDetailStyles = (isMobile: boolean, theme: DetailTheme): Record<string, CSSProperties> => {
  const sharedFlexCenter: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const sharedFlexBetween: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };

  return {
    container: {
      marginTop: isMobile ? '10px' : '30px',
      padding: isMobile ? '16px' : '44px',
      backgroundColor: 'white',
      borderRadius: isMobile ? '24px' : '36px',
      border: '1px solid #f8fafc',
      boxShadow: '0 24px 60px rgba(15, 23, 42, 0.10)',
      position: 'relative',
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      overflowX: 'hidden'
    },
    
    originalLink: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      color: '#6b7280', // 연한 회색으로 시선 분산 방지
      fontSize: isMobile ? '13px' : '14px',
      textDecoration: 'none',
      cursor: 'pointer',
      marginTop: '-6px', // 제목과 자연스럽게 이어지도록 위쪽 여백 축소
      marginBottom: '20px', // 아래쪽 요소(가격 등)와의 간격
      fontWeight: 600,
      transition: 'color 0.2s ease',
    },
    
    CloseBtn: {
      position: 'absolute', top: '12px', right: isMobile ? '12px' : '24px', zIndex: 30,
      ...sharedFlexCenter, width: '36px', height: '36px',
      backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
      borderRadius: '50%', border: '1px solid #f1f5f9', cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
    },
    CloseText: { position: 'absolute', right: '48px', fontSize: '13px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.05em' },

    topSection: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '40px', marginBottom: '30px', width: '100%', minWidth: 0, boxSizing: 'border-box' },
    
    imageWrapper: { flex: isMobile ? 'none' : 1.1, display: 'flex', flexDirection: 'column', gap: '12px', width: isMobile ? '100%' : 'auto', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' },
    mainImgBox: { aspectRatio: isMobile ? '4/3' : '1/1', width: '100%', maxWidth: '100%', backgroundColor: '#f9fafb', borderRadius: '20px', overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', position: 'relative', boxSizing: 'border-box' },
    mainImg: (isHovered: boolean): CSSProperties => ({ 
      width: '100%', height: '100%', objectFit: 'contain', transition: '0.5s', 
      transform: isHovered && !isMobile ? 'scale(1.05)' : 'scale(1)' 
    }),
    soldOutOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', ...sharedFlexCenter },
    soldOutText: { color: 'white', fontWeight: 900, fontSize: '24px', border: '4px solid white', padding: '8px 24px', transform: 'rotate(-10deg)' },
    
    thumbScroll: { display: 'flex', gap: '8px', overflowX: 'auto', overflowY: 'hidden', width: '100%', paddingBottom: '10px', marginTop: '10px', alignItems: 'center', WebkitOverflowScrolling: 'touch' },
    thumbImg: (isActive: boolean): CSSProperties => ({
      width: isMobile ? '65px' : '72px', height: isMobile ? '65px' : '72px', borderRadius: '12px', cursor: 'pointer', flexShrink: 0, objectFit: 'cover',
      border: `2px solid ${isActive ? theme.main : 'transparent'}`,
      boxShadow: isActive ? `0 4px 10px ${theme.main}33` : 'none',
      transition: 'box-shadow 0.2s ease',
    }),

    infoWrapper: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
    conditionBadge: { backgroundColor: `${theme.main}15`, color: theme.main, fontSize: '11px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '999px', alignSelf: 'flex-start', marginBottom: '8px' },
    title: { fontSize: isMobile ? '20px' : '25px', fontWeight: 800, color: '#0f172a', marginBottom: '16px', lineHeight: 1.45, letterSpacing: '-0.3px', overflowWrap: 'anywhere', wordBreak: 'break-word' },

    // 일반 쇼핑몰 가격 섹션
    priceContainer: { marginBottom: isMobile ? '20px' : '28px', paddingBottom: isMobile ? '20px' : '28px', borderBottom: '1px solid #f1f5f9' },
    priceLabel: { display: 'block', color: '#94a3b8', fontSize: isMobile ? '12px' : '13px', fontWeight: 700, letterSpacing: '0.3px', marginBottom: '6px' },
    priceTag: { fontSize: isMobile ? '28px' : '36px', fontWeight: 900, color: theme.main, letterSpacing: '-0.5px' },
    priceKrw: { color: '#9ca3af', marginLeft: '10px', fontSize: isMobile ? '14px' : '16px', fontWeight: 600 },

    // 🌟 야후 옥션 전용 대시보드
    auctionDashboard: { backgroundColor: '#111827', padding: '24px', borderRadius: '20px', color: 'white', marginBottom: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
    aucPriceLabel: { fontSize: '14px', color: '#9ca3af', marginBottom: '4px' },
    aucLivePrice: { fontSize: isMobile ? '32px' : '42px', fontWeight: 900, color: '#10b981', margin: '0 0 4px 0', fontFamily: 'monospace' },
    aucPriceKrw: { fontSize: '16px', color: '#6b7280', margin: 0 },
    statsRow: { display: 'flex', gap: '20px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #374151' },
    statBox: { flex: 1 },
    statLabel: { fontSize: '13px', color: '#9ca3af', marginBottom: '4px' },
    statValue: { fontSize: '20px', fontWeight: 800, color: 'white' },
    endSchedule: { fontSize: '13px', color: '#6b7280', textAlign: 'right', marginTop: '16px' },

    // 🌟 미쿠짱 AI 요약 박스 스타일 (흰 카드 + 왼쪽 액센트 바 + 은은한 그림자로 고급스럽게)
    aiBox: {
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      padding: isMobile ? '20px' : '26px 28px',
      backgroundColor: '#ffffff',
      borderRadius: isMobile ? '18px' : '20px',
      border: '1px solid #f1f5f9',
      borderLeft: `4px solid ${theme.main}`,
      boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)',
      marginBottom: '20px',
      position: 'relative',
      overflow: 'hidden'
    },
    // 🌟 rakuten/mercari/yahoo_shopping/yahoo_auction 요약이 공통으로 쓰는 고급형 헤더 (아이콘 칩 + 배지)
    aiHeaderRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
    aiHeaderLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
    aiIconChip: {
      width: isMobile ? '32px' : '36px', height: isMobile ? '32px' : '36px', borderRadius: '50%',
      background: `linear-gradient(135deg, ${theme.main} 0%, ${theme.main}aa 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 4px 14px ${theme.main}4d, inset 0 1px 1px rgba(255,255,255,0.35)`,
      flexShrink: 0,
    },
    aiHeaderTitle: { fontWeight: 800, fontSize: isMobile ? '14px' : '15px', color: '#0f172a', letterSpacing: '-0.1px' },
    aiBadge: {
      fontSize: '10px', fontWeight: 800, color: theme.main, background: `${theme.main}12`,
      padding: '4px 10px', borderRadius: '999px', letterSpacing: '0.3px', flexShrink: 0,
    },
    // 🌟 "이 상품의 특징" 섹션 (접었다 펼 수 있는 아코디언, 기본값은 접힘)
    aiFeatureBlock: { marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed #e2e8f0' },
    aiFeatureToggle: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
      background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
    },
    aiFeatureLabel: {
      display: 'inline-block', fontSize: '11px', fontWeight: 800, color: theme.main,
      background: `${theme.main}12`, padding: '3px 10px', borderRadius: '999px',
      letterSpacing: '0.2px',
    },
    aiFeatureList: { margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' },
    aiFeatureText: {
      margin: 0, fontSize: isMobile ? '13px' : '14px', color: '#475569', lineHeight: '1.6',
      display: 'flex', alignItems: 'flex-start', gap: '8px',
    },
    aiFeatureBullet: { color: theme.main, fontWeight: 900, flexShrink: 0, lineHeight: 'inherit' },
    // 플랫폼 공통 속성 컨테이너 (메루카리 등)
    mercariAttrContainer: {
      background: '#fafafa',
      borderRadius: '16px',
      border: '1px solid #f0f0f0',
      padding: isMobile ? '6px 16px' : '6px 20px',
      marginBottom: '20px',
      boxSizing: 'border-box',
    },
    attrRow: { ...sharedFlexBetween, padding: '14px 0', borderBottom: '1px solid #f0f0f0' },
    attrLabel: { color: '#94a3b8', fontSize: isMobile ? '14px' : '15px', fontWeight: 600 },
    attrValue: { fontWeight: 800, fontSize: isMobile ? '15px' : '17px', color: '#1e293b' },
    categoryWrapper: { marginTop: '5px' },
    categoryLabel: { color: '#9ca3af', fontSize: isMobile ? '15px' : '17px', display: 'block', marginBottom: '4px' },
    categoryPath: { color: '#6b7280', fontSize: isMobile ? '13px' : '15px', margin: 0, lineHeight: '1.4' },

    // 라쿠텐 테이블
    rakutenTable: {
      display: 'flex', flexDirection: 'column',
      background: '#fafafa',
      border: '1px solid #f0f0f0',
      borderRadius: '16px',
      padding: isMobile ? '4px 16px' : '4px 20px',
      marginBottom: '20px',
      boxSizing: 'border-box',
    },
    tableRow: { display: 'flex', borderBottom: '1px solid #f0f0f0', padding: '16px 0', alignItems: 'center' },
    tableLabel: { width: isMobile ? '80px' : '100px', fontSize: isMobile ? '13px' : '14px', color: '#94a3b8', fontWeight: 600, flexShrink: 0 },
    tableValue: { flex: 1, fontSize: '14px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' },
    numberInput: { width: '64px', padding: '9px', border: '1px solid #e2e8f0', borderRadius: '10px', textAlign: 'center', fontWeight: 700, color: '#1e293b', outline: 'none', boxSizing: 'border-box' },
    memoArea: { width: '100%', minHeight: '80px', padding: '14px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', resize: 'none', backgroundColor: '#ffffff', outline: 'none', boxSizing: 'border-box' },

    // 버튼 및 공통 하단 요소
    buyBtn: { background: `linear-gradient(135deg, ${theme.main} 0%, ${theme.main}dd 100%)`, color: 'white', fontWeight: 900, padding: '18px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: isMobile ? '16px' : '19px', letterSpacing: '-0.2px', boxShadow: `0 10px 24px ${theme.main}40`, marginTop: '10px' },
    smallBtn: { padding: '5px 12px', fontSize: '12px', fontWeight: 700, border: '1px solid #e2e8f0', borderRadius: '999px', background: '#fff', cursor: 'pointer', color: '#64748b', marginLeft: '4px', display: 'inline-flex', alignItems: 'center' },

    bottomSection: { marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '30px', width: '100%', minWidth: 0, boxSizing: 'border-box' },
    // 🌟 mypage/status의 .miku-premium-payment-wrapper와 동일한 카드 스타일
    calcBox: {
      width: '100%', maxWidth: '100%', boxSizing: 'border-box',
      padding: isMobile ? '20px 16px' : '32px 40px',
      backgroundColor: '#ffffff',
      borderRadius: isMobile ? '20px' : '24px',
      border: '1px solid #f1f5f9',
      boxShadow: '0 12px 40px rgba(15, 23, 42, 0.06)',
    },
    calcGrid: { display: 'flex', alignItems: 'stretch', gap: isMobile ? '12px' : '20px', flexDirection: isMobile ? 'column' : 'row' },
    calcItemsBox: {
      flex: 1,
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      background: '#fafafa',
      borderRadius: '20px',
      border: '1px solid #f0f0f0',
      padding: isMobile ? '20px 12px' : '26px',
      boxSizing: 'border-box',
      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8)',
    },
    calcItem: { textAlign: 'center', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' },
    calcItemLabel: { color: '#71717a', fontSize: isMobile ? '14px' : '17px', fontWeight: 900 },
    calcItemVal: { fontWeight: 800, fontSize: isMobile ? '15px' : '20px', color: '#27272a', letterSpacing: '-0.5px', margin: 0 },
    totalSumBox: {
      flex: isMobile ? 'none' : '0 0 480px',
      width: isMobile ? '100%' : '480px',
      padding: isMobile ? '20px 40px' : '26px 56px',
      background: 'linear-gradient(155deg, #18181b 0%, #27272a 60%, #1f1f22 100%)',
      borderRadius: '30px',
      boxShadow: '0 10px 28px rgba(24, 24, 27, 0.25), inset 0 0 0 1px rgba(253, 186, 116, 0.12)',
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center',
      textAlign: 'right', boxSizing: 'border-box',
    },
    totalLabel: { color: '#a1a1aa', fontSize: isMobile ? '15px' : '17px', fontWeight: 700, letterSpacing: '0.5px' },
    totalJpy: { fontSize: isMobile ? '32px' : '39px', fontWeight: 900, color: '#ffffff', margin: '8px 0 4px', letterSpacing: '-0.5px' },
    totalKrw: { color: '#fdba74', fontWeight: 800, fontSize: isMobile ? '13px' : '14px', margin: 0, letterSpacing: '-0.1px' },
    calcFooterNotice: { fontSize: isMobile ? '12px' : '13px', color: '#94a3b8', textAlign: 'right', marginTop: '20px' },

    // 🌟 mypage/status의 domestic-fee-notice와 동일한 스타일 (주황 톤 경고 박스)
    translationNotice: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '20px',
      padding: isMobile ? '14px 16px' : '18px 22px',
      background: '#fff7ed',
      border: '1.5px solid #fdba74',
      borderLeft: '5px solid #ea580c',
      borderRadius: '10px',
      boxShadow: '0 2px 8px rgba(234, 88, 12, 0.08)',
      fontSize: isMobile ? '14px' : '16px',
      fontWeight: 800,
      color: '#9a3412',
      lineHeight: 1.5,
      textAlign: 'left',
    },
    translationNoticeIcon: { fontSize: isMobile ? '20px' : '22px', lineHeight: 1, flexShrink: 0 },

    // 🌟 경고 박스(translationNotice/cautionBox) + 상세 설명 카드를 감싸는 순수 레이아웃 컨테이너 (카드 스타일 없음)
    descSectionWrapper: { display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' },
    descBox: {
      width: '100%', maxWidth: '100%', boxSizing: 'border-box',
      padding: isMobile ? '24px 20px' : '36px 40px',
      backgroundColor: '#ffffff',
      borderRadius: isMobile ? '20px' : '24px',
      border: '1px solid #f1f5f9',
      boxShadow: '0 12px 40px rgba(15, 23, 42, 0.06)',
      overflowWrap: 'anywhere',
    },
    descTitle: { margin: '0 0 20px 0', fontSize: isMobile ? '17px' : '19px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '10px' },
    descTitleBar: { width: '4px', height: '18px', borderRadius: '2px', background: theme.main, display: 'inline-block', flexShrink: 0 },
    descText: { lineHeight: '1.9', whiteSpace: 'pre-wrap', color: '#475569', fontSize: isMobile ? '14px' : '15px', letterSpacing: '-0.1px' },

    // 🌟 "■" 구분자 기준으로 나눈 상세 설명 항목 리스트
    descList: { display: 'flex', flexDirection: 'column', gap: '14px' },
    descListItem: { display: 'flex', alignItems: 'flex-start', gap: '8px', margin: 0, lineHeight: '1.8', color: '#475569', fontSize: isMobile ? '14px' : '15px', letterSpacing: '-0.1px' },
    descBullet: { color: theme.main, fontWeight: 900, flexShrink: 0, marginTop: '1px' },
  };
};