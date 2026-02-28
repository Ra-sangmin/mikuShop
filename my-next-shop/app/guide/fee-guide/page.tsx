"use client";
import React from 'react';
import GuideLayout from '../../components/GuideLayout'; 

export default function FeeGuidePage() {
  return (
    <GuideLayout title="수수료 안내" type="fee">
      <div className="fee-guide-container">
        
        {/* 🌟 전역 애니메이션 및 반응형 CSS 정의 */}
        <style jsx global>{`
          @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(40px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          
          .animate-1 { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          .animate-2 { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; }
          .animate-3 { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards; }
          .animate-4 { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards; }
          .animate-5 { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.8s forwards; }

          .fee-guide-container {
            max-width: 1100px;
            margin: 0 auto;
            padding: 20px;
            font-family: 'Pretendard', sans-serif;
            color: #334155;
          }

          .section-title {
            font-size: 28px;
            font-weight: 900;
            color: #0f172a;
            margin-bottom: 35px;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .section-title span { width: 8px; height: 28px; background-color: #0f172a; border-radius: 4px; }

          .base-card {
            background-color: #fff;
            border-radius: 24px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          }

          /* 📱 모바일 대응 (768px 이하) */
          @media (max-width: 768px) {
            .fee-guide-container { padding: 10px; }
            
            /* 헤더 섹션 */
            .header-section { margin-bottom: 50px !important; }
            .header-section h2 { font-size: 28px !important; }
            .header-section p { font-size: 15px !important; }

            /* 기본 서비스 체계: 가로 배치를 세로로 전환 */
            .service-row { flex-direction: column !important; }
            .service-label { width: 100% !important; padding: 15px !important; text-align: left !important; border-bottom: 1px solid #f1f5f9; }
            .service-content { padding: 20px !important; grid-template-columns: 1fr !important; gap: 20px !important; }

            /* 수수료 카드: 1열 배치 */
            .fee-card-grid { grid-template-columns: 1fr !important; gap: 20px !important; margin-bottom: 60px !important; }

            /* 배송 케어 어두운 박스 */
            .total-care-box { padding: 30px 20px !important; border-radius: 24px !important; margin-bottom: 60px !important; }
            .total-care-box h4 { font-size: 22px !important; }
            .total-care-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
            .care-item { padding: 20px 10px !important; }
            .care-item div { font-size: 24px !important; }

            /* 푸터 인포 */
            .footer-info { padding: 30px 20px !important; font-size: 14px !important; }
          }
        `}</style>

        {/* 1. Header Section */}
        <div className="animate-1 header-section" style={{ textAlign: 'center', marginBottom: '80px' }}>
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

        {/* 2. 기본 서비스 체계 */}
        <div className="animate-2" style={{ marginBottom: '80px' }}>
          <h3 className="section-title"><span></span>기본 서비스 체계</h3>
          <div className="base-card">
            <div className="service-row" style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
              <div className="service-label" style={{ width: '200px', backgroundColor: '#f8fafc', padding: '40px 20px', textAlign: 'center', fontWeight: '900', color: '#1e293b', fontSize: '17px' }}>서비스 유형</div>
              <div className="service-content" style={{ flex: 1, padding: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                <div>
                  <div style={{ color: '#ff4b2b', fontWeight: '900', fontSize: '13px', marginBottom: '10px' }}>TYPE A</div>
                  <h4 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '10px' }}>구매대행</h4>
                  <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>결제부터 배송까지 미쿠짱이 전담하는 서비스입니다.</p>
                </div>
                <div>
                  <div style={{ color: '#ff4b2b', fontWeight: '900', fontSize: '13px', marginBottom: '10px' }}>TYPE B</div>
                  <h4 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '10px' }}>배송대행</h4>
                  <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>직접 구매하신 물품을 안전하게 한국으로 보내드립니다.</p>
                </div>
              </div>
            </div>
            <div className="service-row" style={{ display: 'flex' }}>
              <div className="service-label" style={{ width: '200px', backgroundColor: '#f8fafc', padding: '30px 20px', textAlign: 'center', fontWeight: '900', color: '#1e293b', fontSize: '17px' }}>수수료 정책</div>
              <div style={{ flex: 1, padding: '30px', fontSize: '16px', fontWeight: '600', color: '#475569', wordBreak: 'keep-all' }}>
                모든 수수료는 <span style={{ color: '#0f172a', borderBottom: '2px solid #ffcc00' }}>주문서 1건당 발생</span>하며, 상품 개수와 상관없이 경제적입니다.
              </div>
            </div>
          </div>
        </div>

        {/* 3. 수수료 카드 섹션 */}
        <div className="animate-3 fee-card-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '100px' }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <h4 style={{ fontSize: '19px', fontWeight: '900', marginBottom: '25px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>📦 구매/배송 수수료</h4>
            {[
              { label: '일반 웹사이트 주문', price: '¥ 100' },
              { label: '프리마켓(메르카리) 주문', price: '¥ 100' },
              { label: '야후 입찰 및 경매', price: '¥ 200' },
              { label: '배송대행 수수료', price: '¥ 200', highlight: true },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{ fontSize: '15px', fontWeight: '700', color: item.highlight ? '#ea580c' : '#475569' }}>{item.label}</span>
                <span style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>{item.price}</span>
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <h4 style={{ fontSize: '19px', fontWeight: '900', marginBottom: '25px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>🔍 검수 서비스</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ backgroundColor: '#fffbeb', padding: '15px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontWeight: '900', fontSize: '16px' }}>기본 검수</span>
                  <span style={{ color: '#ea580c', fontWeight: '900' }}>FREE</span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>무게 측정 및 주문서 대조 (개봉 안함)</p>
              </div>
              <div style={{ border: '1px solid #e2e8f0', padding: '15px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontWeight: '900', fontSize: '16px' }}>정밀 사진 검수</span>
                  <span style={{ fontWeight: '900' }}>¥ 200</span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>개봉 후 상태 확인 및 사진 3매 제공</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. 배송 관리 수수료 */}
        <div className="animate-4 total-care-box" style={{ backgroundColor: '#0f172a', borderRadius: '40px', padding: '60px', color: '#fff', marginBottom: '100px', textAlign: 'center' }}>
          <h4 style={{ fontSize: '30px', fontWeight: '900', marginBottom: '10px' }}>안전 배송 관리 토탈 케어</h4>
          <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '40px' }}>포장재, 박스 패킹, 세관 신고 대행 포함 필수 비용</p>
          
          <div className="total-care-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
            {[
              { size: 'SMALL', limit: '59cm 이하', price: '¥ 200' },
              { size: 'MEDIUM', limit: '60~70cm', price: '¥ 300' },
              { size: 'LARGE', limit: '71~95cm', price: '¥ 400' },
              { size: 'SPECIAL', limit: '10kg+', price: '¥ 700~', accent: true },
            ].map((box, i) => (
              <div key={i} className="care-item" style={{ 
                backgroundColor: box.accent ? '#ff4b2b' : 'rgba(255,255,255,0.05)', 
                padding: '25px 15px', borderRadius: '20px', border: box.accent ? 'none' : '1px solid rgba(255,255,255,0.1)'
              }}>
                <span style={{ fontSize: '12px', fontWeight: '900', opacity: 0.8 }}>{box.size}</span>
                <div style={{ fontSize: '28px', fontWeight: '900', margin: '10px 0' }}>{box.price}</div>
                <span style={{ fontSize: '11px', color: box.accent ? '#fff' : '#94a3b8' }}>{box.limit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Footer Info */}
        <div className="animate-5 footer-info" style={{ backgroundColor: '#f1f5f9', padding: '40px', borderRadius: '32px', textAlign: 'center' }}>
          <p style={{ fontSize: '15px', color: '#475569', fontWeight: '600', margin: 0, lineHeight: '1.8', wordBreak: 'keep-all' }}>
            모든 수수료는 이용 시점의 환율(송금 환율 +0.3)이 적용됩니다.<br />
            궁금하신 점은 <span style={{ color: '#ff4b2b', fontWeight: '900', textDecoration: 'underline', cursor: 'pointer' }}>카카오톡 채널</span>로 문의해 주세요.
          </p>
        </div>

      </div>
    </GuideLayout>
  );
}