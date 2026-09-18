"use client";
import React, { useEffect, useState } from 'react';
import GuideLayout from '../../components/GuideLayout';
import '../guide-common.css';
import { GuideDocHeader, GuideBackToTop } from '../components/GuideDocTools';
import GuideTitle from '../components/GuideTitle';
import GuidePremiumHero from '../components/GuidePremiumHero';
import { ShieldCheck, Printer } from '@phosphor-icons/react';

const PRIVACY_EFFECTIVE_DATE = '2026년 9월 18일';

export default function GuidePrivacyPage() {
  // 🌟 항목 수는 본문의 조항 제목(.guide-section-title)을 세어 상단 검은색 카드에 표시합니다 (목차와 같은 기준)
  const [itemCount, setItemCount] = useState(0);
  useEffect(() => {
    setItemCount(document.querySelectorAll('#privacy-doc .guide-section-block .guide-section-title').length);
  }, []);

  return (
    <GuideLayout title="개인정보처리방침" type="guide">
      <div className="guide-page-container">
        {/* 🌟 제목 — mypage/wishlist 와 같은 구성 (영문 눈썹 + 제목 + 로즈 아이콘 뱃지) */}
        {/* 🌟 요약 카드 (다른 화면의 검은색 카드와 같은 톤) — 오른쪽에 시행일자·항목 수·인쇄 버튼을 함께 넣었습니다 */}
        <GuidePremiumHero
          className="is-slim"
          ariaLabel="개인정보처리방침 안내"
          eyebrow="PRIVACY POLICY"
          title={<>회원님의 <em>개인정보</em>, 이렇게 보호합니다</>}
          desc="어떤 정보를 수집하고 어디에 쓰며 얼마나 보관하는지 항목별로 안내합니다."
          icon={<ShieldCheck weight="duotone" />}
          feature={{
            label: <><i className="fa fa-calendar"></i> 시행일자</>,
            value: <span className="gp-hero-date">{PRIVACY_EFFECTIVE_DATE}</span>,
            sub: itemCount > 0 ? `항목 ${itemCount}개` : undefined,
            actions: [
              { onClick: () => window.print(), label: <><Printer size={13} weight="bold" /> 인쇄하기</> },
            ],
          }}
        />
        <GuideTitle eyebrow="Privacy Policy" title="개인정보처리방침" icon="fa-shield-halved" />

        <GuideDocHeader docId="privacy-doc" effectiveDate={PRIVACY_EFFECTIVE_DATE} numbered hideMeta />

        <div className="guide-doc-card gp-doc is-counted" id="privacy-doc">
          
          <div className="guide-section-block gp-doc-intro">
            <div className="doc-content">
              <p>안전한 온라인 문화의 정착을 위하여 <span className="highlight-text">미쿠짱</span>에서는 다음과 같이 개인정보 보호정책(Privacy Policy)을 명시합니다. 본 보호정책은 관련 법률 및 정부지침의 변경과 미쿠짱의 내부 방침에 의해 변경될 수 있으므로, 사이트를 방문하실 때마다 적절히 확인하여 주시기 바랍니다.</p>
            </div>
          </div>

          <div className="guide-section-block">
            <h2 className="guide-section-title"><span className="title-dot"></span>총 칙</h2>
            <div className="doc-content">
              <ol>
                <li>미쿠짱은 귀하의 개인정보보호를 매우 중요시하며, 『정보통신망 이용촉진 및 정보보호 등에 관한 법률』상의 개인정보보호 규정 및 정보통신부가 제정한 『개인정보보호지침』을 준수하고 있습니다. 미쿠짱은 개인정보처리방침을 통하여 귀하께서 제공하시는 개인정보가 어떠한 용도와 방식으로 이용되고 있으며 개인정보보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.</li>
                <li>미쿠짱은 개인정보처리방침을 홈페이지 가입 시에 공개함으로써 귀하께서 용이하게 내용을 확인하고 가입하실 수 있도록 조치하고 있습니다.</li>
                <li>미쿠짱은 개인정보처리방침의 지속적인 개선을 위하여 개인정보처리방침을 개정하는데 필요한 절차를 정하고 있습니다. 그리고 개인정보처리방침을 개정하는 경우 버전번호 등을 부여하여 개정된 사항을 귀하께서 쉽게 알아볼 수 있도록 하고 있습니다.</li>
              </ol>
            </div>
          </div>

          <div className="guide-section-block">
            <h2 className="guide-section-title"><span className="title-dot"></span>개인정보 수집에 대한 동의</h2>
            <div className="doc-content">
              <p>미쿠짱은 귀하께서 개인정보처리방침 또는 이용약관의 내용에 대해 「동의한다」버튼 또는 「동의하지 않는다」버튼을 클릭할 수 있는 절차를 마련하여, 「동의한다」버튼을 클릭하면 개인정보 수집에 대해 동의한 것으로 봅니다.</p>
            </div>
          </div>

          <div className="guide-section-block">
            <h2 className="guide-section-title"><span className="title-dot"></span>개인정보의 수집목적 및 이용목적</h2>
            <div className="doc-content">
              <ol>
                <li>미쿠짱은 다음과 같은 목적을 위하여 개인정보를 수집하고 있습니다.
                  <ul>
                    <li>서비스 제공을 위한 계약의 성립 (본인식별 및 본인의사 확인 등)</li>
                    <li>서비스의 이행 (상품배송 및 대금결제)</li>
                    <li>기타 새로운 서비스, 신상품이나 이벤트 정보 안내</li>
                  </ul>
                </li>
                <li>단, 이용자의 기본적 인권 침해의 우려가 있는 민감한 개인정보(인종 및 민족, 사상 및 신조, 출신지 및 본적지, 정치적 성향 및 범죄기록, 건강상태 및 성생활 등)는 수집하지 않습니다.</li>
              </ol>
            </div>
          </div>

          <div className="guide-section-block">
            <h2 className="guide-section-title"><span className="title-dot"></span>쿠키에 의한 개인정보 수집</h2>
            <div className="doc-content">
              <p>미쿠짱은 귀하에 대한 정보를 저장하고 수시로 찾아내는 '쿠키(cookie)'를 사용합니다. 쿠키는 웹사이트가 귀하의 컴퓨터 브라우저로 전송하는 소량의 정보입니다. 귀하께서 웹사이트에 접속을 하면 컴퓨터는 귀하의 브라우저에 있는 쿠키의 내용을 읽고, 귀하의 추가정보를 귀하의 컴퓨터에서 찾아 접속에 따른 성명 등의 추가 입력 없이 서비스를 제공할 수 있습니다.</p>
              <p>쿠키는 귀하의 컴퓨터는 식별하지만 귀하를 개인적으로 식별하지는 않습니다. 또한 귀하는 쿠키에 대한 선택권이 있습니다. 웹브라우저의 옵션을 조정함으로써 모든 쿠키를 다 받아들이거나, 쿠키가 설치될 때 통지를 보내도록 하거나, 아니면 모든 쿠키를 거부할 수 있는 선택권을 가질 수 있습니다.</p>
            </div>
          </div>

          <div className="guide-section-block">
            <h2 className="guide-section-title"><span className="title-dot"></span>목적외 사용 및 제3자에 대한 제공</h2>
            <div className="doc-content">
              <ol>
                <li>미쿠짱은 귀하의 개인정보를 &lt;개인정보의 수집목적 및 이용목적&gt;에서 고지한 범위 내에서 사용하며, 동 범위를 초과하여 이용하거나 타인 또는 타기업·기관에 제공하지 않습니다.</li>
                <li>그러나 보다 나은 서비스 제공을 위하여 귀하의 개인정보를 제휴사에게 제공하거나 또는 제휴사와 공유할 수 있습니다. 개인정보를 제공하거나 공유할 경우에는 사전에 귀하께 제휴사가 누구인지, 제공 또는 공유되는 개인정보항목이 무엇인지, 왜 그러한 개인정보가 제공되거나 공유되어야 하는지, 그리고 언제까지 어떻게 보호·관리되는지에 대해 개별적으로 전자우편 및 서면을 통해 고지하여 동의를 구하는 절차를 거하게 되며, 귀하께서 동의하지 않는 경우에는 제휴사에게 제공하거나 제휴사와 공유하지 않습니다.</li>
              </ol>
            </div>
          </div>

          <div className="guide-section-block">
            <h2 className="guide-section-title"><span className="title-dot"></span>개인정보의 열람·정정</h2>
            <div className="doc-content">
              <ol>
                <li>귀하는 언제든지 등록되어 있는 귀하의 개인정보를 열람하거나 정정하실 수 있습니다. 개인정보 열람 및 정정을 하고자 할 경우에는 &lt;개인정보수정&gt;을 클릭하여 직접 열람 또는 정정하거나, 개인정보관리책임자에게 E-mail로 연락하시면 조치하겠습니다.</li>
                <li>귀하가 개인정보의 오류에 대한 정정을 요청한 경우, 정정을 완료하기 전까지 당해 개인정보를 이용하지 않습니다.</li>
              </ol>
            </div>
          </div>

          <div className="guide-section-block">
            <h2 className="guide-section-title"><span className="title-dot"></span>개인정보 수집, 이용, 제공에 대한 동의철회</h2>
            <div className="doc-content">
              <ol>
                <li>회원가입 등을 통해 개인정보의 수집, 이용, 제공에 대해 귀하께서 동의하신 내용을 귀하는 언제든지 철회하실 수 있습니다. 동의철회는 개인정보관리책임자에게 E-mail 등으로 연락하시면 즉시 개인정보의 삭제 등 필요한 조치를 하겠습니다.</li>
                <li>미쿠짱은 개인정보의 수집에 대한 동의철회를 개인정보 수집 시와 동등한 방법 및 절차로 행사할 수 있도록 필요한 조치를 하겠습니다.</li>
              </ol>
            </div>
          </div>

          <div className="guide-section-block">
            <h2 className="guide-section-title"><span className="title-dot"></span>개인정보의 보유기간 및 이용기간</h2>
            <div className="doc-content">
              <ol>
                <li>귀하의 개인정보는 다음과 같이 개인정보의 수집목적 또는 제공받은 목적이 달성되면 파기됩니다.
                  <ul>
                    <li>회원가입정보의 경우, 회원가입을 탈퇴하거나 회원에서 제명된 때</li>
                    <li>대금지급정보의 경우, 대금의 완제일 또는 채권소멸시효기간이 만료된 때</li>
                    <li>배송정보의 경우, 물품 또는 서비스가 인도되거나 제공된 때 (단, 상법 등 법령의 규정에 의하여 보존할 필요성이 있는 경우에는 예외로 합니다.)</li>
                  </ul>
                </li>
                <li>위 보유기간에도 불구하고 계속 보유하여야 할 필요가 있을 경우에는 귀하의 동의를 받겠습니다.</li>
              </ol>
            </div>
          </div>

          <div className="guide-section-block">
            <h2 className="guide-section-title"><span className="title-dot"></span>개인정보보호를 위한 기술적 대책</h2>
            <div className="doc-content">
              <p>미쿠짱은 귀하의 개인정보를 취급함에 있어 개인정보가 분실, 도난, 누출, 변조 또는 훼손되지 않도록 안전성 확보를 위하여 다음과 같은 기술적 대책을 강구하고 있습니다.</p>
              <ol>
                <li>귀하의 개인정보는 비밀번호에 의해 보호되며, 파일 및 전송 데이터를 암호화하거나 파일 잠금기능(Lock)을 사용하여 중요한 데이터는 별도의 보안기능을 통해 보호되고 있습니다.</li>
                <li>미쿠짱은 백신프로그램을 이용하여 컴퓨터바이러스에 의한 피해를 방지하기 위한 조치를 취하고 있습니다. 백신프로그램은 주기적으로 업데이트되며 갑작스런 바이러스가 출현할 경우 백신이 나오는 즉시 이를 제공함으로써 개인정보가 침해되는 것을 방지하고 있습니다.</li>
                <li>미쿠짱은 암호알고리즘을 이용하여 네트워크 상의 개인정보를 안전하게 전송할 수 있는 보안장치(SSL 등)를 채택하고 있습니다.</li>
                <li>해킹 등에 의해 귀하의 개인정보가 유출되는 것을 방지하기 위해, 외부로부터의 침입을 차단하는 장치를 이용하고 있으며, 각 서버마다 침입탐지시스템을 설치하여 24시간 침입을 감시하고 있습니다.</li>
              </ol>
            </div>
          </div>

          <div className="guide-section-block">
            <h2 className="guide-section-title"><span className="title-dot"></span>개인정보의 위탁처리 및 국외이전</h2>
            <div className="doc-content">
              <p>미쿠짱은 서비스 향상을 위해서 귀하의 개인정보를 외부에 위탁하여 처리할 수 있습니다.</p>
              <ol>
                <li>개인정보의 처리를 위탁하는 경우에는 미리 그 사실을 귀하에게 고지하겠습니다.</li>
                <li>개인정보의 처리를 위탁하는 경우에는 위탁계약 등을 통하여 서비스제공자의 개인정보보호 관련 지시엄수, 개인정보에 관한 비밀유지, 제3자 제공의 금지 및 사고 시의 책임부담 등을 명확히 규정하고 당해 계약내용을 서면 또는 전자적으로 보관하겠습니다.</li>
                <li>
                  미쿠짱은 원활한 구매대행 서비스 제공 및 시스템 관리를 위해 아래와 같이 회원의 개인정보를 국외(일본)로 이전(저장 및 원격 접근·처리)하고 있습니다.
                  <ul>
                    <li>
                      <strong>이전받는 자 (업체명)</strong> :
                      <ul>
                        <li>주식회사 아소비바(ASOBIBA) &mdash; 활용 주체 (서비스 운영 및 개인정보 처리)</li>
                        <li>Amazon Web Services, Inc. &mdash; 저장 주체 (데이터센터 운영)</li>
                      </ul>
                    </li>
                    <li><strong>이전받는 자의 연락처</strong> : 070-4845-3023 (개인정보 관련 문의 창구)</li>
                    <li><strong>이전되는 국가</strong> : 일본 (Japan)</li>
                    <li><strong>이전되는 개인정보 항목</strong> : 이름, 아이디, 이메일, 휴대폰 번호, 프로필 사진(소셜 로그인 이용 시)</li>
                    <li><strong>이전 일시 및 방법</strong> : 회원가입 및 서비스 이용 시 암호화된 통신망(SSL)을 통해 전송되며, 일본 리전(AWS 아시아 태평양&middot;도쿄)에 저장되고 일본 법인이 해당 데이터에 원격으로 접근하여 처리합니다.</li>
                    <li><strong>이전받는 자의 이용 목적</strong> : 구매대행 상품 주문 및 배송 처리, 현지 CS 응대, 시스템 유지보수 (Amazon Web Services, Inc.는 데이터 저장 및 인프라 운영 목적에 한함)</li>
                    <li><strong>보유 및 이용 기간</strong> : 회원 탈퇴 시 또는 관련 법령에 따른 보존 기간 만료 시까지 지체 없이 파기</li>
                  </ul>
                </li>
              </ol>
            </div>
          </div>

          <div className="guide-section-block">
            <h2 className="guide-section-title"><span className="title-dot"></span>의견수렴 및 불만처리</h2>
            <div className="doc-content">
              <p>미쿠짱은 개인정보보호와 관련하여 귀하가 의견과 불만을 제기할 수 있는 창구를 개설하고 있습니다. 개인정보와 관련한 불만이 있으신 분은 미쿠짱의 개인정보 관리책임자에게 의견을 주시면 접수 즉시 조치하여 처리결과를 통보해 드립니다. 또는 정부에서 설치하여 운영 중인 개인정보침해신고센터(http://privacy.kisa.or.kr/)에 불만처리를 신청하실 수 있습니다.</p>
            </div>
          </div>

          <div className="guide-section-block">
            <h2 className="guide-section-title"><span className="title-dot"></span>아동의 개인정보보호</h2>
            <div className="doc-content">
              <ol>
                <li>미쿠짱은 만 14세 미만 아동의 개인정보를 수집하는 경우 법정대리인의 동의를 받습니다.</li>
                <li>만 14세 미만 아동의 법정대리인은 아동의 개인정보의 열람, 정정, 동의철회를 요청할 수 있으며, 이러한 요청이 있을 경우 지체 없이 필요한 조치를 취합니다.</li>
              </ol>
            </div>
          </div>

          <div className="guide-section-block">
            <h2 className="guide-section-title"><span className="title-dot"></span>개인정보 관리책임자 및 고객지원센터</h2>
            <div className="doc-content">
              <p>미쿠짱은 개인정보에 대한 의견수렴 및 불만처리를 담당하는 개인정보 관리책임자를 지정하고 있습니다.</p>
              <p>미쿠짱은 회원의 개인 정보를 보호하기 위해서 최선을 다할 것입니다. 미쿠짱과 마찬가지로 회원도 회원 자신의 아이디와 비밀번호에 대한 보안 유지 책임이 있습니다. 그러므로 온라인상에 접속해 있는 상태에서 타인에게 개인정보가 유출되지 않도록 회원은 특별히 주의를 하여야 하며 미쿠짱의 과실이 없는 한 개인정보 유출에 대한 책임은 회원에게 있습니다. 어떠한 경우에도 미쿠짱에서 메일 또는 기타의 방법으로 회원의 비밀번호를 질문하지 않습니다.</p>
            </div>
          </div>

          <GuideBackToTop />
        </div>
      </div>
    </GuideLayout>
  );
}