"use client";
import { useRouter, usePathname } from 'next/navigation';
import { ADMIN_MENU } from '@/app/admin/adminMenu';

export default function AdminSidebar({
  isOpen = false,
  onClose = () => {},
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <>
      {/* 🌟 모바일에서 사이드바가 열려있을 때만 보이는 반투명 배경 (클릭하면 닫힘) */}
      <div
        className={`admin-sidebar-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`} style={{ backgroundColor: '#1e293b', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>📦</span> 미쿠짱 관리자
        </div>

        <nav style={{ flex: 1, padding: '20px 0', overflowY: 'auto' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {ADMIN_MENU.map((item, idx) => {
              const isActive = pathname === item.path;
              return (
                <li
                  key={idx}
                  onClick={() => {
                    router.push(item.path);
                    onClose();
                  }}
                  style={{
                    padding: '16px 24px',
                    cursor: 'pointer',
                    backgroundColor: isActive ? '#3b82f6' : 'transparent',
                    borderLeft: isActive ? '4px solid #fff' : '4px solid transparent',
                    color: isActive ? '#fff' : '#94a3b8',
                    fontWeight: isActive ? '600' : '400',
                    transition: 'all 0.2s'
                  }}
                >
                  {item.name}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* 🌟 모바일 브레이크포인트는 globals.css 주석에 명시된 사이트 기준값(768px)을 따릅니다. */}
      <style jsx>{`
        .admin-sidebar {
          width: 260px;
          min-width: 260px;
          flex-shrink: 0;
        }

        .admin-sidebar-backdrop {
          display: none;
        }

        @media (max-width: 768px) {
          .admin-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 1000;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
          }

          .admin-sidebar.open {
            transform: translateX(0);
          }

          .admin-sidebar-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease;
          }

          .admin-sidebar-backdrop.open {
            opacity: 1;
            visibility: visible;
          }
        }
      `}</style>
    </>
  );
}
