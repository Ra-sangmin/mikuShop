"use client";

import React, { useState, useEffect, useRef } from 'react'; // 🌟 Hook 추가
import GuideLayout from '@/app/components/GuideLayout';
import PurchaseFormContainer from '@/app/components/PurchaseFormContainer';
import '@/app/guide/guide-common.css';
import GuideTitle from '@/app/guide/components/GuideTitle';
import GuidePremiumHero from '@/app/guide/components/GuidePremiumHero';
import { ShoppingCartSimple } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation'; // 🌟 라우터 추가
import { useMikuAlert } from '@/app/context/MikuAlertContext'; // 🌟 미쿠짱 전용 Alert 추가

import { ORDER_TYPE, OrderType } from '@/src/types/order';

export default function PurchaseRequestPage() {
  const router = useRouter(); // 🌟 라우터 초기화
  const { showAlert } = useMikuAlert(); // 🌟 Alert 초기화
  const hasAlerted = useRef(false); // 🌟 알림 중복 방지

  const [isAuthChecking, setIsAuthChecking] = useState(true); // 🌟 로그인 확인 상태

  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    
    // 1. 로그인이 안 되어 있다면
    if (!userId) {
      if (!hasAlerted.current) {
        hasAlerted.current = true;
        showAlert('로그인이 필요한 페이지입니다.', 'warning');
        router.push('/auth/login');
      }
      return;
    }

    // 2. 로그인이 확인되면 인증 화면을 끄고 본 화면 렌더링
    setIsAuthChecking(false);
  }, [router, showAlert]);

  // 공통 타입을 상수로 선언
  const PAGE_TYPE: OrderType = ORDER_TYPE.PURCHASE;

  // 🌟 로그인 여부 확인 중일 때는 빈 화면을 렌더링해 깜빡임 방지
  if (isAuthChecking) {
    return <div style={{ height: '100vh', backgroundColor: '#fdfdfd' }} />;
  }

  return (
    <GuideLayout title="구매대행 신청" type={PAGE_TYPE}>
      <div className="order-form-page">
        {/* 🌟 얇은 요약 카드 (다른 화면의 검은색 카드와 같은 톤, 폼이 밀리지 않도록 통계 없이) */}
        <GuidePremiumHero
          className="is-slim"
          ariaLabel="구매대행 신청 안내"
          eyebrow="BUYING SERVICE"
          title={<>일본 상품, <em>미쿠짱이 대신</em> 구매해 드려요</>}
          desc="상품 링크와 수량을 입력해 장바구니에 담고, 미쿠짱머니로 결제하면 구매가 시작돼요."
          icon={<ShoppingCartSimple weight="duotone" />}
        />
        <GuideTitle eyebrow="Buying Service" title="구매대행 신청" icon="fa-cart-shopping" />
        <div className="guide-panel">
          <PurchaseFormContainer type={PAGE_TYPE} hideDomesticShippingFee/>
        </div>
      </div>
    </GuideLayout>
  );
}