"use client";
import React from 'react';
import Link from 'next/link';

export default function MyPage() {
  const userInfo = {
    name: '박성진',
    level: '미쿠뉴비',
    mailboxNumber: 'SRW-25168',
    messages: 0,
    coupons: 1,
    money: 0
  };

  const purchaseStatus = [
    { label: '전체내역', count: 1, desc: '모든내역을 확인합니다.', href: '/purchase/history' },
    { label: '장바구니', count: 1, desc: '구매신청 장바구니 목록', href: '/cart' },
    { label: '구매실패', count: 0, desc: '1차완료 구매불가 목록', href: '#' },
    { label: '1차완료', count: 0, desc: '1차결제완료 목록(구매진행)', href: '#' },
    { label: '입고대기', count: 0, desc: '현지창고 도착대기중', href: '#' },
    { label: '입고완료', count: 0, desc: '현지창고 도착, 합포장신청', href: '#' },
    { label: '합포장중', count: 0, desc: '사루와창고 포장진행중', href: '#' },
    { label: '2차요청', count: 0, desc: '합포장완료 2차결제견적', href: '#' },
    { label: '2차완료', count: 0, desc: '출하준비중', href: '#' },
    { label: '국제배송', count: 0, desc: '국제배송추적 및 도착', href: '#' },
  ];

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', padding: '60px 20px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* User Info Header */}
        <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span>{userInfo.name}님</span>
          <span style={{ color: '#ccc', fontWeight: 'normal' }}>/</span>
          <span>회원등급 : <span style={{ color: '#5b108d' }}>{userInfo.level} 🥉</span></span>
          <span style={{ color: '#ccc', fontWeight: 'normal' }}>/</span>
          <span>사서함번호 : <span style={{ color: '#5b108d' }}>{userInfo.mailboxNumber}</span></span>
        </div>

        {/* Summary Boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', marginBottom: '60px' }}>
          <SummaryBox label="알림메시지" value={userInfo.messages} unit="개" />
          <SummaryBox label="보유쿠폰" value={userInfo.coupons} unit="장" />
          <SummaryBox label="사루와머니" value={userInfo.money} unit="원" />
        </div>

        {/* Japan Shipping Address Section */}
        <div style={{ border: '1px solid #ddd', borderRadius: '12px', overflow: 'hidden', marginBottom: '60px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ backgroundColor: '#f8f8f8', padding: '25px 35px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>나의 일본 배송지 주소</h2>
            <div style={{ fontSize: '16px', color: '#666' }}>
              일본 쇼핑몰 주문 시 아래 주소를 <span style={{ color: '#ff4b2b', fontWeight: 'bold' }}>받는 사람 주소</span>로 입력해 주세요.
            </div>
          </div>
          <div style={{ padding: '40px 35px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '50px' }}>
            <div>
              <AddressItem label="우편번호" value="123-4567" />
              <AddressItem label="도도부현" value="東京都 (Tokyo)" />
              <AddressItem label="구/군/시" value="港区 (Minato-ku)" />
              <AddressItem label="상세주소 1" value="東麻布 1-2-3" />
            </div>
            <div>
              <AddressItem label="상세주소 2" value={userInfo.mailboxNumber} isHighlight />
              <AddressItem label="받는사람" value={`박성진 ${userInfo.mailboxNumber}`} isHighlight />
              <AddressItem label="전화번호" value="03-xxxx-xxxx" />
            </div>
          </div>
          <div style={{ padding: '0 35px 35px', color: '#888', fontSize: '15px' }}>
            ※ 상세주소 2(사서함번호)를 반드시 기입해 주셔야 빠른 입고 확인이 가능합니다.
          </div>
        </div>

        {/* Purchase Status Section */}
        <div style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '35px' }}>구매대행 상황</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
            {purchaseStatus.map((status, index) => (
              <StatusCard key={index} {...status} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddressItem({ label, value, isHighlight }: { label: string, value: string, isHighlight?: boolean }) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label}가 복사되었습니다.`);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
      <span style={{ width: '130px', fontSize: '18px', color: '#666', fontWeight: 'bold' }}>{label}</span>
      <div style={{ 
        flex: 1, 
        backgroundColor: '#f9f9f9', 
        padding: '12px 20px', 
        borderRadius: '6px', 
        border: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: isHighlight ? '#5b108d' : '#333',
        fontWeight: isHighlight ? 'bold' : 'normal'
      }}>
        <span style={{ fontSize: '18px' }}>{value}</span>
        <button 
          onClick={() => copyToClipboard(value)}
          style={{ 
            backgroundColor: '#fff', 
            border: '1px solid #ddd', 
            padding: '4px 12px', 
            fontSize: '14px', 
            borderRadius: '4px', 
            cursor: 'pointer',
            marginLeft: '15px'
          }}
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
      backgroundColor: '#5b108d', 
      color: '#fff', 
      padding: '25px 35px', 
      borderRadius: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 4px 12px rgba(91, 16, 141, 0.2)'
    }}>
      <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{label}</span>
      <div style={{ backgroundColor: '#fff', color: '#000', padding: '5px 15px', borderRadius: '4px', fontSize: '18px', fontWeight: 'bold' }}>
        {value}{unit}
      </div>
    </div>
  );
}

function StatusCard({ label, count, desc, href }: { label: string, count: number, desc: string, href: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', transition: 'transform 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
           onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
           onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#5b108d' }}>{label}</span>
          <div style={{ backgroundColor: '#5b108d', color: '#fff', padding: '3px 12px', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold' }}>
            {count} 건
          </div>
        </div>
        <div style={{ backgroundColor: '#f5f5f5', padding: '20px', fontSize: '15px', color: '#666', minHeight: '65px' }}>
          {desc}
        </div>
      </div>
    </Link>
  );
}
