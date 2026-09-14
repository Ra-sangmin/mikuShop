"use client";

import React from 'react';

// 🌟 guide/fee-guide, guide/shipping-fee, guide/customs가 각자 거의 동일하게 들고 있던
// 하단 안내 카드(카카오 아이콘 + 클릭 시 /contact 이동)를 공용 컴포넌트로 뽑았습니다.
// 문구는 페이지마다 달라서 children으로 받고, 강조 링크는 children 안에서
// className="footer-info-link"를 그대로 쓰면 됩니다(:global로 스코프 예외 처리해뒀습니다).
interface GuideFooterNoticeProps {
  href?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export default function GuideFooterNotice({ href = '/contact', className, style, children }: GuideFooterNoticeProps) {
  return (
    <div className={`guide-footer-notice ${className || ''}`} style={style} onClick={() => window.location.href = href}>
      <div className="guide-footer-notice-icon-wrap">
        <img src="/images/kakao_icon/kakaotalk_sharing_btn_small_notBG.png" alt="카카오톡" className="guide-footer-notice-icon" />
      </div>
      <p className="guide-footer-notice-text">{children}</p>

      <style jsx>{`
        .guide-footer-notice {
          cursor: pointer;
          background-color: #fff;
          border: 1px solid #eef0f5;
          padding: 40px;
          border-radius: 32px;
          text-align: center;
          box-shadow: 0 12px 28px -18px rgba(15, 23, 42, 0.12);
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .guide-footer-notice:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 32px -18px rgba(234, 179, 8, 0.4);
          border-color: #fde68a;
        }
        .guide-footer-notice-icon-wrap {
          width: 44px; height: 44px; border-radius: 14px; margin: 0 auto 14px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #ffe94d 0%, #fee500 100%);
          box-shadow: 0 8px 18px -6px rgba(234, 179, 8, 0.55);
        }
        .guide-footer-notice-icon {
          width: 32px; height: auto; display: block; object-fit: contain;
        }
        .guide-footer-notice-text {
          font-size: 15px; color: #475569; font-weight: 600; margin: 0;
          line-height: 1.8; word-break: keep-all;
        }
        .guide-footer-notice-text :global(.footer-info-link) {
          color: #92650d; font-weight: 900; text-decoration: none;
          border-bottom: 1.5px solid #f5d33e; padding-bottom: 1px;
        }

        @media (max-width: 768px) {
          .guide-footer-notice { padding: 30px 20px !important; }
          .guide-footer-notice-text { font-size: 14px !important; }
        }
      `}</style>
    </div>
  );
}
