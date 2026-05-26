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
  WALK_TRANSFERS: null,            // v367: 徒歩乗換グループ (walk_transfers.json)
  walkTransferIndex: new Map(),    // v367: stationId → groupIdx 逆引き
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

// v367: 徒歩乗換グループ (walk_transfers.json) — scripts/extract_walk_transfers.js で自動抽出した
// 「名前異なる + 400m 以内 + 共通系統なし」の近接駅グループ。函館↔函館駅前、立川↔立川北↔立川南 等。
// オプションで walk_transfers_overrides.json (手動キュレーション) もマージする (add / remove_pairs)。
// 乗換候補抽出 (07-record-mode.js) で id 一致だけでなく「同一グループ内」も同一駅扱いにする。
export async function loadWalkTransfers() {
  if (D.WALK_TRANSFERS) return D.WALK_TRANSFERS;
  try {
    const res = await fetch('walk_transfers.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const groups = Array.isArray(data.groups) ? data.groups.map(g => ({ ...g, stations: g.stations.slice() })) : [];
    // overrides.json (任意ファイル) があれば適用
    try {
      const ovRes = await fetch('walk_transfers_overrides.json');
      if (ovRes.ok) {
        const ov = await ovRes.json();
        // add: 新規グループ (stations 配列で指定、既存と重複したらマージ)
        for (const g of (ov.add || [])) {
          if (!g.stations || g.stations.length < 2) continue;
          // 既存に重なるグループがあれば駅をマージ
          const overlap = groups.find(ex => g.stations.some(sid => ex.stations.includes(sid)));
          if (overlap) {
            for (const sid of g.stations) if (!overlap.stations.includes(sid)) overlap.stations.push(sid);
            if (g.max_walk_m && g.max_walk_m > (overlap.max_walk_m || 0)) overlap.max_walk_m = g.max_walk_m;
            if (g.note) overlap.note = (overlap.note || '') + ' / ' + g.note;
          } else {
            groups.push({ name: g.name || g.stations.join('+'), stations: g.stations.slice(), max_walk_m: g.max_walk_m || null, note: g.note || null });
          }
        }
        // remove_pairs: 特定 station ペアを「徒歩乗換しない」扱いに (誤検出除去)
        // ペアのうち少なくとも片方が含まれるグループから両方の id を含む場合、片方を切る
        for (const pair of (ov.remove_pairs || [])) {
          if (!Array.isArray(pair) || pair.length !== 2) continue;
          const [a, b] = pair;
          for (const g of groups) {
            const ai = g.stations.indexOf(a);
            const bi = g.stations.indexOf(b);
            if (ai >= 0 && bi >= 0) {
              // 両方が同じグループ → b を外す (グループが 2 駅なら 1 駅になり実質無効化)
              g.stations.splice(bi, 1);
            }
          }
        }
        // 1 駅以下になったグループを除外
        for (let i = groups.length - 1; i >= 0; i--) if (groups[i].stations.length < 2) groups.splice(i, 1);
        console.log('[乗レコ] walk_transfers_overrides.json 適用済 (add ' + (ov.add?.length || 0) + ' / remove_pairs ' + (ov.remove_pairs?.length || 0) + ')');
      }
    } catch (e) { /* overrides は任意ファイル、無くてもエラーにしない */ }
    D.WALK_TRANSFERS = { ...data, groups };
    // 逆引き index
    D.walkTransferIndex.clear();
    for (let i = 0; i < groups.length; i++) {
      for (const sid of groups[i].stations) D.walkTransferIndex.set(sid, i);
    }
    console.log(`[乗レコ] 徒歩乗換 ${groups.length} グループ (${D.walkTransferIndex.size} 駅)`);
    return D.WALK_TRANSFERS;
  } catch (e) {
    console.warn('[乗レコ] walk_transfers.json 読込失敗:', e.message);
    D.WALK_TRANSFERS = { groups: [] };
    return D.WALK_TRANSFERS;
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
        // v324 (Phase 3): stationCharMap は駅 id (s_NNNNN) のみのキー。
        //   characters_master.json schema_v3 で station_names を撤去した。
        //   表示用駅名は MERGED_STATIONS から逆引き。
        const charObj = D.CHARACTERS[c.id];
        for (const sid of (c.station_ids || [])) {
          if (!D.stationCharMap.has(sid)) D.stationCharMap.set(sid, []);
          D.stationCharMap.get(sid).push(charObj);
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
  // v371→v374→v375: trip 単位値は撤去 → 全て per-segment Map (selectedXxxBySl) で管理。
  //   selectSlChip 切替時に現在 chip の DOM 値を Map に保存 → 新 chip の値を Map から復元 + DOM 反映。
  //   saveTrip 時に segments[i].train_category / train_id / train_name / car_model を Map から埋める。
  //   trip 直下の train_category / train_id / train_name / car_model は集約 (全 seg 一致なら値 / 不一致なら null)。
  //   後方互換のため selectedTrainId / Name / Category / CarModel は visit-only ケース (segments 空) でのみ
  //   使う「最後に触った値」として残す。chip がある場合は Map が真。
  selectedTrainId: null,
  selectedTrainName: null,
  selectedTrainCategory: null,
  selectedCarModel: null,
  selectedTrainCategoryBySl: {},  // { sl_id: category_string }
  selectedTrainIdBySl: {},        // { sl_id: train_id }
  selectedTrainNameBySl: {},      // { sl_id: train_name_string } (手入力ケース含む)
  selectedCarModelBySl: {},       // { sl_id: car_model_string }
  activeChipSlId: null,           // 現在 active な区間 chip の sl_id (Map 同期用)
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

// ── 営業系統×車両形式 (service_line_vehicles.json) ──
// v347 新規。Notion DB「営業系統×車両形式 DB」からエクスポートされた SL × 車両 索引。
// 記録モードの「車両形式を区間から候補に出す」UI で参照。
NORIRECO.serviceLineVehicles = NORIRECO.serviceLineVehicles || {
  bySlId: {},   // sl_id → [{vehicle, company, status, ...}]
  freight: [],  // JR貨物 (営業系統紐付け対象外)
  meta: null,
  loaded: false,
};

export async function loadServiceLineVehicles() {
  try {
    const res = await fetch('service_line_vehicles.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    NORIRECO.serviceLineVehicles.bySlId = data.by_sl_id || {};
    NORIRECO.serviceLineVehicles.freight = data.freight || [];
    NORIRECO.serviceLineVehicles.meta = data._meta || null;
    NORIRECO.serviceLineVehicles.loaded = true;
    const slCount = Object.keys(NORIRECO.serviceLineVehicles.bySlId).length;
    console.log(`[乗レコ] 営業系統×車両形式 読込: ${slCount} SLs / ${data._meta?.matched_records ?? '?'} records`);
  } catch (e) {
    console.warn('[乗レコ] service_line_vehicles.json 読込失敗:', e.message);
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
  // v353: 「普通」(local) を先頭に。一番多い選択肢なのでアクセス性を優先。それ以外は元の順序維持
  const catEntries = Object.entries(T.TRAIN_CATEGORIES).sort((a, b) => {
    if (a[0] === 'local') return -1;
    if (b[0] === 'local') return 1;
    return 0;
  });
  for (const [k, v] of catEntries) {
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
  // v375: per-seg Map にも書き込み (active chip 紐付け)。category 変更時、同じ chip の
  //   train_id / train_name / car_model はカテゴリと矛盾するのでクリア。
  T.selectedTrainCategoryBySl = T.selectedTrainCategoryBySl || {};
  T.selectedTrainIdBySl = T.selectedTrainIdBySl || {};
  T.selectedTrainNameBySl = T.selectedTrainNameBySl || {};
  T.selectedCarModelBySl = T.selectedCarModelBySl || {};
  if (T.activeChipSlId) {
    T.selectedTrainCategoryBySl[T.activeChipSlId] = cat || null;
    T.selectedTrainIdBySl[T.activeChipSlId] = null;
    T.selectedTrainNameBySl[T.activeChipSlId] = null;
    T.selectedCarModelBySl[T.activeChipSlId] = null;
  }
  if (trainCustom) { trainCustom.value = ''; trainCustom.style.display = 'none'; }
  if (carSel)      { carSel.style.display = 'none'; }
  if (carCustom)   { carCustom.value = ''; carCustom.style.display = 'none'; }
  if (trainSel)    { trainSel.style.display = 'none'; }
  // v352→v375: applyRecTrainCategory は表示切替のみ、列車 dropdown populate は selectSlChip 内で
  //   per-seg restore の一環として行う。populateSlVehiclePicker が selectSlChip(slIds[0]) を呼び、
  //   そこで catRestored に応じて sl-block / cascade の populate と value 復元が走る。
  if (window.applyRecTrainCategory) window.applyRecTrainCategory(cat);
  if (window.populateSlVehiclePicker) window.populateSlVehiclePicker();
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
  // v375: per-seg Map にも書き込み
  T.selectedTrainIdBySl = T.selectedTrainIdBySl || {};
  T.selectedTrainNameBySl = T.selectedTrainNameBySl || {};
  T.selectedCarModelBySl = T.selectedCarModelBySl || {};
  if (T.activeChipSlId) {
    T.selectedTrainIdBySl[T.activeChipSlId] = null;
    T.selectedTrainNameBySl[T.activeChipSlId] = null;
    T.selectedCarModelBySl[T.activeChipSlId] = null;
  }
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
  // v375: per-seg Map に train_id / train_name 書き込み
  if (T.activeChipSlId) {
    T.selectedTrainIdBySl[T.activeChipSlId] = tid;
    T.selectedTrainNameBySl[T.activeChipSlId] = t.name || null;
  }
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
  // v375: per-seg Map にも書き込み
  T.selectedTrainNameBySl = T.selectedTrainNameBySl || {};
  T.selectedTrainIdBySl = T.selectedTrainIdBySl || {};
  if (T.activeChipSlId) {
    T.selectedTrainNameBySl[T.activeChipSlId] = v || null;
    T.selectedTrainIdBySl[T.activeChipSlId] = null;
  }
}
window.onTrainCustomInput = onTrainCustomInput;

function onCarModelChange() {
  const v = document.getElementById('rec-car-model').value;
  const carCustom = document.getElementById('rec-car-model-custom');
  if (v === '__custom__') {
    T.selectedCarModel = null;
    if (carCustom) { carCustom.style.display = 'block'; carCustom.focus(); }
    // v375: __custom__ 選択時は Map もクリア (custom input が更新で書き込む)
    T.selectedCarModelBySl = T.selectedCarModelBySl || {};
    if (T.activeChipSlId) T.selectedCarModelBySl[T.activeChipSlId] = null;
    return;
  }
  if (carCustom) { carCustom.value = ''; carCustom.style.display = 'none'; }
  T.selectedCarModel = v || null;
  // v375: per-seg Map にも書き込み
  T.selectedCarModelBySl = T.selectedCarModelBySl || {};
  if (T.activeChipSlId) T.selectedCarModelBySl[T.activeChipSlId] = v || null;
}
window.onCarModelChange = onCarModelChange;

function onCarModelCustomInput() {
  const v = document.getElementById('rec-car-model-custom').value.trim();
  T.selectedCarModel = v || null;
  // v375: per-seg Map にも書き込み
  T.selectedCarModelBySl = T.selectedCarModelBySl || {};
  if (T.activeChipSlId) T.selectedCarModelBySl[T.activeChipSlId] = v || null;
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
