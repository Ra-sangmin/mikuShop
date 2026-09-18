"use client";

import { useState, useEffect, useCallback } from 'react';
import '../admin-common.css';
import { useResizableColumns, ResizableTableHead, type ResizableColumn } from '../components/useResizableColumns';

// 🌟 열 순서와 기본 너비. orders 처럼 헤더 경계를 드래그해 너비를 조절할 수 있습니다.
const CS_COLUMNS: readonly ResizableColumn[] = [
  { key: 'type', label: '분류' },
  { key: 'title', label: '제목' },
  { key: 'user', label: '작성자' },
  { key: 'date', label: '등록일' },
  { key: 'status', label: '상태', align: 'center' },
  { key: 'manage', label: '관리', align: 'center' },
];
const CS_DEFAULT_WIDTHS = {
  type: 120,
  title: 360,
  user: 140,
  date: 140,
  status: 120,
  manage: 140,
};

// 🌟 공지사항 표의 열 (문의 목록과 같은 방식으로 너비를 조절할 수 있습니다)
const NOTICE_COLUMNS: readonly ResizableColumn[] = [
  { key: 'title', label: '제목' },
  { key: 'content', label: '내용' },
  { key: 'date', label: '등록일' },
  { key: 'manage', label: '관리', align: 'center' },
];
const NOTICE_DEFAULT_WIDTHS = { title: 300, content: 460, date: 140, manage: 140 };

interface Notice {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const emptyNoticeForm = { title: '', content: '' };

// 가짜 문의 데이터
const dummyInquiries = [
  { id: 1, type: '배송문의', title: '언제쯤 도착하나요?', user: '김철수', date: '2026.02.25', status: '답변완료' },
  { id: 2, type: '결제문의', title: '입금 확인 부탁드립니다.', user: '이영희', date: '2026.02.26', status: '대기중' },
  { id: 3, type: '상품문의', title: '사이즈 재입고 문의', user: '박민수', date: '2026.02.26', status: '대기중' },
];

export default function CSManagement() {
  // 실제 서비스 시 API 연동용 State 자리
  const [inquiries] = useState(dummyInquiries);

  const { columnWidths, totalTableWidth, onMouseDown } = useResizableColumns({
    storageKey: 'admin_cs_column_widths',
    defaultWidths: CS_DEFAULT_WIDTHS,
    visibleColumns: CS_COLUMNS.map(c => c.key),
  });

  // 📢 공지사항
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isNoticeLoading, setIsNoticeLoading] = useState(true);
  const [isNoticeSaving, setIsNoticeSaving] = useState(false);
  // 🌟 내용이 길어 표 안에서 고치기 어려우므로, "수정"을 누르면 위쪽 입력 패널로 불러옵니다.
  const [editingNoticeId, setEditingNoticeId] = useState<number | null>(null);
  const [noticeForm, setNoticeForm] = useState(emptyNoticeForm);

  const noticeCols = useResizableColumns({
    storageKey: 'admin_cs_notice_column_widths',
    defaultWidths: NOTICE_DEFAULT_WIDTHS,
    visibleColumns: NOTICE_COLUMNS.map(c => c.key),
  });

  const fetchNotices = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notices');
      const data = await res.json();
      if (data.success) setNotices(data.notices);
      else alert(data.error || '공지사항을 불러오지 못했습니다.');
    } catch (error) {
      console.error('공지사항 조회 에러:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setIsNoticeLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  const resetNoticeForm = () => {
    setEditingNoticeId(null);
    setNoticeForm(emptyNoticeForm);
  };

  const handleNoticeSubmit = async () => {
    if (!noticeForm.title.trim() || !noticeForm.content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }
    setIsNoticeSaving(true);
    try {
      const isEditing = editingNoticeId !== null;
      const res = await fetch('/api/admin/notices', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { id: editingNoticeId, ...noticeForm } : noticeForm),
      });
      const data = await res.json();
      if (data.success) {
        resetNoticeForm();
        fetchNotices();
      } else {
        alert(data.error || (isEditing ? '수정 실패' : '등록 실패'));
      }
    } catch (error) {
      console.error('공지사항 저장 에러:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setIsNoticeSaving(false);
    }
  };

  const startEditingNotice = (notice: Notice) => {
    setEditingNoticeId(notice.id);
    setNoticeForm({ title: notice.title, content: notice.content });
    // 입력 패널이 표보다 위에 있으므로 화면을 위로 올려 줍니다.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (value: string) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
  };

  // 통계 계산 (가짜 데이터 기반)
  const pendingCount = inquiries.filter(q => q.status === '대기중').length;
  const todayCount = inquiries.filter(q => q.date === '2026.02.26').length; // 날짜 하드코딩 예시

  const getStatusStyle = (status: string) => {
    return status === '대기중'
      ? { bg: colors.pendingBg, text: colors.pendingText }
      : { bg: colors.completedBg, text: colors.completedText };
  };

  return (
    <div style={css.container}>
      
      {/* 🌟 통계 카드 섹션 */}
      <div style={css.cardGrid}>
        <div className="admin-container admin-flex-between">
          <div>
            <div className="admin-stat-title">미답변 문의</div>
            <div className="admin-stat-count" style={{ color: colors.pendingText }}>{pendingCount}건</div>
          </div>
          <div style={css.statIcon}>💬</div>
        </div>
        <div className="admin-container admin-flex-between">
          <div>
            <div className="admin-stat-title">오늘 들어온 문의</div>
            <div className="admin-stat-count" style={{ color: colors.accent }}>{todayCount}건</div>
          </div>
          <div style={css.statIcon}>🔔</div>
        </div>
      </div>

      {/* 📢 공지사항 (문의 목록 위) */}
      <div className="admin-container">
        <h2 className="admin-section-title">공지사항</h2>

        {/* 입력 패널 — 등록과 수정을 같은 자리에서 합니다 */}
        <div style={css.noticeForm}>
          <label style={css.noticeLabel}>제목</label>
          <input
            type="text"
            value={noticeForm.title}
            onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
            placeholder="공지 제목을 입력하세요"
            style={css.noticeInput}
          />

          <label style={css.noticeLabel}>내용</label>
          <textarea
            value={noticeForm.content}
            onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
            placeholder="공지 내용을 입력하세요"
            rows={6}
            style={css.noticeTextarea}
          />

          <div style={css.noticeButtonRow}>
            {editingNoticeId !== null && (
              <button onClick={resetNoticeForm} style={css.btnSecondary}>취소</button>
            )}
            <button onClick={handleNoticeSubmit} disabled={isNoticeSaving} style={css.btnPrimary}>
              {editingNoticeId !== null ? '수정 저장' : '등록'}
            </button>
          </div>
        </div>

        {/* 등록된 공지 목록 */}
        <div style={css.tableWrapper}>
          <table className="admin-table-resizable" style={{ width: noticeCols.totalTableWidth }}>
            <ResizableTableHead columns={NOTICE_COLUMNS} columnWidths={noticeCols.columnWidths} onMouseDown={noticeCols.onMouseDown} />
            <tbody>
              {!isNoticeLoading ? (
                notices.length > 0 ? notices.map((notice) => (
                  <tr key={notice.id} className="admin-table-body-row">
                    <td style={css.tdBold}>{notice.title}</td>
                    <td style={css.td} title={notice.content}>{notice.content}</td>
                    <td style={css.td}>{formatDate(notice.createdAt)}</td>
                    <td style={css.tdCenter}>
                      <button onClick={() => startEditingNotice(notice)} style={css.btnSecondary}>수정</button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={NOTICE_COLUMNS.length} className="admin-empty-td">등록된 공지사항이 없습니다.</td>
                  </tr>
                )
              ) : (
                <tr>
                  <td colSpan={NOTICE_COLUMNS.length} className="admin-empty-td">로딩 중...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🌟 테이블 영역 */}
      <div className="admin-container">
        <h2 className="admin-section-title">문의 목록</h2>

        {/* 🐛 table-layout: fixed 는 표에 확정된 너비가 있어야 적용됩니다.
            보이는 열 너비의 합을 표 너비로 직접 지정해야 드래그로 열이 줄어듭니다. */}
        <div style={css.tableWrapper}>
        <table className="admin-table-resizable" style={{ width: totalTableWidth }}>
          <ResizableTableHead columns={CS_COLUMNS} columnWidths={columnWidths} onMouseDown={onMouseDown} />
          <tbody>
            {inquiries.map((inquiry) => {
              const statusStyle = getStatusStyle(inquiry.status);

              return (
                <tr key={inquiry.id} className="admin-table-body-row">
                  <td style={css.td}>
                    <span style={css.typeBadge}>{inquiry.type}</span>
                  </td>
                  <td style={css.tdBold}>{inquiry.title}</td>
                  <td style={css.td}>{inquiry.user}</td>
                  <td style={css.td}>{inquiry.date}</td>
                  <td style={css.tdCenter}>
                    <span style={{ 
                      ...css.statusBadge, 
                      backgroundColor: statusStyle.bg, 
                      color: statusStyle.text 
                    }}>
                      {inquiry.status}
                    </span>
                  </td>
                  <td style={css.tdCenter}>
                    <button style={css.btnReply}>답변하기</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 🎨 스타일 정의 영역 (CS Styles: css)
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
  bgHead: '#f8fafc',
  
  // 상태 뱃지용 색상
  pendingBg: '#fff7ed',
  pendingText: '#ea580c',
  completedBg: '#f0fdf4',
  completedText: '#16a34a',
};

// 🌟 열 너비를 고정(table-layout: fixed)했으므로, 넘치는 값은 말줄임으로 처리합니다.
const baseTd: React.CSSProperties = {
  padding: '16px 12px',
  borderRight: '1px solid #f1f5f9',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const css: Record<string, React.CSSProperties> = {
  // 메인 컨테이너
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  
  // 통계 카드
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
  },
  statIcon: {
    fontSize: '30px',
  },

  // 테이블 셀
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
  },
  td: { ...baseTd },
  tdBold: { ...baseTd, fontWeight: '500' },
  tdCenter: { ...baseTd, textAlign: 'center' },
  
  // 뱃지 및 버튼
  typeBadge: {
    fontSize: '12px',
    padding: '2px 6px',
    backgroundColor: colors.border,
    borderRadius: '4px',
    color: colors.textSub,
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
  },
  // 📢 공지사항 입력 패널
  noticeForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '24px',
  },
  noticeLabel: {
    fontSize: '13px',
    fontWeight: 700,
    color: colors.textDark,
    marginTop: '6px',
  },
  noticeInput: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${colors.borderInput}`,
    fontSize: '14px',
    boxSizing: 'border-box',
    width: '100%',
  },
  noticeTextarea: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${colors.borderInput}`,
    fontSize: '14px',
    boxSizing: 'border-box',
    width: '100%',
    resize: 'vertical',
    lineHeight: 1.6,
    fontFamily: 'inherit',
  },
  noticeButtonRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '10px',
  },
  btnPrimary: {
    padding: '9px 20px',
    backgroundColor: colors.accent,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '9px 20px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.borderInput}`,
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    color: colors.textDark,
  },
  btnReply: {
    padding: '6px 12px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.borderInput}`,
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    color: colors.textDark,
    fontWeight: '500',
  },
};