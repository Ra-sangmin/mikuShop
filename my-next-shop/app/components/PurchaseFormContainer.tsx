"use client";
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useExchangeRate } from '@/app/context/ExchangeRateContext';
import { useCart } from '@/app/context/CartContext';
import { useRouter } from 'next/navigation';
// 🌟 MikuAlertContext 임포트 경로 확인
import { useMikuAlert } from '@/app/context/MikuAlertContext'; 
import { ORDER_TYPE, OrderType, ORDER_STATUS } from '@/src/types/order';
import { calculateTieredPaymentFee, calculateTieredAgencyFee, DEFAULT_PAYMENT_FEE_RULE, DEFAULT_AGENCY_FEE_RULE, OrderFeeRule } from '@/src/utils/feeCalculator';
import { Camera, PackageCheck, ImagePlus } from 'lucide-react';
import './purchase-form-container.css';

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
  // 🌟 purchase/quote(견적문의), purchase/request(구매대행 신청)에서는 이 입력란을
  // 감춥니다. delivery/request(배송신청)에서는 실제 현지 배송비가 필요해 계속 노출됩니다.
  hideDomesticShippingFee?: boolean;
}

export default function PurchaseFormContainer({ type, hideDomesticShippingFee }: Props) {
  const [products, setProducts] = useState<ProductForm[]>([{ ...initialProduct }]);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { showAlert, showConfirm } = useMikuAlert(); 
  const { exchangeRate } = useExchangeRate();
  const router = useRouter();

  // 🌟 mypage/status의 "내 미쿠짱 머니" 잔액 표시와 동일하게, 이 견적 화면에서도
  // 결제 예상액과 나란히 현재 잔액을 보여주기 위해 동일한 방식(/api/users?id=)으로 조회합니다.
  const [myMoney, setMyMoney] = useState(0);
  useEffect(() => {
    const storedId = localStorage.getItem('user_id');
    if (!storedId) return;
    fetch(`/api/users?id=${storedId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setMyMoney(data.user?.cyberMoney || 0);
      })
      .catch(() => {});
  }, []);

  // 🌟 결제/대행 수수료 구간 변수를 DB(order_fee_rules)에서 받아옵니다. 응답 전에는
  // feeCalculator.ts의 기본값(DB 시드값과 동일)을 그대로 써서 화면이 비어 보이지 않습니다.
  const [paymentFeeRule, setPaymentFeeRule] = useState<OrderFeeRule>(DEFAULT_PAYMENT_FEE_RULE);
  const [agencyFeeRule, setAgencyFeeRule] = useState<OrderFeeRule>(DEFAULT_AGENCY_FEE_RULE);
  useEffect(() => {
    fetch('/api/order-fee-rules')
      .then(res => res.json())
      .then(data => {
        if (!data.success || !Array.isArray(data.rules)) return;
        const payment = data.rules.find((r: any) => r.feeType === 'PAYMENT');
        if (payment) setPaymentFeeRule(payment);
        const agency = data.rules.find((r: any) => r.feeType === 'AGENCY');
        if (agency) setAgencyFeeRule(agency);
      })
      .catch(() => {});
  }, []);

  // 🌟 실시간 금액 계산 로직 (useMemo로 최적화)
  // 🌟 [버그 수정] 예전엔 DB 설정값(feeSettings.TRANSFER/AGENCY)에 "상품 개수"를 곱하는
  // 전혀 다른 공식을 썼는데, 정작 장바구니에 담긴 뒤(mypage/status)에는 상품 1건의
  // 가격/수량 구간에 따라 정액 부과하는 계산식(calculateTieredPaymentFee/AgencyFee)이
  // 적용돼 있어서, 이 견적 화면에서 본 금액과 실제 결제 화면에서 청구되는 금액이 서로
  // 어긋났습니다. mypage/status와 동일한 계산식을 그대로 가져다 씁니다.
  const {
    totalProductPrice,
    totalDomesticShipping,
    totalTransferFee,
    totalAgencyFee,
    totalFees,
    totalJPY,
    totalKRW
  } = useMemo(() => {
    // 순수 상품가 합계 (가격 * 수량)
    const productPriceSum = products.reduce((sum, p) =>
      sum + ((parseFloat(p.price) || 0) * (parseInt(p.quantity) || 0)), 0);

    // 일본내 배송료 합계
    const shippingSum = products.reduce((sum, p) =>
      sum + (parseFloat(p.domesticShippingFee) || 0), 0);

    // 🌟 수수료는 상품 1건(=한 줄의 입력 폼, 실제로도 주문 1건으로 저장됨)마다 각자의
    // 가격 총액/수량 구간을 기준으로 계산한 뒤 합산합니다 (개수 곱하기가 아닙니다).
    const transferSum = products.reduce((sum, p) => {
      const priceTotal = (parseFloat(p.price) || 0) * (parseInt(p.quantity) || 0);
      return sum + calculateTieredPaymentFee(priceTotal, paymentFeeRule);
    }, 0);
    const agencySum = products.reduce((sum, p) =>
      sum + calculateTieredAgencyFee(parseInt(p.quantity) || 0, agencyFeeRule), 0);

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
  }, [products, exchangeRate, paymentFeeRule, agencyFeeRule]);

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
      const promises = products.map((p, idx) => {
        const totalPrice = parseFloat(p.price) * (parseInt(p.quantity) || 1);
        const initialStatus = type === ORDER_TYPE.PURCHASE ? ORDER_STATUS.CART : ORDER_STATUS.PAID;
        // 🌟 상품 이름을 입력하지 않았다면 카드 헤더에 표시되는 순번(예: "1")과 동일한
        // 기준으로 "상품 N"을 자동으로 채워줍니다.
        const productName = p.name.trim() || `상품 ${idx + 1}`;

        return fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            type: type,
            productName: productName,
            productPrice: totalPrice,
            // 🌟 [버그 수정] 이 필드가 빠져있어서 견적 화면에서 입력한 수량이 저장되지 않고
            // mypage/status에서는 항상 수량 1개로 취급돼(기본값), 대행 수수료 구간이 잘못
            // 계산되는 원인이 됐습니다. 실제 입력한 수량을 그대로 저장합니다.
            productCount: parseInt(p.quantity) || 1,
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
      <div className="premium-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '30px 20px', fontFamily: '"Noto Sans KR", sans-serif' }}>
        
        <p className="quote-notice">
          <span className="quote-notice-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
            </svg>
          </span>
          <span>
            <strong>구매대행 유의사항</strong><br/>
            <strong>사이버머니 충전</strong> 이후 신청 가능하며, 여러 상품을 한 번에 추가하여 장바구니에 담을 수 있습니다.
          </span>
        </p>

        {products.map((product, index) => (
          <div key={product.id} className="quote-product-card">
            <div className="quote-product-header">
              <div className="quote-product-header-left">
                <span className="quote-product-badge">{index + 1}</span>
                <input
                  type="text" value={product.name}
                  onChange={(e) => updateProduct(index, 'name', e.target.value)}
                  placeholder="상품 이름을 입력해주세요"
                  className="quote-product-name-input"
                />
              </div>
              <button className="quote-product-remove-btn" onClick={() => handleRemoveProductForm(index)}>
                {products.length === 1 ? '초기화' : '삭제'}
              </button>
            </div>

            <div className="product-card-inner" style={{ padding: '24px', display: 'flex', gap: '30px' }}>
              <div className="image-upload-wrapper" style={{ width: '140px', flexShrink: 0 }}>
                <div className="quote-image-upload-box"
                  onClick={() => fileInputRefs.current[index]?.click()}
                >
                  {product.image ? (
                    <img src={product.image} alt="product" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9ca3af' }}>
                      <ImagePlus size={20} strokeWidth={1.75} />
                      이미지 추가
                    </span>
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

                  {/* 🌟 구매대행(PURCHASE)일 때만 '일본내 배송료' 항목 노출 (견적문의에서는 숨김) */}
                  {type === ORDER_TYPE.PURCHASE && !hideDomesticShippingFee && (
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
                    className={`quote-service-box ${product.photoService === 'apply' ? 'active' : ''}`}
                    onClick={() => updateProduct(index, 'photoService', product.photoService === 'none' ? 'apply' : 'none')}
                  >
                    <span className="quote-service-icon icon-sky">
                      <Camera size={17} strokeWidth={2.2} />
                    </span>
                    <div className="quote-service-text">
                      <strong>사진 검수</strong>
                      <span>현지 도착 후 촬영</span>
                    </div>
                    <span className="quote-service-check">
                      {product.photoService === 'apply' && (
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                  </div>

                  <div
                    className={`quote-service-box ${product.packingService === 'apply' ? 'active' : ''}`}
                    onClick={() => updateProduct(index, 'packingService', product.packingService === 'none' ? 'apply' : 'none')}
                  >
                    <span className="quote-service-icon icon-emerald">
                      <PackageCheck size={17} strokeWidth={2.2} />
                    </span>
                    <div className="quote-service-text">
                      <strong>포장 보완</strong>
                      <span>안전한 재포장</span>
                    </div>
                    <span className="quote-service-check">
                      {product.packingService === 'apply' && (
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
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
          <div className="quote-payment-wrapper">
            <div className="quote-payment-content-flex">
              <div className="quote-detail-grid">
                <div className="quote-detail-item">
                  <span className="quote-item-label">상품 가격</span>
                  <span className="quote-item-val"><span translate="no">¥{totalProductPrice.toLocaleString()}</span></span>
                </div>
                <div className="quote-detail-item">
                  <span className="quote-item-label">결제 수수료</span>
                  <span className="quote-item-val"><span translate="no">¥{totalTransferFee.toLocaleString()}</span></span>
                </div>
                <div className="quote-detail-item">
                  <span className="quote-item-label">대행 수수료</span>
                  <span className="quote-item-val"><span translate="no">¥{totalAgencyFee.toLocaleString()}</span></span>
                </div>
              </div>

              <div className="quote-total-box">
                <span className="quote-total-label">최종 결제예상액 (원화)</span>
                <span className="quote-total-value"><span translate="no">₩{totalKRW.toLocaleString()}</span></span>
                <span className={`quote-my-money-info ${myMoney < totalKRW ? 'insufficient' : ''}`}>
                  내 미쿠짱 머니 <span translate="no">₩{myMoney.toLocaleString()}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bottom-btn-wrap" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
          {type === ORDER_TYPE.PURCHASE ? (
            <button className="quote-cart-btn" onClick={handleAddToCart}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="20" r="1.4" />
                <circle cx="18" cy="20" r="1.4" />
                <path d="M2.5 3h2l2.6 12.6a2 2 0 0 0 2 1.6h8.3a2 2 0 0 0 2-1.6L21 8H6" />
              </svg>
              장바구니 담기
            </button>
          ) : (
            <button className="quote-delivery-btn" onClick={handleAddToCart}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="6" width="14" height="11" rx="1.5" />
                <path d="M15 10h3.5a1.5 1.5 0 0 1 1.3.75L22 14v3h-7" />
                <circle cx="6" cy="19" r="1.6" />
                <circle cx="17.5" cy="19" r="1.6" />
              </svg>
              배송대행 신청
            </button>
          )}
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