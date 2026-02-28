"use client";
import React, { useState } from 'react';
import GuideLayout from '../../components/GuideLayout'; 

const taxCategories = [
  {
    name: '의류/잡화', // 명칭을 짧게 최적화
    icon: '👕',
    items: [
      { name: '가방 및 지갑', tariff: '8%', vat: '10%' },
      { name: '일반시계', tariff: '8%', vat: '10%' },
      { name: '고급시계(200만↑)', tariff: '8%', vat: '10%' },
      { name: '립스틱/마스카라', tariff: '6.5%', vat: '10%' },
      { name: '속옷/내의', tariff: '13%', vat: '10%' },
      { name: '스카프/머플러', tariff: '8%', vat: '10%' },
      { name: '기초화장품', tariff: '8%', vat: '10%' },
      { name: '신발 / 의류', tariff: '13%', vat: '10%' },
      { name: '향수(60ml↓)', tariff: '면세', vat: '10%' },
    ]
  },
  {
    name: '레져/스포츠',
    icon: '⛳',
    items: [
      { name: '골프용품/채', tariff: '8%', vat: '10%' },
      { name: '공 / 라켓', tariff: '8%', vat: '10%' },
      { name: '낚시용품', tariff: '8%', vat: '10%' },
      { name: '수영용품', tariff: '8%', vat: '10%' },
      { name: '스키용품', tariff: '8%', vat: '10%' },
      { name: '스포츠화/글로브', tariff: '13%', vat: '10%' },
      { name: '텐트', tariff: '13%', vat: '10%' },
    ]
  },
  {
    name: '전자/컴퓨터',
    icon: '💻',
    items: [
      { name: '디지털 카메라', tariff: '0%', vat: '10%' },
      { name: '휴대폰', tariff: '0%', vat: '10%' },
      { name: '노트북/PC', tariff: '0%', vat: '10%' },
      { name: 'LCD/LED TV', tariff: '8%', vat: '10%' },
      { name: '비디오게임', tariff: '0%', vat: '10%' },
      { name: '키보드/마우스', tariff: '0%', vat: '10%' },
    ]
  },
  {
    name: '유아/가정',
    icon: '🍼',
    items: [
      { name: '기타/조립완구', tariff: '0~8%', vat: '10%' },
      { name: '분유/이유식', tariff: '36%~', vat: '10%' },
      { name: '유모차', tariff: '5%', vat: '10%' },
      { name: '식기류', tariff: '6.5%~', vat: '10%' },
      { name: '건강보조식품', tariff: '8%', vat: '10%' },
    ]
  }
];

export default function CustomsTaxGuidePage() {
  const [activeTab, setActiveTab] = useState(taxCategories[0].name);

  return (
    <GuideLayout title="통관 및 관부가세 안내" type="fee">
      <div className="customs-container">
        
        <style jsx global>{`
          @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(30px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-1 { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          .animate-2 { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; }
          .animate-4 { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards; }
          
          .customs-container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            font-family: "Noto Sans KR", sans-serif;
            color: #334155;
          }

          .base-card {
            background-color: #fff;
            border-radius: 24px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
            overflow: hidden;
          }

          .tab-menu-wrap { display: flex; gap: 10px; margin-bottom: 30px; }
          .tab-btn {
            flex: 1; padding: 18px 10px; border-radius: 14px; fontWeight: 800; fontSize: 18px;
            cursor: pointer; border: none; transition: all 0.2s;
            display: flex; align-items: center; justifyContent: center; gap: 8px;
          }

          /* 📱 모바일 레이아웃 버그 수정 (image_74ddb8 대응) */
          @media (max-width: 768px) {
            .customs-container {
              max-width: 85%; /* 가로 넓이 압축 유지 */
              padding: 10px 0 !important;
            }

            /* 🌟 핵심수정: 1열 배치를 2x2 그리드로 변경하여 글자 겹침 방지 */
            .tab-menu-wrap {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 8px !important;
              margin-bottom: 20px !important;
            }

            .tab-btn {
              padding: 12px 8px !important;
              font-size: 13px !important;
              border-radius: 10px !important;
              white-space: nowrap !important; /* 글자 세로 방지 */
              flex: none !important;
            }
            .tab-btn span { font-size: 16px !important; }

            .header-title { font-size: 22px !important; margin-top: 10px !important; }
            .header-desc { font-size: 13px !important; }

            .grid-2col { grid-template-columns: 1fr !important; gap: 12px !important; }
            .standard-card { padding: 20px !important; }
            .standard-card h4 { font-size: 17px !important; }
            .standard-card p, .standard-card div { font-size: 14px !important; }

            .table-wrap th { padding: 10px 4px !important; font-size: 11px !important; }
            .table-wrap td { padding: 10px 4px !important; font-size: 11px !important; }
          }
        `}</style>

        {/* Header Section */}
        <div className="animate-1" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#ff4b2b', letterSpacing: '1px', backgroundColor: '#fff1f0', padding: '4px 12px', borderRadius: '20px' }}>TAX GUIDE</span>
          <h2 className="header-title" style={{ fontSize: '36px', fontWeight: '900', color: '#0f172a', marginTop: '20px' }}>통관 및 관부가세</h2>
        </div>

        {/* 1. 과세기준 핵심 카드 */}
        <div className="animate-2 grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
          <div className="base-card standard-card" style={{ padding: '30px', backgroundColor: '#0f172a', color: '#fff' }}>
            <h4 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '15px', color: '#ffcc00' }}>💡 과세 표준 가격</h4>
            <p style={{ fontSize: '16px', color: '#cbd5e1', margin: 0 }}>[물품값 + 현지운임 + 세금]</p>
          </div>
          <div className="base-card standard-card" style={{ padding: '30px', border: '2px solid #ff4b2b' }}>
            <h4 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '15px', color: '#0f172a' }}>📊 면세 기준</h4>
            <div style={{ fontSize: '16px', color: '#475569' }}>결제액 <strong style={{ color: '#ff4b2b', fontSize: '22px' }}>$150 이하</strong> 면세</div>
          </div>
        </div>

        {/* 2. 품목별 관세율 (수정된 그리드 적용) */}
        <div className="animate-4" style={{ marginBottom: '40px' }}>
          <div className="tab-menu-wrap">
            {taxCategories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveTab(cat.name)}
                className="tab-btn"
                style={{
                  backgroundColor: activeTab === cat.name ? '#ff4b2b' : '#f1f5f9',
                  color: activeTab === cat.name ? '#fff' : '#64748b',
                  boxShadow: activeTab === cat.name ? '0 4px 10px rgba(255, 75, 43, 0.2)' : 'none',
                }}
              >
                <span>{cat.icon}</span> {cat.name}
              </button>
            ))}
          </div>

          <div className="base-card table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '15px', fontSize: '14px', textAlign: 'left', paddingLeft: '20px', color: '#64748b' }}>수입 품목</th>
                  <th style={{ padding: '15px', fontSize: '14px', textAlign: 'center', color: '#64748b' }}>관세</th>
                  <th style={{ padding: '15px', fontSize: '14px', textAlign: 'center', color: '#64748b' }}>부가세</th>
                </tr>
              </thead>
              <tbody>
                {taxCategories.find(c => c.name === activeTab)?.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 20px', fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{item.name}</td>
                    <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center', color: '#ff4b2b', fontWeight: '800' }}>{item.tariff}</td>
                    <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center', color: '#0f172a', fontWeight: '700' }}>{item.vat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
        <div className="animate-6" style={{ backgroundColor: '#f8fafc', padding: '30px', borderRadius: '24px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
          <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '600', margin: 0 }}>
            정확한 확인은 <span style={{ color: '#0f172a', fontWeight: '800', borderBottom: '1.5px solid #ff4b2b', cursor: 'pointer' }}>1:1 상담</span>을 통해 문의주세요.
          </p>
        </div>

      </div>
    </GuideLayout>
  );
}