'use client';

// 🤖 AI 통합 검색 비서 — ChatGPT 스타일 대화형 검색 화면
//  - 기본은 4개 쇼핑몰 통합(integrated). 위 탭으로 한 몰만 골라 물어볼 수도 있습니다.
//  - 주소에 ?q=... 가 있으면 들어오자마자 그 질문으로 검색합니다 (메인 배너에서 넘어올 때).

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AiResultGrid, { MallLogo } from '@/app/components/ai-search/AiResultGrid';
import AiProductDetailModal from '@/app/components/ai-search/AiProductDetailModal';
import JaKoTranslate from '@/app/components/ai-search/JaKoTranslate';
import AiBotMark, { AiSparkle } from '@/app/components/ai-search/AiBotMark';
import AiCameraSheet, { canUseInPageCamera } from '@/app/components/ai-search/AiCameraSheet';
import AiSearchProgress, { type SearchProgress } from '@/app/components/ai-search/AiSearchProgress';
import { useAiSearch, useSuggestions } from '@/app/components/ai-search/useAiSearch';
import { prepareSearchImage, firstImageFile, SearchImageError, type PreparedImage } from '@/app/components/ai-search/searchImage';
import { MALLS, MALL_LABEL, formatPriceRange, type AiProduct, type AiSearchResponse, type MallType } from '@/lib/ai-search/types';
import '@/app/components/ai-search/ai-search.css';

// ✨ 이모지는 입력창 앞 AiSparkle 아이콘으로 옮겼습니다 (기기마다 이모지 모양이 달라 싸 보였음)
const PLACEHOLDER = "AI 비서에게 물어보세요! '여름 바닷가에서 입기 좋은 시원한 5만원대 원피스 찾아줘'";
// 휴대폰에서도 잘리지 않게 짧게 (없으면 그냥 보내도 됨)
// 첫 화면(장면 카드 안)은 입력칸이 좁아 짧게
const PLACEHOLDER_SCENE = "무엇이든 물어보세요 · 예: 5만원대 여름 원피스";
const PLACEHOLDER_WITH_IMAGE = "덧붙일 말 (예: 3천엔 이하로)";

type Turn =
  | { id: number; role: 'user'; text: string; image?: string }
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
    r.mode === 'ai' ? { cls: 'ai', label: a.fromImage ? '사진 분석' : 'AI 분석' }
    : r.mode === 'keyword' ? { cls: 'kw', label: '키워드 검색' }
    : { cls: 'fb', label: '일반 검색' };
  const title =
    r.mode === 'ai' ? (a.fromImage ? '사진 속 상품으로 찾아봤어요' : '말씀하신 조건으로 찾아봤어요')
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // 📷 사진 검색: 첨부한 사진(긴 변 768px 로 줄인 것)과 안내 문구
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [imageNotice, setImageNotice] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // 📷 휴대폰: 카메라 버튼을 누르면 [사진 촬영] / [앨범에서 가져오기] 를 고르는 작은 메뉴
  //    촬영은 capture="environment"(뒷면 카메라 바로 열기), 가져오기는 capture 없음(앨범·파일).
  //    PC 는 촬영할 카메라가 없으니 메뉴 없이 바로 파일 선택 창을 엽니다.
  const cameraRef = useRef<HTMLInputElement>(null);
  const photoMenuRef = useRef<HTMLDivElement>(null);
  const [photoMenu, setPhotoMenu] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  // 메뉴 바깥을 누르거나 Esc 를 누르면 닫습니다
  useEffect(() => {
    if (!photoMenu) return;
    const onDown = (e: PointerEvent) => {
      if (!photoMenuRef.current?.contains(e.target as Node)) setPhotoMenu(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setPhotoMenu(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [photoMenu]);
  // 📸 '사진 촬영'은 화면 안 카메라(AiCameraSheet)로 — capture 입력은 일부 폰에서 앨범 창이 떠서 대체용으로만 씁니다
  const [cameraOpen, setCameraOpen] = useState(false);
  const pickPhoto = (from: 'camera' | 'album') => {
    setPhotoMenu(false);
    if (from === 'camera' && canUseInPageCamera()) { setCameraOpen(true); return; }
    (from === 'camera' ? cameraRef : fileRef).current?.click();
  };
  // 메인 배너 '사진으로 찾아보기'(?photo=1)로 들어오면 📷 버튼을 반짝이며 안내합니다.
  // (브라우저 보안상 사진 선택 창을 자동으로 열 수는 없어 손님이 한 번 눌러야 합니다)
  const [photoHint, setPhotoHint] = useState(false);
  useEffect(() => {
    if (params.get('photo') === '1') setPhotoHint(true);
  }, [params]);
  const [turns, setTurns] = useState<Turn[]>([]);
  // 🔎 누른 상품 → 상세 정보 패널 (몰 페이지와 같은 GlobalProductDetail)
  const [selected, setSelected] = useState<AiProduct | null>(null);
  const closeDetail = useCallback(() => setSelected(null), []);
  const { searchStream, loading, cancel } = useAiSearch(mallType);
  const tags = useSuggestions(mallType);
  const idRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  /** 사진을 받아 줄인 뒤 첨부합니다 (버튼 · 붙여넣기 · 끌어다 놓기 공용) */
  const attachImage = async (file: File | null) => {
    if (!file) return;
    setPhotoHint(false);
    setImageNotice(null);
    setPreparing(true);
    try {
      setImage(await prepareSearchImage(file));
    } catch (e) {
      setImageNotice(e instanceof SearchImageError ? e.message : '사진을 준비하지 못했어요. 다른 사진으로 올려 주세요.');
    } finally {
      setPreparing(false);
    }
  };

  // ⏹ '정지'로 멈춘 검색의 답변 칸 id — 결과 대신 "멈췄어요" 안내를 띄우려고 기억합니다
  const stoppedRef = useRef<number | null>(null);
  const activeBotRef = useRef<number | null>(null);
  const stopSearch = () => {
    if (!loading) return;
    stoppedRef.current = activeBotRef.current;
    // 정지하면 처음 화면(장면 카드)으로 돌아갑니다 — goHome 이 진행 중인 검색도 끊습니다
    goHome();
  };

  /** @param img 보낼 사진. 생략하면 지금 첨부된 사진, null 이면 사진 없이 */
  const ask = async (text: string, img: PreparedImage | null = image) => {
    const q = text.trim();
    if ((!q && !img) || loading || preparing) return;
    setInput('');
    setImage(null);
    setImageNotice(null);
    const userId = ++idRef.current;
    const botId = ++idRef.current;
    activeBotRef.current = botId;
    stoppedRef.current = null;
    setTurns(t => [
      ...t,
      { id: userId, role: 'user', text: q, image: img?.dataUrl },
      { id: botId, role: 'bot', text: '', pending: true, progress: { malls: [], byMall: {} } },
    ]);

    // 🌊 도착하는 대로 진행 상태를 갱신 (분석 → 몰별 결과)
    const patchProgress = (fn: (p: SearchProgress) => SearchProgress) =>
      setTurns(t => t.map(turn => (turn.id === botId && turn.role === 'bot' && turn.progress ? { ...turn, progress: fn(turn.progress) } : turn)));

    let errorMessage: string | null = null;
    const result = await searchStream(q, ev => {
      if (ev.type === 'error') {
        errorMessage = ev.message;
      } else if (ev.type === 'analysis') {
        patchProgress(p => ({ ...p, mode: ev.mode, analysis: ev.analysis, malls: ev.malls }));
      } else if (ev.type === 'mall') {
        patchProgress(p => ({ ...p, byMall: { ...p.byMall, [ev.mall]: { items: ev.items, done: ev.done, error: ev.error } } }));
      }
    }, img);
    const stopped = stoppedRef.current === botId;
    setTurns(t =>
      t.map(turn =>
        turn.id !== botId
          ? turn
          : stopped
            ? { id: botId, role: 'bot', text: '검색을 멈췄어요. 다른 질문으로 다시 찾아볼까요?' }
            : result
            ? { id: botId, role: 'bot', text: result.message, result }
            : { id: botId, role: 'bot', text: errorMessage || '앗, 검색 중에 문제가 생겼어요. 잠시 후 다시 물어봐 주세요.', error: true },
      ),
    );
  };

  // 메인 배너에서 ?q= 로 넘어온 경우 자동 검색
  useEffect(() => {
    const q = params.get('q');
    if (q && !startedRef.current) {
      startedRef.current = true;
      void ask(q, null);
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
    setImage(null);
    setImageNotice(null);
    if (params.get('q')) router.replace('/ai-search', { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const empty = turns.length === 0;

  /** 🏠 대화 중 위쪽 '미쿠짱 AI 쇼핑 비서'를 누르면 처음 화면(장면 카드)으로 — 고른 쇼핑몰은 그대로 둡니다 */
  const goHome = () => {
    cancel();
    setTurns([]);
    setSelected(null);
    setInput('');
    setImage(null);
    setImageNotice(null);
    if (params.get('q')) router.replace('/ai-search', { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const homeLink = empty
    ? {}
    : {
        role: 'button' as const,
        tabIndex: 0,
        title: '처음 화면으로',
        className: 'ais-home-link',
        onClick: goHome,
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goHome(); }
        },
      };

  // 🖱 PC 첫 화면: 들어오자마자 입력창에 커서를 둬서 "여기에 바로 물어보면 된다"는 걸 보여 줍니다.
  //    (휴대폰은 키보드가 갑자기 올라오면 화면을 가리므로 하지 않음)
  useEffect(() => {
    if (!empty || params.get('q')) return;
    if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 입력창 — 첫 화면에서는 장면 카드 안, 대화 중에는 화면 아래(sticky)에 그립니다.
  const hint = (
  <>
    {/* 입력창 아래 안내 — 이모지 대신 선 아이콘 + 두 항목을 점으로 구분 (기기마다 이모지 모양이 달라 싸 보였음) */}
    <p className="ais-hint">
      <span className="ais-hint-item is-accent">
        <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden>
          <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.2-1.8A1.5 1.5 0 0 1 10.5 3.5h3a1.5 1.5 0 0 1 1.2.7L15.9 6h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
          <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
        사진을 올리면 <b>사진 속 상품</b>을 찾아 드려요
      </span>
    </p>
  </>
  );

  const composer = (
  <form
    className={`ais-composer-wrap notranslate${empty ? ' is-empty' : ''}${dragOver ? ' is-drag' : ''}`}
    translate="no"
    onSubmit={e => {
      e.preventDefault();
      void ask(input);
    }}
    // 📷 PC: 사진을 입력창 위로 끌어다 놓아도 첨부됩니다
    onDragOver={e => {
      if (Array.from(e.dataTransfer.items).some(i => i.kind === 'file')) {
        e.preventDefault();
        setDragOver(true);
      }
    }}
    onDragLeave={() => setDragOver(false)}
    onDrop={e => {
      const file = firstImageFile(e.dataTransfer.files);
      setDragOver(false);
      if (file) {
        e.preventDefault();
        void attachImage(file);
      }
    }}
  >
    {(image || preparing || imageNotice || photoHint) && (
      <div className="ais-attach">
        {photoHint && !image && !preparing && (
          <span className="ais-attach-hint">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
              <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.2-1.8A1.5 1.5 0 0 1 10.5 3.5h3a1.5 1.5 0 0 1 1.2.7L15.9 6h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />
              <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
            카메라 버튼을 눌러 상품 사진을 찍거나 앨범에서 골라 주세요
          </span>
        )}
        {preparing && <span className="ais-attach-loading"><span className="ais-send-spin" aria-hidden /> 사진 준비 중…</span>}
        {image && (
          <div className="ais-attach-chip">
            <img src={image.dataUrl} alt="첨부한 사진" />
            <span>이 사진 속 상품을 찾아 드려요</span>
            <button type="button" className="ais-attach-x" onClick={() => setImage(null)} aria-label="사진 빼기">×</button>
          </div>
        )}
        {imageNotice && <span className="ais-attach-notice">{imageNotice}</span>}
      </div>
    )}
    <div className="ais-composer">
      {/* 첫 화면: 📷 버튼 위에 걸친 말풍선 — 사진 검색이 된다는 걸 버튼 가까이에서 알려 줍니다 */}
      {empty && !image && (
        <span className="ais-photo-badge" aria-hidden>
          <svg viewBox="0 0 24 24" width="12" height="12">
            <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.2-1.8A1.5 1.5 0 0 1 10.5 3.5h3a1.5 1.5 0 0 1 1.2.7L15.9 6h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinejoin="round" />
            <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="2.2" fill="none" />
          </svg>
          사진을 올리면 <b>사진 속 상품</b>을 찾아 드려요
        </span>
      )}
      <span className="ais-composer-icon"><AiSparkle size={22} /></span>
      <textarea
        ref={inputRef}
        rows={1}
        value={input}
        maxLength={200}
        placeholder={image ? PLACEHOLDER_WITH_IMAGE : empty ? PLACEHOLDER_SCENE : PLACEHOLDER}
        aria-label="AI 비서에게 질문"
        onChange={e => setInput(e.target.value)}
        // 📷 캡처한 사진을 Ctrl+V 로 붙여넣어도 첨부됩니다
        onPaste={e => {
          const file = firstImageFile(e.clipboardData?.files);
          if (file) {
            e.preventDefault();
            void attachImage(file);
          }
        }}
        onKeyDown={e => {
          // Enter = 보내기, Shift+Enter = 줄바꿈 (한글 조합 중에는 보내지 않음)
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void ask(input);
          }
        }}
      />
      {/* 📷 사진으로 찾기 — 휴대폰은 [사진 촬영] / [앨범에서 가져오기] 메뉴, PC 는 바로 파일 선택 */}
      <div className="ais-camera-wrap" ref={photoMenuRef}>
        <button
          type="button"
          className={`ais-camera${image ? ' is-on' : ''}${photoHint && !image ? ' is-hint' : ''}${photoMenu ? ' is-open' : ''}`}
          onClick={() => (isTouch ? setPhotoMenu(v => !v) : fileRef.current?.click())}
          disabled={preparing}
          aria-label="사진으로 찾기"
          aria-haspopup={isTouch ? 'menu' : undefined}
          aria-expanded={isTouch ? photoMenu : undefined}
          title="사진으로 찾기"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.2-1.8A1.5 1.5 0 0 1 10.5 3.5h3a1.5 1.5 0 0 1 1.2.7L15.9 6h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinejoin="round" />
            <circle cx="12" cy="12.5" r="3.4" stroke="currentColor" strokeWidth="1.8" fill="none" />
          </svg>
        </button>
        {photoMenu && (
          <div className="ais-photo-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => pickPhoto('camera')}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.2-1.8A1.5 1.5 0 0 1 10.5 3.5h3a1.5 1.5 0 0 1 1.2.7L15.9 6h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinejoin="round" />
                <circle cx="12" cy="12.5" r="3.4" stroke="currentColor" strokeWidth="1.8" fill="none" />
              </svg>
              <span><b>사진 촬영</b><small>카메라로 바로 찍기</small></span>
            </button>
            <button type="button" role="menuitem" onClick={() => pickPhoto('album')}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
                <circle cx="9" cy="10" r="1.8" fill="currentColor" />
                <path d="M4 17l5-4.5 3.5 3 3-2.5L20 17" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinejoin="round" />
              </svg>
              <span><b>앨범에서 가져오기</b><small>저장된 사진·캡처 고르기</small></span>
            </button>
          </div>
        )}
      </div>
      {/* 앨범·파일 (PC 는 이것만 씀) */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={e => {
          void attachImage(e.target.files?.[0] ?? null);
          e.target.value = ''; // 같은 사진을 다시 골라도 반응하도록
        }}
      />
      {/* 촬영 — capture 가 있으면 휴대폰이 카메라를 바로 엽니다 */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={e => {
          void attachImage(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />
      {loading ? (
        // ⏹ 찾는 중에는 '정지' 버튼 — 누르면 진행 중인 검색을 끊습니다
        <button className="ais-send is-stop" type="button" onClick={stopSearch} aria-label="검색 멈추기">
          <span className="ais-stop-ico" aria-hidden>
            <span className="ais-send-spin" />
            <i />
          </span>
          <span>정지</span>
        </button>
      ) : (
        <button className="ais-send" type="submit" disabled={preparing || (!input.trim() && !image)} aria-label="검색하기">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>검색하기</span>
        </button>
      )}
    </div>
    {!empty && hint}
  </form>
  );

  return (
    <div className={`ais-root ais-page${empty ? ' is-empty' : ''}`}>
      <div className="ais-page-inner">
        {/* 첫 화면은 크게, 대화가 시작되면 결과가 잘 보이도록 머리말을 작게 줄입니다 */}
        <JaKoTranslate />
        {/* 첫 화면: '홀로그램 속 미쿠짱' 장면(ai-shopping-hero.webp)을 배경으로 깔고 왼쪽에 제목·몰 탭.
            대화가 시작되면 장면은 접고 작은 머리말(is-compact)로 바뀝니다. */}
        <header className={`ais-hero notranslate${empty ? ' has-scene' : ' is-compact'}`} translate="no">
          {/* 첫 화면은 크게(은은한 후광·반짝임), 대화 중에는 제목 옆 작은 마크로 */}
          <div {...homeLink} className={`ais-hero-mark${empty ? '' : ' ais-home-link'}`}>
            <AiBotMark size={empty ? 80 : 40} animated={empty} />
          </div>
          {empty && (
            <span className="ais-eyebrow"><AiSparkle size={12} /> MIKUCHAN AI CONCIERGE</span>
          )}
          <h1 {...homeLink}>미쿠짱 <span className="ais-grad-text">AI</span> 쇼핑 비서</h1>
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

          {/* 🔎 첫 화면: 검색창을 장면 카드 안(쇼핑몰 탭 바로 아래)에 둡니다 — "여기에 물어보면 된다"가 한눈에 보이도록 */}
          {empty && composer}

          {/* 첫 화면: 예시 질문을 검색창 바로 아래(장면 카드 안)에 — 눌러서 바로 검색 */}
          {empty && tags.length > 0 && (
            <div className="ais-suggest is-in-hero notranslate" translate="no">
              <span className="ais-suggest-label">
                <AiSparkle size={12} />
                이렇게 물어보세요
              </span>
              <div className="ais-tags">
                {tags.map(tag => (
                  <button key={tag} type="button" className="ais-tag" onClick={() => ask(tag, null)}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        <section className="ais-thread" aria-live="polite">
          {turns.map(turn =>
            turn.role === 'user' ? (
              <div key={turn.id} className="ais-msg user">
                <div className={`ais-bubble notranslate${turn.image ? ' has-image' : ''}`} translate="no">
                  {turn.image && <img className="ais-bubble-img" src={turn.image} alt="검색한 사진" />}
                  {turn.text && <span>{turn.text}</span>}
                </div>
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

      {/* 입력창(대화 중): 화면 아래에 붙습니다(sticky). 첫 화면에서는 위 장면 카드 안에 들어갑니다. */}
      {!empty && composer}

      </div>

      <AiProductDetailModal product={selected} onClose={closeDetail} />
      {/* 열 때마다 새로 그려서(이전 오류·상태 없이) 시작합니다 */}
      {cameraOpen && <AiCameraSheet
        open
        onClose={() => setCameraOpen(false)}
        onCapture={file => void attachImage(file)}
        onFallback={() => cameraRef.current?.click()}
      />}
    </div>
  );
}
