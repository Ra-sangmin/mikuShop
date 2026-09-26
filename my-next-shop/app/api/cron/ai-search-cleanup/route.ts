// 🧹 AI 검색 데이터 정리 — 서버 크론이 하루 한 번 부릅니다.
//
//  - RDS  ai_search_logs     : 손님 검색 문장 원문 → 30일 지나면 삭제 (AI_SEARCH_LOG_RETENTION_DAYS)
//  - RDS  ai_search_products : 오래된 상품 정보 → 30일 지나면 삭제 (AI_SEARCH_PRODUCT_RETENTION_DAYS)
//  - Qdrant miku_products    : 7일 지난 상품 벡터 삭제 (무료 1GB 유지)
//
// 인증은 환율 크론과 같은 CRON_SECRET 을 씁니다.
// 호출 (서버 crontab, 매일 새벽 4시 7분)
//   7 4 * * * curl -fsS -H "x-cron-secret: <CRON_SECRET>" https://mikushop.co.kr/api/cron/ai-search-cleanup
import { NextResponse } from 'next/server';
import { cleanupAiSearchData } from '@/lib/ai-search/store';
import { isQdrantConfigured, pruneStaleProducts } from '@/lib/ai-search/qdrant';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[AI검색 정리크론] CRON_SECRET 이 설정되지 않아 거절합니다.');
    return NextResponse.json({ error: 'CRON_SECRET 미설정' }, { status: 503 });
  }
  const provided = request.headers.get('x-cron-secret') ?? new URL(request.url).searchParams.get('secret');
  if (provided !== secret) {
    console.warn('[AI검색 정리크론] 비밀값이 맞지 않아 거절했습니다.');
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });
  }

  try {
    const rds = await cleanupAiSearchData();
    let qdrant: 'ok' | 'skipped' | 'failed' = 'skipped';
    if (isQdrantConfigured()) {
      try {
        await pruneStaleProducts();
        qdrant = 'ok';
      } catch (e) {
        qdrant = 'failed';
        console.error('[AI검색 정리크론] Qdrant 정리 실패:', (e as Error).message);
      }
    }
    console.log(`[AI검색 정리크론] 로그 ${rds.deletedLogs}건 · 상품 ${rds.deletedProducts}건 삭제, Qdrant ${qdrant}`);
    return NextResponse.json({ success: true, ...rds, qdrant });
  } catch (error) {
    console.error('[AI검색 정리크론] 실패:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
