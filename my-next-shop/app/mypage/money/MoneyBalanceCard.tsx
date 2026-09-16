'use client';

import React from 'react';
import Link from 'next/link';
import { Wallet, CirclePlus, Receipt, Undo2 } from 'lucide-react';
import '@/app/mypage/mypage-premium.css';
import './money-common.css';

type MoneyPage = 'charge' | 'history' | 'refund';

export interface BalanceStat {
  label: string;
  value: string;
  tone?: 'default' | 'plus' | 'minus' | 'warn';
  /** 숫자가 아닌 짧은 문구일 때 글자 크기를 줄입니다 */
  text?: boolean;
}

interface Props {
  current: MoneyPage;
  balance: number;
  /** 카드 하단 4칸에 보여줄 보조 수치 (예: 충전 후 예상 잔액) */
  stats?: BalanceStat[];
}

const LINKS: { key: MoneyPage; href: string; label: string; icon: React.ElementType }[] = [
  { key: 'charge', href: '/mypage/money/charge', label: '충전', icon: CirclePlus },
  { key: 'history', href: '/mypage/money/history', label: '이용 내역', icon: Receipt },
  { key: 'refund', href: '/mypage/money/refund', label: '환불', icon: Undo2 },
];

// 🌟 페이지별 카드 문구
const COPY: Record<MoneyPage, { eyebrow: string; title: React.ReactNode; desc: string; aria: string }> = {
  charge: {
    eyebrow: 'MIKU MONEY · CHARGE',
    title: <>미쿠짱머니를 <em>충전</em>하세요</>,
    desc: '충전한 머니로 구매대행·배송대행 비용을 바로 결제할 수 있어요.',
    aria: '충전 요약',
  },
  history: {
    eyebrow: 'MIKU MONEY · HISTORY',
    title: <>머니 <em>이용 내역</em>을 확인하세요</>,
    desc: '충전·사용·환불 내역을 기간과 유형별로 모아 보여드려요.',
    aria: '이용 내역 요약',
  },
  refund: {
    eyebrow: 'MIKU MONEY · REFUND',
    title: <>남은 머니를 <em>환불</em> 받으세요</>,
    desc: '사용하지 않은 잔액은 신청하신 계좌로 환불해 드려요.',
    aria: '환불 요약',
  },
};

/**
 * 🌟 mypage/money(charge·history·refund) 공통 상단 요약 카드.
 * mypage/wishlist 의 검은색 카드(.mp-hero, app/mypage/mypage-premium.css)와 같은 디자인이며
 * 제목(GuideTitle) 위에 놓입니다. 가운데 "현재 보유 머니" 카드의 버튼은 충전/이용 내역/환불 이동 메뉴입니다.
 */
export default function MoneyBalanceCard({ current, balance, stats }: Props) {
  const copy = COPY[current];
  return (
    <section className="mp-hero mp-anim mm-hero" aria-label={copy.aria}>
      <div className="mp-hero-main">
        <div className="mp-avatar" aria-hidden="true"><Wallet size={30} strokeWidth={2} /></div>
        <div className="mp-hero-text">
          <span className="mp-eyebrow-dark">{copy.eyebrow}</span>
          <h3 className="mp-hero-title">{copy.title}</h3>
          <p className="mp-hero-desc">{copy.desc}</p>
        </div>
      </div>

      <div className="mp-hero-money">
        <span className="mp-hero-money-label"><i className="fa fa-sack-dollar"></i> 현재 보유 머니</span>
        <strong className="mp-hero-money-value" translate="no">{balance.toLocaleString()}<small>원</small></strong>
        <nav className="mp-hero-money-actions" aria-label="미쿠짱 머니 메뉴">
          {LINKS.map(link => {
            const Icon = link.icon;
            const active = link.key === current;
            return (
              <Link
                key={link.key}
                href={link.href}
                className={active ? 'is-primary' : ''}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={13} strokeWidth={2.4} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {stats && stats.length > 0 && (
        <div className="mp-hero-stats">
          {stats.map(stat => (
            <div key={stat.label} className={`mp-hero-stat mm-tone-${stat.tone || 'default'}`}>
              <span>{stat.label}</span>
              <strong translate="no" style={stat.text ? { fontSize: '16px' } : undefined}>{stat.value}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
