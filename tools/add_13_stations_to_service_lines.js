// v329: v328 で merged_stations に追加した 13 駅を SERVICE_LINES に収録する。
//
// 対象:
//   - jr_joban_medium      ← 鹿島・日立木・相馬・駒ヶ嶺・新地・坂元・山下・浜吉田・亘理・逢隈・岩沼 を 原ノ町 (order 63) の後に追加
//                            (jr_joban_medium.name を 「品川〜原ノ町」→「品川〜岩沼」 に更新)
//                            岩沼は既存駅なので lines/colors のみ追記
//   - jr_sanyo_main        ← 英賀保・はりま勝原 を 姫路 (idx 0) と 網干 (idx 1) の間に挿入
//                            (網干以降の order を +2 シフト)
//   - jr_tohoku_main_rifu  ← 陸前山王 を 岩切 (idx 0) と 新利府 (idx 1) の間に挿入
//                            (新利府・利府の order を +1 シフト)
//
// merged_stations.json:
//   - 11 常磐線駅: lines に jr_joban_medium、colors に #2DA9DF を追加
//   - 岩沼 (s_04138): 同上 (既存 jr_tohoku_main_north に追加)
//   - 2 山陽線駅: lines に jr_sanyo_main、colors に #0072BC を追加
//   - 陸前山王: lines に jr_tohoku_main_rifu、colors に #F4A300 を追加
//
// isolation_rank の再計算は別途 tools/compute_isolation_rank.js を実行する。
//
// 既定 dry-run。--write で実書き込み (両ファイル)。

const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const ROOT = path.resolve(__dirname, '..');
const SL_PATH = path.join(ROOT, 'service_lines_master.json');
const MS_PATH = path.join(ROOT, 'merged_stations.json');

const sl = JSON.parse(fs.readFileSync(SL_PATH, 'utf8'));
const ms = JSON.parse(fs.readFileSync(MS_PATH, 'utf8'));

const lineById = new Map(sl.service_lines.map(l => [l.id, l]));
const msByName = new Map(ms.stations.map(s => [s.name, s]));

function addLineToMs(stName, lineId, color) {
  const m = msByName.get(stName);
  if (!m) { console.error('  ✗ MS not found:', stName); return false; }
  if (m.lines.includes(lineId)) {
    console.log(`  · MS ${stName} already has ${lineId}, skip`);
    return false;
  }
  m.lines.push(lineId);
  m.colors.push(color);
  console.log(`  + MS ${stName}: +${lineId} / ${color}  → lines=${JSON.stringify(m.lines)}`);
  return true;
}

function reorder(stations) {
  stations.forEach((s, i) => { s.order = i + 1; });
}

// --- 1. jr_joban_medium に 11 駅追加 + name 更新 ---
console.log('\n=== jr_joban_medium ===');
const joban = lineById.get('jr_joban_medium');
const JOBAN_APPEND = ['鹿島', '日立木', '相馬', '駒ヶ嶺', '新地', '坂元', '山下', '浜吉田', '亘理', '逢隈', '岩沼'];
const haranomachiIdx = joban.stations.findIndex(s => s.name === '原ノ町');
if (haranomachiIdx < 0) throw new Error('原ノ町 が jr_joban_medium にない');
const alreadyAppended = JOBAN_APPEND.every(n => joban.stations.some(s => s.name === n && joban.stations.indexOf(s) > haranomachiIdx));
if (alreadyAppended) {
  console.log('  · 11 駅は既に追加済 (idempotent skip)');
} else {
  for (const n of JOBAN_APPEND) {
    const exists = joban.stations.some(s => s.name === n);
    if (exists) {
      console.log(`  · ${n} は別位置で既存、skip (要手動確認)`);
      continue;
    }
    joban.stations.push({ order: 0, name: n, n02_match: true });
    console.log(`  + jr_joban_medium: append ${n}`);
  }
  reorder(joban.stations);
  joban.name = '常磐線中距離(品川〜岩沼)';
  console.log('  + name: → 「常磐線中距離(品川〜岩沼)」');
}
console.log('  jr_joban_medium 駅数:', joban.stations.length);

// MS 側更新 (11 駅 + 岩沼)
console.log('  --- merged_stations 更新 ---');
for (const n of JOBAN_APPEND) addLineToMs(n, 'jr_joban_medium', '#2DA9DF');

// --- 2. jr_sanyo_main に 英賀保 / はりま勝原 を 姫路 と 網干 の間に挿入 ---
console.log('\n=== jr_sanyo_main ===');
const sanyo = lineById.get('jr_sanyo_main');
const himejiIdx = sanyo.stations.findIndex(s => s.name === '姫路');
const aboshiIdx = sanyo.stations.findIndex(s => s.name === '網干');
if (himejiIdx < 0 || aboshiIdx < 0) throw new Error('姫路 or 網干 が jr_sanyo_main にない');
if (aboshiIdx - himejiIdx !== 1) throw new Error(`姫路-網干 隣接前提崩れ (idx ${himejiIdx} → ${aboshiIdx})`);
const sanyoAlready = sanyo.stations.some(s => s.name === '英賀保') && sanyo.stations.some(s => s.name === 'はりま勝原');
if (sanyoAlready) {
  console.log('  · 英賀保・はりま勝原 既に追加済 (idempotent skip)');
} else {
  sanyo.stations.splice(himejiIdx + 1, 0,
    { order: 0, name: '英賀保', n02_match: true },
    { order: 0, name: 'はりま勝原', n02_match: true },
  );
  reorder(sanyo.stations);
  console.log('  + insert 英賀保 / はりま勝原 between 姫路 and 網干');
}
console.log('  jr_sanyo_main 駅数:', sanyo.stations.length);
console.log('  --- merged_stations 更新 ---');
addLineToMs('英賀保', 'jr_sanyo_main', '#0072BC');
addLineToMs('はりま勝原', 'jr_sanyo_main', '#0072BC');

// --- 3. jr_tohoku_main_rifu に 陸前山王 を 岩切 と 新利府 の間に挿入 ---
console.log('\n=== jr_tohoku_main_rifu ===');
const rifu = lineById.get('jr_tohoku_main_rifu');
const iwakiriIdx = rifu.stations.findIndex(s => s.name === '岩切');
const shinrifuIdx = rifu.stations.findIndex(s => s.name === '新利府');
if (iwakiriIdx < 0 || shinrifuIdx < 0) throw new Error('岩切 or 新利府 が jr_tohoku_main_rifu にない');
const rifuAlready = rifu.stations.some(s => s.name === '陸前山王');
if (rifuAlready) {
  console.log('  · 陸前山王 既に追加済 (idempotent skip)');
} else {
  rifu.stations.splice(iwakiriIdx + 1, 0, { order: 0, name: '陸前山王', n02_match: true });
  reorder(rifu.stations);
  console.log('  + insert 陸前山王 between 岩切 and 新利府');
}
console.log('  jr_tohoku_main_rifu 駅順:', rifu.stations.map(s => `${s.order}:${s.name}`).join(' → '));
console.log('  --- merged_stations 更新 ---');
addLineToMs('陸前山王', 'jr_tohoku_main_rifu', '#F4A300');

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
