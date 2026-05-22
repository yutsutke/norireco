// ══════════════════════════════════════════════════════════════
// マイページ 共通レイヤー (v190 分割)
// - window.NORIRECO 名前空間の初期化
// - 共通状態 (MP._mypageCache / MP.mpActiveSection / MP.mpTripFilter)
// - エントリ (renderMypage) / サブタブ切替 (switchMpSection / applyMpSection)
// - バナー (renderMpTimeMachineBanner) / トースト (showMypageToast)
// - 3 タブ共有ヘルパー (tripCardHtml / _MP_SORT_COMPARATORS / formatDelayMin / isTimeMachineActive)
//
// 13a-stats.js / 13b-trips.js / 13c-lines.js は本ファイルに依存する。
// 新規・移動分の関数は NORIRECO.mypage.xxx にも公開 (v127 const grid 二重宣言事故の構造的予防)。
//
// v207 ES Modules パイロット (案 β) stage 2: 13-mypage-common を本ファイルも含めて
// 全 4 ファイル module 化。13a/13b/13c (既に module) と 05/09 (classic) からの bare
// 参照を支えるため、末尾で applyMpSection / showMypageToast / tripCardHtml /
// isTimeMachineActive / _MP_SORT_COMPARATORS の window bridge を明示追加。
//
// v223 ES Modules stage 3: 11-fraud-detection を import 化。
// v224: 12-auth から currentUserId / authBearerToken を import 化。
// ══════════════════════════════════════════════════════════════
import { fraudIsDowngraded } from './11-fraud-detection.js';
import { currentUserId, authBearerToken } from './12-auth.js';
import { renderList } from './09-tabs-stats.js';
import { filterTripsByDate } from './05-supabase-data.js';

// ── NORIRECO 名前空間の初期化 ──────────────────────────────────
window.NORIRECO = window.NORIRECO || {};
NORIRECO.mypage = NORIRECO.mypage || {};

// v185: delay_minutes (整数) を「N時間M分」「N分」「N時間」形式に整形。
// 0 or null は空文字。
function formatDelayMin(min) {
  const n = (typeof min === 'number') ? min : parseInt(min, 10);
  if (!n || n <= 0) return '';
  if (n < 60) return `${n}分`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}
window.formatDelayMin = formatDelayMin;
NORIRECO.mypage.formatDelayMin = formatDelayMin;

// v201 ES Modules パイロット (案 β) stage 1 最終 — mypage state を NORIRECO.mypage.state に集約。
// 案 β stage 1 全 7 ドメイン完了 (auth/map/record/gps/trains/data/mypage、累計 46 state)。
NORIRECO.mypage.state = NORIRECO.mypage.state || {
  _mypageCache: null,            // 取得した自分の trip[]
  mpActiveSection: 'stats',      // 'stats' | 'trips' | 'lines' | 'memos'
  mpTripFilter: {
    auth: 'all',     // all | verified | manual | suspicious
    period: 'all',   // all | thisYear | lastYear | custom (日付フィルタは _tripDateFilter と独立)
    category: 'all', // all | shinkansen | limited_express | ...
    sort: 'date_desc', // v182: 旅程タブの並び替え (date_desc/asc, stations_desc, minutes_desc, recorded_desc, delay_desc)
  },
};
const MP = NORIRECO.mypage.state;

export async function renderMypage() {
  const c = document.getElementById('mypage-content');
  if (!c) return;
  c.innerHTML = '';

  const uid = currentUserId();
  if (!uid) {
    showAllSubpanes(false);
    c.innerHTML = `
      <div class="mp-empty">
        <div class="mp-empty-ic">🔑</div>
        <div class="mp-empty-t">ログインしてください</div>
        <div class="mp-empty-s">マイページではあなたの旅程・GPS 記録 完乗率・GPS 後追い認証が使えます</div>
        <button class="mp-empty-btn" onclick="openAuthModal()">🔑 ログイン / 会員登録</button>
      </div>`;
    return;
  }

  // 1. コンパクトユーザーヘッダ + 常時表示の完乗率カード + サブタブ nav
  const email = (NORIRECO.auth.currentUser && NORIRECO.auth.currentUser.email) || '(メール非公開)';
  const initial = (email[0] || '?').toUpperCase();
  c.innerHTML = `
    <div class="mp-header-compact">
      <div class="mp-avatar-sm">${initial}</div>
      <div class="mp-userinfo-sm">
        <div class="mp-username-sm">${email.split('@')[0]}</div>
        <div class="mp-uid-sm">${email}</div>
      </div>
      <button class="mp-logout-btn-sm" onclick="if(confirm('ログアウトしますか?'))signOutUser()">×</button>
    </div>
    <div id="mp-completion-pinned"></div>
    <div class="mp-subtab-nav">
      <button class="mp-subtab" data-sec="stats" onclick="switchMpSection('stats')">📊 統計</button>
      <button class="mp-subtab" data-sec="trips" onclick="switchMpSection('trips')">🚃 旅程</button>
      <button class="mp-subtab" data-sec="lines" onclick="switchMpSection('lines')">📋 路線</button>
      <button class="mp-subtab" data-sec="memos" onclick="switchMpSection('memos')">📸 メモ</button>
    </div>
  `;

  // 完乗率カード placeholder (NORIRECO.data.SERVICE_LINES と trips を並列取得しながらスケルトン表示)
  const pinned = document.getElementById('mp-completion-pinned');
  if (pinned) pinned.innerHTML = `<div class="mp-loading" style="padding:14px">📊 完乗率を計算中…</div>`;

  // 並列: NORIRECO.data.SERVICE_LINES 構築 + Supabase から自分の trip 取得
  let trips = [];
  try {
    const [_, tripsRes] = await Promise.all([
      ((window.NORIRECO && NORIRECO.serviceLines) ? NORIRECO.serviceLines.build() : Promise.resolve()),
      fetch(`${SUPABASE_URL}/rest/v1/norireco_trips?user_id=eq.${uid}&select=*&order=recorded_at.desc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authBearerToken()}` }
      }),
    ]);
    if (tripsRes.ok) trips = await tripsRes.json();
  } catch (e) {
    console.warn('[マイページ] 取得エラー:', e.message);
  }

  // v183: Supabase スキーマ未拡張のフィールド (notes / delay_minutes) を
  // localStorage から id ベースで merge して補完する。
  // v181 で tripForSupabase() により notes/delay_minutes は Supabase に送らない
  // ため、Supabase からの再取得時にこれらが欠落する。スキーマ拡張後に撤去。
  try {
    const localTrips = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
    if (Array.isArray(localTrips) && localTrips.length > 0) {
      const localById = new Map(localTrips.map(t => [t.id, t]));
      trips = trips.map(t => {
        const lt = localById.get(t.id);
        if (!lt) return t;
        // Supabase 由来の値を優先しつつ、欠落フィールドだけ localStorage で補完
        const merged = { ...t };
        if (merged.notes == null && lt.notes != null) merged.notes = lt.notes;
        if (merged.delay_minutes == null && lt.delay_minutes != null) merged.delay_minutes = lt.delay_minutes;
        return merged;
      });
    }
  } catch (e) {
    console.warn('[マイページ] localStorage merge エラー:', e.message);
  }

  MP._mypageCache = trips;

  // グローバル過去モード (_tripDateFilter) が有効ならバナー表示
  renderMpTimeMachineBanner();

  // 常時表示の完乗率カードを描画 (グローバル date filter を適用)
  if (pinned) {
    pinned.innerHTML = '';
    if (Array.isArray(NORIRECO.data.SERVICE_LINES) && NORIRECO.data.SERVICE_LINES.length > 0) {
      const tripsForCards = filterTripsByDate(trips);
      pinned.appendChild(NORIRECO.mypage.buildCompletionCards(tripsForCards));
    } else {
      pinned.innerHTML = `<div class="mp-empty-s" style="padding:14px">⚠ 営業系統マスターの読込に失敗しました</div>`;
    }
  }

  applyMpSection();
}
// v225 stage 3: renderMypage は `export` 経由に移行。NORIRECO 名前空間登録は互換のため残置。
NORIRECO.mypage.renderMypage = renderMypage;

// 期間フィルタが有効ならバナー表示 (今年/去年/〜月指定/カスタム)
function renderMpTimeMachineBanner() {
  const c = document.getElementById('mypage-content');
  if (!c) return;
  // 既存バナーを除去
  const old = c.querySelector('.mp-tm-banner');
  if (old) old.remove();
  const f = window._tripDateFilter;
  if (!f || f.mode === 'all') return;

  let label = '';
  let cls = 'mp-tm-banner';
  if (f.mode === 'thisYear') label = '🗓 今年のみ表示中';
  else if (f.mode === 'lastYear') label = '🗓 去年のみ表示中';
  else if (f.mode === 'untilMonth') {
    label = `🕰 <strong>〜${(f.month||'').replace('-','/')}</strong> までの記録で表示中`;
  }
  else if (f.mode === 'custom') {
    if (isTimeMachineActive()) {
      label = `🕰 過去モード: <strong>${f.to}</strong> 時点を表示中`;
    } else {
      const fr = f.from || '…';
      const to = f.to || '…';
      label = `🗓 カスタム期間: <strong>${fr}</strong> 〜 <strong>${to}</strong>`;
    }
  } else return;

  const banner = document.createElement('div');
  banner.className = cls;
  banner.innerHTML = `
    ${label}
    <button class="mp-tm-banner-clear" onclick="setDateFilter('all')">↺ 全期間に戻す</button>
  `;
  // サブタブ nav の直前に挿入
  const subNav = c.querySelector('.mp-subtab-nav');
  if (subNav) c.insertBefore(banner, subNav);
  else c.appendChild(banner);
}
NORIRECO.mypage.renderMpTimeMachineBanner = renderMpTimeMachineBanner;

function showAllSubpanes(show) {
  document.querySelectorAll('.mp-subpane').forEach(p => p.style.display = show ? '' : 'none');
}
NORIRECO.mypage.showAllSubpanes = showAllSubpanes;

function switchMpSection(name) {
  MP.mpActiveSection = name;
  applyMpSection();
}
window.switchMpSection = switchMpSection;
NORIRECO.mypage.switchMpSection = switchMpSection;

export function applyMpSection() {
  // 旧 'timemachine' 選択を 'stats' にフォールバック (タイムマシン廃止 v174)
  if (MP.mpActiveSection === 'timemachine') MP.mpActiveSection = 'stats';
  // サブタブ activeクラス
  document.querySelectorAll('.mp-subtab').forEach(b => {
    b.classList.toggle('active', b.dataset.sec === MP.mpActiveSection);
  });
  // サブペイン表示切替
  const showStats = MP.mpActiveSection === 'stats';
  const showTrips = MP.mpActiveSection === 'trips';
  const showLines = MP.mpActiveSection === 'lines';
  const showMemos = MP.mpActiveSection === 'memos';
  document.getElementById('mp-sub-stats').style.display       = showStats ? '' : 'none';
  document.getElementById('mp-sub-trips').style.display       = showTrips ? '' : 'none';
  document.getElementById('mp-sub-lines').style.display       = showLines ? '' : 'none';
  const memoPane = document.getElementById('mp-sub-memos');
  if (memoPane) memoPane.style.display = showMemos ? '' : 'none';

  // 内容描画 (遅延でレイアウト確定後)
  setTimeout(() => {
    if (showStats) { NORIRECO.mypage.renderMpStatsSection(); }
    if (showTrips) NORIRECO.mypage.renderMpTripsSection();
    if (showLines) { try { renderList(); } catch(e) {} }
    if (showMemos) { try { NORIRECO.mypage.renderMpMemosSection?.(); } catch(e) {} }
  }, 30);
}
NORIRECO.mypage.applyMpSection = applyMpSection;

// ── 共通: 旅程タブのソート比較関数 (統計タブ「直近の旅程」のソートとも共有想定) ──
// v182: ソートキー (MP.mpTripFilter.sort) ごとの比較関数
export const _MP_SORT_COMPARATORS = {
  date_desc: (a, b) => (b.date || '').localeCompare(a.date || ''),
  date_asc: (a, b) => (a.date || '').localeCompare(b.date || ''),
  stations_desc: (a, b) => (b.total_stations || 0) - (a.total_stations || 0),
  minutes_desc: (a, b) => (b.total_minutes || 0) - (a.total_minutes || 0),
  recorded_desc: (a, b) => (b.recorded_at || b.date || '').localeCompare(a.recorded_at || a.date || ''),
  delay_desc: (a, b) => ((b.delay_minutes || 0) - (a.delay_minutes || 0))
                        || (b.recorded_at || b.date || '').localeCompare(a.recorded_at || a.date || ''),
};
NORIRECO.mypage._MP_SORT_COMPARATORS = _MP_SORT_COMPARATORS;

// 単一 trip カードの HTML を生成 (旅程タブ・統計タブ「直近の旅程」両方で使用)
// v182: 「直近の旅程」表示のため buildTripList のループ本体をここに抽出
export function tripCardHtml(trip) {
  let badge = '<span class="mp-badge manual" title="手動記録 (自己申告)">⚪ 手動記録</span>';
  if (trip.verified) {
    badge = '<span class="mp-badge verified" title="GPS 記録 (認証済)">🟢 GPS 記録</span>';
  } else if (fraudIsDowngraded(trip)) {
    badge = '<span class="mp-badge suspicious" title="不正検知で降格">🟡 要確認</span>';
  }

  // 乗車日時を date_precision に応じて整形
  const prec = trip.date_precision || 'day';
  let displayDate, timeStr = '';
  if (prec === 'unknown' || !trip.date) {
    displayDate = '日時不明';
  } else if (prec === 'year') {
    displayDate = `${trip.date.slice(0,4)}年ごろ`;
  } else if (prec === 'month') {
    displayDate = `${trip.date.slice(0,4)}年${parseInt(trip.date.slice(5,7),10)}月ごろ`;
  } else {
    displayDate = trip.date;
    if (prec === 'minute' && trip.depart_time && trip.arrive_time) {
      timeStr = `${trip.depart_time.slice(0,5)}〜${trip.arrive_time.slice(0,5)}${trip.total_minutes ? ` (${trip.total_minutes}分)` : ''}`;
    }
  }
  const precBadge = (prec === 'year' || prec === 'month' || prec === 'unknown')
    ? `<span class="mp-badge fuzzy" title="日付の精度: ${prec}">${prec === 'unknown' ? '❓' : '〜'}</span>`
    : '';

  // 記録した日 (recorded_at) と 乗車日 (date) の差分で「後追い記録」判定
  let recordedAtStr = '';
  let isAfterTheFact = false;
  if (trip.recorded_at) {
    try {
      const rd = new Date(trip.recorded_at);
      const ymd = `${rd.getFullYear()}-${String(rd.getMonth()+1).padStart(2,'0')}-${String(rd.getDate()).padStart(2,'0')}`;
      const hm = rd.toTimeString().slice(0,5);
      recordedAtStr = `${ymd} ${hm}`;
      if (prec === 'unknown') {
        isAfterTheFact = true;
      } else if (trip.date && ymd !== trip.date) {
        isAfterTheFact = true;
      }
    } catch(e) {}
  }
  const afterTheFactBadge = isAfterTheFact
    ? `<span class="mp-badge after-fact" title="乗車日と記録日が違う = 後から登録">📝 後追い</span>`
    : '';
  const recordedAtLine = recordedAtStr
    ? `<div class="mp-tcard-recorded">📌 記録: ${recordedAtStr}</div>`
    : '';

  let trainBit = '';
  if (trip.train_name) {
    const customMark = trip.train_id ? '' : ' 📝';
    trainBit = `<div class="mp-tcard-train">🚆 ${trip.train_name}${customMark}${trip.car_model?` <span class="mp-car">[${trip.car_model}]</span>`:''}</div>`;
  }

  // v181/v185: 後追い記録モード拡張 — 遅延分・自由メモ (時間+分表記)
  const delayBit = (typeof trip.delay_minutes === 'number' && trip.delay_minutes > 0)
    ? `<span class="mp-badge delay" title="到着遅延">⏱ ${formatDelayMin(trip.delay_minutes)}遅れ</span>`
    : '';
  let notesLine = '';
  if (trip.notes && String(trip.notes).trim()) {
    const tmp = document.createElement('div');
    tmp.textContent = String(trip.notes).trim();
    notesLine = `<div class="mp-tcard-notes">📝 ${tmp.innerHTML}</div>`;
  }

  const verifyBtn = !trip.verified
    ? `<button class="mp-act-btn verify" onclick="retroactivelyVerifyTrip('${trip.id}')">📍 GPSで認証</button>`
    : '';

  // v184/v226: 既存旅程の編集ボタン (v226 で時刻・列車種別まで編集対象拡大)
  const editBtn = `<button class="mp-act-btn edit-memo" onclick="openTripEditModal('${trip.id}')">✏️ 編集</button>`;

  return `
    <div class="mp-tcard" data-trip-id="${trip.id}">
      <div class="mp-tcard-head">
        <span class="mp-tcard-date">${displayDate}</span>
        ${precBadge}
        ${timeStr ? `<span class="mp-tcard-time">${timeStr}</span>` : ''}
        ${badge}
        ${afterTheFactBadge}
        ${delayBit}
      </div>
      <div class="mp-tcard-name">${trip.name || ''}</div>
      <div class="mp-tcard-sub">${trip.total_stations || 0}駅 · 乗換${trip.transfers || 0}回</div>
      ${trainBit}
      ${notesLine}
      ${recordedAtLine}
      <div class="mp-tcard-actions">
        ${verifyBtn}
        ${editBtn}
        <button class="mp-act-btn delete" onclick="deleteTripFromMypage('${trip.id}')">🗑 削除</button>
      </div>
    </div>`;
}
NORIRECO.mypage.tripCardHtml = tripCardHtml;

// ── トースト ──────────────────────────────────────────────────
export function showMypageToast(text, kind) {
  let el = document.getElementById('mp-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mp-toast';
    el.className = 'mp-toast';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.className = 'mp-toast show' + (kind ? ' ' + kind : '');
  clearTimeout(showMypageToast._t);
  showMypageToast._t = setTimeout(() => { el.className = 'mp-toast'; }, 3500);
}
NORIRECO.mypage.showMypageToast = showMypageToast;

// ══════════════════════════════════════════════════════════════
// 期間フィルタ補助 (v174 でタイムマシン subtab 廃止、地図ピル「〜月指定」に統合)
// 銀残し: isTimeMachineActive はバナー表示で使用
// ══════════════════════════════════════════════════════════════

// 過去モードが有効か (_tripDateFilter が custom & to が今日以前、または untilMonth)
function isTimeMachineActive() {
  const f = window._tripDateFilter;
  if (!f) return false;
  const today = (typeof localDateStr === 'function') ? localDateStr() : new Date().toISOString().slice(0,10);
  if (f.mode === 'untilMonth' && f.month) {
    // 月末日が今日より前なら過去モード
    if (typeof _lastDayOfMonth === 'function') {
      const last = _lastDayOfMonth(f.month);
      return last && last < today;
    }
    return true;
  }
  if (f.mode !== 'custom') return false;
  if (!f.to) return false;
  return f.to < today;
}
NORIRECO.mypage.isTimeMachineActive = isTimeMachineActive;

// v207 stage 2 (type=module 化) で必要になった window bridge。
// 13a-stats / 13b-trips (module) や 05-supabase / 09-tabs-stats (classic) からの
// bare 参照を支えるため明示公開。
// v225 stage 3: applyMpSection / showMypageToast / tripCardHtml / _MP_SORT_COMPARATORS は
// `export` 経由に移行。isTimeMachineActive は 13-common 内のみで使われるため bridge 撤去。
