// 乗レコ Service Worker v1.0
// キャッシュ戦略: Cache First（オフラインでも動作）

const CACHE_NAME = 'norireco-v1';
const STATIC_ASSETS = [
  './noritetsu-log.html',
  './noritetsu-map.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// ── Install: 静的アセットをキャッシュ ──
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching static assets');
      // アイコンは存在しない場合があるので個別にtry
      return cache.addAll(
        STATIC_ASSETS.filter(url => !url.endsWith('.png'))
      ).then(() => {
        STATIC_ASSETS.filter(url => url.endsWith('.png')).forEach(url => {
          cache.add(url).catch(() => console.log('[SW] Icon not found, skipping:', url));
        });
      });
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: 古いキャッシュを削除 ──
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: キャッシュ優先、なければネットワーク ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Googleフォントなど外部リソースはネットワーク優先
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // フォントはキャッシュする
          if (url.hostname.includes('fonts.')) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 自アセットはキャッシュ優先
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // 成功したレスポンスをキャッシュに追加
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// ── Background Sync: オフライン中のNotion保存をキュー ──
self.addEventListener('sync', event => {
  if (event.tag === 'notion-save') {
    event.waitUntil(syncNotionData());
  }
});

async function syncNotionData() {
  // IndexedDBからペンディング記録を取得して送信
  console.log('[SW] Background sync: Notion data');
  // TODO: Phase 2でバックエンドと連携
}

// ── Push通知（Phase 2用・準備のみ）──
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '乗レコ';
  const options = {
    body: data.body || '新しい通知があります',
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: data.url || './',
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || './')
  );
});
