'use client';

import React, { useState, useEffect } from 'react';

export default function PremiumEstimatePage() {
  const [exchangeRate, setExchangeRate] = useState(0); 
  const [addRate, setAddRate] = useState<number>(0);
  
  const [salePrice, setSalePrice] = useState<number>(0);
  const [paymentFee, setPaymentFee] = useState<number>(0);
  const [dailyTax, setDailyTax] = useState<number>(0);
  
  const [quantity, setQuantity] = useState<number>(1);
  const [agencyFee, setAgencyFee] = useState<number>(300);

  const [resultCount, setResultCount] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ salePrice: 0, quantityCount: 0 })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setExchangeRate(data.data.exchangeRate);
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
        setExchangeRate(apiResult.exchangeRate); 
      }
    };

    const timeoutId = setTimeout(() => {
      fetchCalculate();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [salePrice, quantity, addRate, dailyTax, paymentFee, agencyFee]);

  const handleCopyAmount = () => {
    const formattedAmount = `${resultCount.toLocaleString()}원`;
    
    navigator.clipboard.writeText(formattedAmount).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); 
    });
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
        setExchangeRate(data.data.exchangeRate);
        setResultCount(data.data.finalPriceWon);
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
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
            <h3 className="card-title">환율 및 마진 설정</h3>
            <div className="input-group">
              <div className="input-row read-only-row">
                <span className="label"><span className="color-dot bg-rate"></span>현재 환율 (100엔 기준)</span>
                
                <div 
                  className="value-box highlight-rate refresh-box" 
                  onClick={handleForceRefresh}
                  title="클릭하여 환율 즉시 새로고침"
                >
                  {(exchangeRate * 100).toFixed(2)} <span className="unit">원</span>
                  <svg className={`refresh-icon ${isRefreshing ? 'spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                </div>

              </div>
              <div className="input-row">
                <span className="label"><span className="color-dot bg-add"></span>추가 증가액</span>
                <div className="input-with-unit">
                  <input type="number" value={addRate || ''} onChange={e => setAddRate(Number(e.target.value))} placeholder="0" className="c-add" />
                  <span className="unit">원</span>
                </div>
              </div>
            </div>
          </div>

          {/* ================= 2. 상품 및 수수료 정보 ================= */}
          <div className="premium-card">
            <h3 className="card-title">상품 및 수수료 정보</h3>
            <div className="input-group">
              
              <div className="bundled-group">
                <div className="input-row">
                  <span className="label"><span className="color-dot bg-qty"></span>상품 수량</span>
                  <div className="quantity-control">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="qty-btn">−</button>
                    <span className="qty-val">{quantity}</span>
                    <button onClick={() => setQuantity(q => q + 1)} className="qty-btn">+</button>
                  </div>
                </div>

                <div className="input-row read-only-row">
                  <span className="label"><span className="color-dot bg-agency"></span>대행 수수료</span>
                  <div className="value-box highlight-agency">
                    {agencyFee} <span className="unit">엔</span>
                  </div>
                </div>
              </div>

              <div className="input-row">
                <span className="label"><span className="color-dot bg-price"></span>상품 가격</span>
                <div className="input-with-unit">
                  <input type="number" value={salePrice || ''} onChange={e => setSalePrice(Number(e.target.value))} placeholder="0" className="c-price" />
                  <span className="unit">엔</span>
                </div>
              </div>

              <div className="input-row">
                <span className="label"><span className="color-dot bg-pay"></span>결제 수수료</span>
                <div className="input-with-unit">
                  {/* 🌟 결제 수수료에 placeholder="0" 추가됨 */}
                  <input type="number" value={paymentFee || ''} onChange={e => setPaymentFee(Number(e.target.value))} placeholder="0" className="c-pay" />
                  <span className="unit">엔</span>
                </div>
              </div>

              <div className="input-row">
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
              <h3 className="card-title">최종 견적 요약</h3>
              <div className="pulse-indicator">실시간 환율 적용중</div>
            </div>
            
            <div className="total-box">
              
              <div className="label-tooltip-wrapper">
                <span className="total-label">
                  최종 결제 예상액
                  <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </span>
                
                <div className="hover-formula-tooltip">
                  <span className="formula-label">적용된 계산 공식</span>
                  <div className="clean-formula-box">
                    <div className="math-formula">
                      <span className="bracket">(</span>
                      <span className="c-rate" title="현재 환율">{exchangeRate}</span>
                      <span className="op">+</span>
                      <span className="c-add" title="추가 증가액">{(addRate * 0.01).toFixed(2)}</span>
                      <span className="bracket">)</span>
                      
                      <span className="multiply"> × </span>
                      
                      <span className="bracket">(</span>
                      <span className="c-price" title="상품 가격">{salePrice.toLocaleString()}</span>
                      <span className="op">+</span>
                      <span className="c-pay" title="결제 수수료">{paymentFee}</span>
                      <span className="op">+</span>
                      <span className="c-tax" title="일내 배송료">{dailyTax}</span>
                      <span className="op">+</span>
                      <span className="c-agency" title="대행 수수료">{agencyFee}</span>
                      <span className="bracket">)</span>
                    </div>
                  </div>
                </div>
              </div>
              
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
        .premium-calc-wrapper {
          min-height: 100vh;
          background: #0f172a;
          color: #f8fafc;
          padding: 60px 20px;
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

        .card-title {
          font-size: 18px;
          font-weight: 700;
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

        .pulse-indicator {
          font-size: 12px;
          color: #34d399;
          font-weight: 600;
          background: rgba(52, 211, 153, 0.1);
          padding: 4px 10px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pulse-indicator::before {
          content: '';
          width: 6px;
          height: 6px;
          background: #34d399;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.4); }
          70% { box-shadow: 0 0 0 4px rgba(52, 211, 153, 0); }
          100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .input-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
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

        .input-with-unit input.c-add { color: #c084fc; }
        .input-with-unit input.c-price { color: #fbbf24; }
        .input-with-unit input.c-pay { color: #f97316; }
        .input-with-unit input.c-tax { color: #f472b6; }

        .unit {
          margin-left: 8px;
          color: #64748b;
          font-size: 14px;
          font-weight: 500;
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
          background: rgba(52, 211, 153, 0.2);
          transform: scale(1.02);
        }

        .refresh-icon {
          width: 14px;
          height: 14px;
          color: #34d399;
          opacity: 0.5;
          transition: opacity 0.2s;
          flex-shrink: 0; 
        }

        .refresh-box:hover .refresh-icon {
          opacity: 1;
        }

        .spin {
          animation: spin 0.8s linear infinite;
          opacity: 1;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }

        .bg-qty { background-color: #94a3b8; box-shadow: 0 0 8px rgba(148, 163, 184, 0.4); }

        .c-rate { color: #34d399; }
        .bg-rate { background-color: #34d399; box-shadow: 0 0 8px rgba(52, 211, 153, 0.4); }
        .highlight-rate { color: #34d399; background: rgba(52, 211, 153, 0.1); }

        .c-add { color: #c084fc; }
        .bg-add { background-color: #c084fc; box-shadow: 0 0 8px rgba(192, 132, 252, 0.4); }

        .c-price { color: #fbbf24; }
        .bg-price { background-color: #fbbf24; box-shadow: 0 0 8px rgba(251, 191, 36, 0.4); }

        .c-pay { color: #f97316; }
        .bg-pay { background-color: #f97316; box-shadow: 0 0 8px rgba(249, 115, 22, 0.4); }

        .c-tax { color: #f472b6; }
        .bg-tax { background-color: #f472b6; box-shadow: 0 0 8px rgba(244, 114, 182, 0.4); }

        .c-agency { color: #60a5fa; }
        .bg-agency { background-color: #60a5fa; box-shadow: 0 0 8px rgba(96, 165, 250, 0.4); }
        .highlight-agency { color: #60a5fa; background: rgba(96, 165, 250, 0.1); }

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
          justify-content: flex-end;
          cursor: help; 
          width: fit-content;
          margin-left: auto;
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
          right: 0;
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
          right: 30px;
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
          .calc-container { padding: 0; }
          .premium-card { padding: 20px 16px; border-radius: 16px; }
          .label { font-size: 14px; }
          
          .bundled-group { margin: 0 -12px 8px -12px; padding: 16px 12px; }
          
          .input-with-unit { width: 110px; min-width: 110px; padding: 0 12px; }
          .value-box { min-width: 110px; padding: 0 12px; width: auto; }
          .input-with-unit input { font-size: 15px; padding: 12px 0; }
          .total-value { font-size: 36px; }
          .currency { font-size: 24px; }
          .hover-formula-tooltip { right: -10px; width: 300px; }
          .hover-formula-tooltip::after { right: 40px; }
          .refresh-icon { opacity: 0.8; margin-left: 2px; }
        }
      `}</style>
    </div>
  );
}