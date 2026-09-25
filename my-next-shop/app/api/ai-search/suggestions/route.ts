// 🏷️ GET /api/ai-search/suggestions?mall_type=integrated — 추천 검색어 태그
//
// 최근 7일간 결과가 나왔던 검색어 중 많이 찾은 순. 기록이 적을 땐 기본 태그로 채웁니다.
// 결과는 10분간 메모리에 캐시해 RDS 부담을 줄입니다.

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createTtlCache } from '@/lib/crawler/ttlCache';
import { isMallType } from '@/lib/ai-search/types';

const DEFAULT_TAGS: Record<string, string[]> = {
  integrated: ['여름 바닷가 원피스 5만원대', '포켓몬 카드 박스', '캠핑용 가벼운 랜턴', '빈티지 필름 카메라', '산리오 인형', '나이키 운동화 3만엔 이하'],
  rakuten: ['일본 과자 선물세트', '무인양품 수납', '여름 양산 자외선 차단'],
  mercari: ['중고 닌텐도 스위치', '빈티지 원피스', '한정판 피규어'],
  yahoo_shopping: ['일본 화장품 세트', '전기 주전자', '아기 옷 여름'],
  yahoo_auction: ['레트로 게임기', '오래된 시계', '한정 굿즈'],
};

const cache = createTtlCache<string[]>(10 * 60_000, 10);

export async function GET(request: Request) {
  const mallType = new URL(request.url).searchParams.get('mall_type') || 'integrated';
  if (!isMallType(mallType)) return NextResponse.json({ tags: DEFAULT_TAGS.integrated });

  const hit = cache.get(mallType);
  if (hit) return NextResponse.json({ tags: hit });

  let popular: string[] = [];
  try {
    const rows = await prisma.aiSearchLog.groupBy({
      by: ['query'],
      where: { mallType, resultCount: { gt: 0 }, createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } },
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: 6,
    });
    popular = rows.map(r => r.query).filter(q => q.length <= 30);
  } catch {
    /* 표가 아직 없거나 DB 가 바쁘면 기본 태그만 */
  }

  const tags = [...new Set([...popular, ...(DEFAULT_TAGS[mallType] ?? [])])].slice(0, 8);
  cache.set(mallType, tags);
  return NextResponse.json({ tags });
}
