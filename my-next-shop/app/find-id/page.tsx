'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMikuAlert } from '@/app/context/MikuAlertContext';

export default function FindIdPage() {
  const [email, setEmail] = useState('');
  const [foundId, setFoundId] = useState<string | null>(null);
  const { showAlert } = useMikuAlert();

  const handleFindId = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      showAlert("가입 시 등록한 이메일을 입력해주세요.", "warning");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAlert("올바른 이메일 형식이 아닙니다.", "warning");
      return;
    }

    try {
      const res = await fetch('/api/auth/find-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (data.success) {
        setFoundId(data.maskedId);
      } else {
        showAlert(data.message || "일치하는 회원 정보가 없습니다.", "error");
      }

    } catch (error) {
      console.error("아이디 찾기 중 오류 발생:", error);
      showAlert("처리 중 오류가 발생했습니다. 다시 시도해주세요.", "error");
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-card fade-in-up">
        
        <div className="login-header">
          <h1 className="login-title">아이디 찾기</h1>
          <p className="login-subtitle">
            {!foundId 
              ? '가입 시 등록하신 이메일 주소를 입력해주세요.' 
              : '입력하신 정보와 일치하는 아이디입니다.'}
          </p>
        </div>

        {!foundId ? (
          <form onSubmit={handleFindId} className="fade-in-up">
            <div className="input-group">
              <label className="input-label">이메일 주소</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="example@mail.com"
                className="login-input" 
                autoFocus 
              />
            </div>

            <button type="submit" className="submit-btn" style={{ marginTop: '12px' }}>
              아이디 확인하기
            </button>
          </form>
        ) : (
          <div className="fade-in-up">
            <div className="result-box">
              <span className="result-label">회원님의 아이디</span>
              <strong className="result-id">{foundId}</strong>
            </div>

            <Link href="/login" className="submit-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              로그인하러 가기
            </Link>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <Link href="/find-password" className="utility-link" style={{ fontSize: '14px' }}>
                비밀번호가 기억나지 않으신가요?
              </Link>
            </div>
          </div>
        )}

        {!foundId && (
          <div className="login-footer">
            <Link href="/login" className="utility-link" style={{ fontSize: '15px', fontWeight: '700' }}>
              ← 로그인 화면으로 돌아가기
            </Link>
          </div>
        )}

      </div>

      <style>{`
        /* 🌟 바탕을 더 깊이감 있는 방사형 그라데이션으로 변경 */
        .login-page-wrapper { 
          min-height: 100vh; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          background: radial-gradient(circle at 50% -20%, #f8fafc 0%, #e2e8f0 100%);
          padding: 40px 20px; 
          font-family: 'Pretendard', sans-serif;
        }
        
        /* 🌟 여백 확대 및 그림자 고급화 */
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
        
        /* 🌟 인풋 필드: 조금 더 부드러운 형태와 정교한 포커스 효과 */
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

        /* 🌟 메인 버튼: 깔끔한 솔리드 컬러와 부드러운 호버 트랜지션 */
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
        .submit-btn:hover { 
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(255, 75, 43, 0.25);
          background-color: #f03e1e; 
        }

        .login-footer { margin-top: 40px; padding-top: 24px; text-align: center; }
        .utility-link { color: #64748b; font-weight: 600; text-decoration: none; transition: color 0.2s; }
        .utility-link:hover { color: #0f172a; }

        /* 🌟 결과 박스: 더욱 세련된 타이포그래피와 미세한 입체감 */
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
          color: #64748b;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .result-id {
          display: block;
          font-size: 26px;
          color: #ff4b2b;
          font-weight: 900;
          letter-spacing: 1px;
        }

        /* 🌟 진입 애니메이션 길이 조정으로 더 우아한 느낌 부여 */
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