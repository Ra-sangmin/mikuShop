"use client";

// 📋 주문 상세 팝업 (수취인 정보 · 영문 주소 · 주문 정보 · 결제 내역)
//   관리자 > 주문 관리의 "상세보기" 와 관리자 > 카카오톡 알림톡 관리의 주문번호 클릭이 같은 팝업을 씁니다.
//   order 는 주문 관리 화면이 표에 쓰는 모양입니다 (toOrderDetailView 로 DB 주문을 바꿀 수 있습니다).
//   스타일: app/admin/orders/orders-premium.css 의 ord-modal / ord-detail

import React, { useEffect, useState } from 'react';
import { DaumPostcodeEmbed } from 'react-daum-postcode';
import { ORDER_STATUS, ORDER_STATUS_LABEL, type OrderStatus } from '@/src/types/order';
import { toEnglishAddress, toEnglishDetailAddress, toEnglishName, toIntlPhone } from './englishAddress';
import { MapPinLine, Package, ClipboardText, Sparkle, Camera, ShieldCheck, Copy, Globe, Trash, Warning, CircleNotch } from '@phosphor-icons/react';
import OrderPaymentsSection from './OrderPaymentsSection';
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
    // 🔨 경매 주문은 '입찰 신청 가격'과 '보증금'이 함께 보여야 판단할 수 있습니다.
    //    💰 보증금은 원화입니다. (입찰가의 10% · 최소 20,000원)
    myBidPrice: dbOrder.myBidPrice ?? null,
    depositKrw: Number(dbOrder.depositKrw || 0),
    depositRefundedKrw: Number(dbOrder.depositRefundedKrw || 0),
    status: dbOrder.status,
    option: dbOrder.productOption || '-',
    productRequest: dbOrder.productRequest || '-',
    serviceRequest: dbOrder.serviceRequest || '-',
    bundleId: dbOrder.bundleId || '',
    isBundleGroup: false,
    bundleItems: [] as any[],
  };
}

// 🗑 회원이 아직 돈을 내지 않은 상태 — 이 밖의 상태를 지울 때는 환불을 먼저 챙기라고 알립니다.
//    (장바구니 · 경매 요청은 결제 전, 입고 대기중은 배송대행이라 결제가 없습니다)
const UNPAID_STATUSES: string[] = [ORDER_STATUS.CART, ORDER_STATUS.BID_PENDING, ORDER_STATUS.WAITING];

export default function OrderDetailModal({ order, onClose, pushToast, onDelete }: {
  order: any;
  onClose: () => void;
  pushToast: PushToast;
  /**
   * 🗑 넘겨 주면 '주문 삭제' 버튼이 생깁니다. (주문 관리 화면만 넘깁니다 — 알림톡 화면은 보기 전용)
   * 성공하면 true 를 돌려주세요. 팝업 닫기는 부르는 쪽이 합니다.
   */
  onDelete?: (order: any) => Promise<boolean>;
}) {
  // 🗑 삭제는 되돌릴 수 없어서 한 번 더 묻습니다. (브라우저 confirm 창 대신 팝업 안에서)
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
              {o.myBidPrice != null && (
                <div><dt>입찰 신청 가격</dt><dd className="is-strong">¥{Number(o.myBidPrice).toLocaleString()}</dd></div>
              )}
              {/* 💰 보증금은 원화입니다.
                  · 받아 둔 상태  → 금액
                  · 실패로 돌려준 → "N원 환불" (안 낸 것과 구분해야 합니다)
                  · 낸 적 없음    → 미납 */}
              {o.myBidPrice != null && (
                <div>
                  <dt>납부 보증금</dt>
                  <dd className={Number((o as any).depositKrw) > 0 ? 'is-strong' : ''}>
                    {Number((o as any).depositKrw) > 0
                      ? `${Number((o as any).depositKrw).toLocaleString()}원`
                      : Number((o as any).depositRefundedKrw) > 0
                        ? `${Number((o as any).depositRefundedKrw).toLocaleString()}원 환불`
                        : '미납'}
                  </dd>
                </div>
              )}
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

          {/* 💳 카드 결제 내역 · 결제 취소. 합포장 묶음 줄은 주문이 여러 개라 한 건씩 열어서 봅니다. */}
          {!o.isBundleGroup && <OrderPaymentsSection orderId={o.id} pushToast={pushToast} />}

          {/* 🗑 삭제 확인 — 되돌릴 수 없으니 무엇이 사라지는지와 환불 여부를 알려 줍니다. */}
          {onDelete && confirmDelete && (
            <div className="ord-detail-delete-confirm" role="alert">
              <strong><Warning size={15} weight="fill" /> 이 주문을 삭제할까요?</strong>
              <p>주문 <b>{o.id}</b> 가 목록에서 사라집니다. 지우기 전 내용(배송비 청구 내역 포함)은 <b>삭제 보관함</b>에 기록으로 남습니다.</p>
              {!UNPAID_STATUSES.includes(o.status) && (
                <p className="is-money">
                  회원이 이미 결제한 단계({ORDER_STATUS_LABEL[o.status as OrderStatus] || o.status})입니다.
                  취소하지 않은 카드 결제가 남아 있으면 삭제되지 않습니다. 위 <b>결제 내역</b>에서 먼저 결제를 취소해 주세요.
                </p>
              )}
            </div>
          )}

          <div className="ord-modal-actions">
            {onDelete && !o.isBundleGroup && (
              confirmDelete ? (
                <>
                  <button type="button" className="ord-modal-btn is-cancel" disabled={deleting}
                    onClick={() => setConfirmDelete(false)}>취소</button>
                  <button type="button" className="ord-modal-btn is-danger" disabled={deleting}
                    onClick={async () => {
                      setDeleting(true);
                      const ok = await onDelete(o);
                      // 성공하면 부르는 쪽이 팝업을 닫습니다. 실패하면 다시 누를 수 있게 풉니다.
                      if (!ok) setDeleting(false);
                    }}>
                    {deleting ? <><CircleNotch size={15} weight="bold" className="ord-spin" /> 삭제 중…</> : <><Trash size={15} weight="bold" /> 삭제하기</>}
                  </button>
                </>
              ) : (
                <button type="button" className="ord-modal-btn is-danger-ghost" onClick={() => setConfirmDelete(true)}
                  title="이 주문을 목록에서 완전히 지웁니다">
                  <Trash size={15} weight="bold" /> 주문 삭제
                </button>
              )
            )}
            {!(onDelete && confirmDelete) && (
              <button type="button" onClick={() => onClose()} className="ord-modal-btn is-confirm">닫기</button>
            )}
          </div>
          {/* 합포장 묶음은 한 줄에 여러 주문이 묶여 있어 여기서 지우지 않습니다. (묶음을 풀고 한 건씩) */}
          {onDelete && o.isBundleGroup && (
            <p className="ord-detail-delete-note">합포장 묶음은 여기서 삭제할 수 없어요. 묶음을 푼 뒤 한 건씩 삭제해 주세요.</p>
          )}
        </div>
      </div>
    );
}
