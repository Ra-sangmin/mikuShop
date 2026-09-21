"use client";

// 📋 주문 상세 팝업 (수취인 정보 · 영문 주소 · 주문 정보)
//   관리자 > 주문 관리의 "상세보기" 와 관리자 > 카카오톡 알림톡 관리의 주문번호 클릭이 같은 팝업을 씁니다.
//   order 는 주문 관리 화면이 표에 쓰는 모양입니다 (toOrderDetailView 로 DB 주문을 바꿀 수 있습니다).
//   스타일: app/admin/orders/orders-premium.css 의 ord-modal / ord-detail

import React, { useEffect, useState } from 'react';
import { DaumPostcodeEmbed } from 'react-daum-postcode';
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/src/types/order';
import { toEnglishAddress, toEnglishDetailAddress, toEnglishName, toIntlPhone } from './englishAddress';
import { MapPinLine, Package, ClipboardText, Sparkle, Camera, ShieldCheck, Copy, Globe } from '@phosphor-icons/react';
import '../orders/orders-premium.css';

type PushToast = (type: 'success' | 'error', message: string) => void;

// 🧾 부가 서비스 ("사진 검수, 포장 보완") → 목록
export const parseServices = (v?: string | null) =>
  String(v || '').split(',').map(x => x.trim()).filter(x => x && x !== '-');
export const SERVICE_ICON: Record<string, { icon: React.ReactNode; cls: string }> = {
  '사진 검수': { icon: <Camera size={12} weight="fill" />, cls: 'is-photo' },
  '포장 보완': { icon: <ShieldCheck size={12} weight="fill" />, cls: 'is-pack' },
};

// 🌏 공식 영문 도로명 주소 캐시 (한글 주소 → 영문). 팝업을 닫았다 열어도 다시 가져오지 않도록 화면 전체에서 공유합니다.
const officialEngCache: Record<string, { eng: string; zipOk: boolean }> = {};

/** DB 주문(+ 회원 · 배송지) → 팝업이 쓰는 모양 (주문 관리 표의 한 줄과 같은 필드) */
export function toOrderDetailView(dbOrder: any) {
  return {
    id: dbOrder.orderId,
    date: new Date(dbOrder.registeredAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    user: dbOrder.user?.name || '알 수 없음',
    address: dbOrder.address || null,
    recipient: dbOrder.recipient || '',
    product: dbOrder.productName,
    jpy: Number(dbOrder.productPrice || 0).toLocaleString(),
    status: dbOrder.status,
    option: dbOrder.productOption || '-',
    productRequest: dbOrder.productRequest || '-',
    serviceRequest: dbOrder.serviceRequest || '-',
    bundleId: dbOrder.bundleId || '',
    isBundleGroup: false,
    bundleItems: [] as any[],
  };
}

export default function OrderDetailModal({ order, onClose, pushToast }: {
  order: any;
  onClose: () => void;
  pushToast: PushToast;
}) {
  const [addrCopied, setAddrCopied] = useState(false);
  const [officialEng, setOfficialEngState] = useState<Record<string, { eng: string; zipOk: boolean }>>(() => ({ ...officialEngCache }));
  const setOfficialEng = (fn: (prev: Record<string, { eng: string; zipOk: boolean }>) => Record<string, { eng: string; zipOk: boolean }>) => {
    setOfficialEngState(prev => {
      const next = fn(prev);
      Object.assign(officialEngCache, next);
      return next;
    });
  };
  const [engPickerFor, setEngPickerFor] = useState<string | null>(null); // 검색창을 연 한글 주소
  // 영문 주소 칸은 '영문 주소' 버튼을 눌렀을 때만 펼칩니다. (주문 상세를 새로 열면 다시 접힘)
  const [showEng, setShowEng] = useState(false);

  useEffect(() => { setShowEng(false); setEngPickerFor(null); setAddrCopied(false); }, [order]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copyAddress = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setAddrCopied(true);
      setTimeout(() => setAddrCopied(false), 1500);
    } catch { /* 복사 권한이 없으면 무시 */ }
  };

  /**
   * 📋 수취인 정보 한 항목을 눌러서 복사할 수 있게 감쌉니다.
   *    주문자 팝업(<UserBasicInfo>)과 같은 .aui-copyable 을 써서 동작·모양을 맞춥니다.
   *    복사되는 값과 보이는 내용이 다를 수 있습니다 — 주소는 우편번호 뱃지와 줄바꿈으로
   *    꾸며 보여주지만, 붙여넣을 때는 한 줄짜리 원문이 필요합니다.
   */
  const copyableField = (value: string | null | undefined, label: string, display?: React.ReactNode) => {
    const text = value?.trim();
    if (!text) return <span className="ord-detail-dash">-</span>;
    return (
      <button
        type="button"
        className="aui-copyable"
        onClick={() => navigator.clipboard?.writeText(text)
          .then(() => pushToast('success', `${label}을(를) 복사했습니다.`))
          .catch(() => {})}
      >
        {display ?? text}
        <Copy size={11} weight="bold" />
      </button>
    );
  };

  const o = order;
  const a = o.address;
  const fullAddr = a ? `[${a.zipCode}] ${a.address} ${a.detailAddress || ''}`.trim() : '';
    return (
      <div className="ord-modal-overlay" onClick={() => onClose()}>
        <div className="ord-modal ord-detail" role="dialog" aria-modal="true" aria-label="주문 상세" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="ord-detail-close" onClick={() => onClose()} aria-label="닫기">×</button>
          <div className="ord-detail-head">
            <span className="ord-modal-mark" aria-hidden="true"><ClipboardText size={22} weight="duotone" /></span>
            <div>
              <h3 className="ord-modal-title">주문 상세</h3>
              <p className="ord-detail-sub">
                <span className="ord-detail-id">{o.isBundleGroup ? o.bundleId : o.id}</span>
                {o.isBundleGroup && <span className="ord-detail-bundle">합포장 {o.bundleItems.length}건</span>}
                <span>{o.date}</span>
              </p>
            </div>
          </div>

          <section className="ord-detail-sec">
            <div className="ord-detail-sec-title">
              <MapPinLine size={14} weight="bold" /> 수취인 정보
              {a && (
                <button type="button" className={`ord-detail-copy ${addrCopied ? 'is-done' : ''}`} onClick={() => copyAddress(`${a.recipientName} ${a.phone}\n${fullAddr}${a.personalCustomsCode ? `\n통관번호 ${a.personalCustomsCode}` : ''}`)}>
                  {addrCopied ? '복사됨' : '전체 복사'}
                </button>
              )}
            </div>
            {a ? (
              <dl className="ord-detail-list">
                <div><dt>받는 분</dt><dd className="is-strong">{copyableField(a.recipientName, '받는 분')}</dd></div>
                <div><dt>연락처</dt><dd className="is-mono">{copyableField(a.phone, '연락처')}</dd></div>
                {/* 우편번호는 따로, 주소는 기본 주소 + 상세 주소를 합쳐 한 번에 복사합니다.
                    (전체가 필요하면 위 "전체 복사") */}
                <div><dt>우편번호</dt><dd className="is-mono">{copyableField(a.zipCode, '우편번호')}</dd></div>
                <div><dt>주소</dt><dd className="ord-addr-dd">{copyableField(
                  [a.address, a.detailAddress].map((v: string | null | undefined) => v?.trim()).filter(Boolean).join(' '),
                  '주소',
                  <span className="ord-detail-addr">
                    <span>{a.address}</span>
                    {a.detailAddress?.trim() && <span className="is-detail">{a.detailAddress}</span>}
                  </span>,
                )}
                  <button type="button" className={`ord-eng-toggle ${showEng ? 'is-on' : ''}`}
                    onClick={() => setShowEng(v => !v)} aria-expanded={showEng} title="FedEx · DHL 등 해외 배송용 영문 주소">
                    <Globe size={12} weight="bold" /> 영문 주소
                  </button>
                </dd></div>
                <div><dt>통관번호</dt><dd className="is-mono">{copyableField(a.personalCustomsCode, '통관번호')}</dd></div>
              </dl>
            ) : null}
            {a && showEng && (() => {
              // 🌏 FedEx · DHL 등 해외 배송용 영문 주소 (복사하는 순간 규칙으로 변환 — 회원에게 따로 받지 않음)
              const official = officialEng[a.address || ''];
              const engAddr = official
                ? [toEnglishDetailAddress(a.detailAddress || ''), official.eng].filter(Boolean).join(', ')
                : toEnglishAddress(a.address || '', a.detailAddress || '');
              const engName = toEnglishName(a.recipientName || '', a.recipientEnglishName);
              const engPhone = toIntlPhone(a.phone);
              const engAll = [
                `Name: ${engName}`,
                `Phone: ${engPhone}`,
                `Address: ${engAddr}`,
                `Postal code: ${a.zipCode || ''}`,
                'Country: Republic of Korea (KR)',
                a.personalCustomsCode ? `PCCC: ${a.personalCustomsCode}` : '',
              ].filter(Boolean).join('\n');
              return (
                <div className="ord-eng">
                  <div className="ord-eng-head">
                    <span className="ord-eng-title">
                      <Globe size={13} weight="bold" /> 영문 주소
                      {official
                        ? <em className={`is-official ${official.zipOk ? '' : 'is-warn'}`}>{official.zipOk ? '공식 도로명 · 상세는 자동 변환' : '우편번호가 달라요 · 확인 필요'}</em>
                        : <em>해외 배송용 · 자동 변환</em>}
                    </span>
                    <button type="button" className="ord-eng-fetch" onClick={() => setEngPickerFor(engPickerFor ? null : (a.address || ''))}>
                      {engPickerFor ? '닫기' : official ? '다시 가져오기' : '공식 영문 가져오기'}
                    </button>
                    <button type="button" className="ord-detail-copy"
                      onClick={() => navigator.clipboard?.writeText(engAll).then(() => pushToast('success', '영문 배송 정보를 복사했습니다.')).catch(() => {})}>
                      영문 전체 복사
                    </button>
                  </div>
                  {engPickerFor && (
                    <div className="ord-eng-picker">
                      <p>검색 결과에서 <b>같은 주소</b>를 한 번 눌러 주세요. 공식 영문 도로명 주소를 받아옵니다.</p>
                      <DaumPostcodeEmbed
                        defaultQuery={engPickerFor}
                        autoClose={false}
                        style={{ height: 360 }}
                        onComplete={(data: any) => {
                          const eng = data.roadAddressEnglish || data.addressEnglish || '';
                          if (eng) {
                            setOfficialEng(prev => ({ ...prev, [engPickerFor]: { eng, zipOk: String(data.zonecode) === String(a.zipCode || '') } }));
                            pushToast(String(data.zonecode) === String(a.zipCode || '') ? 'success' : 'error',
                              String(data.zonecode) === String(a.zipCode || '') ? '공식 영문 주소를 받아왔습니다.' : '우편번호가 달라요. 같은 주소인지 확인해 주세요.');
                          }
                          setEngPickerFor(null);
                        }}
                      />
                    </div>
                  )}
                  <dl className="ord-detail-list">
                    <div><dt>Name</dt><dd className="is-strong">{copyableField(engName, '영문 이름')}</dd></div>
                    <div><dt>Phone</dt><dd className="is-mono">{copyableField(engPhone, '국제 전화번호')}</dd></div>
                    <div><dt>Address</dt><dd>{copyableField(engAddr, '영문 주소')}</dd></div>
                  </dl>
                </div>
              );
            })()}
            {!a && (
              <div className="ord-detail-empty">
                <MapPinLine size={16} weight="bold" />
                {o.recipient ? `${o.recipient} (주소 정보 없음)` : '배송지가 아직 지정되지 않았습니다'}
              </div>
            )}
          </section>

          <section className="ord-detail-sec">
            <div className="ord-detail-sec-title"><Package size={14} weight="bold" /> 주문 정보</div>
            <dl className="ord-detail-list">
              <div><dt>주문자</dt><dd>{o.user}</dd></div>
              <div><dt>상품</dt><dd className="is-strong">{o.product}</dd></div>
              <div><dt>상품가격</dt><dd className="is-strong">¥{o.jpy}</dd></div>
              <div><dt>진행 상태</dt><dd>{ORDER_STATUS_LABEL[o.status as OrderStatus] || o.status}</dd></div>
              <div><dt>옵션</dt><dd>{o.option || '-'}</dd></div>
              <div><dt>요청</dt><dd>{o.productRequest || '-'}</dd></div>
              <div><dt>서비스</dt><dd>
                {parseServices(o.serviceRequest).length ? (
                  <span className="ord-detail-svcs">
                    {parseServices(o.serviceRequest).map(sv => (
                      <span key={sv} className={`ord-detail-svc ${SERVICE_ICON[sv]?.cls || 'is-etc'}`}>
                        {SERVICE_ICON[sv]?.icon || <Sparkle size={12} weight="fill" />} {sv}
                      </span>
                    ))}
                  </span>
                ) : '-'}
              </dd></div>
            </dl>
          </section>

          <div className="ord-modal-actions">
            <button type="button" onClick={() => onClose()} className="ord-modal-btn is-confirm">닫기</button>
          </div>
        </div>
      </div>
    );
}
