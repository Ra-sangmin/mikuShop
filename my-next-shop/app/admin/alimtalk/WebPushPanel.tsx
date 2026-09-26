"use client";

// 🔔 관리자 웹 푸시 패널 — "이 기기에서 알림 받기"
//
// 카카오톡 "나에게 보내기"는 휴대폰 알림이 울리지 않아, 브라우저 알림(웹 푸시)을 함께 씁니다.
// 기기(휴대폰·PC)마다 한 번 "알림 받기"를 누르면, 처리할 주문이 생길 때 잠금 화면에 알림이 뜹니다.
//   · 안드로이드/PC : 크롬·엣지에서 바로 가능
//   · 아이폰       : 사파리 → 공유 → "홈 화면에 추가" → 홈 화면 아이콘으로 열어야 가능 (iOS 16.4+)
// 발송: 30초마다 도는 크론(app/api/cron/admin-order-alert) → lib/notifications/webPush.ts
import { useCallback, useEffect, useState } from 'react';
import { BellSimpleRinging, DeviceMobile, PaperPlaneTilt, Trash, WarningCircle, Export } from '@phosphor-icons/react';
import { fmtDateTime } from '../components/AdminPremiumKit';

const SW_URL = '/miku-admin-sw.js';
const SW_SCOPE = '/admin/';

type Device = {
  id: number;
  endpoint: string;
  label: string | null;
  adminId: string | null;
  createdAt: string;
  lastSentAt: string | null;
  lastError: string | null;
  failCount: number;
};

/** 이 브라우저의 상태 */
type Support =
  | 'checking'
  | 'ok'
  | 'ios-need-install' // 아이폰 사파리 — 홈 화면에 추가해야 함
  | 'unsupported';

function detectSupport(): Support {
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const hasApis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (isIos && !standalone) return 'ios-need-install';
  return hasApis ? 'ok' : 'unsupported';
}

/** 목록에서 알아보기 쉬운 기기 이름 */
function deviceLabel(): string {
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua) ? 'iPhone'
    : /iPad/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1) ? 'iPad'
    : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows PC'
    : /Macintosh/.test(ua) ? 'Mac'
    : '기기';
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /SamsungBrowser/.test(ua) ? '삼성 인터넷'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : '브라우저';
  return `${os} · ${browser}`;
}

/** VAPID 공개키(base64url) → 브라우저가 받는 형식 */
function keyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function WebPushPanel({ onToast }: { onToast: (kind: 'success' | 'error', message: string) => void }) {
  const [support, setSupport] = useState<Support>('checking');
  const [configured, setConfigured] = useState(true);
  const [publicKey, setPublicKey] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [myEndpoint, setMyEndpoint] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | 'unknown'>('unknown');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/push', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setConfigured(Boolean(data.configured));
        setPublicKey(data.publicKey || '');
        setDevices(data.devices || []);
      }
    } catch { /* 보조 정보라 조용히 넘어갑니다 */ }
  }, []);

  // 이 브라우저가 이미 구독 중인지 확인
  const checkThisDevice = useCallback(async () => {
    const s = detectSupport();
    setSupport(s);
    if (s !== 'ok') return;
    setPermission(Notification.permission);
    const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
    const sub = await reg?.pushManager.getSubscription();
    setMyEndpoint(sub?.endpoint ?? null);
  }, []);

  useEffect(() => {
    void load();
    void checkThisDevice();
  }, [load, checkThisDevice]);

  const registered = Boolean(myEndpoint && devices.some(d => d.endpoint === myEndpoint));

  const subscribe = async () => {
    if (!publicKey) return onToast('error', '서버에 VAPID 키가 없습니다.');
    setBusy(true);
    try {
      // ⚠️ 권한 요청은 버튼을 누른 그 순간에 해야 합니다(특히 아이폰).
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        onToast('error', '알림 권한이 허용되지 않았습니다. 브라우저 설정에서 이 사이트의 알림을 허용해 주세요.');
        return;
      }
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
      await navigator.serviceWorker.ready;
      // 예전 키로 구독돼 있으면 새로 구독해야 하므로 먼저 정리합니다.
      const old = await reg.pushManager.getSubscription();
      if (old) await old.unsubscribe().catch(() => {});
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) });

      const res = await fetch('/api/admin/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), label: deviceLabel() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || '등록하지 못했습니다.');

      setMyEndpoint(sub.endpoint);
      await load();
      onToast('success', '이 기기에서 알림을 받습니다. "테스트 알림"으로 확인해 보세요.');
    } catch (e) {
      onToast('error', (e as Error).message || '알림 등록에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const unsubscribeThis = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
      const sub = await reg?.pushManager.getSubscription();
      const endpoint = sub?.endpoint ?? myEndpoint;
      await sub?.unsubscribe().catch(() => {});
      if (endpoint) {
        await fetch('/api/admin/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      }
      setMyEndpoint(null);
      await load();
      onToast('success', '이 기기의 알림을 껐습니다.');
    } finally {
      setBusy(false);
    }
  };

  const removeDevice = async (d: Device) => {
    const res = await fetch('/api/admin/push', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: d.id }),
    });
    if (res.ok) {
      if (d.endpoint === myEndpoint) setMyEndpoint(null);
      await load();
      onToast('success', `${d.label || '기기'} 를 목록에서 뺐습니다.`);
    } else {
      onToast('error', '삭제하지 못했습니다.');
    }
  };

  const sendTest = async (endpoint?: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(endpoint ? { endpoint } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (data.sent) onToast('success', `테스트 알림을 보냈습니다 (${data.sentCount}대). 잠시 뒤 알림이 뜨는지 확인해 주세요.`);
      else onToast('error', data.skipped || `보내지 못했습니다 (실패 ${data.failed ?? 0}대, 정리 ${data.removed ?? 0}대).`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ap-panel">
      <div className="ap-sec-head">
        <span className="ap-section-title"><BellSimpleRinging size={16} weight="bold" /> 관리자 웹 푸시 알림</span>
        <span className="ap-section-hint">휴대폰 잠금 화면에 바로 · 무료 · 앱 설치 없음</span>
      </div>

      <div className="wpp-body">
        <p className="wpp-desc">
          처리할 주문이 생기면 <strong>30초 안에</strong> 이 기기로 알림이 옵니다. 알림을 누르면 주문 관리 화면이 열립니다.
          휴대폰·PC 등 <strong>받을 기기마다 한 번씩</strong> 등록해 주세요.
        </p>

        {!configured && (
          <div className="ap-help atk-help-warn">
            <WarningCircle size={15} weight="bold" />
            <span>서버 .env 에 <strong>VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY</strong> 가 없습니다. <code>node scripts/generate-vapid-keys.mjs</code> 로 만들어 넣어 주세요.</span>
          </div>
        )}

        {/* 이 기기 */}
        <div className="wpp-this">
          <span className={`wpp-dot ${registered ? 'is-on' : ''}`} />
          <strong>이 기기</strong>
          <span className="wpp-sub">
            {support === 'checking' ? '확인 중…'
              : support === 'ios-need-install' ? '홈 화면에 추가한 뒤 그 아이콘으로 열어 주세요'
              : support === 'unsupported' ? '이 브라우저는 웹 푸시를 지원하지 않습니다'
              : permission === 'denied' ? '알림이 차단되어 있습니다'
              : registered ? '알림 받는 중' : '알림 받지 않음'}
          </span>
        </div>

        {support === 'ios-need-install' && (
          <div className="ap-help">
            <Export size={15} weight="bold" />
            <span>
              아이폰은 사파리 아래쪽 <strong>공유 버튼 → &ldquo;홈 화면에 추가&rdquo;</strong> 후, 홈 화면의
              <strong> 미쿠짱 관리</strong> 아이콘으로 열어야 알림을 받을 수 있습니다. (iOS 16.4 이상)
              홈 화면 앱은 사파리와 로그인이 따로라 한 번 더 로그인해 주세요.
            </span>
          </div>
        )}
        {support === 'ok' && permission === 'denied' && (
          <div className="ap-help atk-help-warn">
            <WarningCircle size={15} weight="bold" />
            <span>브라우저에서 이 사이트의 알림이 <strong>차단</strong>되어 있습니다. 주소창 왼쪽 자물쇠(사이트 설정) → 알림 → 허용으로 바꾼 뒤 다시 눌러 주세요.</span>
          </div>
        )}

        {support === 'ok' && (
          <div className="wpp-actions">
            {registered ? (
              <>
                <button type="button" className="ap-btn is-success" disabled={busy} onClick={() => sendTest(myEndpoint ?? undefined)}>
                  <PaperPlaneTilt size={14} weight="bold" /> 이 기기로 테스트 알림
                </button>
                <button type="button" className="ap-btn" disabled={busy} onClick={unsubscribeThis}>이 기기 알림 끄기</button>
              </>
            ) : (
              <button type="button" className="ap-btn is-success" disabled={busy || !configured} onClick={subscribe}>
                <DeviceMobile size={14} weight="bold" /> 이 기기에서 알림 받기
              </button>
            )}
          </div>
        )}

        {/* 등록된 기기 */}
        <div className="wpp-list">
          <div className="wpp-list-head">
            <span>알림 받는 기기 {devices.length}대</span>
            {devices.length > 0 && (
              <button type="button" className="ap-btn is-ghost" disabled={busy} onClick={() => sendTest()}>
                <PaperPlaneTilt size={13} weight="bold" /> 전체 테스트
              </button>
            )}
          </div>
          {devices.length === 0 ? (
            <p className="wpp-empty">아직 등록된 기기가 없습니다.</p>
          ) : (
            <ul>
              {devices.map(d => (
                <li key={d.id} className={d.endpoint === myEndpoint ? 'is-me' : ''}>
                  <div className="wpp-dev-main">
                    <strong>{d.label || '기기'}{d.endpoint === myEndpoint && <em>이 기기</em>}</strong>
                    <span>
                      등록 {fmtDateTime(d.createdAt)} · 마지막 발송 {d.lastSentAt ? fmtDateTime(d.lastSentAt) : '없음'}
                      {d.adminId ? ` · ${d.adminId}` : ''}
                    </span>
                    {d.lastError && <span className="wpp-err">최근 실패({d.failCount}회): {d.lastError}</span>}
                  </div>
                  <button type="button" className="wpp-del" title="목록에서 빼기" onClick={() => removeDevice(d)}>
                    <Trash size={15} weight="bold" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <style jsx global>{`
        .wpp-body { display: flex; flex-direction: column; gap: 14px; padding: 4px 2px 2px; }
        .wpp-desc { margin: 0; font-size: 13.5px; line-height: 1.6; color: #475569; word-break: keep-all; }
        .wpp-desc strong { color: #1e293b; }
        .wpp-this { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 14px; }
        .wpp-dot { width: 9px; height: 9px; border-radius: 50%; background: #cbd5e1; flex-shrink: 0; }
        .wpp-dot.is-on { background: #22c55e; box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.15); }
        .wpp-sub { font-size: 12.5px; color: #94a3b8; font-weight: 600; }
        .wpp-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .wpp-actions .ap-btn, .wpp-list-head .ap-btn { display: inline-flex; align-items: center; gap: 6px; }
        .wpp-list { border: 1px solid #eef2f7; border-radius: 14px; overflow: hidden; }
        .wpp-list-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 14px; background: #f8fafc; font-size: 12.5px; font-weight: 800; color: #475569; }
        .wpp-list ul { list-style: none; margin: 0; padding: 0; }
        .wpp-list li { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-top: 1px solid #eef2f7; }
        .wpp-list li.is-me { background: #f0fdf4; }
        .wpp-dev-main { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
        .wpp-dev-main strong { font-size: 13.5px; color: #1e293b; display: flex; align-items: center; gap: 6px; }
        .wpp-dev-main em { font-style: normal; font-size: 11px; font-weight: 800; color: #059669; background: #dcfce7; padding: 1px 7px; border-radius: 999px; }
        .wpp-dev-main span { font-size: 12px; color: #64748b; font-variant-numeric: tabular-nums; }
        .wpp-dev-main .wpp-err { color: #e11d48; word-break: break-all; }
        .wpp-del { border: 0; background: transparent; color: #94a3b8; padding: 6px; border-radius: 8px; cursor: pointer; }
        .wpp-del:hover { background: #fff1f2; color: #e11d48; }
        .wpp-empty { margin: 0; padding: 14px; font-size: 13px; color: #94a3b8; }
      `}</style>
    </section>
  );
}
