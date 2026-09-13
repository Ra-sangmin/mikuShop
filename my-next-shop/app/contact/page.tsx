"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import GuideLayout from '../components/GuideLayout';

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
    <GuideLayout title="카카오톡 문의" type="contact" hideSidebar={true}>
      <Script
        src={KAKAO_SDK_SRC}
        integrity={KAKAO_SDK_INTEGRITY}
        crossOrigin="anonymous"
        strategy="afterInteractive"
        onLoad={initKakao}
      />

      <div className="contact-page-wrap">
      <div className="contact-container">

        {/* 실시간 상담 가능 배지 */}
        <div className="status-badge">
          <span className="status-dot" />
          실시간 상담 가능
        </div>

        <h2 className="contact-title">무엇을 도와드릴까요?</h2>
        <p className="contact-desc">
          미쿠짱 카카오톡 채널을 통해<br />
          빠르고 친절한 실시간 상담이 가능합니다.
        </p>

        {/* 🌟 클릭 시 카카오 공식 SDK 함수(Kakao.Channel.chat)로 채팅을 엽니다. */}
        <button className="kakao-btn" onClick={handleKakaoClick}>
          <span className="kakao-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="#191600"
                d="M12 3.5C6.75 3.5 2.5 6.86 2.5 11c0 2.64 1.75 4.96 4.4 6.3-.19.7-.7 2.56-.8 2.96-.13.5.18.49.38.36.16-.1 2.5-1.7 3.52-2.4.63.09 1.28.14 1.95.14 5.25 0 9.5-3.36 9.5-7.5s-4.19-7.36-9.45-7.36z"
              />
            </svg>
          </span>
          카카오톡 상담하기
        </button>

        <p className="hours-text">
          상담시간 10:00 ~ 24:00 · <strong>365일 연중무휴</strong> 실시간 대응
        </p>

        <div className="divider" />

        {/* 자주 찾는 안내 바로가기 */}
        <div className="quick-links">
          <Link href="/guide/faq" className="quick-link">
            <span className="quick-link-icon icon-indigo" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 9a3 3 0 1 1 4 2.83c-.7.26-1 .9-1 1.67v.5" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </span>
            <span className="quick-link-text">
              <strong>자주하는 질문</strong>
              <em>궁금한 점을 먼저 확인해보세요</em>
            </span>
            <span className="quick-link-arrow">›</span>
          </Link>
          <Link href="/guide/purchase-method" className="quick-link">
            <span className="quick-link-icon icon-emerald" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8V6a6 6 0 1 1 12 0v2" />
                <rect x="3" y="8" width="18" height="13" rx="2.5" />
              </svg>
            </span>
            <span className="quick-link-text">
              <strong>구매대행 신청방법</strong>
              <em>이용 절차가 궁금하신가요?</em>
            </span>
            <span className="quick-link-arrow">›</span>
          </Link>
        </div>
      </div>
      </div>

      {/* CSS 스타일 분리 */}
      <style jsx>{contactStyles}</style>
    </GuideLayout>
  );
}

// ==========================================
// 🎨 CSS 스타일 정의 (분리)
// ==========================================
const contactStyles = `
  .contact-page-wrap {
    max-width: 640px;
    margin: 32px auto 0;
  }

  .contact-container {
    position: relative;
    padding: 64px 40px 48px;
    text-align: center;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(226, 232, 240, 0.8);
    border-radius: 28px;
    box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.06), inset 0 0 0 1px rgba(255,255,255,0.6);
    overflow: hidden;
    isolation: isolate;
  }

  /* 은은한 배경 광채 */
  .contact-container::before {
    content: '';
    position: absolute;
    top: -140px;
    left: 50%;
    transform: translateX(-50%);
    width: 480px;
    height: 320px;
    background: radial-gradient(circle, rgba(254, 229, 0, 0.22) 0%, rgba(254, 229, 0, 0) 70%);
    z-index: -1;
    pointer-events: none;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 16px;
    border-radius: 999px;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.22);
    color: #15803d;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: -0.1px;
    margin-bottom: 28px;
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6);
    animation: statusPulse 1.8s ease-out infinite;
  }
  @keyframes statusPulse {
    0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
    70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
    100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
  }

  .contact-title {
    font-size: 28px;
    font-weight: 900;
    color: #0f172a;
    margin: 0 0 12px;
    letter-spacing: -0.5px;
  }
  .contact-desc {
    font-size: 16px;
    color: #64748b;
    line-height: 1.65;
    margin: 0 0 36px;
    word-break: keep-all;
  }

  /* 🌟 클릭 시 Kakao.Channel.chat()(공식 SDK 함수)을 호출하는 버튼. 문구는 자유롭게
     쓸 수 있도록 카카오의 고정 문구 이미지 대신 직접 만들었습니다. */
  .kakao-btn {
    padding: 19px 48px;
    background: linear-gradient(180deg, #FEE500 0%, #FADA0A 100%);
    color: #191600;
    border: none;
    border-radius: 16px;
    font-weight: 900;
    cursor: pointer;
    font-size: 18px;
    letter-spacing: -0.2px;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1), filter 0.25s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    box-shadow: 0 12px 24px -6px rgba(254, 197, 0, 0.5);
  }
  .kakao-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 18px 32px -6px rgba(254, 197, 0, 0.6);
    filter: brightness(1.03);
  }
  .kakao-btn:active {
    transform: translateY(-1px);
  }
  .kakao-icon {
    display: inline-flex;
    flex-shrink: 0;
  }

  .hours-text {
    margin: 18px 0 0;
    font-size: 13.5px;
    color: #94a3b8;
    font-weight: 600;
    letter-spacing: -0.1px;
  }
  .hours-text strong {
    color: #475569;
  }

  .divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(226, 232, 240, 0.9), transparent);
    margin: 40px 0 28px;
  }

  .quick-links {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    text-align: left;
  }
  .quick-link {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 14px;
    width: 100%;
    padding: 16px 18px;
    background: rgba(248, 250, 252, 0.7);
    border: 1px solid rgba(226, 232, 240, 0.7);
    border-radius: 16px;
    text-decoration: none;
    box-sizing: border-box;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .quick-link:hover {
    background: #ffffff;
    border-color: rgba(203, 213, 225, 0.9);
    box-shadow: 0 8px 20px -6px rgba(15, 23, 42, 0.08);
    transform: translateY(-2px);
  }
  .quick-link-icon {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    border-radius: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .quick-link:hover .quick-link-icon {
    transform: scale(1.06);
  }
  .quick-link-icon.icon-indigo {
    background: linear-gradient(135deg, #818cf8 0%, #4f46e5 100%);
    box-shadow: 0 8px 16px -6px rgba(79, 70, 229, 0.45), inset 0 1px 1px rgba(255,255,255,0.35);
  }
  .quick-link-icon.icon-emerald {
    background: linear-gradient(135deg, #34d399 0%, #059669 100%);
    box-shadow: 0 8px 16px -6px rgba(5, 150, 105, 0.4), inset 0 1px 1px rgba(255,255,255,0.35);
  }
  .quick-link-text {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .quick-link-text strong {
    font-size: 15px;
    font-weight: 800;
    color: #1e293b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .quick-link-text em {
    font-style: normal;
    font-size: 12.5px;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .quick-link-arrow {
    font-size: 22px;
    color: #cbd5e1;
    font-weight: 400;
    flex-shrink: 0;
    line-height: 1;
  }

  @media (max-width: 768px) {
    .contact-page-wrap { margin-top: 12px; }
    .contact-container { padding: 44px 22px 32px; border-radius: 24px; }
    .contact-title { font-size: 22px; margin-bottom: 10px; }
    .contact-desc { font-size: 15px; margin-bottom: 28px; }
    .kakao-btn { width: 100%; font-size: 16px; padding: 17px 20px; }
    .divider { margin: 32px 0 22px; }
  }
`;
