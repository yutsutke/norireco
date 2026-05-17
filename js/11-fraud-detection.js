// ══════════════════════════════════════════════════════════════
// 不正検知 (Fraud Detection)
// GPS 記録 (verified=true) の trip で所要時間が物理的に不可能な速さなら suspicious に降格
//
// 方針 (memory/project_fraud_detection.md):
// - 区間正規所要時間 × 0.5 未満 → verified=false に降格
// - 遅い側は許容 (電車遅延の可能性)
// - 速度推定: train_category → 系統名 (新幹線/リニア) → 駅間距離平均から動的
//
// 永続化方針:
// - Supabase schema 変更なし。降格は verified=false で表現
// - 不変条件: source='gps_button' は記録時 verified=true で生まれる
//   → 後で verified=false なら「降格された」と一意に判別可能
// - 理由テキストは UI 描画時に fraudAssessTrip() で再計算
// ══════════════════════════════════════════════════════════════

// カテゴリ別の標準運転速度 (停車込みの実効速度 km/h)
const FRAUD_CATEGORY_SPEED_KMH = {
  shinkansen: 180,        // 各停含む新幹線の実乗車速度
  limited_express: 75,
  sleeper: 65,
  cruise_train: 55,       // 観光要素で停車多め
  joyful_train: 45,
  steam: 35,
  express: 55,
  rapid: 45,
};

// 駅間距離平均から在来線 local の実効速度を推定
// 都市部 (短間隔・頻繁停車) は遅く、地方 (長間隔) は速い
function fraudSpeedFromGapKm(avgGapKm) {
  if (!avgGapKm || avgGapKm <= 0) return 35;
  if (avgGapKm <= 1.0) return 28;     // 都市部 (山手線・中央総武緩行等)
  if (avgGapKm <= 1.6) return 35;     // 通勤路線
  if (avgGapKm <= 2.5) return 45;
  if (avgGapKm <= 4.0) return 55;
  return 65;                          // 地方ローカル
}

// 営業系統内の駅間距離平均 (km)
function fraudAvgGapKm(sl) {
  if (!sl || !sl.stations || sl.stations.length < 2) return null;
  let total = 0, n = 0;
  for (let i = 0; i < sl.stations.length - 1; i++) {
    const a = sl.stations[i], b = sl.stations[i + 1];
    if (a.lat == null || b.lat == null) continue;
    total += distMeters(a.lat, a.lon, b.lat, b.lon);
    n++;
  }
  if (n === 0) return null;
  return (total / n) / 1000;
}

// 区間の運転速度推定 (km/h)
function fraudEstimateSpeedKmh(sl, trainCategory) {
  if (trainCategory && FRAUD_CATEGORY_SPEED_KMH[trainCategory] != null) {
    return FRAUD_CATEGORY_SPEED_KMH[trainCategory];
  }
  const slName = (sl && sl.name) || '';
  if (/リニア/.test(slName)) return 300;
  if (/新幹線/.test(slName)) return 180;
  return fraudSpeedFromGapKm(fraudAvgGapKm(sl));
}

// 区間距離 (km) — sl.stations を from/to で切り出して haversine 累積
function fraudSegmentDistanceKm(sl, fromName, toName) {
  if (!sl || !sl.stations || sl.stations.length < 2) return 0;
  const fromIdx = sl.stations.findIndex(s => s.name === fromName);
  const toIdx = sl.stations.findIndex(s => s.name === toName);
  if (fromIdx < 0 || toIdx < 0) return 0;
  const [a, b] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
  let total = 0;
  for (let i = a; i < b; i++) {
    const s1 = sl.stations[i], s2 = sl.stations[i + 1];
    if (s1.lat == null || s2.lat == null) continue;
    total += distMeters(s1.lat, s1.lon, s2.lat, s2.lon);
  }
  return total / 1000;
}

// trip の想定所要時間 (分) — 各区間の (距離 / 速度) を合計
function fraudExpectedMinutes(trip) {
  if (!trip || !trip.segments || trip.segments.length === 0) return 0;
  if (!Array.isArray(SERVICE_LINES) || SERVICE_LINES.length === 0) return 0;
  let total = 0;
  for (const seg of trip.segments) {
    const sl = SERVICE_LINES.find(l => l.id === seg.lineId);
    if (!sl) continue;
    const distKm = fraudSegmentDistanceKm(sl, seg.from, seg.to);
    const speed = fraudEstimateSpeedKmh(sl, trip.train_category);
    if (speed > 0 && distKm > 0) total += (distKm / speed) * 60;
  }
  return total;
}

// 不正検知本体
// 判定対象: GPS 記録 (source='gps_button') の trip のみ
// 戻り値: { suspicious, reason, expectedMinutes, ratio, elapsedMinutes }
//
// 注: total_minutes は四捨五入 (0-29 秒 → 0 分)。「ほぼ瞬時」=最も怪しいケースなので
//     0 でも検査対象。秒精度が必要なら trip._elapsed_sec (save 時に渡せる) を優先する。
function fraudAssessTrip(trip) {
  if (!trip || trip.source !== 'gps_button') return { suspicious: false, reason: null };
  if (!trip.segments || trip.segments.length === 0) return { suspicious: false, reason: null };
  // 経過時間を分単位で取得 (秒精度の _elapsed_sec があれば優先、なければ total_minutes)
  let elapsedMin;
  if (typeof trip._elapsed_sec === 'number' && trip._elapsed_sec >= 0) {
    elapsedMin = trip._elapsed_sec / 60;
  } else if (typeof trip.total_minutes === 'number' && trip.total_minutes >= 0) {
    elapsedMin = trip.total_minutes;
  } else {
    // depart_time / arrive_time (HH:MM:SS) から秒精度で計算 (Supabase 同期データ向け)
    const dep = parseHmsToSec(trip.depart_time);
    const arr = parseHmsToSec(trip.arrive_time);
    if (dep == null || arr == null) return { suspicious: false, reason: null };
    let diff = arr - dep;
    if (diff < 0) diff += 24 * 3600; // 日跨ぎ補正
    elapsedMin = diff / 60;
  }
  const expected = fraudExpectedMinutes(trip);
  if (expected <= 0) return { suspicious: false, reason: null };
  const ratio = elapsedMin / expected;
  if (ratio < 0.5) {
    // 表示用: 30 秒未満は秒で、それ以上は分で
    const elapsedDisp = elapsedMin < 0.5 ? `${Math.round(elapsedMin*60)}秒` : `${Math.round(elapsedMin)}分`;
    return {
      suspicious: true,
      reason: `所要 ${elapsedDisp} が想定 ${Math.round(expected)}分 の ${Math.round(ratio*100)}% (×0.5 未満)`,
      expectedMinutes: Math.round(expected),
      elapsedMinutes: elapsedMin,
      ratio,
    };
  }
  return { suspicious: false, reason: null, expectedMinutes: Math.round(expected), elapsedMinutes: elapsedMin, ratio };
}

// "HH:MM:SS" → 秒。null/空 は null を返す
function parseHmsToSec(hms) {
  if (!hms || typeof hms !== 'string') return null;
  const m = hms.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  return (+m[1]) * 3600 + (+m[2]) * 60 + (+(m[3] || 0));
}

// UI 用: trip が「降格された suspicious」か (永続データから判別)
// 不変条件: source='gps_button' は記録時 verified=true → 後で false なら降格された
function fraudIsDowngraded(trip) {
  return !!trip && trip.source === 'gps_button' && trip.verified === false;
}
