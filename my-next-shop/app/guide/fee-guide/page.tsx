"use client";
import React from 'react';
import GuideLayout from '../../components/GuideLayout'; 

export default function FeeGuidePage() {

  // --- 가독성 강화를 위한 스타일 최적화 ---
  const containerStyle = {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '20px 20px',
    fontFamily: 'Pretendard, "Noto Sans KR", sans-serif', 
    color: '#334155',
    lineHeight: '1.6'
  };

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
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // 🌟 호버 애니메이션 부드럽게 설정
  };

  return (
    <GuideLayout title="수수료 안내" type="fee">
      <div style={containerStyle}>
        
        {/* 🌟 전역 애니메이션 키프레임 정의 */}
        <style jsx global>{`
          @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(40px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          
          /* 순차적 등장을 위한 유틸리티 클래스 */
          .animate-1 { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          .animate-2 { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; }
          .animate-3 { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards; }
          .animate-4 { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards; }
          .animate-5 { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.8s forwards; }
        `}</style>

        {/* Header Section */}
        <div className="animate-1" style={{ textAlign: 'center', marginBottom: '80px' }}>
          <span style={{ fontSize: '14px', fontWeight: '800', color: '#ff4b2b', letterSpacing: '2px', backgroundColor: '#fff1f0', padding: '6px 16px', borderRadius: '20px' }}>SERVICE POLICY</span>
          <h2 style={{ fontSize: '42px', fontWeight: '900', color: '#0f172a', marginTop: '20px', letterSpacing: '-1px' }}>
            등급 및 수수료 가이드
          </h2>
          <div style={{ width: '60px', height: '4px', backgroundColor: '#ff4b2b', margin: '25px auto' }}></div>
          <p style={{ fontSize: '18px', color: '#64748b', fontWeight: '500', wordBreak: 'keep-all' }}>
            미쿠짱은 복잡한 수수료를 걷어내고 가장 투명한 정책을 지향합니다.<br />
            이용 실적에 따른 강력한 배송비 할인 혜택을 확인해 보세요.
          </p>
        </div>

        {/* 2. 기본 서비스 체계 - 가로 배치 활용 */}
        <div className="animate-2" style={{ marginBottom: '80px' }}>
          <h3 style={sectionTitleStyle}>
            <span style={{ width: '8px', height: '28px', backgroundColor: '#0f172a', borderRadius: '4px' }}></span>
            기본 서비스 체계
          </h3>
          <div style={{ ...cardStyle, padding: 0 }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: '200px', backgroundColor: '#f8fafc', padding: '40px 20px', textAlign: 'center', fontWeight: '900', color: '#1e293b', fontSize: '17px' }}>서비스 유형</div>
              <div style={{ flex: 1, padding: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                {/* 🌟 카드 호버 시 살짝 떠오르는 효과 추가 */}
                <div style={{ transition: 'transform 0.3s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{ color: '#ff4b2b', fontWeight: '900', fontSize: '13px', marginBottom: '10px' }}>TYPE A</div>
                  <h4 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '15px' }}>구매대행</h4>
                  <p style={{ color: '#64748b', fontSize: '15px' }}>현지 결제부터 국제 배송까지 미쿠짱이 모든 과정을 전담하는 편리한 서비스입니다.</p>
                </div>
                <div style={{ transition: 'transform 0.3s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{ color: '#ff4b2b', fontWeight: '900', fontSize: '13px', marginBottom: '10px' }}>TYPE B</div>
                  <h4 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '15px' }}>배송대행</h4>
                  <p style={{ color: '#64748b', fontSize: '15px' }}>고객님이 직접 결제하신 물품을 미쿠짱 창고를 통해 안전하게 한국으로 보내드리는 서비스입니다.</p>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex' }}>
              <div style={{ width: '200px', backgroundColor: '#f8fafc', padding: '40px 20px', textAlign: 'center', fontWeight: '900', color: '#1e293b', fontSize: '17px' }}>수수료 정책</div>
              <div style={{ flex: 1, padding: '40px', fontSize: '17px', fontWeight: '600', color: '#475569' }}>
                모든 수수료는 <span style={{ color: '#0f172a', borderBottom: '3px solid #ffcc00' }}>주문서 1건당 발생</span>하며, 상품의 개수가 많아도 추가 수수료가 없어 매우 경제적입니다.
              </div>
            </div>
          </div>
        </div>

        {/* 3. 수수료 카드 섹션 - 수치 강조 */}
        <div className="animate-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '100px' }}>
          
          <div 
            style={cardStyle} 
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.06)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.03)'; }}
          >
            <h4 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '30px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>📦 구매/배송 수수료</h4>
            {[
              { label: '일반 웹사이트 주문', price: '¥ 100' },
              { label: '프리마켓(메르카리 등) 주문', price: '¥ 100' },
              { label: '야후 입찰 및 경매', price: '¥ 200' },
              { label: '배송대행 수수료 (트래킹당)', price: '¥ 200', highlight: true },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '16px', fontWeight: '700', color: item.highlight ? '#ea580c' : '#475569' }}>{item.label}</span>
                <span style={{ fontSize: '22px', fontWeight: '900', color: '#1e293b' }}>{item.price}</span>
              </div>
            ))}
          </div>

          <div 
            style={cardStyle}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.06)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.03)'; }}
          >
            <h4 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '30px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>🔍 검수 서비스</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ backgroundColor: '#fffbeb', padding: '20px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '900', fontSize: '17px' }}>기본 검수</span>
                  <span style={{ color: '#ea580c', fontWeight: '900', fontSize: '18px' }}>FREE</span>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>무게 측정 및 주문서 대조 (개봉 안함)</p>
              </div>
              <div style={{ border: '1px solid #e2e8f0', padding: '20px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '900', fontSize: '17px' }}>정밀 사진 검수</span>
                  <span style={{ fontWeight: '900', fontSize: '18px' }}>¥ 200</span>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>개봉 후 세밀한 상태 확인 및 고화질 사진 3매 제공</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. 배송 관리 수수료 - 어두운 배경으로 무게감 강조 */}
        <div className="animate-4" style={{ 
          backgroundColor: '#0f172a', 
          borderRadius: '40px', 
          padding: '60px', 
          color: '#fff', 
          marginBottom: '100px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h4 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '15px' }}>안전 배송 관리 토탈 케어</h4>
            <p style={{ color: '#94a3b8', fontSize: '16px' }}>포장재, 박스 패킹, 세관 신고 대행이 모두 포함된 주문서당 필수 비용입니다.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            {[
              { size: 'SMALL', limit: '59cm 이하', price: '¥ 200' },
              { size: 'MEDIUM', limit: '60~70cm', price: '¥ 300' },
              { size: 'LARGE', limit: '71~95cm', price: '¥ 400' },
              { size: 'SPECIAL', limit: '규격 외/10kg+', price: '¥ 700~', accent: true },
            ].map((box, i) => (
              <div key={i} style={{ 
                backgroundColor: box.accent ? '#ff4b2b' : 'rgba(255,255,255,0.05)', 
                padding: '30px 20px', 
                borderRadius: '24px', 
                textAlign: 'center',
                border: box.accent ? 'none' : '1px solid rgba(255,255,255,0.1)',
                transition: 'transform 0.3s, background-color 0.3s',
                cursor: 'default'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-10px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <span style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '1px', opacity: 0.8 }}>{box.size}</span>
                <div style={{ fontSize: '32px', fontWeight: '900', margin: '15px 0' }}>{box.price}</div>
                <span style={{ fontSize: '12px', color: box.accent ? '#fff' : '#94a3b8' }}>{box.limit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info - 신뢰감을 주는 푸터 */}
        <div className="animate-5" style={{ backgroundColor: '#f1f5f9', padding: '40px', borderRadius: '32px', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', color: '#475569', fontWeight: '600', margin: 0, lineHeight: '1.8' }}>
            모든 수수료는 이용 시점의 환율(송금 환율 +0.3)이 적용됩니다.<br />
            궁금하신 점은 <span style={{ color: '#ff4b2b', fontWeight: '900', textDecoration: 'underline', cursor: 'pointer' }}>카카오톡 채널</span>로 문의하시면 실시간 상담이 가능합니다.
          </p>
        </div>

      </div>
    </GuideLayout>
  );
}