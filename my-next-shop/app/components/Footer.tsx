"use client";
import React from 'react';
import Link from 'next/link';

const SERVICE_LINKS = [
  { href: '/purchase/request', label: '구매대행 신청' },
  { href: '/delivery/request', label: '배송대행 신청' },
  { href: '/purchase/quote', label: '견적 문의' },
  { href: '/mypage/money/charge', label: '미쿠짱머니 충전' },
  { href: '/mypage/status', label: '주문 진행 현황' },
];

const SUPPORT_LINKS = [
  { href: '/guide/purchase-method', label: '이용가이드' },
  { href: '/guide/fee-guide', label: '수수료 안내' },
  { href: '/guide/shipping-fee', label: '국제배송 요금표' },
  { href: '/guide/customs', label: '관부가세 안내' },
  { href: '/inquiry/faq', label: '자주하는 질문' },
];

export default function Footer() {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <>
      <style jsx>{`
        /* 🌟 1. 깊이감 있는 프리미엄 다크 배경 (마이페이지·가이드 상단 카드와 같은 네이비 톤) */
        .footer-wrapper {
          position: relative;
          overflow: hidden;
          margin-top: 40px;
          background:
            radial-gradient(560px 360px at 8% 0%, rgba(222, 128, 136, 0.18) 0%, rgba(222, 128, 136, 0) 65%),
            radial-gradient(480px 320px at 100% 100%, rgba(240, 138, 68, 0.1) 0%, rgba(240, 138, 68, 0) 65%),
            linear-gradient(180deg, #1c2130 0%, #14171f 100%);
          color: #aeb4c2;
          font-family: 'Pretendard', "Noto Sans KR", -apple-system, sans-serif;
          padding-top: 56px;
        }
        .footer-wrapper::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, rgba(222, 128, 136, 0) 0%, #de8088 20%, #c0606a 50%, #de8088 80%, rgba(222, 128, 136, 0) 100%);
        }

        .container { max-width: 1280px; margin: 0 auto; padding: 0 24px; }

        /* 🌟 2. 상단: 브랜드 / 서비스 / 고객지원 / 상담 카드 */
        .footer-top {
          display: grid;
          grid-template-columns: minmax(260px, 1.35fr) minmax(150px, 0.8fr) minmax(150px, 0.8fr) minmax(260px, 1.1fr);
          gap: 40px;
          align-items: start;
          padding-bottom: 40px;
        }

        .brand-lockup { display: flex; align-items: center; gap: 12px; }
        .brand-logo {
          width: 56px; height: 56px; border-radius: 18px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: #ffffff;
          box-shadow: 0 14px 28px -14px rgba(222, 128, 136, 0.7);
        }
        .brand-logo :global(img) { height: 44px; width: auto; object-fit: contain; }
        .brand-name { font-family: "Jua", sans-serif; font-size: 26px; color: #ffffff; line-height: 1; letter-spacing: 1px; }
        .brand-sub { display: block; margin-top: 5px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.18em; color: #f0b2b7; }

        .brand-tagline { margin: 18px 0 0; font-size: 14px; line-height: 1.75; color: #c3c8d4; letter-spacing: -0.2px; word-break: keep-all; }
        .brand-points { list-style: none; margin: 16px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
        .brand-points li {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 11px; border-radius: 999px;
          font-size: 12px; font-weight: 700; color: #e3e6ee;
          background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .brand-points li :global(i) { font-size: 11px; color: #f0b2b7; }

        .col-title {
          margin: 0 0 16px;
          font-size: 11px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
          color: #f0b2b7;
        }
        .link-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
        .link-list :global(a) {
          display: inline-flex; align-items: center; gap: 7px;
          color: #c3c8d4; font-size: 14px; font-weight: 600; text-decoration: none;
          letter-spacing: -0.2px; transition: color 0.2s ease, transform 0.2s ease;
        }
        .link-list :global(a)::before {
          content: ''; width: 4px; height: 4px; border-radius: 50%;
          background: rgba(255, 255, 255, 0.25); transition: background 0.2s ease;
        }
        .link-list :global(a:hover) { color: #ffffff; transform: translateX(2px); }
        .link-list :global(a:hover)::before { background: #de8088; }

        /* 상담 카드 */
        .contact-card {
          position: relative; overflow: hidden;
          padding: 20px 20px 18px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .contact-card::before {
          content: ''; position: absolute; right: -50px; top: -60px; width: 180px; height: 180px; border-radius: 50%;
          background: radial-gradient(circle, rgba(254, 229, 0, 0.16) 0%, rgba(254, 229, 0, 0) 70%);
          pointer-events: none;
        }
        .contact-head { position: relative; display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .contact-icon {
          width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: #fee500; box-shadow: 0 10px 20px -12px rgba(254, 229, 0, 0.9);
        }
        .contact-title { margin: 0; font-size: 15px; font-weight: 800; color: #ffffff; }
        .contact-desc { margin: 0; font-size: 12.5px; color: #aeb4c2; }
        .contact-btn {
          position: relative;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; height: 44px; border-radius: 13px;
          background: #fee500; color: #191600;
          font-size: 14px; font-weight: 800; text-decoration: none;
          transition: transform 0.2s ease, filter 0.2s ease;
        }
        .contact-btn:hover { transform: translateY(-2px); filter: brightness(1.03); }
        .contact-hours {
          position: relative;
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          margin: 12px 0 0; font-size: 12px; color: #aeb4c2;
        }
        .contact-hours :global(strong) { color: #ffffff; font-weight: 800; }
        .contact-dot {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11.5px; font-weight: 800; color: #7fd3a6;
        }
        .contact-dot::before {
          content: ''; width: 7px; height: 7px; border-radius: 50%; background: #34c77b;
          box-shadow: 0 0 0 0 rgba(52, 199, 123, 0.6);
          animation: footerPulse 1.8s ease-out infinite;
        }
        @keyframes footerPulse {
          0% { box-shadow: 0 0 0 0 rgba(52, 199, 123, 0.5); }
          70% { box-shadow: 0 0 0 7px rgba(52, 199, 123, 0); }
          100% { box-shadow: 0 0 0 0 rgba(52, 199, 123, 0); }
        }

        /* 🌟 3. 법인 정보 카드 */
        .office-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 14px;
          padding: 32px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .office-card {
          padding: 20px 22px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .office-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .office-flag {
          width: 34px; height: 34px; border-radius: 11px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; color: #ffffff;
          background: linear-gradient(135deg, #de8088 0%, #a94a53 100%);
          box-shadow: 0 8px 16px -8px rgba(222, 128, 136, 0.7);
        }
        .office-flag.jp { background: linear-gradient(135deg, #4b5568 0%, #262d3c 100%); box-shadow: 0 8px 16px -8px rgba(15, 18, 30, 0.6); }
        .office-title { margin: 0; font-size: 14px; font-weight: 800; color: #ffffff; letter-spacing: -0.2px; }
        .office-sub { display: block; font-size: 10.5px; font-weight: 800; letter-spacing: 0.16em; color: #8b93a5; }

        .info-list { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
        .info-list.single { grid-template-columns: 1fr; }
        .info-row { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
        .info-row.wide { grid-column: 1 / -1; }
        .info-row :global(dt) { flex: 0 0 74px; font-size: 12px; font-weight: 700; color: #8b93a5; letter-spacing: -0.2px; }
        .info-row :global(dd) { margin: 0; flex: 1; min-width: 0; font-size: 13.5px; line-height: 1.55; color: #e3e6ee; letter-spacing: -0.2px; word-break: keep-all; }
        .info-row :global(dd a) { color: inherit; text-decoration: none; }
        .info-row :global(dd a:hover) { color: #ffffff; text-decoration: underline; text-underline-offset: 3px; }

        /* 🌟 4. 하단 바 */
        .footer-extra {
          padding: 20px 0 calc(28px + env(safe-area-inset-bottom));
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex; justify-content: space-between; align-items: center;
          flex-wrap: wrap; gap: 14px 20px;
        }
        .footer-legal { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 16px; font-size: 12.5px; color: #8b93a5; }
        .footer-legal :global(strong) { color: #e3e6ee; font-weight: 700; }
        .footer-legal :global(a) { color: #aeb4c2; font-weight: 600; text-decoration: none; transition: color 0.2s; }
        .footer-legal :global(a.highlight) { color: #f3b7bc; }
        .footer-legal :global(a:hover) { color: #ffffff; }
        .legal-sep { width: 1px; height: 11px; background: rgba(255, 255, 255, 0.16); }
        .legal-links { display: inline-flex; align-items: center; gap: 12px; white-space: nowrap; }

        .footer-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .badge {
          display: inline-flex; align-items: center; gap: 7px;
          height: 36px; padding: 0 14px; border-radius: 999px;
          background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.09);
          font-size: 12.5px; color: #c3c8d4; font-weight: 700; letter-spacing: -0.2px;
          transition: all 0.25s ease; cursor: default;
        }
        .badge:hover { background: rgba(255, 255, 255, 0.08); color: #ffffff; border-color: rgba(255, 255, 255, 0.18); }
        .badge :global(i) { font-size: 12px; color: #f0b2b7; }
        .toss-logo { color: #7fb4ff; font-weight: 900; font-style: italic; letter-spacing: -0.5px; }
        .to-top {
          width: 36px; height: 36px; border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.12); background: rgba(255, 255, 255, 0.05);
          color: #e3e6ee; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
          font-size: 12px; transition: all 0.2s ease;
        }
        .to-top:hover { background: #de8088; border-color: #de8088; color: #ffffff; transform: translateY(-2px); }

        /* 📱 5. 반응형 */
        @media (max-width: 1100px) {
          .footer-top { grid-template-columns: 1fr 1fr; gap: 32px; }
          .brand-col { grid-column: 1 / -1; }
          .office-grid { grid-template-columns: 1fr; }
        }
        /* 🌟 홈(app/page)에서는 하단 정보 섹션(입금 계좌 등)이 Footer 에 바로 이어지도록 위 여백을 없앱니다.
           layout.tsx 에서 홈의 <main> 만 .main-extra-gap 클래스가 없고, Footer 는 그 바로 다음 형제입니다. */
        :global(main:not(.main-extra-gap)) + .footer-wrapper { margin-top: 0 !important; }
        @media (max-width: 768px) {
          .footer-wrapper { padding-top: 40px; margin-top: 24px; }
          .container { padding: 0 18px; }
          .footer-top { grid-template-columns: 1fr 1fr; gap: 26px 18px; padding-bottom: 28px; }
          .contact-col { grid-column: 1 / -1; }
          .brand-name { font-size: 23px; }
          .brand-tagline { margin-top: 14px; font-size: 13.5px; }
          .office-grid { padding: 24px 0; gap: 10px; }
          .office-card { padding: 16px; }
          .info-list { grid-template-columns: 1fr; gap: 7px; }
          .info-row :global(dt) { flex-basis: 70px; }
          .info-row :global(dd) { font-size: 13px; }
          .footer-extra { flex-direction: column-reverse; align-items: flex-start; gap: 16px; }
          .footer-right { width: 100%; }
          .to-top { margin-left: auto; }
          .legal-sep-first { display: none; }
          .footer-legal { flex-direction: column; align-items: flex-start; gap: 8px; }
        }
        @media (max-width: 420px) {
          .footer-top { gap: 24px 12px; }
          .brand-col, .contact-col { grid-column: 1 / -1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .contact-dot::before { animation: none; }
        }
      `}</style>

      <footer className="footer-wrapper">
        <div className="container footer-top">
          {/* 브랜드 */}
          <div className="brand-col">
            <div className="brand-lockup">
              <span className="brand-logo">
                <img src="/images/logo.png" alt="미쿠짱" />
              </span>
              <span>
                <span className="brand-name">미쿠짱</span>
                <span className="brand-sub">JAPAN SHOPPING PARTNER</span>
              </span>
            </div>
            <p className="brand-tagline">
              일본 구매·배송대행, 미쿠짱과 함께 14년.<br />
              라쿠텐·메루카리·야후부터 소규모 쇼핑몰까지 안전하게 받아보세요.
            </p>
            <ul className="brand-points">
              <li><i className="fa fa-shield-halved"></i>14년 노하우</li>
              <li><i className="fa fa-plane"></i>항공 · EMS · 해운</li>
              <li><i className="fa fa-comment-dots"></i>실시간 상담</li>
            </ul>
          </div>

          {/* 서비스 */}
          <nav aria-label="서비스 바로가기">
            <h3 className="col-title">Service</h3>
            <ul className="link-list">
              {SERVICE_LINKS.map(l => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}
            </ul>
          </nav>

          {/* 고객지원 */}
          <nav aria-label="고객지원 바로가기">
            <h3 className="col-title">Support</h3>
            <ul className="link-list">
              {SUPPORT_LINKS.map(l => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}
            </ul>
          </nav>

          {/* 상담 카드 */}
          <div className="contact-col">
            <div className="contact-card">
              <div className="contact-head">
                <span className="contact-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#191600" d="M12 3.5C6.75 3.5 2.5 6.86 2.5 11c0 2.64 1.75 4.96 4.4 6.3-.19.7-.7 2.56-.8 2.96-.13.5.18.49.38.36.16-.1 2.5-1.7 3.52-2.4.63.09 1.28.14 1.95.14 5.25 0 9.5-3.36 9.5-7.5s-4.19-7.36-9.45-7.36z" />
                  </svg>
                </span>
                <div>
                  <h3 className="contact-title">무엇이든 물어보세요</h3>
                  <p className="contact-desc">카카오톡 채널로 빠르게 답해 드려요</p>
                </div>
              </div>
              <Link href="/inquiry/kakaotalk" className="contact-btn">
                카카오톡 상담하기 <i className="fa fa-arrow-right" style={{ fontSize: 12 }}></i>
              </Link>
              <p className="contact-hours">
                <span>상담시간 <strong>10:00 ~ 24:00</strong> · 연중무휴</span>
                <span className="contact-dot">상담 가능</span>
              </p>
            </div>
          </div>
        </div>

        {/* 법인 정보 */}
        <div className="container">
          <div className="office-grid">
            <section className="office-card">
              <div className="office-head">
                <span className="office-flag" aria-hidden="true"><i className="fa fa-building"></i></span>
                <div>
                  <span className="office-sub">KOREA OFFICE</span>
                  <h3 className="office-title">한국 사무소</h3>
                </div>
              </div>
              <dl className="info-list">
                <div className="info-row"><dt>상호</dt><dd>미쿠짱</dd></div>
                <div className="info-row"><dt>대표</dt><dd>임성민</dd></div>
                <div className="info-row"><dt>전화번호</dt><dd><a href="tel:070-4845-3023">070-4845-3023</a></dd></div>
                <div className="info-row"><dt>이메일</dt><dd><a href="mailto:company_ss@naver.com">company_ss@naver.com</a></dd></div>
                <div className="info-row wide"><dt>주소</dt><dd>서울특별시 은평구 진흥로 13가길 23-3 102호</dd></div>
                <div className="info-row"><dt>통신판매업</dt><dd>2026-서울은평-0719</dd></div>
                <div className="info-row"><dt>사업자번호</dt><dd>599-26-00188</dd></div>
              </dl>
            </section>

            <section className="office-card">
              <div className="office-head">
                <span className="office-flag jp" aria-hidden="true"><i className="fa fa-warehouse"></i></span>
                <div>
                  <span className="office-sub">JAPAN OFFICE</span>
                  <h3 className="office-title">일본 사무소 · 물류센터</h3>
                </div>
              </div>
              <dl className="info-list single">
                <div className="info-row"><dt>상호</dt><dd>(株)ASOBIBA (アソビバ)</dd></div>
                <div className="info-row"><dt>주소</dt><dd>〒123-0865 東京都足立区新田3-35-31 1008号</dd></div>
              </dl>
            </section>
          </div>
        </div>

        {/* 하단 바 */}
        <div className="container">
          <div className="footer-extra">
            <div className="footer-legal">
              <span>© 2026 <strong>미쿠짱</strong>. All rights reserved.</span>
              <span className="legal-sep legal-sep-first" aria-hidden="true" />
              <span className="legal-links">
                <Link href="/guide/terms">이용약관</Link>
                <span className="legal-sep" aria-hidden="true" />
                <Link href="/guide/privacy" className="highlight">개인정보처리방침</Link>
              </span>
            </div>

            <div className="footer-right">
              <div className="badge"><i className="fa fa-landmark"></i>공정거래위원회</div>
              <div className="badge"><span className="toss-logo">toss</span> payments</div>
              <button type="button" className="to-top" onClick={scrollTop} aria-label="맨 위로">
                <i className="fa fa-arrow-up"></i>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
