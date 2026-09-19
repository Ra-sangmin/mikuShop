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
import { MagnifyingGlass, X, CheckCircle, WarningCircle, Tray, Package, ArrowSquareOut, Stack, CaretDown, Camera, ShieldCheck, Sparkle, Tag, ChatText, Copy, Eye, EyeSlash } from '@phosphor-icons/react';
import './admin-premium.css';
// 🌟 받는사람 표기는 마이페이지의 일본 배송지 카드와 같은 함수를 씁니다.
import { japanRecipientName } from '@/lib/japanAddress';

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

/* ---------------- 상품 정보 칸 (주문 관리 · 배송 현황 공용 모양) ---------------- */

/** 부가 서비스 ("사진 검수, 포장 보완") → 목록 */
export const parseServices = (v?: string | null) =>
  Array.from(new Set(String(v || '').split(',').map(x => x.trim()).filter(x => x && x !== '-')));

const SERVICE_ICON: Record<string, { icon: ReactNode; cls: string }> = {
  '사진 검수': { icon: <Camera size={12} weight="fill" />, cls: 'is-photo' },
  '포장 보완': { icon: <ShieldCheck size={12} weight="fill" />, cls: 'is-pack' },
};

/**
 * 썸네일 + 한 줄 상품명 + [원본 | 전체 N건] + 서비스 · 옵션 · 요청 아이콘.
 * 합포장이면 '원본' 자리에 '전체 N건' 버튼이 옵니다. 자세한 내용은 마우스를 올리면 보입니다.
 */
export function ProductCell({ name, imageUrl, productUrl, serviceRequest, option, request, bundle }: {
  name: string;
  imageUrl?: string | null;
  productUrl?: string | null;
  serviceRequest?: string | null;
  option?: string | null;
  request?: string | null;
  bundle?: { open: boolean; count: number; onToggle: () => void };
}) {
  const has = (v?: string | null) => !!v && v !== '-';
  return (
    <span className="apc">
      <span className="apc-thumb">
        <Package size={18} weight="duotone" />
        {imageUrl && (
          // 이미지가 깨지면 숨겨서 뒤의 상자 아이콘이 보이게 합니다.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" referrerPolicy="no-referrer" loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        )}
      </span>
      <span className="apc-body">
        <span className="apc-name" title={name}>{name}</span>
        <span className="apc-meta">
          {bundle ? (
            <BundleToggle open={bundle.open} count={bundle.count} onClick={bundle.onToggle} />
          ) : has(productUrl) && (
            <a href={productUrl!} target="_blank" rel="noopener noreferrer" className="apc-url" title="상품 원본 페이지 열기">
              원본 <ArrowSquareOut size={10} weight="bold" />
            </a>
          )}
          {parseServices(serviceRequest).map(sv => (
            <span key={sv} className={`apc-ic ${SERVICE_ICON[sv]?.cls || 'is-etc'}`} title={sv} aria-label={sv}>
              {SERVICE_ICON[sv]?.icon || <Sparkle size={12} weight="fill" />}
            </span>
          ))}
          {has(option) && (
            <span className="apc-ic is-opt" title={`옵션: ${option}`} aria-label="옵션 있음"><Tag size={12} weight="fill" /></span>
          )}
          {has(request) && (
            <span className="apc-ic is-req" title={`요청: ${request}`} aria-label="요청사항 있음"><ChatText size={12} weight="fill" /></span>
          )}
        </span>
      </span>
    </span>
  );
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

/* ---------------- 회원 기본 정보 ---------------- */

/** <UserBasicInfo> 가 읽는 회원 정보. /api/admin/users 응답 일부입니다. */
export type BasicInfoUser = {
  email?: string | null;
  phone?: string | null;
  nameEnglish?: string | null;
  japanMailboxNumber?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  /** 기본 배송지가 맨 앞으로 정렬돼 옵니다. 개인통관부호는 여기 딸린 값입니다. */
  addresses?: { personalCustomsCode?: string | null }[];
};

/** SNS 회원의 임시 이메일(kakao_xxx@mikuchan.local)은 표시하지 않습니다. */
const realEmail = (email?: string | null) => (email && !email.endsWith('.local') ? email : null);

/** 개인통관부호는 가운데를 가립니다. (P123456789012 → P1234••••••012) */
const maskCustoms = (code?: string | null) =>
  !code ? null : code.length <= 8 ? code : `${code.slice(0, 5)}${'•'.repeat(code.length - 8)}${code.slice(-3)}`;

/**
 * 회원 기본 정보 패널.
 *
 * 회원 관리의 상세 서랍과 주문 관리의 주문자 팝업이 같은 내용을 보여주도록 여기 한 곳에 둡니다.
 * 따로 두면 한쪽에 항목을 더할 때 다른 쪽이 빠져, 보는 화면에 따라 정보가 달라집니다.
 */
export function UserBasicInfo({ user, onCopy }: {
  user: BasicInfoUser;
  /** 복사했을 때 알릴 방법. 화면마다 토스트가 달라서 밖에서 받습니다. */
  onCopy?: (text: string, label: string) => void;
}) {
  const [showCustoms, setShowCustoms] = useState(false);
  // 개인통관부호는 users 가 아니라 배송지에 딸린 값입니다. 첫 번째가 기본 배송지입니다.
  const customsCode = user.addresses?.[0]?.personalCustomsCode || null;

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).then(() => onCopy?.(text, label)).catch(() => {});
  };

  // 값이 있으면 누를 수 있는 텍스트, 없으면 흐린 안내. (렌더 중에 컴포넌트를 만들면
  // 리렌더마다 새 컴포넌트가 되어 입력 상태가 날아가므로 함수로만 둡니다)
  const copyable = (value: string | null | undefined, label: string, emptyText = '미등록') =>
    value
      ? <button type="button" className="aui-copyable" onClick={() => copy(value, label)}>{value}<Copy size={11} weight="bold" /></button>
      : <span className="is-empty">{emptyText}</span>;

  return (
    <dl className="aui-info">
      <dt>이메일</dt>
      <dd>{copyable(realEmail(user.email), '이메일')}</dd>

      <dt>휴대폰</dt>
      <dd>{copyable(user.phone, '휴대폰 번호')}</dd>

      <dt>개인통관부호</dt>
      <dd>
        {customsCode ? (
          <span className="aui-secret">
            {/* 다른 항목과 같이 값을 눌러 복사합니다.
                가려져 있어도 복사는 원래 값으로 합니다 — 통관 서류에 붙여넣을 값이라
                가린 문자(•)가 섞이면 쓸 수 없습니다. */}
            <button type="button" className="aui-copyable" onClick={() => copy(customsCode, '개인통관부호')}>
              <code>{showCustoms ? customsCode : maskCustoms(customsCode)}</code>
              <Copy size={11} weight="bold" />
            </button>
            <button type="button" className="aui-eye" onClick={() => setShowCustoms(v => !v)} aria-label={showCustoms ? '가리기' : '보기'}>
              {showCustoms ? <EyeSlash size={13} weight="bold" /> : <Eye size={13} weight="bold" />}
            </button>
          </span>
        ) : <span className="is-empty">미등록</span>}
      </dd>

      {/* 📮 회원이 일본 쇼핑몰 주소칸에 그대로 넣는 값입니다. (예: RA SANGMIN MK-NXJV9)
          사서함 번호와 영문 이름을 따로 두지 않는 이유는, 둘 다 이 값에 들어 있어
          같은 정보가 세 줄로 나뉘었기 때문입니다.
          마이페이지의 일본 배송지 카드와 같은 함수로 만들어 문구가 어긋나지 않게 합니다. */}
      <dt>이름 + 식별 번호</dt>
      <dd>{copyable(
        japanRecipientName(user.nameEnglish, user.japanMailboxNumber) || null,
        '이름 + 식별 번호',
        '사서함 번호 미발급',
      )}</dd>

      <dt>가입일시</dt>
      <dd>{fmtDateTime(user.createdAt)}</dd>

      <dt>최근 수정</dt>
      <dd>{fmtDateTime(user.updatedAt)}</dd>
    </dl>
  );
}

/* ---------------- 회원 등급 색 ---------------- */

/**
 * 등급 이름 → 색. 등급이 추가돼도 기본색으로 안전하게 표시됩니다.
 * 회원 관리와 주문 관리가 같은 색을 쓰도록 여기 한 곳에 둡니다.
 */
export const GRADE_TONE: { match: RegExp; text: string; rgb: string; from: string; to: string }[] = [
  { match: /diamond|다이아/i, text: '#0e7490', rgb: '6, 182, 212', from: '#67e8f9', to: '#0891b2' },
  { match: /platinum|플래티/i, text: '#4338ca', rgb: '79, 70, 229', from: '#a5b4fc', to: '#4f46e5' },
  { match: /gold|골드/i, text: '#b45309', rgb: '245, 158, 11', from: '#fcd34d', to: '#d97706' },
  { match: /silver|실버/i, text: '#475569', rgb: '100, 116, 139', from: '#cbd5e1', to: '#64748b' },
  { match: /bronze|브론즈/i, text: '#c2410c', rgb: '234, 88, 12', from: '#fdba74', to: '#ea580c' },
];
export const DEFAULT_GRADE_TONE = { text: '#1d4ed8', rgb: '59, 130, 246', from: '#93c5fd', to: '#2563eb' };
export type GradeToneValue = typeof DEFAULT_GRADE_TONE;

export const gradeTone = (name?: string): GradeToneValue =>
  GRADE_TONE.find(tone => name && tone.match.test(name)) || DEFAULT_GRADE_TONE;

export const toneVars = (tone: GradeToneValue) => ({
  ['--g-text' as string]: tone.text, ['--g-rgb' as string]: tone.rgb,
  ['--g-from' as string]: tone.from, ['--g-to' as string]: tone.to,
} as CSSProperties);

/* ---------------- 회원 요약 (주문 · 머니 · 등급) ---------------- */

export type SummaryUser = {
  cyberMoney?: number | null;
  grade?: { name?: string } | null;
  _count?: { orders?: number } | null;
};

/**
 * 회원 한 줄 요약. 주문 건수 · 미쿠짱머니 잔액 · 회원 등급을 보여줍니다.
 * 주문을 보다가 "이 사람 등급이 뭐고 잔액이 얼마인지"를 바로 확인하려고 만들었습니다.
 */
export function UserSummaryStats({ user }: { user: SummaryUser }) {
  const tone = gradeTone(user.grade?.name);
  return (
    <div className="aui-stats">
      <div>
        <span>주문</span>
        <strong>{(user._count?.orders || 0).toLocaleString()}<small>건</small></strong>
      </div>
      <div>
        <span>미쿠짱머니</span>
        <strong translate="no">₩{(user.cyberMoney || 0).toLocaleString()}</strong>
      </div>
      <div>
        <span>회원 등급</span>
        <strong><span className="aui-grade" style={toneVars(tone)}>{user.grade?.name || '등급 없음'}</span></strong>
      </div>
    </div>
  );
}
