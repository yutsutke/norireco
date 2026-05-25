// lines-p?.json の各駅に id (s_NNNNN) を付与する。merged_stations.json と照合。
//
// 照合キー: (name + 座標近接)。merged_stations には国土地理院 c コードが無いため、
// 同名候補から最近接 1 件を採用。距離閾値 0.5km 超は警告。
//
// 既定 dry-run。--write で実書き込み。
//
// 元ファイルのフォーマット (1 路線 = 1 行) を保つため独自シリアライズ。

const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const ROOT = path.resolve(__dirname, '..');

const ms = JSON.parse(fs.readFileSync(path.join(ROOT, 'merged_stations.json'), 'utf8'));
const msByName = new Map();
for (const s of ms.stations) {
  const arr = msByName.get(s.name) || [];
  arr.push(s);
  msByName.set(s.name, arr);
}

function distKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const la1 = a.lat * Math.PI / 180;
  const la2 = b.lat * Math.PI / 180;
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(aa));
}

const FILES = ['lines-p1.json', 'lines-p2.json', 'lines-p3.json', 'lines-p4.json'];

const stats = {
  totalSt: 0,
  exact: 0,    // single candidate, <0.5km
  near: 0,     // multi candidates, <0.5km (座標で選んだ)
  far: 0,      // >=0.5km (あやしい)
  missing: 0,  // name match なし
};
const farLog = [];
const missingLog = [];

function formatLinesFile(lines) {
  return '[\n' + lines.map(l => JSON.stringify(l)).join(',\n') + '\n]\n';
}

for (const fname of FILES) {
  const fpath = path.join(ROOT, fname);
  const lines = JSON.parse(fs.readFileSync(fpath, 'utf8'));
  for (const line of lines) {
    for (const st of line.stations) {
      stats.totalSt++;
      const cands = msByName.get(st.n) || [];
      if (cands.length === 0) {
        stats.missing++;
        if (missingLog.length < 100) {
          missingLog.push(`${line.id} / ${st.n} (lat=${st.lat}, lon=${st.lon})`);
        }
        continue;
      }
      let best = cands[0];
      let bestD = distKm(st, cands[0]);
      for (let i = 1; i < cands.length; i++) {
        const d = distKm(st, cands[i]);
        if (d < bestD) { best = cands[i]; bestD = d; }
      }
      // 0.5km 超の最近接は「同名異所駅で誤マッチ」の危険があるため id 付与しない
      // (reader 側で name fallback に任せる)
      if (bestD >= 0.5) {
        stats.far++;
        if (farLog.length < 100) {
          farLog.push(`${line.id} / ${st.n} → (skip, nearest ${best.id} ${bestD.toFixed(2)}km away, ${cands.length} cand)`);
        }
        continue;
      }
      st.id = best.id;
      if (cands.length === 1) stats.exact++;
      else stats.near++;
    }
  }
  if (WRITE) {
    fs.writeFileSync(fpath, formatLinesFile(lines), 'utf8');
    console.log(`✓ wrote ${fname}`);
  }
}

console.log('\n=== 集計 ===');
console.log(`total stations (line × station):  ${stats.totalSt}`);
console.log(`exact (single cand, <0.5km):      ${stats.exact}`);
console.log(`near  (multi cand, <0.5km):       ${stats.near}`);
console.log(`far   (>=0.5km, suspicious):      ${stats.far}`);
console.log(`missing (no name match):          ${stats.missing}`);
const coverage = ((stats.exact + stats.near) / stats.totalSt * 100).toFixed(2);
console.log(`coverage (exact+near) / total:    ${coverage}%`);

if (farLog.length) {
  console.log('\n[far — 0.5km 以上離れた候補に当てた駅]');
  farLog.forEach(s => console.log('  ' + s));
  if (stats.far > farLog.length) console.log(`  ... and ${stats.far - farLog.length} more (truncated)`);
}
if (missingLog.length) {
  console.log('\n[missing — name 一致なし]');
  missingLog.forEach(s => console.log('  ' + s));
  if (stats.missing > missingLog.length) console.log(`  ... and ${stats.missing - missingLog.length} more (truncated)`);
}
if (!WRITE) console.log('\n** dry-run **: run with --write to apply.');
