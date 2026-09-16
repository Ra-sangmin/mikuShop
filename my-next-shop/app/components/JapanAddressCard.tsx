"use client";

import React, { useState } from 'react';
import { MapPin, Fingerprint, Lightbulb } from 'lucide-react';
import { JAPAN_MAILBOX_NUMBER, JAPAN_WAREHOUSE_ADDRESS } from '@/lib/japanAddress';

// 🌟 "나의 일본 배송지 주소" 카드
// 배송대행 > 일본 배송주소 확인(/delivery/address)과 마이페이지 > 나의 배송지 정보(/mypage/profile)가
// 같은 카드를 쓰도록 공용 컴포넌트로 분리했습니다.
interface JapanAddressCardProps {
  userName: string;
  mailboxNumber?: string;
}

export default function JapanAddressCard({ userName, mailboxNumber = JAPAN_MAILBOX_NUMBER }: JapanAddressCardProps) {
  const a = JAPAN_WAREHOUSE_ADDRESS;
  const recipient = [userName, mailboxNumber].filter(Boolean).join(' ');

  return (
    <div className="jp-card">
      <div className="jp-card-grid">
        <section>
          <h4 className="jp-card-section-title">
            <span className="jp-card-section-icon"><MapPin size={12} strokeWidth={2.5} /></span>
            기본 지역 정보
          </h4>
          <CopyRow label="우편번호" value={a.zipCode} />
          <CopyRow label="도도부현" value={a.prefecture} />
          <CopyRow label="구/군/시" value={a.city} />
          <CopyRow label="상세주소 1" value={a.address1} />
        </section>

        <section>
          <h4 className="jp-card-section-title">
            <span className="jp-card-section-icon"><Fingerprint size={12} strokeWidth={2.5} /></span>
            고유 식별 정보
          </h4>
          <CopyRow label="상세주소 2" value={mailboxNumber} isHighlight />
          <CopyRow label="받는사람" value={recipient} isHighlight />
          <CopyRow label="전화번호" value={a.phone} />
        </section>
      </div>

      <div className="jp-card-tip">
        <span className="jp-card-tip-icon"><Lightbulb size={16} strokeWidth={2.2} /></span>
        <div className="jp-card-tip-text">
          상세주소 2에 사서함 번호(<strong>{mailboxNumber}</strong>)를 반드시 적어 주셔야 빠른 입고 확인과 배송이 가능합니다.
        </div>
      </div>

      <style jsx global>{`
        .jp-card {
          background: #fff;
          border-radius: 24px;
          box-shadow: 0 20px 45px -18px rgba(79, 70, 229, 0.16);
          border: 1px solid #edf2f7;
          overflow: hidden;
          position: relative;
        }
        .jp-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(90deg, #818cf8 0%, #4f46e5 50%, #818cf8 100%);
        }
        .jp-card-grid {
          padding: 36px 36px 20px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 12px 30px;
        }
        .jp-card-section-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: #94a3b8; text-transform: uppercase;
          letter-spacing: 0.06em; font-weight: 800; margin: 0 0 16px;
        }
        .jp-card-section-icon {
          width: 22px; height: 22px; flex-shrink: 0; border-radius: 7px;
          display: flex; align-items: center; justify-content: center; color: #ffffff;
          background: linear-gradient(135deg, #818cf8 0%, #4f46e5 100%);
          box-shadow: 0 4px 8px -3px rgba(79, 70, 229, 0.5);
        }
        .jp-card-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
        .jp-card-row-label { width: 90px; font-size: 14px; font-weight: 700; color: #64748b; flex-shrink: 0; }
        .jp-card-row-box {
          flex: 1; min-width: 0; display: flex; justify-content: space-between; align-items: center; gap: 10px;
          padding: 12px 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; transition: all 0.2s ease;
        }
        .jp-card-row-box.highlight { background: #fff8f6; border-color: #ffedd5; }
        .jp-card-row-value { min-width: 0; font-size: 15px; font-weight: 700; color: #0f172a; word-break: break-all; }
        .jp-card-row-box.highlight .jp-card-row-value { color: #ea580c; }
        .jp-card-copy-btn {
          flex-shrink: 0; padding: 6px 14px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px;
          font-size: 12px; font-weight: 800; color: #475569; cursor: pointer; transition: all 0.2s ease;
        }
        .jp-card-copy-btn:hover { border-color: #ff4b2b; color: #ff4b2b; }
        .jp-card-row-box.highlight .jp-card-copy-btn { border-color: #fdba74; color: #ea580c; }
        .jp-card-row-box.highlight .jp-card-copy-btn:hover { background: #ff4b2b; color: #ffffff; border-color: #ff4b2b; }
        .jp-card-copy-btn.copied { background: #10b981 !important; color: #ffffff !important; border-color: transparent !important; }
        .jp-card-tip {
          background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
          border-top: 1px solid #edf2f7;
          padding: 18px 36px; display: flex; align-items: center; gap: 14px;
        }
        .jp-card-tip-icon {
          width: 32px; height: 32px; flex-shrink: 0; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; color: #ffffff;
          background: linear-gradient(135deg, #818cf8 0%, #4f46e5 100%);
          box-shadow: 0 6px 14px -5px rgba(79, 70, 229, 0.5);
        }
        .jp-card-tip-text { color: #4338ca; font-size: 14px; line-height: 1.5; }
        .jp-card-tip-text strong { color: #4f46e5; }

        @media (max-width: 768px) {
          .jp-card-grid { padding: 24px 20px 8px; grid-template-columns: 1fr; gap: 8px; }
          .jp-card-tip { padding: 16px 20px; font-size: 13px; }
          .jp-card-row { flex-direction: column; align-items: flex-start; gap: 8px; }
          .jp-card-row-label { width: 100%; }
          .jp-card-row-box { width: 100%; box-sizing: border-box; }
        }
      `}</style>
    </div>
  );
}

function CopyRow({ label, value, isHighlight }: { label: string; value: string; isHighlight?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없는 환경에서는 조용히 무시
    }
  };

  return (
    <div className="jp-card-row">
      <span className="jp-card-row-label">{label}</span>
      <div className={`jp-card-row-box ${isHighlight ? 'highlight' : ''}`}>
        <span className="jp-card-row-value">{value}</span>
        <button
          type="button"
          className={`jp-card-copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          aria-label={`${label} 복사`}
        >
          {copied ? '완료' : '복사'}
        </button>
      </div>
    </div>
  );
}
