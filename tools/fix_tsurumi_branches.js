// 鶴見線の支線を _b1 / _b2 に切り出す (v459)
//
// 【何が問題だったか】
// service_lines_master.json の 鶴見線 は、支線の駅を本線の配列に混ぜて 1 本で持っていた:
//   鶴見 国道 鶴見小野 弁天橋 [海芝浦 新芝浦] 浅野 安善 武蔵白石 [大川] 扇町 昭和 浜川崎
// 地図は営業系統の駅を配列順に直線で結ぶので、支線へ寄り道して戻る線と、
// 末尾の並び違い (正しくは 武蔵白石 → 浜川崎 → 昭和 → 扇町) が交差して見えていた。
//
// リポジトリには既に「分岐は親 id + _bN の別系統として持つ」規約があり (阪和線羽衣支線 /
// 京葉線二俣支線 / 成田線空港支線 など 19 本)、鶴見線だけそれをやっていなかった。
//
// 【この後】
//   node tools/fix_tsurumi_branches.js
//   node mcp/scripts/build-index.mjs   # MCP 側のインデックスも作り直す
//
// 冪等: 既に _b1 があれば何もしない。
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'service_lines_master.json');
const MAIN_ID = 'auto_鶴見線_東日本旅客鉄道';

// 座標で確認した実際の並び (merged_stations.json の lat/lon で検証済み)
const MAIN = ['鶴見', '国道', '鶴見小野', '弁天橋', '浅野', '安善', '武蔵白石', '浜川崎', '昭和', '扇町'];
const BRANCHES = [
  { suffix: '_b1', name: '鶴見線(海芝浦支線)', stations: ['浅野', '新芝浦', '海芝浦'] },
  { suffix: "_b2", name: "鶴見線(大川支線)", stations: ["武蔵白石", "大川"] },
];

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const lines = data.service_lines;
const mainIdx = lines.findIndex((l) => l.id === MAIN_ID);
if (mainIdx < 0) throw new Error(`${MAIN_ID} が見つかりません`);
if (lines.some((l) => l.id === `${MAIN_ID}_b1`)) {
  console.log('既に分割済みです (何もしませんでした)');
  process.exit(0);
}

const main = lines[mainIdx];
const known = new Set(main.stations.map((s) => s.name));
for (const n of [...MAIN, ...BRANCHES.flatMap((b) => b.stations)]) {
  if (!known.has(n)) throw new Error(`元データに ${n} がありません。並びを見直してください`);
}

const mkStations = (names) => names.map((name, i) => ({ order: i + 1, name, n02_match: true }));

main.stations = mkStations(MAIN);

const branchEntries = BRANCHES.map((b) => ({
  id: `${MAIN_ID}${b.suffix}`,
  name: b.name,
  operator: main.operator,
  operator_id: main.operator_id,
  color: main.color,
  official_line: main.official_line,
  alias: [],
  through_lines: [],
  is_circular: false,
  parent_id: MAIN_ID,
  branch_from: null,
  branch_to: null,
  auto_generated: true,
  stations: mkStations(b.stations),
}));

lines.splice(mainIdx + 1, 0, ...branchEntries);
data.updated_at = new Date().toISOString().slice(0, 10);
fs.writeFileSync(FILE, `${JSON.stringify(data, null, 2)}\n`);

console.log(`鶴見線を分割しました: 本線 ${MAIN.length} 駅 + ${branchEntries.map((b) => `${b.name} ${b.stations.length} 駅`).join(' + ')}`);
console.log('続けて `node mcp/scripts/build-index.mjs` を実行してください');
