// ════════════════════════════════════════════
// 記録モード (RECORD MODE)
// - 手動記録: 📝 ボタン経由 (verified=false、source='manual')
// - GPS 記録: 📍 → 「ここから記録開始」経由 (verified=true、source='gps_button')
//
// v217 ES Modules パイロット (案 β) stage 2: `<script type="module">` 化。
// 既存 window 公開 (openRecConfirm 等 11 個) に加え、stage 2 で 6 個追加 (toggleRecordMode /
// onRecordStationClick / saveMultiSegmentTrip / redrawAllLinesAfterTripChange /
// showRecordToast / fitToRiddenLines)。
// ════════════════════════════════════════════

// v223 ES Modules stage 3: 11-fraud-detection と 03-characters を import 化。
// v224: 12-auth.currentUserId を import 化。
// v225: 04-gps-location の 6 関数を import 化。
// v345: 不正検知を撤回 (GPS 記録 = 手間省略の位置づけに変更、世間への証明不要)
import { runCharacterGrantCheck } from './03-characters.js';
import { currentUserId } from './12-auth.js';
// v258: 記録モード保存時の写真添付 (memo / trip 共通の PhotoArea)
import { createPhotoArea } from './18-photo-area.js';
// v392 (B-1 続き): trip 詳細エディタ共通コンポーネント (per-seg-chip mode)
import { createTripDetailEditor } from './20-trip-detail-editor.js';

// 記録モード確認モーダル内の写真エリアコントローラ (createPhotoArea 戻り値、null = 未生成)
let _recPhotoArea = null;
// v399 (B-4-b): 確認モーダルの 時刻 / 列車 / 遅延 / メモ を 1 つに統合した factory instance。
//   旧 _recTimeEditor / _recDetailEditor / _recMetaEditor の 3 instance は multi-container API で
//   1 instance に集約。containers.train を hide/show するのは外側 #rec-train-picker wrapper (列車
//   マニアトグル) — editor 自体は常時存在、save 時に toggle OFF なら train fields を null override。
let _recEditor = null;
import {
  cycleLocationMode,
  stopLocationTracking,
  findNearestStations,
  formatDist,
  updateNearestStationPanel,
  renderRecordingSummary,
  updateLocationButton,
} from './04-gps-location.js';
import { drawLines, updateOverlays } from './08-rendering.js';

// v197 ES Modules パイロット (案 β) — 状態を window.NORIRECO.record に集約。
// 外部 (04 / 06 / 08) からは NORIRECO.record.mode 等のフルパス、内部は R.X の短縮形。
window.NORIRECO = window.NORIRECO || {};
NORIRECO.record = NORIRECO.record || {
  mode: false,                  // 記録モード ON/OFF
  selection: [],                // [{name, lat, lon}] 選択駅列
  highlights: [],               // [{station, marker}] 強調マーカー
  pairLineChoices: new Map(),   // pair index → ユーザー選択 lineId
  segments: [],                 // refreshRecPanel 計算済み区間リスト
  endStationCandidates: [],     // 終了確認モーダルの候補駅
  endStationPickedIdx: 0,
};
const R = NORIRECO.record;

export function toggleRecordMode() {
  R.mode = !R.mode;
  const btn = document.getElementById('rec-btn');
  const panel = document.getElementById('rec-panel');
  btn.classList.toggle('on', R.mode);
  panel.classList.toggle('on', R.mode);
  if (R.mode) {
    // 記録モード突入時刻を必ずセット (GPS 経由でなくても depart_time 計算に使う)
    NORIRECO.gps.recordStartedAt = new Date().toISOString();
    refreshRecPanel();
    if(NORIRECO.map.instance) NORIRECO.map.instance.getContainer().style.cursor='crosshair';
    if (NORIRECO.gps.recordStartedViaGPS) {
      // GPS 記録: ミニマルな最寄駅パネル (記録中) を表示、rec-panel は隠す
      panel.style.display = 'none';
      if (NORIRECO.gps.lastUserGps) {
        updateNearestStationPanel(NORIRECO.gps.lastUserGps.lat, NORIRECO.gps.lastUserGps.lon);
      } else {
        const np = document.getElementById('nearest-station-panel');
        const selectModeEl = document.getElementById('ns-mode-select');
        const recModeEl = document.getElementById('ns-mode-recording');
        if (np && selectModeEl && recModeEl) {
          selectModeEl.style.display = 'none';
          recModeEl.style.display = 'block';
          renderRecordingSummary();
          np.classList.add('show');
        }
      }
    } else {
      // 手動記録 (📝 ボタン経由): 従来の rec-panel UI を表示、最寄駅パネルは隠す
      panel.style.display = '';
      const np = document.getElementById('nearest-station-panel');
      if (np) np.classList.remove('show');
    }
  } else {
    clearRecSelection();
    if(NORIRECO.map.instance) NORIRECO.map.instance.getContainer().style.cursor='';
    // 記録モード終了時に GPS 認証フラグと時刻もリセット
    NORIRECO.gps.recordStartedViaGPS = false;
    NORIRECO.gps.recordStartGPS = null;
    NORIRECO.gps.recordStartedAt = null;
    NORIRECO.gps.recordEndTime = null;
    // rec-panel の inline display をリセット (手動記録で '' にしていたぶん)
    panel.style.display = '';
    // 最寄駅パネルの mode DOM を必ず切替 (NORIRECO.gps.lastUserGps の有無に関わらず)
    const _np = document.getElementById('nearest-station-panel');
    const _selM = document.getElementById('ns-mode-select');
    const _recM = document.getElementById('ns-mode-recording');
    if (_selM) _selM.style.display = 'block';
    if (_recM) _recM.style.display = 'none';
    if (NORIRECO.gps.lastUserGps && NORIRECO.gps.locationMode > 0) {
      // GPS が生きていれば候補リストも更新 (show 状態維持)
      updateNearestStationPanel(NORIRECO.gps.lastUserGps.lat, NORIRECO.gps.lastUserGps.lon);
    } else if (_np) {
      // GPS なしならパネル自体を隠す
      _np.classList.remove('show');
    }
  }
}

function sameStation(a, b) {
  return a.name === b.name && Math.abs(a.lat - b.lat) < 1e-4 && Math.abs(a.lon - b.lon) < 1e-4;
}

export function onRecordStationClick(station) {
  const idx = R.selection.findIndex(s => sameStation(s, station));
  if (idx >= 0) {
    R.selection.splice(idx, 1);
    removeRecordHighlight(station);
  } else {
    R.selection.push(station);
    addRecordHighlight(station);
  }
  refreshRecPanel();
}

function addRecordHighlight(station) {
  const h = L.circleMarker([station.lat, station.lon], {
    radius: 13, color: '#F2A900', weight: 3,
    fill: false, opacity: 1,
    interactive: false,
  }).addTo(NORIRECO.map.instance);
  R.highlights.push({station, marker: h});
}

function removeRecordHighlight(station) {
  const idx = R.highlights.findIndex(h => sameStation(h.station, station));
  if (idx >= 0) {
    NORIRECO.map.instance.removeLayer(R.highlights[idx].marker);
    R.highlights.splice(idx, 1);
  }
}

function clearAllRecordHighlights() {
  R.highlights.forEach(h => { try { NORIRECO.map.instance.removeLayer(h.marker); } catch(e){} });
  R.highlights.length = 0;
}

function clearRecSelection() {
  R.selection.length = 0;
  R.pairLineChoices.clear();
  R.segments = [];
  clearAllRecordHighlights();
  refreshRecPanel();
}

// 選択駅すべてを含む運行系統を返す (営業系統)
function findCommonServiceLines(stations) {
  if (!NORIRECO.data.SERVICE_LINES || NORIRECO.data.SERVICE_LINES.length === 0 || stations.length < 2) return [];
  return NORIRECO.data.SERVICE_LINES.filter(sl => {
    const slNames = new Set(sl.stations.map(s => s.name));
    return stations.every(st => slNames.has(st.name));
  });
}

// v365: R.selection の station ({name, lat, lon}) から merged_stations の id を解決。
// 同名異所の駅 (例: 高松 3 駅) を区別するため、name + lat/lon マッチで一意に。
function resolveSelectionStationId(st) {
  const MS = NORIRECO.data?.MERGED_STATIONS;
  if (!Array.isArray(MS) || !st) return null;
  const ms = MS.find(m => m.name === st.name
    && Math.abs(m.lat - st.lat) < 1e-5 && Math.abs(m.lon - st.lon) < 1e-5);
  return ms?.id || null;
}

// v367: 緯度経度から徒歩距離 (近似メートル)。
function _distMeters(a, b) {
  const dLat = (a.lat - b.lat) * 111000;
  const dLon = (a.lon - b.lon) * 111000 * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180);
  return Math.hypot(dLat, dLon);
}

// v367: R.selection の連続 2 駅が同じ徒歩乗換グループに属するなら情報を返す (=徒歩区間扱い)。
function _isWalkPair(a, b) {
  const wtIdx = NORIRECO.data?.walkTransferIndex;
  if (!wtIdx || wtIdx.size === 0) return null;
  const aId = resolveSelectionStationId(a);
  const bId = resolveSelectionStationId(b);
  if (!aId || !bId || aId === bId) return null;
  const gA = wtIdx.get(aId);
  const gB = wtIdx.get(bId);
  if (gA == null || gB == null || gA !== gB) return null;
  return { walkM: Math.round(_distMeters(a, b)) };
}

// v367: lineB の駅で、stationId と同じ徒歩乗換グループに属する駅を 1 件返す
// (近い順に 1 件)。groupIdx を元に group.stations を全部試す。
function _findWalkPartnerOnLine(stationId, lineB, anchor) {
  const wtIdx = NORIRECO.data?.walkTransferIndex;
  const WT = NORIRECO.data?.WALK_TRANSFERS;
  if (!wtIdx || !WT) return null;
  const groupIdx = wtIdx.get(stationId);
  if (groupIdx == null) return null;
  const group = WT.groups?.[groupIdx];
  if (!group) return null;
  let best = null;
  for (const sid of group.stations) {
    if (sid === stationId) continue;
    const j = lineB.stations.findIndex(s => s.id === sid);
    if (j < 0) continue;
    const sb = lineB.stations[j];
    const d = anchor ? _distMeters(anchor, sb) : 0;
    if (!best || d < best.distM) {
      best = { index: j, station: sb, distM: Math.round(d) };
    }
  }
  return best;
}

// v366: 駅 id (or name fallback) → Set<sl.id> 索引。findTransferCandidates / find2HopTransferCandidates
// の高速化用。SERVICE_LINES が変わるまでキャッシュ (NORIRECO.data._stationLineIndexCache に置く)。
function buildStationLineIndex() {
  const cache = NORIRECO.data._stationLineIndexCache;
  if (cache && cache._builtFor === NORIRECO.data.SERVICE_LINES) return cache.idx;
  const idx = new Map();
  for (const sl of (NORIRECO.data.SERVICE_LINES || [])) {
    for (const s of sl.stations) {
      const key = s.id || `_n_${s.name}`;
      let set = idx.get(key);
      if (!set) { set = new Set(); idx.set(key, set); }
      set.add(sl.id);
    }
  }
  NORIRECO.data._stationLineIndexCache = { _builtFor: NORIRECO.data.SERVICE_LINES, idx };
  return idx;
}

function _indexOnLine(line, target, targetId) {
  if (targetId) {
    const i = line.stations.findIndex(s => s.id === targetId);
    if (i >= 0) return i;
  }
  return line.stations.findIndex(s => s.name === target.name);
}

// v365: 別系統の 2 駅を選んだとき、1 hop で繋がる乗換駅候補を返す。
// - a/b の id ベース判定 (resolveSelectionStationId) で a を含む系統 linesA / b を含む系統 linesB を列挙
// - lineA × lineB の組合せごとに、lineA・lineB 両方に乗る駅 x (a/b 以外) を抽出
// - 駅一致は v293 で付与した sl.stations[].id ベース (同名異所の高松問題回避)、id 無ければ name fallback
// - 駅ごとに dedupe (同じ x が複数経路で出るときは「総駅数最小」のみ採用)
// - 総駅数 = (a→x along lineA) + (x→b along lineB) で昇順ソート、Top N 返す
//   (rec-panel の「合計 N駅」表示と同じく、乗換駅を 2 系統ぶん重複カウント。これで chip と
//    挿入後表示が一致する)
// v366: lineA.through_lines に lineB.id があれば `isDirectThrough: true` フラグを立てる。
//   ソート時は「直通あり優先 (totalStations が大きくても上)」とした方がユーザーの実感に近い
//   (立川での乗換 = 中央線快速→青梅線は、実は直通電車なら乗換不要)。
function findTransferCandidates(a, b, maxResults = 5) {
  const SL = NORIRECO.data.SERVICE_LINES || [];
  if (SL.length === 0) return [];

  const aId = resolveSelectionStationId(a);
  const bId = resolveSelectionStationId(b);

  const linesA = SL.filter(sl => _indexOnLine(sl, a, aId) >= 0);
  const linesB = SL.filter(sl => _indexOnLine(sl, b, bId) >= 0);
  if (linesA.length === 0 || linesB.length === 0) return [];

  // station key → 最良候補 (totalStations 最小、ただし isDirectThrough を優先維持)
  // v367: x = a 自身も許可 (徒歩乗換 fallback で「a で降りて徒歩で別駅へ」のルート提案のため)
  const bestByStation = new Map();
  for (const lineA of linesA) {
    const aIdx = _indexOnLine(lineA, a, aId);
    const throughSet = new Set(lineA.through_lines || []);
    for (let i = 0; i < lineA.stations.length; i++) {
      const x = lineA.stations[i];
      if (x.name === b.name) continue;
      const isAItself = (i === aIdx);
      // x ≠ a で x.name === a.name のケース (同名異所) も a 自身扱いから除外、通常 x として扱う
      const stationsA = isAItself ? 1 : Math.abs(i - aIdx) + 1;
      for (const lineB of linesB) {
        if (lineB.id === lineA.id) continue;
        // 通常: x が lineB に直接ある (id 一致 or name 一致)
        let xIdxOnB = x.id
          ? lineB.stations.findIndex(s => s.id === x.id)
          : lineB.stations.findIndex(s => s.name === x.name);
        let walkPartner = null;
        // v367: 直接無いなら徒歩乗換グループから lineB に乗ってる別駅 (y) を探す
        if (xIdxOnB < 0 && x.id) {
          const w = _findWalkPartnerOnLine(x.id, lineB, x);
          if (w) {
            xIdxOnB = w.index;
            walkPartner = { name: w.station.name, lat: w.station.lat, lon: w.station.lon, id: w.station.id, distM: w.distM };
          }
        }
        if (xIdxOnB < 0) continue;
        // v367: x = a で walkPartner なしは「a が lineB にも直接乗ってる」= 1 hop で繋がる
        //  (= そもそも error にならない) ので skip。walkPartner ありは「a で降りて徒歩」の意味
        if (isAItself && !walkPartner) continue;
        const bIdxOnB = _indexOnLine(lineB, b, bId);
        if (bIdxOnB < 0 || bIdxOnB === xIdxOnB) continue;
        const stationsB = Math.abs(bIdxOnB - xIdxOnB) + 1;
        const total = stationsA + stationsB;
        const isDirectThrough = throughSet.has(lineB.id);
        // 徒歩乗換は dedupe key を分ける (同じ x で line 直接乗換 + 別 line で徒歩乗換 の両候補を保持できる)
        const key = (x.id || `${x.name}|${x.lat.toFixed(4)}|${x.lon.toFixed(4)}`) + (walkPartner ? `|w_${walkPartner.id || walkPartner.name}` : '');
        const prev = bestByStation.get(key);
        // direct through は同一駅候補のなかで優先 (driver experience として「乗換不要」が刺さる)
        const better = !prev
          || (isDirectThrough && !prev.isDirectThrough)
          || (isDirectThrough === prev.isDirectThrough && total < prev.totalStations);
        if (better) {
          bestByStation.set(key, {
            name: x.name, lat: x.lat, lon: x.lon, id: x.id || null,
            lineA, lineB, totalStations: total, isDirectThrough,
            walkPartner,
          });
        }
      }
    }
  }
  return Array.from(bestByStation.values())
    .sort((p, q) => (Number(q.isDirectThrough) - Number(p.isDirectThrough)) || (p.totalStations - q.totalStations))
    .slice(0, maxResults);
}

// v366: 1 hop で繋がらない遠距離 (例: 札幌 → 鹿児島中央) の fallback。
// 2 駅 (X, Y) で挟む 2-hop パス A-[La]-X-[Lb]-Y-[Lc]-B を探索。
// パフォーマンス対策: buildStationLineIndex (駅→系統 Set) で内ループを高速化。
// dedup は (X, Y) ペア単位。Top N を totalStations 昇順で返す。
function find2HopTransferCandidates(a, b, maxResults = 3) {
  const SL = NORIRECO.data.SERVICE_LINES || [];
  if (SL.length === 0) return [];

  const aId = resolveSelectionStationId(a);
  const bId = resolveSelectionStationId(b);

  const linesA = SL.filter(sl => _indexOnLine(sl, a, aId) >= 0);
  const linesB = SL.filter(sl => _indexOnLine(sl, b, bId) >= 0);
  if (linesA.length === 0 || linesB.length === 0) return [];

  const linesBSet = new Set(linesB.map(l => l.id));
  const slById = new Map(SL.map(s => [s.id, s]));
  const idx = buildStationLineIndex();

  const bestByPath = new Map();
  for (const lineA of linesA) {
    const aIdx = _indexOnLine(lineA, a, aId);
    for (let i = 0; i < lineA.stations.length; i++) {
      if (i === aIdx) continue;
      const X = lineA.stations[i];
      if (X.name === a.name || X.name === b.name) continue;
      const stationsOnA = Math.abs(i - aIdx) + 1;

      const xKey = X.id || `_n_${X.name}`;
      const linesAtX = idx.get(xKey);
      if (!linesAtX) continue;

      for (const lineMidId of linesAtX) {
        if (lineMidId === lineA.id) continue;
        if (linesBSet.has(lineMidId)) continue; // すでに 1-hop で繋がるはずなので skip (1-hop 側で出る)
        const lineMid = slById.get(lineMidId);
        if (!lineMid) continue;
        const xIdxOnMid = X.id
          ? lineMid.stations.findIndex(s => s.id === X.id)
          : lineMid.stations.findIndex(s => s.name === X.name);
        if (xIdxOnMid < 0) continue;

        for (let j = 0; j < lineMid.stations.length; j++) {
          if (j === xIdxOnMid) continue;
          const Y = lineMid.stations[j];
          if (Y.name === X.name || Y.name === a.name || Y.name === b.name) continue;
          const stationsOnMid = Math.abs(j - xIdxOnMid) + 1;

          const yKey = Y.id || `_n_${Y.name}`;
          const linesAtY = idx.get(yKey);
          if (!linesAtY) continue;

          for (const lineBId of linesAtY) {
            if (!linesBSet.has(lineBId)) continue;
            if (lineBId === lineMid.id || lineBId === lineA.id) continue;
            const lineB = slById.get(lineBId);
            if (!lineB) continue;
            const yIdxOnB = Y.id
              ? lineB.stations.findIndex(s => s.id === Y.id)
              : lineB.stations.findIndex(s => s.name === Y.name);
            if (yIdxOnB < 0) continue;
            const bIdxOnB = _indexOnLine(lineB, b, bId);
            if (bIdxOnB < 0 || bIdxOnB === yIdxOnB) continue;
            const stationsOnB = Math.abs(bIdxOnB - yIdxOnB) + 1;
            const total = stationsOnA + stationsOnMid + stationsOnB;

            const pathKey = `${X.id || X.name}|${Y.id || Y.name}`;
            const prev = bestByPath.get(pathKey);
            if (!prev || total < prev.totalStations) {
              bestByPath.set(pathKey, {
                x: { name: X.name, lat: X.lat, lon: X.lon, id: X.id || null },
                y: { name: Y.name, lat: Y.lat, lon: Y.lon, id: Y.id || null },
                lineA, lineMid, lineB, totalStations: total,
              });
            }
          }
        }
      }
    }
  }
  return Array.from(bestByPath.values())
    .sort((p, q) => p.totalStations - q.totalStations)
    .slice(0, maxResults);
}

// v365: 乗換候補チップから呼ばれる挿入処理。
// pairIdx 番目の pair (= R.selection[pairIdx] → R.selection[pairIdx+1]) の間に新駅を割込ませ、
// 既存の pairLineChoices をシフト + 自動 pre-select。
function insertTransferStation(pairIdx, stationName, lat, lon, lineAId, lineBId) {
  const station = { name: stationName, lat: lat, lon: lon };
  // 既に selection に同じ駅があったら何もしない (toggle にしない方が誤操作を防げる)
  if (R.selection.some(s => sameStation(s, station))) return;
  R.selection.splice(pairIdx + 1, 0, station);
  addRecordHighlight(station);
  // 既存 pairLineChoices を index > pairIdx だけ +1 シフト
  const newChoices = new Map();
  for (const [k, v] of R.pairLineChoices) {
    newChoices.set(k <= pairIdx ? k : k + 1, v);
  }
  // 新しく生まれた 2 pair に lineA / lineB を pre-select (ユーザーは dropdown で上書き可)
  if (lineAId) newChoices.set(pairIdx, lineAId);
  if (lineBId) newChoices.set(pairIdx + 1, lineBId);
  R.pairLineChoices = newChoices;
  refreshRecPanel();
}

// v366: 2-hop 候補チップから呼ばれる、X / Y 2 駅同時挿入処理。pairLineChoices は +2 シフト。
function insertTwoTransferStations(pairIdx, xName, xLat, xLon, yName, yLat, yLon, lineAId, lineMidId, lineBId) {
  const stX = { name: xName, lat: xLat, lon: xLon };
  const stY = { name: yName, lat: yLat, lon: yLon };
  // どちらかが既に selection にあるなら何もしない (重複挿入防止)
  if (R.selection.some(s => sameStation(s, stX)) || R.selection.some(s => sameStation(s, stY))) return;
  R.selection.splice(pairIdx + 1, 0, stX, stY);
  addRecordHighlight(stX);
  addRecordHighlight(stY);
  const newChoices = new Map();
  for (const [k, v] of R.pairLineChoices) {
    newChoices.set(k <= pairIdx ? k : k + 2, v);
  }
  if (lineAId)   newChoices.set(pairIdx,     lineAId);
  if (lineMidId) newChoices.set(pairIdx + 1, lineMidId);
  if (lineBId)   newChoices.set(pairIdx + 2, lineBId);
  R.pairLineChoices = newChoices;
  refreshRecPanel();
}
window.insertTwoTransferStations = insertTwoTransferStations;
window.insertTransferStation = insertTransferStation;

// v367: 徒歩乗換チップ用の挿入処理。X (lineA 側) + Y (lineB 側、徒歩で X から到達可能) を
// 連続して selection に入れる。中間 pair (X→Y) は walk_transferIndex が一致するため
// buildSegmentsFromSelection が自動で walk segment 化する (no line pre-select)。
// X が selection[pairIdx] (=a 自身) と同じなら、Y だけ挿入 (a で降りて徒歩で Y → lineB) のパターン。
function insertWalkTransfer(pairIdx, xName, xLat, xLon, yName, yLat, yLon, lineAId, lineBId) {
  const stX = { name: xName, lat: xLat, lon: xLon };
  const stY = { name: yName, lat: yLat, lon: yLon };
  const xIsA = R.selection[pairIdx] && sameStation(R.selection[pairIdx], stX);
  if (xIsA) {
    // a → 徒歩 → Y → lineB → b 経路。Y だけ挿入。
    if (R.selection.some(s => sameStation(s, stY))) return;
    R.selection.splice(pairIdx + 1, 0, stY);
    addRecordHighlight(stY);
    const newChoices = new Map();
    for (const [k, v] of R.pairLineChoices) {
      newChoices.set(k <= pairIdx ? k : k + 1, v);
    }
    // pairIdx = walk (a → Y), pairIdx+1 = lineB (Y → b)
    if (lineBId) newChoices.set(pairIdx + 1, lineBId);
    R.pairLineChoices = newChoices;
  } else {
    // 通常: a → lineA → X → 徒歩 → Y → lineB → b。X+Y 両方挿入
    if (R.selection.some(s => sameStation(s, stX)) || R.selection.some(s => sameStation(s, stY))) return;
    R.selection.splice(pairIdx + 1, 0, stX, stY);
    addRecordHighlight(stX);
    addRecordHighlight(stY);
    const newChoices = new Map();
    for (const [k, v] of R.pairLineChoices) {
      newChoices.set(k <= pairIdx ? k : k + 2, v);
    }
    if (lineAId) newChoices.set(pairIdx,     lineAId);
    // pairIdx + 1 は walk pair (line 不要)
    if (lineBId) newChoices.set(pairIdx + 2, lineBId);
    R.pairLineChoices = newChoices;
  }
  refreshRecPanel();
}
window.insertWalkTransfer = insertWalkTransfer;

// 候補リスト群の積集合 (id ベース)
function intersectLineLists(lists) {
  if (!lists || lists.length === 0) return [];
  let inter = lists[0].slice();
  for (let i = 1; i < lists.length; i++) {
    const ids = new Set(lists[i].map(l => l.id));
    inter = inter.filter(l => ids.has(l.id));
  }
  return inter;
}

// 選択駅列から区間リストを構築
// - 連続2駅ペアごとに共通営業系統を見つける
// - 同一路線が連続するペアをマージして1区間にする
// - 路線継続性を優先 (前ペアと同じ路線が候補にあればそれを使う)
// - ユーザー手動選択 (R.pairLineChoices) があれば最優先
function buildSegmentsFromSelection() {
  if (R.selection.length < 2) return [];

  // Step 1: 各ペアの候補を計算 (v367: 徒歩乗換ペアもここで判定)
  const pairs = [];
  for (let i = 0; i < R.selection.length - 1; i++) {
    const a = R.selection[i], b = R.selection[i + 1];
    const walk = _isWalkPair(a, b);
    pairs.push({a, b, walk, cands: walk ? [] : findCommonServiceLines([a, b])});
  }

  // Step 2: 各ペアの選択 (手動 > 継続性 > 先頭、徒歩はマーカーだけ)
  let prevLineId = null;
  const chosen = pairs.map((p, i) => {
    if (p.walk) { prevLineId = null; return { _walk: true, walkM: p.walk.walkM }; }
    if (p.cands.length === 0) { prevLineId = null; return null; }
    const userPick = R.pairLineChoices.get(i);
    let ln = null;
    if (userPick) ln = p.cands.find(l => l.id === userPick);
    if (!ln && prevLineId) ln = p.cands.find(l => l.id === prevLineId);
    if (!ln) ln = p.cands[0];
    prevLineId = ln.id;
    return ln;
  });

  // Step 3: 同一路線の連続ペアをマージ (walk pair は単独 segment)
  const segs = [];
  let i = 0;
  while (i < pairs.length) {
    if (chosen[i] === null) {
      segs.push({
        error: true,
        from: pairs[i].a, to: pairs[i].b,
        pairIndices: [i],
      });
      i++;
      continue;
    }
    if (chosen[i]._walk) {
      segs.push({
        walk: true,
        from: pairs[i].a, to: pairs[i].b,
        walkM: chosen[i].walkM,
        pairIndices: [i],
      });
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < pairs.length && chosen[j + 1] && !chosen[j + 1]._walk && chosen[j + 1].id === chosen[i].id) {
      j++;
    }
    const cands = intersectLineLists(pairs.slice(i, j + 1).map(p => p.cands));
    segs.push({
      line: chosen[i],
      from: pairs[i].a,
      to: pairs[j].b,
      candidates: cands,
      pairIndices: Array.from({length: j - i + 1}, (_, k) => i + k),
    });
    i = j + 1;
  }
  return segs;
}

// ユーザーが区間の路線を切り替え
function changeSegmentLine(segIdx, newLineId) {
  const seg = R.segments[segIdx];
  if (!seg || !seg.pairIndices) return;
  for (const i of seg.pairIndices) R.pairLineChoices.set(i, newLineId);
  refreshRecPanel();
}

function refreshRecPanel() {
  // 記録中の最寄駅パネル サマリも更新 (rec-panel は v105 で非表示化したが、内部状態は維持)
  if (R.mode) {
    renderRecordingSummary();
  }
  const chipsDiv = document.getElementById('rec-chips');
  const pickDiv = document.getElementById('rec-line-pick');
  const actionsDiv = document.getElementById('rec-actions');
  if (!chipsDiv) return;

  // チップ表示
  if (R.selection.length === 0) {
    chipsDiv.innerHTML = '<span style="color:var(--silver);font-size:11px">駅をタップして 2 駅以上選択してください</span>';
  } else {
    const parts = R.selection.map((s, i) => {
      const cls = i === 0 ? 'from' : (i === R.selection.length - 1 ? 'to' : '');
      const sn = s.name.replace(/'/g, "\\'");
      return `<span class="rec-chip ${cls}" onclick="onRecordStationClick({name:'${sn}',lat:${s.lat},lon:${s.lon}})">${s.name}<span style="color:rgba(255,255,255,.5);margin-left:4px">×</span></span>`;
    });
    chipsDiv.innerHTML = parts.join('<span class="rec-arrow">→</span>');
  }

  pickDiv.innerHTML = '';
  if (R.selection.length >= 2) {
    R.segments = buildSegmentsFromSelection();
    let hasError = false;
    let totalStations = 0;

    R.segments.forEach((seg, idx) => {
      const div = document.createElement('div');
      if (seg.walk) {
        // v367: 徒歩乗換 segment — error ではない、駅数カウントもしない
        div.className = 'rec-seg';
        div.style.background = 'rgba(120,180,240,.12)';
        div.style.borderLeft = '3px solid #7fc4ff';
        div.innerHTML = `<span style="color:#7fc4ff;font-size:11px">🚶 ${seg.from.name} → ${seg.to.name} <span style="opacity:.7">(徒歩 約${seg.walkM}m)</span></span>`;
        pickDiv.appendChild(div);
        return;
      }
      if (seg.error) {
        hasError = true;
        div.className = 'rec-seg err';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'stretch';
        // v365: 1 hop 乗換候補を抽出してチップ列で提示
        // v366: 1 hop ゼロなら 2 hop fallback、1 hop 内で through_lines は「🚉 直通」表示
        const pairIdx = seg.pairIndices[0];
        const cands = findTransferCandidates(seg.from, seg.to, 5);
        let html = `<div style="color:#ff7070;font-size:11px">⚠️ ${seg.from.name} → ${seg.to.name}: 共通する運行系統がありません</div>`;
        if (cands.length > 0) {
          html += `<div style="font-size:10px;color:var(--gold);margin-top:6px">💡 乗換候補 (タップで挿入)</div>`;
          html += `<div style="display:flex;flex-direction:column;gap:4px;margin-top:4px">`;
          for (const c of cands) {
            const nm = c.name.replace(/'/g, "\\'");
            if (c.walkPartner) {
              // v367: 徒歩乗換 chip — X (lineA) → 徒歩 → Y (lineB)
              const yn = c.walkPartner.name.replace(/'/g, "\\'");
              const iconAndLabel = `🚶 <b>${c.name}</b> 〜 <b>${c.walkPartner.name}</b> で乗換 <span style="background:rgba(127,196,255,.25);color:#7fc4ff;font-size:9px;padding:1px 5px;border-radius:8px;margin-left:4px">徒歩 ${c.walkPartner.distM}m</span>`;
              html += `<button type="button" onclick="insertWalkTransfer(${pairIdx},'${nm}',${c.lat},${c.lon},'${yn}',${c.walkPartner.lat},${c.walkPartner.lon},'${c.lineA.id}','${c.lineB.id}')" style="text-align:left;padding:6px 8px;background:rgba(140,160,179,.15);border:1px solid var(--track);border-radius:6px;color:var(--white);cursor:pointer;font-size:11px;font-family:inherit;line-height:1.4">${iconAndLabel}<span style="color:var(--silver);font-size:10px;display:block;margin-top:2px"><span style="color:${c.lineA.color}">●</span> ${c.lineA.name} → 🚶 → <span style="color:${c.lineB.color}">●</span> ${c.lineB.name} ・ 合計 ${c.totalStations}駅</span></button>`;
            } else {
              const iconAndLabel = c.isDirectThrough
                ? `🚉 <b>${c.name}</b> で乗換 <span style="background:rgba(0,178,229,.25);color:#00B2E5;font-size:9px;padding:1px 5px;border-radius:8px;margin-left:4px">直通あり</span>`
                : `🔁 <b>${c.name}</b> で乗換`;
              html += `<button type="button" onclick="insertTransferStation(${pairIdx},'${nm}',${c.lat},${c.lon},'${c.lineA.id}','${c.lineB.id}')" style="text-align:left;padding:6px 8px;background:rgba(140,160,179,.15);border:1px solid var(--track);border-radius:6px;color:var(--white);cursor:pointer;font-size:11px;font-family:inherit;line-height:1.4">${iconAndLabel}<span style="color:var(--silver);font-size:10px;display:block;margin-top:2px"><span style="color:${c.lineA.color}">●</span> ${c.lineA.name} → <span style="color:${c.lineB.color}">●</span> ${c.lineB.name} ・ 合計 ${c.totalStations}駅</span></button>`;
            }
          }
          html += `</div>`;
        } else {
          // v366: 1 hop なし → 2 hop fallback を試す
          const cands2 = find2HopTransferCandidates(seg.from, seg.to, 3);
          if (cands2.length > 0) {
            html += `<div style="font-size:10px;color:var(--gold);margin-top:6px">💡 2 回乗換候補 (タップで 2 駅挿入)</div>`;
            html += `<div style="display:flex;flex-direction:column;gap:4px;margin-top:4px">`;
            for (const c of cands2) {
              const xn = c.x.name.replace(/'/g, "\\'");
              const yn = c.y.name.replace(/'/g, "\\'");
              html += `<button type="button" onclick="insertTwoTransferStations(${pairIdx},'${xn}',${c.x.lat},${c.x.lon},'${yn}',${c.y.lat},${c.y.lon},'${c.lineA.id}','${c.lineMid.id}','${c.lineB.id}')" style="text-align:left;padding:6px 8px;background:rgba(140,160,179,.15);border:1px solid var(--track);border-radius:6px;color:var(--white);cursor:pointer;font-size:11px;font-family:inherit;line-height:1.4">🔁🔁 <b>${c.x.name}</b> / <b>${c.y.name}</b> で 2 回乗換<span style="color:var(--silver);font-size:10px;display:block;margin-top:2px"><span style="color:${c.lineA.color}">●</span> ${c.lineA.name} → <span style="color:${c.lineMid.color}">●</span> ${c.lineMid.name} → <span style="color:${c.lineB.color}">●</span> ${c.lineB.name} ・ 合計 ${c.totalStations}駅</span></button>`;
            }
            html += `</div>`;
          } else {
            html += `<div style="font-size:10px;color:var(--silver);margin-top:4px">2 回乗換でも繋がる経路が見つかりません。経由駅を手動で追加してください</div>`;
          }
        }
        div.innerHTML = html;
      } else {
        const ln = seg.line;
        const fromIdx = ln.stations.findIndex(s => s.name === seg.from.name);
        const toIdx = ln.stations.findIndex(s => s.name === seg.to.name);
        const count = Math.abs(toIdx - fromIdx) + 1;
        totalStations += count;
        div.className = 'rec-seg';
        let inner = `<span style="color:${ln.color};font-size:14px">●</span>`;
        if (seg.candidates && seg.candidates.length > 1) {
          const opts = seg.candidates.map(c =>
            `<option value="${c.id}" ${c.id === ln.id ? 'selected' : ''}>${c.name}</option>`
          ).join('');
          inner += `<select class="rec-seg-select" onchange="changeSegmentLine(${idx}, this.value)">${opts}</select>`;
        } else {
          inner += `<span style="font-weight:600;font-size:12px">${ln.name}</span>`;
        }
        inner += `<span style="font-size:10px;color:var(--silver)">${seg.from.name}→${seg.to.name} (${count}駅)</span>`;
        div.innerHTML = inner;
      }
      pickDiv.appendChild(div);
    });

    if (R.segments.length > 0) {
      const summary = document.createElement('div');
      summary.style.cssText = 'margin-top:6px;font-size:11px;color:var(--gold);';
      // v367: 徒歩区間は乗換回数にカウント (乗車系統数 - 1 として計算)
      const rideSegs = R.segments.filter(s => !s.error && !s.walk);
      const walkSegs = R.segments.filter(s => s.walk);
      const transferCount = Math.max(0, rideSegs.length - 1);
      const walkPart = walkSegs.length > 0 ? ` (徒歩乗換 ${walkSegs.length}回 含む)` : '';
      summary.textContent = hasError
        ? '⚠️ 未解決区間があります'
        : `合計 ${totalStations}駅 / 乗換 ${transferCount}回${walkPart}`;
      pickDiv.appendChild(summary);

      // 手動「終了して確認」 (現在の selection で終了)
      // rec-panel は手動記録専用なので「ここで終了 (GPS)」ボタンは出さない (v116〜)
      const saveBtn = document.createElement('button');
      saveBtn.className = 'rec-save';
      saveBtn.style.cssText = 'background:rgba(140,160,179,.2);color:var(--white);border:1px solid var(--track)';
      saveBtn.disabled = hasError;
      saveBtn.textContent = hasError ? '⚠️ 未解決区間あり' : '✅ 選択中の経路で終了';
      saveBtn.onclick = () => openRecConfirm();
      pickDiv.appendChild(saveBtn);
    }
  }

  actionsDiv.innerHTML = R.selection.length > 0
    ? '<button class="rec-btn clear" onclick="clearRecSelection()">クリア</button>'
    : '';
}

// 経路 (複数区間) を1 trip として保存
// 記録確認モーダル: 終了 → 経路レビュー → 保存 or 戻る or 破棄
function openRecConfirm() {
  if (!R.selection || R.selection.length === 0) {
    alert('記録する駅がありません');
    return;
  }
  // 終了時刻をキャプチャ (まだ設定されていなければ)
  if (!NORIRECO.gps.recordEndTime) NORIRECO.gps.recordEndTime = new Date().toISOString();
  const isVisitOnly = R.selection.length === 1 && (!R.segments || R.segments.length === 0);
  if (!isVisitOnly && R.segments && R.segments.some(s => s.error)) {
    alert('未解決の区間があります');
    return;
  }
  const body = document.getElementById('rec-confirm-body');
  if (!body) return;
  const verifiedBadge = NORIRECO.gps.recordStartedViaGPS
    ? '<span class="rec-confirm-verified-badge">📍 GPS</span>'
    : '<span class="rec-confirm-verified-badge" style="background:rgba(140,160,179,.15);color:var(--silver);border-color:var(--track)">📝 手動</span>';

  // 時刻情報行 (depart_time / arrive_time / total_minutes プレビュー)
  // GPS 経由なら NORIRECO.gps.recordStartGPS.timestamp、それ以外は手動入力の精度に応じて更新される
  const startTs = (NORIRECO.gps.recordStartGPS && NORIRECO.gps.recordStartGPS.timestamp) || NORIRECO.gps.recordStartedAt;
  // プレースホルダのみ作成 (中身は updateRecConfirmTimeRow が埋める)
  // openRecConfirm の末尾で精度に応じて中身が動的に書き換わる
  const timeRowHtml = `<div class="rec-confirm-stat-row" id="rec-confirm-time-row" style="display:none">
      <span class="rec-confirm-stat-lbl" id="rec-confirm-time-lbl">🕒 時刻</span>
      <span class="rec-confirm-stat-val" id="rec-confirm-time-val"></span>
    </div>`;

  if (isVisitOnly) {
    // 1駅のみ「訪問」記録
    const st = R.selection[0];
    body.innerHTML = `
      <div class="rec-confirm-route" style="border-left-color:#1A6FE5">
        <div class="rec-confirm-seg">
          <span class="rec-confirm-seg-dot" style="background:#1A6FE5"></span>
          <span><b>${st.name}駅</b> に立ち寄り</span>
        </div>
      </div>
      <div class="rec-confirm-stat-row">
        <span class="rec-confirm-stat-lbl">📍 訪問駅</span>
        <span class="rec-confirm-stat-val">${st.name}</span>
      </div>
      ${timeRowHtml}
      <div class="rec-confirm-stat-row">
        <span class="rec-confirm-stat-lbl">🛡 認証</span>
        <span class="rec-confirm-stat-val">${verifiedBadge}</span>
      </div>
    `;
  } else {
    // 通常: 複数区間の経路
    let totalStations = 0;
    const lineNames = [];
    for (const seg of R.segments) {
      if (!seg.line) continue;
      const fromIdx = seg.line.stations.findIndex(s => s.name === seg.from.name);
      const toIdx = seg.line.stations.findIndex(s => s.name === seg.to.name);
      if (fromIdx < 0 || toIdx < 0) continue;
      totalStations += Math.abs(toIdx - fromIdx) + 1;
      if (lineNames[lineNames.length - 1] !== seg.line.name) lineNames.push(seg.line.name);
    }
    const fromSt = R.selection[0]?.name || '?';
    const toSt = R.selection[R.selection.length - 1]?.name || '?';
    const routeHtml = R.segments.map(seg => {
      if (!seg.line) return '';
      return `<div class="rec-confirm-seg">
        <span class="rec-confirm-seg-dot" style="background:${seg.line.color}"></span>
        <span><b>${seg.line.name}</b> &nbsp; ${seg.from.name} → ${seg.to.name}</span>
      </div>`;
    }).join('');
    // v385: 乗換あり (segments >= 2) のとき、時刻データの仕様 (trip 全体に 1 セット / 系統別に持たない)
    //   を事前注記する。「個別系統の乗車時間統計」自体は現状未実装だが、データモデル上ゼロになることを
    //   ユスケが想定したいので保存前に明示。代替手段 (系統ごと分割 + 立ち寄り) も同時に案内。
    const transferNoteHtml = (R.segments.length >= 2) ? `
      <div style="margin-top:10px;padding:8px 10px;background:rgba(95,181,255,.08);border-left:3px solid #5fb5ff;border-radius:0 6px 6px 0;font-size:11px;color:var(--silver);line-height:1.55">
        <div style="color:#5fb5ff;margin-bottom:4px;font-weight:600">ℹ️ 乗換あり旅程の時刻仕様</div>
        出発〜到着の合計時間は正しく記録されますが、各系統の乗車時間は保持しません (路線別の乗車時間統計を見る場合は 0 分扱い)。<br>
        ▸ 系統ごとの時間を正確に残したい場合: <b>系統ごとに分けて記録</b> (1 旅程 1 系統)<br>
        ▸ 乗換時の待ち時間を残したい場合: <b>「📍 立ち寄り」</b> (1 駅だけ選択して保存) で別途記録
      </div>
    ` : '';
    body.innerHTML = `
      <div class="rec-confirm-route">${routeHtml}</div>
      <div class="rec-confirm-stat-row">
        <span class="rec-confirm-stat-lbl">📍 区間</span>
        <span class="rec-confirm-stat-val">${fromSt} → ${toSt}</span>
      </div>
      <div class="rec-confirm-stat-row">
        <span class="rec-confirm-stat-lbl">🚉 駅数 / 区間</span>
        <span class="rec-confirm-stat-val">${totalStations}駅 / ${R.segments.length}区間</span>
      </div>
      ${transferNoteHtml}
      ${timeRowHtml}
      <div class="rec-confirm-stat-row">
        <span class="rec-confirm-stat-lbl">🛡 認証</span>
        <span class="rec-confirm-stat-val">${verifiedBadge}</span>
      </div>
    `;
  }
  // 保存ボタンのラベルを記録種別に応じて切替
  const saveBtn = document.getElementById('rec-confirm-save-btn');
  if (saveBtn) {
    saveBtn.textContent = NORIRECO.gps.recordStartedViaGPS
      ? '💾 GPS で保存する'
      : '💾 手動で保存する';
  }
  // v399 (B-4-b): 時刻 / 列車 / 遅延 / メモ を **1 つの** _recEditor に統合。
  //   旧 3 instance (_recTimeEditor / _recDetailEditor / _recMetaEditor) は multi-container API で集約。
  //   - GPS 記録: features.timeRow=false で time section skip (外側 #rec-time-edit-section も hide)
  //   - 手動記録: precisions=['minute','day','month','year','unknown'] の 5 精度 UI を mount
  //   - 列車セクションは常時生成 — 外側 #rec-train-picker (マニアトグル) の表示制御で hide/show、
  //     save 時にトグル OFF なら train fields を null override (旧 onRecTrainToggle の destroy 相当)
  //   - delay は maniaToggle + localStorage 永続化、notes は常時、photos は別 instance (_recPhotoArea)
  if (_recEditor) {
    try { _recEditor.destroy(); } catch (e) {}
    _recEditor = null;
  }
  const isGpsRec = !!NORIRECO.gps.recordStartedViaGPS;
  const timeSec = document.getElementById('rec-time-edit-section');
  if (timeSec) timeSec.style.display = isGpsRec ? 'none' : '';

  // 時刻初期値: GPS なしでも記録モード突入時刻 (startTs) と現在時刻 (endTs) から計算
  let initDate = (typeof localDateStr === 'function') ? localDateStr() : new Date().toISOString().slice(0, 10);
  let initDep = '';
  let initArr = '';
  if (startTs) {
    const sd = new Date(startTs);
    initDate = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`;
    initDep = sd.toTimeString().slice(0, 8);
  }
  const endTsLocal = NORIRECO.gps.recordEndTime || new Date().toISOString();
  initArr = new Date(endTsLocal).toTimeString().slice(0, 8);

  // 列車 picker 用の initial segments (新規記録は train_* 全 null)
  const initialSegments = (R.segments || []).map(seg => ({
    lineId: seg.line?.id || null,
    lineName: seg.line?.name || '',
    from: seg.from?.name || '',
    to: seg.to?.name || '',
    train_category: null,
    train_id: null,
    train_name: null,
    car_model: null,
  })).filter(s => s.lineId);

  _recEditor = createTripDetailEditor({
    containers: {
      time:  document.getElementById('rec-time-edit-container'),
      train: document.getElementById('rec-train-picker-container'),
      delay: document.getElementById('rec-delay-container'),
      notes: document.getElementById('rec-notes-container'),
    },
    initial: {
      date: initDate,
      depart_time: initDep,
      arrive_time: initArr,
      date_precision: 'minute',
      segments: initialSegments,
      delay_minutes: null,
      notes: null,
    },
    features: {
      timeRow: isGpsRec ? false : { precisions: ['minute', 'day', 'month', 'year', 'unknown'] },
      trainPicker: 'per-seg-chip',
      delay: { maniaToggle: true, prefKey: PREF_SHOW_DELAY_INPUT },
      notes: true,
      photos: false,
    },
    // 入力が変わるたびに確認モーダル上部の 🕒 時刻行を更新
    onChange: () => { try { updateRecConfirmTimeRow(); } catch (e) {} },
  });

  // 確認モーダル上部の 🕒 時刻行を確実に更新 (GPS 記録は実時刻、手動は factory draft 経由)
  updateRecConfirmTimeRow();
  document.getElementById('rec-confirm-modal')?.classList.add('open');
  // 「列車・車両形式」マニアトグルの表示状態を localStorage から復元 (editor は常時生成済)。
  initRecTrainToggle();

  // v258: 📷 写真エリアもリセット (空のエリアを再生成、blob URL 既存ぶんは destroy で revoke)
  if (_recPhotoArea) {
    try { _recPhotoArea.destroy(); } catch (e) {}
    _recPhotoArea = null;
  }
  const photoContainer = document.getElementById('rec-photo-container');
  if (photoContainer) {
    _recPhotoArea = createPhotoArea({
      container: photoContainer,
      kind: 'trip',
      getOwnerId: () => null, // trip_id は保存時に確定するので uploadAndGetPhotos に直接渡す
      initialPhotos: [],
      maxCount: 5,
    });
  }
}

function closeRecConfirm() {
  // 「戻って編集」: モーダル閉じる、R.mode はそのまま、selection 保持
  document.getElementById('rec-confirm-modal')?.classList.remove('open');
}

async function confirmAndSaveRecord() {
  // 「保存」: モーダル閉じてから既存の保存ロジックを呼ぶ
  document.getElementById('rec-confirm-modal')?.classList.remove('open');
  await saveMultiSegmentTrip();
}

function discardRecord() {
  // 「破棄」: 確認 + 全部リセット
  if (!confirm('記録中の経路を破棄します。よろしいですか？')) return;
  document.getElementById('rec-confirm-modal')?.classList.remove('open');
  NORIRECO.gps.recordStartedViaGPS = false;
  NORIRECO.gps.recordStartGPS = null;
  NORIRECO.gps.recordEndTime = null;
  // v258: 写真エリアも破棄 (blob URL を revoke)
  if (_recPhotoArea) {
    try { _recPhotoArea.destroy(); } catch (e) {}
    _recPhotoArea = null;
  }
  // v399 (B-4-b): 時刻 / 列車 / 遅延 / メモ を統合した単一 editor を破棄
  if (_recEditor) {
    try { _recEditor.destroy(); } catch (e) {}
    _recEditor = null;
  }
  if (R.mode) toggleRecordMode(); // off に
  showRecordToast('🗑 記録を破棄しました', 'warn', 2500);
}

window.openRecConfirm = openRecConfirm;
window.closeRecConfirm = closeRecConfirm;
window.confirmAndSaveRecord = confirmAndSaveRecord;
window.discardRecord = discardRecord;

// v398 (B-4-a): 旧 onRecEditPrecisionChange を撤去。精度切替 + 行表示制御 + 年月 populate は
//   factory `_initTimeRowFull5` が closure 内で全部担当。

// v397 (B-3c) / v399 (B-4-b): 確認モーダル上部の 🕒 時刻行を、factory editor の draft + GPS 状態から再描画。
//   - GPS 記録: 実 GPS 時刻 (startTs/endTs) を直接読む
//   - 手動記録: _recEditor.getDraft() で精度 + 値を取得して表現を変える
//   呼出元: openRecConfirm 初回 + _recEditor の onChange callback (precSel / 各 input の input/change)
function updateRecConfirmTimeRow() {
  const row = document.getElementById('rec-confirm-time-row');
  const lbl = document.getElementById('rec-confirm-time-lbl');
  const val = document.getElementById('rec-confirm-time-val');
  if (!row || !lbl || !val) return;

  // GPS 記録: 実 GPS 時刻を表示
  if (NORIRECO.gps.recordStartedViaGPS) {
    const startTs = (NORIRECO.gps.recordStartGPS && NORIRECO.gps.recordStartGPS.timestamp) || NORIRECO.gps.recordStartedAt;
    if (!startTs) { row.style.display = 'none'; return; }
    const sd = new Date(startTs);
    const ed = NORIRECO.gps.recordEndTime ? new Date(NORIRECO.gps.recordEndTime) : new Date();
    const mins = Math.max(0, Math.round((ed - sd) / 60000));
    lbl.textContent = '🕒 乗車時刻';
    val.textContent = `${sd.toTimeString().slice(0,5)} → ${ed.toTimeString().slice(0,5)} (${mins}分)`;
    row.style.display = '';
    return;
  }

  // 手動記録: factory editor の draft 経由
  if (!_recEditor) { row.style.display = 'none'; return; }
  let td = null;
  try { td = _recEditor.getDraft(); } catch (e) { row.style.display = 'none'; return; }
  if (!td) { row.style.display = 'none'; return; }
  const prec = td.date_precision || 'minute';
  const toHm = (v) => (typeof v === 'string' && v.length >= 5) ? v.slice(0, 5) : '';

  if (prec === 'minute') {
    const dep = toHm(td.depart_time);
    const arr = toHm(td.arrive_time);
    if (dep && arr) {
      const totalM = (typeof td.total_minutes === 'number') ? td.total_minutes : 0;
      lbl.textContent = '🕒 乗車時刻';
      val.textContent = `${td.date || ''} ${dep} → ${arr} (${totalM}分)`;
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  } else if (prec === 'day') {
    if (td.date) {
      lbl.textContent = '📅 乗車日';
      val.textContent = td.date;
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  } else if (prec === 'month') {
    if (td.date && /^\d{4}-\d{2}-/.test(td.date)) {
      const y = td.date.slice(0, 4);
      const m = parseInt(td.date.slice(5, 7), 10);
      lbl.textContent = '🗓 乗車月';
      val.textContent = `${y}年${m}月ごろ`;
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  } else if (prec === 'year') {
    if (td.date && /^\d{4}-/.test(td.date)) {
      lbl.textContent = '📆 乗車年';
      val.textContent = `${td.date.slice(0, 4)}年ごろ`;
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  } else if (prec === 'unknown') {
    lbl.textContent = '❓ 日時';
    val.textContent = '不明（記録時刻のみ保存）';
    row.style.display = '';
  }
}
window.updateRecConfirmTimeRow = updateRecConfirmTimeRow;

// v398 (B-4-a): 旧 _populateRecEditYearMonth を撤去。年/月 select の populate は factory
//   `_initTimeRowFull5` の closure 内で完結 (curY-20 〜 curY 範囲、初期値=今年/今月)。

// ─ 「📍 ここで終了 (GPS)」: 現在地から終点駅を選んで確認モーダルへ ─
// R.endStationCandidates / R.endStationPickedIdx は NORIRECO.record に集約済み (v197)

function endRecordAtNearest() {
  if (!R.mode) { alert('記録モード中ではありません'); return; }
  if (!NORIRECO.gps.lastUserGps) {
    if (NORIRECO.gps.locationMode === 0) {
      // 位置情報 OFF だったらまず ON にする
      cycleLocationMode();
      alert('📍 位置情報を取得しています。GPS が取れたらもう一度「ここで終了」を押してください。');
      return;
    }
    alert('現在地を取得中です。少し待ってからもう一度お試しください。');
    return;
  }
  const nearby = findNearestStations(NORIRECO.gps.lastUserGps.lat, NORIRECO.gps.lastUserGps.lon, 1500, 6);
  if (nearby.length === 0) {
    alert('1.5km 以内に駅が見つかりません');
    return;
  }
  R.endStationCandidates = nearby;
  R.endStationPickedIdx = 0;
  // 既に選択済みの駅と同じだったら先頭以外をデフォルト選択
  const lastSelected = R.selection[R.selection.length - 1]?.name;
  if (lastSelected && nearby[0].station.name === lastSelected && nearby.length > 1) {
    R.endStationPickedIdx = 1;
  }

  const listEl = document.getElementById('end-station-list');
  if (!listEl) return;
  listEl.innerHTML = nearby.map((n, idx) => {
    const lineIds = n.station.lines || [];
    const lineNames = lineIds.slice(0, 3).map(lid => {
      const sl = (NORIRECO.data.SERVICE_LINES || []).find(x => x.id === lid);
      return sl ? sl.name : lid;
    }).filter(Boolean).join('・');
    const more = lineIds.length > 3 ? ` ほか${lineIds.length - 3}` : '';
    const isSame = n.station.name === lastSelected;
    const checked = idx === R.endStationPickedIdx ? 'checked' : '';
    const selClass = idx === R.endStationPickedIdx ? ' selected' : '';
    const sameHint = isSame ? '<span style="color:rgba(140,160,179,.6);font-size:9px;margin-left:6px">(出発駅と同じ)</span>' : '';
    return `
      <label class="ns-cand${selClass}" onclick="selectEndStationCand(${idx})">
        <input type="radio" name="es-pick" ${checked}>
        <div class="ns-cand-info">
          <div class="ns-cand-name">${n.station.name}${sameHint}</div>
          <div class="ns-cand-meta">
            <span class="ns-cand-dist">${formatDist(n.distance)}</span>
            <span class="ns-cand-lines">${lineNames}${more}</span>
          </div>
        </div>
      </label>
    `;
  }).join('');
  document.getElementById('end-station-modal')?.classList.add('open');
}

function selectEndStationCand(idx) {
  R.endStationPickedIdx = idx;
  document.querySelectorAll('#end-station-list .ns-cand').forEach((el, i) => {
    el.classList.toggle('selected', i === idx);
    const radio = el.querySelector('input[type=radio]');
    if (radio) radio.checked = (i === idx);
  });
}

function closeEndStation() {
  document.getElementById('end-station-modal')?.classList.remove('open');
}

function confirmEndStation() {
  if (!R.endStationCandidates || R.endStationCandidates.length === 0) return;
  const picked = R.endStationCandidates[R.endStationPickedIdx] || R.endStationCandidates[0];
  // 「ここで終了」押下時刻をキャプチャ (実際の到着時刻)
  NORIRECO.gps.recordEndTime = new Date().toISOString();
  // 末尾区間がエラー (= 前回の終点が解決不能) なら末尾駅を外してから選び直す
  // これで「終点を選び直す」UX が成立する
  if (R.selection.length >= 2 && R.segments && R.segments.length > 0
      && R.segments[R.segments.length - 1].error) {
    const stale = R.selection[R.selection.length - 1];
    onRecordStationClick(stale); // toggle off
  }
  const lastSelected = R.selection[R.selection.length - 1]?.name;
  // 出発駅と同じ駅を選んだら 1駅訪問記録扱い (R.segments は空のまま)
  if (picked.station.name !== lastSelected) {
    onRecordStationClick({
      name: picked.station.name,
      lat: picked.station.lat,
      lon: picked.station.lon,
    });
  }
  closeEndStation();
  // refreshRecPanel が呼ばれ R.segments 更新後に確認モーダル表示
  setTimeout(() => openRecConfirm(), 100);
}

window.endRecordAtNearest = endRecordAtNearest;
window.selectEndStationCand = selectEndStationCand;
window.closeEndStation = closeEndStation;
window.confirmEndStation = confirmEndStation;

// v395: notes / delay_minutes の Supabase 列は実は既に存在していた (REST 確認、status 200)。
//   v181 で「スキーマ未拡張」と判断して除外していたが、その後の dashboard 追加に追従漏れ。
//   結果: 編集後リロード時に syncFromSupabase が localStorage を Supabase 値 (null) で上書きし
//   delay/notes が消失する既存バグ。除外を撤回して pass-through。
//   既存呼出 (saveMultiSegmentTrip line 1425 / window.tripForSupabase) は維持。
function tripForSupabase(trip) {
  return trip;
}
window.tripForSupabase = tripForSupabase;

async function saveMultiSegmentTrip() {
  if (!R.selection || R.selection.length === 0) return;
  const isVisitOnly = R.selection.length === 1 && (!R.segments || R.segments.length === 0);
  if (!isVisitOnly && R.segments && R.segments.some(s => s.error)) {
    alert('未解決の区間があります'); return;
  }
  const tripSegments = [];
  let totalStations = 0;
  const lineNames = [];
  // v399 (B-4-b): 統合 _recEditor.getDraft() で全 section (time / segments / delay / notes) を一括取得。
  //   - 列車マニアトグル OFF (`#rec-train-toggle` unchecked) のときは train fields を null override。
  //   - per-seg-chip mode で _segState 同期済 (handler が input event で書き込み済) — __custom__ 値も safety net 不要。
  const editorDraft = _recEditor ? (() => {
    try { return _recEditor.getDraft(); }
    catch (e) { console.warn('[saveMultiSegmentTrip] editor.getDraft() failed:', e); return null; }
  })() : null;
  const trainToggleOn = (document.getElementById('rec-train-toggle')?.checked) === true;
  const editorSegMap = new Map();
  if (editorDraft && Array.isArray(editorDraft.segments) && trainToggleOn) {
    for (const s of editorDraft.segments) {
      if (s && s.lineId) editorSegMap.set(s.lineId, s);
    }
  }
  if (!isVisitOnly) {
    for (const seg of R.segments) {
      if (!seg.line) continue;
      const fromIdx = seg.line.stations.findIndex(s => s.name === seg.from.name);
      const toIdx = seg.line.stations.findIndex(s => s.name === seg.to.name);
      if (fromIdx < 0 || toIdx < 0) continue;
      totalStations += Math.abs(toIdx - fromIdx) + 1;
      if (lineNames[lineNames.length - 1] !== seg.line.name) lineNames.push(seg.line.name);
      // v310 (Phase 2-a): seg.line.stations[].id は v293 で付与済み。
      // seg.line が特定済みなので同名駅問題に当たらず一意に id 化できる。
      const fromStId = seg.line.stations[fromIdx].id || null;
      const toStId = seg.line.stations[toIdx].id || null;
      // v392 (B-1 続き): editor の draft から取り出し。
      //   マニアトグル OFF や該当 lineId が editor に存在しない場合は全 null。
      const editorSeg = editorSegMap.get(seg.line.id) || null;
      const segCategory  = editorSeg?.train_category || null;
      const segTrainId   = editorSeg?.train_id       || null;
      const segTrainName = editorSeg?.train_name     || null;
      const segCarModel  = editorSeg?.car_model      || null;
      tripSegments.push({
        lineId: seg.line.id,
        from: seg.from.name, to: seg.to.name,
        from_id: fromStId, to_id: toStId,
        train_category: segCategory,
        train_id: segTrainId,
        train_name: segTrainName,
        car_model: segCarModel,
      });
    }
    if (tripSegments.length === 0) { alert('保存できる区間がありません'); return; }
  } else {
    totalStations = 1;
  }

  const fromStation = R.selection[0].name;
  const toStation = R.selection[R.selection.length - 1].name;
  // v310 (Phase 2-a): trip 全体の始終駅 id
  //   - 通常 (segments あり): 最初/最後の segment の id を使う (同名駅問題回避)
  //   - isVisitOnly: R.selection[0] の lat/lon + name で MERGED_STATIONS を絞り込む
  let fromStationId = null;
  let toStationId = null;
  if (!isVisitOnly && tripSegments.length > 0) {
    fromStationId = tripSegments[0].from_id || null;
    toStationId = tripSegments[tripSegments.length - 1].to_id || null;
  } else if (isVisitOnly) {
    const s0 = R.selection[0];
    const MS = NORIRECO.data?.MERGED_STATIONS;
    if (Array.isArray(MS) && s0) {
      const ms = MS.find(m => m.name === s0.name
        && Math.abs(m.lat - s0.lat) < 1e-5 && Math.abs(m.lon - s0.lon) < 1e-5);
      fromStationId = ms?.id || null;
      toStationId = fromStationId;
    }
  }
  const lineList = lineNames.join(' ▸ ');
  const tripName = isVisitOnly
    ? `${fromStation} 訪問`
    : (tripSegments.length === 1
        ? `${lineNames[0]} ${fromStation}→${toStation}`
        : `${lineList} ${fromStation}→${toStation}`);

  // 時刻計算 (GPS 発進時に start, 「ここで終了」押下時に end をキャプチャ)
  // GPS 経由でなくても記録モード突入時刻 (NORIRECO.gps.recordStartedAt) を depart_time に使う
  const today = localDateStr();  // 端末ローカル日付 (JST) — UTC だと早朝記録が前日になるため
  const startTs = (NORIRECO.gps.recordStartGPS && NORIRECO.gps.recordStartGPS.timestamp) || NORIRECO.gps.recordStartedAt;
  const endTs = NORIRECO.gps.recordEndTime || new Date().toISOString();
  let departTime = '';
  let arriveTime = '';
  let totalMinutes = 0;
  let tripDate = today; // 既定: 今日 (ローカル)
  if (startTs) {
    const startDate = new Date(startTs);
    departTime = startDate.toTimeString().slice(0, 8); // HH:MM:SS
    // 日付も開始時刻基準に上書き (午前0時跨ぎ対応) — ローカル日付で保存
    tripDate = localDateStr(startDate);
  }
  if (endTs) {
    const endDate = new Date(endTs);
    arriveTime = endDate.toTimeString().slice(0, 8);
    if (startTs) {
      const startDate = new Date(startTs);
      totalMinutes = Math.max(0, Math.round((endDate - startDate) / 60000));
    }
  }
  // v399 (B-4-b): 手動記録の time / delay / notes は統合 editorDraft から取得 (1 instance に集約済)。
  //   - GPS 記録 (recordStartedViaGPS=true): features.timeRow=false で time section skip → draft.date は initial 値を維持
  //   - 手動記録: precisions=['minute','day','month','year','unknown'] の 5 精度ロジックは factory 内蔵
  //     - unknown のとき draft.date は null → tripDate には today (recorded_at の日付) を入れる
  //       (Supabase の NOT NULL 制約回避、フィルタは date_precision='unknown' で別途除外)
  let datePrecision = 'day';
  if (!NORIRECO.gps.recordStartedViaGPS && editorDraft) {
    datePrecision = editorDraft.date_precision || 'day';
    tripDate = editorDraft.date || (datePrecision === 'unknown' ? today : tripDate);
    departTime = editorDraft.depart_time != null ? editorDraft.depart_time : '';
    arriveTime = editorDraft.arrive_time != null ? editorDraft.arrive_time : '';
    totalMinutes = (typeof editorDraft.total_minutes === 'number') ? editorDraft.total_minutes : 0;
  }
  // 遅延・メモも統合 draft から (factory が正規化済 — 0/空→null、delay 上限 5999 クランプ)
  const delayMinutes = (editorDraft && typeof editorDraft.delay_minutes === 'number') ? editorDraft.delay_minutes : null;
  const tripNotes    = editorDraft?.notes || null;

  const tripId = `trip_${Date.now()}`;

  // v258: 📷 写真添付があれば R2 にアップロードして public URL を確定
  // 失敗したら保存全体をキャンセル (一部アップロード済の R2 オブジェクトはゴミとして残るが、
  // trip 自体は保存されないのでフロントから到達不能になる。将来の cleanup ジョブで掃除)
  let tripPhotos = [];
  if (_recPhotoArea && _recPhotoArea.getItemCount() > 0) {
    try {
      tripPhotos = await _recPhotoArea.uploadAndGetPhotos(tripId);
    } catch (e) {
      alert('写真アップロード失敗: ' + e.message + '\n保存をキャンセルしました。');
      return;
    }
  }

  const trip = {
    id: tripId, date: tripDate, name: tripName,
    photos: tripPhotos,
    // v326 (Phase 3): from_station / to_station (name) への並行書き込みを撤去、id のみ。
    //   既存 trip の name 列は v326 SQL DROP で除去予定。表示は MERGED_STATIONS から逆引き。
    from_station_id: fromStationId, to_station_id: toStationId,
    total_stations: totalStations,
    transfers: Math.max(0, tripSegments.length - 1),
    line_list: lineList,
    total_minutes: totalMinutes,
    depart_time: departTime,
    arrive_time: arriveTime,
    segments: tripSegments,
    // 認証グラデーション (Notion §記録モード設計)
    // GPS 発進 (「ここから記録開始」経由) なら verified=true、それ以外は manual
    source: NORIRECO.gps.recordStartedViaGPS ? 'gps_button' : 'manual',
    verified: !!NORIRECO.gps.recordStartedViaGPS,
    gps_lat: NORIRECO.gps.recordStartGPS ? NORIRECO.gps.recordStartGPS.lat : null,
    gps_lon: NORIRECO.gps.recordStartGPS ? NORIRECO.gps.recordStartGPS.lon : null,
    gps_accuracy: NORIRECO.gps.recordStartGPS ? NORIRECO.gps.recordStartGPS.accuracy : null,
    recorded_at: new Date().toISOString(),
    date_precision: datePrecision,
    // 列車種別 (任意、確認モーダルで選択 or 手入力)
    // train_id IS NULL かつ train_name IS NOT NULL = マニア手入力 (後でマスター調査・追加用)
    // v375: trip 直下も per-seg 集約 — 全 seg 一致なら値 / 不一致なら null (car_model と同ルール)
    // v399 (B-4-b): visit-only (segments 空) は editor が `per-seg-chip` mode で chip 0 個のため
    //   train 情報を入力する UI が無い → null。旧 NORIRECO.trains.selectedXxxx fallback は撤廃。
    train_id: (() => {
      if (!tripSegments || tripSegments.length === 0) return null;
      const set = new Set(tripSegments.map(s => s.train_id || ''));
      return (set.size === 1 && [...set][0]) ? [...set][0] : null;
    })(),
    train_name: (() => {
      if (!tripSegments || tripSegments.length === 0) return null;
      const set = new Set(tripSegments.map(s => s.train_name || ''));
      return (set.size === 1 && [...set][0]) ? [...set][0] : null;
    })(),
    train_category: (() => {
      if (!tripSegments || tripSegments.length === 0) return null;
      const set = new Set(tripSegments.map(s => s.train_category || ''));
      return (set.size === 1 && [...set][0]) ? [...set][0] : null;
    })(),
    car_model: (() => {
      if (!tripSegments || tripSegments.length === 0) return null;
      const set = new Set(tripSegments.map(s => s.car_model || ''));
      return (set.size === 1 && [...set][0]) ? [...set][0] : null;
    })(),
    // 後追い記録モード拡張 (v181) / v395: notes / delay_minutes は localStorage と Supabase の両方に保存。
    //   v395 で tripForSupabase の strip を撤回 — schema は実は v181 以前から両カラムを持っていた (REST 確認済)。
    notes: tripNotes,
    delay_minutes: delayMinutes,
    // 所有者 (ログイン中なら uid、未ログインなら null → 初回ログイン時 backfill 対象)
    user_id: currentUserId(),
  };

  let saved = false;
  let errInfo = '';
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/norireco_trips`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(tripForSupabase(trip)),
    });
    if (res.ok) {
      saved = true;
    } else {
      let errBody = '';
      try { errBody = await res.text(); } catch(e) {}
      errInfo = `HTTP ${res.status} ${res.statusText}: ${errBody.slice(0, 200)}`;
      console.warn('[乗レコ] Supabase 保存失敗', errInfo);
    }
  } catch (e) {
    errInfo = `接続エラー: ${e.name}: ${e.message}`;
    console.warn('[乗レコ] Supabase 接続エラー:', e);
  }

  try {
    const existing = JSON.parse(localStorage.getItem('norireco_trips') || '[]');
    existing.push(trip);
    localStorage.setItem('norireco_trips', JSON.stringify(existing));
  } catch (e) { console.warn('[乗レコ] localStorage 保存失敗:', e); }

  for (const seg of tripSegments) RIDDEN_SEGS.push(seg);
  NORIRECO.rideRecord.rebuild();
  redrawAllLinesAfterTripChange();
  updateOverlays();

  // v390: マイページの _mypageCache が初期化済 (= 過去にマイページ開封済 or 駅アクションシート
  //   から lazy fetch 済) なら、保存直後にこちらにも append する。
  //   理由: 保存直後にマップへ戻って駅マーカーをタップすると駅アクションシートの
  //   「この駅を含む旅程」カウントが「(なし)」と出てしまう (cache に新 trip が無いため)。
  //   マイページを一度開いてから戻ると正しく反映されるバグ報告 (ユスケ / 2026-05-27)。
  //   cache 未初期化 (null/undefined) のときは次に必要になったタイミングで lazy fetch されるので
  //   触らない (空配列を作ってしまうとその後 lazy fetch が走らなくなる)。
  try {
    const mc = NORIRECO.mypage?.state?._mypageCache;
    if (Array.isArray(mc)) mc.push(trip);
  } catch (e) {}
  // v390: 駅アクションシートが「この駅を含む旅程」リスト表示中なら再描画
  //   (v388 で delete 側に入れた refreshTripListIfOpen を save 側にも対称適用)
  try { NORIRECO.stationActions?.refreshTripListIfOpen?.(); } catch (e) {}

  if (saved) {
    // 記録バッジ: GPS=📍 / 手動=📝
    const recTag = trip.verified ? ' 📍' : ' 📝';
    const summary = isVisitOnly
      ? `${fromStation} に立ち寄り`
      : `${tripSegments.length}区間 ${totalStations}駅`;
    showRecordToast(`✅ 記録${recTag}: ${summary}`);
  } else {
    showRecordToast(`⚠️ ローカル保存のみ (Supabase 失敗)\n${errInfo}`, 'warn', 9000);
  }
  // 保存後に GPS 認証フラグと時刻をリセット
  NORIRECO.gps.recordStartedViaGPS = false;
  NORIRECO.gps.recordStartGPS = null;
  NORIRECO.gps.recordEndTime = null;
  // v258: 写真エリアも破棄 (blob URL を revoke。アップロード済の public URL はクラッシュ後も R2 に残る)
  if (_recPhotoArea) {
    try { _recPhotoArea.destroy(); } catch (e) {}
    _recPhotoArea = null;
  }
  // v399 (B-4-b): 時刻 / 列車 / 遅延 / メモ を統合した単一 editor を破棄
  if (_recEditor) {
    try { _recEditor.destroy(); } catch (e) {}
    _recEditor = null;
  }
  // A-6 (v405): 通常記録モードからも空マップ banner を再評価 (1 件でも記録があれば hide)
  try { window.NORIRECO?.bulkRecord?.updateOnboardingBanner?.(); } catch (e) {}
  // verified=true の trip なら自動獲得チェックが発動する
  setTimeout(() => runCharacterGrantCheck(), 800);
  // 記録モードを終了 (R.mode=true → false に切替、最寄駅パネルが「開始駅選択」に戻る)
  // toggleRecordMode の else 分岐内で clearRecSelection が呼ばれる
  if (R.mode) {
    toggleRecordMode();
  } else {
    clearRecSelection();
  }
  // 保存後は 📍 を OFF にする (次回の記録に向けてリセット)
  if (NORIRECO.gps.locationMode > 0) {
    NORIRECO.gps.locationMode = 0;
    stopLocationTracking();
    updateLocationButton();
  }
}

// 地図全体のポリライン/駅ドット/ラベルを再描画 (riddenSt 更新後に呼ぶ)
// 既存の Supabase 同期後の再描画と同じパターンを使う
export function redrawAllLinesAfterTripChange() {
  if (!NORIRECO.map.instance || !dotLayerRef) return;
  // 既存ポリラインを削除
  allLayers.forEach(l => { try { NORIRECO.map.instance.removeLayer(l); } catch(e){} });
  allLayers.length = 0;
  // 既存ドット/ラベルをクリア
  dotLayerRef.clearLayers();
  if (labelLayerRef) labelLayerRef.clearLayers();
  // drawLines() が内部で window._allLabels.length=0 と drawnMergedStations.clear()
  // を実行するため、パイチャート(統合駅)も正しく再生成される
  drawLines();
}

export function showRecordToast(msg, mode, durationMs) {
  const toast = document.createElement('div');
  const bg = mode === 'warn' ? 'rgba(232,53,42,.96)' : 'rgba(0,178,229,.96)';
  const maxW = mode === 'warn' ? '88vw' : '420px';
  toast.style.cssText =
    'position:fixed;top:80px;left:50%;transform:translateX(-50%);' +
    `background:${bg};color:#fff;padding:12px 16px;border-radius:10px;` +
    `z-index:9999;font-size:12px;line-height:1.5;box-shadow:0 4px 12px rgba(0,0,0,.5);` +
    `font-family:inherit;white-space:pre-wrap;max-width:${maxW};` +
    (mode === 'warn' ? 'cursor:pointer;' : '');
  toast.textContent = msg;
  // クリックで即閉じる (エラー長文の確認後に消したい時用)
  toast.onclick = () => { try { toast.remove(); } catch(e){} };
  document.body.appendChild(toast);
  const dur = durationMs || (mode === 'warn' ? 7000 : 3000);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .4s'; }, dur - 500);
  setTimeout(() => { try { toast.remove(); } catch(e){} }, dur);
}

// ローディングインジケーターは廃止（P1がHTMLに埋め込まれているため不要）

// 乗車済み路線のバウンディングボックスにフィット
export function fitToRiddenLines(){
  const pts=[];
  NORIRECO.data.LINES.forEach(line=>{
    if(!riddenSt[line.id]||riddenSt[line.id].size===0)return;
    line.stations.forEach(s=>{
      if(riddenSt[line.id].has(s.n)) pts.push([s.lat,s.lon]);
    });
  });
  if(pts.length===0){ NORIRECO.map.instance.setView([36.5,138.0],5); return; }
  const bounds=L.latLngBounds(pts);
  NORIRECO.map.instance.fitBounds(bounds,{padding:[40,40],maxZoom:9,animate:false});
}

// v217 stage 2: 04/06/08 (module) / 02 (classic) などから bare 呼出される関数の window 公開
// v225 stage 3: toggleRecordMode / redrawAllLinesAfterTripChange / showRecordToast /
// fitToRiddenLines は `export` 経由に移行 (window bridge 撤去)。
// v248: toggleRecordMode は noritetsu-map.html の rec-btn FAB の onclick="toggleRecordMode()"
//   から呼ばれており、HTML onclick はグローバルスコープを参照するため window 公開が必須。
//   v225 で撤去したのは module 内 import の方を意図しており、HTML onclick 側を見落とし。
//   結果として v225 〜 v247 の間、📝 手動記録 FAB が無反応 (ReferenceError) になっていた。
// onRecordStationClick は 07 内の HTML 文字列 onclick (line 252) で呼ばれるため window 維持。
window.toggleRecordMode = toggleRecordMode;
window.onRecordStationClick = onRecordStationClick;

// ════════════════════════════════════════════════════════════════
// v347: 「列車・車両形式」トグル + 区間→候補車両ピッカー (C' 案)
//   5大原則 ② 同心円ターゲティング: Lv0/1 はデフォ非表示、Lv2/3 のみ展開
//   localStorage key: 'norireco.prefs.showTrainSelector' ('1' or '0')
// ════════════════════════════════════════════════════════════════
const PREF_SHOW_TRAIN_SELECTOR = 'norireco.prefs.showTrainSelector';
const PREF_SHOW_DELAY_INPUT    = 'norireco.prefs.showDelayInput';   // v350

// v399 (B-4-b): 列車マニアトグルは外側 wrapper (`#rec-train-picker`) の visibility 制御のみ担当。
//   editor は openRecConfirm で常時生成 (containers.train = #rec-train-picker-container)、トグル OFF
//   のときは wrapper hide で UI 上見えなくする + save 時に train fields を null override。
//   旧 _mountRecDetailEditor / destroy-on-OFF は不要 (1 instance 統合のため)。
function initRecTrainToggle() {
  const toggle = document.getElementById('rec-train-toggle');
  const picker = document.getElementById('rec-train-picker');
  if (!toggle || !picker) return;
  const saved = localStorage.getItem(PREF_SHOW_TRAIN_SELECTOR) === '1';
  toggle.checked = saved;
  picker.style.display = saved ? 'block' : 'none';
}

function onRecTrainToggle() {
  const toggle = document.getElementById('rec-train-toggle');
  const picker = document.getElementById('rec-train-picker');
  if (!toggle || !picker) return;
  const on = toggle.checked;
  localStorage.setItem(PREF_SHOW_TRAIN_SELECTOR, on ? '1' : '0');
  picker.style.display = on ? 'block' : 'none';
  // OFF にしても editor は残す (再 ON 時に DOM 値が温存される)。
  // 保存時 (saveMultiSegmentTrip) にトグル状態を見て train fields を null にするかを判断する。
}
window.onRecTrainToggle = onRecTrainToggle;

// v398 (B-4-a): 旧 initRecDelayToggle / onRecDelayToggle (v350) を撤去。
//   factory `initDelay` が `features.delay = { maniaToggle: true, prefKey: PREF_SHOW_DELAY_INPUT }`
//   で checkbox + localStorage 永続化 + 入力 hide/clear を完全に担当 (v397 B-3c)。

// v399 (B-4-b): 旧 SL chip ロジック (applyRecTrainCategory / clearAllTrainSelections /
//   populateSlVehiclePicker / selectSlChip / onSlVehicleChange / isInDropdown /
//   onSlVehicleCustomInput) を撤去 — 297 行削除。
//   v392 で確認モーダルの cascade UI を `createTripDetailEditor` (`per-seg-chip` mode) に
//   置き換えた時点で全て dead code。HTML 側の `#rec-sl-chips`/`#rec-sl-vehicle-block`/
//   `#rec-train-cascade` 等の element と onclick/onchange ハンドラも v392 で消滅済。
