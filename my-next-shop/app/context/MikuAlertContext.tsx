"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';

// ==========================================
// 🎨 1. CSS 스타일 시스템
// - 흰 카드 + 유형별 상단 액센트 라인 + 그라데이션 아이콘 배지
// - 알림(alert)은 5초 뒤 자동으로 닫히며, 하단 진행 바로 남은 시간을 보여줍니다.
// - ⚠️ color-mix()는 이 프로젝트 CSS 빌드에서 오류를 내므로 쓰지 않습니다.
// - 채우기 색은 흰 글씨 대비(시작 4:1 이상, 끝 5.5:1 이상)에 맞춘 값입니다.
// ==========================================
const ALERT_AUTO_CLOSE_MS = 5000;

const alertStyles = `
  @keyframes mikuAlertFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes mikuAlertPopIn {
    0% { opacity: 0; transform: translateY(18px) scale(0.96); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes mikuAlertIconIn {
    0% { transform: scale(0.6); opacity: 0; }
    60% { transform: scale(1.08); opacity: 1; }
    100% { transform: scale(1); }
  }
  @keyframes mikuAlertProgress { from { transform: scaleX(1); } to { transform: scaleX(0); } }

  .miku-alert-overlay {
    position: fixed; inset: 0;
    background: rgba(17, 20, 30, 0.55); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px; box-sizing: border-box;
    z-index: 99999; pointer-events: auto;
    animation: mikuAlertFadeIn 0.2s ease;
    font-family: 'Pretendard', "Noto Sans KR", sans-serif;
  }

  .miku-alert-box {
    --ma-from: #d4781f; --ma-to: #9a5210; --ma-accent: #9a5210; --ma-soft: #fff6ea; --ma-line: #f6dcc8; --ma-shadow: rgba(154, 82, 16, 0.45);
    position: relative; overflow: hidden;
    width: 100%; max-width: 440px;
    padding: 36px 32px 28px; border-radius: 28px;
    background: #ffffff; color: #111827;
    border: 1px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08), 0 30px 70px -24px rgba(15, 18, 30, 0.6);
    display: flex; flex-direction: column; align-items: center; gap: 18px;
    animation: mikuAlertPopIn 0.38s cubic-bezier(0.16, 1, 0.3, 1);
    box-sizing: border-box; outline: none;
  }
  .miku-alert-box.success { --ma-from: #2f9a72; --ma-to: #23845f; --ma-accent: #1f7a4a; --ma-soft: #ecfdf3; --ma-line: #c6ecd5; --ma-shadow: rgba(35, 132, 95, 0.45); }
  .miku-alert-box.error   { --ma-from: #d64545; --ma-to: #b42318; --ma-accent: #b42318; --ma-soft: #fef3f2; --ma-line: #f3c7c1; --ma-shadow: rgba(180, 35, 24, 0.45); }
  .miku-alert-box.warning { --ma-from: #d4781f; --ma-to: #9a5210; --ma-accent: #9a5210; --ma-soft: #fff6ea; --ma-line: #f6dcc8; --ma-shadow: rgba(154, 82, 16, 0.45); }

  /* 상단 액센트 라인 + 은은한 배경 광채 */
  .miku-alert-box::before {
    content: ''; position: absolute; left: 0; right: 0; top: 0; height: 3px;
    background: linear-gradient(90deg, rgba(255,255,255,0) 0%, var(--ma-from) 20%, var(--ma-to) 50%, var(--ma-from) 80%, rgba(255,255,255,0) 100%);
  }
  .miku-alert-glow {
    position: absolute; left: 50%; top: -120px; width: 320px; height: 240px; transform: translateX(-50%);
    background: radial-gradient(circle, var(--ma-soft) 0%, rgba(255,255,255,0) 70%);
    pointer-events: none;
  }

  .miku-alert-icon-badge {
    position: relative; width: 64px; height: 64px; border-radius: 20px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 26px; color: #fff;
    background: linear-gradient(135deg, var(--ma-from) 0%, var(--ma-to) 100%);
    box-shadow: 0 16px 30px -12px var(--ma-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.35);
    animation: mikuAlertIconIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both;
  }
  .miku-alert-icon-badge::after {
    content: ''; position: absolute; inset: -6px; border-radius: 26px;
    border: 1px solid var(--ma-line);
  }

  .miku-alert-text { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; }
  .miku-alert-eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 11px; border-radius: 999px;
    font-size: 11px; font-weight: 800; letter-spacing: 0.14em;
    color: var(--ma-accent); background: var(--ma-soft); border: 1px solid var(--ma-line);
  }
  .miku-alert-message {
    line-height: 1.65; white-space: pre-wrap; text-align: center; width: 100%;
    font-size: 17px; font-weight: 700; color: #111827; word-break: keep-all; letter-spacing: -0.2px;
  }
  .miku-alert-message a { color: var(--ma-accent); }

  .miku-alert-btn-group {
    position: relative; display: flex; gap: 8px; width: 100%; justify-content: center; margin-top: 4px;
  }
  .miku-alert-btn-confirm,
  .miku-alert-btn-cancel {
    flex: 1; height: 50px; padding: 0 18px; border-radius: 15px; border: 1px solid transparent;
    cursor: pointer; font-weight: 800; font-size: 15px; font-family: inherit; letter-spacing: -0.2px;
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease, background 0.2s ease;
  }
  .miku-alert-btn-confirm {
    color: #ffffff;
    background: linear-gradient(135deg, var(--ma-from) 0%, var(--ma-to) 100%);
    box-shadow: 0 12px 24px -12px var(--ma-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.22);
  }
  .miku-alert-btn-confirm:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.05); }
  .miku-alert-btn-confirm:active:not(:disabled) { transform: translateY(0); }
  .miku-alert-btn-confirm:focus-visible,
  .miku-alert-btn-cancel:focus-visible { outline: 3px solid var(--ma-line); outline-offset: 2px; }
  .miku-alert-btn-confirm.mode-alert { max-width: 220px; }
  .miku-alert-btn-confirm.mode-confirm { max-width: 190px; }
  .miku-alert-btn-confirm:disabled { background: #d1d5db; color: #4b5563; box-shadow: none; cursor: not-allowed; }
  .miku-alert-btn-cancel {
    max-width: 150px; background: #ffffff; color: #374151; border-color: #e2e5eb;
  }
  .miku-alert-btn-cancel:hover { background: #f8f9fb; border-color: #cfd4dc; color: #111827; }

  /* 자동 닫힘 진행 바 (alert 전용) */
  .miku-alert-progress {
    position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: #f0f1f4;
  }
  .miku-alert-progress span {
    display: block; height: 100%; transform-origin: left center;
    background: linear-gradient(90deg, var(--ma-from) 0%, var(--ma-to) 100%);
    animation: mikuAlertProgress ${ALERT_AUTO_CLOSE_MS}ms linear forwards;
  }
  .miku-alert-box:hover .miku-alert-progress span { animation-play-state: paused; }

  .miku-alert-close {
    position: absolute; top: 14px; right: 14px; width: 32px; height: 32px; border-radius: 50%;
    border: 1px solid #e6e8ee; background: #ffffff; color: #6b7280; cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 13px;
    transition: all 0.2s ease;
  }
  .miku-alert-close:hover { background: #111827; border-color: #111827; color: #ffffff; }

  /* 📱 모바일 */
  @media (max-width: 768px) {
    /* 🌟 모바일에서도 화면 가운데에 표시 (예전엔 flex-end 로 하단 시트처럼 붙어 있었음) */
    .miku-alert-overlay { padding: 16px; align-items: center; padding-bottom: max(16px, env(safe-area-inset-bottom, 0px)); }
    .miku-alert-box { max-width: 420px; padding: 30px 20px 24px; border-radius: 24px; gap: 14px; }
    .miku-alert-icon-badge { width: 54px; height: 54px; border-radius: 17px; font-size: 22px; }
    .miku-alert-icon-badge::after { inset: -5px; border-radius: 22px; }
    .miku-alert-message { font-size: 15px; }
    .miku-alert-btn-confirm, .miku-alert-btn-cancel { height: 46px; font-size: 14px; border-radius: 13px; }
    .miku-alert-btn-confirm.mode-alert { max-width: none; }
    .miku-alert-btn-confirm.mode-confirm, .miku-alert-btn-cancel { max-width: none; }
  }
`;

// ==========================================
// 🧠 2. 타입 정의 및 Context 로직
// ==========================================
type AlertType = 'success' | 'error' | 'warning';

interface MikuAlertContextType {
  showAlert: (message: string, type?: AlertType) => void;
  showConfirm: (message: React.ReactNode) => Promise<boolean>;
  // 🌟 showConfirm에 넘긴 커스텀 콘텐츠(예: 입찰 금액 입력 폼)가 자체 검증 상태에 따라
  // "확인" 버튼을 비활성화할 수 있도록 노출하는 함수입니다.
  setConfirmDisabled: (disabled: boolean) => void;
}

const MikuAlertContext = createContext<MikuAlertContextType | undefined>(undefined);

export function MikuAlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<{ message: React.ReactNode, type: AlertType, isConfirm?: boolean } | null>(null);
  const [confirmResolve, setConfirmResolve] = useState<((value: boolean) => void) | null>(null);
  const [confirmDisabled, setConfirmDisabled] = useState(false);

  const showAlert = useCallback((message: string, type: AlertType = 'warning') => {
    setAlert({ message, type });
  }, []);

  const showConfirm = useCallback((message: React.ReactNode): Promise<boolean> => {
    setConfirmDisabled(false);
    return new Promise((resolve) => {
      setAlert({ message, type: 'warning', isConfirm: true });
      setConfirmResolve(() => resolve);
    });
  }, []);

  const closeAlert = useCallback((result: boolean = false) => {
    if (confirmResolve) {
      confirmResolve(result);
      setConfirmResolve(null);
    }
    setAlert(null);
    setConfirmDisabled(false);
  }, [confirmResolve]);

  return (
    <MikuAlertContext.Provider value={{ showAlert, showConfirm, setConfirmDisabled }}>
      {children}
      {alert && (
        <MikuAlertComponent
          message={alert.message}
          type={alert.type}
          isConfirm={alert.isConfirm}
          confirmDisabled={confirmDisabled}
          onClose={(res: boolean) => closeAlert(res)}
        />
      )}
    </MikuAlertContext.Provider>
  );
}

export function useMikuAlert() {
  const context = useContext(MikuAlertContext);
  if (context === undefined) {
    throw new Error('useMikuAlert must be used within a MikuAlertProvider');
  }
  return context;
}

// ==========================================
// 🖥️ 3. UI 렌더링 컴포넌트
// ==========================================
interface MikuAlertComponentProps {
  message: React.ReactNode;
  type: AlertType;
  isConfirm?: boolean;
  confirmDisabled?: boolean;
  onClose: (result: boolean) => void;
}

const TYPE_META: Record<AlertType, { icon: string; label: string; confirmLabel: string }> = {
  success: { icon: 'fa-check', label: '완료', confirmLabel: '확인' },
  error: { icon: 'fa-xmark', label: '오류', confirmLabel: '확인' },
  warning: { icon: 'fa-triangle-exclamation', label: '알림', confirmLabel: '확인' },
};

function MikuAlertComponent({ message, type, isConfirm, confirmDisabled, onClose }: MikuAlertComponentProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const meta = TYPE_META[type];
  const eyebrow = isConfirm ? '확인이 필요해요' : meta.label;

  // 🌟 일반 Alert는 5초 뒤 자동 닫기 (Confirm은 자동 닫기 방지). 마우스를 올리면 잠시 멈춥니다.
  useEffect(() => {
    if (isConfirm) return;
    let remaining = ALERT_AUTO_CLOSE_MS;
    let startedAt = Date.now();
    let timer = setTimeout(() => onClose(false), remaining);
    const el = boxRef.current;
    const pause = () => { clearTimeout(timer); remaining -= Date.now() - startedAt; };
    const resume = () => { startedAt = Date.now(); timer = setTimeout(() => onClose(false), Math.max(remaining, 300)); };
    el?.addEventListener('mouseenter', pause);
    el?.addEventListener('mouseleave', resume);
    return () => {
      clearTimeout(timer);
      el?.removeEventListener('mouseenter', pause);
      el?.removeEventListener('mouseleave', resume);
    };
  }, [onClose, isConfirm]);

  // 🌟 키보드: Esc = 닫기(취소), Enter = 확인. 열려 있는 동안 뒤쪽 화면 스크롤을 막습니다.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(false); }
      if (e.key === 'Enter' && !confirmDisabled) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'TEXTAREA' || tag === 'INPUT') return;
        e.preventDefault(); onClose(true);
      }
    };
    document.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    boxRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, confirmDisabled]);

  return (
    <>
      <style>{alertStyles}</style>

      <div className="miku-alert-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(false); }}>
        <div
          ref={boxRef}
          className={`miku-alert-box ${type}`}
          role={isConfirm ? 'alertdialog' : 'alert'}
          aria-modal="true"
          tabIndex={-1}
        >
          <span className="miku-alert-glow" aria-hidden="true" />
          <button type="button" className="miku-alert-close" onClick={() => onClose(false)} aria-label="닫기">
            <i className="fa fa-xmark"></i>
          </button>

          <span className={`miku-alert-icon-badge ${type}`} aria-hidden="true">
            <i className={`fa ${meta.icon}`}></i>
          </span>

          <div className="miku-alert-text">
            <span className="miku-alert-eyebrow">{eyebrow}</span>
            <div className="miku-alert-message">{message}</div>
          </div>

          <div className="miku-alert-btn-group">
            {isConfirm && (
              <button type="button" className="miku-alert-btn-cancel" onClick={() => onClose(false)}>
                취소
              </button>
            )}
            <button
              type="button"
              className={`miku-alert-btn-confirm ${type} ${isConfirm ? 'mode-confirm' : 'mode-alert'}`}
              onClick={() => onClose(true)}
              disabled={!!confirmDisabled}
            >
              {isConfirm && <i className="fa fa-check" style={{ fontSize: 13 }}></i>}
              {meta.confirmLabel}
            </button>
          </div>

          {!isConfirm && (
            <div className="miku-alert-progress" aria-hidden="true"><span /></div>
          )}
        </div>
      </div>
    </>
  );
}
