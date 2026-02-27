"use client";
import React, { useState, useRef } from 'react';
import { useExchangeRate } from '../context/ExchangeRateContext';
import { useCart } from '../context/CartContext';
import { useRouter } from 'next/navigation';

// 🌟 상품 1개의 초기 데이터 구조 정의
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

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(index, file);
  };

  // PurchaseFormContainer 내부 함수 수정
  const processImageFile = async (index: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    // 🌟 1. FormData 생성 (파일 전송용)
    const formData = new FormData();
    formData.append('file', file);

    try {
      updateProduct(index, 'isAutoFetching', true); // 로딩 표시

      // 🌟 2. 이미지 업로드 API 호출
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        // 🌟 3. 서버가 저장한 이미지의 공개 URL을 상태에 저장
        updateProduct(index, 'image', data.url);
      } else {
        alert('이미지 업로드에 실패했습니다.');
      }
    } catch (error) {
      console.error("Image Upload Error:", error);
    } finally {
      updateProduct(index, 'isAutoFetching', false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(index, file);
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
        
        // 🌟 서비스 요청 사항 구성
        const services = [];
        if (p.photoService === 'apply') services.push('사진 검수');
        if (p.packingService === 'apply') services.push('포장 보완');
        
        // 사용자가 직접 입력한 요청사항이 있다면 추가
        const combinedRequest = [
          ...services,
          ...(p.request ? [p.request] : [])
        ].join(', ');

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
            ].join(', '), // 서비스 신청 내역
            productRequest: p.request, // 🌟 개별 상품 요청 사항 분리 저장
            status: "장바구니"
          }),
        });
      });

      const responses = await Promise.all(promises);
      let allSuccess = true;

      for (let res of responses) {
        const data = await res.json();
        if (!data.success) {
          allSuccess = false;
          console.error("개별 상품 저장 실패:", data.error);
        }
      }

      if (allSuccess) {
        products.forEach(p => {
          addToCart({
            url: p.url, price: parseFloat(p.price), quantity: parseInt(p.quantity),
            option: p.option, request: p.request, photoService: p.photoService, packingService: p.packingService, category: p.category
          });
        });
        alert('🛒 모든 상품이 장바구니에 성공적으로 담겼습니다!');
        router.push('/mypage/status?tab=장바구니');
      } else {
        alert(`일부 상품을 저장하는 중 오류가 발생했습니다.`);
      }
    } catch (error) {
      console.error("Cart API Error:", error);
      alert("서버 통신 중 오류가 발생했습니다.");
    }
  };

  const totalJPY = products.reduce((sum, p) => sum + ((parseFloat(p.price) || 0) * (parseInt(p.quantity) || 0)), 0);
  const totalKRW = Math.floor(totalJPY * exchangeRate);

  return (
    <>
      <style>{`
        .premium-container { animation: fadeIn 0.6s ease-out; }
        .premium-card { background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04); border: 1px solid #f0f0f0; overflow: hidden; margin-bottom: 24px; transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .premium-card:hover { box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08); }
        
        .premium-input { width: 100%; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px; outline: none; transition: all 0.2s ease; background: #f9fafb; }
        .premium-input:focus { background: #fff; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); }
        
        .premium-btn { padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; border: none; }
        .btn-dark { background: #1f2937; color: #fff; }
        .btn-dark:hover { background: #374151; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(31, 41, 55, 0.2); }
        
        .btn-primary { background: #6366f1; color: #fff; padding: 12px 32px; font-size: 14px; }
        .btn-primary:hover { background: #4f46e5; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(99, 102, 241, 0.3); }
        
        .btn-outline { background: #fff; color: #4b5563; border: 1px solid #d1d5db; }
        .btn-outline:hover { background: #f3f4f6; color: #111827; }
        .btn-danger { background: #fff; color: #ef4444; border: 1px solid #fecaca; }
        .btn-danger:hover { background: #fef2f2; color: #dc2626; border-color: #f87171; }

        .service-box { border: 1px solid #e5e7eb; padding: 16px; border-radius: 10px; transition: border-color 0.2s ease; cursor: pointer; }
        .service-box:hover { border-color: #6366f1; background: #fefeff; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="premium-container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px 20px', fontFamily: '"Noto Sans KR", sans-serif', color: '#374151' }}>
        
        <div className="premium-card" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontWeight: '700', fontSize: '15px', color: '#1e3a8a' }}>💡 구매대행 유의사항</span>
            </div>
            <div style={{ fontSize: '13px', color: '#3b82f6', lineHeight: '1.7', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
              <p style={{ margin: '0' }}>• 구매대행 신청은 <strong style={{ color: '#2563eb' }}>사이버머니 충전</strong> 이후 신청 가능합니다.</p>
              <p style={{ margin: '4px 0 0 0' }}>• 여러 상품을 한 번에 추가하고 장바구니에 담을 수 있습니다.</p>
            </div>
          </div>
        </div>

        {/* 🌟 배열을 맵핑하여 여러 개의 입력 폼 생성 */}
        {products.map((product, index) => (
          <div key={product.id} className="premium-card" style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ backgroundColor: '#f9fafb', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              
              {/* 🌟 핵심 로직: 상품명이 있으면 상품명을 띄우고, 없으면 기본 텍스트 띄움 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, marginRight: '16px' }}>
                <span style={{ fontSize: '16px' }}>📦</span>
                <input 
                  type="text"
                  value={product.name}
                  onChange={(e) => updateProduct(index, 'name', e.target.value)}
                  style={{
                    fontWeight: '700',
                    fontSize: '16px',
                    color: '#111827',
                    border: 'none',
                    background: 'transparent',
                    width: '100%',
                    outline: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    transition: 'background 0.2s'
                  }}
                  onFocus={(e) => e.target.style.background = '#fff'}
                  onBlur={(e) => e.target.style.background = 'transparent'}
                />
              </div>

              <button 
                className="premium-btn btn-danger" 
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => handleRemoveProductForm(index)}
              >
                {products.length === 1 ? '초기화' : '삭제'}
              </button>
            </div>
            
            <div style={{ padding: '24px', display: 'flex', gap: '30px' }}>
              {/* 이미지 영역 */}
              <div style={{ width: '140px', textAlign: 'center', flexShrink: 0 }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  ref={el => { fileInputRefs.current[index] = el }}
                  onChange={(e) => handleImageUpload(index, e)}
                />
                <div 
                  style={{ width: '140px', height: '140px', borderRadius: '12px', border: '2px dashed #d1d5db', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', marginBottom: '12px', transition: 'all 0.3s ease', cursor: 'pointer', overflow: 'hidden' }} 
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#6366f1'} 
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  onClick={() => fileInputRefs.current[index]?.click()}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(index, e)}
                >
                  {product.image ? (
                    <img src={product.image} alt="상품 이미지" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <>
                      <span style={{ fontSize: '24px', color: '#9ca3af', marginBottom: '8px' }}>📸</span>
                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>이미지 추가</span>
                    </>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500' }}>필수 사항은 아님</div>
              </div>

              {/* 입력 폼 영역 */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px 1fr', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
                  
                  <Label required>상품 URL</Label>
                  <div style={{ position: 'relative', gridColumn: 'span 3' }}>
                    <input 
                      type="text" 
                      placeholder="https://" 
                      className="premium-input" 
                      value={product.url} 
                      onChange={(e) => updateProduct(index, 'url', e.target.value)} 
                      onBlur={(e) => fetchProductName(index, e.target.value)} 
                    />
                    
                    <div style={{ 
                      position: 'absolute', right: '10px', transform: 'translateY(-230%)', pointerEvents: 'none', width: '150px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                      opacity: product.isAutoFetching ? 1 : 0,
                      transition: product.isAutoFetching ? 'opacity 0s' : 'opacity 1.2s ease-out'
                    }}>
                      <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold' }}>정보 가져오는 중...</span>
                    </div>
                  </div>

                  <Label required>가격(¥)</Label>
                  <input type="text" placeholder="0" className="premium-input" value={product.price} onChange={(e) => updateProduct(index, 'price', e.target.value.replace(/[^0-9.]/g, ''))} />

                  <Label required>수량</Label>
                  <input type="text" className="premium-input" value={product.quantity} onChange={(e) => updateProduct(index, 'quantity', e.target.value.replace(/[^0-9]/g, ''))} />

                  <Label>옵션</Label>
                  <div style={{ gridColumn: 'span 3' }}>
                    <input type="text" placeholder="색상, 사이즈 등" className="premium-input" value={product.option} onChange={(e) => updateProduct(index, 'option', e.target.value)} />
                  </div>

                  <Label>요청사항</Label>
                  <div style={{ gridColumn: 'span 3' }}>
                    <input type="text" placeholder="배송 또는 포장 관련 요청사항을 적어주세요." className="premium-input" value={product.request} onChange={(e) => updateProduct(index, 'request', e.target.value)} />
                  </div>
                </div>

                {/* 서비스 옵션 및 분류 영역 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="service-box" onClick={() => updateProduct(index, 'photoService', product.photoService === 'none' ? 'apply' : 'none')}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color: '#111827' }}>📷 사진 검수 (+200엔)</p>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input type="radio" checked={product.photoService === 'none'} readOnly style={{ accentColor: '#6366f1' }} /> 미신청
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input type="radio" checked={product.photoService === 'apply'} readOnly style={{ accentColor: '#6366f1' }} /> 신청
                      </label>
                    </div>
                  </div>

                  <div className="service-box" onClick={() => updateProduct(index, 'packingService', product.packingService === 'none' ? 'apply' : 'none')}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color: '#111827' }}>📦 포장 보완 (+200엔~)</p>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input type="radio" checked={product.packingService === 'none'} readOnly style={{ accentColor: '#6366f1' }} /> 미신청
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input type="radio" checked={product.packingService === 'apply'} readOnly style={{ accentColor: '#6366f1' }} /> 신청
                      </label>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '32px' }}>
          <button className="premium-btn btn-dark" onClick={handleAddProductForm}>
            ➕ 상품 폼 추가
          </button>
        </div>

        {/* 합계 카드 */}
        <div className="premium-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '32px', background: 'linear-gradient(to right, #f8fafc, #f1f5f9)' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b', fontWeight: '600' }}>총 상품 금액 (엔화)</p>
            <span style={{ fontSize: '28px', fontWeight: '700', color: '#334155' }}>¥{totalJPY.toLocaleString()}</span>
          </div>
          <div style={{ fontSize: '24px', color: '#94a3b8' }}>+</div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b', fontWeight: '600' }}>예상 수수료</p>
            <span style={{ fontSize: '28px', fontWeight: '700', color: '#334155' }}>¥0</span>
          </div>
          <div style={{ fontSize: '24px', color: '#94a3b8' }}>=</div>
          <div style={{ textAlign: 'center', padding: '16px 32px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#4f46e5', fontWeight: '700' }}>총 {products.length}개 상품 결제 예상</p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '32px', fontWeight: '800', color: '#111827', lineHeight: '1' }}>¥{totalJPY.toLocaleString()}</span>
              <span style={{ fontSize: '15px', fontWeight: '600', color: '#ef4444', marginTop: '6px' }}>약 {totalKRW.toLocaleString()}원</span>
            </div>
          </div>
        </div>

        {/* 하단 최종 버튼 영역 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '40px' }}>
          <button className="premium-btn btn-primary" onClick={handleAddToCart}>
            🛍️ 장바구니 담기
          </button>
        </div>
      </div>
    </>
  );
}

function Label({ children, required }: { children: React.ReactNode, required?: boolean }) {
  return (
    <div style={{ fontSize: '13px', fontWeight: '700', color: '#4b5563', display: 'flex', alignItems: 'center' }}>
      {children}
      {required && <span style={{ color: '#ef4444', marginLeft: '4px', fontSize: '14px' }}>*</span>}
    </div>
  );
}
