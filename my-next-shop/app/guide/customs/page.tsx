"use client";
import React, { useState } from 'react';
import GuideLayout from '../../components/GuideLayout';
import '../guide-common.css';
import { Lightbulb, ChartBar, TShirt, Basketball, Laptop, Baby } from '@phosphor-icons/react';
import GuideFooterNotice from '../components/GuideFooterNotice';
import GuidePremiumHero from '../components/GuidePremiumHero';
import GuideTitle from '../components/GuideTitle';
import { Scales, Clock } from '@phosphor-icons/react';

const taxCategories = [
  {
    name: '의류/잡화',
    icon: <TShirt weight="fill" />,
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
    icon: <Basketball weight="fill" />,
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
    icon: <Laptop weight="fill" />,
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
    icon: <Baby weight="fill" />,
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
          /* 🌟 @keyframes fadeInUp / .animate-N은 fee-guide 페이지와 공통이라
             ../guide-common.css로 옮겼습니다. */

          .customs-container {
            /* 🌟 guide/membership, fee-guide, shipping-fee, customs 4개 페이지가 서로 다른
               max-width/padding을 써서 전체 가로 폭과 타이틀 위치가 제각각이었습니다.
               좌우 여백 없이(guide-page-container와 동일) 본문 폭을 통일합니다. */
            max-width: 1100px;
            width: 100%;
            margin: 0 auto;
            padding: 0 0 56px;
            font-family: "Noto Sans KR", sans-serif;
            color: #334155;
            box-sizing: border-box;
          }

          .base-card {
            position: relative;
            background-color: #fff;
            border-radius: 24px;
            box-shadow: 0 16px 36px -18px rgba(15, 23, 42, 0.16);
            border: 1px solid #eef0f5;
            overflow: hidden;
            width: 100%;
            box-sizing: border-box;
          }
          .standard-card { position: relative; overflow: hidden; }
          .standard-card-icon {
            width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center; color: #fff;
            margin-bottom: 16px;
          }
          .standard-card-icon.dark { color: #1c1a16; background: linear-gradient(135deg, #f5c451 0%, #c98f14 100%); box-shadow: 0 8px 16px -6px rgba(201, 143, 20, 0.6); }
          .standard-card-icon.accent { background: linear-gradient(135deg, #d0591a 0%, #a4440f 100%); box-shadow: 0 8px 16px -6px rgba(164, 68, 15, 0.45); }
          .standard-card.dark-tone::before {
            content: '';
            position: absolute; right: -60px; top: -90px; width: 200px; height: 200px;
            background: radial-gradient(circle, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0) 70%);
            border-radius: 50%;
          }
          .standard-card.accent-tone { border: 1px solid #f6dcc8; background: linear-gradient(135deg, #fff6ef 0%, #ffffff 70%); }
          .standard-card.accent-tone::before {
            content: '';
            position: absolute; left: 0; top: 0; bottom: 0; width: 5px;
            background: linear-gradient(180deg, #d0591a 0%, #a4440f 100%);
          }

          .tab-menu-wrap {
            display: flex; gap: 4px; margin-bottom: 20px; width: 100%;
            padding: 5px; background: #f1f3f6; border: 1px solid #e8ebf0; border-radius: 16px; box-sizing: border-box;
          }
          .tab-btn {
            flex: 1; padding: 15px 10px; border-radius: 12px; font-weight: 800; font-size: 16px;
            cursor: pointer; border: none; background: transparent; color: #64748b;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex; align-items: center; justify-content: center; gap: 8px;
          }
          .tab-btn { color: #4b5563; font-family: inherit; }
          .tab-btn:hover:not(.active) { color: #111827; background: rgba(255,255,255,0.6); }
          .tab-btn.active {
            background: #ffffff;
            color: #b04a12;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 6px 14px rgba(15, 23, 42, 0.08);
          }
          .tab-btn.active .tab-icon { color: #d0591a; }
          .tab-icon { display: flex; align-items: center; font-size: 19px; line-height: 1; }

          .customs-table th {
            background: #f8f9fb;
            border-bottom: 1px solid #eceef3;
            font-weight: 800; letter-spacing: 0.06em; font-size: 12.5px; color: #4b5563 !important;
          }
          .customs-table tbody tr { transition: background-color 0.15s ease; }
          .customs-table tbody tr:hover { background-color: #fbfbfe; }
          .tariff-chip {
            display: inline-block; padding: 3px 10px; border-radius: 999px;
            background: #fff6ef; border: 1px solid #f6dcc8;
            color: #b04a12; font-weight: 800;
          }

          /* 🌟 하단 안내 카드는 app/guide/components/GuideFooterNotice.tsx로 공용화했습니다. */

          /* 📱 모바일 레이아웃 버그 수정 */
          @media (max-width: 768px) {
            .customs-container {
              /* 🌟 85% 제거, width 100%로 컨텐츠를 레이아웃 중앙에 꽉 차게 배치 */
              max-width: 100% !important;
              width: 100% !important;
              /* currentMenu(고정 바)와 콘텐츠 사이 여백 제거 */
              padding: 0 0 10px 0 !important;
              margin: 0 auto !important;
            }

            .tab-menu-wrap {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 8px !important;
              margin-bottom: 20px !important;
              width: 100% !important;
            }

            .tab-btn {
              padding: 12px 8px !important;
              font-size: 13px !important;
              border-radius: 10px !important;
              white-space: nowrap !important; 
              flex: none !important;
            }
            .tab-icon { font-size: 17px !important; }

            .grid-2col { grid-template-columns: 1fr !important; gap: 12px !important; width: 100% !important; }
            .standard-card { padding: 20px !important; width: 100% !important; box-sizing: border-box !important; }
            .standard-card h4 { font-size: 17px !important; }
            .standard-card p, .standard-card div { font-size: 14px !important; }

            .table-wrap { width: 100% !important; box-sizing: border-box !important; }
            .table-wrap th { padding: 10px 4px !important; font-size: 11px !important; }
            .table-wrap td { padding: 10px 4px !important; font-size: 11px !important; }
            /* 🌟 첫 번째 열(수입 품목)은 왼쪽 정렬 텍스트라 여백을 더 줘서 부가세 열과 균형을 맞춤 */
            .table-wrap th:first-child { padding-left: 14px !important; }
            .table-wrap td:first-child { padding-left: 14px !important; }
          }
        `}</style>

        {/* 🌟 새로 추가된 큰 제목 영역 (membership/shipping-fee 페이지와 동일한 위치/스타일) */}
        {/* 🌟 요약 카드 + 제목 — mypage/wishlist 와 같은 구성 (카드가 제목 위) */}
        <GuidePremiumHero
          ariaLabel="관부가세 요약"
          eyebrow="CUSTOMS & TAX"
          title={<>해외직구 <em>관부가세</em>, 미리 확인하세요</>}
          desc="과세 기준과 품목별 관세율을 한눈에 볼 수 있어요. 실제 세액은 통관 시점의 기준에 따라 달라질 수 있습니다."
          icon={<Scales weight="duotone" />}
          feature={{
            label: <><i className="fa fa-landmark"></i> 면세 기준</>,
            value: '$150',
            sub: '이하 면세',
            actions: [
              { href: '/purchase/quote', label: <><i className="fa fa-file-lines"></i> 견적 문의</>, primary: true },
              { href: '/guide/shipping-fee', label: <><i className="fa fa-plane"></i> 국제배송 요금표</> },
            ],
          }}
          stats={[
            { label: '부가세', value: '10%' },
            { label: '품목 분류', value: `${taxCategories.length}개` },
            { label: '수수료 안내', value: <>보러가기 <i className="fa fa-arrow-right"></i></>, text: true, href: '/guide/fee-guide' },
            { label: '구매대행 방법', value: <>보러가기 <i className="fa fa-arrow-right"></i></>, text: true, href: '/guide/purchase-method' },
          ]}
        />

        <GuideTitle eyebrow="Customs & Tax" title="예상 관부과세 안내" icon="fa-landmark" />

        <div className="guide-panel">

        {/* 1. 과세기준 핵심 카드 */}
        <div className="animate-2 grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
          <div className="base-card standard-card dark-tone" style={{ padding: '30px', background: 'linear-gradient(135deg, #232a3b 0%, #171c28 60%, #1b1a24 100%)', color: '#fff' }}>
            <div className="standard-card-icon dark"><Lightbulb size={20} weight="fill" /></div>
            <h4 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '15px', color: '#f5c451' }}>과세 표준 가격</h4>
            <p style={{ fontSize: '16px', color: '#cbd5e1', margin: 0 }}>[물품값 + 현지운임 + 세금]</p>
          </div>
          <div className="base-card standard-card accent-tone" style={{ padding: '30px' }}>
            <div className="standard-card-icon accent"><ChartBar size={20} weight="fill" /></div>
            <h4 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '15px', color: '#0f172a' }}>면세 기준</h4>
            <div style={{ fontSize: '16px', color: '#475569' }}>결제액 <strong style={{ color: '#b04a12', fontSize: '22px' }}>$150 이하</strong> 면세</div>
          </div>
        </div>

        {/* 2. 품목별 관세율 */}
        <div className="animate-4" style={{ marginBottom: '40px' }}>
          <div className="gp-section-head">
            <div>
              <span className="gp-eyebrow">Tariff Rate</span>
              <h3 className="gp-section-title">품목별 관세율</h3>
            </div>
          </div>
          <div className="tab-menu-wrap">
            {taxCategories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveTab(cat.name)}
                className={`tab-btn ${activeTab === cat.name ? 'active' : ''}`}
              >
                <span className="tab-icon">{cat.icon}</span> {cat.name}
              </button>
            ))}
          </div>

          <div className="base-card table-wrap">
            <table className="customs-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '15px', textAlign: 'left', paddingLeft: '20px', color: '#64748b' }}>수입 품목</th>
                  <th style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>관세</th>
                  <th style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>부가세</th>
                </tr>
              </thead>
              <tbody>
                {taxCategories.find(c => c.name === activeTab)?.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 20px', fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{item.name}</td>
                    <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center' }}><span className="tariff-chip">{item.tariff}</span></td>
                    <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center', color: '#0f172a', fontWeight: '700' }}>{item.vat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
        <GuideFooterNotice
          className="animate-6"
          variant="premium"
          title="실제 세액은 통관 시점의 기준에 따라 달라질 수 있어요"
          meta={<><Clock size={12} weight="bold" /> 10:00 ~ 19:00<span className="gp-help-pro-meta-days">평일 (토·일·공휴일 휴무)</span></>}
        >
          정확한 확인은 <span className="footer-info-link">1:1 상담</span>을 통해 문의주세요.
        </GuideFooterNotice>

        </div>
      </div>
    </GuideLayout>
  );
}