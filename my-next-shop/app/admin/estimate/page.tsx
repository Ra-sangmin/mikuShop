'use client';

import React, { useState, useEffect } from 'react';
import '../admin-common.css';

export default function PremiumEstimatePage() {
  const [exchangeRate, setExchangeRate] = useState(0);
  // 🌟 네이버에서 실시간 환율을 못 가져와 임시값(9.05)으로 대체됐는지 여부
  const [exchangeRateFetchFailed, setExchangeRateFetchFailed] = useState(false);
  const [addRate, setAddRate] = useState<number>(0);
  // 🌟 "환율을 몇 엔 기준으로 다시 계산해서 보여줄지"의 기준값 (api/estimate의 getExchangeRateBasisUnit)
  const [rateBasisUnit, setRateBasisUnit] = useState<number>(100);

  const [salePrice, setSalePrice] = useState<number>(0);
  const [paymentFee, setPaymentFee] = useState<number>(0);
  const [dailyTax, setDailyTax] = useState<number>(0);
  
  const [quantity, setQuantity] = useState<number>(1);
  const [agencyFee, setAgencyFee] = useState<number>(300);

  const [resultCount, setResultCount] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isApplyingGlobal, setIsApplyingGlobal] = useState<boolean>(false);
  // 🌟 모바일에서 "환율 및 마진 설정" 패널을 접었다 펼 수 있도록 하는 상태 (데스크톱에서는 CSS로 항상 펼쳐둡니다)
  const [isRateSectionOpen, setIsRateSectionOpen] = useState<boolean>(true);

  // 🌟 모바일(480px 이하)에서는 이 패널이 기본적으로 접힌 상태로 시작하도록 합니다.
  useEffect(() => {
    if (window.innerWidth <= 480) {
      setIsRateSectionOpen(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ salePrice: 0, quantityCount: 0 })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setExchangeRate(data.data.baseExchangeRate);
        setExchangeRateFetchFailed(!!data.data.exchangeRateFetchFailed);
        setRateBasisUnit(data.data.exchangeRateBasisUnit);
        // 🌟 추가 증가액 기본값을 api/estimate의 getAdditionalRate 값(환율 단위)에
        // getExchangeRateBasisUnit 기준값을 곱해 "원" 단위로 환산해 초기화합니다.
        setAddRate(data.data.additionalRate * data.data.exchangeRateBasisUnit);
      }
    });
  }, []);

  useEffect(() => {
    if (salePrice === 0) setPaymentFee(0);
    else setPaymentFee(salePrice < 30000 ? 220 : 330);
  }, [salePrice]);

  useEffect(() => {
    if (quantity === 0) setAgencyFee(0);
    else setAgencyFee(quantity < 4 ? 300 : quantity * 100);
  }, [quantity]);

  useEffect(() => {
    const fetchCalculate = async () => {
      const res = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salePrice,
          quantityCount: quantity,
          addRate: addRate, 
          dailyTax
        })
      });
      
      const data = await res.json();
      if (data.success) {
        const apiResult = data.data;
        setResultCount(apiResult.finalPriceWon);
        // 🌟 여기서 exchangeRate를 다시 설정하지 않습니다. 이 요청은 forceRefresh 없이 보내서
        // Next.js fetch 캐시(revalidate: 300)로 예전 환율이 돌아올 수 있는데, 그 값으로
        // 방금 "새로고침" 버튼이 정확히 받아온 최신 환율을 덮어써버리는 버그가 있었습니다.
        // 환율 표시는 최초 로드와 새로고침 버튼(handleForceRefresh)에서만 갱신합니다.
      }
    };

    const timeoutId = setTimeout(() => {
      fetchCalculate();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [salePrice, quantity, addRate, dailyTax, paymentFee, agencyFee]);

  const handleCopyAmount = () => {
    const formattedAmount = `${resultCount.toLocaleString()}원`;
    
    // 1. HTTPS 환경 또는 로컬호스트 (클립보드 API 지원)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(formattedAmount)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000); 
        })
        .catch((err) => console.error('복사 실패:', err));
    } else {
      // 2. HTTP 테스트 환경 (우회 로직)
      const textArea = document.createElement('textarea');
      textArea.value = formattedAmount;
      
      // 화면에 보이지 않도록 처리
      textArea.style.position = 'absolute';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      
      textArea.select();
      
      try {
        document.execCommand('copy');
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('복사 실패:', err);
      } finally {
        textArea.remove(); // 사용 후 임시 태그 제거
      }
    }
  };

  const handleForceRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      const res = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salePrice,
          quantityCount: quantity,
          addRate, 
          dailyTax,
          forceRefresh: true
        })
      });
      const data = await res.json();
      if (data.success) {
        setExchangeRate(data.data.baseExchangeRate);
        setExchangeRateFetchFailed(!!data.data.exchangeRateFetchFailed);
        setResultCount(data.data.finalPriceWon);
        // 🌟 추가 증가액도 DB(ExchangeRateConfig)에서 바뀌었을 수 있으므로, 새로고침 시 함께 재동기화합니다.
        setRateBasisUnit(data.data.exchangeRateBasisUnit);
        setAddRate(data.data.additionalRate * data.data.exchangeRateBasisUnit);
        // 🌟 admin/layout.tsx 헤더의 "현재 환율" 표시도 즉시 갱신되도록 알려줍니다.
        window.dispatchEvent(new Event('exchangeRateConfigUpdated'));
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const handleApplyGlobally = async () => {
    if (isApplyingGlobal) return;
    setIsApplyingGlobal(true);

    try {
      const res = await fetch('/api/estimate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ additionalRate: addRate / rateBasisUnit })
      });
      const data = await res.json();
      if (data.success) {
        alert(`추가 증가액 ${addRate}원이 전역 적용되었습니다.`);
        // 🌟 admin/layout.tsx 헤더의 "추가 증가액" 표시도 즉시 갱신되도록 알려줍니다.
        window.dispatchEvent(new Event('exchangeRateConfigUpdated'));
      } else {
        alert(data.message || '전역 적용 중 오류가 발생했습니다.');
      }
    } catch (error) {
      alert('전역 적용 중 오류가 발생했습니다.');
    } finally {
      setIsApplyingGlobal(false);
    }
  };

  return (
    <div className="premium-calc-wrapper">
      <div className="calc-container">
        
        <header className="calc-header">
          <h1 className="title">예상 견적 계산기</h1>
        </header>

        <div className="calc-flex-column">
          
          {/* ================= 1. 환율 및 마진 설정 ================= */}
          <div className="premium-card">
            <h3
              className="card-title admin-title-font collapsible-card-title"
              onClick={() => setIsRateSectionOpen(open => !open)}
            >
              <span>환율 및 마진 설정 <span className="card-title-note">({rateBasisUnit}엔 기준)</span></span>
              <svg className={`collapse-chevron ${isRateSectionOpen ? '' : 'closed'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </h3>

            {!isRateSectionOpen && (
              <div className="collapsed-final-rate">
                최종 표시 환율 <span className="collapsed-final-rate-value">{(exchangeRate * rateBasisUnit + addRate).toFixed(2)}원</span>
              </div>
            )}

            <div className={`input-group ${isRateSectionOpen ? '' : 'collapsed'}`}>
              <div className="input-row read-only-row admin-flex-between">
                <span className="label"><span className="color-dot bg-rate"></span>현재 환율</span>
                
                <div
                  className={`value-box highlight-rate refresh-box ${isRefreshing ? 'is-refreshing' : ''} ${exchangeRateFetchFailed ? 'fetch-failed' : ''}`}
                  onClick={handleForceRefresh}
                  title={exchangeRateFetchFailed ? '환율 조회 실패 - 클릭하여 다시 시도' : '클릭하여 환율 즉시 새로고침'}
                >
                  {exchangeRateFetchFailed ? (
                    <span className="fetch-failed-text">⚠️ 환율 조회 실패 (임시값)</span>
                  ) : (
                    <>{(exchangeRate * rateBasisUnit).toFixed(2)} <span className="unit">원</span></>
                  )}
                </div>

              </div>
              <div className="input-row admin-flex-between">
                <span className="label"><span className="color-dot bg-add"></span>추가 증가액</span>
                <div className="input-with-unit">
                  <input type="number" value={addRate || ''} onChange={e => setAddRate(Number(e.target.value))} placeholder="0" className="c-add" />
                  <span className="unit">원</span>
                </div>
              </div>

              <div className="input-row read-only-row admin-flex-between">
                <span className="label"><span className="color-dot bg-final"></span>최종 표시 환율</span>
                <div className="value-box highlight-final">
                  {(exchangeRate * rateBasisUnit + addRate).toFixed(2)} <span className="unit">원</span>
                </div>
              </div>

              <div className="global-apply-divider" />

              <button
                className="global-apply-btn"
                onClick={handleApplyGlobally}
                disabled={isApplyingGlobal}
              >
                추가 증가액 적용
              </button>
              <p className="global-apply-warning">
                ※ 이 버튼 클릭시 홈페이지 모든 유저가{' '}
                <br className="warning-break" />
                <strong className="global-apply-warning-highlight">최종 표시 환율</strong>{' '}
                <br className="warning-break" />
                금액으로 표시됩니다.
              </p>
            </div>
          </div>

          {/* ================= 2. 상품 및 수수료 정보 ================= */}
          <div className="premium-card">
            <h3 className="card-title admin-title-font">상품 및 수수료 정보</h3>
            <div className="input-group">
              
              <div className="bundled-group">
                <div className="input-row admin-flex-between">
                  <span className="label"><span className="color-dot bg-qty"></span>상품 수량</span>
                  <div className="quantity-control">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="qty-btn">−</button>
                    <span className="qty-val">{quantity}</span>
                    <button onClick={() => setQuantity(q => q + 1)} className="qty-btn">+</button>
                  </div>
                </div>

                <div className="input-row read-only-row admin-flex-between">
                  <span className="label"><span className="color-dot bg-agency"></span>대행 수수료</span>
                  <div className="value-box highlight-agency">
                    {agencyFee} <span className="unit">엔</span>
                  </div>
                </div>
              </div>

              <div className="input-row admin-flex-between">
                <span className="label"><span className="color-dot bg-price"></span>상품 가격</span>
                <div className="input-with-unit">
                  <input type="number" value={salePrice || ''} onChange={e => setSalePrice(Number(e.target.value))} placeholder="0" className="c-price" />
                  <span className="unit">엔</span>
                </div>
              </div>

              <div className="input-row admin-flex-between">
                <span className="label"><span className="color-dot bg-pay"></span>결제 수수료</span>
                <div className="input-with-unit">
                  {/* 🌟 결제 수수료에 placeholder="0" 추가됨 */}
                  <input type="number" value={paymentFee || ''} onChange={e => setPaymentFee(Number(e.target.value))} placeholder="0" className="c-pay" />
                  <span className="unit">엔</span>
                </div>
              </div>

              <div className="input-row admin-flex-between">
                <span className="label"><span className="color-dot bg-tax"></span>일내 배송료</span>
                <div className="input-with-unit">
                  <input type="number" value={dailyTax || ''} onChange={e => setDailyTax(Number(e.target.value))} placeholder="0" className="c-tax" />
                  <span className="unit">엔</span>
                </div>
              </div>

            </div>
          </div>

          {/* ================= 3. 최종 견적 요약 ================= */}
          <div className="premium-card summary-card">

            <div className="summary-header">
              <div className="label-tooltip-wrapper">
                <span className="total-label card-title-label">
                  최종 결제 예상액
                  <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </span>

                <div className="hover-formula-tooltip">
                  <span className="formula-label">적용된 계산 공식</span>
                  <div className="clean-formula-box">
                    <div className="math-formula">
                      <span className="bracket">(</span>
                      <span className="c-rate" title="현재 환율">{exchangeRate.toFixed(4)}</span>
                      <span className="op">+</span>
                      <span className="c-add" title="추가 증가액">{parseFloat((addRate * 0.01).toFixed(4))}</span>
                      <span className="bracket">)</span>

                      <span className="multiply"> × </span>

                      <span className="formula-group-2">
                        <span className="bracket">(</span>
                        <span className="c-price" title="상품 가격">{salePrice.toLocaleString()}</span>
                        <span className="op">+</span>
                        <span className="c-pay" title="결제 수수료">{paymentFee}</span>
                        <span className="op">+</span>
                        <span className="c-tax" title="일내 배송료">{dailyTax}</span>
                        <span className="op">+</span>
                        <span className="c-agency" title="대행 수수료">{agencyFee}</span>
                        <span className="bracket">)</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="total-box">

              <div
                className="clickable-amount"
                onClick={handleCopyAmount}
                title="클릭하여 금액 복사하기"
              >
                <div className={`total-value ${isCopied ? 'text-copied' : ''}`}>
                  <span className="currency">₩</span>
                  {resultCount.toLocaleString()}
                </div>
              </div>

              <p className={`total-helper ${isCopied ? 'text-success' : ''}`}>
                {isCopied 
                  ? '✅ 금액이 클립보드에 복사되었습니다!' 
                  : '* 숫자를 클릭하면 금액이 복사됩니다.'}
              </p>
            </div>
            
          </div>

        </div>
      </div>

      {/* ================= STYLES ================= */}
      <style jsx>{`
        /* 🌟 원래 app/test-estimate에 있던 독립 페이지라 min-height:100vh + 60px 여백을
           썼는데, 이제 admin 레이아웃(사이드바/헤더가 이미 있는) 콘텐츠 영역 안에 들어가므로
           불필요한 전체 화면 높이/여백은 줄이고 카드 자체 디자인은 그대로 뒀습니다. */
        .premium-calc-wrapper {
          background: #0f172a;
          color: #f8fafc;
          padding: 32px 20px;
          border-radius: 24px;
          font-family: 'Pretendard', sans-serif;
        }

        .calc-container {
          max-width: 560px;
          margin: 0 auto;
        }

        .calc-header {
          margin-bottom: 40px;
          text-align: center;
        }

        .title {
          font-size: 32px;
          font-weight: 800;
          margin: 0 0 12px 0;
          background: linear-gradient(to right, #38bdf8, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          font-size: 16px;
          color: #94a3b8;
          margin: 0;
        }

        .calc-flex-column {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .premium-card {
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .summary-card {
          background: linear-gradient(145deg, #1e293b, #111827);
          border: 1px solid rgba(129, 140, 248, 0.2);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }

        .summary-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 16px;
          margin-bottom: 16px;
        }

        /* font-size/font-weight는 admin-common.css의 .admin-title-font(18px/700)를 재사용합니다 */
        .card-title {
          color: #e2e8f0;
          margin: 0 0 24px 0;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .summary-card .card-title {
          margin: 0;
          padding: 0;
          border: none;
        }

        .card-title-note {
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
        }

        .collapsible-card-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .collapse-chevron {
          display: none;
          width: 18px;
          height: 18px;
          color: #94a3b8;
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }

        .collapse-chevron.closed {
          transform: rotate(-90deg);
        }

        .collapsed-final-rate {
          display: none;
          font-size: 12px;
          color: #94a3b8;
          padding-bottom: 4px;
        }

        .collapsed-final-rate-value {
          color: #ef4444;
          font-weight: 700;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* 🌟 접기 기능은 모바일 전용입니다. 481px 이상에서는 state와 무관하게 항상 펼쳐진 상태를 강제합니다. */
        @media (min-width: 481px) {
          .input-group.collapsed {
            display: flex !important;
          }
        }

        /* display/justify-content/align-items는 admin-common.css의 .admin-flex-between을 재사용합니다 */
        .input-row {
          gap: 10px;
        }

        .bundled-group {
          background: rgba(96, 165, 250, 0.05); 
          border: 1px solid rgba(96, 165, 250, 0.2);
          border-radius: 16px;
          padding: 16px;
          margin: 0 -16px 8px -16px; 
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .color-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 8px;
          flex-shrink: 0;
        }

        .label {
          font-size: 15px;
          font-weight: 600;
          color: #cbd5e1;
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
          flex-shrink: 1;
        }

        .input-with-unit {
          display: flex;
          align-items: center;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 0 16px;
          width: 140px;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .input-with-unit:focus-within {
          border-color: #38bdf8;
          box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
        }

        .input-with-unit input {
          flex: 1;
          width: 100%;
          background: transparent;
          border: none;
          color: #f8fafc;
          font-size: 16px;
          font-weight: 700;
          text-align: right;
          padding: 14px 0;
          outline: none;
        }

        .input-with-unit input[type="number"]::-webkit-inner-spin-button,
        .input-with-unit input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .input-with-unit input[type="number"] {
          -moz-appearance: textfield; 
        }
        
        .input-with-unit input::placeholder {
          color: #475569;
          font-weight: 600;
        }

        .input-with-unit input.c-add { color: #7c3aed; }
        .input-with-unit input.c-price { color: #fbbf24; }
        .input-with-unit input.c-pay { color: #f97316; }
        .input-with-unit input.c-tax { color: #f472b6; }

        .unit {
          margin-left: 8px;
          color: #64748b;
          font-size: 14px;
          font-weight: 500;
        }

        .global-apply-divider {
          height: 1px;
          background: #334155;
          margin: 16px 0;
        }

        .global-apply-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(to right, #38bdf8, #818cf8);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .global-apply-btn:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }

        .global-apply-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .global-apply-warning {
          margin: 10px 0 0 0;
          font-size: 12px;
          color: #94a3b8;
          text-align: center;
        }

        /* 🌟 데스크톱에서는 자연스럽게 줄바꿈되도록 두고, 좁은 모바일 화면에서만
           줄이 매번 다른 위치에서 끊기지 않도록 강제로 3줄 레이아웃을 적용합니다. */
        .warning-break {
          display: none;
        }

        .global-apply-warning-highlight {
          color: #ef4444;
          font-weight: 900;
          font-size: 17px;
        }

        .value-box {
          font-size: 18px;
          font-weight: 700;
          padding: 10px 16px;
          border-radius: 10px;
          min-width: 140px;
          text-align: right;
          flex-shrink: 0;
        }

        .refresh-box {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-box:hover {
          background: rgba(37, 99, 235, 0.2);
          transform: scale(1.02);
        }

        .refresh-box.is-refreshing {
          animation: refreshPulse 0.6s ease-in-out;
        }

        @keyframes refreshPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.5); }
          40% { transform: scale(1.06); box-shadow: 0 0 0 6px rgba(37, 99, 235, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }

        .bg-qty { background-color: #94a3b8; box-shadow: 0 0 8px rgba(148, 163, 184, 0.4); }

        .c-rate { color: #2563eb; }
        .bg-rate { background-color: #2563eb; box-shadow: 0 0 8px rgba(37, 99, 235, 0.4); }
        .highlight-rate { color: #2563eb; background: rgba(148, 163, 184, 0.1); }

        /* 🌟 네이버 환율 조회 실패 시(임시값 9.05 사용 중) 명확하게 경고 표시 */
        .value-box.fetch-failed {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.4);
        }
        .fetch-failed-text {
          color: #ef4444;
          font-size: 13px;
          font-weight: 800;
          white-space: nowrap;
        }

        .c-add { color: #7c3aed; }
        .bg-add { background-color: #7c3aed; box-shadow: 0 0 8px rgba(124, 58, 237, 0.4); }

        .c-price { color: #fbbf24; }
        .bg-price { background-color: #fbbf24; box-shadow: 0 0 8px rgba(251, 191, 36, 0.4); }

        .c-pay { color: #f97316; }
        .bg-pay { background-color: #f97316; box-shadow: 0 0 8px rgba(249, 115, 22, 0.4); }

        .c-tax { color: #f472b6; }
        .bg-tax { background-color: #f472b6; box-shadow: 0 0 8px rgba(244, 114, 182, 0.4); }

        .c-agency { color: #60a5fa; }
        .bg-agency { background-color: #60a5fa; box-shadow: 0 0 8px rgba(96, 165, 250, 0.4); }
        .highlight-agency { color: #60a5fa; background: rgba(96, 165, 250, 0.1); }

        .c-final { color: #ef4444; }
        .bg-final { background-color: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.4); }
        .highlight-final { color: #ef4444; background: rgba(148, 163, 184, 0.1); }

        .quantity-control {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #0f172a;
          border-radius: 12px;
          padding: 6px;
          border: 1px solid #334155;
        }

        .qty-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #1e293b;
          border: none;
          color: #f8fafc;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .qty-btn:hover { background: #334155; }
        .qty-val { font-size: 16px; font-weight: 700; min-width: 24px; text-align: center; }

        .total-box { 
          text-align: right; 
          padding: 10px 0 0 0;
        }

        .label-tooltip-wrapper {
          position: relative;
          display: flex;
          cursor: help;
          width: fit-content;
        }

        .total-label {
          font-size: 16px;
          color: #cbd5e1;
          font-weight: 600;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .card-title-label {
          font-size: 18px;
          margin-bottom: 0;
        }

        .info-icon {
          width: 16px;
          height: 16px;
          color: #94a3b8;
          transition: all 0.2s;
        }

        .label-tooltip-wrapper:hover .info-icon {
          color: #38bdf8;
          transform: scale(1.1);
        }

        .hover-formula-tooltip {
          position: absolute;
          bottom: 100%;
          left: 0;
          margin-bottom: 12px;
          width: 330px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
          opacity: 0;
          visibility: hidden;
          transform: translateY(10px) scale(0.95);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 50;
          pointer-events: none; 
          text-align: left;
        }

        .hover-formula-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 20px;
          border-width: 8px;
          border-style: solid;
          border-color: #334155 transparent transparent transparent;
        }

        .label-tooltip-wrapper:hover .hover-formula-tooltip {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
        }

        .formula-label {
          display: block;
          font-size: 13px;
          color: #94a3b8;
          margin-bottom: 12px;
          font-weight: 600;
        }

        .clean-formula-box {
          background: #1e293b;
          border-radius: 12px;
          padding: 16px;
        }

        .math-formula {
          font-size: 18px;
          font-family: 'JetBrains Mono', 'Consolas', monospace;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .bracket { color: #64748b; font-size: 20px; font-weight: 300; }
        .op { color: #64748b; font-size: 16px; font-weight: 600; margin: 0 2px; }
        .multiply { color: #94a3b8; font-size: 20px; font-weight: bold; margin: 0 4px; }

        /* 🌟 두 번째 괄호 그룹을 하나의 flex 아이템으로 묶어서 항상 통째로 아래줄로 넘어가게 합니다
           (개별 값이 따로따로 줄바꿈되며 괄호 중간이 끊기는 걸 방지). */
        .formula-group-2 {
          display: inline-flex;
          flex-wrap: nowrap;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex-basis: 100%;
        }

        .clickable-amount {
          display: inline-flex;
          justify-content: flex-end;
          cursor: pointer;
          transition: transform 0.1s ease, opacity 0.2s ease;
          user-select: none;
        }

        .clickable-amount:hover {
          opacity: 0.85;
          transform: scale(1.02);
        }

        .clickable-amount:active {
          transform: scale(0.98);
        }

        .total-value {
          font-size: 48px;
          font-weight: 900;
          color: #ffffff;
          line-height: 1;
          margin-bottom: 12px;
          text-shadow: 0 4px 20px rgba(255, 255, 255, 0.1);
          transition: color 0.3s ease;
        }

        .text-copied {
          color: #34d399 !important;
        }

        .currency { font-size: 32px; margin-right: 8px; color: #818cf8; }
        
        .total-helper { 
          margin: 0; 
          font-size: 13px; 
          color: #64748b; 
          transition: color 0.3s ease;
        }

        .text-success {
          color: #34d399;
          font-weight: 600;
        }

        @media (max-width: 480px) {
          .premium-calc-wrapper { padding: 32px 20px 16px; }
          .calc-container { padding: 0; }
          .calc-header { margin-bottom: 20px; }
          .calc-flex-column { gap: 16px; }
          .premium-card { padding: 20px 16px 12px; border-radius: 16px; }
          .card-title { margin: 0 0 8px 0; }
          .collapsible-card-title { cursor: pointer; }
          .collapse-chevron { display: block; }
          .input-group.collapsed { display: none; }
          .collapsed-final-rate { display: block; }
          .label { font-size: 14px; }
          .input-group { gap: 10px; }
          .global-apply-divider { margin: 8px 0; }
          .warning-break { display: block; }

          .bundled-group { margin: 0 -12px 0 -12px; padding: 10px 12px; gap: 8px; }

          .quantity-control { gap: 10px; padding: 4px; width: 110px; justify-content: center; }
          .qty-btn { width: 26px; height: 26px; font-size: 15px; }
          .qty-val { font-size: 14px; min-width: 20px; }
          
          .input-with-unit { width: 110px; min-width: 110px; padding: 0 12px; }
          .value-box { min-width: 110px; padding: 8px 12px; width: auto; font-size: 15px; }
          .highlight-agency { background: rgba(148, 163, 184, 0.1); }
          .input-with-unit input { font-size: 15px; padding: 8px 0; }
          .total-value { font-size: 36px; }
          .currency { font-size: 24px; }
          .hover-formula-tooltip { left: -10px; width: 300px; }
          .hover-formula-tooltip::after { left: 30px; }
          .math-formula { font-size: 16px; }
          .bracket { font-size: 17px; }
          .op { font-size: 14px; }
          .multiply { font-size: 17px; }
          .summary-header { padding-bottom: 8px; margin-bottom: 8px; }
          .total-box { padding-top: 0; }
          .summary-card { padding-bottom: 6px; }
        }
      `}</style>
    </div>
  );
}