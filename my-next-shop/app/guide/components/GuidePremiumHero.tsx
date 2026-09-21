"use client";

import React from 'react';
import Link from 'next/link';
import '@/app/mypage/mypage-premium.css';

// =================================================================
// 🌟 가이드 페이지 상단 요약 카드 (mypage/wishlist 의 .mp-hero 와 동일한 디자인)
//   - 왼쪽: 아이콘 + 영문 눈썹 + 제목 + 설명
//   - 가운데: 핵심 정보 카드 (wishlist 의 "미쿠짱머니" 자리) + 버튼 2개
//   - 아래: 통계/바로가기 4칸
//   스타일은 app/mypage/mypage-premium.css 의 .mp-hero* 를 그대로 씁니다.
// =================================================================
export interface HeroAction {
  /** 링크 이동 버튼 (onClick 이 있으면 href 대신 버튼으로 렌더링됩니다) */
  href?: string;
  onClick?: () => void;
  label: React.ReactNode;
  /** 로즈 그라데이션 강조 버튼 */
  primary?: boolean;
  /** 추가 클래스 (예: 'is-kakao' — 카카오 노란색 버튼) */
  className?: string;
}

export interface HeroStat {
  label: string;
  value: React.ReactNode;
  /** 숫자가 아닌 짧은 문구(예: "보러가기 →")일 때 글자 크기를 줄입니다 */
  text?: boolean;
  href?: string;
  onClick?: () => void;
}

export interface HeroFeature {
  label: React.ReactNode;
  value: React.ReactNode;
  /** value 옆에 작게 붙는 단위/보조 문구 */
  sub?: React.ReactNode;
  /** true 면 sub 를 value 아래 줄에 표시합니다 (긴 보조 문구용, 예: 운영일 안내) */
  subBelow?: boolean;
  actions?: HeroAction[];
}

interface GuidePremiumHeroProps {
  eyebrow: string;
  title: React.ReactNode;
  desc?: React.ReactNode;
  /** Phosphor 아이콘 등 React 요소 (흰색으로 표시됩니다) */
  icon?: React.ReactNode;
  feature?: HeroFeature;
  stats?: HeroStat[];
  ariaLabel?: string;
  className?: string;
}

export default function GuidePremiumHero({ eyebrow, title, desc, icon, feature, stats, ariaLabel, className }: GuidePremiumHeroProps) {
  return (
    <section className={`mp-hero mp-anim gp-premium-hero ${className || ''}`} aria-label={ariaLabel}>
      <div className="mp-hero-main">
        {icon && <div className="mp-avatar" aria-hidden="true">{icon}</div>}
        <div className="mp-hero-text">
          <span className="mp-eyebrow-dark">{eyebrow}</span>
          <h3 className="mp-hero-title">{title}</h3>
          {desc && <p className="mp-hero-desc">{desc}</p>}
        </div>
      </div>

      {feature && (
        <div className="mp-hero-money">
          <span className="mp-hero-money-label">{feature.label}</span>
          <strong className="mp-hero-money-value" translate="no">
            {feature.value}
            {feature.sub && <small className={feature.subBelow ? 'is-below' : undefined}>{feature.sub}</small>}
          </strong>
          {feature.actions && feature.actions.length > 0 && (
            <div className="mp-hero-money-actions">
              {feature.actions.map((action, i) => {
                const cls = [action.primary ? 'is-primary' : '', action.className || ''].join(' ').trim();
                if (action.onClick || !action.href) {
                  return <button key={i} type="button" className={cls} onClick={action.onClick}>{action.label}</button>;
                }
                return <Link key={i} href={action.href} className={cls}>{action.label}</Link>;
              })}
            </div>
          )}
        </div>
      )}

      {stats && stats.length > 0 && (
        <div className="mp-hero-stats">
          {stats.map((stat, i) => {
            const body = (
              <>
                <span>{stat.label}</span>
                <strong translate="no" style={stat.text ? { fontSize: '16px' } : undefined}>{stat.value}</strong>
              </>
            );
            if (stat.href) return <Link key={i} href={stat.href} className="mp-hero-stat">{body}</Link>;
            if (stat.onClick) return <button key={i} type="button" className="mp-hero-stat" onClick={stat.onClick}>{body}</button>;
            return <div key={i} className="mp-hero-stat">{body}</div>;
          })}
        </div>
      )}
    </section>
  );
}
