"use client";
import React, { useState, useRef, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useExchangeRate } from '@/app/context/ExchangeRateContext';
import { useRouter } from 'next/navigation';
// 🌟 MikuAlertContext 임포트 경로 확인
import { useMikuAlert } from '@/app/context/MikuAlertContext';
import { ORDER_TYPE, OrderType, ORDER_STATUS } from '@/src/types/order';
import { calculateTieredPaymentFee, calculateTieredAgencyFee, toChargeableWon, DEFAULT_PAYMENT_FEE_RULE, DEFAULT_AGENCY_FEE_RULE, OrderFeeRule } from '@/src/utils/feeCalculator';
import {
  Camera, PackageCheck, ImagePlus, Link2, Trash2, RotateCcw, Plus, Minus, PenLine, Loader2,
  ShoppingCart, Truck, Lightbulb, Wallet, ChevronRight, ClipboardList, CreditCard, RefreshCw,
  CircleCheck, CircleAlert, Info,
} from 'lucide-react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPurchase = type === ORDER_TYPE.PURCHASE;

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

  // 🌟 상품 1건(=입력 폼 한 장)마다의 금액. 수수료는 mypage/status와 같은 구간 정액 계산식입니다.
  const itemSummaries = useMemo(() => products.map(p => {
    const priceTotal = (parseFloat(p.price) || 0) * (parseInt(p.quantity) || 0);
    const shipping = parseFloat(p.domesticShippingFee) || 0;
    const transfer = calculateTieredPaymentFee(priceTotal, paymentFeeRule);
    const agency = calculateTieredAgencyFee(parseInt(p.quantity) || 0, agencyFeeRule);
    return { priceTotal, shipping, transfer, agency, total: priceTotal + shipping + transfer + agency };
  }), [products, paymentFeeRule, agencyFeeRule]);

  // 🌟 실시간 금액 계산 로직 (상품별 금액의 합)
  const {
    totalProductPrice,
    totalTransferFee,
    totalAgencyFee,
    totalJPY,
    totalKRW
  } = useMemo(() => {
    const sum = (key: 'priceTotal' | 'shipping' | 'transfer' | 'agency' | 'total') =>
      itemSummaries.reduce((acc, s) => acc + s[key], 0);
    const jpySum = sum('total');
    return {
      totalProductPrice: sum('priceTotal'),
      totalTransferFee: sum('transfer'),
      totalAgencyFee: sum('agency'),
      totalJPY: jpySum,
      // 마이페이지 결제 금액과 같은 규칙(100원 단위 올림)을 씁니다.
      totalKRW: toChargeableWon(jpySum, exchangeRate)
    };
  }, [itemSummaries, exchangeRate]);

  const filledCount = products.filter(p => p.url && parseFloat(p.price) > 0).length;
  const isMoneyShort = totalKRW > 0 && myMoney < totalKRW;

  const updateProduct = (index: number, field: keyof ProductForm, value: any) => {
    setProducts(prev => {
      const newProducts = [...prev];
      newProducts[index] = { ...newProducts[index], [field]: value };
      return newProducts;
    });
  };

  const changeQuantity = (index: number, delta: number) => {
    const current = parseInt(products[index].quantity) || 0;
    updateProduct(index, 'quantity', String(Math.max(1, current + delta)));
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

  // 주소를 넣고 칸을 벗어나면 상품 이름·가격·사진을 대신 채웁니다.
  // 못 채워도 그냥 둡니다. 손님이 직접 적으면 되는 일이라 오류를 띄우지 않습니다.
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

        // 가격과 사진은 **비어 있을 때만** 채웁니다.
        // 손님이 이미 적어 둔 값을 자동 수집이 덮으면, 고쳐 놓은 게 사라져 버립니다.
        if (data.price && !product.price) updateProduct(index, 'price', String(data.price));
        if (data.imageUrl && !product.image) updateProduct(index, 'image', data.imageUrl);
      }
    } catch (error) {
      console.error("상품 정보 수집 실패:", error);
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
      else showAlert(data.error || data.message || '이미지 업로드에 실패했습니다.', 'error');
    } catch (error) {
      console.error("Image Upload Error:", error);
    } finally {
      updateProduct(index, 'isAutoFetching', false);
    }
  };

  // 🌟 async 함수로 명확하게 정의
  const handleAddToCart = async () => {
    if (isSubmitting) return;
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
    const confirmMsg = isPurchase
      ? `총 ${products.length}개의 상품을 장바구니에 담으시겠습니까?`
      : `총 ${products.length}개의 상품에 대해 배송 신청을 하시겠습니까?`;

    try {
      const isConfirmed = await showConfirm(confirmMsg);
      if (!isConfirmed) return; // '취소' 클릭 시 중단
      setIsSubmitting(true);

      // 3. 주문 생성 로직
      const promises = products.map((p, idx) => {
        const totalPrice = parseFloat(p.price) * (parseInt(p.quantity) || 1);
        const initialStatus = isPurchase ? ORDER_STATUS.CART : ORDER_STATUS.PAID;
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
      // 🌟 [버그 수정] 예전엔 every(async ...)라 Promise(항상 truthy)를 검사해서 실패해도
      // 성공으로 처리됐습니다. 응답 본문을 모두 읽은 뒤 실제 success 값으로 판단합니다.
      const results = await Promise.all(responses.map(res => res.json().catch(() => ({ success: false }))));
      const allSuccess = results.every((r: any) => r && r.success);

      if (allSuccess) {
        showAlert(isPurchase ? '🛒 모든 상품이 장바구니에 담겼습니다!' : '🚀 배송 신청이 완료되었습니다!', 'success');
        setTimeout(() => router.push(`/mypage/status?tab=${isPurchase ? ORDER_STATUS.CART : ORDER_STATUS.PAID}`), 1500);
      } else {
        showAlert(`일부 상품 저장 중 오류가 발생했습니다.`, 'error');
        setIsSubmitting(false);
      }

    } catch (error) {
      console.error("Add to cart error:", error);
      showAlert("서버 통신 중 오류가 발생했습니다.", 'error');
      setIsSubmitting(false);
    }
  };

  const steps = isPurchase
    ? [
        { icon: ClipboardList, title: '상품 정보 입력', desc: 'URL · 가격 · 수량' },
        { icon: ShoppingCart, title: '장바구니 담기', desc: '여러 상품 한 번에' },
        { icon: CreditCard, title: '머니로 결제', desc: '마이페이지에서 진행' },
      ]
    : [
        { icon: ClipboardList, title: '상품 정보 입력', desc: 'URL · 가격 · 배송비' },
        { icon: Truck, title: '배송대행 신청', desc: '신청 즉시 접수' },
        { icon: PackageCheck, title: '입고 · 발송', desc: '진행 상황 알림' },
      ];

  return (
    <div className={`premium-container pf-root ${isPurchase ? 'pf-theme-purchase' : 'pf-theme-delivery'}`}>

      {/* 🌟 진행 단계 */}
      <ol className="pf-steps" aria-label="신청 진행 단계">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className={`pf-step ${i === 0 ? 'is-current' : ''}`}>
              <span className="pf-step-icon"><Icon size={17} strokeWidth={2.1} /></span>
              <span className="pf-step-text">
                <span className="pf-step-no">STEP {i + 1}</span>
                <strong>{step.title}</strong>
                <span className="pf-step-desc">{step.desc}</span>
              </span>
              {i < steps.length - 1 && <ChevronRight className="pf-step-arrow" size={16} strokeWidth={2.2} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      {/* 🌟 유의사항 */}
      <div className="pf-notice">
        <span className="pf-notice-icon" aria-hidden="true"><Lightbulb size={18} strokeWidth={2.1} /></span>
        <div className="pf-notice-body">
          <strong className="pf-notice-title">{isPurchase ? '구매대행 유의사항' : '배송대행 유의사항'}</strong>
          <ul>
            {isPurchase ? (
              <>
                <li><b>미쿠짱 머니 충전</b> 이후 결제할 수 있어요. 담은 상품은 마이페이지 장바구니에서 결제합니다.</li>
                <li>여러 상품을 한 번에 추가해 장바구니에 담을 수 있어요.</li>
              </>
            ) : (
              <>
                <li>일본 현지에서 이미 구매하신 상품의 정보를 정확히 입력해주세요.</li>
                <li>사진 검수 · 포장 보완이 필요하면 상품별 부가 서비스에서 선택해주세요.</li>
              </>
            )}
          </ul>
        </div>
        {isPurchase && (
          <Link href="/mypage/money/charge" className="pf-notice-link">
            <Wallet size={14} strokeWidth={2.2} />머니 충전
          </Link>
        )}
      </div>

      <div className="pf-section-head">
        <div>
          <span className="pf-eyebrow">Products</span>
          <h3 className="pf-section-title">신청 상품 정보</h3>
        </div>
        <span className="pf-count-chip">
          총 <b>{products.length}</b>건{filledCount < products.length ? ` · 입력 완료 ${filledCount}건` : ''}
        </span>
      </div>

      {products.map((product, index) => {
        const summary = itemSummaries[index];
        const priceKrw = Math.floor(summary.priceTotal * exchangeRate);
        return (
          <div key={product.id} className="quote-product-card pf-card">
            <div className="pf-card-head">
              <span className="pf-card-no">{String(index + 1).padStart(2, '0')}</span>
              <label className="pf-name-field">
                <PenLine size={15} strokeWidth={2} className="pf-name-icon" aria-hidden="true" />
                <input
                  type="text" value={product.name}
                  onChange={(e) => updateProduct(index, 'name', e.target.value)}
                  placeholder="상품 이름 (선택)"
                  className="pf-name-input"
                  aria-label={`${index + 1}번째 상품 이름`}
                />
              </label>
              <button type="button" className="pf-remove-btn" onClick={() => handleRemoveProductForm(index)} aria-label={products.length === 1 ? '입력 초기화' : '상품 삭제'} title={products.length === 1 ? '입력 초기화' : '상품 삭제'}>
                {products.length === 1
                  ? <><RotateCcw size={13} strokeWidth={2.2} /><span className="pf-remove-text">초기화</span></>
                  : <><Trash2 size={13} strokeWidth={2.2} /><span className="pf-remove-text">삭제</span></>}
              </button>
            </div>

            <div className="pf-card-body">
              <div className="pf-image-col">
                <button
                  type="button"
                  className={`pf-image-box ${product.image ? 'has-image' : ''}`}
                  onClick={() => fileInputRefs.current[index]?.click()}
                  aria-label="상품 이미지 추가"
                >
                  {product.image ? (
                    <>
                      <img src={product.image} alt="상품 이미지" />
                      <span className="pf-image-overlay"><RefreshCw size={14} strokeWidth={2.2} />변경</span>
                    </>
                  ) : (
                    <span className="pf-image-empty">
                      <span className="pf-image-empty-icon"><ImagePlus size={20} strokeWidth={1.9} /></span>
                      <strong>이미지 추가</strong>
                      <span>선택 사항</span>
                    </span>
                  )}
                </button>
                <input type="file" accept="image/*" style={{ display: 'none' }} ref={el => { fileInputRefs.current[index] = el }} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processImageFile(index, file);
                  e.target.value = '';
                }} />
              </div>

              <div className="pf-fields">
                <div className="pf-field pf-span-2">
                  <FieldLabel required>상품 URL</FieldLabel>
                  <div className="pf-input-wrap">
                    <Link2 size={16} strokeWidth={2} className="pf-input-icon" aria-hidden="true" />
                    <input type="text" inputMode="url" placeholder="https:// 일본 쇼핑몰 상품 주소를 붙여넣어 주세요" className="premium-input pf-input has-icon" value={product.url} onChange={(e) => updateProduct(index, 'url', e.target.value)} onBlur={(e) => fetchProductName(index, e.target.value)} />
                    {product.isAutoFetching && (
                      <span className="pf-fetching"><Loader2 size={13} strokeWidth={2.4} className="pf-spin" />정보 수집 중</span>
                    )}
                  </div>
                </div>

                <div className="pf-field">
                  <FieldLabel required>상품 가격</FieldLabel>
                  <div className="pf-input-wrap">
                    <span className="pf-input-prefix" aria-hidden="true">¥</span>
                    <input type="text" inputMode="decimal" placeholder="0" className="premium-input pf-input has-prefix" value={product.price} onChange={(e) => updateProduct(index, 'price', e.target.value.replace(/[^0-9.]/g, ''))} />
                  </div>
                  <span className="pf-field-hint" translate="no">
                    {summary.priceTotal > 0 ? `합계 ¥${summary.priceTotal.toLocaleString()} · 약 ${priceKrw.toLocaleString()}원` : '1개 가격을 엔화로 입력'}
                  </span>
                </div>

                <div className="pf-field">
                  <FieldLabel required>수량</FieldLabel>
                  <div className="pf-stepper">
                    <button type="button" aria-label="수량 줄이기" onClick={() => changeQuantity(index, -1)} disabled={(parseInt(product.quantity) || 0) <= 1}>
                      <Minus size={15} strokeWidth={2.4} />
                    </button>
                    <input type="text" inputMode="numeric" aria-label="수량" value={product.quantity} onChange={(e) => updateProduct(index, 'quantity', e.target.value.replace(/[^0-9]/g, ''))} />
                    <button type="button" aria-label="수량 늘리기" onClick={() => changeQuantity(index, 1)}>
                      <Plus size={15} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>

                {/* 🌟 구매대행(PURCHASE)일 때만 '일본내 배송료' 항목 노출 (견적문의에서는 숨김) */}
                {type === ORDER_TYPE.PURCHASE && !hideDomesticShippingFee && (
                  <div className="pf-field pf-span-2">
                    <FieldLabel>일본내 배송료</FieldLabel>
                    <div className="pf-input-wrap">
                      <span className="pf-input-prefix" aria-hidden="true">¥</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="일본 현지 배송비 (필수 항목 아님, 없으면 0)"
                        className="premium-input pf-input has-prefix"
                        value={product.domesticShippingFee}
                        onChange={(e) => updateProduct(index, 'domesticShippingFee', e.target.value.replace(/[^0-9.]/g, ''))}
                      />
                    </div>
                  </div>
                )}

                <div className="pf-field">
                  <FieldLabel>옵션</FieldLabel>
                  <input type="text" placeholder="색상, 사이즈 등" className="premium-input pf-input" value={product.option} onChange={(e) => updateProduct(index, 'option', e.target.value)} />
                </div>

                <div className="pf-field">
                  <FieldLabel>요청사항</FieldLabel>
                  <input type="text" placeholder="판매자·검수 관련 요청사항" className="premium-input pf-input" value={product.request} onChange={(e) => updateProduct(index, 'request', e.target.value)} />
                </div>

                <div className="pf-field pf-span-2">
                  <FieldLabel>부가 서비스 <span className="pf-label-sub">필요한 항목을 선택하세요</span></FieldLabel>
                  <div className="pf-service-grid">
                    <ServiceOption
                      active={product.photoService === 'apply'}
                      onToggle={() => updateProduct(index, 'photoService', product.photoService === 'none' ? 'apply' : 'none')}
                      iconClass="icon-sky"
                      icon={<Camera size={17} strokeWidth={2.2} />}
                      title="사진 검수"
                      desc="현지 도착 후 상품 촬영"
                    />
                    <ServiceOption
                      active={product.packingService === 'apply'}
                      onToggle={() => updateProduct(index, 'packingService', product.packingService === 'none' ? 'apply' : 'none')}
                      iconClass="icon-emerald"
                      icon={<PackageCheck size={17} strokeWidth={2.2} />}
                      title="포장 보완"
                      desc="파손 방지 안전 재포장"
                    />
                  </div>
                </div>
              </div>
            </div>

            {isPurchase && (
              <div className="pf-card-foot" translate="no">
                <span className="pf-foot-label">이 상품 예상 금액</span>
                <span className="pf-foot-detail">
                  상품 ¥{summary.priceTotal.toLocaleString()} + 수수료 ¥{(summary.transfer + summary.agency + summary.shipping).toLocaleString()}
                </span>
                <strong className="pf-foot-total">¥{summary.total.toLocaleString()}</strong>
              </div>
            )}
          </div>
        );
      })}

      <button type="button" className="pf-add-btn" onClick={handleAddProductForm}>
        <span className="pf-add-icon"><Plus size={16} strokeWidth={2.6} /></span>
        상품 추가하기
        <span className="pf-add-sub">여러 상품을 한 번에 신청할 수 있어요</span>
      </button>

      {isPurchase && (
        <div className="quote-payment-wrapper pf-summary">
          <div className="pf-section-head pf-summary-head">
            <div>
              <span className="pf-eyebrow">Estimate</span>
              <h3 className="pf-section-title">결제 예상 금액</h3>
            </div>
            {exchangeRate > 0 && (
              <span className="pf-rate-chip" translate="no">적용 환율 ¥100 = {(Math.round(exchangeRate * 100 * 100) / 100).toLocaleString()}원</span>
            )}
          </div>
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
              <span className="pf-total-accent" aria-hidden="true" />
              <span className="quote-total-label">최종 결제예상액</span>
              <span className="quote-total-value"><span translate="no">₩{totalKRW.toLocaleString()}</span></span>
              <span className="pf-total-jpy" translate="no">¥{totalJPY.toLocaleString()}</span>
              <span className={`quote-my-money-info pf-money ${isMoneyShort ? 'insufficient' : ''}`}>
                {isMoneyShort ? <CircleAlert size={13} strokeWidth={2.4} /> : <CircleCheck size={13} strokeWidth={2.4} />}
                내 미쿠짱 머니 <b translate="no">₩{myMoney.toLocaleString()}</b>
              </span>
            </div>
          </div>
          <p className="pf-summary-note">
            <Info size={14} strokeWidth={2.2} aria-hidden="true" />
            <span>국제 배송비는 상품이 일본 창고에 도착해 무게를 측정한 뒤 2차 결제로 청구됩니다.</span>
          </p>
        </div>
      )}

      <div className="bottom-btn-wrap pf-action-bar">
        <div className="pf-action-info">
          {isPurchase ? (
            isMoneyShort ? (
              <>
                <span className="pf-action-title is-warn"><CircleAlert size={15} strokeWidth={2.3} />머니가 부족해요</span>
                <span className="pf-action-desc">장바구니에는 담을 수 있고, 결제 전에 <Link href="/mypage/money/charge">머니를 충전</Link>하면 됩니다.</span>
              </>
            ) : (
              <>
                <span className="pf-action-title"><ShoppingCart size={15} strokeWidth={2.3} />상품 {products.length}건을 장바구니에 담아요</span>
                <span className="pf-action-desc">결제는 마이페이지 › 장바구니에서 진행됩니다.</span>
              </>
            )
          ) : (
            <>
              <span className="pf-action-title"><Truck size={15} strokeWidth={2.3} />상품 {products.length}건을 배송대행 신청해요</span>
              <span className="pf-action-desc">신청 후 마이페이지에서 진행 상황을 확인할 수 있어요.</span>
            </>
          )}
        </div>
        {isPurchase ? (
          <button type="button" className="quote-cart-btn pf-submit-btn" onClick={handleAddToCart} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={18} strokeWidth={2.4} className="pf-spin" /> : <ShoppingCart size={18} strokeWidth={2.2} />}
            장바구니 담기
          </button>
        ) : (
          <button type="button" className="quote-delivery-btn pf-submit-btn" onClick={handleAddToCart} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={18} strokeWidth={2.4} className="pf-spin" /> : <Truck size={18} strokeWidth={2.2} />}
            배송대행 신청
          </button>
        )}
      </div>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode, required?: boolean }) {
  return (
    <span className="pf-label">
      {children}
      {required && <span className="pf-required" aria-label="필수">필수</span>}
    </span>
  );
}

function ServiceOption({ active, onToggle, iconClass, icon, title, desc }: {
  active: boolean; onToggle: () => void; iconClass: string; icon: React.ReactNode; title: string; desc: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      className={`quote-service-box pf-service ${active ? 'active' : ''}`}
      onClick={onToggle}
    >
      <span className={`quote-service-icon ${iconClass}`}>{icon}</span>
      <span className="quote-service-text">
        <strong>{title}</strong>
        <span>{desc}</span>
      </span>
      <span className="quote-service-check">
        {active && (
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
    </button>
  );
}
