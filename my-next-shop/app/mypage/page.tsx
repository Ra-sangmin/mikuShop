'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import GuideLayout from '../components/GuideLayout';
import ChangePasswordForm from '../components/ChangePasswordForm';
import { Crown, Diamond, Medal, Sparkle } from '@phosphor-icons/react';
import { ORDER_STATUS, ORDER_STATUS_LABEL } from '@/src/types/order';
import './mypage-premium.css';

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
  // 🌟 SNS 로그인에서 받아온 프로필 사진 (동의 안 했거나 일반 회원이면 null → 이니셜 표시)
  const [profileImage, setProfileImage] = useState<string | null>(null);
  // 🌟 로그인 계정(이메일). SNS 회원은 카카오·네이버에서 받아온 값입니다.
  const [userEmail, setUserEmail] = useState('');

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
            setProfileImage(data.user.profileImage || null);
            setUserEmail(data.user.email || '');
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
    isSnsUser,
    profileImage,
    email: userEmail
  };

  // 🌟 누락되었던 12개 모든 상태 항목 추가 및 진행 흐름에 맞춘 순서 정렬
  const purchaseStatus = useMemo(() => [
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.ALL] || "전체내역",
      count: userOrders.length,
      desc: '모든내역을 확인합니다.',
      href: `/mypage/status?tab=${ORDER_STATUS.ALL}`,
      key: ORDER_STATUS.ALL,
      icon: 'fa-layer-group'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.CART] || "구매 요청",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.CART).length,
      desc: '구매신청 장바구니 목록',
      href: `/mypage/status?tab=${ORDER_STATUS.CART}`,
      key: ORDER_STATUS.CART,
      icon: 'fa-cart-shopping'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.BID_PENDING] || "경매 요청",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.BID_PENDING).length,
      desc: '경매 입찰을 위한 보증금 결제대기',
      href: `/mypage/status?tab=${ORDER_STATUS.BID_PENDING}`,
      key: ORDER_STATUS.BID_PENDING,
      icon: 'fa-gavel'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.BIDDING] || "경매 상황",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.BIDDING).length,
      desc: '현재 경매 입찰 진행중인 상품',
      href: `/mypage/status?tab=${ORDER_STATUS.BIDDING}`,
      key: ORDER_STATUS.BIDDING,
      icon: 'fa-hourglass-half'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.BID_SUCCESS] || "경매 낙찰 성공",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.BID_SUCCESS).length,
      desc: '경매 낙찰 성공, 1차결제 대기',
      href: `/mypage/status?tab=${ORDER_STATUS.BID_SUCCESS}`,
      key: ORDER_STATUS.BID_SUCCESS,
      icon: 'fa-trophy'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.FAILED] || "경매/구매 실패",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.FAILED).length,
      desc: '상품 결제 완료 구매불가 목록',
      href: `/mypage/status?tab=${ORDER_STATUS.FAILED}`,
      key: ORDER_STATUS.FAILED,
      icon: 'fa-circle-xmark'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.PAID] || "상품 결제 완료",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.PAID).length,
      desc: '1차결제완료 목록(구매진행)',
      href: `/mypage/status?tab=${ORDER_STATUS.PAID}`,
      key: ORDER_STATUS.PAID,
      icon: 'fa-credit-card'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.WAITING] || "입고 대기중",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.WAITING).length,
      desc: '배송대행 신청, 현지창고 도착 대기',
      href: `/mypage/status?tab=${ORDER_STATUS.WAITING}`,
      key: ORDER_STATUS.WAITING,
      icon: 'fa-hourglass-half'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.ARRIVED] || "입고 완료",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.ARRIVED).length,
      desc: '현지창고 도착, 합포장신청',
      href: `/mypage/status?tab=${ORDER_STATUS.ARRIVED}`,
      key: ORDER_STATUS.ARRIVED,
      icon: 'fa-warehouse'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.PREPARING] || "배송 준비중",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.PREPARING).length,
      desc: '미쿠짱창고 포장진행중',
      href: `/mypage/status?tab=${ORDER_STATUS.PREPARING}`,
      key: ORDER_STATUS.PREPARING,
      icon: 'fa-box-open'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.PAYMENT_REQ] || "배송비 요청",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.PAYMENT_REQ).length,
      desc: '합포장완료 2차결제견적',
      href: `/mypage/status?tab=${ORDER_STATUS.PAYMENT_REQ}`,
      key: ORDER_STATUS.PAYMENT_REQ,
      icon: 'fa-file-invoice-dollar'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.PAYMENT_DONE] || "배송비 결제 완료",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.PAYMENT_DONE).length,
      desc: '출하준비중',
      href: `/mypage/status?tab=${ORDER_STATUS.PAYMENT_DONE}`,
      key: ORDER_STATUS.PAYMENT_DONE,
      icon: 'fa-circle-check'
    },
    {
      label: ORDER_STATUS_LABEL[ORDER_STATUS.SHIPPING] || "국제 배송",
      count: userOrders.filter((i: any) => i.status === ORDER_STATUS.SHIPPING).length,
      desc: '국제배송추적 및 도착',
      href: `/mypage/status?tab=${ORDER_STATUS.SHIPPING}`,
      key: ORDER_STATUS.SHIPPING,
      icon: 'fa-plane'
    },
  ], [userOrders]);

  return { userInfo, purchaseStatus };
}

// =================================================================
// 2. 화면 컴포넌트 영역 (View Layer)
// 스타일은 ./mypage-premium.css(mp- 클래스)를 사용합니다.
// =================================================================

type StatusItem = { label: string; count: number; desc: string; href: string; icon: string; key: string };

// 🌟 진행 흐름별 묶음 (구매·결제 / 경매 / 입고·배송)
const FLOW_GROUPS = [
  { title: '구매 · 결제', icon: 'fa-cart-shopping', tone: 'mp-tone-rose', keys: [ORDER_STATUS.CART, ORDER_STATUS.PAID, ORDER_STATUS.FAILED] as string[] },
  { title: '경매', icon: 'fa-gavel', tone: 'mp-tone-violet', keys: [ORDER_STATUS.BID_PENDING, ORDER_STATUS.BIDDING, ORDER_STATUS.BID_SUCCESS] as string[] },
  { title: '입고 · 배송', icon: 'fa-plane', tone: 'mp-tone-sky', keys: [ORDER_STATUS.WAITING, ORDER_STATUS.ARRIVED, ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.PAYMENT_DONE, ORDER_STATUS.SHIPPING] as string[] },
];

const QUICK_LINKS = [
  { href: '/purchase/request', title: '구매대행 신청', desc: '일본 상품 구매 요청', icon: 'fa-cart-shopping', tone: 'mp-tone-rose' },
  { href: '/delivery/request', title: '배송대행 신청', desc: '직접 구매한 상품 배송', icon: 'fa-truck-fast', tone: 'mp-tone-indigo' },
  { href: '/mypage/money/charge', title: '머니 충전', desc: '미쿠짱 머니 충전', icon: 'fa-wallet', tone: 'mp-tone-amber' },
  { href: '/mypage/profile', title: '배송지 관리', desc: '한국 · 일본 배송지', icon: 'fa-location-dot', tone: 'mp-tone-green' },
  { href: '/mypage/wishlist', title: '관심 상품', desc: '찜한 상품 모아보기', icon: 'fa-heart', tone: 'mp-tone-slate' },
];

const StatusCard = ({ label, count, desc, href, icon, index }: StatusItem & { index: number }) => (
  <Link href={href} className={`mp-status mp-anim ${count > 0 ? 'has-count' : ''}`} style={{ animationDelay: `${0.03 * index}s` }}>
    <span className="mp-status-icon"><i className={`fa ${icon}`}></i></span>
    <span className="mp-status-text">
      <strong>{label}</strong>
      <span>{desc}</span>
    </span>
    <span className="mp-status-count">{count}</span>
  </Link>
);

// 🌟 메인 페이지 조립
export default function MyPage() {
  const { userInfo, purchaseStatus } = useMyPageLogic();
  const gradeMeta = GRADE_META[userInfo.level] || GRADE_META.NEW;
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false); // 프로필 사진 로드 실패 시 이니셜로 대체

  const byKey = (key: string) => purchaseStatus.find(s => s.key === key);
  const countOf = (keys: string[]) => keys.reduce((sum, k) => sum + (byKey(k)?.count || 0), 0);
  const totalCount = byKey(ORDER_STATUS.ALL)?.count || 0;
  const actionCount = countOf([ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING, ORDER_STATUS.BID_SUCCESS, ORDER_STATUS.PAYMENT_REQ, ORDER_STATUS.ARRIVED]);
  const progressCount = countOf([ORDER_STATUS.PAID, ORDER_STATUS.WAITING, ORDER_STATUS.BIDDING, ORDER_STATUS.PREPARING, ORDER_STATUS.PAYMENT_DONE]);
  const shippingCount = byKey(ORDER_STATUS.SHIPPING)?.count || 0;
  const initial = (userInfo.name || '고').trim().charAt(0) || '고';

  return (
    <GuideLayout title="마이페이지" type="mypage">
      <div className="miku-mypage-wrapper">

        {/* 🌟 회원 요약 카드 */}
        <section className="mp-hero mp-anim" aria-label="나의 회원 정보">
          <div className="mp-hero-main">
            <div className="mp-avatar" aria-hidden="true">
              {/* 🌟 카카오 등 SNS 프로필 사진이 있으면 보여주고, 없으면 기존처럼 이름 첫 글자를 씁니다.
                  이미지가 깨지면(만료된 CDN 주소 등) 이니셜 표시로 되돌립니다. */}
              {userInfo.profileImage && !avatarFailed
                ? <img
                    src={userInfo.profileImage}
                    alt=""
                    className="mp-avatar-img"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarFailed(true)}
                  />
                : initial}
              <span className="mp-avatar-grade" style={{ background: gradeMeta.gradient }}>{gradeMeta.icon}</span>
            </div>
            <div className="mp-hero-text">
              <span className="mp-eyebrow-dark">MY PAGE</span>
              <h2 className="mp-hero-title"><em>{userInfo.name}</em>님, 환영합니다!</h2>
              <div className="mp-hero-tags">
                <Link href="/guide/membership" className="mp-tag">
                  <span className="mp-tag-dot" style={{ background: gradeMeta.gradient }}>{gradeMeta.icon}</span>
                  회원등급 <b>{userInfo.level}</b>
                </Link>
                {!userInfo.isSnsUser && (
                  <button type="button" className="mp-tag" onClick={() => setIsPasswordModalOpen(true)}>
                    <i className="fa fa-lock"></i> 비밀번호 변경
                  </button>
                )}
              </div>
              {/* 🌟 로그인에 사용 중인 계정(이메일). SNS 로그인 회원은 카카오·네이버에서 받아온 이메일입니다. */}
              {userInfo.email && (
                <p className="mp-hero-email" translate="no">
                  <i className="fa fa-envelope" aria-hidden="true"></i>
                  <span>{userInfo.email}</span>
                </p>
              )}
            </div>
          </div>

          <div className="mp-hero-money">
            <span className="mp-hero-money-label"><i className="fa fa-sack-dollar"></i> 미쿠짱머니</span>
            <strong className="mp-hero-money-value" translate="no">{userInfo.money.toLocaleString()}<small>원</small></strong>
            <div className="mp-hero-money-actions">
              <Link href="/mypage/money/charge" className="is-primary"><i className="fa fa-plus"></i> 충전</Link>
              <Link href="/mypage/money/history"><i className="fa fa-receipt"></i> 이용 내역</Link>
            </div>
          </div>

          <div className="mp-hero-stats">
            <Link href={`/mypage/status?tab=${ORDER_STATUS.ALL}`} className="mp-hero-stat">
              <span>전체 주문</span><strong>{totalCount}<small>건</small></strong>
            </Link>
            <Link href="/mypage/status" className={`mp-hero-stat ${actionCount > 0 ? 'is-warn' : ''}`}>
              <span>확인이 필요한 주문</span><strong>{actionCount}<small>건</small></strong>
            </Link>
            <Link href="/mypage/status" className="mp-hero-stat">
              <span>진행 중</span><strong>{progressCount}<small>건</small></strong>
            </Link>
            <Link href={`/mypage/status?tab=${ORDER_STATUS.SHIPPING}`} className="mp-hero-stat">
              <span>국제 배송 중</span><strong>{shippingCount}<small>건</small></strong>
            </Link>
          </div>
        </section>

        {/* 🌟 바로가기 */}
        <div className="mp-quick mp-anim d1">
          {QUICK_LINKS.map(link => (
            <Link key={link.href} href={link.href} className="mp-quick-link">
              <span className={`mp-quick-icon ${link.tone}`}><i className={`fa ${link.icon}`}></i></span>
              <span className="mp-quick-text">
                <strong>{link.title}</strong>
                <span>{link.desc}</span>
              </span>
            </Link>
          ))}
        </div>

        {/* 🌟 구매대행 상황 */}
        <section className="mp-section mp-anim d2">
          <div className="mp-section-head">
            <div>
              <span className="mp-eyebrow">Order Status</span>
              <h3 className="mp-section-title">구매대행 상황</h3>
              <p className="mp-section-sub">단계를 누르면 해당 주문 목록으로 이동합니다.</p>
            </div>
            <Link href={`/mypage/status?tab=${ORDER_STATUS.ALL}`} className="mp-btn is-ghost">
              전체 내역 보기 <i className="fa fa-arrow-right"></i>
            </Link>
          </div>

          <div className="mp-panel">
            <div className="mp-flow">
              {FLOW_GROUPS.map(group => {
                const items = group.keys.map(byKey).filter(Boolean) as StatusItem[];
                const groupTotal = items.reduce((sum, item) => sum + item.count, 0);
                return (
                  <div key={group.title} className="mp-flow-group">
                    <div className="mp-flow-head">
                      <h4 className="mp-flow-title">
                        <span className={`mp-quick-icon ${group.tone}`}><i className={`fa ${group.icon}`}></i></span>
                        {group.title}
                      </h4>
                      <span className="mp-flow-total">합계 <b>{groupTotal}</b>건</span>
                    </div>
                    <div className="mp-flow-grid">
                      {items.map((item, index) => (
                        <StatusCard {...item} key={item.key} index={index} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

      </div>

      {/* 🌟 비밀번호 변경 팝업 */}
      {isPasswordModalOpen && (
        <div className="password-modal-overlay anim-fade-in" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="password-modal-content anim-pop-in" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="password-modal-close" onClick={() => setIsPasswordModalOpen(false)} aria-label="닫기">✕</button>
            <ChangePasswordForm showHeader onSuccess={() => setIsPasswordModalOpen(false)} />
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. 디자인 영역 (CSS Layer) — 공통 스타일은 ./mypage-premium.css */}
      {/* ================================================================= */}
      <style jsx global>{`
        .miku-mypage-wrapper {
          max-width: 1000px;
          margin: 0 auto;
          font-family: 'Pretendard', "Noto Sans KR", sans-serif;
          color: #111827;
        }
        .mp-avatar-grade svg { width: 13px; height: 13px; }
        .mp-tag-dot svg { width: 10px; height: 10px; }

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
        .password-modal-content { position: relative; width: 100%; max-width: 460px; }
        .password-modal-close {
          position: absolute; top: 16px; right: 16px; z-index: 1;
          width: 40px; height: 40px; border-radius: 50%;
          background-color: #f1f3f6; border: none; color: #4b5563; font-size: 16px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s;
        }
        .password-modal-close:hover { background-color: #e5e7eb; color: #111827; transform: rotate(90deg); }
      `}</style>
    </GuideLayout>
  );
}
