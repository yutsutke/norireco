// ════════════════════════════════════════════════
// 路線データ遅延読み込みシステム
// JSON分離 + LODによるズームレベル別読み込み
// ════════════════════════════════════════════════
let LINES = [];

const loadedPriorities = new Set();
const pendingLoads = new Set();

// 運行系統定義 (running_services.json から読み込み)
let RUNNING_SERVICES = {};
async function loadRunningServices() {
  try {
    const res = await fetch('running_services.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    RUNNING_SERVICES = data.services || {};
    console.log(`[乗レコ] 運行系統 ${Object.keys(RUNNING_SERVICES).length}件 読込`);
  } catch (e) {
    console.warn('[乗レコ] running_services.json 読込失敗:', e.message);
  }
}

// 統合駅マスター: 同名近接駅を1点に集約 (Phase 1: 表示統合)
let MERGED_STATIONS = [];
// 営業系統 id → mergedStation 索引 (描画・lookup用)
let slMergedStationMap = new Map();

// ══════════════════════════════════════════════
// 駅キャラクター (Phase 2.5)
// characters_master.json + characters/*.svg
// ══════════════════════════════════════════════
const CHARACTERS = {};            // id → {meta, innerSvg}
const stationCharMap = new Map(); // station name → [character objects]

async function loadCharacters() {
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
        CHARACTERS[c.id] = { meta: c, innerSvg: inner };
        for (const sid of (c.station_ids || [])) {
          if (!stationCharMap.has(sid)) stationCharMap.set(sid, []);
          stationCharMap.get(sid).push(CHARACTERS[c.id]);
        }
      } catch(e) {
        console.warn(`[キャラ] ${c.id} 読込失敗:`, e.message);
      }
    }));
    console.log(`[乗レコ] キャラクター ${Object.keys(CHARACTERS).length}/${chars.length}体 読込`);
  } catch(e) {
    console.warn('[乗レコ] characters_master.json 読込失敗:', e.message);
  }
}

// ── 列車マスター (trains_master.json) ──
let TRAINS = [];                       // [{id, name, category, operator, ...}]
const TRAIN_CATEGORIES = {};            // id → {label, icon, default_rarity}
let selectedTrainId = null;             // マスター選択時の id (手入力なら null)
let selectedTrainName = null;           // 表示名 — マスター選択時=その name、手入力時=ユーザー入力文字列
let selectedTrainCategory = null;       // 選んだカテゴリ (手入力時もここに入る)
let selectedCarModel = null;            // 車両形式 (マスター選択 or 手入力)

async function loadTrains() {
  try {
    const res = await fetch('trains_master.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const master = await res.json();
    TRAINS = master.trains || [];
    Object.assign(TRAIN_CATEGORIES, master.categories || {});
    console.log(`[乗レコ] 列車マスター読込: ${TRAINS.length}種`);
  } catch (e) {
    console.warn('[乗レコ] trains_master.json 読込失敗:', e.message);
  }
}

// 列車セレクタ初期化 — 確認モーダルを開く時に呼ぶ
function resetTrainSelector() {
  selectedTrainId = null;
  selectedTrainName = null;
  selectedTrainCategory = null;
  selectedCarModel = null;
  const catSel       = document.getElementById('rec-train-category');
  const trainSel     = document.getElementById('rec-train-id');
  const trainCustom  = document.getElementById('rec-train-custom');
  const carSel       = document.getElementById('rec-car-model');
  const carCustom    = document.getElementById('rec-car-model-custom');
  if (!catSel) return;
  let catHtml = '<option value="">指定しない</option>';
  for (const [k, v] of Object.entries(TRAIN_CATEGORIES)) {
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
  selectedTrainId = null;
  selectedTrainName = null;
  selectedTrainCategory = cat || null;
  selectedCarModel = null;
  if (trainCustom) { trainCustom.value = ''; trainCustom.style.display = 'none'; }
  if (carSel)      { carSel.style.display = 'none'; }
  if (carCustom)   { carCustom.value = ''; carCustom.style.display = 'none'; }
  if (!cat) {
    if (trainSel) trainSel.style.display = 'none';
    return;
  }
  const trains = TRAINS.filter(t => t.category === cat)
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
  selectedTrainId = null;
  selectedTrainName = null;
  selectedCarModel = null;
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
  const t = TRAINS.find(x => x.id === tid);
  if (!t) return;
  selectedTrainId = tid;
  selectedTrainName = t.name;
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
  selectedTrainName = v || null;
  selectedTrainId = null; // 手入力は id 持たない (後で調査して埋める)
}
window.onTrainCustomInput = onTrainCustomInput;

function onCarModelChange() {
  const v = document.getElementById('rec-car-model').value;
  const carCustom = document.getElementById('rec-car-model-custom');
  if (v === '__custom__') {
    selectedCarModel = null;
    if (carCustom) { carCustom.style.display = 'block'; carCustom.focus(); }
    return;
  }
  if (carCustom) { carCustom.value = ''; carCustom.style.display = 'none'; }
  selectedCarModel = v || null;
}
window.onCarModelChange = onCarModelChange;

function onCarModelCustomInput() {
  const v = document.getElementById('rec-car-model-custom').value.trim();
  selectedCarModel = v || null;
}
window.onCarModelCustomInput = onCarModelCustomInput;

// キャラ表示モード (localStorage 永続化)
const CHAR_MODE_KEY = 'norireco_char_mode';
let charModeOn = (() => {
  try { return localStorage.getItem(CHAR_MODE_KEY) !== '0'; } catch(e) { return true; }
})();

function toggleCharacterMode() {
  charModeOn = !charModeOn;
  try { localStorage.setItem(CHAR_MODE_KEY, charModeOn ? '1' : '0'); } catch(e) {}
  const btn = document.getElementById('char-fab');
  if (btn) btn.classList.toggle('on', charModeOn);
  // 再描画
  if (typeof redrawAllLinesAfterTripChange === 'function') {
    redrawAllLinesAfterTripChange();
  }
}
