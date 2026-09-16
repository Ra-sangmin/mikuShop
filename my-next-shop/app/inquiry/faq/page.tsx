"use client";
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import GuideLayout from '@/app/components/GuideLayout';
import '@/app/guide/guide-common.css';
import '@/app/mypage/mypage-premium.css';
import GuideFooterNotice from '@/app/guide/components/GuideFooterNotice';
import { Question, MagnifyingGlass, X, CaretDown, Coins, AirplaneTilt, Scales, ChatCircleDots, BookOpen } from '@phosphor-icons/react';

// 🌟 질문과 답변 데이터. 항목을 추가할 때는 이 배열에만 넣으면 됩니다.
const FAQS = [
  {
    q: "배송기간은 얼마나 걸리나요?",
    a: "평균적으로 현지 배송 2~3일, 국제 배송 3~5일 정도 소요됩니다."
  },
  {
    q: "배송비는 어떻게 계산되나요?",
    a: "상품의 무게와 부피 중 큰 것을 기준으로 배송비가 책정됩니다."
  }
];

const RELATED_LINKS = [
  { href: '/guide/fee-guide', label: '수수료 안내', icon: <Coins weight="bold" /> },
  { href: '/guide/shipping-fee', label: '국제배송 요금표', icon: <AirplaneTilt weight="bold" /> },
  { href: '/guide/customs', label: '관부가세 안내', icon: <Scales weight="bold" /> },
];

export default function FAQPage() {
  const [keyword, setKeyword] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return FAQS.map((faq, index) => ({ ...faq, index }))
      .filter(faq => !k || faq.q.toLowerCase().includes(k) || faq.a.toLowerCase().includes(k));
  }, [keyword]);

  return (
    <GuideLayout title="자주하는 질문" type="contact">
      <div className="guide-page-container miku-faq-page">
        {/* 🌟 요약 카드 — 관심 상품 목록(mypage/wishlist)과 같은 디자인·배치(제목 위) */}
        <section className="mp-hero mp-anim" aria-label="자주하는 질문 요약">
          <div className="mp-hero-main">
            <div className="mp-avatar" aria-hidden="true"><Question size={30} weight="duotone" /></div>
            <div className="mp-hero-text">
              <span className="mp-eyebrow-dark">HELP CENTER</span>
              <h3 className="mp-hero-title">궁금한 점을 <em>빠르게</em> 찾아보세요</h3>
              <p className="mp-hero-desc">자주 묻는 질문을 모았어요. 원하는 답이 없다면 카카오톡으로 편하게 문의해 주세요.</p>
            </div>
          </div>
          <div className="mp-hero-money">
            <span className="mp-hero-money-label"><ChatCircleDots size={14} weight="fill" /> 1:1 상담</span>
            <strong className="mp-hero-money-value">카카오톡 <small>실시간 상담</small></strong>
            <div className="mp-hero-money-actions">
              <Link href="/inquiry/kakaotalk" className="is-primary"><i className="fa fa-comment"></i> 카카오톡 문의</Link>
              <Link href="/purchase/quote"><i className="fa fa-file-lines"></i> 견적 문의</Link>
            </div>
          </div>
          <div className="mp-hero-stats">
            <div className="mp-hero-stat"><span>전체 질문</span><strong>{FAQS.length}<small>건</small></strong></div>
            <div className="mp-hero-stat"><span>검색 결과</span><strong>{filtered.length}<small>건</small></strong></div>
            <Link href="/guide/purchase-method" className="mp-hero-stat">
              <span>구매대행 방법</span><strong style={{ fontSize: '16px' }}>보러가기 <i className="fa fa-arrow-right"></i></strong>
            </Link>
            <Link href="/guide/delivery-method" className="mp-hero-stat">
              <span>배송대행 방법</span><strong style={{ fontSize: '16px' }}>보러가기 <i className="fa fa-arrow-right"></i></strong>
            </Link>
          </div>
        </section>

        {/* 🌟 제목: 관심 상품 목록과 같은 구성 (영문 눈썹 + 제목 + 로즈 아이콘 뱃지) */}
        <div className="miku-faq-outer-header mp-anim d1">
          <span className="mp-eyebrow">FAQ</span>
          <h2>자주하는 질문 <span className="miku-faq-title-badge"><i className="fa fa-circle-question"></i></span></h2>
        </div>

        <div className="guide-panel">
          <div className="gp-search">
            <span className="gp-search-icon"><MagnifyingGlass size={19} weight="bold" /></span>
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="궁금한 내용을 검색해 보세요 (예: 배송비)"
              aria-label="자주하는 질문 검색"
            />
            {keyword && (
              <button type="button" className="gp-search-clear" onClick={() => setKeyword('')} aria-label="검색어 지우기">
                <X size={14} weight="bold" />
              </button>
            )}
          </div>

          <div className="gp-section-head">
            <div>
              <span className="gp-eyebrow">FAQ</span>
              <h3 className="gp-section-title">자주 묻는 질문</h3>
            </div>
            <span className="gp-chip is-neutral">{keyword ? `검색 결과 ${filtered.length}건` : `전체 ${FAQS.length}건`}</span>
          </div>

          {filtered.length > 0 ? (
            <div className="gp-faq-list">
              {filtered.map((faq) => {
                const isOpen = openIndex === faq.index || !!keyword.trim();
                return (
                  <div key={faq.index} className={`gp-faq ${isOpen ? 'is-open' : ''}`}>
                    <button
                      type="button"
                      className="gp-faq-q"
                      aria-expanded={isOpen}
                      onClick={() => setOpenIndex(openIndex === faq.index ? null : faq.index)}
                    >
                      <span className="gp-faq-mark">Q</span>
                      <span className="gp-faq-q-text">{faq.q}</span>
                      <span className="gp-faq-toggle"><CaretDown size={15} weight="bold" /></span>
                    </button>
                    {isOpen && (
                      <div className="gp-faq-a">
                        <span className="gp-faq-a-mark">A</span>
                        <p>{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="gp-empty">
              <strong>검색 결과가 없어요</strong>
              <span>다른 단어로 검색하거나 카카오톡으로 문의해 주세요.</span>
            </div>
          )}

          <div className="gp-section-head" style={{ marginTop: '34px' }}>
            <div>
              <span className="gp-eyebrow">Guide</span>
              <h3 className="gp-section-title">함께 보면 좋은 안내</h3>
            </div>
          </div>
          <div className="gp-related">
            {RELATED_LINKS.map(link => (
              <Link key={link.href} href={link.href} className="gp-related-link">
                <span className="gp-icon is-soft">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          <div style={{ marginTop: '28px' }}>
            <GuideFooterNotice>
              원하시는 답을 찾지 못하셨나요?<br />
              <span className="footer-info-link">카카오톡 채널</span>로 문의하시면 빠르게 안내해 드려요.
            </GuideFooterNotice>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .miku-faq-page .mp-hero { margin-bottom: 24px; }
        .miku-faq-page .mp-avatar svg { color: #ffffff; }
        .miku-faq-page .mp-hero-money-label svg { color: #f3b7bc; }
        .miku-faq-outer-header { margin-bottom: 24px; }
        .miku-faq-outer-header h2 { font-size: 22px; font-weight: 900; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 10px; }
        .miku-faq-title-badge {
          width: 30px; height: 30px; border-radius: 10px; flex-shrink: 0; color: #fff;
          display: inline-flex; align-items: center; justify-content: center; font-size: 13px;
          background: linear-gradient(135deg, var(--mp-from) 0%, var(--mp-to) 100%);
          box-shadow: 0 6px 14px -6px var(--mp-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }
      `}</style>
    </GuideLayout>
  );
}
