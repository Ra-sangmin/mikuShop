"use client";
import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <>
      <style jsx>{`
        /* 🌟 1. 깊이감 있는 프리미엄 다크 배경 */
        .footer-wrapper {
          background: linear-gradient(180deg, #111827 0%, #030712 100%);
          color: #94a3b8;
          font-family: 'Pretendard', -apple-system, sans-serif;
          position: relative;
          overflow: hidden;
          padding-top: 24px; 
        }

        .footer-wrapper::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(210, 115, 119, 0.5), transparent);
        }

        .container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* 🌟 2. 상단 정책/가이드 링크 영역 (구조 안정화) */
        .footer-top {
          padding-bottom: 20px;
          margin-bottom: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .policy-links {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
        }
        
        .policy-links a {
          color: #8492a6; 
          font-size: 14px; 
          font-weight: 500;
          text-decoration: none;
          transition: color 0.2s ease;
          word-break: keep-all;
          letter-spacing: -0.3px;
        }
        
        .policy-links a.highlight {
          color: #cbd5e1;
          font-weight: 700;
        }
        
        .policy-links a:hover {
          color: #ffffff;
        }

        /* 🌟 충돌 없는 안전하고 세련된 텍스트 구분선 */
        .policy-divider {
          color: rgba(255, 255, 255, 0.15); /* 은은하고 고급스러운 투명도 */
          font-size: 12px;
          margin: 0 16px; /* 완벽하게 보장되는 좌우 여백 */
          font-weight: 300;
        }

        /* 🌟 3. 메인 정보 영역 */
        .footer-main {
          padding-bottom: 20px;
        }

        .footer-main .container {
          display: flex;
          justify-content: space-between; 
          align-items: flex-start;
          gap: 50px;
          flex-wrap: wrap;
        }

        .info-group {
          flex: 0 1 45%; 
          min-width: 320px;
        }

        /* 법인 타이틀 */
        .corporate-title {
          display: inline-block; 
          color: #ffffff;
          font-weight: 800;
          font-size: 16px; 
          margin-bottom: 18px;
          letter-spacing: 2px;
          text-transform: uppercase;
          padding-bottom: 8px;
        }

        .corporate-title::after {
          content: '';
          display: block;
          width: 100%; 
          height: 3px;
          margin-top: 10px;
          background: linear-gradient(to right, #ff4b2b 0%, #ff4b2b 50%, transparent 100%);
          border-radius: 2px;
        }

        /* 본문 정보 스타일 */
        .info-content p {
          margin: 0 0 8px 0; 
          font-weight: 400;
          color: #cbd5e1; 
          font-size: 15px; 
          line-height: 1.7; 
          transition: color 0.3s;
          word-break: keep-all;
        }
        .info-content p strong {
          color: #ffffff; 
          font-weight: 700;
          margin-right: 8px;
        }
        .info-content p:hover {
          color: #ffffff;
        }
        
        .info-divider {
          margin: 0 10px;
          color: #64748b;
        }

        /* 🌟 4. 하단 카피라이트 & 파트너 뱃지 영역 */
        .footer-extra {
          padding: 24px 0 32px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          flex-wrap: wrap;
          gap: 24px;
        }

        .copyright-box {
          font-size: 14px;
          color: #94a3b8;
          font-weight: 400;
          line-height: 1.6;
          letter-spacing: 0px;
        }
        .copyright-box strong {
          color: #e2e8f0;
          font-weight: 700;
        }

        /* 파트너 뱃지 스타일 */
        .partner-badges {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px; 
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08); 
          font-size: 14px; 
          color: #94a3b8; 
          font-weight: 600;
          letter-spacing: 0.3px;
          transition: all 0.3s ease;
          cursor: default;
        }
        .badge:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #f8fafc;
          border-color: rgba(255, 255, 255, 0.2);
        }
        .badge-icon {
          font-size: 14px;
          opacity: 0.7; 
        }
        .toss-logo {
          color: #60a5fa; 
          font-weight: 800;
          font-style: italic;
          letter-spacing: -0.5px;
          margin-right: 2px;
        }

        /* 📱 5. 반응형 (모바일) */
        @media (max-width: 768px) {
          .footer-wrapper {
            padding-top: 24px;
          }
          .footer-top {
            margin-bottom: 20px;
          }
          .policy-links a {
            font-size: 13px;
          }
          .policy-divider {
            margin: 0 10px;
          }
          .footer-main .container {
            flex-direction: column;
            gap: 32px; 
          }
          
          /* 🌟 핵심 해결: 모바일에서는 각 정보들을 줄바꿈하여 세로로 깔끔하게 나열 */
          .mobile-block {
            display: block;
            margin-bottom: 4px;
          }
          /* 모바일에서는 구분선 숨김 */
          .info-divider {
            display: none;
          }

          .footer-extra {
            flex-direction: column-reverse;
            align-items: flex-start;
            gap: 20px;
          }
        }
      `}</style>

      <footer className="footer-wrapper">
        
        {/* 상단 정책 링크 영역 */}
        <div className="footer-top">
          <div className="container">
            <div className="policy-links">
              <Link href="/guide/purchase-method">이용가이드</Link>
              <span className="policy-divider">|</span>
              <Link href="/guide/terms">이용약관</Link>
              <span className="policy-divider">|</span>
              <Link href="/guide/privacy" className="highlight">개인정보처리방침</Link>
            </div>
          </div>
        </div>

        <div className="footer-main">
          <div className="container">
            {/* 한국 법인 영역 */}
            <div className="info-group">
              <span className="corporate-title">Korea Office</span>
              <div className="info-content">
                {/* 🌟 모바일 대응: 각각의 요소를 span으로 감싸고 className="mobile-block" 부여 */}
                <p>
                  <span className="mobile-block"><strong>상호</strong> 미쿠짱 <span className="info-divider">|</span></span>
                  <span className="mobile-block"><strong>대표</strong> 임성민 <span className="info-divider">|</span></span>
                  <span className="mobile-block"><strong>전화번호</strong> 070-4845-3023</span>
                </p>
                <p><strong>이메일</strong> company_ss@naver.com</p>
                <p><strong>주소</strong> 서울특별시 은평구 진흥로 13가길 23-3 102호</p>
                <p><strong>통신판매번호</strong> 1234-서울은평-56789</p>
                <p><strong>사업자번호</strong> 599-26-00188</p>
              </div>
            </div>

            {/* 일본 법인 영역 */}
            <div className="info-group">
              <span className="corporate-title">Japan Office</span>
              <div className="info-content">
                <p><strong>상호</strong> (株)ASOBIBA (アソビバ)</p>
                <p><strong>주소</strong> 〒123-0865 東京都足立区新田3-35-31</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container">
          <div className="footer-extra">
            {/* 왼쪽 카피라이트 */}
            <div className="copyright-box">
              <p>© 2026 <strong>jinsight</strong>. All rights reserved.</p>
              <p>Designed for premium shopping experience.</p>
            </div>

            {/* 오른쪽 캡슐형 파트너 뱃지 */}
            <div className="partner-badges">
              <div className="badge">
                <span className="badge-icon">🏛️</span> 공정거래위원회
              </div>
              <div className="badge toss-badge">
                <span className="toss-logo">toss</span> payments
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}