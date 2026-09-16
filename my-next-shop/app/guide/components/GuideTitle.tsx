"use client";

import React from 'react';
import '@/app/mypage/mypage-premium.css';

// =================================================================
// 🌟 가이드 페이지 제목 (mypage/wishlist 의 "관심 상품 목록" 제목과 동일한 구성)
//   작은 영문 눈썹 + 굵은 제목 + 로즈 그라데이션 아이콘 뱃지
//   스타일: ../guide-common.css 의 .gp-title-block
// =================================================================
interface GuideTitleProps {
  /** 제목 위의 작은 영문 문구 (예: "Service Fee") */
  eyebrow: string;
  title: React.ReactNode;
  /** Font Awesome 클래스 (예: "fa-coins") */
  icon: string;
  className?: string;
}

export default function GuideTitle({ eyebrow, title, icon, className }: GuideTitleProps) {
  return (
    <div className={`gp-title-block mp-anim d1 ${className || ''}`}>
      <span className="mp-eyebrow">{eyebrow}</span>
      <h2 className="gp-title-h2">
        {title}
        <span className="gp-title-badge" aria-hidden="true"><i className={`fa ${icon}`}></i></span>
      </h2>
    </div>
  );
}
