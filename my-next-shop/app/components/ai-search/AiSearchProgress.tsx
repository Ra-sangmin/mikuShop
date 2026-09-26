'use client';

// ⏳ AI 검색 진행 화면 — 기다리는 동안 계속 무언가 바뀌도록
//
//  ① 단계별 안내 문구가 몇 초마다 바뀜 (질문 이해 → 검색어 변환 → 몰별 조회 …)
//  ② 몰별 진행 칩: 도는 표시 → ✓ N개 (도착 순서대로)
//  ③ 진행 막대: 끝난 몰 수만큼 차오름
//  ④ 먼저 도착한 몰의 상품 카드를 바로 보여 주고, 아직 안 온 자리는 빛이 지나가는 빈 카드로
//  마지막(done)에 AI 추천·정렬이 끝난 최종 결과 화면으로 바뀝니다.

import { useEffect, useMemo, useState } from 'react';
import AiResultGrid from './AiResultGrid';
import { MallLogo } from './mallBrand';
import { AiSparkle } from './AiBotMark';
import { MALL_LABEL, type AiProduct, type Mall, type QueryAnalysis, type SearchMode } from '@/lib/ai-search/types';

export interface SearchProgress {
  mode?: SearchMode;
  analysis?: QueryAnalysis;
  /** 이번 검색 대상 몰 (analysis 이벤트에서 받음) */
  malls: Mall[];
  byMall: Partial<Record<Mall, { items: AiProduct[]; done: boolean; error?: string }>>;
}

const THINKING = ['질문을 이해하고 있어요', '일본어 검색어로 바꾸고 있어요', '가격·조건을 정리하고 있어요'];
const TIPS = [
  '도착한 상품부터 먼저 보여 드릴게요',
  '라쿠텐·야후 쇼핑은 금방 도착해요',
  '메루카리·야후 옥션은 실시간으로 둘러보느라 조금 더 걸려요',
  '모두 모이면 질문과 가장 잘 맞는 상품을 AI 추천으로 골라 드려요',
];

function interleave(groups: AiProduct[][]): AiProduct[] {
  const out: AiProduct[] = [];
  const max = Math.max(0, ...groups.map(g => g.length));
  for (let i = 0; i < max; i++) for (const g of groups) if (g[i]) out.push(g[i]);
  return out;
}

export default function AiSearchProgress({
  progress,
  expectedMalls,
  onSelect,
}: {
  progress: SearchProgress;
  /** 분석이 오기 전에도 칩을 그리기 위한 예상 몰 목록 */
  expectedMalls: Mall[];
  onSelect: (p: AiProduct) => void;
}) {
  const malls = progress.malls.length ? progress.malls : expectedMalls;
  const a = progress.analysis;

  // 안내 문구 순환
  const lines = a ? TIPS : THINKING;
  // 분석 전(THINKING)·후(TIPS)로 문구 묶음이 바뀌면 첫 문장부터 다시 보여 줍니다.
  // 묶음이 바뀐 시점의 tick 을 기억해 두고 거기서부터 셉니다 (effect 안에서 tick 을 0 으로 되돌리지 않음).
  const [tick, setTick] = useState(0);
  const [phaseStart, setPhaseStart] = useState({ lines, tick: 0 });
  if (phaseStart.lines !== lines) setPhaseStart({ lines, tick });
  useEffect(() => {
    const t = window.setInterval(() => setTick(n => n + 1), 2400);
    return () => window.clearInterval(t);
  }, []);
  const line = lines[(tick - (phaseStart.lines === lines ? phaseStart.tick : tick)) % lines.length];

  const doneCount = malls.filter(m => progress.byMall[m]?.done).length;
  // 분석 단계도 진행의 일부로 쳐서 막대가 처음부터 조금 움직이게 합니다
  const pct = Math.round(((a ? 1 : 0.35) + doneCount) / (malls.length + 1) * 100);

  const items = useMemo(
    () => interleave(malls.map(m => progress.byMall[m]?.items ?? [])),
    [malls, progress.byMall],
  );
  const waiting = malls.length - doneCount;

  return (
    <div className="ais-progress notranslate" translate="no" aria-live="polite">
      <div className="ais-progress-head">
        <span className="ais-rh-mode is-ai"><AiSparkle size={13} />{a ? 'AI 검색 중' : 'AI 분석 중'}</span>
        <h3 className="ais-rh-title">
          {a ? (
            <>
              <span className="ais-rh-kw">{a.keywordKo || a.keywordJa}</span> (으)로 찾고 있어요
            </>
          ) : (
            '잠시만요, 질문을 살펴보고 있어요'
          )}
        </h3>
      </div>

      {/* 바뀌는 안내 문구 (key 로 매번 새로 그려 페이드인) */}
      <p key={line} className="ais-progress-line">{line}</p>

      <div className="ais-progress-bar" aria-hidden><i style={{ width: `${pct}%` }} /></div>

      <div className="ais-progress-malls">
        {malls.map(m => {
          const st = progress.byMall[m];
          const state = st?.error ? 'err' : st?.done ? 'done' : 'wait';
          return (
            <span key={m} className={`ais-pm is-${state}`}>
              <span className="ais-pm-ico">
                {m === 'rakuten' ? <span className="aib-mall-r">R</span> : <MallLogo mall={m} size={14} />}
              </span>
              {MALL_LABEL[m]}
              {state === 'wait' && <span className="ais-pm-spin" aria-label="찾는 중" />}
              {state === 'done' && <b>✓ {st!.items.length}개</b>}
              {state === 'err' && <b>잠시 실패</b>}
            </span>
          );
        })}
      </div>

      {items.length > 0 && <AiResultGrid items={items} onSelect={onSelect} showMall={malls.length > 1} />}

      {waiting > 0 && (
        <div className="ais-pending-skel ais-progress-skel" aria-hidden>
          {Array.from({ length: items.length ? 4 : 6 }).map((_, i) => <i key={i} />)}
        </div>
      )}
    </div>
  );
}
