"use client";
import React from 'react';
import GuideLayout from '../../components/GuideLayout';
import '../guide-common.css';
import { Package, MagnifyingGlass } from '@phosphor-icons/react';
import GuideFooterNotice from '../components/GuideFooterNotice';

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
               1100px + 좌우 24px로 4개 페이지 모두 통일합니다. */
            max-width: 1100px;
            margin: 0 auto;
            padding: 0 24px 56px;
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
          .section-title span {
            width: 8px; height: 28px; border-radius: 4px;
            background: linear-gradient(180deg, #ff7a59 0%, #ea580c 100%);
            box-shadow: 0 4px 10px -2px rgba(234, 88, 12, 0.5);
          }

          .base-card {
            position: relative;
            background-color: #fff;
            border-radius: 24px;
            border: 1px solid #eef0f5;
            overflow: hidden;
            box-shadow: 0 16px 36px -18px rgba(15, 23, 42, 0.16);
          }

          .type-block {
            border-radius: 16px;
            padding: 16px;
            margin: -16px;
            transition: background-color 0.2s ease;
          }
          .type-block:hover { background-color: #f8fafc; }

          .fee-card {
            background-color: #fff; padding: 30px; border-radius: 24px;
            border: 1px solid #eef0f5; box-shadow: 0 12px 28px -16px rgba(15, 23, 42, 0.14);
            transition: transform 0.25s ease, box-shadow 0.25s ease;
          }
          .fee-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -16px rgba(15, 23, 42, 0.2); }

          .fee-card-icon {
            width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center; color: #fff;
          }
          .fee-card-icon.orange { background: linear-gradient(135deg, #ff7a59 0%, #ea580c 100%); box-shadow: 0 8px 16px -6px rgba(234, 88, 12, 0.5); }
          .fee-card-icon.blue { background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%); box-shadow: 0 8px 16px -6px rgba(37, 99, 235, 0.5); }

          .fee-row {
            display: flex; justify-content: space-between; align-items: center;
            padding: 10px 12px; border-radius: 12px; margin-bottom: 6px;
            transition: background-color 0.2s ease;
          }
          .fee-row:hover { background-color: #f8fafc; }
          .fee-row.highlight { background: linear-gradient(135deg, #fff7ed 0%, #ffece0 100%); }

          .inspection-free-box {
            background: linear-gradient(135deg, #fffbeb 0%, #fff3d6 100%);
            border: 1px solid #fde68a;
            padding: 16px; border-radius: 16px;
          }
          .inspection-paid-box {
            border: 1px solid #eef0f5; padding: 16px; border-radius: 16px;
            transition: border-color 0.2s ease, background-color 0.2s ease;
          }
          .inspection-paid-box:hover { border-color: #cbd5e1; background-color: #f8fafc; }

          .total-care-box { position: relative; overflow: hidden; }
          .total-care-box::before {
            content: '';
            position: absolute; right: -100px; top: -120px; width: 280px; height: 280px;
            border: 1px solid rgba(255,75,43,0.2); border-radius: 50%;
            box-shadow: 0 0 0 30px rgba(255,75,43,0.03), 0 0 0 60px rgba(255,75,43,0.02);
          }
          .total-care-box::after {
            content: '';
            position: absolute; left: -80px; bottom: -100px; width: 220px; height: 220px;
            background: radial-gradient(circle, rgba(56,189,248,0.1) 0%, rgba(56,189,248,0) 70%);
            border-radius: 50%;
          }
          .total-care-box > * { position: relative; z-index: 2; }

          .care-item { transition: transform 0.2s ease, box-shadow 0.2s ease; }
          .care-item:hover { transform: translateY(-4px); }
          .care-item.accent { background: linear-gradient(135deg, #ff7a59 0%, #ea580c 100%) !important; box-shadow: 0 14px 28px -10px rgba(234, 88, 12, 0.5); }

          /* 🌟 하단 안내 카드는 app/guide/components/GuideFooterNotice.tsx로 공용화했습니다. */

          /* 📱 모바일 대응 (768px 이하) */
          @media (max-width: 768px) {
            /* 🌟 currentMenu(고정 바)와 콘텐츠 사이 여백 제거 */
            .fee-guide-container { padding: 0 10px 10px 10px; }

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
          }
        `}</style>

        {/* 🌟 새로 추가된 큰 제목 영역 (membership 페이지와 동일한 위치/스타일) */}
        <h2 className="guide-title">수수료 안내 <span className="guide-title-icon"><i className="fa fa-coins"></i></span></h2>

        <div className="guide-panel">

        {/* 2. 기본 서비스 체계 */}
        <div className="animate-2" style={{ marginBottom: '80px' }}>
          <h3 className="section-title"><span></span>기본 서비스 체계</h3>
          <div className="base-card">
            <div className="service-row" style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
              <div className="service-label" style={{ width: '200px', backgroundColor: '#f8fafc', padding: '40px 20px', textAlign: 'center', fontWeight: '900', color: '#1e293b', fontSize: '17px' }}>서비스 유형</div>
              <div className="service-content" style={{ flex: 1, padding: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                <div className="type-block">
                  <div style={{ color: '#ff4b2b', fontWeight: '900', fontSize: '13px', marginBottom: '10px' }}>TYPE A</div>
                  <h4 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '10px' }}>구매대행</h4>
                  <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>결제부터 배송까지 미쿠짱이 전담하는 서비스입니다.</p>
                </div>
                <div className="type-block">
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
          <div className="fee-card">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '19px', fontWeight: '900', marginBottom: '25px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
              <span className="fee-card-icon orange"><Package size={20} weight="fill" /></span>
              구매/배송 수수료
            </h4>
            {[
              { label: '일반 웹사이트 주문', price: '¥ 100' },
              { label: '프리마켓(메르카리) 주문', price: '¥ 100' },
              { label: '야후 입찰 및 경매', price: '¥ 200' },
              { label: '배송대행 수수료', price: '¥ 200', highlight: true },
            ].map((item, i) => (
              <div key={i} className={`fee-row ${item.highlight ? 'highlight' : ''}`}>
                <span style={{ fontSize: '15px', fontWeight: '700', color: item.highlight ? '#ea580c' : '#475569' }}>{item.label}</span>
                <span style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>{item.price}</span>
              </div>
            ))}
          </div>

          <div className="fee-card">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '19px', fontWeight: '900', marginBottom: '25px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
              <span className="fee-card-icon blue"><MagnifyingGlass size={20} weight="bold" /></span>
              검수 서비스
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="inspection-free-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontWeight: '900', fontSize: '16px' }}>기본 검수</span>
                  <span style={{ color: '#ea580c', fontWeight: '900' }}>FREE</span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>무게 측정 및 주문서 대조 (개봉 안함)</p>
              </div>
              <div className="inspection-paid-box">
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
        <div className="animate-4 total-care-box" style={{ background: 'linear-gradient(145deg, #111827 0%, #0f172a 100%)', borderRadius: '40px', padding: '60px', color: '#fff', marginBottom: '100px', textAlign: 'center' }}>
          <h4 style={{ fontSize: '30px', fontWeight: '900', marginBottom: '10px' }}>안전 배송 관리 토탈 케어</h4>
          <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '40px' }}>포장재, 박스 패킹, 세관 신고 대행 포함 필수 비용</p>
          
          <div className="total-care-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
            {[
              { size: 'SMALL', limit: '59cm 이하', price: '¥ 200' },
              { size: 'MEDIUM', limit: '60~70cm', price: '¥ 300' },
              { size: 'LARGE', limit: '71~95cm', price: '¥ 400' },
              { size: 'SPECIAL', limit: '10kg+', price: '¥ 700~', accent: true },
            ].map((box, i) => (
              <div key={i} className={`care-item ${box.accent ? 'accent' : ''}`} style={{
                backgroundColor: box.accent ? undefined : 'rgba(255,255,255,0.05)',
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
        <GuideFooterNotice className="animate-5">
          모든 수수료는 이용 시점의 환율이 적용됩니다.<br />
          궁금하신 점은 <span className="footer-info-link">카카오톡 채널</span>로 문의해 주세요.
        </GuideFooterNotice>

        </div>
      </div>
    </GuideLayout>
  );
}