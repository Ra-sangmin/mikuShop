// 🔔 미쿠짱 관리자 웹 푸시 서비스 워커
//
// 서버(lib/notifications/webPush.ts)가 보낸 알림을 받아 화면에 띄우고,
// 알림을 누르면 관리자 화면을 엽니다. 관리자 화면(/admin/…)에서만 등록됩니다.
//
// ⚠️ 파일 이름이 /admin 으로 시작하면 proxy.ts 의 관리자 로그인 검사에 걸리므로
//    일부러 miku-admin-sw.js 로 두었습니다.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || '미쿠짱 관리자 알림';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/miku-admin-icon-192.png',
      tag: data.tag || 'miku-admin',
      renotify: true, // 같은 tag 로 바뀌어도 다시 소리·진동
      data: { url: data.url || '/admin/orders' },
    }),
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/admin/orders', self.location.origin).href;
  event.waitUntil((async () => {
    // 이미 열린 관리자 창이 있으면 그 창으로, 없으면 새로 엽니다.
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(`${self.location.origin}/admin`)) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target).catch(() => {});
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});

// 브라우저가 구독을 갱신하면 서버 목록도 새 구독으로 바꿉니다. (관리자 로그인 쿠키가 살아 있을 때)
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil((async () => {
    const old = event.oldSubscription;
    const next = event.newSubscription
      || (old && old.options ? await self.registration.pushManager.subscribe(old.options).catch(() => null) : null);
    if (!next) return;
    await fetch('/api/admin/push', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: next.toJSON(), label: '자동 갱신된 기기' }),
    }).catch(() => {});
    if (old) {
      await fetch('/api/admin/push', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: old.endpoint }),
      }).catch(() => {});
    }
  })());
});
