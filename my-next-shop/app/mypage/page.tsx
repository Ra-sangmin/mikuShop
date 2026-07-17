'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import GuideLayout from '../components/GuideLayout'; 
import { ORDER_STATUS, ORDER_STATUS_LABEL } from '@/src/types/order';

// =================================================================
// 1. 비즈니스 로직 영역 (Business Logic Layer)
// 데이터 페칭, 클립보드 복사 등 순수 기능만 전담합니다.
// =================================================================
function useMyPageLogic() {
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

  // 🌟 누락되었던 12개 모든 상태 항목 추가 및 진행 흐름에 맞춘 순서 정렬
  const purchaseStatus = useMemo(() => [
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.ALL] || "전체내역", 
      count: userOrders.length, 
      desc: '모든내역을 확인합니다.', 
      href: `/mypage/status?tab=${ORDER_STATUS.ALL}` 
    },
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.CART] || "구매 요청", 
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.CART).length, 
      desc: '구매신청 장바구니 목록', 
      href: `/mypage/status?tab=${ORDER_STATUS.CART}` 
    },
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.BID_PENDING] || "경매 요청", 
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.BID_PENDING).length, 
      desc: '경매 입찰을 위한 보증금 결제대기', 
      href: `/mypage/status?tab=${ORDER_STATUS.BID_PENDING}` 
    },
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.BIDDING] || "경매 상황", 
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.BIDDING).length, 
      desc: '현재 경매 입찰 진행중인 상품', 
      href: `/mypage/status?tab=${ORDER_STATUS.BIDDING}` 
    },
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.BID_SUCCESS] || "경매 낙찰 성공", 
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.BID_SUCCESS).length, 
      desc: '경매 낙찰 성공, 1차결제 대기', 
      href: `/mypage/status?tab=${ORDER_STATUS.BID_SUCCESS}` 
    },
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.FAILED] || "경매/구매 실패", 
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.FAILED).length, 
      desc: '상품 결제 완료 구매불가 목록', 
      href: `/mypage/status?tab=${ORDER_STATUS.FAILED}` 
    },
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.PAID] || "상품 결제 완료", 
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.PAID).length, 
      desc: '1차결제완료 목록(구매진행)', 
      href: `/mypage/status?tab=${ORDER_STATUS.PAID}` 
    },
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.ARRIVED] || "입고 완료", 
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.ARRIVED).length, 
      desc: '현지창고 도착, 합포장신청', 
      href: `/mypage/status?tab=${ORDER_STATUS.ARRIVED}` 
    },
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.PREPARING] || "배송 준비중", 
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.PREPARING).length, 
      desc: '미쿠짱창고 포장진행중', 
      href: `/mypage/status?tab=${ORDER_STATUS.PREPARING}` 
    },
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.PAYMENT_REQ] || "배송비 요청", 
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.PAYMENT_REQ).length, 
      desc: '합포장완료 2차결제견적', 
      href: `/mypage/status?tab=${ORDER_STATUS.PAYMENT_REQ}` 
    },
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.PAYMENT_DONE] || "배송비 결제 완료", 
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.PAYMENT_DONE).length, 
      desc: '출하준비중', 
      href: `/mypage/status?tab=${ORDER_STATUS.PAYMENT_DONE}` 
    },
    { 
      label: ORDER_STATUS_LABEL[ORDER_STATUS.SHIPPING] || "국제 배송", 
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.SHIPPING).length, 
      desc: '국제배송추적 및 도착', 
      href: `/mypage/status?tab=${ORDER_STATUS.SHIPPING}` 
    },
  ], [userOrders]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} 정보가 복사되었습니다.`);
  };

  return { userInfo, purchaseStatus, copyToClipboard };
}

// =================================================================
// 2. 화면 컴포넌트 영역 (View Layer)
// =================================================================

// 🌟 주소록 아이템
const AddressItem = ({ label, value, isHighlight, onCopy }: { label: string, value: string, isHighlight?: boolean, onCopy: (val: string, lbl: string) => void }) => (
  <div className="miku-mypage-address-item">
    <span className="address-label">{label}</span>
    <div className={`address-val-box ${isHighlight ? 'highlight' : ''}`}>
      <span className="val-text">{value}</span>
      <button className="copy-btn" onClick={() => onCopy(value, label)}>복사</button>
    </div>
  </div>
);

// 🌟 3단 요약 박스
const SummaryBox = ({ label, value, unit, icon }: { label: string, value: number, unit: string, icon: string }) => (
  <div className="miku-mypage-summary-box">
    <div className="summary-icon">{icon}</div>
    <div className="summary-content">
      <span className="summary-label">{label}</span>
      <div className="summary-value">
        {value.toLocaleString()} <span className="summary-unit">{unit}</span>
      </div>
    </div>
  </div>
);

// 🌟 구매대행 상황 카드
const StatusCard = ({ label, count, desc, href, index }: { label: string, count: number, desc: string, href: string, index: number }) => (
  <Link href={href} className="miku-mypage-status-link">
    <div className="miku-mypage-status-card anim-slide-up" style={{ animationDelay: `${0.05 * index}s` }}>
      <div className="status-card-header">
        <span className="status-title">{label}</span>
        <div className={`status-badge ${count > 0 ? 'active' : ''}`}>
          {count} <span>건</span>
        </div>
      </div>
      <div className="status-card-body">
        <p>{desc}</p>
        <svg className="status-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </div>
    </div>
  </Link>
);

// 🌟 메인 페이지 조립
export default function MyPage() {
  const { userInfo, purchaseStatus, copyToClipboard } = useMyPageLogic();

  return (
    <GuideLayout title="마이페이지" type="mypage">
      <div className="miku-mypage-wrapper">
        
        {/* 상단 회원 정보 헤더 */}
        <div className="miku-mypage-welcome-board anim-slide-up">
          <div className="welcome-info">
            <div>
              <h1 className="welcome-title">{userInfo.name}님, 환영합니다!</h1>
              <div className="welcome-badges">
                <span className="badge level-badge">회원등급: <b>{userInfo.level}</b></span>
                <span className="badge box-badge">사서함: <b>{userInfo.mailboxNumber}</b></span>
              </div>
            </div>
          </div>
          <Link href="/mypage/profile" className="edit-profile-btn">
            나의 배송지 정보 수정 <span>→</span>
          </Link>
        </div>

        {/* 3단 요약 박스 */}
        <div className="miku-mypage-summary-grid anim-slide-up delay-1">
          <SummaryBox label="알림메시지" value={userInfo.messages} unit="개" icon="🔔" />
          <SummaryBox label="보유쿠폰" value={userInfo.coupons} unit="장" icon="🎫" />
          <SummaryBox label="미쿠짱머니" value={userInfo.money} unit="원" icon="💰" />
        </div>

        {/* 일본 배송지 주소 영역 */}
        <div className="miku-mypage-section anim-slide-up delay-2">
          <div className="section-header">
            <h2>나의 일본 배송지 주소 <span>🇯🇵</span></h2>
          </div>
          <div className="section-body address-panel">
            <div className="address-grid">
              <div className="address-col">
                <AddressItem label="우편번호" value="123-4567" onCopy={copyToClipboard} />
                <AddressItem label="도도부현" value="東京都 (Tokyo)" onCopy={copyToClipboard} />
                <AddressItem label="구/군/시" value="港区 (Minato-ku)" onCopy={copyToClipboard} />
                <AddressItem label="상세주소 1" value="東麻 1-2-3" onCopy={copyToClipboard} />
              </div>
              <div className="address-col">
                <AddressItem label="상세주소 2" value={userInfo.mailboxNumber} isHighlight onCopy={copyToClipboard} />
                <AddressItem label="받는사람" value={`${userInfo.name} ${userInfo.mailboxNumber}`} isHighlight onCopy={copyToClipboard} />
                <AddressItem label="전화번호" value="03-xxxx-xxxx" onCopy={copyToClipboard} />
              </div>
            </div>
            <div className="address-warning">
              <b>ℹ️ 주의:</b> 상세주소 2(사서함번호)를 반드시 기입해 주셔야 빠른 입고 확인이 가능합니다.
            </div>
          </div>
        </div>

        {/* 구매대행 상황 (12개 아이템 표시) */}
        <div className="miku-mypage-section anim-slide-up delay-3" style={{ marginBottom: '40px' }}>
          <div className="section-header">
            <h2>구매대행 상황 <span>📦</span></h2>
          </div>
          <div className="status-grid">
            {purchaseStatus.map((status, index) => (
              <StatusCard key={index} {...status} index={index} />
            ))}
          </div>
        </div>

      </div>

      {/* ================================================================= */}
      {/* 3. 디자인 영역 (CSS Layer) */}
      {/* ================================================================= */}
      <style jsx global>{`
        .miku-mypage-wrapper {
          max-width: 1000px;
          margin: 0 auto;
          font-family: 'Pretendard', "Noto Sans KR", sans-serif;
          color: #0f172a;
        }

        /* 🌟 웰컴 보드 */
        .miku-mypage-welcome-board {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 32px 40px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 24px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
          margin-bottom: 40px;
        }
        .welcome-info { display: flex; align-items: center; gap: 20px; }
        
        .welcome-title { font-size: 24px; font-weight: 900; margin: 0 0 10px 0; color: #0f172a; letter-spacing: -0.5px; }
        .welcome-badges { display: flex; gap: 12px; }
        .badge { padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; }
        .level-badge { background: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; }
        .level-badge b { font-weight: 900; }
        .box-badge { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
        
        .edit-profile-btn {
          display: inline-flex; align-items: center; gap: 8px; padding: 14px 24px;
          background: #0f172a; color: #fff; border-radius: 14px; font-size: 14px; font-weight: 800;
          text-decoration: none; transition: all 0.3s ease; box-shadow: 0 8px 16px rgba(15, 23, 42, 0.15);
        }
        .edit-profile-btn:hover { transform: translateY(-2px); background: #1e293b; box-shadow: 0 12px 20px rgba(15, 23, 42, 0.25); }
        .edit-profile-btn span { transition: transform 0.3s; }
        .edit-profile-btn:hover span { transform: translateX(4px); }

        /* 🌟 요약 박스 그리드 */
        .miku-mypage-summary-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 50px;
        }
        .miku-mypage-summary-box {
          display: flex; align-items: center; gap: 20px; padding: 28px 32px;
          background: #ffffff; border-radius: 24px; border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 4px 10px rgba(0,0,0,0.02); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .miku-mypage-summary-box:hover {
          transform: translateY(-4px); box-shadow: 0 20px 40px -10px rgba(0,0,0,0.06); border-color: #cbd5e1;
        }
        .summary-icon {
          width: 56px; height: 56px; border-radius: 16px; background: #f8fafc;
          display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0;
        }
        .summary-label { display: block; font-size: 14px; font-weight: 700; color: #64748b; margin-bottom: 4px; }
        .summary-value { font-size: 24px; font-weight: 900; color: #0f172a; }
        .summary-unit { font-size: 15px; font-weight: 700; color: #94a3b8; }

        /* 🌟 공통 섹션 패널 */
        .miku-mypage-section { margin-bottom: 50px; }
        .section-header { margin-bottom: 24px; }
        .section-header h2 { font-size: 22px; font-weight: 900; color: #0f172a; margin: 0; display: flex; alignItems: center; gap: 8px; }
        
        /* 🌟 주소록 패널 */
        .address-panel {
          background: #ffffff; border-radius: 24px; border: 1px solid rgba(226, 232, 240, 0.8);
          padding: 32px 40px; box-shadow: 0 4px 10px rgba(0,0,0,0.02);
        }
        .address-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 24px; }
        .address-col { display: flex; flex-direction: column; gap: 16px; }
        
        .miku-mypage-address-item { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .address-label { width: 90px; font-size: 14px; font-weight: 700; color: #64748b; flex-shrink: 0; }
        .address-val-box {
          flex: 1; display: flex; justify-content: space-between; align-items: center;
          padding: 12px 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; transition: all 0.2s;
        }
        .address-val-box.highlight { background: #fff8f6; border-color: #ffedd5; }
        .val-text { font-size: 15px; font-weight: 700; color: #0f172a; }
        .address-val-box.highlight .val-text { color: #ea580c; }
        
        .copy-btn {
          padding: 6px 14px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px;
          font-size: 12px; font-weight: 800; color: #475569; cursor: pointer; transition: all 0.2s;
        }
        .copy-btn:hover { border-color: #ff4b2b; color: #ff4b2b; }
        .address-val-box.highlight .copy-btn { border-color: #fdba74; color: #ea580c; }
        .address-val-box.highlight .copy-btn:hover { background: #ff4b2b; color: #fff; border-color: #ff4b2b; }

        .address-warning {
          background: #fff8f6; border: 1px solid #ffedd5; border-radius: 16px; padding: 16px 20px;
          font-size: 14px; color: #64748b; font-weight: 600; line-height: 1.5;
        }
        .address-warning b { color: #ea580c; }

        /* 🌟 구매대행 상황 카드 (12개 아이템을 위해 3단 그리드 유지) */
        .status-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .miku-mypage-status-link { text-decoration: none; display: block; }
        
        .miku-mypage-status-card {
          background: #ffffff; border: 1px solid rgba(226, 232, 240, 0.8); border-radius: 20px;
          padding: 24px; box-shadow: 0 4px 10px rgba(0,0,0,0.02); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;
        }
        .miku-mypage-status-card:hover {
          transform: translateY(-4px); box-shadow: 0 20px 40px -10px rgba(0,0,0,0.06); border-color: #cbd5e1;
        }
        
        .status-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .status-title { font-size: 16px; font-weight: 800; color: #0f172a; line-height: 1.4; }
        .status-badge {
          background: #f1f5f9; color: #64748b; padding: 6px 12px; border-radius: 10px;
          font-size: 16px; font-weight: 900; transition: all 0.3s;
        }
        .status-badge.active { background: linear-gradient(135deg, #ff4b2b 0%, #e63e1f 100%); color: #ffffff; box-shadow: 0 4px 10px rgba(255, 75, 43, 0.2); }
        .status-badge span { font-size: 12px; font-weight: 700; margin-left: 2px; }
        
        .status-card-body { display: flex; justify-content: space-between; align-items: flex-end; }
        .status-card-body p { margin: 0; font-size: 13px; color: #64748b; font-weight: 600; line-height: 1.5; }
        .status-arrow { width: 20px; height: 20px; color: #cbd5e1; transition: all 0.3s; transform: translateX(-4px); opacity: 0; }
        
        .miku-mypage-status-card:hover .status-arrow { color: #ff4b2b; transform: translateX(0); opacity: 1; }

        /* 애니메이션 */
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .anim-slide-up { opacity: 0; animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }

        /* =============================================================
           📱 모바일 반응형 처리
           ============================================================= */
        @media (max-width: 768px) {
          .miku-mypage-welcome-board { flex-direction: column; align-items: flex-start; gap: 24px; padding: 24px; }
          .welcome-title { font-size: 20px; }
          .welcome-badges { flex-direction: column; gap: 8px; }
          .edit-profile-btn { width: 100%; justify-content: center; }
          
          .miku-mypage-summary-grid { grid-template-columns: 1fr; gap: 12px; }
          .miku-mypage-summary-box { padding: 20px; }
          
          .address-panel { padding: 24px 20px; }
          .address-grid { grid-template-columns: 1fr; gap: 16px; }
          .miku-mypage-address-item { flex-direction: column; align-items: flex-start; gap: 8px; }
          .address-label { width: 100%; }
          .address-val-box { width: 100%; box-sizing: border-box; }
          
          .status-grid { grid-template-columns: 1fr; gap: 12px; }
          .miku-mypage-status-card { padding: 20px; }
        }
      `}</style>
    </GuideLayout>
  );
}