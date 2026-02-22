import Link from 'next/link';

export default function Header() {
  return (
    <header className="ji-header">
      {/* 최상단 바 */}
      <div className="top-bar">
        <div className="container">
          <div className="top-left">
            <Link href="#">번역기 사용방법</Link>
            <Link href="#">언론보도</Link>
          </div>
          <div className="top-right">
            <Link href="#">로그인</Link>
            <Link href="#">회원가입</Link>
            <Link href="#" className="bold">마이페이지</Link>
            <Link href="#">고객센터</Link>
            <Link href="#" className="btn-bid">입찰 후 메뉴얼</Link>
          </div>
        </div>
      </div>

      {/* 메인 헤더 (로고 및 검색) */}
      <div className="main-header">
        <div className="container">
          <div className="logo">
          <Link href="/">
            <img 
              src="./images/logo.jpg" 
              alt="Japan Insight" 
              style={{ marginRight: '20px', verticalAlign: 'middle' }} // 이미지 오른쪽에 10px 여백
            />
            <span className="logo-text" style={{ verticalAlign: 'middle' }}>
              미쿠짱 쇼핑몰
            </span>
          </Link>
        </div>

          <div className="search-area">
            <div className="search-box">
              <select>
                <option>야후옥션</option>
              </select>
              <input type="text" placeholder="검색어를 입력하세요 (한글가능)" />
              <button className="search-icon">🔍</button>
            </div>
          </div>
        </div>
      </div>

      {/* 내비게이션 바 */}
      <nav className="nav-bar">
        <div className="container">
          <ul className="nav-links">
            <li>
              <Link href="/yahoo"><span className="icon">🔨</span> 야후옥션</Link>
            </li>
            <li>
              <Link href="/rakuten"><span className="icon">R</span> 라쿠텐</Link>
            </li>
            <li>
              <Link href="/"><span className="icon">J</span> 할인몰</Link>
            </li>
            <li>
              <Link href="/"><span className="icon">Y</span> 야후쇼핑</Link>
            </li>
            <li>
              <Link href="/"><span className="icon">m</span> 메루카리</Link>
            </li>
            <li>
              <Link href="/"><span className="icon">a</span> 아마존</Link>
            </li>
          </ul>
          <div className="nav-right">
            <Link href="#" className="btn-apply">📄 구매신청서 작성</Link>
            <Link href="#" className="btn-mypage">👤 마이페이지</Link>
          </div>
        </div>
      </nav>
    </header>
  );
}