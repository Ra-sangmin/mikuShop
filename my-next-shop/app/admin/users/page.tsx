"use client";

import { useState, useEffect } from 'react';
import '../admin-common.css';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ level: '', cyberMoney: 0 });
  const [isUpdating, setIsUpdating] = useState(false);

  const levels = ['일반회원', '브론즈', '실버', '골드', '다이아몬드', 'VIP'];

  useEffect(() => {
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
    <div className="admin-container">

      {/* 검색 영역 */}
      <div style={us.searchWrapper}>
        <input
          type="text"
          placeholder="이름, 아이디, 이메일 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="admin-search-input"
        />
      </div>

      {/* 테이블 영역 */}
      <div style={us.tableWrapper}>
        <table className="admin-table-simple">
          <thead>
            <tr className="admin-table-head-row">
              <th className="admin-base-th">가입일</th>
              <th className="admin-base-th">아이디</th>
              <th className="admin-base-th">이름</th>
              <th className="admin-base-th">이메일</th>
              <th className="admin-base-th">등급</th>
              <th className="admin-base-th" style={{ textAlign: 'right' }}>주문수</th>
              <th className="admin-base-th" style={{ textAlign: 'right' }}>예치금</th>
              <th className="admin-base-th" style={{ textAlign: 'center' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading ? (
              filteredUsers.length > 0 ? filteredUsers.map((user) => (
                <tr key={user.id} className="admin-table-body-row">
                  <td style={us.td}>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td style={us.tdBold}>{user.loginId}</td>
                  <td style={us.td}>{user.name}</td>
                  <td style={us.td}>{user.email || '-'}</td>

                  {/* 등급 */}
                  <td style={us.td}>
                    {editingUserId === user.id ? (
                      <select 
                        value={editForm.level}
                        onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                        style={us.selectInput}
                      >
                        {levels.map(lv => <option key={lv} value={lv}>{lv}</option>)}
                      </select>
                    ) : (
                      <span style={us.levelBadge}>
                        {user.level}
                      </span>
                    )}
                  </td>
                  
                  {/* 주문수 & 예치금 */}
                  <td style={us.tdRight}>{user._count?.orders || 0}건</td>
                  <td style={us.tdRight}>
                    {editingUserId === user.id ? (
                      <input 
                        type="number"
                        value={editForm.cyberMoney}
                        onChange={(e) => setEditForm({ ...editForm, cyberMoney: parseInt(e.target.value) || 0 })}
                        style={us.numberInput}
                      />
                    ) : (
                      `₩${user.cyberMoney.toLocaleString()}`
                    )}
                  </td>
                  
                  {/* 관리 버튼 */}
                  <td style={us.tdCenter}>
                    {editingUserId === user.id ? (
                      <div style={us.actionButtons}>
                        <button 
                          onClick={() => handleUpdate(user.id)}
                          disabled={isUpdating}
                          style={us.btnPrimary}
                        >
                          저장
                        </button>
                        <button 
                          onClick={() => setEditingUserId(null)}
                          style={us.btnSecondary}
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => startEditing(user)}
                        style={us.btnSecondary}
                      >
                        수정
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="admin-empty-td">검색 결과가 없습니다.</td>
                </tr>
              )
            ) : (
              <tr>
                <td colSpan={8} className="admin-empty-td">로딩 중...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// 🎨 스타일 정의 영역 (User Styles: us)
// ==========================================

const colors = {
  white: '#fff',
  border: '#f1f5f9',
  borderDark: '#e2e8f0',
  borderInput: '#cbd5e1',
  textMain: '#0f172a',
  textSub: '#64748b',
  textDark: '#334155',
  accent: '#3b82f6',
  badgeBgLevel: '#eff6ff',
  badgeTextLevel: '#3b82f6',
  emptyText: '#94a3b8',
  bgHead: '#f8fafc',
};

const baseTd: React.CSSProperties = { padding: '16px 12px' };

const us: Record<string, React.CSSProperties> = {
  // 검색
  searchWrapper: {
    marginBottom: '24px',
  },

  // 테이블
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
  },

  // 테이블 셀 (TD)
  td: { ...baseTd },
  tdBold: { ...baseTd, fontWeight: '600' },
  tdCenter: { ...baseTd, textAlign: 'center' },
  tdRight: { ...baseTd, textAlign: 'right' },
  
  // 입력 폼 (수정 모드)
  selectInput: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: `1px solid ${colors.borderInput}`,
  },
  numberInput: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: `1px solid ${colors.borderInput}`,
    width: '100px',
    textAlign: 'right',
  },
  
  // 뱃지 & 버튼
  levelBadge: {
    padding: '4px 8px',
    backgroundColor: colors.badgeBgLevel,
    color: colors.badgeTextLevel,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
  },
  actionButtons: {
    display: 'flex',
    gap: '4px',
    justifyContent: 'center',
  },
  btnPrimary: {
    padding: '6px 12px',
    backgroundColor: colors.accent,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '6px 12px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.borderInput}`,
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  
  // 빈 상태
};