// 🤖 POST /api/ai-search — AI 하이브리드 검색 (통합·개별 몰 공용)
//
// 요청:  { "query": "여름 바닷가에서 입기 좋은 시원한 5만원대 원피스 찾아줘", "mall_type": "integrated" }
//        mall_type = integrated | rakuten | mercari | yahoo_shopping | yahoo_auction
// 응답:  AiSearchResponse (lib/ai-search/types.ts)
//
// Gemini 가 막혀도(429) 이 라우트는 실패하지 않습니다. 파이프라인 안에서 정규식 폴백으로
// 넘어가 mode: 'fallback' 으로 응답합니다.

export const dynamic = 'force-dynamic';
// 크롤러(메루카리·야후 옥션)를 기다릴 수 있어 넉넉히 둡니다.
export const maxDuration = 60;

import { NextResponse, after } from 'next/server';
import { rateLimit, clientIp } from '@/lib/rateLimit';
import { runAiSearch } from '@/lib/ai-search/pipeline';
import { isMallType } from '@/lib/ai-search/types';

/** 크롤러 라우트를 서버 안에서 부를 주소. 프록시(Nginx 등) 뒤라도 자기 자신을 직접 부르도록 합니다. */
function internalBaseUrl(): string {
  return (process.env.INTERNAL_BASE_URL?.trim() || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/+$/, '');
}

export async function POST(request: Request) {
  // 🔒 1인당 분당 10회. Gemini 무료 한도(분당 15회)를 한 사람이 다 쓰지 못하게 합니다.
  const limit = rateLimit(`ai-search:${clientIp(request)}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `검색이 너무 잦아요. ${limit.retryAfterSeconds}초 뒤에 다시 시도해 주세요.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  let body: { query?: unknown; mall_type?: unknown; stream?: unknown } | null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  const mallType = body?.mall_type ?? 'integrated';

  if (!query) return NextResponse.json({ error: '검색어를 입력해 주세요.' }, { status: 400 });
  if (query.length > 200) return NextResponse.json({ error: '검색어는 200자 이내로 입력해 주세요.' }, { status: 400 });
  if (!isMallType(mallType)) return NextResponse.json({ error: '지원하지 않는 쇼핑몰입니다.' }, { status: 400 });

  // 🌊 스트리밍 모드: 분석 결과 → 몰별 결과(도착 순) → 최종 결과를 NDJSON 으로 흘려보냅니다.
  //    화면은 빨리 온 몰부터 카드를 먼저 그리고, 느린 몰은 이어 붙입니다.
  if (body?.stream === true) {
    let resolveBg: (fn: (() => Promise<void>) | null) => void = () => {};
    const bgReady = new Promise<(() => Promise<void>) | null>(r => (resolveBg = r));
    // 응답(스트림)이 끝난 뒤 Qdrant 색인·RDS 저장
    after(async () => {
      const bg = await bgReady;
      if (bg) await bg();
    });

    const encoder = new TextEncoder();
    // 손님이 검색 도중 페이지를 닫거나 새 검색을 하면 → 크롤링 중단
    const clientGone = new AbortController();
    request.signal.addEventListener('abort', () => clientGone.abort(), { once: true });
    const stream = new ReadableStream<Uint8Array>({
      cancel() {
        clientGone.abort();
      },
      async start(controller) {
        const send = (e: unknown) => {
          try { controller.enqueue(encoder.encode(JSON.stringify(e) + '\n')); } catch { /* 손님이 창을 닫음 */ }
        };
        try {
          const { response, background } = await runAiSearch({
            query, mallType, internalBaseUrl: internalBaseUrl(), onEvent: send, signal: clientGone.signal,
          });
          send({ type: 'done', response });
          resolveBg(background);
        } catch (error) {
          console.error('❌ [AI 검색] 스트리밍 처리 실패:', error);
          send({ type: 'error', message: '검색 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.' });
          resolveBg(null);
        } finally {
          try { controller.close(); } catch { /* 이미 닫힘 */ }
        }
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  try {
    const { response, background } = await runAiSearch({ query, mallType, internalBaseUrl: internalBaseUrl() });
    // 응답을 먼저 보내고, Qdrant 색인·RDS 저장은 그 뒤에 합니다.
    after(background);
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ [AI 검색] 처리 실패:', error);
    return NextResponse.json({ error: '검색 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
}
