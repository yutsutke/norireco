#!/usr/bin/env node
// v340: Phase C 漏れ補完 — 山陽電鉄の through_lines を追加
//
// v337 Phase C で grep '山陽電' を name/official_line で検索したため
// 「本線」「網干線」しか入っていない既存系統を見落とした。実際は:
//   - auto_本線_山陽電気鉄道 (43 駅、西代〜山陽姫路 + 神戸高速線経由で阪神元町直通)
//   - auto_網干線_山陽電気鉄道 (7 駅、飾磨〜山陽網干)
// 両方とも service_lines_master に既存。through_lines が未設定だったので追加。
//
// 直通先:
//   - 山陽電鉄本線 ↔ 阪神神戸高速線 (西代、直通特急 山陽姫路〜阪神大阪梅田)
//   - 山陽電鉄本線 ↔ 山陽電鉄網干線 (飾磨、社内接続)

const fs = require('fs');
const path = require('path');

const PATH = path.resolve(__dirname, '..', 'service_lines_master.json');
const raw = fs.readFileSync(PATH, 'utf8');
const data = JSON.parse(raw);

const lines = data.service_lines;
const lineById = new Map(lines.map(l => [l.id, l]));

const SANYO_MAIN  = 'auto_本線_山陽電気鉄道';
const SANYO_ABOSHI = 'auto_網干線_山陽電気鉄道';
const HANSHIN_KOSOKU = 'auto_神戸高速線_阪神電気鉄道';

const pairs = [
  [SANYO_MAIN, HANSHIN_KOSOKU, '西代', '直通特急 山陽姫路〜阪神大阪梅田'],
  [SANYO_MAIN, SANYO_ABOSHI, '飾磨', '山陽電鉄内 (本線/網干線)'],
];

function addRef(srcId, dstId, note) {
  const src = lineById.get(srcId);
  if (!src) { console.error(`!! missing line: ${srcId}`); process.exit(1); }
  if (!Array.isArray(src.through_lines)) src.through_lines = [];
  if (src.through_lines.includes(dstId)) {
    console.log(`= already set: ${srcId} -> ${dstId} (skip)`);
    return 0;
  }
  src.through_lines.push(dstId);
  console.log(`+ added: ${srcId} -> ${dstId}  (${note})`);
  return 1;
}

let added = 0;
for (const [a, b, station, trains] of pairs) {
  const note = `at ${station}, ${trains}`;
  added += addRef(a, b, note);
  added += addRef(b, a, note);
}

data.updated_at = new Date().toISOString().slice(0, 10);

// 整合性チェック
const ids = new Set(lines.map(l => l.id));
let broken = 0, unidi = 0;
for (const a of lines) {
  for (const b of (a.through_lines || [])) {
    if (!ids.has(b)) { broken++; console.error(`!! broken ref: ${a.id} -> ${b}`); continue; }
    if (!(lineById.get(b).through_lines || []).includes(a.id)) {
      unidi++;
      console.error(`!! unidirectional: ${a.id} -> ${b}`);
    }
  }
}
if (broken > 0 || unidi > 0) { console.error(`!! broken=${broken}, unidi=${unidi}. abort write.`); process.exit(1); }

fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
console.log(`\nwrote ${PATH}`);
console.log(`refs added: ${added}`);
console.log(`total service_lines: ${lines.length}`);
console.log(`broken refs: ${broken}, unidirectional refs: ${unidi}`);
