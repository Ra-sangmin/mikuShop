"use client";
import React from 'react';

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
          /* 🌟 위쪽 여백(padding-top) 대폭 축소 (80px -> 50px) */
          padding-top: 50px; 
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

        /* 🌟 2. 메인 정보 영역 */
        .footer-main {
          /* 🌟 아래쪽 여백(padding-bottom) 대폭 축소 (70px -> 40px) */
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
          /* 🌟 타이틀 아래 여백 축소 (24px -> 18px) */
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
          /* 🌟 글자 중간(50%)부터 자연스럽게 사라지는 그라데이션 */
          background: linear-gradient(to right, #ff4b2b 0%, #ff4b2b 50%, transparent 100%);
          border-radius: 2px;
        }

        /* 본문 정보 스타일 */
        .info-content p {
          /* 🌟 정보 간의 줄 간격 살짝 축소 (12px -> 8px) */
          margin: 0 0 8px 0; 
          font-weight: 400;
          color: #cbd5e1; 
          font-size: 16px; 
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

        /* 🌟 3. 하단 카피라이트 & 파트너 뱃지 영역 */
        .footer-extra {
          /* 🌟 상하 여백 축소 (30px 0 40px 0 -> 24px 0 32px 0) */
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
          font-size: 15px;
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

        /* 📱 4. 반응형 (모바일) */
        @media (max-width: 768px) {
          .footer-wrapper {
            /* 🌟 모바일 상단 여백 축소 */
            padding-top: 40px;
          }
          .footer-main .container {
            flex-direction: column;
            gap: 32px; /* 🌟 모바일 법인 정보 사이 간격 축소 */
          }
          .footer-extra {
            flex-direction: column-reverse;
            align-items: flex-start;
            gap: 20px; /* 🌟 모바일 뱃지와 카피라이트 사이 간격 축소 */
          }
        }
      `}</style>

      <footer className="footer-wrapper">
        <div className="footer-main">
          <div className="container">
            {/* 한국 법인 영역 */}
            <div className="info-group">
              <span className="corporate-title">Korea Office</span>
              <div className="info-content">
                <p><strong>상호</strong> 미쿠짱</p>
                <p><strong>대표</strong> 임성민 <span style={{ margin: '0 10px', color: '#64748b' }}>|</span> <strong>사업자번호</strong> 599-26-00188</p>
                <p><strong>이메일</strong> company_ss@naver.com</p>
                <p><strong>주소</strong> 서울특별시 은평구 진흥로 13가길 23-3 102호</p>
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