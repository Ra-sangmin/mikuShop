"use client";
import React, { useState, useRef } from 'react';
import { useExchangeRate } from '../context/ExchangeRateContext';
import { useCart } from '../context/CartContext';
import { useRouter } from 'next/navigation';

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
    setProducts(prev => [...prev, { ...initialProduct, id: Date.now(), name: `상품 정보 입력 ${prev.length + 1}` }]);
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
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
      updateProduct(index, 'isAutoFetching', true);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) updateProduct(index, 'image', data.url);
      else alert('이미지 업로드에 실패했습니다.');
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
        alert(`${i + 1}번째 상품의 필수 정보를 입력해주세요.`);
        return;
      }
    }
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      alert("로그인이 필요한 서비스입니다.");
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
        alert('🛒 모든 상품이 장바구니에 성공적으로 담겼습니다!');
        router.push('/mypage/status?tab=장바구니');
      } else {
        alert(`일부 상품을 저장하는 중 오류가 발생했습니다.`);
      }
    } catch (error) {
      alert("서버 통신 중 오류가 발생했습니다.");
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
        .service-box { border: 1px solid #e5e7eb; padding: 16px; border-radius: 10px; cursor: pointer; }

        /* 📱 모바일 대응 핵심 CSS */
        @media (max-width: 768px) {
          .premium-container { padding: 15px 10px !important; }
          .product-card-inner { flex-direction: column !important; gap: 20px !important; padding: 20px !important; }
          .image-upload-wrapper { width: 100% !important; display: flex; justify-content: center; }
          .image-upload-box { width: 160px !important; height: 160px !important; }
          
          /* 가로 그리드를 세로 1열로 변경 */
          .input-grid { 
            grid-template-columns: 1fr !important; 
            gap: 12px !important; 
          }
          .input-grid > div { grid-column: span 1 !important; }
          .label-cell { margin-bottom: 4px; font-size: 12px !important; }

          /* 서비스 옵션 1열 */
          .service-grid { grid-template-columns: 1fr !important; }

          /* 합계 카드 세로 정렬 */
          .total-card { 
            flex-direction: column !important; 
            padding: 24px 15px !important; 
            gap: 15px !important;
          }
          .total-divider { display: none; }
          .final-summary { width: 100% !important; padding: 20px !important; }

          /* 하단 고정 버튼 느낌으로 정렬 */
          .bottom-btn-wrap { justify-content: center !important; }
        }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="premium-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '30px 20px', fontFamily: '"Noto Sans KR", sans-serif' }}>
        
        {/* 유의사항 */}
        <div className="premium-card" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
          <div style={{ padding: '20px' }}>
            <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e3a8a', display: 'block', marginBottom: '10px' }}>💡 구매대행 유의사항</span>
            <div style={{ fontSize: '13px', color: '#3b82f6', lineHeight: '1.6', backgroundColor: '#fff', padding: '12px', borderRadius: '8px' }}>
              • <strong style={{ color: '#2563eb' }}>사이버머니 충전</strong> 이후 신청 가능합니다.<br/>
              • 여러 상품을 한 번에 추가하여 장바구니에 담을 수 있습니다.
            </div>
          </div>
        </div>

        {/* 상품 입력 폼 배열 */}
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
              {/* 이미지 업로드 */}
              <div className="image-upload-wrapper" style={{ width: '140px', flexShrink: 0 }}>
                <div className="image-upload-box" 
                  style={{ width: '140px', height: '140px', borderRadius: '12px', border: '2px dashed #d1d5db', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', cursor: 'pointer', overflow: 'hidden' }}
                  onClick={() => fileInputRefs.current[index]?.click()}
                >
                  {product.image ? <img src={product.image} alt="product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '12px', color: '#9ca3af' }}>📸 이미지 추가</span>}
                </div>
                <input type="file" accept="image/*" style={{ display: 'none' }} ref={el => { fileInputRefs.current[index] = el }} onChange={(e) => processImageFile(index, e)} />
              </div>

              {/* 입력 필드 그리드 */}
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

                {/* 서비스 옵션 */}
                <div className="service-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="service-box" style={{ borderColor: product.photoService === 'apply' ? '#6366f1' : '#e5e7eb' }} onClick={() => updateProduct(index, 'photoService', product.photoService === 'none' ? 'apply' : 'none')}>
                    <span style={{ fontSize: '13px', fontWeight: '700' }}>📷 사진 검수 {product.photoService === 'apply' && '✅'}</span>
                  </div>
                  <div className="service-box" style={{ borderColor: product.packingService === 'apply' ? '#6366f1' : '#e5e7eb' }} onClick={() => updateProduct(index, 'packingService', product.packingService === 'none' ? 'apply' : 'none')}>
                    <span style={{ fontSize: '13px', fontWeight: '700' }}>📦 포장 보완 {product.packingService === 'apply' && '✅'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
          <button className="premium-btn btn-dark" onClick={handleAddProductForm}>➕ 상품 추가</button>
        </div>

        {/* 합계 카드 */}
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