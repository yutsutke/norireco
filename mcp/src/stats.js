// 完駅率・完乗の集計。
//
// 【本体と同じ数字を出すこと】
// 本体 js/13a-stats.js の `computeCompletionStats()` の移植。マイページの
// 「🚃 完駅率」カードと同じ数字にならないと、AI に聞いた値とアプリの表示が食い違って
// どちらを信じればいいのか分からなくなる。そのため意図的に**本体と同じ数え方**に揃えている:
//
//   - 分母 = SERVICE_LINES の駅 id の集合 (重複排除)。merged_stations 全体ではない
//   - 区間の展開は **駅名で findIndex** (本体 13a-stats がそうしているため。04b は
//     v422 で id 優先に移行したが、完駅率カードを描いているのは 13a-stats の方)
//   - 乗換駅は「系統ごとに 1 駅」で数える系統単位と、ユニーク駅の 2 本立て
//   - 完乗 = その系統の全駅を踏んだ系統の数
//
// ここを「より正しく」書き換えたくなったら、本体も一緒に直すこと。片方だけ直すと
// 表示がずれる。
import INDEX from './data/lines-index.json';

const LINES = INDEX.lines;
// 区間ごとに 638 系統を線形探索すると無駄なので id 索引を作る (module 直下 = 起動時間の枠)
const BY_ID = new Map(LINES.map((l) => [l.id, l]));

const ST_NAME = 0;
const ST_ID = 1;
const ST_LAT = 3;
const ST_LON = 4;

function distKm(a, b) {
  const dLat = (a[ST_LAT] - b[ST_LAT]) * 111.0;
  const dLon = (a[ST_LON] - b[ST_LON]) * 111.0 * Math.cos(((a[ST_LAT] + b[ST_LAT]) / 2) * Math.PI / 180);
  return Math.hypot(dLat, dLon);
}

let _totals = null;
function totals() {
  if (_totals) return _totals;
  const ids = new Set();
  for (const line of LINES) for (const st of line.st) if (st[ST_ID]) ids.add(st[ST_ID]);
  _totals = { stations: ids.size, lines: LINES.length };
  return _totals;
}

/**
 * 旅程の配列から完駅率・完乗を集計する。
 * @param {object[]} trips norireco_trips の行 (segments を含むこと)
 */
export function computeCompletion(trips) {
  const byLine = new Map(); // line.id → Set(踏んだ駅 id)
  const ridden = new Set();
  let distanceKm = 0;
  let minutes = 0;
  let counted = 0;

  for (const trip of trips || []) {
    if (!Array.isArray(trip.segments)) continue;
    counted++;
    if (trip.total_minutes) minutes += trip.total_minutes;
    for (const seg of trip.segments) {
      const line = BY_ID.get(seg.lineId);
      if (!line) continue;
      const fromIdx = line.st.findIndex((s) => s[ST_NAME] === seg.from);
      const toIdx = line.st.findIndex((s) => s[ST_NAME] === seg.to);
      if (fromIdx < 0 || toIdx < 0) continue;
      const [a, b] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
      let set = byLine.get(line.id);
      if (!set) { set = new Set(); byLine.set(line.id, set); }
      for (let i = a; i <= b; i++) {
        const id = line.st[i][ST_ID];
        if (id) { set.add(id); ridden.add(id); }
      }
      for (let i = a; i < b; i++) distanceKm += distKm(line.st[i], line.st[i + 1]);
    }
  }

  const total = totals();
  const riddenByLine = {};
  for (const [id, set] of byLine) riddenByLine[id] = set.size;
  let riddenLines = 0;
  let complete = 0;
  const partial = [];
  for (const line of LINES) {
    const n = byLine.get(line.id)?.size || 0;
    if (n === 0) continue;
    riddenLines++;
    if (n >= line.st.length) { complete++; continue; }
    const done = byLine.get(line.id);
    partial.push({
      line: line.name,
      line_id: line.id,
      ridden: n,
      total: line.st.length,
      remaining: line.st.filter((s) => !done.has(s[ST_ID])).map((s) => s[ST_NAME]),
    });
  }
  partial.sort((p, q) => p.remaining.length - q.remaining.length || q.ridden - p.ridden);

  return {
    station_rate: {
      pct: total.stations > 0 ? Math.round((ridden.size / total.stations) * 100) : 0,
      ridden: ridden.size,
      total: total.stations,
    },
    lines: { ridden: riddenLines, total: total.lines, complete },
    distance_km: Math.round(distanceKm),
    total_minutes: minutes,
    trips: counted,
    partial,
    riddenByLine,
  };
}

/** 1 系統ぶんの進捗 (「山手線あと何駅？」用) */
export function lineProgress(lineId, stats) {
  const line = BY_ID.get(lineId);
  if (!line) return null;
  const hit = stats.partial.find((p) => p.line_id === lineId);
  if (hit) return hit;
  // partial に居ない = 完乗しているか、1 駅も乗っていないかのどちらか
  const ridden = stats.riddenByLine[lineId] || 0;
  return {
    line: line.name,
    line_id: line.id,
    ridden,
    total: line.st.length,
    remaining: ridden >= line.st.length ? [] : line.st.map((s) => s[ST_NAME]),
    complete: ridden >= line.st.length || undefined,
  };
}
