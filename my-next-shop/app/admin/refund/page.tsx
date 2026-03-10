'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';

export default function MoneyRequestManagement() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('관리자');
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 데이터 불러오기
  const fetchRequests = useCallback(async () => {
    // 로컬 스토리지에서 관리자 아이디를 꺼냅니다.
    const adminId = localStorage.getItem('admin_id'); 
    if (!adminId) return;

    try {
      // 🌟 URL 변경: /api/money/request 에 adminId를 붙여서 호출
      const res = await fetch(`/api/money/request?adminId=${adminId}`);
      const data = await res.json();
      
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (error) {
      console.error("데이터 가져오기 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedName = localStorage.getItem('admin_name');
    if (!localStorage.getItem('admin_id')) {
      router.push('/admin/login');
      return;
    }
    if (storedName) setAdminName(storedName);
    
    fetchRequests();
  }, [router, fetchRequests]);

  // 🚀 승인/반려 처리 핸들러
  const handleProcess = async (requestId: number, status: 'APPROVED' | 'REJECTED') => {
    const adminId = localStorage.getItem('admin_id'); // 관리자 식별
    const actionText = status === 'APPROVED' ? '승인' : '반려';
    
    if (!confirm(`해당 신청 건을 정말 ${actionText} 처리하시겠습니까?`)) return;

    try {
      // 🌟 호출 API 경로를 /api/money/approve 로 변경하고 adminId 추가
      const res = await fetch('/api/money/approve', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          requestId, 
          status, 
          adminId // 서버가 관리자인지 확인할 수 있도록 전송
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`${actionText} 처리가 완료되었습니다.`);
        fetchRequests(); // 목록 새로고침
      } else {
        alert(`오류: ${data.error}`); // 잔액 부족 등의 에러 메시지 출력
      }
    } catch (error) {
      alert('서버 통신 중 오류가 발생했습니다.');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: "'Inter', 'Noto Sans KR', sans-serif" }}>
      <AdminSidebar />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ height: '70px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 }}>머니 충전/환불 관리</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b' }}>
              {adminName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: '500', color: '#334155' }}>{adminName}</span>
          </div>
        </header>

        <div style={{ padding: '30px', overflowY: 'auto' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>머니 신청 대기 및 처리 내역</h2>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '14px', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '16px 12px' }}>일자</th>
                  <th style={{ padding: '16px 12px' }}>구분</th>
                  <th style={{ padding: '16px 12px' }}>신청자 (ID)</th>
                  <th style={{ padding: '16px 12px', textAlign: 'right' }}>금액</th>
                  <th style={{ padding: '16px 12px' }}>상세 정보 (입금자/계좌)</th>
                  <th style={{ padding: '16px 12px', textAlign: 'center' }}>상태</th>
                  <th style={{ padding: '16px 12px', textAlign: 'center' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>데이터를 불러오는 중입니다...</td></tr>
                ) : requests.length > 0 ? requests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#334155' }}>
                    <td style={{ padding: '16px 12px' }}>{new Date(req.createdAt).toLocaleString()}</td>
                    
                    {/* 구분 (충전/환불 뱃지) */}
                    <td style={{ padding: '16px 12px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '700', backgroundColor: req.type === 'CHARGE' ? '#eff6ff' : '#fef2f2', color: req.type === 'CHARGE' ? '#2563eb' : '#ef4444' }}>
                        {req.type === 'CHARGE' ? '충전' : '환불'}
                      </span>
                    </td>
                    
                    <td style={{ padding: '16px 12px', fontWeight: '600' }}>{req.user?.name || '알수없음'} ({req.user?.email})</td>
                    <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: '800', color: '#0f172a' }}>{req.amount.toLocaleString()}원</td>
                    
                    {/* 상세 정보 (입금자명 또는 환불계좌) */}
                    <td style={{ padding: '16px 12px', fontSize: '13px' }}>
                      {req.type === 'CHARGE' ? (
                        <span style={{ color: '#2563eb' }}>{req.content}</span>
                      ) : (
                        <span style={{ color: '#64748b' }}>{req.bankName} {req.accountNumber} ({req.accountHolder})</span>
                      )}
                    </td>
                    
                    {/* 상태 */}
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '700',
                        backgroundColor: req.status === 'PENDING' ? '#fef3c7' : req.status === 'APPROVED' ? '#dcfce7' : '#f1f5f9',
                        color: req.status === 'PENDING' ? '#d97706' : req.status === 'APPROVED' ? '#16a34a' : '#64748b'
                      }}>
                        {req.status === 'PENDING' ? '대기중' : req.status === 'APPROVED' ? '승인완료' : '반려됨'}
                      </span>
                    </td>
                    
                    {/* 관리 액션 버튼 */}
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      {req.status === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button onClick={() => handleProcess(req.id, 'APPROVED')} style={{ padding: '6px 12px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>승인</button>
                          <button onClick={() => handleProcess(req.id, 'REJECTED')} style={{ padding: '6px 12px', backgroundColor: '#fff', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>반려</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>처리됨</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      현재 대기 중인 신청 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}