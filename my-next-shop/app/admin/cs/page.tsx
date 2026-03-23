"use client";

import { useState } from 'react';

// 가짜 문의 데이터
const dummyInquiries = [
  { id: 1, type: '배송문의', title: '언제쯤 도착하나요?', user: '김철수', date: '2026.02.25', status: '답변완료' },
  { id: 2, type: '결제문의', title: '입금 확인 부탁드립니다.', user: '이영희', date: '2026.02.26', status: '대기중' },
  { id: 3, type: '상품문의', title: '사이즈 재입고 문의', user: '박민수', date: '2026.02.26', status: '대기중' },
];

export default function CSManagement() {
  // 실제 서비스 시 API 연동용 State 자리
  const [inquiries] = useState(dummyInquiries);

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
        <div style={css.statCard}>
          <div>
            <div style={css.statTitle}>미답변 문의</div>
            <div style={{ ...css.statCount, color: colors.pendingText }}>{pendingCount}건</div>
          </div>
          <div style={css.statIcon}>💬</div>
        </div>
        <div style={css.statCard}>
          <div>
            <div style={css.statTitle}>오늘 들어온 문의</div>
            <div style={{ ...css.statCount, color: colors.accent }}>{todayCount}건</div>
          </div>
          <div style={css.statIcon}>🔔</div>
        </div>
      </div>

      {/* 🌟 테이블 영역 */}
      <div style={css.tableContainer}>
        <h2 style={css.sectionTitleMargin}>문의 목록</h2>
        
        <table style={css.table}>
          <thead>
            <tr style={css.tableHeadRow}>
              <th style={css.th}>분류</th>
              <th style={css.th}>제목</th>
              <th style={css.th}>작성자</th>
              <th style={css.th}>등록일</th>
              <th style={css.thCenter}>상태</th>
              <th style={css.thCenter}>관리</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map((inquiry) => {
              const statusStyle = getStatusStyle(inquiry.status);

              return (
                <tr key={inquiry.id} style={css.tableBodyRow}>
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

const mixins = {
  flexBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,
  
  titleFont: {
    fontSize: '18px',
    fontWeight: '700',
  } as React.CSSProperties,
};

const baseCard: React.CSSProperties = {
  backgroundColor: colors.white,
  borderRadius: '16px',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
  border: `1px solid ${colors.border}`,
  padding: '24px',
};

const baseTh: React.CSSProperties = { padding: '16px 12px' };
const baseTd: React.CSSProperties = { padding: '16px 12px' };

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
  statCard: {
    ...baseCard,
    ...mixins.flexBetween,
  },
  statTitle: {
    color: colors.textSub,
    fontSize: '15px',
    fontWeight: '500',
    marginBottom: '8px',
  },
  statCount: {
    fontSize: '28px',
    fontWeight: '700',
  },
  statIcon: {
    fontSize: '30px',
  },
  
  // 테이블 컨테이너
  tableContainer: {
    ...baseCard,
  },
  sectionTitleMargin: {
    ...mixins.titleFont,
    margin: '0 0 20px 0',
  },
  
  // 테이블 구조
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  tableHeadRow: {
    borderBottom: `2px solid ${colors.borderDark}`,
    color: colors.textSub,
    fontSize: '14px',
    backgroundColor: colors.bgHead,
  },
  tableBodyRow: {
    borderBottom: `1px solid ${colors.border}`,
    fontSize: '14px',
    color: colors.textDark,
  },
  
  // 테이블 셀
  th: { ...baseTh },
  thCenter: { ...baseTh, textAlign: 'center' },
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