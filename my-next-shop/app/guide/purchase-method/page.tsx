"use client";
import React from 'react';
import Link from 'next/link';
import GuideLayout from '../../components/GuideLayout';
import '../guide-common.css';
import GuidePremiumHero from '../components/GuidePremiumHero';
import GuideTitle from '../components/GuideTitle';
import {
  MagnifyingGlass, CreditCard, Storefront, Warehouse, Coins, AirplaneTilt, ShoppingCartSimple, ArrowRight,
} from '@phosphor-icons/react';

// 🌟 구매대행 이용 절차 (스타일: ../guide-common.css의 .gp-steps)
const STEPS = [
  { icon: <MagnifyingGlass weight="bold" />, title: '상품 검색 및 견적 문의', desc: '일본 쇼핑몰에서 원하는 상품을 찾고, 필요하면 상품 URL로 견적을 문의하세요.' },
  { icon: <CreditCard weight="bold" />, title: '구매 신청 및 1차 결제', desc: '구매대행 신청서를 작성하고 상품 금액과 수수료를 미쿠짱 머니로 결제합니다.', tag: '1차 결제' },
  { icon: <Storefront weight="bold" />, title: '현지 구매 및 현지 배송', desc: '미쿠짱이 일본 현지에서 상품을 구매하고, 일본 내 배송으로 센터까지 받습니다.' },
  { icon: <Warehouse weight="bold" />, title: '현지 센터 도착 및 검수', desc: '센터에 도착한 상품의 무게를 재고 주문 내용과 대조합니다.' },
  { icon: <Coins weight="bold" />, title: '국제 배송비 2차 결제', desc: '측정된 무게를 기준으로 국제 배송비가 청구됩니다.', tag: '2차 결제' },
  { icon: <AirplaneTilt weight="bold" />, title: '국제 배송 및 수령', desc: '통관을 거쳐 입력하신 한국 주소로 배송됩니다.' },
];

export default function PurchaseMethodPage() {
  return (
    <GuideLayout title="구매대행 신청방법" type="guide">
      <div className="guide-page-container">
        {/* 🌟 요약 카드 + 제목 — mypage/wishlist 와 같은 구성 (카드가 제목 위) */}
        <GuidePremiumHero
          ariaLabel="구매대행 이용 절차 요약"
          eyebrow="BUYING SERVICE"
          title={<>일본 쇼핑, <em>미쿠짱이 대신</em> 구매해 드려요</>}
          desc="신청부터 수령까지 6단계로 진행됩니다. 결제는 상품 구매 시 한 번, 국제 배송 전에 한 번 나누어 진행돼요."
          icon={<ShoppingCartSimple weight="duotone" />}
          feature={{
            label: <><i className="fa fa-cart-shopping"></i> 구매대행</>,
            value: '6단계',
            sub: '신청부터 수령까지',
            actions: [
              { href: '/purchase/request', label: <><i className="fa fa-cart-shopping"></i> 구매대행 신청</>, primary: true },
              { href: '/purchase/quote', label: <><i className="fa fa-file-lines"></i> 견적 문의</> },
            ],
          }}
          stats={[
            { label: '결제', value: '2회 분할', text: true },
            { label: '구매 수수료', value: '¥100~' },
            { label: '수수료 안내', value: <>보러가기 <i className="fa fa-arrow-right"></i></>, text: true, href: '/guide/fee-guide' },
            { label: '배송대행 방법', value: <>보러가기 <i className="fa fa-arrow-right"></i></>, text: true, href: '/guide/delivery-method' },
          ]}
        />

        <GuideTitle eyebrow="Buying Service" title="구매대행 이용 프로세스" icon="fa-cart-shopping" />

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
              <strong>지금 바로 시작해 보세요</strong>
              <span>상품 URL만 있으면 견적 문의와 구매 신청을 할 수 있어요.</span>
            </div>
            <div className="gp-cta-actions">
              <Link href="/purchase/quote" className="gp-btn is-ghost">견적 문의</Link>
              <Link href="/purchase/request" className="gp-btn is-primary">구매대행 신청 <ArrowRight weight="bold" /></Link>
            </div>
          </div>
        </div>
      </div>
    </GuideLayout>
  );
}
