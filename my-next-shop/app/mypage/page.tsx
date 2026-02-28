"use client";
import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import GuideLayout from '../components/GuideLayout'; 

export default function MyPage() {
  const [userName, setUserName] = useState('고객');
  const [userLevel, setUserLevel] = useState('일반회원'); 
  const [userMoney, setUserMoney] = useState(0);
  const [userOrders, setUserOrders] = useState<any[]>([]);

  useEffect(() => {
    const storedId = localStorage.getItem('user_id'); 

    if (storedId) {
      fetch(`/api/users?id=${storedId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUserName(data.user.name);            
            setUserLevel(data.user.level);
            setUserMoney(data.user.cyberMoney);
            setUserOrders(data.user.orders || []);
          }
        })
        .catch(error => console.error("유저 정보 불러오기 실패:", error));
    } else {
      setUserName('고객');
    }
  }, []);

  const userInfo = {
    name: userName, 
    level: userLevel,
    mailboxNumber: 'SRW-25168',
    messages: 0,
    coupons: 1,
    money: userMoney
  };

  const purchaseStatus = useMemo(() => [
    { label: '전체내역', count: userOrders.length, desc: '모든내역을 확인합니다.', href: '/mypage/status?tab=전체내역' },
    { label: '장바구니', count: userOrders.filter((i: any) => i.status === '장바구니').length, desc: '구매신청 장바구니 목록', href: '/mypage/status?tab=장바구니' },
    { label: '구매실패', count: userOrders.filter((i: any) => i.status === '구매실패').length, desc: '1차완료 구매불가 목록', href: '/mypage/status?tab=구매실패' },
    { label: '1차완료', count: userOrders.filter((i: any) => i.status === '1차완료').length, desc: '1차결제완료 목록(구매진행)', href: '/mypage/status?tab=1차완료' },
    { label: '입고대기', count: userOrders.filter((i: any) => i.status === '입고대기').length, desc: '현지창고 도착대기중', href: '/mypage/status?tab=입고대기' },
    { label: '입고완료', count: userOrders.filter((i: any) => i.status === '입고완료').length, desc: '현지창고 도착, 합포장신청', href: '/mypage/status?tab=입고완료' },
    { label: '합포장중', count: userOrders.filter((i: any) => i.status === '합포장중').length, desc: '사루와창고 포장진행중', href: '/mypage/status?tab=합포장중' },
    { label: '2차요청', count: userOrders.filter((i: any) => i.status === '2차요청').length, desc: '합포장완료 2차결제견적', href: '/mypage/status?tab=2차요청' },
    { label: '2차완료', count: userOrders.filter((i: any) => i.status === '2차완료').length, desc: '출하준비중', href: '/mypage/status?tab=2차완료' },
    { label: '국제배송', count: userOrders.filter((i: any) => i.status === '국제배송').length, desc: '국제배송추적 및 도착', href: '/mypage/status?tab=국제배송' },
  ], [userOrders]);

  return (
    <GuideLayout title="마이페이지" type="mypage">
      <style jsx global>{`
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .anim-item {
          opacity: 0;
          animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
      `}</style>

      <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'Pretendard, "Noto Sans KR", sans-serif', color: '#334155' }}>
        
        <div className="anim-item" style={{ fontSize: '24px', fontWeight: '900', marginBottom: '30px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ color: '#0f172a' }}>{userInfo.name}님</span>
          <span style={{ color: '#e2e8f0', fontWeight: 'normal' }}>|</span>
          <span style={{ fontSize: '18px' }}>회원등급 : <span style={{ color: '#f97316', fontWeight: '900' }}>{userInfo.level} 🥉</span></span>
          <span style={{ color: '#e2e8f0', fontWeight: 'normal' }}>|</span>
          <span style={{ fontSize: '18px' }}>사서함번호 : <span style={{ color: '#f97316', fontWeight: '900' }}>{userInfo.mailboxNumber}</span></span>
          <Link href="/mypage/profile" style={{ marginLeft: 'auto' }}>
            <button style={{ 
              padding: '8px 16px', 
              fontSize: '14px', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0', 
              background: '#fff', 
              cursor: 'pointer',
              fontWeight: 'bold',
              color: '#64748b'
            }}>
              나의 배송지 정보 수정
            </button>
          </Link>
        </div>

        <div className="anim-item delay-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '50px' }}>
          <SummaryBox label="알림메시지" value={userInfo.messages} unit="개" />
          <SummaryBox label="보유쿠폰" value={userInfo.coupons} unit="장" />
          <SummaryBox label="미쿠짱머니" value={userInfo.money} unit="원" />
        </div>

        <div className="anim-item delay-2" style={{ border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden', marginBottom: '60px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', margin: 0, color: '#0f172a' }}>나의 일본 배송지 주소</h2>
          </div>
          <div style={{ padding: '30px 24px', backgroundColor: '#fff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <AddressItem label="우편번호" value="123-4567" />
                <AddressItem label="도도부현" value="東京都 (Tokyo)" />
                <AddressItem label="구/군/시" value="港区 (Minato-ku)" />
                <AddressItem label="상세주소 1" value="東麻부 1-2-3" />
              </div>
              <div>
                <AddressItem label="상세주소 2" value={userInfo.mailboxNumber} isHighlight />
                <AddressItem label="받는사람" value={`${userInfo.name} ${userInfo.mailboxNumber}`} isHighlight />
                <AddressItem label="전화번호" value="03-xxxx-xxxx" />
              </div>
            </div>
            <div style={{ marginTop: '20px', color: '#64748b', fontSize: '14px', fontWeight: '500', padding: '16px', backgroundColor: '#fff8f6', borderRadius: '12px', border: '1px solid #ffe4e0' }}>
              <span style={{ color: '#ea580c', fontWeight: '800' }}>ℹ️ 주의:</span> 상세주소 2(사서함번호)를 반드시 기입해 주셔야 빠른 입고 확인이 가능합니다.
            </div>
          </div>
        </div>

        <div id="purchase-status" className="anim-item delay-3" style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '30px', color: '#0f172a' }}>구매대행 상황</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {purchaseStatus.map((status, index) => (
              <StatusCard key={index} {...status} index={index} />
            ))}
          </div>
        </div>
      </div>
    </GuideLayout>
  );
}

function AddressItem({ label, value, isHighlight }: { label: string, value: string, isHighlight?: boolean }) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label}가 복사되었습니다.`);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
      <span style={{ width: '100px', fontSize: '15px', color: '#64748b', fontWeight: '800' }}>{label}</span>
      <div style={{ 
        flex: 1, 
        backgroundColor: isHighlight ? '#fff8f6' : '#f8fafc', 
        padding: '12px 16px', 
        borderRadius: '12px', 
        border: `1px solid ${isHighlight ? '#ffedd5' : '#e2e8f0'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: isHighlight ? '#ea580c' : '#0f172a',
        fontWeight: isHighlight ? '800' : '600',
        transition: 'all 0.2s'
      }}>
        <span style={{ fontSize: '15px' }}>{value}</span>
        <button 
          onClick={() => copyToClipboard(value)}
          style={{ 
            backgroundColor: '#fff', 
            border: '1px solid #cbd5e1', 
            padding: '4px 12px', 
            fontSize: '12px', 
            borderRadius: '6px', 
            cursor: 'pointer',
            marginLeft: '10px',
            color: '#475569',
            fontWeight: '700',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.color = '#f97316'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569'; }}
        >
          복사
        </button>
      </div>
    </div>
  );
}

function SummaryBox({ label, value, unit }: { label: string, value: number, unit: string }) {
  return (
    <div style={{ 
      backgroundColor: '#f97316', 
      color: '#fff', 
      padding: '24px', 
      borderRadius: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      alignItems: 'center',
      boxShadow: '0 10px 30px rgba(249, 115, 22, 0.2)',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}
    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'}
    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <span style={{ fontSize: '16px', fontWeight: '800', opacity: 0.9 }}>{label}</span>
      <div style={{ 
        backgroundColor: '#fff', 
        color: '#ea580c', 
        padding: '8px 20px', 
        borderRadius: '12px', 
        fontSize: '20px', 
        fontWeight: '900',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
      }}>
        {value.toLocaleString()} <span style={{ fontSize: '16px' }}>{unit}</span>
      </div>
    </div>
  );
}

function StatusCard({ label, count, desc, href, index }: { label: string, count: number, desc: string, href: string, index: number }) {
  const animationDelay = `${0.3 + index * 0.05}s`;

  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div 
        className="anim-item"
        style={{ 
          border: '1px solid #e2e8f0', 
          borderRadius: '16px', 
          overflow: 'hidden', 
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
          boxShadow: '0 4px 10px rgba(0,0,0,0.02)',
          backgroundColor: '#fff',
          animationDelay
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 20px rgba(249, 115, 22, 0.1)';
          e.currentTarget.style.borderColor = '#fdba74';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.02)';
          e.currentTarget.style.borderColor = '#e2e8f0';
        }}
      >
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>{label}</span>
          <div style={{ backgroundColor: count > 0 ? '#f97316' : '#f1f5f9', color: count > 0 ? '#fff' : '#64748b', padding: '4px 12px', borderRadius: '8px', fontSize: '15px', fontWeight: '900', transition: 'all 0.3s' }}>
            {count} <span style={{ fontSize: '13px', fontWeight: '700' }}>건</span>
          </div>
        </div>
        <div style={{ backgroundColor: '#f8fafc', padding: '12px 20px', fontSize: '14px', color: '#64748b', fontWeight: '500', borderTop: '1px solid #f1f5f9' }}>
          {desc}
        </div>
      </div>
    </Link>
  );
}
