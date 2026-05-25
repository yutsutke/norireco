#!/usr/bin/env node
// v335: 新幹線 3 直通ペア (双方向) を through_lines に書き込む
//   - 東海道新幹線 ↔ 山陽新幹線 (新大阪 / のぞみ・ひかり)
//   - 山陽新幹線 ↔ 九州新幹線 (博多 / さくら・みずほ)
//   - 東北新幹線 ↔ 北海道新幹線 (新青森 / はやぶさ)
//
// 上越・北陸・西九州 は直通運転無し (今のところ) のため対象外。
// 山形/秋田ミニ新幹線は独立系統 (yamagata_shinkansen / akita_shinkansen) が未追加のため別フェーズ。
//
// 冪等: 既に書かれていれば skip、broken refs == 0 を assert してから write。

const fs = require('fs');
const path = require('path');

const PATH = path.resolve(__dirname, '..', 'service_lines_master.json');
const raw = fs.readFileSync(PATH, 'utf8');
const data = JSON.parse(raw);

const lines = data.service_lines;
const lineById = new Map(lines.map(l => [l.id, l]));

// id 定数 (typo 防止)
const TOKAIDO = 'auto_東海道新幹線_東海旅客鉄道';
const SANYO   = 'auto_山陽新幹線_西日本旅客鉄道';
const KYUSHU  = 'auto_九州新幹線_九州旅客鉄道';
const TOHOKU  = 'auto_東北新幹線_東日本旅客鉄道';
const HOKKAIDO = 'auto_北海道新幹線_北海道旅客鉄道';

// pair: 双方向に追加
const pairs = [
  [TOKAIDO, SANYO,   '新大阪',  'のぞみ・ひかり・さくら・みずほ'],
  [SANYO,   KYUSHU,  '博多',    'さくら・みずほ'],
  [TOHOKU,  HOKKAIDO, '新青森', 'はやぶさ'],
];

function addRef(srcId, dstId, note) {
  const src = lineById.get(srcId);
  if (!src) { console.error(`!! missing line: ${srcId}`); process.exit(1); }
  if (!Array.isArray(src.through_lines)) src.through_lines = [];
  if (src.through_lines.includes(dstId)) {
    console.log(`= already set: ${srcId} -> ${dstId} (skip)`);
    return;
  }
  src.through_lines.push(dstId);
  console.log(`+ added: ${srcId} -> ${dstId}  (${note})`);
}

for (const [a, b, station, trains] of pairs) {
  const note = `at ${station}, 列車: ${trains}`;
  addRef(a, b, note);
  addRef(b, a, note);
}

data.updated_at = new Date().toISOString().slice(0, 10);

// 整合性チェック
const ids = new Set(lines.map(l => l.id));
let broken = 0;
for (const l of lines) {
  for (const ref of (l.through_lines || [])) {
    if (!ids.has(ref)) {
      console.error(`!! broken ref: ${l.id} -> ${ref}`);
      broken++;
    }
  }
}
if (broken > 0) { console.error(`!! ${broken} broken refs remain. abort write.`); process.exit(1); }

fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
console.log(`\nwrote ${PATH}`);
console.log(`total service_lines: ${lines.length}`);
console.log(`through_lines broken refs: ${broken}`);
