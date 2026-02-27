"use client";
import { useState, useEffect } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState('관리자');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ level: '', cyberMoney: 0 });
  const [isUpdating, setIsUpdating] = useState(false);

  const levels = ['일반회원', '브론즈', '실버', '골드', '다이아몬드', 'VIP'];

  useEffect(() => {
    const storedName = localStorage.getItem('admin_name');
    if (storedName) setAdminName(storedName);
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("사용자 목록 가져오기 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.loginId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const startEditing = (user: any) => {
    setEditingUserId(user.id);
    setEditForm({
      level: user.level,
      cyberMoney: user.cyberMoney
    });
  };

  const handleUpdate = async (userId: number) => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          level: editForm.level,
          cyberMoney: editForm.cyberMoney
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('사용자 정보가 수정되었습니다.');
        setEditingUserId(null);
        fetchUsers();
      } else {
        alert(data.error || '수정 실패');
      }
    } catch (error) {
      console.error("사용자 수정 에러:", error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: "'Inter', 'Noto Sans KR', sans-serif" }}>
      <AdminSidebar />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ height: '70px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 }}>사용자 관리</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b' }}>
              {adminName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: '500', color: '#334155' }}>{adminName}</span>
          </div>
        </header>

        <div style={{ padding: '30px', overflowY: 'auto' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', padding: '24px' }}>
            
            <div style={{ marginBottom: '24px' }}>
              <input 
                type="text" 
                placeholder="이름, 아이디, 이메일 검색..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', width: '300px' }}
              />
            </div>

            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '14px', backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '16px 12px' }}>가입일</th>
                    <th style={{ padding: '16px 12px' }}>아이디</th>
                    <th style={{ padding: '16px 12px' }}>이름</th>
                    <th style={{ padding: '16px 12px' }}>이메일</th>
                    <th style={{ padding: '16px 12px' }}>등급</th>
                    <th style={{ padding: '16px 12px', textAlign: 'right' }}>주문수</th>
                    <th style={{ padding: '16px 12px', textAlign: 'right' }}>예치금</th>
                    <th style={{ padding: '16px 12px', textAlign: 'center' }}>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading ? (
                    filteredUsers.length > 0 ? filteredUsers.map((user) => (
                      <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#334155' }}>
                        <td style={{ padding: '16px 12px' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '16px 12px', fontWeight: '600' }}>{user.loginId}</td>
                        <td style={{ padding: '16px 12px' }}>{user.name}</td>
                        <td style={{ padding: '16px 12px' }}>{user.email || '-'}</td>
                        <td style={{ padding: '16px 12px' }}>
                          {editingUserId === user.id ? (
                            <select 
                              value={editForm.level}
                              onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            >
                              {levels.map(lv => <option key={lv} value={lv}>{lv}</option>)}
                            </select>
                          ) : (
                            <span style={{ padding: '4px 8px', backgroundColor: '#eff6ff', color: '#3b82f6', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                              {user.level}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'right' }}>{user._count?.orders || 0}건</td>
                        <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                          {editingUserId === user.id ? (
                            <input 
                              type="number"
                              value={editForm.cyberMoney}
                              onChange={(e) => setEditForm({ ...editForm, cyberMoney: parseInt(e.target.value) || 0 })}
                              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100px', textAlign: 'right' }}
                            />
                          ) : (
                            `₩${user.cyberMoney.toLocaleString()}`
                          )}
                        </td>
                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                          {editingUserId === user.id ? (
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              <button 
                                onClick={() => handleUpdate(user.id)}
                                disabled={isUpdating}
                                style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                              >
                                저장
                              </button>
                              <button 
                                onClick={() => setEditingUserId(null)}
                                style={{ padding: '6px 12px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => startEditing(user)}
                              style={{ padding: '6px 12px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                            >
                              수정
                            </button>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                          검색 결과가 없습니다.
                        </td>
                      </tr>
                    )
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                        로딩 중...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
