"use client";
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type AlertType = 'success' | 'error' | 'warning';

interface MikuAlertContextType {
  showAlert: (message: string, type?: AlertType) => void;
  // 🌟 Confirm 기능 추가
  showConfirm: (message: string) => Promise<boolean>;
}

const MikuAlertContext = createContext<MikuAlertContextType | undefined>(undefined);

export function MikuAlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<{ message: string, type: AlertType, isConfirm?: boolean } | null>(null);
  // 🌟 Promise 해결을 위한 resolve 보관
  const [confirmResolve, setConfirmResolve] = useState<((value: boolean) => void) | null>(null);

  const showAlert = useCallback((message: string, type: AlertType = 'warning') => {
    setAlert({ message, type });
  }, []);

  // 🌟 Confirm 호출 함수
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

// 🌟 Component Props 인터페이스 정의
interface MikuAlertComponentProps {
  message: string;
  type: AlertType;
  isConfirm?: boolean;
  onClose: (result: boolean) => void;
}

function MikuAlertComponent({ message, type, isConfirm, onClose }: MikuAlertComponentProps) {
  // Confirm 모드일 때는 자동 닫기를 비활성화해야 합니다.
  React.useEffect(() => {
    if (isConfirm) return;
    const timer = setTimeout(() => onClose(false), 5000);
    return () => clearTimeout(timer);
  }, [onClose, isConfirm]);

  const colors = {
    success: { bg: '#f0fdf4', border: '#22c55e', text: '#15803d', icon: '✅' },
    error: { bg: '#fef2f2', border: '#ef4444', text: '#b91c1c', icon: '❌' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#b45309', icon: '⚠️' }
  };

  const style = colors[type as AlertType];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999, pointerEvents: 'auto',
    }}>
      <div style={{
        backgroundColor: style.bg, border: `2px solid ${style.border}`,
        color: style.text, padding: '40px', borderRadius: '32px',
        boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.4)', display: 'flex',
        flexDirection: 'column', alignItems: 'center', gap: '24px',
        minWidth: '380px', maxWidth: '500px', width: '90%',
        animation: 'mikuAlertPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxSizing: 'border-box'
      }}>
        <span style={{ fontSize: '50px' }}>{style.icon}</span>
        
        <div style={{ 
          lineHeight: '1.6', whiteSpace: 'pre-wrap', textAlign: 'center', 
          fontSize: '18px', fontWeight: '700', wordBreak: 'keep-all' 
        }}>
          {message}
        </div>

        {/* 🌟 버튼 컨테이너: Flex 방향 유지하며 순서만 변경 */}
        <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center' }}>
          
          {/* 1. 확인 버튼 (왼쪽) */}
          <button 
            onClick={() => onClose(true)} 
            style={{ 
              flex: 1,
              maxWidth: isConfirm ? '140px' : '200px',
              padding: '14px',
              backgroundColor: style.border,
              color: '#fff',
              border: 'none',
              borderRadius: '16px',
              cursor: 'pointer',
              fontWeight: '900',
              fontSize: '16px',
              boxShadow: `0 8px 20px ${style.border}44`,
              transition: 'transform 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            확인
          </button>

          {/* 2. 취소 버튼 (오른쪽 - Confirm 모드일 때만 표시) */}
          {isConfirm && (
            <button 
              onClick={() => onClose(false)} 
              style={{ 
                flex: 1,
                maxWidth: '140px',
                padding: '14px',
                backgroundColor: '#e2e8f0',
                color: '#475569',
                border: 'none',
                borderRadius: '16px',
                cursor: 'pointer',
                fontWeight: '900',
                fontSize: '16px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#cbd5e1'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
            >
              취소
            </button>
          )}

        </div>
      </div>
    </div>
  );
}