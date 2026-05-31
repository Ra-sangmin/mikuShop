"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

// ==========================================
// 🎨 1. CSS 스타일 시스템 (모바일 가로 사이즈 대폭 축소)
// ==========================================
const alertStyles = `
  @keyframes mikuAlertPopIn {
    0% { opacity: 0; transform: scale(0.9) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }

  .miku-alert-overlay {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    z-index: 99999; pointer-events: auto;
  }

  .miku-alert-box {
    padding: 40px; border-radius: 32px;
    box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.4); 
    display: flex; flex-direction: column; align-items: center; gap: 24px;
    min-width: 380px; max-width: 500px; width: 90%;
    animation: mikuAlertPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-sizing: border-box;
  }

  /* 🌟 테마별 박스 스타일 지정 */
  .miku-alert-box.success { background-color: #f0fdf4; border: 2px solid #22c55e; color: #15803d; }
  .miku-alert-box.error { background-color: #fef2f2; border: 2px solid #ef4444; color: #b91c1c; }
  .miku-alert-box.warning { background-color: #fffbeb; border: 2px solid #f59e0b; color: #b45309; }

  .miku-alert-icon {
    font-size: 50px;
  }

  .miku-alert-message {
    line-height: 1.6; white-space: pre-wrap; text-align: center; 
    font-size: 18px; font-weight: 700; word-break: keep-all;
  }

  .miku-alert-btn-group {
    display: flex; gap: 12px; width: 100%; justify-content: center;
  }

  .miku-alert-btn-confirm {
    flex: 1; padding: 14px; color: #fff; border: none; border-radius: 16px;
    cursor: pointer; font-weight: 900; font-size: 16px;
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .miku-alert-btn-confirm:hover {
    transform: scale(1.05);
  }

  /* 🌟 테마별 버튼 색상 및 그림자 지정 */
  .miku-alert-btn-confirm.success { background-color: #22c55e; box-shadow: 0 8px 20px rgba(34, 197, 94, 0.25); }
  .miku-alert-btn-confirm.error { background-color: #ef4444; box-shadow: 0 8px 20px rgba(239, 68, 68, 0.25); }
  .miku-alert-btn-confirm.warning { background-color: #f59e0b; box-shadow: 0 8px 20px rgba(245, 158, 11, 0.25); }

  /* 🌟 Confirm 모드 여부에 따른 버튼 최대 너비 지정 */
  .miku-alert-btn-confirm.mode-confirm { max-width: 140px; }
  .miku-alert-btn-confirm.mode-alert { max-width: 200px; }

  .miku-alert-btn-cancel {
    flex: 1; max-width: 140px; padding: 14px; 
    background-color: #e2e8f0; color: #475569; border: none; border-radius: 16px;
    cursor: pointer; font-weight: 900; font-size: 16px;
    transition: background-color 0.2s;
  }
  .miku-alert-btn-cancel:hover {
    background-color: #cbd5e1;
  }

  /* 📱 모바일 환경 반응형 (가로 사이즈 대폭 축소) */
  @media (max-width: 768px) {
    .miku-alert-box {
      min-width: auto;      /* 강제 최소 너비 해제 */
      max-width: 300px;     /* 아무리 커도 300px을 넘지 않도록 제한 */
      width: 75%;           /* 화면의 75%만 차지하게 줄임 (기존 85%) */
      padding: 24px 16px;   /* 좌우 여백을 더 타이트하게 줄임 */
      border-radius: 20px;
      gap: 16px;
    }

    .miku-alert-icon {
      font-size: 32px;      /* 아이콘 크기 더 축소 */
    }

    .miku-alert-message {
      font-size: 14px;      /* 글자 크기 살짝 축소 */
    }

    .miku-alert-btn-group {
      gap: 8px;             
    }

    .miku-alert-btn-confirm,
    .miku-alert-btn-cancel {
      padding: 12px;        
      font-size: 14px;      
      border-radius: 12px;  
    }
  }
`;

// ==========================================
// 🧠 2. 타입 정의 및 Context 로직
// ==========================================
type AlertType = 'success' | 'error' | 'warning';

interface MikuAlertContextType {
  showAlert: (message: string, type?: AlertType) => void;
  showConfirm: (message: React.ReactNode) => Promise<boolean>;
}

const MikuAlertContext = createContext<MikuAlertContextType | undefined>(undefined);

export function MikuAlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<{ message: React.ReactNode, type: AlertType, isConfirm?: boolean } | null>(null);
  const [confirmResolve, setConfirmResolve] = useState<((value: boolean) => void) | null>(null);

  const showAlert = useCallback((message: string, type: AlertType = 'warning') => {
    setAlert({ message, type });
  }, []);

  const showConfirm = useCallback((message: string): Promise<boolean> => {
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
  }, [confirmResolve]);

  return (
    <MikuAlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {alert && (
        <MikuAlertComponent 
          message={alert.message} 
          type={alert.type} 
          isConfirm={alert.isConfirm}
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
  onClose: (result: boolean) => void;
}

function MikuAlertComponent({ message, type, isConfirm, onClose }: MikuAlertComponentProps) {
  // 일반 Alert일 경우 5초 뒤 자동 닫기 (Confirm은 자동 닫기 방지)
  useEffect(() => {
    if (isConfirm) return;
    const timer = setTimeout(() => onClose(false), 5000);
    return () => clearTimeout(timer);
  }, [onClose, isConfirm]);

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };

  return (
    <>
      <style>{alertStyles}</style>

      <div className="miku-alert-overlay">
        {/* 타입에 따른 클래스명 추가 */}
        <div className={`miku-alert-box ${type}`}>
          <span className="miku-alert-icon">{icons[type]}</span>
          
          <div className="miku-alert-message">
            {message}
          </div>

          <div className="miku-alert-btn-group">
            {/* 타입 및 모드에 따른 클래스명 추가 (인라인 스타일 완전 대체) */}
            <button 
              className={`miku-alert-btn-confirm ${type} ${isConfirm ? 'mode-confirm' : 'mode-alert'}`}
              onClick={() => onClose(true)} 
            >
              확인
            </button>

            {/* 취소 버튼 (Confirm 모드일 때만 렌더링) */}
            {isConfirm && (
              <button 
                className="miku-alert-btn-cancel"
                onClick={() => onClose(false)} 
              >
                취소
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}