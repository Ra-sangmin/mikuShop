"use client";
import React, { useState } from 'react';
import { useExchangeRate } from '../context/ExchangeRateContext';
import { useCart } from '../context/CartContext';
import { useRouter } from 'next/navigation';

export default function PurchaseFormContainer() {
  const [url, setUrl] = useState('');
  const [photoService, setPhotoService] = useState('none');
  const [packingService, setPackingService] = useState('none');
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [option, setOption] = useState('');
  const [request, setRequest] = useState('');
  const [category, setCategory] = useState('');
  
  const { exchangeRate } = useExchangeRate();
  const { addToCart } = useCart();
  const router = useRouter();

  const handleAddToCart = () => {
    if (!url || !price || !quantity) {
      alert('필수 정보를 입력해주세요.');
      return;
    }

    addToCart({
      url,
      price: parseFloat(price),
      quantity: parseInt(quantity),
      option,
      request,
      photoService,
      packingService,
      category
    });

    alert('장바구니에 추가되었습니다.');
    router.push('/mypage/status?tab=장바구니');
  };

  // 계산 로직
  const numPrice = parseFloat(price) || 0;
  const numQuantity = parseInt(quantity) || 0;
  const totalJPY = numPrice * numQuantity;
  const totalKRW = Math.floor(totalJPY * exchangeRate);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: '"Noto Sans KR", sans-serif', color: '#333' }}>
      
      {/* 유의사항 섹션 */}
      <div style={{ border: '1px solid #dee2e6', marginBottom: '30px' }}>
        <div style={{ backgroundColor: '#f8f9fa', padding: '10px 15px', borderBottom: '1px solid #dee2e6', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>유의사항</span>
          <span style={{ 
            display: 'inline-block', 
            width: '16px', 
            height: '16px', 
            borderRadius: '50%', 
            border: '1px solid #adb5bd', 
            fontSize: '11px', 
            textAlign: 'center', 
            lineHeight: '14px', 
            color: '#adb5bd',
            cursor: 'pointer'
          }}>?</span>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button style={{ backgroundColor: '#212529', color: '#fff', border: 'none', padding: '6px 12px', fontSize: '12px', borderRadius: '3px', fontWeight: 'bold', cursor: 'pointer' }}>구매대행 신청방법</button>
            <button style={{ backgroundColor: '#212529', color: '#fff', border: 'none', padding: '6px 12px', fontSize: '12px', borderRadius: '3px', fontWeight: 'bold', cursor: 'pointer' }}>수수료/서비스안내</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
            <input type="checkbox" id="agree" />
            <label htmlFor="agree" style={{ fontSize: '13px', fontWeight: 'bold' }}>
              <span style={{ color: '#ff4d4f' }}>위의 내용을 모두 확인하였음을 동의</span>합니다.
            </label>
          </div>
          <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.8' }}>
            <p style={{ margin: '3px 0' }}>구매대행 신청은 <span style={{ color: '#f57c00', fontWeight: 'bold' }}>사이버머니 충전</span>이후 신청가능합니다 !</p>
            <p style={{ margin: '3px 0' }}>셀프구매신청으로 구매하실 일본사이트URL(링크) 넣어 1차결제완료하시면</p>
            <p style={{ margin: '3px 0' }}>오쿠루 관리자가 구매를 진행해드립니다!</p>
            <p style={{ margin: '3px 0' }}>구매신청이후 구매불가한 상품이라면 지불하신 오쿠루머니는 전액환불됩니다.</p>
            <p style={{ margin: '3px 0' }}>그 외 자세한 문의는 <span style={{ color: '#f57c00', fontWeight: 'bold' }}>오쿠루 카페로 문의</span>해 주세요.</p>
          </div>
        </div>
      </div>

      {/* 상품정보 섹션 */}
      <div style={{ border: '1px solid #dee2e6', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#f8f9fa', padding: '8px 15px', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>상품정보</span>
          <button style={{ backgroundColor: '#ff4d4f', color: '#fff', border: 'none', padding: '4px 10px', fontSize: '11px', borderRadius: '3px', fontWeight: 'bold', cursor: 'pointer' }}>상품정보삭제</button>
        </div>
        
        <div style={{ padding: '20px', display: 'flex', gap: '30px' }}>
          {/* 이미지 영역 */}
          <div style={{ width: '120px', textAlign: 'center' }}>
            <div style={{ width: '120px', height: '120px', border: '1px solid #eee', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginBottom: '10px' }}>
              <img src="/images/logo.png" alt="no image" style={{ width: '60px', opacity: 0.1, marginBottom: '5px' }} />
              <span style={{ fontSize: '12px', color: '#ccc', fontWeight: 'bold' }}>NO IMAGE</span>
            </div>
            <p style={{ fontSize: '11px', color: '#888', marginBottom: '10px' }}>필수사항아님</p>
            <button style={{ width: '100%', padding: '6px', backgroundColor: '#ced4da', border: 'none', borderRadius: '3px', fontSize: '11px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>이미지선택</button>
          </div>

          {/* 입력 폼 영역 */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 1fr', gap: '10px 15px', alignItems: 'center', marginBottom: '15px' }}>
              <Label required>상품URL</Label>
              <input 
                type="text" 
                placeholder="구매바로가능한 상품링크" 
                style={inputStyle} 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              
              <Label required>가격</Label>
              <input 
                type="text" 
                placeholder="상품링크의 기재된 엔화가격" 
                style={inputStyle} 
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
              />

              <Label required>수량</Label>
              <input 
                type="text" 
                style={inputStyle} 
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ''))}
              />

              <Label>상품옵션기입</Label>
              <input 
                type="text" 
                placeholder="메루카리는 작성X" 
                style={inputStyle} 
                value={option}
                onChange={(e) => setOption(e.target.value)}
              />

              <Label>요청사항</Label>
              <div style={{ gridColumn: 'span 3' }}>
                <input 
                  type="text" 
                  placeholder="요청사항작성가능 / 배송대행신청시에는 상품내용을 해당란에 적어주세요" 
                  style={inputStyle} 
                  value={request}
                  onChange={(e) => setRequest(e.target.value)}
                />
              </div>
            </div>

            {/* 서비스 옵션 영역 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              {/* 사진검수 */}
              <div style={{ border: '1px solid #dee2e6', padding: '15px', borderRadius: '3px' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 'bold' }}><span style={{ color: '#ff4d4f' }}>*</span> 사진검수</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={radioLabelStyle}>
                    <input type="radio" name="photo" checked={photoService === 'none'} onChange={() => setPhotoService('none')} /> 미신청
                  </label>
                  <label style={radioLabelStyle}>
                    <input type="radio" name="photo" checked={photoService === 'apply'} onChange={() => setPhotoService('apply')} /> 신청
                  </label>
                  <p style={serviceDescStyle}>[200엔] 도착후 상품사진 3장<br/>추가요청사항은 오쿠루 네이버카페로 문의부탁드립니다.</p>
                </div>
              </div>
              {/* 포장보완 */}
              <div style={{ border: '1px solid #dee2e6', padding: '15px', borderRadius: '3px' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 'bold' }}><span style={{ color: '#ff4d4f' }}>*</span> 포장보완</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={radioLabelStyle}>
                    <input type="radio" name="packing" checked={packingService === 'none'} onChange={() => setPackingService('none')} /> 미신청
                  </label>
                  <label style={radioLabelStyle}>
                    <input type="radio" name="packing" checked={packingService === 'apply'} onChange={() => setPackingService('apply')} /> 신청
                  </label>
                  <p style={serviceDescStyle}>[200엔~] 뽁뽁이 상품포장보완<br/>상품에 따라 추가요금이 발생할수도 있습니다<br/>추가요청사항은 오쿠루 네이버카페로 문의부탁드립니다.</p>
                </div>
              </div>
            </div>

            {/* 분류 섹션 */}
            <div style={{ border: '1px solid #dee2e6', padding: '15px', borderRadius: '3px' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 'bold' }}><span style={{ color: '#ff4d4f' }}>*</span> 분류</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <select 
                  style={selectStyle}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">통관품목을 선택해주세요</option>
                  <option value="의류">의류</option>
                  <option value="신발">신발</option>
                  <option value="완구">완구</option>
                </select>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <select style={{ ...selectStyle, flex: 1 }}>
                    <option>선택하세요.</option>
                  </select>
                  <button style={{ backgroundColor: '#212529', color: '#fff', border: 'none', padding: '0 10px', borderRadius: '3px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>전체적용</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 상품 추가 버튼 영역 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '30px' }}>
        <button style={actionButtonStyle}>상품추가</button>
        <button style={actionButtonStyle}>상품복사추가</button>
      </div>

      {/* 합계 테이블 */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', textAlign: 'center', border: '1px solid #dee2e6' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa', fontSize: '12px' }}>
            <th style={tableThStyle}>상품(엔)</th>
            <th style={{ ...tableThStyle, width: '50px' }}></th>
            <th style={tableThStyle}>수수료<br/>(2차요청)</th>
            <th style={{ ...tableThStyle, width: '50px' }}></th>
            <th style={tableThStyle}>결제(원화)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tableTdStyle}><span style={{ fontSize: '20px', color: '#666' }}>¥ {totalJPY.toLocaleString()}</span></td>
            <td style={{ ...tableTdStyle, color: '#ff4d4f', fontSize: '20px' }}>+</td>
            <td style={tableTdStyle}><span style={{ fontSize: '20px', color: '#666' }}>¥ 0</span></td>
            <td style={{ ...tableTdStyle, color: '#ff4d4f', fontSize: '20px' }}>=</td>
            <td style={tableTdStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '20px', color: '#ff4d4f', fontWeight: 'bold' }}>¥ {totalJPY.toLocaleString()}</span>
                <span style={{ fontSize: '16px', color: '#ff4d4f' }}>({totalKRW.toLocaleString()}원)</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 하단 최종 버튼 영역 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button style={{ padding: '10px 20px', border: '1px solid #dee2e6', backgroundColor: '#fff', borderRadius: '3px', cursor: 'pointer', fontSize: '13px' }}>목록</button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleAddToCart}
            style={{ padding: '12px 30px', backgroundColor: '#212529', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
          >
            장바구니
          </button>
          <button style={{ padding: '12px 30px', backgroundColor: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>바로결제</button>
        </div>
      </div>

    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode, required?: boolean }) {
  return (
    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#555' }}>
      {required && <span style={{ color: '#ff4d4f', marginRight: '3px' }}>*</span>}
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid #ced4da',
  borderRadius: '3px',
  fontSize: '12px',
  outline: 'none',
  boxSizing: 'border-box' as const
};

const selectStyle = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid #ced4da',
  borderRadius: '3px',
  fontSize: '12px',
  backgroundColor: '#fff',
  outline: 'none',
  boxSizing: 'border-box' as const
};

const actionButtonStyle = {
  backgroundColor: '#212529',
  color: '#fff',
  border: 'none',
  padding: '8px 15px',
  borderRadius: '3px',
  fontSize: '12px',
  fontWeight: 'bold',
  cursor: 'pointer'
};

const radioLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  fontSize: '12px',
  cursor: 'pointer',
  color: '#666'
};

const serviceDescStyle = {
  margin: '5px 0 0 0',
  fontSize: '11px',
  color: '#0056b3',
  lineHeight: '1.5'
};

const tableThStyle = {
  padding: '12px',
  border: '1px solid #dee2e6',
  fontWeight: 'normal' as const,
  color: '#666'
};

const tableTdStyle = {
  padding: '30px 10px',
  border: '1px solid #dee2e6'
};
