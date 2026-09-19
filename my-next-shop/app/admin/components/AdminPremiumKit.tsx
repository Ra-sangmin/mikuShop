"use client";

/**
 * ✨ 관리자 화면 공통 UI 키트 (admin-premium.css 와 함께 사용)
 *
 * admin/users 의 디자인을 다른 관리자 화면에서도 똑같이 쓰도록 모은 작은 컴포넌트들입니다.
 *  - <AdminHero>      : 어두운 상단 영역 (제목, 설명, 오른쪽 버튼, KPI 카드)
 *  - <HeroButton>     : 히어로 안 버튼 (primary = 흰 버튼)
 *  - <KpiCard>        : 히어로 안 요약 숫자 카드
 *  - <SearchField>    : 돋보기 + 지우기 버튼이 있는 검색창
 *  - <SegFilter>      : 개수 뱃지가 붙은 세그먼트 필터
 *  - <EmptyRow>, <SkeletonRows> : 표의 빈 상태 / 로딩 상태
 *  - useToasts() + <ToastStack> : alert 대신 쓰는 하단 토스트
 *
 * 사용: 화면 최상위 요소에 className="ap-page" 를 주세요.
 */

import { useCallback, useState, type CSSProperties, type ReactNode } from 'react';
import { MagnifyingGlass, X, CheckCircle, WarningCircle, Tray, Package, ArrowSquareOut, Stack, CaretDown } from '@phosphor-icons/react';
import './admin-premium.css';

/* ---------------- 히어로 ---------------- */
export function AdminHero({ eyebrow, icon, title, description, actions, children, accentRgb }: {
  eyebrow: string;
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** 보통 KPI 카드 묶음 (<div className="ap-kpis">…</div>) */
  children?: ReactNode;
  /** 오른쪽 아래 은은한 빛 색 ("r, g, b") */
  accentRgb?: string;
}) {
  return (
    <section className="ap-hero" style={accentRgb ? ({ ['--ap-accent-rgb' as string]: accentRgb } as CSSProperties) : undefined}>
      <div className="ap-hero-glow" aria-hidden="true" />
      <div className="ap-hero-head">
        <div>
          <span className="ap-eyebrow">{icon}{eyebrow}</span>
          <h1 className="ap-hero-title">{title}</h1>
          {description && <p className="ap-hero-sub">{description}</p>}
        </div>
        {actions && <div className="ap-hero-actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function HeroButton({ primary, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button type="button" {...props} className={`ap-hero-btn ${primary ? 'is-primary' : ''} ${props.className || ''}`}>
      {children}
    </button>
  );
}

/* ---------------- KPI ---------------- */
export function KpiCard({ icon, label, value, foot, loading, toneRgb, active, onClick }: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  foot?: ReactNode;
  loading?: boolean;
  /** 아이콘 색 ("r, g, b") */
  toneRgb?: string;
  /** 필터로 쓰는 카드일 때 */
  active?: boolean;
  onClick?: () => void;
}) {
  const style = toneRgb ? ({ ['--k-rgb' as string]: toneRgb } as CSSProperties) : undefined;
  const body = (
    <>
      <span className="ap-kpi-top">
        <span className="ap-kpi-icon" aria-hidden="true">{icon}</span>
        <span className="ap-kpi-label">{label}</span>
      </span>
      <strong className="ap-kpi-value" translate="no">{loading ? <span className="ap-skel is-dark" /> : value}</strong>
      <span className="ap-kpi-foot">{loading || !foot ? ' ' : foot}</span>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={`ap-kpi is-clickable ${active ? 'is-active' : ''}`} style={style} onClick={onClick} aria-pressed={active}>
        {body}
      </button>
    );
  }
  return <div className="ap-kpi" style={style}>{body}</div>;
}

/* ---------------- 검색 ---------------- */
export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <span className="ap-field">
      <span className="ap-field-icon"><MagnifyingGlass size={15} weight="bold" /></span>
      <input type="text" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      {value && (
        <button type="button" className="ap-field-clear" onClick={() => onChange('')} aria-label="검색어 지우기">
          <X size={11} weight="bold" />
        </button>
      )}
    </span>
  );
}

/* ---------------- 세그먼트 필터 ---------------- */
export type SegOption<V extends string> = { value: V; label: string; count?: number; dotRgb?: string };
export function SegFilter<V extends string>({ options, value, onChange, ariaLabel }: {
  options: SegOption<V>[];
  value: V;
  onChange: (v: V) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="ap-seg" role="group" aria-label={ariaLabel}>
      {options.map(o => (
        <button key={o.value} type="button"
          className={`ap-seg-btn ${value === o.value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}>
          {o.dotRgb && <i className="ap-dot" style={{ ['--d-rgb' as string]: o.dotRgb } as CSSProperties} />}
          {o.label}
          {o.count !== undefined && <em>{o.count.toLocaleString()}</em>}
        </button>
      ))}
    </div>
  );
}

/* ---------------- 뱃지 ---------------- */
export function Badge({ rgb, dot, children }: { rgb: string; dot?: boolean; children: ReactNode }) {
  return (
    <span className="ap-badge" style={{ ['--b-rgb' as string]: rgb } as CSSProperties}>
      {dot && <i className="ap-dot" />}
      {children}
    </span>
  );
}

/* ---------------- 표 빈 상태 / 로딩 ---------------- */
export function EmptyRow({ colSpan, title, description, action, icon }: {
  colSpan: number; title: string; description?: string; action?: ReactNode; icon?: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <div className="ap-empty">
          <span className="ap-empty-icon">{icon ?? <Tray size={24} weight="duotone" />}</span>
          <strong>{title}</strong>
          {description && <span>{description}</span>}
          {action}
        </div>
      </td>
    </tr>
  );
}

export function SkeletonRows({ columns, rows = 6, pinnedKey }: { columns: readonly string[]; rows?: number; pinnedKey?: string }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="admin-table-body-row">
          {columns.map((c, j) => (
            <td key={c} className={`ap-td ${c === pinnedKey ? 'aft-pinned' : ''}`}>
              <span className="ap-skel" style={{ width: j % 3 === 0 ? '75%' : '55%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ---------------- 토스트 ---------------- */
export type ToastItem = { id: number; type: 'success' | 'error'; message: string };
export type PushToast = (type: ToastItem['type'], message: string) => void;

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const pushToast = useCallback<PushToast>((type, message) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
  }, []);
  return { toasts, pushToast };
}

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="ap-toasts" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`ap-toast is-${t.type}`}>
          {t.type === 'success' ? <CheckCircle size={17} weight="fill" /> : <WarningCircle size={17} weight="fill" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ---------------- 작은 포맷 도우미 ---------------- */
export const fmtDate = (d: string | Date) => {
  const x = new Date(d);
  return `${x.getFullYear()}.${String(x.getMonth() + 1).padStart(2, '0')}.${String(x.getDate()).padStart(2, '0')}`;
};
export const fmtDateTime = (d: string | Date) => {
  const x = new Date(d);
  return `${fmtDate(x)} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
};

/**
 * 긴 글자를 잘라 "..." 을 붙입니다.
 *
 * CSS 말줄임만으로는 부족한 자리에 씁니다. 합포장 펼침 목록처럼 이름 뒤에 URL 버튼이
 * 따라붙는 칸은, 이름이 길면 버튼이 오른쪽 끝으로 밀려 줄마다 위치가 달라집니다.
 * 글자 수를 먼저 제한해 두면 버튼 자리가 일정해집니다.
 * (일본 상품명은 수식어가 길게 붙어 50자를 넘는 경우가 흔합니다)
 */
export const truncate = (text: string, max = 50) =>
  text.length > max ? `${text.slice(0, max)}...` : text;

/** CSV 파일 내려받기 (엑셀에서 한글이 깨지지 않도록 BOM 포함) */
export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = [header.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\r\n');
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------- 합포장 대표 행 표시 (배지 · 펼치기 버튼) ---------------- */

/** 합포장 대표 행의 첫 칸에 넣는 배지 + 묶음번호. 주문 관리·배송 현황 공용. */
export function BundleBadge({ count, bundleId }: { count: number; bundleId?: string | null }) {
  return (
    <span className="abx-badge">
      <span className="abx-pill" title={`합포장 ${count}건${bundleId ? ` · 묶음번호 ${bundleId}` : ''}`}>
        <span className="abx-pill-icon"><Package size={12} weight="fill" /></span>
        <span className="abx-pill-id">{bundleId || '합포장'}</span>
        <b>{count}</b>
      </span>
    </span>
  );
}

/** "모든 상품 보기 / 접기" 버튼. 주문 관리·배송 현황 공용. */
export function BundleToggle({ open, count, onClick, className = '' }: {
  open: boolean; count: number; onClick: () => void; className?: string;
}) {
  return (
    <button type="button" onClick={onClick} aria-expanded={open}
      className={`abx-toggle ${open ? 'is-open' : ''} ${className}`}>
      <Stack size={12} weight="bold" />
      {open ? '접기' : <>전체 <b>{count}</b>건</>}
      <CaretDown size={11} weight="bold" className="abx-caret" />
    </button>
  );
}

/* ---------------- 합포장 하위 상품 패널 ---------------- */

/** <BundleItemsPanel> 에 넘기는 한 줄. 날짜·가격은 화면에 찍을 문자열 그대로 받습니다. */
export type BundleItem = {
  /** 주문번호 */
  id: string;
  /** 주문일시 (예: "2026.09.11 11:50") */
  dateText: string;
  name: string;
  /** 가격 (예: "¥9,100") */
  priceText: string;
  imageUrl?: string | null;
  productUrl?: string | null;
};

/**
 * 합포장으로 묶인 주문들을 펼쳐 보여주는 패널.
 *
 * 주문 관리와 배송 현황이 같은 모양을 쓰도록 여기 한 곳에 둡니다.
 * 예전에는 두 화면이 각자 마크업과 CSS 를 들고 있어서, 한쪽에 열을 더하면
 * 다른 쪽이 그대로 남아 모양이 갈라졌습니다.
 *
 * 바깥의 <tr><td colSpan> 은 표마다 열 수가 달라 각 화면이 감쌉니다.
 * highlightIds 에 든 주문은 강조합니다. (검색으로 찾던 건이 어느 것인지 보이게)
 */
export function BundleItemsPanel({ items, highlightIds }: {
  items: BundleItem[];
  highlightIds?: Set<string>;
}) {
  // 가격 문자열("¥9,100")에서 숫자만 뽑아 합계를 냅니다. 하나라도 못 읽으면 합계는 숨깁니다.
  const prices = items.map(i => Number(String(i.priceText).replace(/[^\d.]/g, '')));
  const canSum = items.length > 0 && prices.every(n => Number.isFinite(n) && String(items[0].priceText).includes('¥'));
  const total = canSum ? prices.reduce((a, b) => a + b, 0) : null;

  return (
    <div className="abp-panel">
      <div className="abp-top">
        <span className="abp-top-icon"><Package size={15} weight="duotone" /></span>
        <span className="abp-top-title">
          <strong>합포장 상품</strong>
          <em>{items.length.toLocaleString()}건</em>
        </span>
        {total !== null && (
          <span className="abp-top-sum">
            <small>상품 합계</small>
            <b>¥{total.toLocaleString()}</b>
          </span>
        )}
      </div>

      <div className="abp-head">
        <span className="abp-no">No.</span>
        <span className="abp-date">주문일시</span>
        <span className="abp-id">주문번호</span>
        <span className="abp-name">상품</span>
        <span className="abp-price">가격</span>
      </div>

      {items.map((item, idx) => {
        // "2026.09.10 18:25" / "2026. 09. 11. 오전 11:50" 둘 다 날짜 · 시간으로 나눕니다.
        const m = String(item.dateText).match(/^(.*?)\s+((?:오전|오후)?\s*\d{1,2}:\d{2}.*)$/);
        const d = m ? m[1] : String(item.dateText);
        const t = m ? m[2] : '';
        return (
          <div key={item.id} className={`abp-row ${highlightIds?.has(item.id) ? 'is-match' : ''}`}>
            <span className="abp-no"><span className="abp-no-badge">{String(idx + 1).padStart(2, '0')}</span></span>
            <span className="abp-date">
              <span className="abp-date-d">{d}</span>
              {t && <span className="abp-date-t">{t}</span>}
            </span>
            <span className="abp-id"><span className="abp-id-chip">{item.id}</span></span>
            <span className="abp-name">
              <span className="abp-thumb">
                {item.imageUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={item.imageUrl} alt="" referrerPolicy="no-referrer" />
                  : <Package size={16} weight="duotone" />}
              </span>
              {/* 이름이 길면 URL 버튼이 줄마다 다른 자리로 밀려서 잘라 둡니다. (전체 이름은 title 에) */}
              <span className="abp-name-text" title={item.name}>{truncate(item.name)}</span>
              {item.productUrl && (
                <a href={item.productUrl} target="_blank" rel="noopener noreferrer" className="abp-url" title="상품 원본 페이지 열기">
                  원본 <ArrowSquareOut size={11} weight="bold" />
                </a>
              )}
            </span>
            <span className="abp-price">{item.priceText}</span>
          </div>
        );
      })}
    </div>
  );
}
