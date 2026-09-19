"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMikuAlert } from '@/app/context/MikuAlertContext';
import { PASSWORD_MIN_LENGTH } from '@/lib/passwordPolicy';
import { isValidNameEnglish } from '@/lib/japanAddress';

// 🌟 휴대폰 번호: 숫자만 남기고 010-1234-5678 형태로 자동 정리합니다.
//    (저장 값도 하이픈 포함 형태로 통일해 마이페이지·주문서와 같은 모양이 되게 합니다)
const formatPhone = (value: string) => {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length < 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};
const isValidPhone = (value: string) => /^01[016789]-?\d{3,4}-?\d{4}$/.test(value.replace(/\s/g, ''));
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidLoginId = (value: string) => /^[a-zA-Z0-9_]{4,20}$/.test(value);

// 🔒 서버(lib/passwordPolicy.ts)와 같은 기준을 화면에서도 미리 확인합니다.
//    (서버 함수는 Buffer를 쓰기 때문에 브라우저에서 그대로 호출하지 않고 같은 규칙만 옮겨 둡니다)
const checkPassword = (password: string): string | null => {
  if (password.length < PASSWORD_MIN_LENGTH) return `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`;
  const kinds = [/[a-zA-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(re => re.test(password)).length;
  if (kinds < 2) return '영문, 숫자, 특수문자 중 두 가지 이상을 포함해야 합니다.';
  return null;
};

type FormKey = 'loginId' | 'name' | 'nameEnglish' | 'phone' | 'email' | 'password' | 'confirmPassword';

export default function RegisterPage() {
  const [formData, setFormData] = useState<Record<FormKey, string>>({
    loginId: '',
    name: '',
    nameEnglish: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [touched, setTouched] = useState<Partial<Record<FormKey, boolean>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const { showAlert } = useMikuAlert();

  // 🌟 항목별 오류 메시지. 입력을 한 번이라도 건드린 칸에만 보여 줍니다.
  const errors = useMemo(() => {
    const e: Partial<Record<FormKey, string>> = {};
    const { loginId, name, nameEnglish, phone, email, password, confirmPassword } = formData;

    if (loginId && !isValidLoginId(loginId)) e.loginId = '영문·숫자 4~20자로 입력해 주세요.';
    if (name && name.trim().length < 2) e.name = '이름을 2자 이상 입력해 주세요.';
    if (nameEnglish && !isValidNameEnglish(nameEnglish)) e.nameEnglish = '영문·공백·하이픈만 입력해 주세요.';
    if (phone && !isValidPhone(phone)) e.phone = '휴대폰 번호 형식이 올바르지 않습니다.';
    if (email && !isValidEmail(email)) e.email = '이메일 형식이 올바르지 않습니다.';
    if (password) {
      const policyError = checkPassword(password);
      if (policyError) e.password = policyError;
    }
    if (confirmPassword && password !== confirmPassword) e.confirmPassword = '비밀번호가 일치하지 않습니다.';
    return e;
  }, [formData]);

  const isComplete =
    Object.values(formData).every(v => v.trim().length > 0) && Object.keys(errors).length === 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'phone' ? formatPhone(value) : value }));
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched(prev => ({ ...prev, [e.target.name]: true }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const { loginId, email, password, confirmPassword, name, nameEnglish, phone } = formData;

    if (!loginId || !email || !password || !name || !phone) {
      setTouched({ loginId: true, name: true, phone: true, email: true, password: true, confirmPassword: true });
      showAlert('모든 항목을 입력해주세요.', 'warning');
      return;
    }
    const firstError = Object.values(errors)[0];
    if (firstError) {
      showAlert(firstError, 'warning');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('비밀번호가 일치하지 않습니다.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, email, password, name, nameEnglish, phone }),
      });

      const data = await response.json();

      if (data.success) {
        showAlert('회원가입이 완료되었습니다. 로그인해주세요.', 'success');
        router.push('/auth/login');
      } else {
        showAlert(data.error || '회원가입에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('회원가입 중 오류 발생:', error);
      showAlert('회원가입 처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldError = (key: FormKey) => (touched[key] ? errors[key] : undefined);

  return (
    <div className="register-page-wrapper">
      <div className="register-shell fade-in-up">

        {/* ---------- 좌측 브랜드 패널 (로그인 화면과 같은 구성) ---------- */}
        <aside className="register-brand" aria-hidden="true">
          <span className="register-brand-glow" />
          <div className="register-brand-top">
            <img src="/images/logo.png" alt="" className="register-brand-logo" />
            <span className="register-brand-eyebrow">JOIN MIKUCHAN</span>
            <h2 className="register-brand-title">가입하고<br />일본 쇼핑을 <em>더 쉽게</em></h2>
            <p className="register-brand-desc">라쿠텐 · 메루카리 · 야후를 한 곳에서 주문하고, 배송까지 한 번에 맡기세요.</p>
          </div>
          <ul className="register-brand-points">
            <li><span className="register-point-icon"><i className="fa fa-user-plus"></i></span>가입 즉시 회원 등급 시작 · 주문할수록 혜택 상승</li>
            <li><span className="register-point-icon"><i className="fa fa-percent"></i></span>등급이 오르면 국제 배송비 할인 적용</li>
            <li><span className="register-point-icon"><i className="fa fa-bell"></i></span>주문 상태가 바뀌면 바로 안내</li>
          </ul>
          <div className="register-brand-foot">
            <span className="register-brand-badge"><i className="fa fa-shield-halved"></i> 14년 노하우</span>
            <span className="register-brand-badge"><i className="fa fa-lock"></i> 안전한 정보 보관</span>
          </div>
        </aside>

        {/* ---------- 우측 입력 카드 ---------- */}
        <div className="register-card">
          <div className="register-header">
            <span className="register-eyebrow">CREATE ACCOUNT</span>
            <h1 className="register-title">회원가입</h1>
            <p className="register-subtitle">미쿠짱의 새로운 가족이 되어주세요.</p>
          </div>

          <form onSubmit={handleRegister} noValidate>
            <div className="reg-group">
              <label className="reg-label" htmlFor="reg-loginId">아이디</label>
              <div className={`reg-wrap ${fieldError('loginId') ? 'is-error' : ''}`}>
                <span className="reg-icon"><i className="fa fa-user"></i></span>
                <input
                  id="reg-loginId" name="loginId" type="text" className="reg-input"
                  value={formData.loginId} onChange={handleChange} onBlur={handleBlur}
                  placeholder="영문·숫자 4~20자" autoComplete="username"
                />
              </div>
              {fieldError('loginId') && <p className="reg-msg is-error"><i className="fa fa-circle-exclamation"></i>{fieldError('loginId')}</p>}
            </div>

            <div className="reg-row">
              <div className="reg-group">
                <label className="reg-label" htmlFor="reg-name">이름 (실명)</label>
                <div className={`reg-wrap ${fieldError('name') ? 'is-error' : ''}`}>
                  <span className="reg-icon"><i className="fa fa-id-card"></i></span>
                  <input
                    id="reg-name" name="name" type="text" className="reg-input"
                    value={formData.name} onChange={handleChange} onBlur={handleBlur}
                    placeholder="홍길동" autoComplete="name"
                  />
                </div>
                {fieldError('name') && <p className="reg-msg is-error"><i className="fa fa-circle-exclamation"></i>{fieldError('name')}</p>}
              </div>

              {/* 🔤 영문 이름(선택): 일본 쇼핑몰 주소의 "받는사람"에 사서함 번호와 함께 씁니다.
                  한자·가타카나는 사이트마다 전각/반각 규칙이 달라 결제 단계에서 자주 막힙니다. */}
              <div className="reg-group">
                <label className="reg-label" htmlFor="reg-name-en">영문 이름 <span className="reg-optional">(선택)</span></label>
                <div className={`reg-wrap ${fieldError('nameEnglish') ? 'is-error' : ''}`}>
                  <span className="reg-icon"><i className="fa fa-font"></i></span>
                  <input
                    id="reg-name-en" name="nameEnglish" type="text" className="reg-input"
                    value={formData.nameEnglish} onChange={handleChange} onBlur={handleBlur}
                    placeholder="MIKU JJANG" maxLength={60} autoComplete="off"
                  />
                </div>
                {fieldError('nameEnglish')
                  ? <p className="reg-msg is-error"><i className="fa fa-circle-exclamation"></i>{fieldError('nameEnglish')}</p>
                  : <p className="reg-msg"><i className="fa fa-circle-info"></i>일본 배송지의 받는사람에 쓰입니다. 나중에 마이페이지에서도 등록할 수 있어요.</p>}
              </div>

              {/* 🌟 휴대폰 번호: 주문 상태 안내 발송에 사용합니다 */}
              <div className="reg-group">
                <label className="reg-label" htmlFor="reg-phone">휴대폰 번호</label>
                <div className={`reg-wrap ${fieldError('phone') ? 'is-error' : ''}`}>
                  <span className="reg-icon"><i className="fa fa-mobile-screen-button"></i></span>
                  <input
                    id="reg-phone" name="phone" type="tel" inputMode="numeric" className="reg-input"
                    value={formData.phone} onChange={handleChange} onBlur={handleBlur}
                    placeholder="010-1234-5678" maxLength={13} autoComplete="tel"
                  />
                </div>
                {fieldError('phone')
                  ? <p className="reg-msg is-error"><i className="fa fa-circle-exclamation"></i>{fieldError('phone')}</p>
                  : <p className="reg-msg"><i className="fa fa-circle-info"></i>주문·배송 안내를 받을 번호입니다.</p>}
              </div>
            </div>

            <div className="reg-group">
              <label className="reg-label" htmlFor="reg-email">이메일 주소</label>
              <div className={`reg-wrap ${fieldError('email') ? 'is-error' : ''}`}>
                <span className="reg-icon"><i className="fa fa-envelope"></i></span>
                <input
                  id="reg-email" name="email" type="email" className="reg-input"
                  value={formData.email} onChange={handleChange} onBlur={handleBlur}
                  placeholder="example@mail.com" autoComplete="email"
                />
              </div>
              {fieldError('email') && <p className="reg-msg is-error"><i className="fa fa-circle-exclamation"></i>{fieldError('email')}</p>}
            </div>

            <div className="reg-row">
              <div className="reg-group">
                <label className="reg-label" htmlFor="reg-password">비밀번호</label>
                <div className={`reg-wrap ${fieldError('password') ? 'is-error' : ''}`}>
                  <span className="reg-icon"><i className="fa fa-lock"></i></span>
                  <input
                    id="reg-password" name="password" type={showPassword ? 'text' : 'password'}
                    className="reg-input has-toggle"
                    value={formData.password} onChange={handleChange} onBlur={handleBlur}
                    placeholder="••••••••" autoComplete="new-password"
                  />
                  <button type="button" className="reg-toggle" onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}>
                    <i className={`fa ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                {fieldError('password')
                  ? <p className="reg-msg is-error"><i className="fa fa-circle-exclamation"></i>{fieldError('password')}</p>
                  : <p className="reg-msg"><i className="fa fa-circle-info"></i>{PASSWORD_MIN_LENGTH}자 이상, 영문·숫자·특수문자 중 2종류 이상</p>}
              </div>

              <div className="reg-group">
                <label className="reg-label" htmlFor="reg-confirm">비밀번호 확인</label>
                <div className={`reg-wrap ${fieldError('confirmPassword') ? 'is-error' : ''}`}>
                  <span className="reg-icon"><i className="fa fa-lock"></i></span>
                  <input
                    id="reg-confirm" name="confirmPassword" type={showConfirm ? 'text' : 'password'}
                    className="reg-input has-toggle"
                    value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur}
                    placeholder="••••••••" autoComplete="new-password"
                  />
                  <button type="button" className="reg-toggle" onClick={() => setShowConfirm(v => !v)}
                    aria-label={showConfirm ? '비밀번호 숨기기' : '비밀번호 보기'}>
                    <i className={`fa ${showConfirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                {fieldError('confirmPassword')
                  ? <p className="reg-msg is-error"><i className="fa fa-circle-exclamation"></i>{fieldError('confirmPassword')}</p>
                  : formData.confirmPassword && formData.password === formData.confirmPassword
                    ? <p className="reg-msg is-ok"><i className="fa fa-circle-check"></i>비밀번호가 일치합니다.</p>
                    : null}
              </div>
            </div>

            <p className="register-terms">
              가입하시면 <Link href="/guide/terms">이용약관</Link>과 <Link href="/guide/privacy">개인정보처리방침</Link>에 동의하는 것으로 봅니다.
            </p>

            <button type="submit" className="register-submit" disabled={isSubmitting || !isComplete}>
              {isSubmitting
                ? <><i className="fa fa-spinner fa-spin"></i> 가입 처리 중...</>
                : <>가입하기 <span className="register-submit-arrow"><i className="fa fa-arrow-right"></i></span></>}
            </button>
          </form>

          <div className="register-footer">
            이미 계정이 있으신가요?
            <Link href="/auth/login" className="register-login-link">로그인 <i className="fa fa-arrow-right"></i></Link>
          </div>
        </div>
      </div>

      <style>{`
        .register-page-wrapper {
          --rg-from: #c0606a; --rg-to: #a94a53; --rg-accent: #a94a53;
          --rg-line: #f0d9da; --rg-ring: rgba(169, 74, 83, 0.16); --rg-shadow: rgba(169, 74, 83, 0.42);
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
        .register-page-wrapper * { box-sizing: border-box; }

        .register-shell {
          width: 100%; max-width: 1040px;
          display: grid; grid-template-columns: 0.85fr 1.15fr;
          border-radius: 30px; overflow: hidden;
          background: #ffffff;
          border: 1px solid #eceef3;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05), 0 40px 80px -36px rgba(15, 18, 30, 0.45);
        }
        .fade-in-up { animation: regFadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes regFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

        /* ---------- 브랜드 패널 ---------- */
        .register-brand {
          position: relative; overflow: hidden;
          display: flex; flex-direction: column; justify-content: space-between; gap: 28px;
          padding: 44px 38px;
          color: #ffffff;
          background: linear-gradient(150deg, #252c3d 0%, #181d29 58%, #1d1a24 100%);
        }
        .register-brand::after {
          content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 3px;
          background: linear-gradient(180deg, rgba(222,128,136,0) 0%, #de8088 30%, #c0606a 50%, #de8088 70%, rgba(222,128,136,0) 100%);
        }
        .register-brand-glow {
          position: absolute; right: -120px; top: -140px; width: 380px; height: 380px; border-radius: 50%;
          background: radial-gradient(circle, rgba(222, 128, 136, 0.32) 0%, rgba(222, 128, 136, 0) 70%);
          pointer-events: none;
        }
        .register-brand-top { position: relative; z-index: 2; }
        .register-brand-logo { height: 54px; width: auto; margin-bottom: 22px; filter: drop-shadow(0 10px 18px rgba(0,0,0,0.35)); }
        .register-brand-eyebrow { display: block; font-size: 11px; font-weight: 800; letter-spacing: 0.22em; color: #f0a8ac; margin-bottom: 10px; }
        .register-brand-title { margin: 0; font-size: 28px; font-weight: 900; line-height: 1.35; letter-spacing: -0.4px; }
        .register-brand-title em {
          font-style: normal;
          background: linear-gradient(120deg, #ffc2c5 0%, #de8088 60%, #ffd9a8 100%);
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
        }
        .register-brand-desc { margin: 14px 0 0; font-size: 14.5px; font-weight: 500; line-height: 1.7; color: #b9c0cf; word-break: keep-all; }
        .register-brand-points { position: relative; z-index: 2; list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
        .register-brand-points li { display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 600; color: #e2e6ee; word-break: keep-all; line-height: 1.5; }
        .register-point-icon {
          width: 34px; height: 34px; border-radius: 11px; flex-shrink: 0;
          display: inline-flex; align-items: center; justify-content: center; font-size: 14px; color: #ffffff;
          background: rgba(255, 255, 255, 0.09); border: 1px solid rgba(255, 255, 255, 0.14);
        }
        .register-brand-foot { position: relative; z-index: 2; display: flex; flex-wrap: wrap; gap: 8px; }
        .register-brand-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 13px; border-radius: 999px;
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14);
          font-size: 12.5px; font-weight: 700; color: #dbe0ea;
        }

        /* ---------- 입력 카드 ---------- */
        .register-card { padding: 44px 46px 40px; display: flex; flex-direction: column; }
        .register-header { margin-bottom: 26px; }
        .register-eyebrow { display: block; font-size: 11px; font-weight: 800; letter-spacing: 0.2em; color: var(--rg-accent); margin-bottom: 8px; }
        .register-title { margin: 0; font-size: 32px; font-weight: 900; color: #11151f; letter-spacing: -0.6px; }
        .register-subtitle { margin: 10px 0 0; font-size: 14.5px; font-weight: 500; color: #6b7280; }

        .reg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
        .reg-group { margin-bottom: 18px; }
        .reg-label { display: block; font-size: 13px; font-weight: 800; color: #374151; margin-bottom: 8px; letter-spacing: -0.1px; }
        .reg-wrap {
          position: relative; display: flex; align-items: center;
          border-radius: 14px; background: #f8f9fb; border: 1px solid #e6e8ee;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .reg-wrap:focus-within { background: #ffffff; border-color: var(--rg-accent); box-shadow: 0 0 0 4px var(--rg-ring); }
        .reg-wrap.is-error { border-color: #e2696e; background: #fff8f8; }
        .reg-wrap.is-error:focus-within { box-shadow: 0 0 0 4px rgba(226, 105, 110, 0.16); }
        .reg-icon {
          width: 46px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
          color: #9aa3b2; font-size: 14px; transition: color 0.2s ease;
        }
        .reg-wrap:focus-within .reg-icon { color: var(--rg-accent); }
        .reg-input {
          flex: 1; min-width: 0; height: 52px; padding: 0 16px 0 0;
          border: none; background: transparent; outline: none;
          font-size: 15px; font-weight: 600; color: #11151f; font-family: inherit;
        }
        .reg-input::placeholder { color: #aab1bd; font-weight: 500; }
        .reg-input.has-toggle { padding-right: 46px; }
        .reg-toggle {
          position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
          width: 38px; height: 38px; border: none; background: transparent; cursor: pointer;
          color: #9aa3b2; font-size: 14px; border-radius: 10px; transition: color 0.2s ease, background 0.2s ease;
        }
        .reg-toggle:hover { color: var(--rg-accent); background: rgba(169, 74, 83, 0.08); }
        .reg-msg {
          display: flex; align-items: center; gap: 6px;
          margin: 8px 2px 0; font-size: 12.5px; font-weight: 600; color: #8a93a2; line-height: 1.45; word-break: keep-all;
        }
        .reg-msg.is-error { color: #c8474c; font-weight: 700; }
        .reg-msg.is-ok { color: #2f8f5b; font-weight: 700; }

        .register-terms {
          margin: 6px 0 20px; font-size: 12.5px; font-weight: 600; color: #8a93a2; line-height: 1.6; word-break: keep-all;
        }
        .register-terms a { color: #4b5563; font-weight: 800; text-decoration: none; border-bottom: 1px solid #d5d9e0; }
        .register-terms a:hover { color: var(--rg-accent); border-color: var(--rg-accent); }

        .register-submit {
          width: 100%; height: 56px; border: none; border-radius: 16px; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          font-family: inherit; font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: -0.2px;
          background: linear-gradient(135deg, var(--rg-from) 0%, var(--rg-to) 100%);
          box-shadow: 0 16px 30px -14px var(--rg-shadow), inset 0 1px 0 rgba(255,255,255,0.28);
          transition: transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease;
        }
        .register-submit:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.04); box-shadow: 0 22px 36px -16px var(--rg-shadow), inset 0 1px 0 rgba(255,255,255,0.28); }
        .register-submit:active:not(:disabled) { transform: translateY(0); }
        .register-submit:disabled { background: #d7dae1; color: #ffffff; box-shadow: none; cursor: not-allowed; }
        .register-submit-arrow {
          width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.22); font-size: 12px; transition: transform 0.2s ease;
        }
        .register-submit:hover:not(:disabled) .register-submit-arrow { transform: translateX(3px); }

        .register-footer {
          margin-top: auto; padding-top: 24px; text-align: center;
          font-size: 14px; font-weight: 600; color: #6b7280;
        }
        .register-login-link {
          margin-left: 8px; color: var(--rg-accent); font-weight: 800; text-decoration: none;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .register-login-link:hover { text-decoration: underline; }
        .register-login-link i { font-size: 11px; }

        /* ---------- 반응형 ---------- */
        @media (max-width: 900px) {
          .register-shell { grid-template-columns: 1fr; max-width: 560px; }
          .register-brand { padding: 30px 28px; gap: 20px; }
          .register-brand::after { top: auto; bottom: 0; left: 0; right: 0; width: auto; height: 3px;
            background: linear-gradient(90deg, rgba(222,128,136,0) 0%, #de8088 30%, #c0606a 50%, #de8088 70%, rgba(222,128,136,0) 100%); }
          .register-brand-logo { height: 44px; margin-bottom: 16px; }
          .register-brand-title { font-size: 23px; }
          .register-brand-desc { font-size: 13.5px; }
          .register-brand-points { display: none; }
          .register-card { padding: 32px 24px 28px; }
          .register-title { font-size: 27px; }
        }
        @media (max-width: 560px) {
          .register-page-wrapper { padding: 24px 14px; }
          .reg-row { grid-template-columns: 1fr; gap: 0; }
          .register-brand-foot { gap: 6px; }
          .register-brand-badge { font-size: 11.5px; padding: 6px 11px; }
        }
      `}</style>
    </div>
  );
}
