"use client";

import React, { useState, useRef, useEffect } from 'react';

// ==========================================
// 🎨 1. 설정 및 스타일 객체 (디자인 영역)
// ==========================================

const PLATFORMS = [
  { value: 'yahoo_auction', label: '야후 옥션' },
  { value: 'yahoo_shopping', label: '야후 쇼핑' },
  { value: 'rakuten', label: '라쿠텐' },
  { value: 'mercari', label: '메루카리' },
  { value: 'amazon', label: '아마존' }
];

const colors = {
  white: '#fff',
  border: '#f1f5f9',
  textMain: '#0f172a',
  textSub: '#64748b',
};

const mixins = {
  flexBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,
};

// Developer Styles (devs)
const devs: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  // 매크로 상단 컨트롤 영역
  macroCard: {
    ...mixins.flexBetween,
    backgroundColor: colors.white,
    padding: '16px 24px',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    border: `1px solid ${colors.border}`,
  },
  macroBrand: {
    fontSize: '18px',
    fontWeight: '700',
    color: colors.textMain,
  },
  platformSelect: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#ec4899',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    appearance: 'auto',
    paddingRight: '4px',
  },
  // 통계 뱃지 스타일
  statBadgeTotal: {
    padding: '4px 8px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#475569',
    fontWeight: '600',
  },
  statBadgePending: {
    padding: '4px 8px',
    backgroundColor: '#fff1f2',
    border: '1px solid #fecdd3',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#e11d48',
    fontWeight: '700',
  },
  // 버튼 스타일
  btnMacroStop: {
    padding: '8px 16px',
    backgroundColor: '#94a3b8',
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
  },
  btnMacroStart: {
    padding: '8px 16px',
    backgroundColor: '#ec4899',
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
  },
  macroStatusText: {
    fontSize: '13px',
    color: colors.textSub,
    minWidth: '250px',
  },
  // 로그 패널 영역
  contentWrapper: {
    backgroundColor: colors.white,
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    border: `1px solid ${colors.border}`,
    padding: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 0 16px 0',
    color: colors.textMain,
  },
  logContainer: {
    backgroundColor: '#f8fafc',
    padding: '16px',
    borderRadius: '8px',
    border: `1px solid #e2e8f0`,
    fontSize: '13px',
    maxHeight: '500px',
    overflowY: 'auto',
  },
};


// ==========================================
// 🧠 2. 메인 컴포넌트 (로직 및 렌더링 영역)
// ==========================================

export default function DeveloperPage() {
  // --- 상태 관리 (State) ---
  const [targetPlatform, setTargetPlatform] = useState(PLATFORMS[0].value);
  const [stats, setStats] = useState({ totalCount: 0, pendingCount: 0 });
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const isAutoRunningRef = useRef(false);
  const [log, setLog] = useState<string[]>([]);
  
  // --- 공통 함수 ---
  const addLog = (msg: string) => setLog(prev => [msg, ...prev].slice(0, 100));

  const fetchTargetAndStats = async () => {
    const res = await fetch(`/api/admin/categories/auto-crawl?platform=${targetPlatform.toUpperCase()}`);
    return await res.json();
  };

  // --- 생명주기 (Effects) ---
  useEffect(() => {
    const init = async () => {
      const data = await fetchTargetAndStats();
      if (data.success) {
        setStats({ totalCount: data.totalCount, pendingCount: data.pendingCount });
      }
    };
    init();
  }, [targetPlatform]);

  // --- 주요 액션 핸들러 ---
  const startAutoCrawl = async () => {
    if (isAutoRunning) return;
    setIsAutoRunning(true);
    isAutoRunningRef.current = true; 
    
    const platformLabel = PLATFORMS.find(p => p.value === targetPlatform)?.label;
    addLog(`🚀 [${platformLabel}] 자동 수집 매크로를 시작합니다...`);

    while (isAutoRunningRef.current) {
      try {
        const data = await fetchTargetAndStats();
        if (!isAutoRunningRef.current) break;
        
        if (data.success) {
          setStats({ totalCount: data.totalCount, pendingCount: data.pendingCount });
        }

        const { nextId, nextName } = data;
        if (!nextId && data.totalCount) {
          addLog(`✅ [${platformLabel}] 모든 카테고리 수집이 완료되었습니다!`);
          break;
        }

        const crawlRes = await fetch(`/api/admin/categories/${targetPlatform}?genreId=${nextId}`);
        const crawlResult = await crawlRes.json();

        if (!isAutoRunningRef.current) break;

        if (crawlResult.success) {
          let displayName = `${nextId}(${nextName})`;
          if (crawlResult.isLeaf) {
            addLog(`🍃 ${displayName}은(는) 최하위 카테고리입니다.`);
          } else {
            addLog(`📦 ${displayName} 완료! (신규 자식: ${crawlResult.data?.length || 0}개)`);
          }
        }

        if (!isAutoRunningRef.current) break;
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err) {
        addLog(`❌ 오류 발생: ${err}`);
        break;
      }
    }

    setIsAutoRunning(false);
    isAutoRunningRef.current = false;
    addLog("🛑 자동 수집이 중단되었습니다.");
  };

  const stopAutoCrawl = () => { 
    isAutoRunningRef.current = false; 
    setIsAutoRunning(false); 
  };

  // --- UI 렌더링 (JSX) ---
  return (
    <div style={devs.container}>
      <div style={devs.macroCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={devs.macroBrand}>Miku</span>
          
          <select
            value={targetPlatform}
            onChange={(e) => setTargetPlatform(e.target.value)}
            disabled={isAutoRunning}
            style={{
              ...devs.platformSelect,
              opacity: isAutoRunning ? 0.6 : 1,
              cursor: isAutoRunning ? 'not-allowed' : 'pointer'
            }}
          >
            {PLATFORMS.map(p => (
              <option key={p.value} value={p.value} style={{ color: '#0f172a', fontWeight: '500' }}>
                {p.value.toUpperCase()}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
            <span style={devs.statBadgeTotal}>전체: {stats.totalCount.toLocaleString()}</span>
            <span style={devs.statBadgePending}>수집 대기: {stats.pendingCount.toLocaleString()}</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {isAutoRunning ? (
            <button onClick={stopAutoCrawl} style={devs.btnMacroStop}>🤖 중지</button>
          ) : (
            <button onClick={startAutoCrawl} style={devs.btnMacroStart}>🤖 수집 시작</button>
          )}
          <div style={devs.macroStatusText}>{log.length > 0 ? log[0] : '대기 중...'}</div>
        </div>
      </div>

      <div style={devs.contentWrapper}>
        <h2 style={devs.sectionTitle}>매크로 로그 내역 (최대 100줄)</h2>
        <div style={devs.logContainer}>
          {log.length === 0 && <span style={{ color: '#94a3b8' }}>기록된 로그가 없습니다.</span>}
          {log.map((msg, idx) => (
            <div key={idx} style={{ 
              color: idx === 0 ? '#334155' : '#94a3b8', 
              marginBottom: '8px',
              fontWeight: idx === 0 ? '600' : '400',
              lineHeight: '1.4'
            }}>{msg}</div>
          ))}
        </div>
      </div>
    </div>
  );
}