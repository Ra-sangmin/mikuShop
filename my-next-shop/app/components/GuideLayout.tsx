"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const feeMenuItems = [
  { name: '회원등급 및 혜택', href: '/guide/membership' },
  { name: '수수료 안내', href: '/fee-guide' },
  { name: '국제배송 요금표', href: '/shipping-fee' },
  { name: '오쿠루 이벤트', href: '/guide/events' },
  { name: '통관/관세안내', href: '/guide/customs' },
];

const guideMenuItems = [
  { name: '구매대행 신청방법', href: '/guide/purchase-method' },
  { name: '배송대행 신청방법', href: '/guide/delivery-method' },
  { name: '자주하는 질문', href: '/guide/faq' },
];

const contactMenuItems = [
  { name: '카카오톡 문의', href: '/contact' },
];

const purchaseMenuItems = [
  { name: '전체내역', href: '/purchase/history' },
  { name: '국제배송 신청', href: '/purchase/shipping-request' },
  { name: '견적문의', href: '/purchase/quote' },
  { name: '구매대행 신청', href: '/purchase/request' },
];

const deliveryMenuItems = [
  { name: '일본 배송주소 확인', href: '/delivery/address' },
  { name: '배송신청', href: '/delivery/request' },
];

export default function GuideLayout({ children, title, type = 'fee', fullWidth = false }: { children: React.ReactNode, title: string, type?: 'fee' | 'guide' | 'contact' | 'purchase' | 'delivery', fullWidth?: boolean }) {
  const pathname = usePathname();
  
  let menuItems;
  let sidebarTitle;

  switch(type) {
    case 'guide':
      menuItems = guideMenuItems;
      sidebarTitle = '이용가이드';
      break;
    case 'contact':
      menuItems = contactMenuItems;
      sidebarTitle = '고객문의';
      break;
    case 'purchase':
      menuItems = purchaseMenuItems;
      sidebarTitle = '구매대행';
      break;
    case 'delivery':
      menuItems = deliveryMenuItems;
      sidebarTitle = '배송대행';
      break;
    case 'fee':
    default:
      menuItems = feeMenuItems;
      sidebarTitle = '수수료/배송비';
      break;
  }

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '60px 0' }}>
      <div style={{ maxWidth: fullWidth ? '2400px' : '1200px', margin: '0 auto', display: 'flex', gap: '30px', padding: '0 20px' }}>
        {/* Sidebar */}
        <aside style={{ width: '260px', flexShrink: 0 }}>
          <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ padding: '25px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f1f5f9' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{sidebarTitle}</h2>
            </div>
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  style={{
                    display: 'block',
                    padding: '18px 20px',
                    textDecoration: 'none',
                    fontSize: '16px',
                    fontWeight: isActive ? 'bold' : '500',
                    color: isActive ? '#fff' : '#475569',
                    backgroundColor: isActive ? '#ff4b2b' : '#fff',
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Content Area */}
        <main style={{ flex: 1 }}>
          <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', minHeight: '600px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #f1f5f9' }}>
              {title}
            </h1>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
