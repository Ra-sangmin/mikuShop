'use client';

import React, { useState, useEffect } from 'react';
import '../admin-common.css';
import './estimate-premium.css';
import { calculateTieredPaymentFee, calculateTieredAgencyFee, DEFAULT_PAYMENT_FEE_RULE, DEFAULT_AGENCY_FEE_RULE, OrderFeeRule } from '@/src/utils/feeCalculator';
import { AdminHero, HeroButton, KpiCard, useToasts, ToastStack } from '../components/AdminPremiumKit';
import {
  Calculator, ArrowClockwise, CurrencyJpy, TrendUp, Globe, Copy, CheckCircle, Warning, Minus, Plus,
  Package, Receipt, Truck, HandCoins, Info, Sparkle, ArrowCounterClockwise, CaretDown, ShoppingBag, Stack,
} from '@phosphor-icons/react';

/* ============================================================
   🧮 예상 견적 계산기
   - 결제/대행 수수료 공식은 src/utils/feeCalculator.ts 를 공통으로 참조합니다.
   - 최종 금액은 /api/estimate 가 계산합니다. (purchase/quote, mypage/status 와 같은 식)
   ============================================================ */

// 계산 항목 색 (화면 곳곳의 점 · 수식 색을 맞춥니다)
const TONE = {
  rate: '#2563eb',
  add: '#7c3aed',
  final: '#e11d48',
  price: '#d97706',
  pay: '#ea580c',
  tax: '#db2777',
  agency: '#0284c7',
  qty: '#64748b',
};

export default function PremiumEstimatePage() {
  const { toasts, pushToast } = useToasts();

  const [exchangeRate, setExchangeRate] = useState(0);
  // 🌟 네이버에서 실시간 환율을 못 가져와 임시값(9.05)으로 대체됐는지 여부
  const [exchangeRateFetchFailed, setExchangeRateFetchFailed] = useState(false);
  const [addRate, setAddRate] = useState<number>(0);
  // 🌟 서버에 저장된 추가 증가액 (입력값이 이것과 다르면 "적용 안 됨" 표시)
  const [savedAddRate, setSavedAddRate] = useState<number>(0);
  // 🌟 "환율을 몇 엔 기준으로 다시 계산해서 보여줄지"의 기준값 (api/estimate의 getExchangeRateBasisUnit)
  const [rateBasisUnit, setRateBasisUnit] = useState<number>(100);

  const [salePrice, setSalePrice] = useState<number>(0);
  const [paymentFee, setPaymentFee] = useState<number>(0);
  const [dailyTax, setDailyTax] = useState<number>(0);

  const [quantity, setQuantity] = useState<number>(1);
  const [agencyFee, setAgencyFee] = useState<number>(300);

  const [resultCount, setResultCount] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isApplyingGlobal, setIsApplyingGlobal] = useState<boolean>(false);
  const [confirmApply, setConfirmApply] = useState<boolean>(false);

  // 💱 상단 헤더(모바일 환율 설정)에서 환율을 새로고침하거나 추가 증가액을 적용하면 이 화면도 따라갑니다.
  useEffect(() => {
    const onUpdate = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d) return;
      setExchangeRate(d.baseExchangeRate);
      setExchangeRateFetchFailed(!!d.exchangeRateFetchFailed);
      setRateBasisUnit(d.exchangeRateBasisUnit);
      const won = d.additionalRate * d.exchangeRateBasisUnit;
      setAddRate(won);
      setSavedAddRate(won);
    };
    window.addEventListener('exchangeRateConfigUpdated', onUpdate);
    return () => window.removeEventListener('exchangeRateConfigUpdated', onUpdate);
  }, []);

  // 📱 모바일(720px 이하)에서는 간단한 전용 화면을 보여줍니다.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  // 모바일 접이식 영역 (수수료 상세 · 환율 설정 · 계산 내역)
  const [mOpen, setMOpen] = useState({ fee: false, detail: false });
  const toggleM = (k: keyof typeof mOpen) => setMOpen(o => ({ ...o, [k]: !o[k] }));

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
          // 🌟 추가 증가액(환율 단위) × 기준값 = "원" 단위로 환산해 초기화합니다.
          const won = data.data.additionalRate * data.data.exchangeRateBasisUnit;
          setAddRate(won);
          setSavedAddRate(won);
        }
      });
  }, []);

  // 🌟 결제/대행 수수료 구간 변수는 DB(order_fee_rules)에서 받아옵니다.
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

  useEffect(() => {
    setPaymentFee(calculateTieredPaymentFee(salePrice, paymentFeeRule));
  }, [salePrice, paymentFeeRule]);

  useEffect(() => {
    setAgencyFee(calculateTieredAgencyFee(quantity, agencyFeeRule));
  }, [quantity, agencyFeeRule]);

  useEffect(() => {
    const fetchCalculate = async () => {
      setIsCalculating(true);
      try {
        const res = await fetch('/api/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            salePrice,
            quantityCount: quantity,
            addRate,
            dailyTax,
            // 🐛 화면에서 수정할 수 있는 수수료가 전송되지 않아 서버가 제 값으로 다시 계산했습니다.
            paymentFee,
            agencyFee,
          })
        });
        const data = await res.json();
        if (data.success) {
          setResultCount(data.data.finalPriceWon);
          // 🌟 여기서 exchangeRate를 다시 설정하지 않습니다. (캐시된 예전 환율이 새로고침 값을 덮어쓰는 버그 방지)
        }
      } finally {
        setIsCalculating(false);
      }
    };

    const timeoutId = setTimeout(fetchCalculate, 300);
    return () => clearTimeout(timeoutId);
  }, [salePrice, quantity, addRate, dailyTax, paymentFee, agencyFee]);

  const copyText = (text: string, done: () => void) => {
    // 1. HTTPS 환경 또는 로컬호스트 (클립보드 API 지원)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch((err) => console.error('복사 실패:', err));
      return;
    }
    // 2. HTTP 테스트 환경 (우회 로직)
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      done();
    } catch (err) {
      console.error('복사 실패:', err);
    } finally {
      textArea.remove();
    }
  };

  const handleCopyAmount = () => {
    copyText(`${resultCount.toLocaleString()}원`, () => {
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
        body: JSON.stringify({ salePrice, quantityCount: quantity, addRate, dailyTax, forceRefresh: true })
      });
      const data = await res.json();
      if (data.success) {
        setExchangeRate(data.data.baseExchangeRate);
        setExchangeRateFetchFailed(!!data.data.exchangeRateFetchFailed);
        setResultCount(data.data.finalPriceWon);
        // 🌟 추가 증가액도 DB(ExchangeRateConfig)에서 바뀌었을 수 있으므로 함께 재동기화합니다.
        setRateBasisUnit(data.data.exchangeRateBasisUnit);
        const won = data.data.additionalRate * data.data.exchangeRateBasisUnit;
        setAddRate(won);
        setSavedAddRate(won);
        // 🌟 헤더(데스크톱 환율 카드 · 모바일 환율 설정)도 최신 값으로 바로 맞춥니다.
        window.dispatchEvent(new CustomEvent('exchangeRateConfigUpdated', { detail: data.data }));
        pushToast(data.data.exchangeRateFetchFailed ? 'error' : 'success',
          data.data.exchangeRateFetchFailed ? '환율 조회에 실패해 임시값을 사용 중입니다.' : '최신 환율을 불러왔습니다.');
      }
    } catch {
      pushToast('error', '환율을 불러오지 못했습니다.');
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
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
        setSavedAddRate(addRate);
        pushToast('success', `추가 증가액 ${addRate.toLocaleString()}원을 사이트 전체에 적용했습니다.`);
        // 🌟 헤더(데스크톱 환율 카드 · 모바일 환율 설정)도 최신 값으로 바로 맞춥니다.
        window.dispatchEvent(new CustomEvent('exchangeRateConfigUpdated', {
          detail: { baseExchangeRate: exchangeRate, additionalRate: addRate / rateBasisUnit, exchangeRateBasisUnit: rateBasisUnit, exchangeRateFetchFailed },
        }));
      } else {
        pushToast('error', data.message || '전역 적용 중 오류가 발생했습니다.');
      }
    } catch {
      pushToast('error', '전역 적용 중 오류가 발생했습니다.');
    } finally {
      setIsApplyingGlobal(false);
      setConfirmApply(false);
    }
  };

  const resetInputs = () => {
    setSalePrice(0);
    setDailyTax(0);
    setQuantity(1);
  };

  /* ---------- 헤더 환율 카드 클릭 → '환율 및 마진 설정' 으로 이동 ---------- */
  useEffect(() => {
    if (isMobile) return;
    const focusRate = () => {
      const el = document.getElementById('rate-settings');
      if (!el) return;
      // 관리자 본문(.ash-content)이 스크롤 영역이라 그 안에서 직접 스크롤합니다.
      const scroller = el.closest('.ash-content') as HTMLElement | null;
      if (scroller) {
        const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 16;
        scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      el.classList.remove('is-spotlight');
      void el.offsetWidth; // 애니메이션 다시 시작
      el.classList.add('is-spotlight');
      window.setTimeout(() => el.classList.remove('is-spotlight'), 1800);
    };
    let timer: number | undefined;
    if (window.location.hash === '#rate-settings') {
      timer = window.setTimeout(() => {
        focusRate();
        window.history.replaceState(null, '', window.location.pathname);
      }, 250);
    }
    window.addEventListener('admin:focusRateSettings', focusRate);
    return () => {
      window.removeEventListener('admin:focusRateSettings', focusRate);
      if (timer) window.clearTimeout(timer);
    };
  }, [isMobile]);

  /* ---------- 표시용 계산 ---------- */
  const baseRateView = exchangeRate * rateBasisUnit;          // 예: 100엔당 원
  const finalRateView = baseRateView + addRate;               // 최종 표시 환율
  const perYen = exchangeRate + addRate / rateBasisUnit;      // 1엔당 원 (실제 계산에 쓰는 값)
  const yenTotal = salePrice + paymentFee + dailyTax + agencyFee;
  const addRateDirty = Math.abs(addRate - savedAddRate) > 0.0001;

  const breakdown = [
    { key: 'price', label: '상품 가격', yen: salePrice, color: TONE.price, icon: <Package size={14} weight="duotone" /> },
    { key: 'pay', label: '결제 수수료', yen: paymentFee, color: TONE.pay, icon: <Receipt size={14} weight="duotone" /> },
    { key: 'tax', label: '일본 내 배송료', yen: dailyTax, color: TONE.tax, icon: <Truck size={14} weight="duotone" /> },
    { key: 'agency', label: `대행 수수료 (${quantity}개)`, yen: agencyFee, color: TONE.agency, icon: <HandCoins size={14} weight="duotone" /> },
  ];

  /* ============================================================
     📱 모바일 전용 화면 — 간단하게: 결과(상단 고정) → 입력 3개 → 접히는 설정·내역
     ============================================================ */
  if (isMobile) {
    const mNum = (
      value: number, onChange: (n: number) => void, color: string, unit: string, label: string, big = false,
    ) => (
      <label className={`em-input ${big ? 'is-big' : ''}`} style={{ ['--c' as string]: color } as React.CSSProperties}>
        <input type="number" inputMode="numeric" value={value || ''} placeholder="0" aria-label={label}
          onChange={e => onChange(Math.max(0, Number(e.target.value)))} />
        <span>{unit}</span>
      </label>
    );

    return (
      <div className="em-page">
        {/* ① 결과 — 스크롤해도 위에 고정 (환율 설정은 상단 헤더로 옮김) */}
        <section className="em-result" aria-live="polite">
          <div className="em-result-top">
            <span className="em-result-label">
              최종 결제 예상액
              {isCalculating && <span className="est-calc-dot" aria-label="계산 중" />}
            </span>
            <button type="button" className={`em-copy ${isCopied ? 'is-copied' : ''}`} onClick={handleCopyAmount}>
              {isCopied ? <><CheckCircle size={14} weight="fill" /> 복사됨</> : <><Copy size={14} weight="bold" /> 복사</>}
            </button>
          </div>
          <button type="button" className={`em-total ${isCopied ? 'is-copied' : ''}`} onClick={handleCopyAmount} aria-label="금액 복사">
            <span>₩</span>{resultCount.toLocaleString()}
          </button>
          {/* 환율 조회 실패 시에만 경고 한 줄 */}
          {exchangeRateFetchFailed && (
            <div className="em-result-sub"><em className="em-warn"><Warning size={12} weight="fill" /> 임시 환율 사용 중</em></div>
          )}

        </section>

        {/* ② 입력 — 상품 정보 패널 */}
        <section className="em-card em-order">
          <header className="em-order-head">
            <span className="em-order-icon"><ShoppingBag size={18} weight="duotone" /></span>
            <span className="em-order-title">
              <strong>상품 정보</strong>
              <span>엔화 기준 · 수수료 자동 계산</span>
            </span>
            <span className="em-order-sum" translate="no">
              <small>엔화 합계</small>
              ¥{yenTotal.toLocaleString()}
            </span>
          </header>

          {/* 상품 가격 — 가장 크게 */}
          <label className="em-price">
            <span className="em-price-top">
              <span className="em-price-label"><CurrencyJpy size={14} weight="bold" />상품 가격</span>
              <span className="em-price-krw" translate="no">
                {salePrice > 0 ? <>≈ ₩{Math.round(salePrice * perYen).toLocaleString()}</> : '엔화로 입력'}
              </span>
            </span>
            <span className="em-price-box">
              <span className="em-price-yen" aria-hidden="true">¥</span>
              <input type="number" inputMode="numeric" value={salePrice || ''} placeholder="0" aria-label="상품 가격"
                onChange={e => setSalePrice(Math.max(0, Number(e.target.value)))} />
              <span className="em-price-unit">엔</span>
            </span>
          </label>

          <div className="em-lines">
            <div className="em-line" style={{ ['--c' as string]: '#6366f1' } as React.CSSProperties}>
              <span className="em-line-icon"><Stack size={16} weight="duotone" /></span>
              <span className="em-line-text"><strong>수량</strong><small>대행 수수료에 반영</small></span>
              <div className="em-stepper">
                <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="수량 줄이기"><Minus size={15} weight="bold" /></button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity(q => q + 1)} aria-label="수량 늘리기"><Plus size={15} weight="bold" /></button>
              </div>
            </div>

            <div className="em-line" style={{ ['--c' as string]: TONE.tax } as React.CSSProperties}>
              <span className="em-line-icon"><Truck size={16} weight="duotone" /></span>
              <span className="em-line-text"><strong>일본 내 배송료</strong><small>현지 배송</small></span>
              {mNum(dailyTax, setDailyTax, TONE.tax, '엔', '일본 내 배송료')}
            </div>

            {/* 자동 계산 수수료 — 한 줄 요약, 눌러서 결제 수수료 직접 수정 */}
            <button type="button" className={`em-line em-auto ${mOpen.fee ? 'is-open' : ''}`} style={{ ['--c' as string]: TONE.agency } as React.CSSProperties}
              onClick={() => toggleM('fee')} aria-expanded={mOpen.fee}>
              <span className="em-line-icon"><Receipt size={16} weight="duotone" /></span>
              <span className="em-line-text"><strong>수수료 <em>자동</em></strong><small>결제 · 대행</small></span>
              <span className="em-auto-val">
                <b>¥{(paymentFee + agencyFee).toLocaleString()}</b>
              </span>
              <CaretDown size={14} weight="bold" className="em-caret" />
            </button>
            {mOpen.fee && (
              <div className="em-sub">
                <div className="em-row">
                  <span className="em-label"><i style={{ background: TONE.pay }} />결제 수수료</span>
                  {mNum(paymentFee, setPaymentFee, TONE.pay, '엔', '결제 수수료')}
                </div>
                <div className="em-row">
                  <span className="em-label"><i style={{ background: TONE.agency }} />대행 수수료</span>
                  <span className="em-readonly" style={{ ['--c' as string]: TONE.agency } as React.CSSProperties}>{agencyFee.toLocaleString()}<small>엔</small></span>
                </div>
                <p className="em-hint">
                  결제 수수료는 가격 ¥{paymentFeeRule.thresholdValue.toLocaleString()} 미만 {paymentFeeRule.belowThresholdFee}엔 · 이상 {paymentFeeRule.atOrAboveThresholdAmount}엔,
                  대행 수수료는 {agencyFeeRule.thresholdValue}개 미만 {agencyFeeRule.belowThresholdFee}엔 · 이상 개당 {agencyFeeRule.atOrAboveThresholdAmount}엔입니다.
                </p>
              </div>
            )}
          </div>

          <button type="button" className="em-reset" onClick={resetInputs}>
            <ArrowCounterClockwise size={14} weight="bold" /> 입력 초기화
          </button>
        </section>

        {/* ③ 계산 내역 (기본 닫힘) */}
        <section className="em-card is-fold">
          <button type="button" className={`em-fold ${mOpen.detail ? 'is-open' : ''}`} onClick={() => toggleM('detail')} aria-expanded={mOpen.detail}>
            <span className="em-fold-icon" style={{ ['--c' as string]: '#10b981' } as React.CSSProperties}><Calculator size={16} weight="duotone" /></span>
            <span className="em-fold-text">
              <strong>계산 내역</strong>
              <span>항목별 금액과 최종 결제 예상액</span>
            </span>
            <CaretDown size={16} weight="bold" className="em-caret" />
          </button>
          {mOpen.detail && (
            <div className="em-sub">
              <ul className="em-list">
                {breakdown.map(b => (
                  <li key={b.key}>
                    <span><i style={{ background: b.color }} />{b.label}</span>
                    <b>¥{b.yen.toLocaleString()}</b>
                  </li>
                ))}
                <li className="is-sum"><span>엔화 합계</span><b>¥{yenTotal.toLocaleString()}</b></li>
                <li><span>적용 환율 ({rateBasisUnit}엔)</span><b>{finalRateView.toFixed(2)}원</b></li>
                <li className="is-total"><span>최종 결제 예상액</span><b>₩{resultCount.toLocaleString()}</b></li>
              </ul>
            </div>
          )}
        </section>

        <ToastStack toasts={toasts} />
      </div>
    );
  }

  return (
    <div className="ap-page est-page">
      <AdminHero
        eyebrow="ESTIMATE" icon={<Sparkle size={11} weight="fill" />}
        title="예상 견적 계산기"
        description="엔화 상품 가격과 수수료를 넣으면 고객이 결제할 원화 금액을 바로 계산합니다."
        accentRgb="56, 189, 248"
        actions={<>
          <HeroButton onClick={resetInputs}>
            <ArrowCounterClockwise size={15} weight="bold" /> 입력 초기화
          </HeroButton>
          <HeroButton primary onClick={handleForceRefresh} disabled={isRefreshing}>
            <ArrowClockwise size={15} weight="bold" className={isRefreshing ? 'ap-spin' : ''} /> 환율 새로고침
          </HeroButton>
        </>}
      >
        <div className="ap-kpis">
          <KpiCard icon={<CurrencyJpy size={18} weight="duotone" />} label="현재 환율" toneRgb="147, 197, 253"
            loading={!exchangeRate}
            value={exchangeRateFetchFailed
              ? <span style={{ color: '#fda4af', fontSize: 18 }}>조회 실패</span>
              : <>{baseRateView.toFixed(2)}<small>원</small></>}
            foot={exchangeRateFetchFailed ? <span className="is-down">임시값 사용 중 · 새로고침해 주세요</span> : `네이버 금융 · ${rateBasisUnit}엔 기준`} />
          <KpiCard icon={<TrendUp size={18} weight="duotone" />} label="추가 증가액" toneRgb="196, 181, 253"
            value={<>{addRate >= 0 ? '+' : ''}{addRate.toLocaleString()}<small>원</small></>}
            foot={addRateDirty ? <span className="is-warn">아직 사이트에 적용하지 않은 값</span> : '사이트에 적용된 값'} />
          <KpiCard icon={<Globe size={18} weight="duotone" />} label="최종 표시 환율" toneRgb="253, 164, 175"
            loading={!exchangeRate}
            value={<>{finalRateView.toFixed(2)}<small>원</small></>}
            foot={`1엔 = ${perYen.toFixed(4)}원`} />
          <KpiCard icon={<Calculator size={18} weight="duotone" />} label="최종 결제 예상액" toneRgb="110, 231, 183"
            value={<><span className="ap-cur">₩</span>{resultCount.toLocaleString()}</>}
            foot={`엔화 합계 ¥${yenTotal.toLocaleString()}`} />
        </div>
      </AdminHero>

      <div className="est-grid">
        {/* ================= 왼쪽: 입력 ================= */}
        <div className="est-col">
          {/* ================= 1. 환율 및 마진 설정 ================= */}
          <section className="ap-panel est-panel" id="rate-settings">
            <div className="est-panel-head">
              <span className="est-panel-icon" style={{ ['--c' as string]: TONE.rate } as React.CSSProperties}><Globe size={17} weight="duotone" /></span>
              <div className="est-panel-title">
                <strong>환율 및 마진 설정</strong>
                <span>네이버 금융 환율에 추가 증가액을 더해 고객에게 보여줄 환율을 정합니다 · {rateBasisUnit}엔 기준</span>
              </div>
              <span className={`est-pill ${addRateDirty ? 'is-warn' : 'is-ok'}`}>
                {addRateDirty ? <><Warning size={11} weight="fill" /> 미적용 변경</> : <><CheckCircle size={11} weight="fill" /> 사이트 적용됨</>}
              </span>
            </div>

            {/* 환율 흐름: 현재 환율 + 추가 증가액 = 최종 표시 환율 */}
            <div className="est-flow">
              <button type="button"
                className={`est-tile is-clickable ${exchangeRateFetchFailed ? 'is-error' : ''} ${isRefreshing ? 'is-pulsing' : ''}`}
                style={{ ['--c' as string]: TONE.rate } as React.CSSProperties}
                onClick={handleForceRefresh}
                title={exchangeRateFetchFailed ? '환율 조회 실패 - 눌러서 다시 시도' : '눌러서 환율 즉시 새로고침'}>
                <span className="est-tile-label"><i />현재 환율 <ArrowClockwise size={11} weight="bold" className={isRefreshing ? 'ap-spin' : ''} /></span>
                <span className="est-tile-value">
                  {exchangeRateFetchFailed
                    ? <span className="est-tile-error"><Warning size={14} weight="fill" /> 조회 실패</span>
                    : <>{baseRateView.toFixed(2)}<small>원</small></>}
                </span>
                <span className="est-tile-foot">{exchangeRateFetchFailed ? '임시값 사용 중 · 눌러서 재시도' : `1엔 = ${exchangeRate.toFixed(4)}원`}</span>
              </button>

              <span className="est-flow-op">+</span>

              <div className="est-tile is-input" style={{ ['--c' as string]: TONE.add } as React.CSSProperties}>
                <span className="est-tile-label"><i />추가 증가액</span>
                <label className="est-tile-field">
                  <input type="number" inputMode="numeric" value={addRate || ''} placeholder="0" aria-label="추가 증가액"
                    onChange={e => { setAddRate(Number(e.target.value)); setConfirmApply(false); }} />
                  <small>원</small>
                </label>
                <span className="est-quick">
                  {[-10, 10, 50].map(step => (
                    <button key={step} type="button" onClick={() => { setAddRate(a => a + step); setConfirmApply(false); }}>
                      {step > 0 ? '+' : ''}{step}
                    </button>
                  ))}
                  <button type="button" className="is-reset" disabled={!addRateDirty}
                    onClick={() => { setAddRate(savedAddRate); setConfirmApply(false); }} title="저장된 값으로 되돌리기">
                    <ArrowCounterClockwise size={11} weight="bold" />
                  </button>
                </span>
              </div>

              <span className="est-flow-op">=</span>

              <div className="est-tile is-final" style={{ ['--c' as string]: TONE.final } as React.CSSProperties}>
                <span className="est-tile-label"><i />최종 표시 환율</span>
                <span className="est-tile-value">{finalRateView.toFixed(2)}<small>원</small></span>
                <span className="est-tile-foot">
                  1엔 = {perYen.toFixed(4)}원
                  {baseRateView > 0 && <em className={addRate >= 0 ? 'is-up' : 'is-down'}> · 마진 {addRate >= 0 ? '+' : ''}{((addRate / baseRateView) * 100).toFixed(2)}%</em>}
                </span>
              </div>
            </div>

            <div className={`est-apply ${addRateDirty ? 'is-dirty' : ''}`}>
              <div className="est-apply-text">
                <strong>추가 증가액을 사이트 전체에 적용</strong>
                <span>적용하면 홈페이지의 모든 이용자에게 <b>최종 표시 환율</b> 기준 금액이 보입니다.
                  {addRateDirty && <> 현재 적용된 값은 <b>{savedAddRate.toLocaleString()}원</b>입니다.</>}</span>
              </div>
              {confirmApply ? (
                <span className="ap-confirm">
                  <button type="button" className="ap-btn is-ghost" onClick={() => setConfirmApply(false)} disabled={isApplyingGlobal}>취소</button>
                  <button type="button" className="ap-btn is-danger" onClick={handleApplyGlobally} disabled={isApplyingGlobal}>
                    {isApplyingGlobal ? '적용 중…' : `${addRate.toLocaleString()}원 적용`}
                  </button>
                </span>
              ) : (
                <button type="button" className="ap-btn is-lg is-primary" onClick={() => setConfirmApply(true)} disabled={!addRateDirty}>
                  {addRateDirty ? '전체 적용' : <><CheckCircle size={14} weight="fill" /> 적용됨</>}
                </button>
              )}
            </div>
          </section>

          {/* ================= 2. 상품 및 수수료 정보 ================= */}
          <section className="ap-panel est-panel">
            <div className="est-panel-head">
              <span className="est-panel-icon" style={{ ['--c' as string]: TONE.price } as React.CSSProperties}><Package size={17} weight="duotone" /></span>
              <div className="est-panel-title">
                <strong>상품 및 수수료 정보</strong>
                <span>수수료는 등급·수수료 규칙에 따라 자동으로 계산되며, 필요하면 직접 고칠 수 있습니다 · 단위: 엔(¥)</span>
              </div>
              <span className="est-pill is-sum">합계 <b>¥{yenTotal.toLocaleString()}</b></span>
            </div>

            <div className="est-fields">
              {/* 상품 가격 */}
              <div className="est-field is-wide" style={{ ['--c' as string]: TONE.price } as React.CSSProperties}>
                <span className="est-field-head">
                  <span className="est-field-icon"><Package size={15} weight="duotone" /></span>
                  <span className="est-field-label">상품 가격<em>일본 쇼핑몰에 표시된 금액</em></span>
                </span>
                <label className="est-field-input is-lg">
                  <input type="number" inputMode="numeric" value={salePrice || ''} placeholder="0" aria-label="상품 가격"
                    onChange={e => setSalePrice(Number(e.target.value))} />
                  <small>엔</small>
                </label>
                <span className="est-field-foot">≈ ₩{Math.round(salePrice * perYen).toLocaleString()}</span>
              </div>

              {/* 상품 수량 */}
              <div className="est-field" style={{ ['--c' as string]: TONE.qty } as React.CSSProperties}>
                <span className="est-field-head">
                  <span className="est-field-icon"><HandCoins size={15} weight="duotone" /></span>
                  <span className="est-field-label">상품 수량<em>대행 수수료 계산 기준</em></span>
                </span>
                <div className="est-stepper">
                  <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="수량 줄이기"><Minus size={14} weight="bold" /></button>
                  <input type="number" inputMode="numeric" min={1} value={quantity} aria-label="상품 수량"
                    onChange={e => setQuantity(Math.max(1, Math.floor(Number(e.target.value)) || 1))} />
                  <button type="button" onClick={() => setQuantity(q => q + 1)} aria-label="수량 늘리기"><Plus size={14} weight="bold" /></button>
                </div>
                <span className="est-field-foot">
                  {quantity < agencyFeeRule.thresholdValue
                    ? `${agencyFeeRule.thresholdValue}개 미만 · 고정 ¥${agencyFeeRule.belowThresholdFee.toLocaleString()}`
                    : `${agencyFeeRule.thresholdValue}개 이상 · 개당 ¥${agencyFeeRule.atOrAboveThresholdAmount.toLocaleString()}`}
                </span>
              </div>

              {/* 대행 수수료 (자동) */}
              <div className="est-field is-auto" style={{ ['--c' as string]: TONE.agency } as React.CSSProperties}>
                <span className="est-field-head">
                  <span className="est-field-icon"><HandCoins size={15} weight="duotone" /></span>
                  <span className="est-field-label">대행 수수료<em>수량 {quantity}개 기준</em></span>
                  <span className="est-auto">자동</span>
                </span>
                <span className="est-field-value">{agencyFee.toLocaleString()}<small>엔</small></span>
                <span className="est-field-foot">≈ ₩{Math.round(agencyFee * perYen).toLocaleString()}</span>
              </div>

              {/* 결제 수수료 */}
              <div className="est-field" style={{ ['--c' as string]: TONE.pay } as React.CSSProperties}>
                <span className="est-field-head">
                  <span className="est-field-icon"><Receipt size={15} weight="duotone" /></span>
                  <span className="est-field-label">결제 수수료<em>가격 ¥{paymentFeeRule.thresholdValue.toLocaleString()} 미만 {paymentFeeRule.belowThresholdFee} · 이상 {paymentFeeRule.atOrAboveThresholdAmount}</em></span>
                  <span className="est-auto is-editable">자동 · 수정 가능</span>
                </span>
                <label className="est-field-input">
                  <input type="number" inputMode="numeric" value={paymentFee || ''} placeholder="0" aria-label="결제 수수료"
                    onChange={e => setPaymentFee(Number(e.target.value))} />
                  <small>엔</small>
                </label>
                <span className="est-field-foot">≈ ₩{Math.round(paymentFee * perYen).toLocaleString()}</span>
              </div>

              {/* 일본 내 배송료 */}
              <div className="est-field" style={{ ['--c' as string]: TONE.tax } as React.CSSProperties}>
                <span className="est-field-head">
                  <span className="est-field-icon"><Truck size={15} weight="duotone" /></span>
                  <span className="est-field-label">일본 내 배송료<em>판매처 → 일본 창고</em></span>
                </span>
                <label className="est-field-input">
                  <input type="number" inputMode="numeric" value={dailyTax || ''} placeholder="0" aria-label="일본 내 배송료"
                    onChange={e => setDailyTax(Number(e.target.value))} />
                  <small>엔</small>
                </label>
                <span className="est-field-foot">≈ ₩{Math.round(dailyTax * perYen).toLocaleString()}</span>
              </div>
            </div>

            {/* 구성 비율 막대 */}
            <div className="est-mix">
              <div className="est-mix-bar" aria-hidden="true">
                {yenTotal > 0
                  ? breakdown.map(b => b.yen > 0 && <i key={b.key} style={{ width: `${(b.yen / yenTotal) * 100}%`, background: b.color }} title={`${b.label} ${((b.yen / yenTotal) * 100).toFixed(1)}%`} />)
                  : <i style={{ width: '100%', background: '#e2e8f0' }} />}
              </div>
              <div className="est-mix-legend">
                {breakdown.map(b => (
                  <span key={b.key}><i style={{ background: b.color }} />{b.label.replace(/ \(\d+개\)$/, '')} <b>{yenTotal > 0 ? `${((b.yen / yenTotal) * 100).toFixed(0)}%` : '-'}</b></span>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* ================= 오른쪽: 결과 ================= */}
        <aside className="est-summary" id="est-summary">
          <div className="est-summary-glow" aria-hidden="true" />
          <span className="est-summary-label">
            <Calculator size={14} weight="bold" /> 최종 결제 예상액
            {isCalculating && <span className="est-calc-dot" aria-label="계산 중" />}
          </span>

          <button type="button" className={`est-total ${isCopied ? 'is-copied' : ''}`} onClick={handleCopyAmount} title="눌러서 금액 복사">
            <span className="est-cur">₩</span>{resultCount.toLocaleString()}
          </button>
          <span className={`est-copy-hint ${isCopied ? 'is-copied' : ''}`}>
            {isCopied ? <><CheckCircle size={13} weight="fill" /> 금액을 복사했습니다</> : <><Copy size={12} weight="bold" /> 금액을 누르면 복사됩니다</>}
          </span>

          <ul className="est-breakdown">
            {breakdown.map(b => (
              <li key={b.key}>
                <span className="est-bd-name"><i style={{ background: b.color }} />{b.icon}{b.label}</span>
                <span className="est-bd-yen">¥{b.yen.toLocaleString()}</span>
                <span className="est-bd-won">≈ ₩{Math.round(b.yen * perYen).toLocaleString()}</span>
              </li>
            ))}
            <li className="is-total">
              <span className="est-bd-name">엔화 합계</span>
              <span className="est-bd-yen">¥{yenTotal.toLocaleString()}</span>
              <span className="est-bd-won">× {perYen.toFixed(4)}</span>
            </li>
          </ul>

          {/* 🧮 적용된 계산 공식 — 3단계로 풀어서 보여줍니다 */}
          <div className="est-formula">
            <div className="est-formula-head">
              <span className="est-formula-label"><Info size={14} weight="bold" /> 적용된 계산 공식</span>
              <span className="est-formula-eq">적용 환율 × 엔화 합계</span>
            </div>

            {/* ① 1엔당 적용 환율 */}
            <div className="est-step">
              <span className="est-step-no">1</span>
              <div className="est-step-body">
                <span className="est-step-title">1엔당 적용 환율</span>
                <div className="est-terms">
                  <span className="est-term" style={{ ['--t' as string]: '#60a5fa' } as React.CSSProperties}>
                    <b>{exchangeRate.toFixed(4)}</b><small>현재 환율</small>
                  </span>
                  <span className="est-op">+</span>
                  {/* 🐛 저장 경로와 같게 설정값(rateBasisUnit)으로 나눕니다. */}
                  <span className="est-term" style={{ ['--t' as string]: '#a78bfa' } as React.CSSProperties}>
                    <b>{parseFloat((addRate / rateBasisUnit).toFixed(4))}</b><small>추가 증가액</small>
                  </span>
                </div>
                <div className="est-step-result">
                  <span className="est-op">=</span>
                  <span className="est-term is-result" style={{ ['--t' as string]: '#fda4af' } as React.CSSProperties}>
                    <b>{perYen.toFixed(4)}<i>원</i></b><small>적용 환율</small>
                  </span>
                </div>
              </div>
            </div>

            {/* ② 엔화 합계 */}
            <div className="est-step">
              <span className="est-step-no">2</span>
              <div className="est-step-body">
                <span className="est-step-title">엔화 합계</span>
                <div className="est-terms is-sum">
                  <span className="est-term" style={{ ['--t' as string]: '#fbbf24' } as React.CSSProperties}>
                    <b>{salePrice.toLocaleString()}</b><small>상품 가격</small>
                  </span>
                  <span className="est-op">+</span>
                  <span className="est-term" style={{ ['--t' as string]: '#fb923c' } as React.CSSProperties}>
                    <b>{paymentFee.toLocaleString()}</b><small>결제 수수료</small>
                  </span>
                  <span className="est-op">+</span>
                  <span className="est-term" style={{ ['--t' as string]: '#f472b6' } as React.CSSProperties}>
                    <b>{dailyTax.toLocaleString()}</b><small>일본 내 배송료</small>
                  </span>
                  <span className="est-op">+</span>
                  <span className="est-term" style={{ ['--t' as string]: '#38bdf8' } as React.CSSProperties}>
                    <b>{agencyFee.toLocaleString()}</b><small>대행 수수료</small>
                  </span>
                </div>
                <div className="est-step-result">
                  <span className="est-op">=</span>
                  <span className="est-term is-result" style={{ ['--t' as string]: '#fde68a' } as React.CSSProperties}>
                    <b><i>¥</i>{yenTotal.toLocaleString()}</b><small>엔화 합계</small>
                  </span>
                </div>
              </div>
            </div>

            {/* ③ 최종 금액 */}
            <div className="est-step is-final">
              <span className="est-step-no">3</span>
              <div className="est-step-body">
                <span className="est-step-title">최종 결제 예상액</span>
                <div className="est-terms">
                  <span className="est-term" style={{ ['--t' as string]: '#fda4af' } as React.CSSProperties}>
                    <b>{perYen.toFixed(4)}</b><small>적용 환율</small>
                  </span>
                  <span className="est-op">×</span>
                  <span className="est-term" style={{ ['--t' as string]: '#fde68a' } as React.CSSProperties}>
                    <b>{yenTotal.toLocaleString()}</b><small>엔화 합계</small>
                  </span>
                </div>
                <div className="est-step-result">
                  <span className="est-op">=</span>
                  <span className="est-term is-total" style={{ ['--t' as string]: '#6ee7b7' } as React.CSSProperties}>
                    <b><i>₩</i>{resultCount.toLocaleString()}</b><small>결제 예상액</small>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="est-note">표시 금액은 서버 계산 결과이며, 국제 배송비는 포함되지 않습니다.</p>
        </aside>
      </div>

      {/* 📱 모바일: 결과 카드가 맨 아래에 있으므로 화면 하단에 최종 금액을 항상 띄워 둡니다 */}
      <div className="est-mobile-bar" role="status">
        <span className="est-mb-text">
          <span className="est-mb-label">최종 결제 예상액{isCalculating && <span className="est-calc-dot" aria-label="계산 중" />}</span>
          <button type="button" className={`est-mb-total ${isCopied ? 'is-copied' : ''}`} onClick={handleCopyAmount} title="눌러서 금액 복사">
            <span>₩</span>{resultCount.toLocaleString()}
          </button>
        </span>
        <span className="est-mb-actions">
          <button type="button" className="est-mb-btn" onClick={handleCopyAmount} aria-label="금액 복사">
            {isCopied ? <CheckCircle size={16} weight="fill" /> : <Copy size={15} weight="bold" />}
          </button>
          <a className="est-mb-btn is-go" href="#est-summary">내역 보기</a>
        </span>
      </div>

      <ToastStack toasts={toasts} />
    </div>
  );
}
