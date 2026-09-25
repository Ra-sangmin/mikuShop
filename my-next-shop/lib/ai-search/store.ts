// 🗄️ RDS(MySQL) 저장 — 메타데이터만. 벡터는 절대 여기 두지 않습니다 (Qdrant 담당).
//
// t4g.micro(RAM 1GB) 를 아끼려고
//  - 상품 N건을 upsert N번이 아니라 INSERT ... ON DUPLICATE KEY UPDATE 한 문장으로 보냅니다.
//  - 응답을 기다리지 않는 백그라운드 저장으로 부릅니다 (검색 속도에 영향 없음).

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { pointId } from './qdrant';
import type { AiProduct, MallType, SearchMode } from './types';

/** 실시간으로 가져온 상품의 메타데이터를 ai_search_products 에 한 번에 upsert 합니다. */
export async function upsertProductsToRds(products: AiProduct[], indexedInQdrant: boolean): Promise<void> {
  if (products.length === 0) return;
  const unique = [...new Map(products.map(p => [`${p.mall}:${p.itemId}`, p])).values()].slice(0, 200);
  const now = new Date();

  const rows = unique.map(p => Prisma.sql`(
    ${p.mall}, ${p.itemId.slice(0, 191)}, ${p.nameJa}, ${p.nameKo}, ${Math.round(p.priceJpy)},
    ${p.thumbnail || null}, ${p.url}, ${p.shopName ?? null},
    ${indexedInQdrant ? pointId(p.mall, p.itemId) : null}, ${now}, ${now}, ${now}
  )`);

  await prisma.$executeRaw`
    INSERT INTO ai_search_products
      (platform, item_id, name_ja, name_ko, price_jpy, thumbnail, url, shop_name, qdrant_id, fetched_at, created_at, updated_at)
    VALUES ${Prisma.join(rows)}
    ON DUPLICATE KEY UPDATE
      name_ja    = VALUES(name_ja),
      name_ko    = VALUES(name_ko),
      price_jpy  = VALUES(price_jpy),
      thumbnail  = VALUES(thumbnail),
      url        = VALUES(url),
      shop_name  = VALUES(shop_name),
      qdrant_id  = COALESCE(VALUES(qdrant_id), qdrant_id),
      fetched_at = VALUES(fetched_at),
      hit_count  = hit_count + 1,
      updated_at = VALUES(updated_at)
  `;
}

/** 검색 기록 (추천 검색어·품질 점검용). 실패해도 검색에는 영향이 없도록 부르는 쪽에서 catch 합니다. */
export async function logSearch(entry: {
  query: string;
  mallType: MallType;
  mode: SearchMode;
  keywordJa: string;
  resultCount: number;
  tookMs: number;
}): Promise<void> {
  await prisma.aiSearchLog.create({
    data: {
      query: entry.query.slice(0, 300),
      mallType: entry.mallType,
      mode: entry.mode,
      keywordJa: entry.keywordJa.slice(0, 300),
      resultCount: entry.resultCount,
      tookMs: entry.tookMs,
    },
  });
}
