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
      padding: isMobile ? '16px' : '40px', 
      backgroundColor: 'white', 
      borderRadius: isMobile ? '24px' : '40px', 
      boxShadow: '0 20px 40px rgba(0,0,0,0.08)', 
      position: 'relative', 
      width: '100%', 
      boxSizing: 'border-box' 
    },
    
    CloseBtn: { 
      position: 'absolute', top: '12px', right: isMobile ? '12px' : '24px', zIndex: 30, 
      ...sharedFlexCenter, width: '36px', height: '36px', 
      backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', 
      borderRadius: '50%', border: 'none', cursor: 'pointer'
    },
    CloseText: { position: 'absolute', right: '48px', fontSize: '13px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.05em' },

    topSection: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '40px', marginBottom: '30px' },
    
    imageWrapper: { flex: isMobile ? 'none' : 1.1, display: 'flex', flexDirection: 'column', gap: '12px' },
    mainImgBox: { aspectRatio: isMobile ? '4/3' : '1/1', backgroundColor: '#f9fafb', borderRadius: '20px', overflow: 'hidden', border: '1px solid #f3f4f6', position: 'relative' },
    mainImg: (isHovered: boolean): CSSProperties => ({ 
      width: '100%', height: '100%', objectFit: 'contain', transition: '0.5s', 
      transform: isHovered && !isMobile ? 'scale(1.05)' : 'scale(1)' 
    }),
    soldOutOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', ...sharedFlexCenter },
    soldOutText: { color: 'white', fontWeight: 900, fontSize: '24px', border: '4px solid white', padding: '8px 24px', transform: 'rotate(-10deg)' },
    
    thumbScroll: { display: 'flex', gap: '8px', overflowX: 'auto', overflowY: 'hidden', width: '100%', paddingBottom: '10px', marginTop: '10px', alignItems: 'center', WebkitOverflowScrolling: 'touch' },
    thumbImg: (isActive: boolean): CSSProperties => ({ 
      width: isMobile ? '65px' : '72px', height: isMobile ? '65px' : '72px', borderRadius: '12px', cursor: 'pointer', flexShrink: 0, objectFit: 'cover',
      border: `2px solid ${isActive ? theme.main : 'transparent'}`
    }),

    infoWrapper: { flex: 1, display: 'flex', flexDirection: 'column' },
    conditionBadge: { backgroundColor: `${theme.main}15`, color: theme.main, fontSize: '11px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '999px', alignSelf: 'flex-start', marginBottom: '8px' },
    title: { fontSize: isMobile ? '20px' : '26px', fontWeight: 800, color: '#111827', marginBottom: '16px', lineHeight: 1.4 },
    
    // 일반 쇼핑몰 가격 섹션
    priceContainer: { marginBottom: isMobile ? '20px' : '30px' },
    priceTag: { fontSize: isMobile ? '28px' : '36px', fontWeight: 900, color: theme.main },
    priceKrw: { color: '#9ca3af', marginLeft: '10px', fontSize: isMobile ? '14px' : '16px' },

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

    // 플랫폼 공통 속성 컨테이너
    attrContainer: { borderTop: '1px solid #f3f4f6', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '15px' },
    attrRow: sharedFlexBetween,
    attrLabel: { color: '#9ca3af', fontSize: isMobile ? '15px' : '17px' },
    attrValue: { fontWeight: 'bold', fontSize: isMobile ? '15px' : '17px' },
    categoryWrapper: { marginTop: '5px' },
    categoryLabel: { color: '#9ca3af', fontSize: isMobile ? '15px' : '17px', display: 'block', marginBottom: '4px' },
    categoryPath: { color: '#6b7280', fontSize: isMobile ? '13px' : '15px', margin: 0, lineHeight: '1.4' },

    // 라쿠텐 테이블
    rakutenTable: { display: 'flex', flexDirection: 'column', borderTop: '1px solid #eee', marginBottom: '20px' },
    tableRow: { display: 'flex', borderBottom: '1px solid #eee', padding: '12px 0', alignItems: 'center' },
    tableLabel: { width: isMobile ? '80px' : '100px', fontSize: '14px', color: '#888' },
    tableValue: { flex: 1, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' },
    numberInput: { width: '60px', padding: '8px', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' },
    memoArea: { width: '100%', minHeight: '80px', padding: '12px', border: '1px solid #eee', borderRadius: '12px', fontSize: '13px', resize: 'none', backgroundColor: '#fafafa' },

    // 버튼 및 공통 하단 요소
    buyBtn: { backgroundColor: theme.main, color: 'white', fontWeight: 900, padding: '18px', borderRadius: '24px', border: 'none', cursor: 'pointer', fontSize: isMobile ? '16px' : '20px', boxShadow: `0 8px 20px ${theme.main}44`, marginTop: '10px' },
    smallBtn: { padding: '4px 10px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '6px', background: '#fff', cursor: 'pointer', color: '#666', marginLeft: '4px', display: 'inline-flex', alignItems: 'center' },

    bottomSection: { marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '30px' },
    calcBox: { padding: isMobile ? '24px' : '40px', backgroundColor: theme.light, borderRadius: '32px', border: `1px dashed ${theme.main}` },
    calcHeader: { margin: '0 0 20px 0', color: theme.main, fontWeight: 900, textAlign: 'center', fontSize: isMobile ? '18px' : '26px' },
    calcGrid: { display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: isMobile ? '12px' : '20px' },
    calcItem: { textAlign: 'center', flex: isMobile ? '1 1 30%' : 'none' },
    calcSymbol: { color: '#cbd5e1', fontSize: '20px' },
    calcEquals: { 
      fontSize: '24px', 
      color: '#adb5bd', 
      margin: isMobile ? '10px 100%' : '0 10px', 
      textAlign: 'center' as const 
    },
    totalSumBox: { padding: isMobile ? '15px' : '20px 30px', background: '#fff', borderRadius: '20px', boxShadow: '0 8px 20px rgba(0,0,0,0.05)', border: `2px solid ${theme.main}`, textAlign: 'center', width: isMobile ? '100%' : 'auto' },
    totalLabel: { color: theme.main, fontSize: '20px', fontWeight: '800' },
    totalJpy: { fontSize: isMobile ? '28px' : '32px', fontWeight: 900, color: '#111827', margin: '2px 0' },
    totalKrw: { color: '#ef4444', fontWeight: '800', fontSize: isMobile ? '18px' : '22px', margin: 0 },
    calcFooterNotice: { fontSize: isMobile ? '12px' : '15px', color: '#9ca3af', textAlign: 'center', marginTop: '20px' },

    descBox: { padding: '30px', backgroundColor: '#f9fafb', borderRadius: '24px', border: '1px solid #f3f4f6' },
    descTitle: { margin: '0 0 16px 0', fontSize: '20px', fontWeight: 'bold' },
    descText: { lineHeight: '1.8', whiteSpace: 'pre-wrap', color: '#4b5563', fontSize: '15px' },

    cautionBox: { backgroundColor: '#fff5f5', border: '2px solid #e11d48', padding: isMobile ? '24px 16px' : '30px 24px', marginBottom: '30px', borderRadius: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 4px 15px rgba(225, 29, 72, 0.12)', position: 'relative', overflow: 'hidden' },
    cautionTitle: { color: '#e11d48', fontWeight: '900', fontSize: isMobile ? '18px' : '20px', ...sharedFlexCenter, gap: '8px' },
    cautionMainText: { fontSize: isMobile ? '15px' : '16px', color: '#1f2937', fontWeight: '600', lineHeight: '1.6', wordBreak: 'keep-all' },
  };
};