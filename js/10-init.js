// ══════════════════════════════════════
// INIT
//
// v209 ES Modules パイロット (案 β) stage 2: `<script type="module">` 化。
// `window.addEventListener('load', ...)` の load handler は module 評価時に登録される。
// 暗黙 defer のため、全 classic script の後・全 module 評価後・load 発火直前という
// 確実なタイミングで登録される。HTML onclick の `checkAppVersion(true)` のため window 公開。
//
// v224 ES Modules stage 3: 12-auth.initAuth を import 化。
// v225: 06-map-leaflet.initMap を import 化。
// ══════════════════════════════════════
import { initAuth } from './12-auth.js';
import { initMap } from './06-map-leaflet.js';
import { updateDateFilterUI } from './05-supabase-data.js';

// ══════════════════════════════════════════════
// iOS: input フォーカス時の自動ズーム抑止 (v449)
// iOS Safari は font-size < 16px の input にフォーカスすると画面全体を勝手にズームする。
// viewport に maximum-scale=1 を付けると抑止でき、iOS はアクセシビリティ方針で
// ピンチズーム自体は殺さない。Android では pinch zoom が無効化されるため iOS のみ付与。
// iPadOS 13+ は UA が Macintosh を名乗るため maxTouchPoints で判別。
// ══════════════════════════════════════════════
(function preventIOSInputZoom() {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  if (!isIOS) return;
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp && !/maximum-scale/.test(vp.content)) vp.content += ', maximum-scale=1.0';
})();
// ══════════════════════════════════════════════
// アプリ・バージョンバッジ
// 動作中SWの CACHE_VERSION と GitHub Pages 上の最新 sw.js を比較
// ══════════════════════════════════════════════
async function checkAppVersion(forceReload) {
  const badge = document.getElementById('app-ver-badge');
  if (!badge) return;
  // v450 iOS Phase B: ネイティブ (Capacitor) は SW 非使用 + 更新は App Store 経由なので
  // PWA 更新バッジという概念自体が無い。非表示にして終了
  if (window.Capacitor) { badge.style.display = 'none'; return; }
  const setState = (cls, text, title) => {
    badge.className = 'app-ver-badge ' + cls;
    badge.textContent = text;
    badge.title = title || '';
  };
  if (forceReload === true) setState('checking', '⏳ 再確認', '最新版を確認中…');

  // 1. 動作中SWのCACHE_VERSIONを問い合わせ
  let runningVer = null;
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      runningVer = await new Promise(resolve => {
        const ch = new MessageChannel();
        const timer = setTimeout(() => resolve(null), 2000);
        ch.port1.onmessage = e => { clearTimeout(timer); resolve(e.data && e.data.version || null); };
        navigator.serviceWorker.controller.postMessage({type: 'CACHE_VERSION'}, [ch.port2]);
      });
    }
  } catch(e) {}

  // 2. 最新の sw.js をネットワーク直接取得
  let latestVer = null;
  try {
    const res = await fetch('./sw.js?cb=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      const txt = await res.text();
      const m = txt.match(/CACHE_VERSION\s*=\s*['"](v\d+)['"]/);
      if (m) latestVer = m[1];
    }
  } catch(e) {}

  // 3. 比較して表示
  if (!runningVer && !latestVer) {
    setState('unknown', '⚠️ 不明', 'バージョン取得に失敗（オフライン？）クリックで再確認');
    badge.onclick = () => checkAppVersion(true);
  } else if (!runningVer && latestVer) {
    setState('checking', `${latestVer} ⚪`, `最新: ${latestVer}（SW未起動・初回ロード中）`);
    badge.onclick = () => checkAppVersion(true);
  } else if (runningVer && !latestVer) {
    setState('unknown', `${runningVer} ?`, `動作中: ${runningVer} / 最新版の取得に失敗`);
    badge.onclick = () => checkAppVersion(true);
  } else if (runningVer === latestVer) {
    setState('ok', `${runningVer} 🟢`, `最新版で動作中 (${runningVer})\nクリックで再確認`);
    badge.onclick = () => checkAppVersion(true);
  } else {
    setState('stale', `${runningVer}→${latestVer} 🔄`, `新版あり: ${runningVer} → ${latestVer}\nクリックで更新+リロード`);
    badge.onclick = async () => {
      setState('checking', '🔄 更新中…', '');
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
          if (reg.waiting) reg.waiting.postMessage({type: 'SKIP_WAITING'});
        }
      } catch(e) {}
      // SW更新後でも確実に最新HTMLを取りに行く
      setTimeout(() => location.reload(), 400);
    };
  }
}

window.addEventListener('load',()=>{
  initMap();
  initAuth();
  updateDateFilterUI();
  if (typeof updateStopTypeFilterUI === 'function') updateStopTypeFilterUI();
  // キャラ表示ボタンの初期状態を localStorage に合わせる
  const charBtn = document.getElementById('char-fab');
  if (charBtn) charBtn.classList.toggle('on', NORIRECO.data.charModeOn);
  // v450 iOS Phase B: Capacitor (capacitor:// スキーム) では SW を登録しない。
  // アセットはアプリ同梱 + WKWebView のカスタムスキームで SW が不安定なため
  if('serviceWorker'in navigator && !window.Capacitor) {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
    // 新SWがアクティベートされたらバッジ更新
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      setTimeout(checkAppVersion, 300);
    });
  }
  // 初回チェック (SW登録完了を少し待つ)
  setTimeout(checkAppVersion, 800);
  // 5分ごとに自動再チェック
  setInterval(checkAppVersion, 5 * 60 * 1000);
});

// v209 stage 2: HTML onclick `checkAppVersion(true)` 用 window bridge
window.checkAppVersion = checkAppVersion;