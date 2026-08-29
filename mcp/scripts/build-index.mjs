// ═══════════════════════════════════════════════════════════════════════
// build-index.mjs — MCP サーバが積む「系統 × 駅」インデックスを生成する
//
// 【なぜ必要か】
// MCP サーバ (Cloudflare Worker) は「中央線の新宿→八王子」のような入力を
// lineId + 駅 id (s_NNNNN) に解決しないと trip を保存できない。その解決には
// 本来 service_lines_master.json (1.3MB) + lines-p1〜p4.json (1MB) +
// merged_stations.json (3.3MB) の 3 種が要るが、5.6MB を Worker で毎回
// fetch + JSON.parse するのは起動 CPU 的に無理がある。
// → ビルド時に「系統 id / 名前 / 事業者 / 駅名と駅 id の並び」だけに絞った
//   インデックス (~400KB) を作って Worker にバンドルする。
//
// 【重要 — 駅 id の解決は本体と同じ手順でなければならない】
// js/02b-service-lines-builder.js の build() が SERVICE_LINES を組む手順を
// そのまま移植している (v293 の resolveStationId 含む):
//   1. lines-p*.json (N02 物理路線) から「路線 id → 駅名 → 座標」を引けるようにする
//   2. 営業系統ごとに候補 N02 路線を出す (id 一致 > 駅名重なり > official_line 前方一致)
//   3. 系統の駅名を候補路線の座標で解決する
//   4. その座標に一番近い同名の merged_stations 駅の id を採用する (同名異所対策)
// ここがずれると MCP 経由で保存した trip の from_id/to_id が本体とずれ、
// 地図が塗られない・完乗率に入らないという形で壊れる。マスターデータを
// 更新したら必ず本スクリプトを再実行すること。
//
// 【使い方】
//   node mcp/scripts/build-index.mjs
//   → mcp/src/data/lines-index.json を上書き (生成物も git に commit する)
// ═══════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// 実行時 (src/lines.js) と同じ関数を使う。別実装にすると索引と検索語がずれる。
import { normStation } from '../src/norm.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const OUT = path.join(HERE, '..', 'src', 'data', 'lines-index.json');

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

const master = readJson('service_lines_master.json');
// 徒歩乗換グループ (v367 で本体が使っているもの)。「新宿で降りて西武新宿から乗る」ような
// 別名の駅同士を同一乗換地点として扱うために要る。
const walkTransfers = readJson('walk_transfers.json');
const mergedStations = readJson('merged_stations.json').stations || [];
const LINES = [1, 2, 3, 4].flatMap((p) => readJson(`lines-p${p}.json`));

// ── 1. N02 物理路線ごとの「駅名 → 座標」(02b buildPerLineCoordMap と同じ、先勝ち) ──
const perLineMap = new Map();
for (const line of LINES) {
  let info = perLineMap.get(line.id);
  if (!info) {
    info = { name: line.name, stations: new Map() };
    perLineMap.set(line.id, info);
  }
  for (const st of line.stations || []) {
    if (!st.n || typeof st.lat !== 'number' || typeof st.lon !== 'number') continue;
    if (!info.stations.has(st.n)) info.stations.set(st.n, [st.lat, st.lon]);
  }
}

// ── 2. merged_stations の駅名逆引き (02b resolveStationId と同じ、同名は最近接) ──
const msByName = new Map();
for (const ms of mergedStations) {
  if (!msByName.has(ms.name)) msByName.set(ms.name, []);
  msByName.get(ms.name).push(ms);
}
function resolveStationId(name, lat, lon) {
  const cands = msByName.get(name);
  if (!cands || cands.length === 0) return null;
  if (cands.length === 1) return cands[0].id;
  let best = null;
  let bestD = Infinity;
  for (const c of cands) {
    const d = (c.lat - lat) ** 2 + (c.lon - lon) ** 2;
    if (d < bestD) { bestD = d; best = c.id; }
  }
  return best;
}

// 営業系統 id "auto_<n02_id>(_bN|_sN)?" → N02 id (02b deriveN02IdFromAutoId と同じ)
function deriveN02IdFromAutoId(slId) {
  if (!slId || !slId.startsWith('auto_')) return null;
  return slId.slice(5).replace(/_b\d+$/, '').replace(/_s\d+$/, '');
}

// 駅座標 → 地域名 (02b regionOf と同じ。同名駅の見分け用ラベルに使う)
function regionOf(lat, lon) {
  if (lat >= 41.3) return '北海道';
  if (lat >= 34.9 && lat <= 37.0 && lon >= 138.5 && lon <= 141.5) return '関東';
  if (lat >= 37.0 && lat <= 41.3 && lon >= 138.5) return '東北';
  if (lat >= 34.5 && lat <= 37.5 && lon >= 136.0 && lon <= 139.5) return '東海・中部';
  if (lat >= 33.5 && lat <= 35.8 && lon >= 134.5 && lon <= 137.0) return '関西';
  if (lat >= 33.5 && lat <= 35.8 && lon >= 130.85 && lon <= 134.5) return '中国・山陰';
  if (lat >= 32.7 && lat <= 34.5 && lon >= 132.0 && lon <= 135.0) return '四国';
  if (lat <= 34.0 && lon <= 132.0) return '九州';
  if (lat <= 27.0) return '九州';
  return null;
}

// ── 3. 営業系統ごとに駅を解決 ──
const lines = [];
let droppedLines = 0;
let droppedStations = 0;
let nullIds = 0;

for (const sl of master.service_lines || []) {
  const sourceN02Id = deriveN02IdFromAutoId(sl.id);
  const masterNames = new Set((sl.stations || []).map((s) => s.name));
  const candidates = [];
  for (const [n02Id, info] of perLineMap) {
    let overlap = 0;
    for (const n of masterNames) if (info.stations.has(n)) overlap++;
    const idMatch = sourceN02Id && sourceN02Id === n02Id;
    const officialMatch = sl.official_line && info.name && info.name.startsWith(sl.official_line);
    if (idMatch || overlap >= 2 || officialMatch) {
      candidates.push({ n02Id, info, overlap, idMatch, officialMatch });
    }
  }
  candidates.sort((a, b) => (b.idMatch - a.idMatch) || (b.overlap - a.overlap) || (b.officialMatch - a.officialMatch));

  const st = [];
  const coords = [];
  for (const s of sl.stations || []) {
    let coord = null;
    for (const c of candidates) {
      if (c.info.stations.has(s.name)) { coord = c.info.stations.get(s.name); break; }
    }
    if (!coord) { droppedStations++; continue; }
    const id = resolveStationId(s.name, coord[0], coord[1]);
    if (!id) nullIds++;
    // 3 要素目は正規化済みの駅名。実行時の索引構築を軽くするために焼き込む
    st.push([s.name, id, normStation(s.name)]);
    coords.push({ lat: coord[0], lon: coord[1] });
  }
  // 02b と同じ足切り: 座標が付いた駅が 2 未満の系統は SERVICE_LINES に載らない
  if (st.length < 2) { droppedLines++; continue; }

  // 地域ラベル: 両端と中央の 3 点で多数決 (02b detectServiceLineGroup の region 部分)
  const samples = [coords[0], coords[Math.floor(coords.length / 2)], coords[coords.length - 1]];
  const counts = {};
  for (const s of samples) {
    const r = regionOf(s.lat, s.lon);
    if (r) counts[r] = (counts[r] || 0) + 1;
  }
  let region = null;
  let max = 0;
  for (const [r, c] of Object.entries(counts)) if (c > max) { region = r; max = c; }

  lines.push({
    id: sl.id,
    name: sl.name || sl.id,
    kana: sl.name_kana || '',
    alias: Array.isArray(sl.alias) ? sl.alias : [],
    operator: sl.operator || '',
    region: region || '',
    circular: !!sl.is_circular,
    // 直通系統。乗換候補で「実は直通電車で乗換不要」を優先表示するのに使う (v366 と同じ狙い)
    through: Array.isArray(sl.through_lines) ? sl.through_lines : [],
    st,
  });
}

// 徒歩乗換グループは駅 id の配列だけ持てば足りる (名前は lines 側から引ける)
const walkGroups = (walkTransfers.groups || [])
  .map((g) => (g.stations || []).filter(Boolean))
  .filter((ids) => ids.length >= 2);

const index = {
  built_at: new Date().toISOString().slice(0, 10),
  source_updated_at: master.updated_at || '',
  note: 'mcp/scripts/build-index.mjs の生成物。手で編集しないこと。',
  lines,
  walk_groups: walkGroups,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(index));

const bytes = fs.statSync(OUT).size;
const stationCount = lines.reduce((n, l) => n + l.st.length, 0);
console.log(`build-index: ${lines.length} 系統 / ${stationCount} 駅 → ${OUT} (${(bytes / 1024).toFixed(0)} KB)`);
console.log(`  座標が引けず落とした駅: ${droppedStations} / 駅 2 未満で落とした系統: ${droppedLines} / 駅 id が付かなかった駅: ${nullIds}`);
console.log(`  直通を持つ系統: ${lines.filter((l) => l.through.length > 0).length} / 徒歩乗換グループ: ${walkGroups.length}`);
