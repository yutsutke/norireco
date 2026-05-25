// v328: lines-p?.json にあるが merged_stations.json に欠落していた 13 駅を補完する。
// 常磐線 (震災区間) 11 駅 + 山陽線 はりま勝原・英賀保 + 東北線 陸前山王。
//
// 座標は lines-p2.json から流用 (国土地理院 N02 ベース)。
// SERVICE_LINES (jr_joban_medium 等) には現状含まれていない区間なので lines/colors は空で追加。
// isolation_rank は compute_isolation_rank.js の挙動に合わせて lines:[] のとき 0 / null。
//
// 既定 dry-run。--write で実書き込み。

const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const ROOT = path.resolve(__dirname, '..');
const MS_PATH = path.join(ROOT, 'merged_stations.json');

const NEW = [
  { name: 'はりま勝原', lat: 34.81016, lon: 134.61428, n02: '山陽線_西日本旅客鉄道' },
  { name: '英賀保',     lat: 34.81337, lon: 134.64477, n02: '山陽線_西日本旅客鉄道' },
  { name: '逢隈',       lat: 38.06762, lon: 140.85475, n02: '常磐線_東日本旅客鉄道' },
  { name: '亘理',       lat: 38.03988, lon: 140.86129, n02: '常磐線_東日本旅客鉄道' },
  { name: '浜吉田',     lat: 38.00222, lon: 140.89008, n02: '常磐線_東日本旅客鉄道' },
  { name: '山下',       lat: 37.96632, lon: 140.88898, n02: '常磐線_東日本旅客鉄道' },
  { name: '坂元',       lat: 37.92408, lon: 140.90105, n02: '常磐線_東日本旅客鉄道' },
  { name: '新地',       lat: 37.87922, lon: 140.92564, n02: '常磐線_東日本旅客鉄道' },
  { name: '駒ヶ嶺',     lat: 37.84237, lon: 140.92508, n02: '常磐線_東日本旅客鉄道' },
  { name: '相馬',       lat: 37.80248, lon: 140.92572, n02: '常磐線_東日本旅客鉄道' },
  { name: '日立木',     lat: 37.75613, lon: 140.93466, n02: '常磐線_東日本旅客鉄道' },
  { name: '鹿島',       lat: 37.70284, lon: 140.97008, n02: '常磐線_東日本旅客鉄道' },
  { name: '陸前山王',   lat: 38.29959, lon: 140.97948, n02: '東北線_東日本旅客鉄道' },
];

const ms = JSON.parse(fs.readFileSync(MS_PATH, 'utf8'));
const existingIds = new Set(ms.stations.map(s => s.id));

let nextNum = ms.stations.length + 1;
const added = [];
for (const n of NEW) {
  let id;
  do {
    id = 's_' + String(nextNum++).padStart(5, '0');
  } while (existingIds.has(id));
  existingIds.add(id);
  const entry = {
    id,
    name: n.name,
    lat: n.lat,
    lon: n.lon,
    lines: [],
    colors: [],
    n02_lines: [n.n02],
    isolation_rank: 0,
    nearest_km: null,
  };
  ms.stations.push(entry);
  added.push(entry);
}

ms.updated_at = new Date().toISOString().slice(0, 10);
// note は更新しない (経緯は CHANGELOG v328 参照)

console.log('=== 追加予定 ===');
for (const e of added) {
  console.log(`  ${e.id}  ${e.name.padEnd(10)} (${e.lat}, ${e.lon})  n02=${e.n02_lines[0]}`);
}
console.log(`\ntotal stations: ${ms.stations.length - added.length} → ${ms.stations.length}`);

if (WRITE) {
  fs.writeFileSync(MS_PATH, JSON.stringify(ms, null, 2));
  console.log('\n✓ wrote merged_stations.json');
} else {
  console.log('\n** dry-run **: run with --write to apply.');
}
