"use client";
import React, { useState } from 'react';
import GuideLayout from '../../components/GuideLayout'; 

// 카테고리별 관세율 데이터
const taxCategories = [
  {
    name: '의류/패션잡화',
    icon: '👕',
    items: [
      { name: '가방 및 지갑', tariff: '8%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '일반시계', tariff: '8%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '고급시계(200만원 초과)', tariff: '8%', special: '20%', agri: '-', liquor: '-', edu: '30%', vat: '10%' },
      { name: '립스틱/마스카라/펜슬', tariff: '6.5%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '브래지어, 거들 등 속옷', tariff: '13%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '스카프, 머플러, 숄', tariff: '8%(편물13%)', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '기초화장품', tariff: '8%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '신발 / 의류', tariff: '13%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '향수(60ml 이하)', tariff: '면세', special: '7%', agri: '10%', liquor: '-', edu: '30%', vat: '10%' },
    ]
  },
  {
    name: '레져/스포츠용품',
    icon: '⛳',
    items: [
      { name: '골프용품 / 골프채', tariff: '8%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '공 / 라켓', tariff: '8%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '낚시용품', tariff: '8%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '수영용품', tariff: '8%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '스케이트, 스키용품', tariff: '8%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '스포츠용 신발/글로브', tariff: '13%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '텐트', tariff: '13%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
    ]
  },
  {
    name: '전자제품/컴퓨터',
    icon: '💻',
    items: [
      { name: '디지털 카메라', tariff: '0%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '휴대폰 / 전자수첩', tariff: '0%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '노트북 / 데스크탑PC', tariff: '0%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: 'LCD TV, LED TV', tariff: '8%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '비디오게임', tariff: '0%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '키보드 / 마우스', tariff: '0%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
    ]
  },
  {
    name: '유아/가정용품',
    icon: '🍼',
    items: [
      { name: '기타완구 / 조립완구', tariff: '0~8%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '분유 / 이유식', tariff: '36~60%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '유모차 및 부분품', tariff: '5%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '식기 (유리/플라스틱)', tariff: '6.5~8%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
      { name: '건강보조식품 / 비타민', tariff: '8%', special: '-', agri: '-', liquor: '-', edu: '-', vat: '10%' },
    ]
  }
];

export default function CustomsTaxGuidePage() {
  const [activeTab, setActiveTab] = useState(taxCategories[0].name);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const containerStyle = { maxWidth: '1000px', margin: '0 auto', padding: '20px 20px', fontFamily: '"Noto Sans KR", sans-serif', color: '#334155' };
  
  // 🌟 공통 카드 스타일에 트랜지션 추가
  const cardStyle = { 
    backgroundColor: '#fff', 
    borderRadius: '24px', 
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)', 
    border: '1px solid #e2e8f0', 
    overflow: 'hidden',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease' 
  };
  
  const thStyle: React.CSSProperties = { padding: '18px 12px', fontSize: '20px', fontWeight: '700', color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'center' };
  const tdStyle: React.CSSProperties = { padding: '16px 12px', fontSize: '19px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' };

  return (
    <GuideLayout title="통관 및 관부가세 안내" type="fee">
      <div style={containerStyle}>
        
        {/* 🌟 전역 애니메이션 키프레임 및 유틸리티 클래스 */}
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
          .animate-6 { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.0s forwards; }
          
          /* 카드 호버 유틸리티 */
          .hover-float:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08) !important;
          }
        `}</style>

        {/* Header Section */}
        <div className="animate-1" style={{ textAlign: 'center', marginBottom: '60px' }}>
          <span style={{ fontSize: '14px', fontWeight: '800', color: '#ff4b2b', letterSpacing: '2px', backgroundColor: '#fff1f0', padding: '6px 16px', borderRadius: '20px' }}>TAX GUIDE</span>
          <h2 style={{ fontSize: '42px', fontWeight: '900', color: '#0f172a', marginTop: '20px', letterSpacing: '-1px' }}>통관 및 관부가세 안내</h2>
          <p style={{ fontSize: '18px', color: '#64748b', marginTop: '15px', lineHeight: '1.6', wordBreak: 'keep-all' }}>
            해외 직구 시 발생하는 관부가세 기준을 안내해 드립니다.<br />
            정확한 세금 산정법을 확인하고 스마트한 쇼핑을 계획해 보세요.
          </p>
        </div>

        {/* 1. 과세기준 핵심 카드 */}
        <div className="animate-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '80px' }}>
          <div className="hover-float" style={{ ...cardStyle, padding: '40px', backgroundColor: '#0f172a', color: '#fff' }}>
            <h4 style={{ fontSize: '25px', fontWeight: '800', marginBottom: '20px', color: '#ffcc00', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>💡</span> 과세 표준 가격이란?
            </h4>
            <p style={{ fontSize: '19px', lineHeight: '1.8', color: '#cbd5e1', margin: 0 }}>
              <strong style={{ color: '#fff' }}>[물품값 + 현지배송비 + 현지세금]</strong><br />
              위 합계액에 고시환율을 적용한 금액입니다.<br />
              여기에 <span style={{ color: '#ffcc00', fontWeight: '700' }}>국제 항공/해운 운임</span>이 더해져 산출됩니다.
            </p>
          </div>
          <div className="hover-float" style={{ ...cardStyle, padding: '40px', border: '2px solid #ff4b2b' }}>
            <h4 style={{ fontSize: '25px', fontWeight: '800', marginBottom: '20px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>📊</span> 면세 기준 (목록통관)
            </h4>
            <p style={{ fontSize: '20px', lineHeight: '1.8', color: '#475569', margin: 0 }}>
              일본 직구 시 결제 총액 <br /><strong style={{ color: '#ff4b2b', fontSize: '27px' }}>미화 $150 이하</strong>는<br />
              관세와 부가세가 모두 <span style={{ fontWeight: '800', color: '#0f172a' }}>면제</span>됩니다.<br />
              <small style={{ color: '#94a3b8' }}>(단, 식약처 관리 등 일반통관 품목 제외)</small>
            </p>
          </div>
        </div>

        {/* 2. 세금 산정 공식 가이드 */}
        <div className="animate-3" style={{ marginBottom: '80px' }}>
          <h3 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <span style={{ width: '8px', height: '24px', backgroundColor: '#ff4b2b', borderRadius: '4px' }}></span>
             세금 산정법 예시
          </h3>
          <div style={{ ...cardStyle, padding: '40px', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              {[
                { step: 'STEP 01', title: '관세 (Tariff)', formula: '과세가격 × 물품 관세율' },
                { step: 'STEP 02', title: '부가세 (VAT)', formula: '(과세가격 + 관세) × 10%' },
                { step: 'STEP 03', title: '합계 세액', formula: '관세 + 부가가치세' }
              ].map((item, idx) => (
                <div key={idx} className="hover-float" style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}>
                  <p style={{ fontSize: '15px', color: '#ff4b2b', fontWeight: '900', marginBottom: '8px' }}>{item.step}</p>
                  <p style={{ fontSize: '25px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>{item.title}</p>
                  <p style={{ margin: 0, fontSize: '18px', color: '#64748b', fontWeight: '500' }}>{item.formula}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. 품목별 관세율 (고급 탭 로직 적용) */}
        <div className="animate-4" style={{ marginBottom: '80px' }}>
          <h3 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <span style={{ width: '8px', height: '24px', backgroundColor: '#0f172a', borderRadius: '4px' }}></span>
             주요 품목별 관세율
          </h3>
          
          <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '14px', marginBottom: '30px' }}>
            {taxCategories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveTab(cat.name)}
                onMouseEnter={() => setHoveredTab(cat.name)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  flex: 1, 
                  padding: '18px 10px', 
                  borderRadius: '14px', 
                  fontWeight: '800', 
                  fontSize: '18px', 
                  cursor: 'pointer', 
                  border: 'none',
                  backgroundColor: activeTab === cat.name ? '#ff4b2b' : '#f1f5f9',
                  color: activeTab === cat.name ? '#fff' : (hoveredTab === cat.name ? '#ff4b2b' : '#64748b'),
                  boxShadow: activeTab === cat.name ? '0 6px 16px rgba(255, 75, 43, 0.3)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', whiteSpace: 'nowrap'
                }}
              >
                <span style={{ fontSize: '20px' }}>{cat.icon}</span> {cat.name}
              </button>
            ))}
          </div>

          <div style={cardStyle}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, textAlign: 'left', paddingLeft: '30px' }}>수입 품목</th>
                    <th style={thStyle}>관세</th>
                    <th style={thStyle}>특소세</th>
                    <th style={thStyle}>교육세</th>
                    <th style={thStyle}>부가세</th>
                  </tr>
                </thead>
                <tbody>
                  {taxCategories.find(c => c.name === activeTab)?.items.map((item, idx) => (
                    <tr key={idx} style={{ transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ ...tdStyle, textAlign: 'left', paddingLeft: '30px', fontWeight: '700', color: '#1e293b' }}>{item.name}</td>
                      <td style={{ ...tdStyle, color: '#ff4b2b', fontWeight: '900', fontSize: '16px' }}>{item.tariff}</td>
                      <td style={{ ...tdStyle, color: '#94a3b8' }}>{item.special}</td>
                      <td style={{ ...tdStyle, color: '#94a3b8' }}>{item.edu}</td>
                      <td style={{ ...tdStyle, fontWeight: '700', color: '#0f172a' }}>{item.vat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 4. 금지 품목 가이드 (경고형 디자인) */}
        <div className="animate-5 hover-float" style={{ backgroundColor: '#fff1f0', borderRadius: '30px', padding: '40px', border: '1px solid #ffa39e', marginBottom: '60px', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
            <span style={{ fontSize: '32px' }}>🚫</span>
            <h3 style={{ fontSize: '28px', fontWeight: '900', color: '#cf1322', margin: 0 }}>수입 금지 및 제한 품목</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {[
                '가연성 향수 및 스프레이식 화장품',
                '성인용 성기구 및 포르노그래피',
                '위조 화폐 및 가품(짝퉁) 제품'
              ].map((text, i) => (
                <li key={i} style={{ marginBottom: '12px', display: 'flex', gap: '10px', fontSize: '20px', fontWeight: '600', color: '#434343' }}>
                  <span style={{ color: '#cf1322' }}>•</span> {text}
                </li>
              ))}
            </ul>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {[
                '자가 사용 목적 외의 상업용 수입',
                '총기, 도검류 및 군사 무기 부품',
                '가공 육류 및 농축산물 일부'
              ].map((text, i) => (
                <li key={i} style={{ marginBottom: '12px', display: 'flex', gap: '10px', fontSize: '20px', fontWeight: '600', color: '#434343' }}>
                  <span style={{ color: '#cf1322' }}>•</span> {text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer info */}
        <div className="animate-6" style={{ backgroundColor: '#f8fafc', padding: '40px', borderRadius: '32px', border: '2px dashed #cbd5e1', textAlign: 'center' }}>
          <p style={{ fontSize: '20px', color: '#64748b', fontWeight: '600', margin: 0, lineHeight: '1.8' }}>
            관세율은 관세청 규정에 따라 실시간 변동될 수 있습니다.<br />
            정확한 확인은 <span style={{ color: '#0f172a', fontWeight: '900', borderBottom: '2px solid #ff4b2b', cursor: 'pointer' }}>1:1 상담 게시판</span>을 통해 문의주세요.
          </p>
        </div>

      </div>
    </GuideLayout>
  );
}