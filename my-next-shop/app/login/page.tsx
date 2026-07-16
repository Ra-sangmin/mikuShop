'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn, getSession } from "next-auth/react";
import { useMikuAlert } from '@/app/context/MikuAlertContext';

export default function LoginPage() {
  const [userId, setUserId] = useState(''); 
  const [password, setPassword] = useState('');
  const { showAlert } = useMikuAlert();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      showAlert("아이디를 입력해주세요.", "warning");
      return;
    }
    
    if (!password) {
      showAlert("비밀번호를 입력해주세요.", "warning");
      return;
    }

    try {
      const res = await signIn("credentials", {
        userId,
        password,
        redirect: false,
      });

      if (res?.error) {
        if (res.error === "USER_NOT_FOUND" || res.error === "EMAIL_NOT_FOUND") {
          showAlert("존재하지 않는 아이디입니다.", "error");
        } else if (res.error === "PASSWORD_INCORRECT") {
          showAlert("비밀번호가 일치하지 않습니다.", "error");
        } else {
          showAlert("로그인에 실패했습니다. 다시 시도해주세요.", "error");
        }
      } else {
        const session = await getSession();
        const userName = session?.user?.name || "고객";
        showAlert(`${userName}님, 환영합니다!`, "success");

        setTimeout(() => { window.location.href = '/'; }, 1000);
      }
    } catch (error) {
      console.error("로그인 중 오류 발생:", error);
      showAlert("로그인 처리 중 오류가 발생했습니다.", "error");
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-card fade-in-up">
        
        {/* 🌟 로고 이미지가 제거되고 타이틀만 남은 헤더 부분 */}
        <div className="login-header">
          <h1 className="login-title">로그인</h1>
          <p className="login-subtitle">미쿠 서비스 이용을 위해 로그인해주세요.</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">아이디</label>
            <input 
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)} 
              placeholder="아이디를 입력해주세요"
              className="login-input" 
            />
          </div>

          <div className="input-group">
            <label className="input-label">비밀번호</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              className="login-input" 
            />
          </div>

          <button type="submit" className="submit-btn">
            로그인하기
          </button>
        </form>

        <div className="utility-wrapper">
          <Link href="/find-id" className="utility-link">아이디 찾기</Link>
          <span className="utility-separator">|</span>
          <Link href="/find-password" className="utility-link">비밀번호 찾기</Link>
        </div>

        <div className="login-divider">
          <div className="divider-line"></div>
          <span className="divider-text">또는 간편 로그인</span>
          <div className="divider-line"></div>
        </div>

        <button onClick={() => signIn('kakao', { callbackUrl: '/' })} className="social-btn kakao-btn">
          <span className="social-icon kakao-icon">K</span> 카카오로 시작하기
        </button>

        <button onClick={() => signIn('naver', { callbackUrl: '/' })} className="social-btn naver-btn">
          <span className="social-icon naver-icon">N</span> 네이버로 시작하기
        </button>

        <div className="login-footer">
          계정이 없으신가요? <Link href="/register" className="register-link">회원가입</Link>
        </div>

      </div>

      <style>{`
        .login-page-wrapper { 
          min-height: 80vh; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%); 
          padding: 40px 20px; 
          font-family: 'Pretendard', sans-serif;
        }
        
        .login-card { 
          width: 100%; 
          max-width: 420px; 
          padding: 48px 40px; 
          background: rgba(255, 255, 255, 0.95); 
          backdrop-filter: blur(10px);
          border-radius: 24px; 
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.5) inset; 
          border: 1px solid rgba(226, 232, 240, 0.6);
        }

        .login-header { text-align: center; margin-bottom: 36px; }
        .login-title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
        .login-subtitle { color: #64748b; margin-top: 10px; font-size: 14px; }
        
        .input-group { margin-bottom: 24px; }
        .input-label { display: block; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 8px; }
        
        .login-input { 
          width: 100%; 
          padding: 16px 20px; 
          border-radius: 12px; 
          border: 1px solid transparent; 
          background-color: #f1f5f9;
          font-size: 15px; 
          color: #0f172a;
          outline: none; 
          box-sizing: border-box; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
        }
        .login-input::placeholder { color: #94a3b8; font-weight: 500; }
        .login-input:focus { 
          background-color: #ffffff;
          border-color: #ff4b2b; 
          box-shadow: 0 0 0 4px rgba(255, 75, 43, 0.1); 
        }

        .submit-btn { 
          width: 100%; 
          padding: 16px; 
          background: linear-gradient(135deg, #ff4b2b 0%, #e63e1f 100%); 
          color: #fff; 
          border-radius: 12px; 
          border: none; 
          font-size: 16px; 
          font-weight: 800; 
          cursor: pointer; 
          box-shadow: 0 8px 16px rgba(255, 75, 43, 0.2);
          transform: translateY(0);
          transition: all 0.3s ease; 
        }
        .submit-btn:hover { 
          transform: translateY(-2px);
          box-shadow: 0 12px 20px rgba(255, 75, 43, 0.3);
          background: linear-gradient(135deg, #ff5b3f 0%, #ed4322 100%); 
        }

        .utility-wrapper { display: flex; justify-content: center; align-items: center; margin-top: 20px; gap: 16px; }
        .utility-link { color: #64748b; font-size: 13px; font-weight: 500; text-decoration: none; transition: color 0.2s; }
        .utility-link:hover { color: #0f172a; text-decoration: underline; }
        .utility-separator { color: #cbd5e1; font-size: 12px; }

        .login-divider { display: flex; align-items: center; margin: 36px 0 24px 0; color: #94a3b8; font-size: 12px; font-weight: 500; }
        .divider-line { flex: 1; height: 1px; background-color: #e2e8f0; }
        .divider-text { padding: 0 14px; }

        .social-btn { 
          width: 100%; 
          padding: 15px; 
          border-radius: 12px; 
          border: none; 
          font-size: 15px; 
          font-weight: 800; 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 10px; 
          margin-bottom: 12px; 
          transition: all 0.2s ease; 
        }
        .social-btn:hover { transform: translateY(-1px); filter: brightness(0.96); }
        .kakao-btn { background-color: #FEE500; color: #191919; }
        .naver-btn { background-color: #03C75A; color: #ffffff; }
        .social-icon { font-size: 18px; font-weight: 900; }
        .naver-icon { font-family: Arial, sans-serif; }

        .login-footer { margin-top: 36px; padding-top: 24px; border-top: 1px dashed #e2e8f0; text-align: center; font-size: 14px; color: #64748b; }
        .register-link { color: #ff4b2b; font-weight: 800; margin-left: 8px; text-decoration: none; transition: opacity 0.2s; }
        .register-link:hover { text-decoration: underline; opacity: 0.8; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}