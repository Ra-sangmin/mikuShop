'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMikuAlert } from '@/app/context/MikuAlertContext';

export default function FindPasswordPage() {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false); // 🌟 메일 발송 완료 상태
  const [loading, setLoading] = useState(false);
  const { showAlert } = useMikuAlert();

  const handleFindPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      showAlert("아이디를 입력해주세요.", "warning");
      return;
    }

    if (!email) {
      showAlert("가입 시 등록한 이메일을 입력해주세요.", "warning");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAlert("올바른 이메일 형식이 아닙니다.", "warning");
      return;
    }

    setLoading(true);

    try {
      // 🌟 [TODO] 실제 백엔드 API 연동 (임시 비밀번호 발송 API)
      // const res = await fetch('/api/auth/find-password', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ userId, email })
      // });
      // const data = await res.json();
      //
      // if (data.success) {
      //   setIsSent(true);
      // } else {
      //   showAlert(data.message || "일치하는 회원 정보가 없습니다.", "error");
      // }

      // --- 프론트엔드 임시 시뮬레이션 로직 ---
      setTimeout(() => {
        setIsSent(true);
        setLoading(false);
      }, 800);

    } catch (error) {
      console.error("비밀번호 찾기 중 오류 발생:", error);
      showAlert("처리 중 오류가 발생했습니다. 다시 시도해주세요.", "error");
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-card fade-in-up">
        
        <div className="login-header">
          <h1 className="login-title">비밀번호 찾기</h1>
          <p className="login-subtitle">
            {!isSent 
              ? '가입하신 아이디와 이메일 주소를 입력해주세요.' 
              : '메일 발송이 완료되었습니다.'}
          </p>
        </div>

        {!isSent ? (
          <form onSubmit={handleFindPassword} className="fade-in-up">
            <div className="input-group">
              <label className="input-label">아이디</label>
              <input 
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)} 
                placeholder="아이디 입력"
                className="login-input" 
                autoFocus 
              />
            </div>

            <div className="input-group">
              <label className="input-label">이메일 주소</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="example@mail.com"
                className="login-input" 
              />
            </div>

            <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: '12px' }}>
              {loading ? '처리 중...' : '임시 비밀번호 발송'}
            </button>
          </form>
        ) : (
          <div className="fade-in-up">
            {/* 🌟 성공 시 보여줄 결과 박스 */}
            <div className="result-box">
              <span className="result-label" style={{ color: '#03C75A' }}>✓ 확인 완료</span>
              <strong className="result-id" style={{ fontSize: '18px', lineHeight: '1.6', color: '#0f172a' }}>
                입력하신 이메일 주소로<br />
                <span style={{ color: '#ff4b2b' }}>임시 비밀번호</span>를 발송했습니다.
              </strong>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '16px', lineHeight: '1.5' }}>
                로그인 후 마이페이지에서<br />비밀번호를 반드시 변경해주세요.
              </p>
            </div>

            <Link href="/login" className="submit-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              로그인하러 가기
            </Link>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <Link href="/find-id" className="utility-link" style={{ fontSize: '14px' }}>
                아이디가 기억나지 않으신가요?
              </Link>
            </div>
          </div>
        )}

        {!isSent && (
          <div className="login-footer">
            <Link href="/login" className="utility-link" style={{ fontSize: '15px', fontWeight: '700' }}>
              ← 로그인 화면으로 돌아가기
            </Link>
          </div>
        )}

      </div>

      <style>{`
        /* 🌟 아이디 찾기와 동일한 프리미엄 디자인 시스템 공유 */
        .login-page-wrapper { 
          min-height: 100vh; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          background: radial-gradient(circle at 50% -20%, #f8fafc 0%, #e2e8f0 100%);
          padding: 40px 20px; 
          font-family: 'Pretendard', sans-serif;
        }
        
        .login-card { 
          width: 100%; 
          max-width: 440px; 
          padding: 56px 48px; 
          background: #ffffff; 
          border-radius: 32px; 
          box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.05), 0 4px 24px rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(226, 232, 240, 0.8);
        }

        .login-header { text-align: center; margin-bottom: 40px; }
        .login-title { font-size: 28px; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
        .login-subtitle { color: #64748b; margin-top: 12px; font-size: 15px; font-weight: 500; }
        
        .input-group { margin-bottom: 28px; }
        .input-label { display: block; font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 10px; }
        
        .login-input { 
          width: 100%; 
          padding: 18px 20px; 
          border-radius: 16px; 
          border: 1px solid #e2e8f0; 
          background-color: #f8fafc;
          font-size: 16px; 
          color: #0f172a;
          outline: none; 
          box-sizing: border-box; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
        }
        .login-input::placeholder { color: #94a3b8; font-weight: 500; }
        .login-input:hover { background-color: #f1f5f9; }
        .login-input:focus { 
          background-color: #ffffff;
          border-color: #ff4b2b; 
          box-shadow: 0 0 0 4px rgba(255, 75, 43, 0.08); 
        }

        .submit-btn { 
          width: 100%; 
          padding: 18px; 
          background-color: #ff4b2b;
          color: #fff; 
          border-radius: 16px; 
          border: none; 
          font-size: 16px; 
          font-weight: 800; 
          cursor: pointer; 
          box-shadow: 0 8px 20px rgba(255, 75, 43, 0.15);
          transform: translateY(0);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
        }
        .submit-btn:hover:not(:disabled) { 
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(255, 75, 43, 0.25);
          background-color: #f03e1e; 
        }
        .submit-btn:disabled {
          background-color: #cbd5e1;
          cursor: not-allowed;
          box-shadow: none;
        }

        .login-footer { margin-top: 40px; padding-top: 24px; text-align: center; }
        .utility-link { color: #64748b; font-weight: 600; text-decoration: none; transition: color 0.2s; }
        .utility-link:hover { color: #0f172a; }

        .result-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 36px 24px;
          text-align: center;
          margin-bottom: 32px;
        }
        .result-label {
          display: block;
          font-size: 14px;
          font-weight: 800;
          margin-bottom: 12px;
        }
        .result-id {
          display: block;
          letter-spacing: -0.5px;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}