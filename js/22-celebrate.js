// ══════════════════════════════════════════════════════════════
// 22-celebrate.js — 一括記録の達成演出 (v444 / 活性化強化)
//
// 目的: 「初回の塗れた感動」を作る。一括記録の保存直後に「全国○%完乗！」の
//   リザルトを全画面オーバーレイで祝い、そのままシェア (原則④) へ誘導する。
//   活性化ファネルの ③「初回の塗れた感動」を受け身の統計 → 能動的な瞬間に変える。
//
// 入口: 21-bulk-record.js saveBulkDrafts() 末尾から
//   window.NORIRECO.celebrate.showBulkResult({ before, savedCount, totalStations, isGuest })。
//
// 設計:
//   - app モジュールを import しない。完乗率は 13a の computeCompletionStats、
//     シェアは 14 の openShareModal を **window ブリッジ経由**で再利用する (循環 import 回避)。
//   - DOM/CSS は自前で 1 度だけ注入 (HTML 側に container を持たない、14-share-ogp の ensureModal 流儀)。
//   - オーバーレイは body 直下に append + position:fixed/inset:0 (v433 の「.content 内 fixed」罠を回避)。
//   - before スナップショットは呼び元 (21) が _mypageCache 変異前に取得して渡す。
//     after は呼ばれた時点の _mypageCache から自分で再計算し、差分 (今回塗った駅/系統・新規完乗) を出す。
// ══════════════════════════════════════════════════════════════

window.NORIRECO = window.NORIRECO || {};
const NS = window.NORIRECO;

// 完乗済み系統 id の集合を stats.slSet (sl.id → 乗車駅 id Set) から導出
function _completedLineIds(stats) {
  const ids = new Set();
  const SL = (NS.data && NS.data.SERVICE_LINES) || [];
  const slSet = (stats && stats.slSet) || {};
  for (const sl of SL) {
    const r = slSet[sl.id] ? slSet[sl.id].size : 0;
    if (r > 0 && sl.stations.length > 0 && r === sl.stations.length) ids.add(sl.id);
  }
  return ids;
}

function _lineName(id) {
  const SL = (NS.data && NS.data.SERVICE_LINES) || [];
  const sl = SL.find(x => x.id === id);
  return sl ? (sl.name || sl.id) : id;
}

// <style> を 1 度だけ注入
function _ensureStyle() {
  if (document.getElementById('celebrate-style')) return;
  const s = document.createElement('style');
  s.id = 'celebrate-style';
  s.textContent = `
  .celebrate-overlay{position:fixed;inset:0;z-index:5000;display:none;align-items:center;justify-content:center;
    background:rgba(3,8,15,.82);backdrop-filter:blur(3px);padding:20px;box-sizing:border-box;}
  .celebrate-overlay.open{display:flex;animation:celebFade .25s ease;}
  @keyframes celebFade{from{opacity:0;}to{opacity:1;}}
  .celebrate-card{position:relative;width:100%;max-width:380px;text-align:center;box-sizing:border-box;
    background:linear-gradient(160deg,#0d2236,#0a1828);border:1.5px solid var(--gold);border-radius:16px;
    padding:26px 22px 20px;box-shadow:0 18px 60px rgba(0,0,0,.6);animation:celebPop .3s cubic-bezier(.2,1.2,.4,1);}
  @keyframes celebPop{from{transform:scale(.9);opacity:0;}to{transform:scale(1);opacity:1;}}
  .celebrate-emoji{font-size:46px;line-height:1;margin-bottom:6px;}
  .celebrate-head{font-size:15px;font-weight:800;color:var(--gold);margin-bottom:14px;letter-spacing:.02em;}
  .celebrate-pct{font-size:54px;font-weight:900;color:var(--white);line-height:1;margin-bottom:2px;}
  .celebrate-pct span{font-size:24px;font-weight:800;color:var(--gold);margin-left:2px;}
  .celebrate-pctlabel{font-size:12px;color:var(--silver);margin-bottom:16px;}
  .celebrate-stats{display:flex;justify-content:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;}
  .celebrate-chip{background:rgba(95,181,255,.12);border:1px solid rgba(95,181,255,.3);border-radius:999px;
    padding:5px 12px;font-size:12px;font-weight:700;color:#cfe6ff;}
  .celebrate-complete{background:rgba(242,169,0,.1);border:1px solid rgba(242,169,0,.35);border-radius:10px;
    padding:9px 12px;margin-bottom:14px;font-size:12px;color:var(--gold);line-height:1.55;text-align:left;}
  .celebrate-complete b{color:var(--white);}
  .celebrate-actions{display:flex;flex-direction:column;gap:9px;}
  .celebrate-share{padding:13px;background:var(--gold);color:#06121f;border:none;border-radius:10px;
    font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;}
  .celebrate-share:active{transform:scale(.98);}
  .celebrate-close{padding:11px;background:transparent;color:var(--silver);border:1px solid var(--track);
    border-radius:10px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;}
  .celebrate-guest{margin-top:12px;font-size:11px;color:var(--gold);line-height:1.5;}
  `;
  document.head.appendChild(s);
}

// 直近のリザルト stats (シェアボタンに渡す)
let _afterStats = null;

function _close() {
  const ov = document.getElementById('celebrate-overlay');
  if (ov) ov.classList.remove('open');
}

function _share() {
  _close();
  try {
    if (NS.share && NS.share.openShareModal) NS.share.openShareModal(_afterStats || {});
    else console.warn('[celebrate] share module not ready');
  } catch (e) { console.warn('[celebrate] share open failed:', e); }
}

// 一括保存後のリザルト演出を表示する。
// opts: { before: stats|null, savedCount: number, totalStations: number, isGuest: boolean }
export function showBulkResult(opts) {
  opts = opts || {};
  const trips = (NS.mypage && NS.mypage.state && NS.mypage.state._mypageCache) || [];
  const compute = NS.mypage && NS.mypage.computeCompletionStats;
  if (!compute) return; // 計算不能なら静かに何もしない (保存自体は完了済)
  const after = compute(trips);
  if (!after) return;
  _afterStats = after;

  const before = opts.before || null;
  const beforeRidden = before ? (before.ridden || before.uniqueRidden || 0) : 0;
  const isFirstPaint = beforeRidden === 0;
  const deltaStations = Math.max(0, (after.ridden || 0) - beforeRidden);
  const deltaLines = Math.max(0, (after.lines || 0) - (before ? (before.lines || 0) : 0));

  // 新規完乗系統 (before に無く after に有る)
  const beforeComplete = _completedLineIds(before);
  const afterComplete = _completedLineIds(after);
  const newlyComplete = [...afterComplete].filter(id => !beforeComplete.has(id));

  _ensureStyle();
  let ov = document.getElementById('celebrate-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'celebrate-overlay';
    ov.className = 'celebrate-overlay';
    ov.addEventListener('click', (e) => { if (e.target === ov) _close(); });
    document.body.appendChild(ov);
  }

  const emoji = isFirstPaint ? '🎉' : (newlyComplete.length ? '🏆' : '🚃');
  const head = isFirstPaint
    ? 'はじめてマップが塗れました！'
    : (newlyComplete.length ? '完乗達成！' : 'まとめて記録しました！');

  const chips = [];
  if (deltaStations > 0) chips.push(`<div class="celebrate-chip">+${deltaStations.toLocaleString()} 駅</div>`);
  if (deltaLines > 0) chips.push(`<div class="celebrate-chip">+${deltaLines} 系統</div>`);
  chips.push(`<div class="celebrate-chip">${(opts.savedCount || 0).toLocaleString()} 件記録</div>`);

  let completeHtml = '';
  if (newlyComplete.length) {
    const names = newlyComplete.slice(0, 4).map(_lineName);
    const extra = newlyComplete.length > 4 ? ` ほか ${newlyComplete.length - 4} 系統` : '';
    completeHtml = `<div class="celebrate-complete">🏆 <b>完乗達成</b>: ${names.join(' ・ ')}${extra}</div>`;
  }

  const guestHtml = opts.isGuest
    ? `<div class="celebrate-guest">⚠️ いまは端末内のみ保存中 — 🔑 ログインで記録を永久保存できます</div>`
    : '';

  // ヒーロー数字は「乗った駅数」(必ず非ゼロで達成感がある)。完駅率は補助表示。
  //   全国 9030 駅に対し初期ユーザーの % は四捨五入で 0% になり「おめでとう」と矛盾するため、
  //   ヒーローを駅数にし、% は 1% 未満のとき小数 1 桁で「0.2%」のように非ゼロで見せる。
  const ridden = after.ridden || 0;
  const totalU = after.totalUnique || 0;
  const pctNum = totalU > 0 ? (ridden / totalU * 100) : 0;
  const pctStr = pctNum >= 1 ? `${Math.round(pctNum)}%` : (pctNum > 0 ? `${pctNum.toFixed(1)}%` : '0%');
  ov.innerHTML = `
    <div class="celebrate-card">
      <div class="celebrate-emoji">${emoji}</div>
      <div class="celebrate-head">${head}</div>
      <div class="celebrate-pct">${ridden.toLocaleString()}<span>駅</span></div>
      <div class="celebrate-pctlabel">全国 ${totalU.toLocaleString()} 駅中 ・ 完駅率 ${pctStr}</div>
      <div class="celebrate-stats">${chips.join('')}</div>
      ${completeHtml}
      <div class="celebrate-actions">
        <button class="celebrate-share" id="celebrate-share-btn">📸 完乗マップをシェア</button>
        <button class="celebrate-close" id="celebrate-close-btn">地図を見る</button>
      </div>
      ${guestHtml}
    </div>
  `;
  ov.querySelector('#celebrate-share-btn').addEventListener('click', _share);
  ov.querySelector('#celebrate-close-btn').addEventListener('click', _close);
  ov.classList.add('open');
}

NS.celebrate = { showBulkResult };
