'use client';

import React from 'react';
import GuideLayout from '../../components/GuideLayout';
import ChangePasswordForm from '../../components/ChangePasswordForm';

export default function ChangePasswordPage() {
  return (
    <GuideLayout title="비밀번호 변경" type="mypage">
      <div className="login-page-wrapper">
        <ChangePasswordForm />
      </div>

      <style jsx global>{`
        .login-page-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          font-family: 'Pretendard', sans-serif;
          background: radial-gradient(circle at 50% -20%, #f8fafc 0%, #eef2f6 100%);
        }

        @media (max-width: 768px) {
          .login-page-wrapper { padding-top: 0 !important; }
        }
      `}</style>
    </GuideLayout>
  );
}
