// 各駅の隣接駅までの距離 (km) から isolation_rank (0-6) を算出して
// merged_stations.json に書き戻す。
//
// rank 6: >=10km (超孤立、北海道・四国・山陰のローカル線)
// rank 5:  5-10km
// rank 4:  3-5km
// rank 3:  2-3km
// rank 2:  1-2km
// rank 1:  0.5-1km
// rank 0:  <0.5km (超密集: 東京山手内側など)
//
// 描画時: effectiveTier = max(stationTier, isolation_rank)
// で運用する想定。
const fs = require('fs');

const sl_data = JSON.parse(fs.readFileSync('service_lines_master.json','utf8'));
const ms_data = JSON.parse(fs.readFileSync('merged_stations.json','utf8'));

const slById = new Map();
for (const sl of sl_data.service_lines) slById.set(sl.id, sl);

const msByName = new Map();
for (const s of ms_data.stations) msByName.set(s.name, s);

function distKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const la1 = a.lat * Math.PI / 180;
  const la2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function rankFromKm(km) {
  if (km == null) return 0;
  if (km >= 10)  return 6;
  if (km >= 5)   return 5;
  if (km >= 3)   return 4;
  if (km >= 2)   return 3;
  if (km >= 1)   return 2;
  if (km >= 0.5) return 1;
  return 0;
}

const ranks = [0,0,0,0,0,0,0];
let missing = 0;
for (const s of ms_data.stations) {
  let minKm = Infinity;
  for (const slId of (s.lines || [])) {
    const sl = slById.get(slId);
    if (!sl || !sl.stations) continue;
    const idx = sl.stations.findIndex(x => x.name === s.name);
    if (idx < 0) continue;
    const prev = sl.stations[idx-1];
    const next = sl.stations[idx+1];
    for (const adj of [prev, next]) {
      if (!adj) continue;
      const ams = msByName.get(adj.name);
      const d = distKm(s, ams);
      if (d != null && d < minKm) minKm = d;
    }
  }
  if (minKm === Infinity) { minKm = null; missing++; }
  s.isolation_rank = rankFromKm(minKm);
  s.nearest_km = minKm == null ? null : Math.round(minKm * 10) / 10;
  ranks[s.isolation_rank]++;
}

console.log('rank 分布:');
for (let i = 6; i >= 0; i--) console.log(`  rank ${i}: ${ranks[i]} 駅`);
console.log(`隣接駅情報なし: ${missing} 駅 (rank 0 にフォールバック)`);

fs.writeFileSync('merged_stations.json', JSON.stringify(ms_data, null, 2));
console.log('merged_stations.json updated.');
