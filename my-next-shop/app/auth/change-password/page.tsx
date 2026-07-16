'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMikuAlert } from '@/app/context/MikuAlertContext';
import GuideLayout from '../../components/GuideLayout';

export default function ChangePasswordPage() {
  // =================================================================
  // 1. 상태 관리 (State)
  // =================================================================
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const { showAlert } = useMikuAlert();
  const router = useRouter();

  // =================================================================
  // 2. 기능 로직 (Logic)
  // =================================================================
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, text: '', color: '#e2e8f0', glow: 'transparent' };
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;

    if (score === 1) return { score, text: '취약', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.2)' };
    if (score === 2) return { score, text: '보통', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.2)' };
    if (score === 3) return { score, text: '안전', color: '#10b981', glow: 'rgba(16, 185, 129, 0.2)' };
    return { score: 0, text: '', color: '#e2e8f0', glow: 'transparent' };
  }, [newPassword]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      showAlert("비밀번호는 8자 이상이어야 합니다.", "warning");
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.", "error");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (data.success) {
        showAlert("비밀번호가 안전하게 변경되었습니다.", "success");
        setTimeout(() => router.push('/'), 1500);
      } else {
        showAlert(data.message || "비밀번호 변경에 실패했습니다.", "error");
      }
    } catch (error) {
      showAlert("처리 중 오류가 발생했습니다.", "error");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = currentPassword && newPassword.length >= 8 && confirmPassword;

  // =================================================================
  // 3. UI 렌더링 (View)
  // =================================================================
  return (
    <GuideLayout title="비밀번호 변경" type="mypage">
      <div className="login-page-wrapper">
        <div className="premium-card fade-in-up">
          
          <div className="login-header">
            {/* 🌟 프리미엄 SVG 자물쇠 아이콘 */}
            <div className="icon-wrapper">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h1 className="login-title">비밀번호 변경</h1>
            <p className="login-subtitle">소중한 개인정보 보호를 위해<br/>새로운 비밀번호를 설정해 주세요.</p>
          </div>

          <form onSubmit={handleChangePassword} className="premium-form">
            
            {/* 현재 비밀번호 */}
            <div className="input-group">
              <label className="input-label">현재 비밀번호</label>
              <div className="password-input-wrapper">
                <input 
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)} 
                  placeholder="현재 사용 중인 비밀번호"
                  className="login-input"
                  required 
                />
                <button type="button" className="eye-btn" onClick={() => setShowCurrent(!showCurrent)} tabIndex={-1}>
                  <EyeIcon show={showCurrent} />
                </button>
              </div>
            </div>

            <div className="divider-line"></div>

            {/* 새 비밀번호 */}
            <div className="input-group">
              <label className="input-label">새 비밀번호</label>
              <div className="password-input-wrapper">
                <input 
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} 
                  placeholder="영문, 숫자, 특수문자 조합 8자 이상"
                  className="login-input" 
                  required
                />
                <button type="button" className="eye-btn" onClick={() => setShowNew(!showNew)} tabIndex={-1}>
                  <EyeIcon show={showNew} />
                </button>
              </div>
              
              {/* 🌟 고급스러운 강도 미터 */}
              <div className={`strength-meter-container ${newPassword.length > 0 ? 'visible' : ''}`}>
                <div className="strength-bars">
                  {[1, 2, 3].map((level) => (
                    <div 
                      key={level} 
                      className="bar" 
                      style={{ 
                        backgroundColor: passwordStrength.score >= level ? passwordStrength.color : '#e2e8f0',
                        boxShadow: passwordStrength.score >= level ? `0 0 8px ${passwordStrength.glow}` : 'none'
                      }} 
                    />
                  ))}
                </div>
                <span className="strength-text" style={{ color: passwordStrength.color }}>
                  {passwordStrength.text}
                </span>
              </div>
            </div>

            {/* 새 비밀번호 확인 */}
            <div className="input-group" style={{ marginTop: '4px' }}>
              <label className="input-label">새 비밀번호 확인</label>
              <div className="password-input-wrapper">
                <input 
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="새로운 비밀번호를 다시 입력해 주세요"
                  className="login-input" 
                  required
                />
                <button type="button" className="eye-btn" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
                  <EyeIcon show={showConfirm} />
                </button>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading || !isFormValid}>
              {loading ? '안전하게 변경 중...' : '비밀번호 변경 완료'}
            </button>
          </form>

        </div>

        {/* ================================================================= */}
        {/* 4. 스타일 디자인 (CSS) */}
        {/* ================================================================= */}
        <style jsx global>{`
          /* 전체 배경을 은은하고 깊이감 있게 설정 */
          .login-page-wrapper { 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            padding: 60px 20px; 
            font-family: 'Pretendard', sans-serif;
            background: radial-gradient(circle at 50% -20%, #f8fafc 0%, #eef2f6 100%);
          }
          
          /* 🌟 프리미엄 글래스모피즘 카드 */
          .premium-card { 
            width: 100%; 
            max-width: 460px; 
            padding: 56px 48px; 
            background: rgba(255, 255, 255, 0.95); 
            backdrop-filter: blur(20px);
            border-radius: 32px; 
            box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.6) inset;
            border: 1px solid rgba(226, 232, 240, 0.6);
          }

          .login-header { text-align: center; margin-bottom: 40px; }
          
          /* 🌟 아이콘 래퍼의 고급스러운 플로팅 & 그라데이션 효과 */
          .icon-wrapper {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 64px;
            height: 64px;
            margin-bottom: 24px;
            border-radius: 20px;
            background: linear-gradient(135deg, #ff4b2b 0%, #e63e1f 100%);
            color: white;
            box-shadow: 0 12px 24px -6px rgba(255, 75, 43, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.3);
            animation: float 6s ease-in-out infinite;
          }

          .login-title { font-size: 28px; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
          .login-subtitle { color: #64748b; margin-top: 12px; font-size: 15px; line-height: 1.6; }
          
          .premium-form { display: flex; flex-direction: column; gap: 24px; }
          .input-group { position: relative; }
          .input-label { display: block; font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 10px; letter-spacing: -0.3px; }
          
          .password-input-wrapper { position: relative; display: flex; align-items: center; }
          
          /* 🌟 입력창 포커스 시 브랜드 컬러 링과 부드러운 전환 효과 */
          .login-input { 
            width: 100%; 
            padding: 18px 48px 18px 20px; 
            border-radius: 16px; 
            border: 1px solid #e2e8f0; 
            background-color: #f8fafc;
            font-size: 15px; 
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

          .eye-btn {
            position: absolute; right: 16px; background: transparent; border: none;
            color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center;
            padding: 4px; transition: color 0.2s; outline: none;
          }
          .login-input:focus + .eye-btn, .eye-btn:hover { color: #ff4b2b; }

          /* 비밀번호 강도 미터 부드러운 전개 */
          .strength-meter-container { 
            display: flex; align-items: center; justify-content: space-between; 
            margin-top: 12px; padding: 0 4px; 
            opacity: 0; max-height: 0; overflow: hidden;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .strength-meter-container.visible { opacity: 1; max-height: 20px; }
          
          .strength-bars { display: flex; gap: 6px; flex: 1; margin-right: 16px; }
          .bar { height: 4px; flex: 1; border-radius: 4px; transition: all 0.4s ease; }
          .strength-text { font-size: 13px; font-weight: 800; min-width: 32px; text-align: right; transition: color 0.3s ease; }

          .divider-line { width: 100%; height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent); margin: 8px 0; }

          /* 🌟 3D 버튼 호버 효과 */
          .submit-btn { 
            width: 100%; 
            padding: 18px; 
            margin-top: 8px;
            background: linear-gradient(135deg, #ff4b2b 0%, #e63e1f 100%); 
            color: #fff; 
            border-radius: 16px; 
            border: none; 
            font-size: 16px; 
            font-weight: 800; 
            letter-spacing: -0.3px;
            cursor: pointer; 
            box-shadow: 0 8px 20px -4px rgba(255, 75, 43, 0.3);
            transform: translateY(0);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
          }
          .submit-btn:hover:not(:disabled) { 
            transform: translateY(-2px);
            box-shadow: 0 14px 28px -6px rgba(255, 75, 43, 0.4);
            filter: brightness(1.05);
          }
          .submit-btn:disabled {
            background: #e2e8f0;
            color: #94a3b8;
            cursor: not-allowed;
            box-shadow: none;
            transform: translateY(0);
          }

          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-6px); }
            100% { transform: translateY(0px); }
          }
          .fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        `}</style>
      </div>
    </GuideLayout>
  );
}

// 눈 모양 아이콘 SVG
const EyeIcon = ({ show }: { show: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {show ? <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM11 15a3 3 0 100-6 3 3 0 000 6z" /> 
          : <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />}
  </svg>
);