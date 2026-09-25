// 🤖 AI 하이브리드 검색 — 공용 타입
//
// 화면(클라이언트)에서도 가져다 쓰므로 이 파일에는 prisma·fetch 같은 서버 의존을 두지 않습니다.

/** 검색 대상. integrated 는 4개 쇼핑몰 전체입니다. */
export const MALLS = ['rakuten', 'mercari', 'yahoo_shopping', 'yahoo_auction'] as const;
export type Mall = (typeof MALLS)[number];
export type MallType = Mall | 'integrated';

export const MALL_LABEL: Record<Mall, string> = {
  rakuten: '라쿠텐',
  mercari: '메루카리',
  yahoo_shopping: '야후 쇼핑',
  yahoo_auction: '야후 옥션',
};

export function isMallType(v: unknown): v is MallType {
  return v === 'integrated' || (typeof v === 'string' && (MALLS as readonly string[]).includes(v));
}

/** 검색어 분석 결과. Gemini 가 만들든 정규식 폴백이 만들든 모양은 같습니다. */
export interface QueryAnalysis {
  /** 'keyword' = 단어만 친 검색, 'natural' = 문장으로 부탁한 검색 */
  kind: 'keyword' | 'natural';
  /** 쇼핑몰에 그대로 던질 일본어 검색어 */
  keywordJa: string;
  /** 사람이 보기 좋은 한국어 핵심어 (화면 표시용) */
  keywordKo: string;
  /** 카테고리 힌트 (예: 'ワンピース'). 몰마다 카테고리 ID 가 달라 검색어 보강·표시에만 씁니다. */
  category?: string | null;
  /** 화면 표시용 한국어 카테고리 (미쿠짱 화면에는 일본어를 그대로 보여 주지 않습니다) */
  categoryKo?: string | null;
  /** 엔화 기준 가격 범위. 한국 돈으로 말했으면 환율로 바꿔 둡니다. */
  minPriceJpy?: number | null;
  maxPriceJpy?: number | null;
  /** 빼고 싶은 단어 (일본어) */
  excludeJa?: string[];
  /** 화면 표시용 한국어 제외어 */
  excludeKo?: string[];
}

/** 화면에 내려가는 상품 한 건. 4개 몰을 이 모양 하나로 맞춥니다. */
export interface AiProduct {
  mall: Mall;
  itemId: string;
  nameJa: string;
  nameKo: string;
  priceJpy: number;
  thumbnail: string;
  url: string;
  shopName?: string | null;
  /** Qdrant 유사도 (캐시에서 나온 상품만) */
  score?: number;
  /** 'cache' = Qdrant 에서, 'live' = 방금 쇼핑몰 API 에서 */
  source: 'cache' | 'live';
  /** 질문과 가장 잘 맞는 상위 상품 → 카드에 "AI 추천" 표시 (pipeline 에서 정함) */
  aiPick?: boolean;
  /** AI 추천 이유 (배지에 마우스를 올리면 보여 줌). 규칙 기반이라 Gemini 호출을 쓰지 않습니다. */
  aiReasons?: string[];

  // ── 몰 페이지와 같은 상품 카드·상세 패널(GlobalProductCard / GlobalProductDetail)에 쓰는 값 ──
  /** 상세 패널 사진 목록 (라쿠텐·야후 쇼핑은 검색 결과에 들어 있음) */
  images?: string[];
  /** 상세 설명 원문(일본어). 라쿠텐 itemCaption, 야후 쇼핑 description */
  description?: string;
  status?: 'on_sale' | 'sold_out';
  /** 야후 옥션 전용 */
  bidCount?: number;
  timeLeft?: string;
}

/**
 * 검색 모드
 *  - ai       : Gemini 가 문장을 분석 + Qdrant 의미 검색
 *  - keyword  : 단순 단어 검색이라 분석(LLM)은 건너뛰고 Qdrant 의미 검색만 사용 (할당량 절약)
 *  - fallback : 한도 초과(429)·장애로 정규식 우회 → 쇼핑몰 API 직접 질의 (Gemini 호출 0회)
 */
export type SearchMode = 'ai' | 'keyword' | 'fallback';

export interface AiSearchResponse {
  mode: SearchMode;
  /** 폴백으로 넘어간 이유 (화면 안내용) */
  fallbackReason?: 'rate_limited' | 'ai_error' | 'no_api_key';
  analysis: QueryAnalysis;
  items: AiProduct[];
  /** 몰별 실시간 조회 결과 (실패한 몰은 error 가 채워집니다) */
  malls: { mall: Mall; count: number; error?: string }[];
  /** 봇 말풍선에 띄울 한 줄 */
  message: string;
  tookMs: number;
}

/** 가격 범위 문구. 한쪽만 있으면 "¥5,000 이하" / "¥1,000 이상" 으로 (예전엔 "~ ¥5,000" 처럼 어색했습니다). */
export function formatPriceRange(min?: number | null, max?: number | null): string {
  const yen = (v: number) => `¥${v.toLocaleString()}`;
  if (min && max) return `${yen(min)} ~ ${yen(max)}`;
  if (max) return `${yen(max)} 이하`;
  if (min) return `${yen(min)} 이상`;
  return '';
}
