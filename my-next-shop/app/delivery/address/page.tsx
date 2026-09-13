"use client";

import React, { useState, useEffect, useRef } from 'react'; // 🌟 Hook 추가
import { motion } from 'framer-motion';
import GuideLayout from '../../components/GuideLayout';
import { useRouter } from 'next/navigation'; // 🌟 라우터 추가
import { useMikuAlert } from '@/app/context/MikuAlertContext'; // 🌟 미쿠짱 전용 Alert 추가
import { MapPin, Fingerprint, Lightbulb } from 'lucide-react';

export default function DeliveryAddressPage() {
  const router = useRouter(); // 🌟 라우터 초기화
  const { showAlert } = useMikuAlert(); // 🌟 Alert 초기화
  const hasAlerted = useRef(false); // 🌟 알림 중복 방지

  const [isAuthChecking, setIsAuthChecking] = useState(true); // 🌟 로그인 확인 상태

  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    
    // 1. 로그인이 안 되어 있다면
    if (!userId) {
      if (!hasAlerted.current) {
        hasAlerted.current = true;
        showAlert('로그인이 필요한 페이지입니다.', 'warning');
        router.push('/auth/login');
      }
      return;
    }

    // 2. 로그인이 확인되면 인증 화면을 끄고 본 화면 렌더링
    setIsAuthChecking(false);
  }, [router, showAlert]);

  const mailboxNumber = 'SRW-25168';

  // 🌟 로그인 여부 확인 중일 때는 빈 화면을 렌더링해 깜빡임 방지
  if (isAuthChecking) {
    return <div style={{ height: '100vh', backgroundColor: '#fdfdfd' }} />;
  }

  return (
    <GuideLayout title="일본 배송주소 확인" type="delivery" hideSidebar={true}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="address-page-container"
      >
        <style jsx global>{`
          .address-page-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
          }

          .page-eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.08em;
            color: #4f46e5;
            background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
            border: 1px solid #e0e7ff;
            padding: 6px 14px;
            border-radius: 100px;
            margin-bottom: 14px;
          }

          .header-title-accent {
            background: linear-gradient(135deg, #818cf8 0%, #4f46e5 60%, #a855f7 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }

          .address-card {
            background: #fff;
            border-radius: 24px;
            box-shadow: 0 20px 45px -18px rgba(79, 70, 229, 0.16);
            border: 1px solid #edf2f7;
            overflow: hidden;
            position: relative;
          }
          .address-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 4px;
            background: linear-gradient(90deg, #818cf8 0%, #6366f1 50%, #a855f7 100%);
          }

          .card-grid {
            padding: 40px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
          }

          .section-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            font-weight: 800;
            margin-bottom: 16px;
          }
          .section-title-icon {
            width: 22px;
            height: 22px;
            flex-shrink: 0;
            border-radius: 7px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            background: linear-gradient(135deg, #818cf8 0%, #4f46e5 100%);
            box-shadow: 0 4px 8px -3px rgba(79, 70, 229, 0.5);
          }

          .addr-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 16px;
          }
          .addr-row-label {
            width: 90px;
            font-size: 14px;
            font-weight: 700;
            color: #64748b;
            flex-shrink: 0;
          }
          .addr-row-box {
            flex: 1;
            min-width: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            background: #f8fafc;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            transition: all 0.2s ease;
          }
          .addr-row-box.highlight {
            background: #fff8f6;
            border-color: #ffedd5;
          }
          .addr-row-value {
            min-width: 0;
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
            word-break: break-all;
          }
          .addr-row-box.highlight .addr-row-value { color: #ea580c; }
          .addr-copy-btn {
            flex-shrink: 0;
            padding: 6px 14px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 800;
            color: #475569;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .addr-copy-btn:hover { border-color: #ff4b2b; color: #ff4b2b; }
          .addr-row-box.highlight .addr-copy-btn { border-color: #fdba74; color: #ea580c; }
          .addr-row-box.highlight .addr-copy-btn:hover {
            background: #ff4b2b;
            color: #ffffff;
            border-color: #ff4b2b;
          }
          .addr-copy-btn.copied {
            background: #10b981 !important;
            color: #ffffff !important;
            border-color: transparent !important;
          }

          .tip-box-premium {
            background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
            border-top: 1px solid #edf2f7;
            padding: 20px 40px;
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .tip-icon-badge {
            width: 32px;
            height: 32px;
            flex-shrink: 0;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            background: linear-gradient(135deg, #818cf8 0%, #4f46e5 100%);
            box-shadow: 0 6px 14px -5px rgba(79, 70, 229, 0.5);
          }
          .tip-text { color: #4338ca; font-size: 14px; line-height: 1.5; }

          .addr-warning-box {
            margin-top: 30px;
            padding: 22px 26px;
            background: linear-gradient(135deg, #fff7ed 0%, #fff1e0 100%);
            border: 1.5px solid #fdba74;
            border-left: 5px solid #ea580c;
            border-radius: 16px;
            box-shadow: 0 10px 28px -14px rgba(234, 88, 12, 0.35);
            display: flex;
            align-items: flex-start;
            gap: 16px;
          }
          .addr-warning-icon {
            width: 36px;
            height: 36px;
            flex-shrink: 0;
            border-radius: 11px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%);
            box-shadow: 0 6px 14px -5px rgba(234, 88, 12, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.35);
          }
          .addr-warning-title {
            font-size: 15.5px;
            font-weight: 800;
            color: #c2410c;
            margin: 2px 0 12px;
          }
          .addr-warning-list {
            list-style: none;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 9px;
          }
          .addr-warning-list li {
            position: relative;
            padding-left: 16px;
            font-size: 13.5px;
            font-weight: 500;
            color: #9a3412;
            line-height: 1.6;
          }
          .addr-warning-list li::before {
            content: '';
            position: absolute;
            left: 0;
            top: 8px;
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: #ea580c;
          }
          .addr-warning-list strong { color: #ea580c; font-weight: 800; }

          /* 📱 모바일 대응 스타일 */
          @media (max-width: 768px) {
            .address-page-container { padding: 20px 10px; }
            .header-h2 { font-size: 22px !important; }
            .header-p { font-size: 14px !important; }

            .card-grid {
              padding: 20px;
              grid-template-columns: 1fr; /* 무조건 1열 배치 */
              gap: 20px;
            }

            .tip-box-premium { padding: 16px 20px !important; font-size: 13px !important; }
            .addr-warning-box { padding: 18px 20px; margin-top: 20px; gap: 12px; }

            .addr-row { flex-direction: column; align-items: flex-start; gap: 8px; }
            .addr-row-label { width: 100%; }
            .addr-row-box { width: 100%; box-sizing: border-box; }
          }
        `}</style>

        {/* 상단 안내 문구 */}
        <header style={{ marginBottom: '40px', textAlign: 'center' }}>
          <span className="page-eyebrow">
            <MapPin size={12} strokeWidth={2.5} />
            MY JAPAN ADDRESS
          </span>
          <h2 className="header-h2" style={{ fontSize: '28px', fontWeight: '800', color: '#1a202c', marginBottom: '10px' }}>
            나의 <span className="header-title-accent">일본 전용</span> 주소
          </h2>
          <p className="header-p" style={{ color: '#718096', fontSize: '16px' }}>
            현지 쇼핑몰 결제 시 아래 정보를 정확히 입력해 주세요.
          </p>
        </header>

        {/* 주소 카드 섹션 */}
        <div className="address-card">
          <div className="card-grid">
            <section>
              <h4 className="section-title">
                <span className="section-title-icon"><MapPin size={12} strokeWidth={2.5} /></span>
                기본 지역 정보
              </h4>
              <AddressItem label="우편번호" value="123-0865" />
              <AddressItem label="도도부현" value="東京都 (Tokyo)" />
              <AddressItem label="구/군/시" value="足立区 (Adachi-ku)" />
              <AddressItem label="상세주소 1" value="新田 3-35-31 1008号" />
            </section>

            <section>
              <h4 className="section-title">
                <span className="section-title-icon"><Fingerprint size={12} strokeWidth={2.5} /></span>
                고유 식별 정보
              </h4>
              <AddressItem label="상세주소 2" value={mailboxNumber} isHighlight />
              <AddressItem label="받는사람" value={`박성진 ${mailboxNumber}`} isHighlight />
              <AddressItem label="전화번호" value="03-xxxx-xxxx" />
            </section>
          </div>

          {/* 하단 팁 */}
          <div className="tip-box-premium">
            <span className="tip-icon-badge"><Lightbulb size={16} strokeWidth={2.2} /></span>
            <div className="tip-text">
              사서함 번호(<strong style={{ color: '#4f46e5' }}>{mailboxNumber}</strong>)가 포함되어야 빠른 검수와 배송이 가능합니다.
            </div>
          </div>
        </div>

        {/* 주의사항 섹션 */}
        <div className="addr-warning-box">
          <span className="addr-warning-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <div>
            <h4 className="addr-warning-title">이용 전 필독사항</h4>
            <ul className="addr-warning-list">
              <li>현지 창고 사정에 따라 주소가 예고 없이 변경될 수 있습니다.</li>
              <li><strong>대비키(착불 결제)</strong> 상품은 수령이 불가하여 반송 처리됩니다.</li>
              <li>사서함 번호 미기재 시 미확인 화물로 분류되어 입고가 지연됩니다.</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </GuideLayout>
  );
}

function AddressItem({ label, value, isHighlight }: { label: string, value: string, isHighlight?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="addr-row">
      <span className="addr-row-label">{label}</span>
      <div className={`addr-row-box ${isHighlight ? 'highlight' : ''}`}>
        <span className="addr-row-value">{value}</span>
        <button
          className={`addr-copy-btn ${copied ? 'copied' : ''}`}
          onClick={() => copyToClipboard(value)}
          aria-label={`${label} 복사`}
        >
          {copied ? '완료' : '복사'}
        </button>
      </div>
    </div>
  );
}