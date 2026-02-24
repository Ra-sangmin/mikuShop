"use client";
import React, { useState } from 'react';
import GuideLayout from '../../components/GuideLayout';

export default function PurchaseRequestPage() {
  const [premiumService, setPremiumService] = useState('none');

  return (
    <GuideLayout title="구매대행 신청" type="purchase" fullWidth={true}>
      <div style={{ maxWidth: '2200px', margin: '0 auto', padding: '20px', fontFamily: '"Noto Sans KR", sans-serif' }}>
        
        {/* 상품정보 헤더 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          backgroundColor: '#f8f9fa', 
          padding: '15px 25px', 
          border: '1px solid #e9ecef',
          borderBottom: 'none'
        }}>
          <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#333' }}>상품정보</h3>
          <button style={{ 
            backgroundColor: '#ff6b6b', 
            color: '#fff', 
            border: 'none', 
            padding: '10px 20px', 
            borderRadius: '4px', 
            fontSize: '16px', 
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>상품정보삭제</button>
        </div>

        {/* 메인 폼 컨테이너 */}
        <div style={{ border: '1px solid #e9ecef', padding: '40px', backgroundColor: '#fff', display: 'flex', gap: '40px' }}>
          
          {/* 좌측 이미지 업로드 영역 */}
          <div style={{ width: '200px', textAlign: 'center' }}>
            <div style={{ 
              width: '200px', 
              height: '200px', 
              border: '1px solid #eee', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '20px',
              backgroundColor: '#fcfcfc'
            }}>
               <img src="/images/logo.png" alt="preview" style={{ maxWidth: '80%', opacity: 0.2 }} />
            </div>
            <p style={{ fontSize: '16px', color: '#888', marginBottom: '15px' }}>필수사항아님</p>
            <button style={{ 
              width: '100%', 
              padding: '12px', 
              backgroundColor: '#dee2e6', 
              border: 'none', 
              borderRadius: '4px', 
              fontSize: '16px', 
              color: '#495057',
              fontWeight: '600',
              cursor: 'pointer'
            }}>이미지선택</button>
          </div>

          {/* 우측 입력 필드 영역 */}
          <div style={{ flex: 1 }}>
            {/* 기본 정보 행 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 150px 1fr', gap: '25px 20px', alignItems: 'center', marginBottom: '25px' }}>
              <Label required>상품URL</Label>
              <input type="text" placeholder="구매바로가능한 상품링크" style={inputStyle} />
              
              <Label required>가격</Label>
              <input type="text" placeholder="상품링크의 기재된 엔화가격" style={inputStyle} />

              <Label required>수량</Label>
              <input type="text" defaultValue="1" style={inputStyle} />

              <Label>상품옵션기입</Label>
              <input type="text" placeholder="메루카리는 작성X" style={inputStyle} />

              <Label>요청사항</Label>
              <div style={{ gridColumn: 'span 3' }}>
                <input type="text" placeholder="요청사항작성가능 / 배송대행신청시에는 상품내용을 해당란에 적어주세요" style={inputStyle} />
              </div>
            </div>

            {/* 구매옵션 체크박스 영역 */}
            <div style={{ 
              border: '1px solid #e9ecef', 
              padding: '30px', 
              borderRadius: '4px', 
              marginBottom: '30px'
            }}>
              <p style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold', color: '#ff0000' }}>* 구매옵션</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <Checkbox label="동일 사이트 복수 구매신청 시 추가 송료 발생해도 구매 희망합니다" />
                <Checkbox label="1차결제·입고대기 중 일부 품절 발생해도 거래 희망합니다" />
              </div>
            </div>

            {/* 하단 2단 레이아웃 (프리미엄 서비스 & 분류) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              
              {/* 사루와 프리미엄 서비스 */}
              <div style={{ border: '1px solid #e9ecef', padding: '30px', borderRadius: '4px' }}>
                <p style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold', color: '#ff0000' }}>* 사루와 프리미엄 서비스</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '18px', color: '#555' }}>
                    <input 
                      type="radio" 
                      name="premium" 
                      checked={premiumService === 'none'} 
                      onChange={() => setPremiumService('none')}
                      style={{ width: '20px', height: '20px' }}
                    /> 미신청
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '18px', color: '#555' }}>
                    <input 
                      type="radio" 
                      name="premium" 
                      checked={premiumService === 'apply'} 
                      onChange={() => setPremiumService('apply')}
                      style={{ width: '20px', height: '20px' }}
                    /> 신청
                  </label>
                  <div style={{ fontSize: '16px', color: '#888', lineHeight: '1.8', marginTop: '10px' }}>
                    사진 첨부 1장, 주문 상품 일치여부 확인, 포장보완 (250엔)<br/>
                    입고완료 후 신청(+250엔), 추가 요청사항은 1:1 네이버 카페를 통해 문의해 주세요.
                  </div>
                </div>
              </div>

              {/* 분류 */}
              <div style={{ border: '1px solid #e9ecef', padding: '30px', borderRadius: '4px' }}>
                <p style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold', color: '#ff0000' }}>* 분류</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <select style={selectStyle}>
                    <option>통관품목을 선택해주세요</option>
                  </select>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select style={{ ...selectStyle, flex: 1 }}>
                      <option>선택하세요.</option>
                    </select>
                    <button style={{ 
                      backgroundColor: '#212529', 
                      color: '#fff', 
                      border: 'none', 
                      padding: '0 25px', 
                      borderRadius: '4px', 
                      fontSize: '16px', 
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}>전체적용</button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* 하단 버튼 영역 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '30px' }}>
          <button style={bottomButtonStyle}>상품추가</button>
          <button style={bottomButtonStyle}>상품복사추가</button>
        </div>
      </div>
    </GuideLayout>
  );
}

function Label({ children, required }: { children: React.ReactNode, required?: boolean }) {
  return (
    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
      {required && <span style={{ color: '#ff0000', marginRight: '6px' }}>*</span>}
      {children}
    </div>
  );
}

function Checkbox({ label }: { label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '18px', color: '#ff0000', fontWeight: 'bold' }}>
      <input type="checkbox" style={{ width: '20px', height: '20px' }} />
      {label}
    </label>
  );
}

const inputStyle = {
  width: '100%',
  padding: '15px',
  border: '1px solid #ced4da',
  borderRadius: '4px',
  fontSize: '16px',
  outline: 'none'
};

const selectStyle = {
  width: '100%',
  padding: '15px',
  border: '1px solid #ced4da',
  borderRadius: '4px',
  fontSize: '16px',
  backgroundColor: '#f8f9fa',
  outline: 'none'
};

const bottomButtonStyle = {
  backgroundColor: '#212529',
  color: '#fff',
  border: 'none',
  padding: '15px 35px',
  borderRadius: '4px',
  fontSize: '18px',
  fontWeight: 'bold',
  cursor: 'pointer'
};
