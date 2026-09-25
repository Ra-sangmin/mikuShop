// 🔀 AI 하이브리드 검색 파이프라인
//
//   ① 검색어 분석 (Gemini → 실패 시 정규식 폴백)                        analyze.ts
//   ② mall_type 에 맞춰 Qdrant 의미 검색 (신선한 캐시만)                 qdrant.ts
//   ③ 결과가 부족한 몰만 쇼핑몰 API 실시간 호출 (통합이면 병렬)           malls.ts
//   ④ 새 상품 이름 번역 (RDS 에 이미 번역본이 있으면 재사용)
//   ⑤ 응답을 먼저 보내고, 뒤에서(after) Qdrant 색인 + RDS upsert + 로그    store.ts
//
// 폴백 모드에서는 ② 를 건너뜁니다 (질의 임베딩도 Gemini 호출이므로).

import prisma from '@/lib/prisma';
import { translateBatch } from '@/lib/deepl';
import { analyzeQuery } from './analyze';
import { embedDocuments, embedQuery, GeminiRateLimitError } from './gemini';
import { cacheProducts, embedText, isQdrantConfigured, searchByVector } from './qdrant';
import { mercariThumb, searchMallsLive } from './malls';
import { logSearch, upsertProductsToRds } from './store';
import { MALLS, MALL_LABEL, formatPriceRange, type AiProduct, type AiSearchResponse, type Mall, type MallType } from './types';

/** 몰별로 캐시에서 이만큼 나오면 그 몰은 실시간 호출을 생략합니다. */
const ENOUGH_PER_MALL = { integrated: 4, single: 12 };
/**
 * "AI 추천" 표시 기준.
 * gemini-embedding-001(768차원) + Cosine 에서 한국어 질문 ↔ 일본어 상품명 점수는 보통 0.65~0.8 이라
 * 고정 점수(예: 0.8 이상)로 자르면 거의 아무것도 안 걸립니다. → 이번 결과 안에서 상대적으로 가장 잘 맞는
 * 상위 몇 개만 고르고, 너무 낮은 점수는 제외합니다.
 */
const AI_PICK_COUNT = { integrated: 5, single: 4 };
const AI_PICK_MIN_SCORE = Number(process.env.AI_SEARCH_PICK_MIN_SCORE || 0.66);

/**
 * "AI 추천" 이유 문장. 무료 한도(분당 15회)를 아끼려고 Gemini 에 묻지 않고,
 * 이미 가진 정보(분석 결과·상품명·가격·유사도 순위)로 만듭니다.
 */
function buildPickReasons(p: AiProduct, rank: number, analysis: AiSearchResponse['analysis']): string[] {
  const reasons: string[] = [];
  reasons.push(rank === 1 ? '질문 내용과 가장 잘 맞는 상품이에요' : `질문 내용과 잘 맞는 상품 ${rank}위예요`);

  // 검색어가 상품명에 들어 있는지 (한국어 핵심어 → 번역된 이름, 일본어 검색어 → 원문 이름)
  const nameKo = p.nameKo || '';
  const nameJa = p.nameJa || '';
  const koHits = (analysis.keywordKo || '').split(/\s+/).filter(w => w.length >= 2 && nameKo.includes(w));
  const jaHits = (analysis.keywordJa || '').split(/\s+/).filter(w => w && nameJa.includes(w));
  if (koHits.length) reasons.push(`찾으신 「${koHits.slice(0, 3).join('」「')}」이(가) 상품명에 들어 있어요`);
  else if (jaHits.length) reasons.push('찾으신 검색어가 상품명에 그대로 들어 있어요');

  if (analysis.category && nameJa.includes(analysis.category) && !jaHits.includes(analysis.category)) {
    reasons.push(analysis.categoryKo ? `요청하신 분류(${analysis.categoryKo})의 상품이에요` : '요청하신 분류의 상품이에요');
  }

  const range = formatPriceRange(analysis.minPriceJpy, analysis.maxPriceJpy);
  if (range) reasons.push(`원하신 가격대(${range}) 안에 있어요 — ¥${p.priceJpy.toLocaleString()}`);

  // 상품명에 드러난 장점
  if (/送料無料|送料込|送料込み/.test(nameJa)) reasons.push('일본 내 배송비가 무료예요');
  if (p.mall === 'mercari' || p.mall === 'yahoo_auction') {
    if (/未使用|新品/.test(nameJa)) reasons.push('중고 거래지만 미사용·새 상품이에요');
  }
  if (/即日発送|翌日発送|あす楽/.test(nameJa)) reasons.push('판매처에서 빠르게 발송해요');
  if (/ランキング1位|楽天1位|1位/.test(nameJa)) reasons.push('판매처 랭킹 1위 이력이 있는 상품이에요');

  return reasons.slice(0, 5);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** 실시간 호출 시 몰별로 가져올 개수 */
const LIVE_LIMIT = { integrated: 8, single: 20 };

export interface PipelineInput {
  query: string;
  mallType: MallType;
  internalBaseUrl: string;
}

export interface PipelineOutput {
  response: AiSearchResponse;
  /** 응답 뒤에 실행할 저장 작업 (라우터에서 after() 로 넘깁니다) */
  background: () => Promise<void>;
}

/** 상품명 번역: RDS 에 이미 있는 번역을 먼저 쓰고, 없는 것만 DeepL 로 (무료 월 50만 자 절약). */
async function translateNames(items: AiProduct[]): Promise<void> {
  if (items.length === 0 || process.env.AI_SEARCH_TRANSLATE === 'none') return;

  const known = await prisma.aiSearchProduct.findMany({
    where: { OR: items.map(i => ({ platform: i.mall, itemId: i.itemId })) },
    select: { platform: true, itemId: true, nameKo: true, nameJa: true },
  }).catch(() => []);
  const knownMap = new Map(known.map(k => [`${k.platform}:${k.itemId}`, k]));

  const todo: AiProduct[] = [];
  for (const item of items) {
    const k = knownMap.get(`${item.mall}:${item.itemId}`);
    if (k && k.nameKo && k.nameKo !== k.nameJa) item.nameKo = k.nameKo;
    else todo.push(item);
  }
  if (todo.length === 0) return;

  // 라쿠텐 상품명은 광고 문구로 매우 깁니다. 앞 60자만 번역해도 무엇인지 알 수 있습니다.
  const translated = await translateBatch(todo.map(i => i.nameJa.slice(0, 60)), 'KO', 'JA');
  todo.forEach((item, idx) => {
    if (translated[idx]?.ok) item.nameKo = translated[idx].text;
  });
}

/** 통합 검색이면 몰을 번갈아 섞어 한 몰이 화면을 독차지하지 않게 합니다. */
function interleave(groups: AiProduct[][]): AiProduct[] {
  const out: AiProduct[] = [];
  const max = Math.max(0, ...groups.map(g => g.length));
  for (let i = 0; i < max; i++) for (const g of groups) if (g[i]) out.push(g[i]);
  return out;
}

function buildMessage(r: Omit<AiSearchResponse, 'message' | 'tookMs'>): string {
  const a = r.analysis;
  const range = formatPriceRange(a.minPriceJpy, a.maxPriceJpy);
  const price = range ? ` (${range})` : '';
  const head =
    r.mode === 'fallback'
      ? r.fallbackReason === 'rate_limited'
        ? '지금 AI 비서를 찾는 분이 많아 일반 검색으로 찾아 드렸어요.'
        : 'AI 분석이 잠시 어려워 일반 검색으로 찾아 드렸어요.'
      : r.mode === 'ai'
        ? '말씀하신 조건으로 찾아봤어요!'
        : '검색 결과예요!';
  // 화면 문구에는 일본어 검색어 대신 한국어 핵심어를 씁니다 (검색 자체는 일본어로 함)
  const kw = a.keywordKo || a.keywordJa;
  if (r.items.length === 0) return `${head} 「${kw}」${price}(으)로는 상품을 찾지 못했어요. 조금 더 간단한 말로 다시 물어봐 주세요.`;
  return `${head} 「${kw}」${price}(으)로 ${r.items.length}개를 찾았어요.`;
}

export async function runAiSearch({ query, mallType, internalBaseUrl }: PipelineInput): Promise<PipelineOutput> {
  const started = Date.now();
  const isIntegrated = mallType === 'integrated';
  const malls: Mall[] = isIntegrated ? [...MALLS] : [mallType as Mall];
  const scope = isIntegrated ? 'integrated' : 'single';

  // ① 분석
  const { mode, fallbackReason, analysis } = await analyzeQuery(query);

  // ② Qdrant 의미 검색 (폴백 모드면 건너뜀)
  let cached: AiProduct[] = [];
  let queryVector: number[] | null = null;
  let embedBlocked = mode === 'fallback' && fallbackReason === 'rate_limited';
  if (mode !== 'fallback' && isQdrantConfigured()) {
    try {
      // 원문(한국어 문장)과 일본어 키워드를 같이 넣어 의미와 단어를 모두 반영합니다 (하이브리드).
      const vector = await embedQuery(`${query}\n${analysis.keywordJa}${analysis.category ? ` ${analysis.category}` : ''}`);
      queryVector = vector;
      cached = await searchByVector(vector, {
        malls,
        minPriceJpy: analysis.minPriceJpy,
        maxPriceJpy: analysis.maxPriceJpy,
        limit: isIntegrated ? 40 : 30,
      });
    } catch (e) {
      if (e instanceof GeminiRateLimitError) embedBlocked = true;
      console.warn('⚠️ [AI 검색] Qdrant 검색 생략:', (e as Error).message);
    }
  }

  // ③ 캐시가 부족한 몰만 실시간 호출
  // 야후 옥션은 남은 시간·입찰 수가 분 단위로 바뀌어 캐시로 보여 주면 "종료" 로 잘못 표시됩니다 → 항상 실시간.
  const cachedByMall = new Map<Mall, AiProduct[]>(
    malls.map(m => [m, m === 'yahoo_auction' ? [] : cached.filter(c => c.mall === m)]),
  );
  const needLive = malls.filter(m => (cachedByMall.get(m)?.length ?? 0) < ENOUGH_PER_MALL[scope]);

  const liveResults = needLive.length
    ? await searchMallsLive(needLive, {
        keywordJa: analysis.keywordJa,
        minPriceJpy: analysis.minPriceJpy,
        maxPriceJpy: analysis.maxPriceJpy,
        excludeJa: analysis.excludeJa,
        limit: LIVE_LIMIT[scope],
        internalBaseUrl,
      })
    : [];

  const liveItems = liveResults.flatMap(r => r.items);

  // ④ 번역 (실패해도 일본어 이름으로 계속)
  await translateNames(liveItems).catch(e => console.warn('⚠️ [AI 검색] 번역 생략:', (e as Error).message));

  // ④-2 방금 가져온 상품도 질문과의 유사도를 매깁니다 → 처음 검색하는 말이어도 "AI 추천" 이 붙습니다.
  //      여기서 만든 벡터는 뒤의 Qdrant 색인에 그대로 다시 써서 Gemini 호출이 늘지 않습니다(배치 1회).
  const liveVectors = new Map<string, number[]>();
  if (queryVector && liveItems.length && !embedBlocked) {
    try {
      const target = liveItems.slice(0, 100);
      const vecs = await embedDocuments(target.map(embedText));
      target.forEach((p, i) => {
        liveVectors.set(`${p.mall}:${p.itemId}`, vecs[i]);
        p.score = cosine(queryVector!, vecs[i]);
      });
    } catch (e) {
      if (e instanceof GeminiRateLimitError) embedBlocked = true;
      console.warn('⚠️ [AI 검색] 실시간 상품 유사도 생략:', (e as Error).message);
    }
  }

  // 병합: 몰마다 [캐시(유사도순) → 실시간] 순서, 중복 제거
  // 🐛 라쿠텐은 같은 상품을 여러 가게가 똑같은 이름·가격·사진으로 올려(itemId 만 다름)
  //    화면에 같은 카드가 여러 장 떴습니다. 이름 앞부분 + 가격이 같으면 한 장만 남깁니다.
  const sameListingKey = (p: AiProduct) => `${p.nameJa.replace(/\s+/g, '').slice(0, 40)}|${p.priceJpy}`;
  const perMall = malls.map(m => {
    const seenId = new Set<string>();
    const seenListing = new Set<string>();
    const live = liveResults.find(r => r.mall === m)?.items ?? [];
    return [...(cachedByMall.get(m) ?? []), ...live].filter(p => {
      const listing = sameListingKey(p);
      if (seenId.has(p.itemId) || seenListing.has(listing)) return false;
      seenId.add(p.itemId);
      seenListing.add(listing);
      return true;
    });
  });
  const merged = (isIntegrated ? interleave(perMall) : perMall[0]).map(p =>
    p.mall === 'mercari' && !p.thumbnail ? { ...p, thumbnail: mercariThumb(p.itemId) } : p,
  );

  // "AI 추천": 점수가 있는 상품 중 상위 N개 (기준 점수 이상). 맨 앞으로 올려 먼저 보이게 합니다.
  const pickKeys = new Set(
    merged
      .filter(p => typeof p.score === 'number' && p.score >= AI_PICK_MIN_SCORE)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, AI_PICK_COUNT[scope])
      .map(p => `${p.mall}:${p.itemId}`),
  );
  const items = [
    ...merged
      .filter(p => pickKeys.has(`${p.mall}:${p.itemId}`))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .map((p, i) => ({ ...p, aiPick: true, aiReasons: buildPickReasons(p, i + 1, analysis) })),
    ...merged.filter(p => !pickKeys.has(`${p.mall}:${p.itemId}`)),
  ];

  const base = {
    mode,
    fallbackReason,
    analysis,
    items: items.slice(0, 40),
    malls: malls.map(m => {
      const live = liveResults.find(r => r.mall === m);
      return { mall: m, count: perMall[malls.indexOf(m)].length, ...(live?.error ? { error: `${MALL_LABEL[m]} ${live.error}` } : {}) };
    }),
  };
  const response: AiSearchResponse = { ...base, message: buildMessage(base), tookMs: Date.now() - started };

  // ⑤ 응답 뒤에 저장
  const background = async () => {
    let indexed = false;
    if (liveItems.length && isQdrantConfigured() && !embedBlocked) {
      try {
        await cacheProducts(liveItems.filter(p => p.mall !== 'yahoo_auction'), liveVectors);
        indexed = true;
      } catch (e) {
        console.warn('⚠️ [AI 검색] Qdrant 색인 생략:', (e as Error).message);
      }
    }
    await upsertProductsToRds(liveItems, indexed).catch(e => console.error('❌ [AI 검색] RDS 저장 실패:', e));
    await logSearch({
      query,
      mallType,
      mode,
      keywordJa: analysis.keywordJa,
      resultCount: response.items.length,
      tookMs: response.tookMs,
    }).catch(() => {});
  };

  return { response, background };
}
