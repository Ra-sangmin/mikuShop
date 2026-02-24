import React from 'react';
import GuideLayout from '../../components/GuideLayout';

export default function QNAPage() {
  return (
    <GuideLayout title="1:1 문의게시판" type="contact">
      <div style={{ lineHeight: '1.8', color: '#444' }}>
        <p>궁금하신 사항을 남겨주시면 정성껏 답변해 드리겠습니다.</p>
        <div style={{ marginTop: '30px' }}>
          <button style={{ padding: '12px 25px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            문의글 작성하기
          </button>
        </div>
      </div>
    </GuideLayout>
  );
}
