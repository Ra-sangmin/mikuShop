"use client";
import React, { useState, useMemo } from 'react';
import { DELIVERY_FEE_DATA } from '@/lib/shippingData';

// 1. 배송 방법별 데이터 정의
const SHIPPING_METHODS = {
  EMS_AIR: { name: "EMS 항공" },
  EMS_SHIP: { name: "EMS선편" },
  PANTOS: { name: "판토스항공" },
  SHIP_SPECIAL: { name: "선편특송(오사카)" }
};

const ProductDetail = ({ item, exchangeRate, onCartUpdate }: any) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [optionMemo, setOptionMemo] = useState<string>("");
  const [selectedShipping, setSelectedShipping] = useState<keyof typeof SHIPPING_METHODS>("EMS_AIR");
  const [weightInput, setWeightInput] = useState<string>("0.5");
  const [wishlistCount, setWishlistCount] = useState<number>(0);

  // 초기 위시리스트 개수 설정
  React.useEffect(() => {
    const savedWishlist = JSON.parse(localStorage.getItem('rakutenWishlist') || '[]');
    setWishlistCount(savedWishlist.length);
  }, []);
  
  const weightNum = Number(weightInput) || 0;

  if (!item) return null;

  const title = item.itemName;
  const priceYen = Number(item.itemPrice || item.priceYen) || 0;
  const priceWon = Math.round(priceYen * exchangeRate / 100) * 100; 

  // 2. 실시간 운송료 계산 (useMemo를 사용하여 상태 변경 시 즉시 재계산)
  const { currentShippingFee, finalWeight, feeInYen } = useMemo(() => {
    const num = Number(weightInput) || 0;
    const methodData = DELIVERY_FEE_DATA[selectedShipping] || {};
    const weights = Object.keys(methodData).map(Number).sort((a, b) => a - b);
    
    // 현재 입력값보다 크거나 같은 구간 찾기
    const matched = weights.find(w => w >= num);
    const fw = matched !== undefined ? matched : (weights[weights.length - 1] || 0);
    const yen = methodData[fw] || 0;
    
    return {
      currentShippingFee: Math.round(yen * exchangeRate / 100) * 100,
      finalWeight: fw,
      feeInYen: yen
    };
  }, [selectedShipping, weightInput, exchangeRate]); // 이 값들이 바뀌면 무조건 재계산

  const mainImage = item.imageUrl || item.mediumImageUrls?.[0]?.split('?')[0] || "";
  const description = item.itemCaption || item.description || "상품 설명이 없습니다.";

  // 2. 실시간 운송료 계산 (함수로 감싸지 않고 직접 계산하여 렌더링에 100% 반영시킵니다)
  const methodData = DELIVERY_FEE_DATA[selectedShipping] || {};
  const weights = Object.keys(methodData).map(Number).sort((a, b) => a - b);
  
  const matchedWeight = weights.find(w => w >= weightNum);
  

  const agencyFee = 5891; 
  const extraFeesWon = Math.round((200 + 450) * exchangeRate / 100) * 100; 
  const totalPrice = Math.round(((priceWon + currentShippingFee + agencyFee + extraFeesWon) * quantity) / 100) * 100;

  const handleAddToCart = () => {
    const cartItem = {
      itemId: item.itemCode || item.itemId,
      itemName: title,
      shopName: item.shopName,
      imageUrl: mainImage,
      priceYen: priceYen,
      totalPriceWon: totalPrice,
      quantity: quantity,
      optionMemo: optionMemo,
      shippingMethod: SHIPPING_METHODS[selectedShipping].name,
      addedAt: new Date().toISOString()
    };

    const existingCart = JSON.parse(localStorage.getItem('rakutenCart') || '[]');
    const isAlreadyInCart = existingCart.find((c: any) => c.itemId === cartItem.itemId);
    
    if (isAlreadyInCart) {
      alert("이미 장바구니에 담긴 상품입니다!");
      return;
    }

    localStorage.setItem('rakutenCart', JSON.stringify([...existingCart, cartItem]));
    if (onCartUpdate) onCartUpdate(); 
    alert(`🛒 장바구니에 담겼습니다!\n배송방법: ${SHIPPING_METHODS[selectedShipping].name}`);
  };

  const handleAddToWishlist = () => {
    const wishItem = {
      itemId: item.itemCode || item.itemId,
      itemName: title,
      shopName: item.shopName,
      imageUrl: mainImage,
      priceYen: priceYen,
      itemCaption: item.itemCaption || description,
      addedAt: new Date().toISOString()
    };

    const existingWishlist = JSON.parse(localStorage.getItem('rakutenWishlist') || '[]');
    const isAlreadyInWishlist = existingWishlist.find((w: any) => w.itemId === wishItem.itemId);

    if (isAlreadyInWishlist) {
      alert("이미 관심상품에 등록된 상품입니다!");
      return;
    }

    const updatedWishlist = [...existingWishlist, wishItem];
    localStorage.setItem('rakutenWishlist', JSON.stringify(updatedWishlist));
    setWishlistCount(updatedWishlist.length);
    if (onCartUpdate) onCartUpdate(); // 상단 뱃지 동기화를 위해 호출
    alert("★ 관심상품에 등록되었습니다!");
  };

  return (
    <div style={{ width: '100%', margin: '0 auto', backgroundColor: '#fff', padding: '50px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
      
      <div style={{ display: 'flex', gap: '40px', marginBottom: '50px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '350px', textAlign: 'center' }}>
          <img src={mainImage} alt="상품" style={{ width: '100%', maxWidth: '530px', border: '1px solid #eee' }} />
        </div>

        <div style={{ flex: '1.2', minWidth: '300px' }}>
          <h2 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '20px' }}>{title}</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <tbody>
              <InfoRow label="상점명" value={item.shopName} hasButton />
              <InfoRow label="아이템코드" value={item.itemCode} />
              <InfoRow label="가격" value={`${priceYen.toLocaleString()} 엔`} subValue={`(한화 약 ${priceWon.toLocaleString()} 원)`} isPrice />
              <InfoRow label="수량" isInput inputValue={quantity} onInputChange={(e: any) => setQuantity(Number(e.target.value))} />
              <InfoRow label="옵션메모" isTextarea textareaValue={optionMemo} onTextareaChange={(e: any) => setOptionMemo(e.target.value)} />
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={handleAddToCart} style={{ fontSize: '20px', backgroundColor: '#d9534f', color: '#fff', padding: '10px 20px', border: 'none', cursor: 'pointer' }}>🛒 구매신청</button>
            <button onClick={handleAddToWishlist} style={{ fontSize: '20px', backgroundColor: '#f0ad4e', color: '#fff', padding: '10px 20px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
              ★ 관심상품
              {wishlistCount > 0 && (
                <span style={{ backgroundColor: '#d9534f', color: '#fff', borderRadius: '50%', padding: '2px 8px', fontSize: '14px' }}>
                  {wishlistCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '40px', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderBottom: '1px solid #ddd', fontWeight: 'bold', fontSize: '25px', display: 'flex', justifyContent: 'space-between' }}>
          <span>현재상품 예상견적 비용계산</span>
          <span style={{ fontSize: '16px', color: '#666', fontWeight: 'normal' }}>적용 환율: 100엔 = {(exchangeRate * 100).toFixed(2)}원</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#eee' }}>
              <th style={tableCellStyle}>구분</th>
              <th style={tableCellStyle}>rakuten가격(￥)</th>
              <th style={tableCellStyle}>한화환산가격(₩)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tableCellStyle}>상품가격</td>
              <td style={tableCellStyle}>{priceYen.toLocaleString()} 엔</td>
              <td style={tableCellStyle}>{priceWon.toLocaleString()} 원</td>
            </tr>
            <tr>
              <td style={tableCellStyle}>현지운송료</td>
              <td colSpan={2} style={tableCellStyle}>실비정산 (0엔 ~ 1,000엔 : 과중량은 추가될 수 있습니다.)</td>
            </tr>
            <tr>
              <td style={tableCellStyle}>포장비 / 송금수수료</td>
              <td colSpan={2} style={tableCellStyle}>200엔 / 450엔 (약 {extraFeesWon.toLocaleString()}원)</td>
            </tr>
            
            <tr>
              <td style={tableCellStyle}>국제운송료</td>
              <td style={{ ...tableCellStyle, textAlign: 'left', paddingLeft: '50px' }}>
                <select 
                  value={selectedShipping} 
                  onChange={(e) => setSelectedShipping(e.target.value as any)}
                  style={{ padding: '10px', width: '250px' , fontSize: '20px', border: '2px solid #337ab7', borderRadius: '6px', outline: 'none', cursor: 'pointer' }}
                >
                  {Object.entries(SHIPPING_METHODS).map(([key, method]) => (
                    <option key={key} value={key}>{method.name}</option>
                  ))}
                </select>
                
                {/* ★ 예쁘게 꾸며진 입력창 (Input Group 스타일) */}
                <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    border: '2px solid #337ab7', // Select 박스와 동일한 파란색 테두리
                    borderRadius: '6px', // 둥근 모서리
                    overflow: 'hidden', // 테두리 밖으로 빠져나가는 요소 숨김
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)', // 살짝 입체감을 주는 그림자
                    transition: 'all 0.3s ease'
                  }}>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={weightInput} 
                      onChange={(e) => setWeightInput(e.target.value)} 
                      style={{ 
                        width: '100px', 
                        padding: '10px 0', 
                        fontSize: '22px', 
                        border: 'none', // 기본 테두리 제거
                        outline: 'none', // 클릭 시 생기는 기본 테두리 제거
                        textAlign: 'center', // 텍스트 가운데 정렬
                        color: '#333',
                        fontWeight: 'bold',
                        marginRight: '10px' // 화살표와 띄우기 위해 마진 증가
                      }}
                    />
                    {/* kg 단위 영역을 살짝 다른 배경색으로 구분 */}
                    <div style={{ 
                      backgroundColor: '#f0f4f8', 
                      padding: '12px 18px', 
                      color: '#337ab7', 
                      fontWeight: 'bold', 
                      fontSize: '18px',
                      borderLeft: '1px solid #d9e5f0', // 입력창과 단위 사이의 얇은 선
                      userSelect: 'none' // 드래그 방지
                    }}>
                      kg
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '15px', fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                  <p style={{ fontWeight: 'bold' }}>실무게를 정확히 재설정해주세요.</p>
                  <p>※판토스는 부피무게로 책정됩니다.</p>
                  <p>자세한 사항은 <a href="/delivery-info" style={{ color: '#337ab7', textDecoration: 'underline' }}>[링크]</a>를 참조해주세요.</p>
                </div>
              </td>
              {/* ★ 여기가 13,564원에서 바뀌어야 합니다! */}
              <td style={tableCellStyle}>
                <span key={`${selectedShipping}-${weightInput}`} style={{ fontWeight: 'bold' }}>
                  {(Math.round(currentShippingFee / 100) * 100).toLocaleString()} 원
                </span>
              </td>
            </tr>
            <tr>
              <td style={tableCellStyle}>대행 수수료</td>
              <td style={tableCellStyle}>-</td>
              <td style={tableCellStyle}>{agencyFee.toLocaleString()} 원</td>
            </tr>
            <tr style={{ backgroundColor: '#fff5f5' }}>
              <td style={tableCellStyle}>예상견적가</td>
              <td colSpan={2} style={{ ...tableCellStyle, color: '#d9534f', fontSize: '30px', fontWeight: 'bold' }}>
                <span key={`${selectedShipping}-${weightInput}`} style={{ fontWeight: 'bold' }}>
                  {totalPrice.toLocaleString()} 원
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div style={{ padding: '30px', textAlign: 'center' }}>
          <p style={{ fontWeight: 'bold', fontSize: '20px' }}>일본구매대행만 12년 - 정직하고 착한가격</p>
          <div style={{ marginTop: '20px' }}>
            <span style={{ backgroundColor: '#fee500', padding: '15px 40px', borderRadius: '30px', fontWeight: 'bold', fontSize: '20px', cursor: 'pointer' }}>💬 실시간 견적상담 - 24시간 운영 TALK</span>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '2px solid #337ab7', marginTop: '50px', paddingTop: '30px' }}>
        <h3 style={{ fontSize: '30px', fontWeight: 'bold', color: '#337ab7', marginBottom: '30px' }}>┃ 상품상세정보</h3>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px' }}>
          <img src={mainImage} alt="상세" style={{ maxWidth: '1000px', width: '100%' }} />
          <div style={{ width: '100%', lineHeight: '1.8', fontSize: '20px', color: '#555', backgroundColor: '#f8f9fa', padding: '30px', whiteSpace: 'pre-wrap' }}>{description}</div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value, subValue, isPrice, isInput, isTextarea, inputValue, onInputChange, textareaValue, onTextareaChange, hasButton }: any) => (
  <tr style={{ borderBottom: '1px dotted #ccc' }}>
    <td style={{ padding: '15px 0', color: '#666', width: '150px', fontSize: '20px' }}>{label}</td>
    <td style={{ padding: '15px 0', fontSize: '20px' }}>
      {isPrice ? (
        <span style={{ fontWeight: 'bold', display: 'inline-flex', gap: '10px' }}>
          <span>{value}</span>
          <span style={{ color: '#d9534f' }}>{subValue}</span>
        </span>
      ) : isInput ? (
        <input type="number" min="1" value={inputValue} onChange={onInputChange} style={{ width: '80px', padding: '5px', fontSize: '20px', border: '1px solid #ddd' }} />
      ) : isTextarea ? (
        <textarea value={textareaValue} onChange={onTextareaChange} style={{ width: '100%', height: '70px', padding: '10px', fontSize: '18px', border: '1px solid #ddd' }} />
      ) : hasButton ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>{value}</span>
          <button style={{ padding: '5px 10px', fontSize: '14px', border: '1px solid #999', backgroundColor: '#fff', cursor: 'pointer', borderRadius: '3px' }}>상점보기</button>
        </div>
      ) : (
        <span>{value}</span>
      )}
    </td>
  </tr>
);

const tableCellStyle = { border: '1px solid #eee', padding: '20px' };

export default ProductDetail;