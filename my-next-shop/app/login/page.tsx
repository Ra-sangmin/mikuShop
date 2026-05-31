"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from "next-auth/react";
import { useMikuAlert } from '@/app/context/MikuAlertContext';
import { getSession } from "next-auth/react";

// ==========================================
// 🎨 1. 스타일 객체 (디자인 분리)
// ==========================================
const styles: Record<string, React.CSSProperties> = {
  pageWrapper: { minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '40px 20px' },
  card: { width: '100%', maxWidth: '400px', padding: '40px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  header: { textAlign: 'center', marginBottom: '30px' },
  logo: { height: '60px', marginBottom: '20px' },
  title: { fontSize: '24px', fontWeight: 'bold', color: '#1e293b' },
  subTitle: { color: '#64748b', marginTop: '8px' },
  inputGroup: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' },
  input: { width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none', boxSizing: 'border-box' },
  submitBtn: { width: '100%', padding: '14px', backgroundColor: '#ff4b2b', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' },
  divider: { display: 'flex', alignItems: 'center', margin: '24px 0', color: '#94a3b8', fontSize: '12px' },
  dividerLine: { flex: 1, height: '1px', backgroundColor: '#e2e8f0' },
  socialBtn: { width: '100%', padding: '14px', borderRadius: '8px', border: 'none', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px', transition: 'all 0.2s' },
  footer: { marginTop: '25px', textAlign: 'center', fontSize: '14px', color: '#64748b' },
  link: { color: '#ff4b2b', fontWeight: 'bold', marginLeft: '8px', textDecoration: 'none' },
  findAccountWrapper: { marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center', gap: '20px' },
  findAccountBtn: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }
};

// ==========================================
// 🧠 2. 메인 컴포넌트 (Logic)
// ==========================================
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { showAlert } = useMikuAlert();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🌟 이메일과 비밀번호 입력 체크 분리
    if (!email) {
      showAlert("이메일을 입력해주세요.", "warning");
      return;
    }
    
    if (!password) {
      showAlert("비밀번호를 입력해주세요.", "warning");
      return;
    }

    try {
      // 1. NextAuth로 로그인 시도
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      // 2. 결과 확인
      if (res?.error) {
        // 🌟 서버에서 보낸 에러 코드에 따라 메시지 분기
        if (res.error === "EMAIL_NOT_FOUND") {
          showAlert("존재하지 않는 이메일입니다.", "error");
        } else if (res.error === "PASSWORD_INCORRECT") {
          showAlert("비밀번호가 일치하지 않습니다.", "error");
        } else {
          showAlert("로그인에 실패했습니다. 다시 시도해주세요.", "error");
        }
      } else {
        // 3. 성공 시
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
    <div style={styles.pageWrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <Link href="/">
            <img src="/images/logo.png" alt="Logo" style={styles.logo} />
          </Link>
          <h1 style={styles.title}>로그인</h1>
          <p style={styles.subTitle}>미쿠 서비스 이용을 위해 로그인해주세요.</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>이메일 주소</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" style={styles.input} />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={styles.input} />
          </div>

          <button type="submit" style={styles.submitBtn} 
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e63e1f'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ff4b2b'}>
            로그인하기
          </button>
        </form>

        <div style={styles.divider}>
          <div style={styles.dividerLine}></div>
          <span style={{ padding: '0 10px' }}>또는 간편 로그인</span>
          <div style={styles.dividerLine}></div>
        </div>

        <button onClick={() => signIn('kakao', { callbackUrl: '/' })} style={{ ...styles.socialBtn, backgroundColor: '#FEE500', color: '#000' }}>
          <span style={{ fontSize: '18px', fontWeight: '900' }}>K</span> 카카오로 시작하기
        </button>

        <button onClick={() => signIn('naver', { callbackUrl: '/' })} style={{ ...styles.socialBtn, backgroundColor: '#03C75A', color: '#fff' }}>
          <span style={{ fontSize: '18px', fontWeight: '900', fontFamily: 'Arial' }}>N</span> 네이버로 시작하기
        </button>

        <div style={styles.footer}>
          계정이 없으신가요? <Link href="/register" style={styles.link}>회원가입</Link>
        </div>

        <div style={styles.findAccountWrapper}>
          <button style={styles.findAccountBtn}>아이디 찾기</button>
          <button style={styles.findAccountBtn}>비밀번호 찾기</button>
        </div>
      </div>
    </div>
  );
}