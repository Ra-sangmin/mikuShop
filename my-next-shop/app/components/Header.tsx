"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 🌟 1. 페이지 로드 시 기존 로그인 정보가 있는지 확인 (새로고침 유지용)
  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (userId) {
      setIsLoggedIn(true);
    }
  }, []);

  // 🌟 2. 임시 로그인 핸들러 추가
  const handleLogin = () => {
    const tempId = "test@example.com";
    const tempPw = "1234";

    console.log(`서버로 전송할 데이터: ID=${tempId}, PW=${tempPw}`);
    
    // DB에 만들어두었던 1번 유저 정보라고 가정하고 브라우저에 저장
    localStorage.setItem('id', '1');
    localStorage.setItem('name', '테스트유저');
    localStorage.setItem('email', tempId);

    setIsLoggedIn(true);
    alert(`${tempId} 계정으로 로그인되었습니다!`);
  };

  // 🌟 3. 로그아웃 핸들러 추가
  const handleLogout = () => {
    // 저장했던 유저 정보 모두 삭제
    localStorage.removeItem('id');
    localStorage.removeItem('name');
    localStorage.removeItem('email');
    
    setIsLoggedIn(false);
    alert('로그아웃 되었습니다.');
  };

  return (
    <header style={{ width: '100%' }}>
      {/* 상단 유틸리티 바 */}
      <div style={{ 
        backgroundColor: '#fff', 
        borderBottom: '1px solid #f1f5f9',
        color: '#1e293b'
      }}>
        <div className="container" style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '20px 20px',
        }}>
          {/* 좌측 소식/공지 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '900', 
              backgroundColor: '#ff4b2b', 
              color: '#fff',
              padding: '4px 10px', 
              borderRadius: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>NOTICE</div>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>
              미쿠짱과 함께하는 즐거운 일본 직구 쇼핑 🇯🇵
            </div>
          </div>

          {/* 우측 유틸리티 링크 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
            {!isLoggedIn ? (
              <>
                <div 
                  onClick={handleLogin} // 🌟 클릭 시 임시 로그인 실행
                  style={{ 
                    fontSize: '14px', 
                    fontWeight: '700', 
                    color: '#475569', 
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ff4b2b';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#475569';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <i className="fa fa-lock" style={{ fontSize: '12px', opacity: 0.8 }}></i>
                  로그인
                </div>
                <div 
                  onClick={() => alert('회원가입 페이지로 이동합니다.')} 
                  style={{ 
                    fontSize: '14px', 
                    fontWeight: '700', 
                    color: '#475569', 
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ff4b2b';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#475569';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <i className="fa fa-user-plus" style={{ fontSize: '12px', opacity: 0.8 }}></i>
                  회원가입
                </div>
              </>
            ) : (
              <>
                <div 
                  onClick={handleLogout} // 🌟 클릭 시 로그아웃 실행
                  style={{ 
                    fontSize: '14px', 
                    fontWeight: '700', 
                    color: '#475569', 
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ff4b2b';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#475569';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <i className="fa fa-sign-out-alt" style={{ fontSize: '12px', opacity: 0.8 }}></i>
                  로그아웃
                </div>
                <Link href="/mypage" style={{ 
                  fontSize: '14px', 
                  fontWeight: '700', 
                  color: '#475569', 
                  textDecoration: 'none',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ff4b2b';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#475569';
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
                >
                  <i className="fa fa-user-circle" style={{ fontSize: '12px', opacity: 0.8 }}></i>
                  마이페이지
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 메인 헤더 영역 */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}>
        <div className="container" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'flex-start', 
          gap: '50px', 
          padding: '10px 20px', 
          maxWidth: '1200px', 
          margin: '0 auto' 
        }}>
        
          {/* 로고 영역 */}
          <div style={{ flexShrink: 0 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <img 
                src="/images/logo.png" 
                alt="Miku Shop" 
                style={{ 
                  height: '75px', 
                  width: 'auto', 
                  display: 'block',
                  objectFit: 'contain'
                }} 
              />
            </Link>
          </div>

          {/* 내비게이션 메뉴 */}
          <nav>
            <ul style={{ 
              display: 'flex', 
              gap: '30px', 
              listStyle: 'none', 
              margin: 0, 
              padding: 0 
            }}>
              <NavItem 
                  label="구매대행" 
                  activeColor="#ff4b2b"
                  items={[
                      { label: '전체내역', href: '/mypage/status?tab=전체내역' },
                      { label: '국제배송 신청', href: '/purchase/shipping-request' },
                      { label: '견적문의', href: '/purchase/quote' },
                      { label: '구매대행 신청', href: '/purchase/request' },
                  ]} 
              />
              <NavItem 
                  label="배송대행" 
                  activeColor="#ff4b2b"
                  items={[
                      { label: '일본 배송주소 확인', href: '/delivery/address' },
                      { label: '배송신청', href: '/delivery/request' },
                  ]} 
              />
              <NavItem 
                  label="수수료/배송비" 
                  activeColor="#ff4b2b"
                  items={[
                      { label: '회원 등급 및 혜택', href: '/guide/membership' },
                      { label: '수수료 안내', href: '/fee-guide' },
                      { label: '국제 배송 요금표', href: '/shipping-fee' },
                      { label: '예상 관부과세 안내', href: '/guide/customs' },
                  ]}
              />
              <NavItem 
                  label="이용가이드" 
                  activeColor="#ff4b2b"
                  items={[
                      { label: '구매대행 신청방법', href: '/guide/purchase-method' },
                      { label: '배송대행 신청방법', href: '/guide/delivery-method' },
                      { label: '자주하는 질문', href: '/guide/faq' },
                  ]}
              />
              <NavItem 
                  label="고객문의" 
                  activeColor="#ff4b2b"
                  items={[
                      { label: '카카오톡 문의', href: '/contact' },
                  ]}
              />
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

function NavItem({ label, items, activeColor }: { label: string, items?: { label: string, href: string }[], activeColor?: string }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <li 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ position: 'relative', cursor: 'pointer', padding: '15px 0' }}
    >
      <Link href="#" style={{ 
        fontSize: '20px', 
        fontWeight: 'bold', 
        color: isHovered && activeColor ? activeColor : '#333', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        textDecoration: 'none',
        transition: 'color 0.2s'
      }}>
        {label}
        <span style={{ fontSize: '12px', color: isHovered && activeColor ? activeColor : '#999', transition: 'color 0.2s' }}>▼</span>
      </Link>

      {/* 드롭다운 메뉴 */}
      {items && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: `translateX(-50%) translateY(${isHovered ? '0' : '10px'})`,
          backgroundColor: '#fff',
          border: '1px solid #eee',
          listStyle: 'none',
          padding: '8px 0',
          margin: '0',
          minWidth: '220px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
          zIndex: 1000,
          borderRadius: '12px',
          opacity: isHovered ? 1 : 0,
          visibility: isHovered ? 'visible' : 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: isHovered ? 'auto' : 'none'
        }}>
          {/* 삼각형 화살표 */}
          <div style={{
            position: 'absolute',
            top: '-6px',
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: '12px',
            height: '12px',
            backgroundColor: '#fff',
            borderTop: '1px solid #eee',
            borderLeft: '1px solid #eee'
          }}></div>

          {items.map((item, index) => (
            <li key={index} style={{ padding: '2px 8px' }}>
              <Link 
                href={item.href} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 15px', 
                  fontSize: '15px', 
                  color: '#4b5563', 
                  textDecoration: 'none',
                  borderRadius: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                    e.currentTarget.style.color = '#ff4b2b';
                    e.currentTarget.style.transform = 'translateX(5px)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#4b5563';
                    e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{ 
                    width: '32px', height: '32px', borderRadius: '8px', 
                    backgroundColor: '#fff5f5', display: 'flex', alignItems: 'center', 
                    justifyContent: 'center', fontSize: '16px' 
                }}>
                    {index === 0 && '📋'}
                    {index === 1 && '✈️'}
                    {index === 2 && '🛒'}
                </div>
                <span style={{ fontWeight: '500' }}>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}