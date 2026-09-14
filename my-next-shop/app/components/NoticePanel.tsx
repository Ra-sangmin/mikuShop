"use client";

import React from 'react';

// 🌟 mypage, mypage/status, delivery/address 등에서 각자 거의 동일하게 들고 있던
// "삼각형 경고 아이콘 + 좌측 강조 보더" 주의 문구 패널을 공용 컴포넌트로 뽑았습니다.
// 문구(본문)는 children으로 받고, 강조는 children 안에서 <strong>을 그대로 쓰면 됩니다.
// title을 주면 필독사항 같은 제목+목록형 레이아웃(정렬: flex-start)으로,
// title이 없으면 한 줄 안내문 레이아웃(정렬: center)으로 자동 전환됩니다.
type NoticePanelTone = 'amber' | 'rose';

interface NoticePanelProps {
  tone?: NoticePanelTone;
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export default function NoticePanel({ tone = 'amber', title, className, children }: NoticePanelProps) {
  return (
    <div className={`miku-notice-panel tone-${tone} ${title ? 'has-title' : ''} ${className || ''}`}>
      <span className="miku-notice-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </span>
      <div className="miku-notice-body">
        {title && <h4 className="miku-notice-title">{title}</h4>}
        <div className="miku-notice-content">{children}</div>
      </div>

      <style jsx>{`
        .miku-notice-panel {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 22px;
          border-radius: 14px;
          border: 1.5px solid;
          border-left-width: 5px;
          box-sizing: border-box;
        }
        .miku-notice-panel.has-title {
          align-items: flex-start;
          padding: 22px 26px;
          border-radius: 16px;
        }

        .miku-notice-panel.tone-amber {
          background: linear-gradient(135deg, #fff7ed 0%, #fff1e0 100%);
          border-color: #fdba74;
          border-left-color: #ea580c;
          box-shadow: 0 10px 28px -14px rgba(234, 88, 12, 0.35);
        }
        .miku-notice-panel.tone-rose {
          background: #fff1f2;
          border-color: #fda4af;
          border-left-color: #e11d48;
          box-shadow: 0 2px 8px rgba(225, 29, 72, 0.08);
        }

        .miku-notice-icon {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        }
        .tone-amber .miku-notice-icon {
          background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%);
          box-shadow: 0 6px 14px -5px rgba(234, 88, 12, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.35);
        }
        .tone-rose .miku-notice-icon {
          background: linear-gradient(135deg, #fb7185 0%, #e11d48 100%);
          box-shadow: 0 6px 14px -5px rgba(225, 29, 72, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.35);
        }

        .miku-notice-body { flex: 1; min-width: 0; }
        .miku-notice-title {
          margin: 2px 0 12px;
          font-size: 15.5px;
          font-weight: 800;
        }
        .tone-amber .miku-notice-title { color: #c2410c; }
        .tone-rose .miku-notice-title { color: #9f1239; }

        .miku-notice-content {
          font-size: 14px;
          font-weight: 600;
          line-height: 1.6;
        }
        .has-title .miku-notice-content { font-size: 13.5px; font-weight: 500; }
        .tone-amber .miku-notice-content { color: #9a3412; }
        .tone-rose .miku-notice-content { color: #9f1239; }

        .miku-notice-content :global(strong) { font-weight: 800; }
        .tone-amber .miku-notice-content :global(strong) { color: #ea580c; }
        .tone-rose .miku-notice-content :global(strong) { color: #e11d48; }

        .miku-notice-content :global(ul) {
          list-style: none; margin: 0; padding: 0;
          display: flex; flex-direction: column; gap: 9px;
        }
        .miku-notice-content :global(li) {
          position: relative; padding-left: 16px; line-height: 1.6;
        }
        .miku-notice-content :global(li)::before {
          content: ''; position: absolute; left: 0; top: 8px;
          width: 5px; height: 5px; border-radius: 50%;
        }
        .tone-amber .miku-notice-content :global(li)::before { background: #ea580c; }
        .tone-rose .miku-notice-content :global(li)::before { background: #e11d48; }

        @media (max-width: 768px) {
          .miku-notice-panel.has-title { padding: 18px 20px; gap: 12px; }
        }
      `}</style>
    </div>
  );
}
