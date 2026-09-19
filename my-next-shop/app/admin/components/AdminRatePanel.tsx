"use client";

/**
 * 💱 관리자 상단(헤더) 모바일 환율 설정 패널
 * - 모바일(768px 이하) 헤더에만 보입니다. (데스크톱은 기존 환율 카드 그대로)
 * - 기본은 닫힘: "환율 설정 · 100엔 = 1000.00원" 한 줄
 * - 펼치면: 현재 환율(눌러서 새로고침) · 추가 증가액(입력) · 최종 표시 환율 · 사이트 적용(한 번 더 확인)
 * - 값이 바뀌면 'exchangeRateConfigUpdated' 이벤트(detail 에 최신 값)를 보내
 *   헤더의 다른 표시와 견적 계산기 화면이 같이 갱신됩니다.
 */

import { useCallback, useEffect, useState } from 'react';
import { Globe, CaretDown, ArrowClockwise, CheckCircle, Warning } from '@phosphor-icons/react';

export type ExchangeRateDetail = {
  baseExchangeRate: number;      // 1엔당 원 (네이버)
  additionalRate: number;        // 1엔당 추가 증가액
  exchangeRateBasisUnit: number; // 표시 기준 (예: 100엔)
  exchangeRateFetchFailed?: boolean;
};

export const EXCHANGE_RATE_EVENT = 'exchangeRateConfigUpdated';

export default function AdminRatePanel() {
  const [open, setOpen] = useState(false);
  const [baseRate, setBaseRate] = useState(0);          // 1엔당
  const [basis, setBasis] = useState(100);
  const [addRate, setAddRate] = useState(0);            // 기준(100엔)당 원
  const [savedAddRate, setSavedAddRate] = useState(0);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const applyDetail = useCallback((d: ExchangeRateDetail, keepDraft = false) => {
    setBaseRate(d.baseExchangeRate);
    setBasis(d.exchangeRateBasisUnit);
    setFetchFailed(!!d.exchangeRateFetchFailed);
    const won = d.additionalRate * d.exchangeRateBasisUnit;
    setSavedAddRate(won);
    if (!keepDraft) setAddRate(won);
  }, []);

  const load = useCallback(async (force = false) => {
    const res = await fetch('/api/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ salePrice: 0, quantityCount: 0, ...(force ? { forceRefresh: true } : {}) }),
    });
    const data = await res.json();
    if (!data.success) throw new Error('fail');
    return data.data as ExchangeRateDetail;
  }, []);

  useEffect(() => {
    load().then(d => applyDetail(d)).catch(() => {});
    // 다른 곳(견적 계산기 등)에서 바꾸면 따라갑니다.
    const onUpdate = (e: Event) => {
      const d = (e as CustomEvent<ExchangeRateDetail | undefined>).detail;
      if (d) applyDetail(d);
      else load().then(x => applyDetail(x)).catch(() => {});
    };
    window.addEventListener(EXCHANGE_RATE_EVENT, onUpdate);
    return () => window.removeEventListener(EXCHANGE_RATE_EVENT, onUpdate);
  }, [load, applyDetail]);

  const flash = (type: 'ok' | 'err', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 2600);
  };

  const refresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const d = await load(true);
      applyDetail(d);
      window.dispatchEvent(new CustomEvent(EXCHANGE_RATE_EVENT, { detail: d }));
      flash(d.exchangeRateFetchFailed ? 'err' : 'ok', d.exchangeRateFetchFailed ? '환율 조회 실패 · 임시값 사용 중' : '최신 환율을 불러왔습니다.');
    } catch {
      flash('err', '환율을 불러오지 못했습니다.');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const apply = async () => {
    if (isApplying) return;
    setIsApplying(true);
    try {
      const res = await fetch('/api/estimate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ additionalRate: addRate / basis }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedAddRate(addRate);
        const detail: ExchangeRateDetail = {
          baseExchangeRate: baseRate, additionalRate: addRate / basis, exchangeRateBasisUnit: basis, exchangeRateFetchFailed: fetchFailed,
        };
        window.dispatchEvent(new CustomEvent(EXCHANGE_RATE_EVENT, { detail }));
        flash('ok', `추가 증가액 ${addRate.toLocaleString()}원을 적용했습니다.`);
      } else {
        flash('err', data.message || '적용 중 오류가 발생했습니다.');
      }
    } catch {
      flash('err', '적용 중 오류가 발생했습니다.');
    } finally {
      setIsApplying(false);
      setConfirming(false);
    }
  };

  const baseView = baseRate * basis;
  const finalView = baseView + addRate;
  const dirty = Math.abs(addRate - savedAddRate) > 0.0001;

  return (
    <div className={`arp ${open ? 'is-open' : ''}`}>
      <button type="button" className="arp-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="arp-icon"><Globe size={15} weight="duotone" /></span>
        <span className="arp-title">환율 설정</span>
        <span className="arp-value" translate="no">
          {basis}엔 = <b>{finalView.toFixed(2)}원</b>
        </span>
        {dirty && <span className="arp-dirty">미적용</span>}
        {fetchFailed && !dirty && <span className="arp-dirty is-err"><Warning size={10} weight="fill" /> 임시</span>}
        <CaretDown size={14} weight="bold" className="arp-caret" />
      </button>

      {open && (
        <div className="arp-body">
          <div className="arp-grid">
            <button type="button" className="arp-tile is-btn" style={{ ['--c' as string]: '#60a5fa' } as React.CSSProperties} onClick={refresh}>
              <span className="arp-tile-label">현재 환율 <ArrowClockwise size={11} weight="bold" className={isRefreshing ? 'arp-spin' : ''} /></span>
              <span className="arp-tile-val">{fetchFailed ? '조회 실패' : baseView.toFixed(2)}<small>원</small></span>
            </button>
            <label className="arp-tile is-input" style={{ ['--c' as string]: '#a78bfa' } as React.CSSProperties}>
              <span className="arp-tile-label">추가 증가액</span>
              <span className="arp-tile-val">
                <input type="number" inputMode="numeric" value={addRate || ''} placeholder="0" aria-label="추가 증가액"
                  style={{ width: `${Math.max(2, String(addRate || '0').length) + 0.6}ch` }}
                  onChange={e => { setAddRate(Math.max(0, Number(e.target.value))); setConfirming(false); }} />
                <small>원</small>
              </span>
            </label>
            <div className="arp-tile is-final" style={{ ['--c' as string]: '#fda4af' } as React.CSSProperties}>
              <span className="arp-tile-label">최종 표시 환율</span>
              <span className="arp-tile-val">{finalView.toFixed(2)}<small>원</small></span>
            </div>
          </div>

          {confirming ? (
            <div className="arp-confirm">
              <span>모든 이용자 화면에 {addRate.toLocaleString()}원을 적용할까요?</span>
              <div>
                <button type="button" className="arp-btn is-ghost" onClick={() => setConfirming(false)} disabled={isApplying}>취소</button>
                <button type="button" className="arp-btn is-danger" onClick={apply} disabled={isApplying}>
                  {isApplying ? '적용 중…' : '적용'}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="arp-btn is-primary" onClick={() => setConfirming(true)} disabled={!dirty}>
              {dirty ? '추가 증가액 사이트에 적용' : <><CheckCircle size={15} weight="fill" /> 사이트에 적용됨</>}
            </button>
          )}

          {message && <p className={`arp-msg is-${message.type}`} role="status">{message.text}</p>}
        </div>
      )}
    </div>
  );
}
