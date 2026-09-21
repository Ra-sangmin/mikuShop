// 🌟 admin/layout.tsx의 menuTitles(경로→제목)와 admin/components/AdminSidebar.tsx의
// menuItems(사이드바 메뉴 목록)가 같은 경로/이름 쌍을 각자 따로 들고 있어서 하나를
// 고치면 다른 하나도 같이 고쳐야 했습니다. 이 파일 하나로 통일해서 참조합니다.
export interface AdminMenuItem {
  name: string;
  path: string;
  /** 🌟 사이드바에서 이 항목 위에 붙일 그룹 제목. 없으면 앞 항목과 같은 그룹입니다. */
  group?: string;
}

export const ADMIN_MENU: AdminMenuItem[] = [
  { name: '대시보드', path: '/admin/dashboard' },
  { name: '사용자 관리', path: '/admin/users', group: 'OPERATION' },
  { name: '주문 관리', path: '/admin/orders' },
  { name: '배송 현황', path: '/admin/delivery' },
  { name: '정산 관리', path: '/admin/settlement' },
  { name: '미쿠짱 머니', path: '/admin/refund' },
  { name: '고객 센터', path: '/admin/cs', group: 'SUPPORT' },
  { name: '카카오톡 알림톡 관리', path: '/admin/alimtalk' },
  { name: '회원 등급 및 수수료 관리', path: '/admin/membership-grades', group: 'SETTINGS' },
  { name: '국제 배송 업체 정보 관리', path: '/admin/shipping-carriers' },
  { name: '견적 계산기', path: '/admin/estimate' },
  { name: '개발자 전용', path: '/admin/developer' },
];
