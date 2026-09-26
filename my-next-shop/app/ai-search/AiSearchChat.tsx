'use client';

// 🤖 AI 통합 검색 비서 — ChatGPT 스타일 대화형 검색 화면
//  - 기본은 4개 쇼핑몰 통합(integrated). 위 탭으로 한 몰만 골라 물어볼 수도 있습니다.
//  - 주소에 ?q=... 가 있으면 들어오자마자 그 질문으로 검색합니다 (메인 배너에서 넘어올 때).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AiResultGrid, { MallLogo } from '@/app/components/ai-search/AiResultGrid';
import AiProductDetailModal from '@/app/components/ai-search/AiProductDetailModal';
import JaKoTranslate from '@/app/components/ai-search/JaKoTranslate';
import AiBotMark, { AiSparkle } from '@/app/components/ai-search/AiBotMark';
import AiSearchProgress, { type SearchProgress } from '@/app/components/ai-search/AiSearchProgress';
import { useAiSearch, useSuggestions } from '@/app/components/ai-search/useAiSearch';
import { MALLS, MALL_LABEL, formatPriceRange, type AiProduct, type AiSearchResponse, type MallType } from '@/lib/ai-search/types';
import '@/app/components/ai-search/ai-search.css';

// ✨ 이모지는 입력창 앞 AiSparkle 아이콘으로 옮겼습니다 (기기마다 이모지 모양이 달라 싸 보였음)
const PLACEHOLDER = "AI 비서에게 물어보세요! '여름 바닷가에서 입기 좋은 시원한 5만원대 원피스 찾아줘'";

type Turn =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'bot'; text: string; result?: AiSearchResponse; pending?: boolean; error?: boolean; progress?: SearchProgress };

const TABS: { id: MallType; label: string }[] = [
  { id: 'integrated', label: '전체 쇼핑몰' },
  ...MALLS.map(m => ({ id: m as MallType, label: MALL_LABEL[m] })),
];

/**
 * 답변 머리 — "말씀하신 조건으로 찾아봤어요 …" 를 한 줄 문장 대신 정리된 카드 머리로 보여 줍니다.
 *   ① 모드 배지 + 제목   ② 검색어(일본어·한국어)와 찾은 개수   ③ 분류·가격·오류 정보
 */
function ResultHeader({ r }: { r: AiSearchResponse }) {
  const a = r.analysis;
  const count = r.items.length;
  const mode =
    r.mode === 'ai' ? { cls: 'ai', label: 'AI 분석' }
    : r.mode === 'keyword' ? { cls: 'kw', label: '키워드 검색' }
    : { cls: 'fb', label: '일반 검색' };
  const title =
    r.mode === 'ai' ? '말씀하신 조건으로 찾아봤어요'
    : r.mode === 'keyword' ? '검색 결과를 가져왔어요'
    : r.fallbackReason === 'rate_limited' ? '지금 찾는 분이 많아 일반 검색으로 찾아 드렸어요'
    : 'AI 분석이 잠시 어려워 일반 검색으로 찾아 드렸어요';
  const price = formatPriceRange(a.minPriceJpy, a.maxPriceJpy);
  // 화면에는 한국어만 보여 줍니다 (검색은 일본어 keywordJa 로 이미 끝남)
  const kwKo = a.keywordKo?.trim() || a.keywordJa;
  const excludeKo = a.excludeKo?.length ? a.excludeKo.join(', ') : '';

  return (
    <div className="ais-rh notranslate" translate="no">
      <div className="ais-rh-top">
        <span className={`ais-rh-mode is-${mode.cls}`}>
          {mode.cls === 'fb' ? '⚡' : <AiSparkle size={13} />}
          {mode.label}
        </span>
        <h3 className="ais-rh-title">{title}</h3>
      </div>

      {count > 0 ? (
        <p className="ais-rh-line">
          <span className="ais-rh-kw">{kwKo}</span>
          <span className="ais-rh-text">(으)로</span>
          <b className="ais-rh-count">{count}</b>
          <span className="ais-rh-text">개의 상품을 찾았어요</span>
        </p>
      ) : (
        <p className="ais-rh-line is-empty">{r.message}</p>
      )}

      {(a.categoryKo || price || excludeKo || r.malls.some(m => m.error)) && (
        <div className="ais-rh-meta">
          {a.categoryKo && <span className="ais-rh-pill"><em>분류</em>{a.categoryKo}</span>}
          {price && <span className="ais-rh-pill"><em>가격</em>{price}</span>}
          {excludeKo && <span className="ais-rh-pill"><em>제외</em>{excludeKo}</span>}
          {r.malls.filter(m => m.error).map(m => (
            <span key={m.mall} className="ais-rh-pill is-warn">{m.error}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AiSearchChat() {
  const params = useSearchParams();
  const router = useRouter();
  const [mallType, setMallType] = useState<MallType>('integrated');
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  // 🔎 누른 상품 → 상세 정보 패널 (몰 페이지와 같은 GlobalProductDetail)
  const [selected, setSelected] = useState<AiProduct | null>(null);
  const closeDetail = useCallback(() => setSelected(null), []);
  const { searchStream, loading, cancel } = useAiSearch(mallType);
  const tags = useSuggestions(mallType);
  const idRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setInput('');
    const userId = ++idRef.current;
    const botId = ++idRef.current;
    setTurns(t => [
      ...t,
      { id: userId, role: 'user', text: q },
      { id: botId, role: 'bot', text: '', pending: true, progress: { malls: [], byMall: {} } },
    ]);

    // 🌊 도착하는 대로 진행 상태를 갱신 (분석 → 몰별 결과)
    const patchProgress = (fn: (p: SearchProgress) => SearchProgress) =>
      setTurns(t => t.map(turn => (turn.id === botId && turn.role === 'bot' && turn.progress ? { ...turn, progress: fn(turn.progress) } : turn)));

    const result = await searchStream(q, ev => {
      if (ev.type === 'analysis') {
        patchProgress(p => ({ ...p, mode: ev.mode, analysis: ev.analysis, malls: ev.malls }));
      } else if (ev.type === 'mall') {
        patchProgress(p => ({ ...p, byMall: { ...p.byMall, [ev.mall]: { items: ev.items, done: ev.done, error: ev.error } } }));
      }
    });
    setTurns(t =>
      t.map(turn =>
        turn.id !== botId
          ? turn
          : result
            ? { id: botId, role: 'bot', text: result.message, result }
            : { id: botId, role: 'bot', text: '앗, 검색 중에 문제가 생겼어요. 잠시 후 다시 물어봐 주세요.', error: true },
      ),
    );
  };

  // 메인 배너에서 ?q= 로 넘어온 경우 자동 검색
  useEffect(() => {
    const q = params.get('q');
    if (q && !startedRef.current) {
      startedRef.current = true;
      void ask(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // 새 질문을 보냈을 때(대화 칸 수가 늘 때)만 아래로 내려 줍니다.
  // 🐛 예전엔 turns 가 바뀔 때마다(몰별 상품이 도착할 때마다) 맨 아래로 끌려 내려가
  //    위쪽 상품을 보던 손님의 화면이 계속 움직였습니다. 이후 스크롤은 손님에게 맡깁니다.
  const turnCount = turns.length;
  useEffect(() => {
    if (turnCount === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turnCount]);

  /**
   * 쇼핑몰 탭 변경 = 새 대화.
   * 다른 몰 기준으로 찾은 이전 결과가 남아 있으면 헷갈리므로, 대화·상세 패널·진행 중 검색을 비우고
   * 처음 화면(가운데 입력창 + 추천 태그)으로 돌아갑니다. 주소의 ?q= 도 지워 새로고침 때 다시 검색하지 않게 합니다.
   */
  const changeMall = (next: MallType) => {
    if (next === mallType) return;
    cancel();
    setMallType(next);
    setTurns([]);
    setSelected(null);
    setInput('');
    if (params.get('q')) router.replace('/ai-search', { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const empty = turns.length === 0;

  return (
    <div className={`ais-root ais-page${empty ? ' is-empty' : ''}`}>
      <div className="ais-page-inner">
        {/* 첫 화면은 크게, 대화가 시작되면 결과가 잘 보이도록 머리말을 작게 줄입니다 */}
        <JaKoTranslate />
        <header className={`ais-hero notranslate${empty ? '' : ' is-compact'}`} translate="no">
          {/* 첫 화면은 크게(은은한 후광·반짝임), 대화 중에는 제목 옆 작은 마크로 */}
          <div className="ais-hero-mark">
            <AiBotMark size={empty ? 80 : 40} animated={empty} />
          </div>
          {empty && (
            <span className="ais-eyebrow"><AiSparkle size={12} /> MIKUCHAN AI CONCIERGE</span>
          )}
          <h1>미쿠짱 <span className="ais-grad-text">AI</span> 쇼핑 비서</h1>
          <p>메루카리 · 라쿠텐 · 야후 쇼핑 · 야후 옥션을 한 번에 찾아 드려요. 한국어로 편하게 물어보세요!</p>

          {/* 쇼핑몰 선택: 하나의 알약 안에 나란히 놓인 세그먼트. 각 몰은 실제 로고로 구분합니다. */}
          <div className="ais-seg-wrap">
            <div className="ais-seg" role="tablist" aria-label="검색할 쇼핑몰">
              {TABS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={mallType === t.id}
                  className="ais-seg-btn"
                  onClick={() => changeMall(t.id)}
                >
                  <span className="ais-seg-ico">
                    {t.id === 'integrated' ? (
                      <AiSparkle size={14} />
                    ) : t.id === 'rakuten' ? (
                      // 라쿠텐 로고는 가로로 긴 글자형이라 작은 원 안에서는 읽히지 않아 브랜드 색 R 마크로 대신합니다
                      <span className="ais-seg-r">R</span>
                    ) : (
                      <MallLogo mall={t.id} size={15} />
                    )}
                  </span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

        </header>

        <section className="ais-thread" aria-live="polite">
          {turns.map(turn =>
            turn.role === 'user' ? (
              <div key={turn.id} className="ais-msg user">
                <div className="ais-bubble notranslate" translate="no">{turn.text}</div>
              </div>
            ) : (
              <div key={turn.id} className="ais-msg bot">
                <div className="ais-msg-avatar" aria-hidden><AiBotMark size={36} /></div>
                <div className="ais-bubble">
                  {turn.pending ? (
                    <AiSearchProgress
                      progress={turn.progress ?? { malls: [], byMall: {} }}
                      expectedMalls={mallType === 'integrated' ? [...MALLS] : [mallType as (typeof MALLS)[number]]}
                      onSelect={setSelected}
                    />
                  ) : (
                    <>
                      {turn.result ? (
                        <ResultHeader r={turn.result} />
                      ) : (
                        <div className="notranslate" translate="no">{turn.text}</div>
                      )}
                      {/* 몰 페이지의 카테고리 상품 목록과 같은 카드. 누르면 상세 정보 패널이 뜹니다. */}
                      {turn.result && <AiResultGrid items={turn.result.items} onSelect={setSelected} showMall={turn.result.malls.length > 1} />}
                    </>
                  )}
                </div>
              </div>
            ),
          )}
          <div ref={bottomRef} />
        </section>

      {/* 입력창: 첫 화면에선 머리말 바로 아래(가운데), 대화 중에는 화면 아래에 붙습니다(sticky).
          예전엔 position: fixed 라 페이지 끝의 푸터(사업자 정보)를 덮었습니다. */}
      <form
        className={`ais-composer-wrap notranslate${empty ? ' is-empty' : ''}`}
        translate="no"
        onSubmit={e => {
          e.preventDefault();
          void ask(input);
        }}
      >
        <div className="ais-composer">
          <span className="ais-composer-icon"><AiSparkle size={22} /></span>
          <textarea
            rows={1}
            value={input}
            maxLength={200}
            placeholder={PLACEHOLDER}
            aria-label="AI 비서에게 질문"
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              // Enter = 보내기, Shift+Enter = 줄바꿈 (한글 조합 중에는 보내지 않음)
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void ask(input);
              }
            }}
          />
          <button className="ais-send" type="submit" disabled={loading || !input.trim()} aria-label="보내기">
            {loading ? (
              <span className="ais-send-spin" aria-hidden />
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <span>{loading ? '찾는 중' : '보내기'}</span>
          </button>
        </div>
        <p className="ais-hint">가격은 판매처 기준 엔화이며, 수수료·배송비는 별도예요. 사람이 많을 땐 일반 검색으로 자동 전환돼요.</p>
      </form>

        {empty && tags.length > 0 && (
          <div className="ais-suggest notranslate" translate="no">
            <span className="ais-suggest-label">이렇게 물어보세요</span>
            <div className="ais-tags">
              {tags.map(tag => (
                <button key={tag} type="button" className="ais-tag" onClick={() => ask(tag)}>
                  <AiSparkle size={12} />
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <AiProductDetailModal product={selected} onClose={closeDetail} />
    </div>
  );
}
