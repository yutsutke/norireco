// v330: 陸前山王 の SERVICE_LINE 配属を修正。
//
// v329 で誤って jr_tohoku_main_rifu (利府支線) に追加してしまった。
// 実際は東北本線 本線 (jr_tohoku_main_north) の 岩切〜国府多賀城 間にある駅。
// lines-p2.json でも branch:0 (本線) で並びは 岩切 (branch:0) ↔ 陸前山王 (branch:0) ↔ 国府多賀城 (branch:0)、
// 利府・新利府 は branch:1 (支線) で別系統。
//
// 修正内容:
//   - jr_tohoku_main_rifu から 陸前山王 を除去 (4 駅 → 3 駅、岩切→新利府→利府)
//   - jr_tohoku_main_north に 陸前山王 を 岩切 (order 45) と 国府多賀城 (order 46) の間に挿入
//   - merged_stations.json の陸前山王 (s_09030) の lines を ["jr_tohoku_main_rifu"] → ["jr_tohoku_main_north"]
//     (color は両線とも #F4A300 で同じ → 変更不要)
//
// 既定 dry-run。--write で実書き込み。
//
// 注: jr_joban_medium / jr_sanyo_main の v329 変更には触れない。

const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const ROOT = path.resolve(__dirname, '..');
const SL_PATH = path.join(ROOT, 'service_lines_master.json');
const MS_PATH = path.join(ROOT, 'merged_stations.json');

const sl = JSON.parse(fs.readFileSync(SL_PATH, 'utf8'));
const ms = JSON.parse(fs.readFileSync(MS_PATH, 'utf8'));

const lineById = new Map(sl.service_lines.map(l => [l.id, l]));

// --- 1. jr_tohoku_main_rifu から陸前山王を除去 ---
console.log('=== jr_tohoku_main_rifu ===');
const rifu = lineById.get('jr_tohoku_main_rifu');
const rifuIdx = rifu.stations.findIndex(s => s.name === '陸前山王');
if (rifuIdx < 0) {
  console.log('  · 陸前山王 が利府支線にいない (既に修正済?)');
} else {
  rifu.stations.splice(rifuIdx, 1);
  rifu.stations.forEach((s, i) => { s.order = i + 1; });
  console.log('  - 陸前山王 removed from 利府支線');
}
console.log('  現順序:', rifu.stations.map(s => `${s.order}:${s.name}`).join(' → '));

// --- 2. jr_tohoku_main_north に陸前山王を挿入 ---
console.log('\n=== jr_tohoku_main_north ===');
const north = lineById.get('jr_tohoku_main_north');
const exists = north.stations.some(s => s.name === '陸前山王');
if (exists) {
  console.log('  · 陸前山王 既に本線に存在 (idempotent skip)');
} else {
  const iwakiriIdx = north.stations.findIndex(s => s.name === '岩切');
  const kokufuIdx = north.stations.findIndex(s => s.name === '国府多賀城');
  if (iwakiriIdx < 0 || kokufuIdx < 0) throw new Error('岩切 or 国府多賀城 が本線にない');
  if (kokufuIdx - iwakiriIdx !== 1) throw new Error(`岩切-国府多賀城 隣接前提崩れ (${iwakiriIdx} → ${kokufuIdx})`);
  north.stations.splice(iwakiriIdx + 1, 0, { order: 0, name: '陸前山王', n02_match: true });
  north.stations.forEach((s, i) => { s.order = i + 1; });
  console.log('  + 陸前山王 inserted between 岩切 and 国府多賀城');
}
console.log('  jr_tohoku_main_north 駅数:', north.stations.length);
// 周辺確認
const showIdx = north.stations.findIndex(s => s.name === '陸前山王');
for (let i = Math.max(0, showIdx - 2); i <= Math.min(north.stations.length - 1, showIdx + 2); i++) {
  console.log('  ', JSON.stringify(north.stations[i]));
}

// --- 3. merged_stations.json: 陸前山王 (s_09030) の lines を本線に差し替え ---
console.log('\n=== merged_stations.json ===');
const rikuzen = ms.stations.find(s => s.id === 's_09030');
if (!rikuzen) throw new Error('s_09030 (陸前山王) が merged_stations にない');
console.log('  before: lines=' + JSON.stringify(rikuzen.lines) + ' colors=' + JSON.stringify(rikuzen.colors));
const rifuIdxInMs = rikuzen.lines.indexOf('jr_tohoku_main_rifu');
if (rifuIdxInMs >= 0) {
  rikuzen.lines.splice(rifuIdxInMs, 1);
  rikuzen.colors.splice(rifuIdxInMs, 1);
}
if (!rikuzen.lines.includes('jr_tohoku_main_north')) {
  rikuzen.lines.push('jr_tohoku_main_north');
  rikuzen.colors.push('#F4A300');
}
console.log('  after:  lines=' + JSON.stringify(rikuzen.lines) + ' colors=' + JSON.stringify(rikuzen.colors));

// --- 書き出し ---
sl.updated_at = new Date().toISOString().slice(0, 10);
ms.updated_at = new Date().toISOString().slice(0, 10);

if (WRITE) {
  fs.writeFileSync(SL_PATH, JSON.stringify(sl, null, 2));
  fs.writeFileSync(MS_PATH, JSON.stringify(ms, null, 2));
  console.log('\n✓ wrote service_lines_master.json + merged_stations.json');
  console.log('  次は compute_isolation_rank.js を実行して isolation_rank を再計算');
} else {
  console.log('\n** dry-run **: run with --write to apply.');
}
