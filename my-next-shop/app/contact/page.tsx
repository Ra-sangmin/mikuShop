"use client";
import React from 'react';
import GuideLayout from '../components/GuideLayout';
import { useMikuAlert } from '@/app/context/MikuAlertContext';

export default function ContactPage() {
  const { showAlert } = useMikuAlert();

  // 핸들러 함수 분리
  const handleKakaoClick = () => {
    showAlert('이 서비스는 현재 준비중입니다', 'warning');
  };

  return (
    <GuideLayout title="카카오톡 문의" type="contact" hideSidebar={true}>
      <div className="contact-container">
        <h2 className="contact-title">무엇을 도와드릴까요?</h2>
        <p className="contact-desc">
          미쿠짱 카카오톡 채널을 통해<br />
          빠르고 친절한 실시간 상담이 가능합니다.
        </p>
        
        <button className="kakao-btn" onClick={handleKakaoClick}>
          <span className="kakao-icon">💬</span> 
          카카오톡 상담하기
        </button>
      </div>

      {/* CSS 스타일 분리 */}
      <style jsx>{contactStyles}</style>
    </GuideLayout>
  );
}

// ==========================================
// 🎨 CSS 스타일 정의 (분리)
// ==========================================
const contactStyles = `
  .contact-container {
    padding: 60px 20px;
    text-align: center;
    background-color: #fff;
    border-radius: 16px;
  }
  .contact-title {
    font-size: 26px;
    font-weight: 900;
    color: #0f172a;
    margin-bottom: 12px;
  }
  .contact-desc {
    font-size: 16px;
    color: #64748b;
    line-height: 1.6;
    margin-bottom: 40px;
    word-break: keep-all;
  }
  .kakao-btn {
    padding: 18px 40px;
    background-color: #FEE500;
    color: #111;
    border: none;
    border-radius: 12px;
    font-weight: 900;
    cursor: pointer;
    font-size: 18px;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    box-shadow: 0 4px 15px rgba(254, 229, 0, 0.2);
  }
  .kakao-btn:hover {
    background-color: #FADA0A;
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(254, 229, 0, 0.3);
  }
  .kakao-icon {
    font-size: 24px;
  }

  @media (max-width: 768px) {
    .contact-container { padding: 30px 15px; }
    .contact-title { font-size: 22px; margin-bottom: 10px; }
    .contact-desc { font-size: 15px; margin-bottom: 30px; }
    .kakao-btn { width: 100%; font-size: 16px; padding: 16px 20px; }
  }
`;