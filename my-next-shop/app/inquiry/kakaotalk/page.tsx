"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import GuideLayout from '@/app/components/GuideLayout';
import '@/app/guide/guide-common.css';
import GuidePremiumHero from '@/app/guide/components/GuidePremiumHero';
import GuideTitle from '@/app/guide/components/GuideTitle';
import { ChatCircleDots } from '@phosphor-icons/react';

// 🌟 카카오 채널 공개 ID (기존 채팅 URL: https://pf.kakao.com/_fxgLsX/chat 의 _fxgLsX)
const KAKAO_CHANNEL_PUBLIC_ID = '_fxgLsX';
// 🌟 실제 파일을 내려받아 계산한 SHA-384 값입니다 (2026-09 기준 최신 2.8.3).
// 다음 SDK 버전으로 올릴 땐 이 값도 새로 계산해서 같이 바꿔야 합니다.
const KAKAO_SDK_SRC = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js';
const KAKAO_SDK_INTEGRITY = 'sha384-oroumrnFVE0xtgqyDZJARgERibXg2C28380uaUZz2kHDS5CR7tu20eGiOU6GkTpy';

declare global {
  interface Window {
    Kakao?: any;
  }
}

export default function ContactPage() {
  const [sdkReady, setSdkReady] = useState(false);

  // 🌟 [디자인 가이드 참고] Kakao.Channel.createChatButton()이 만드는 공식 버튼 이미지는
  // "톡상담" 같은 고정 문구가 그림에 박혀 있어 "카카오톡 상담하기"로 바꿀 수 없습니다.
  // 대신 버튼 이미지 없이 채팅창만 여는 공식 함수 Kakao.Channel.chat()을 그대로 쓰고,
  // 버튼 자체(문구 포함)는 우리 디자인대로 직접 만듭니다 — 카카오 채널 연결 동작 자체는
  // 여전히 공식 SDK를 통해 이뤄집니다.
  const initKakao = () => {
    const Kakao = window.Kakao;
    if (!Kakao) return;
    if (!Kakao.isInitialized()) {
      Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);
    }
    setSdkReady(true);
  };

  useEffect(() => {
    // 🌟 next/script의 onLoad는 클라이언트 네비게이션으로 이 페이지에 다시 들어왔을 때는
    // (스크립트가 이미 로드돼있어 onLoad가 다시 안 불릴 수 있어) 호출되지 않을 수 있으므로,
    // 마운트 시점에 이미 로드되어 있는 경우도 함께 확인합니다.
    if (window.Kakao) {
      initKakao();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKakaoClick = () => {
    if (sdkReady && window.Kakao?.Channel) {
      window.Kakao.Channel.chat({ channelPublicId: KAKAO_CHANNEL_PUBLIC_ID });
      return;
    }
    // 🌟 SDK가 아직 준비되지 않았거나(로딩 지연) 광고차단 등으로 막힌 경우의 대체 경로.
    window.open(`https://pf.kakao.com/${KAKAO_CHANNEL_PUBLIC_ID}/chat`, '_blank', 'noopener,noreferrer');
  };

  return (
    <GuideLayout title="카카오톡 문의" type="contact">
      <Script
        src={KAKAO_SDK_SRC}
        integrity={KAKAO_SDK_INTEGRITY}
        crossOrigin="anonymous"
        strategy="afterInteractive"
        onLoad={initKakao}
      />

      <div className="guide-page-container">
        {/* 🌟 요약 카드 + 제목 — inquiry/faq 와 같은 구성 (카드가 제목 위) */}
        <GuidePremiumHero
          ariaLabel="카카오톡 상담 안내"
          eyebrow="MIKUCHAN KAKAO CHANNEL"
          title={<>무엇을 <em>도와드릴까요?</em></>}
          desc="미쿠짱 카카오톡 채널을 통해 빠르고 친절한 실시간 상담이 가능합니다."
          icon={<ChatCircleDots weight="duotone" />}
          feature={{
            label: <span className="gp-hero-live">실시간 상담 가능</span>,
            value: '10:00 ~ 24:00',
            sub: '연중무휴',
            actions: [
              {
                onClick: handleKakaoClick,
                className: 'is-kakao',
                label: (
                  <>
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                      <path fill="#191600" d="M12 3.5C6.75 3.5 2.5 6.86 2.5 11c0 2.64 1.75 4.96 4.4 6.3-.19.7-.7 2.56-.8 2.96-.13.5.18.49.38.36.16-.1 2.5-1.7 3.52-2.4.63.09 1.28.14 1.95.14 5.25 0 9.5-3.36 9.5-7.5s-4.19-7.36-9.45-7.36z" />
                    </svg>
                    카카오톡 상담하기
                  </>
                ),
              },
            ],
          }}
          stats={[
            { label: '상담시간', value: '10:00 ~ 24:00', text: true },
            { label: '운영일', value: <>365일<small>연중무휴</small></> },
            { label: '상담 방식', value: '실시간 채팅', text: true },
            { label: '자주하는 질문', value: <>보러가기 <i className="fa fa-arrow-right"></i></>, text: true, href: '/inquiry/faq' },
          ]}
        />
        <GuideTitle eyebrow="Kakao Talk" title="카카오톡 문의" icon="fa-comment-dots" />
        <div className="guide-panel">
          <div className="kt-wrap">

            {/* 자주 찾는 안내 바로가기 */}
            <div className="kt-links-head">
              <span className="gp-eyebrow">Quick Links</span>
              <h3 className="gp-section-title">문의 전에 확인해 보세요</h3>
            </div>
            <div className="quick-links">
              {QUICK_LINKS.map(link => (
                <Link key={link.href} href={link.href} className="quick-link">
                  <span className={`quick-link-icon ${link.tone}`} aria-hidden="true">{link.icon}</span>
                  <span className="quick-link-text">
                    <strong>{link.title}</strong>
                    <em>{link.desc}</em>
                  </span>
                  <span className="quick-link-arrow" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CSS 스타일 분리 */}
      <style jsx>{contactStyles}</style>
    </GuideLayout>
  );
}

const svgProps = { viewBox: '0 0 24 24', width: 19, height: 19, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const QUICK_LINKS = [
  {
    href: '/inquiry/faq', title: '자주하는 질문', desc: '궁금한 점을 먼저 확인해보세요', tone: 'icon-indigo',
    icon: <svg {...svgProps}><path d="M9 9a3 3 0 1 1 4 2.83c-.7.26-1 .9-1 1.67v.5" /><line x1="12" y1="17" x2="12.01" y2="17" /><circle cx="12" cy="12" r="9" /></svg>,
  },
  {
    href: '/guide/purchase-method', title: '구매대행 신청방법', desc: '이용 절차가 궁금하신가요?', tone: 'icon-emerald',
    icon: <svg {...svgProps}><path d="M6 8V6a6 6 0 1 1 12 0v2" /><rect x="3" y="8" width="18" height="13" rx="2.5" /></svg>,
  },
  {
    href: '/guide/fee-guide', title: '수수료 안내', desc: '서비스별 수수료를 확인하세요', tone: 'icon-orange',
    icon: <svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5" /><path d="M12 6v2M12 16v2" /></svg>,
  },
  {
    href: '/guide/shipping-fee', title: '국제배송 요금표', desc: '무게별 배송비를 확인하세요', tone: 'icon-sky',
    icon: <svg {...svgProps}><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /></svg>,
  },
];

// ==========================================
// 🎨 CSS 스타일 정의 (분리)
// ==========================================
const contactStyles = `
  .kt-wrap { max-width: 760px; margin: 0 auto; }

  .kt-hero {
    position: relative;
    overflow: hidden;
    isolation: isolate;
    padding: 34px 36px 28px;
    border-radius: 24px;
    background: linear-gradient(160deg, #fffbe0 0%, #fffdf2 45%, #ffffff 100%);
    border: 1px solid #f3e39a;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 22px 44px -26px rgba(180, 140, 10, 0.5);
    text-align: left;
  }
  .kt-hero-glow {
    position: absolute;
    right: -90px;
    top: -120px;
    width: 320px;
    height: 320px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(254, 229, 0, 0.35) 0%, rgba(254, 229, 0, 0) 70%);
    z-index: -1;
    pointer-events: none;
  }
  .kt-hero-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 22px; }
  .kt-channel-icon {
    width: 58px;
    height: 58px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fee500;
    box-shadow: 0 12px 24px -12px rgba(180, 140, 10, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    border-radius: 999px;
    background: #ffffff;
    border: 1px solid #c6ecd5;
    color: #1f7a4a;
    font-size: 13px;
    font-weight: 800;
    box-shadow: 0 4px 10px -6px rgba(31, 122, 74, 0.35);
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22c55e;
    animation: statusPulse 1.8s ease-out infinite;
  }
  @keyframes statusPulse {
    0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
    70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
    100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
  }

  .kt-eyebrow { display: block; margin-bottom: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.16em; color: #8a6d00; }
  .contact-title { font-size: 30px; font-weight: 900; color: #111827; margin: 0 0 10px; letter-spacing: -0.6px; }
  .contact-desc { font-size: 16px; color: #4b5563; line-height: 1.7; margin: 0 0 26px; word-break: keep-all; }

  /* 🌟 클릭 시 Kakao.Channel.chat()(공식 SDK 함수)을 호출하는 버튼 */
  .kakao-btn {
    width: 100%;
    height: 62px;
    padding: 0 22px;
    background: linear-gradient(180deg, #FEE500 0%, #FADA0A 100%);
    color: #191600;
    border: none;
    border-radius: 18px;
    font-weight: 900;
    font-family: inherit;
    cursor: pointer;
    font-size: 18px;
    letter-spacing: -0.2px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    box-shadow: 0 16px 30px -14px rgba(200, 160, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.6);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease, filter 0.25s ease;
  }
  .kakao-btn:hover { transform: translateY(-2px); filter: brightness(1.02); box-shadow: 0 20px 34px -14px rgba(200, 160, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.6); }
  .kakao-btn:active { transform: translateY(0); }
  .kakao-btn:focus-visible { outline: 3px solid rgba(25, 22, 0, 0.35); outline-offset: 3px; }
  .kakao-btn { white-space: nowrap; }
  .kakao-icon { display: inline-flex; flex-shrink: 0; }
  .kakao-arrow { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(25, 22, 0, 0.1); }

  .kt-info { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 16px; }
  .kt-info-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.85);
    border: 1px solid #f0e6b8;
    min-width: 0;
  }
  .kt-info-icon {
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b5200;
    background: #fff6bf;
  }
  .kt-info-text { display: flex; flex-direction: column; min-width: 0; }
  .kt-info-text em { font-style: normal; font-size: 11px; font-weight: 700; color: #6b7280; }
  .kt-info-text strong { font-size: 14px; font-weight: 800; color: #111827; white-space: nowrap; }

  .kt-links-head { margin: 0 2px 14px; }

  .quick-links { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .quick-link {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 16px;
    background: #ffffff;
    border: 1px solid #eceef3;
    border-radius: 18px;
    text-decoration: none;
    box-sizing: border-box;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .quick-link:hover {
    border-color: #dfe2e8;
    box-shadow: 0 14px 28px -18px rgba(15, 23, 42, 0.3);
    transform: translateY(-2px);
  }
  .quick-link-icon {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    transition: transform 0.25s ease;
  }
  .quick-link:hover .quick-link-icon { transform: scale(1.06); }
  .quick-link-icon.icon-indigo { background: linear-gradient(135deg, #6a72de 0%, #4f57c9 100%); box-shadow: 0 8px 16px -8px rgba(79, 87, 201, 0.55); }
  .quick-link-icon.icon-emerald { background: linear-gradient(135deg, #3fae84 0%, #23845f 100%); box-shadow: 0 8px 16px -8px rgba(35, 132, 95, 0.5); }
  .quick-link-icon.icon-orange { background: linear-gradient(135deg, #d0591a 0%, #a4440f 100%); box-shadow: 0 8px 16px -8px rgba(164, 68, 15, 0.5); }
  .quick-link-icon.icon-sky { background: linear-gradient(135deg, #4aa8d8 0%, #2b7fb0 100%); box-shadow: 0 8px 16px -8px rgba(43, 127, 176, 0.5); }
  .quick-link-text { flex: 1 1 auto; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .quick-link-text strong { font-size: 15px; font-weight: 800; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .quick-link-text em { font-style: normal; font-size: 12.5px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .quick-link-arrow {
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    background: #f5f6f8;
    transition: all 0.2s ease;
  }
  .quick-link:hover .quick-link-arrow { color: #b04a12; background: #fff6ef; }

  @media (max-width: 768px) {
    .kt-hero { padding: 22px 18px 18px; border-radius: 20px; }
    .kt-hero-top { margin-bottom: 16px; }
    .kt-channel-icon { width: 50px; height: 50px; border-radius: 15px; }
    .status-badge { font-size: 12px; padding: 6px 12px; }
    .contact-title { font-size: 23px; }
    .contact-desc { font-size: 15px; margin-bottom: 20px; }
    .kakao-btn { height: 56px; font-size: 16px; border-radius: 16px; }
    .kt-info { grid-template-columns: minmax(0, 1fr); gap: 6px; }
    .kt-info-item { padding: 10px 12px; }
    .kt-links-head { margin-top: 0; }
    .quick-links { grid-template-columns: minmax(0, 1fr); gap: 8px; }
    .quick-link { padding: 14px; }
  }
  @media (max-width: 400px) {
    .kakao-btn { font-size: 15px; gap: 8px; padding: 0 14px; }
    .kakao-arrow { display: none; }
  }
`;
