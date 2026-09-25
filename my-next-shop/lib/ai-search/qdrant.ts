// 🧲 Qdrant Cloud 연동 — 상품 벡터 색인 + AI 검색 캐시 레이어
//
// RDS(t4g.micro, RAM 1GB) 에는 벡터를 두지 않습니다. 벡터 저장·유사도 연산은 전부 여기서 합니다.
// SDK 없이 REST 로 부릅니다 (의존성 추가 없음).
//
// 무료 1GB 클러스터를 오래 쓰기 위한 설정
//   - 768 차원(3072 대비 1/4) + Cosine
//   - 원본 벡터는 디스크(on_disk), 메모리에는 int8 양자화본만 → 벡터당 RAM 약 0.8KB
//   - payload 도 디스크에 두고, 필터에 쓰는 필드(mall, price_jpy, fetched_at)에만 인덱스
//   - fetched_at 기준으로 오래된 상품은 pruneStaleProducts() 로 지웁니다 (크론에서 호출)
//
// .env
//   QDRANT_URL=https://xxxx.aws.cloud.qdrant.io:6333
//   QDRANT_API_KEY=...
//   QDRANT_COLLECTION=miku_products   (선택)

import { createHash } from 'crypto';
import { EMBED_DIM, embedDocuments, embedQuery } from './gemini';
import type { AiProduct, Mall } from './types';

const COLLECTION = process.env.QDRANT_COLLECTION?.trim() || 'miku_products';

/** 이 시간보다 오래 전에 가져온 상품은 가격·재고가 바뀌었을 수 있어 "신선하지 않음"으로 봅니다. */
export const FRESH_MS = Number(process.env.AI_SEARCH_FRESH_HOURS || 24) * 3600_000;

export function isQdrantConfigured(): boolean {
  return Boolean(process.env.QDRANT_URL?.trim() && process.env.QDRANT_API_KEY?.trim());
}

async function qdrant<T = any>(method: 'GET' | 'PUT' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const base = process.env.QDRANT_URL!.trim().replace(/\/+$/, '');
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'api-key': process.env.QDRANT_API_KEY!.trim() },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`[Qdrant] ${method} ${path} → ${res.status} ${text.slice(0, 200)}`);
    (err as any).status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────
// 컬렉션 준비 (서버 기동 후 첫 호출 때 한 번만)
// ─────────────────────────────────────────────────────────────

let ensured: Promise<void> | null = null;

export function ensureCollection(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      try {
        await qdrant('GET', `/collections/${COLLECTION}`);
        return; // 이미 있음
      } catch (e) {
        if ((e as any).status !== 404) throw e;
      }

      console.log(`🧲 [Qdrant] 컬렉션 ${COLLECTION} 생성 (dim=${EMBED_DIM})`);
      await qdrant('PUT', `/collections/${COLLECTION}`, {
        vectors: { size: EMBED_DIM, distance: 'Cosine', on_disk: true },
        on_disk_payload: true,
        quantization_config: { scalar: { type: 'int8', quantile: 0.99, always_ram: true } },
        optimizers_config: { default_segment_number: 2 },
      });

      // 필터에 쓰는 필드만 인덱스 (인덱스도 RAM 을 먹습니다)
      const indexes: [string, string][] = [
        ['mall', 'keyword'],
        ['price_jpy', 'integer'],
        ['fetched_at', 'integer'],
      ];
      for (const [field_name, field_schema] of indexes) {
        await qdrant('PUT', `/collections/${COLLECTION}/index?wait=true`, { field_name, field_schema });
      }
    })().catch(err => {
      ensured = null; // 실패했으면 다음 호출 때 다시 시도
      throw err;
    });
  }
  return ensured;
}

// ─────────────────────────────────────────────────────────────
// ID · payload
// ─────────────────────────────────────────────────────────────

/** Qdrant 포인트 ID 는 정수나 UUID 만 됩니다. "몰:상품ID" 로 항상 같은 UUID 를 만들어 upsert 가 덮어쓰게 합니다. */
export function pointId(mall: Mall, itemId: string): string {
  const h = createHash('sha1').update(`${mall}:${itemId}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

interface ProductPayload {
  mall: Mall;
  item_id: string;
  name_ja: string;
  name_ko: string;
  price_jpy: number;
  thumbnail: string;
  url: string;
  shop_name: string | null;
  fetched_at: number; // epoch ms
  // 상세 패널용 (on_disk_payload 라 RAM 을 먹지 않습니다. 오래된 포인트엔 없을 수 있음)
  images?: string[];
  description?: string;
}

/** 임베딩할 문장: 일본어 상품명 + 한국어 번역 (한국어 질의와 일본어 상품 사이의 거리를 좁힙니다) */
export function embedText(p: AiProduct): string {
  return `${p.nameJa}\n${p.nameKo}`.slice(0, 500);
}

// ─────────────────────────────────────────────────────────────
// 검색
// ─────────────────────────────────────────────────────────────

export interface VectorSearchOptions {
  malls: Mall[];
  minPriceJpy?: number | null;
  maxPriceJpy?: number | null;
  limit?: number;
  /** 이 점수 미만은 버립니다. gemini-embedding-001 + Cosine 기준 0.6~0.7 이 무난합니다. */
  scoreThreshold?: number;
}

/** 이미 만든 질의 벡터로 검색합니다. (벡터를 여러 번 쓰려면 이쪽) */
export async function searchByVector(vector: number[], opts: VectorSearchOptions): Promise<AiProduct[]> {
  await ensureCollection();

  const must: any[] = [
    { key: 'mall', match: { any: opts.malls } },
    { key: 'fetched_at', range: { gte: Date.now() - FRESH_MS } },
  ];
  if (opts.minPriceJpy != null || opts.maxPriceJpy != null) {
    must.push({
      key: 'price_jpy',
      range: {
        ...(opts.minPriceJpy != null ? { gte: opts.minPriceJpy } : {}),
        ...(opts.maxPriceJpy != null ? { lte: opts.maxPriceJpy } : {}),
      },
    });
  }

  const data = await qdrant<{ result: { score: number; payload: ProductPayload }[] }>(
    'POST',
    `/collections/${COLLECTION}/points/search`,
    {
      vector,
      filter: { must },
      limit: opts.limit ?? 30,
      with_payload: true,
      score_threshold: opts.scoreThreshold ?? Number(process.env.AI_SEARCH_SCORE_THRESHOLD || 0.65),
      params: { quantization: { rescore: true } },
    },
  );

  return (data.result ?? []).map(({ score, payload: p }) => ({
    mall: p.mall,
    itemId: p.item_id,
    nameJa: p.name_ja,
    nameKo: p.name_ko,
    priceJpy: p.price_jpy,
    thumbnail: p.thumbnail,
    url: p.url,
    shopName: p.shop_name,
    images: p.images ?? (p.thumbnail ? [p.thumbnail] : []),
    description: p.description ?? '',
    status: 'on_sale' as const,
    score,
    source: 'cache' as const,
  }));
}

/** 문장을 받아 임베딩부터 검색까지 한 번에. */
export async function searchSimilarProducts(query: string, opts: VectorSearchOptions): Promise<AiProduct[]> {
  const vector = await embedQuery(query);
  return searchByVector(vector, opts);
}

// ─────────────────────────────────────────────────────────────
// 캐싱 (신규 상품 색인)
// ─────────────────────────────────────────────────────────────

/**
 * 쇼핑몰 API 에서 방금 가져온 상품을 임베딩해 Qdrant 에 넣습니다.
 * 같은 상품은 같은 ID 라 덮어쓰기(가격·fetched_at 갱신)가 됩니다.
 * 임베딩은 batchEmbedContents 1회(100건까지)로 처리합니다.
 *
 * @returns 색인한 건수
 */
export async function cacheProducts(products: AiProduct[], known?: Map<string, number[]>): Promise<number> {
  if (products.length === 0) return 0;
  await ensureCollection();

  // 같은 상품이 두 번 들어오면 한 번만
  const unique = [...new Map(products.map(p => [`${p.mall}:${p.itemId}`, p])).values()].slice(0, 100);
  // 검색 중에 이미 임베딩한 상품(known)은 다시 부르지 않습니다 (Gemini 호출 절약)
  const missing = unique.filter(p => !known?.has(`${p.mall}:${p.itemId}`));
  const fresh = missing.length ? await embedDocuments(missing.map(embedText)) : [];
  const freshMap = new Map(missing.map((p, i) => [`${p.mall}:${p.itemId}`, fresh[i]]));
  const vectors = unique.map(p => known?.get(`${p.mall}:${p.itemId}`) ?? freshMap.get(`${p.mall}:${p.itemId}`)!);
  const now = Date.now();

  await qdrant('PUT', `/collections/${COLLECTION}/points?wait=false`, {
    points: unique.map((p, i) => ({
      id: pointId(p.mall, p.itemId),
      vector: vectors[i],
      payload: {
        mall: p.mall,
        item_id: p.itemId,
        name_ja: p.nameJa,
        name_ko: p.nameKo,
        price_jpy: p.priceJpy,
        thumbnail: p.thumbnail,
        url: p.url,
        shop_name: p.shopName ?? null,
        fetched_at: now,
        images: (p.images ?? []).slice(0, 6),
        description: (p.description ?? '').slice(0, 2000),
      } satisfies ProductPayload,
    })),
  });

  return unique.length;
}

/** 오래된 상품 삭제 (기본 7일). 무료 1GB 를 넘지 않도록 크론에서 하루 한 번 부르세요. */
export async function pruneStaleProducts(olderThanMs = 7 * 24 * 3600_000): Promise<void> {
  await ensureCollection();
  await qdrant('POST', `/collections/${COLLECTION}/points/delete?wait=false`, {
    filter: { must: [{ key: 'fetched_at', range: { lt: Date.now() - olderThanMs } }] },
  });
}
