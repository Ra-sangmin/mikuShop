"use client";

/**
 * 💱 관리자 화면 공용 — 헤더에 보이는 "최종 표시 환율"을 1엔당 원으로 돌려줍니다.
 *
 * - /api/estimate 가 주는 exchangeRate(= baseExchangeRate + additionalRate)와 같은 값입니다.
 *   헤더 카드는 여기에 기준 단위(보통 100엔)를 곱해 "100엔 = 1000.00원"으로 보여줄 뿐입니다.
 * - 헤더 환율 패널·견적 계산기에서 환율을 바꾸면 쏘는 이벤트를 들어, 화면이 열려 있는 동안에도 따라갑니다.
 *   (admin/layout.tsx 가 헤더 카드에 쓰는 방식과 같습니다)
 */

import { useEffect, useState } from 'react';
import { EXCHANGE_RATE_EVENT, type ExchangeRateDetail } from './AdminRatePanel';

export function useAdminExchangeRate() {
  const [rate, setRate] = useState(0);          // 1엔당 원 (최종 표시 환율)
  const [basisUnit, setBasisUnit] = useState(100); // 표시 기준 (예: 100엔)

  useEffect(() => {
    let cancelled = false;

    const fetchRate = () => {
      fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salePrice: 0, quantityCount: 0 }),
      })
        .then(res => res.json())
        .then(data => {
          if (cancelled || !data.success) return;
          setRate(data.data.baseExchangeRate + data.data.additionalRate);
          setBasisUnit(data.data.exchangeRateBasisUnit);
        })
        .catch(() => {});
    };

    fetchRate();

    const onUpdate = (e: Event) => {
      const d = (e as CustomEvent<ExchangeRateDetail | undefined>).detail;
      if (d) {
        setRate(d.baseExchangeRate + d.additionalRate);
        setBasisUnit(d.exchangeRateBasisUnit);
      } else {
        fetchRate();
      }
    };
    window.addEventListener(EXCHANGE_RATE_EVENT, onUpdate);
    return () => { cancelled = true; window.removeEventListener(EXCHANGE_RATE_EVENT, onUpdate); };
  }, []);

  return { rate, basisUnit };
}

/**
 * 💴 물류센터에 엔화로 지불한 배송비를 고객에게 청구할 원화로 환산합니다.
 *    끝자리는 100원 단위로 올립니다. (마이페이지 다른 탭의 결제액과 같은 규칙)
 */
export function jpyToKrw(jpy: number, rate: number) {
  if (!jpy || !rate) return 0;
  return Math.ceil((jpy * rate) / 100) * 100;
}
