"use client";

// 💬 카카오톡 알림톡 관리
// 솔라피 API 로 오늘 발송 · 합산 잔액 · 일일 한도를 보여 줍니다.
//   - 데이터: /api/admin/alimtalk/summary (lib/notifications/solapiAccount.ts)
//   - 알림톡 발송 로직은 lib/notifications/alimtalk.ts, orderStatusAlimtalk.ts 에 있습니다.

import { useCallback, useEffect, useState } from 'react';
import '../admin-common.css';
import { AdminHero, HeroButton, KpiCard, fmtDateTime } from '../components/AdminPremiumKit';
import {
  ChatCircleDots, Info, ArrowClockwise, ArrowSquareOut, PaperPlaneTilt, Wallet, Gauge, WarningCircle,
} from '@phosphor-icons/react';

const SOLAPI_DASHBOARD_URL = 'https://console.solapi.com/dashboard';

type Section<T> = { ok: true; data: T } | { ok: false; error: string };
interface Summary {
  configured: boolean;
  today: Section<{ total: number; success: number; failed: number; pending: number }>;
  balance: Section<{ balance: number; point: number; total: number; autoRecharge: boolean; monthUsed: number | null }>;
  quota: Section<{ quota: number; used: number; remaining: number; autoAdjustment: boolean }>;
  fetchedAt: string;
}

const n = (v: number) => v.toLocaleString('ko-KR');

export default function AlimtalkManagement() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/alimtalk/summary', { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || '솔라피 현황을 불러오지 못했습니다.');
      setSummary(json.summary);
    } catch (e: any) {
      setLoadError(e?.message || '솔라피 현황을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = summary?.today;
  const balance = summary?.balance;
  const quota = summary?.quota;

  // 카드별 오류 문구 (같은 문구는 한 번만)
  const errors = [today, balance, quota]
    .filter((s): s is { ok: false; error: string } => !!s && !s.ok)
    .map(s => s.error)
    .filter((msg, i, arr) => arr.indexOf(msg) === i);
  if (loadError) errors.unshift(loadError);

  const failFoot = (msg: string) => <span title={msg}>조회 실패 · {msg}</span>;
  const usedPct = quota?.ok && quota.data.quota > 0 ? Math.min(100, Math.round((quota.data.used / quota.data.quota) * 100)) : 0;

  return (
    <div className="ap-page">
      <AdminHero
        eyebrow="KAKAO ALIMTALK"
        icon={<ChatCircleDots size={14} weight="bold" />}
        title="카카오톡 알림톡 관리"
        description="솔라피 계정의 오늘 발송량, 잔액, 하루 발송 한도를 확인합니다."
        accentRgb="254, 229, 0"
        actions={
          <>
            <HeroButton onClick={load} disabled={isLoading}>
              <ArrowClockwise size={15} weight="bold" /> 새로고침
            </HeroButton>
            <a className="ap-hero-btn is-primary" href={SOLAPI_DASHBOARD_URL} target="_blank" rel="noopener noreferrer">
              솔라피 대시보드 바로가기 <ArrowSquareOut size={15} weight="bold" />
            </a>
          </>
        }
      >
        <div className="ap-kpis is-3">
          <KpiCard
            icon={<PaperPlaneTilt size={18} weight="duotone" />}
            label="오늘 발송"
            toneRgb="165, 180, 252"
            loading={isLoading}
            value={today?.ok ? <>{n(today.data.total)}<small>건</small></> : '—'}
            foot={today?.ok
              ? <>성공 {n(today.data.success)} · 실패 {n(today.data.failed)} · 처리중 {n(today.data.pending)}</>
              : today && failFoot(today.error)}
          />
          <KpiCard
            icon={<Wallet size={18} weight="duotone" />}
            label="합산 잔액"
            toneRgb="253, 224, 71"
            loading={isLoading}
            value={balance?.ok ? <><span className="ap-cur">₩</span>{n(balance.data.total)}</> : '—'}
            foot={balance?.ok
              ? <>자동충전 {balance.data.autoRecharge ? 'ON' : 'OFF'}{balance.data.monthUsed !== null && <> · 이번달 ₩{n(balance.data.monthUsed)} 사용</>}</>
              : balance && failFoot(balance.error)}
          />
          <KpiCard
            icon={<Gauge size={18} weight="duotone" />}
            label="일일 한도"
            toneRgb="110, 231, 183"
            loading={isLoading}
            value={quota?.ok ? <>{n(quota.data.used)}<small>건 / {n(quota.data.quota)}건</small></> : '—'}
            foot={quota?.ok
              ? <>{n(quota.data.remaining)}건 남음 · {usedPct}% 사용</>
              : quota && failFoot(quota.error)}
          />
        </div>
      </AdminHero>

      <section className="ap-panel">
        {errors.length > 0 && (
          <div className="ap-help" style={{ margin: '0 0 10px' }}>
            <WarningCircle size={15} weight="bold" />
            <span>
              솔라피 조회 중 오류가 있습니다: <strong>{errors.join(' / ')}</strong>
              {errors.some(e => e.includes('IP')) && (
                <> — 솔라피 콘솔의 API 키 설정에서 허용 IP 에 이 서버의 IP 를 추가해야 조회됩니다. (운영 서버에서는 정상일 수 있습니다)</>
              )}
            </span>
          </div>
        )}
        <div className="ap-help" style={{ margin: 0 }}>
          <Info size={15} weight="bold" />
          <span>
            오늘 발송과 한도 사용량은 <strong>오늘 0시(KST)</strong>부터 집계합니다. 솔라피의 하루 한도는 매일 오전 9시 무렵 초기화되므로 콘솔 수치와 조금 다를 수 있습니다.
            {summary?.fetchedAt && <> · 마지막 조회 {fmtDateTime(summary.fetchedAt)}</>}
          </span>
        </div>
      </section>
    </div>
  );
}
