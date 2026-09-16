"use client";

import { useState, useEffect, useCallback } from 'react';
import '../admin-common.css';
import { useResizableColumns, ResizeHandles } from '../components/useResizableColumns';

// 🌟 열 순서(= 화면에 보이는 순서)와 기본 너비. orders 처럼 드래그로 조절할 수 있습니다.
const REFUND_COLUMNS = ['createdAt', 'type', 'user', 'amount', 'detail', 'status', 'manage'] as const;
const REFUND_DEFAULT_WIDTHS = {
  createdAt: 200,
  type: 100,
  user: 260,
  amount: 140,
  detail: 320,
  status: 120,
  manage: 160,
};

export default function MoneyRequestManagement() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { columnWidths, totalTableWidth, onMouseDown } = useResizableColumns({
    storageKey: 'admin_refund_column_widths',
    defaultWidths: REFUND_DEFAULT_WIDTHS,
    visibleColumns: [...REFUND_COLUMNS],
  });

  // 🌟 데이터 불러오기
  const fetchRequests = useCallback(async () => {
    // 🐛 adminId가 없을 때 try/finally 앞에서 그냥 return 해버려 isLoading이 영영 true로 남고
    //    화면이 "불러오는 중"에서 멈췄습니다. 로딩 상태는 반드시 풀어줍니다.
    const adminId = localStorage.getItem('admin_id');
    if (!adminId) {
      setIsLoading(false);
      return;
    }

    try {
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
    fetchRequests();
  }, [fetchRequests]);

  // 🚀 승인/반려 처리 핸들러
  const handleProcess = async (requestId: number, status: 'APPROVED' | 'REJECTED') => {
    const adminId = localStorage.getItem('admin_id'); 
    const actionText = status === 'APPROVED' ? '승인' : '반려';
    
    if (!confirm(`해당 신청 건을 정말 ${actionText} 처리하시겠습니까?`)) return;

    try {
      const res = await fetch('/api/money/approve', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          requestId, 
          status, 
          adminId 
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`${actionText} 처리가 완료되었습니다.`);
        fetchRequests(); // 목록 새로고침
      } else {
        alert(`오류: ${data.error}`);
      }
    } catch (error) {
      alert('서버 통신 중 오류가 발생했습니다.');
    }
  };

  // 🌟 상태별 색상 헬퍼 함수
  const getTypeStyle = (type: string) => {
    return type === 'CHARGE' 
      ? { bg: colors.chargeBg, text: colors.chargeText, label: '충전' }
      : { bg: colors.refundBg, text: colors.refundText, label: '환불' };
  };

  const getStatusStyle = (status: string) => {
    if (status === 'PENDING') return { bg: colors.pendingBg, text: colors.pendingText, label: '대기중' };
    if (status === 'APPROVED') return { bg: colors.approvedBg, text: colors.approvedText, label: '승인완료' };
    return { bg: colors.rejectedBg, text: colors.rejectedText, label: '반려됨' };
  };

  return (
    <div className="admin-container">
      <h2 className="admin-section-title">머니 신청 대기 및 처리 내역</h2>

      <div style={mrs.tableWrapper}>
        {/* 🐛 table-layout: fixed 는 표에 확정된 너비가 있어야 적용됩니다.
            보이는 열 너비의 합을 표 너비로 직접 지정해야 드래그로 열이 줄어듭니다. */}
        <table className="admin-table-resizable" style={{ width: totalTableWidth }}>
          <colgroup>
            {REFUND_COLUMNS.map(key => <col key={key} style={{ width: columnWidths[key] }} />)}
          </colgroup>
          <thead>
            <tr className="admin-table-head-row">
              <th className="admin-th-resizable">
                <ResizeHandles columnKey="createdAt" onMouseDown={onMouseDown} />
                일자
              </th>
              <th className="admin-th-resizable">
                <ResizeHandles columnKey="type" onMouseDown={onMouseDown} />
                구분
              </th>
              <th className="admin-th-resizable">
                <ResizeHandles columnKey="user" onMouseDown={onMouseDown} />
                신청자 (ID)
              </th>
              <th className="admin-th-resizable" style={{ textAlign: 'right' }}>
                <ResizeHandles columnKey="amount" onMouseDown={onMouseDown} />
                금액
              </th>
              <th className="admin-th-resizable">
                <ResizeHandles columnKey="detail" onMouseDown={onMouseDown} />
                상세 정보 (입금자/계좌)
              </th>
              <th className="admin-th-resizable" style={{ textAlign: 'center' }}>
                <ResizeHandles columnKey="status" onMouseDown={onMouseDown} />
                상태
              </th>
              <th className="admin-th-resizable" style={{ textAlign: 'center' }}>
                <ResizeHandles columnKey="manage" onMouseDown={onMouseDown} />
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={mrs.emptyTd}>데이터를 불러오는 중입니다...</td></tr>
            ) : requests.length > 0 ? requests.map((req) => {
              const typeStyle = getTypeStyle(req.type);
              const statusStyle = getStatusStyle(req.status);

              return (
                <tr key={req.id} className="admin-table-body-row">
                  <td style={mrs.td}>{new Date(req.createdAt).toLocaleString()}</td>
                  
                  {/* 구분 (충전/환불 뱃지) */}
                  <td style={mrs.td}>
                    <span style={{ ...mrs.badge, backgroundColor: typeStyle.bg, color: typeStyle.text }}>
                      {typeStyle.label}
                    </span>
                  </td>
                  
                  <td style={mrs.tdBold}>{req.user?.name || '알수없음'} <span style={mrs.subText}>({req.user?.email})</span></td>
                  <td style={mrs.tdAmount}>{req.amount.toLocaleString()}원</td>
                  
                  {/* 상세 정보 */}
                  <td style={mrs.tdDetail}>
                    {req.type === 'CHARGE' ? (
                      <span style={{ color: colors.chargeText }}>{req.content}</span>
                    ) : (
                      <span style={{ color: colors.textSub }}>{req.bankName} {req.accountNumber} ({req.accountHolder})</span>
                    )}
                  </td>
                  
                  {/* 상태 */}
                  <td style={mrs.tdCenter}>
                    <span style={{ ...mrs.badge, backgroundColor: statusStyle.bg, color: statusStyle.text }}>
                      {statusStyle.label}
                    </span>
                  </td>
                  
                  {/* 관리 액션 버튼 */}
                  <td style={mrs.tdCenter}>
                    {req.status === 'PENDING' ? (
                      <div style={mrs.actionButtons}>
                        <button onClick={() => handleProcess(req.id, 'APPROVED')} style={mrs.btnApprove}>승인</button>
                        <button onClick={() => handleProcess(req.id, 'REJECTED')} style={mrs.btnReject}>반려</button>
                      </div>
                    ) : (
                      <span style={mrs.processedText}>처리됨</span>
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={7} style={mrs.emptyTd}>
                  현재 대기 중인 신청 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// 🎨 스타일 정의 영역 (Money Request Styles: mrs)
// ==========================================

const colors = {
  white: '#fff',
  border: '#f1f5f9',
  borderDark: '#e2e8f0',
  borderInput: '#cbd5e1',
  textMain: '#0f172a',
  textSub: '#64748b',
  textDark: '#334155',
  emptyText: '#94a3b8',
  bgHead: '#f8fafc',
  
  // 뱃지 색상
  chargeBg: '#eff6ff',
  chargeText: '#2563eb',
  refundBg: '#fef2f2',
  refundText: '#ef4444',
  pendingBg: '#fef3c7',
  pendingText: '#d97706',
  approvedBg: '#dcfce7',
  approvedText: '#16a34a',
  rejectedBg: '#f1f5f9',
  rejectedText: '#64748b',
};

// 🌟 열 너비를 고정(table-layout: fixed)했으므로, 넘치는 값은 말줄임으로 처리합니다.
const baseTd: React.CSSProperties = {
  padding: '16px 12px',
  borderRight: '1px solid #f1f5f9',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const mrs: Record<string, React.CSSProperties> = {
  // 테이블 구조
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
  },

  // 테이블 셀 (TD)
  td: { ...baseTd },
  tdBold: { ...baseTd, fontWeight: '600' },
  tdAmount: { ...baseTd, textAlign: 'right', fontWeight: '800', color: colors.textMain },
  tdDetail: { ...baseTd, fontSize: '13px' },
  tdCenter: { ...baseTd, textAlign: 'center' },
  
  // 텍스트 & 뱃지
  subText: { fontWeight: '400', color: colors.textSub },
  processedText: { fontSize: '13px', color: colors.emptyText },
  badge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '700',
  },

  // 버튼
  actionButtons: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'center',
  },
  btnApprove: {
    padding: '6px 12px',
    backgroundColor: colors.approvedText,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnReject: {
    padding: '6px 12px',
    backgroundColor: colors.white,
    color: colors.textSub,
    border: `1px solid ${colors.borderInput}`,
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },

  // 빈 상태
  emptyTd: {
    padding: '40px',
    textAlign: 'center',
    color: colors.emptyText,
  },
};