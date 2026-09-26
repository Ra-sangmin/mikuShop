"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import '../admin-common.css';
import './cs-premium.css';
import { useFitTable, FitColGroup, FitTh } from '../components/useFitTable';
import {
  AdminHero, HeroButton, KpiCard, SearchField, EmptyRow, SkeletonRows, useToasts, ToastStack, fmtDate,
} from '../components/AdminPremiumKit';
import {
  Megaphone, Question, ArrowClockwise, Plus, PencilSimple, Trash, FloppyDisk, X, Info, CalendarBlank, Sparkle,
} from '@phosphor-icons/react';

/* ============================================================
   💬 고객센터 관리 — 공지사항 · 자주하는 질문
   ============================================================ */

const NOTICE_COLUMNS = ['title', 'content', 'date', 'manage'] as const;
const NOTICE_DEFAULT_WIDTHS = { title: 300, content: 560, date: 130, manage: 190 };

const FAQ_COLUMNS = ['question', 'answer', 'manage'] as const;
const FAQ_DEFAULT_WIDTHS = { question: 380, answer: 620, manage: 190 };

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
  const { toasts, pushToast } = useToasts();

  // 🌟 공통 표 2개 (가로 꽉 채움 · 연쇄 열 조절 · 관리 열 오른쪽 고정)
  const noticeTable = useFitTable({
    storageKey: 'admin_cs_notice_column_widths_v2',
    columns: NOTICE_COLUMNS,
    defaultWidths: NOTICE_DEFAULT_WIDTHS,
    pinned: { key: 'manage', minWidth: 170 },
  });
  const faqTable = useFitTable({
    storageKey: 'admin_cs_faq_column_widths_v2',
    columns: FAQ_COLUMNS,
    defaultWidths: FAQ_DEFAULT_WIDTHS,
    pinned: { key: 'manage', minWidth: 170 },
  });

  // 삭제 확인 단계 (브라우저 확인창 대신 버튼을 한 번 더 누르게 합니다)
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'notice' | 'faq'; id: number } | null>(null);

  /* ============ 📢 공지사항 ============ */
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isNoticeLoading, setIsNoticeLoading] = useState(true);
  const [isNoticeSaving, setIsNoticeSaving] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState<number | null>(null);
  const [noticeForm, setNoticeForm] = useState(emptyNoticeForm);
  const [deletingNoticeId, setDeletingNoticeId] = useState<number | null>(null);
  const [noticeSearch, setNoticeSearch] = useState('');
  const noticeFormRef = useRef<HTMLDivElement>(null);

  const fetchNotices = useCallback(async () => {
    setIsNoticeLoading(true);
    try {
      const res = await fetch('/api/admin/notices');
      const data = await res.json();
      if (data.success) setNotices(data.notices);
      else pushToast('error', data.error || '공지사항을 불러오지 못했습니다.');
    } catch (error) {
      console.error('공지사항 조회 에러:', error);
      pushToast('error', '서버 오류가 발생했습니다.');
    } finally {
      setIsNoticeLoading(false);
    }
  }, [pushToast]);

  const resetNoticeForm = () => {
    setEditingNoticeId(null);
    setNoticeForm(emptyNoticeForm);
  };

  const handleNoticeSubmit = async () => {
    if (!noticeForm.title.trim() || !noticeForm.content.trim()) {
      pushToast('error', '제목과 내용을 모두 입력해주세요.');
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
        pushToast('success', isEditing ? '공지사항을 수정했습니다.' : '공지사항을 등록했습니다.');
        resetNoticeForm();
        fetchNotices();
      } else {
        pushToast('error', data.error || (isEditing ? '수정에 실패했습니다.' : '등록에 실패했습니다.'));
      }
    } catch (error) {
      console.error('공지사항 저장 에러:', error);
      pushToast('error', '서버 오류가 발생했습니다.');
    } finally {
      setIsNoticeSaving(false);
    }
  };

  const startEditingNotice = (notice: Notice) => {
    setEditingNoticeId(notice.id);
    setNoticeForm({ title: notice.title, content: notice.content });
    noticeFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleDeleteNotice = async (notice: Notice) => {
    setDeletingNoticeId(notice.id);
    try {
      const res = await fetch(`/api/admin/notices?id=${notice.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        pushToast('success', `'${notice.title}' 공지를 삭제했습니다.`);
        if (editingNoticeId === notice.id) resetNoticeForm();
        setConfirmDelete(null);
        fetchNotices();
      } else {
        pushToast('error', data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('공지사항 삭제 에러:', error);
      pushToast('error', '삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingNoticeId(null);
    }
  };

  /* ============ ❓ 자주하는 질문 ============ */
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [isFaqLoading, setIsFaqLoading] = useState(true);
  const [isFaqSaving, setIsFaqSaving] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<number | null>(null);
  const [faqForm, setFaqForm] = useState(emptyFaqForm);
  const [deletingFaqId, setDeletingFaqId] = useState<number | null>(null);
  const [faqSearch, setFaqSearch] = useState('');
  const faqFormRef = useRef<HTMLDivElement>(null);

  const fetchFaqs = useCallback(async () => {
    setIsFaqLoading(true);
    try {
      const res = await fetch('/api/admin/faqs');
      const data = await res.json();
      if (data.success) setFaqs(data.faqs);
      else pushToast('error', data.error || '자주하는 질문을 불러오지 못했습니다.');
    } catch (error) {
      console.error('자주하는 질문 조회 에러:', error);
      pushToast('error', '서버 오류가 발생했습니다.');
    } finally {
      setIsFaqLoading(false);
    }
  }, [pushToast]);

  const resetFaqForm = () => {
    setEditingFaqId(null);
    setFaqForm(emptyFaqForm);
  };

  const handleFaqSubmit = async () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      pushToast('error', '질문과 답변을 모두 입력해주세요.');
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
        pushToast('success', isEditing ? '질문을 수정했습니다.' : '질문을 등록했습니다.');
        resetFaqForm();
        fetchFaqs();
      } else {
        pushToast('error', data.error || (isEditing ? '수정에 실패했습니다.' : '등록에 실패했습니다.'));
      }
    } catch (error) {
      console.error('자주하는 질문 저장 에러:', error);
      pushToast('error', '서버 오류가 발생했습니다.');
    } finally {
      setIsFaqSaving(false);
    }
  };

  const startEditingFaq = (faq: Faq) => {
    setEditingFaqId(faq.id);
    setFaqForm({ question: faq.question, answer: faq.answer });
    faqFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleDeleteFaq = async (faq: Faq) => {
    setDeletingFaqId(faq.id);
    try {
      const res = await fetch(`/api/admin/faqs?id=${faq.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        pushToast('success', '질문을 삭제했습니다.');
        if (editingFaqId === faq.id) resetFaqForm();
        setConfirmDelete(null);
        fetchFaqs();
      } else {
        pushToast('error', data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('자주하는 질문 삭제 에러:', error);
      pushToast('error', '삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingFaqId(null);
    }
  };

  useEffect(() => { fetchNotices(); fetchFaqs(); }, [fetchNotices, fetchFaqs]);

  const refreshAll = () => { fetchNotices(); fetchFaqs(); };

  /* ============ 집계 · 검색 ============ */
  const safeDate = (value?: string) => (!value || Number.isNaN(new Date(value).getTime()) ? '-' : fmtDate(value));
  const latestNotice = useMemo(
    () => notices.reduce<Notice | null>((a, n) => (!a || new Date(n.createdAt) > new Date(a.createdAt) ? n : a), null),
    [notices]
  );
  const latestFaqUpdate = useMemo(
    () => faqs.reduce<Faq | null>((a, f) => (!a || new Date(f.updatedAt) > new Date(a.updatedAt) ? f : a), null),
    [faqs]
  );
  const noticesThisMonth = useMemo(() => {
    const now = new Date();
    return notices.filter(n => {
      const d = new Date(n.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }, [notices]);

  const renderedNotices = useMemo(() => {
    const q = noticeSearch.trim().toLowerCase();
    return q ? notices.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)) : notices;
  }, [notices, noticeSearch]);
  const renderedFaqs = useMemo(() => {
    const q = faqSearch.trim().toLowerCase();
    return q ? faqs.filter(f => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)) : faqs;
  }, [faqs, faqSearch]);

  const isLoadingAny = isNoticeLoading || isFaqLoading;

  /* 표 안 수정 / 삭제 버튼 */
  const renderRowActions = ({ kind, id, onEdit, onDelete, busy }: {
    kind: 'notice' | 'faq'; id: number; onEdit: () => void; onDelete: () => void; busy: boolean;
  }) => {
    const confirming = confirmDelete?.kind === kind && confirmDelete.id === id;
    if (confirming) {
      return (
        <span className="ap-confirm">
          <button type="button" className="ap-btn is-ghost" onClick={() => setConfirmDelete(null)} disabled={busy} aria-label="취소"><X size={12} weight="bold" /></button>
          <button type="button" className="ap-btn is-danger" onClick={onDelete} disabled={busy}>
            <Trash size={13} weight="bold" /> {busy ? '삭제 중…' : '삭제 확정'}
          </button>
        </span>
      );
    }
    return (
      <span className="ap-actions">
        <button type="button" className="ap-btn is-ghost" onClick={onEdit}><PencilSimple size={13} weight="bold" /> 수정</button>
        <button type="button" className="ap-btn is-ghost" style={{ color: '#e11d48' }} onClick={() => setConfirmDelete({ kind, id })}>
          <Trash size={13} weight="bold" /> 삭제
        </button>
      </span>
    );
  };

  return (
    <div className="ap-page">
      <AdminHero
        eyebrow="CUSTOMER CENTER" icon={<Sparkle size={11} weight="fill" />}
        title="고객센터 관리"
        description="사이트에 보이는 공지사항과 자주하는 질문을 등록·수정합니다."
        accentRgb="236, 72, 153"
        actions={<>
          <div className="ap-jump">
            <a href="#cs-notices"><Megaphone size={13} weight="bold" /> 공지사항</a>
            <a href="#cs-faqs"><Question size={13} weight="bold" /> 자주하는 질문</a>
          </div>
          <HeroButton onClick={refreshAll} disabled={isLoadingAny}>
            <ArrowClockwise size={15} weight="bold" className={isLoadingAny ? 'ap-spin' : ''} /> 새로고침
          </HeroButton>
        </>}
      >
        <div className="ap-kpis">
          <KpiCard icon={<Megaphone size={18} weight="duotone" />} label="등록된 공지사항" toneRgb="249, 168, 212" loading={isNoticeLoading}
            value={<>{notices.length.toLocaleString()}<small>건</small></>}
            foot={`이번 달 등록 ${noticesThisMonth.toLocaleString()}건`} />
          <KpiCard icon={<CalendarBlank size={18} weight="duotone" />} label="최근 공지" toneRgb="253, 186, 116" loading={isNoticeLoading}
            value={latestNotice ? safeDate(latestNotice.createdAt) : '-'}
            foot={latestNotice ? latestNotice.title : '아직 공지가 없습니다'} />
          <KpiCard icon={<Question size={18} weight="duotone" />} label="자주하는 질문" toneRgb="147, 197, 253" loading={isFaqLoading}
            value={<>{faqs.length.toLocaleString()}<small>건</small></>}
            foot="고객문의 › 자주하는 질문에 그대로 보입니다" />
          <KpiCard icon={<PencilSimple size={18} weight="duotone" />} label="최근 질문 수정" toneRgb="110, 231, 183" loading={isFaqLoading}
            value={latestFaqUpdate ? safeDate(latestFaqUpdate.updatedAt) : '-'}
            foot={latestFaqUpdate ? latestFaqUpdate.question : '아직 질문이 없습니다'} />
        </div>
      </AdminHero>

      {/* ============ 📢 공지사항 ============ */}
      <section className="ap-panel cs-panel is-notice" id="cs-notices">
        <div className="cs-head">
          <span className="cs-head-icon"><Megaphone size={20} weight="duotone" /></span>
          <div className="cs-head-text">
            <strong>공지사항</strong>
            <span>사이트 공지사항 화면에 바로 보입니다 · 등록과 수정을 같은 입력칸에서 합니다</span>
          </div>
          <div className="cs-head-stats">
            <span className="cs-stat"><b>{notices.length.toLocaleString()}</b><small>전체</small></span>
            <span className="cs-stat"><b>{noticesThisMonth.toLocaleString()}</b><small>이번 달</small></span>
          </div>
        </div>

        <div ref={noticeFormRef} className={`cs-composer ${editingNoticeId !== null ? 'is-editing' : ''}`}>
          <div className="cs-composer-head">
            <span className="cs-composer-icon">
              {editingNoticeId !== null ? <PencilSimple size={15} weight="bold" /> : <Plus size={15} weight="bold" />}
            </span>
            <span className="cs-composer-title">
              <strong>{editingNoticeId !== null ? '공지 수정' : '새 공지 작성'}</strong>
              <span>{editingNoticeId !== null ? '수정한 내용은 저장하면 바로 반영됩니다' : '제목과 내용을 입력하고 등록하세요'}</span>
            </span>
            {editingNoticeId !== null && <span className="cs-editing-pill"><span className="cs-dot" /> 수정 중</span>}
          </div>
          <div className="cs-composer-body">
            <label className="cs-field">
              <span className="cs-field-label">제목 <em>{noticeForm.title.length}/200</em></span>
              <input className="cs-input" type="text" value={noticeForm.title} maxLength={200}
                onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                placeholder="공지 제목을 입력하세요" />
            </label>
            <label className="cs-field">
              <span className="cs-field-label">내용 <em>{noticeForm.content.length.toLocaleString()}자</em></span>
              <textarea className="cs-textarea" rows={6} value={noticeForm.content}
                onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                placeholder="공지 내용을 입력하세요" />
            </label>
          </div>
          <div className="cs-composer-foot">
            <span className="cs-foot-hint"><Info size={13} weight="bold" /> 제목은 200자까지 입력할 수 있습니다</span>
            <div className="cs-foot-actions">
              {editingNoticeId !== null && (
                <button type="button" className="cs-btn is-ghost" onClick={resetNoticeForm}>취소</button>
              )}
              <button type="button" className="cs-btn is-primary" onClick={handleNoticeSubmit}
                disabled={isNoticeSaving || !noticeForm.title.trim() || !noticeForm.content.trim()}>
                <FloppyDisk size={15} weight="bold" /> {isNoticeSaving ? '저장 중…' : editingNoticeId !== null ? '수정 저장' : '공지 등록'}
              </button>
            </div>
          </div>
        </div>

        <div className="ap-toolbar">
          <div className="ap-toolbar-left">
            <SearchField value={noticeSearch} onChange={setNoticeSearch} placeholder="제목 또는 내용 검색" />
          </div>
          <div className="ap-toolbar-right">
            <span className="ap-count">{noticeSearch ? '검색 결과' : '전체'} <b>{renderedNotices.length.toLocaleString()}</b>건</span>
          </div>
        </div>

        <div className="ap-table-wrap ap-mcards" ref={noticeTable.wrapRef} style={{ maxHeight: 460 }}>
          <table className={`admin-table-resizable ${noticeTable.tableClassName}`} style={noticeTable.tableStyle}>
            <FitColGroup table={noticeTable} />
            <thead>
              <tr className="admin-table-head-row">
                <FitTh table={noticeTable} columnKey="title">제목</FitTh>
                <FitTh table={noticeTable} columnKey="content">내용</FitTh>
                <FitTh table={noticeTable} columnKey="date">등록일</FitTh>
                <FitTh table={noticeTable} columnKey="manage">관리</FitTh>
              </tr>
            </thead>
            <tbody>
              {isNoticeLoading ? (
                <SkeletonRows columns={NOTICE_COLUMNS} rows={4} pinnedKey="manage" />
              ) : renderedNotices.length === 0 ? (
                <EmptyRow colSpan={NOTICE_COLUMNS.length} icon={<Megaphone size={24} weight="duotone" />}
                  title={noticeSearch ? '검색 결과가 없습니다' : '등록된 공지사항이 없습니다'}
                  description={noticeSearch ? '다른 단어로 검색해 보세요.' : '위 입력칸에서 첫 공지를 등록해 주세요.'} />
              ) : renderedNotices.map((notice) => (
                <tr key={notice.id} className={`admin-table-body-row aft-row ${editingNoticeId === notice.id ? 'is-editing' : ''}`}>
                  <td className="ap-td is-left ap-m-title" title={notice.title}><span className="ap-strong">{notice.title}</span></td>
                  <td className="ap-td is-left ap-m-long" data-label="내용" title={notice.content}>{notice.content}</td>
                  <td className="ap-td" data-label="등록일"><span className="ap-strong ap-tabnum">{safeDate(notice.createdAt)}</span></td>
                  <td className={noticeTable.pinnedCellClass('manage', 'ap-td ap-m-actions')}>
                    {renderRowActions({ kind: 'notice', id: notice.id, busy: deletingNoticeId === notice.id,
                      onEdit: () => startEditingNotice(notice), onDelete: () => handleDeleteNotice(notice) })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============ ❓ 자주하는 질문 ============ */}
      <section className="ap-panel cs-panel is-faq" id="cs-faqs">
        <div className="cs-head">
          <span className="cs-head-icon"><Question size={20} weight="duotone" /></span>
          <div className="cs-head-text">
            <strong>자주하는 질문</strong>
            <span>고객문의 › 자주하는 질문 화면에 그대로 보입니다</span>
          </div>
          <div className="cs-head-stats">
            <span className="cs-stat"><b>{faqs.length.toLocaleString()}</b><small>전체</small></span>
            <span className="cs-stat"><b>{latestFaqUpdate ? safeDate(latestFaqUpdate.updatedAt) : '-'}</b><small>최근 수정</small></span>
          </div>
        </div>

        <div ref={faqFormRef} className={`cs-composer ${editingFaqId !== null ? 'is-editing' : ''}`}>
          <div className="cs-composer-head">
            <span className="cs-composer-icon">
              {editingFaqId !== null ? <PencilSimple size={15} weight="bold" /> : <Plus size={15} weight="bold" />}
            </span>
            <span className="cs-composer-title">
              <strong>{editingFaqId !== null ? '질문 수정' : '새 질문 작성'}</strong>
              <span>{editingFaqId !== null ? '수정한 내용은 저장하면 바로 반영됩니다' : '고객이 자주 묻는 질문과 답변을 입력하세요'}</span>
            </span>
            {editingFaqId !== null && <span className="cs-editing-pill"><span className="cs-dot" /> 수정 중</span>}
          </div>
          <div className="cs-composer-body">
            <label className="cs-field">
              <span className="cs-field-label"><span className="cs-qa is-q">Q</span>질문</span>
              <input className="cs-input" type="text" value={faqForm.question}
                onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                placeholder="예) 배송비는 어떻게 계산되나요?" />
            </label>
            <label className="cs-field">
              <span className="cs-field-label"><span className="cs-qa is-a">A</span>답변 <em>{faqForm.answer.length.toLocaleString()}자</em></span>
              <textarea className="cs-textarea" rows={5} value={faqForm.answer}
                onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                placeholder="고객에게 보여줄 답변을 입력하세요" />
            </label>
          </div>
          <div className="cs-composer-foot">
            <span className="cs-foot-hint"><Info size={13} weight="bold" /> 질문은 짧고 분명하게 쓰면 찾기 쉽습니다</span>
            <div className="cs-foot-actions">
              {editingFaqId !== null && (
                <button type="button" className="cs-btn is-ghost" onClick={resetFaqForm}>취소</button>
              )}
              <button type="button" className="cs-btn is-primary" onClick={handleFaqSubmit}
                disabled={isFaqSaving || !faqForm.question.trim() || !faqForm.answer.trim()}>
                <FloppyDisk size={15} weight="bold" /> {isFaqSaving ? '저장 중…' : editingFaqId !== null ? '수정 저장' : '질문 등록'}
              </button>
            </div>
          </div>
        </div>

        <div className="ap-toolbar">
          <div className="ap-toolbar-left">
            <SearchField value={faqSearch} onChange={setFaqSearch} placeholder="질문 또는 답변 검색" />
          </div>
          <div className="ap-toolbar-right">
            <span className="ap-count">{faqSearch ? '검색 결과' : '전체'} <b>{renderedFaqs.length.toLocaleString()}</b>건</span>
          </div>
        </div>

        <div className="ap-table-wrap ap-mcards" ref={faqTable.wrapRef} style={{ maxHeight: 520 }}>
          <table className={`admin-table-resizable ${faqTable.tableClassName}`} style={faqTable.tableStyle}>
            <FitColGroup table={faqTable} />
            <thead>
              <tr className="admin-table-head-row">
                <FitTh table={faqTable} columnKey="question">질문</FitTh>
                <FitTh table={faqTable} columnKey="answer">답변</FitTh>
                <FitTh table={faqTable} columnKey="manage">관리</FitTh>
              </tr>
            </thead>
            <tbody>
              {isFaqLoading ? (
                <SkeletonRows columns={FAQ_COLUMNS} rows={4} pinnedKey="manage" />
              ) : renderedFaqs.length === 0 ? (
                <EmptyRow colSpan={FAQ_COLUMNS.length} icon={<Question size={24} weight="duotone" />}
                  title={faqSearch ? '검색 결과가 없습니다' : '등록된 질문이 없습니다'}
                  description={faqSearch ? '다른 단어로 검색해 보세요.' : '위 입력칸에서 첫 질문을 등록해 주세요.'} />
              ) : renderedFaqs.map((faq, idx) => (
                <tr key={faq.id} className={`admin-table-body-row aft-row ${editingFaqId === faq.id ? 'is-editing' : ''}`}>
                  <td className="ap-td is-left ap-m-title" title={faq.question}>
                    <span className="ap-strong cs-q-cell"><span className="cs-q-no">Q{idx + 1}</span>{faq.question}</span>
                  </td>
                  <td className="ap-td is-left ap-m-long" data-label="답변" title={faq.answer}>{faq.answer}</td>
                  <td className={faqTable.pinnedCellClass('manage', 'ap-td ap-m-actions')}>
                    {renderRowActions({ kind: 'faq', id: faq.id, busy: deletingFaqId === faq.id,
                      onEdit: () => startEditingFaq(faq), onDelete: () => handleDeleteFaq(faq) })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ap-help" style={{ margin: '14px 0 0' }}>
          <Info size={15} weight="bold" />
          <span>삭제한 공지와 질문은 되돌릴 수 없습니다. <strong>삭제</strong>를 누른 뒤 <strong>삭제 확정</strong>을 한 번 더 눌러야 지워집니다.</span>
        </div>
      </section>

      <ToastStack toasts={toasts} />
    </div>
  );
}
