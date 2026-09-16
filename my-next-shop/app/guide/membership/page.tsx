"use client";
import React, { useEffect, useState } from 'react';
import GuideLayout from '../../components/GuideLayout';
import '../guide-common.css';
import { Briefcase, Crown, Diamond, Gift, Lightbulb, Medal, Sparkle } from '@phosphor-icons/react';
import GuidePremiumHero from '../components/GuidePremiumHero';
import GuideTitle from '../components/GuideTitle';

// 🌟 아이콘/색상/수수료/대상 등은 DB에 없는 화면 전용 메타데이터라 그대로 두고,
// grade(등급명)/orders(필요 주문 건수)/discount(국제 배송비 할인율)는
// /api/membership-grades(DB의 membership_grades 테이블)에서 받아와
// sortOrder 순서대로 덮어씁니다.
const DEFAULT_MEMBERSHIP_META = [
  { grade: 'NEW', icon: <Sparkle weight="fill" />, orders: '0건', discount: '0%', fee: '100엔', target: '모든 사이트', color: '#8b5cf6', bgColor: '#f8fafc', gradient: 'linear-gradient(145deg, #a78bfa 0%, #7c3aed 100%)' },
  { grade: 'SILVER', icon: <Medal weight="fill" />, orders: '1건', discount: '5%', fee: '100엔', target: '중고 사이트 (건당)', color: '#64748b', bgColor: '#f1f5f9', gradient: 'linear-gradient(145deg, #cbd5e1 0%, #64748b 100%)' },
  { grade: 'GOLD', icon: <Crown weight="fill" />, orders: '5건', discount: '10%', fee: '200엔', target: '입찰/경매 (건당)', color: '#f59e0b', bgColor: '#fffbeb', gradient: 'linear-gradient(145deg, #fcd34d 0%, #d97706 100%)' },
  { grade: 'DIAMOND', icon: <Diamond weight="fill" />, orders: '15건', discount: '15%', fee: '+특별혜택', target: '최우수 고객', color: '#0ea5e9', bgColor: '#f0f9ff', gradient: 'linear-gradient(145deg, #7dd3fc 0%, #0284c7 100%)', highlight: true },
];

export default function MembershipPage() {
  const [membershipData, setMembershipData] = useState(DEFAULT_MEMBERSHIP_META);

  useEffect(() => {
    fetch('/api/membership-grades')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.grades)) {
          setMembershipData(prev => prev.map((tier, idx) => {
            const dbGrade = data.grades[idx];
            if (!dbGrade) return tier;
            return {
              ...tier,
              grade: dbGrade.name,
              orders: `${dbGrade.requiredOrders}건`,
              discount: `${Math.round(dbGrade.discountRate * 100)}%`,
            };
          }));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <GuideLayout title="회원등급 및 혜택" type="fee">
      <div className="membership-container">
        
        {/* 🌟 모바일 최적화 CSS */}
        <style jsx global>{`
          .membership-container {
            /* 🌟 guide/membership, fee-guide, shipping-fee, customs 4개 페이지가 서로 다른
               max-width/padding을 써서 전체 가로 폭과 타이틀 위치가 제각각이었습니다.
               좌우 여백 없이(guide-page-container와 동일) 본문 폭을 통일합니다. */
            max-width: 1100px;
            margin: 0 auto;
            /* 🌟 헤더와의 간격 제거 (상단 패딩만 0으로) */
            padding: 0 0 56px;
            font-family: Pretendard, "Noto Sans KR", sans-serif;
            color: #334155;
          }

          /* 기본 그리드 (PC) */
          .membership-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 36px;
          }

          /* ============================================================
             🌟 등급 카드 (프리미엄 리디자인)
             - 카드 상단: 등급 색 라디얼 글로우 + 얇은 메탈릭 라인
             - 아이콘: 메탈릭 그라데이션 스퀘어클(squircle) + 은은한 링
             - 할인율: 등급 색 그라데이션 숫자, 하단은 영수증형 수수료 행
             - DIAMOND: 네이비 다크 카드(상단 검은색 카드와 같은 톤) + 글로우
             ============================================================ */
          .tier-card {
            --tier-color: #94a3b8; --tier-soft: rgba(148,163,184,0.16); --tier-deep: #64748b;
            position: relative; overflow: hidden; isolation: isolate;
            min-height: 340px; padding: 28px 22px 22px !important;
            border-radius: 24px !important;
            background: linear-gradient(180deg, #ffffff 0%, #fbfbfd 100%) !important;
            border: 1px solid #e9edf3 !important;
            box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 18px 40px -26px rgba(15,23,42,0.28) !important;
            display: flex; flex-direction: column; align-items: center; text-align: center;
            transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease, border-color 0.3s ease;
          }
          .tier-card::before {
            content: ''; position: absolute; inset: 0 0 auto; height: 3px; z-index: 1;
            background: linear-gradient(90deg, transparent 0%, var(--tier-color) 30%, var(--tier-color) 70%, transparent 100%);
            opacity: 0.85;
          }
          .tier-card::after {
            content: ''; position: absolute; left: 50%; top: -90px; width: 260px; height: 220px; z-index: -1;
            transform: translateX(-50%);
            background: radial-gradient(closest-side, var(--tier-soft) 0%, rgba(255,255,255,0) 100%);
            pointer-events: none;
          }
          .tier-card:hover { transform: translateY(-6px); box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 28px 50px -28px rgba(15,23,42,0.35) !important; border-color: #dfe5ee !important; }
          .tier-card:nth-child(1) { --tier-color: #8b5cf6; --tier-soft: rgba(139,92,246,0.18); --tier-deep: #6d28d9; }
          .tier-card:nth-child(2) { --tier-color: #94a3b8; --tier-soft: rgba(148,163,184,0.22); --tier-deep: #475569; }
          .tier-card:nth-child(3) { --tier-color: #f59e0b; --tier-soft: rgba(245,158,11,0.2); --tier-deep: #b45309; }
          .tier-card:nth-child(4) { --tier-color: #38bdf8; --tier-soft: rgba(56,189,248,0.3); --tier-deep: #7dd3fc; }

          .tier-step {
            font-size: 10px; font-weight: 800; letter-spacing: 0.22em; color: #94a3b8; margin-bottom: 14px;
          }
          .tier-icon-badge {
            width: 74px; height: 74px; border-radius: 24px;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 16px; position: relative;
            box-shadow: 0 14px 26px -10px var(--tier-color), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -2px 0 rgba(0,0,0,0.08);
            transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
          }
          .tier-card:hover .tier-icon-badge { transform: translateY(-2px) scale(1.04); }
          .tier-icon-badge::before {
            content: ''; position: absolute; inset: -7px; border-radius: 30px;
            border: 1px solid var(--tier-color); opacity: 0.35;
          }
          .tier-icon-badge::after {
            content: ''; position: absolute; inset: 0; border-radius: 24px;
            background: linear-gradient(160deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 55%);
          }
          .tier-icon { font-size: 34px !important; line-height: 1; color: #fff !important; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.18)); position: relative; z-index: 1; }

          .tier-name {
            font-size: 22px !important; font-weight: 900 !important; letter-spacing: 0.04em; margin: 0 0 8px !important;
            background: linear-gradient(135deg, var(--tier-color) 0%, var(--tier-deep) 100%);
            -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
          }
          .tier-orders {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 5px 12px; border-radius: 999px; margin: 0 0 18px !important;
            background: #f4f6fa; border: 1px solid #e6eaf1;
            font-size: 12px !important; font-weight: 700 !important; color: #475569;
          }
          .tier-orders::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--tier-color); box-shadow: 0 0 0 3px var(--tier-soft); }

          .tier-divider {
            width: 100%; height: 1px; margin: 0 0 16px;
            background: linear-gradient(90deg, rgba(226,232,240,0) 0%, rgba(203,213,225,0.9) 50%, rgba(226,232,240,0) 100%);
          }
          .tier-discount { margin: 0 0 16px; }
          .tier-discount-label { display: block; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; color: #64748b; margin-bottom: 2px; }
          .tier-discount-val {
            display: block; font-size: 38px; font-weight: 900; letter-spacing: -0.03em; line-height: 1.1;
            background: linear-gradient(135deg, #0f172a 0%, #475569 100%);
            -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
            font-variant-numeric: tabular-nums;
          }
          .tier-discount-val small { font-size: 18px; font-weight: 800; margin-left: 1px; }

          .tier-target-box {
            width: 100%; margin-top: auto;
            display: flex; align-items: center; justify-content: space-between; gap: 10px;
            padding: 12px 14px; border-radius: 14px;
            background: #f8f9fb; border: 1px solid #eceef3;
          }
          .tier-target-text { font-size: 11.5px; font-weight: 700; color: #475569; text-align: left; line-height: 1.3; }
          .tier-fee-text { font-size: 16px; font-weight: 900; color: #b04a12; white-space: nowrap; }

          /* 💎 DIAMOND: 다크 카드 */
          .tier-card.is-top {
            background:
              radial-gradient(120% 80% at 100% 0%, rgba(56,189,248,0.28) 0%, rgba(56,189,248,0) 55%),
              radial-gradient(90% 70% at 0% 100%, rgba(37,99,235,0.35) 0%, rgba(37,99,235,0) 60%),
              linear-gradient(160deg, #0f172a 0%, #111a2f 55%, #0b1220 100%) !important;
            border: 1px solid rgba(125,211,252,0.35) !important;
            box-shadow: 0 1px 2px rgba(15,23,42,0.2), 0 24px 50px -22px rgba(14,165,233,0.55) !important;
            transform: translateY(-6px); z-index: 2;
          }
          .tier-card.is-top:hover { transform: translateY(-12px); box-shadow: 0 1px 2px rgba(15,23,42,0.2), 0 34px 60px -24px rgba(14,165,233,0.65) !important; }
          .tier-card.is-top::before { height: 4px; opacity: 1; background: linear-gradient(90deg, transparent, #7dd3fc 30%, #ffffff 50%, #7dd3fc 70%, transparent); }
          .tier-card.is-top::after { background: radial-gradient(closest-side, rgba(56,189,248,0.35) 0%, rgba(56,189,248,0) 100%); }
          .tier-card.is-top .tier-step { color: #7dd3fc; opacity: 0.9; }
          .tier-card.is-top .tier-icon-badge { animation: diamondPulse 2.6s ease-in-out infinite; box-shadow: 0 16px 30px -8px rgba(56,189,248,0.7), inset 0 1px 0 rgba(255,255,255,0.6); }
          .tier-card.is-top .tier-icon-badge::before { border-color: #7dd3fc; opacity: 0.5; }
          .tier-card.is-top .tier-name { background: linear-gradient(135deg, #e0f2fe 0%, #7dd3fc 100%); -webkit-background-clip: text; background-clip: text; }
          .tier-card.is-top .tier-orders { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.14); color: #dbeafe; }
          .tier-card.is-top .tier-orders::before { box-shadow: 0 0 0 3px rgba(56,189,248,0.25); }
          .tier-card.is-top .tier-divider { background: linear-gradient(90deg, rgba(125,211,252,0) 0%, rgba(125,211,252,0.5) 50%, rgba(125,211,252,0) 100%); }
          .tier-card.is-top .tier-discount-label { color: #9fc5e8; }
          .tier-card.is-top .tier-discount-val { background: linear-gradient(135deg, #ffffff 0%, #bae6fd 100%); -webkit-background-clip: text; background-clip: text; }
          .tier-card.is-top .tier-target-box { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.14); }
          .tier-card.is-top .tier-target-text { color: #cfe3f5; }
          .tier-card.is-top .tier-fee-text { color: #fde68a; }
          @keyframes diamondPulse {
            0%, 100% { box-shadow: 0 16px 30px -8px rgba(56,189,248,0.7), inset 0 1px 0 rgba(255,255,255,0.6); }
            50% { box-shadow: 0 16px 36px -6px rgba(56,189,248,0.9), 0 0 0 10px rgba(56,189,248,0.14), inset 0 1px 0 rgba(255,255,255,0.6); }
          }
          .diamond-badge {
            position: absolute; top: 14px; right: 14px; z-index: 2; display: flex; align-items: center; gap: 4px;
            padding: 5px 10px; border-radius: 999px;
            background: linear-gradient(135deg, #7dd3fc 0%, #2563eb 100%);
            color: #fff; font-size: 9px; font-weight: 900; letter-spacing: 0.12em;
            box-shadow: 0 8px 16px -6px rgba(37, 99, 235, 0.7), inset 0 1px 0 rgba(255,255,255,0.35);
          }
          /* 사업자 배너 */
          .biz-banner {
            background: linear-gradient(135deg, #232a3b 0%, #171c28 100%);
            border: 1px solid rgba(245, 196, 81, 0.25);
            color: #fff;
            padding: 30px 40px;
            border-radius: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
            box-shadow: 0 22px 44px -22px rgba(15, 18, 30, 0.6);
            cursor: pointer;
            transition: transform 0.3s, box-shadow 0.3s;
            position: relative;
            overflow: hidden;
          }
          .biz-banner::before {
            content: '';
            position: absolute; right: -60px; top: -80px; width: 220px; height: 220px;
            border: 1px solid rgba(245,196,81,0.25); border-radius: 50%;
            box-shadow: 0 0 0 24px rgba(245,196,81,0.05);
          }
          .biz-banner:hover { transform: translateY(-3px); box-shadow: 0 26px 48px -22px rgba(15, 18, 30, 0.75); border-color: rgba(245, 196, 81, 0.45); }
          .biz-banner-left { display: flex; align-items: center; gap: 18px; position: relative; z-index: 2; }
          .biz-banner-icon {
            width: 56px; height: 56px; flex-shrink: 0; border-radius: 16px;
            display: flex; align-items: center; justify-content: center;
            color: #1c1a16;
            background: linear-gradient(135deg, #f5c451 0%, #c98f14 100%);
            box-shadow: 0 10px 22px -10px rgba(201, 143, 20, 0.8), inset 0 1px 0 rgba(255,255,255,0.4);
          }
          .biz-banner-cta { position: relative; z-index: 2; }

          /* 🌟 유의사항 (purchase/quote의 quote-notice와 동일한 디자인) */
          .membership-notice {
            display: flex;
            align-items: center;
            gap: 14px;
            margin: 0 0 40px;
            padding: 16px 20px;
            background: #fff7ed;
            border: 1.5px solid #fdba74;
            border-left: 5px solid #ea580c;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(234, 88, 12, 0.08);
          }
          .membership-notice-icon {
            width: 34px;
            height: 34px;
            flex-shrink: 0;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%);
            box-shadow: 0 6px 14px -5px rgba(234, 88, 12, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.35);
          }
          .membership-notice-list {
            margin: 0;
            padding: 0;
            list-style: none;
            color: #9a3412;
            font-size: 14px;
            font-weight: 500;
            line-height: 1.6;
          }
          .membership-notice-list li:not(:last-child) { margin-bottom: 5px; }
          .membership-notice-list strong { color: #ea580c; font-weight: 800; }

          /* 📱 모바일 대응 핵심 수정 (768px 이하) */
          @media (max-width: 768px) {
            /* 🌟 currentMenu(고정 바)와 카드 사이 여백 제거 */
            .membership-container { padding: 0 0 36px; }
            
            /* 🌟 한 줄에 2개씩 배치하여 크기를 줄임 */
            .membership-grid { 
              grid-template-columns: repeat(2, 1fr); 
              gap: 12px; 
            }


            /* 🌟 개별 카드 내부 요소 크기 축소 */
            .tier-card { min-height: 0; padding: 22px 12px 14px !important; border-radius: 18px !important; }
            .tier-card.is-top, .tier-card.is-top:hover { transform: none; }
            .tier-step { font-size: 9px; margin-bottom: 10px; }
            .tier-icon-badge { width: 54px; height: 54px; border-radius: 17px; margin-bottom: 10px; }
            .tier-icon-badge::before { inset: -5px; border-radius: 22px; }
            .tier-icon-badge::after { border-radius: 17px; }
            .tier-icon { font-size: 24px !important; }
            .tier-name { font-size: 17px !important; margin-bottom: 6px !important; }
            .tier-orders { font-size: 11px !important; padding: 4px 9px; margin-bottom: 12px !important; }
            .tier-divider { margin-bottom: 12px; }
            .tier-discount { margin-bottom: 12px; }
            .tier-discount-label { font-size: 9.5px; }
            .tier-discount-val { font-size: 28px; }
            .tier-discount-val small { font-size: 14px; }
            .tier-target-box { flex-direction: column; align-items: center; gap: 2px; padding: 9px 8px; border-radius: 12px; }
            .tier-target-text { font-size: 10px; text-align: center; }
            .tier-fee-text { font-size: 14px; }
            /* 모바일: 좁은 카드에서 TOP TIER 뱃지가 'TIER 04' 글자와 겹치므로, 뱃지를 단계 표시 자리에 대신 놓습니다 */
            .tier-card.is-top .tier-step { display: none; }
            .diamond-badge { position: static; margin-bottom: 9px; padding: 4px 9px; font-size: 8px; }
            
            .biz-banner {
              flex-direction: column;
              text-align: center;
              gap: 20px;
              padding: 25px;
              border-radius: 20px;
            }
            .biz-banner-left { flex-direction: column; }
          }

          /* 아주 작은 화면 (400px 이하) 대응 */
          @media (max-width: 400px) {
            .membership-grid { gap: 8px; }
            .tier-discount-val { font-size: 24px !important; }
            .tier-discount-val small { font-size: 12px; }
          }
        `}</style>

        {/* 🌟 새로 추가된 큰 제목 영역 (다른 가이드 페이지와 동일한 위치/스타일) */}
        {/* 🌟 요약 카드 + 제목 — mypage/wishlist 와 같은 구성 (카드가 제목 위) */}
        <GuidePremiumHero
          ariaLabel="회원등급 요약"
          eyebrow="MIKUCHAN MEMBERSHIP"
          title={<>자주 이용할수록 <em>커지는 혜택</em></>}
          desc="주문 건수에 따라 등급이 올라가고, 국제 배송비 할인이 커집니다."
          icon={<Gift weight="duotone" />}
          feature={{
            label: <><i className="fa fa-crown"></i> 회원 등급</>,
            value: `${membershipData.length}단계`,
            sub: '등급제',
            actions: [
              { href: '/mypage', label: <><i className="fa fa-user"></i> 내 등급 확인</>, primary: true },
              { href: '/guide/fee-guide', label: <><i className="fa fa-coins"></i> 수수료 안내</> },
            ],
          }}
          stats={[
            { label: '최대 배송비 할인', value: membershipData[membershipData.length - 1]?.discount || '15%' },
            { label: '최상위 등급', value: membershipData[membershipData.length - 1]?.grade || 'DIAMOND', text: true },
            { label: '등급 기준', value: '주문 건수', text: true },
            { label: '국제배송 요금표', value: <>보러가기 <i className="fa fa-arrow-right"></i></>, text: true, href: '/guide/shipping-fee' },
          ]}
        />

        <GuideTitle eyebrow="Membership" title="회원등급 및 혜택" icon="fa-crown" />

        <div className="guide-panel">
          {/* 🌟 프리미엄 헤더 (다른 가이드 페이지와 같은 GuideHero — 높이·여백 통일) */}

          <div className="gp-section-head">
            <div>
              <span className="gp-eyebrow">Membership Grade</span>
              <h3 className="gp-section-title">등급별 혜택</h3>
              <p className="gp-section-sub">주문 건수가 쌓이면 등급이 올라가고, 국제 배송비 할인이 커져요.</p>
            </div>
          </div>

          {/* 등급 카드 그리드 */}
          <div className="membership-grid">
            {membershipData.map((tier, idx) => (
              <div key={idx} className={`tier-card ${tier.highlight ? 'is-top' : ''}`}>
                {tier.highlight && <span className="diamond-badge">TOP TIER</span>}
                <span className="tier-step">TIER {String(idx + 1).padStart(2, '0')}</span>
                <div className="tier-icon-badge" style={{ background: tier.gradient }}>
                  <div className="tier-icon">{tier.icon}</div>
                </div>
                <h4 className="tier-name">{tier.grade}</h4>
                <p className="tier-orders">주문 {tier.orders}{idx > 0 ? ' 이상' : ''}</p>

                <div className="tier-divider" />

                <div className="tier-discount">
                  <span className="tier-discount-label">국제 배송비 할인</span>
                  <span className="tier-discount-val">{tier.discount.replace('%', '')}<small>%</small></span>
                </div>

                <div className="tier-target-box">
                  <span className="tier-target-text">{tier.target}</span>
                  <span className="tier-fee-text">{tier.fee}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 유의사항 (purchase/quote의 quote-notice와 동일한 디자인) */}
          <div className="gp-notice">
            <span className="gp-notice-icon" aria-hidden="true"><Lightbulb weight="fill" /></span>
            <div className="gp-notice-body">
              <strong className="gp-notice-title">등급 안내</strong>
              <ul>
                <li><strong>다이아 등급</strong>은 활동 상황에 따라 수동 등업됩니다.</li>
                <li>등급 이전은 타사 내역 인증 시 <strong>최대 'GOLD'</strong>까지만 가능합니다.</li>
              </ul>
            </div>
          </div>

          {/* 사업자 배너 */}
          <div className="biz-banner" onClick={() => window.location.href='/inquiry/kakaotalk'}>
            <div className="biz-banner-left">
              <div className="biz-banner-icon">
                <Briefcase size={26} weight="duotone" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 5px', fontSize: '22px', fontWeight: '900' }}>사업자 고객이신가요?</h4>
                <p style={{ margin: 0, color: '#c3c8d4', fontSize: '15px' }}>대량 구매 전용 특별 요율을 제공해 드립니다.</p>
              </div>
            </div>
            <div className="biz-banner-cta" style={{ background: 'linear-gradient(135deg, #f5c451 0%, #c98f14 100%)', color: '#1c1a16', padding: '11px 20px', borderRadius: '12px', fontWeight: '900', fontSize: '14px', whiteSpace: 'nowrap', boxShadow: '0 10px 22px -12px rgba(201, 143, 20, 0.9)' }}>
              카카오톡 문의 →
            </div>
          </div>
        </div>
      </div>
    </GuideLayout>
  );
}