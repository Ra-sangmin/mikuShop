"use client";
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useExchangeRate } from '@/app/context/ExchangeRateContext';
import { useCart } from '@/app/context/CartContext';
import { useRouter } from 'next/navigation';
// 🌟 MikuAlertContext 임포트 경로 확인
import { useMikuAlert } from '@/app/context/MikuAlertContext'; 
import { ORDER_TYPE, OrderType, ORDER_STATUS } from '@/src/types/order';

// 상품 1개의 초기 데이터 구조 정의
type ProductForm = {
  id: number;
  url: string;
  name: string;
  price: string;
  quantity: string;
  domesticShippingFee: string;
  option: string;
  request: string;
  photoService: string;
  packingService: string;
  category: string;
  isAutoFetching: boolean;
  lastFetchedUrl: string;
  image?: string;
};

const initialProduct: ProductForm = {
  id: Date.now(),
  url: '',
  name: '',
  price: '',
  quantity: '1',
  domesticShippingFee: '0', // 🌟 초기값 0
  option: '',
  request: '',
  photoService: 'none',
  packingService: 'none',
  category: '',
  isAutoFetching: false,
  lastFetchedUrl: '',
  image: undefined
};

interface Props {
  type: OrderType;
}

export default function PurchaseFormContainer({ type }: Props) {
  const [products, setProducts] = useState<ProductForm[]>([{ ...initialProduct, name: '상품 정보 입력 1' }]);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { showAlert, showConfirm } = useMikuAlert(); 
  const { exchangeRate } = useExchangeRate();
  const router = useRouter();

  // 🌟 수수료 상태 관리 (초기값은 기본값으로 설정)
  const [feeSettings, setFeeSettings] = useState({
    TRANSFER: 450,
    AGENCY: 100
  });

  // 🌟 2. DB에서 수수료 설정 불러오기
  useEffect(() => {
    const fetchFees = async () => {
      try {
        const res = await fetch('/api/fees');
        const data = await res.json();
        if (data.success && data.fees) {
          const settings = data.fees.reduce((acc: any, fee: any) => {
            acc[fee.feeType] = fee.amount;
            return acc;
          }, {});
          setFeeSettings(prev => ({ ...prev, ...settings }));
        }
      } catch (err) {
        console.error("수수료 데이터 로드 실패, 기본값 사용");
      }
    };
    fetchFees();
  }, []);

  // 🌟 3. 실시간 금액 계산 로직 (useMemo로 최적화)
  const { 
    totalProductPrice, 
    totalDomesticShipping, 
    totalTransferFee, 
    totalAgencyFee, 
    totalFees, 
    totalJPY, 
    totalKRW 
  } = useMemo(() => {
    const itemCount = products.length;
    
    // 순수 상품가 합계 (가격 * 수량)
    const productPriceSum = products.reduce((sum, p) => 
      sum + ((parseFloat(p.price) || 0) * (parseInt(p.quantity) || 0)), 0);
    
    // 일본내 배송료 합계
    const shippingSum = products.reduce((sum, p) => 
      sum + (parseFloat(p.domesticShippingFee) || 0), 0);

    // 수수료 계산 (DB 설정값 * 상품 개수)
    const transferSum = itemCount * feeSettings.TRANSFER;
    const agencySum = itemCount * feeSettings.AGENCY;
    
    const feesSum = shippingSum + transferSum + agencySum;
    const jpySum = productPriceSum + feesSum;

    return {
      totalProductPrice: productPriceSum,
      totalDomesticShipping: shippingSum,
      totalTransferFee: transferSum,
      totalAgencyFee: agencySum,
      totalFees: feesSum,
      totalJPY: jpySum,
      totalKRW: Math.floor(jpySum * exchangeRate)
    };
  }, [products, feeSettings, exchangeRate]);

  const updateProduct = (index: number, field: keyof ProductForm, value: any) => {
    setProducts(prev => {
      const newProducts = [...prev];
      newProducts[index] = { ...newProducts[index], [field]: value };
      return newProducts;
    });
  };

  const handleAddProductForm = () => {
    setProducts(prev => [...prev, { ...initialProduct, id: Date.now() }]);
  };

  const handleRemoveProductForm = (index: number) => {
    if (products.length > 1) {
      setProducts(prev => prev.filter((_, i) => i !== index));
    } else {
      setProducts([{ ...initialProduct, id: Date.now() }]);
    }
  };

  const fetchProductName = async (index: number, inputUrl: string) => {
    const product = products[index];
    if (!inputUrl || !inputUrl.startsWith('http') || inputUrl === product.lastFetchedUrl) return;

    updateProduct(index, 'isAutoFetching', true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productUrl: inputUrl, characterLimit: 50 }),
      });
      const data = await response.json();
      
      if (data.success && data.productName) {
        updateProduct(index, 'name', data.productName);
        updateProduct(index, 'lastFetchedUrl', inputUrl);
      }
    } catch (error) {
      console.error("상품명 추출 실패:", error);
    } finally {
      updateProduct(index, 'isAutoFetching', false);
    }
  };

  const processImageFile = async (index: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      showAlert('이미지 파일만 업로드 가능합니다.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
      updateProduct(index, 'isAutoFetching', true);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) updateProduct(index, 'image', data.url);
      else showAlert('이미지 업로드에 실패했습니다.', 'error');
    } catch (error) {
      console.error("Image Upload Error:", error);
    } finally {
      updateProduct(index, 'isAutoFetching', false);
    }
  };

  // 🌟 async 함수로 명확하게 정의
  const handleAddToCart = async () => {
    // 1. 유효성 검사
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const prefix = `${i + 1}번째 상품의`;

      if (!p.url) {
        showAlert(`${prefix} URL을 입력해주세요.`);
        return;
      }

      if (!p.price || parseFloat(p.price) <= 0) {
        showAlert(`${prefix} 가격을 정확히 입력해주세요.`);
        return;
      }
      if (!p.quantity || parseInt(p.quantity) <= 0) {
        showAlert(`${prefix} 수량을 입력해주세요.`);
        return;
      }
    }

    const userId = localStorage.getItem('user_id');
    if (!userId) {
      showAlert("로그인이 필요한 서비스입니다.", 'error');
      return;
    }

    // 🌟 2. Miku 스타일의 showConfirm 적용 및 await 필수
    const confirmMsg = type === ORDER_TYPE.PURCHASE 
      ? `총 ${products.length}개의 상품을 장바구니에 담으시겠습니까?`
      : `총 ${products.length}개의 상품에 대해 배송 신청을 하시겠습니까?`;

    try {
      const isConfirmed = await showConfirm(confirmMsg);
      if (!isConfirmed) return; // '취소' 클릭 시 중단

      // 3. 주문 생성 로직
      const promises = products.map(p => {
        const totalPrice = parseFloat(p.price) * (parseInt(p.quantity) || 1);
        const initialStatus = type === ORDER_TYPE.PURCHASE ? ORDER_STATUS.CART : ORDER_STATUS.PAID;

        return fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            type: type,
            productName: p.name,
            productPrice: totalPrice,
            productUrl: p.url,
            productOption: p.option,
            productImageUrl: p.image,
            domesticShippingFee: Number(p.domesticShippingFee) || 0, // 🌟 추가: 배송료 데이터
            serviceRequest: [
              ...(p.photoService === 'apply' ? ['사진 검수'] : []),
              ...(p.packingService === 'apply' ? ['포장 보완'] : [])
            ].join(', '),
            productRequest: p.request,
            status: initialStatus 
          }),
        });
      });

      const responses = await Promise.all(promises);
      let allSuccess = responses.every(async (res) => (await res.json()).success);

      if (allSuccess) {
        showAlert(type === ORDER_TYPE.PURCHASE ? '🛒 모든 상품이 장바구니에 담겼습니다!' : '🚀 배송 신청이 완료되었습니다!', 'success');
        setTimeout(() => router.push(`/mypage/status?tab=${type === ORDER_TYPE.PURCHASE ? ORDER_STATUS.CART : ORDER_STATUS.PAID}`), 1500);
      } else {
        showAlert(`일부 상품 저장 중 오류가 발생했습니다.`, 'error');
      }

    } catch (error) {
      console.error("Add to cart error:", error);
      showAlert("서버 통신 중 오류가 발생했습니다.", 'error');
    }
  };

  return (
    <>
      <style>{`
        .premium-container { animation: fadeIn 0.6s ease-out; }
        .premium-card { background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04); border: 1px solid #f0f0f0; overflow: hidden; margin-bottom: 24px; }
        .premium-input { width: 100%; padding: 12px 14px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none; transition: all 0.2s ease; background: #f9fafb; box-sizing: border-box; }
        .premium-input:focus { background: #fff; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); }
        .premium-btn { padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; border: none; }
        .btn-dark { background: #1f2937; color: #fff; }
        .btn-primary { background: #6366f1; color: #fff; width: 100%; max-width: 300px; }
        .service-box { border: 1px solid #e5e7eb; padding: 14px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: all 0.2s ease; background-color: #fff; }
        .service-box:hover { border-color: #a5b4fc; background-color: #f8fafc; }
        .service-box.active { border-color: #6366f1; background-color: #eef2ff; }
        .custom-checkbox { width: 20px; height: 20px; border: 2px solid #d1d5db; border-radius: 5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s ease; }
        .service-box.active .custom-checkbox { background-color: #6366f1; border-color: #6366f1; }
        @media (max-width: 768px) {
          .premium-container { padding: 15px 10px !important; }
          .product-card-inner { flex-direction: column !important; gap: 20px !important; padding: 20px !important; }
          .input-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .input-grid > div { grid-column: span 1 !important; }
          .service-grid { grid-template-columns: 1fr !important; }
          .total-card { flex-direction: column !important; padding: 24px 15px !important; gap: 15px !important; }
          .total-divider { display: none; }
          .final-summary { width: 100% !important; }
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="premium-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '30px 20px', fontFamily: '"Noto Sans KR", sans-serif' }}>
        
        <div className="premium-card" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
          <div style={{ padding: '20px' }}>
            <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e3a8a', display: 'block', marginBottom: '10px' }}>💡 구매대행 유의사항</span>
            <div style={{ fontSize: '13px', color: '#3b82f6', lineHeight: '1.6', backgroundColor: '#fff', padding: '12px', borderRadius: '8px' }}>
              • <strong style={{ color: '#2563eb' }}>사이버머니 충전</strong> 이후 신청 가능합니다.<br/>
              • 여러 상품을 한 번에 추가하여 장바구니에 담을 수 있습니다.
            </div>
          </div>
        </div>

        {products.map((product, index) => (
          <div key={product.id} className="premium-card">
            <div style={{ backgroundColor: '#f9fafb', padding: '12px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <input 
                type="text" value={product.name} 
                onChange={(e) => updateProduct(index, 'name', e.target.value)}
                style={{ fontWeight: '700', fontSize: '15px', border: 'none', background: 'transparent', width: '70%', outline: 'none' }}
              />
              <button className="premium-btn" style={{ background: '#fee2e2', color: '#ef4444', padding: '5px 12px', fontSize: '12px' }} onClick={() => handleRemoveProductForm(index)}>
                {products.length === 1 ? '초기화' : '삭제'}
              </button>
            </div>
            
            <div className="product-card-inner" style={{ padding: '24px', display: 'flex', gap: '30px' }}>
              <div className="image-upload-wrapper" style={{ width: '140px', flexShrink: 0 }}>
                <div className="image-upload-box" 
                  style={{ 
                    width: '140px', height: '140px', borderRadius: '12px', border: '2px dashed #d1d5db', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                    backgroundColor: '#f9fafb', cursor: 'pointer', overflow: 'hidden', padding: '8px', boxSizing: 'border-box'
                  }}
                  onClick={() => fileInputRefs.current[index]?.click()}
                >
                  {product.image ? (
                    <img src={product.image} alt="product" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>📸 이미지 추가</span>
                  )}
                </div>
                <input type="file" accept="image/*" style={{ display: 'none' }} ref={el => { fileInputRefs.current[index] = el }} onChange={(e) => {
                  const file = e.target.files?.[0]; 
                  if (file) processImageFile(index, file);
                }} />
              </div>

              <div style={{ flex: 1 }}>
                <div className="input-grid" style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 1fr', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
                  <Label required>상품 URL</Label>
                  <div style={{ gridColumn: 'span 3' }}>
                    <input type="text" placeholder="https://" className="premium-input" value={product.url} onChange={(e) => updateProduct(index, 'url', e.target.value)} onBlur={(e) => fetchProductName(index, e.target.value)} />
                    {product.isAutoFetching && <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: '700' }}>정보 수집 중...</span>}
                  </div>

                  <Label required>상품 가격(¥)</Label>
                  <input type="text" placeholder="0" className="premium-input" value={product.price} onChange={(e) => updateProduct(index, 'price', e.target.value.replace(/[^0-9.]/g, ''))} />

                  <Label required>수량</Label>
                  <input type="text" className="premium-input" value={product.quantity} onChange={(e) => updateProduct(index, 'quantity', e.target.value.replace(/[^0-9]/g, ''))} />

                  {/* 🌟 구매대행(PURCHASE)일 때만 '일본내 배송료' 항목 노출 */}
                  {type === ORDER_TYPE.PURCHASE && (
                    <>
                      <Label>일본내 배송료</Label>
                      <div style={{ gridColumn: 'span 3' }}>
                        <input 
                          type="text" 
                          placeholder="일본 현지 배송비 ( 필수 항목 아님 , 없으면 0) " 
                          className="premium-input" 
                          value={product.domesticShippingFee} 
                          onChange={(e) => updateProduct(index, 'domesticShippingFee', e.target.value.replace(/[^0-9.]/g, ''))} 
                        />
                      </div>
                    </>
                  )}

                  <Label>옵션</Label>
                  <div style={{ gridColumn: 'span 3' }}><input type="text" placeholder="색상, 사이즈 등" className="premium-input" value={product.option} onChange={(e) => updateProduct(index, 'option', e.target.value)} /></div>

                  <Label>요청사항</Label>
                  <div style={{ gridColumn: 'span 3' }}><input type="text" placeholder="포장 등 요청사항" className="premium-input" value={product.request} onChange={(e) => updateProduct(index, 'request', e.target.value)} /></div>
                </div>

                <div className="service-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div 
                    className={`service-box ${product.photoService === 'apply' ? 'active' : ''}`} 
                    onClick={() => updateProduct(index, 'photoService', product.photoService === 'none' ? 'apply' : 'none')}
                  >
                    <div className="custom-checkbox">
                      {product.photoService === 'apply' && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: product.photoService === 'apply' ? '#4338ca' : '#374151' }}>
                        📷 사진 검수
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>현지 도착 후 촬영</div>
                    </div>
                  </div>

                  <div 
                    className={`service-box ${product.packingService === 'apply' ? 'active' : ''}`} 
                    onClick={() => updateProduct(index, 'packingService', product.packingService === 'none' ? 'apply' : 'none')}
                  >
                    <div className="custom-checkbox">
                      {product.packingService === 'apply' && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: product.packingService === 'apply' ? '#4338ca' : '#374151' }}>
                        📦 포장 보완
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>안전한 재포장</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
          <button className="premium-btn btn-dark" onClick={handleAddProductForm}>➕ 상품 추가</button>
        </div>

        {type === ORDER_TYPE.PURCHASE && (
          <div className="premium-card total-card" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', // 🌟 요소들 사이에 동일한 간격 부여
            padding: '30px', 
            background: '#f8fafc',
            flexWrap: 'wrap', // 모바일 대응용 줄바꿈 유지
            gap: '15px'
          }}>
            {/* 1. 총 상품 금액 */}
            <div style={{ textAlign: 'center', flex: '1 1 100px' }}>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>총 상품 금액</p>
              <span style={{ fontSize: '18px', fontWeight: '800' }}><span translate="no">¥{totalProductPrice.toLocaleString()}</span></span>
            </div>

            <div style={{ fontSize: '18px', color: '#cbd5e1' }}>+</div>

            {/* 2. 일본내 배송료 */}
            <div style={{ textAlign: 'center', flex: '1 1 100px' }}>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>일본내 배송료</p>
              <span style={{ fontSize: '18px', fontWeight: '800' }}><span translate="no">¥{totalDomesticShipping.toLocaleString()}</span></span>
            </div>

            <div style={{ fontSize: '18px', color: '#cbd5e1' }}>+</div>

            {/* 3. 송금 수수료 */}
            <div style={{ textAlign: 'center', flex: '1 1 100px' }}>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>송금 수수료</p>
              <span style={{ fontSize: '18px', fontWeight: '800' }}><span translate="no">¥{totalTransferFee.toLocaleString()}</span></span>
            </div>

            <div style={{ fontSize: '18px', color: '#cbd5e1' }}>+</div>

            {/* 4. 대행 수수료 */}
            <div style={{ textAlign: 'center', flex: '1 1 100px' }}>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>대행 수수료</p>
              <span style={{ fontSize: '18px', fontWeight: '800' }}><span translate="no">¥{totalAgencyFee.toLocaleString()}</span></span>
            </div>

            <div style={{ fontSize: '18px', color: '#cbd5e1' }}>=</div>

            {/* 🌟 5. 최종 결과 박스 (정렬 보정) */}
            <div className="final-summary" style={{ 
              textAlign: 'center', 
              padding: '20px 30px', 
              background: '#fff', 
              borderRadius: '16px', 
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
              minWidth: '200px',
              border: '2px solid #6366f1', // 포인트 컬러 추가로 강조
              // 🌟 핵심: 줄바꿈 시에도 오른쪽 정렬을 유지하거나 항목이 많을 때 가운데 오도록 설정
              marginLeft: 'auto' 
            }}>
              <p style={{ fontSize: '13px', color: '#4f46e5', fontWeight: '800', marginBottom: '5px' }}>
                총 <span translate="no">{products.length}</span>개 결제 예상
              </p>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#111827' }}>
                <span translate="no">¥{totalJPY.toLocaleString()}</span>
              </div>
              <div style={{ fontSize: '15px', color: '#ef4444', fontWeight: '800', marginTop: '5px' }}>
                약 <span translate="no">{totalKRW.toLocaleString()}</span>원
              </div>
            </div>
          </div>
        )}

        <div className="bottom-btn-wrap" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
          <button 
            className="premium-btn btn-primary" 
            onClick={handleAddToCart} 
            style={type === ORDER_TYPE.PURCHASE ? { backgroundColor: '#dc2626', borderColor: '#dc2626', color: '#fff' } : {}}
          >
            🛍️ {type === ORDER_TYPE.PURCHASE ? "장바구니 담기" : "배송대행 신청"}
          </button>
        </div>
      </div>
    </>
  );
}

function Label({ children, required }: { children: React.ReactNode, required?: boolean }) {
  return (
    <div className="label-cell" style={{ fontSize: '13px', fontWeight: '700', color: '#4b5563' }}>
      {children} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </div>
  );
}