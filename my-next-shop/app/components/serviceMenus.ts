// 🌟 구매대행 / 배송대행 메뉴 정의
// Header.tsx(상단 드롭다운·모바일 드로어)와 GuideLayout.tsx(사이드바)가 같은 구성을 쓰도록 한 곳에 모았습니다.
//
// via: 이 섹션 밖의 페이지로 이동하는 항목입니다. 메뉴에 "마이페이지 ↗" 같은 표시가 붙고,
//      상단 메뉴의 "현재 위치" 강조 판단에서는 제외됩니다(예: /mypage/status에 있을 때
//      구매대행/배송대행이 아니라 마이페이지만 강조되도록).
export type MenuVia = '마이페이지' | '이용가이드';

export interface ServiceMenuItem {
  label: string;
  desc: string;
  href: string;
  via?: MenuVia;
}

export const PURCHASE_MENU: ServiceMenuItem[] = [
  { label: '구매대행 신청', desc: '일본 상품 대신 구매', href: '/purchase/request' },
  { label: '견적문의', desc: '상품 링크로 금액 문의', href: '/purchase/quote' },
  { label: '구매대행 방법', desc: '신청부터 수령까지', href: '/guide/purchase-method', via: '이용가이드' },
  { label: '구매 내역', desc: '구매대행 진행 상황', href: '/mypage/status?type=PURCHASE', via: '마이페이지' },
];

export const DELIVERY_MENU: ServiceMenuItem[] = [
  { label: '배송대행 신청', desc: '도착 상품 국제 발송', href: '/delivery/request' },
  { label: '일본 배송주소 확인', desc: '내 전용 일본 주소', href: '/delivery/address' },
  { label: '배송대행 방법', desc: '신청부터 수령까지', href: '/guide/delivery-method', via: '이용가이드' },
  { label: '배송 내역', desc: '배송대행 진행 상황', href: '/mypage/status?type=DELIVERY', via: '마이페이지' },
];

/** 쿼리(?)·해시(#)를 뗀 경로 */
export const menuPath = (href: string) => href.split('?')[0].split('#')[0];
