"use client";
import React from 'react';
import GuideLayout from '../../components/GuideLayout';

export default function FAQPage() {
  // 질문과 답변 데이터를 배열로 정리하여 나중에 항목을 추가하기 쉽게 만들었습니다.
  const faqs = [
    {
      q: "배송기간은 얼마나 걸리나요?",
      a: "평균적으로 현지 배송 2~3일, 국제 배송 3~5일 정도 소요됩니다."
    },
    {
      q: "배송비는 어떻게 계산되나요?",
      a: "상품의 무게와 부피 중 큰 것을 기준으로 배송비가 책정됩니다."
    }
  ];

  return (
    <GuideLayout title="자주하는 질문" type="guide">
      <style jsx>{`
        .guide-container {
          color: #334155;
        }

        .guide-title {
          font-size: 24px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 12px;
        }

        .guide-desc {
          font-size: 16px;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 40px;
          word-break: keep-all;
        }

        /* 🌟 FAQ 카드 리스트 디자인 */
        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .faq-item {
          background-color: #fff;
          padding: 30px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 10px rgba(0,0,0,0.02);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .faq-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.04);
          border-color: #cbd5e1;
        }

        /* 질문(Q) 영역 */
        .faq-q-wrap {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }

        .faq-icon-q {
          font-size: 20px;
          font-weight: 900;
          color: #ff4b2b; /* 미쿠짱 포인트 주황색 */
          line-height: 1.4;
        }

        .faq-q-text {
          font-size: 18px;
          font-weight: 800;
          color: #1e293b;
          line-height: 1.4;
          margin: 0;
        }

        /* 답변(A) 영역 */
        .faq-a-wrap {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px dashed #e2e8f0;
        }

        .faq-icon-a {
          font-size: 18px;
          font-weight: 900;
          color: #6366f1; /* 시원한 파란색 계열 */
          line-height: 1.6;
        }

        .faq-a-text {
          font-size: 15px;
          color: #475569;
          line-height: 1.6;
          word-break: keep-all;
          margin: 0;
        }

        /* -------------------------------------------
           📱 모바일 레이아웃 조정 (768px 이하 스마트폰) 
           ------------------------------------------- */
        @media (max-width: 768px) {
          .guide-title {
            font-size: 20px;
          }
          
          .guide-desc {
            font-size: 14px;
            margin-bottom: 30px;
          }

          .faq-list {
            gap: 12px;
          }

          .faq-item {
            padding: 20px;
            border-radius: 12px;
          }

          .faq-q-wrap {
            gap: 8px;
            margin-bottom: 12px;
          }

          .faq-icon-q {
            font-size: 18px;
          }

          .faq-q-text {
            font-size: 16px;
          }

          .faq-a-wrap {
            gap: 8px;
            padding-top: 12px;
          }

          .faq-icon-a {
            font-size: 16px;
          }

          .faq-a-text {
            font-size: 14px;
          }
        }
      `}</style>

      <div className="guide-container">
        <h2 className="guide-title">자주하는 질문 (FAQ)</h2>
        <p className="guide-desc">고객님들께서 가장 많이 묻는 질문들을 모았습니다.</p>
        
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div key={index} className="faq-item">
              <div className="faq-q-wrap">
                <span className="faq-icon-q">Q.</span>
                <h3 className="faq-q-text">{faq.q}</h3>
              </div>
              <div className="faq-a-wrap">
                <span className="faq-icon-a">A.</span>
                <p className="faq-a-text">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </GuideLayout>
  );
}