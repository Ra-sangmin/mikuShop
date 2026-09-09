"use client";
import React from 'react';
import GuideLayout from '../../components/GuideLayout';
import { Crown, Diamond, Gift, Medal, Sparkle } from '@phosphor-icons/react';

export default function MembershipPage() {
  // 등급 데이터 정의
  const membershipData = [
    { grade: 'NEW', icon: <Sparkle weight="fill" />, orders: '0건', discount: '0%', fee: '100엔', target: '모든 사이트', color: '#8b5cf6', bgColor: '#f8fafc', gradient: 'linear-gradient(145deg, #a78bfa 0%, #7c3aed 100%)' },
    { grade: 'SILVER', icon: <Medal weight="fill" />, orders: '1건', discount: '5%', fee: '100엔', target: '중고 사이트 (건당)', color: '#64748b', bgColor: '#f1f5f9', gradient: 'linear-gradient(145deg, #cbd5e1 0%, #64748b 100%)' },
    { grade: 'GOLD', icon: <Crown weight="fill" />, orders: '5건', discount: '10%', fee: '200엔', target: '입찰/경매 (건당)', color: '#f59e0b', bgColor: '#fffbeb', gradient: 'linear-gradient(145deg, #fcd34d 0%, #d97706 100%)' },
    { grade: 'DIAMOND', icon: <Diamond weight="fill" />, orders: '15건', discount: '15%', fee: '+특별혜택', target: '최우수 고객', color: '#0ea5e9', bgColor: '#f0f9ff', gradient: 'linear-gradient(145deg, #7dd3fc 0%, #0284c7 100%)', highlight: true },
  ];

  return (
    <GuideLayout title="회원등급 및 혜택" type="fee">
      <div className="membership-container">
        
        {/* 🌟 모바일 최적화 CSS */}
        <style jsx global>{`
          .membership-container {
            max-width: 1180px;
            margin: 0 auto;
            /* 🌟 헤더와의 간격 제거 (상단 패딩만 0으로) */
            padding: 0 24px 56px;
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

          /* 헤더 섹션 (PC: 왼쪽 사이드바와 높이를 맞춤) */
          .header-section {
            background: linear-gradient(135deg, #111827 0%, #263449 100%);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 28px;
            padding: 52px 56px;
            margin-bottom: 32px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
            overflow: hidden;
            box-shadow: 0 24px 50px rgba(15, 23, 42, 0.16);
            box-sizing: border-box;
            min-height: var(--sidebar-desktop-h, 340px);
          }
          .header-section::after { content: ''; position: absolute; width: 300px; height: 300px; right: -100px; top: -130px; border: 1px solid rgba(251,191,36,0.2); border-radius: 50%; box-shadow: 0 0 0 30px rgba(251,191,36,0.04), 0 0 0 60px rgba(251,191,36,0.025); }
          .tier-card { min-height: 320px; border-radius: 20px !important; overflow: hidden; transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease; }
          .tier-icon-badge {
            width: 72px; height: 72px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 14px; position: relative;
            box-shadow: 0 10px 22px -6px var(--tier-color, #94a3b8), inset 0 1px 1px rgba(255,255,255,0.5);
          }
          .tier-icon-badge::after {
            content: ''; position: absolute; inset: 0; border-radius: 50%;
            border: 1px solid rgba(255,255,255,0.35);
          }
          .tier-icon { font-size: 34px !important; line-height: 1; color: #fff !important; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.15)); }
          .tier-card:hover { transform: translateY(-6px); box-shadow: 0 18px 35px rgba(15,23,42,0.1) !important; }
          .tier-card::before { content: ''; position: absolute; inset: 0 0 auto; height: 4px; background: var(--tier-color, #94a3b8); }
          .tier-card:nth-child(1) { --tier-color: #8b5cf6; }
          .tier-card:nth-child(2) { --tier-color: #94a3b8; }
          .tier-card:nth-child(3) { --tier-color: #f59e0b; }
          .tier-card:nth-child(4) { --tier-color: #0ea5e9; }
          .tier-card:nth-child(4) { background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 48%) !important; border: 3px solid #0ea5e9 !important; box-shadow: 0 18px 40px rgba(14,165,233,0.2) !important; transform: translateY(-6px); z-index: 2; }
          .tier-card:nth-child(4)::before { height: 6px; background: linear-gradient(90deg, #38bdf8, #2563eb); }
          .diamond-badge { position: absolute; top: 14px; right: 14px; padding: 4px 8px; border-radius: 999px; background: #0ea5e9; color: #fff; font-size: 9px; font-weight: 900; letter-spacing: 0.08em; }
          .biz-banner { border-radius: 20px; padding: 26px 32px; }

          /* 사업자 배너 */
          .biz-banner {
            background: linear-gradient(90deg, #d97706 0%, #fbbf24 100%);
            color: #fff;
            padding: 30px 40px;
            border-radius: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 15px 30px rgba(245, 158, 11, 0.3);
            cursor: pointer;
            transition: transform 0.3s;
          }
          .biz-banner:hover { transform: translateY(-3px); }

          /* 📱 모바일 대응 핵심 수정 (768px 이하) */
          @media (max-width: 768px) {
            /* 🌟 currentMenu(고정 바)와 카드 사이 여백 제거 */
            .membership-container { padding: 0 12px 36px; }
            
            /* 🌟 한 줄에 2개씩 배치하여 크기를 줄임 */
            .membership-grid { 
              grid-template-columns: repeat(2, 1fr); 
              gap: 12px; 
            }

            .header-section {
              padding: 30px 20px;
              flex-direction: column;
              text-align: center;
              border-radius: 24px;
              margin-bottom: 28px;
              min-height: 0; /* PC 전용 사이드바 높이 맞춤 해제 */
            }
            .header-section h2 { font-size: 24px !important; }
            .header-icon { font-size: 60px !important; margin-top: 15px; }

            /* 🌟 개별 카드 내부 요소 크기 축소 */
            .tier-card { min-height: 250px; padding: 24px 10px !important; border-radius: 16px !important; }
            .tier-card:nth-child(4) { transform: none; }
            .tier-icon-badge { width: 52px; height: 52px; margin-bottom: 10px; }
            .tier-icon { font-size: 24px !important; }
            .tier-name { font-size: 16px !important; }
            .tier-orders { font-size: 11px !important; }
            .tier-discount-label { font-size: 9px !important; }
            .tier-discount-val { font-size: 22px !important; }
            .tier-target-box { padding: 8px 5px !important; border-radius: 12px !important; }
            .tier-target-text { font-size: 9px !important; }
            .tier-fee-text { font-size: 14px !important; }
            
            .biz-banner { 
              flex-direction: column; 
              text-align: center; 
              gap: 20px;
              padding: 25px;
              border-radius: 20px;
            }
          }

          /* 아주 작은 화면 (400px 이하) 대응 */
          @media (max-width: 400px) {
            .membership-grid { gap: 8px; }
            .tier-discount-val { font-size: 18px !important; }
          }
        `}</style>

        {/* 프리미엄 헤더 */}
        <div className="header-section">
          <div style={{ position: 'relative', zIndex: 2 }}>
            <span style={{ display: 'inline-block', color: '#fbbf24', fontSize: '12px', fontWeight: '900', letterSpacing: '2px', marginBottom: '10px', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '4px 12px', borderRadius: '20px', backgroundColor: 'rgba(251, 191, 36, 0.1)' }}>
              MIKUCHAN MEMBERSHIP
            </span>
            <h2 style={{ color: '#fff', fontSize: '36px', fontWeight: '900', margin: '0 0 10px' }}>
              미쿠짱 <span style={{ color: '#fbbf24' }}>회원등급 혜택</span>
            </h2>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px' }}>
              자주 이용하실수록 더욱 강력해지는 혜택을 경험해 보세요.
            </p>
          </div>
          <div className="header-icon" style={{ color: '#fbbf24', fontSize: '100px', lineHeight: 1 }}><Gift size="1em" weight="duotone" /></div>
        </div>

        {/* 등급 카드 그리드 */}
        <div className="membership-grid">
          {membershipData.map((tier, idx) => (
            <div key={idx} className="tier-card" style={{ 
              backgroundColor: '#fff', padding: '30px', borderRadius: '24px', 
              border: tier.highlight ? '2px solid #ff4b2b' : '1px solid #e2e8f0',
              textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center'
            }}>
              {tier.highlight && <span className="diamond-badge">TOP TIER</span>}
              <div className="tier-icon-badge" style={{ background: tier.gradient, '--tier-color': tier.color } as React.CSSProperties}>
                <div className="tier-icon">{tier.icon}</div>
              </div>
              <h4 className="tier-name" style={{ fontSize: '20px', fontWeight: '900', color: tier.color, margin: '0 0 5px' }}>{tier.grade}</h4>
              <p className="tier-orders" style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '700', marginBottom: '15px' }}>주문 {tier.orders}</p>
              
              <div style={{ marginBottom: '15px' }}>
                <span className="tier-discount-label" style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', display: 'block' }}>배송비 할인</span>
                <span className="tier-discount-val" style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b' }}>{tier.discount}</span>
              </div>

              <div className="tier-target-box" style={{ backgroundColor: '#f1f5f9', padding: '12px 10px', borderRadius: '16px' }}>
                <span className="tier-target-text" style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block' }}>{tier.target}</span>
                <div className="tier-fee-text" style={{ fontSize: '16px', fontWeight: '900', color: '#ff4b2b' }}>{tier.fee}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 유의사항 */}
        <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '20px', display: 'flex', gap: '12px', marginBottom: '40px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '18px' }}>💡</span>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>
            <li style={{ marginBottom: '5px' }}><b style={{ color: '#0f172a' }}>다이아 등급</b>은 활동 상황에 따라 수동 등업됩니다.</li>
            <li>등급 이전은 타사 내역 인증 시 <b style={{ color: '#f59e0b' }}>최대 'GOLD'</b>까지만 가능합니다.</li>
          </ul>
        </div>

        {/* 사업자 배너 */}
        <div className="biz-banner" onClick={() => window.location.href='/contact'}>
          <div>
            <h4 style={{ margin: '0 0 5px', fontSize: '22px', fontWeight: '900' }}>사업자 고객이신가요?</h4>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '15px' }}>대량 구매 전용 특별 요율을 제공해 드립니다.</p>
          </div>
          <div style={{ backgroundColor: '#fff', color: '#d97706', padding: '10px 20px', borderRadius: '50px', fontWeight: '900', fontSize: '14px', whiteSpace: 'nowrap' }}>
            카톡 문의 ➔
          </div>
        </div>
      </div>
    </GuideLayout>
  );
}