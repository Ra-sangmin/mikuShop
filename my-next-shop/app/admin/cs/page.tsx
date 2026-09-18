"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import '../admin-common.css';
import { useResizableColumns, ResizableTableHead, type ResizableColumn } from '../components/useResizableColumns';

// 🌟 자주하는 질문 표의 열. orders 처럼 헤더 경계를 드래그해 너비를 조절할 수 있습니다.
const FAQ_COLUMNS: readonly ResizableColumn[] = [
  { key: 'question', label: '질문' },
  { key: 'answer', label: '답변' },
  { key: 'manage', label: '관리', align: 'center' },
];
const FAQ_DEFAULT_WIDTHS = { question: 340, answer: 480, manage: 170 };

// 🌟 공지사항 표의 열 (문의 목록과 같은 방식으로 너비를 조절할 수 있습니다)
const NOTICE_COLUMNS: readonly ResizableColumn[] = [
  { key: 'title', label: '제목' },
  { key: 'content', label: '내용' },
  { key: 'date', label: '등록일' },
  { key: 'manage', label: '관리', align: 'center' },
];
const NOTICE_DEFAULT_WIDTHS = { title: 300, content: 460, date: 140, manage: 170 };

interface Notice {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface Faq {
  id: number;
  question: string;
  answer: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const emptyNoticeForm = { title: '', content: '' };
const emptyFaqForm = { question: '', answer: '' };

export default function CSManagement() {
  const faqCols = useResizableColumns({
    storageKey: 'admin_cs_faq_column_widths',
    defaultWidths: FAQ_DEFAULT_WIDTHS,
    visibleColumns: FAQ_COLUMNS.map(c => c.key),
  });

  // 📢 공지사항
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isNoticeLoading, setIsNoticeLoading] = useState(true);
  const [isNoticeSaving, setIsNoticeSaving] = useState(false);
  // 🌟 내용이 길어 표 안에서 고치기 어려우므로, "수정"을 누르면 위쪽 입력 패널로 불러옵니다.
  const [editingNoticeId, setEditingNoticeId] = useState<number | null>(null);
  const [noticeForm, setNoticeForm] = useState(emptyNoticeForm);
  // 🌟 삭제 중인 공지 id (버튼 중복 클릭 방지)
  const [deletingNoticeId, setDeletingNoticeId] = useState<number | null>(null);

  // ❓ 자주하는 질문
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [isFaqLoading, setIsFaqLoading] = useState(true);
  const [isFaqSaving, setIsFaqSaving] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<number | null>(null);
  const [faqForm, setFaqForm] = useState(emptyFaqForm);
  const [deletingFaqId, setDeletingFaqId] = useState<number | null>(null);
  // "수정"을 누르면 입력 패널로 화면을 옮기기 위한 위치 표시
  const faqFormRef = useRef<HTMLDivElement>(null);

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

  // 🌟 공지 삭제 — 되돌릴 수 없으므로 한 번 더 확인합니다.
  const handleDeleteNotice = async (notice: Notice) => {
    if (!window.confirm(`"${notice.title}" 공지사항을 삭제할까요?\n삭제한 공지는 되돌릴 수 없습니다.`)) return;

    setDeletingNoticeId(notice.id);
    try {
      const res = await fetch(`/api/admin/notices?id=${notice.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        // 수정 중이던 공지를 지웠다면 입력 패널도 비워 줍니다.
        if (editingNoticeId === notice.id) resetNoticeForm();
        fetchNotices();
      } else {
        alert(data.error || '삭제 실패');
      }
    } catch (error) {
      console.error('공지사항 삭제 에러:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingNoticeId(null);
    }
  };

  const formatDate = (value: string) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
  };

  // ❓ 자주하는 질문 (고객문의 > 자주하는 질문 화면에 그대로 보입니다)
  const fetchFaqs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/faqs');
      const data = await res.json();
      if (data.success) setFaqs(data.faqs);
      else alert(data.error || '자주하는 질문을 불러오지 못했습니다.');
    } catch (error) {
      console.error('자주하는 질문 조회 에러:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setIsFaqLoading(false);
    }
  }, []);

  useEffect(() => { fetchFaqs(); }, [fetchFaqs]);

  const resetFaqForm = () => {
    setEditingFaqId(null);
    setFaqForm(emptyFaqForm);
  };

  const handleFaqSubmit = async () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      alert('질문과 답변을 모두 입력해주세요.');
      return;
    }
    setIsFaqSaving(true);
    try {
      const isEditing = editingFaqId !== null;
      const res = await fetch('/api/admin/faqs', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { id: editingFaqId, ...faqForm } : faqForm),
      });
      const data = await res.json();
      if (data.success) {
        resetFaqForm();
        fetchFaqs();
      } else {
        alert(data.error || (isEditing ? '수정 실패' : '등록 실패'));
      }
    } catch (error) {
      console.error('자주하는 질문 저장 에러:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setIsFaqSaving(false);
    }
  };

  const startEditingFaq = (faq: Faq) => {
    setEditingFaqId(faq.id);
    setFaqForm({ question: faq.question, answer: faq.answer });
    // 입력 패널이 표보다 위에 있으므로 그 위치로 올려 줍니다.
    faqFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleDeleteFaq = async (faq: Faq) => {
    if (!window.confirm(`"${faq.question}" 질문을 삭제할까요?\n삭제한 질문은 되돌릴 수 없습니다.`)) return;

    setDeletingFaqId(faq.id);
    try {
      const res = await fetch(`/api/admin/faqs?id=${faq.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (editingFaqId === faq.id) resetFaqForm();
        fetchFaqs();
      } else {
        alert(data.error || '삭제 실패');
      }
    } catch (error) {
      console.error('자주하는 질문 삭제 에러:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingFaqId(null);
    }
  };

  return (
    <div style={css.container}>
      
      {/* 🌟 통계 카드 섹션 */}
      <div style={css.cardGrid}>
        <div className="admin-container admin-flex-between">
          <div>
            <div className="admin-stat-title">등록된 자주하는 질문</div>
            <div className="admin-stat-count" style={{ color: colors.accent }}>{faqs.length}건</div>
          </div>
          <div style={css.statIcon}>💬</div>
        </div>
        <div className="admin-container admin-flex-between">
          <div>
            <div className="admin-stat-title">등록된 공지사항</div>
            <div className="admin-stat-count" style={{ color: colors.pendingText }}>{notices.length}건</div>
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
                      <div style={css.noticeRowActions}>
                        <button onClick={() => startEditingNotice(notice)} style={css.btnRowEdit}>수정</button>
                        <button
                          onClick={() => handleDeleteNotice(notice)}
                          disabled={deletingNoticeId === notice.id}
                          style={{ ...css.btnRowDelete, ...(deletingNoticeId === notice.id ? css.btnRowDisabled : null) }}
                        >
                          {deletingNoticeId === notice.id ? '삭제 중' : '삭제'}
                        </button>
                      </div>
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

      {/* ❓ 자주하는 질문 — 고객문의 > 자주하는 질문 화면에 그대로 보입니다 */}
      <div className="admin-container">
        <h2 className="admin-section-title">자주하는 질문</h2>

        {/* 입력 패널 — 등록과 수정을 같은 자리에서 합니다 */}
        <div style={css.noticeForm} ref={faqFormRef}>
          <label style={css.noticeLabel}>질문</label>
          <input
            type="text"
            value={faqForm.question}
            onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
            placeholder="예) 배송비는 어떻게 계산되나요?"
            style={css.noticeInput}
          />

          <label style={css.noticeLabel}>답변</label>
          <textarea
            value={faqForm.answer}
            onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
            placeholder="고객에게 보여줄 답변을 입력하세요"
            rows={5}
            style={css.noticeTextarea}
          />

          <div style={css.noticeButtonRow}>
            {editingFaqId !== null && (
              <button onClick={resetFaqForm} style={css.btnSecondary}>취소</button>
            )}
            <button onClick={handleFaqSubmit} disabled={isFaqSaving} style={css.btnPrimary}>
              {editingFaqId !== null ? '수정 저장' : '등록'}
            </button>
          </div>
        </div>

        {/* 🐛 table-layout: fixed 는 표에 확정된 너비가 있어야 적용됩니다.
            보이는 열 너비의 합을 표 너비로 직접 지정해야 드래그로 열이 줄어듭니다. */}
        <div style={css.tableWrapper}>
          <table className="admin-table-resizable" style={{ width: faqCols.totalTableWidth }}>
            <ResizableTableHead columns={FAQ_COLUMNS} columnWidths={faqCols.columnWidths} onMouseDown={faqCols.onMouseDown} />
            <tbody>
              {!isFaqLoading ? (
                faqs.length > 0 ? faqs.map((faq) => (
                  <tr key={faq.id} className="admin-table-body-row">
                    <td style={css.tdBold} title={faq.question}>{faq.question}</td>
                    <td style={css.td} title={faq.answer}>{faq.answer}</td>
                    <td style={css.tdCenter}>
                      <div style={css.noticeRowActions}>
                        <button onClick={() => startEditingFaq(faq)} style={css.btnRowEdit}>수정</button>
                        <button
                          onClick={() => handleDeleteFaq(faq)}
                          disabled={deletingFaqId === faq.id}
                          style={{ ...css.btnRowDelete, ...(deletingFaqId === faq.id ? css.btnRowDisabled : null) }}
                        >
                          {deletingFaqId === faq.id ? '삭제 중' : '삭제'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={FAQ_COLUMNS.length} className="admin-empty-td">등록된 질문이 없습니다.</td>
                  </tr>
                )
              ) : (
                <tr>
                  <td colSpan={FAQ_COLUMNS.length} className="admin-empty-td">로딩 중...</td>
                </tr>
              )}
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
  
  // 통계 카드 강조 색상
  pendingText: '#ea580c',

  // 삭제 버튼용 색상
  dangerText: '#dc2626',
  dangerBorder: '#fecaca',
  dangerBg: '#fef2f2',
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
  // 🌟 표 안 "관리" 칸 — 수정 / 삭제 버튼을 나란히 둡니다.
  noticeRowActions: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'center',
  },
  btnRowEdit: {
    padding: '6px 12px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.borderInput}`,
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    color: colors.textDark,
    whiteSpace: 'nowrap',
  },
  btnRowDelete: {
    padding: '6px 12px',
    backgroundColor: colors.dangerBg,
    border: `1px solid ${colors.dangerBorder}`,
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    color: colors.dangerText,
    whiteSpace: 'nowrap',
  },
  btnRowDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
  },
};