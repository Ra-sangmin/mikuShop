"use client";

/**
 * 🧩 관리자 표 공통 — "가로 꽉 채움 + 연쇄 열 조절 + 오른쪽 고정 열"
 *
 * admin/users 에서 만든 표 동작을 다른 admin 화면에서도 그대로 쓸 수 있도록 모아둔 파일입니다.
 *
 * ✅ 동작
 *  1. 열 최소 폭 = 헤더 제목 글자 폭 + 헤더 칸 좌우 여백 (제목이 잘리지 않는 만큼만 줄어듭니다)
 *  2. 경계선을 오른쪽으로 끌면 → 오른쪽 열부터 차례로 최소 폭까지 줄이고, 마지막으로 고정 열을 줄입니다.
 *     경계선을 왼쪽으로 끌면  → 끄는 열부터 왼쪽으로 차례로 최소 폭까지 줄이고, 비는 폭은 바로 오른쪽 열이 가져갑니다.
 *     모두 최소 폭이 되면 더 이상 움직이지 않습니다.
 *  3. (선택) 고정 열(pinned) — 보통 '관리' 열
 *     · 항상 표 맨 오른쪽에 붙어 있고, 나머지 열이 쓰고 남은 가로 폭을 모두 차지합니다.
 *     · 고정 열의 왼쪽 선을 끌면 바로 앞 열과 폭을 주고받습니다.
 *     · 창이 좁아져 가로 스크롤이 생기면 오른쪽에 고정(sticky)됩니다.
 *  4. 조절한 너비는 localStorage 에 저장됩니다. (전역 스위치 admin_persist_column_widths 를 따릅니다)
 *
 * ✅ 사용법
 *  const table = useFitTable({
 *    storageKey: 'admin_xxx_column_widths',
 *    columns: ['date', 'name', 'status', 'manage'],          // 화면 순서 그대로 (고정 열 포함)
 *    defaultWidths: { date: 140, name: 200, status: 120, manage: 110 },
 *    pinned: { key: 'manage', minWidth: 100 },                // 고정 열이 없으면 생략
 *  });
 *
 *  <div className="usr-table-wrap" ref={table.wrapRef}>        // 가로 폭을 재는 스크롤 영역
 *    <table className={`admin-table-resizable ${table.tableClassName}`} style={table.tableStyle}>
 *      <FitColGroup table={table} />
 *      <thead><tr className="admin-table-head-row">
 *        <FitTh table={table} columnKey="date">날짜</FitTh>
 *        ...
 *        <FitTh table={table} columnKey="manage">관리</FitTh>
 *      </tr></thead>
 *      <tbody>
 *        <tr>... <td className={table.pinnedCellClass('manage')}>...</td></tr>
 *      </tbody>
 *    </table>
 *  </div>
 *
 *  고정 열 배경색은 CSS 변수로 화면마다 바꿀 수 있습니다. (admin-fit-table.css 참고)
 *    --aft-pinned-bg / --aft-pinned-head-bg / --aft-pinned-hover-bg / --aft-pinned-active-bg
 *  행에 'aft-row' 클래스를 주면 hover, 'is-open' 클래스를 주면 선택 배경이 고정 열에도 적용됩니다.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useResizableColumns, ResizeHandles } from './useResizableColumns';
import './admin-fit-table.css';

type Side = 'left' | 'right';

export type FitTableOptions<K extends string> = {
  /** localStorage 저장 키 (화면마다 다르게) */
  storageKey: string;
  /** 화면에 보이는 열 순서. 고정 열도 포함해서 적습니다. */
  columns: readonly K[];
  /** 열 기본 너비(px) */
  defaultWidths: Record<K, number>;
  /** 오른쪽 고정 열. 생략하면 고정 열 없이 모든 열이 연쇄 조절됩니다. */
  pinned?: { key: K; minWidth: number };
  /** 제목 폭을 잴 수 없을 때 쓰는 최소 너비(px). 기본 50 */
  fallbackMinWidth?: number;
};

export function useFitTable<K extends string>(options: FitTableOptions<K>) {
  const { storageKey, columns, defaultWidths, pinned, fallbackMinWidth = 50 } = options;
  const pinnedKey = pinned?.key;
  const pinnedMin = pinned?.minWidth ?? 0;

  /** 고정 열을 뺀, 드래그로 너비가 바뀌는 열들 */
  const resizableColumns = useMemo(
    () => columns.filter(c => c !== pinnedKey) as string[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns.join('|'), pinnedKey]
  );

  /* ---------- 표 영역 가로 폭 측정 ---------- */
  //    🐛 예전에는 처음 붙은 요소 하나만 재서, 탭 전환 등으로 스크롤 영역이 새로 그려지면
  //    떨어져 나간 옛 요소를 계속 보고 있었습니다. (고정 열이 오른쪽 끝에서 떨어져 보이던 원인)
  //    → 콜백 ref 로 요소가 바뀔 때마다 새로 재도록 합니다.
  const [wrapEl, setWrapEl] = useState<HTMLDivElement | null>(null);
  const wrapRef = useCallback((el: HTMLDivElement | null) => { setWrapEl(el); }, []);
  const wrapWidthRef = useRef(0);
  const [wrapWidth, setWrapWidth] = useState(0);
  wrapWidthRef.current = wrapWidth;

  useEffect(() => {
    const el = wrapEl;
    if (!el) return;
    const update = () => setWrapWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wrapEl]);

  /* ---------- 헤더 제목 폭 = 최소 폭 ---------- */
  const labelRefs = useRef<Record<string, HTMLElement | null>>({});
  const labelRef = (key: string) => (el: HTMLElement | null) => { labelRefs.current[key] = el; };

  const minWidthOf = (key: string) => {
    const label = labelRefs.current[key];
    const th = label?.closest('th');
    if (!label || !th) return fallbackMinWidth;
    const cs = getComputedStyle(th);
    const padding = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    // +4: 테두리·반올림 여유분
    return Math.ceil(label.getBoundingClientRect().width + padding + 4);
  };

  const { columnWidths, totalTableWidth, onMouseDown, setColumnWidths } = useResizableColumns({
    storageKey,
    defaultWidths: defaultWidths as Record<string, number>,
    visibleColumns: resizableColumns,
    mode: 'cascade',
    minWidth: 20,
    getMinWidth: minWidthOf,
    // 고정 열이 있으면 "고정 열이 최소 폭이 될 때까지" 남은 폭을 표 끝 여유로 씁니다.
    // 고정 열이 없으면 표 영역 오른쪽 끝까지의 빈 폭을 씁니다.
    getTrailingRoom: (widths) => {
      if (!wrapWidthRef.current) return 0;
      const total = resizableColumns.reduce((sum, c) => sum + (Number(widths[c]) || 0), 0);
      return wrapWidthRef.current - pinnedMin - total;
    },
  });

  /* ---------- 표 영역보다 넓으면 폭에 맞게 줄이기 ----------
     저장된 너비·기본 너비의 합이 표 영역보다 크거나 창이 좁아진 경우,
     각 열이 "최소 폭보다 남는 만큼"에 비례해 줄여서 가로 스크롤 없이 딱 맞춥니다.
     (모든 열이 최소 폭이어도 모자라면 그때만 가로 스크롤이 생깁니다) */
  useEffect(() => {
    if (!wrapWidth) return;
    const available = wrapWidth - pinnedMin;
    const excess = totalTableWidth - available;
    if (excess <= 0) return;

    const rooms = resizableColumns.map(c => Math.max(0, (Number(columnWidths[c]) || 0) - minWidthOf(c)));
    const totalRoom = rooms.reduce((a, b) => a + b, 0);
    if (totalRoom <= 0) return;

    const shrink = Math.min(excess, totalRoom);
    const next: Record<string, number> = { ...columnWidths };
    let used = 0;
    resizableColumns.forEach((c, i) => {
      // 마지막 열에서 반올림 오차를 정리합니다.
      const cut = i === resizableColumns.length - 1 ? shrink - used : Math.floor((shrink * rooms[i]) / totalRoom);
      const applied = Math.min(cut, rooms[i]);
      next[c] = (Number(columnWidths[c]) || 0) - applied;
      used += applied;
    });
    setColumnWidths(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrapWidth, totalTableWidth, resizableColumns]);

  /** 고정 열 실제 너비 = 남은 폭 전부 (최소 폭 보장) */
  const pinnedWidth = pinnedKey ? Math.max(pinnedMin, wrapWidth - totalTableWidth) : 0;
  const tableWidth = totalTableWidth + pinnedWidth;

  const widthOf = (key: string) => (key === pinnedKey ? pinnedWidth : Number(columnWidths[key]) || 0);

  /** 고정 열 바로 앞 열 (고정 열 왼쪽 선을 끌 때 폭을 주고받는 열) */
  const beforePinnedKey = pinnedKey ? resizableColumns[resizableColumns.length - 1] : undefined;

  const tableStyle: CSSProperties = { width: tableWidth };
  /** <table> 에 붙일 클래스 — 본문 칸 세로선 등 공통 스타일이 여기에 걸립니다. */
  const tableClassName = `aft-table${pinnedKey ? ' aft-has-pinned' : ''}`;

  /** 고정 열 칸에 붙일 클래스 (td/th 공용) */
  const pinnedCellClass = (key: string, extra = '') =>
    `${extra} ${key === pinnedKey ? 'aft-pinned' : ''}`.trim();

  return {
    wrapRef,
    tableStyle,
    tableClassName,
    tableWidth,
    columns,
    pinnedKey,
    beforePinnedKey,
    widthOf,
    labelRef,
    onMouseDown: onMouseDown as (key: string, side: Side, e: React.MouseEvent) => void,
    pinnedCellClass,
  };
}

export type FitTable = ReturnType<typeof useFitTable>;

/** <colgroup> — columns 순서대로 너비를 적용합니다. */
export function FitColGroup({ table }: { table: FitTable }) {
  return (
    <colgroup>
      {table.columns.map(key => <col key={key} style={{ width: table.widthOf(key) }} />)}
    </colgroup>
  );
}

/**
 * 헤더 칸 — 드래그 손잡이 + 제목(최소 폭 측정용)을 한 번에 그립니다.
 * - 일반 열: 좌/우 손잡이
 * - 고정 열: 왼쪽 손잡이만 (끌면 바로 앞 열과 폭을 주고받음)
 * - 고정 열 바로 앞 열: 오른쪽 세로선을 지워 고정 열의 선 하나만 보이게 합니다.
 */
export function FitTh({ table, columnKey, className = '', style, children }: {
  table: FitTable;
  columnKey: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const isPinned = columnKey === table.pinnedKey;
  const isBeforePinned = columnKey === table.beforePinnedKey;
  const classes = ['admin-th-resizable', isPinned ? 'aft-pinned' : '', isBeforePinned ? 'aft-no-divider' : '', className]
    .filter(Boolean).join(' ');

  return (
    <th className={classes} style={style}>
      {isPinned ? (
        table.beforePinnedKey && (
          <div
            className="admin-resize-handle-left"
            onMouseDown={(e) => table.onMouseDown(table.beforePinnedKey as string, 'right', e)}
            onMouseOver={(e) => { e.currentTarget.style.borderLeft = '3px solid #3b82f6'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderLeft = 'none'; }}
          />
        )
      ) : (
        <ResizeHandles columnKey={columnKey} onMouseDown={table.onMouseDown} />
      )}
      <span ref={table.labelRef(columnKey)} className="aft-label">{children}</span>
    </th>
  );
}
