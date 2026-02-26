"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      // username 대신 admin_id를 사용하세요.
      body: JSON.stringify({ admin_id: adminId, password }), 
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      // Set a temporary cookie for middleware
      document.cookie = "admin_session=true; path=/";

      // 🌟 1. 백엔드에서 보낸 JSON 응답 데이터를 읽어옵니다.
      const data = await res.json();

      // 🌟 2. localStorage에 아이디와 이름을 각각 저장합니다.
      localStorage.setItem('admin_id', adminId);
      
      // DB에 name 값이 null일 수도 있으므로, 값이 있을 때만 저장하는 방어 코드
      if (data.name) {
        localStorage.setItem('admin_name', data.name);
      }
      
      router.push('/admin/dashboard');
    } else {
      // 401 에러 등이 올 경우 상세 메시지 처리 가능
      alert('로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.');
    }
    } catch (error) {
      console.error('Login error:', error);
      alert('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f172a', // 어두운 슬레이트 배경으로 고급스러운 느낌
      zIndex: 9999,
      fontFamily: "'Inter', 'Noto Sans KR', sans-serif"
    }}>
      {/* 배경 장식 요소 */}
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(15,23,42,0) 70%)',
        top: '-100px',
        right: '-100px',
        zIndex: -1
      }}></div>
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, rgba(15,23,42,0) 70%)',
        bottom: '-100px',
        left: '-100px',
        zIndex: -1
      }}></div>

      <div style={{
        maxWidth: '500px',
        width: '95%',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        padding: '60px 50px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ 
            fontSize: '42px', 
            fontWeight: '800', 
            letterSpacing: '-0.025em',
            background: 'linear-gradient(to right, #2563eb, #7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0 
          }}>미쿠짱 </h1>
          <div style={{ 
            marginTop: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '8px'
          }}>
            <p style={{ color: '#64748b', fontSize: '18px', fontWeight: '500', margin: 0 }}>관리자 페이지</p>
          </div>
        </div>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', paddingLeft: '4px' }}>아이디</label>
            <input 
              type="text" 
              style={{
                width: '100%',
                padding: '18px 24px',
                backgroundColor: '#f8fafc',
                border: '2px solid #f1f5f9',
                borderRadius: '16px',
                outline: 'none',
                fontSize: '18px',
                color: '#1e293b',
                transition: 'all 0.2s ease',
                boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)'
              }}
              placeholder="Admin ID" 
              value={adminId} 
              onChange={(e) => setAdminId(e.target.value)} 
              required
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', paddingLeft: '4px' }}>비밀번호</label>
            <input 
              type="password" 
              style={{
                width: '100%',
                padding: '18px 24px',
                backgroundColor: '#f8fafc',
                border: '2px solid #f1f5f9',
                borderRadius: '16px',
                outline: 'none',
                fontSize: '18px',
                color: '#1e293b',
                transition: 'all 0.2s ease',
                boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)'
              }}
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '20px',
              marginTop: '10px',
              borderRadius: '16px',
              background: isLoading ? '#94a3b8' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '20px',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
          >
            {isLoading ? 'Authenticating...' : '대시보드로 이동'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '40px', color: '#94a3b8', fontSize: '14px' }}>
          &copy; 2026 MIKU Corp. All rights reserved.
        </p>
      </div>
    </div>
  );
}
