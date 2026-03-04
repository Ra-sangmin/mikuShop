"use client";
import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import GuideLayout from '../components/GuideLayout'; 
// 🌟 글로벌 상수 및 라벨 임포트
import { ORDER_STATUS, ORDER_STATUS_LABEL } from '@/src/types/order';

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

  // 🌟 Enum 키를 사용하여 구매 상황 카운트 로직 수정
  const purchaseStatus = useMemo(() => [
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.ALL], 
      count: userOrders.length, 
      desc: '모든내역을 확인합니다.', 
      href: `/mypage/status?tab=${ORDER_STATUS.ALL}`  // 🌟 탭 이동 시에도 영문 키 사용
    },
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.CART], 
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.CART).length, 
      desc: '구매신청 장바구니 목록', 
      href: `/mypage/status?tab=${ORDER_STATUS.CART}` 
    },
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.FAILED], 
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.FAILED).length, 
      desc: '상품 결제 완료 구매불가 목록', 
      href: `/mypage/status?tab=${ORDER_STATUS.FAILED}` 
    },
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.PAID], 
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.PAID).length, 
      desc: '1차결제완료 목록(구매진행)', 
      href: `/mypage/status?tab=${ORDER_STATUS.PAID}` 
    },
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.ARRIVED], 
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.ARRIVED).length, 
      desc: '현지창고 도착, 합포장신청', 
      href: `/mypage/status?tab=${ORDER_STATUS.ARRIVED}` 
    },
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.PREPARING], 
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.PREPARING).length, 
      desc: '사루와창고 포장진행중', 
      href: `/mypage/status?tab=${ORDER_STATUS.PREPARING}` 
    },
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.PAYMENT_REQ], 
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.PAYMENT_REQ).length, 
      desc: '합포장완료 2차결제견적', 
      href: `/mypage/status?tab=${ORDER_STATUS.PAYMENT_REQ}` 
    },
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.PAYMENT_DONE], 
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.PAYMENT_DONE).length, 
      desc: '출하준비중', 
      href: `/mypage/status?tab=${ORDER_STATUS.PAYMENT_DONE}` 
    },
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.SHIPPING], 
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.SHIPPING).length, 
      desc: '국제배송추적 및 도착', 
      href: `/mypage/status?tab=${ORDER_STATUS.SHIPPING}` 
    },
  ], [userOrders]);

  return (
    <GuideLayout title="마이페이지" type="mypage">
      {/* 🌟 마이페이지 반응형 CSS */}
      <style jsx global>{`
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .anim-item { opacity: 0; animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }

        /* -------------------------------------------
           PC 기본 레이아웃 
           ------------------------------------------- */
        .mypage-header { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 24px; font-weight: 900; margin-bottom: 30px; color: #0f172a; }
        .mypage-header-info { font-size: 18px; font-weight: normal; }
        .mypage-divider { color: #e2e8f0; font-weight: normal; }
        .edit-btn-wrap { margin-left: auto; }
        .edit-btn { padding: 8px 16px; font-size: 14px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; font-weight: bold; color: #64748b; transition: all 0.2s; }
        .edit-btn:hover { border-color: #cbd5e1; color: #0f172a; }

        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 50px; }
        .address-panel { border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; margin-bottom: 60px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); }
        .address-panel-body { padding: 30px 24px; background-color: #fff; }
        .address-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        
        .status-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }

        /* 주소록 아이템 기본 스타일 */
        .address-item-wrap { display: flex; align-items: center; margin-bottom: 16px; }
        .address-item-label { width: 100px; font-size: 15px; color: #64748b; font-weight: 800; flex-shrink: 0; }
        .address-item-val-box { flex: 1; padding: 12px 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 15px; font-weight: 600; transition: all 0.2s; }

        /* -------------------------------------------
           📱 모바일 레이아웃 (768px 이하 스마트폰) 
           ------------------------------------------- */
        @media (max-width: 768px) {
          .mypage-header { flex-direction: column; align-items: flex-start; gap: 8px; font-size: 20px; }
          .mypage-header-info { font-size: 15px; }
          .mypage-divider { display: none; } /* 모바일에서는 구분선 숨김 */
          .edit-btn-wrap { width: 100%; margin-left: 0; margin-top: 10px; }
          .edit-btn { width: 100%; padding: 12px; }

          /* 요약 박스 (메시지/쿠폰/머니) - 모바일에서 간격 줄이고 패딩 축소 */
          .summary-grid { gap: 10px; margin-bottom: 40px; }
          .summary-box { padding: 16px 10px !important; border-radius: 16px !important; gap: 8px !important; }
          .summary-box-label { font-size: 13px !important; }
          .summary-box-val-wrap { padding: 6px 10px !important; font-size: 15px !important; }

          /* 주소 영역 - 세로 1줄로 변경 */
          .address-panel-body { padding: 20px 16px; }
          .address-grid { grid-template-columns: 1fr; gap: 0; }
          .address-item-wrap { flex-direction: column; align-items: flex-start; gap: 6px; margin-bottom: 20px; }
          .address-item-label { width: 100%; font-size: 14px; }
          .address-item-val-box { width: 100%; box-sizing: border-box; padding: 10px 14px; font-size: 14px; }

          /* 구매대행 상황 - 세로 1줄로 변경 */
          .status-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'Pretendard, "Noto Sans KR", sans-serif', color: '#334155' }}>
        
        {/* 상단 회원 정보 헤더 */}
        <div className="anim-item mypage-header">
          <span>{userInfo.name}님</span>
          <span className="mypage-divider">|</span>
          <span className="mypage-header-info">회원등급 : <span style={{ color: '#f97316', fontWeight: '900' }}>{userInfo.level} 🥉</span></span>
          <span className="mypage-divider">|</span>
          <span className="mypage-header-info">사서함번호 : <span style={{ color: '#f97316', fontWeight: '900' }}>{userInfo.mailboxNumber}</span></span>
          
          <Link href="/mypage/profile" className="edit-btn-wrap">
            <button className="edit-btn">
              나의 배송지 정보 수정
            </button>
          </Link>
        </div>

        {/* 3단 요약 박스 */}
        <div className="anim-item delay-1 summary-grid">
          <SummaryBox label="알림메시지" value={userInfo.messages} unit="개" />
          <SummaryBox label="보유쿠폰" value={userInfo.coupons} unit="장" />
          <SummaryBox label="미쿠짱머니" value={userInfo.money} unit="원" />
        </div>

        {/* 일본 배송지 주소 영역 */}
        <div className="anim-item delay-2 address-panel">
          <div style={{ backgroundColor: '#f8fafc', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', margin: 0, color: '#0f172a' }}>나의 일본 배송지 주소</h2>
          </div>
          <div className="address-panel-body">
            <div className="address-grid">
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
            <div style={{ marginTop: '20px', color: '#64748b', fontSize: '14px', fontWeight: '500', padding: '16px', backgroundColor: '#fff8f6', borderRadius: '12px', border: '1px solid #ffe4e0', wordBreak: 'keep-all' }}>
              <span style={{ color: '#ea580c', fontWeight: '800' }}>ℹ️ 주의:</span> 상세주소 2(사서함번호)를 반드시 기입해 주셔야 빠른 입고 확인이 가능합니다.
            </div>
          </div>
        </div>

        {/* 구매대행 상황 */}
        <div id="purchase-status" className="anim-item delay-3" style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '30px', color: '#0f172a' }}>구매대행 상황</h2>
          <div className="status-grid">
            {purchaseStatus.map((status, index) => (
              <StatusCard key={index} {...status} index={index} />
            ))}
          </div>
        </div>
      </div>
    </GuideLayout>
  );
}

// 🌟 AddressItem 반응형 적용
function AddressItem({ label, value, isHighlight }: { label: string, value: string, isHighlight?: boolean }) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label}가 복사되었습니다.`);
  };

  return (
    <div className="address-item-wrap">
      <span className="address-item-label">{label}</span>
      <div 
        className="address-item-val-box"
        style={{ 
          backgroundColor: isHighlight ? '#fff8f6' : '#f8fafc', 
          border: `1px solid ${isHighlight ? '#ffedd5' : '#e2e8f0'}`,
          color: isHighlight ? '#ea580c' : '#0f172a'
        }}
      >
        <span>{value}</span>
        <button 
          onClick={() => copyToClipboard(value)}
          style={{ 
            backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '4px 12px', 
            fontSize: '12px', borderRadius: '6px', cursor: 'pointer', marginLeft: '10px',
            color: '#475569', fontWeight: '700', transition: 'all 0.2s', flexShrink: 0
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

// 🌟 SummaryBox 반응형 적용
function SummaryBox({ label, value, unit }: { label: string, value: number, unit: string }) {
  return (
    <div 
      className="summary-box"
      style={{ 
        backgroundColor: '#f97316', color: '#fff', padding: '24px', borderRadius: '20px',
        display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center',
        boxShadow: '0 10px 30px rgba(249, 115, 22, 0.2)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'}
      onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <span className="summary-box-label" style={{ fontSize: '16px', fontWeight: '800', opacity: 0.9 }}>{label}</span>
      <div 
        className="summary-box-val-wrap"
        style={{ 
          backgroundColor: '#fff', color: '#ea580c', padding: '8px 20px', borderRadius: '12px', 
          fontSize: '20px', fontWeight: '900', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', whiteSpace: 'nowrap'
        }}
      >
        {value.toLocaleString()} <span style={{ fontSize: '16px' }}>{unit}</span>
      </div>
    </div>
  );
}

// 🌟 StatusCard 반응형 적용
function StatusCard({ label, count, desc, href, index }: { label: string, count: number, desc: string, href: string, index: number }) {
  const animationDelay = `${0.3 + index * 0.05}s`;

  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div 
        className="anim-item"
        style={{ 
          border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', 
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 4px 10px rgba(0,0,0,0.02)',
          backgroundColor: '#fff', animationDelay
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