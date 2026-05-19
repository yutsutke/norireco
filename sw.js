// 乗レコ Service Worker v2.0
// キャッシュ戦略:
//   - HTML/JSON: Network-First (常に最新を優先、オフライン時のみキャッシュ)
//   - 画像/CSS/CDN: Cache-First with Stale-While-Revalidate
//   - CACHE_NAME を変更すると古いキャッシュが破棄されて新版が確実に反映される
//
// HTML/JSON更新時の手順:
//   1. このファイルの CACHE_VERSION を上げる (例: 'v15' → 'v16')
//   2. GitHubにpush
//   3. ユーザーがハードリロード or アプリ再起動で更新が反映される

const CACHE_VERSION = 'v217';
const CACHE_NAME = `norireco-${CACHE_VERSION}`;

// 起動時にプリキャッシュする静的アセット
const STATIC_ASSETS = [
  './noritetsu-log.html',
  './noritetsu-map.html',
  './js/01-constants.js',
  './js/02-data-loaders.js',
  './js/02b-service-lines-builder.js',
  './js/03-characters.js',
  './js/04-gps-location.js',
  './js/04b-ride-record.js',
  './js/05-supabase-data.js',
  './js/06-map-leaflet.js',
  './js/07-record-mode.js',
  './js/08-rendering.js',
  './js/09-tabs-stats.js',
  './js/10-init.js',
  './js/11-fraud-detection.js',
  './js/12-auth.js',
  './js/13-mypage-common.js',
  './js/13a-stats.js',
  './js/13b-trips.js',
  './js/13c-lines.js',
  './lines-p1.json',
  './lines-p2.json',
  './lines-p3.json',
  './lines-p4.json',
  './running_services.json',
  './merged_stations.json',
  './service_lines_master.json',
  './characters_master.json',
  './trains_master.json',
  './characters/kuwaten.svg',
  './characters/youmayu.svg',
  './characters/yomatsuri-mayu.svg',
  './characters/r-plane.svg',
  './characters/tachi-hanabi.svg',
  './characters/tachi-yuki.svg',
  './characters/komiyau.svg',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon.svg',
];

// HTML/JSON/JS は Network-First (オンライン時は常に最新)
const NETWORK_FIRST_PATTERNS = [
  /\.html$/,
  /\.json$/,
  /\.js$/,
];

// ── Install ──
self.addEventListener('install', event => {
  console.log(`[SW] Installing ${CACHE_NAME}...`);
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // 失敗してもインストールは続行 (個別try)
      return Promise.all(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => {
            console.warn(`[SW] Failed to cache ${url}:`, err.message);
          })
        )
      );
    }).then(() => {
      console.log('[SW] Install complete, skipWaiting');
      return self.skipWaiting();  // 新SWを即座にアクティベート
    })
  );
});

// ── Activate: 旧バージョンのキャッシュを削除 ──
self.addEventListener('activate', event => {
  console.log(`[SW] Activating ${CACHE_NAME}...`);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('norireco-') && key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      console.log('[SW] Activation complete, clients claimed');
      return self.clients.claim();  // 既存タブも新SWで動かす
    })
  );
});

// ── Fetch: パターンに応じて戦略切替 ──
self.addEventListener('fetch', event => {
  // GET 以外はキャッシュ戦略の対象外
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isOwnOrigin = url.origin === location.origin;
  const isHTMLorJSON = NETWORK_FIRST_PATTERNS.some(p => p.test(url.pathname));

  // Supabase API へのリクエストは触らない (常にネットワーク直結)
  if (url.hostname.endsWith('.supabase.co')) {
    return;  // SWを通さない
  }

  if (isOwnOrigin && isHTMLorJSON) {
    // 自オリジンのHTML/JSON: Network-First
    event.respondWith(networkFirst(event.request));
  } else if (isOwnOrigin) {
    // 自オリジンの画像など: Cache-First with stale-while-revalidate
    event.respondWith(cacheFirstSWR(event.request));
  } else {
    // 外部CDN (国土地理院タイル, Google Fonts等): Cache-First with SWR
    event.respondWith(cacheFirstSWR(event.request));
  }
});

// Network-First: ネットワーク優先、失敗したらキャッシュ
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      // clone は同期的に行う (await を挟むと body が消費される可能性)
      const respClone = response.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(request, respClone).catch(() => {});
      });
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) {
      console.log('[SW] Network failed, serving from cache:', request.url);
      return cached;
    }
    throw e;
  }
}

// Cache-First with Stale-While-Revalidate: キャッシュ即返、裏で更新
async function cacheFirstSWR(request) {
  const cached = await caches.match(request);
  const fetchAndUpdate = fetch(request).then(response => {
    if (response.ok) {
      // clone は同期的に行う (caches.open の Promise resolve 後だと body 消費済み)
      const respClone = response.clone();
      caches.open(CACHE_NAME).then(c => c.put(request, respClone).catch(() => {}));
    }
    return response;
  }).catch(err => {
    if (cached) return cached;
    throw err;
  });
  return cached || fetchAndUpdate;
}

// ── Background Sync (将来用) ──
self.addEventListener('sync', event => {
  if (event.tag === 'norireco-sync') {
    event.waitUntil(syncPendingTrips());
  }
});

async function syncPendingTrips() {
  console.log('[SW] Background sync: pending trips');
  // TODO: IndexedDB から保留中の乗車記録を Supabase に送信
}

// ── メッセージ受信 (アプリからの SW 制御) ──
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CACHE_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_VERSION });
  }
});

// ── Push通知 (Phase 2用) ──
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
  event.waitUntil(clients.openWindow(event.notification.data || './'));
});
