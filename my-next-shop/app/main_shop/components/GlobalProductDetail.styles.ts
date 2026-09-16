import { CSSProperties } from "react";
import { getShopTheme } from "./shopTheme";

// 🌟 상세 패널 테마. main/light는 기존 호환용(옥션 등), from/to/shadow는 채우기 요소(버튼·아이콘 칩)용입니다.
// ⚠️ `${theme.main}15` 처럼 hex 뒤에 알파를 붙이므로 main은 반드시 6자리 hex여야 합니다.
export interface DetailTheme {
  main: string;
  light: string;
  from?: string;
  to?: string;
  shadow?: string;
}

// 🌟 쇼핑몰별 상세 패널 색상 — 목록/사이드바와 같은 부드러운 shopTheme 팔레트를 씁니다.
// 야후 옥션은 옥션 전용 화면(입찰 폼·카운트다운)이 레드 톤이라 그 톤에 맞춥니다.
export function getDetailTheme(platform?: string): DetailTheme {
  if (platform === 'yahoo_auction') {
    return { main: '#dc3b3b', light: '#fef2f2', from: '#ea5a5a', to: '#c93434', shadow: 'rgba(201, 52, 52, 0.4)' };
  }
  const t = getShopTheme(platform);
  return { main: t.accent, light: t.bg, from: t.from, to: t.to, shadow: t.shadow };
}

export const PLATFORM_LABEL: Record<string, string> = {
  rakuten: '라쿠텐',
  mercari: '메루카리',
  yahoo_shopping: '야후 쇼핑',
  yahoo_auction: '야후 옥션',
  amazon: '아마존',
};

export const getDetailStyles = (isMobile: boolean, theme: DetailTheme): Record<string, CSSProperties> => {
  const from = theme.from || theme.main;
  const to = theme.to || theme.main;
  const shadow = theme.shadow || 'rgba(15, 23, 42, 0.25)';
  const sharedFlexCenter: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const sharedFlexBetween: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const softCard: CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid #eceef3',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 30px rgba(15, 23, 42, 0.05)',
    boxSizing: 'border-box',
  };
  const eyebrow: CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 800, letterSpacing: '0.14em',
    textTransform: 'uppercase', color: theme.main,
  };

  return {
    container: {
      marginTop: isMobile ? '10px' : '24px',
      padding: isMobile ? '16px' : '40px 40px 44px',
      backgroundColor: '#ffffff',
      borderRadius: isMobile ? '22px' : '28px',
      border: '1px solid #eceef3',
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 24px 64px rgba(15, 23, 42, 0.09)',
      position: 'relative',
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      overflowX: 'hidden'
    },

    // 🌟 제목 위 eyebrow 줄 (쇼핑몰 · 판매 상태 · 컨디션)
    eyebrowRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingRight: isMobile ? '40px' : '92px' },
    platformChip: {
      display: 'inline-flex', alignItems: 'center', gap: '7px',
      padding: '4px 12px 4px 5px', borderRadius: '999px',
      background: theme.light, border: `1px solid ${theme.main}26`,
      color: theme.main, fontSize: '12px', fontWeight: 800, letterSpacing: '0.02em',
    },
    platformDot: {
      width: '20px', height: '20px', borderRadius: '50%',
      background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
      boxShadow: `0 2px 6px ${shadow}`,
      ...sharedFlexCenter, flexShrink: 0,
    },
    statusChip: {
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '5px 11px', borderRadius: '999px',
      background: '#ecfdf3', border: '1px solid #c6ecd5', color: '#1f7a4a',
      fontSize: '12px', fontWeight: 800,
    },
    statusChipSold: { background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#4b5563' },
    statusDot: { width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', flexShrink: 0 },

    originalLink: {
      display: 'inline-flex',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: '6px',
      color: '#4b5563',
      background: '#f8f9fb',
      border: '1px solid #e6e8ee',
      borderRadius: '999px',
      padding: isMobile ? '6px 12px' : '7px 14px',
      fontSize: isMobile ? '12px' : '13px',
      textDecoration: 'none',
      cursor: 'pointer',
      marginBottom: isMobile ? '18px' : '22px',
      fontWeight: 700,
      transition: 'color 0.2s ease, border-color 0.2s ease, background 0.2s ease',
    },

    CloseBtn: {
      position: 'absolute', top: isMobile ? '12px' : '22px', right: isMobile ? '12px' : '24px', zIndex: 30,
      ...sharedFlexCenter, gap: '6px',
      height: isMobile ? '34px' : '38px',
      width: isMobile ? '34px' : 'auto',
      padding: isMobile ? 0 : '0 14px 0 12px',
      backgroundColor: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(8px)',
      borderRadius: '999px', border: '1px solid #e6e8ee', cursor: 'pointer',
      boxShadow: '0 2px 10px rgba(15, 23, 42, 0.06)',
      color: '#4b5563',
      transition: 'background 0.2s ease, color 0.2s ease, border-color 0.2s ease',
    },
    CloseText: { fontSize: '13px', fontWeight: 700, color: 'inherit', letterSpacing: '0.02em' },

    topSection: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '22px' : '44px', marginBottom: isMobile ? '22px' : '36px', width: '100%', minWidth: 0, boxSizing: 'border-box' },

    imageWrapper: { flex: isMobile ? 'none' : 1.05, display: 'flex', flexDirection: 'column', gap: '12px', width: isMobile ? '100%' : 'auto', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' },
    mainImgBox: {
      aspectRatio: isMobile ? '4/3' : '1/1', width: '100%', maxWidth: '100%',
      background: 'radial-gradient(circle at 50% 40%, #ffffff 0%, #f5f6f8 100%)',
      borderRadius: isMobile ? '18px' : '22px', overflow: 'hidden',
      border: '1px solid #eceef3',
      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
      position: 'relative', boxSizing: 'border-box',
    },
    mainImg: (isHovered: boolean): CSSProperties => ({
      width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.5s ease',
      transform: isHovered && !isMobile ? 'scale(1.05)' : 'scale(1)'
    }),
    imgCounter: {
      position: 'absolute', right: '12px', bottom: '12px',
      padding: '4px 10px', borderRadius: '999px',
      background: 'rgba(17, 24, 39, 0.62)',
      color: '#ffffff', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em',
      pointerEvents: 'none',
    },
    soldOutOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(17, 24, 39, 0.45)', ...sharedFlexCenter },
    soldOutText: { color: 'white', fontWeight: 900, fontSize: '22px', letterSpacing: '0.12em', border: '2px solid rgba(255,255,255,0.9)', padding: '10px 26px', borderRadius: '12px', background: 'rgba(17,24,39,0.35)' },

    thumbScroll: { display: 'flex', gap: '10px', overflowX: 'auto', overflowY: 'hidden', width: '100%', padding: '4px 4px 10px', boxSizing: 'border-box', alignItems: 'center', WebkitOverflowScrolling: 'touch' },
    thumbImg: (isActive: boolean): CSSProperties => ({
      width: isMobile ? '62px' : '70px', height: isMobile ? '62px' : '70px', borderRadius: '14px', cursor: 'pointer', flexShrink: 0, objectFit: 'cover',
      background: '#f5f6f8',
      border: `2px solid ${isActive ? theme.main : '#eceef3'}`,
      boxShadow: isActive ? `0 0 0 3px ${theme.main}1f, 0 6px 14px ${theme.main}24` : 'none',
      opacity: isActive ? 1 : 0.72,
      transition: 'opacity 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
    }),

    infoWrapper: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
    conditionBadge: { display: 'inline-flex', alignItems: 'center', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', fontSize: '12px', fontWeight: 800, padding: '5px 11px', borderRadius: '999px' },
    title: { fontSize: isMobile ? '19px' : '23px', fontWeight: 800, color: '#111827', margin: '0 0 14px', lineHeight: 1.5, letterSpacing: '-0.3px', overflowWrap: 'anywhere', wordBreak: 'break-word' },

    // 일반 쇼핑몰 가격 섹션
    priceContainer: {
      position: 'relative',
      marginBottom: isMobile ? '16px' : '18px',
      padding: isMobile ? '18px' : '22px 26px',
      borderRadius: isMobile ? '18px' : '20px',
      background: `linear-gradient(135deg, ${theme.light} 0%, #ffffff 80%)`,
      border: `1px solid ${theme.main}24`,
      boxSizing: 'border-box',
    },
    priceLabel: { ...eyebrow, marginBottom: '8px' },
    priceRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: '12px', rowGap: '8px' },
    priceTag: { fontSize: isMobile ? '30px' : '38px', fontWeight: 900, color: '#111827', letterSpacing: '-0.8px', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' },
    priceKrw: {
      display: 'inline-flex', alignItems: 'center',
      padding: '5px 12px', borderRadius: '999px',
      background: '#ffffff', border: '1px solid #e6e8ee',
      color: '#374151', fontSize: isMobile ? '13px' : '14px', fontWeight: 700,
    },
    priceNote: { margin: '10px 0 0', fontSize: '12px', color: '#6b7280', fontWeight: 600 },

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

    // 🌟 미쿠짱 AI 요약 박스 (옅은 테마색 → 흰색 그라데이션 카드)
    aiBox: {
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      padding: isMobile ? '18px' : '22px 24px',
      background: `linear-gradient(160deg, ${theme.light} 0%, #ffffff 55%)`,
      borderRadius: isMobile ? '18px' : '20px',
      border: `1px solid ${theme.main}1f`,
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03), 0 10px 28px rgba(15, 23, 42, 0.05)',
      marginBottom: '18px',
      position: 'relative',
      overflow: 'hidden'
    },
    aiHeaderRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' },
    aiHeaderLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
    aiIconChip: {
      width: isMobile ? '32px' : '36px', height: isMobile ? '32px' : '36px', borderRadius: '11px',
      background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 6px 14px -4px ${shadow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
      flexShrink: 0,
    },
    aiHeaderTitle: { fontWeight: 800, fontSize: isMobile ? '14px' : '15px', color: '#111827', letterSpacing: '-0.1px' },
    aiBadge: {
      fontSize: '10px', fontWeight: 800, color: theme.main, background: '#ffffff',
      border: `1px solid ${theme.main}33`,
      padding: '3px 9px', borderRadius: '999px', letterSpacing: '0.12em', flexShrink: 0,
    },
    aiFeatureBlock: { marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed #e2e5eb' },
    aiFeatureToggle: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
      background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
    },
    aiFeatureLabel: {
      display: 'inline-block', fontSize: '12px', fontWeight: 800, color: theme.main,
      background: '#ffffff', border: `1px solid ${theme.main}33`, padding: '4px 11px', borderRadius: '999px',
      letterSpacing: '0.02em',
    },
    aiFeatureList: { margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' },
    aiFeatureText: {
      margin: 0, fontSize: isMobile ? '13px' : '14px', color: '#374151', lineHeight: '1.65',
      display: 'flex', alignItems: 'flex-start', gap: '8px',
    },
    aiFeatureBullet: { color: theme.main, fontWeight: 900, flexShrink: 0, lineHeight: 'inherit' },

    // 플랫폼 공통 속성 컨테이너 (메루카리 등)
    mercariAttrContainer: {
      ...softCard,
      borderRadius: '18px',
      padding: isMobile ? '2px 16px' : '2px 20px',
      marginBottom: '18px',
    },
    attrRow: { ...sharedFlexBetween, padding: '14px 0', borderBottom: '1px solid #f1f2f5' },
    attrLabel: { color: '#6b7280', fontSize: isMobile ? '13px' : '14px', fontWeight: 700 },
    attrValue: { fontWeight: 800, fontSize: isMobile ? '14px' : '15px', color: '#111827' },
    categoryWrapper: { marginTop: '5px' },
    categoryLabel: { color: '#6b7280', fontSize: isMobile ? '15px' : '17px', display: 'block', marginBottom: '4px' },
    categoryPath: { color: '#4b5563', fontSize: isMobile ? '13px' : '15px', margin: 0, lineHeight: '1.4' },

    // 라쿠텐 주문 정보 테이블
    rakutenTable: {
      ...softCard,
      display: 'flex', flexDirection: 'column',
      borderRadius: '18px',
      padding: isMobile ? '2px 16px' : '2px 20px',
      marginBottom: '18px',
    },
    tableRow: { display: 'flex', borderBottom: '1px solid #f1f2f5', padding: isMobile ? '13px 0' : '15px 0', alignItems: 'center', gap: '12px' },
    tableRowTop: { alignItems: 'flex-start' },
    tableLabel: { width: isMobile ? '80px' : '92px', fontSize: '13px', color: '#6b7280', fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '7px' },
    tableLabelIcon: { color: theme.main, display: 'inline-flex', flexShrink: 0 },
    tableValue: { flex: 1, minWidth: 0, fontSize: '14px', color: '#111827', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' },
    shopNameText: { fontWeight: 800, color: '#111827', overflowWrap: 'anywhere' },

    // 수량 스테퍼
    stepper: { display: 'inline-flex', alignItems: 'center', border: '1px solid #e2e5eb', borderRadius: '12px', overflow: 'hidden', background: '#ffffff' },
    stepBtn: { width: '36px', height: '38px', border: 'none', background: '#f8f9fb', color: '#374151', cursor: 'pointer', ...sharedFlexCenter, padding: 0 },
    numberInput: { width: '52px', height: '38px', padding: 0, borderTop: 'none', borderBottom: 'none', borderLeft: '1px solid #e2e5eb', borderRight: '1px solid #e2e5eb', borderRadius: 0, textAlign: 'center', fontWeight: 800, fontSize: '15px', color: '#111827', outline: 'none', boxSizing: 'border-box', background: '#ffffff' },
    stepHint: { fontSize: '12px', color: '#6b7280', fontWeight: 600 },
    memoArea: { width: '100%', minHeight: '76px', padding: '12px 14px', border: '1px solid #e2e5eb', borderRadius: '12px', fontSize: '13px', lineHeight: 1.6, color: '#111827', resize: 'vertical', backgroundColor: '#fbfbfc', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease' },

    // 버튼 및 공통 하단 요소
    buyBtn: {
      width: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
      background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
      color: '#ffffff', fontWeight: 800,
      padding: isMobile ? '15px 18px' : '17px 22px',
      borderRadius: '16px', border: 'none', cursor: 'pointer',
      fontSize: isMobile ? '16px' : '17px', letterSpacing: '-0.2px',
      boxShadow: `0 14px 28px -10px ${shadow}, inset 0 1px 0 rgba(255,255,255,0.22)`,
      marginTop: '4px',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease',
    },
    buyBtnDisabled: { background: '#d1d5db', color: '#4b5563', boxShadow: 'none', cursor: 'not-allowed' },
    buyBtnArrow: { width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', ...sharedFlexCenter, marginLeft: '2px', flexShrink: 0 },
    buyHint: { margin: '10px 0 0', fontSize: '12px', color: '#6b7280', fontWeight: 600, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
    smallBtn: { padding: '5px 10px 5px 12px', fontSize: '12px', fontWeight: 700, border: '1px solid #e2e5eb', borderRadius: '999px', background: '#ffffff', cursor: 'pointer', color: '#374151', display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'color 0.2s ease, border-color 0.2s ease, background 0.2s ease' },

    bottomSection: { marginTop: '4px', display: 'flex', flexDirection: 'column', gap: isMobile ? '20px' : '28px', width: '100%', minWidth: 0, boxSizing: 'border-box' },

    // 🌟 예상 결제 금액 카드 (프리미엄: 상단 테마 라인 + 은은한 글로우 — 장식은 Base 의 .gpd-calc-card CSS)
    calcBox: {
      ...softCard,
      position: 'relative', overflow: 'hidden',
      width: '100%', maxWidth: '100%',
      padding: isMobile ? '22px 16px 18px' : '30px 32px 26px',
      borderRadius: isMobile ? '20px' : '26px',
      background: `radial-gradient(60% 120% at 0% 0%, ${theme.main}12 0%, rgba(255,255,255,0) 55%), linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%)`,
      border: '1px solid #e9edf3',
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 24px 48px -30px rgba(15, 23, 42, 0.3)',
    },
    sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px 12px', marginBottom: isMobile ? '16px' : '20px' },
    sectionHeadMain: { display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 },
    sectionIcon: {
      width: isMobile ? '40px' : '44px', height: isMobile ? '40px' : '44px', borderRadius: isMobile ? '13px' : '14px', flexShrink: 0,
      ...sharedFlexCenter, color: '#ffffff',
      background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
      boxShadow: `0 10px 20px -10px ${shadow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
    },
    sectionEyebrow: { ...eyebrow, marginBottom: '3px' },
    sectionTitle: { margin: 0, fontSize: isMobile ? '17px' : '20px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.4px' },
    rateChip: {
      display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 13px', borderRadius: '999px',
      background: '#ffffff', border: '1px solid #e6e9ef', color: '#374151', fontSize: '12px', fontWeight: 700,
      boxShadow: '0 4px 12px -8px rgba(15, 23, 42, 0.25)',
    },
    rateChipIcon: { width: '20px', height: '20px', borderRadius: '50%', ...sharedFlexCenter, background: theme.light, color: theme.main, flexShrink: 0 },
    calcGrid: { display: 'flex', alignItems: 'stretch', gap: isMobile ? '12px' : '18px', flexDirection: isMobile ? 'column' : 'row' },
    calcItemsBox: {
      flex: 1,
      minWidth: 0,
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      background: 'linear-gradient(180deg, #fbfbfd 0%, #f5f6f9 100%)',
      borderRadius: '20px',
      border: '1px solid #eaedf2',
      boxShadow: 'inset 0 1px 0 #ffffff',
      padding: isMobile ? '16px 4px' : '22px 10px',
      boxSizing: 'border-box',
    },
    calcItem: { textAlign: 'center', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: isMobile ? '6px' : '8px', padding: '0 6px' },
    calcItemIcon: {
      width: isMobile ? '28px' : '34px', height: isMobile ? '28px' : '34px', borderRadius: isMobile ? '9px' : '11px',
      ...sharedFlexCenter, background: '#ffffff', border: '1px solid #e6e9ef', color: theme.main,
      boxShadow: '0 6px 14px -10px rgba(15, 23, 42, 0.35)',
    },
    calcItemLabel: { color: '#475569', fontSize: isMobile ? '12.5px' : '15px', fontWeight: 700, whiteSpace: 'nowrap' },
    calcItemVal: { fontWeight: 900, fontSize: isMobile ? '18px' : '26px', color: '#0f172a', letterSpacing: '-0.5px', margin: 0, fontVariantNumeric: 'tabular-nums' },
    yen: { fontSize: '0.68em', fontWeight: 700, color: '#94a3b8', marginRight: '1px' },
    totalSumBox: {
      position: 'relative',
      flex: isMobile ? 'none' : '0 0 340px',
      width: isMobile ? '100%' : '340px',
      padding: isMobile ? '20px 22px' : '24px 28px',
      background: `radial-gradient(90% 90% at 100% 0%, ${theme.main}40 0%, rgba(0,0,0,0) 60%), radial-gradient(70% 80% at 0% 100%, rgba(56,189,248,0.14) 0%, rgba(0,0,0,0) 60%), linear-gradient(155deg, #172033 0%, #0f172a 55%, #0b1220 100%)`,
      borderRadius: '22px',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: `0 22px 40px -20px rgba(15, 18, 30, 0.6), 0 12px 30px -18px ${shadow}, inset 0 1px 0 rgba(255, 255, 255, 0.08)`,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center',
      textAlign: 'right', boxSizing: 'border-box', overflow: 'hidden', isolation: 'isolate',
    },
    totalAccent: { position: 'absolute', left: 0, top: 0, right: 0, height: '3px', background: `linear-gradient(90deg, transparent 0%, ${from} 25%, #fde68a 50%, ${to} 75%, transparent 100%)` },
    totalLabel: { display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#c3cad6', fontSize: isMobile ? '13px' : '14px', fontWeight: 800, letterSpacing: '0.12em' },
    totalEq: { width: '22px', height: '22px', borderRadius: '6px', ...sharedFlexCenter, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.16)', color: '#ffffff', fontSize: '13px', fontWeight: 900, letterSpacing: 0 },
    totalJpy: { fontSize: isMobile ? '36px' : '46px', fontWeight: 900, color: '#ffffff', margin: '6px 0 12px', letterSpacing: '-0.8px', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' },
    totalYen: { fontSize: '0.6em', fontWeight: 800, color: '#aeb6c6', marginRight: '2px' },
    totalKrw: {
      display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 13px', borderRadius: '999px',
      background: 'linear-gradient(135deg, rgba(253,230,138,0.2) 0%, rgba(245,196,81,0.12) 100%)',
      border: '1px solid rgba(253,230,138,0.35)', color: '#fde68a', fontWeight: 800, fontSize: isMobile ? '14px' : '15px', margin: 0,
      fontVariantNumeric: 'tabular-nums',
    },
    calcFooterNotice: {
      fontSize: '12px', color: '#64748b', fontWeight: 600, margin: '16px 0 0',
      display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.55,
      padding: '9px 12px', borderRadius: '12px', background: '#f8f9fb', border: '1px dashed #e2e6ec',
    },

    // 🌟 번역/경매 주의 안내 (프리미엄 앰버 카드)
    translationNotice: {
      position: 'relative', overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '12px' : '16px',
      margin: '0 0 18px',
      padding: isMobile ? '14px 14px 14px 18px' : '18px 22px 18px 26px',
      background: 'radial-gradient(60% 140% at 0% 0%, rgba(251,191,36,0.2) 0%, rgba(251,191,36,0) 60%), linear-gradient(135deg, #fffbeb 0%, #fff8ee 60%, #fffdf7 100%)',
      border: '1px solid #f3dca4',
      borderRadius: isMobile ? '16px' : '18px',
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03), 0 16px 32px -26px rgba(180, 83, 9, 0.55)',
      textAlign: 'left',
    },
    translationNoticeBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)' },
    translationNoticeIcon: {
      position: 'relative',
      width: isMobile ? '38px' : '44px', height: isMobile ? '38px' : '44px', borderRadius: isMobile ? '12px' : '14px',
      background: 'linear-gradient(145deg, #fbbf24 0%, #d97706 100%)', color: '#ffffff',
      boxShadow: '0 10px 18px -10px rgba(217, 119, 6, 0.8), inset 0 1px 0 rgba(255,255,255,0.35)',
      ...sharedFlexCenter, flexShrink: 0,
    },
    translationNoticeBody: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
    translationNoticeEyebrow: { fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.18em', color: '#b45309' },
    translationNoticeText: { fontSize: isMobile ? '13px' : '14.5px', fontWeight: 700, color: '#7c3f06', lineHeight: 1.55, wordBreak: 'keep-all' },

    descSectionWrapper: { display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' },
    descBox: {
      ...softCard,
      width: '100%', maxWidth: '100%',
      padding: isMobile ? '22px 18px' : '30px 34px',
      borderRadius: isMobile ? '20px' : '24px',
      overflowWrap: 'anywhere',
    },
    descHead: { paddingBottom: isMobile ? '14px' : '16px', marginBottom: isMobile ? '16px' : '20px', borderBottom: '1px solid #f1f2f5' },
    descTitle: { margin: 0, fontSize: isMobile ? '17px' : '19px', fontWeight: 800, color: '#111827', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '10px' },
    descTitleBar: { width: '4px', height: '18px', borderRadius: '2px', background: `linear-gradient(180deg, ${from} 0%, ${to} 100%)`, display: 'inline-block', flexShrink: 0 },
    descText: { lineHeight: '1.9', whiteSpace: 'pre-wrap', color: '#374151', fontSize: isMobile ? '14px' : '15px', letterSpacing: '-0.1px', margin: 0 },

    descList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    descListItem: { display: 'flex', alignItems: 'flex-start', gap: '8px', margin: 0, lineHeight: '1.8', color: '#374151', fontSize: isMobile ? '14px' : '15px', letterSpacing: '-0.1px' },
    descBullet: { color: theme.main, fontWeight: 800, flexShrink: 0, marginTop: '1px' },
  };
};
