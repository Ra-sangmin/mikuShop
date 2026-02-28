"use client";
import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <>
      <style jsx>{`
        .footer-wrapper {
          background-color: #111; /* 🌟 바탕색 검은색으로 변경 */
          color: #94a3b8; /* 🌟 일반 텍스트를 밝은 회색으로 변경 */
          font-size: 14px;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        /* 상단 메뉴 영역 */
        .footer-top {
          border-bottom: 1px solid #333; /* 🌟 테두리 선을 어두운 색으로 변경 */
          padding: 20px 0;
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
          gap: 25px;
          flex-wrap: wrap; 
        }
        .menu-links a {
          color: #f8fafc; /* 🌟 링크 텍스트를 흰색에 가깝게 변경 */
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s;
        }
        .menu-links a:hover {
          color: #ff4b2b; /* 호버 시 포인트 색상(오렌지/레드) 유지 */
        }

        .partner-logos {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          color: #64748b; /* 🌟 로고 텍스트 색상 조정 */
          font-weight: bold;
        }

        /* 하단 정보 영역 */
        .footer-bottom {
          padding: 40px 0 60px 0;
          line-height: 1.7;
        }
        .info-group {
          margin-bottom: 15px;
          word-break: keep-all; 
        }
        .copyright {
          margin-top: 30px;
          color: #64748b; /* 🌟 카피라이트 색상 조정 */
          font-size: 13px;
        }
        .copyright strong {
          color: #cbd5e1;
        }

        /* -------------------------------------------
           📱 모바일 레이아웃 조정 (768px 이하 스마트폰) 
           ------------------------------------------- */
        @media (max-width: 768px) {
          .top-flex {
            flex-direction: column; 
            align-items: flex-start;
          }
          .menu-links {
            gap: 15px;
            font-size: 13px;
          }
          .partner-logos {
            width: 100%;
            padding-top: 10px;
          }

          .footer-bottom {
            padding: 30px 0 40px 0;
            font-size: 13px; 
          }
          .info-group p {
            margin-bottom: 8px; 
          }
        }
      `}</style>

      <footer className="footer-wrapper">
        {/* 상단 메뉴 바 */}
        <div className="footer-top">
          <div className="container top-flex">
            <div className="menu-links">
              <Link href="#">회사소개</Link>
              <Link href="#">사이트이용약관</Link>
              <Link href="#">개인정보 보호정책</Link>
              <Link href="#">고객센터</Link>
            </div>
            <div className="partner-logos">
              {/* 공정거래위원회 & Toss Payments 로고 영역 */}
              <span className="logo-text">공정거래위원회</span>
              <span style={{ color: '#475569' }}>|</span>
              <span className="logo-text">toss payments</span>
            </div>
          </div>
        </div>

        {/* 하단 상세 정보 영역 */}
        <div className="footer-bottom">
          <div className="container">
            <div className="info-group">
              <p>
                회사명 : 주식회사 띵크밤 | 대표 : 이계민 | 주소 : 경기도 안양시 동안구 시민대로 266 | 메일 : nalinapr@naver.com
              </p>
              <p>
                개인정보관리책임자 : 민병권 | 사업자등록번호 : 138-81-57281 | 통신판매업신고번호 : 제2010-경기안양-386호
              </p>
            </div>

            <div className="info-group">
              <p>일본동경 물류센터 주소 : 〒124-0002 東京都葛飾区西亀有2-52-3</p>
              <p>일본오사카 물류센터 주소 : 〒544-0013 大阪市生野区巽中1-12-24</p>
            </div>

            <div className="copyright">
              <p>Copyright (C) 2018. <strong>jinsight</strong>. All rights reserved. Hosting by Off.</p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}