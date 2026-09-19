"use client";

import { useEffect, useRef, useState } from 'react';

/**
 * admin/orders 와 동일한 방식의 "열 너비 드래그 조절" 훅.
 *
 * - 헤더 좌/우 끝의 얇은 손잡이를 잡고 좌우로 끌면 열 너비가 바뀝니다.
 * - 왼쪽 손잡이는 "바로 앞 열"의 너비를 조절합니다. (orders 와 동일한 규칙)
 * - 조절한 너비는 localStorage 에 저장되어 다음 방문에도 유지됩니다.
 *
 * - (선택) mode: 'cascade' — 경계선을 끌면 표 전체 너비를 유지한 채 이웃 열부터 차례로 줄입니다.
 *   · 오른쪽으로 끌면: 바로 오른쪽 열 → 그다음 열 … 순서로 최소 너비까지 줄이고,
 *     그래도 모자라면 getTrailingRoom() 이 알려준 표 끝의 여유 폭(예: 관리 열)을 씁니다.
 *   · 왼쪽으로 끌면: 끄는 열 → 그 왼쪽 열 … 순서로 최소 너비까지 줄이고, 비는 폭은 바로 오른쪽 열이 가져갑니다.
 *   · 모두 최소 너비가 되면 더 이상 움직이지 않습니다.
 *
 * ⚠️ table-layout: fixed 는 표에 확정된 너비가 있어야 동작하므로,
 *    반환값 totalTableWidth 를 <table style={{ width: totalTableWidth }}> 로 꼭 넣어주세요.
 */
export function useResizableColumns<T extends Record<string, number>>(options: {
  storageKey: string;
  defaultWidths: T;
  /** 화면에 실제로 보이는 열 순서. 생략하면 defaultWidths 의 키 순서를 사용합니다. */
  visibleColumns?: readonly string[];
  /** 열이 이보다 좁아지지 않도록 하는 최소 너비(px). */
  minWidth?: number;
  /** (선택) 열마다 다른 최소 너비(px). 생략하면 minWidth 를 씁니다. */
  getMinWidth?: (key: string) => number;
  /** 'single'(기본): 끄는 열만 늘고 줄어듭니다. 'cascade': 위 설명 참고. */
  mode?: 'single' | 'cascade';
  /** cascade 모드: 마지막 열 뒤에 남아 있는, 열들이 더 가져다 쓸 수 있는 폭(px). 생략하면 0. */
  getTrailingRoom?: (widths: Record<string, number>) => number;
}) {
  const { storageKey, defaultWidths, minWidth = 50, mode = 'single' } = options;
  const visibleColumns: readonly string[] = options.visibleColumns ?? Object.keys(defaultWidths);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(defaultWidths);
  const resizingRef = useRef<{
    key: string; startX: number; startWidth: number;
    /** cascade 모드: 드래그 시작 시점의 전체 너비와 표 끝 여유 폭 */
    startWidths?: Record<string, number>; trailingRoom?: number;
  } | null>(null);
  const getMinWidthRef = useRef(options.getMinWidth);
  getMinWidthRef.current = options.getMinWidth;
  const minOf = (key: string) =>
    getMinWidthRef.current ? Math.max(minWidth, getMinWidthRef.current(key)) : minWidth;

  // 최신 값을 이벤트 핸들러에서 참조하기 위한 보관용 ref
  const visibleColumnsRef = useRef(visibleColumns);
  visibleColumnsRef.current = visibleColumns;
  const widthsRef = useRef(columnWidths);
  widthsRef.current = columnWidths;

  useEffect(() => {
    // orders 와 동일하게 전역 스위치를 존중합니다.
    if (localStorage.getItem('admin_persist_column_widths') === 'false') return;

    const saved = localStorage.getItem(storageKey);
    if (!saved) return;

    try {
      // 저장본으로 통째로 교체하면 나중에 추가된 열이 undefined → NaN 이 되므로
      // 기본값 위에 덮어쓰고, 숫자가 아닌 값은 버립니다.
      const parsed = JSON.parse(saved) as Record<string, unknown>;
      const sanitized: Record<string, number> = {};
      for (const [key, value] of Object.entries(parsed)) {
        const n = Number(value);
        if (Number.isFinite(n) && n > 0) sanitized[key] = n;
      }
      setColumnWidths({ ...defaultWidths, ...sanitized });
    } catch (e) {
      console.error(`[${storageKey}] 저장된 열 너비를 읽지 못했습니다.`, e);
    }
    // storageKey 별로 한 번만 불러옵니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const saveColumnWidths = (widths: Record<string, number>) => {
    if (localStorage.getItem('admin_persist_column_widths') === 'false') return;
    localStorage.setItem(storageKey, JSON.stringify(widths));
  };

  // 표 전체 너비 = 현재 보이는 열들의 너비 합
  const totalTableWidth = visibleColumns.reduce(
    (sum, key) => sum + (Number(columnWidths[key]) || 0),
    0
  );

  const onMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { key, startX, startWidth, startWidths, trailingRoom = 0 } = resizingRef.current;
    const deltaX = e.pageX - startX;

    if (startWidths) {
      setColumnWidths(prev => ({ ...prev, ...cascadeResize(key, deltaX, startWidths, trailingRoom) }));
      return;
    }
    // 이미 최소보다 좁은 상태(저장된 너비 등)라면 더 줄이지만 않도록 시작 너비까지는 허용합니다.
    const colMin = minOf(key);
    setColumnWidths(prev => ({ ...prev, [key]: Math.max(Math.min(colMin, startWidth), startWidth + deltaX) }));
  };

  /** 경계선(key 열의 오른쪽 선)을 deltaX 만큼 옮겼을 때의 새 너비들 */
  const cascadeResize = (key: string, deltaX: number, start: Record<string, number>, trailingRoom: number) => {
    const cols = visibleColumnsRef.current;
    const b = cols.indexOf(key);
    const next: Record<string, number> = {};
    for (const c of cols) next[c] = Number(start[c]) || 0;
    const room = (c: string) => Math.max(0, next[c] - minOf(c));

    if (deltaX > 0) {
      // 오른쪽으로: 오른쪽 열부터 차례로 줄이고, 마지막엔 표 끝 여유 폭을 씁니다.
      let need = deltaX;
      let gained = 0;
      for (let j = b + 1; j < cols.length && need > 0; j++) {
        const take = Math.min(room(cols[j]), need);
        next[cols[j]] -= take; need -= take; gained += take;
      }
      const tail = Math.min(Math.max(0, trailingRoom), need);
      gained += tail;
      next[key] += gained;
    } else if (deltaX < 0) {
      // 왼쪽으로: 끄는 열부터 왼쪽으로 차례로 줄이고, 비는 폭은 바로 오른쪽 열이 가져갑니다.
      // (오른쪽 열이 없으면 표가 줄어들고 그만큼 표 끝 여유 폭이 늘어납니다)
      let need = -deltaX;
      let freed = 0;
      for (let j = b; j >= 0 && need > 0; j--) {
        const take = Math.min(room(cols[j]), need);
        next[cols[j]] -= take; need -= take; freed += take;
      }
      if (b + 1 < cols.length) next[cols[b + 1]] += freed;
    }
    return next;
  };

  const onMouseUp = () => {
    if (resizingRef.current) {
      saveColumnWidths(widthsRef.current);
    }
    resizingRef.current = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  };

  const onMouseDown = (key: string, side: 'left' | 'right', e: React.MouseEvent) => {
    let targetKey = key;
    if (side === 'left') {
      const cols = visibleColumnsRef.current;
      const colIndex = cols.indexOf(key);
      if (colIndex > 0) targetKey = cols[colIndex - 1];
      else return; // 첫 열의 왼쪽은 조절 대상이 없습니다.
    }
    const startWidth = Number(widthsRef.current[targetKey]);
    if (!Number.isFinite(startWidth)) return;

    if (mode === 'cascade') {
      const startWidths = { ...widthsRef.current };
      const trailingRoom = options.getTrailingRoom ? options.getTrailingRoom(startWidths) : 0;
      resizingRef.current = { key: targetKey, startX: e.pageX, startWidth, startWidths, trailingRoom };
    } else {
      resizingRef.current = { key: targetKey, startX: e.pageX, startWidth };
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // 드래그 도중 페이지를 떠나도 전역 리스너가 남지 않도록 정리합니다.
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 화면 폭에 맞추는 등 코드에서 너비를 직접 바꿀 때 사용합니다. (저장은 하지 않습니다) */
  return { columnWidths, totalTableWidth, onMouseDown, setColumnWidths };
}

export type ResizableColumn = {
  key: string;
  label: React.ReactNode;
  align?: 'left' | 'right' | 'center';
};

/**
 * <colgroup> 과 <thead> 를 열 설정 배열로 한 번에 그려줍니다.
 * 표가 여러 개인 화면에서 헤더 마크업이 길어지는 것을 막기 위한 헬퍼입니다.
 *
 * <table className="admin-table-resizable" style={{ width: totalTableWidth }}>
 *   <ResizableTableHead columns={...} columnWidths={...} onMouseDown={...} />
 *   <tbody>...</tbody>
 * </table>
 */
export function ResizableTableHead({
  columns,
  columnWidths,
  onMouseDown,
}: {
  columns: readonly ResizableColumn[];
  columnWidths: Record<string, number>;
  onMouseDown: (key: string, side: 'left' | 'right', e: React.MouseEvent) => void;
}) {
  return (
    <>
      <colgroup>
        {columns.map(col => <col key={col.key} style={{ width: columnWidths[col.key] }} />)}
      </colgroup>
      <thead>
        <tr className="admin-table-head-row">
          {columns.map(col => (
            <th
              key={col.key}
              className="admin-th-resizable"
              style={col.align && col.align !== 'left' ? { textAlign: col.align } : undefined}
            >
              <ResizeHandles columnKey={col.key} onMouseDown={onMouseDown} />
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
    </>
  );
}

/** 헤더 셀 좌/우에 붙는 드래그 손잡이. orders 의 인라인 마크업과 동일한 모양입니다. */
export function ResizeHandles({
  columnKey,
  onMouseDown,
  accent = '#3b82f6',
}: {
  columnKey: string;
  onMouseDown: (key: string, side: 'left' | 'right', e: React.MouseEvent) => void;
  accent?: string;
}) {
  return (
    <>
      <div
        className="admin-resize-handle-left"
        onMouseDown={(e) => onMouseDown(columnKey, 'left', e)}
        onMouseOver={(e) => { e.currentTarget.style.borderLeft = `3px solid ${accent}`; }}
        onMouseOut={(e) => { e.currentTarget.style.borderLeft = 'none'; }}
      />
      <div
        className="admin-resize-handle-right"
        onMouseDown={(e) => onMouseDown(columnKey, 'right', e)}
        onMouseOver={(e) => { e.currentTarget.style.borderRight = `3px solid ${accent}`; }}
        onMouseOut={(e) => { e.currentTarget.style.borderRight = 'none'; }}
      />
    </>
  );
}
