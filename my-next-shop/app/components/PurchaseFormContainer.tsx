"use client";
import React, { useState, useRef } from 'react';
import { useExchangeRate } from '../context/ExchangeRateContext';
import { useCart } from '../context/CartContext';
import { useRouter } from 'next/navigation';
import { useMikuAlert } from '../context/MikuAlertContext';

// 상품 1개의 초기 데이터 구조 정의
type ProductForm = {
  id: number;
  url: string;
  name: string;
  price: string;
  quantity: string;
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
  option: '',
  request: '',
  photoService: 'none',
  packingService: 'none',
  category: '',
  isAutoFetching: false,
  lastFetchedUrl: '',
  image: undefined
};

export default function PurchaseFormContainer() {
  const [products, setProducts] = useState<ProductForm[]>([{ ...initialProduct, name: '상품 정보 입력 1' }]);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { showAlert } = useMikuAlert();
  const { exchangeRate } = useExchangeRate();
  const { addToCart } = useCart();
  const router = useRouter();

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
      else showAlert('이미지 업로드에 실패했습니다.');
    } catch (error) {
      console.error("Image Upload Error:", error);
    } finally {
      updateProduct(index, 'isAutoFetching', false);
    }
  };

  const handleAddToCart = async () => {
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (!p.url || !p.price || !p.quantity || !p.name) {
        showAlert(`${i + 1}번째 상품의 필수 정보를 입력해주세요.`);
        return;
      }
    }
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      showAlert("로그인이 필요한 서비스입니다.");
      return;
    }
    try {
      const promises = products.map(p => {
        const totalPrice = parseFloat(p.price) * (parseInt(p.quantity) || 1);
        return fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            productName: p.name,
            productPrice: totalPrice,
            productUrl: p.url,
            productOption: p.option,
            productImageUrl: p.image,
            serviceRequest: [
              ...(p.photoService === 'apply' ? ['사진 검수'] : []),
              ...(p.packingService === 'apply' ? ['포장 보완'] : [])
            ].join(', '),
            productRequest: p.request,
            status: "장바구니"
          }),
        });
      });
      const responses = await Promise.all(promises);
      let allSuccess = true;
      for (let res of responses) {
        const data = await res.json();
        if (!data.success) allSuccess = false;
      }
      if (allSuccess) {
        showAlert('🛒 모든 상품이 장바구니에 성공적으로 담겼습니다!');
        router.push('/mypage/status?tab=장바구니');
      } else {
        showAlert(`일부 상품을 저장하는 중 오류가 발생했습니다.`);
      }
    } catch (error) {
      showAlert("서버 통신 중 오류가 발생했습니다.");
    }
  };

  const totalJPY = products.reduce((sum, p) => sum + ((parseFloat(p.price) || 0) * (parseInt(p.quantity) || 0)), 0);
  const totalKRW = Math.floor(totalJPY * exchangeRate);

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
        
        /* ✨ 개선된 서비스 박스 스타일 */
        .service-box { 
          border: 1px solid #e5e7eb; 
          padding: 14px; 
          border-radius: 10px; 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          gap: 12px; 
          transition: all 0.2s ease; 
          background-color: #fff;
        }
        .service-box:hover { border-color: #a5b4fc; background-color: #f8fafc; }
        .service-box.active { border-color: #6366f1; background-color: #eef2ff; }

        .custom-checkbox {
          width: 20px; height: 20px; border: 2px solid #d1d5db; border-radius: 5px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s ease;
        }
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

                  <Label required>가격(¥)</Label>
                  <input type="text" placeholder="0" className="premium-input" value={product.price} onChange={(e) => updateProduct(index, 'price', e.target.value.replace(/[^0-9.]/g, ''))} />

                  <Label required>수량</Label>
                  <input type="text" className="premium-input" value={product.quantity} onChange={(e) => updateProduct(index, 'quantity', e.target.value.replace(/[^0-9]/g, ''))} />

                  <Label>옵션</Label>
                  <div style={{ gridColumn: 'span 3' }}><input type="text" placeholder="색상, 사이즈 등" className="premium-input" value={product.option} onChange={(e) => updateProduct(index, 'option', e.target.value)} /></div>

                  <Label>요청사항</Label>
                  <div style={{ gridColumn: 'span 3' }}><input type="text" placeholder="포장 등 요청사항" className="premium-input" value={product.request} onChange={(e) => updateProduct(index, 'request', e.target.value)} /></div>
                </div>

                {/* ✨ 개선된 서비스 옵션 영역 */}
                <div className="service-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  
                  {/* 사진 검수 */}
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

                  {/* 포장 보완 */}
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

        <div className="premium-card total-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '30px', background: '#f8fafc' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>총 상품 금액</p>
            <span style={{ fontSize: '24px', fontWeight: '800' }}>¥{totalJPY.toLocaleString()}</span>
          </div>
          <div className="total-divider" style={{ fontSize: '20px', color: '#cbd5e1' }}>+</div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>예상 수수료</p>
            <span style={{ fontSize: '24px', fontWeight: '800' }}>¥0</span>
          </div>
          <div className="total-divider" style={{ fontSize: '20px', color: '#cbd5e1' }}>=</div>
          <div className="final-summary" style={{ textAlign: 'center', padding: '15px 30px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: '13px', color: '#4f46e5', fontWeight: '700', marginBottom: '5px' }}>총 {products.length}개 결제 예상</p>
            <div style={{ fontSize: '28px', fontWeight: '900' }}>¥{totalJPY.toLocaleString()}</div>
            <div style={{ fontSize: '14px', color: '#ef4444', fontWeight: '700', marginTop: '5px' }}>약 {totalKRW.toLocaleString()}원</div>
          </div>
        </div>

        <div className="bottom-btn-wrap" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
          <button className="premium-btn btn-primary" onClick={handleAddToCart}>🛍️ 장바구니 담기</button>
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