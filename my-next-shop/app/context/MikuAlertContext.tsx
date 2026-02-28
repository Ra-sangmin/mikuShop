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
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000);
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
        padding: '30px 50px',
        borderRadius: '24px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        fontWeight: 'bold',
        fontSize: '18px',
        minWidth: '350px',
        maxWidth: '90%',
        textAlign: 'center',
        animation: 'mikuAlertPopIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <style jsx global>{`
          @keyframes mikuAlertPopIn {
            0% { transform: scale(0.8); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
        <span style={{ fontSize: '45px', marginBottom: '5px' }}>{style.icon}</span>
        <div style={{ lineHeight: '1.6', wordBreak: 'keep-all' }}>{message}</div>
        <button 
          onClick={onClose} 
          style={{ 
            marginTop: '15px',
            padding: '10px 30px',
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
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 15px ${style.border}66`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 10px ${style.border}44`; }}
        >
          확인
        </button>
      </div>
    </div>
  );
}
