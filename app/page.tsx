// src/app/page.tsx
import Image from 'next/image';

export default function HomePage() {
  return (
    <section className="main-content container">
      {/* 배너 슬라이더 영역 */}
      <div className="banner-slider">
        <div className="slide-item">
          <div className="text-content">
            <span className="badge">신규주문 고객 대상 EVENT</span>
            <h2>업계최고<br />신규가입 적립금</h2>
            <p>
              모든 신규 주문건에 대하여 <strong>만원의 구매지원금</strong>을 지원해 드립니다. 
              신규회원 가입시 자동으로 적립되며, 즉시 사용 가능합니다. 
            </p>
          </div>
          <div className="image-content">
            {/* banner_illust.png 파일은 public 폴더에 있어야 합니다 */}
            <img src="/banner_illust.png" alt="Event Banner" /> 
          </div>
          <button className="prev-btn">&lt;</button> 
          <button className="next-btn">&gt;</button> 
          <div className="dots">
            <span className="dot active"></span>
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        </div>
      </div>

      {/* 사이드 메뉴 영역 */}
      <div className="side-menu">
        <div className="quick-grid">
          <QuickGridItem icon="ℹ️" label="이용가이드" />
          <QuickGridItem icon="🔒" label="개인통관고유부호" />
          <QuickGridItem icon="🏅" label="회원등급/혜택" /> 
          <QuickGridItem icon="✈️" label="국제배송 요금표" />
          <QuickGridItem icon="%" label="관/부가세 안내" /> 
          <QuickGridItem icon="➕" label="예상비용 계산" /> 
        </div>
        <a href="#" className="btn-qna">
          <span>🎧 빠른 질문게시판</span>
          <span className="arrow">&gt;</span>
        </a>
      </div>
    </section>
  );
}

// 반복되는 사이드 메뉴 아이템을 위한 컴포넌트
function QuickGridItem({ icon, label }: { icon: string; label: string }) {
  return (
    <a href="#" className="grid-item">
      <div className="icon">{icon}</div>
      <span>{label}</span>
    </a>
  );
}