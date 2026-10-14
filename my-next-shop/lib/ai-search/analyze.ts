// 🧠 검색어 분석 — "Gemini 로 분석하고, 안 되면 정규식으로 우회" 를 한 곳에서 결정합니다.
//
// 흐름
//   1) 같은 검색어의 분석 결과가 메모리 캐시에 있으면 그대로 씁니다. (Gemini 0회)
//   2) 누가 봐도 단어 검색이면(isObviouslyKeyword) 분석은 건너뛰고 번역만 합니다. (Gemini 0회)
//   3) 그 외에는 Gemini 로 분석합니다.
//   4) Gemini 가 429 / 키 없음 / 장애면 try-catch 로 잡아 즉시 정규식 폴백으로 넘어갑니다.

import { createTtlCache } from '@/lib/crawler/ttlCache';
import { getTranslatedText } from '@/lib/search-utils';
import { getBaseExchangeRate } from '@/lib/exchangeRate';
import { createHash } from 'crypto';
import { ANALYSIS_VERSION, analyzeQueryWithGemini, analyzeImageWithGemini, GeminiNoProductError, GeminiRateLimitError, GeminiUnavailableError, RawAnalysis } from './gemini';
import { isObviouslyKeyword, parseQueryWithRegex } from './fallback';
import type { QueryAnalysis, SearchMode, AiSearchResponse } from './types';

export interface AnalyzeResult {
  mode: SearchMode;
  fallbackReason?: AiSearchResponse['fallbackReason'];
  analysis: QueryAnalysis;
}

/** 분석 결과 캐시 (10분, 500개). 인기 검색어가 몰려도 Gemini 는 한 번만 부릅니다. */
const analysisCache = createTtlCache<AnalyzeResult>(10 * 60_000, 500);

/** 원화 → 엔화. 환율은 기존 lib/exchangeRate (원/엔) 를 그대로 씁니다. */
async function toJpy(amount: number | null | undefined, currency: 'KRW' | 'JPY' | null): Promise<number | null> {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null;
  if (currency !== 'KRW') return Math.round(amount);
  const { rate } = await getBaseExchangeRate(); // 1엔 = rate 원
  return Math.round(amount / rate);
}

/**
 * 🐛 "순간접착제 말고" 처럼 제외를 부탁했는데 모델이 그 단어(接着剤)를 검색어에도 넣는 경우가 있었습니다.
 *    검색어와 제외어가 겹치면 결과가 0건이거나 엉뚱해지므로, 제외어와 겹치는 검색어 단어는 뺍니다.
 */
function dropExcluded(keywordJa: string, exclude: string[]): string {
  const ex = exclude.map(e => e.trim()).filter(Boolean);
  if (!ex.length) return keywordJa.trim();
  const kept = keywordJa.split(/\s+/).filter(w => w && !ex.some(e => e.includes(w) || w.includes(e)));
  return kept.length ? kept.join(' ') : keywordJa.trim();
}

async function fromGemini(raw: RawAnalysis): Promise<QueryAnalysis> {
  const excludeJa = (raw.exclude_ja ?? []).map(s => s.trim()).filter(Boolean).slice(0, 5);
  const excludeKo = (raw.exclude_ko ?? []).map(s => s.trim()).filter(Boolean).slice(0, 5);
  return {
    kind: raw.kind === 'natural' ? 'natural' : 'keyword',
    keywordJa: dropExcluded(raw.keyword_ja, excludeJa),
    // 화면에 보이는 한국어 핵심어에서도 제외어는 뺍니다 (예: "접착제 말고" → 핵심어에 접착제 X)
    keywordKo: dropExcluded(raw.keyword_ko?.trim() || raw.keyword_ja, excludeKo),
    category: raw.category_ja?.trim() || null,
    categoryKo: raw.category_ko?.trim() || null,
    minPriceJpy: await toJpy(raw.price_min, raw.currency),
    maxPriceJpy: await toJpy(raw.price_max, raw.currency),
    excludeJa,
    excludeKo,
  };
}

/**
 * 한국어 검색어를 단어별로 번역해 공백으로 잇습니다.
 *
 * 🐛 예전엔 "여름 원피스" 를 통째로 번역해 「夏のワンピース」 처럼 조사(の)로 붙은 한 덩어리가 됐고,
 *    쇼핑몰이 이걸 한 단어로 다뤄 샌들·피규어 같은 엉뚱한 상품이 섞였습니다.
 *    단어별로 번역하면 「夏 ワンピース」 가 되어 몰 검색이 두 단어 AND 로 정확히 걸립니다.
 *    (단어 단위 번역은 Translation 표 캐시에도 더 잘 걸립니다 — "원피스" 는 한 번만 번역)
 */
async function translateWords(text: string): Promise<string> {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const translated = await Promise.all(words.map(w => getTranslatedText(w)));
  return translated
    .map((t, i) => (t || words[i]).replace(/[。、．.!！?？]+$/u, '').trim())
    .filter(Boolean)
    .join(' ');
}

/** 정규식 폴백: 서술어 제거 → 핵심 명사 → 단어별 기계 번역(DeepL + DB 캐시). Gemini 호출 0회. */
export async function analyzeWithFallback(query: string): Promise<QueryAnalysis> {
  const p = parseQueryWithRegex(query);
  const [keywordJa, ...excludeJa] = await Promise.all([
    translateWords(p.keywords),
    ...p.exclude.map(w => getTranslatedText(w)),
  ]);
  return {
    kind: p.looksNatural ? 'natural' : 'keyword',
    keywordJa: keywordJa || p.keywords,
    keywordKo: p.keywords,
    category: null,
    categoryKo: null,
    excludeKo: p.exclude,
    minPriceJpy: await toJpy(p.priceMin, p.currency),
    maxPriceJpy: await toJpy(p.priceMax, p.currency),
    excludeJa: excludeJa.filter(Boolean),
  };
}

export async function analyzeQuery(query: string): Promise<AnalyzeResult> {
  const key = `${ANALYSIS_VERSION}:${query.trim().toLowerCase()}`;
  const cached = analysisCache.get(key);
  if (cached) return cached;

  // 2) 단순 단어 검색 → LLM 분석 생략
  if (isObviouslyKeyword(query)) {
    const jp = await translateWords(query.trim());
    const result: AnalyzeResult = {
      mode: 'keyword',
      analysis: { kind: 'keyword', keywordJa: jp || query.trim(), keywordKo: query.trim(), category: null, excludeJa: [], excludeKo: [] },
    };
    analysisCache.set(key, result);
    return result;
  }

  // 3) Gemini 분석 → 4) 실패 시 정규식 폴백
  try {
    const raw = await analyzeQueryWithGemini(query);
    const result: AnalyzeResult = { mode: 'ai', analysis: await fromGemini(raw) };
    analysisCache.set(key, result);
    return result;
  } catch (error) {
    const fallbackReason: AnalyzeResult['fallbackReason'] =
      error instanceof GeminiRateLimitError ? 'rate_limited'
      : error instanceof GeminiUnavailableError ? 'no_api_key'
      : 'ai_error';
    if (fallbackReason === 'ai_error') console.error('⚠️ [AI 검색] Gemini 분석 실패 → 일반 검색 모드:', (error as Error).message);

    // ⚠️ 폴백 결과는 캐시에 넣지 않습니다. 한도가 풀리면 다음 요청은 다시 AI 로 분석되어야 합니다.
    return { mode: 'fallback', fallbackReason, analysis: await analyzeWithFallback(query) };
  }
}

// ─────────────────────────────────────────────────────────────
// 📷 사진 검색
// ─────────────────────────────────────────────────────────────

/** 손님에게 그대로 보여 줄 수 있는 오류 (라우터가 이 문구를 화면에 띄웁니다) */
export class AiSearchUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiSearchUserError';
  }
}

export interface SearchImage {
  mimeType: string;
  /** base64 (data: 머리 없이) */
  data: string;
}

/**
 * 사진(+ 덧붙인 글)을 분석합니다.
 *  - 같은 사진·같은 글이면 10분 동안 캐시 (사진 해시 기준) → 다시 눌러도 Gemini 0회
 *  - Gemini 를 못 쓰면: 글이 있으면 글만으로 일반 검색, 글도 없으면 안내 문구로 멈춤
 *    (사진은 AI 없이는 읽을 수 없습니다)
 *  - 사진은 어디에도 저장하지 않습니다. 기록에는 키워드만 남깁니다.
 */
export async function analyzeImageQuery(image: SearchImage, note: string): Promise<AnalyzeResult> {
  const hash = createHash('sha1').update(image.data).digest('hex');
  const key = `${ANALYSIS_VERSION}:img:${hash}:${note.trim().toLowerCase()}`;
  const cached = analysisCache.get(key);
  if (cached) return cached;

  try {
    const raw = await analyzeImageWithGemini(image, note);
    const result: AnalyzeResult = { mode: 'ai', analysis: { ...(await fromGemini(raw)), fromImage: true } };
    analysisCache.set(key, result);
    return result;
  } catch (error) {
    if (error instanceof GeminiNoProductError) {
      throw new AiSearchUserError('사진에서 상품을 찾지 못했어요. 상품이 크게 보이는 사진으로 다시 올리거나, 글로 물어봐 주세요.');
    }
    const fallbackReason: AnalyzeResult['fallbackReason'] =
      error instanceof GeminiRateLimitError ? 'rate_limited'
      : error instanceof GeminiUnavailableError ? 'no_api_key'
      : 'ai_error';
    if (fallbackReason === 'ai_error') console.error('⚠️ [AI 검색] 사진 분석 실패:', (error as Error).message);

    if (note.trim()) {
      return { mode: 'fallback', fallbackReason, analysis: await analyzeWithFallback(note) };
    }
    throw new AiSearchUserError(
      fallbackReason === 'rate_limited'
        ? '지금 AI 비서를 찾는 분이 많아 사진을 볼 수 없어요. 잠시 후 다시 시도하거나 글로 물어봐 주세요.'
        : '사진 분석이 잠시 어려워요. 잠시 후 다시 시도하거나 글로 물어봐 주세요.',
    );
  }
}
