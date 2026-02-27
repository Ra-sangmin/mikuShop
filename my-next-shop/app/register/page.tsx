"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    loginId: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { loginId, email, password, confirmPassword, name } = formData;

    if (!loginId || !email || !password || !name) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    if (password !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ loginId, email, password, name }),
      });

      const data = await response.json();

      if (data.success) {
        alert("회원가입이 완료되었습니다. 로그인해주세요.");
        router.push('/login');
      } else {
        alert(data.error || "회원가입에 실패했습니다.");
      }
    } catch (error) {
      console.error("회원가입 중 오류 발생:", error);
      alert("회원가입 처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ 
      minHeight: '80vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      padding: '40px 20px'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '500px', 
        padding: '40px', 
        backgroundColor: '#fff', 
        borderRadius: '12px', 
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Link href="/">
            <img src="/images/logo.png" alt="Logo" style={{ height: '60px', marginBottom: '20px' }} />
          </Link>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>회원가입</h1>
          <p style={{ color: '#64748b', marginTop: '8px' }}>미쿠의 새로운 가족이 되어주세요!</p>
        </div>

        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
              아이디
            </label>
            <input 
              type="text" 
              name="loginId"
              value={formData.loginId}
              onChange={handleChange}
              placeholder="사용하실 아이디를 입력하세요"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
              이름 (실명)
            </label>
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="홍길동"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
              이메일 주소
            </label>
            <input 
              type="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@mail.com"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
              비밀번호
            </label>
            <input 
              type="password" 
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
              비밀번호 확인
            </label>
            <input 
              type="password" 
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          <button 
            type="submit"
            style={{ 
              width: '100%', 
              padding: '14px', 
              backgroundColor: '#ff4b2b', 
              color: '#fff', 
              borderRadius: '8px', 
              border: 'none', 
              fontSize: '16px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e63e1f'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ff4b2b'}
          >
            가입하기
          </button>
        </form>

        <div style={{ marginTop: '25px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
          이미 계정이 있으신가요? 
          <Link href="/login" style={{ color: '#ff4b2b', fontWeight: 'bold', marginLeft: '8px', textDecoration: 'none' }}>
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', 
  padding: '12px 16px', 
  borderRadius: '8px', 
  border: '1px solid #e2e8f0',
  fontSize: '15px',
  outline: 'none',
  transition: 'border-color 0.2s'
};
