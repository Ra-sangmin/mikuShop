"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

// 🌟 guide/fee-guide, guide/shipping-fee, guide/customs 공용 하단 안내 카드
// (카카오 아이콘 + 클릭 시 /inquiry/kakaotalk 이동). 문구는 children으로 받고,
// 강조 링크는 children 안에서 className="footer-info-link"를 쓰면 됩니다.
// 스타일은 ../guide-common.css의 .gp-help 입니다.
interface GuideFooterNoticeProps {
  href?: string;
  className?: string;
  style?: React.CSSProperties;
  ctaLabel?: string;
  /** 'premium': 제목·보조 정보가 있는 고급형 카드 (guide/fee-guide) */
  variant?: 'default' | 'premium';
  eyebrow?: string;
  title?: React.ReactNode;
  /** 버튼 아래 작은 안내 (예: 상담시간) */
  meta?: React.ReactNode;
  children: React.ReactNode;
}

const KAKAO_GLYPH = 'M12 3.5C6.75 3.5 2.5 6.86 2.5 11c0 2.64 1.75 4.96 4.4 6.3-.19.7-.7 2.56-.8 2.96-.13.5.18.49.38.36.16-.1 2.5-1.7 3.52-2.4.63.09 1.28.14 1.95.14 5.25 0 9.5-3.36 9.5-7.5s-4.19-7.36-9.45-7.36z';

export default function GuideFooterNotice({ href = '/inquiry/kakaotalk', className, style, ctaLabel = '카카오톡 문의', variant = 'default', eyebrow = 'KAKAO CHANNEL', title, meta, children }: GuideFooterNoticeProps) {
  const router = useRouter();

  if (variant === 'premium') {
    return (
      <button type="button" className={`gp-help-pro ${className || ''}`} style={style} onClick={() => router.push(href)}>
        <span className="gp-help-pro-icon" aria-hidden="true">
          <img src="/images/kakao_icon/kakaotalk_sharing_btn_small_notBG.png" alt="" />
          <i className="gp-help-pro-live" />
        </span>
        <span className="gp-help-pro-body">
          <span className="gp-help-pro-eyebrow">{eyebrow}</span>
          {title && <strong className="gp-help-pro-title">{title}</strong>}
          <span className="gp-help-pro-text">{children}</span>
        </span>
        <span className="gp-help-pro-side">
          <span className="gp-help-pro-cta">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="#191600" d={KAKAO_GLYPH} /></svg>
            {ctaLabel}
            <svg className="gp-help-pro-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </span>
          {meta && <span className="gp-help-pro-meta">{meta}</span>}
        </span>
      </button>
    );
  }

  return (
    <button type="button" className={`gp-help ${className || ''}`} style={style} onClick={() => router.push(href)}>
      <span className="gp-help-icon" aria-hidden="true">
        <img src="/images/kakao_icon/kakaotalk_sharing_btn_small_notBG.png" alt="" />
      </span>
      <span className="gp-help-text">{children}</span>
      <span className="gp-help-arrow">
        {ctaLabel}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
        </svg>
      </span>
    </button>
  );
}
