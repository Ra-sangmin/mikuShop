"use client";

import React from 'react';

// 🌟 가이드/문의 페이지 상단의 공통 소개 배너 (스타일: ../guide-common.css의 .gp-hero)
interface HeroChip { label: string; value: React.ReactNode }
interface GuideHeroProps {
  eyebrow: string;
  title: React.ReactNode;
  desc?: React.ReactNode;
  icon?: React.ReactNode;
  chips?: HeroChip[];
  className?: string;
}

export default function GuideHero({ eyebrow, title, desc, icon, chips, className }: GuideHeroProps) {
  return (
    <section className={`gp-hero ${className || ''}`}>
      <div className="gp-hero-body">
        <span className="gp-hero-eyebrow">{eyebrow}</span>
        <h3 className="gp-hero-title">{title}</h3>
        {desc && <p className="gp-hero-desc">{desc}</p>}
        {chips && chips.length > 0 && (
          <div className="gp-hero-chips">
            {chips.map(chip => (
              <div key={chip.label} className="gp-hero-chip">
                <span>{chip.label}</span>
                <strong>{chip.value}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
      {icon && <div className="gp-hero-icon" aria-hidden="true"><span style={{ display: 'flex' }}>{icon}</span></div>}
    </section>
  );
}
