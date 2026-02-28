"use client";
import React from 'react';
import GuideLayout from '../components/GuideLayout';

export default function ContactPage() {
  return (
    <GuideLayout title="카카오톡 문의" type="contact" hideSidebar={true}>
      <style jsx>{`
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

        /* -------------------------------------------
           📱 모바일 레이아웃 조정 (768px 이하 스마트폰) 
           ------------------------------------------- */
        @media (max-width: 768px) {
          .contact-container {
            padding: 30px 15px;
          }

          .contact-title {
            font-size: 22px;
            margin-bottom: 10px;
          }

          .contact-desc {
            font-size: 15px;
            margin-bottom: 30px;
          }

          .kakao-btn {
            width: 100%; /* 🌟 모바일에서는 버튼이 화면 너비에 꽉 차도록 변경 */
            font-size: 16px;
            padding: 16px 20px;
          }
        }
      `}</style>

      <div className="contact-container">
        <h2 className="contact-title">무엇을 도와드릴까요?</h2>
        <p className="contact-desc">
          미쿠짱 카카오톡 채널을 통해<br />빠르고 친절한 실시간 상담이 가능합니다.
        </p>
        
        <button className="kakao-btn">
          <span style={{ fontSize: '24px' }}>💬</span> 카카오톡 상담하기
        </button>
      </div>
    </GuideLayout>
  );
}