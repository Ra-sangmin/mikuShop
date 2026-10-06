"use client";
// 💳 취소·환불 정책
//
// 결제는 단계마다 카드로 받고, 돌려드리는 돈은 모두 결제한 카드의 (부분) 취소로 돌려드립니다.
// 토스페이먼츠 가맹 심사에서 "환불 정책을 홈페이지에 게시"하는 것이 필수 조건이라 별도 페이지로 둡니다.
// 이용약관 제11조(지급방법) · 제15조(반품, 환급) · 제16조(차액정산)와 내용이 어긋나지 않게 함께 고칩니다.
import React, { useEffect, useState } from 'react';
import GuideLayout from '../../components/GuideLayout';
import '../guide-common.css';
import { GuideDocHeader, GuideBackToTop } from '../components/GuideDocTools';
import GuideTitle from '../components/GuideTitle';
import GuidePremiumHero from '../components/GuidePremiumHero';
import { ArrowCounterClockwise, Printer } from '@phosphor-icons/react';

const REFUND_EFFECTIVE_DATE = '2026년 10월 5일';

export default function GuideRefundPage() {
  // 🌟 항목 수는 본문의 조항 제목을 세어 상단 검은색 카드에 표시합니다 (약관 화면과 같은 방식)
  const [itemCount, setItemCount] = useState(0);
  useEffect(() => {
    setItemCount(document.querySelectorAll('#refund-doc .guide-section-block .guide-section-title').length);
  }, []);

  return (
    <GuideLayout title="취소·환불 정책" type="guide">
      <div className="guide-page-container">
        <GuidePremiumHero
          className="is-slim"
          ariaLabel="취소·환불 정책 안내"
          eyebrow="CANCELLATION & REFUND"
          title={<>결제하신 <em>카드로</em> 돌려드립니다</>}
          desc="단계별로 결제하신 금액을 언제, 얼마나, 어떻게 돌려드리는지 안내합니다."
          icon={<ArrowCounterClockwise weight="duotone" />}
          feature={{
            label: <><i className="fa fa-calendar"></i> 시행일자</>,
            value: <span className="gp-hero-date">{REFUND_EFFECTIVE_DATE}</span>,
            sub: itemCount > 0 ? `항목 ${itemCount}개` : undefined,
            actions: [
              { onClick: () => window.print(), label: <><Printer size={13} weight="bold" /> 인쇄하기</> },
            ],
          }}
        />
        <GuideTitle eyebrow="Cancellation & Refund" title="취소·환불 정책" icon="fa-rotate-left" />

        <GuideDocHeader docId="refund-doc" effectiveDate={REFUND_EFFECTIVE_DATE} numbered hideMeta />

        <div className="guide-doc-card gp-doc is-counted" id="refund-doc">

          <div className="guide-section-block gp-doc-intro">
            <div className="doc-content">
              <p><span className="highlight-text">미쿠짱</span>은 금액을 미리 충전해 두는 선불 결제(예치금·포인트)를 운영하지 않습니다. 서비스 단계마다 필요한 금액만 카드로 결제하며, 돌려드리는 금액은 모두 <span className="highlight-text">결제하신 카드의 결제 취소</span>로 돌려드립니다.</p>
            </div>
          </div>

          <div className="guide-section-block">
            <h2 className="guide-section-title"><span className="title-dot"></span>결제 수단과 결제 단계</h2>
            <div className="doc-content">
              <ol>
                <li>결제는 토스페이먼츠 결제창을 통한 신용·체크카드 결제 및 간편결제로 진행됩니다.</li>
                <li>결제는 다음 단계마다 해당 금액만큼 이루어집니다.
                  <ul>
                    <li>가. 상품 결제: 구매대행 상품 대금 + 결제·대행 수수료 + 일본 내 배송료</li>
                    <li>나. 경매 보증금: 입찰가의 10% (최소 20,000원). 입찰가를 올려도 보증금을 추가로 받지 않습니다.</li>
                    <li>다. 낙찰 결제: 낙찰가 + 수수료에서 이미 결제하신 보증금을 뺀 금액</li>
                    <li>라. 배송비 결제: 국제 배송비 + 현지 배송비 + 추가 비용(포장 보강·분리 배송 등)</li>
                    <li>마. 추가 결제: 배송비 결제 이후 비용이 더 생긴 경우 그 금액</li>
                  </ul>
                </li>
              </ol>
            </div>
          </div>

          <div className="guide-section-block">
            <h2 className="guide-section-title"><span className="title-dot"></span>취소·환불의 원칙</h2>
            <div className="doc-content">
              <ol>
                <li>환불은 결제하신 수단으로만 진행합니다. 계좌 송금이나 다른 카드로는 돌려드리지 않습니다.</li>
                <li>일부 금액만 돌려드리는 경우 해당 결제를 부분 취소합니다.</li>
                <li>취소 금액이 카드 대금에서 빠지거나 계좌로 돌아오기까지는 카드사 사정에 따라 영업일 기준 3~7일이 걸릴 수 있습니다.</li>
                <li>취소·환불 내역은 마이페이지 &gt; <a href="/mypage/payments">결제 내역</a>에서 확인하실 수 있습니다.</li>
              </ol>
            </div>
          </div>

          <div className="guide-section-block">
            <h2 className="guide-section-title"><span className="title-dot"></span>단계별 환불 기준</h2>
            <div className="doc-content">
              <ol>
                <li><span className="highlight-text">상품 결제 후 일본에서 구매하기 전</span> — 취소를 요청하시면 결제 금액 전액을 취소합니다.</li>
                <li><span className="highlight-text">품절 등으로 구매하지 못한 경우</span> — 사유를 알려 드리고, 결제일 또는 사유 발생일로부터 2영업일 이내에 해당 금액을 취소합니다.</li>
                <li><span className="highlight-text">일본에서 구매한 이후</span> — 이용약관 제15조(반품, 환급 등)에 따라 반품이 가능한 경우에 한해, 이미 발생한 수수료·운송비·제세금 등을 뺀 금액을 취소합니다.</li>
                <li><span className="highlight-text">경매 보증금</span>
                  <ul>
                    <li>가. 낙찰되지 못한 경우: 보증금 전액을 취소합니다.</li>
                    <li>나. 낙찰가와 수수료의 합계가 보증금보다 적은 경우: 남는 보증금을 취소합니다.</li>
                    <li>다. 낙찰 후 구매를 취소하시는 경우: 보증금은 돌려드리지 않습니다.</li>
                  </ul>
                </li>
                <li><span className="highlight-text">배송비</span> — 한국으로 발송하기 전에 취소를 요청하시면 결제하신 배송비를 취소합니다. 발송 이후에는 취소할 수 없습니다.</li>
                <li><span className="highlight-text">차액</span> — 실제 비용이 결제 금액과 다르면 금액의 크기와 관계없이 정산합니다. 더 받을 금액은 추가 결제로, 돌려드릴 금액은 해당 결제의 부분 취소로 정산합니다. (이용약관 제16조)</li>
              </ol>
            </div>
          </div>

          <div className="guide-section-block">
            <h2 className="guide-section-title"><span className="title-dot"></span>취소 신청 방법</h2>
            <div className="doc-content">
              <ol>
                <li>취소·환불은 <a href="/inquiry/kakaotalk">카카오톡 고객센터</a>로 주문번호와 함께 요청해 주세요.</li>
                <li>미쿠짱의 귀책 사유(결제 오류, 서비스 중단 등)로 인한 취소는 회원의 요청이 없어도 확인 즉시 전액 취소합니다.</li>
              </ol>
            </div>
          </div>

          <GuideBackToTop />
        </div>
      </div>
    </GuideLayout>
  );
}
