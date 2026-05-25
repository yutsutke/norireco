#!/usr/bin/env node
// v339: 山形/秋田 ミニ新幹線を独立系統として新設 (v334 青梅線方式)
//
// 山形新幹線つばさ: 福島〜新庄 11 駅 (奥羽本線の改軌区間を走る)
// 秋田新幹線こまち: 盛岡〜秋田 6 駅 (田沢湖線 + 奥羽本線 大曲〜秋田 の改軌区間)
//
// データ上は奥羽線/田沢湖線とは別系統として共存 (同一駅が複数系統に所属)。
// through_lines で東北新幹線と双方向接続 (福島/盛岡で併結)。
//
// 冪等: 既に追加済なら skip、broken refs == 0 + unidirectional refs == 0 を assert。

const fs = require('fs');
const path = require('path');

const PATH = path.resolve(__dirname, '..', 'service_lines_master.json');
const raw = fs.readFileSync(PATH, 'utf8');
const data = JSON.parse(raw);

const lines = data.service_lines;
const lineById = new Map(lines.map(l => [l.id, l]));

const TOHOKU_SHK = 'auto_東北新幹線_東日本旅客鉄道';

function mkStations(names) {
  return names.map((nm, i) => ({ order: i + 1, name: nm, n02_match: true }));
}

// 山形新幹線つばさ 停車駅 (福島〜新庄)
const yamagataStations = ['福島', '米沢', '高畠', '赤湯', 'かみのやま温泉', '山形', '天童', 'さくらんぼ東根', '村山', '大石田', '新庄'];

// 秋田新幹線こまち 停車駅 (盛岡〜秋田)
const akitaStations = ['盛岡', '雫石', '田沢湖', '角館', '大曲', '秋田'];

const newLines = [
  {
    id: 'yamagata_shinkansen',
    name: '山形新幹線',
    name_kana: 'やまがたしんかんせん',
    operator: 'JR東日本',
    operator_id: 'jr_east',
    color: '#B11283',  // E3/E8系つばさ紫
    official_line: '奥羽線',  // 実体は奥羽本線(福島〜新庄)を改軌 (N02 LINES.name='奥羽線' に合わせる)
    alias: ['つばさ'],
    through_lines: [TOHOKU_SHK],
    is_circular: false,
    parent_id: null,
    branch_from: null,
    branch_to: null,
    stations: mkStations(yamagataStations),
  },
  {
    id: 'akita_shinkansen',
    name: '秋田新幹線',
    name_kana: 'あきたしんかんせん',
    operator: 'JR東日本',
    operator_id: 'jr_east',
    color: '#BE0028',  // E6系こまちルージュ赤
    official_line: '田沢湖線',  // 実体は田沢湖線 + 奥羽本線(大曲〜秋田) の改軌。builder の overlap>=2 で奥羽線も candidate に入るため 'official_line' は田沢湖線のみで OK
    alias: ['こまち'],
    through_lines: [TOHOKU_SHK],
    is_circular: false,
    parent_id: null,
    branch_from: null,
    branch_to: null,
    stations: mkStations(akitaStations),
  },
];

for (const nl of newLines) {
  if (lineById.has(nl.id)) {
    console.log(`= already exists: ${nl.id} (skip add)`);
    continue;
  }
  lines.push(nl);
  lineById.set(nl.id, nl);
  console.log(`+ added: ${nl.id} (${nl.name}, ${nl.stations.length} stations, color=${nl.color})`);
}

// 東北新幹線側にも双方向 ref を追加
const tohoku = lineById.get(TOHOKU_SHK);
if (!tohoku) { console.error(`!! missing ${TOHOKU_SHK}`); process.exit(1); }
if (!Array.isArray(tohoku.through_lines)) tohoku.through_lines = [];
for (const targetId of ['yamagata_shinkansen', 'akita_shinkansen']) {
  if (tohoku.through_lines.includes(targetId)) {
    console.log(`= already set: ${TOHOKU_SHK} -> ${targetId}`);
  } else {
    tohoku.through_lines.push(targetId);
    console.log(`+ added: ${TOHOKU_SHK} -> ${targetId}`);
  }
}

data.updated_at = new Date().toISOString().slice(0, 10);

// 整合性チェック (broken refs + unidirectional refs)
const ids = new Set(lines.map(l => l.id));
let broken = 0;
let unidi = 0;
for (const a of lines) {
  for (const b of (a.through_lines || [])) {
    if (!ids.has(b)) { broken++; console.error(`!! broken ref: ${a.id} -> ${b}`); continue; }
    const bLine = lineById.get(b);
    if (!(bLine.through_lines || []).includes(a.id)) {
      unidi++;
      console.error(`!! unidirectional: ${a.id} -> ${b}`);
    }
  }
}
if (broken > 0 || unidi > 0) {
  console.error(`!! broken=${broken}, unidirectional=${unidi}. abort write.`);
  process.exit(1);
}

fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
console.log(`\nwrote ${PATH}`);
console.log(`total service_lines: ${lines.length}`);
console.log(`broken refs: ${broken}`);
console.log(`unidirectional refs: ${unidi}`);
