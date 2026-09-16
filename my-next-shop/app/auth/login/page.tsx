'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { signIn, getSession } from "next-auth/react";
import { useMikuAlert } from '@/app/context/MikuAlertContext';

const REMEMBER_ID_KEY = 'miku_saved_login_id';

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberId, setRememberId] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showAlert } = useMikuAlert();

  // 🌟 "아이디 저장"을 켜 두었으면 다음 방문 때 아이디를 미리 채워 줍니다.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_ID_KEY);
      if (saved) { setUserId(saved); setRememberId(true); }
    } catch {}
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!userId) {
      showAlert("아이디를 입력해주세요.", "warning");
      return;
    }

    if (!password) {
      showAlert("비밀번호를 입력해주세요.", "warning");
      return;
    }

    setIsSubmitting(true);
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
        setIsSubmitting(false);
      } else {
        try {
          if (rememberId) localStorage.setItem(REMEMBER_ID_KEY, userId);
          else localStorage.removeItem(REMEMBER_ID_KEY);
        } catch {}
        const session = await getSession();
        const userName = session?.user?.name || "고객";
        showAlert(`${userName}님, 환영합니다!`, "success");

        setTimeout(() => { window.location.href = '/'; }, 1000);
      }
    } catch (error) {
      console.error("로그인 중 오류 발생:", error);
      showAlert("로그인 처리 중 오류가 발생했습니다.", "error");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-shell fade-in-up">

        {/* 🌟 왼쪽 브랜드 패널 (PC) / 상단 배너 (모바일) */}
        <aside className="login-brand" aria-hidden="true">
          <span className="login-brand-glow" />
          <div className="login-brand-top">
            <img src="/images/logo.png" alt="" className="login-brand-logo" />
            <span className="login-brand-eyebrow">MIKUCHAN JAPAN SHOPPING</span>
            <h2 className="login-brand-title">일본 쇼핑,<br /><em>미쿠짱</em>과 함께 편하게</h2>
            <p className="login-brand-desc">구매대행부터 배송대행까지, 14년 노하우로 안전하게 도와드립니다.</p>
          </div>
          <ul className="login-brand-points">
            <li><span className="login-point-icon"><i className="fa fa-cart-shopping"></i></span>라쿠텐 · 메루카리 · 야후 원스톱 구매대행</li>
            <li><span className="login-point-icon"><i className="fa fa-plane"></i></span>무게 기준 투명한 국제 배송비</li>
            <li><span className="login-point-icon"><i className="fa fa-comment-dots"></i></span>카카오톡 실시간 상담 · 365일 대응</li>
          </ul>
        </aside>

        {/* 🌟 로그인 카드 */}
        <div className="login-card">
          <div className="login-header">
            <span className="login-eyebrow">WELCOME BACK</span>
            <h1 className="login-title">로그인</h1>
            <p className="login-subtitle">미쿠짱 서비스 이용을 위해 로그인해주세요.</p>
          </div>

          <form onSubmit={handleLogin} noValidate>
            <div className="input-group">
              <label className="input-label" htmlFor="login-user-id">아이디</label>
              <div className="input-wrap">
                <span className="input-icon"><i className="fa fa-user"></i></span>
                <input
                  id="login-user-id"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="아이디를 입력해주세요"
                  className="login-input"
                  autoComplete="username"
                  autoCapitalize="none"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="login-password">비밀번호</label>
              <div className="input-wrap">
                <span className="input-icon"><i className="fa fa-lock"></i></span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력해주세요"
                  className="login-input has-toggle"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  aria-pressed={showPassword}
                >
                  <i className={`fa ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember-label">
                <input type="checkbox" checked={rememberId} onChange={(e) => setRememberId(e.target.checked)} />
                <span className="remember-box" aria-hidden="true"><i className="fa fa-check"></i></span>
                아이디 저장
              </label>
              <div className="utility-wrapper">
                <Link href="/auth/find-id" className="utility-link">아이디 찾기</Link>
                <span className="utility-separator" aria-hidden="true"></span>
                <Link href="/auth/find-password" className="utility-link">비밀번호 찾기</Link>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <><i className="fa fa-spinner fa-spin"></i> 로그인 중...</>
              ) : (
                <>로그인하기 <span className="submit-arrow"><i className="fa fa-arrow-right"></i></span></>
              )}
            </button>
          </form>

          <div className="login-divider">
            <div className="divider-line"></div>
            <span className="divider-text">또는 간편 로그인</span>
            <div className="divider-line"></div>
          </div>

          <div className="social-group">
            <button type="button" onClick={() => signIn('kakao', { callbackUrl: '/' })} className="social-btn kakao-btn">
              <span className="social-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#191600" d="M12 3.5C6.75 3.5 2.5 6.86 2.5 11c0 2.64 1.75 4.96 4.4 6.3-.19.7-.7 2.56-.8 2.96-.13.5.18.49.38.36.16-.1 2.5-1.7 3.52-2.4.63.09 1.28.14 1.95.14 5.25 0 9.5-3.36 9.5-7.5s-4.19-7.36-9.45-7.36z" />
                </svg>
              </span>
              카카오로 시작하기
            </button>

            <button type="button" onClick={() => signIn('naver', { callbackUrl: '/' })} className="social-btn naver-btn">
              <span className="social-icon naver-icon" aria-hidden="true">N</span>
              네이버로 시작하기
            </button>
          </div>

          <div className="login-footer">
            아직 회원이 아니신가요?
            <Link href="/auth/register" className="register-link">회원가입 <i className="fa fa-arrow-right"></i></Link>
          </div>
        </div>
      </div>

      <style>{`
        .login-page-wrapper {
          --lg-from: #c0606a; --lg-to: #a94a53; --lg-accent: #a94a53;
          --lg-bg: #fdf4f4; --lg-line: #f0d9da; --lg-ring: rgba(169, 74, 83, 0.16); --lg-shadow: rgba(169, 74, 83, 0.42);
          min-height: calc(100vh - 90px);
          display: flex; align-items: center; justify-content: center;
          background:
            radial-gradient(700px 420px at 12% 0%, rgba(222, 128, 136, 0.16) 0%, rgba(222, 128, 136, 0) 60%),
            radial-gradient(600px 400px at 100% 100%, rgba(240, 138, 68, 0.12) 0%, rgba(240, 138, 68, 0) 60%),
            linear-gradient(180deg, #f8f7f9 0%, #f3f1f4 100%);
          padding: 48px 20px;
          font-family: 'Pretendard', "Noto Sans KR", sans-serif;
          box-sizing: border-box;
        }
        .login-page-wrapper * { box-sizing: border-box; }

        .login-shell {
          width: 100%; max-width: 960px;
          display: grid; grid-template-columns: 1fr 1fr;
          border-radius: 30px; overflow: hidden;
          background: #ffffff;
          border: 1px solid #eceef3;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05), 0 40px 80px -36px rgba(15, 18, 30, 0.45);
        }

        /* ---------- 브랜드 패널 ---------- */
        .login-brand {
          position: relative; overflow: hidden;
          display: flex; flex-direction: column; justify-content: space-between; gap: 32px;
          padding: 44px 40px;
          color: #ffffff;
          background: linear-gradient(150deg, #252c3d 0%, #181d29 58%, #1d1a24 100%);
        }
        .login-brand::after {
          content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 3px;
          background: linear-gradient(180deg, rgba(222,128,136,0) 0%, #de8088 30%, #c0606a 50%, #de8088 70%, rgba(222,128,136,0) 100%);
        }
        .login-brand-glow {
          position: absolute; right: -120px; top: -140px; width: 380px; height: 380px; border-radius: 50%;
          background: radial-gradient(circle, rgba(222, 128, 136, 0.32) 0%, rgba(222, 128, 136, 0) 70%);
          pointer-events: none;
        }
        .login-brand-top { position: relative; }
        .login-brand-logo {
          width: 62px; height: 62px; object-fit: contain; border-radius: 20px;
          background: #ffffff; padding: 6px; margin-bottom: 26px;
          box-shadow: 0 14px 28px -12px rgba(222, 128, 136, 0.7);
        }
        .login-brand-eyebrow { display: block; font-size: 11px; font-weight: 800; letter-spacing: 0.18em; color: #f0b2b7; margin-bottom: 12px; }
        .login-brand-title { margin: 0 0 12px; font-size: 30px; font-weight: 900; line-height: 1.3; letter-spacing: -0.6px; color: #ffffff; word-break: keep-all; }
        .login-brand-title em { font-style: normal; color: #f3b7bc; }
        .login-brand-desc { margin: 0; font-size: 14.5px; line-height: 1.7; color: #c3c8d4; word-break: keep-all; }
        .login-brand-points { position: relative; list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .login-brand-points li {
          display: flex; align-items: center; gap: 12px;
          padding: 11px 14px; border-radius: 14px;
          font-size: 13.5px; font-weight: 700; color: #e3e6ee;
          background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.09);
        }
        .login-point-icon {
          width: 32px; height: 32px; flex-shrink: 0; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; font-size: 13px; color: #ffffff;
          background: linear-gradient(135deg, #de8088 0%, #a94a53 100%);
          box-shadow: 0 8px 16px -8px rgba(222, 128, 136, 0.7);
        }

        /* ---------- 로그인 카드 ---------- */
        .login-card { padding: 44px 44px 36px; }
        .login-header { margin-bottom: 30px; }
        .login-eyebrow { display: block; font-size: 11px; font-weight: 800; letter-spacing: 0.16em; color: var(--lg-accent); margin-bottom: 6px; }
        .login-title { font-size: 28px; font-weight: 900; color: #111827; margin: 0; letter-spacing: -0.6px; }
        .login-subtitle { color: #6b7280; margin: 8px 0 0; font-size: 14px; }

        .input-group { margin-bottom: 18px; }
        .input-label { display: block; font-size: 13px; font-weight: 800; color: #374151; margin-bottom: 7px; }
        .input-wrap { position: relative; }
        .input-icon {
          position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
          color: #8b919e; font-size: 14px; pointer-events: none; transition: color 0.2s;
        }
        .input-wrap:focus-within .input-icon { color: var(--lg-accent); }
        .login-input {
          width: 100%; height: 52px;
          padding: 0 16px 0 44px;
          border-radius: 14px;
          border: 1px solid #e2e5eb;
          background: #fbfbfc;
          font-size: 15px; font-weight: 600; color: #111827; font-family: inherit;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .login-input.has-toggle { padding-right: 48px; }
        .login-input::placeholder { color: #8b919e; font-weight: 500; }
        .login-input:hover { border-color: #e3b9bc; background: #ffffff; }
        .login-input:focus { background: #ffffff; border-color: var(--lg-from); box-shadow: 0 0 0 4px var(--lg-ring); }
        .input-toggle {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          width: 34px; height: 34px; border-radius: 10px; border: none; background: transparent;
          color: #8b919e; cursor: pointer; font-size: 14px; transition: all 0.2s;
        }
        .input-toggle:hover { background: var(--lg-bg); color: var(--lg-accent); }

        .login-options { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: -4px 0 22px; }
        .remember-label { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #374151; cursor: pointer; user-select: none; }
        .remember-label input { position: absolute; opacity: 0; width: 0; height: 0; }
        .remember-box {
          width: 20px; height: 20px; border-radius: 6px; border: 2px solid #d1d5db; background: #ffffff;
          display: inline-flex; align-items: center; justify-content: center; color: transparent; font-size: 10px;
          transition: all 0.2s ease;
        }
        .remember-label input:checked + .remember-box {
          border-color: transparent; color: #ffffff;
          background: linear-gradient(135deg, var(--lg-from) 0%, var(--lg-to) 100%);
          box-shadow: 0 4px 10px -4px var(--lg-shadow);
        }
        .remember-label input:focus-visible + .remember-box { box-shadow: 0 0 0 3px var(--lg-ring); }
        .utility-wrapper { display: flex; align-items: center; gap: 10px; }
        .utility-link { color: #6b7280; font-size: 13px; font-weight: 600; text-decoration: none; transition: color 0.2s; }
        .utility-link:hover { color: var(--lg-accent); }
        .utility-separator { width: 1px; height: 12px; background: #dfe2e8; }

        .submit-btn {
          width: 100%; height: 54px;
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          background: linear-gradient(135deg, var(--lg-from) 0%, var(--lg-to) 100%);
          color: #fff;
          border-radius: 15px; border: none;
          font-size: 16px; font-weight: 800; font-family: inherit; letter-spacing: -0.2px;
          cursor: pointer;
          box-shadow: 0 14px 28px -12px var(--lg-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.22);
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        .submit-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.05); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.7; cursor: wait; }
        .submit-arrow { width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.18); font-size: 12px; }

        .login-divider { display: flex; align-items: center; margin: 28px 0 16px; color: #8b919e; font-size: 12px; font-weight: 600; }
        .divider-line { flex: 1; height: 1px; background-color: #eceef3; }
        .divider-text { padding: 0 14px; }

        .social-group { display: flex; flex-direction: column; gap: 8px; }
        .social-btn {
          width: 100%; height: 50px;
          border-radius: 14px; border: 1px solid transparent;
          font-size: 15px; font-weight: 800; font-family: inherit;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        .social-btn:hover { transform: translateY(-1px); filter: brightness(0.98); }
        .kakao-btn { background: #FEE500; color: #191600; box-shadow: 0 10px 20px -14px rgba(200, 160, 0, 0.8); }
        .naver-btn { background: #03C75A; color: #ffffff; box-shadow: 0 10px 20px -14px rgba(3, 199, 90, 0.8); }
        .social-icon { display: inline-flex; align-items: center; justify-content: center; }
        .naver-icon { width: 20px; height: 20px; border-radius: 5px; background: rgba(255,255,255,0.18); font-family: Arial, sans-serif; font-weight: 900; font-size: 13px; }

        .login-footer { margin-top: 26px; padding-top: 20px; border-top: 1px solid #f0f1f4; text-align: center; font-size: 14px; color: #6b7280; }
        .register-link { display: inline-flex; align-items: center; gap: 5px; color: var(--lg-accent); font-weight: 800; margin-left: 8px; text-decoration: none; transition: gap 0.2s; }
        .register-link i { font-size: 11px; }
        .register-link:hover { gap: 8px; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @media (max-width: 900px) {
          .login-page-wrapper { padding: 24px 12px 40px; align-items: flex-start; min-height: 0; }
          .login-shell { grid-template-columns: 1fr; max-width: 480px; border-radius: 24px; }
          .login-brand { padding: 24px 22px; gap: 16px; }
          .login-brand::after { right: 0; left: 0; top: auto; bottom: 0; width: auto; height: 3px;
            background: linear-gradient(90deg, rgba(222,128,136,0) 0%, #de8088 20%, #c0606a 50%, #de8088 80%, rgba(222,128,136,0) 100%); }
          .login-brand-logo { width: 44px; height: 44px; border-radius: 14px; margin-bottom: 14px; }
          .login-brand-title { font-size: 21px; margin-bottom: 6px; }
          .login-brand-desc { font-size: 13px; }
          .login-brand-points { display: none; }
          .login-card { padding: 28px 22px 26px; }
          .login-header { margin-bottom: 22px; }
          .login-title { font-size: 24px; }
          .login-options { flex-wrap: wrap; gap: 8px 12px; }
        }
      `}</style>
    </div>
  );
}
