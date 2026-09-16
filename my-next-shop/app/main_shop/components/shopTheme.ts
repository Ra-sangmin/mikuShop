// 🌟 쇼핑몰별 화면 포인트 컬러 (부드러운 톤)
// 원래 브랜드 원색(라쿠텐·야후 쇼핑 #bf0000, 메루카리 #ff0038 등)을 버튼·배지에 그대로 칠하면
// 눈이 피로해서, 채우는 요소(배지/버튼/선택 칩)는 옅은→중간 톤 그라데이션으로,
// 글자·테두리 포인트는 한 단계 차분한 색으로 씁니다.
// ⚠️ CSS의 color-mix()는 이 프로젝트 CSS 빌드에서 오류를 내므로, 색을 여기서 미리 정해 둡니다.
export interface ShopTheme {
  accent: string;  // 글자·테두리·얇은 라인
  from: string;    // 채우기 그라데이션 시작(밝은 쪽)
  to: string;      // 채우기 그라데이션 끝
  bg: string;      // 옅은 배경
  shadow: string;  // 채운 요소의 그림자 색
}

// 🌟 가독성 기준: 흰 글씨 대비 — 그라데이션 시작색 4:1 이상, 끝색 5.5:1 이상, 포인트 글자색 4.5:1 이상
//    (원색보다 채도는 낮추되, 너무 연해져 글씨가 안 보이던 문제를 보완)
const RED: ShopTheme = { accent: '#b04545', from: '#c95757', to: '#a94141', bg: '#fdf2f2', shadow: 'rgba(169, 65, 65, 0.45)' };
const PINK_RED: ShopTheme = { accent: '#b94459', from: '#c85468', to: '#aa3f52', bg: '#fff3f5', shadow: 'rgba(170, 63, 82, 0.45)' };
const ORANGE: ShopTheme = { accent: '#a8620f', from: '#b86c16', to: '#9a5a0e', bg: '#fff6ea', shadow: 'rgba(154, 90, 14, 0.4)' };
const INDIGO: ShopTheme = { accent: '#4f57c9', from: '#6a72de', to: '#4f57c9', bg: '#f3f3fe', shadow: 'rgba(79, 87, 201, 0.45)' };

const BY_PLATFORM: Record<string, ShopTheme> = {
  rakuten: RED,
  yahoo_shopping: RED,
  yahoo: RED,
  mercari: PINK_RED,
  yahoo_auction: ORANGE,
  amazon: ORANGE,
  default: INDIGO,
};

// GlobalLayout은 platform 대신 layout.tsx의 brandColor를 받으므로 색으로도 찾습니다.
const BY_BRAND_COLOR: Record<string, ShopTheme> = {
  '#bf0000': RED,
  '#ff0021': PINK_RED,
  '#ff0038': PINK_RED,
  '#ffa600': ORANGE,
  '#ff9900': ORANGE,
};

export function getShopTheme(platform?: string): ShopTheme {
  return BY_PLATFORM[platform || 'default'] || INDIGO;
}

export function getShopThemeByColor(color?: string): ShopTheme {
  return BY_BRAND_COLOR[(color || '').toLowerCase()] || INDIGO;
}

/** CSS 변수로 변환 (prefix 예: 'gs' → --gs-brand, --gs-brand-bg, --gs-from, --gs-to, --gs-shadow) */
export function shopThemeVars(prefix: string, t: ShopTheme): Record<string, string> {
  return {
    [`--${prefix}-brand`]: t.accent,
    [`--${prefix}-brand-bg`]: t.bg,
    [`--${prefix}-from`]: t.from,
    [`--${prefix}-to`]: t.to,
    [`--${prefix}-shadow`]: t.shadow,
  };
}
