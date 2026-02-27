import React from 'react';
import GuideLayout from '../components/GuideLayout';

export default function ContactPage() {
  return (
    <GuideLayout title="카카오톡 문의" type="contact" hideSidebar={true}>
      <div style={{ lineHeight: '1.8', color: '#444' }}>
        <p>카카오톡 채널을 통해 실시간 상담이 가능합니다.</p>
        <div style={{ marginTop: '30px' }}>
          <button style={{ padding: '15px 30px', backgroundColor: '#FEE500', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '18px' }}>
            카카오톡 상담하기
          </button>
        </div>
      </div>
    </GuideLayout>
  );
}
