"use client";
import React from 'react';
import GuideLayout from '../../components/GuideLayout';

export default function DeliveryAddressPage() {
  const mailboxNumber = 'SRW-25168'; // 예시 사서함 번호

  return (
    <GuideLayout title="일본 배송주소 확인" type="delivery">
      <div style={{ lineHeight: '1.8', color: '#444' }}>
        <p style={{ fontSize: '16px', marginBottom: '30px' }}>
          일본 쇼핑몰에서 상품 구매 시 아래 주소를 <span style={{ color: '#ff4b2b', fontWeight: 'bold' }}>받는 사람 주소</span>로 입력해 주세요.
        </p>
        
        <div style={{ border: '1px solid #ddd', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ backgroundColor: '#f8f8f8', padding: '20px 25px', borderBottom: '1px solid #ddd' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>나의 일본 배송지 주소</h3>
          </div>
          
          <div style={{ padding: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
            <div>
              <AddressItem label="우편번호" value="123-4567" />
              <AddressItem label="도도부현" value="東京都 (Tokyo)" />
              <AddressItem label="구/군/시" value="港区 (Minato-ku)" />
              <AddressItem label="상세주소 1" value="東麻布 1-2-3" />
            </div>
            <div>
              <AddressItem label="상세주소 2" value={mailboxNumber} isHighlight />
              <AddressItem label="받는사람" value={`박성진 ${mailboxNumber}`} isHighlight />
              <AddressItem label="전화번호" value="03-xxxx-xxxx" />
            </div>
          </div>
          
          <div style={{ padding: '0 30px 30px', color: '#888', fontSize: '14px' }}>
            ※ 상세주소 2(사서함번호)를 반드시 기입해 주셔야 빠른 입고 확인이 가능합니다.
          </div>
        </div>

        <div style={{ marginTop: '40px', padding: '25px', backgroundColor: '#fff5f5', borderRadius: '12px', border: '1px solid #feb2b2' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: '#c53030', marginBottom: '15px' }}>⚠️ 주의사항</h4>
          <ul style={{ fontSize: '15px', color: '#4a5568', paddingLeft: '20px' }}>
            <li>현지 사정에 따라 주소가 변경될 수 있으니 구매 전 반드시 확인해 주세요.</li>
            <li>사서함 번호가 누락될 경우 본인 확인이 늦어질 수 있습니다.</li>
            <li>착불(Daibiki) 상품은 수령이 불가능하므로 반드시 선결제 해주세요.</li>
          </ul>
        </div>
      </div>
    </GuideLayout>
  );
}

function AddressItem({ label, value, isHighlight }: { label: string, value: string, isHighlight?: boolean }) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label}가 복사되었습니다.`);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
      <span style={{ width: '100px', fontSize: '15px', color: '#666', fontWeight: 'bold' }}>{label}</span>
      <div style={{ 
        flex: 1, 
        backgroundColor: '#f9f9f9', 
        padding: '10px 15px', 
        borderRadius: '6px', 
        border: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: isHighlight ? '#5b108d' : '#333',
        fontWeight: isHighlight ? 'bold' : 'normal'
      }}>
        <span style={{ fontSize: '15px' }}>{value}</span>
        <button 
          onClick={() => copyToClipboard(value)}
          style={{ 
            backgroundColor: '#fff', 
            border: '1px solid #ddd', 
            padding: '3px 10px', 
            fontSize: '12px', 
            borderRadius: '4px', 
            cursor: 'pointer',
            marginLeft: '10px'
          }}
        >
          복사
        </button>
      </div>
    </div>
  );
}
