'use client';

// 🤖 AI 검색 호출 훅 — 통합 페이지와 몰별 검색창이 같이 씁니다.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiSearchResponse, AiStreamEvent, MallType } from '@/lib/ai-search/types';

export function useAiSearch(mallType: MallType) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 🐛 예전엔 화면을 벗어날 때(unmount) 진행 중인 검색을 끊었는데, 개발 모드(StrictMode)는 컴포넌트를
  //    한 번 붙였다 떼었다 다시 붙입니다. 그 사이에 /ai-search?q=… 자동 검색이 끊겨
  //    "검색 중에 문제가 생겼어요" 가 떴습니다. 응답을 받아도 해가 없으므로 unmount 때는 끊지 않습니다.
  //    (새 검색이 이전 검색을 대신할 때만 끊습니다)

  const search = useCallback(
    async (query: string): Promise<AiSearchResponse | null> => {
      const q = query.trim();
      if (!q) return null;

      abortRef.current?.abort(); // 이전 검색은 취소
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/ai-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, mall_type: mallType }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || '검색에 실패했어요.');
        return data as AiSearchResponse;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return null;
        setError((e as Error).message);
        return null;
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    },
    [mallType],
  );

  /**
   * 🌊 스트리밍 검색: 분석·몰별 결과가 나오는 대로 onEvent 로 알려 주고, 마지막에 최종 결과를 돌려줍니다.
   * 스트림을 못 쓰는 환경이면 일반 검색(search)과 같은 결과만 돌려줍니다.
   */
  const searchStream = useCallback(
    async (query: string, onEvent: (e: AiStreamEvent) => void): Promise<AiSearchResponse | null> => {
      const q = query.trim();
      if (!q) return null;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/ai-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, mall_type: mallType, stream: true }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || '검색에 실패했어요.');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let final: AiSearchResponse | null = null;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            let ev: AiStreamEvent;
            try { ev = JSON.parse(line); } catch { continue; }
            if (ev.type === 'error') throw new Error(ev.message);
            if (ev.type === 'done') final = ev.response;
            onEvent(ev);
          }
        }
        if (!final) throw new Error('검색 결과를 받지 못했어요.');
        return final;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return null;
        setError((e as Error).message);
        return null;
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
    },
    [mallType],
  );

  /** 진행 중인 검색을 취소하고 상태를 비웁니다 (쇼핑몰 탭을 바꿔 처음 화면으로 돌아갈 때) */
  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setError(null);
  }, []);

  return { search, searchStream, loading, error, cancel };
}

export function useSuggestions(mallType: MallType) {
  const [tags, setTags] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    fetch(`/api/ai-search/suggestions?mall_type=${mallType}`)
      .then(r => r.json())
      .then(d => alive && setTags(Array.isArray(d?.tags) ? d.tags : []))
      .catch(() => {});
    return () => { alive = false; };
  }, [mallType]);
  return tags;
}
