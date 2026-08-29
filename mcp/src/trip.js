// 解決済みの区間から norireco_trips の 1 行を組み立てる。
//
// 【ここが一番壊れやすい】
// 保存する形は本体 js/07-record-mode.js の saveMultiSegmentTrip() と
// js/21-bulk-record.js の _buildTripFromDraft() に完全に合わせる必要がある。
// ずれると「保存はできたのに地図が塗られない」「完乗率に入らない」「マイページで
// 表示が崩れる」という形で、保存した本人には気付きにくい壊れ方をする。
// 特に:
//   - segments[] は {lineId, from, to, from_id, to_id, train_*} の形 (from_station_id ではない)
//   - total_stations は両端を含む駅数、transfers は segments.length - 1
//   - date は NOT NULL なので date_precision='unknown' でも今日の日付を入れる
//   - 列車情報の trip 直下 (train_id 等) は「全区間で一致するときだけ値、違えば null」(v375)
import { resolveSegment } from './lines.js';

/** JST の YYYY-MM-DD。乗レコ は日本の鉄道が対象なので端末ロケールに依らず JST で数える。 */
export function todayJst(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(now);
}

// "9:05" / "09:05" / "09:05:00" → "09:05:00" (本体は HH:MM:SS で保存している)
function normalizeTime(t) {
  if (!t) return '';
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return '';
  const hh = String(Math.min(23, Number(m[1]))).padStart(2, '0');
  return `${hh}:${m[2]}:${m[3] || '00'}`;
}

function minutesBetween(depart, arrive) {
  if (!depart || !arrive) return 0;
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  let diff = toMin(arrive) - toMin(depart);
  if (diff < 0) diff += 24 * 60; // 日跨ぎ
  return diff;
}

/**
 * 入力 (AI が組んだ区間の並び) を解決する。
 * @returns {{ ok: true, segments: object[] } | { ok: false, error: string, candidates?: object[], at: number }}
 */
export function resolveSegments(inputSegments) {
  const resolved = [];
  for (let i = 0; i < inputSegments.length; i++) {
    const s = inputSegments[i];
    const r = resolveSegment({ line: s.line, from: s.from, to: s.to });
    if (!r.ok) return { ok: false, error: r.error, candidates: r.candidates, routes: r.routes, at: i + 1 };
    resolved.push({
      ...r.segment,
      train_category: s.train_category || null,
      train_id: null, // マスター照合は未対応。手入力扱い (train_id NULL + train_name あり) で保存する
      train_name: s.train_name || null,
      car_model: s.car_model || null,
    });
  }
  return { ok: true, segments: resolved };
}

// 全区間で一致するときだけ値を採る (本体 v375 と同じルール)
function aggregate(segments, key) {
  if (segments.length === 0) return null;
  const set = new Set(segments.map((s) => s[key] || ''));
  return (set.size === 1 && [...set][0]) ? [...set][0] : null;
}

/**
 * norireco_trips に POST する 1 行を組み立てる。
 * @param {object[]} segments  resolveSegments() の結果
 * @param {object} meta        date / date_precision / depart_time / arrive_time / notes / delay_minutes
 * @param {string} userId
 */
export function buildTrip(segments, meta, userId) {
  const now = new Date();
  const departTime = normalizeTime(meta.depart_time);
  const arriveTime = normalizeTime(meta.arrive_time);
  const datePrecision = meta.date_precision || 'day';
  // date は NOT NULL。precision が unknown でも今日を入れておく (本体と同じ扱い)
  const date = meta.date || todayJst(now);

  const visitOnly = segments.length === 1 && segments[0].visit_only;
  const lineNames = [];
  for (const s of segments) {
    if (lineNames[lineNames.length - 1] !== s.line_name) lineNames.push(s.line_name);
  }
  const lineList = lineNames.join(' ▸ ');
  const fromStation = segments[0].from;
  const toStation = segments[segments.length - 1].to;
  const name = visitOnly
    ? `${fromStation} 訪問`
    : `${lineList} ${fromStation}→${toStation}`;

  return {
    id: `trip_${Date.now()}`,
    date,
    name,
    photos: [],
    from_station_id: segments[0].from_station_id || null,
    to_station_id: segments[segments.length - 1].to_station_id || null,
    total_stations: visitOnly ? 1 : segments.reduce((n, s) => n + s.station_count, 0),
    transfers: Math.max(0, segments.length - 1),
    line_list: lineList,
    total_minutes: minutesBetween(departTime, arriveTime),
    depart_time: departTime,
    arrive_time: arriveTime,
    segments: segments.map((s) => ({
      lineId: s.line_id,
      from: s.from,
      to: s.to,
      from_id: s.from_station_id,
      to_id: s.to_station_id,
      train_category: s.train_category,
      train_id: s.train_id,
      train_name: s.train_name,
      car_model: s.car_model,
    })),
    // 認証グラデーション: AI チャット経由は自己申告なので verified=false。
    // source は本体の 'gps_button' / 'manual' に並ぶ 3 つ目として 'mcp' を使い、
    // 後から「どこから入った記録か」を追えるようにする (エクスポートの表示は js/23-export.js)。
    source: 'mcp',
    verified: false,
    gps_lat: null,
    gps_lon: null,
    gps_accuracy: null,
    recorded_at: now.toISOString(),
    date_precision: datePrecision,
    train_id: aggregate(segments, 'train_id'),
    train_name: aggregate(segments, 'train_name'),
    train_category: aggregate(segments, 'train_category'),
    car_model: aggregate(segments, 'car_model'),
    notes: meta.notes || null,
    delay_minutes: (typeof meta.delay_minutes === 'number') ? Math.max(0, Math.min(5999, Math.round(meta.delay_minutes))) : null,
    user_id: userId,
  };
}

/** AI と人が読む用の要約 (保存前の確認・保存後の報告の両方で使う) */
export function tripSummary(trip, segments) {
  return {
    name: trip.name,
    date: trip.date,
    date_precision: trip.date_precision,
    total_stations: trip.total_stations,
    transfers: trip.transfers,
    depart_time: trip.depart_time || undefined,
    arrive_time: trip.arrive_time || undefined,
    total_minutes: trip.total_minutes || undefined,
    delay_minutes: trip.delay_minutes ?? undefined,
    notes: trip.notes || undefined,
    segments: segments.map((s) => ({
      line: s.line_name,
      line_id: s.line_id,
      from: s.from,
      to: s.to,
      station_count: s.station_count,
      train_name: s.train_name || undefined,
      train_category: s.train_category || undefined,
      car_model: s.car_model || undefined,
      warning: s.warning || undefined,
    })),
  };
}
