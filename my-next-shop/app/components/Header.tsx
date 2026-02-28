"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Header() {
  const { data: session, status } = useSession();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 🌟 NextAuth 세션 정보를 기존 localStorage 기반 로그인 시스템과 동기화
  useEffect(() => {
    const syncAuth = async () => {
      if (status === "authenticated" && session?.user) {
        const dbUserId = (session.user as any).id;
        if (dbUserId) {
          localStorage.setItem('user_id', dbUserId.toString());
          localStorage.setItem('email', session.user.email || '');
          localStorage.setItem('name', session.user.name || '');
          setIsLoggedIn(true);

          // 🌟 기본 배송지 등록 여부 체크 후 미등록 시 리다이렉트
          try {
            const res = await fetch(`/api/users?id=${dbUserId}`);
            const data = await res.json();
            if (data.success && !data.user.defaultAddressId) {
              // 현재 페이지가 이미 프로필 페이지가 아닐 때만 이동
              if (window.location.pathname !== '/mypage/profile') {
                window.location.href = '/mypage/profile?newAddress=true';
              }
            }
          } catch (error) {
            console.error("기본 배송지 체크 실패:", error);
          }
        }
      } else if (status === "unauthenticated") {
        // NextAuth 세션이 없고 localStorage에도 정보가 없다면 로그아웃 상태
        const userId = localStorage.getItem('user_id');
        if (userId) {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      }
    };

    syncAuth();
  }, [session, status]);

  const handleLogout = async () => {
    if (window.confirm("로그아웃 하시겠습니까?")) {
      // 1. NextAuth 로그아웃 (소셜 로그인인 경우)
      if (status === "authenticated") {
        await signOut({ redirect: false });
      }

      // 2. 로컬 스토리지 정보 삭제
      localStorage.removeItem('id');
      localStorage.removeItem('name');
      localStorage.removeItem('email');
      localStorage.removeItem('user_id');

      setIsLoggedIn(false);
      alert('로그아웃 되었습니다.');
      window.location.href = '/';
    }
  };

  return (
    <header style={{ width: '100%' }}>
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #eee' }}>
        <div className="container" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'flex-start', 
          gap: '30px', 
          padding: '10px 20px', 
          maxWidth: '1350px', 
          margin: '0 auto' 
        }}>
        
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

          <nav>
            <ul style={{ 
              display: 'flex', 
              gap: '30px', 
              listStyle: 'none', 
              margin: 0, 
              padding: 0,
              alignItems: 'center'
            }}>
              <NavItem 
                  label="구매대행" 
                  activeColor="#ff4b2b"
                  items={[
                      { label: '전체내역', href: '/mypage/status?tab=전체내역' },
                      { label: '견적문의', href: '/purchase/quote' },
                      { label: '구매대행 신청', href: '/purchase/request' },
                  ]} 
              />
              <NavItem 
                  label="배송대행" 
                  activeColor="#ff4b2b"
                  items={[
                      { label: '전체내역', href: '/mypage/status?tab=전체내역' },
                      { label: '일본 배송주소 확인', href: '/delivery/address' },
                      { label: '배송신청', href: '/delivery/request' },
                  ]} 
              />
              <NavItem 
                  label="미쿠짱머니" 
                  activeColor="#ff4b2b"
                  items={[
                      { label: '충전하기', href: '/mypage/money/charge' },
                      { label: '이용내역', href: '/mypage/money/history' },
                      { label: '환불신청', href: '/mypage/money/refund' },
                  ]} 
              />
              <NavItem 
                  label="수수료/배송비" 
                  activeColor="#ff4b2b"
                  items={[
                      { label: '회원 등급 및 혜택', href: '/guide/membership' },
                      { label: '수수료 안내', href: '/guide/fee-guide' },
                      { label: '국제 배송 요금표', href: '/guide/shipping-fee' },
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
              {!isLoggedIn ? (
                <li style={{ padding: '15px 0' }}>
                  <Link 
                    href="/login"
                    style={{ 
                      fontSize: '18px', 
                      fontWeight: 'bold', 
                      color: '#333', 
                      textDecoration: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ff4b2b'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#333'}
                  >
                    로그인
                  </Link>
                </li>
              ) : (
                <NavItem 
                    label="마이페이지" 
                    activeColor="#ff4b2b"
                    items={[
                        { label: '내 정보', href: '/mypage' },
                        { label: '구매대행 상황', href: '/mypage/status?tab=전체내역' },
                        { label: '나의 배송지 정보 수정', href: '/mypage/profile' },
                        { label: '관심목록', href: '/wishlist' },
                        { label: '로그아웃', onClick: handleLogout },
                    ]} 
                />
              )}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

function NavItem({ label, items, activeColor }: { label: string, items?: { label: string, href?: string, onClick?: () => void }[], activeColor?: string }) {
  const [isHovered, setIsHovered] = useState(false);

  const renderLink = (item: { label: string, href?: string, onClick?: () => void }, index: number) => {
    const content = (
      <div 
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
        onClick={item.onClick}
      >
        <div style={{ 
            width: '32px', height: '32px', borderRadius: '8px', 
            backgroundColor: '#fff5f5', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', fontSize: '16px' 
        }}>
            {index === 0 && '📋'}
            {index === 1 && '✈️'}
            {index === 2 && '⚙️'}
            {index === 3 && '🛒'}
            {index === 4 && '🚪'}
        </div>
        <span style={{ fontWeight: '500', whiteSpace: 'nowrap' }}>{item.label}</span>
      </div>
    );

    if (item.href) {
      return (
        <Link href={item.href} style={{ textDecoration: 'none' }}>
          {content}
        </Link>
      );
    }

    return content;
  };

  return (
    <li 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ position: 'relative', cursor: 'pointer', padding: '15px 0' }}
    >
      <Link href="#" style={{ 
        fontSize: '18px', 
        fontWeight: 'bold', 
        color: isHovered && activeColor ? activeColor : '#333', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        transition: 'color 0.2s'
      }}>
        {label}
        <span style={{ fontSize: '10px', color: isHovered && activeColor ? activeColor : '#999', transition: 'color 0.2s' }}>▼</span>
      </Link>

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
              {renderLink(item, index)}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
