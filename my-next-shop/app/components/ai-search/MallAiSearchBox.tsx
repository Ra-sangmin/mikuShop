'use client';

// 🛍️ 개별 상점 서브 페이지용 AI 검색 (예: "라쿠텐 AI 검색")
//    해당 몰 안에서만 동작합니다 (mall_type = 그 몰).
//
//    몰 페이지는 사이드바·본문 위치가 헤더 높이에 맞춰 정밀하게 맞춰져 있어서, 본문에 상자를 끼우면
//    정렬이 틀어집니다. 그래서 헤더 오른쪽에는 버튼만 두고, 누르면 떠 있는 패널에서 검색합니다.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import AiProductGrid from './AiProductGrid';
import { useAiSearch } from './useAiSearch';
import { MALL_LABEL, type AiSearchResponse, type Mall } from '@/lib/ai-search/types';
import AiBotMark, { AiSparkle } from './AiBotMark';
import './ai-search.css';

const EXAMPLES: Record<Mall, string> = {
  rakuten: '부모님 선물로 좋은 일본 과자 세트 5천엔 이하',
  mercari: '상태 좋은 중고 닌텐도 스위치 2만엔 이하',
  yahoo_shopping: '자취생용 작은 전기밥솥 추천',
  yahoo_auction: '80년대 레트로 게임기 찾아줘',
};

export default function MallAiSearchBox({ mall, brandColor }: { mall: Mall; brandColor: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AiSearchResponse | null>(null);
  const { search, loading, error } = useAiSearch(mall);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await search(query);
    if (r) setResult(r);
  };

  const label = `${MALL_LABEL[mall]} AI 검색`;

  return (
    <>
      <button
        type="button"
        className="ais-mall-trigger notranslate"
        translate="no"
        style={{ background: brandColor }}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <AiBotMark size={22} />
        <span>AI 검색</span>
      </button>

      {/* 🐛 몰 헤더(.global-shop-header)는 transform/backdrop-filter 를 써서, 그 안의 position: fixed 가
          화면이 아니라 헤더 기준으로 잡혔습니다(어두운 배경이 헤더 높이만큼만 깔림).
          → 패널을 body 로 바로 내보내(portal) 화면 전체를 덮게 합니다. */}
      {open && createPortal(
        <div className="ais-root ais-mall-overlay notranslate" translate="no" onClick={() => setOpen(false)}>
          <div
            className="ais-mall-box"
            role="dialog"
            aria-label={label}
            style={{ ['--ais-mall-color' as string]: brandColor }}
            onClick={e => e.stopPropagation()}
          >
            <form className="ais-mall-form" onSubmit={submit}>
              <span className="ais-mall-label" style={{ background: brandColor }}><AiBotMark size={20} />{label}</span>
              <span className="ais-mall-input">
                <AiSparkle size={18} />
                <input
                ref={inputRef}
                value={query}
                maxLength={200}
                onChange={e => setQuery(e.target.value)}
                placeholder={`'${EXAMPLES[mall]}'`}
                aria-label={label}
                />
              </span>
              <button type="submit" disabled={loading || !query.trim()} style={{ background: brandColor }}>
                {loading ? '찾는 중…' : '검색'}
              </button>
              <button type="button" className="ais-link-btn" onClick={() => setOpen(false)} aria-label="닫기">
                ✕
              </button>
            </form>

            {error && <p className="ais-chip warn" style={{ marginTop: 10, display: 'inline-block' }}>{error}</p>}
            {loading && !result && <p className="ais-typing" style={{ marginTop: 16 }} aria-label="찾는 중"><i /><i /><i /></p>}

            {result && (
              <div className="ais-mall-result">
                <div className="ais-mall-result-head">
                  <span>
                    {result.mode === 'fallback' ? '⚡ ' : <AiSparkle size={16} className="ais-inline-sparkle" />}
                    {result.message}
                  </span>
                </div>
                <AiProductGrid items={result.items} showMall={false} />
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
