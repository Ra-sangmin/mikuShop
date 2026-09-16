"use client";

import { useState, useEffect, useRef } from 'react';
import '../admin-common.css';
import { useResizableColumns, ResizeHandles } from '../components/useResizableColumns';

// 🌟 열 순서(= 화면에 보이는 순서)와 기본 너비. orders 처럼 드래그로 조절할 수 있습니다.
const USER_COLUMNS = ['createdAt', 'loginId', 'name', 'email', 'grade', 'orderCount', 'cyberMoney', 'manage'] as const;
const USER_DEFAULT_WIDTHS = {
  createdAt: 140,
  loginId: 160,
  name: 140,
  email: 240,
  grade: 140,
  orderCount: 100,
  cyberMoney: 160,
  manage: 160,
};

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ membershipGrade: 0, cyberMoney: 0 });
  const [isUpdating, setIsUpdating] = useState(false);

  const [grades, setGrades] = useState<{ id: number, name: string }[]>([]);

  const { columnWidths, totalTableWidth, onMouseDown } = useResizableColumns({
    storageKey: 'admin_users_column_widths',
    defaultWidths: USER_DEFAULT_WIDTHS,
    visibleColumns: [...USER_COLUMNS],
  });

  useEffect(() => {
    fetchUsers();
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      const res = await fetch('/api/membership-grades');
      const data = await res.json();
      if (data.success) {
        setGrades(data.grades);
      }
    } catch (error) {
      console.error("등급 목록 가져오기 실패:", error);
    }
  };

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

  // 🌟 편집 시작 시점의 원래 값. 실제로 바뀐 항목만 서버로 보내기 위해 보관합니다.
  const editOriginRef = useRef<{ membershipGrade: any; cyberMoney: any } | null>(null);

  const startEditing = (user: any) => {
    setEditingUserId(user.id);
    editOriginRef.current = {
      membershipGrade: user.membershipGrade,
      cyberMoney: user.cyberMoney,
    };
    setEditForm({
      membershipGrade: user.membershipGrade,
      cyberMoney: user.cyberMoney
    });
  };

  const handleUpdate = async (userId: number) => {
    setIsUpdating(true);
    try {
      // 🐛 등급만 바꿔도 화면이 들고 있던 낡은 보유머니를 항상 함께 보내서, 그 사이 회원이
      //    쓴 금액이 되돌아가는 문제가 있었습니다. 바뀐 항목만 보냅니다.
      const origin = editOriginRef.current;
      const payload: Record<string, any> = { userId };
      if (!origin || String(editForm.membershipGrade) !== String(origin.membershipGrade)) {
        payload.membershipGrade = editForm.membershipGrade;
      }
      if (!origin || String(editForm.cyberMoney) !== String(origin.cyberMoney)) {
        payload.cyberMoney = editForm.cyberMoney;
      }

      if (Object.keys(payload).length === 1) {
        setEditingUserId(null);
        return;
      }

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
        {/* 🐛 table-layout: fixed 는 표에 확정된 너비가 있어야 적용됩니다.
            보이는 열 너비의 합을 표 너비로 직접 지정해야 드래그로 열이 줄어듭니다. */}
        <table className="admin-table-resizable" style={{ width: totalTableWidth }}>
          <colgroup>
            {USER_COLUMNS.map(key => <col key={key} style={{ width: columnWidths[key] }} />)}
          </colgroup>
          <thead>
            <tr className="admin-table-head-row">
              <th className="admin-th-resizable">
                <ResizeHandles columnKey="createdAt" onMouseDown={onMouseDown} />
                가입일
              </th>
              <th className="admin-th-resizable">
                <ResizeHandles columnKey="loginId" onMouseDown={onMouseDown} />
                아이디
              </th>
              <th className="admin-th-resizable">
                <ResizeHandles columnKey="name" onMouseDown={onMouseDown} />
                이름
              </th>
              <th className="admin-th-resizable">
                <ResizeHandles columnKey="email" onMouseDown={onMouseDown} />
                이메일
              </th>
              <th className="admin-th-resizable">
                <ResizeHandles columnKey="grade" onMouseDown={onMouseDown} />
                등급
              </th>
              <th className="admin-th-resizable" style={{ textAlign: 'right' }}>
                <ResizeHandles columnKey="orderCount" onMouseDown={onMouseDown} />
                주문수
              </th>
              <th className="admin-th-resizable" style={{ textAlign: 'right' }}>
                <ResizeHandles columnKey="cyberMoney" onMouseDown={onMouseDown} />
                예치금
              </th>
              <th className="admin-th-resizable" style={{ textAlign: 'center' }}>
                <ResizeHandles columnKey="manage" onMouseDown={onMouseDown} />
                관리
              </th>
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
                        value={editForm.membershipGrade}
                        onChange={(e) => setEditForm({ ...editForm, membershipGrade: parseInt(e.target.value) })}
                        style={us.selectInput}
                      >
                        {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    ) : (
                      <span style={us.levelBadge}>
                        {user.grade?.name}
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

// 🌟 열 너비를 고정(table-layout: fixed)했으므로, 넘치는 값은 말줄임으로 처리합니다.
const baseTd: React.CSSProperties = {
  padding: '16px 12px',
  borderRight: `1px solid ${'#f1f5f9'}`,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

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
    width: '100%',
    maxWidth: '100%',
  },
  numberInput: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: `1px solid ${colors.borderInput}`,
    width: '100%',
    maxWidth: '100%',
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