"use client";

import { useEffect, useRef, useState } from 'react';

/**
 * admin/orders 와 동일한 방식의 "열 너비 드래그 조절" 훅.
 *
 * - 헤더 좌/우 끝의 얇은 손잡이를 잡고 좌우로 끌면 열 너비가 바뀝니다.
 * - 왼쪽 손잡이는 "바로 앞 열"의 너비를 조절합니다. (orders 와 동일한 규칙)
 * - 조절한 너비는 localStorage 에 저장되어 다음 방문에도 유지됩니다.
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
}) {
  const { storageKey, defaultWidths, minWidth = 50 } = options;
  const visibleColumns: readonly string[] = options.visibleColumns ?? Object.keys(defaultWidths);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(defaultWidths);
  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

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
    const { key, startX, startWidth } = resizingRef.current;
    const deltaX = e.pageX - startX;
    setColumnWidths(prev => ({ ...prev, [key]: Math.max(minWidth, startWidth + deltaX) }));
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

    resizingRef.current = { key: targetKey, startX: e.pageX, startWidth };
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

  return { columnWidths, totalTableWidth, onMouseDown };
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
