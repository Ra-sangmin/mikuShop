"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';

export default function CSManagement() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('관리자');
  
  // 가짜 문의 데이터
  const dummyInquiries = [
    { id: 1, type: '배송문의', title: '언제쯤 도착하나요?', user: '김철수', date: '2026.02.25', status: '답변완료' },
    { id: 2, type: '결제문의', title: '입금 확인 부탁드립니다.', user: '이영희', date: '2026.02.26', status: '대기중' },
    { id: 3, type: '상품문의', title: '사이즈 재입고 문의', user: '박민수', date: '2026.02.26', status: '대기중' },
  ];

  useEffect(() => {
    const storedName = localStorage.getItem('admin_name');
    if (!localStorage.getItem('admin_id')) {
      router.push('/admin/login');
      return;
    }
    if (storedName) setAdminName(storedName);
  }, [router]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: "'Inter', 'Noto Sans KR', sans-serif" }}>
      <AdminSidebar />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ height: '70px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 }}>고객 센터 관리</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b' }}>
              {adminName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: '500', color: '#334155' }}>{adminName}</span>
          </div>
        </header>

        <div style={{ padding: '30px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '15px', fontWeight: '500' }}>미답변 문의</div>
                <div style={{ color: '#ef4444', fontSize: '28px', fontWeight: '700' }}>2건</div>
              </div>
              <div style={{ fontSize: '30px' }}>💬</div>
            </div>
            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '15px', fontWeight: '500' }}>오늘 들어온 문의</div>
                <div style={{ color: '#3b82f6', fontSize: '28px', fontWeight: '700' }}>5건</div>
              </div>
              <div style={{ fontSize: '30px' }}>🔔</div>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>문의 목록</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '14px', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '16px 12px' }}>분류</th>
                  <th style={{ padding: '16px 12px' }}>제목</th>
                  <th style={{ padding: '16px 12px' }}>작성자</th>
                  <th style={{ padding: '16px 12px' }}>등록일</th>
                  <th style={{ padding: '16px 12px', textAlign: 'center' }}>상태</th>
                  <th style={{ padding: '16px 12px', textAlign: 'center' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {dummyInquiries.map((inquiry) => (
                  <tr key={inquiry.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#334155' }}>
                    <td style={{ padding: '16px 12px' }}>
                      <span style={{ fontSize: '12px', padding: '2px 6px', backgroundColor: '#f1f5f9', borderRadius: '4px' }}>{inquiry.type}</span>
                    </td>
                    <td style={{ padding: '16px 12px', fontWeight: '500' }}>{inquiry.title}</td>
                    <td style={{ padding: '16px 12px' }}>{inquiry.user}</td>
                    <td style={{ padding: '16px 12px' }}>{inquiry.date}</td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px', 
                        fontWeight: '600',
                        backgroundColor: inquiry.status === '대기중' ? '#fff7ed' : '#f0fdf4',
                        color: inquiry.status === '대기중' ? '#ea580c' : '#16a34a'
                      }}>
                        {inquiry.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <button style={{ padding: '6px 12px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        답변하기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
