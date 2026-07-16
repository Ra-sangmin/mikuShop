'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn, getSession } from "next-auth/react";
import { useMikuAlert } from '@/app/context/MikuAlertContext';

export default function LoginPage() {
  // ==========================================
  // 🧠 1. 비즈니스 로직 (Logic)
  // ==========================================
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

  // ==========================================
  // 🖥️ 2. 화면 렌더링 (View)
  // ==========================================
  return (
    <div className="login-page-wrapper">
      <div className="login-card">
        
        <div className="login-header">
          <Link href="/">
            <img src="/images/logo.png" alt="Logo" className="login-logo" />
          </Link>
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

        {/* 🌟 1. 아이디/비밀번호 찾기를 가로로 정렬하여 로그인 버튼 밑에 밀착 */}
        <div className="utility-wrapper">
          <button className="utility-btn">아이디 찾기</button>
          <span className="utility-separator">|</span>
          <button className="utility-btn">비밀번호 찾기</button>
        </div>

        {/* 🌟 2. 소셜 로그인 구분선 */}
        <div className="login-divider">
          <div className="divider-line"></div>
          <span className="divider-text">또는 간편 로그인</span>
          <div className="divider-line"></div>
        </div>

        {/* 🌟 3. 간편 로그인 버튼들 */}
        <button onClick={() => signIn('kakao', { callbackUrl: '/' })} className="social-btn kakao-btn">
          <span className="social-icon kakao-icon">K</span> 카카오로 시작하기
        </button>

        <button onClick={() => signIn('naver', { callbackUrl: '/' })} className="social-btn naver-btn">
          <span className="social-icon naver-icon">N</span> 네이버로 시작하기
        </button>

        {/* 🌟 4. 회원가입 유도를 카드의 가장 하단으로 분리하여 밸런스 고정 */}
        <div className="login-footer">
          계정이 없으신가요? <Link href="/register" className="register-link">회원가입</Link>
        </div>

      </div>

      {/* ==========================================
          🎨 3. 순수 CSS 스타일 정의 (Style)
          ========================================== */}
      <style>{`
        .login-page-wrapper {
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f8fafc;
          padding: 40px 20px;
        }
        
        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 40px;
          background-color: #fff;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
        }

        .login-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .login-logo {
          height: 60px;
          margin-bottom: 20px;
        }

        .login-title {
          font-size: 24px;
          font-weight: bold;
          color: #1e293b;
          margin: 0;
        }

        .login-subtitle {
          color: #64748b;
          margin-top: 8px;
          font-size: 14px;
        }

        .input-group {
          margin-bottom: 20px;
        }

        .input-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 8px;
        }

        .login-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          font-size: 15px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }

        .login-input:focus {
          border-color: #ff4b2b;
        }

        .submit-btn {
          width: 100%;
          padding: 14px;
          background-color: #ff4b2b;
          color: #fff;
          border-radius: 8px;
          border: none;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .submit-btn:hover {
          background-color: #e63e1f;
        }

        /* 🌟 아이디/비밀번호 찾기 영역 스타일 */
        .utility-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-top: 16px;
          gap: 12px;
        }

        .utility-btn {
          background: none;
          border: none;
          color: #64748b;
          font-size: 13px;
          cursor: pointer;
          padding: 0;
        }

        .utility-btn:hover {
          color: #475569;
          text-decoration: underline;
        }

        .utility-separator {
          color: #cbd5e1;
          font-size: 12px;
        }

        /* 🌟 간편 로그인 구분선 여백 조정 */
        .login-divider {
          display: flex;
          align-items: center;
          margin: 30px 0;
          color: #94a3b8;
          font-size: 12px;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background-color: #e2e8f0;
        }

        .divider-text {
          padding: 0 10px;
        }

        .social-btn {
          width: 100%;
          padding: 14px;
          border-radius: 8px;
          border: none;
          font-size: 15px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 10px;
          transition: filter 0.2s;
        }

        .social-btn:hover {
          filter: brightness(0.95);
        }

        .kakao-btn {
          background-color: #FEE500;
          color: #000;
        }

        .naver-btn {
          background-color: #03C75A;
          color: #fff;
        }

        .social-icon {
          font-size: 18px;
          font-weight: 900;
        }

        .naver-icon {
          font-family: Arial, sans-serif;
        }

        /* 🌟 회원가입 푸터 스타일 (상단에 얇은 선을 추가해 공간 분리) */
        .login-footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #f1f5f9;
          text-align: center;
          font-size: 14px;
          color: #64748b;
        }

        .register-link {
          color: #ff4b2b;
          font-weight: bold;
          margin-left: 8px;
          text-decoration: none;
        }

        .register-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}