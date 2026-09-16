"use client";

import React, { useEffect, useState } from 'react';
import { CalendarBlank, ListBullets, CaretDown, ArrowUp, Printer } from '@phosphor-icons/react';

// 🌟 이용약관/개인정보처리방침 공용: 시행일자·조항 수 요약 + 목차 + 맨 위로 버튼.
// 목차는 본문(.guide-section-title)을 읽어 만들고, 각 조항 블록에 id를 붙여 이동합니다.
interface Props {
  docId: string;
  effectiveDate: string;
  /** 제목에 "제 N 조"가 없는 문서는 01, 02… 번호를 붙입니다 */
  numbered?: boolean;
  /** 시행일자·조항 수·인쇄 패널을 상단 검은색 카드에 넣은 페이지에서는 여기서 그리지 않습니다 (목차만 표시) */
  hideMeta?: boolean;
}

interface TocItem { id: string; no: string; label: string }

export function GuideDocHeader({ docId, effectiveDate, numbered, hideMeta }: Props) {
  const [items, setItems] = useState<TocItem[]>([]);

  useEffect(() => {
    const root = document.getElementById(docId);
    if (!root) return;
    const blocks = Array.from(root.querySelectorAll<HTMLElement>('.guide-section-block'));
    const next: TocItem[] = [];
    let count = 0;
    blocks.forEach((block) => {
      const title = block.querySelector<HTMLElement>('.guide-section-title');
      if (!title) return;
      count += 1;
      const id = `${docId}-sec-${count}`;
      block.id = id;
      const badge = title.querySelector('.gp-article-no');
      const no = badge ? (badge.textContent || '').replace(/\s/g, '').replace(/^제/, '').replace(/조$/, '') : String(count).padStart(2, '0');
      const label = (title.textContent || '').replace(badge?.textContent || '', '').trim().replace(/^\(|\)$/g, '');
      next.push({ id, no, label });
    });
    setItems(next);
  }, [docId]);

  const handleJump = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      {!hideMeta && (
        <div className="gp-doc-meta">
          <span className="gp-doc-meta-item"><CalendarBlank size={16} weight="bold" />시행일자 <strong>{effectiveDate}</strong></span>
          {items.length > 0 && (
            <span className="gp-doc-meta-item"><ListBullets size={16} weight="bold" />{numbered ? '항목' : '조항'} <strong>{items.length}개</strong></span>
          )}
          <button type="button" className="gp-btn is-ghost" onClick={() => window.print()}>
            <Printer size={15} weight="bold" />인쇄하기
          </button>
        </div>
      )}
      {items.length > 0 && (
        <details className="gp-toc">
          <summary>
            <ListBullets size={17} weight="bold" color="#b04a12" />
            목차
            <span className="gp-toc-count">{items.length}개 항목 · 눌러서 바로 이동</span>
            <CaretDown size={16} weight="bold" />
          </summary>
          <ol className="gp-toc-list">
            {items.map(item => (
              <li key={item.id}>
                <a href={`#${item.id}`} onClick={(e) => handleJump(e, item.id)}>
                  <span>{item.no}</span>
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </details>
      )}
    </>
  );
}

export function GuideBackToTop() {
  return (
    <button type="button" className="gp-back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      <ArrowUp size={14} weight="bold" />맨 위로
    </button>
  );
}
