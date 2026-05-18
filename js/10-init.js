// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
// ══════════════════════════════════════════════
// アプリ・バージョンバッジ
// 動作中SWの CACHE_VERSION と GitHub Pages 上の最新 sw.js を比較
// ══════════════════════════════════════════════
async function checkAppVersion(forceReload) {
  const badge = document.getElementById('app-ver-badge');
  if (!badge) return;
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
  if (typeof initAuth === 'function') initAuth();
  if (typeof updateDateFilterUI === 'function') updateDateFilterUI();
  if (typeof updateMapDisplayModeUI === 'function') updateMapDisplayModeUI();
  if (typeof updateStopTypeFilterUI === 'function') updateStopTypeFilterUI();
  // キャラ表示ボタンの初期状態を localStorage に合わせる
  const charBtn = document.getElementById('char-fab');
  if (charBtn) charBtn.classList.toggle('on', charModeOn);
  if('serviceWorker'in navigator) {
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