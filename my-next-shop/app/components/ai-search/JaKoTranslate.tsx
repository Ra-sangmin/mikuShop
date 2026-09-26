'use client';

// 🈯 구글 웹 번역(일본어 → 한국어) — 몰 페이지(GlobalLayout)와 같은 설정
//
// 상세 패널은 일본어 원문(상품명·설명)을 그대로 그리고, 이 위젯이 화면에서 한국어로 바꿉니다.
// 번역하면 안 되는 곳(이미 한국어인 화면 글자, 가격 등)은 notranslate 로 막아 두었습니다.

import { useEffect } from 'react';
import Script from 'next/script';

/** 구글 번역 위젯이 window 에 붙이는 것들 (쓰는 부분만) */
type TranslateWindow = Window & {
  googleTranslateElementInit?: () => void;
  google?: {
    translate: {
      TranslateElement: {
        new (opts: Record<string, unknown>, id: string): unknown;
        InlineLayout: { SIMPLE: unknown };
      };
    };
  };
};

export default function JaKoTranslate() {
  useEffect(() => {
    const cookieValue = '/ja/ko';
    document.cookie = `googtrans=${cookieValue}; path=/;`;
    document.cookie = `googtrans=${cookieValue}; path=/; domain=${window.location.hostname};`;

    const w = window as TranslateWindow;
    w.googleTranslateElementInit = () => {
      const g = w.google;
      if (!g) return;
      new g.translate.TranslateElement(
        {
          pageLanguage: 'ja',
          includedLanguages: 'ko',
          layout: g.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: true,
        },
        'google_translate_element',
      );
    };
  }, []);

  return (
    <>
      <Script src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" strategy="afterInteractive" />
      {/* 위젯은 화면 밖으로 치워 둡니다(쿠키로 자동 번역).
          ⚠️ display: none 으로 숨기면 처음 한 번만 번역하고, 나중에 뜨는 상세 패널은 번역하지 않았습니다. */}
      <div
        id="google_translate_element"
        aria-hidden
        style={{ position: 'absolute', left: -9999, top: 0, width: 1, height: 1, overflow: 'hidden' }}
      />
    </>
  );
}
