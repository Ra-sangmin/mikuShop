"use client";
import React from 'react';
import GuideLayout from '../../components/GuideLayout';
import '../guide-common.css';
import { Package, MagnifyingGlass, ShoppingCartSimple, Truck, Receipt as ReceiptIcon, Camera, ShieldCheck, Cube, FileText, Clock } from '@phosphor-icons/react';
import GuideFooterNotice from '../components/GuideFooterNotice';
import GuidePremiumHero from '../components/GuidePremiumHero';
import GuideTitle from '../components/GuideTitle';
import { Receipt } from '@phosphor-icons/react';

export default function FeeGuidePage() {
  return (
    <GuideLayout title="수수료 안내" type="fee">
      <div className="fee-guide-container">
        
        {/* 🌟 전역 애니메이션 및 반응형 CSS 정의 */}
        <style jsx global>{`
          /* 🌟 @keyframes fadeInUp / .animate-1~5는 customs 페이지와 공통이라
             ../guide-common.css로 옮겼습니다. */

          .fee-guide-container {
            /* 🌟 guide/membership, fee-guide, shipping-fee, customs 4개 페이지가 서로 다른
               max-width/padding을 써서 전체 가로 폭과 타이틀 위치가 제각각이었습니다.
               좌우 여백 없이(guide-page-container와 동일) 본문 폭을 통일합니다. */
            max-width: 1100px;
            margin: 0 auto;
            padding: 0 0 56px;
            font-family: 'Pretendard', sans-serif;
            color: #334155;
          }

          /* ============================================================
             🌟 수수료 안내 (프리미엄 리디자인)
             ============================================================ */
          /* 1) 기본 서비스 체계: 서비스 유형 카드 2장 + 수수료 정책 띠 */
          .fg-type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 14px; }
          .fg-type-card {
            --fg-color: #d0591a; --fg-deep: #a4440f; --fg-soft: rgba(208,89,26,0.12);
            position: relative; overflow: hidden; isolation: isolate;
            padding: 26px 26px 22px; border-radius: 22px;
            background: linear-gradient(180deg, #ffffff 0%, #fbfbfd 100%);
            border: 1px solid #e9edf3;
            box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 18px 40px -26px rgba(15,23,42,0.28);
            transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease;
          }
          .fg-type-card.is-b { --fg-color: #2c5fb3; --fg-deep: #1e3f80; --fg-soft: rgba(44,95,179,0.12); }
          .fg-type-card:hover { transform: translateY(-4px); box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 28px 50px -28px rgba(15,23,42,0.35); }
          .fg-type-card::before {
            content: ''; position: absolute; inset: 0 0 auto; height: 3px;
            background: linear-gradient(90deg, transparent, var(--fg-color) 30%, var(--fg-color) 70%, transparent);
          }
          .fg-type-card::after {
            content: ''; position: absolute; right: -60px; top: -70px; width: 220px; height: 220px; z-index: -1;
            background: radial-gradient(closest-side, var(--fg-soft) 0%, rgba(255,255,255,0) 100%);
          }
          .fg-type-top { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
          .fg-type-icon {
            width: 52px; height: 52px; border-radius: 16px; flex-shrink: 0; color: #fff;
            display: flex; align-items: center; justify-content: center; font-size: 24px;
            background: linear-gradient(135deg, var(--fg-color) 0%, var(--fg-deep) 100%);
            box-shadow: 0 12px 22px -10px var(--fg-color), inset 0 1px 0 rgba(255,255,255,0.35);
          }
          .fg-type-eyebrow { display: block; font-size: 11px; font-weight: 800; letter-spacing: 0.18em; color: var(--fg-color); margin-bottom: 3px; }
          .fg-type-title { margin: 0; font-size: 21px; font-weight: 900; color: #0f172a; letter-spacing: -0.3px; }
          .fg-type-desc { margin: 0 0 16px; font-size: 14.5px; line-height: 1.6; color: #64748b; word-break: keep-all; }
          .fg-type-fee {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 8px 12px 8px 10px; border-radius: 999px;
            background: #f8f9fb; border: 1px solid #e9edf3;
            font-size: 12.5px; font-weight: 700; color: #475569;
          }
          .fg-type-fee b { font-size: 15px; font-weight: 900; color: #0f172a; font-variant-numeric: tabular-nums; }
          .fg-type-fee i { width: 6px; height: 6px; border-radius: 50%; background: var(--fg-color); box-shadow: 0 0 0 3px var(--fg-soft); }

          .fg-policy {
            display: flex; align-items: center; gap: 14px;
            padding: 16px 20px; border-radius: 18px;
            background: linear-gradient(135deg, #fffaf3 0%, #fff4e6 100%);
            border: 1px solid #f6dcc8;
          }
          .fg-policy-icon {
            width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; color: #b04a12; font-size: 20px;
            display: flex; align-items: center; justify-content: center;
            background: #fff; border: 1px solid #f6dcc8; box-shadow: 0 6px 14px -8px rgba(176,74,18,0.4);
          }
          .fg-policy-text { margin: 0; font-size: 15px; font-weight: 600; color: #475569; word-break: keep-all; line-height: 1.55; }
          .fg-policy-text strong { color: #0f172a; font-weight: 900; box-shadow: inset 0 -8px 0 rgba(245,196,81,0.45); }
          .fg-policy-tag { margin-left: auto; white-space: nowrap; font-size: 11px; font-weight: 800; letter-spacing: 0.12em; color: #b04a12; }

          /* 2) 수수료 카드 2장 */
          .fee-card {
            position: relative; overflow: hidden;
            background: linear-gradient(180deg, #ffffff 0%, #fbfbfd 100%); padding: 26px 26px 22px; border-radius: 22px;
            border: 1px solid #e9edf3; box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 18px 40px -26px rgba(15,23,42,0.28);
            transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease;
          }
          .fee-card:hover { transform: translateY(-4px); box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 28px 50px -28px rgba(15,23,42,0.35); }
          .fee-card-head { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; padding-bottom: 16px; border-bottom: 1px solid #eef1f5; }
          .fee-card-head-text { display: flex; flex-direction: column; }
          .fee-card-eyebrow { font-size: 10.5px; font-weight: 800; letter-spacing: 0.18em; color: #94a3b8; }
          .fee-card-title { margin: 0; font-size: 18px; font-weight: 900; color: #0f172a; letter-spacing: -0.3px; }
          .fee-card-icon {
            width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center; color: #fff;
          }
          .fee-card-icon.orange { background: linear-gradient(135deg, #d0591a 0%, #a4440f 100%); box-shadow: 0 10px 18px -8px rgba(164, 68, 15, 0.6), inset 0 1px 0 rgba(255,255,255,0.3); }
          .fee-card-icon.blue { background: linear-gradient(135deg, #4f86d9 0%, #2c5fb3 100%); box-shadow: 0 10px 18px -8px rgba(37, 99, 235, 0.6), inset 0 1px 0 rgba(255,255,255,0.3); }

          .fee-list { display: flex; flex-direction: column; gap: 4px; }
          .fee-row {
            display: flex; align-items: center; gap: 10px;
            padding: 11px 12px; border-radius: 12px; border: 1px solid transparent;
            transition: background-color 0.2s ease, border-color 0.2s ease;
          }
          .fee-row:hover { background-color: #f8f9fb; }
          .fee-row-label { font-size: 14.5px; font-weight: 700; color: #374151; white-space: nowrap; }
          .fee-row-leader { flex: 1; height: 0; border-top: 2px dotted #dfe4ec; margin: 0 2px; }
          .fee-row-price { font-size: 19px; font-weight: 900; color: #0f172a; font-variant-numeric: tabular-nums; white-space: nowrap; }
          .fee-row-price small { font-size: 12px; font-weight: 700; color: #94a3b8; margin-right: 2px; }
          .fee-row.highlight { background: linear-gradient(135deg, #fff7ef 0%, #fff1e2 100%); border-color: #f6dcc8; }
          .fee-row.highlight .fee-row-label { color: #b04a12; }
          .fee-row.highlight .fee-row-leader { border-color: #f0cfb3; }
          .fee-row.highlight .fee-row-price { color: #b04a12; }
          .fee-row.highlight .fee-row-price small { color: #d19a6a; }

          .inspection-free-box, .inspection-paid-box {
            position: relative; display: flex; align-items: center; gap: 14px;
            padding: 16px; border-radius: 16px;
            transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
          }
          .inspection-free-box {
            background: linear-gradient(135deg, #fffbeb 0%, #fff3d6 100%);
            border: 1px solid #fde68a;
          }
          .inspection-paid-box { border: 1px solid #e9edf3; background: #fff; }
          .inspection-paid-box:hover { border-color: #cbd5e1; background-color: #f8fafc; }
          .insp-icon {
            width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; font-size: 20px;
            display: flex; align-items: center; justify-content: center;
          }
          .inspection-free-box .insp-icon { color: #b45309; background: #fff; border: 1px solid #fde68a; box-shadow: 0 6px 14px -8px rgba(180,83,9,0.4); }
          .inspection-paid-box .insp-icon { color: #2c5fb3; background: #eef4ff; border: 1px solid #dbe6fb; }
          .insp-text { flex: 1; min-width: 0; }
          .insp-title { display: block; font-size: 15.5px; font-weight: 900; color: #0f172a; margin-bottom: 3px; }
          .insp-desc { margin: 0; font-size: 13px; color: #64748b; word-break: keep-all; }
          .insp-price { font-size: 19px; font-weight: 900; color: #0f172a; white-space: nowrap; font-variant-numeric: tabular-nums; }
          .insp-price small { font-size: 12px; font-weight: 700; color: #94a3b8; margin-right: 2px; }

          /* 3) 토탈 케어 다크 박스 */
          .total-care-box {
            position: relative; overflow: hidden; isolation: isolate;
            background:
              radial-gradient(70% 90% at 100% 0%, rgba(240,138,68,0.26) 0%, rgba(240,138,68,0) 60%),
              radial-gradient(60% 80% at 0% 100%, rgba(56,189,248,0.2) 0%, rgba(56,189,248,0) 60%),
              linear-gradient(160deg, #0f172a 0%, #111a2f 55%, #0b1220 100%) !important;
            border: 1px solid rgba(255,255,255,0.08);
            box-shadow: 0 1px 2px rgba(15,23,42,0.2), 0 34px 64px -32px rgba(15,23,42,0.75);
          }
          /* 은은한 도트 패턴 */
          .total-care-box::after {
            content: ''; position: absolute; inset: 0; z-index: 0; pointer-events: none;
            background-image: radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px);
            background-size: 18px 18px;
            -webkit-mask-image: radial-gradient(70% 60% at 50% 0%, #000 0%, transparent 100%);
            mask-image: radial-gradient(70% 60% at 50% 0%, #000 0%, transparent 100%);
          }
          .total-care-box::before {
            content: '';
            position: absolute; right: -110px; top: -130px; width: 300px; height: 300px; z-index: 0;
            border: 1px solid rgba(240,138,68,0.28); border-radius: 50%;
            box-shadow: 0 0 0 32px rgba(240,138,68,0.05), 0 0 0 64px rgba(240,138,68,0.03);
          }
          .total-care-box > * { position: relative; z-index: 2; }
          .total-care-title { font-size: 30px; font-weight: 900; margin: 0 0 10px; letter-spacing: -0.6px; color: #fff; }
          .total-care-title em {
            font-style: normal;
            background: linear-gradient(135deg, #ffb27a 0%, #f08a44 55%, #fde68a 100%);
            -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
          }
          .total-care-sub { color: #aeb6c6; font-size: 15px; margin: 0 0 18px; }
          .total-care-includes { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; margin: 0 0 32px; padding: 0; list-style: none; }
          .total-care-includes li {
            display: inline-flex; align-items: center; gap: 7px;
            padding: 7px 14px 7px 10px; border-radius: 999px;
            background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
            font-size: 13px; font-weight: 700; color: #e2e8f0;
          }
          .total-care-includes li svg { color: #f7a86b; font-size: 16px; }

          .care-item {
            position: relative; overflow: hidden;
            display: flex; flex-direction: column; align-items: center;
            padding: 22px 14px 18px; border-radius: 20px;
            background: linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%);
            border: 1px solid rgba(255,255,255,0.1);
            backdrop-filter: blur(6px);
            transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease, border-color 0.3s ease;
          }
          .care-item::before {
            content: ''; position: absolute; inset: 0 0 auto; height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          }
          .care-item:hover { transform: translateY(-5px); border-color: rgba(247,168,107,0.45); box-shadow: 0 20px 36px -22px rgba(240,138,68,0.55); }
          .care-box-icon {
            display: flex; align-items: flex-end; justify-content: center;
            height: 44px; margin-bottom: 10px; color: #cbd5e1;
          }
          .care-box-icon svg { filter: drop-shadow(0 6px 10px rgba(0,0,0,0.35)); }
          .care-size { display: block; font-size: 11px; font-weight: 900; letter-spacing: 0.22em; color: #94a3b8; }
          .care-price { font-size: 32px; font-weight: 900; margin: 6px 0 12px; letter-spacing: -0.6px; color: #fff; font-variant-numeric: tabular-nums; line-height: 1.1; }
          .care-price small { font-size: 15px; font-weight: 800; color: #94a3b8; margin-right: 2px; }
          .care-meter { width: 100%; max-width: 120px; height: 4px; border-radius: 999px; background: rgba(255,255,255,0.1); overflow: hidden; margin-bottom: 9px; }
          .care-meter span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #7dd3fc, #38bdf8); }
          .care-limit { display: block; font-size: 12px; font-weight: 700; color: #aeb4c2; }
          .care-tag {
            position: absolute; top: 12px; right: 12px;
            padding: 3px 8px; border-radius: 999px;
            background: rgba(255,255,255,0.22); border: 1px solid rgba(255,255,255,0.35);
            font-size: 9px; font-weight: 900; letter-spacing: 0.12em; color: #fff;
          }
          .care-item.accent {
            background:
              radial-gradient(90% 70% at 50% 0%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 60%),
              linear-gradient(145deg, #f07a2e 0%, #d0591a 50%, #9a3d0c 100%) !important;
            border-color: rgba(255,255,255,0.22);
            box-shadow: 0 22px 40px -18px rgba(226,102,31,0.75), inset 0 1px 0 rgba(255,255,255,0.3);
          }
          .care-item.accent:hover { border-color: rgba(255,255,255,0.4); box-shadow: 0 28px 48px -20px rgba(226,102,31,0.85), inset 0 1px 0 rgba(255,255,255,0.3); }
          .care-item.accent::before { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent); }
          .care-item.accent .care-box-icon { color: #fff; }
          .care-item.accent .care-meter { background: rgba(255,255,255,0.22); }
          .care-item.accent .care-meter span { background: linear-gradient(90deg, #fde68a, #ffffff); }
          .care-item.accent .care-size, .care-item.accent .care-limit, .care-item.accent .care-price small { color: rgba(255,255,255,0.88); }

          /* 🌟 하단 안내 카드는 app/guide/components/GuideFooterNotice.tsx로 공용화했습니다. */

          /* 📱 모바일 대응 (768px 이하) */
          @media (max-width: 768px) {
            /* 🌟 currentMenu(고정 바)와 콘텐츠 사이 여백 제거 */
            .fee-guide-container { padding: 0 0 10px; }

            /* 기본 서비스 체계: 카드 1열 */
            .fg-type-grid { grid-template-columns: 1fr; gap: 12px; }
            .fg-type-card { padding: 20px 18px 18px; border-radius: 18px; }
            .fg-type-icon { width: 46px; height: 46px; border-radius: 14px; font-size: 22px; }
            .fg-type-title { font-size: 19px; }
            .fg-policy { padding: 14px 16px; border-radius: 16px; flex-wrap: wrap; }
            .fg-policy-text { font-size: 14px; }
            .fg-policy-tag { display: none; }
            .fee-card { padding: 20px 18px 18px; border-radius: 18px; }
            .fee-row-label { font-size: 14px; white-space: normal; }
            .fee-row-price { font-size: 18px; }
            .insp-price { font-size: 17px; }

            /* 수수료 카드: 1열 배치 */
            .fee-card-grid { grid-template-columns: 1fr !important; gap: 14px !important; margin-bottom: 36px !important; }

            /* 배송 케어 어두운 박스 */
            .total-care-box { padding: 30px 18px !important; border-radius: 22px !important; margin-bottom: 36px !important; }
            .total-care-box h4 { font-size: 22px !important; }
            .total-care-includes { margin-bottom: 22px; gap: 6px; }
            .total-care-includes li { font-size: 12px; padding: 6px 11px 6px 8px; }
            .care-box-icon { height: 36px; margin-bottom: 6px; }
            .care-tag { top: 8px; right: 8px; font-size: 8px; padding: 2px 6px; }
            .total-care-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
            .care-item { padding: 20px 10px 16px !important; }
            .care-price { font-size: 24px; }
          }
        `}</style>

        {/* 🌟 새로 추가된 큰 제목 영역 (membership 페이지와 동일한 위치/스타일) */}
        {/* 🌟 요약 카드 + 제목 — mypage/wishlist 와 같은 구성 (카드가 제목 위) */}
        <GuidePremiumHero
          ariaLabel="수수료 요약"
          eyebrow="SERVICE FEE"
          title={<>모든 수수료는 <em>주문서 1건당</em> 한 번만</>}
          desc="상품 개수와 상관없이 주문서 기준으로 부과되는 투명한 수수료 체계입니다."
          icon={<Receipt weight="duotone" />}
          feature={{
            label: <><i className="fa fa-coins"></i> 구매 수수료</>,
            value: '¥100~',
            sub: '주문서 1건당',
            actions: [
              { href: '/purchase/request', label: <><i className="fa fa-cart-shopping"></i> 구매대행 신청</>, primary: true },
              { href: '/purchase/quote', label: <><i className="fa fa-file-lines"></i> 견적 문의</> },
            ],
          }}
          stats={[
            { label: '배송대행 수수료', value: '¥200' },
            { label: '기본 검수', value: '무료', text: true },
            { label: '회원 등급 혜택', value: <>보러가기 <i className="fa fa-arrow-right"></i></>, text: true, href: '/guide/membership' },
            { label: '국제배송 요금표', value: <>보러가기 <i className="fa fa-arrow-right"></i></>, text: true, href: '/guide/shipping-fee' },
          ]}
        />

        <GuideTitle eyebrow="Service Fee" title="수수료 안내" icon="fa-coins" />

        <div className="guide-panel">

        {/* 2. 기본 서비스 체계 */}
        <div className="animate-2" style={{ marginBottom: '44px' }}>
          <div className="gp-section-head">
            <div>
              <span className="gp-eyebrow">Service</span>
              <h3 className="gp-section-title">기본 서비스 체계</h3>
              <p className="gp-section-sub">두 가지 서비스 유형과 수수료 부과 기준을 안내해 드려요.</p>
            </div>
          </div>

          <div className="fg-type-grid">
            <div className="fg-type-card is-a">
              <div className="fg-type-top">
                <span className="fg-type-icon" aria-hidden="true"><ShoppingCartSimple weight="fill" /></span>
                <div>
                  <span className="fg-type-eyebrow">TYPE A</span>
                  <h4 className="fg-type-title">구매대행</h4>
                </div>
              </div>
              <p className="fg-type-desc">결제부터 배송까지 미쿠짱이 전담하는 서비스입니다.</p>
              <span className="fg-type-fee"><i aria-hidden="true"></i>주문서 1건당 <b>¥100~</b></span>
            </div>
            <div className="fg-type-card is-b">
              <div className="fg-type-top">
                <span className="fg-type-icon" aria-hidden="true"><Truck weight="fill" /></span>
                <div>
                  <span className="fg-type-eyebrow">TYPE B</span>
                  <h4 className="fg-type-title">배송대행</h4>
                </div>
              </div>
              <p className="fg-type-desc">직접 구매하신 물품을 안전하게 한국으로 보내드립니다.</p>
              <span className="fg-type-fee"><i aria-hidden="true"></i>주문서 1건당 <b>¥200</b></span>
            </div>
          </div>

          <div className="fg-policy">
            <span className="fg-policy-icon" aria-hidden="true"><ReceiptIcon weight="fill" /></span>
            <p className="fg-policy-text">모든 수수료는 <strong>주문서 1건당 발생</strong>하며, 상품 개수와 상관없이 경제적입니다.</p>
            <span className="fg-policy-tag">FEE POLICY</span>
          </div>
        </div>

        {/* 3. 수수료 카드 섹션 */}
        <div className="animate-3 fee-card-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '44px' }}>
          <div className="fee-card">
            <div className="fee-card-head">
              <span className="fee-card-icon orange"><Package size={20} weight="fill" /></span>
              <div className="fee-card-head-text">
                <span className="fee-card-eyebrow">SERVICE FEE</span>
                <h4 className="fee-card-title">구매/배송 수수료</h4>
              </div>
            </div>
            <div className="fee-list">
              {[
                { label: '일반 웹사이트 주문', price: '100' },
                { label: '프리마켓(메르카리) 주문', price: '100' },
                { label: '야후 입찰 및 경매', price: '200' },
                { label: '배송대행 수수료', price: '200', highlight: true },
              ].map((item, i) => (
                <div key={i} className={`fee-row ${item.highlight ? 'highlight' : ''}`}>
                  <span className="fee-row-label">{item.label}</span>
                  <span className="fee-row-leader" aria-hidden="true"></span>
                  <span className="fee-row-price"><small>¥</small>{item.price}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="fee-card">
            <div className="fee-card-head">
              <span className="fee-card-icon blue"><MagnifyingGlass size={20} weight="bold" /></span>
              <div className="fee-card-head-text">
                <span className="fee-card-eyebrow">INSPECTION</span>
                <h4 className="fee-card-title">검수 서비스</h4>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="inspection-free-box">
                <span className="insp-icon" aria-hidden="true"><ShieldCheck weight="fill" /></span>
                <div className="insp-text">
                  <span className="insp-title">기본 검수</span>
                  <p className="insp-desc">무게 측정 및 주문서 대조 (개봉 안함)</p>
                </div>
                <span className="gp-chip is-green">FREE</span>
              </div>
              <div className="inspection-paid-box">
                <span className="insp-icon" aria-hidden="true"><Camera weight="fill" /></span>
                <div className="insp-text">
                  <span className="insp-title">정밀 사진 검수</span>
                  <p className="insp-desc">개봉 후 상태 확인 및 사진 3매 제공</p>
                </div>
                <span className="insp-price"><small>¥</small>200</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. 배송 관리 수수료 */}
        <div className="animate-4 total-care-box" style={{ borderRadius: '28px', padding: '48px 44px', color: '#fff', marginBottom: '44px', textAlign: 'center' }}>
          <span className="gp-hero-eyebrow">TOTAL CARE</span>
          <h4 className="total-care-title">안전 배송 관리 <em>토탈 케어</em></h4>
          <p className="total-care-sub">포장재, 박스 패킹, 세관 신고 대행 포함 필수 비용</p>
          <ul className="total-care-includes">
            <li><Package weight="fill" />포장재</li>
            <li><Cube weight="fill" />박스 패킹</li>
            <li><FileText weight="fill" />세관 신고 대행</li>
          </ul>

          <div className="total-care-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
            {[
              { size: 'SMALL', limit: '59cm 이하', price: '200', icon: 22, meter: 25 },
              { size: 'MEDIUM', limit: '60~70cm', price: '300', icon: 28, meter: 50 },
              { size: 'LARGE', limit: '71~95cm', price: '400', icon: 34, meter: 75 },
              { size: 'SPECIAL', limit: '10kg+', price: '700~', icon: 40, meter: 100, accent: true },
            ].map((box, i) => (
              <div key={i} className={`care-item ${box.accent ? 'accent' : ''}`}>
                {box.accent && <span className="care-tag">HEAVY</span>}
                <span className="care-box-icon" aria-hidden="true">
                  {box.accent ? <Truck size={box.icon} weight="fill" /> : <Cube size={box.icon} weight="duotone" />}
                </span>
                <span className="care-size">{box.size}</span>
                <div className="care-price"><small>¥</small>{box.price}</div>
                <span className="care-meter" aria-hidden="true"><span style={{ width: `${box.meter}%` }} /></span>
                <span className="care-limit">{box.limit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Footer Info */}
        <GuideFooterNotice
          className="animate-5"
          variant="premium"
          title="모든 수수료는 이용 시점의 환율이 적용됩니다"
          meta={<><Clock size={12} weight="bold" /> 10:00 ~ 19:00<span className="gp-help-pro-meta-days">평일 (토·일·공휴일 휴무)</span></>}
        >
          궁금하신 점은 <span className="footer-info-link">카카오톡 채널</span>로 편하게 문의해 주세요.
        </GuideFooterNotice>

        </div>
      </div>
    </GuideLayout>
  );
}