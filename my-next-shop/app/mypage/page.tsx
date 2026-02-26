"use client";
import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import GuideLayout from '../components/GuideLayout'; 
// 더 이상 가짜 데이터를 쓰지 않으므로 useCart는 지우셔도 됩니다.

export default function MyPage() {
  const [userName, setUserName] = useState('고객');
  const [userLevel, setUserLevel] = useState('일반회원'); 
  const [userMoney, setUserMoney] = useState(0);
  
  // 🌟 1. DB에서 가져온 실제 주문 목록을 담을 State 추가
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
            
            // 🌟 2. API에서 함께 넘겨준 주문 내역(orders)을 State에 저장합니다.
            setUserOrders(data.user.orders || []);
          }
        })
        .catch(error => console.error("유저 정보 불러오기 실패:", error));
    } else {
      setUserName('고객');
    }
  }, []);

  // 🌟 3. 가져온 State들을 UI에 뿌려주기 위해 객체에 연결
  const userInfo = {
    name: userName, 
    level: userLevel,
    mailboxNumber: 'SRW-25168',
    messages: 0,
    coupons: 1,
    money: userMoney
  };

  // 🌟 3. cartItems 대신 'userOrders(진짜 DB 데이터)'를 필터링하도록 전면 수정!
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
  ], [userOrders]); // 의존성 배열도 userOrders로 변경해 줍니다.

  return (
    <GuideLayout title="마이페이지" type="mypage">
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* User Info Header */}
        <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <span>{userInfo.name}님</span>
          <span style={{ color: '#ccc', fontWeight: 'normal' }}>/</span>
          <span>회원등급 : <span style={{ color: '#5b108d' }}>{userInfo.level} 🥉</span></span>
          <span style={{ color: '#ccc', fontWeight: 'normal' }}>/</span>
          <span>사서함번호 : <span style={{ color: '#5b108d' }}>{userInfo.mailboxNumber}</span></span>
        </div>

        {/* Summary Boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
          <SummaryBox label="알림메시지" value={userInfo.messages} unit="개" />
          <SummaryBox label="보유쿠폰" value={userInfo.coupons} unit="장" />
          <SummaryBox label="사루와머니" value={userInfo.money} unit="원" />
        </div>

        {/* Japan Shipping Address Section */}
        <div style={{ border: '1px solid #ddd', borderRadius: '12px', overflow: 'hidden', marginBottom: '50px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ backgroundColor: '#f8f8f8', padding: '15px 20px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>나의 일본 배송지 주소</h2>
          </div>
          <div style={{ padding: '25px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <AddressItem label="우편번호" value="123-4567" />
                <AddressItem label="도도부현" value="東京都 (Tokyo)" />
                <AddressItem label="구/군/시" value="港区 (Minato-ku)" />
                <AddressItem label="상세주소 1" value="東麻布 1-2-3" />
              </div>
              <div>
                <AddressItem label="상세주소 2" value={userInfo.mailboxNumber} isHighlight />
                <AddressItem label="받는사람" value={`${userInfo.name} ${userInfo.mailboxNumber}`} isHighlight />
                <AddressItem label="전화번호" value="03-xxxx-xxxx" />
              </div>
            </div>
            <div style={{ marginTop: '15px', color: '#888', fontSize: '13px' }}>
              ※ 상세주소 2(사서함번호)를 반드시 기입해 주셔야 빠른 입고 확인이 가능합니다.
            </div>
          </div>
        </div>

        {/* Purchase Status Section */}
        <div id="purchase-status" style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '25px' }}>구매대행 상황</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            {purchaseStatus.map((status, index) => (
              <StatusCard key={index} {...status} />
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
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
      <span style={{ width: '100px', fontSize: '14px', color: '#666', fontWeight: 'bold' }}>{label}</span>
      <div style={{ 
        flex: 1, 
        backgroundColor: '#f9f9f9', 
        padding: '8px 12px', 
        borderRadius: '6px', 
        border: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: isHighlight ? '#5b108d' : '#333',
        fontWeight: isHighlight ? 'bold' : 'normal'
      }}>
        <span style={{ fontSize: '14px' }}>{value}</span>
        <button 
          onClick={() => copyToClipboard(value)}
          style={{ 
            backgroundColor: '#fff', 
            border: '1px solid #ddd', 
            padding: '2px 8px', 
            fontSize: '12px', 
            borderRadius: '4px', 
            cursor: 'pointer',
            marginLeft: '10px'
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
      padding: '15px 20px', 
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      alignItems: 'center',
      boxShadow: '0 4px 12px rgba(91, 16, 141, 0.2)'
    }}>
      <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{label}</span>
      <div style={{ backgroundColor: '#fff', color: '#000', padding: '3px 12px', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold' }}>
        {value}{unit}
      </div>
    </div>
  );
}

function StatusCard({ label, count, desc, href }: { label: string, count: number, desc: string, href: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', transition: 'transform 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
           onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
           onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
        <div style={{ padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#5b108d' }}>{label}</span>
          <div style={{ backgroundColor: '#5b108d', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold' }}>
            {count} 건
          </div>
        </div>
        <div style={{ backgroundColor: '#f5f5f5', padding: '10px 15px', fontSize: '13px', color: '#666' }}>
          {desc}
        </div>
      </div>
    </Link>
  );
}