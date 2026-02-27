"use client";
import React from 'react';
import GuideLayout from '../../components/GuideLayout';

export default function MembershipPage() {
  // 등급 데이터 정의
  const membershipData = [
    { grade: 'NEW', icon: '🟫', orders: '0건', discount: '0%', fee: '100엔', target: '모든 사이트', color: '#8b5cf6', bgColor: '#f8fafc' },
    { grade: 'SILVER', icon: '🥈', orders: '1건', discount: '5%', fee: '100엔', target: '중고 사이트 (건당)', color: '#64748b', bgColor: '#f1f5f9' },
    { grade: 'GOLD', icon: '🥇', orders: '5건', discount: '10%', fee: '200엔', target: '입찰/경매 (건당)', color: '#f59e0b', bgColor: '#fffbeb' },
    { grade: 'DIAMOND', icon: '💎', orders: '15건', discount: '15%', fee: '+특별혜택', target: '최우수 고객', color: '#0ea5e9', bgColor: '#f0f9ff', highlight: true },
  ];

  const sectionTitleStyle = {
    fontSize: '28px',
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: '35px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  };

  const cardStyle = {
    backgroundColor: '#fff',
    borderRadius: '24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
    border: '1px solid #e2e8f0',
    padding: '30px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    transition: 'transform 0.2s ease'
  };

  return (
    <GuideLayout title="회원등급 및 혜택">
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '10px 20px', fontFamily: 'Pretendard, "Noto Sans KR", sans-serif', color: '#334155' }}>
        
        {/* 🌟 전역 애니메이션 키프레임 정의 */}
        <style jsx global>{`
          @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(30px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes cardPop {
            0% { opacity: 0; transform: scale(0.9) translateY(30px); }
            100% { opacity: 1; transform: scale(1.05) translateY(0); }
          }
          @keyframes cardFloat {
            0%, 100% { transform: scale(1.05) translateY(0); }
            50% { transform: scale(1.05) translateY(-8px); }
          }
          @keyframes shineEffect {
            0% { left: -100%; opacity: 0; }
            20% { opacity: 0.6; }
            40% { left: 100%; opacity: 0; }
            100% { left: 100%; opacity: 0; }
          }
          @keyframes pulseBanner {
            0%, 100% { box-shadow: 0 15px 30px rgba(245, 158, 11, 0.3); }
            50% { box-shadow: 0 15px 50px rgba(245, 158, 11, 0.6); }
          }
        `}</style>

        {/* 🌟 프리미엄 헤더 섹션 */}
        <div style={{ 
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
          borderRadius: '40px', 
          padding: '70px 50px', 
          marginBottom: '60px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)',
          opacity: 0,
          animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards' // 헤더 애니메이션
        }}>
          <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,204,0,0.15) 0%, transparent 70%)', borderRadius: '50%' }}></div>
          
          <div style={{ position: 'relative', zIndex: 2 }}>
            <span style={{ display: 'inline-block', color: '#fbbf24', fontSize: '14px', fontWeight: '900', letterSpacing: '3px', marginBottom: '15px', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '6px 16px', borderRadius: '20px', backgroundColor: 'rgba(251, 191, 36, 0.1)' }}>
              MIKUCHAN MEMBERSHIP
            </span>
            <h2 style={{ fontSize: '46px', fontWeight: '900', color: '#fff', margin: '0 0 15px', lineHeight: '1.2', letterSpacing: '-1px' }}>
              미쿠짱 <span style={{ color: '#fbbf24' }}>회원등급별 혜택</span>
            </h2>
            <p style={{ fontSize: '18px', color: '#94a3b8', margin: 0, fontWeight: '500', lineHeight: '1.6' }}>
              자주 이용하실수록 더욱 강력해지는 미쿠짱만의 특별한 혜택.<br />
              합리적인 수수료와 프리미엄 배송비 할인을 경험해 보세요.
            </p>
          </div>
          <div style={{ position: 'relative', zIndex: 2, fontSize: '120px', filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.3))' }}>
             🎁
          </div>
        </div>

         {/* 1. 회원등급별 혜택 */}
        <div style={{ marginBottom: '100px' }}>
          <div style={{ 
            backgroundColor: '#f8fafc', borderRadius: '40px', padding: '40px', border: '1px solid #e2e8f0',
            opacity: 0, animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards' // 배경 박스 애니메이션
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              
              {membershipData.map((tier, idx) => {
                // 🌟 카드별 순차적 등장 딜레이 계산 (0.4s, 0.55s, 0.7s, 0.85s)
                const delay = 0.4 + idx * 0.15;
                
                return (
                  <div key={idx} style={{ 
                    ...cardStyle, 
                    textAlign: 'center', 
                    border: tier.highlight ? '2px solid #ff4b2b' : '1px solid #e2e8f0',
                    boxShadow: tier.highlight ? '0 15px 40px rgba(255, 75, 43, 0.15)' : cardStyle.boxShadow,
                    position: 'relative',
                    zIndex: tier.highlight ? 10 : 1,
                    opacity: 0,
                    // 다이아몬드(highlight) 카드는 스케일업(Pop) + 무한 플로팅 적용
                    animation: tier.highlight 
                      ? `cardPop 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s forwards, cardFloat 4s ease-in-out ${delay + 0.8}s infinite`
                      : `fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s forwards`
                  }}>
                    
                    {/* 다이아몬드 전용 BEST 배지 & 반짝임 애니메이션 */}
                    {tier.highlight && (
                      <div style={{ 
                        position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                        backgroundColor: '#ff4b2b', color: '#fff', padding: '4px 20px', borderRadius: '12px',
                        fontSize: '12px', fontWeight: '900', letterSpacing: '1px', overflow: 'hidden'
                      }}>
                        BEST
                        <div style={{
                          position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%',
                          background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.9), transparent)',
                          transform: 'skewX(-20deg)', animation: 'shineEffect 3s infinite 2s'
                        }}></div>
                      </div>
                    )}

                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>{tier.icon}</div>
                    <h4 style={{ fontSize: '20px', fontWeight: '900', color: tier.color, margin: '0 0 5px' }}>{tier.name}</h4>
                    <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '700', marginBottom: '20px' }}>{tier.count}</p>
                    
                    <div style={{ marginBottom: '20px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', display: 'block' }}>배송비 할인</span>
                      <span style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b' }}>{tier.discount}</span>
                    </div>

                    <div style={{ backgroundColor: '#f1f5f9', padding: '15px 10px', borderRadius: '16px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>{tier.target}</span>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: '#ff4b2b' }}>{tier.fee}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 🌟 유의사항 박스 */}
        <div style={{ 
          marginTop: '-50px', padding: '25px 30px', backgroundColor: '#f8fafc', borderRadius: '20px', 
          display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '50px', border: '1px solid #e2e8f0',
          opacity: 0, animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1s forwards' // 가장 마지막에 등장
        }}>
          <span style={{ fontSize: '24px' }}>💡</span>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', color: '#64748b', fontSize: '15px', lineHeight: '1.8', fontWeight: '500' }}>
            <li style={{ marginBottom: '8px' }}><b style={{ color: '#0f172a' }}>다이아 등급</b>은 미쿠짱 카페 등의 활동 상황을 종합적으로 검토하여 특별 등업이 이루어집니다.</li>
            <li style={{ marginBottom: '8px' }}>다이아 회원에게는 배송비 할인 외에도 상황에 따른 <b style={{ color: '#0ea5e9' }}>시크릿 특별 혜택</b>이 정해집니다.</li>
            <li>타 구매대행사 이용 내역 인증을 통한 <b style={{ color: '#f59e0b' }}>등급 이전은 최대 '골드(GOLD)'</b>까지만 지원됩니다.</li>
          </ul>
        </div>

        {/* 🌟 사업자 전용 프리미엄 배너 (등장 후 은은한 맥박 효과) */}
        <div style={{ 
          background: 'linear-gradient(90deg, #d97706 0%, #fbbf24 100%)', 
          color: '#fff', 
          padding: '30px 40px', 
          borderRadius: '30px', 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 15px 30px rgba(245, 158, 11, 0.3)',
          cursor: 'pointer',
          opacity: 0, 
          // 등장 애니메이션 이후 pulseBanner 무한 반복
          animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.2s forwards, pulseBanner 3s infinite alternate 2s' 
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.transition = 'transform 0.3s';
        }}
        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div>
            <h4 style={{ margin: '0 0 5px', fontSize: '24px', fontWeight: '900', color: '#451a03' }}>사업자 고객이신가요?</h4>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#78350f' }}>대량 구매 및 사업자 전용 특별 요율을 제공해 드립니다.<br/> 지금 바로 문의해 주세요.</p>
          </div>
          <div style={{ backgroundColor: '#fff', color: '#d97706', padding: '14px 28px', borderRadius: '50px', fontWeight: '900', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>카톡 문의하기</span>
            <span style={{ fontSize: '20px', transition: 'transform 0.3s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateX(5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateX(0)'}>➔</span>
          </div>
        </div>

      </div>
    </GuideLayout>
  );
}