// 🧠 POST /api/ai-search/analyze — 검색어 "분석만" 합니다 (쇼핑몰 조회는 하지 않음)
//
// 몰 페이지(main_shop/*) 헤더의 AI 검색창이 씁니다.
// 문장을 일본어 검색어·가격·제외어로 바꿔 돌려주면, 몰 페이지가 기존 일반 검색 흐름
// (카테고리 아래 상품 목록 + 페이지 이동 + 사이드바 필터)으로 그대로 검색합니다.
//
// 요청: { "query": "여름 양산 자외선 차단 5천엔 이하" }
// 응답: { mode, fallbackReason?, analysis: QueryAnalysis }
// Gemini 가 막혀도(429 등) 정규식 폴백으로 분석해 항상 200 으로 답합니다.

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { rateLimit, clientIp } from '@/lib/rateLimit';
import { analyzeQuery } from '@/lib/ai-search/analyze';

export async function POST(request: Request) {
  // 🔒 1인당 분당 15회 (분석 결과는 서버에서 10분 캐시되어 같은 문장은 Gemini 를 다시 부르지 않습니다)
  const limit = rateLimit(`ai-analyze:${clientIp(request)}`, 15, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: '검색이 너무 잦아요. 잠시 후 다시 시도해 주세요.' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  if (!query) return NextResponse.json({ error: '검색어를 입력해 주세요.' }, { status: 400 });
  if (query.length > 200) return NextResponse.json({ error: '검색어는 200자 이내로 입력해 주세요.' }, { status: 400 });

  try {
    return NextResponse.json(await analyzeQuery(query));
  } catch (error) {
    console.error('❌ [AI 분석] 실패:', error);
    return NextResponse.json({ error: '분석에 실패했어요.' }, { status: 500 });
  }
}
