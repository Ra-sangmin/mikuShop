'use client';

// 📸 페이지 안에서 바로 여는 카메라 (사진 촬영)
//
//  🐛 <input capture="environment"> 만으로는 일부 휴대폰·브라우저(카카오톡·네이버 앱 안 브라우저,
//     카메라 권한이 없는 크롬 등)가 '촬영'을 무시하고 앨범 고르기 창을 띄웠습니다.
//     그래서 브라우저 카메라(getUserMedia)로 화면 안에서 직접 찍습니다.
//     카메라를 못 쓰는 환경이면 안내와 함께 '기본 카메라 앱으로 찍기'(예전 방식) 버튼을 보여 줍니다.
//     ※ 브라우저 카메라는 https(실서버)에서만 열립니다. http 로 연 개발 서버에서는 예전 방식으로 넘어갑니다.

import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  /** 찍은 사진 (JPEG) */
  onCapture: (file: File) => void;
  /** 브라우저 카메라를 못 쓸 때: 기본 카메라 앱(capture 입력)으로 */
  onFallback: () => void;
};

export function canUseInPageCamera(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;
}

export default function AiCameraSheet({ open, onClose, onCapture, onFallback }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(
          name === 'NotAllowedError' || name === 'SecurityError'
            ? '카메라 사용이 허용되지 않았어요. 브라우저 설정에서 카메라를 허용하거나, 아래 버튼으로 기본 카메라 앱을 열어 주세요.'
            : '이 브라우저에서는 카메라를 바로 열 수 없어요. 아래 버튼으로 기본 카메라 앱을 열어 주세요.',
        );
      }
    })();
    return () => { alive = false; stop(); };
  }, [open, facing, stop]);

  // 열려 있는 동안 뒤 화면이 스크롤되지 않게
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

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
            <p>{error}</p>
            <button type="button" onClick={() => { onClose(); onFallback(); }}>기본 카메라 앱으로 찍기</button>
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
