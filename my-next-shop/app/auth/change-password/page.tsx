'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMikuAlert } from '@/app/context/MikuAlertContext';
import GuideLayout from '../../components/GuideLayout'; // GuideLayout 임포트

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showAlert } = useMikuAlert();
  const router = useRouter();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showAlert("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.", "error");
      return;
    }

    if (newPassword.length < 8) {
      showAlert("비밀번호는 8자 이상이어야 합니다.", "warning");
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
        showAlert("비밀번호가 성공적으로 변경되었습니다.", "success");
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

  return (
    <GuideLayout title="비밀번호 변경" type="mypage">
      <div className="password-change-container" style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px', fontFamily: 'Pretendard, "Noto Sans KR", sans-serif' }}>
        
        <div className="login-card fade-in-up" style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
          <div className="login-header" style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 className="login-title" style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>비밀번호 변경</h1>
            <p className="login-subtitle" style={{ color: '#64748b', marginTop: '10px' }}>안전을 위해 새로운 비밀번호를 설정해주세요.</p>
          </div>

          <form onSubmit={handleChangePassword}>
            <div className="input-group" style={{ marginBottom: '20px' }}>
              <label className="input-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '14px', color: '#334155' }}>현재 비밀번호</label>
              <input 
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)} 
                placeholder="현재 사용 중인 비밀번호"
                className="login-input"
                required 
                style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}
              />
            </div>

            <div className="input-group" style={{ marginBottom: '20px' }}>
              <label className="input-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '14px', color: '#334155' }}>새 비밀번호</label>
              <input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="새로운 비밀번호 (8자 이상)"
                className="login-input" 
                required
                style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}
              />
            </div>

            <div className="input-group" style={{ marginBottom: '30px' }}>
              <label className="input-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '14px', color: '#334155' }}>새 비밀번호 확인</label>
              <input 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="새 비밀번호 다시 입력"
                className="login-input" 
                required
                style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}
              />
            </div>

            <button type="submit" className="submit-btn" disabled={loading} style={{ width: '100%', padding: '16px', backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none', fontWeight: '800', cursor: 'pointer' }}>
              {loading ? '변경 중...' : '비밀번호 변경하기'}
            </button>
          </form>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </GuideLayout>
  );
}