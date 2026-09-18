"use client";
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import GuideLayout from '@/app/components/GuideLayout';
import '@/app/guide/guide-common.css';
import '@/app/mypage/mypage-premium.css';
import GuideFooterNotice from '@/app/guide/components/GuideFooterNotice';
import { Megaphone, MagnifyingGlass, X, CaretDown, ChatCircleDots, CaretLeft, CaretRight } from '@phosphor-icons/react';

interface Notice {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}

const PAGE_SIZE = 10;

/** 등록일 표기 (2026. 09. 18.) */
function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}.`;
}

/** 최근 7일 이내에 올라온 공지에는 NEW 뱃지를 붙입니다. */
function isNew(value: string) {
  const d = new Date(value).getTime();
  if (Number.isNaN(d)) return false;
  return Date.now() - d < 7 * 24 * 60 * 60 * 1000;
}

function NoticeListPage() {
  const searchParams = useSearchParams();
  // 🌟 메인 화면 공지 카드에서 /guide/notice?id=12 로 들어오면 그 공지를 펼친 채로 엽니다.
  const targetId = Number(searchParams.get('id')) || null;

  const [notices, setNotices] = useState<Notice[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [openId, setOpenId] = useState<number | null>(targetId);

  // 딥링크로 들어온 공지로 한 번만 스크롤하기 위한 표시
  const hasScrolledToTarget = useRef(false);
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const fetchNotices = useCallback(async (nextPage: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/notices?limit=${PAGE_SIZE}&page=${nextPage}`);
      const data = await res.json();
      if (data.success) {
        setNotices(data.notices);
        setTotal(data.total ?? data.notices.length);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (error) {
      console.error('공지사항 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotices(page); }, [fetchNotices, page]);

  // 🌟 딥링크로 들어온 공지가 목록에 있으면 해당 위치로 부드럽게 스크롤합니다.
  useEffect(() => {
    if (!targetId || hasScrolledToTarget.current || isLoading) return;
    const el = itemRefs.current[targetId];
    if (!el) return;
    hasScrolledToTarget.current = true;
    window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [targetId, isLoading, notices]);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return notices;
    return notices.filter(n => n.title.toLowerCase().includes(k) || n.content.toLowerCase().includes(k));
  }, [notices, keyword]);

  const latestDate = notices.length > 0 ? formatDate(notices[0].createdAt) : '-';

  const goPage = (next: number) => {
    if (next < 1 || next > totalPages || next === page) return;
    setPage(next);
    setOpenId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <GuideLayout title="공지사항" type="guide">
      <div className="guide-page-container miku-notice-page">
        {/* 🌟 요약 카드 — 다른 안내 화면과 같은 검은색 카드 */}
        <section className="mp-hero mp-anim" aria-label="공지사항 요약">
          <div className="mp-hero-main">
            <div className="mp-avatar" aria-hidden="true"><Megaphone size={30} weight="duotone" /></div>
            <div className="mp-hero-text">
              <span className="mp-eyebrow-dark">NOTICE</span>
              <h3 className="mp-hero-title">미쿠짱의 <em>새로운 소식</em>을 확인하세요</h3>
              <p className="mp-hero-desc">서비스 점검, 요금 변경, 휴무 일정 등 꼭 알아두셔야 할 내용을 안내해 드려요.</p>
            </div>
          </div>
          <div className="mp-hero-money">
            <span className="mp-hero-money-label"><ChatCircleDots size={14} weight="fill" /> 문의하기</span>
            <strong className="mp-hero-money-value">카카오톡 <small>실시간 상담</small></strong>
            <div className="mp-hero-money-actions">
              <Link href="/inquiry/kakaotalk" className="is-primary"><i className="fa fa-comment"></i> 카카오톡 문의</Link>
              <Link href="/inquiry/faq"><i className="fa fa-circle-question"></i> 자주하는 질문</Link>
            </div>
          </div>
          <div className="mp-hero-stats">
            <div className="mp-hero-stat"><span>전체 공지</span><strong>{total}<small>건</small></strong></div>
            <div className="mp-hero-stat"><span>최근 등록일</span><strong style={{ fontSize: '15px' }}>{latestDate}</strong></div>
            <Link href="/guide/terms" className="mp-hero-stat">
              <span>이용약관</span><strong style={{ fontSize: '16px' }}>보러가기 <i className="fa fa-arrow-right"></i></strong>
            </Link>
            <Link href="/guide/privacy" className="mp-hero-stat">
              <span>개인정보처리방침</span><strong style={{ fontSize: '16px' }}>보러가기 <i className="fa fa-arrow-right"></i></strong>
            </Link>
          </div>
        </section>

        {/* 🌟 제목 — 다른 안내 화면과 같은 구성 */}
        <div className="miku-notice-outer-header mp-anim d1">
          <span className="mp-eyebrow">Notice</span>
          <h2>공지사항 <span className="miku-notice-title-badge"><i className="fa fa-bullhorn"></i></span></h2>
        </div>

        <div className="guide-panel">
          <div className="gp-search">
            <span className="gp-search-icon"><MagnifyingGlass size={19} weight="bold" /></span>
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="공지 제목이나 내용을 검색해 보세요"
              aria-label="공지사항 검색"
            />
            {keyword && (
              <button type="button" className="gp-search-clear" onClick={() => setKeyword('')} aria-label="검색어 지우기">
                <X size={14} weight="bold" />
              </button>
            )}
          </div>

          <div className="gp-section-head">
            <div>
              <span className="gp-eyebrow">NOTICE</span>
              <h3 className="gp-section-title">등록된 공지</h3>
            </div>
            <span className="gp-chip is-neutral">
              {keyword ? `검색 결과 ${filtered.length}건` : `전체 ${total}건`}
            </span>
          </div>

          {isLoading ? (
            <div className="gp-empty">
              <strong>공지사항을 불러오는 중이에요</strong>
              <span>잠시만 기다려 주세요.</span>
            </div>
          ) : filtered.length > 0 ? (
            <div className="gp-faq-list">
              {filtered.map((notice) => {
                const isOpen = openId === notice.id;
                return (
                  <div
                    key={notice.id}
                    ref={(el) => { itemRefs.current[notice.id] = el; }}
                    className={`gp-faq nt-item ${isOpen ? 'is-open' : ''}`}
                  >
                    <button
                      type="button"
                      className="gp-faq-q nt-q"
                      aria-expanded={isOpen}
                      onClick={() => setOpenId(isOpen ? null : notice.id)}
                    >
                      <span className="gp-faq-mark nt-mark"><Megaphone size={15} weight="fill" /></span>
                      <span className="gp-faq-q-text nt-q-text">
                        {notice.title}
                        {isNew(notice.createdAt) && <span className="nt-new">NEW</span>}
                      </span>
                      <span className="nt-date">{formatDate(notice.createdAt)}</span>
                      <span className="gp-faq-toggle"><CaretDown size={15} weight="bold" /></span>
                    </button>
                    {isOpen && (
                      <div className="gp-faq-a nt-a">
                        {/* 관리자에서 입력한 줄바꿈을 그대로 보여줍니다 */}
                        <p className="nt-body">{notice.content}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="gp-empty">
              <strong>{keyword ? '검색 결과가 없어요' : '등록된 공지사항이 없어요'}</strong>
              <span>{keyword ? '다른 단어로 검색해 보세요.' : '새로운 소식이 올라오면 이곳에서 알려드릴게요.'}</span>
            </div>
          )}

          {/* 🌟 페이지 이동 (검색 중에는 현재 쪽 안에서만 걸러 보여주므로 숨깁니다) */}
          {!keyword && totalPages > 1 && (
            <nav className="nt-pager" aria-label="공지사항 페이지 이동">
              <button type="button" onClick={() => goPage(page - 1)} disabled={page <= 1} aria-label="이전 페이지">
                <CaretLeft size={14} weight="bold" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  type="button"
                  className={n === page ? 'is-current' : ''}
                  aria-current={n === page ? 'page' : undefined}
                  onClick={() => goPage(n)}
                >
                  {n}
                </button>
              ))}
              <button type="button" onClick={() => goPage(page + 1)} disabled={page >= totalPages} aria-label="다음 페이지">
                <CaretRight size={14} weight="bold" />
              </button>
            </nav>
          )}

          <div style={{ marginTop: '28px' }}>
            <GuideFooterNotice>
              공지 내용 중 궁금한 점이 있으신가요?<br />
              <span className="footer-info-link">카카오톡 채널</span>로 문의하시면 빠르게 안내해 드려요.
            </GuideFooterNotice>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .miku-notice-page .mp-hero { margin-bottom: 24px; }
        .miku-notice-page .mp-avatar svg { color: #ffffff; }
        .miku-notice-page .mp-hero-money-label svg { color: #f3b7bc; }
        .miku-notice-outer-header { margin-bottom: 24px; }
        .miku-notice-outer-header h2 {
          font-size: 22px; font-weight: 900; color: #0f172a; margin: 0;
          display: flex; align-items: center; gap: 10px;
        }
        .miku-notice-title-badge {
          width: 30px; height: 30px; border-radius: 10px; flex-shrink: 0; color: #fff;
          display: inline-flex; align-items: center; justify-content: center; font-size: 13px;
          background: linear-gradient(135deg, var(--mp-from) 0%, var(--mp-to) 100%);
          box-shadow: 0 6px 14px -6px var(--mp-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        /* 🌟 공지 한 줄 — 자주하는 질문(.gp-faq)을 그대로 쓰되 등록일과 뱃지를 더합니다. */
        .miku-notice-page .nt-q { gap: 12px; }
        .miku-notice-page .nt-mark {
          background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
          color: #fff; display: inline-flex; align-items: center; justify-content: center;
        }
        .miku-notice-page .nt-q-text {
          display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;
        }
        .miku-notice-page .nt-new {
          flex-shrink: 0; font-size: 10px; font-weight: 900; letter-spacing: 0.04em;
          color: #b45309; background: #fef3c7; border: 1px solid #fde68a;
          border-radius: 999px; padding: 2px 7px; line-height: 1.4;
        }
        .miku-notice-page .nt-date {
          flex-shrink: 0; font-size: 12.5px; font-weight: 700; color: #94a3b8;
          font-variant-numeric: tabular-nums;
        }
        .miku-notice-page .nt-body {
          margin: 0; white-space: pre-wrap; word-break: break-word;
          font-size: 14.5px; line-height: 1.75; color: #334155;
        }

        /* 🌟 페이지 이동 */
        .miku-notice-page .nt-pager {
          display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 26px;
        }
        .miku-notice-page .nt-pager button {
          min-width: 34px; height: 34px; padding: 0 10px; border-radius: 9px;
          border: 1px solid #e2e8f0; background: #fff; color: #475569;
          font-size: 13px; font-weight: 700; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
          transition: background .15s ease, color .15s ease, border-color .15s ease;
        }
        .miku-notice-page .nt-pager button:hover:not(:disabled):not(.is-current) {
          background: #f8fafc; border-color: #cbd5e1;
        }
        .miku-notice-page .nt-pager button.is-current {
          background: linear-gradient(135deg, var(--mp-from) 0%, var(--mp-to) 100%);
          border-color: transparent; color: #fff;
          box-shadow: 0 6px 14px -8px var(--mp-shadow);
        }
        .miku-notice-page .nt-pager button:disabled { opacity: .4; cursor: not-allowed; }

        @media (max-width: 640px) {
          .miku-notice-page .nt-date { display: none; }
        }
      `}</style>
    </GuideLayout>
  );
}

export default function GuideNoticePage() {
  return (
    <Suspense fallback={<div style={{ padding: '100px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>공지사항을 불러오는 중입니다...</div>}>
      <NoticeListPage />
    </Suspense>
  );
}
