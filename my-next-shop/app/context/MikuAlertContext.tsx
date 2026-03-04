"use client";
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type AlertType = 'success' | 'error' | 'warning';

interface MikuAlertContextType {
  showAlert: (message: string, type?: AlertType) => void;
}

const MikuAlertContext = createContext<MikuAlertContextType | undefined>(undefined);

export function MikuAlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<{ message: string, type: AlertType } | null>(null);

  const showAlert = useCallback((message: string, type: AlertType = 'warning') => {
    setAlert({ message, type });
  }, []);

  const closeAlert = useCallback(() => {
    setAlert(null);
  }, []);

  return (
    <MikuAlertContext.Provider value={{ showAlert }}>
      {children}
      {alert && (
        <MikuAlertComponent 
          message={alert.message} 
          type={alert.type} 
          onClose={closeAlert} 
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

function MikuAlertComponent({ message, type, onClose }: { message: string, type: AlertType, onClose: () => void }) {
  // 정보 확인을 위해 자동 닫기 시간을 5초로 조금 늘리거나, 
  // 수취인 정보일 경우 사용자가 직접 닫게 하려면 아래 Effect를 수정할 수 있습니다.
  React.useEffect(() => {
    const timer = setTimeout(onClose, 5000); // 3초 -> 5초로 연장
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: { bg: '#f0fdf4', border: '#22c55e', text: '#15803d', icon: '✅' },
    error: { bg: '#fef2f2', border: '#ef4444', text: '#b91c1c', icon: '❌' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#b45309', icon: '⚠️' }
  };

  const style = colors[type];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      pointerEvents: 'auto'
    }}>
      <div style={{
        backgroundColor: style.bg,
        border: `2px solid ${style.border}`,
        color: style.text,
        padding: '30px 40px',
        borderRadius: '24px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        fontWeight: 'bold',
        fontSize: '17px',
        minWidth: '350px',
        maxWidth: '90%',
        animation: 'mikuAlertPopIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <style jsx global>{`
          @keyframes mikuAlertPopIn {
            0% { transform: scale(0.8); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
        
        <span style={{ fontSize: '40px' }}>{style.icon}</span>
        
        {/* 🌟 수정된 메시지 영역 */}
        <div style={{ 
          lineHeight: '1.7', 
          whiteSpace: 'pre-wrap',  // 👈 핵심: \n 문자를 실제 줄바꿈으로 렌더링
          wordBreak: 'break-word', // 👈 단어 단위로 줄바꿈
          textAlign: message.includes('\n') ? 'left' : 'center', // 👈 여러 줄일 경우 왼쪽 정렬로 가독성 확보
          width: '100%',
          padding: '0 10px'
        }}>
          {message}
        </div>

        <button 
          onClick={onClose} 
          style={{ 
            marginTop: '10px',
            padding: '12px 40px',
            backgroundColor: style.border,
            color: '#fff',
            border: 'none',
            borderRadius: '100px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: '900',
            transition: 'all 0.2s',
            boxShadow: `0 4px 10px ${style.border}44`
          }}
          onMouseEnter={e => { 
            e.currentTarget.style.transform = 'translateY(-2px)'; 
            e.currentTarget.style.boxShadow = `0 6px 15px ${style.border}66`; 
          }}
          onMouseLeave={e => { 
            e.currentTarget.style.transform = 'translateY(0)'; 
            e.currentTarget.style.boxShadow = `0 4px 10px ${style.border}44`; 
          }}
        >
          확인
        </button>
      </div>
    </div>
  );
}