'use client';

// 🤖 메인 화면용 'AI 쇼핑 비서' 연결 배너 (프리미엄)
//
//  - 깊은 자줏빛 바탕 + 로즈·바이올렛 오로라 + 그라데이션 테두리 + 마우스를 올리면 빛이 스쳐 지나감
//  - 입력창 모양 칸에 예시 질문이 한 글자씩 타이핑되고, 누르면 그 질문으로 바로 검색 (/ai-search?q=…)
//  - 배너 아무 곳이나 누르면 AI 검색 페이지로 이동 (예시 칸·몰 배지는 각자 자기 링크)

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AiBotMark, { AiSparkle } from './AiBotMark';
import { MallLogo } from './mallBrand';
import { MALLS, MALL_LABEL } from '@/lib/ai-search/types';
import './ai-search.css';

const EXAMPLES = [
  '여름 바닷가에서 입기 좋은 시원한 5만원대 원피스 찾아줘',
  '부모님 선물로 좋은 일본 과자 세트 5천엔 이하',
  '상태 좋은 중고 닌텐도 스위치 추천해줘',
  '캠핑 갈 때 쓸 가벼운 랜턴',
];

/** 예시 질문을 한 글자씩 쓰고 지우기를 반복합니다. 움직임 줄이기 설정이면 멈춘 문장을 보여 줍니다. */
function useTypewriter(lines: string[]) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(lines[0]);
  const [phase, setPhase] = useState<'typing' | 'hold' | 'erasing'>('hold');

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const full = lines[index];
    let t: number;
    if (phase === 'typing') {
      t = window.setTimeout(() => {
        const next = full.slice(0, text.length + 1);
        setText(next);
        if (next === full) setPhase('hold');
      }, 55);
    } else if (phase === 'hold') {
      t = window.setTimeout(() => setPhase('erasing'), 2200);
    } else {
      t = window.setTimeout(() => {
        const next = text.slice(0, -1);
        setText(next);
        if (!next) {
          setIndex(i => (i + 1) % lines.length);
          setPhase('typing');
        }
      }, 22);
    }
    return () => window.clearTimeout(t);
  }, [text, phase, index, lines]);

  return { text, current: lines[index] };
}

export default function AiSearchBanner() {
  const { text, current } = useTypewriter(EXAMPLES);

  return (
    <section className="ais-root align-container aib-wrap" aria-label="AI 쇼핑 비서">
      <div className="aib">
        {/* 배너 전체를 누르면 AI 검색 페이지로 (아래 개별 링크들은 이 위에 올라와 따로 동작) */}
        <Link href="/ai-search" className="aib-stretch" aria-label="AI 쇼핑 비서 열기" />

        <span className="aib-glow g1" aria-hidden />
        <span className="aib-glow g2" aria-hidden />
        <span className="aib-grid" aria-hidden />
        <span className="aib-shine" aria-hidden />

        <div className="aib-mark" aria-hidden>
          <span className="aib-mark-halo" />
          <AiBotMark size={84} animated />
        </div>

        <div className="aib-body">
          <span className="aib-eyebrow"><AiSparkle size={12} /> NEW · AI SHOPPING CONCIERGE</span>
          <h2 className="aib-title">
            <span className="aib-grad">AI</span> 쇼핑 비서에게 물어보세요
          </h2>
          <p className="aib-sub">일본 4대 쇼핑몰을 한국어 한 문장으로, 한 번에 찾아 드려요.</p>

          <Link
            href={`/ai-search?q=${encodeURIComponent(current)}`}
            className="aib-input"
            aria-label={`예시 질문으로 검색: ${current}`}
          >
            <span className="aib-input-icon"><AiSparkle size={18} /></span>
            <span className="aib-input-text">
              {text}
              <i className="aib-caret" aria-hidden />
            </span>
            <span className="aib-kbd" aria-hidden>Enter ↵</span>
          </Link>

          <div className="aib-malls">
            {MALLS.map(m => (
              <span key={m} className="aib-mall">
                <span className="aib-mall-ico">
                  {m === 'rakuten' ? <span className="aib-mall-r">R</span> : <MallLogo mall={m} size={14} />}
                </span>
                {MALL_LABEL[m]}
              </span>
            ))}
          </div>
        </div>

        <Link href="/ai-search" className="aib-cta">
          <span>AI 비서 호출</span>
          <span className="aib-cta-arrow" aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </Link>
      </div>
    </section>
  );
}
