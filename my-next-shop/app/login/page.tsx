"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from "next-auth/react"; // 🌟 NextAuth signIn 추가

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      alert("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    try {
      // 1. 먼저 이메일이 존재하는지 확인
      const emailCheckRes = await fetch(`/api/users/search?email=${encodeURIComponent(email)}`);
      const emailCheckData = await emailCheckRes.json();

      if (!emailCheckData.success) {
        alert("일치하는 회원 정보가 없습니다. 이메일을 확인해주세요.");
        return;
      }

      // 2. 이메일이 존재하면 비밀번호까지 매칭되는지 확인
      const response = await fetch(`/api/users/search?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
      const data = await response.json();

      if (data.success && data.user) {
        const user = data.user;
        
        // 검색된 실제 유저 데이터를 localStorage에 설정
        localStorage.setItem('id', user.id.toString());
        localStorage.setItem('name', user.name);
        localStorage.setItem('email', user.email);
        localStorage.setItem('user_id', user.id.toString());

        alert(`${user.name}님, 환영합니다!`);
        
        // 홈페이지 메인화면으로 이동
        window.location.href = '/';
      } else {
        alert("비밀번호가 일치하지 않습니다.");
      }
    } catch (error) {
      console.error("로그인 중 오류 발생:", error);
      alert("로그인 처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ 
      minHeight: '80vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f8fafc'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '400px', 
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
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>로그인</h1>
          <p style={{ color: '#64748b', marginTop: '8px' }}>미쿠 서비스 이용을 위해 로그인해주세요.</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
              이메일 주소
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.com"
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#ff4b2b'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
              비밀번호
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#ff4b2b'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
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
            로그인하기
          </button>
        </form>

        {/* 🌟 소셜 로그인 구분선 */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          margin: '24px 0',
          color: '#94a3b8',
          fontSize: '12px'
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
          <span style={{ padding: '0 10px' }}>또는 간편 로그인</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
        </div>

        {/* 🌟 카카오 로그인 버튼 추가 */}
        <button 
          onClick={() => signIn('kakao', { callbackUrl: '/' })}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#FEE500', // 카카오 공식 옐로우
            color: '#000000', // 카카오 공식 가이드에 따른 검은색 텍스트
            borderRadius: '8px',
            border: 'none',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '10px', // 네이버 버튼과의 간격
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#FADA0A';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FEE500';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: '900' }}>K</span>
          카카오로 시작하기
        </button>

        {/* 🌟 네이버 로그인 버튼 */}
        <button 
          onClick={() => signIn('naver', { callbackUrl: '/' })}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#03C75A', // 네이버 공식 그린
            color: '#fff',
            borderRadius: '8px',
            border: 'none',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#02b350';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#03C75A';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: '900', fontFamily: 'Arial, sans-serif' }}>N</span>
          네이버로 시작하기
        </button>

        <div style={{ marginTop: '25px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
          계정이 없으신가요? 
          <Link href="/register" style={{ color: '#ff4b2b', fontWeight: 'bold', marginLeft: '8px', textDecoration: 'none' }}>
            회원가입
          </Link>
        </div>

        <div style={{ 
          marginTop: '30px', 
          paddingTop: '20px', 
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'center',
          gap: '20px'
        }}>
          <button style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}>아이디 찾기</button>
          <button style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}>비밀번호 찾기</button>
        </div>
      </div>
    </div>
  );
}