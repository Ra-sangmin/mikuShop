"use client";

import React, { useState, useEffect, useRef } from 'react';
import GuideLayout from '../../components/GuideLayout';
import NoticePanel from '../../components/NoticePanel';
import JapanAddressCard from '../../components/JapanAddressCard';
import '../../guide/guide-common.css';
import GuideTitle from '@/app/guide/components/GuideTitle';
import GuidePremiumHero from '@/app/guide/components/GuidePremiumHero';
import { MapPin } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useMikuAlert } from '@/app/context/MikuAlertContext';

// 🌟 배송대행 > 일본 배송주소 확인
// 배송대행 신청 전에 쇼핑몰 배송지로 입력할 미쿠짱 일본 창고 주소를 보여줍니다.
// (마이페이지 > 나의 배송지 정보에도 같은 카드(JapanAddressCard)가 있습니다.)
export default function DeliveryAddressPage() {
  const router = useRouter();
  const { showAlert } = useMikuAlert();
  const hasAlerted = useRef(false);

  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [userName, setUserName] = useState('');
  const [mailboxNumber, setMailboxNumber] = useState('');

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

    // 2. 로그인이 확인되면 본 화면 렌더링 + 받는사람 이름 조회
    setIsAuthChecking(false);
    fetch(`/api/users?id=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.success) return;
        setUserName(data.user?.name || '');
        // 📦 회원별 사서함 번호. 예전에 가입한 회원은 아직 없을 수 있습니다.
        setMailboxNumber(data.user?.japanMailboxNumber || '');
      })
      .catch(() => {});
  }, [router, showAlert]);

  if (isAuthChecking) {
    return <div style={{ height: '100vh', backgroundColor: '#fdfdfd' }} />;
  }

  return (
    <GuideLayout title="일본 배송주소 확인" type="delivery">
      <div className="order-form-page">
        {/* 🌟 얇은 요약 카드 (다른 화면의 검은색 카드와 같은 톤, 통계 없이) */}
        <GuidePremiumHero
          className="is-slim"
          ariaLabel="일본 배송주소 안내"
          eyebrow="JAPAN ADDRESS"
          title={<>쇼핑몰 배송지에 입력할 <em>미쿠짱 일본 주소</em></>}
          desc="아래 주소로 받은 상품은 미쿠짱 센터에 입고되고, 배송대행 신청으로 한국까지 보내드려요."
          icon={<MapPin weight="duotone" />}
        />
        <GuideTitle eyebrow="Japan Address" title="일본 배송주소 확인" icon="fa-location-dot" />

        {/* 🌟 제목 아래 안내문·주소 카드·필독사항을 다른 화면과 같은 흰 패널로 묶습니다 */}
        <div className="guide-panel delivery-address-panel">
          <p className="delivery-address-lead">
            일본 쇼핑몰에서 주문하실 때 아래 주소를 <strong>배송지</strong>로 입력해 주세요.
            상품이 창고에 도착하면 <strong>배송대행 신청</strong>으로 한국 발송을 요청하실 수 있습니다.
          </p>

          <JapanAddressCard userName={userName} mailboxNumber={mailboxNumber} />

          <NoticePanel tone="amber" title="이용 전 필독사항" className="delivery-address-notice">
            <ul>
              <li>현지 창고 사정에 따라 주소가 예고 없이 변경될 수 있습니다.</li>
              <li><strong>대비키(착불 결제)</strong> 상품은 수령이 불가하여 반송 처리됩니다.</li>
              <li>사서함 번호 미기재 시 미확인 화물로 분류되어 입고가 지연됩니다.</li>
            </ul>
          </NoticePanel>
        </div>
      </div>

      <style jsx global>{`
        .delivery-address-lead { margin: 0 0 20px; font-size: 15px; line-height: 1.7; color: #475569; }
        .delivery-address-lead strong { color: #0f172a; }
        .delivery-address-notice { margin-top: 24px; }
        /* 🌟 흰 패널 안에 들어간 주소 카드 상단의 파란 띠 제거 (패널의 액센트 라인과 겹쳐 보임) */
        .delivery-address-panel .jp-card::before { display: none; }
        @media (max-width: 768px) {
          .delivery-address-lead { font-size: 14px; }
          .delivery-address-notice { margin-top: 18px; }
        }
      `}</style>
    </GuideLayout>
  );
}
