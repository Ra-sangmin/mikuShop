"use client"; // 🌟 클라이언트 컴포넌트 선언 추가

import React, { useState, useEffect, useRef } from 'react'; // 🌟 Hook 추가
import GuideLayout from '../../components/GuideLayout';
import PurchaseFormContainer from '../../components/PurchaseFormContainer';
import { useRouter } from 'next/navigation'; // 🌟 라우터 추가
import { useMikuAlert } from '@/app/context/MikuAlertContext'; // 🌟 미쿠짱 전용 Alert 추가

import { ORDER_TYPE, OrderType } from '@/src/types/order';

export default function DeliveryRequestPage() {
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
        router.push('/login');
      }
      return;
    }

    // 2. 로그인이 확인되면 인증 화면을 끄고 본 화면 렌더링
    setIsAuthChecking(false);
  }, [router, showAlert]);

  // 공통 타입을 상수로 선언
  const PAGE_TYPE: OrderType = ORDER_TYPE.DELIVERY;

  // 🌟 로그인 여부 확인 중일 때는 빈 화면을 렌더링해 깜빡임 방지
  if (isAuthChecking) {
    return <div style={{ height: '100vh', backgroundColor: '#fdfdfd' }} />;
  }

  return (
    <GuideLayout title="배송신청" type={PAGE_TYPE} hideSidebar={true}>
      <PurchaseFormContainer type={PAGE_TYPE}/>
    </GuideLayout>
  );
}