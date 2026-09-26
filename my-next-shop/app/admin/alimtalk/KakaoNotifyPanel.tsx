"use client";

// 🔔 관리자 카카오 알림 ("나에게 보내기") 연결 패널
//
// 주문이 "관리자 처리 필요" 상태로 넘어오면 관리자 본인 카카오톡의
// "나와의 채팅"으로 알림이 옵니다. 무료이고 템플릿 검수도 없습니다.
// 발송은 5분마다 도는 크론이 맡습니다. (app/api/cron/admin-order-alert)
import { useCallback, useEffect, useState } from 'react';
import { BellRinging, Check, Copy, WarningCircle, LinkSimple, LinkBreak } from '@phosphor-icons/react';
import { fmtDateTime } from '../components/AdminPremiumKit';

type Connection = {
  enabled: boolean;
  kakaoUserId: string;
  connectedAt: string;
  lastSentAt: string | null;
  lastError: string | null;
  notifiedUntil: string;
};

export default function KakaoNotifyPanel({ onToast }: { onToast: (kind: 'success' | 'error', message: string) => void }) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [redirectUri, setRedirectUri] = useState('');
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/kakao-notify', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setConnection(data.connection ?? null);
        setRedirectUri(data.redirectUri || '');
        setConfigured(Boolean(data.configured));
      }
    } catch {
      /* 보조 정보라 조용히 넘어갑니다 */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // 🔗 카카오에서 돌아오면 주소에 결과가 실려 옵니다. 한 번 보여 주고 주소는 정리합니다.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ok = params.get('kakaoConnected');
    const err = params.get('kakaoError');
    if (!ok && !err) return;
    onToast(ok ? 'success' : 'error', ok || err || '');
    window.history.replaceState({}, '', window.location.pathname);
  }, [onToast]);

  const toggle = async (enabled: boolean) => {
    const res = await fetch('/api/admin/kakao-notify', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (res.ok) {
      setConnection(prev => (prev ? { ...prev, enabled } : prev));
      onToast('success', enabled ? '카카오 알림을 다시 켰습니다.' : '카카오 알림을 껐습니다.');
    } else {
      onToast('error', '설정을 바꾸지 못했습니다.');
    }
  };

  const disconnect = async () => {
    const res = await fetch('/api/admin/kakao-notify', { method: 'DELETE' });
    if (res.ok) {
      setConnection(null);
      onToast('success', '연결을 해제했습니다.');
    } else {
      onToast('error', '연결을 해제하지 못했습니다.');
    }
  };

  const copyRedirect = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      onToast('error', '복사하지 못했습니다. 주소를 직접 선택해 복사해 주세요.');
    }
  };

  return (
    <section className="ap-panel">
      <div className="ap-sec-head">
        <span className="ap-section-title"><BellRinging size={16} weight="bold" /> 관리자 카카오 알림</span>
        <span className="ap-section-hint">처리할 주문이 생기면 내 카카오톡으로 · 무료</span>
      </div>

      <div className="knp-body">
        {loading ? (
          <p className="knp-desc">불러오는 중…</p>
        ) : !configured ? (
          <div className="ap-help atk-help-warn">
            <WarningCircle size={15} weight="bold" />
            <span><strong>KAKAO_CLIENT_ID</strong> 가 없어 사용할 수 없습니다. 서버 .env 를 확인해 주세요.</span>
          </div>
        ) : connection ? (
          <>
            <div className="knp-status">
              <span className={`knp-dot ${connection.enabled ? 'is-on' : ''}`} />
              <strong>{connection.enabled ? '연결됨 · 알림 켜짐' : '연결됨 · 알림 꺼짐'}</strong>
              <span className="knp-sub">카카오 회원번호 {connection.kakaoUserId}</span>
            </div>

            <dl className="knp-info">
              <dt>연결한 때</dt><dd>{fmtDateTime(connection.connectedAt)}</dd>
              <dt>마지막 발송</dt><dd>{connection.lastSentAt ? fmtDateTime(connection.lastSentAt) : '아직 없음'}</dd>
              <dt>여기까지 알림</dt><dd>{fmtDateTime(connection.notifiedUntil)}</dd>
            </dl>

            {connection.lastError && (
              <div className="ap-help atk-help-warn">
                <WarningCircle size={15} weight="bold" />
                <span>
                  마지막 발송이 실패했습니다: <strong>{connection.lastError}</strong>
                  {' '}— 두 달 넘게 알림이 없었다면 연결이 만료된 것입니다. <strong>다시 연결</strong>해 주세요.
                </span>
              </div>
            )}

            <div className="knp-actions">
              <button type="button" className="ap-btn" onClick={() => toggle(!connection.enabled)}>
                {connection.enabled ? '알림 끄기' : '알림 켜기'}
              </button>
              <a className="ap-btn" href="/api/admin/kakao-notify/connect">다시 연결</a>
              <button type="button" className="ap-btn is-danger" onClick={disconnect}>
                <LinkBreak size={14} weight="bold" /> 연결 해제
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="knp-desc">
              아직 연결되지 않았습니다. 연결하면 <strong>경매 상황 · 경매/구매 실패 · 상품 결제 완료 · 입고 대기중 ·
              배송 준비중 · 배송비 결제 완료</strong> 로 넘어온 주문을 <strong>5분마다 모아 한 통</strong>으로 알려 줍니다.
            </p>
            <div className="knp-actions">
              <a className="ap-btn is-success" href="/api/admin/kakao-notify/connect">
                <LinkSimple size={14} weight="bold" /> 카카오 계정 연결하기
              </a>
            </div>
            <div className="ap-help">
              <span>
                연결이 막히면 카카오 개발자 콘솔에서 두 가지를 확인해 주세요 —
                <strong> 카카오 로그인 &gt; 동의항목 &gt; 카카오톡 메시지 전송(talk_message)</strong> 켜기,
                그리고 <strong>Redirect URI</strong> 에 아래 주소 등록하기.
              </span>
            </div>
            {redirectUri && (
              <button type="button" className="knp-uri" onClick={copyRedirect} title="눌러서 복사">
                <code>{redirectUri}</code>
                {copied ? <Check size={13} weight="bold" /> : <Copy size={13} weight="bold" />}
              </button>
            )}
          </>
        )}
      </div>

      <style jsx global>{`
        .knp-body { display: flex; flex-direction: column; gap: 14px; padding: 4px 2px 2px; }
        .knp-desc { margin: 0; font-size: 13.5px; line-height: 1.6; color: #475569; word-break: keep-all; }
        .knp-desc strong { color: #1e293b; }
        .knp-status { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 14px; }
        .knp-dot { width: 9px; height: 9px; border-radius: 50%; background: #cbd5e1; flex-shrink: 0; }
        .knp-dot.is-on { background: #22c55e; box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.15); }
        .knp-sub { font-size: 12.5px; color: #94a3b8; font-weight: 600; }
        .knp-info { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; margin: 0; font-size: 13px; }
        .knp-info dt { color: #64748b; font-weight: 700; }
        .knp-info dd { margin: 0; color: #1e293b; font-weight: 600; font-variant-numeric: tabular-nums; }
        .knp-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .knp-actions .ap-btn { display: inline-flex; align-items: center; gap: 6px; text-decoration: none; }
        .knp-uri {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 10px 14px; border: 1px dashed #cbd5e1; border-radius: 12px;
          background: #f8fafc; cursor: pointer; text-align: left; width: 100%;
        }
        .knp-uri:hover { border-color: #94a3b8; }
        .knp-uri code { font-size: 12.5px; color: #334155; word-break: break-all; }
      `}</style>
    </section>
  );
}
