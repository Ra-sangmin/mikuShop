'use client';

// 🤖 메인 화면용 'AI 쇼핑 비서' 연결 배너 (프리미엄)
//
//  - 깊은 자줏빛 바탕 + 로즈·바이올렛 오로라 + 그라데이션 테두리 + 마우스를 올리면 빛이 스쳐 지나감
//  - 배너 아무 곳이나 누르면 AI 검색 페이지로 이동
//  🐛 예전엔 입력창 모양 칸에 예시 질문이 타이핑됐는데, 손님이 '여기에 적어야 하나?' 하고 헷갈려 해서 뺐습니다.

import Link from 'next/link';
import AiBotMark, { AiSparkle } from './AiBotMark';
import { MallLogo } from './mallBrand';
import { MALLS, MALL_LABEL } from '@/lib/ai-search/types';
import './ai-search.css';

export default function AiSearchBanner() {
  return (
    <section className="ais-root align-container aib-wrap" aria-label="AI 쇼핑 비서">
      <div className="aib">
        {/* 배너 전체를 누르면 AI 검색 페이지로 (아래 개별 링크들은 이 위에 올라와 따로 동작) */}
        <Link href="/ai-search" className="aib-stretch" aria-label="AI 쇼핑 비서 열기" />

        <span className="aib-glow g1" aria-hidden />
        <span className="aib-glow g2" aria-hidden />
        <span className="aib-grid" aria-hidden />
        <span className="aib-shine" aria-hidden />

        <div className="aib-mark" aria-hidden>
          <span className="aib-mark-halo" />
          <AiBotMark size={84} animated />
        </div>

        <div className="aib-body">
          <span className="aib-eyebrow"><AiSparkle size={12} /> NEW · AI SHOPPING CONCIERGE</span>
          <h2 className="aib-title">
            {/* 휴대폰: 큰 마크 대신 제목 왼쪽에 작은 마크 */}
            <span className="aib-title-mark" aria-hidden><AiBotMark size={40} /></span>
            <span><span className="aib-grad">AI</span> 쇼핑 비서에게 물어보세요</span>
          </h2>
          <p className="aib-sub">일본 4대 쇼핑몰을 한국어 한 문장이나 사진 한 장으로, 한 번에 찾아 드려요.</p>

          <div className="aib-malls">
            {MALLS.map(m => (
              <span key={m} className="aib-mall" title={MALL_LABEL[m]}>
                <span className="aib-mall-ico">
                  {m === 'rakuten' ? <span className="aib-mall-r">R</span> : <MallLogo mall={m} size={14} />}
                </span>
                <span className="aib-mall-name">{MALL_LABEL[m]}</span>
              </span>
            ))}
          </div>
        </div>

        <Link href="/ai-search" className="aib-cta">
          <span className="aib-cta-spark" aria-hidden><AiSparkle size={18} /></span>
          <span>AI 비서 호출</span>
          <span className="aib-cta-arrow" aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </Link>
      </div>
    </section>
  );
}
