'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import GuideLayout from '../components/GuideLayout';
import ChangePasswordForm from '../components/ChangePasswordForm';
import { Crown, Diamond, Medal, Sparkle } from '@phosphor-icons/react';
import { ORDER_STATUS, ORDER_STATUS_LABEL } from '@/src/types/order';

// 🌟 guide/membership 페이지와 동일한 등급별 아이콘/컬러 (DEFAULT_MEMBERSHIP_META 참고)
const GRADE_META: Record<string, { icon: React.ReactNode, gradient: string, color: string }> = {
  NEW: { icon: <Sparkle weight="fill" />, gradient: 'linear-gradient(145deg, #a78bfa 0%, #7c3aed 100%)', color: '#7c3aed' },
  SILVER: { icon: <Medal weight="fill" />, gradient: 'linear-gradient(145deg, #cbd5e1 0%, #64748b 100%)', color: '#64748b' },
  GOLD: { icon: <Crown weight="fill" />, gradient: 'linear-gradient(145deg, #fcd34d 0%, #d97706 100%)', color: '#d97706' },
  DIAMOND: { icon: <Diamond weight="fill" />, gradient: 'linear-gradient(145deg, #7dd3fc 0%, #0284c7 100%)', color: '#0284c7' },
};

// =================================================================
// 1. 비즈니스 로직 영역 (Business Logic Layer)
// 데이터 페칭, 클립보드 복사 등 순수 기능만 전담합니다.
// =================================================================
function useMyPageLogic() {
  const [userName, setUserName] = useState('고객');
  const [userLevel, setUserLevel] = useState('NEW');
  const [userMoney, setUserMoney] = useState(0);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [isSnsUser, setIsSnsUser] = useState(false);

  useEffect(() => {
    const storedId = localStorage.getItem('user_id');

    if (storedId) {
      fetch(`/api/users?id=${storedId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUserName(data.user.name);
            setUserLevel(data.user.grade?.name || 'NEW');
            setUserMoney(data.user.cyberMoney);
            setUserOrders(data.user.orders || []);
            setIsSnsUser(!!data.user.isSnsUser);
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
    money: userMoney,
    isSnsUser
  };

  // 🌟 누락되었던 12개 모든 상태 항목 추가 및 진행 흐름에 맞춘 순서 정렬
  const purchaseStatus = useMemo(() => [
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.ALL] || "전체내역",
      count: userOrders.length,
      desc: '모든내역을 확인합니다.',
      href: `/mypage/status?tab=${ORDER_STATUS.ALL}`,
      icon: 'fa-layer-group'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.CART] || "구매 요청",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.CART).length,
      desc: '구매신청 장바구니 목록',
      href: `/mypage/status?tab=${ORDER_STATUS.CART}`,
      icon: 'fa-cart-shopping'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.BID_PENDING] || "경매 요청",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.BID_PENDING).length,
      desc: '경매 입찰을 위한 보증금 결제대기',
      href: `/mypage/status?tab=${ORDER_STATUS.BID_PENDING}`,
      icon: 'fa-gavel'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.BIDDING] || "경매 상황",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.BIDDING).length,
      desc: '현재 경매 입찰 진행중인 상품',
      href: `/mypage/status?tab=${ORDER_STATUS.BIDDING}`,
      icon: 'fa-hourglass-half'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.BID_SUCCESS] || "경매 낙찰 성공",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.BID_SUCCESS).length,
      desc: '경매 낙찰 성공, 1차결제 대기',
      href: `/mypage/status?tab=${ORDER_STATUS.BID_SUCCESS}`,
      icon: 'fa-trophy'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.FAILED] || "경매/구매 실패",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.FAILED).length,
      desc: '상품 결제 완료 구매불가 목록',
      href: `/mypage/status?tab=${ORDER_STATUS.FAILED}`,
      icon: 'fa-circle-xmark'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.PAID] || "상품 결제 완료",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.PAID).length,
      desc: '1차결제완료 목록(구매진행)',
      href: `/mypage/status?tab=${ORDER_STATUS.PAID}`,
      icon: 'fa-credit-card'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.ARRIVED] || "입고 완료",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.ARRIVED).length,
      desc: '현지창고 도착, 합포장신청',
      href: `/mypage/status?tab=${ORDER_STATUS.ARRIVED}`,
      icon: 'fa-warehouse'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.PREPARING] || "배송 준비중",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.PREPARING).length,
      desc: '미쿠짱창고 포장진행중',
      href: `/mypage/status?tab=${ORDER_STATUS.PREPARING}`,
      icon: 'fa-box-open'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.PAYMENT_REQ] || "배송비 요청",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.PAYMENT_REQ).length,
      desc: '합포장완료 2차결제견적',
      href: `/mypage/status?tab=${ORDER_STATUS.PAYMENT_REQ}`,
      icon: 'fa-file-invoice-dollar'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.PAYMENT_DONE] || "배송비 결제 완료",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.PAYMENT_DONE).length,
      desc: '출하준비중',
      href: `/mypage/status?tab=${ORDER_STATUS.PAYMENT_DONE}`,
      icon: 'fa-circle-check'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.SHIPPING] || "국제 배송",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.SHIPPING).length,
      desc: '국제배송추적 및 도착',
      href: `/mypage/status?tab=${ORDER_STATUS.SHIPPING}`,
      icon: 'fa-plane'
    },
  ], [userOrders]);

  return { userInfo, purchaseStatus };
}

// =================================================================
// 2. 화면 컴포넌트 영역 (View Layer)
// =================================================================

// 🌟 요약 박스 (flat: 다른 패널 안에 얹을 때 카드 배경/테두리 없이 사용)
const SummaryBox = ({ label, value, unit, icon, variant, flat }: { label: string, value: number, unit: string, icon: string, variant: string, flat?: boolean }) => (
  <div className={`miku-mypage-summary-box ${flat ? 'flat' : ''}`}>
    <div className={`summary-icon variant-${variant}`}><i className={`fa ${icon}`}></i></div>
    <div className="summary-content">
      <span className="summary-label">{label}</span>
      <div className="summary-value">
        {value.toLocaleString()} <span className="summary-unit">{unit}</span>
      </div>
    </div>
  </div>
);

// 🌟 구매대행 상황 카드
const StatusCard = ({ label, count, desc, href, index, icon }: { label: string, count: number, desc: string, href: string, index: number, icon: string }) => (
  <Link href={href} className="miku-mypage-status-link">
    <div className="miku-mypage-status-card anim-slide-up" style={{ animationDelay: `${0.05 * index}s` }}>
      <div className="status-card-header">
        <div className="status-title-group">
          <span className={`status-icon ${count > 0 ? 'active' : ''}`}><i className={`fa ${icon}`}></i></span>
          <span className="status-title">{label}</span>
        </div>
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
  const { userInfo, purchaseStatus } = useMyPageLogic();
  const gradeMeta = GRADE_META[userInfo.level] || GRADE_META.NEW;
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  return (
    <GuideLayout title="마이페이지" type="mypage">
      <div className="miku-mypage-wrapper">
        
        {/* 나의 회원 정보 */}
        <div className="miku-mypage-section anim-slide-up">
          <div className="section-header">
            <h2>나의 회원 정보 <span className="section-icon-badge badge-indigo"><i className="fa fa-user"></i></span></h2>
          </div>
          <div className="section-body member-info-panel">
            <div className="member-info-top">
              <div className="welcome-info">
                <div>
                  <h1 className="welcome-title">{userInfo.name}님, 환영합니다!</h1>
                  <div className="welcome-badges">
                    <span className="badge level-badge" style={{ color: gradeMeta.color }}>
                      <span className="level-badge-icon" style={{ background: gradeMeta.gradient }}>
                        {gradeMeta.icon}
                      </span>
                      회원등급 <b>{userInfo.level}</b>
                    </span>
                    {!userInfo.isSnsUser && (
                      <button type="button" className="password-shortcut-btn" onClick={() => setIsPasswordModalOpen(true)}>
                        <i className="fa fa-lock"></i> 비밀번호 변경
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <SummaryBox label="미쿠짱머니" value={userInfo.money} unit="원" icon="fa-sack-dollar" variant="amber" flat />
            </div>
          </div>
        </div>

        {/* 구매대행 상황 (12개 아이템 표시) */}
        <div className="miku-mypage-section anim-slide-up delay-1" style={{ marginBottom: '40px' }}>
          <div className="section-header">
            <h2>구매대행 상황 <span className="section-icon-badge badge-orange"><i className="fa fa-box"></i></span></h2>
          </div>
          <div className="miku-status-panel">
            <div className="status-grid">
              {purchaseStatus.map((status, index) => (
                <StatusCard key={index} {...status} index={index} />
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* 🌟 비밀번호 변경 팝업 */}
      {isPasswordModalOpen && (
        <div className="password-modal-overlay anim-fade-in" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="password-modal-content anim-pop-in" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="password-modal-close" onClick={() => setIsPasswordModalOpen(false)}>✕</button>
            <ChangePasswordForm showHeader onSuccess={() => setIsPasswordModalOpen(false)} />
          </div>
        </div>
      )}

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

        /* 🌟 나의 회원 정보 패널 */
        .member-info-panel {
          position: relative;
          overflow: hidden;
          padding: 32px 40px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 24px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
        }
        .member-info-panel::before {
          content: ''; position: absolute; top: -70px; right: -50px;
          width: 240px; height: 240px; border-radius: 50%; pointer-events: none;
          background: radial-gradient(circle, rgba(129, 140, 248, 0.16) 0%, rgba(129, 140, 248, 0) 70%);
        }
        /* 🌟 "구매대행 상황" 패널과 통일감을 주는 상단 액센트 바 */
        .member-info-panel::after {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(90deg, #818cf8 0%, #4f46e5 50%, #818cf8 100%);
        }
        .member-info-top {
          display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 24px;
        }
        .welcome-info { position: relative; z-index: 1; display: flex; align-items: center; gap: 20px; }

        .welcome-title { font-size: 24px; font-weight: 900; margin: 0 0 10px 0; color: #0f172a; letter-spacing: -0.5px; }
        .welcome-badges { display: flex; gap: 10px; flex-wrap: wrap; }
        .badge {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 7px 14px; border-radius: 20px; font-size: 13px; font-weight: 700;
        }
        .level-badge {
          background: #ffffff; border: 1px solid #e2e8f0;
        }
        .level-badge-icon {
          width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; color: #fff;
        }
        .level-badge-icon svg { width: 11px; height: 11px; }
        .level-badge b { font-weight: 900; }
        .password-shortcut-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 7px 14px; border-radius: 20px; font-size: 13px; font-weight: 700;
          background: #f8fafc; border: 1px solid #e2e8f0; color: #64748b;
          text-decoration: none; transition: all 0.2s;
        }
        .password-shortcut-btn i { font-size: 11px; color: #94a3b8; }
        .password-shortcut-btn:hover { background: #f1f5f9; color: #0f172a; border-color: #cbd5e1; }

        /* 🌟 요약 박스 (member-info-panel 안에서는 flat으로 사용) */
        .miku-mypage-summary-box {
          display: flex; align-items: center; gap: 20px; padding: 28px 32px;
          width: 100%; max-width: 320px; box-sizing: border-box;
          background: #ffffff; border-radius: 24px; border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 4px 10px rgba(0,0,0,0.02); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .miku-mypage-summary-box:hover {
          transform: translateY(-4px); box-shadow: 0 20px 40px -10px rgba(0,0,0,0.06); border-color: #cbd5e1;
        }
        .miku-mypage-summary-box.flat {
          position: relative; z-index: 1;
          padding: 0; max-width: none; background: transparent; border: none; box-shadow: none;
        }
        .miku-mypage-summary-box.flat:hover { transform: none; box-shadow: none; border-color: transparent; }
        .summary-icon {
          width: 56px; height: 56px; border-radius: 16px; color: #fff;
          display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0;
        }
        .summary-icon.variant-amber { background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%); box-shadow: 0 10px 20px -8px rgba(217, 119, 6, 0.5); }
        .summary-label { display: block; font-size: 15px; font-weight: 700; color: #64748b; margin-bottom: 4px; }
        .summary-value { font-size: 32px; font-weight: 900; color: #0f172a; }
        .summary-unit { font-size: 18px; font-weight: 700; color: #94a3b8; }

        /* 🌟 공통 섹션 패널 */
        .miku-mypage-section { margin-bottom: 50px; }
        .section-header { margin-bottom: 24px; }
        .section-header h2 { font-size: 22px; font-weight: 900; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 10px; }
        .section-icon-badge {
          width: 30px; height: 30px; border-radius: 10px; flex-shrink: 0; color: #fff;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 13px;
        }
        .section-icon-badge.badge-orange {
          background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%);
          box-shadow: 0 6px 14px -5px rgba(234, 88, 12, 0.5);
        }
        .section-icon-badge.badge-indigo {
          background: linear-gradient(135deg, #818cf8 0%, #4f46e5 100%);
          box-shadow: 0 6px 14px -5px rgba(79, 70, 229, 0.5);
        }
        

        /* 🌟 구매대행 상황 카드들을 하나의 패널로 감싸는 배경 (mypage/status의 전체 진행 현황과 동일한 톤) */
        .miku-status-panel {
          background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
          border: 1px solid rgba(226, 232, 240, 0.7); border-radius: 24px;
          padding: 28px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 14px 34px -14px rgba(15, 23, 42, 0.10);
          position: relative; overflow: hidden;
        }
        .miku-status-panel::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(90deg, #fb923c 0%, #ea580c 50%, #fb923c 100%);
        }

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
        .status-title-group { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .status-icon {
          width: 34px; height: 34px; border-radius: 11px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 14px;
          background: #f1f5f9; color: #94a3b8; transition: all 0.3s;
        }
        .status-icon.active {
          background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%); color: #fff;
          box-shadow: 0 6px 14px -5px rgba(234, 88, 12, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.35);
        }
        .status-title { font-size: 16px; font-weight: 800; color: #0f172a; line-height: 1.4; }
        .status-badge {
          background: #f1f5f9; color: #64748b; padding: 6px 12px; border-radius: 10px;
          font-size: 16px; font-weight: 900; transition: all 0.3s;
        }
        .status-badge.active { background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%); color: #ffffff; box-shadow: 0 4px 10px rgba(234, 88, 12, 0.25); }
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

        /* 🌟 비밀번호 변경 팝업 */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.97) translateY(12px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .anim-fade-in { animation: fadeIn 0.25s ease forwards; }
        .anim-pop-in { animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        .password-modal-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          z-index: 2000; padding: 20px; box-sizing: border-box;
        }
        .password-modal-content {
          position: relative; width: 100%; max-width: 460px;
        }
        .password-modal-close {
          position: absolute; top: 16px; right: 16px; z-index: 1;
          width: 40px; height: 40px; border-radius: 50%;
          background-color: #f1f5f9; border: none; color: #64748b; font-size: 16px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s;
        }
        .password-modal-close:hover { background-color: #e2e8f0; color: #0f172a; transform: rotate(90deg); }

        /* =============================================================
           📱 모바일 반응형 처리
           ============================================================= */
        @media (max-width: 768px) {
          .member-info-panel { padding: 24px; }
          .member-info-top { grid-template-columns: 1fr; justify-items: start; }
          .welcome-title { font-size: 20px; }
          .welcome-badges { flex-direction: column; gap: 8px; align-items: flex-start; }

          .miku-mypage-summary-box { padding: 20px; max-width: none; }
          .miku-mypage-summary-box.flat { padding: 0; }

          .miku-status-panel { padding: 16px; border-radius: 16px; }
          .status-grid { grid-template-columns: 1fr; gap: 12px; }
          .miku-mypage-status-card { padding: 20px; }
        }
      `}</style>
    </GuideLayout>
  );
}