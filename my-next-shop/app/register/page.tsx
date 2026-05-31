"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMikuAlert } from '@/app/context/MikuAlertContext';

// ==========================================
// 🎨 1. 스타일 객체 (디자인 분리)
// ==========================================
const styles: Record<string, React.CSSProperties> = {
  pageWrapper: { minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '40px 20px' },
  card: { width: '100%', maxWidth: '500px', padding: '40px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  header: { textAlign: 'center', marginBottom: '30px' },
  logo: { height: '60px', marginBottom: '20px' },
  title: { fontSize: '24px', fontWeight: 'bold', color: '#1e293b' },
  subTitle: { color: '#64748b', marginTop: '8px' },
  inputGroup: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' },
  input: { width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none', boxSizing: 'border-box' },
  submitBtn: { width: '100%', padding: '14px', backgroundColor: '#ff4b2b', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
  footer: { marginTop: '25px', textAlign: 'center', fontSize: '14px', color: '#64748b' },
  link: { color: '#ff4b2b', fontWeight: 'bold', marginLeft: '8px', textDecoration: 'none' }
};

// ==========================================
// 🧠 2. 메인 컴포넌트 (Logic)
// ==========================================
export default function RegisterPage() {
  const [formData, setFormData] = useState({
    loginId: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });
  
  const router = useRouter();
  const { showAlert } = useMikuAlert();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const { loginId, email, password, confirmPassword, name } = formData;

    if (!loginId || !email || !password || !name) {
      showAlert("모든 필드를 입력해주세요.", "warning");
      return;
    }

    if (password !== confirmPassword) {
      showAlert("비밀번호가 일치하지 않습니다.", "error");
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, email, password, name }),
      });

      const data = await response.json();

      if (data.success) {
        showAlert("회원가입이 완료되었습니다. 로그인해주세요.", "success");
        router.push('/login');
      } else {
        showAlert(data.error || "회원가입에 실패했습니다.", "error");
      }
    } catch (error) {
      console.error("회원가입 중 오류 발생:", error);
      showAlert("회원가입 처리 중 오류가 발생했습니다.", "error");
    }
  };

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <Link href="/">
            <img src="/images/logo.png" alt="Logo" style={styles.logo} />
          </Link>
          <h1 style={styles.title}>회원가입</h1>
          <p style={styles.subTitle}>미쿠의 새로운 가족이 되어주세요!</p>
        </div>

        <form onSubmit={handleRegister}>
          {renderInput("아이디", "loginId", "text", "사용하실 아이디를 입력하세요", formData.loginId, handleChange)}
          {renderInput("이름 (실명)", "name", "text", "홍길동", formData.name, handleChange)}
          {renderInput("이메일 주소", "email", "email", "example@mail.com", formData.email, handleChange)}
          {renderInput("비밀번호", "password", "password", "••••••••", formData.password, handleChange)}
          {renderInput("비밀번호 확인", "confirmPassword", "password", "••••••••", formData.confirmPassword, handleChange)}

          <button 
            type="submit"
            style={styles.submitBtn}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e63e1f'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ff4b2b'}
          >
            가입하기
          </button>
        </form>

        <div style={styles.footer}>
          이미 계정이 있으신가요? 
          <Link href="/login" style={styles.link}>로그인</Link>
        </div>
      </div>
    </div>
  );
}

// 🌟 입력 필드 렌더링 헬퍼 함수
function renderInput(label: string, name: string, type: string, placeholder: string, value: string, onChange: any) {
  return (
    <div style={styles.inputGroup}>
      <label style={styles.label}>{label}</label>
      <input 
        type={type} 
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={styles.input}
      />
    </div>
  );
}