// ══════════════════════════════════════════════════════════════
// マイページ 共通レイヤー (v190 分割)
// - window.NORIRECO 名前空間の初期化
// - 共通状態 (MP._mypageCache / MP.mpActiveSection / MP.mpTripFilter)
// - エントリ (renderMypage) / サブタブ切替 (switchMpSection / applyMpSection)
// - バナー (renderMpTimeMachineBanner) / トースト (showMypageToast)
// - 3 タブ共有ヘルパー (tripCardHtml / _MP_SORT_COMPARATORS / formatDelayMin / isTimeMachineActive)
//
// 13a-stats.js / 13b-trips.js / 13c-lines.js は本ファイルに依存する。
// 新規・移動分の関数は NORIRECO.mypage.xxx にも公開 (v127 const grid 二重宣言事故の構造的予防)。
//
// v207 ES Modules パイロット (案 β) stage 2: 13-mypage-common を本ファイルも含めて
// 全 4 ファイル module 化。13a/13b/13c (既に module) と 05/09 (classic) からの bare
// 参照を支えるため、末尾で applyMpSection / showMypageToast / tripCardHtml /
// isTimeMachineActive / _MP_SORT_COMPARATORS の window bridge を明示追加。
//
// v223 ES Modules stage 3: 11-fraud-detection を import 化。
// v224: 12-auth から currentUserId / authBearerToken を import 化。
// v345: 不正検知撤回に伴い 11-fraud-detection の import を撤去。
// ══════════════════════════════════════════════════════════════
import { currentUserId, authBearerToken } from './12-auth.js';
import { renderList } from './09-tabs-stats.js';
import { filterTripsByDate } from './05-supabase-data.js';

// v332 (Phase 3): trip.from_station / to_station 列 DROP 後の name 解決ヘルパー。
//   元 13b-trips.js に置いていたが、13-mypage-common ↔ 13b-trips の循環 import で
//   13b の top-level `NORIRECO.mypage.xxx = ...` が NORIRECO.mypage 未初期化のまま
//   走り画面が落ちる事故 (v331 → v332) を防ぐため common に移動。
// v333 (Phase 3): trip.from_station / to_station 列 DROP 完遂 (v326 SQL Applied 2026-05-25) — name fallback 撤去。
export function getTripStationName(trip, which) {
  if (!trip) return '';
  const idKey = which === 'to' ? 'to_station_id' : 'from_station_id';
  const sid = trip[idKey];
  if (!sid) return '';
  const ms = (NORIRECO.data?.MERGED_STATIONS || []).find(m => m.id === sid);
  return ms ? ms.name : '';
}

// ── NORIRECO 名前空間の初期化 ──────────────────────────────────
window.NORIRECO = window.NORIRECO || {};
NORIRECO.mypage = NORIRECO.mypage || {};

// v185: delay_minutes (整数) を「N時間M分」「N分」「N時間」形式に整形。
// 0 or null は空文字。
function formatDelayMin(min) {
  const n = (typeof min === 'number') ? min : parseInt(min, 10);
  if (!n || n <= 0) return '';
  if (n < 60) return `${n}分`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}
window.formatDelayMin = formatDelayMin;
NORIRECO.mypage.formatDelayMin = formatDelayMin;

// v201 ES Modules パイロット (案 β) stage 1 最終 — mypage state を NORIRECO.mypage.state に集約。
// 案 β stage 1 全 7 ドメイン完了 (auth/map/record/gps/trains/data/mypage、累計 46 state)。
NORIRECO.mypage.state = NORIRECO.mypage.state || {
  _mypageCache: null,            // 取得した自分の trip[]
  mpActiveSection: 'stats',      // 'stats' | 'trips' | 'lines' | 'memos'
  mpTripFilter: {
    auth: 'all',     // all | verified | manual
    period: 'all',   // all | thisYear | lastYear | custom (日付フィルタは _tripDateFilter と独立)
    category: 'all', // all | shinkansen | limited_express | ...
    sort: 'date_desc', // v182: 旅程タブの並び替え (date_desc/asc, stations_desc, minutes_desc, recorded_desc, delay_desc)
    station: '',     // v285: 駅名 substring 検索
    stationScope: {  // v289: 駅名検索のマッチ範囲を ON/OFF
      from: true,    //   始点 (trip.from_station)
      end: true,     //   終点 (trip.to_station)
      transfer: true,//   乗換 (segments[].from / to)
      pass: true,    //   通過 (segments の駅順展開、中間駅)
    },
  },
};
const MP = NORIRECO.mypage.state;

// v287.1: trip が「ある駅マッチ条件 (predicate) に一致する駅を含むか」を判定する
// 高階関数。判定対象は scope で切替:
//   - from     (始点 = trip.from_station)
//   - end      (終点 = trip.to_station)
//   - transfer (乗換 = segments[].from / to。始点/終点と重複しても OK)
//   - pass     (通過 = segments[].lineId → SERVICE_LINES 駅順展開の中間駅)
//
// scope を省略 (undefined) すると全 ON 扱い — v282 / v288 互換。
//
// SERVICE_LINES 未構築 (起動直後) や lineId が SERVICE_LINES.id にも
// candidateN02Ids にも無いケースは通過駅判定を諦め、from/to の直接判定に
// フォールバックする。
//
// 使い分け:
//   - 地図駅クリック「この駅を含む旅程」(v282): 完全一致 predicate / scope 全 ON
//   - マイページ駅名検索 (v288): substring predicate / scope はユーザー UI 連動 (v289)
// v312 (Phase 2-c): predicate 引数を `(name, id)` の 2 引数に拡張。
//   呼び出し側で「id 優先 + name fallback」の比較を自前で書ける。
//   既存の substring callsite (マイページ駅名検索) は id を無視するだけで従来通り動く。
//   通過駅展開 (sc.pass) も seg.from_id / to_id を優先、無ければ name fallback。
export function tripMatchesAnyStation(trip, predicate, scope) {
  if (!trip || typeof predicate !== 'function') return false;
  const sc = scope || { from: true, end: true, transfer: true, pass: true };
  // v331 (Phase 3): name は getTripStationName で id → MERGED_STATIONS 逆引きを通す。
  //   DROP 後は trip.from_station が undefined になるため、駅名検索が壊れる回避。
  if (sc.from && predicate(getTripStationName(trip, 'from'), trip.from_station_id)) return true;
  if (sc.end && predicate(getTripStationName(trip, 'to'), trip.to_station_id)) return true;
  if (!sc.transfer && !sc.pass) return false; // segments を走らせる必要なし
  const segs = Array.isArray(trip.segments) ? trip.segments : [];
  const SL = NORIRECO.data?.SERVICE_LINES || [];
  for (const seg of segs) {
    if (!seg) continue;
    if (sc.transfer) {
      if (predicate(seg.from, seg.from_id)) return true;
      if (predicate(seg.to, seg.to_id)) return true;
    }
    if (!sc.pass || !seg.lineId || SL.length === 0) continue;
    let sl = SL.find(s => s.id === seg.lineId);
    if (!sl) sl = SL.find(s => Array.isArray(s.candidateN02Ids) && s.candidateN02Ids.includes(seg.lineId));
    if (!sl || !Array.isArray(sl.stations)) continue;
    // 通過駅範囲の決定: seg.from_id / to_id を優先、無ければ name で fallback
    let fi = -1, ti = -1;
    if (seg.from_id) fi = sl.stations.findIndex(s => s.id === seg.from_id);
    if (fi < 0) fi = sl.stations.findIndex(s => s.name === seg.from);
    if (seg.to_id) ti = sl.stations.findIndex(s => s.id === seg.to_id);
    if (ti < 0) ti = sl.stations.findIndex(s => s.name === seg.to);
    if (fi < 0 || ti < 0) continue;
    const lo = Math.min(fi, ti), hi = Math.max(fi, ti);
    for (let i = lo + 1; i < hi; i++) {
      const st = sl.stations[i];
      if (predicate(st.name, st.id)) return true;
    }
  }
  return false;
}

// 完全一致版 (v282 互換) — 駅クリック時の旅程絞り込みに使う。
// v312 (Phase 2-c): 引数を ms オブジェクトに変更。ms.id が trip 側の id と一致するかを
//   優先比較し、id 不在時のみ name 比較に fallback。
//   旧シグネチャ tripVisitsStation(trip, "駅名") は廃止 (呼び出し側はすべて ms を持つ)。
export function tripVisitsStation(trip, ms) {
  if (!ms) return false;
  const tid = ms.id;
  const tname = ms.name;
  return tripMatchesAnyStation(trip, (name, id) => {
    if (tid && id) return id === tid;       // id 優先: 同名駅問題回避、比較も高速
    return !!name && !!tname && name === tname;  // fallback: バックフィル前の trip
  });
}
NORIRECO.mypage.tripMatchesAnyStation = tripMatchesAnyStation;
NORIRECO.mypage.tripVisitsStation = tripVisitsStation;

// ── 都道府県 BBOX テーブル (簡易判定用) ────────────────────────
// v318: 元は 13a-stats.js 内にあったが、駅名+都道府県検索 (resolveStationQueryIds) で
//   共有するため共通レイヤーに移動。13a 側は import で使う。
// 各都道府県の概略の経緯度範囲。境界線上の駅は誤分類される可能性あり。
// 重複時は bbox が小さい県 (面積優先度) でなく、centroid 距離が最も近い県を採用。
export const PREFECTURES = [
  // [name, minLat, maxLat, minLon, maxLon, centerLat, centerLon]
  ['北海道', 41.3, 45.6, 139.3, 146.0, 43.5, 142.6],
  ['青森県', 40.2, 41.6, 139.4, 141.7, 40.8, 140.7],
  ['岩手県', 38.7, 40.5, 140.6, 142.1, 39.6, 141.4],
  ['宮城県', 37.8, 39.0, 140.3, 141.7, 38.3, 140.9],
  ['秋田県', 38.9, 40.5, 139.7, 141.0, 39.7, 140.3],
  ['山形県', 37.7, 39.3, 139.5, 140.8, 38.4, 140.2],
  ['福島県', 36.8, 38.0, 139.2, 141.0, 37.4, 140.4],
  ['茨城県', 35.8, 36.9, 139.7, 140.9, 36.3, 140.4],
  ['栃木県', 36.2, 37.2, 139.3, 140.3, 36.7, 139.8],
  ['群馬県', 36.0, 37.0, 138.4, 139.7, 36.4, 139.0],
  ['埼玉県', 35.7, 36.3, 138.7, 139.9, 36.0, 139.4],
  ['千葉県', 34.9, 36.1, 139.7, 140.9, 35.5, 140.3],
  ['東京都', 35.5, 35.9, 139.0, 139.9, 35.69, 139.69],
  ['神奈川県', 35.1, 35.7, 139.0, 139.8, 35.4, 139.4],
  ['新潟県', 36.7, 38.5, 137.6, 139.6, 37.6, 138.6],
  ['富山県', 36.3, 36.9, 136.8, 137.8, 36.6, 137.3],
  ['石川県', 36.0, 37.6, 136.2, 137.4, 36.7, 136.8],
  ['福井県', 35.3, 36.3, 135.4, 136.8, 35.9, 136.2],
  ['山梨県', 35.1, 35.9, 138.2, 139.1, 35.6, 138.6],
  ['長野県', 35.2, 37.0, 137.3, 138.9, 36.2, 138.2],
  ['岐阜県', 35.1, 36.4, 136.2, 137.7, 35.7, 136.9],
  ['静岡県', 34.6, 35.7, 137.4, 139.2, 35.0, 138.4],
  ['愛知県', 34.6, 35.4, 136.7, 137.8, 35.0, 137.0],
  ['三重県', 33.7, 35.3, 135.8, 136.9, 34.5, 136.5],
  ['滋賀県', 34.7, 35.7, 135.7, 136.5, 35.2, 136.1],
  ['京都府', 34.7, 35.8, 134.8, 136.0, 35.1, 135.5],
  ['大阪府', 34.2, 35.0, 135.1, 135.7, 34.65, 135.5],
  ['兵庫県', 34.1, 35.7, 134.2, 135.5, 34.8, 134.8],
  ['奈良県', 33.8, 34.8, 135.6, 136.3, 34.4, 135.9],
  ['和歌山県', 33.4, 34.4, 135.0, 136.0, 33.9, 135.5],
  ['鳥取県', 35.0, 35.7, 133.1, 134.5, 35.4, 133.8],
  ['島根県', 34.3, 35.7, 131.6, 133.4, 35.0, 132.6],
  ['岡山県', 34.3, 35.3, 133.3, 134.5, 34.8, 133.9],
  ['広島県', 34.0, 35.1, 132.0, 133.5, 34.5, 132.7],
  ['山口県', 33.7, 34.8, 130.7, 132.2, 34.2, 131.4],
  ['徳島県', 33.6, 34.3, 133.7, 134.9, 33.9, 134.3],
  ['香川県', 34.0, 34.6, 133.5, 134.5, 34.3, 134.0],
  ['愛媛県', 32.9, 34.3, 132.0, 133.7, 33.6, 132.8],
  ['高知県', 32.7, 33.9, 132.5, 134.3, 33.3, 133.4],
  ['福岡県', 33.1, 34.0, 130.0, 131.2, 33.6, 130.6],
  ['佐賀県', 33.1, 33.6, 129.8, 130.6, 33.3, 130.2],
  ['長崎県', 32.7, 34.7, 128.6, 130.4, 33.0, 129.7],
  ['熊本県', 32.1, 33.4, 130.1, 131.2, 32.8, 130.7],
  ['大分県', 32.7, 33.7, 130.7, 132.0, 33.2, 131.4],
  ['宮崎県', 31.3, 32.9, 130.6, 131.9, 32.0, 131.3],
  ['鹿児島県', 27.0, 32.2, 128.4, 131.2, 31.5, 130.5],
  ['沖縄県', 24.0, 27.0, 122.9, 131.0, 26.2, 127.7],
];

// 駅座標 → 都道府県名 (bbox 含む県のうち面積最小、無ければ centroid 最近接)
// v321: 旧版は「bbox 内 + centroid 最近接」だったが、八王子 (東京/神奈川両方の bbox に
//   入る + centroid は神奈川の方が近い) で神奈川県判定になり「八王子 東京」検索が 0 件落ち
//   していた。bbox 重複時は **面積最小の県** を選ぶ heuristic に変更 (= より「特定の」県を
//   優先する。例: 東京都 bbox 面積 0.36 < 神奈川県 bbox 面積 0.48 → 東京都採用)。
const _prefCache = new Map();  // 'lat,lon' → 県名
export function prefOfStation(lat, lon) {
  if (lat == null || lon == null) return null;
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (_prefCache.has(key)) return _prefCache.get(key);
  let best = null, bestArea = Infinity;
  for (const p of PREFECTURES) {
    const [name, minLat, maxLat, minLon, maxLon] = p;
    const inBbox = lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
    if (!inBbox) continue;
    const area = (maxLat - minLat) * (maxLon - minLon);
    if (area < bestArea) { best = name; bestArea = area; }
  }
  if (!best) {
    // bbox に入らない: centroid 最近接でフォールバック
    let bestDist = Infinity;
    for (const p of PREFECTURES) {
      const [name, , , , , cLat, cLon] = p;
      const dx = lat - cLat, dy = lon - cLon;
      const dist = dx*dx + dy*dy;
      if (dist < bestDist) { best = name; bestDist = dist; }
    }
  }
  _prefCache.set(key, best);
  return best;
}

// v317 (Phase 3-e): 駅名 substring クエリ → 候補駅 id Set 解決層。
// v318: 空白区切りで「駅名 都道府県」検索に対応。
//   "八王子"        → 全国の「八王子」を含む駅 (北八王子・京王八王子・香川の八王子 等)
//   "八王子 東京"   → 駅名「八王子」 AND 都道府県「東京」 (= 東京の八王子等のみ)
//   "高松 香川"     → 同名異所駅 (香川 / 石川 / 多摩 の高松) のうち香川のみ
//   "○○ 東京 神奈川" → 駅名 ○○ AND (都道府県 東京 AND 神奈川) ※ AND マッチ なので通常 0 件
//
// MERGED_STATIONS (9,017 駅) を走査して条件を満たす駅の id Set + name Set を返す。
// 呼び出し側は (name, id) predicate で:
//   1. `id && ids.has(id)` を優先 (新形式 trip / memo、同名異所駅も厳密区別)
//   2. fallback として `name.includes(nameToken) && (!hasPrefFilter || names.has(name))`
//      (id 列が NULL の旧 trip / memo 救済。pref 指定時は pref を満たす候補駅名集合で
//       絞り込むが、同名異所駅の中で「どれか」までは厳密区別できない)
export function resolveStationQuery(q) {
  if (!q || typeof q !== 'string') return null;
  const norm = q.trim();
  if (!norm) return null;
  const tokens = norm.split(/[\s　]+/).filter(Boolean);
  if (tokens.length === 0) return null;
  const nameToken = tokens[0];
  const prefTokens = tokens.slice(1);
  const hasPrefFilter = prefTokens.length > 0;
  const MS = NORIRECO.data?.MERGED_STATIONS;
  if (!Array.isArray(MS) || MS.length === 0) {
    return { ids: new Set(), names: new Set(), nameToken, prefTokens, hasPrefFilter };
  }
  const ids = new Set();
  const names = new Set();
  for (const ms of MS) {
    if (!ms || !ms.id || !ms.name) continue;
    if (!ms.name.includes(nameToken)) continue;
    if (hasPrefFilter) {
      const pref = prefOfStation(ms.lat, ms.lon);
      if (!pref) continue;
      if (!prefTokens.every(t => pref.includes(t))) continue;
    }
    ids.add(ms.id);
    names.add(ms.name);
  }
  return { ids, names, nameToken, prefTokens, hasPrefFilter };
}
NORIRECO.mypage.resolveStationQuery = resolveStationQuery;

export async function renderMypage() {
  const c = document.getElementById('mypage-content');
  if (!c) return;
  c.innerHTML = '';

  const uid = currentUserId();
  if (!uid) {
    showAllSubpanes(false);
    c.innerHTML = `
      <div class="mp-empty">
        <div class="mp-empty-ic">🔑</div>
        <div class="mp-empty-t">ログインしてください</div>
        <div class="mp-empty-s">マイページではあなたの旅程・GPS 完駅率・GPS 変換が使えます</div>
        <button class="mp-empty-btn" onclick="openAuthModal()">🔑 ログイン / 会員登録</button>
      </div>`;
    return;
  }

  // 1. コンパクトユーザーヘッダ + 常時表示の完乗率カード + サブタブ nav
  const email = (NORIRECO.auth.currentUser && NORIRECO.auth.currentUser.email) || '(メール非公開)';
  const initial = (email[0] || '?').toUpperCase();
  c.innerHTML = `
    <div class="mp-header-compact">
      <div class="mp-avatar-sm">${initial}</div>
      <div class="mp-userinfo-sm">
        <div class="mp-username-sm">${email.split('@')[0]}</div>
        <div class="mp-uid-sm">${email}</div>
      </div>
      <button class="mp-logout-btn-sm" onclick="if(confirm('ログアウトしますか?'))signOutUser()">×</button>
    </div>
    <div id="mp-completion-pinned"></div>
    <div class="mp-subtab-nav">
      <button class="mp-subtab" data-sec="stats" onclick="switchMpSection('stats')">📊 統計</button>
      <button class="mp-subtab" data-sec="trips" onclick="switchMpSection('trips')">🚃 旅程</button>
      <button class="mp-subtab" data-sec="lines" onclick="switchMpSection('lines')">📋 路線</button>
      <button class="mp-subtab" data-sec="memos" onclick="switchMpSection('memos')">📸 メモ</button>
    </div>
  `;

  // 完乗率カード placeholder (NORIRECO.data.SERVICE_LINES と trips を並列取得しながらスケルトン表示)
  const pinned = document.getElementById('mp-completion-pinned');
  if (pinned) pinned.innerHTML = `<div class="mp-loading" style="padding:14px">📊 完駅率を計算中…</div>`;

  // 並列: NORIRECO.data.SERVICE_LINES 構築 + Supabase から自分の trip 取得
  let trips = [];
  try {
    const [_, tripsRes] = await Promise.all([
      ((window.NORIRECO && NORIRECO.serviceLines) ? NORIRECO.serviceLines.build() : Promise.resolve()),
      fetch(`${SUPABASE_URL}/rest/v1/norireco_trips?user_id=eq.${uid}&select=*&order=recorded_at.desc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authBearerToken()}` }
      }),
    ]);
    if (tripsRes.ok) trips = await tripsRes.json();
  } catch (e) {
    console.warn('[マイページ] 取得エラー:', e.message);
  }

  // v183: Supabase スキーマ未拡張のフィールド (notes / delay_minutes) を
  // localStorage から id ベースで merge して補完する。
  // v181 で tripForSupabase() により notes/delay_minutes は Supabase に送らない
  // ため、Supabase からの再取得時にこれらが欠落する。スキーマ拡張後に撤去。
  try {
    const localTrips = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
    if (Array.isArray(localTrips) && localTrips.length > 0) {
      const localById = new Map(localTrips.map(t => [t.id, t]));
      trips = trips.map(t => {
        const lt = localById.get(t.id);
        if (!lt) return t;
        // Supabase 由来の値を優先しつつ、欠落フィールドだけ localStorage で補完
        const merged = { ...t };
        if (merged.notes == null && lt.notes != null) merged.notes = lt.notes;
        if (merged.delay_minutes == null && lt.delay_minutes != null) merged.delay_minutes = lt.delay_minutes;
        return merged;
      });
    }
  } catch (e) {
    console.warn('[マイページ] localStorage merge エラー:', e.message);
  }

  MP._mypageCache = trips;

  // グローバル過去モード (_tripDateFilter) が有効ならバナー表示
  renderMpTimeMachineBanner();

  // 常時表示の完乗率カードを描画 (グローバル date filter を適用)
  if (pinned) {
    pinned.innerHTML = '';
    if (Array.isArray(NORIRECO.data.SERVICE_LINES) && NORIRECO.data.SERVICE_LINES.length > 0) {
      const tripsForCards = filterTripsByDate(trips);
      pinned.appendChild(NORIRECO.mypage.buildCompletionCards(tripsForCards));
    } else {
      pinned.innerHTML = `<div class="mp-empty-s" style="padding:14px">⚠ 営業系統マスターの読込に失敗しました</div>`;
    }
  }

  applyMpSection();
}
// v225 stage 3: renderMypage は `export` 経由に移行。NORIRECO 名前空間登録は互換のため残置。
NORIRECO.mypage.renderMypage = renderMypage;

// v309: マイページタブ未開封でも旅程キャッシュ (_mypageCache) を埋めたい呼び出し向けの
//   軽量 lazy fetch。駅アクションシート「この駅を含む旅程」(v282) や同種の機能から呼ぶ。
//   renderMypage と同じ Supabase fetch + localStorage merge を行うが、
//   完乗率カードやサブタブ描画はしない (純粋にデータだけ詰める)。
//
//   - 既に array なら再 fetch しない (no-op)。
//   - 未ログイン (uid 無し) なら null を返す (キャッシュは触らない)。
//   - 失敗時は console.warn して null を返す (キャッシュは触らない)。
export async function loadMypageTripsIfNeeded() {
  if (Array.isArray(MP._mypageCache)) return MP._mypageCache;
  const uid = currentUserId();
  if (!uid) return null;

  let trips = [];
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/norireco_trips?user_id=eq.${uid}&select=*&order=recorded_at.desc`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${authBearerToken()}` }
    });
    if (res.ok) trips = await res.json();
    else { console.warn('[マイページ] lazy fetch HTTP', res.status); return null; }
  } catch (e) {
    console.warn('[マイページ] lazy fetch エラー:', e.message);
    return null;
  }

  // renderMypage と同じ localStorage merge (notes / delay_minutes 補完)。
  // スキーマ拡張後に renderMypage 側も含めて撤去。
  try {
    const localTrips = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
    if (Array.isArray(localTrips) && localTrips.length > 0) {
      const localById = new Map(localTrips.map(t => [t.id, t]));
      trips = trips.map(t => {
        const lt = localById.get(t.id);
        if (!lt) return t;
        const merged = { ...t };
        if (merged.notes == null && lt.notes != null) merged.notes = lt.notes;
        if (merged.delay_minutes == null && lt.delay_minutes != null) merged.delay_minutes = lt.delay_minutes;
        return merged;
      });
    }
  } catch (e) {}

  MP._mypageCache = trips;
  return trips;
}
NORIRECO.mypage.loadTripsIfNeeded = loadMypageTripsIfNeeded;

// 期間フィルタが有効ならバナー表示 (今年/去年/〜月指定/カスタム)
function renderMpTimeMachineBanner() {
  const c = document.getElementById('mypage-content');
  if (!c) return;
  // 既存バナーを除去
  const old = c.querySelector('.mp-tm-banner');
  if (old) old.remove();
  const f = window._tripDateFilter;
  if (!f || f.mode === 'all') return;

  let label = '';
  let cls = 'mp-tm-banner';
  if (f.mode === 'thisYear') label = '🗓 今年のみ表示中';
  else if (f.mode === 'lastYear') label = '🗓 去年のみ表示中';
  else if (f.mode === 'untilMonth') {
    label = `🕰 <strong>〜${(f.month||'').replace('-','/')}</strong> までの記録で表示中`;
  }
  else if (f.mode === 'custom') {
    if (isTimeMachineActive()) {
      label = `🕰 過去モード: <strong>${f.to}</strong> 時点を表示中`;
    } else {
      const fr = f.from || '…';
      const to = f.to || '…';
      label = `🗓 カスタム期間: <strong>${fr}</strong> 〜 <strong>${to}</strong>`;
    }
  } else return;

  const banner = document.createElement('div');
  banner.className = cls;
  banner.innerHTML = `
    ${label}
    <button class="mp-tm-banner-clear" onclick="setDateFilter('all')">↺ 全期間に戻す</button>
  `;
  // サブタブ nav の直前に挿入
  const subNav = c.querySelector('.mp-subtab-nav');
  if (subNav) c.insertBefore(banner, subNav);
  else c.appendChild(banner);
}
NORIRECO.mypage.renderMpTimeMachineBanner = renderMpTimeMachineBanner;

function showAllSubpanes(show) {
  document.querySelectorAll('.mp-subpane').forEach(p => p.style.display = show ? '' : 'none');
}
NORIRECO.mypage.showAllSubpanes = showAllSubpanes;

function switchMpSection(name) {
  MP.mpActiveSection = name;
  applyMpSection();
}
window.switchMpSection = switchMpSection;
NORIRECO.mypage.switchMpSection = switchMpSection;

export function applyMpSection() {
  // 旧 'timemachine' 選択を 'stats' にフォールバック (タイムマシン廃止 v174)
  if (MP.mpActiveSection === 'timemachine') MP.mpActiveSection = 'stats';
  // サブタブ activeクラス
  document.querySelectorAll('.mp-subtab').forEach(b => {
    b.classList.toggle('active', b.dataset.sec === MP.mpActiveSection);
  });
  // サブペイン表示切替
  const showStats = MP.mpActiveSection === 'stats';
  const showTrips = MP.mpActiveSection === 'trips';
  const showLines = MP.mpActiveSection === 'lines';
  const showMemos = MP.mpActiveSection === 'memos';
  document.getElementById('mp-sub-stats').style.display       = showStats ? '' : 'none';
  document.getElementById('mp-sub-trips').style.display       = showTrips ? '' : 'none';
  document.getElementById('mp-sub-lines').style.display       = showLines ? '' : 'none';
  const memoPane = document.getElementById('mp-sub-memos');
  if (memoPane) memoPane.style.display = showMemos ? '' : 'none';

  // 内容描画 (遅延でレイアウト確定後)
  setTimeout(() => {
    if (showStats) { NORIRECO.mypage.renderMpStatsSection(); }
    if (showTrips) NORIRECO.mypage.renderMpTripsSection();
    if (showLines) { try { renderList(); } catch(e) {} }
    if (showMemos) { try { NORIRECO.mypage.renderMpMemosSection?.(); } catch(e) {} }
  }, 30);
}
NORIRECO.mypage.applyMpSection = applyMpSection;

// ── 共通: 旅程タブのソート比較関数 (統計タブ「直近の旅程」のソートとも共有想定) ──
// v182: ソートキー (MP.mpTripFilter.sort) ごとの比較関数
export const _MP_SORT_COMPARATORS = {
  date_desc: (a, b) => (b.date || '').localeCompare(a.date || ''),
  date_asc: (a, b) => (a.date || '').localeCompare(b.date || ''),
  stations_desc: (a, b) => (b.total_stations || 0) - (a.total_stations || 0),
  minutes_desc: (a, b) => (b.total_minutes || 0) - (a.total_minutes || 0),
  recorded_desc: (a, b) => (b.recorded_at || b.date || '').localeCompare(a.recorded_at || a.date || ''),
  delay_desc: (a, b) => ((b.delay_minutes || 0) - (a.delay_minutes || 0))
                        || (b.recorded_at || b.date || '').localeCompare(a.recorded_at || a.date || ''),
};
NORIRECO.mypage._MP_SORT_COMPARATORS = _MP_SORT_COMPARATORS;

// 単一 trip カードの HTML を生成 (旅程タブ・統計タブ「直近の旅程」両方で使用)
// v182: 「直近の旅程」表示のため buildTripList のループ本体をここに抽出
export function tripCardHtml(trip) {
  // v345: 「自己申告 / 認証済」表現を撤回し中立化。GPS は手動の手間を省くもの。
  const badge = trip.verified
    ? '<span class="mp-badge verified" title="GPS で記録">📍 GPS</span>'
    : '<span class="mp-badge manual" title="手で入力した記録">📝 手動</span>';

  // 乗車日時を date_precision に応じて整形
  const prec = trip.date_precision || 'day';
  let displayDate, timeStr = '';
  if (prec === 'unknown' || !trip.date) {
    displayDate = '日時不明';
  } else if (prec === 'year') {
    displayDate = `${trip.date.slice(0,4)}年ごろ`;
  } else if (prec === 'month') {
    displayDate = `${trip.date.slice(0,4)}年${parseInt(trip.date.slice(5,7),10)}月ごろ`;
  } else {
    displayDate = trip.date;
    if (prec === 'minute' && trip.depart_time && trip.arrive_time) {
      timeStr = `${trip.depart_time.slice(0,5)}〜${trip.arrive_time.slice(0,5)}${trip.total_minutes ? ` (${trip.total_minutes}分)` : ''}`;
    }
  }
  const precBadge = (prec === 'year' || prec === 'month' || prec === 'unknown')
    ? `<span class="mp-badge fuzzy" title="日付の精度: ${prec}">${prec === 'unknown' ? '❓' : '〜'}</span>`
    : '';

  // 記録した日 (recorded_at) と 乗車日 (date) の差分で「後追い記録」判定
  // GPS 記録 (verified) のみ対象: 手動記録は「あとから入力」がデフォルトなので
  // 「後追い」「📌 記録」を出してもノイズになる (v344)
  let recordedAtStr = '';
  let isAfterTheFact = false;
  if (trip.verified && trip.recorded_at) {
    try {
      const rd = new Date(trip.recorded_at);
      const ymd = `${rd.getFullYear()}-${String(rd.getMonth()+1).padStart(2,'0')}-${String(rd.getDate()).padStart(2,'0')}`;
      const hm = rd.toTimeString().slice(0,5);
      recordedAtStr = `${ymd} ${hm}`;
      if (prec === 'unknown') {
        isAfterTheFact = true;
      } else if (trip.date && ymd !== trip.date) {
        isAfterTheFact = true;
      }
    } catch(e) {}
  }
  const afterTheFactBadge = isAfterTheFact
    ? `<span class="mp-badge after-fact" title="乗車日と記録日が違う = 後から登録">📝 後追い</span>`
    : '';
  const recordedAtLine = recordedAtStr
    ? `<div class="mp-tcard-recorded">📌 記録: ${recordedAtStr}</div>`
    : '';

  let trainBit = '';
  if (trip.train_name) {
    const customMark = trip.train_id ? '' : ' 📝';
    trainBit = `<div class="mp-tcard-train">🚆 ${trip.train_name}${customMark}${trip.car_model?` <span class="mp-car">[${trip.car_model}]</span>`:''}</div>`;
  }

  // v181/v185: 後追い記録モード拡張 — 遅延分・自由メモ (時間+分表記)
  const delayBit = (typeof trip.delay_minutes === 'number' && trip.delay_minutes > 0)
    ? `<span class="mp-badge delay" title="到着遅延">⏱ ${formatDelayMin(trip.delay_minutes)}遅れ</span>`
    : '';
  let notesLine = '';
  if (trip.notes && String(trip.notes).trim()) {
    const tmp = document.createElement('div');
    tmp.textContent = String(trip.notes).trim();
    notesLine = `<div class="mp-tcard-notes">📝 ${tmp.innerHTML}</div>`;
  }

  // v258: 📷 写真サムネ (cdn.norireco.app の R2 オブジェクト、lazy load)
  // v263+: 旅程カード上で直接ドラッグ&ドロップ並び替え (renderMpTripsSection で D&D を attach)
  let photosLine = '';
  const tripPhotos = (Array.isArray(trip.photos) ? trip.photos : []).filter(p => p && p.url);
  if (tripPhotos.length > 0) {
    const escAttr = (s) => String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    photosLine = `<div class="mp-tcard-photos" data-trip-id="${escAttr(trip.id)}">${tripPhotos.map((p, i) =>
      `<div class="mp-photo-cell"><a href="${escAttr(p.url)}" target="_blank" rel="noopener" draggable="false"><img class="mp-tcard-thumb" src="${escAttr(p.url)}" loading="lazy" alt="旅程の写真 ${i + 1}" draggable="false"></a></div>`
    ).join('')}</div>`;
  }

  const verifyBtn = !trip.verified
    ? `<button class="mp-act-btn verify" onclick="retroactivelyVerifyTrip('${trip.id}')">📍 GPS に変換</button>`
    : '';

  // v184/v226: 既存旅程の編集ボタン (v226 で時刻・列車種別まで編集対象拡大)
  const editBtn = `<button class="mp-act-btn edit-memo" onclick="openTripEditModal('${trip.id}')">✏️ 編集</button>`;

  return `
    <div class="mp-tcard" data-trip-id="${trip.id}">
      <div class="mp-tcard-head">
        <span class="mp-tcard-date">${displayDate}</span>
        ${precBadge}
        ${timeStr ? `<span class="mp-tcard-time">${timeStr}</span>` : ''}
        ${badge}
        ${afterTheFactBadge}
        ${delayBit}
      </div>
      <div class="mp-tcard-name">${trip.name || ''}</div>
      <div class="mp-tcard-sub">${trip.total_stations || 0}駅 · 乗換${trip.transfers || 0}回</div>
      ${trainBit}
      ${notesLine}
      ${photosLine}
      ${recordedAtLine}
      <div class="mp-tcard-actions">
        ${verifyBtn}
        ${editBtn}
        <button class="mp-act-btn delete" onclick="deleteTripFromMypage('${trip.id}')">🗑 削除</button>
      </div>
    </div>`;
}
NORIRECO.mypage.tripCardHtml = tripCardHtml;

// ── トースト ──────────────────────────────────────────────────
export function showMypageToast(text, kind) {
  let el = document.getElementById('mp-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mp-toast';
    el.className = 'mp-toast';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.className = 'mp-toast show' + (kind ? ' ' + kind : '');
  clearTimeout(showMypageToast._t);
  showMypageToast._t = setTimeout(() => { el.className = 'mp-toast'; }, 3500);
}
NORIRECO.mypage.showMypageToast = showMypageToast;

// ══════════════════════════════════════════════════════════════
// 期間フィルタ補助 (v174 でタイムマシン subtab 廃止、地図ピル「〜月指定」に統合)
// 銀残し: isTimeMachineActive はバナー表示で使用
// ══════════════════════════════════════════════════════════════

// 過去モードが有効か (_tripDateFilter が custom & to が今日以前、または untilMonth)
function isTimeMachineActive() {
  const f = window._tripDateFilter;
  if (!f) return false;
  const today = (typeof localDateStr === 'function') ? localDateStr() : new Date().toISOString().slice(0,10);
  if (f.mode === 'untilMonth' && f.month) {
    // 月末日が今日より前なら過去モード
    if (typeof _lastDayOfMonth === 'function') {
      const last = _lastDayOfMonth(f.month);
      return last && last < today;
    }
    return true;
  }
  if (f.mode !== 'custom') return false;
  if (!f.to) return false;
  return f.to < today;
}
NORIRECO.mypage.isTimeMachineActive = isTimeMachineActive;

// v207 stage 2 (type=module 化) で必要になった window bridge。
// 13a-stats / 13b-trips (module) や 05-supabase / 09-tabs-stats (classic) からの
// bare 参照を支えるため明示公開。
// v225 stage 3: applyMpSection / showMypageToast / tripCardHtml / _MP_SORT_COMPARATORS は
// `export` 経由に移行。isTimeMachineActive は 13-common 内のみで使われるため bridge 撤去。
