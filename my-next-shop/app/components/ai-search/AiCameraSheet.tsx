'use client';

// 📸 페이지 안에서 바로 여는 카메라 (사진 촬영)
//
//  🐛 <input capture="environment"> 만으로는 일부 휴대폰·브라우저(카카오톡·네이버 앱 안 브라우저,
//     카메라 권한이 없는 크롬 등)가 '촬영'을 무시하고 앨범 고르기 창을 띄웠습니다.
//     그래서 브라우저 카메라(getUserMedia)로 화면 안에서 직접 찍습니다.
//
//  ⚠️ 웹사이트는 브라우저·휴대폰의 카메라 권한을 대신 켤 수 없습니다. 할 수 있는 건
//     (1) 권한을 '요청'하는 것(브라우저가 허용 창을 띄움) — 이미 '거부'로 저장돼 있으면 창이 다시 뜨지 않음
//     (2) 앱 안 브라우저(카카오톡·네이버·인스타 등)면 크롬으로 이 페이지를 다시 열어 주는 것
//     (3) 거부돼 있으면 손님이 직접 켜는 방법을 안내하는 것
//  ※ 브라우저 카메라는 https(실서버)에서만 열립니다.

import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  /** 찍은 사진 (JPEG) */
  onCapture: (file: File) => void;
  /** 브라우저 카메라를 못 쓸 때: 기본 촬영 입력(capture) — 일부 환경에서는 앨범이 열림 */
  onFallback: () => void;
};

type CamError = { kind: 'denied' | 'unsupported' | 'busy'; inApp: boolean };

export function canUseInPageCamera(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;
}

/** 카카오톡·네이버·인스타그램·페이스북·라인 등 앱 안 브라우저(안드로이드 WebView 포함) */
function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|; wv\)/i.test(ua);
}
const isAndroid = () => typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

/** 안드로이드: 지금 페이지를 크롬으로 다시 열기 (사진 버튼 안내가 뜨도록 ?photo=1) */
function openInChrome() {
  const url = new URL(window.location.href);
  url.searchParams.set('photo', '1');
  const path = url.host + url.pathname + url.search;
  window.location.href = `intent://${path}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url.toString())};end`;
}

export default function AiCameraSheet({ open, onClose, onCapture, onFallback }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<CamError | null>(null);
  const [attempt, setAttempt] = useState(0); // '다시 시도' 누를 때마다 +1 → 권한 요청을 다시 함

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        if (!alive) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => {});
          setReady(true);
        }
      } catch (e) {
        if (!alive) return;
        const name = (e as Error).name;
        const kind: CamError['kind'] =
          name === 'NotAllowedError' || name === 'SecurityError' ? 'denied'
          : name === 'NotReadableError' || name === 'AbortError' ? 'busy'
          : 'unsupported';
        setError({ kind, inApp: isInAppBrowser() });
      }
    })();
    return () => { alive = false; stop(); };
  }, [open, facing, attempt, stop]);

  // 열려 있는 동안 뒤 화면이 스크롤되지 않게
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  const retry = () => { setError(null); setReady(false); setAttempt(a => a + 1); };

  const shoot = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (facing === 'user') { ctx.translate(c.width, 0); ctx.scale(-1, 1); } // 셀카는 보이는 대로
    ctx.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob(
      blob => {
        if (!blob) return;
        stop();
        onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        onClose();
      },
      'image/jpeg',
      0.9,
    );
  };

  if (!open) return null;

  return (
    <div className="ais-cam" role="dialog" aria-modal="true" aria-label="사진 촬영">
      <div className="ais-cam-top">
        <button type="button" className="ais-cam-x" onClick={onClose} aria-label="닫기">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        </button>
        <span className="ais-cam-title">찾고 싶은 상품을 찍어 주세요</span>
        <span className="ais-cam-x-spacer" />
      </div>

      <div className="ais-cam-view">
        <video ref={videoRef} playsInline muted autoPlay className={facing === 'user' ? 'is-mirror' : ''} />
        {!ready && !error && <span className="ais-cam-loading"><span className="ais-send-spin" aria-hidden /> 카메라를 여는 중…</span>}
        {ready && <span className="ais-cam-frame" aria-hidden />}
        {error && (
          <div className="ais-cam-error">
            {error.inApp ? (
              <>
                <strong>이 앱 안에서는 카메라를 열 수 없어요</strong>
                <p>카카오톡·네이버 같은 앱 안 브라우저는 카메라를 막아 두는 경우가 많아요. 크롬에서 열면 바로 찍을 수 있어요.</p>
                {isAndroid() ? (
                  <button type="button" className="is-main" onClick={openInChrome}>크롬으로 열어서 찍기</button>
                ) : (
                  <p className="ais-cam-steps">오른쪽 아래 <b>⋯</b> 또는 <b>공유</b> 버튼 → <b>Safari로 열기</b>를 눌러 주세요.</p>
                )}
              </>
            ) : error.kind === 'denied' ? (
              <>
                <strong>카메라 권한이 꺼져 있어요</strong>
                <p>보안상 사이트가 권한을 대신 켤 수는 없어요. 아래처럼 한 번만 켜 주세요.</p>
                <ol className="ais-cam-steps">
                  <li>주소창 왼쪽 <b>자물쇠(또는 설정) 아이콘</b>을 눌러요</li>
                  <li><b>권한</b> → <b>카메라</b>를 <b>허용</b>으로 바꿔요</li>
                  <li>아래 <b>다시 시도</b>를 눌러요</li>
                </ol>
                <p className="ais-cam-note">그래도 안 되면 휴대폰 <b>설정 → 애플리케이션 → 크롬(사용 중인 브라우저) → 권한 → 카메라</b>도 허용해 주세요.</p>
                <button type="button" className="is-main" onClick={retry}>다시 시도</button>
              </>
            ) : error.kind === 'busy' ? (
              <>
                <strong>카메라를 다른 앱이 쓰고 있어요</strong>
                <p>카메라를 쓰는 다른 앱을 닫고 다시 시도해 주세요.</p>
                <button type="button" className="is-main" onClick={retry}>다시 시도</button>
              </>
            ) : (
              <>
                <strong>이 브라우저에서는 카메라를 바로 열 수 없어요</strong>
                <p>아래 버튼으로 휴대폰 기본 방식으로 사진을 올려 주세요.</p>
              </>
            )}
            <button type="button" className="is-sub" onClick={() => { onClose(); onFallback(); }}>앨범·다른 방법으로 사진 올리기</button>
          </div>
        )}
      </div>

      <div className="ais-cam-bottom">
        <span className="ais-cam-side" />
        <button type="button" className="ais-cam-shutter" onClick={shoot} disabled={!ready} aria-label="촬영">
          <span />
        </button>
        <button
          type="button"
          className="ais-cam-side ais-cam-flip"
          onClick={() => { setReady(false); setFacing(f => (f === 'environment' ? 'user' : 'environment')); }}
          disabled={!!error}
          aria-label="앞·뒤 카메라 바꾸기"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2M20 4v4h-4M4 20v-4h4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
