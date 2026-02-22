// src/components/Footer.tsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer-container">
      {/* 상단 메뉴 바 */}
      <div className="footer-top-menu">
        <div className="container flex justify-between items-center">
          <div className="menu-links">
            <Link href="#">회사소개</Link>
            <Link href="#">사이트이용약관</Link>
            <Link href="#">개인정보 보호정책</Link>
            <Link href="#">고객센터</Link>
          </div>
          <div className="partner-logos">
            {/* 공정거래위원회 & Toss Payments 로고 영역 */}
            <span className="logo-text">공정거래위원회</span>
            <span className="divider">|</span>
            <span className="logo-text toss">toss payments</span>
          </div>
        </div>
      </div>

      {/* 하단 상세 정보 영역 */}
      <div className="footer-bottom-info">
        <div className="container">
          <div className="business-info">
            <p>
              회사명 : 주식회사 띵크밤 | 대표 : 이계민 | 주소 : 경기도 안양시 동안구 시민대로 266 | 메일 : nalinapr@naver.com
            </p>
            <p>
              개인정보관리책임자 : 민병권 | 사업자등록번호 : 138-81-57281 | 통신판매업신고번호 : 제2010-경기안양-386호
            </p>
          </div>

          <div className="warehouse-info mt-4">
            <p>일본동경 물류센터 주소 : 〒124-0002 東京都葛飾区西亀有2-52-3</p>
            <p>일본오사카 물류센터 주소 : 〒544-0013 大阪市生野区巽中1-12-24</p>
          </div>

          <div className="copyright mt-6">
            <p>Copyright (C) 2018. <strong>jinsight</strong>. All rights reserved. Hosting by Off.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}