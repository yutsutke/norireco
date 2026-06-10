// ══════════════════════════════════════════════
// 乗車記録：localStorage優先、なければ空配列 (未ログイン or 初回 = 空地図)
//
// v215 ES Modules パイロット (案 β) stage 2: `<script type="module">` 化。
// 既存 window 公開 (toggleStopTypeFilter / updateStopTypeFilterUI / toggleMapCtrl /
// closeAllMapCtrl) に加え、stage 2 で必要になった bridge を末尾に集約。
//
// v223 ES Modules stage 3: 03-characters.runCharacterGrantCheck を import 化。
// v225: 08-rendering の drawLines / updateOverlays を import 化。
// v225: 13-mypage-common.renderMypage を import 化。
// v234: 静的デモデータ RIDDEN_SEGS_STATIC を撤去。未ログイン + 空 localStorage =
//       完全な空マップを返すように変更 (旧デモ trip は混乱の元なので削除)。
// ══════════════════════════════════════════════
import { runCharacterGrantCheck } from './03-characters.js';
import { drawLines, updateOverlays } from './08-rendering.js';
import { renderMypage } from './13-mypage-common.js';
import { currentUserId, authBearerToken } from './12-auth.js';

// ══════════════════════════════════════════════
// Supabase 設定
// ══════════════════════════════════════════════
const SUPABASE_URL = 'https://zkscxhhlyhdaanisjhdi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprc2N4aGhseWhkYWFuaXNqaGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTAzNjcsImV4cCI6MjA5MzcyNjM2N30.rGOli3UJjjBtF8caD7NXaoCYdfgbIyv4j_GCdjmPpsU';

function tripsToSegs(trips) {
  const segs = [];
  trips.forEach(trip => {
    (trip.segments || []).forEach(seg => {
      segs.push({ lineId: seg.lineId, from: seg.from, to: seg.to });
    });
  });
  return segs;
}

// ══════════════════════════════════════════════
// v188: マップ表示モード (両方 / 乗車のみ / 未乗車のみ) は駅フィルタから派生
// 旧 .mfilter-chip UI と localStorage キー (norireco_map_display_mode) は撤去。
// drawServiceLineBase 等が参照する window._mapDisplayMode は駅フィルタの状態から計算する。
// ══════════════════════════════════════════════
function deriveMapDisplayMode(stf) {
  const f = stf || { alighted: true, boarded: true, passed: true, unvisited: true };
  const hasRidden = !!(f.alighted || f.boarded || f.passed);
  const hasUnvisited = !!f.unvisited;
  if (hasRidden && hasUnvisited) return 'both';
  if (hasRidden) return 'ridden';
  if (hasUnvisited) return 'unridden';
  return 'both'; // 全部 OFF (実用想定外) は両方扱い
}
function _refreshMapDisplayModeFromStopFilter() {
  window._mapDisplayMode = deriveMapDisplayMode(window._stopTypeFilter);
}

// ══════════════════════════════════════════════
// v186: stop_type フィルタ (●大 降車 / ◎中 乗車のみ / ○小 通過のみ)
// 各種別ごとに表示/非表示を切り替えられる。
// localStorage: { alighted: true, boarded: true, passed: true }
// ══════════════════════════════════════════════
const STOP_TYPE_FILTER_KEY = 'norireco_stop_type_filter';

function loadStopTypeFilter() {
  try {
    const s = localStorage.getItem(STOP_TYPE_FILTER_KEY);
    if (s) {
      const f = JSON.parse(s);
      if (f && typeof f === 'object') {
        return {
          alighted: f.alighted !== false,
          boarded: f.boarded !== false,
          passed: f.passed !== false,
          unvisited: f.unvisited !== false,
        };
      }
    }
  } catch(e) {}
  return { alighted: true, boarded: true, passed: true, unvisited: true };
}
window._stopTypeFilter = loadStopTypeFilter();
// v188: 起動時にも駅フィルタから路線表示モードを派生
_refreshMapDisplayModeFromStopFilter();

function toggleStopTypeFilter(stype) {
  if (!['alighted', 'boarded', 'passed', 'unvisited'].includes(stype)) return;
  window._stopTypeFilter = window._stopTypeFilter || { alighted: true, boarded: true, passed: true, unvisited: true };
  window._stopTypeFilter[stype] = !window._stopTypeFilter[stype];
  try { localStorage.setItem(STOP_TYPE_FILTER_KEY, JSON.stringify(window._stopTypeFilter)); } catch(e) {}
  updateStopTypeFilterUI();
  // v188: 駅フィルタから路線表示モード(_mapDisplayMode) も派生し、路線+駅 まとめて再描画
  _refreshMapDisplayModeFromStopFilter();
  if (NORIRECO.map.instance && typeof dotLayerRef !== 'undefined' && dotLayerRef) {
    allLayers.forEach(l => { try { NORIRECO.map.instance.removeLayer(l); } catch(e){} });
    allLayers.length = 0;
    dotLayerRef.clearLayers();
    if (typeof labelLayerRef !== 'undefined' && labelLayerRef) labelLayerRef.clearLayers();
    drawLines();
    updateOverlays();
  }
}
window.toggleStopTypeFilter = toggleStopTypeFilter;

function updateStopTypeFilterUI() {
  const f = window._stopTypeFilter || { alighted: true, boarded: true, passed: true, unvisited: true };
  document.querySelectorAll('.stfilter-chip').forEach(b => {
    const t = b.dataset.stype;
    if (!t) return;
    b.classList.toggle('active', !!f[t]);
  });
}
window.updateStopTypeFilterUI = updateStopTypeFilterUI;

// ══════════════════════════════════════════════
// v187: 地図フィルタを 3 つの円形アイコンに集約
//   📅 (date) / 🗾 (mode) / 📍 (station) のいずれかを開く。
//   再タップで閉じる。他のアイコンタップで前のを閉じる。
//   外側タップでも全部閉じる (document クリックハンドラ)
// ══════════════════════════════════════════════
const _MAP_CTRL_TARGETS = {
  date:    'date-filter-box',
  station: 'stop-type-box',
};

function toggleMapCtrl(which, ev) {
  if (ev) ev.stopPropagation();   // 外側タップ閉じハンドラ抑止
  const target = _MAP_CTRL_TARGETS[which];
  if (!target) return;
  const isOpen = (document.getElementById(target)?.style.display === 'flex');
  // 全部閉じる (期間ポップオーバーも含む)
  closeAllMapCtrl();
  // 押したやつが閉じていたなら開く
  if (!isOpen) {
    const el = document.getElementById(target);
    if (el) el.style.display = 'flex';
    document.getElementById(`ctrl-icon-${which}`)?.classList.add('active');
  }
}
window.toggleMapCtrl = toggleMapCtrl;

function closeAllMapCtrl() {
  Object.entries(_MAP_CTRL_TARGETS).forEach(([k, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
    document.getElementById(`ctrl-icon-${k}`)?.classList.remove('active');
  });
  // 期間フィルタのサブポップアップも閉じる
  document.querySelectorAll('.dfilter-pop').forEach(p => p.classList.remove('open'));
}
window.closeAllMapCtrl = closeAllMapCtrl;

// 外側クリックで閉じる (date-filter-wrap 内のクリックは閉じない)
document.addEventListener('click', (ev) => {
  const wrap = document.getElementById('date-filter-wrap');
  if (!wrap) return;
  if (wrap.contains(ev.target)) return;
  closeAllMapCtrl();
});

// ══════════════════════════════════════════════
// 期間フィルタ (trip.date)
// ══════════════════════════════════════════════
const TRIP_DATE_FILTER_KEY = 'norireco_date_filter';

function loadDateFilter() {
  try {
    const s = localStorage.getItem(TRIP_DATE_FILTER_KEY);
    if (s) {
      const f = JSON.parse(s);
      if (f && typeof f.mode === 'string') return f;
    }
  } catch(e) {}
  return { mode: 'all' };
}
function saveDateFilter(f) {
  try { localStorage.setItem(TRIP_DATE_FILTER_KEY, JSON.stringify(f)); } catch(e) {}
}
window._tripDateFilter = loadDateFilter();

// 「YYYY-MM」 → 月末日付 (YYYY-MM-LL)
function _lastDayOfMonth(yyyymm) {
  if (!yyyymm) return null;
  const m = yyyymm.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const last = new Date(+m[1], +m[2], 0).getDate();
  return `${m[1]}-${m[2]}-${String(last).padStart(2,'0')}`;
}

// 年横断 (季節/月) フィルタ用の季節プリセット。区切りは行楽期重視 (春4-5 / 夏7-8 / 秋10-11 / 冬12-1)。
const SEASON_PRESETS = {
  spring: { label: '春', months: ['04','05'] },
  summer: { label: '夏', months: ['07','08'] },
  autumn: { label: '秋', months: ['10','11'] },
  winter: { label: '冬', months: ['12','01'] },
};

// 選択月の集合からチップ/バナー用ラベルを作る。プリセット一致なら「夏 (7・8月)」、それ以外は「7・9月」。
export function seasonFilterLabel(months) {
  if (!Array.isArray(months) || !months.length) return '';
  const nums = months.map(m => +m).sort((a,b) => a-b);
  const sorted = nums.map(n => String(n).padStart(2,'0')).join(',');
  for (const k in SEASON_PRESETS) {
    if (SEASON_PRESETS[k].months.slice().sort().join(',') === sorted) {
      return `${SEASON_PRESETS[k].label} (${nums.join('・')}月)`;
    }
  }
  return nums.join('・') + '月';
}

export function filterTripsByDate(trips, override) {
  // v443: override を渡すとグローバル window._tripDateFilter を汚さず一時期間でフィルタできる
  //   (シェア画像の期間チップ用)。省略時は従来どおりグローバル期間フィルタを参照。
  const f = override || window._tripDateFilter || { mode: 'all' };
  if (!f || f.mode === 'all') return trips;
  // 年横断 (季節/月) モード: 連続レンジでなく「月メンバーシップ」で絞る
  if (f.mode === 'season') {
    const months = Array.isArray(f.months) ? f.months : [];
    if (!months.length) return trips;
    return trips.filter(t => {
      // 'unknown' は除外。'year' 精度は date=YYYY-01-01 で月が不確実なので除外。
      if (t.date_precision === 'unknown' || t.date_precision === 'year') return false;
      const mm = (t.date || '').slice(5, 7);
      return mm && months.includes(mm);
    });
  }
  const y = new Date().getFullYear();
  let fromStr, toStr;
  if (f.mode === 'thisYear') { fromStr = `${y}-01-01`; toStr = `${y}-12-31`; }
  else if (f.mode === 'lastYear') { fromStr = `${y-1}-01-01`; toStr = `${y-1}-12-31`; }
  else if (f.mode === 'untilMonth') {
    if (!f.month) return trips;
    fromStr = '0000-01-01';
    toStr = _lastDayOfMonth(f.month) || '9999-12-31';
  }
  else if (f.mode === 'custom') { fromStr = f.from || '0000-01-01'; toStr = f.to || '9999-12-31'; }
  else return trips;
  return trips.filter(t => {
    // 日時不明 (date_precision='unknown') は specific フィルタから除外 (all のみで表示)
    if (t.date_precision === 'unknown') return false;
    const d = (t.date || '').slice(0, 10);
    return d && d >= fromStr && d <= toStr;
  });
}

export function updateDateFilterUI() {
  const f = window._tripDateFilter || { mode: 'all' };
  document.querySelectorAll('.dfilter-chip').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === f.mode);
  });
  const label = document.getElementById('dfilter-custom-label');
  if (label) {
    if (f.mode === 'custom' && (f.from || f.to)) {
      const fr = (f.from || '…').slice(5);
      const to = (f.to || '…').slice(5);
      label.textContent = `${fr}〜${to}`;
    } else {
      label.textContent = 'カスタム';
    }
  }
  const umLabel = document.getElementById('dfilter-um-label');
  if (umLabel) {
    if (f.mode === 'untilMonth' && f.month) {
      umLabel.textContent = `〜${f.month.replace('-','/')}`;
    } else {
      umLabel.textContent = '〜月指定';
    }
  }
  const seasonLabel = document.getElementById('dfilter-season-label');
  if (seasonLabel) {
    if (f.mode === 'season' && Array.isArray(f.months) && f.months.length) {
      seasonLabel.textContent = seasonFilterLabel(f.months);
    } else {
      seasonLabel.textContent = '季節/月';
    }
  }
}

// v238: ヘッダ (h-pct/h-ln) とマイページ完乗率カードで数字がズレる問題の修正。
// 原因: localStorage の `norireco_trips` には過去ログインの他ユーザー trip や
// user_id 未設定の古い trip が残留しているケースがある。マイページは Supabase 側で
// `user_id=eq.{uid}` フィルタしているため自分の trip だけだが、ヘッダ用の
// applyDateFilter / loadRiddenSegsFromStorage は localStorage を生で読んでいた。
// 対応: ログイン中なら `trip.user_id === uid` のみ採用 (未ログイン時は全件を許容)。
function filterTripsByCurrentUser(trips) {
  const uid = currentUserId();
  // v429: ゲスト時は自分の記録 (uid=null で localStorage 保存した分 = user_id 無し) のみ通す。
  //   従来 `return trips` で全件返しており、過去ログインの user_id 付き trip が
  //   applyDateFilter 経由で地図塗り/集計に混入しうる穴だった (v419 §269 で renderMypage
  //   ゲスト分岐を「user_id 空のみ」にしたときの対称修正漏れ)。
  if (!uid) return trips.filter(t => !t.user_id);
  return trips.filter(t => !t.user_id || t.user_id === uid);
}

// v388: 旅程削除など「localStorage の trips が変わった」タイミングからも呼べるよう export 化。
//       date filter を介さず純粋に「再構築 + 地図再描画」だけ行いたい場合も、
//       現在の date filter を維持する形で同じ rebuild → drawLines パスを通せばよいので
//       この関数自体を再利用する (新たな関数を増やさない)。
export function applyDateFilter() {
  let trips = [];
  try { trips = JSON.parse(localStorage.getItem('norireco_trips') || '[]'); } catch(e) {}
  // v234: localStorage が空なら空配列 (旧 RIDDEN_SEGS_STATIC フォールバックは撤去)
  // v238: 自分の user_id でフィルタ (マイページと数字を揃えるため)
  trips = filterTripsByCurrentUser(trips);
  let segs;
  if (trips.length === 0) {
    segs = [];
  } else {
    const filtered = filterTripsByDate(trips);
    segs = tripsToSegs(filtered);
    console.log(`[乗レコ] 期間フィルタ ${window._tripDateFilter.mode}: ${trips.length}件 → ${filtered.length}件 (${segs.length}区間)`);
  }
  RIDDEN_SEGS.length = 0;
  segs.forEach(s => RIDDEN_SEGS.push(s));
  NORIRECO.rideRecord.rebuild();
  // v238: updateOverlays は map.instance に依存しない (h-pct / h-ln / ms-* の
  // DOM テキスト更新のみ) ため、地図初期化前 or マイページタブ滞在中でも
  // ヘッダ完乗率が古い値に固定される問題を回避するため、ブロック外で常に呼ぶ。
  try { updateOverlays(); } catch(e) { /* DOM 要素未生成期は無視 */ }
  // 地図再描画は map.instance がある場合のみ
  if (NORIRECO.map.instance && typeof dotLayerRef !== 'undefined' && dotLayerRef) {
    allLayers.forEach(l => { try { NORIRECO.map.instance.removeLayer(l); } catch(e){} });
    allLayers.length = 0;
    dotLayerRef.clearLayers();
    if (typeof labelLayerRef !== 'undefined' && labelLayerRef) labelLayerRef.clearLayers();
    drawLines();
  }
}

export function setDateFilter(mode, opts = {}) {
  window._tripDateFilter = Object.assign({ mode }, opts);
  saveDateFilter(window._tripDateFilter);
  updateDateFilterUI();
  applyDateFilter();
  // マイページが開いていれば再描画 (期間フィルタを全タブに反映)
  const mp = document.getElementById('pane-mypage');
  if (mp && mp.classList.contains('active')) {
    renderMypage();
  }
}

function toggleCustomDateFilter() {
  const pop = document.getElementById('dfilter-pop');
  if (!pop) return;
  if (pop.classList.contains('open')) { closeCustomDateFilter(); return; }
  const f = window._tripDateFilter || {};
  const fromEl = document.getElementById('dfilter-from');
  const toEl = document.getElementById('dfilter-to');
  const today = new Date();
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  if (fromEl) fromEl.value = (f.mode === 'custom' && f.from) ? f.from : `${today.getFullYear()}-01-01`;
  if (toEl)   toEl.value   = (f.mode === 'custom' && f.to)   ? f.to   : ymd(today);
  pop.classList.add('open');
  setTimeout(() => document.addEventListener('mousedown', _dfilterOutsideClick), 0);
}
function _dfilterOutsideClick(e) {
  const wrap = document.getElementById('date-filter-wrap');
  if (wrap && !wrap.contains(e.target)) {
    closeCustomDateFilter();
  }
}
function closeCustomDateFilter() {
  document.getElementById('dfilter-pop')?.classList.remove('open');
  document.removeEventListener('mousedown', _dfilterOutsideClick);
}
function applyCustomDateFilter() {
  const from = document.getElementById('dfilter-from')?.value || '';
  const to = document.getElementById('dfilter-to')?.value || '';
  if (!from && !to) { alert('開始日または終了日を入力してください'); return; }
  if (from && to && from > to) { alert('開始日は終了日以前にしてください'); return; }
  setDateFilter('custom', { from, to });
  closeCustomDateFilter();
}

// 「最初から〜YYYY/MM まで」モード
function toggleUntilMonthFilter() {
  const pop = document.getElementById('dfilter-um-pop');
  if (!pop) return;
  if (pop.classList.contains('open')) { closeUntilMonthFilter(); return; }
  const f = window._tripDateFilter || {};
  const yearSel = document.getElementById('dfilter-um-year');
  const monthSel = document.getElementById('dfilter-um-month');
  if (yearSel && monthSel) {
    // 年セレクタ: 過去 15 年 + 今年
    const now = new Date();
    const curY = now.getFullYear();
    const startY = curY - 15;
    if (!yearSel.options.length) {
      for (let y = curY; y >= startY; y--) {
        const o = document.createElement('option');
        o.value = String(y); o.textContent = `${y}年`;
        yearSel.appendChild(o);
      }
    }
    // 月セレクタ
    if (!monthSel.options.length) {
      for (let m = 1; m <= 12; m++) {
        const o = document.createElement('option');
        o.value = String(m).padStart(2,'0'); o.textContent = `${m}月`;
        monthSel.appendChild(o);
      }
    }
    // 現在値プリセット (or 今月)
    if (f.mode === 'untilMonth' && f.month) {
      const [y,m] = f.month.split('-');
      yearSel.value = y; monthSel.value = m;
    } else {
      yearSel.value = String(curY);
      monthSel.value = String(now.getMonth()+1).padStart(2,'0');
    }
  }
  pop.classList.add('open');
  setTimeout(() => document.addEventListener('mousedown', _umfilterOutsideClick), 0);
}
function _umfilterOutsideClick(e) {
  const wrap = document.getElementById('date-filter-wrap');
  if (wrap && !wrap.contains(e.target)) {
    closeUntilMonthFilter();
  }
}
function closeUntilMonthFilter() {
  document.getElementById('dfilter-um-pop')?.classList.remove('open');
  document.removeEventListener('mousedown', _umfilterOutsideClick);
}
function applyUntilMonthFilter() {
  const y = document.getElementById('dfilter-um-year')?.value || '';
  const m = document.getElementById('dfilter-um-month')?.value || '';
  if (!y || !m) { alert('年月を選択してください'); return; }
  setDateFilter('untilMonth', { month: `${y}-${m}` });
  closeUntilMonthFilter();
}

// 年横断 (季節/月) モード: 年をまたいで「夏だけ」「12月だけ」などで絞る
function toggleSeasonFilter() {
  const pop = document.getElementById('dfilter-season-pop');
  if (!pop) return;
  if (pop.classList.contains('open')) { closeSeasonFilter(); return; }
  // 月トグル (1〜12) を初回のみ生成
  const grid = document.getElementById('dfilter-season-months');
  if (grid && !grid.children.length) {
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2,'0');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dfilter-month-tog';
      b.dataset.m = mm;
      b.textContent = String(m);
      b.onclick = () => b.classList.toggle('on');
      grid.appendChild(b);
    }
  }
  // 現在の選択を反映
  const f = window._tripDateFilter || {};
  const cur = (f.mode === 'season' && Array.isArray(f.months)) ? f.months : [];
  grid?.querySelectorAll('.dfilter-month-tog').forEach(b => {
    b.classList.toggle('on', cur.includes(b.dataset.m));
  });
  pop.classList.add('open');
  setTimeout(() => document.addEventListener('mousedown', _seasonOutsideClick), 0);
}
function _seasonOutsideClick(e) {
  const wrap = document.getElementById('date-filter-wrap');
  if (wrap && !wrap.contains(e.target)) {
    closeSeasonFilter();
  }
}
function closeSeasonFilter() {
  document.getElementById('dfilter-season-pop')?.classList.remove('open');
  document.removeEventListener('mousedown', _seasonOutsideClick);
}
// 季節プリセットボタン: 該当月トグルだけ on にする (押下のたび置き換え)
function applySeasonPreset(key) {
  const preset = SEASON_PRESETS[key];
  if (!preset) return;
  const grid = document.getElementById('dfilter-season-months');
  grid?.querySelectorAll('.dfilter-month-tog').forEach(b => {
    b.classList.toggle('on', preset.months.includes(b.dataset.m));
  });
}
function applySeasonFilter() {
  const grid = document.getElementById('dfilter-season-months');
  const months = Array.from(grid?.querySelectorAll('.dfilter-month-tog.on') || [])
    .map(b => b.dataset.m);
  if (!months.length) { alert('1 つ以上の月を選んでください'); return; }
  setDateFilter('season', { months });
  closeSeasonFilter();
}

// Supabaseから旅程を取得して地図を更新。
// v233: 未ログイン時は他人の trip まで anon key で fetch していたので、
//   - ログイン中: user_id=eq.<uid> でフィルタ
//   - 未ログイン: skip (localStorage が空なら空マップ)
// に変更。Bearer も anon key 直挿しから authBearerToken() (access_token 優先) へ。
export async function syncFromSupabase() {
  const uid = currentUserId();
  if (!uid) {
    console.log('[乗レコ] Supabase 同期スキップ (未ログイン)');
    // v448: ここでの markSyncSettled (v418) は撤去。起動時 (06 map init) は auth 初期化前で
    //   uid が必ず null のため、ここで settle するとログイン直後 (= logout purge で localStorage 空)
    //   にバナーが誤表示される。「未ログイン確定」の settle は 12-auth.js getSession に一本化。
    return;
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/norireco_trips?user_id=eq.${uid}&select=*&order=created_at.asc`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authBearerToken()}` } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let trips = await res.json();
    if (!trips.length) {
      try { window.NORIRECO?.bulkRecord?.markSyncSettled?.(); } catch(e) {}
      return;
    }

    // v395: 以前は notes / delay_minutes が Supabase に送られず localStorage のみだった (v181〜v394 のバグ)。
    //   syncFromSupabase が localStorage を Supabase 値 (null) で上書きすると v395 以前の編集が消える。
    //   救済策として、localStorage に値が残っていて Supabase 側が空のフィールドは localStorage から merge back。
    //   次回その trip を編集 + 保存すると Supabase 側にも届く (v395 修正後の `tripPatch.delay_minutes/notes` 経由)。
    //   13-mypage-common.js loadTripsIfNeeded も同形の merge を持つ (UI 表示用、こちらは破壊操作の手前で merge)。
    try {
      const localTrips = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
      if (Array.isArray(localTrips) && localTrips.length > 0) {
        const localById = new Map(localTrips.map(t => [t.id, t]));
        trips = trips.map(t => {
          const lt = localById.get(t.id);
          if (!lt) return t;
          const merged = { ...t };
          if (merged.notes == null && lt.notes != null) merged.notes = lt.notes;
          if (merged.delay_minutes == null && lt.delay_minutes != null) merged.delay_minutes = lt.delay_minutes;
          return merged;
        });
      }
    } catch (e) {
      console.warn('[syncFromSupabase] localStorage merge エラー:', e.message);
    }

    console.log(`[乗レコ] Supabase同期: ${trips.length}件`);
    localStorage.setItem('norireco_trips', JSON.stringify(trips));

    // RIDDEN_SEGSを再構築 (期間フィルタ適用)
    const filteredTrips = filterTripsByDate(trips);
    const newSegs = tripsToSegs(filteredTrips);
    RIDDEN_SEGS.length = 0;
    newSegs.forEach(s => RIDDEN_SEGS.push(s));
    NORIRECO.rideRecord.rebuild();

    // v238: updateOverlays は map 初期化に依存しないので常に呼ぶ
    try { updateOverlays(); } catch(e) {}
    // 地図を再描画は map.instance がある場合のみ
    if (NORIRECO.map.instance && dotLayerRef) {
      allLayers.forEach(l => { try { NORIRECO.map.instance.removeLayer(l); } catch(e){} });
      allLayers.length = 0;
      dotLayerRef.clearLayers();
      if (labelLayerRef) labelLayerRef.clearLayers();
      drawLines();
    }
    updateStorageUI(trips.length, 'supabase');
    // v418: 同期完了をオンボーディングバナーへ通知 (settle 後に表示判定が走る)。
    try { window.NORIRECO?.bulkRecord?.markSyncSettled?.(); } catch(e) {}
    // Supabase 同期後にも自動獲得チェック
    setTimeout(() => runCharacterGrantCheck(), 600);
  } catch(e) {
    console.error('[乗レコ] Supabase同期エラー:', e);
    // v418: 失敗時もバナー判定は進める (ローカルデータベースで表示判定)。
    try { window.NORIRECO?.bulkRecord?.markSyncSettled?.(); } catch(e2) {}
  }
}

// localStorageから読み込み
// v238: 起動時の初期 RIDDEN_SEGS にも user_id フィルタを適用。
// ただしこの時点では currentUserId() がまだ undefined (auth 初期化前) のため、
// 暫定的に user_id 未設定 trip だけは除外 (確実に anonymous/他ユーザーの遺物) し、
// 自分かどうかの判定は applyDateFilter (setDateFilter / signIn 時) に任せる。
function loadRiddenSegsFromStorage() {
  try {
    let trips = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
    if (trips.length === 0) return null;
    // 起動時は currentUserId 未確定だが、user_id 列が空文字/null の古い trip は除外
    trips = trips.filter(t => t.user_id);
    const filtered = filterTripsByDate(trips);
    const segs = tripsToSegs(filtered);
    const f = window._tripDateFilter || { mode: 'all' };
    console.log(`[乗レコ] localStorage: ${trips.length}件 (user_id 付) [期間=${f.mode}] → ${filtered.length}件 → ${segs.length}区間`);
    return segs;
  } catch(e) {
    return null;
  }
}

// RIDDEN_SEGS = localStorage 優先、なければ空配列 (v234 で静的デモ撤去)。可変配列。
const RIDDEN_SEGS = loadRiddenSegsFromStorage() || [];

export function getStorageStats() {
  try {
    const trips = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
    return { count: trips.length, source: trips.length > 0 ? 'local' : 'empty' };
  } catch(e) { return { count: 0, source: 'empty' }; }
}

export function updateStorageUI(count, source) {
  const lbl = document.getElementById('storage-lbl');
  const cnt = document.getElementById('storage-count');
  if (!lbl || !cnt) return;
  if (source === 'supabase') {
    lbl.textContent = '☁️ Supabase同期済';
    cnt.textContent = `${count}件`;
    cnt.style.color = 'var(--green)';
  } else if (source === 'local') {
    lbl.textContent = '📱 このiPhone';
    cnt.textContent = `${count}件`;
    cnt.style.color = 'var(--gold)';
  } else {
    // v234: 旧 'static' を 'empty' に改名 (デモデータ撤去後の意味付け)
    lbl.textContent = '📄 データなし';
    cnt.textContent = '';
  }
}

function openRestoreModal() {
  document.getElementById('restore-modal')?.classList.add('open');
}
function closeRestoreModal() {
  document.getElementById('restore-modal')?.classList.remove('open');
}

function restoreFromJson(jsonText) {
  try {
    const data = JSON.parse(jsonText);
    if (!Array.isArray(data)) throw new Error('配列形式でありません');
    const existing = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
    const existingIds = new Set(existing.map(t => t.id));
    let added = 0;
    data.forEach(trip => {
      if (!existingIds.has(trip.id)) { existing.push(trip); added++; }
    });
    localStorage.setItem('norireco_trips', JSON.stringify(existing));
    alert(`✅ ${added}件復元しました`);
    closeRestoreModal();
    location.reload();
  } catch(e) {
    alert('❌ ' + e.message);
  }
}
// Mercator projection（SVGと同じ座標系）
const PAD=22;
function merc(lat,lon){
  const x=(lon+180)/360;
  const lr=lat*Math.PI/180;
  const y=(1-Math.log(Math.tan(lr)+1/Math.cos(lr))/Math.PI)/2;
  return {x,y};
}
function toSvg(lat,lon){
  const p=merc(lat,lon),p0=merc(24,122),p1=merc(46,147);
  return {
    x:PAD+(p.x-p0.x)/(p1.x-p0.x)*(SVG_W-PAD*2),
    y:PAD+(p.y-p1.y)/(p0.y-p1.y)*(SVG_H-PAD*2)
  };
}

// 乗車済み駅セット（rebuildRiddenStations()で構築される）
const riddenSt={};

export function lStats(line){const t=line.stations.length,r=riddenSt[line.id]?riddenSt[line.id].size:0;return{t,r,pct:t>0?Math.round(r/t*100):0};}

// 運行系統の統計 (segments を全部辿って合計)
function serviceStats(serviceId) {
  const svc = NORIRECO.data.RUNNING_SERVICES[serviceId];
  if (!svc) return {t:0, r:0, pct:0};
  let t=0, r=0;
  const seen = new Set();
  for (const seg of svc.segments) {
    const line = NORIRECO.data.LINES.find(l => l.id === seg.line);
    if (!line) continue;
    const fi = line.stations.findIndex(s => NORIRECO.rideRecord.normStName(s.n) === NORIRECO.rideRecord.normStName(seg.from));
    const ti = line.stations.findIndex(s => NORIRECO.rideRecord.normStName(s.n) === NORIRECO.rideRecord.normStName(seg.to));
    if (fi < 0 || ti < 0) continue;
    const lo = Math.min(fi, ti), hi = Math.max(fi, ti);
    const lr = riddenSt[line.id] || new Set();
    for (let i = lo; i <= hi; i++) {
      const k = line.id + ':' + line.stations[i].n;
      if (seen.has(k)) continue;
      seen.add(k);
      t++;
      if (lr.has(line.stations[i].n)) r++;
    }
  }
  return {t, r, pct: t>0 ? Math.round(r/t*100) : 0};
}

// 運行系統の代表色 (最初のsegmentの物理路線色)
function serviceColor(serviceId) {
  const svc = NORIRECO.data.RUNNING_SERVICES[serviceId];
  if (!svc) return '#888';
  if (svc.color) return svc.color;
  for (const seg of svc.segments) {
    const line = NORIRECO.data.LINES.find(l => l.id === seg.line);
    if (line) return line.color;
  }
  return '#888';
}
// 全体統計: NORIRECO.data.SERVICE_LINES が構築済みならそちらを優先、未構築なら N02 物理路線で代用
export function gStats(){
  if (NORIRECO.data.SERVICE_LINES && NORIRECO.data.SERVICE_LINES.length > 0) return NORIRECO.serviceLines.globalStats();
  let ts=0,rt=0,la=0,ld=0;
  NORIRECO.data.LINES.forEach(l=>{const s=lStats(l);ts+=s.t;rt+=s.r;if(s.r>0)la++;if(s.pct===100)ld++;});
  return{ts,rt,la,ld,pct:ts>0?Math.round(rt/ts*100):0};
}

// v222: 05 module 化 (v215) で漏れていた cross-module 共有 state の window bridge。
// SUPABASE_URL / SUPABASE_KEY: 03/07/09/12/13-mypage-common/13b-trips から bare 参照される
//   fetch URL / 認証ヘッダ。immutable 文字列。
// RIDDEN_SEGS / riddenSt: 04b/07/09 から bare 参照される乗車記録の共有 state。
//   bare 再代入はゼロ (.push / .length=0 / [k]=Set / delete などの property 操作のみ)
//   なので bridge だけで OK。bare 読込は module の global scope chain 経由で解決される。
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_KEY = SUPABASE_KEY;
window.RIDDEN_SEGS = RIDDEN_SEGS;
window.riddenSt = riddenSt;

// v215 stage 2: classic / module 両方から bare 呼出される関数を window 公開
// v225 stage 3: filterTripsByDate / updateDateFilterUI / syncFromSupabase /
// getStorageStats / updateStorageUI / lStats / gStats は `export` 経由に移行。
// setDateFilter は HTML onclick (noritetsu-map.html dfilter-chip) と 13-mypage-common HTML 文字列で
// 使われるため window 維持 + export 両建て。toggleCustomDateFilter 等は HTML onclick のため window 維持。
window.setDateFilter = setDateFilter;
// v443: シェア画像の期間チップ (14-share-ogp.js) が window 経由で呼ぶ (循環 import 回避の定石)。
//   filterTripsByDate は override 引数つきで一時期間フィルタ、tripsToSegs で地図ポリラインも期間連動。
window.filterTripsByDate = filterTripsByDate;
window.tripsToSegs = tripsToSegs;
window.seasonFilterLabel = seasonFilterLabel;
window.toggleCustomDateFilter = toggleCustomDateFilter;
window.closeCustomDateFilter = closeCustomDateFilter;
window.applyCustomDateFilter = applyCustomDateFilter;
window.toggleUntilMonthFilter = toggleUntilMonthFilter;
window.closeUntilMonthFilter = closeUntilMonthFilter;
window.applyUntilMonthFilter = applyUntilMonthFilter;
window.toggleSeasonFilter = toggleSeasonFilter;
window.closeSeasonFilter = closeSeasonFilter;
window.applySeasonPreset = applySeasonPreset;
window.applySeasonFilter = applySeasonFilter;

// v248: noritetsu-map.html の復元モーダル onclick="closeRestoreModal()" / "restoreFromJson(...)"
//   が v225 以降 ReferenceError で無反応になっていた問題を修正 (HTML onclick はグローバル参照のため window 公開が必須)
window.closeRestoreModal = closeRestoreModal;
window.restoreFromJson = restoreFromJson;
