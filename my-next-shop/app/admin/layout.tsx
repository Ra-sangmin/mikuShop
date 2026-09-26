// 🧭 관리자 레이아웃 (서버 컴포넌트)
//
// 화면 틀(사이드바·환율 패널 등)은 클라이언트 컴포넌트인 AdminShell 이 그립니다.
// 여기서는 metadata 만 붙입니다 — 클라이언트 컴포넌트에서는 metadata 를 내보낼 수 없기 때문입니다.
//
// 🔔 웹 푸시: 아이폰은 "홈 화면에 추가"한 앱에서만 알림을 받을 수 있어,
//    관리자 화면을 앱처럼 설치할 수 있도록 manifest·아이콘을 연결합니다.
//    (public/miku-admin.webmanifest, public/miku-admin-sw.js)
import type { Metadata, Viewport } from 'next';
import AdminShell from './AdminShell';

export const metadata: Metadata = {
  manifest: '/miku-admin.webmanifest',
  appleWebApp: { capable: true, title: '미쿠짱 관리', statusBarStyle: 'default' },
  icons: { apple: '/miku-admin-apple-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#e8707c',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
