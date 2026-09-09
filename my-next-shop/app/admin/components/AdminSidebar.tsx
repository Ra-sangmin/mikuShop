"use client";
import { useRouter, usePathname } from 'next/navigation';
import { ADMIN_MENU } from '@/app/admin/adminMenu';

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <aside style={{ width: '260px', minWidth: '260px', flexShrink: 0, backgroundColor: '#1e293b', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px', fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '24px' }}>📦</span> 미쿠짱 관리자
      </div>

      <nav style={{ flex: 1, padding: '20px 0' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {ADMIN_MENU.map((item, idx) => {
            const isActive = pathname === item.path;
            return (
              <li 
                key={idx} 
                onClick={() => router.push(item.path)}
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
  );
}
