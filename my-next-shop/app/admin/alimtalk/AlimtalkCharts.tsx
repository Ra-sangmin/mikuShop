"use client";

// 📈 카카오톡 알림톡 관리 화면의 차트 (솔라피 콘솔 대시보드와 비슷한 모양)
//   - TrendChart        : 발송 추세 — 부드러운 곡선 + 아래 그라데이션 (성공), 빨간 선 (실패), 마우스를 올리면 세로선 + 툴팁
//   - ChannelBreakdown  : 채널 구성 — 도넛 + 가운데 총 발송 + 오른쪽 범례
//   SVG 는 실제 픽셀 폭으로 그립니다 (글자가 늘어나지 않도록 ResizeObserver 로 폭을 잽니다).
//   스타일: ./alimtalk-premium.css 의 atk-trend2 / atk-donut

import { useEffect, useId, useMemo, useRef, useState } from 'react';

export interface DailyPoint { date: string; success: number; failed: number; total: number }
export interface ChannelShare { type: string; label: string; count: number }

const n = (v: number) => v.toLocaleString('ko-KR');
const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${m}/${d}`;
};

// 채널 색: 순위가 아니라 채널마다 고정 (기간을 바꿔도 색이 바뀌지 않도록). 알림톡은 카카오 노란색.
const CHANNEL_COLOR: Record<string, string> = {
  '알림톡': '#fee500',
  'SMS': '#4f46e5',
  'LMS': '#1baf7a',
  'MMS': '#eb6834',
  '친구톡': '#e87ba4',
};
export const channelColor = (label: string) => CHANNEL_COLOR[label] ?? '#94a3b8';

/** 요소의 실제 폭을 추적합니다 */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/**
 * 부드러운 곡선 (monotone cubic). 값이 0 아래로 내려가거나 봉우리를 넘어 튀지 않습니다.
 * 점이 1개면 직선 없이 점만 이어집니다.
 */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  const n = pts.length;
  const dx: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x);
    m.push((pts[i + 1].y - pts[i].y) / (dx[i] || 1));
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i].x + h},${pts[i].y + t[i] * h} ${pts[i + 1].x - h},${pts[i + 1].y - t[i + 1] * h} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

/** 0 부터 max 이상까지 정수 눈금 (최대 5칸) */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 5, 10].map(k => k * pow).find(s => s >= raw) ?? pow * 10);
  const top = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top; v += step) out.push(v);
  return out;
}

// ================================================================ 발송 추세

export function TrendChart({ data, footnote }: { data: DailyPoint[]; footnote?: string }) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, '');

  const totals = useMemo(
    () => data.reduce((s, d) => ({ success: s.success + d.success, failed: s.failed + d.failed }), { success: 0, failed: 0 }),
    [data],
  );

  const H = 230;
  const pad = { top: 12, right: 12, bottom: 28, left: 34 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = H - pad.top - pad.bottom;

  const max = Math.max(0, ...data.map(d => Math.max(d.success, d.failed)));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;

  const x = (i: number) => pad.left + (data.length <= 1 ? innerW / 2 : (innerW * i) / (data.length - 1));
  const y = (v: number) => pad.top + innerH - (v / top) * innerH;

  const successPts = data.map((d, i) => ({ x: x(i), y: y(d.success) }));
  const failedPts = data.map((d, i) => ({ x: x(i), y: y(d.failed) }));
  const successLine = smoothPath(successPts);
  const failedLine = smoothPath(failedPts);
  const baseY = y(0);
  const successArea = successPts.length > 1
    ? `${successLine} L${successPts[successPts.length - 1].x},${baseY} L${successPts[0].x},${baseY} Z`
    : '';

  // 30일은 라벨이 겹치지 않게 건너뛰기 (첫날·마지막날은 항상)
  const labelEvery = data.length > 7 ? Math.ceil(data.length / 7) : 1;

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    if (data.length === 0) return;
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left - pad.left;
    const i = data.length <= 1 ? 0 : Math.round((px / innerW) * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, i)));
  };

  const hd = hover !== null ? data[hover] : null;
  const tipLeft = hover !== null ? x(hover) : 0;
  const tipOnLeft = hover !== null && tipLeft > width / 2;
  const rate = totals.success + totals.failed > 0 ? (totals.success / (totals.success + totals.failed)) * 100 : null;

  return (
    <div className="atk-trend2">
      <div className="atk-kpi-legend">
        <div>
          <span><i style={{ background: 'var(--atk-success)' }} />성공</span>
          <strong>{n(totals.success)}</strong>
        </div>
        <div>
          <span><i style={{ background: 'var(--atk-fail)' }} />실패</span>
          <strong>{n(totals.failed)}</strong>
        </div>
        {rate !== null && (
          <div className="is-rate">
            <span>성공률</span>
            <strong>{rate.toFixed(1)}%</strong>
          </div>
        )}
      </div>

      <div className="atk-trend2-plot" ref={ref}>
        {width > 0 && (
          <svg width={width} height={H} role="img"
            aria-label={`기간 발송: 성공 ${totals.success}건, 실패 ${totals.failed}건`}>
            <defs>
              <linearGradient id={`atk-area-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--atk-success)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="var(--atk-success)" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* 가로 눈금선 + y 라벨 */}
            {ticks.map(t => (
              <g key={t}>
                <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)}
                  className={t === 0 ? 'atk-axis-base' : 'atk-axis-grid'} />
                <text x={pad.left - 10} y={y(t)} className="atk-axis-label" textAnchor="end" dominantBaseline="middle">{n(t)}</text>
              </g>
            ))}

            {/* x 라벨 */}
            {data.map((d, i) => (i % labelEvery === 0 || i === data.length - 1) && (
              <text key={d.date} x={x(i)} y={H - 8} className="atk-axis-label"
                textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>
                {shortDate(d.date)}
              </text>
            ))}

            {/* 성공: 면 + 곡선 / 실패: 곡선 */}
            {successArea && <path d={successArea} fill={`url(#atk-area-${gid})`} />}
            <path d={successLine} className="atk-line is-success" />
            <path d={failedLine} className="atk-line is-fail" />

            {/* 마우스 위치 표시 */}
            {hd && (
              <g pointerEvents="none">
                <line x1={x(hover!)} x2={x(hover!)} y1={pad.top} y2={baseY} className="atk-crosshair" />
                <circle cx={x(hover!)} cy={y(hd.success)} r={4.5} className="atk-dot is-success" />
                <circle cx={x(hover!)} cy={y(hd.failed)} r={4.5} className="atk-dot is-fail" />
              </g>
            )}

            <rect x={pad.left} y={pad.top} width={innerW} height={innerH} fill="transparent"
              onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
          </svg>
        )}

        {hd && (
          <div className={`atk-tip2 ${tipOnLeft ? 'is-left' : ''}`} style={{ left: tipLeft, top: pad.top }}>
            <strong>{shortDate(hd.date)}</strong>
            <span><i style={{ background: 'var(--atk-success)' }} />성공 <b>{n(hd.success)}</b></span>
            <span><i style={{ background: 'var(--atk-fail)' }} />실패 <b>{n(hd.failed)}</b></span>
          </div>
        )}

        {totals.success + totals.failed === 0 && (
          <span className="atk-trend2-empty">이 기간에 발송한 메시지가 없어요</span>
        )}
      </div>

      {footnote && <p className="atk-footnote">ⓘ {footnote}</p>}
    </div>
  );
}

// ================================================================ 채널 구성 (도넛)

export function ChannelBreakdown({ channels }: { channels: ChannelShare[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = channels.reduce((s, c) => s + c.count, 0);

  const size = 160, stroke = 26;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const gap = channels.length > 1 ? 2 : 0; // 조각 사이 2px 간격

  let offset = 0;
  const arcs = channels.map(c => {
    const len = total > 0 ? (c.count / total) * C : 0;
    const arc = { ...c, dash: Math.max(0, len - gap), offset };
    offset += len;
    return arc;
  });

  const pct = (c: number) => (total > 0 ? (c / total) * 100 : 0);
  const alim = channels.find(c => c.label === '알림톡')?.count ?? 0;
  const sms = channels.filter(c => ['SMS', 'LMS', 'MMS'].includes(c.label)).reduce((s, c) => s + c.count, 0);
  const shown = hover ? channels.find(c => c.label === hover) : null;

  return (
    <div className="atk-donut-wrap">
      <div className="atk-donut">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
          aria-label={total > 0 ? channels.map(c => `${c.label} ${c.count}건`).join(', ') : '발송 없음'}>
          <circle cx={size / 2} cy={size / 2} r={r} className="atk-donut-track" strokeWidth={stroke} />
          {arcs.map(a => (
            <circle key={a.label} cx={size / 2} cy={size / 2} r={r}
              fill="none" stroke={channelColor(a.label)} strokeWidth={hover === a.label ? stroke + 4 : stroke}
              strokeDasharray={`${a.dash} ${C - a.dash}`}
              strokeDashoffset={-a.offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              onMouseEnter={() => setHover(a.label)} onMouseLeave={() => setHover(null)}
              style={{ transition: 'stroke-width 0.15s ease', cursor: 'default' }} />
          ))}
        </svg>
        <div className="atk-donut-center" aria-hidden="true">
          <strong>{n(shown ? shown.count : total)}</strong>
          <span>{shown ? shown.label : '총 발송'}</span>
        </div>
      </div>

      <div className="atk-donut-side">
        {total === 0 ? (
          <p className="atk-donut-empty">이 기간에 발송한 메시지가 없어요</p>
        ) : (
          <ul className="atk-donut-legend">
            {channels.map(c => (
              <li key={c.label} className={hover === c.label ? 'is-hover' : undefined}
                onMouseEnter={() => setHover(c.label)} onMouseLeave={() => setHover(null)}>
                <i style={{ background: channelColor(c.label) }} />
                <span className="atk-donut-name">{c.label}</span>
                <strong>{n(c.count)}</strong>
                <em>{pct(c.count).toFixed(1)}%</em>
              </li>
            ))}
          </ul>
        )}
        {sms > 0 && alim > 0 && (
          <p className="atk-channel-note">
            문자(SMS·LMS·MMS)가 알림톡 건수의 <strong>{((sms / alim) * 100).toFixed(0)}%</strong> 입니다. 알림톡 실패 후 대체 문자로 나간 건이 포함될 수 있어요.
          </p>
        )}
      </div>
    </div>
  );
}
