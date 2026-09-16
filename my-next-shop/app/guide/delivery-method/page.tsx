"use client";
import React from 'react';
import Link from 'next/link';
import GuideLayout from '../../components/GuideLayout';
import '../guide-common.css';
import GuidePremiumHero from '../components/GuidePremiumHero';
import GuideTitle from '../components/GuideTitle';
import {
  ShoppingCartSimple, ClipboardText, Warehouse, Coins, AirplaneTilt, Truck, ArrowRight,
} from '@phosphor-icons/react';

// 🌟 배송대행 이용 절차 (스타일: ../guide-common.css의 .gp-steps)
const STEPS = [
  { icon: <ShoppingCartSimple weight="bold" />, title: '일본 쇼핑몰에서 상품 구매', desc: '직접 구매하실 때 배송지를 미쿠짱 일본 배송주소로 입력해 주세요.' },
  { icon: <ClipboardText weight="bold" />, title: '배송대행 신청서 작성', desc: '구매한 상품의 정보(URL, 가격, 수량 등)를 신청서에 등록합니다.' },
  { icon: <Warehouse weight="bold" />, title: '현지 센터 도착 및 검수', desc: '센터에 도착한 상품의 무게를 재고 신청 내용과 대조합니다.' },
  { icon: <Coins weight="bold" />, title: '국제 배송비 결제', desc: '측정된 무게를 기준으로 국제 배송비를 결제합니다.', tag: '결제' },
  { icon: <AirplaneTilt weight="bold" />, title: '국제 배송 및 수령', desc: '통관을 거쳐 입력하신 한국 주소로 배송됩니다.' },
];

export default function DeliveryMethodPage() {
  return (
    <GuideLayout title="배송대행 신청방법" type="guide">
      <div className="guide-page-container">
        {/* 🌟 요약 카드 + 제목 — mypage/wishlist 와 같은 구성 (카드가 제목 위) */}
        <GuidePremiumHero
          ariaLabel="배송대행 이용 절차 요약"
          eyebrow="SHIPPING SERVICE"
          title={<>직접 구매한 상품을 <em>안전하게 한국으로</em></>}
          desc="일본에서 직접 구매하신 상품을 미쿠짱 센터에서 받아 한국까지 보내드립니다. 5단계로 진행돼요."
          icon={<Truck weight="duotone" />}
          feature={{
            label: <><i className="fa fa-truck-fast"></i> 배송대행</>,
            value: '5단계',
            sub: '신청부터 수령까지',
            actions: [
              { href: '/delivery/request', label: <><i className="fa fa-truck-fast"></i> 배송대행 신청</>, primary: true },
              { href: '/delivery/address', label: <><i className="fa fa-location-dot"></i> 일본 배송주소</> },
            ],
          }}
          stats={[
            { label: '결제', value: '국제 배송비 1회', text: true },
            { label: '배송대행 수수료', value: '¥200' },
            { label: '국제배송 요금표', value: <>보러가기 <i className="fa fa-arrow-right"></i></>, text: true, href: '/guide/shipping-fee' },
            { label: '구매대행 방법', value: <>보러가기 <i className="fa fa-arrow-right"></i></>, text: true, href: '/guide/purchase-method' },
          ]}
        />

        <GuideTitle eyebrow="Shipping Service" title="배송대행 이용 프로세스" icon="fa-truck-fast" />

        <div className="guide-panel">

          <div className="gp-section-head">
            <div>
              <span className="gp-eyebrow">Process</span>
              <h3 className="gp-section-title">이용 절차</h3>
            </div>
          </div>

          <ol className="gp-steps">
            {STEPS.map((step, i) => (
              <li key={step.title} className="gp-step">
                <div className="gp-step-rail"><span className="gp-step-no">{step.icon}</span></div>
                <div className="gp-step-card">
                  <div className="gp-step-text">
                    <span className="gp-step-label">STEP {String(i + 1).padStart(2, '0')}</span>
                    <h4 className="gp-step-title">{step.title}</h4>
                    <p className="gp-step-desc">{step.desc}</p>
                  </div>
                  {step.tag && <span className="gp-chip gp-step-tag">{step.tag}</span>}
                </div>
              </li>
            ))}
          </ol>

          <div className="gp-cta">
            <div className="gp-cta-text">
              <strong>일본 배송주소가 필요하신가요?</strong>
              <span>구매 전에 배송주소를 확인하고, 상품이 도착하면 신청서를 작성해 주세요.</span>
            </div>
            <div className="gp-cta-actions">
              <Link href="/delivery/address" className="gp-btn is-ghost">일본 배송주소 확인</Link>
              <Link href="/delivery/request" className="gp-btn is-primary">배송대행 신청 <ArrowRight weight="bold" /></Link>
            </div>
          </div>
        </div>
      </div>
    </GuideLayout>
  );
}
