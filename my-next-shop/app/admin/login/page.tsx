"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import './login-premium.css';
import {
  User, LockKey, Eye, EyeSlash, ArrowRight, WarningCircle, ShieldCheck, Package, ChartLineUp, Truck, CircleNotch,
} from '@phosphor-icons/react';

/* ============================================================
   🔐 관리자 로그인
   - 세션 쿠키는 서버(/api/admin/login)가 httpOnly 로 발급합니다.
   - 로그인 실패·시도 제한(429) 메시지는 서버가 보낸 문구를 그대로 화면에 보여줍니다.
   ============================================================ */

const REMEMBER_KEY = 'admin_login_remember_id';

export default function AdminLoginPage() {
  const router = useRouter();
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberId, setRememberId] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);

  const idRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  // 저장해 둔 아이디가 있으면 채우고 비밀번호 칸으로 바로 이동합니다.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setAdminId(saved);
        setRememberId(true);
        pwRef.current?.focus();
        return;
      }
    } catch { /* 저장소를 못 쓰는 환경이면 무시 */ }
    idRef.current?.focus();
  }, []);

  const fail = (msg: string) => {
    setErrorMsg(msg);
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!adminId.trim() || !password) {
      fail('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ admin_id: adminId, password }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        // 헤더 표시용 이름 (세션 자체는 httpOnly 쿠키)
        localStorage.setItem('admin_id', adminId);
        if (data.name) localStorage.setItem('admin_name', data.name);
        try {
          if (rememberId) localStorage.setItem(REMEMBER_KEY, adminId);
          else localStorage.removeItem(REMEMBER_KEY);
        } catch { /* 무시 */ }

        // 원래 가려던 admin 페이지(미들웨어가 ?redirect= 로 넘겨줌)로, 없으면 대시보드로.
        // 외부 URL 로 튕기지 않도록 /admin 경로인지 확인합니다.
        const redirectTo = new URLSearchParams(window.location.search).get('redirect');
        router.push(redirectTo && redirectTo.startsWith('/admin') ? redirectTo : '/admin/dashboard');
        return; // 이동하는 동안 버튼은 로딩 상태로 둡니다.
      }

      if (res.status === 429) {
        fail(data.error || '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.');
      } else {
        fail('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
      setPassword('');
      pwRef.current?.focus();
    } catch (error) {
      console.error('Login error:', error);
      fail('서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
    setIsLoading(false);
  };

  const onPwKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState?.('CapsLock') ?? false);
  };

  return (
    <div className="lg-root">
      {/* 배경 장식 */}
      <div className="lg-bg" aria-hidden="true">
        <span className="lg-orb is-a" />
        <span className="lg-orb is-b" />
        <span className="lg-orb is-c" />
        <span className="lg-grid" />
      </div>

      <div className="lg-shell">
        {/* ===== 왼쪽: 브랜드 ===== */}
        <aside className="lg-brand">
          <div className="lg-brand-top">
            <span className="lg-logo" aria-hidden="true">M</span>
            <span className="lg-brand-name">
              <strong>미쿠짱</strong>
              <em>ADMIN CONSOLE</em>
            </span>
          </div>

          <div className="lg-brand-copy">
            <h2>일본 구매대행 운영을<br />한 화면에서.</h2>
            <p>주문 · 배송 · 정산 · 회원 관리를 하나의 콘솔에서 처리합니다.</p>
          </div>

          <ul className="lg-features">
            <li><span style={{ ['--f' as string]: '96, 165, 250' } as React.CSSProperties}><Package size={16} weight="duotone" /></span>주문 진행 상태와 알림톡 발송</li>
            <li><span style={{ ['--f' as string]: '52, 211, 153' } as React.CSSProperties}><Truck size={16} weight="duotone" /></span>국제배송 추적과 배송 단계 관리</li>
            <li><span style={{ ['--f' as string]: '251, 191, 36' } as React.CSSProperties}><ChartLineUp size={16} weight="duotone" /></span>환율 · 수수료 · 정산 한눈에</li>
          </ul>

          <span className="lg-brand-foot">© 2026 MIKU Corp. All rights reserved.</span>
        </aside>

        {/* ===== 오른쪽: 로그인 ===== */}
        <main className={`lg-card ${shake ? 'is-shake' : ''}`}>
          <div className="lg-card-head">
            <span className="lg-mobile-logo" aria-hidden="true">M</span>
            <span className="lg-chip"><ShieldCheck size={12} weight="fill" /> 관리자 전용</span>
            <h1>다시 오신 걸 환영합니다</h1>
            <p>관리자 계정으로 로그인해주세요.</p>
          </div>

          <form onSubmit={handleLogin} className="lg-form" noValidate>
            <label className="lg-field">
              <span className="lg-label">아이디</span>
              <span className="lg-input">
                <User size={18} weight="duotone" />
                <input
                  ref={idRef}
                  type="text"
                  name="username"
                  autoComplete="username"
                  placeholder="관리자 아이디"
                  value={adminId}
                  onChange={(e) => { setAdminId(e.target.value); setErrorMsg(''); }}
                  disabled={isLoading}
                  aria-invalid={!!errorMsg}
                />
              </span>
            </label>

            <label className="lg-field">
              <span className="lg-label">
                비밀번호
                {capsLock && <em className="lg-caps"><WarningCircle size={12} weight="fill" /> Caps Lock 켜짐</em>}
              </span>
              <span className="lg-input">
                <LockKey size={18} weight="duotone" />
                <input
                  ref={pwRef}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
                  onKeyUp={onPwKey}
                  onKeyDown={onPwKey}
                  disabled={isLoading}
                  aria-invalid={!!errorMsg}
                />
                <button
                  type="button"
                  className="lg-eye"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
                </button>
              </span>
            </label>

            <div className="lg-row">
              <label className="lg-check">
                <input type="checkbox" checked={rememberId} onChange={(e) => setRememberId(e.target.checked)} />
                <span className="lg-check-box" aria-hidden="true" />
                아이디 저장
              </label>
            </div>

            {errorMsg && (
              <div className="lg-error" role="alert">
                <WarningCircle size={16} weight="fill" />
                {errorMsg}
              </div>
            )}

            <button type="submit" className="lg-submit" disabled={isLoading}>
              {isLoading
                ? <><CircleNotch size={18} weight="bold" className="lg-spin" /> 확인 중…</>
                : <>대시보드로 이동 <ArrowRight size={18} weight="bold" /></>}
            </button>
          </form>

          <p className="lg-note">
            <ShieldCheck size={13} weight="duotone" />
            보안을 위해 같은 곳에서 10분에 10번까지 로그인을 시도할 수 있습니다.
          </p>
          <span className="lg-card-foot">© 2026 MIKU Corp.</span>
        </main>
      </div>
    </div>
  );
}
