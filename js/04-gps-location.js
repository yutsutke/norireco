// ══════════════════════════════════════════════
// 現在地表示 (Phase 1)
// 3状態トグル: off → on (中心化) → follow (追従) → off
//
// v216 ES Modules パイロット (案 β) stage 2: `<script type="module">` 化。
// 末尾で 10 個の window bridge を追加 (07/08/04b など module/classic 双方からの bare 呼出に対応)。
//
// v223 ES Modules stage 3: 03-characters の 3 関数を import 化。
// ══════════════════════════════════════════════
import { distMeters, isCharacterOwned, isCharacterAvailable } from './03-characters.js';

// v198 ES Modules パイロット (案 β) — 状態を window.NORIRECO.gps に集約。
// 外部 (07) からは NORIRECO.gps.X のフルパス、内部は G.X の短縮形。
window.NORIRECO = window.NORIRECO || {};
NORIRECO.gps = NORIRECO.gps || {
  locationMode: 0,           // 0:off, 1:on (一度中心化), 2:follow (毎回中心化)
  locationWatchId: null,
  userLocationMarker: null,
  userLocationCircle: null,
  didInitialCenter: false,
  lastUserGps: null,         // 直近の {lat, lon, accuracy}
  recordStartedViaGPS: false,// 「ここから記録開始」で発進した記録か
  recordStartGPS: null,      // 発進時の GPS スナップショット {lat, lon, accuracy, timestamp}
  recordStartedAt: null,     // 記録モード突入時刻 ISO (GPS 無くても depart_time に使う)
  recordEndTime: null,       // 「ここで終了」or「終了して確認」押下時刻 ISO
  nearestCandidates: [],     // [{station, distance}, ...] 最寄駅パネル候補
  nearestPickedIdx: 0,       // ユーザーが選んだインデックス
};
const G = NORIRECO.gps;

function cycleLocationMode() {
  G.locationMode = (G.locationMode + 1) % 3;
  if (G.locationMode === 0) {
    stopLocationTracking();
  } else {
    G.didInitialCenter = false; // 状態遷移で再度センター
    startLocationTracking();
    // フォロー突入時は最後の位置で即座にセンター
    if (G.locationMode === 2 && G.userLocationMarker) {
      const ll = G.userLocationMarker.getLatLng();
      NORIRECO.map.instance.setView(ll, Math.max(NORIRECO.map.instance.getZoom(), 15), { animate: true });
    }
  }
  updateLocationButton();
}
window.cycleLocationMode = cycleLocationMode;

function startLocationTracking() {
  if (!navigator.geolocation) {
    alert('このブラウザは位置情報に非対応です');
    G.locationMode = 0;
    updateLocationButton();
    return;
  }
  if (G.locationWatchId) return; // 既に動作中
  G.locationWatchId = navigator.geolocation.watchPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const acc = pos.coords.accuracy;
      G.lastUserGps = { lat, lon, accuracy: acc };
      updateUserLocationMarker(lat, lon, acc);
      updateNearestStationPanel(lat, lon);
      if (G.locationMode === 1 && !G.didInitialCenter) {
        // 初回のみ中心化、その後はマーカーだけ更新
        NORIRECO.map.instance.setView([lat, lon], Math.max(NORIRECO.map.instance.getZoom(), 15), { animate: true });
        G.didInitialCenter = true;
      } else if (G.locationMode === 2) {
        // 追従モード: 毎回中心化 (ズームは維持)
        NORIRECO.map.instance.setView([lat, lon], NORIRECO.map.instance.getZoom(), { animate: true });
      }
    },
    err => {
      console.warn('[乗レコ] 位置情報エラー:', err.code, err.message);
      if (err.code === 1) {
        alert('位置情報のアクセスが拒否されています。\nブラウザ設定でこのサイトの位置情報を許可してください。');
        G.locationMode = 0;
        updateLocationButton();
        stopLocationTracking();
      }
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );
}

function stopLocationTracking() {
  if (G.locationWatchId) {
    navigator.geolocation.clearWatch(G.locationWatchId);
    G.locationWatchId = null;
  }
  removeUserLocationMarker();
  hideNearestStationPanel();
  G.lastUserGps = null;
  G.didInitialCenter = false;
}

// 最寄駅パネル (Phase 2) — 候補リスト
// G.nearestCandidates / G.nearestPickedIdx は NORIRECO.gps に集約済み (v198)

function findNearestStations(lat, lon, maxRangeM, maxCount) {
  if (!NORIRECO.data.MERGED_STATIONS || NORIRECO.data.MERGED_STATIONS.length === 0) return [];
  const candidates = [];
  for (const ms of NORIRECO.data.MERGED_STATIONS) {
    const d = distMeters(lat, lon, ms.lat, ms.lon);
    if (d > maxRangeM) continue;
    candidates.push({ station: ms, distance: d });
  }
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates.slice(0, maxCount);
}

function formatDist(meters) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters/1000).toFixed(1)} km`;
}

function updateNearestStationPanel(lat, lon) {
  const panel = document.getElementById('nearest-station-panel');
  if (!panel) return;
  const selectModeEl = document.getElementById('ns-mode-select');
  const recModeEl = document.getElementById('ns-mode-recording');

  // 記録モード中: GPS 記録のみ「記録中」ミニマル UI を表示
  // 手動記録 (📝 ボタン経由) では rec-panel が UI を担当するので最寄駅パネルは隠す
  if (NORIRECO.record.mode) {
    if (G.recordStartedViaGPS) {
      if (selectModeEl) selectModeEl.style.display = 'none';
      if (recModeEl) recModeEl.style.display = 'block';
      renderRecordingSummary();
      panel.classList.add('show');
    } else {
      panel.classList.remove('show');
    }
    return;
  }

  // 記録モード OFF: 開始駅候補リスト
  if (selectModeEl) selectModeEl.style.display = 'block';
  if (recModeEl) recModeEl.style.display = 'none';

  const nearby = findNearestStations(lat, lon, 1500, 6); // 1.5km 以内、最大 6 駅
  if (nearby.length === 0) { panel.classList.remove('show'); return; }

  // 候補が変わったらインデックスをリセット (駅名のシグネチャで比較)
  const newSig = nearby.map(n => n.station.name).join('|');
  const oldSig = G.nearestCandidates.map(n => n.station.name).join('|');
  if (newSig !== oldSig) {
    G.nearestPickedIdx = 0;
  }
  G.nearestCandidates = nearby;

  const listEl = document.getElementById('ns-list');
  if (!listEl) return;
  listEl.innerHTML = nearby.map((n, idx) => {
    const lineIds = n.station.lines || [];
    const lineNames = lineIds.slice(0, 3).map(lid => {
      const sl = (NORIRECO.data.SERVICE_LINES || []).find(x => x.id === lid);
      return sl ? sl.name : lid;
    }).filter(Boolean).join('・');
    const more = lineIds.length > 3 ? ` ほか${lineIds.length - 3}` : '';
    const checked = idx === G.nearestPickedIdx ? 'checked' : '';
    const selClass = idx === G.nearestPickedIdx ? ' selected' : '';
    return `
      <label class="ns-cand${selClass}" onclick="selectNearestCand(${idx})">
        <input type="radio" name="ns-pick" ${checked}>
        <div class="ns-cand-info">
          <div class="ns-cand-name">${n.station.name}</div>
          <div class="ns-cand-meta">
            <span class="ns-cand-dist">${formatDist(n.distance)}</span>
            <span class="ns-cand-lines">${lineNames}${more}</span>
          </div>
        </div>
      </label>
    `;
  }).join('');
  panel.classList.add('show');
}

function selectNearestCand(idx) {
  G.nearestPickedIdx = idx;
  document.querySelectorAll('.ns-cand').forEach((el, i) => {
    el.classList.toggle('selected', i === idx);
    const radio = el.querySelector('input[type=radio]');
    if (radio) radio.checked = (i === idx);
  });
}
window.selectNearestCand = selectNearestCand;

function hideNearestStationPanel() {
  const panel = document.getElementById('nearest-station-panel');
  if (panel) panel.classList.remove('show');
}

// 記録中サマリの描画 (最寄駅パネルの記録中モード内)
function renderRecordingSummary() {
  const el = document.getElementById('ns-recording-summary');
  if (!el) return;
  if (!NORIRECO.record.selection || NORIRECO.record.selection.length === 0) {
    el.innerHTML = '<div class="ns-rec-hint">駅を選択してください</div>';
    return;
  }
  const start = NORIRECO.record.selection[0].name;
  const last = NORIRECO.record.selection[NORIRECO.record.selection.length - 1].name;
  const segs = NORIRECO.record.segments?.length || 0;
  const hasError = NORIRECO.record.segments?.some(s => s.error);
  el.innerHTML = `
    <div class="ns-rec-lbl">📍 出発駅</div>
    <div class="ns-rec-start">${start}</div>
    ${NORIRECO.record.selection.length > 1 ? `
      <div class="ns-rec-route">
        ${hasError ? '⚠️ 未解決区間あり' : `経路: ${NORIRECO.record.selection.length}駅 / ${segs}区間`}
      </div>
      <div class="ns-rec-route-info">→ ${last}</div>
    ` : `
      <div class="ns-rec-hint">「📍 ここで終了」で終点を選ぶか、<br>地図上で駅をクリックして経路を追加</div>
    `}
  `;
}

// 記録キャンセル (破棄)
function cancelRecord() {
  if (NORIRECO.record.selection.length > 0 && !confirm('記録中の経路を破棄しますか？')) return;
  G.recordStartedViaGPS = false;
  G.recordStartGPS = null;
  G.recordEndTime = null;
  if (NORIRECO.record.mode) toggleRecordMode();
  showRecordToast('🗑 記録を破棄しました', 'warn', 2500);
}
window.cancelRecord = cancelRecord;

// 「ここから記録開始」: 選んだ候補駅で記録モードに入る + GPS 認証フラグ
function startRecordFromNearest() {
  if (!G.lastUserGps) {
    alert('現在地を取得できていません。📍 ボタンで位置情報を有効にしてください。');
    return;
  }
  if (!G.nearestCandidates || G.nearestCandidates.length === 0) {
    alert('近くに駅が見つかりません');
    return;
  }
  const picked = G.nearestCandidates[G.nearestPickedIdx] || G.nearestCandidates[0];
  // GPS 認証情報を記録 (saveMultiSegmentTrip でこのフラグを見て verified=true にする)
  G.recordStartedViaGPS = true;
  G.recordStartGPS = { ...G.lastUserGps, timestamp: new Date().toISOString() };
  G.recordEndTime = null;
  // 記録モードへ
  if (!NORIRECO.record.mode) toggleRecordMode();
  // 選択された駅をプリセレクト
  onRecordStationClick({
    name: picked.station.name,
    lat: picked.station.lat,
    lon: picked.station.lon,
  });
  hideNearestStationPanel();
  console.log(`[乗レコ] 🔖 GPS 発進記録: ${picked.station.name} (距離 ${Math.round(picked.distance)}m, 精度±${Math.round(G.lastUserGps.accuracy)}m)`);
}
window.startRecordFromNearest = startRecordFromNearest;

function updateUserLocationMarker(lat, lon, accuracy) {
  if (!NORIRECO.map.instance) return;
  if (!G.userLocationMarker) {
    // 青ドット (Google Maps風)
    G.userLocationMarker = L.marker([lat, lon], {
      icon: L.divIcon({
        className: 'user-location-marker',
        html: '<div class="user-loc-dot"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
      interactive: false,
      zIndexOffset: 2000,
    }).addTo(NORIRECO.map.instance);
    // 精度円
    G.userLocationCircle = L.circle([lat, lon], {
      radius: accuracy,
      color: '#1A6FE5',
      fillColor: '#1A6FE5',
      fillOpacity: 0.08,
      weight: 1,
      opacity: 0.45,
      interactive: false,
    }).addTo(NORIRECO.map.instance);
  } else {
    G.userLocationMarker.setLatLng([lat, lon]);
    if (G.userLocationCircle) {
      G.userLocationCircle.setLatLng([lat, lon]);
      G.userLocationCircle.setRadius(accuracy);
    }
  }
}

function removeUserLocationMarker() {
  if (G.userLocationMarker) {
    try { NORIRECO.map.instance.removeLayer(G.userLocationMarker); } catch(e) {}
    G.userLocationMarker = null;
  }
  if (G.userLocationCircle) {
    try { NORIRECO.map.instance.removeLayer(G.userLocationCircle); } catch(e) {}
    G.userLocationCircle = null;
  }
}

function updateLocationButton() {
  const btn = document.getElementById('location-fab');
  if (!btn) return;
  btn.classList.remove('on', 'follow');
  if (G.locationMode === 1) {
    btn.classList.add('on');
    btn.title = '現在地を表示中（タップで追従モード）';
  } else if (G.locationMode === 2) {
    btn.classList.add('follow');
    btn.title = '追従モード（タップで OFF）';
  } else {
    btn.title = '現在地表示 (タップで 表示→追従→OFF)';
  }
}

// この駅で獲得可能なキャラ一覧 (locked + 期間内 + obtainable_at 一致)
function getObtainableCharactersAt(stationName) {
  if (!NORIRECO.data.charModeOn) return [];
  const result = [];
  for (const id in NORIRECO.data.CHARACTERS) {
    const char = NORIRECO.data.CHARACTERS[id];
    if (!char.meta || char.meta.default_unlocked) continue;
    if (isCharacterOwned(id)) continue;
    if (!isCharacterAvailable(char.meta)) continue;
    const obtainAt = char.meta.obtainable_at || char.meta.station_ids || [];
    if (obtainAt.includes(stationName)) result.push(char);
  }
  return result;
}

// ✨ フローティングインジケータアイコン (駅マーカーの上に浮かべる)
function makeObtainableIndicator(count) {
  const size = 30;
  return L.divIcon({
    className: 'obtainable-indicator-marker',
    html: `<div class="obtainable-bubble"><span class="obtainable-spark">✨</span>${count > 1 ? `<span class="obtainable-count">${count}</span>` : ''}</div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, 42],  // 駅マーカーから ~12px 上に浮かべる
  });
}

// 全駅をスキャンして、獲得可能キャラがある駅に ✨ インジケータを配置
function drawObtainableIndicators() {
  if (!NORIRECO.data.charModeOn) return;
  if (!NORIRECO.data.MERGED_STATIONS || !NORIRECO.data.MERGED_STATIONS.length) return;

  const _mapMode = window._mapDisplayMode || 'both';
  let count = 0;
  for (const ms of NORIRECO.data.MERGED_STATIONS) {
    const chars = getObtainableCharactersAt(ms.name);
    if (chars.length === 0) continue;

    // マップ表示モードに応じて駅単位で skip
    if (_mapMode !== 'both' && typeof slRiddenSt === 'object') {
      let ridden = false;
      for (const slId of (ms.lines || [])) {
        const rs = slRiddenSt[slId];
        if (rs && rs.has(ms.name)) { ridden = true; break; }
      }
      if (_mapMode === 'ridden' && !ridden) continue;
      if (_mapMode === 'unridden' && ridden) continue;
    }

    const marker = L.marker([ms.lat, ms.lon], {
      icon: makeObtainableIndicator(chars.length),
      interactive: true,
      zIndexOffset: 1500,  // 駅マーカーより前に出す
    });

    const tipHtml = `<b style="color:#FFD740">✨ ここで獲得できる！</b><br>` +
      chars.map(c => {
        const period = c.meta.available_until ? `〜${c.meta.available_until}` : '';
        return `<span style="color:#FFD740">●</span> ${c.meta.name} <span style="color:rgba(140,160,179,.7);font-size:9px">${period}</span>`;
      }).join('<br>');
    marker.bindTooltip(tipHtml, { className: 'norireco-tooltip', offset: [10, 0] });

    marker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      // 既存所持キャラがあればそれを優先、なければ locked preview として開く
      const ownedChar = getStationCharacter(ms.name);
      openCharModal(ms, ownedChar || chars[0]);
    });

    marker.addTo(NORIRECO.map.instance);
    allLayers.push(marker);
    count++;
  }
  if (count > 0) console.log(`[乗レコ] ✨ 獲得可能駅 ${count}駅にインジケータ配置`);
}

// 駅ごとのキャラ選択 (localStorage 永続化)
const STATION_CHAR_PICK_KEY = 'norireco_station_char_pick';
function getStationCharacterChoice(stationName) {
  try {
    const data = JSON.parse(localStorage.getItem(STATION_CHAR_PICK_KEY) || '{}');
    return data[stationName] || null;
  } catch(e) { return null; }
}
function setStationCharacterChoice(stationName, charId) {
  try {
    const data = JSON.parse(localStorage.getItem(STATION_CHAR_PICK_KEY) || '{}');
    if (charId) data[stationName] = charId; else delete data[stationName];
    localStorage.setItem(STATION_CHAR_PICK_KEY, JSON.stringify(data));
  } catch(e) {}
}

// 駅の代表キャラを取得 (所持済み中からユーザー選択優先)
function getStationCharacter(stationName) {
  if (!NORIRECO.data.charModeOn) return null;
  const list = NORIRECO.data.stationCharMap.get(stationName);
  if (!list || !list.length) return null;
  // 所持済みキャラのみに絞る (default_unlocked or owned_characters)
  const ownedList = list.filter(c => isCharacterOwned(c.meta.id));
  if (!ownedList.length) return null;
  const choice = getStationCharacterChoice(stationName);
  if (choice) {
    const chosen = ownedList.find(c => c.meta.id === choice);
    if (chosen) return chosen;
  }
  return ownedList[0]; // デフォルト: 所持済みリスト先頭
}

// キャラ選択を変更してマップ再描画
function pickStationCharacter(stationName, charId) {
  setStationCharacterChoice(stationName, charId);
  closeCharModal();
  if (typeof redrawAllLinesAfterTripChange === 'function') {
    redrawAllLinesAfterTripChange();
  }
}
// ── データローダー (loadMergedStations / loadServiceLinesMaster / loadLines) は
// v191 で 02-data-loaders.js に移管された。NORIRECO.data.SERVICE_LINES_MASTER / NORIRECO.data.SERVICE_LINES /
// serviceLinesLoaded / serviceLinesBuilt 等のグローバル状態も 02 で宣言される。
// ── NORIRECO.data.SERVICE_LINES の構築・分類・達成率 (buildServiceLines / detectServiceLineGroup /
// slStats / slGlobalStats / regionOf / 内部ヘルパー) は v192 で
// 02b-service-lines-builder.js に切り出し、NORIRECO.serviceLines.{build,stats,
// globalStats,detectGroup,regionOf} として公開。
// ── trip → segments 解決 (LEGACY_ID_MAP / normStName / resolveLineWithStations /
// resolveServiceTrip / resolveSegments / resolveByServiceLine) と乗車状態集計
// (slRiddenSt / slStopType / slVisitCount / riddenServiceIds / rebuildRiddenStations)
// は v194 で 04b-ride-record.js に切り出し、NORIRECO.rideRecord.{rebuild,normStName}
// として公開。dead code だった resolveLineId はこのとき削除。

// v216 stage 2: 07 (classic) / 08 (module) / 04b (module) から bare 呼出される関数の window 公開
window.stopLocationTracking = stopLocationTracking;
window.findNearestStations = findNearestStations;
window.formatDist = formatDist;
window.updateNearestStationPanel = updateNearestStationPanel;
window.renderRecordingSummary = renderRecordingSummary;
window.updateLocationButton = updateLocationButton;
window.getObtainableCharactersAt = getObtainableCharactersAt;
window.drawObtainableIndicators = drawObtainableIndicators;
window.getStationCharacterChoice = getStationCharacterChoice;
window.getStationCharacter = getStationCharacter;
window.pickStationCharacter = pickStationCharacter;

