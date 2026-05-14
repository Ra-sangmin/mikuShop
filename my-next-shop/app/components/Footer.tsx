"use client";
import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <>
      <style jsx>{`
        .footer-wrapper {
          background-color: #0a0a0a;
          color: #94a3b8;
          font-size: 15px; 
          font-family: 'Pretendard', -apple-system, sans-serif;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* 상단 메뉴 영역 */
        .footer-top {
          border-bottom: 1px solid #1e293b;
          padding: 30px 0;
        }
        .top-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap; 
        }
        
        .menu-links {
          display: flex;
          gap: 32px;
          flex-wrap: wrap;
        }
        .menu-links a {
          color: #f1f5f9;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s ease;
          font-size: 16px;
          white-space: nowrap; /* 🌟 추가: 글자 중간에 강제로 줄이 바뀌는 것을 완벽 방지 */
          word-break: keep-all; /* 🌟 추가: 단어 단위 유지 보장 */
        }
        .menu-links a:hover {
          color: #ff4b2b;
        }

        .partner-logos {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
        }

        /* 하단 정보 영역 */
        .footer-bottom {
          padding: 70px 0 90px 0;
          line-height: 1.9;
        }

        .footer-bottom .container {
          display: flex;
          justify-content: space-between; 
          align-items: flex-start;
          gap: 40px;
          flex-wrap: wrap;
        }

        .info-group {
          flex: 0 1 45%; 
          min-width: 320px;
        }

        /* 법인 타이틀 스타일 */
        .corporate-title {
          display: inline-block; 
          color: #f8fafc;
          font-weight: 800;
          font-size: 18px;
          margin-bottom: 24px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          position: relative;
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
          margin: 0 0 8px 0;
          font-weight: 400;
          color: #cbd5e1;
          font-size: 15.5px;
          transition: color 0.3s;
        }

        .info-content p:hover {
          color: #ffffff;
        }

        /* 하단 카피라이트 영역 */
        .footer-extra {
          margin-top: 70px;
          padding-top: 30px;
          border-top: 1px solid #1e293b;
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          font-size: 14px;
          color: #475569;
        }

        @media (max-width: 768px) {
          .footer-bottom .container {
            flex-direction: column;
            gap: 45px;
          }
          .top-flex {
            flex-direction: column;
            align-items: flex-start;
            gap: 20px;
          }
          .menu-links {
            gap: 20px;
          }
          .footer-extra {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
        }
      `}</style>

      <footer className="footer-wrapper">
        <div className="footer-top">
          <div className="container top-flex">
            <div className="menu-links">
              <Link href="#">회사소개</Link>
              <Link href="#">이용약관</Link>
              <Link href="#">개인정보처리방침</Link>
              <Link href="#">고객센터</Link>
            </div>
            <div className="partner-logos">
              <span>공정거래위원회</span>
              <span style={{ color: '#334155' }}>|</span>
              <span>TOSS PAYMENTS</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="container">
            {/* 한국 법인 영역 */}
            <div className="info-group">
              <span className="corporate-title">KOREA OFFICE</span>
              <div className="info-content">
                <p>상호 : 미쿠짱</p>
                <p>대표 : 임성민 | 사업자번호 : 599-26-00188</p>
                <p>이메일 : company_ss@naver.com</p>
                <p>주소 : 서울특별시 은평구 진흥로 13가길 23-3 102호</p>
              </div>
            </div>

            {/* 일본 법인 영역 */}
            <div className="info-group">
              <span className="corporate-title">JAPAN OFFICE</span>
              <div className="info-content">
                <p>상호 : (株)ASOBIBA (アソビバ)</p>
                <p>주소 : 〒123-0865 東京都足立区新田3-35-31</p>
              </div>
            </div>
          </div>

          <div className="container">
            <div className="footer-extra">
              <p>© 2026 <strong>jinsight</strong>. All rights reserved.</p>
              <p>Designed for premium shopping experience.</p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}