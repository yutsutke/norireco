// ════════════════════════════════════════════════
// 路線データ遅延読み込みシステム
// JSON分離 + LODによるズームレベル別読み込み
// ════════════════════════════════════════════════

// v200 ES Modules パイロット (案 β) — データドメイン state を window.NORIRECO.data に集約。
// 案 β 5 ドメイン目、最大規模 (state 11 個 / 15 ファイル / 146 cross-file 参照)。
// 外部 (全 18 ファイルから参照あり) は NORIRECO.data.X、内部 (02) は D.X 短縮。
//
// v219 ES Modules パイロット (案 β) stage 2: `<script type="module">` 化、**全 18 ファイル module 化完結**。
// loadX 系 / 列車セレクタ系の関数を末尾で window 公開。
//
// v225 ES Modules stage 3: 07-record-mode.redrawAllLinesAfterTripChange を import 化。
import { redrawAllLinesAfterTripChange } from './07-record-mode.js';

window.NORIRECO = window.NORIRECO || {};
NORIRECO.data = NORIRECO.data || {
  LINES: [],                       // N02 物理路線 (606) — central master
  RUNNING_SERVICES: {},            // running_services.json (後方互換のみ)
  MERGED_STATIONS: [],             // 統合駅 (9017)
  slMergedStationMap: new Map(),   // 営業系統 id → mergedStation 索引
  SERVICE_LINES_MASTER: null,      // service_lines_master.json
  SERVICE_LINES: [],               // 駅座標解決済み + 候補 N02 id 付き (637+α)
  serviceLinesLoaded: false,
  serviceLinesBuilt: false,
  CHARACTERS: {},                  // id → {meta, innerSvg}
  stationCharMap: new Map(),       // station name → [character objects]
  charModeOn: false,               // 🎭 キャラ表示 ON/OFF (init で localStorage から復元)
};
const D = NORIRECO.data;

// 内部 state (02 内のみで参照されるため NORIRECO.data には載せない)
const loadedPriorities = new Set();
const pendingLoads = new Set();

// 優先度別JSONファイル（N02-25 全国データ・606路線・10154駅）
// v191 で 04-gps-location.js から移管
const PRIORITY_FILES = {
  1: 'lines-p1.json',  // 新幹線（ズーム5〜）
  2: 'lines-p2.json',  // JR在来線（ズーム7〜）
  3: 'lines-p3.json',  // 大手私鉄・都市鉄道（ズーム8〜）
  4: 'lines-p4.json',  // 地方鉄道・路面電車（ズーム10〜）
};

// ズームレベル→読み込む優先度の閾値
function getPriorityThreshold(zoom) {
  if (zoom >= 10) return 4;
  if (zoom >= 8) return 3;
  if (zoom >= 7) return 2;
  return 1;
}

// 路線データを非同期で読み込む
export async function loadLines(priority) {
  if (loadedPriorities.has(priority)) return;
  if (pendingLoads.has(priority)) {
    // 既に読み込み中なら完了を待つ
    return new Promise(resolve => {
      const check = setInterval(() => {
        if (loadedPriorities.has(priority) || !pendingLoads.has(priority)) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
  }
  pendingLoads.add(priority);

  const url = PRIORITY_FILES[priority];
  if (!url) { pendingLoads.delete(priority); return; }

  console.log(`[乗レコ] P${priority} fetch開始: ${url}`);
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const newLines = await resp.json();

    const existingIds = new Set(D.LINES.map(l => l.id));
    const added = newLines.filter(l => !existingIds.has(l.id));
    D.LINES.push(...added);

    loadedPriorities.add(priority);
    pendingLoads.delete(priority);

    console.log(`[乗レコ] P${priority}完了: +${added.length}路線（計${D.LINES.length}路線）`);

    NORIRECO.rideRecord.rebuild();
    // Phase 2: 描画は D.SERVICE_LINES 構築後の drawLines() に一任。
    // ここで個別 N02 line を描画する必要はない。
  } catch(e) {
    pendingLoads.delete(priority);
    loadedPriorities.add(priority); // エラーでも再試行しない
    console.error(`[乗レコ] P${priority}エラー:`, e);
  }
}

// 注: 以前 Supabase から路線・駅情報を取得する関数 (loadLinesFromSupabase /
// loadManualLinesFromSupabase) があったが、現状は lines-p?.json が唯一のソースのため削除
// Supabase の norireco_lines / norireco_stations テーブルも未使用

// ズームに応じて必要な優先度を読み込む
export async function loadLinesForZoom(zoom) {
  const maxP = getPriorityThreshold(zoom);
  for (let p = 1; p <= maxP; p++) {
    if (!loadedPriorities.has(p)) {
      loadLines(p); // 非同期で並行実行
    }
  }
}

// 運行系統定義 (running_services.json から読み込み) — state は NORIRECO.data.D.RUNNING_SERVICES
export async function loadRunningServices() {
  try {
    const res = await fetch('running_services.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    D.RUNNING_SERVICES = data.services || {};
    console.log(`[乗レコ] 運行系統 ${Object.keys(D.RUNNING_SERVICES).length}件 読込`);
  } catch (e) {
    console.warn('[乗レコ] running_services.json 読込失敗:', e.message);
  }
}

// 統合駅マスター: 同名近接駅を1点に集約 (Phase 1: 表示統合)
// state は NORIRECO.data.D.MERGED_STATIONS / .D.slMergedStationMap

// 統合駅マスターを読み込む (v191 で 04-gps-location.js から移管)
export async function loadMergedStations() {
  try {
    const res = await fetch('merged_stations.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    D.MERGED_STATIONS = data.stations || [];
    D.slMergedStationMap.clear();
    for (const ms of D.MERGED_STATIONS) {
      // 営業系統 id で索引
      for (const lid of (ms.lines || [])) {
        D.slMergedStationMap.set(`${lid}:${ms.name}`, ms);
      }
    }
    console.log(`[乗レコ] 統合駅 ${D.MERGED_STATIONS.length}駅 (索引 ${D.slMergedStationMap.size}件)`);
  } catch (e) {
    console.warn('[乗レコ] merged_stations.json 読込失敗:', e.message);
  }
}

// ── 営業系統マスター (service_lines_master.json) ── (v191 で 04-gps-location.js から移管)
// 物理路線(N02)とは別に、乗客視点の「営業系統」を polyline で重ね描き
// 路線一覧・統計タブの達成率計算もこちらをベースにする
// state は NORIRECO.data.{D.SERVICE_LINES_MASTER, D.SERVICE_LINES, D.serviceLinesLoaded, D.serviceLinesBuilt}

export async function loadServiceLinesMaster() {
  if (D.SERVICE_LINES_MASTER) return D.SERVICE_LINES_MASTER;
  try {
    const res = await fetch('service_lines_master.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    D.SERVICE_LINES_MASTER = data.service_lines || [];
    console.log(`[乗レコ] 営業系統 ${D.SERVICE_LINES_MASTER.length}系統 読込`);
    return D.SERVICE_LINES_MASTER;
  } catch (e) {
    console.warn('[乗レコ] service_lines_master.json 読込失敗:', e.message);
    D.SERVICE_LINES_MASTER = [];
    return D.SERVICE_LINES_MASTER;
  }
}

// ══════════════════════════════════════════════
// 駅キャラクター (Phase 2.5)
// characters_master.json + characters/*.svg
// state は NORIRECO.data.D.CHARACTERS / .D.stationCharMap
// ══════════════════════════════════════════════

export async function loadCharacters() {
  try {
    const res = await fetch('characters_master.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const master = await res.json();
    const chars = master.characters || [];
    await Promise.all(chars.map(async (c) => {
      try {
        const svgRes = await fetch(c.svg_path);
        if (!svgRes.ok) throw new Error(`HTTP ${svgRes.status}`);
        const txt = await svgRes.text();
        // <svg>...</svg> の中身だけ抽出 (描画時に外側 svg を再構築)
        const m = txt.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
        const inner = m ? m[1] : '';
        D.CHARACTERS[c.id] = { meta: c, innerSvg: inner };
        for (const sid of (c.station_ids || [])) {
          if (!D.stationCharMap.has(sid)) D.stationCharMap.set(sid, []);
          D.stationCharMap.get(sid).push(D.CHARACTERS[c.id]);
        }
      } catch(e) {
        console.warn(`[キャラ] ${c.id} 読込失敗:`, e.message);
      }
    }));
    console.log(`[乗レコ] キャラクター ${Object.keys(D.CHARACTERS).length}/${chars.length}体 読込`);
  } catch(e) {
    console.warn('[乗レコ] characters_master.json 読込失敗:', e.message);
  }
}

// ── 列車マスター (trains_master.json) ──
// v199 ES Modules パイロット (案 β) — 列車関連 state を window.NORIRECO.trains に集約。
// 外部 (07 / 09 / 13a) から参照あり。
window.NORIRECO = window.NORIRECO || {};
NORIRECO.trains = NORIRECO.trains || {
  TRAINS: [],                  // [{id, name, category, operator, ...}]
  TRAIN_CATEGORIES: {},        // id → {label, icon, default_rarity}
  selectedTrainId: null,       // マスター選択時の id (手入力なら null)
  selectedTrainName: null,     // 表示名 — マスター選択時=その name、手入力時=ユーザー入力文字列
  selectedTrainCategory: null, // 選んだカテゴリ (手入力時もここに入る)
  selectedCarModel: null,      // 車両形式 (マスター選択 or 手入力)
};
const T = NORIRECO.trains;

export async function loadTrains() {
  try {
    const res = await fetch('trains_master.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const master = await res.json();
    T.TRAINS = master.trains || [];
    Object.assign(T.TRAIN_CATEGORIES, master.categories || {});
    console.log(`[乗レコ] 列車マスター読込: ${T.TRAINS.length}種`);
  } catch (e) {
    console.warn('[乗レコ] trains_master.json 読込失敗:', e.message);
  }
}

// 列車セレクタ初期化 — 確認モーダルを開く時に呼ぶ
export function resetTrainSelector() {
  T.selectedTrainId = null;
  T.selectedTrainName = null;
  T.selectedTrainCategory = null;
  T.selectedCarModel = null;
  const catSel       = document.getElementById('rec-train-category');
  const trainSel     = document.getElementById('rec-train-id');
  const trainCustom  = document.getElementById('rec-train-custom');
  const carSel       = document.getElementById('rec-car-model');
  const carCustom    = document.getElementById('rec-car-model-custom');
  if (!catSel) return;
  let catHtml = '<option value="">指定しない</option>';
  for (const [k, v] of Object.entries(T.TRAIN_CATEGORIES)) {
    catHtml += `<option value="${k}">${v.icon || ''} ${v.label}</option>`;
  }
  catSel.innerHTML = catHtml;
  catSel.value = '';
  if (trainSel)    { trainSel.innerHTML = '<option value="">列車を選ぶ...</option>'; trainSel.style.display = 'none'; }
  if (trainCustom) { trainCustom.value = ''; trainCustom.style.display = 'none'; }
  if (carSel)      { carSel.innerHTML = '<option value="">車両形式を選ぶ (任意)...</option>'; carSel.style.display = 'none'; }
  if (carCustom)   { carCustom.value = ''; carCustom.style.display = 'none'; }
}

function onTrainCategoryChange() {
  const cat = document.getElementById('rec-train-category').value;
  const trainSel    = document.getElementById('rec-train-id');
  const trainCustom = document.getElementById('rec-train-custom');
  const carSel      = document.getElementById('rec-car-model');
  const carCustom   = document.getElementById('rec-car-model-custom');
  T.selectedTrainId = null;
  T.selectedTrainName = null;
  T.selectedTrainCategory = cat || null;
  T.selectedCarModel = null;
  if (trainCustom) { trainCustom.value = ''; trainCustom.style.display = 'none'; }
  if (carSel)      { carSel.style.display = 'none'; }
  if (carCustom)   { carCustom.value = ''; carCustom.style.display = 'none'; }
  if (!cat) {
    if (trainSel) trainSel.style.display = 'none';
    return;
  }
  const trains = T.TRAINS.filter(t => t.category === cat)
    .sort((a, b) => {
      // 廃止は末尾、その後は名前順
      if (!!a.discontinued !== !!b.discontinued) return a.discontinued ? 1 : -1;
      return (a.name || '').localeCompare(b.name || '', 'ja');
    });
  let html = '<option value="">列車を選ぶ...</option>';
  for (const t of trains) {
    const discTag = t.discontinued ? ' (廃止)' : '';
    const rarityTag = t.rarity === 'legendary' ? ' ⭐' : (t.rarity === 'rare' ? ' ✨' : '');
    html += `<option value="${t.id}">${t.name}${rarityTag}${discTag}</option>`;
  }
  // マニア向け: リストにない列車を手入力
  html += '<option value="__custom__">📝 リストにない (手入力)</option>';
  trainSel.innerHTML = html;
  trainSel.style.display = 'block';
}
window.onTrainCategoryChange = onTrainCategoryChange;

function onTrainChange() {
  const tid = document.getElementById('rec-train-id').value;
  const trainCustom = document.getElementById('rec-train-custom');
  const carSel      = document.getElementById('rec-car-model');
  const carCustom   = document.getElementById('rec-car-model-custom');
  T.selectedTrainId = null;
  T.selectedTrainName = null;
  T.selectedCarModel = null;
  if (carSel)    carSel.style.display = 'none';
  if (carCustom) { carCustom.value = ''; carCustom.style.display = 'none'; }
  // 手入力モード
  if (tid === '__custom__') {
    if (trainCustom) {
      trainCustom.style.display = 'block';
      trainCustom.focus();
    }
    // 車両形式は手入力欄を出しておく (マスターに無い列車なので車両形式リストも作れない)
    if (carCustom) carCustom.style.display = 'block';
    return;
  }
  if (trainCustom) { trainCustom.value = ''; trainCustom.style.display = 'none'; }
  if (!tid) return;
  // マスターから選んだ
  const t = T.TRAINS.find(x => x.id === tid);
  if (!t) return;
  T.selectedTrainId = tid;
  T.selectedTrainName = t.name;
  if (t.car_models && t.car_models.length > 0) {
    let html = '<option value="">車両形式を選ぶ (任意)...</option>';
    for (const m of t.car_models) html += `<option value="${m}">${m}</option>`;
    html += '<option value="__custom__">📝 リストにない (手入力)</option>';
    carSel.innerHTML = html;
    carSel.style.display = 'block';
  } else {
    // 車両形式マスターが無い列車は最初から手入力欄を出す
    if (carCustom) carCustom.style.display = 'block';
  }
}
window.onTrainChange = onTrainChange;

function onTrainCustomInput() {
  const v = document.getElementById('rec-train-custom').value.trim();
  T.selectedTrainName = v || null;
  T.selectedTrainId = null; // 手入力は id 持たない (後で調査して埋める)
}
window.onTrainCustomInput = onTrainCustomInput;

function onCarModelChange() {
  const v = document.getElementById('rec-car-model').value;
  const carCustom = document.getElementById('rec-car-model-custom');
  if (v === '__custom__') {
    T.selectedCarModel = null;
    if (carCustom) { carCustom.style.display = 'block'; carCustom.focus(); }
    return;
  }
  if (carCustom) { carCustom.value = ''; carCustom.style.display = 'none'; }
  T.selectedCarModel = v || null;
}
window.onCarModelChange = onCarModelChange;

function onCarModelCustomInput() {
  const v = document.getElementById('rec-car-model-custom').value.trim();
  T.selectedCarModel = v || null;
}
window.onCarModelCustomInput = onCarModelCustomInput;

// キャラ表示モード (localStorage 永続化) — state は NORIRECO.data.D.charModeOn
const CHAR_MODE_KEY = 'norireco_char_mode';
D.charModeOn = (() => {
  try { return localStorage.getItem(CHAR_MODE_KEY) !== '0'; } catch(e) { return true; }
})();

function toggleCharacterMode() {
  D.charModeOn = !D.charModeOn;
  try { localStorage.setItem(CHAR_MODE_KEY, D.charModeOn ? '1' : '0'); } catch(e) {}
  const btn = document.getElementById('char-fab');
  if (btn) btn.classList.toggle('on', D.charModeOn);
  // 再描画
  redrawAllLinesAfterTripChange();
}

// v219 stage 2: 外部 (02b/04/06/07 module + HTML) から bare 呼出される関数を window 公開
// v225 stage 3: loadX / resetTrainSelector は `export` 経由に移行。
// toggleCharacterMode は HTML onclick (char-fab) のため window 維持。
window.toggleCharacterMode = toggleCharacterMode;
