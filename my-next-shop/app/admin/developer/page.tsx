"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import '../admin-common.css';
import './developer-premium.css';
import { AdminHero, HeroButton, KpiCard, SegFilter, useToasts, ToastStack } from '../components/AdminPremiumKit';
import {
  Robot, Play, Stop, TreeStructure, HourglassMedium, ChartPie, Pulse, Terminal, Trash, CopySimple, Sparkle, ArrowClockwise,
} from '@phosphor-icons/react';

/* ============================================================
   🛠️ 개발자 도구 — 쇼핑몰 카테고리 자동 수집 매크로
   /api/admin/categories/auto-crawl 이 다음 수집 대상을 알려주면
   /api/admin/categories/{platform} 로 한 카테고리씩 수집합니다. (500ms 간격)
   ============================================================ */

const PLATFORMS = [
  { value: 'yahoo_auction', label: '야후 옥션', rgb: '239, 68, 68' },
  { value: 'yahoo_shopping', label: '야후 쇼핑', rgb: '220, 38, 38' },
  { value: 'rakuten', label: '라쿠텐', rgb: '190, 18, 60' },
  { value: 'mercari', label: '메루카리', rgb: '236, 72, 153' },
  { value: 'amazon', label: '아마존', rgb: '245, 158, 11' },
] as const;
type PlatformValue = (typeof PLATFORMS)[number]['value'];

type LogLevel = 'info' | 'success' | 'leaf' | 'warn' | 'error';
type LogLine = { id: number; time: string; level: LogLevel; text: string };

const MAX_LOG = 200;

export default function DeveloperPage() {
  const { toasts, pushToast } = useToasts();

  // --- 상태 ---
  const [targetPlatform, setTargetPlatform] = useState<PlatformValue>(PLATFORMS[0].value);
  const [stats, setStats] = useState({ totalCount: 0, pendingCount: 0 });
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const isAutoRunningRef = useRef(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const logIdRef = useRef(0);
  // 이번 실행에서 처리한 개수
  const [session, setSession] = useState({ done: 0, leaf: 0, newChildren: 0, startedAt: 0 });

  const platformMeta = PLATFORMS.find(p => p.value === targetPlatform) ?? PLATFORMS[0];

  // --- 공통 함수 ---
  const addLog = useCallback((level: LogLevel, text: string) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setLog(prev => [{ id: ++logIdRef.current, time, level, text }, ...prev].slice(0, MAX_LOG));
  }, []);

  const fetchTargetAndStats = useCallback(async (platform: string) => {
    const res = await fetch(`/api/admin/categories/auto-crawl?platform=${platform.toUpperCase()}`);
    return await res.json();
  }, []);

  const refreshStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const data = await fetchTargetAndStats(targetPlatform);
      if (data.success) setStats({ totalCount: data.totalCount, pendingCount: data.pendingCount });
    } catch {
      pushToast('error', '수집 현황을 불러오지 못했습니다.');
    } finally {
      setIsStatsLoading(false);
    }
  }, [fetchTargetAndStats, targetPlatform, pushToast]);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  // 화면을 떠나면 매크로도 멈춥니다.
  useEffect(() => () => { isAutoRunningRef.current = false; }, []);

  // --- 주요 액션 ---
  const startAutoCrawl = async () => {
    if (isAutoRunning) return;
    setIsAutoRunning(true);
    isAutoRunningRef.current = true;
    setSession({ done: 0, leaf: 0, newChildren: 0, startedAt: Date.now() });

    const platform = targetPlatform;
    const platformLabel = platformMeta.label;
    addLog('info', `[${platformLabel}] 자동 수집을 시작합니다.`);

    while (isAutoRunningRef.current) {
      try {
        const data = await fetchTargetAndStats(platform);
        if (!isAutoRunningRef.current) break;

        if (data.success) setStats({ totalCount: data.totalCount, pendingCount: data.pendingCount });

        const { nextId, nextName } = data;
        // 🐛 수집할 대상이 없으면 totalCount와 무관하게 멈춥니다.
        if (!nextId) {
          if (data.totalCount) {
            addLog('success', `[${platformLabel}] 모든 카테고리 수집이 완료되었습니다.`);
            pushToast('success', `${platformLabel} 카테고리 수집이 끝났습니다.`);
          } else {
            addLog('warn', `[${platformLabel}] 수집할 카테고리가 없습니다. 시작 카테고리를 먼저 등록해주세요.`);
          }
          break;
        }

        const crawlRes = await fetch(`/api/admin/categories/${platform}?genreId=${nextId}`);
        const crawlResult = await crawlRes.json();
        if (!isAutoRunningRef.current) break;

        if (crawlResult.success) {
          const displayName = `${nextId} (${nextName})`;
          if (crawlResult.isLeaf) {
            addLog('leaf', `${displayName} — 최하위 카테고리`);
            setSession(s => ({ ...s, done: s.done + 1, leaf: s.leaf + 1 }));
          } else {
            const n = crawlResult.data?.length || 0;
            addLog('success', `${displayName} 완료 · 신규 하위 ${n}개`);
            setSession(s => ({ ...s, done: s.done + 1, newChildren: s.newChildren + n }));
          }
        } else {
          // 🐛 실패하면 같은 카테고리를 무한히 다시 요청하지 않도록 알리고 중단합니다.
          addLog('error', `${nextId} (${nextName}) 수집 실패: ${crawlResult.error || crawlRes.status}`);
          pushToast('error', '수집 중 오류가 나서 멈췄습니다. 로그를 확인해 주세요.');
          break;
        }

        if (!isAutoRunningRef.current) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        addLog('error', `오류 발생: ${err}`);
        break;
      }
    }

    setIsAutoRunning(false);
    isAutoRunningRef.current = false;
    addLog('info', '자동 수집이 중단되었습니다.');
  };

  const stopAutoCrawl = () => {
    isAutoRunningRef.current = false;
    setIsAutoRunning(false);
  };

  const copyLog = () => {
    const text = [...log].reverse().map(l => `[${l.time}] ${l.text}`).join('\n');
    navigator.clipboard?.writeText(text)
      .then(() => pushToast('success', `로그 ${log.length}줄을 복사했습니다.`))
      .catch(() => pushToast('error', '복사하지 못했습니다.'));
  };

  // --- 표시용 ---
  const collected = Math.max(0, stats.totalCount - stats.pendingCount);
  const progress = stats.totalCount > 0 ? Math.round((collected / stats.totalCount) * 1000) / 10 : 0;
  const elapsedSec = session.startedAt ? Math.max(1, Math.round((Date.now() - session.startedAt) / 1000)) : 0;
  const perMin = session.done && elapsedSec ? Math.round((session.done / elapsedSec) * 60) : 0;
  const etaMin = perMin > 0 ? Math.ceil(stats.pendingCount / perMin) : null;
  const lastLine = log[0];

  return (
    <div className="ap-page dev-page">
      <AdminHero
        eyebrow="DEVELOPER" icon={<Sparkle size={11} weight="fill" />}
        title="카테고리 자동 수집"
        description="쇼핑몰의 카테고리 트리를 한 단계씩 따라가며 DB에 수집합니다. 수집 중에는 이 화면을 열어 두세요."
        accentRgb={platformMeta.rgb}
        actions={<>
          <HeroButton onClick={refreshStats} disabled={isStatsLoading || isAutoRunning}>
            <ArrowClockwise size={15} weight="bold" className={isStatsLoading ? 'ap-spin' : ''} /> 현황 새로고침
          </HeroButton>
          {isAutoRunning ? (
            <HeroButton onClick={stopAutoCrawl} className="dev-stop-btn">
              <Stop size={15} weight="fill" /> 수집 중지
            </HeroButton>
          ) : (
            <HeroButton primary onClick={startAutoCrawl}>
              <Play size={15} weight="fill" /> 수집 시작
            </HeroButton>
          )}
        </>}
      >
        <div className="ap-kpis">
          <KpiCard icon={<TreeStructure size={18} weight="duotone" />} label="전체 카테고리" toneRgb="147, 197, 253" loading={isStatsLoading}
            value={<>{stats.totalCount.toLocaleString()}<small>개</small></>}
            foot={`수집 완료 ${collected.toLocaleString()}개`} />
          <KpiCard icon={<HourglassMedium size={18} weight="duotone" />} label="수집 대기" toneRgb="253, 164, 175" loading={isStatsLoading}
            value={<>{stats.pendingCount.toLocaleString()}<small>개</small></>}
            foot={etaMin !== null && isAutoRunning ? <span className="is-warn">예상 남은 시간 약 {etaMin.toLocaleString()}분</span> : '다음 실행 때 이어서 수집합니다'} />
          <KpiCard icon={<ChartPie size={18} weight="duotone" />} label="진행률" toneRgb="110, 231, 183" loading={isStatsLoading}
            value={<>{progress}<small>%</small></>}
            foot={<span className="dev-progress"><i style={{ width: `${Math.min(100, progress)}%` }} /></span>} />
          <KpiCard icon={<Pulse size={18} weight="duotone" />} label="이번 실행" toneRgb="252, 211, 77"
            value={<>{session.done.toLocaleString()}<small>개 처리</small></>}
            foot={session.done ? `신규 하위 ${session.newChildren.toLocaleString()}개 · 최하위 ${session.leaf.toLocaleString()}개${perMin ? ` · 분당 ${perMin}개` : ''}` : '아직 실행하지 않았습니다'} />
        </div>
      </AdminHero>

      <section className="ap-panel">
        <div className="ap-toolbar">
          <div className="ap-toolbar-left">
            <SegFilter<PlatformValue>
              ariaLabel="수집할 쇼핑몰"
              value={targetPlatform}
              onChange={(v) => { if (!isAutoRunning) setTargetPlatform(v); }}
              options={PLATFORMS.map(p => ({ value: p.value, label: p.label, dotRgb: p.rgb }))}
            />
            {isAutoRunning && <span className="dev-lock">수집 중에는 쇼핑몰을 바꿀 수 없습니다</span>}
          </div>
          <div className="ap-toolbar-right">
            <span className={`dev-status ${isAutoRunning ? 'is-running' : ''}`}>
              <i /> {isAutoRunning ? `${platformMeta.label} 수집 중` : '대기 중'}
            </span>
          </div>
        </div>

        {/* 현재 상태 한 줄 */}
        <div className={`dev-now is-${lastLine?.level ?? 'info'}`}>
          <Robot size={18} weight="duotone" />
          <span className="dev-now-text">{lastLine ? lastLine.text : '수집 시작을 누르면 이곳에 진행 상황이 표시됩니다.'}</span>
          {lastLine && <span className="dev-now-time">{lastLine.time}</span>}
        </div>

        {/* 로그 콘솔 */}
        <div className="dev-console">
          <div className="dev-console-head">
            <span className="dev-console-title">
              <Terminal size={14} weight="bold" /> 매크로 로그 <em>최근 {MAX_LOG}줄 · 최신순</em>
            </span>
            <span className="dev-console-actions">
              <button type="button" onClick={copyLog} disabled={!log.length}><CopySimple size={13} weight="bold" /> 복사</button>
              <button type="button" onClick={() => setLog([])} disabled={!log.length || isAutoRunning}><Trash size={13} weight="bold" /> 비우기</button>
            </span>
          </div>
          <div className="dev-console-body" role="log" aria-live="polite">
            {log.length === 0 ? (
              <span className="dev-empty">$ 기록된 로그가 없습니다.</span>
            ) : log.map((l) => (
              <div key={l.id} className={`dev-line is-${l.level}`}>
                <span className="dev-time">{l.time}</span>
                <span className="dev-tag">{
                  l.level === 'success' ? 'DONE' : l.level === 'leaf' ? 'LEAF' : l.level === 'warn' ? 'WARN' : l.level === 'error' ? 'FAIL' : 'INFO'
                }</span>
                <span className="dev-text">{l.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ToastStack toasts={toasts} />
    </div>
  );
}
