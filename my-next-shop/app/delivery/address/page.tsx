"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import GuideLayout from '../../components/GuideLayout';

export default function DeliveryAddressPage() {
  const mailboxNumber = 'SRW-25168';

  return (
    <GuideLayout title="일본 배송주소 확인" type="delivery" hideSidebar={true}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="address-page-container"
      >
        <style jsx>{`
          .address-page-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          
          .address-card {
            background: #fff;
            border-radius: 24px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);
            border: 1px solid #edf2f7;
            overflow: hidden;
          }

          .card-grid {
            padding: 40px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
          }

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

            .tip-box { padding: 15px 20px !important; font-size: 13px !important; }
            .warning-section { padding: 16px !important; margin-top: 20px !important; }
          }
        `}</style>

        {/* 상단 안내 문구 */}
        <header style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h2 className="header-h2" style={{ fontSize: '28px', fontWeight: '800', color: '#1a202c', marginBottom: '10px' }}>
            나의 <span style={{ color: '#6366f1' }}>일본 전용</span> 주소
          </h2>
          <p className="header-p" style={{ color: '#718096', fontSize: '16px' }}>
            현지 쇼핑몰 결제 시 아래 정보를 정확히 입력해 주세요.
          </p>
        </header>

        {/* 주소 카드 섹션 */}
        <div className="address-card">
          <div className="card-grid">
            <section>
              <h4 style={sectionTitleStyle}>기본 지역 정보</h4>
              <AddressItem label="우편번호" value="123-4567" />
              <AddressItem label="도도부현" value="東京都 (Tokyo)" />
              <AddressItem label="구/군/시" value="港区 (Minato-ku)" />
              <AddressItem label="상세주소 1" value="東麻布 1-2-3" />
            </section>
            
            <section>
              <h4 style={sectionTitleStyle}>고유 식별 정보</h4>
              <AddressItem label="상세주소 2" value={mailboxNumber} isHighlight />
              <AddressItem label="받는사람" value={`박성진 ${mailboxNumber}`} isHighlight />
              <AddressItem label="전화번호" value="03-xxxx-xxxx" />
            </section>
          </div>

          {/* 하단 팁 */}
          <div className="tip-box" style={{ 
            backgroundColor: '#f8fafc', 
            padding: '20px 40px', 
            borderTop: '1px solid #edf2f7',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#64748b',
            fontSize: '14px'
          }}>
            <span style={{ fontSize: '18px' }}>💡</span>
            <div style={{ lineHeight: '1.4' }}>
              사서함 번호(<span style={{ fontWeight: 'bold', color: '#6366f1' }}>{mailboxNumber}</span>)가 포함되어야 빠른 검수와 배송이 가능합니다.
            </div>
          </div>
        </div>

        {/* 주의사항 섹션 */}
        <div className="warning-section" style={{ 
          marginTop: '30px', 
          padding: '24px', 
          backgroundColor: '#fffaf0', 
          borderRadius: '16px', 
          border: '1px solid #feebc8' 
        }}>
          <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#c05621', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ 이용 전 필독사항
          </h4>
          <ul style={{ fontSize: '13px', color: '#744210', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
            <li>현지 창고 사정에 따라 주소가 예고 없이 변경될 수 있습니다.</li>
            <li><strong>대비키(착불 결제)</strong> 상품은 수령이 불가하여 반송 처리됩니다.</li>
            <li>사서함 번호 미기재 시 미확인 화물로 분류되어 입고가 지연됩니다.</li>
          </ul>
        </div>
      </motion.div>
    </GuideLayout>
  );
}

const sectionTitleStyle = {
  fontSize: '13px',
  color: '#a0aec0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  fontWeight: '700',
  marginBottom: '15px'
};

function AddressItem({ label, value, isHighlight }: { label: string, value: string, isHighlight?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '12px', color: '#4a5568', fontWeight: '600', marginBottom: '6px' }}>
        {label}
      </label>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        backgroundColor: isHighlight ? '#f5f3ff' : '#f8fafc', 
        padding: '10px 14px', 
        borderRadius: '12px', 
        border: `1px solid ${isHighlight ? '#ddd6fe' : '#e2e8f0'}`,
        gap: '10px'
      }}>
        <span style={{ 
          flex: 1, 
          fontSize: '14px', 
          color: isHighlight ? '#5b21b6' : '#1e293b', 
          fontWeight: isHighlight ? '700' : '500',
          fontFamily: 'monospace',
          wordBreak: 'break-all', /* 긴 주소가 잘리지 않게 설정 */
          lineHeight: '1.4'
        }}>
          {value}
        </span>
        <button 
          onClick={() => copyToClipboard(value)}
          style={{ 
            backgroundColor: copied ? '#10b981' : '#fff', 
            color: copied ? '#fff' : '#4a5568',
            border: `1px solid ${copied ? '#10b981' : '#cbd5e0'}`, 
            padding: '6px 12px', 
            fontSize: '11px', 
            fontWeight: '700',
            borderRadius: '8px', 
            cursor: 'pointer',
            minWidth: '55px',
            flexShrink: 0 /* 버튼 크기 유지 */
          }}
        >
          {copied ? '성공' : '복사'}
        </button>
      </div>
    </div>
  );
}