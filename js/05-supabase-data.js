// ══════════════════════════════════════════════
// 乗車記録：localStorage優先、フォールバックとして静的データ
//
// v215 ES Modules パイロット (案 β) stage 2: `<script type="module">` 化。
// 既存 window 公開 (toggleStopTypeFilter / updateStopTypeFilterUI / toggleMapCtrl /
// closeAllMapCtrl) に加え、stage 2 で必要になった bridge を末尾に集約。
//
// v223 ES Modules stage 3: 03-characters.runCharacterGrantCheck を import 化。
// ══════════════════════════════════════════════
import { runCharacterGrantCheck } from './03-characters.js';

// 静的フォールバック（localStorageが空の端末用）
const RIDDEN_SEGS_STATIC=[
  // 2026/4/29 四ツ谷→西川口
  {lineId:'chuo',from:'四ツ谷',to:'中野'},
  {lineId:'keihin',from:'中野',to:'西川口'},
  // 2026/4/29 与野→横浜
  {lineId:'keihin',from:'与野',to:'横浜'},
  // 2026/4/29 東京→博多
  {lineId:'tokaido-shinkansen',from:'東京',to:'博多'},
  // 2026/5/1 田町→高田馬場
  {lineId:'yamanote',from:'田町',to:'高田馬場'},
  // 2026/5/4 東京→敦賀
  {lineId:'hokuriku',from:'東京',to:'敦賀'},
  // 2026/5/5 東京→高尾
  {lineId:'chuo',from:'東京',to:'高尾'},
  // 2026/5/6 高麗川→横浜
  {lineId:'hachioji',from:'高麗川',to:'八王子'},
  {lineId:'yokohama',from:'八王子',to:'東神奈川'},
  {lineId:'keikyu-kurihama',from:'堀ノ内',to:'三崎口'},
  {lineId:'yokosuka',from:'横須賀',to:'横浜'},
  // 2026/5/6 東京→本郷三丁目
  {lineId:'sobu',from:'東京',to:'千葉'},
  {lineId:'saikyo',from:'大崎',to:'戸田公園'},
  {lineId:'yokosuka',from:'東京',to:'横須賀'},
  {lineId:'yamanote',from:'東京',to:'神田'},
  {lineId:'shonan',from:'赤羽',to:'小田原'},
  {lineId:'tokyometro-ginza',from:'浅草',to:'渋谷'},
  {lineId:'tokyometro-marunouchi',from:'東京',to:'荻窪'},
  {lineId:'tokyometro-hibiya',from:'上野',to:'茅場町'},
  {lineId:'toei-asakusa',from:'押上',to:'東銀座'},
  {lineId:'toei-oedo',from:'都庁前',to:'本郷三丁目'},
];

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
    if (typeof drawLines === 'function') drawLines();
    if (typeof updateOverlays === 'function') updateOverlays();
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

function filterTripsByDate(trips) {
  const f = window._tripDateFilter || { mode: 'all' };
  if (!f || f.mode === 'all') return trips;
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

function updateDateFilterUI() {
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
}

function applyDateFilter() {
  let trips = [];
  try { trips = JSON.parse(localStorage.getItem('norireco_trips') || '[]'); } catch(e) {}
  // localStorage が空なら静的フォールバック(全期間扱いのみ)
  let segs;
  if (trips.length === 0) {
    segs = [...RIDDEN_SEGS_STATIC];
  } else {
    const filtered = filterTripsByDate(trips);
    segs = tripsToSegs(filtered);
    console.log(`[乗レコ] 期間フィルタ ${window._tripDateFilter.mode}: ${trips.length}件 → ${filtered.length}件 (${segs.length}区間)`);
  }
  RIDDEN_SEGS.length = 0;
  segs.forEach(s => RIDDEN_SEGS.push(s));
  NORIRECO.rideRecord.rebuild();
  // 地図再描画
  if (NORIRECO.map.instance && typeof dotLayerRef !== 'undefined' && dotLayerRef) {
    allLayers.forEach(l => { try { NORIRECO.map.instance.removeLayer(l); } catch(e){} });
    allLayers.length = 0;
    dotLayerRef.clearLayers();
    if (typeof labelLayerRef !== 'undefined' && labelLayerRef) labelLayerRef.clearLayers();
    if (typeof drawLines === 'function') drawLines();
    if (typeof updateOverlays === 'function') updateOverlays();
  }
}

function setDateFilter(mode, opts = {}) {
  window._tripDateFilter = Object.assign({ mode }, opts);
  saveDateFilter(window._tripDateFilter);
  updateDateFilterUI();
  applyDateFilter();
  // マイページが開いていれば再描画 (期間フィルタを全タブに反映)
  const mp = document.getElementById('pane-mypage');
  if (mp && mp.classList.contains('active') && typeof renderMypage === 'function') {
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

// Supabaseから全旅程を取得して地図を更新
async function syncFromSupabase() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/norireco_trips?select=*&order=created_at.asc`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const trips = await res.json();
    if (!trips.length) return;

    console.log(`[乗レコ] Supabase同期: ${trips.length}件`);
    localStorage.setItem('norireco_trips', JSON.stringify(trips));

    // RIDDEN_SEGSを再構築 (期間フィルタ適用)
    const filteredTrips = filterTripsByDate(trips);
    const newSegs = tripsToSegs(filteredTrips);
    RIDDEN_SEGS.length = 0;
    newSegs.forEach(s => RIDDEN_SEGS.push(s));
    NORIRECO.rideRecord.rebuild();

    // 地図を再描画
    if (NORIRECO.map.instance && dotLayerRef) {
      allLayers.forEach(l => { try { NORIRECO.map.instance.removeLayer(l); } catch(e){} });
      allLayers.length = 0;
      dotLayerRef.clearLayers();
      if (labelLayerRef) labelLayerRef.clearLayers();
      drawLines();
      updateOverlays();
    }
    updateStorageUI(trips.length, 'supabase');
    // Supabase 同期後にも自動獲得チェック
    setTimeout(() => runCharacterGrantCheck(), 600);
  } catch(e) {
    console.error('[乗レコ] Supabase同期エラー:', e);
  }
}

// localStorageから読み込み
function loadRiddenSegsFromStorage() {
  try {
    const trips = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
    if (trips.length === 0) return null;
    const filtered = filterTripsByDate(trips);
    const segs = tripsToSegs(filtered);
    const f = window._tripDateFilter || { mode: 'all' };
    console.log(`[乗レコ] localStorage: ${trips.length}件 [期間=${f.mode}] → ${filtered.length}件 → ${segs.length}区間`);
    return segs;
  } catch(e) {
    return null;
  }
}

// RIDDEN_SEGS = localStorage優先、なければ静的データ（可変配列）
const RIDDEN_SEGS = loadRiddenSegsFromStorage() || [...RIDDEN_SEGS_STATIC];

function getStorageStats() {
  try {
    const trips = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
    return { count: trips.length, source: trips.length > 0 ? 'local' : 'static' };
  } catch(e) { return { count: 0, source: 'static' }; }
}

function updateStorageUI(count, source) {
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
    lbl.textContent = '📄 静的データ';
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

function lStats(line){const t=line.stations.length,r=riddenSt[line.id]?riddenSt[line.id].size:0;return{t,r,pct:t>0?Math.round(r/t*100):0};}

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
function gStats(){
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
window.filterTripsByDate = filterTripsByDate;
window.updateDateFilterUI = updateDateFilterUI;
window.setDateFilter = setDateFilter;
window.toggleCustomDateFilter = toggleCustomDateFilter;
window.closeCustomDateFilter = closeCustomDateFilter;
window.applyCustomDateFilter = applyCustomDateFilter;
window.toggleUntilMonthFilter = toggleUntilMonthFilter;
window.closeUntilMonthFilter = closeUntilMonthFilter;
window.applyUntilMonthFilter = applyUntilMonthFilter;
window.syncFromSupabase = syncFromSupabase;
window.getStorageStats = getStorageStats;
window.updateStorageUI = updateStorageUI;
window.lStats = lStats;
window.gStats = gStats;
