#!/usr/bin/env node
// merged_stations.json から「徒歩乗換可能な近接駅ペア」を自動抽出し
// walk_transfers.json として書き出す。
//
// 抽出条件:
//   - 駅名が異なる (同名は merged_stations 段階で既にマージ済 = ここで残るのは同名異所)
//   - 距離 < WALK_THRESHOLD_M (デフォ 400m)
//   - 両駅の lines (sl.id 配列) に共通要素が無い = 同じ系統で繋がる駅は乗換ではない
//   - 同名異所 (高松 3 駅等) はあえて除外しない:
//     - 距離が WALK_THRESHOLD_M 以内なら徒歩乗換扱い (例: 浅草 (銀座線) と 浅草 (浅草線) は別駅扱い、徒歩 200m)
//
// 出力: walk_transfers.json
//   { groups: [{ name, stations: [id...], max_walk_m, member_names: [...] }] }
//   ペアは transitive closure でグループ化 (A-B, B-C → A-B-C 1 グループ)
//
// 実行: node scripts/extract_walk_transfers.js

const fs = require('fs');
const path = require('path');

const WALK_THRESHOLD_M = 400; // 400m を上限、見落としを防ぐため広めに
const REPO_ROOT = path.resolve(__dirname, '..');

function distMeters(a, b) {
  const dLat = (a.lat - b.lat) * 111000;
  const dLon = (a.lon - b.lon) * 111000 * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180);
  return Math.hypot(dLat, dLon);
}

function main() {
  const ms = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'merged_stations.json'), 'utf8'));
  const stations = ms.stations;
  console.log(`[walk_transfers] loaded ${stations.length} merged stations`);

  // グリッド分割で総当り回避 (≒500m 角)
  const GRID = 0.005;
  const grid = new Map(); // key "ix,iy" → [station, ...]
  for (const s of stations) {
    const ix = Math.floor(s.lat / GRID);
    const iy = Math.floor(s.lon / GRID);
    const key = `${ix},${iy}`;
    let arr = grid.get(key);
    if (!arr) { arr = []; grid.set(key, arr); }
    arr.push(s);
  }

  // Union-Find for transitive grouping
  const parent = new Map();
  const find = (x) => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r);
    let c = x;
    while (parent.get(c) !== r) { const n = parent.get(c); parent.set(c, r); c = n; }
    return r;
  };
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  let pairCount = 0;
  let walkPairCount = 0;
  const walkPairs = []; // {a, b, dist}

  for (const s of stations) parent.set(s.id, s.id);

  for (const [key, bucket] of grid) {
    const [ix, iy] = key.split(',').map(Number);
    // 同 + 隣接 9 grid をチェック (1 度ペアごとに 2 回当たるが対称なので問題なし)
    for (let dx = 0; dx <= 1; dx++) {
      for (let dy = (dx === 0 ? 0 : -1); dy <= 1; dy++) {
        const nb = grid.get(`${ix + dx},${iy + dy}`);
        if (!nb) continue;
        for (const a of bucket) {
          for (const b of nb) {
            if (a.id >= b.id) continue; // 重複排除
            pairCount++;
            if (a.name === b.name) continue; // 同名は除外 (本来同一駅)
            const d = distMeters(a, b);
            if (d > WALK_THRESHOLD_M) continue;
            // 両駅の lines に共通要素があれば「乗換不要 (1 系統で繋がる)」なので skip
            const aLines = new Set(a.lines || []);
            const bLines = b.lines || [];
            let shared = false;
            for (const l of bLines) { if (aLines.has(l)) { shared = true; break; } }
            if (shared) continue;
            walkPairCount++;
            walkPairs.push({ aId: a.id, aName: a.name, bId: b.id, bName: b.name, dist: Math.round(d) });
            union(a.id, b.id);
          }
        }
      }
    }
  }
  console.log(`[walk_transfers] checked ${pairCount} pairs, found ${walkPairCount} walk pairs (< ${WALK_THRESHOLD_M}m, name diff, no shared line)`);

  // グループ化
  const groupMap = new Map(); // root id → { stations: Set<id>, names: Set<name>, max: number }
  for (const p of walkPairs) {
    const root = find(p.aId);
    let g = groupMap.get(root);
    if (!g) { g = { stations: new Set(), names: new Set(), max: 0 }; groupMap.set(root, g); }
    g.stations.add(p.aId);
    g.stations.add(p.bId);
    g.names.add(p.aName);
    g.names.add(p.bName);
    if (p.dist > g.max) g.max = p.dist;
  }

  const stById = new Map(stations.map(s => [s.id, s]));
  const groups = [];
  for (const [root, g] of groupMap) {
    const names = Array.from(g.names).sort();
    const stationsArr = Array.from(g.stations).sort();
    groups.push({
      name: names.join('・'),
      stations: stationsArr,
      max_walk_m: g.max,
      member_names: names,
    });
  }
  groups.sort((p, q) => (q.stations.length - p.stations.length) || p.name.localeCompare(q.name));

  console.log(`[walk_transfers] grouped into ${groups.length} groups`);
  // サンプル: 上位 15
  console.log('[walk_transfers] top 15 by member count:');
  for (const g of groups.slice(0, 15)) {
    console.log(`  ${g.stations.length} 駅: ${g.name} (max ${g.max_walk_m}m)`);
  }
  // 主要例の確認
  const known = ['函館', '函館駅前', '立川', '立川北', '西武秩父', '御花畑', '大宮', '浅草', '東京', '池袋', '名古屋'];
  console.log('[walk_transfers] 主要例:');
  for (const name of known) {
    const g = groups.find(g => g.member_names.includes(name));
    console.log(`  ${name} → ${g ? g.name + ` (${g.stations.length} 駅 / ${g.max_walk_m}m)` : '(no group)'}`);
  }

  // 出力
  const out = {
    updated_at: new Date().toISOString().slice(0, 10),
    note: `merged_stations.json から自動抽出 (距離 < ${WALK_THRESHOLD_M}m + 名前異なる + 系統重複なし)。手動修正は (TODO: 別ファイル) で上書き予定。`,
    threshold_m: WALK_THRESHOLD_M,
    groups,
  };
  fs.writeFileSync(path.join(REPO_ROOT, 'walk_transfers.json'), JSON.stringify(out, null, 2));
  console.log(`[walk_transfers] wrote walk_transfers.json (${groups.length} groups)`);
}

main();
